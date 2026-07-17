import React, { useState, useEffect } from 'react';
import { ShoppingCart, CreditCard, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    TPDirect: any;
  }
}

export default function ShopCheckout({ cart, onSuccess }: { cart?: any, onSuccess: () => void }) {
  const [tpReady, setTpReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [shippingInfo, setShippingInfo] = useState({ name: '', phone: '', address: '' });
  const [localCart, setLocalCart] = useState<any>(null);

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('website_cart');
      if (storedCart) {
        setLocalCart(JSON.parse(storedCart));
      }
    } catch(e) {}
  }, []);
  
  // Fake cart total for demo or real total from local cart
  const finalTotal = localCart?.total || cart?.total || 1200;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
       onSuccess();
    } else if (params.get('payment') === 'failed') {
       setErrorMsg("付款失敗: " + (params.get('msg') || "Bank error"));
    }
  }, [onSuccess]);

  useEffect(() => {
    // Check if TPDirect is loaded
    if (window.TPDirect) {
      const tappayEnv = (import.meta as any).env.VITE_TAPPAY_ENV === 'production' ? 'production' : 'sandbox';
      const appId = Number((import.meta as any).env.VITE_TAPPAY_APP_ID) || 123456;
      const appKey = (import.meta as any).env.VITE_TAPPAY_APP_KEY || 'app_TLACx7X82OheYUFEndKqV6bzQZjUQep1BVfQdX4JGYY8Gs37pfQnO5sMtPOR';
      window.TPDirect.setup(appId, appKey, tappayEnv);
      window.TPDirect.card.setup({
        fields: {
          number: {
            element: '#card-number',
            placeholder: '**** **** **** ****'
          },
          expirationDate: {
            element: '#card-expiration-date',
            placeholder: 'MM / YY'
          },
          ccv: {
            element: '#card-ccv',
            placeholder: 'CVV'
          }
        },
        styles: {
          'input': { 'color': 'gray' },
          'input.ccv': { 'font-size': '16px' },
          'input.expiration-date': { 'font-size': '16px' },
          'input.card-number': { 'font-size': '16px' },
          '.valid': { 'color': 'green' },
          '.invalid': { 'color': 'red' }
        }
      });
      setTpReady(true);
    }
  }, []);

  const handleCheckout = async () => {
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.address) {
      setErrorMsg("請填寫完整的收件人資訊");
      return;
    }
    
    setErrorMsg("");
    setIsProcessing(true);

    try {
      // 1. Auto login/register dummy website user to get token for APIs
      let token = localStorage.getItem("website_token");
      if (!token) {
        const dummyEmail = `guest_${Date.now()}@example.com`;
        const regRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: dummyEmail, password: "password", name: shippingInfo.name, phone: shippingInfo.phone, address: shippingInfo.address })
        });
        const regData = await regRes.json();
        token = regData.token;
        if (token) localStorage.setItem("website_token", token);
      }

      if (!token) {
        throw new Error("無法驗證使用者身份");
      }

      // 2. Get Prime from TapPay SDK
      const tappayStatus = window.TPDirect.card.getTappayFieldsStatus();
      if (!tappayStatus.canGetPrime) {
        setErrorMsg("請填寫完整的信用卡資訊");
        setIsProcessing(false);
        return;
      }

      window.TPDirect.card.getPrime(async (result: any) => {
        if (result.status !== 0) {
          setErrorMsg("取得授權碼失敗: " + result.msg);
          setIsProcessing(false);
          return;
        }

        const prime = result.card.prime;

        try {
          // Post order directly with custom items list, passing prime to merge checkout and payment
          const ordRes = await fetch("/api/orders", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ 
              shipping_info: shippingInfo, 
              payment_method: "tappay",
              total_amount: finalTotal,
              prime: prime,
              items: localCart?.items ? localCart.items : [
                {
                   product_id: 1, // Suppose 1 is an existing product ID as a fallback fallback
                   quantity: 10,
                   price: 150,
                   config: { "款式": "美式喜帖 x 信封 | 東方紅", "蠟封": "玫瑰金" }
                }
              ]
            })
          });
          const ordData = await ordRes.json();
          if (!ordData.success) {
            setErrorMsg("扣款發生錯誤: " + (ordData.error || "建立訂單失敗"));
            setIsProcessing(false);
            return;
          }

          if (ordData.payment_url) {
            window.location.href = ordData.payment_url;
            return;
          }

          onSuccess();

        } catch (e: any) {
          setErrorMsg(e.message || "發生錯誤");
          setIsProcessing(false);
        }
      });

    } catch (e: any) {
      setErrorMsg(e.message || "發生錯誤");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 bg-white rounded-2xl shadow-xl">
      <div className="flex items-center gap-3 mb-8 border-b border-stone-100 pb-4">
        <ShoppingCart className="w-6 h-6 text-stone-800" />
        <h2 className="text-2xl font-serif text-stone-800">結帳</h2>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      <div className="mb-8 bg-stone-50 p-6 rounded-xl border border-stone-200">
        <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">訂單細節 (Order Summary)</h3>
        {localCart?.items ? localCart.items.map((item: any, i: number) => (
           <div key={i} className="flex justify-between items-center text-sm text-stone-700 mb-2">
              <span>商品 x {item.quantity}</span>
              <span>NT$ {(item.price * item.quantity).toLocaleString()}</span>
           </div>
        )) : null}
        {localCart?.items && localCart.items[0]?.shipping_fee > 0 && (
           <div className="flex justify-between items-center text-sm text-stone-500 mb-4 pb-4 border-b border-stone-200">
              <span>運費</span>
              <span>NT$ {localCart.items[0].shipping_fee.toLocaleString()}</span>
           </div>
        )}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-stone-200">
          <span className="font-medium text-stone-800">總計 (Total)</span>
          <span className="text-xl font-serif text-rose-600">NT$ {finalTotal.toLocaleString()}</span>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">1. 收件資訊</h3>
          <div className="space-y-4">
            <input type="text" placeholder="收件人姓名" value={shippingInfo.name} onChange={e => setShippingInfo({...shippingInfo, name: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-sm" />
            <input type="tel" placeholder="聯絡電話" value={shippingInfo.phone} onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-sm" />
            <input type="text" placeholder="收件地址" value={shippingInfo.address} onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})} className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-sm" />
          </div>
        </div>

        <div>
           <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">2. 信用卡付款 (TapPay)</h3>
           <div className="bg-stone-50 p-6 rounded-xl border border-stone-200">
             <div className="mb-4">
               <label className="block text-sm font-medium text-stone-700 mb-1">卡號</label>
               <div id="card-number" className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg h-[46px]"></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-medium text-stone-700 mb-1">到期日</label>
                 <div id="card-expiration-date" className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg h-[46px]"></div>
               </div>
               <div>
                 <label className="block text-sm font-medium text-stone-700 mb-1">安全碼 (CVV)</label>
                 <div id="card-ccv" className="w-full px-4 py-3 bg-white border border-stone-300 rounded-lg h-[46px]"></div>
               </div>
             </div>
             <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
                <span>支援 VISA, MasterCard, JCB</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> 加密安全連線</span>
             </div>
           </div>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-stone-200">
        <button 
          onClick={handleCheckout} 
          disabled={isProcessing || !tpReady}
          className="w-full bg-stone-900 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50"
        >
          {isProcessing ? '處理中...' : '確認送出訂單並付款'}
          {!isProcessing && <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

const Lock = ({className}: {className:string}) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V8a4 4 0 00-8 0v3m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V11a2 2 0 012-2h12a2 2 0 012 2z" /></svg>
)
