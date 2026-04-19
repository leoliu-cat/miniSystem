import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Printer, Download } from 'lucide-react';

interface PrintWorkOrderModalProps {
  order: any;
  onClose: () => void;
  designers: any[];
}

export function PrintWorkOrderModal({ order, onClose, designers }: PrintWorkOrderModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintWarning, setShowPrintWarning] = React.useState(false);

  const handlePrint = () => {
    // Check if we are in an iframe (preview mode)
    if (window.self !== window.top) {
      setShowPrintWarning(true);
      return;
    }

    const printContent = printRef.current;
    if (!printContent) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('請允許彈出視窗以進行列印');
      return;
    }

    // Write the content to the new window
    printWindow.document.write(`
      <html>
        <head>
          <title>列印工作單 - ${order.order_code || order.id}</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4;
              margin: 0;
            }
            .print-hidden {
              display: none !important;
            }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('work-order-qr');
    if (!svg) return;
    
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR_${order.order_code || order.id}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const designerName = designers.find(d => d.id === order.designer_id)?.name || '未指定';
  
  const qrCodeData = JSON.stringify({
    recipientName: order.receiver_name || order.bride_name_zh || order.groom_name_zh || "",
    recipientPhone: order.receiver_phone || "",
    address: order.receiver_address || "",
    orderNo: `${order.social_id || '無社群帳號'}_${order.id}`
  });

  const processingOptions = order.processing_options ? JSON.parse(order.processing_options) : {};

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'FB': return '#3b5998';
      case 'IG': return '#e11d48';
      case 'Line': return '#00c300';
      case '官網': return '#f97316';
      default: return '#6b7280';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <h2 className="text-lg font-bold text-stone-800">列印工作單</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium"
            >
              <Printer className="w-4 h-4" />
              列印
            </button>
            <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showPrintWarning && (
          <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start justify-between">
            <div className="text-amber-800 text-sm">
              <p className="font-bold mb-1">預覽模式受限</p>
              <p>因為目前在預覽環境中，無法直接呼叫列印功能。請點擊右上角的「在新分頁開啟」按鈕，在新分頁中即可正常列印。</p>
            </div>
            <button onClick={() => setShowPrintWarning(false)} className="text-amber-500 hover:text-amber-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 bg-stone-100">
          {/* Printable Area */}
          <div 
            ref={printRef} 
            className="bg-white mx-auto shadow-sm"
            style={{ 
              width: '210mm', 
              minHeight: '297mm', 
              fontFamily: 'sans-serif',
              color: '#333',
              position: 'relative'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', height: '60px' }}>
              <div style={{ flex: '1', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ backgroundColor: getSourceColor(order.contact_source), color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    {order.contact_source || '其他'}
                  </span>
                  <span style={{ fontSize: '16px', color: '#666', fontWeight: 'bold' }}>{order.social_id || '無社群帳號'}</span>
                </div>
              </div>
              <div style={{ width: '250px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '20px' }}>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  負責設計師 <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px', marginLeft: '8px' }}>{designerName}</span>
                </div>
              </div>
            </div>

            {/* Source Color Bar */}
            <div style={{ backgroundColor: getSourceColor(order.contact_source), height: '30px', width: '100%' }}></div>

            {/* Content Wrapper */}
            <div style={{ padding: '20px 40px' }}>
              {/* Client Info */}
              <div style={{ display: 'flex', marginBottom: '20px', fontSize: '15px', fontWeight: 'bold', color: '#555' }}>
                <div style={{ width: '25%' }}>{order.receiver_name || order.bride_name_zh || order.groom_name_zh || "未填寫收件人"}</div>
                <div style={{ width: '25%' }}>{order.receiver_phone || "未填寫電話"}</div>
                <div style={{ flex: '1', textAlign: 'right' }}>{order.receiver_address || "未填寫地址"}</div>
              </div>

              {/* Processing Options Table */}
              <div style={{ marginBottom: '40px', border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {Object.entries(processingOptions).map(([key, value]: [string, any]) => {
                      const categoryData = value || { tags: [], quantity: 0 };
                      const tags: string[] = Array.isArray(categoryData) ? categoryData : (categoryData.tags || []);
                      const quantity: number = categoryData.quantity || 0;
                      
                      if (tags.length === 0 && quantity === 0) return null;

                      let label = key;
                      switch(key) {
                        case 'Illustrator': label = '插畫'; break;
                        case 'Material': label = '卡片印刷'; break;
                        case 'CardsBronzing': label = '卡片燙金'; break;
                        case 'Envelope': label = '信封製作'; break;
                        case 'BackingPaper': label = '內襯製作'; break;
                        case 'Sticker': label = '貼紙選擇'; break;
                        case 'WaxStrips': label = '蠟條(9條1包)'; break;
                        case 'MarriageContract': label = '結婚書約'; break;
                        case 'Oath': label = '誓言本'; break;
                        case 'Ribbon': label = '緞帶'; break;
                        case 'Others': label = '其他'; break;
                      }

                      return (
                        <tr key={key}>
                          <td style={{ width: '25%', padding: '20px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#888', textAlign: 'center', verticalAlign: 'middle', fontWeight: '500' }}>
                            {label}
                          </td>
                          <td style={{ width: '75%', padding: '20px 30px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', color: '#555' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '4px' }}>
                              {tags.map((tag, i) => (
                                <span key={i} style={{ letterSpacing: '1px' }}>{tag}</span>
                              ))}
                            </div>
                            {quantity > 0 && <div style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>數量: {quantity}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dates Table */}
              <div style={{ marginBottom: '40px', border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', color: '#aaa', fontWeight: 'normal' }}>婚期/登記</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', color: '#aaa', fontWeight: 'normal' }}>設計完成日</th>
                      <th style={{ padding: '12px', borderBottom: '1px solid #e5e7eb', color: '#aaa', fontWeight: 'normal' }}>最後交件日</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb', color: '#555' }}>{order.wedding_date || "-"}</td>
                      <td style={{ padding: '12px', borderRight: '1px solid #e5e7eb', color: '#555' }}>{order.design_deadline || "-"}</td>
                      <td style={{ padding: '12px', color: '#555' }}>{order.delivery_date || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer Area */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '60px' }}>
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '20px', width: '60%', minHeight: '120px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>
                    設計師備註：
                  </div>
                  {/* Empty space for designer notes */}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <QRCodeSVG id="work-order-qr" value={qrCodeData} size={120} level="M" />
                  {/* Hide download button when printing */}
                  <button 
                    onClick={handleDownloadQR}
                    className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 transition-colors print:hidden"
                  >
                    <Download className="w-3 h-3" />
                    下載 QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
