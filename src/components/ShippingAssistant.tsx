import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import * as XLSX from 'xlsx';
import { Trash2 } from 'lucide-react';

export interface ShippingOrder {
  recipientName: string;
  recipientPhone: string;
  address: string;
  orderNo: string;
  itemName?: string;
  quantity?: string;
  scannedAt: number;
}

export const ShippingAssistant = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (scanning && stream) {
      let animationFrameId: number;

      const scanLoop = () => {
        if (!scanning || !stream) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
              handleQRCode(code.data);
              stopCamera();
              return;
            }
          }
        }
        animationFrameId = requestAnimationFrame(scanLoop);
      };

      animationFrameId = requestAnimationFrame(scanLoop);

      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [scanning, stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 1280 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
      setScanning(true);
    } catch (err) {
      setError("無法啟用相機，請確認瀏覽器支援、HTTPS 連線以及相機權限。");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setScanning(false);
  };

  const handleQRCode = (data: string) => {
    try {
      const result = JSON.parse(data);
      if (result.recipientName || result.address || result.orderNo) {
        addOrder({
          recipientName: result.recipientName || '未知客戶',
          recipientPhone: result.recipientPhone || '無號碼',
          address: result.address || '無地址',
          orderNo: result.orderNo || `QR-${Date.now().toString().slice(-6)}`,
          itemName: result.itemName || '喜帖',
          quantity: result.quantity || '1',
          scannedAt: Date.now()
        });
      } else {
        throw new Error("Invalid JSON fields");
      }
    } catch (e) {
      addOrder({
        recipientName: '快速錄入',
        recipientPhone: 'N/A',
        address: '掃描原始內容: ' + data.substring(0, 50),
        orderNo: data.length > 20 ? data.substring(0, 20) + "..." : data,
        itemName: '未知品項',
        quantity: '1',
        scannedAt: Date.now()
      });
    }
  };

  const addOrder = (order: ShippingOrder) => {
    let baseOrderNo = order.orderNo;
    let newOrderNo = baseOrderNo;
    let counter = 1;
    
    // Auto-increment suffix if orderNo exists
    setOrders(prev => {
      while (prev.some(o => o.orderNo === newOrderNo)) {
        newOrderNo = `${baseOrderNo}-${counter}`;
        counter++;
      }
      order.orderNo = newOrderNo;
      return [order, ...prev];
    });

    setShowSuccessOverlay(true);
    if ('vibrate' in navigator) navigator.vibrate(100);
    setTimeout(() => {
      setShowSuccessOverlay(false);
    }, 1500);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code) {
          handleQRCode(code.data);
          setError(null);
        } else {
          setError("該圖片中找不到有效的 QR Code，請確認圖片清晰且無遮擋。");
        }
      }
    };
    img.src = URL.createObjectURL(file);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeOrder = (index: number) => {
    setOrders(prev => {
        const newOrders = [...prev];
        newOrders.splice(index, 1);
        return newOrders;
    });
  };

  const exportToExcel = () => {
    // Row 1: Headers based on S.F. Express Template
    const row1 = [
      "*客戶訂單號", "*寄件方姓名", "寄件方手機號", "寄件方固定電話", "*寄件方詳細地址", "寄件方縣/區", "*寄件方城市", "*寄件方州/省", "*寄件方國家/地區", "*寄件方郵編", "寄件方郵箱", "寄件類型", "寄件方公司", "*收件方姓名", "收件方手機號", "收件方固定電話", "*收件方詳細地址", "道路名", "建築編號", "收件方縣/區", "*收件方城市", "*收件方州/省", "*收件方國家/地區", "*收件方郵編", "收件方郵箱", "收件類型", "收件方公司", "*商品名稱", "*商品數量", "*單位", "*商品單價", "*包裹總件數", "*總重量", "長度單位", "長", "寬", "高", "*商品貨幣", "*快件類型", "代收貨款卡號", "代收貨款金額", "保價聲明價值", "密碼認證", "簽單返還內容", "簽單返還備註", "簽回單數量", "要求遞送確認簽名", "包裝服務", "*寄件方式", "預約時間", "運單備註", "*付款方式", "月結卡號", "月結卡號密碼", "PO Number"
    ];

    // Row 2: Validation rules/Descriptions based on S.F. Express Template
    const row2 = [
      "必填，支持輸入字母和數字，max=64", "必填， max=100", "max=20，寄件方手機號和固定電話至少填寫一項", "max=20，寄件方手機號和固定電話至少填寫一項", "必填，max=200", "非必填，max=128", "必填，max=128", "必填，max=64", "必選，下拉選擇", "max=20，必填。 沒有郵編的國家/地區可以不填寫。", "非必填，max=128", "下拉選擇", "max=100，當【寄件類型】為“公司件”時，則此處必填", "必填，max=100", "收件方手機號和固定電話至少填寫一項， max=20", "收件方手機號和固定電話至少填寫一項，max=20", "必填，max=200", "當收件國家為韓國時必填， 其餘國家/地區非必填， max=100", "當收件國家為韓國時必填， 其餘國家/地區非必填， max=100", "非必填，max=128", "必填，max=128", "必填，max=64", "必選，下拉選擇", "max=20，必填。 沒有郵編的國家/地區可以不填寫。", "非必填，max=128", "下拉選擇", "max=100，當【收件類型】為“公司件”時，則此處必填", "必填，max=100", "必填，僅支持輸入數字， max=17", "商品的單位， 舉例：件/包/ 袋，必填， max=30", "必填，max = 23", "必填，僅支持輸入數字，max=4", "必填，max=17", "下拉選擇，非必選", "非必填，僅支持輸入數字，max=17", "非必填，僅支持輸入數字，max=17", "非必填，僅支持輸入數字，max=17", "必選，下拉選擇", "必選，下拉選擇", "如需代收貨款服務，則此項必填，max = 30", "如需代收貨款服務，則此項必填，max = 30", "max = 30", "密碼認證，下拉選擇， 非必選。", "max = 50", "max =15", "輸入框", "下拉選擇", "輸入框", "下拉選擇，必選", "日期格式為 2021/01/22 18:30， 非必填", "非必填，max=200", "下拉選擇，必選", "月結卡號/月結帳號", "第三方付必填", "非必填"
    ];

    // Data starting from Row 3
    const dataRows = orders.map(o => {
      const r = Array(row1.length).fill("");
      r[0] = o.orderNo;
      r[1] = "MiniStyleCards";
      r[2] = "03-4687530";
      r[4] = "平鎮區新富五街168號４樓";
      r[5] = "平鎮區";
      r[6] = "桃園市";
      r[7] = "桃園市";
      r[8] = "中國臺灣";
      r[9] = "32474";
      r[11] = "公司件";
      r[12] = "MiniStyleCards";
      r[13] = o.recipientName;
      r[14] = o.recipientPhone;
      r[16] = o.address;
      r[20] = "中國臺灣";
      r[21] = "中國臺灣";
      r[22] = "中國臺灣";
      r[23] = "886";
      r[25] = "個人件";
      r[27] = o.itemName || "喜帖";
      r[28] = o.quantity || "1";
      r[29] = "box";
      r[30] = "450";
      r[31] = "1";
      r[32] = "1";
      r[37] = "TWD";
      r[38] = "順豐特快";
      r[48] = "自行聯系快遞員或自寄";
      r[51] = "寄付";
      r[52] = "8860708205";
      return r;
    });

    const combinedData = [row1, row2, ...dataRows];
    
    // Create XLSX workbook and worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(combinedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "順豐入庫清單");
    
    // Write and save file
    XLSX.writeFile(workbook, `Mini順風快遞入庫單_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <section id="shipping" className="bg-stone-50 h-full overflow-auto text-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <span className="text-bronze font-bold tracking-[0.2em] uppercase text-sm">Native QR Scanner</span>
          <h2 className="text-4xl font-serif text-stone-900 mt-2">智慧物流入庫</h2>
          <p className="text-stone-600 mt-4 max-w-2xl mx-auto font-light">
            使用原生掃描技術，對準 QR Code 即可自動提取資料。成功識別後鏡頭會自動關閉以節省電力。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-stone-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h2"/><path d="M7 11h2"/><path d="M7 15h2"/><path d="M11 7h2"/><path d="M11 11h2"/><path d="M11 15h2"/><path d="M15 7h2"/><path d="M15 11h2"/><path d="M15 15h2"/></svg>
                掃描區域
              </h3>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="text-amber-700 text-sm font-bold border-b border-amber-700 hover:text-stone-900 transition-all">
                從相簿上傳
              </button>
            </div>
            
            <div className="relative aspect-square md:aspect-video bg-stone-900 rounded-lg overflow-hidden border-4 border-stone-50 shadow-inner">
              <video 
                ref={videoRef} 
                className={`w-full h-full object-cover ${!stream ? 'hidden' : ''}`} 
                autoPlay 
                playsInline 
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* 鏡頭關閉時的提示 */}
              {!stream && !showSuccessOverlay && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 bg-stone-100/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-20"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  <p className="text-xs uppercase tracking-widest font-bold">鏡頭已關閉</p>
                </div>
              )}

              {/* 掃描指引框 */}
              {stream && !showSuccessOverlay && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-white/30 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-500 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-500 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-500 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-500 rounded-br-xl"></div>
                    {/* 掃描線 */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.9)] animate-pulse"></div>
                  </div>
                  <div className="absolute bottom-10 text-white/70 text-xs font-bold tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md">
                    正在即時偵測 QR Code...
                  </div>
                </div>
              )}

              {/* 成功辨識後的遮罩 */}
              {showSuccessOverlay && (
                <div className="absolute inset-0 z-30 bg-green-500/60 flex items-center justify-center backdrop-blur-sm transition-all duration-300">
                  <div className="bg-white rounded-full p-6 scale-125 shadow-2xl animate-bounce">
                    <svg className="text-green-500 w-12 h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              {!stream ? (
                <button onClick={startCamera} className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  {orders.length > 0 ? '繼續掃描下一件' : '啟動自動掃描'}
                </button>
              ) : (
                <button onClick={stopCamera} className="w-full bg-stone-200 text-stone-800 py-4 rounded-xl font-bold hover:bg-stone-300 transition-all flex items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
                  暫停掃描
                </button>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm flex items-start gap-3">
                <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div>{error}</div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-stone-800">已入庫清單 ({orders.length})</h3>
              <button onClick={exportToExcel} disabled={orders.length === 0} className="bg-stone-900 text-white px-6 py-2 rounded-lg text-sm hover:bg-stone-800 transition-all disabled:opacity-50 font-bold">
                導出 Excel (順豐格式)
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[450px] border border-stone-50 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 border-b sticky top-0 z-20">
                  <tr>
                    <th className="p-4 text-stone-500 font-medium">客戶資訊</th>
                    <th className="p-4 text-stone-500 font-medium">單號</th>
                    <th className="p-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {orders.map((order, i) => (
                    <tr key={i} className="hover:bg-stone-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-stone-800">{order.recipientName}</div>
                        <div className="text-[10px] text-stone-500 truncate max-w-[200px]" title={order.address}>{order.address}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-mono text-amber-700 font-bold">{order.orderNo}</div>
                        <div className="text-[10px] text-stone-400 mt-0.5">{order.recipientPhone}</div>
                      </td>
                      <td className="p-4 text-right">
                        <button onClick={() => removeOrder(i)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="刪除">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-24 text-center">
                        <div className="flex flex-col items-center gap-3 text-stone-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="10" x="7" y="7" rx="1"/></svg>
                          <span className="italic text-sm">尚未有掃描記錄</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
