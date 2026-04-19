import React, { useState, useEffect } from 'react';
import { FileText, Info, CreditCard, Loader2 } from 'lucide-react';

interface QuotationLinkProps {
  quotationId: string;
}

export default function QuotationLink({ quotationId }: QuotationLinkProps) {
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'terms' | 'payment'>('details');

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const response = await fetch(`/api/quotations/${quotationId}`);
        if (!response.ok) throw new Error('找不到報價單');
        const data = await response.json();
        setQuotation(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotation();
  }, [quotationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
          <FileText className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <h2 className="text-xl font-serif text-stone-800 mb-2">無法讀取報價單</h2>
          <p className="text-stone-500">{error || '報價單不存在或已刪除'}</p>
        </div>
      </div>
    );
  }

  const data = JSON.parse(quotation.quotation_data);
  const { quotationData } = data;

  const generateOrderText = () => {
    const { pkg, calcQty, baseTotal, addonDetails, setupFee, discountName, discountAmount, subtotalValue, shippingFee, finalTotal } = quotationData;
    
    let text = `您好，您的訂購資訊與報價如下：\n\n`;
    text += `【基本資訊】\n`;
    text += `社群帳號：${data.customer.ig || '未填寫'}\n`;
    text += `客戶姓名：${data.customer.name || '未填寫'}\n`;
    text += `聯絡電話：${data.customer.phone || '未填寫'}\n`;
    text += `Email：${data.customer.email || '未填寫'}\n`;
    text += `預計交期：${data.customer.deliveryDate || '未填寫'}\n`;
    if (quotation.notes) {
      text += `備註：${quotation.notes}\n`;
    }
    text += `\n`;

    if (pkg.id !== 'none') {
      text += `【主方案】\n`;
      text += `方案：${pkg.name}\n`;
      text += `包含：12x18cm 卡片、彩色信封、信封單面燙金、金屬燙金貼紙、電子喜帖(JPEG格式)\n`;
      text += `單價：${pkg.price}\n`;
      text += `數量：${calcQty}\n`;
      text += `小計：NT$ ${baseTotal.toLocaleString()}\n\n`;
    }

    if (addonDetails && addonDetails.length > 0) {
      text += `✨ 【專屬加購】\n`;
      addonDetails.forEach((item: any, idx: number) => {
        if (item.customText) {
          text += `${idx + 1}. ${item.customText}\n`;
        } else {
          text += `${idx + 1}. ${item.name} ${item.calcStr}${item.suffix}\n`;
        }
      });
      text += `\n`;
    }

    text += `【總計】\n`;
    if (setupFee > 0) text += `上機費：NT$ ${setupFee.toLocaleString()}\n`;
    if (discountAmount > 0) text += `折扣 (${discountName})：-NT$ ${discountAmount.toLocaleString()}\n`;
    text += `小計：NT$ ${subtotalValue.toLocaleString()}\n`;
    text += `運費：NT$ ${shippingFee.toLocaleString()}\n`;
    text += `總金額：NT$ ${finalTotal.toLocaleString()}\n`;

    return text;
  };

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif text-stone-800 mb-2">正式報價單</h1>
          <p className="text-stone-500">樂卡科技有限公司 (統編: 83313817)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-stone-200">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'details' ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-500' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              報價明細
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'terms' ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-500' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <Info className="w-4 h-4" />
              條款說明
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'payment' ? 'bg-rose-50 text-rose-600 border-b-2 border-rose-500' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              匯款資訊
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'details' && (
              <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-stone-700 bg-stone-50 p-6 rounded-xl">
                {generateOrderText()}
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-stone-700 bg-stone-50 p-6 rounded-xl">
                {data.terms || '無特殊條款說明'}
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="font-mono text-sm leading-relaxed text-stone-700 bg-stone-50 p-6 rounded-xl">
                <div className="mb-4">
                  <p className="font-bold mb-2">【匯款資訊】</p>
                  <p>銀行代碼：012</p>
                  <p>戶名　　：樂卡科技有限公司</p>
                  <p>帳號　　：82110000023603</p>
                </div>
                <div className="mb-4">
                  <p className="font-bold mb-2">【聯絡方式】</p>
                  <p>聯絡人　：Leo</p>
                  <p>電話　　：03-4687530</p>
                  <p>Email　 ：leo.liu@ministylecards.com</p>
                </div>
                <p className="text-stone-500 mt-6">
                  ※ 匯款完成後，請務必回覆告知匯款帳號後五碼，以便我們核對帳款，謝謝！
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
