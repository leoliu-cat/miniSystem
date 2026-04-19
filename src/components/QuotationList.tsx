import React, { useState, useEffect, useMemo } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { FileText, ArrowRight, AlertCircle, Trash2, Copy, TrendingUp, Calendar, Download, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface QuotationListProps {
  onConvertToOrder: (quotation: any) => void;
  onEditQuote: (quotation: any) => void;
}

export default function QuotationList({ onConvertToOrder, onEditQuote }: QuotationListProps) {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const fetchQuotations = async () => {
    try {
      const response = await fetch('/api/quotations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQuotations(data);
        
        // Set default selected month to the most recent one if not set
        if (data.length > 0 && !selectedMonth) {
          const mostRecent = new Date(Math.max(...data.map((q: any) => new Date(q.created_at).getTime())));
          setSelectedMonth(format(mostRecent, 'yyyy-MM'));
        }
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      if (response.ok) {
        fetchQuotations();
      }
    } catch (error) {
      console.error('Error deleting quotation:', error);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const response = await fetch(`/api/quotations/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchQuotations();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDownloadPDF = async (quote: any) => {
    try {
      const data = JSON.parse(quote.quotation_data);
      const qd = data.quotationData;
      if (!qd) {
        alert('報價資料格式錯誤');
        return;
      }

      // Create a hidden container
      const container1 = document.createElement('div');
      container1.style.position = 'absolute';
      container1.style.left = '-9999px';
      container1.style.top = '0';
      container1.style.width = '800px';
      container1.style.backgroundColor = '#ffffff';
      container1.style.padding = '40px';
      container1.style.fontFamily = 'sans-serif';
      container1.style.color = '#333333';
      
      let html1 = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 24px; margin: 0 0 10px 0; color: #1c1917;">Mini Style Cards 報價單</h1>
          <p style="color: #78716c; margin: 0;">報價日期：${format(new Date(quote.created_at), 'yyyy-MM-dd')}</p>
        </div>
        
        <div style="margin-bottom: 30px; padding: 20px; background-color: #f5f5f4; border-radius: 8px;">
          <h2 style="font-size: 16px; margin: 0 0 15px 0; color: #1c1917; border-bottom: 1px solid #e7e5e4; padding-bottom: 10px;">客戶資訊</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div><strong>客戶名稱：</strong>${quote.customer_name || '未填寫'}</div>
            <div><strong>社群帳號：</strong>${quote.ig_handle || '未填寫'}</div>
            <div><strong>聯絡電話：</strong>${quote.phone || '未填寫'}</div>
            <div><strong>Email：</strong>${quote.email || '未填寫'}</div>
            <div><strong>預計婚期：</strong>${quote.wedding_date || '未填寫'}</div>
            <div><strong>預計交期：</strong>${quote.delivery_date || '未填寫'}</div>
          </div>
          ${quote.notes ? `<div style="margin-top: 10px; font-size: 14px; padding-top: 10px; border-top: 1px dashed #d6d3d1;"><strong>備註：</strong>${quote.notes}</div>` : ''}
        </div>

        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 16px; margin: 0 0 15px 0; color: #1c1917; border-bottom: 1px solid #e7e5e4; padding-bottom: 10px;">報價明細</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background-color: #f5f5f4; text-align: left;">
                <th style="padding: 10px; border-bottom: 2px solid #e7e5e4;">項目</th>
                <th style="padding: 10px; border-bottom: 2px solid #e7e5e4; text-align: right;">金額</th>
              </tr>
            </thead>
            <tbody>
      `;

      if (qd.pkg && qd.pkg.id !== 'none') {
        html1 += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f5f5f4;">
              <strong>【主方案】${qd.pkg.name}</strong><br/>
              <span style="color: #78716c; font-size: 12px;">包含：12x18cm 卡片、彩色信封、信封單面燙金、金屬燙金貼紙、電子喜帖(JPEG格式)</span><br/>
              <span style="color: #78716c; font-size: 12px;">單價：${qd.pkg.price} 元/份 x ${qd.calcQty} 份</span>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #f5f5f4; text-align: right;">NT$ ${qd.baseTotal.toLocaleString()}</td>
          </tr>
        `;
      }

      if (qd.addonDetails && qd.addonDetails.length > 0) {
        html1 += `
          <tr>
            <td colspan="2" style="padding: 15px 10px 5px 10px; font-weight: bold; color: #57534e;">【專屬加購】</td>
          </tr>
        `;
        qd.addonDetails.forEach((addon: any) => {
          if (addon.total > 0) {
            html1 += `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #f5f5f4;">
                  ${addon.name}<br/>
                  <span style="color: #78716c; font-size: 12px;">${addon.customText ? addon.customText.replace(/\\n/g, '<br/>') : addon.calcStr}</span>
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #f5f5f4; text-align: right;">NT$ ${addon.total.toLocaleString()}</td>
              </tr>
            `;
          }
        });
      }

      if (qd.setupFee > 0) {
        html1 += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f5f5f4;"><strong>【上機版費】</strong><br/><span style="color: #78716c; font-size: 12px;">未滿100份基本上機費</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #f5f5f4; text-align: right;">NT$ ${qd.setupFee.toLocaleString()}</td>
          </tr>
        `;
      }

      if (qd.discountAmount > 0) {
        html1 += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #f5f5f4; color: #e11d48;"><strong>【專屬優惠】</strong> ${qd.discountName}</td>
            <td style="padding: 10px; border-bottom: 1px solid #f5f5f4; text-align: right; color: #e11d48;">-NT$ ${qd.discountAmount.toLocaleString()}</td>
          </tr>
        `;
      }

      html1 += `
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          <div style="width: 400px; font-size: 13px; color: #57534e; line-height: 1.6;">
            <h3 style="font-size: 14px; color: #1c1917; margin: 0 0 10px 0; border-bottom: 1px solid #e7e5e4; padding-bottom: 5px;">公司資訊</h3>
            <div><strong>公司名稱：</strong>樂卡科技有限公司</div>
            <div><strong>統一編號：</strong>83313817</div>
            <div><strong>聯絡人：</strong>Leo</div>
            <div><strong>電話：</strong>03-4687530</div>
            <div><strong>Email：</strong>info@ministylecards.com</div>
          </div>

          <div style="width: 300px; background-color: #fafaf9; padding: 20px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span style="color: #57534e;">小計：</span>
              <span style="font-weight: bold;">NT$ ${qd.subtotalValue.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span style="color: #57534e;">運費：</span>
              <span style="font-weight: bold;">NT$ ${qd.shippingFee.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e7e5e4; font-size: 18px;">
              <span style="font-weight: bold; color: #1c1917;">總計：</span>
              <span style="font-weight: bold; color: #e11d48;">NT$ ${qd.finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;

      container1.innerHTML = html1;
      document.body.appendChild(container1);

      let container2: HTMLDivElement | null = null;
      if (data.terms) {
        container2 = document.createElement('div');
        container2.style.position = 'absolute';
        container2.style.left = '-9999px';
        container2.style.top = '0';
        container2.style.width = '800px';
        container2.style.backgroundColor = '#ffffff';
        container2.style.padding = '40px';
        container2.style.fontFamily = 'sans-serif';
        container2.style.color = '#333333';
        
        container2.innerHTML = `
          <div>
            <h3 style="font-size: 16px; color: #1c1917; margin: 0 0 15px 0; border-bottom: 1px solid #e7e5e4; padding-bottom: 10px;">注意事項與條款</h3>
            <div style="font-size: 12px; color: #78716c; line-height: 1.6; white-space: pre-wrap;">${data.terms}</div>
          </div>
        `;
        document.body.appendChild(container2);
      }

      const canvas1 = await html2canvas(container1, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      document.body.removeChild(container1);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const pdfHeight1 = (canvas1.height * pdfWidth) / canvas1.width;
      let heightLeft1 = pdfHeight1;
      let position1 = 0;

      pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, position1, pdfWidth, pdfHeight1);
      heightLeft1 -= pageHeight;

      while (heightLeft1 > 0) {
        position1 -= pageHeight;
        pdf.addPage();
        pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, position1, pdfWidth, pdfHeight1);
        heightLeft1 -= pageHeight;
      }

      if (container2) {
        const canvas2 = await html2canvas(container2, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        document.body.removeChild(container2);

        pdf.addPage();
        const pdfHeight2 = (canvas2.height * pdfWidth) / canvas2.width;
        let heightLeft2 = pdfHeight2;
        let position2 = 0;

        pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, position2, pdfWidth, pdfHeight2);
        heightLeft2 -= pageHeight;

        while (heightLeft2 > 0) {
          position2 -= pageHeight;
          pdf.addPage();
          pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, position2, pdfWidth, pdfHeight2);
          heightLeft2 -= pageHeight;
        }
      }

      pdf.save(`報價單_${quote.ig_handle || quote.customer_name || '未填寫'}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('產生 PDF 時發生錯誤');
    }
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    quotations.forEach(q => {
      if (q.created_at) {
        months.add(format(new Date(q.created_at), 'yyyy-MM'));
      }
    });
    return Array.from(months).sort().reverse();
  }, [quotations]);

  const filteredQuotations = useMemo(() => {
    if (!selectedMonth) return quotations;
    return quotations.filter(q => {
      if (!q.created_at) return false;
      return format(new Date(q.created_at), 'yyyy-MM') === selectedMonth;
    });
  }, [quotations, selectedMonth]);

  const stats = useMemo(() => {
    const total = filteredQuotations.length;
    const converted = filteredQuotations.filter(q => q.status === 'ordered').length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
    
    return { total, converted, conversionRate };
  }, [filteredQuotations]);

  if (loading) {
    return <div className="p-8 text-center text-stone-500">載入中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500 mb-1">報價次數</p>
            <p className="text-3xl font-bold text-stone-800">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
            <FileText className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500 mb-1">成功轉單</p>
            <p className="text-3xl font-bold text-stone-800">{stats.converted}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-500">
            <ArrowRight className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500 mb-1">轉換率</p>
            <p className="text-3xl font-bold text-stone-800">{stats.conversionRate}%</p>
          </div>
          <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-rose-500" />
            報價紀錄管理
          </h2>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-stone-200 rounded-lg text-sm font-medium text-stone-700 outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            >
              <option value="">全部月份</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-sm text-stone-500">
                <th className="p-4 font-medium">建立日期</th>
                <th className="p-4 font-medium">客戶名稱 / 社群帳號</th>
                <th className="p-4 font-medium">聯絡方式</th>
                <th className="p-4 font-medium">備註</th>
                <th className="p-4 font-medium">總金額</th>
                <th className="p-4 font-medium">狀態</th>
                <th className="p-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredQuotations.map(quote => {
                const daysSince = differenceInDays(new Date(), new Date(quote.created_at));
                const isWarning = quote.status === 'pending' && daysSince >= 7;

                return (
                  <tr key={quote.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="p-4 text-stone-600">
                      {format(new Date(quote.created_at), 'yyyy-MM-dd HH:mm')}
                      {isWarning && (
                        <div className="flex items-center gap-1 text-rose-500 text-xs mt-1 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          已超過 {daysSince} 天未轉單
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-stone-800">{quote.customer_name || '未填寫'}</div>
                      <div className="text-stone-500 text-xs">{quote.ig_handle || '無社群帳號'}</div>
                    </td>
                    <td className="p-4 text-stone-600">
                      <div>{quote.email || '-'}</div>
                      <div>{quote.phone || '-'}</div>
                    </td>
                    <td className="p-4 text-stone-600 max-w-xs truncate" title={quote.notes || ''}>
                      {quote.notes || '-'}
                    </td>
                    <td className="p-4 font-medium text-stone-800">
                      NT$ {quote.total_amount?.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <select
                        value={quote.status}
                        onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border outline-none ${
                          quote.status === 'ordered' 
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : quote.status === 'cancelled'
                            ? 'bg-stone-100 text-stone-600 border-stone-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="pending">追蹤中</option>
                        <option value="ordered">已轉單</option>
                        <option value="cancelled">已取消</option>
                      </select>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleDownloadPDF(quote)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg text-xs font-medium transition-colors"
                        title="下載 PDF"
                      >
                        <Download className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/quote/${quote.id}`;
                          navigator.clipboard.writeText(url);
                          alert('已複製報價連結！');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-stone-600 hover:bg-stone-200 rounded-lg text-xs font-medium transition-colors"
                        title="複製報價連結"
                      >
                        <Copy className="w-3 h-3" />
                        網頁
                      </button>
                      {quote.status !== 'ordered' && (
                        <button
                          onClick={() => onConvertToOrder(quote)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-medium transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" />
                          轉訂單
                        </button>
                      )}
                      <button
                        onClick={() => onEditQuote(quote)}
                        className="p-1.5 text-stone-400 hover:text-blue-500 rounded-lg transition-colors"
                        title="編輯"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(quote.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredQuotations.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    目前沒有任何報價紀錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-medium text-stone-800 mb-2">確認刪除</h3>
              <p className="text-stone-500 mb-6">確定要刪除這筆報價紀錄嗎？此動作無法復原。</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                >
                  確定刪除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
