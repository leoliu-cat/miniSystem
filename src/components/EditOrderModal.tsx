import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { processingOptionsSchema, processingOptionLabels } from '../App';

interface EditOrderModalProps {
  order: any;
  onClose: () => void;
  onSave: (updatedOrder: any) => void;
  templates: any[];
  designers: any[];
}

export function EditOrderModal({ order, onClose, onSave, templates, designers }: EditOrderModalProps) {
  const [formData, setFormData] = useState({ ...order });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-stone-50">
          <h2 className="text-lg font-bold text-stone-800">編輯訂單 #{order.id} ({order.order_code})</h2>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="edit-order-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 內部資訊 */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
              <h3 className="font-bold text-stone-800 mb-4">內部資訊</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">樣板</label>
                  <select name="template_id" value={formData.template_id || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                    <option value="">請選擇</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">設計師</label>
                  <select name="designer_id" value={formData.designer_id || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                    <option value="">未指派</option>
                    {designers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">訂單狀態</label>
                  <select name="status" value={formData.status || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                    <option value="等待填寫資料">等待填寫資料</option>
                    <option value="新進訂單">新進訂單</option>
                    <option value="設計中">設計中</option>
                    <option value="製作中">製作中</option>
                    <option value="已發印">已發印</option>
                    <option value="已出貨">已出貨</option>
                    <option value="已結案">已結案</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">聯絡來源</label>
                  <select name="contact_source" value={formData.contact_source || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                    <option value="">請選擇</option>
                    <option value="FB">FB</option>
                    <option value="IG">IG</option>
                    <option value="Line">Line</option>
                    <option value="官網">官網</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">社群帳號/ID</label>
                  <input type="text" name="social_id" value={formData.social_id || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-stone-500 mb-1">備註</label>
                  <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm resize-none" placeholder="訂單備註事項..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">物流單號</label>
                  <input type="text" name="tracking_number" value={formData.tracking_number || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">付款日期</label>
                  <input type="date" name="payment_date" value={formData.payment_date || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">付款金額</label>
                  <input type="number" name="amount" value={formData.amount || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">設計期限</label>
                  <input type="date" name="design_deadline" value={formData.design_deadline || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">交件日期</label>
                  <input type="date" name="delivery_date" value={formData.delivery_date || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>
            </div>

            {/* 客戶填寫資訊 */}
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
              <h3 className="font-bold text-stone-800 mb-4">客戶填寫資訊</h3>
              
              <h4 className="text-sm font-bold text-stone-700 mb-2 border-b pb-1">新人資料</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">新郎中文姓名</label>
                  <input type="text" name="groom_name_zh" value={formData.groom_name_zh || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">新郎英文姓名</label>
                  <input type="text" name="groom_name_en" value={formData.groom_name_en || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">新娘中文姓名</label>
                  <input type="text" name="bride_name_zh" value={formData.bride_name_zh || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">新娘英文姓名</label>
                  <input type="text" name="bride_name_en" value={formData.bride_name_en || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-stone-700 mb-2 border-b pb-1">婚宴資訊</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">婚宴日期</label>
                  <input type="date" name="wedding_date" value={formData.wedding_date || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">婚宴時間</label>
                  <input type="text" name="wedding_time" value={formData.wedding_time || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">餐廳名稱</label>
                  <input type="text" name="venue_name" value={formData.venue_name || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">餐廳地址</label>
                  <input type="text" name="venue_address" value={formData.venue_address || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-stone-700 mb-2 border-b pb-1">收件資訊</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">收件人姓名</label>
                  <input type="text" name="receiver_name" value={formData.receiver_name || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">收件人電話</label>
                  <input type="text" name="receiver_phone" value={formData.receiver_phone || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-stone-500 mb-1">收件地址</label>
                  <input type="text" name="receiver_address" value={formData.receiver_address || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Email</label>
                  <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-stone-700 mb-2 border-b pb-1">其他選項</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">喜帖數量</label>
                  <input type="number" name="invitation_quantity" value={formData.invitation_quantity || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">封蠟樣式</label>
                  <select name="wax_seal_style" value={formData.wax_seal_style || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                    <option value="">金屬燙金貼紙 (預設)</option>
                    <option value="Save the date">Save the date</option>
                    <option value="With love">With love</option>
                    <option value="花草">花草</option>
                    <option value="牽手">牽手</option>
                    <option value="帝王花">帝王花</option>
                    <option value="MiniStyleCards Logo">MiniStyleCards Logo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">封蠟顏色</label>
                  <select name="wax_seal_color" value={formData.wax_seal_color || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm bg-white">
                    <option value="">無 (預設)</option>
                    <option value="霧金">霧金</option>
                    <option value="紅銅金">紅銅金</option>
                    <option value="古銅金">古銅金</option>
                    <option value="咖啡金">咖啡金</option>
                    <option value="復古金">復古金</option>
                    <option value="白色">白色</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">信封顏色</label>
                  <input type="text" name="envelope_color" value={formData.envelope_color || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">信封燙金位置</label>
                  <input type="text" name="envelope_foil_position" value={formData.envelope_foil_position || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">信封Logo</label>
                  <input type="text" name="envelope_logo" value={formData.envelope_logo || ''} onChange={handleChange} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm" />
                </div>
              </div>

              <h4 className="text-sm font-bold text-stone-700 mb-2 border-b pb-1 mt-6">加工選項</h4>
              <div className="space-y-4">
                {Object.entries(processingOptionLabels).map(([key, label]) => {
                  const currentOptions = formData.processing_options ? JSON.parse(formData.processing_options) : {};
                  const categoryData = currentOptions[key] || { tags: [], quantity: 0 };
                  const currentTags: string[] = Array.isArray(categoryData) ? categoryData : (categoryData.tags || []);
                  const currentQuantity: number = categoryData.quantity || 0;
                  
                  return (
                    <div key={key} className="flex gap-6 mb-6">
                      <div className="flex-1">
                        <div className="text-center mb-2">
                          <label className="text-sm font-medium text-stone-700">{label}:</label>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center border-b border-stone-200 pb-2 min-h-[36px]">
                          {currentTags.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-700 rounded text-sm">
                              {tag}
                              <button 
                                type="button" 
                                onClick={() => {
                                  const newTags = currentTags.filter((_, i) => i !== idx);
                                  const newOptions = { ...currentOptions, [key]: { tags: newTags, quantity: currentQuantity } };
                                  setFormData((prev: any) => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
                                }}
                                className="text-stone-400 hover:text-stone-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                          <div className="relative flex-1 min-w-[150px]">
                            <input
                              type="text"
                              list={`edit-datalist-${key}`}
                              placeholder="+ Tag"
                              className="w-full bg-transparent text-sm text-stone-600 outline-none placeholder:text-stone-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.currentTarget.value.trim();
                                  if (val && !currentTags.includes(val)) {
                                    const newTags = [...currentTags, val];
                                    const newOptions = { ...currentOptions, [key]: { tags: newTags, quantity: currentQuantity } };
                                    setFormData((prev: any) => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                              onChange={(e) => {
                                const val = e.target.value;
                                // Auto-add if the selected value matches a predefined option
                                const isOption = processingOptionsSchema[key]?.some(opt => opt.value === val);
                                if (isOption) {
                                  if (!currentTags.includes(val)) {
                                    const newTags = [...currentTags, val];
                                    const newOptions = { ...currentOptions, [key]: { tags: newTags, quantity: currentQuantity } };
                                    setFormData((prev: any) => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
                                  }
                                  e.target.value = '';
                                }
                              }}
                            />
                            <datalist id={`edit-datalist-${key}`}>
                              {processingOptionsSchema[key]?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.display}</option>
                              ))}
                            </datalist>
                          </div>
                        </div>
                      </div>
                      <div className="w-32 flex flex-col justify-end">
                        <input
                          type="number"
                          value={currentQuantity || ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value) : 0;
                            const newOptions = { ...currentOptions, [key]: { tags: currentTags, quantity: val } };
                            setFormData((prev: any) => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
                          }}
                          className="w-full text-center text-stone-600 border-b border-stone-200 outline-none pb-2 bg-transparent"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-stone-200 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors text-sm font-medium">
            取消
          </button>
          <button type="submit" form="edit-order-form" className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-medium flex items-center gap-2">
            <Save className="w-4 h-4" />
            儲存變更
          </button>
        </div>
      </div>
    </div>
  );
}
