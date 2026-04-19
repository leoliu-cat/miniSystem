import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function QuotationSettings({ onClose }: { onClose?: () => void }) {
  const [settings, setSettings] = useState<any>({
    packages: [],
    illustrators: [],
    addons: [],
    independentAddons: [],
    certificates: [],
    discounts: [],
    terms: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Parse JSON strings or use defaults
        setSettings({
          packages: data.quotation_packages ? JSON.parse(data.quotation_packages) : [
            { id: 'single_65', name: '300um 單卡式', price: 65, min: 30 },
            { id: 'arch_70', name: '300um 拱型單卡式', price: 70, min: 30 },
            { id: 'fold_75', name: '300um 象牙卡對折式', price: 75, min: 50 },
            { id: 'door_80', name: '300um 雙開門式', price: 80, min: 50 },
            { id: 'ticket_90', name: '300um 象牙卡機票套組 (機票+護照)', price: 90, min: 30 },
            { id: 'pull_130', name: '300um 象牙卡抽拉式套組', price: 130, min: 30 },
            { id: 'acrylic_125', name: '2mm 透明壓克力單面印', price: 125, min: 30 },
          ],
          illustrators: data.quotation_illustrators ? JSON.parse(data.quotation_illustrators) : [
            { id: 'none', teacher: '不需要', style: '', basePrice: 0, petPrice: 0 },
            { id: 'li', teacher: 'Li', style: '韓風寫實', basePrice: 7000, petPrice: 3500 },
            { id: 'xiaozhu', teacher: '小著', style: '色塊插畫', basePrice: 1800, petPrice: 500 },
            { id: 'susu', teacher: 'Su Su', style: '豆豆風', basePrice: 2500, petPrice: 500 },
            { id: 'soisoi', teacher: 'soi soi', style: '水彩風', basePrice: 2800, petPrice: 500 },
            { id: 'daihua_cute', teacher: '戴花', style: '可愛風', basePrice: 2800, petPrice: 500 },
            { id: 'daihua_fashion', teacher: '戴花', style: '時尚水彩風', basePrice: 3500, petPrice: 500 },
            { id: 'leo', teacher: 'Leo', style: '線條插畫', basePrice: 1000, petPrice: 500 },
            { id: 'crayon', teacher: '小著', style: '蠟筆風', basePrice: 3000, petPrice: 500 },
          ],
          addons: data.quotation_addons ? JSON.parse(data.quotation_addons) : [
            { id: 'liner', name: '信封內襯', price: 20, type: 'per_item' },
            { id: 'foil_single', name: '喜帖燙金 (單面)', price: 20, type: 'per_item_min_100' },
            { id: 'foil_double', name: '喜帖燙金 (雙面)', price: 25, type: 'per_item_min_100' },
            { id: 'wax_seal', name: '升級封蠟貼紙', price: 10, type: 'per_item' },
            { id: 'card_single', name: '象牙材質小卡 (單面10x14cm)', price: 20, type: 'per_item' },
            { id: 'card_double', name: '象牙材質小卡 (雙面10x14cm)', price: 25, type: 'per_item' },
            { id: 'card_shape', name: '象牙材質小卡 (造型10x14cm)', price: 30, type: 'per_item' },
            { id: 'clear_sleeve', name: '透明封套', price: 25, type: 'per_item' },
            { id: 'airplane', name: '飛機吊飾 (含綁繩)', price: 25, type: 'per_item' },
            { id: 'ribbon', name: '緞帶', price: 30, type: 'per_item' },
          ],
          independentAddons: data.quotation_independent_addons ? JSON.parse(data.quotation_independent_addons) : [
            { id: 'env_extra', name: '信封/封', price: 15 },
            { id: 'env_foil', name: '信封單面燙金/封', price: 6 },
            { id: 'vow_book', name: '誓言本/本', price: 480 },
            { id: 'guest_book', name: '禮金簿/簽到本', price: 980 },
            { id: 'scroll', name: '簽名軸', price: 1280 },
            { id: 'wax_stamp', name: '客製封蠟印章', price: 1200 },
            { id: 'sample', name: '樣品包', price: 360 },
            { id: 'tissue', name: '客製面紙包/100包', price: 1200 },
            { id: 'frame_s', name: '無框畫(小)-33x24cm', price: 680 },
            { id: 'frame_m', name: '無框畫(中)-38x45.5cm', price: 800 },
            { id: 'frame_l', name: '無框畫(大)-343.5x63.5cm', price: 1480 },
          ],
          certificates: data.quotation_certificates ? JSON.parse(data.quotation_certificates) : [
            { id: 'cert_a', name: '結婚書約A', price: 3990, desc: '客製壓克力書約x1,展示木底座x1,紙本書約x2,客製書約夾x1,胡桃木紋相框x1' },
            { id: 'cert_b', name: '結婚書約B', price: 3490, desc: '客製壓克力書約x1,展示木底座x1,紙本書約x2,客製書約夾x1' },
            { id: 'cert_c', name: '結婚書約C', price: 2890, desc: '紙本書約x3,客製書約夾x1' },
          ],
          discounts: data.quotation_discounts ? JSON.parse(data.quotation_discounts) : [
            { minQty: 500, rate: 0.7, name: '500份以上 7 折' },
            { minQty: 400, rate: 0.8, name: '400份以上 8 折' },
            { minQty: 300, rate: 0.85, name: '300份以上 85 折' },
            { minQty: 200, rate: 0.9, name: '200份以上 9 折' },
          ],
          terms: data.quotation_terms || `注意事項：
＊各電腦螢幕會有色彩差異，請勿以電腦螢幕作為信封或圖稿顏色之對色基準，若對顏色有嚴格要求者，請勿下訂。
＊設計、插畫修改僅限3次。
＊不論信封或是卡片正反面會依圖案狀況有不同程度之燙金壓力痕跡或是些許斑駁掉箔等正常現象，在非影響閱讀之情況下，資訊呈現些微斑駁掉箔等狀況，不屬於瑕疵將不提供退換貨服務。
＊信封、卡片燙金皆為傳統手工對位，會有3-5mm合理尺寸誤差偏移，若自備檔案有特殊要求者，請標記尺寸，未標記尺寸者將不得以此誤差作為退換貨理由。
＊信封或是卡片等紙製品成品尺寸，皆會有3-5 mm合理尺寸誤差，請知悉。
＊收到匯款後執行設計，插畫完稿時間需依諮詢時插畫師之檔期為主，婚卡設計皆以收到完整資料（婚宴資訊、照片繪製完成圖）開始計算10-14個工作天進行排版，確認圖稿後製作需2-3週，若有特殊交件日期要求請提前告知。
＊非活動贈送雙人插畫繪製提供300dpi高解析PNG檔案供留底紀念使用。
＊活動贈送雙人插畫繪製一律不提供插畫檔案、可另行加購或公開分享獲得。
＊一律不提供任何設計原始檔案, 確認印刷後僅提供確認搞jpg圖片檔(僅適合通訊軟體使用)當作電子喜帖使用。
＊商品完成後寄出不另行通知, 請留意快遞公司簡訊或電話通知。
＊完成插畫繪製，未設計婚卡前若退訂，須另支付插畫費用；若已完成婚卡設計者，未印刷前退訂，須支付訂單金額50%。
＊其他項目若已提供設計圖檔後退訂，皆僅退50％費用並且不以任何形式提供檔案。
＊開立電子發票寄至提供的Email地址, 若需要開立統編請成立訂單的2個工作日內要主動提供。
＊透過 Ministylecards 購買的所有商品設計，我們保留分享和展示的權利。
＊如果您希望保留設計的隱私，請提前告知，我們將尊重您的需求並不公開分享。`
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        quotation_packages: JSON.stringify(settings.packages),
        quotation_illustrators: JSON.stringify(settings.illustrators),
        quotation_addons: JSON.stringify(settings.addons),
        quotation_independent_addons: JSON.stringify(settings.independentAddons),
        quotation_certificates: JSON.stringify(settings.certificates),
        quotation_discounts: JSON.stringify(settings.discounts),
        quotation_terms: settings.terms
      };

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        alert('設定已儲存');
      } else {
        alert('儲存失敗');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('儲存發生錯誤');
    } finally {
      setSaving(false);
    }
  };

  const updateArrayItem = (arrayName: string, index: number, field: string, value: any) => {
    const newArray = [...settings[arrayName]];
    newArray[index] = { ...newArray[index], [field]: value };
    setSettings({ ...settings, [arrayName]: newArray });
  };

  const addArrayItem = (arrayName: string, defaultItem: any) => {
    setSettings({ ...settings, [arrayName]: [...settings[arrayName], defaultItem] });
  };

  const removeArrayItem = (arrayName: string, index: number) => {
    const newArray = [...settings[arrayName]];
    newArray.splice(index, 1);
    setSettings({ ...settings, [arrayName]: newArray });
  };

  if (loading) return <div className="p-8 text-center">載入中...</div>;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-stone-600" />
            </button>
          )}
          <h2 className="text-lg font-bold text-stone-800">報價單設定</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? '儲存中...' : '儲存所有設定'}
        </button>
      </div>

      <div className="p-6 space-y-8 h-[calc(100vh-16rem)] overflow-y-auto custom-scrollbar">
        
        {/* Packages */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-stone-800">主方案設定</h3>
            <button onClick={() => addArrayItem('packages', { id: `pkg_${Date.now()}`, name: '新方案', price: 0, min: 30 })} className="text-sm text-rose-600 hover:text-rose-700 flex items-center gap-1"><Plus className="w-4 h-4"/> 新增</button>
          </div>
          <div className="space-y-2">
            {settings.packages.map((pkg: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" value={pkg.name} onChange={e => updateArrayItem('packages', i, 'name', e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="方案名稱" />
                <input type="number" value={pkg.price} onChange={e => updateArrayItem('packages', i, 'price', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="單價" />
                <input type="number" value={pkg.min} onChange={e => updateArrayItem('packages', i, 'min', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="最低量" />
                <button onClick={() => removeArrayItem('packages', i)} className="p-1 text-stone-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </section>

        {/* Illustrators */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-stone-800">插畫師設定</h3>
            <button onClick={() => addArrayItem('illustrators', { id: `ill_${Date.now()}`, teacher: '新老師', style: '新畫風', basePrice: 0, petPrice: 0 })} className="text-sm text-rose-600 hover:text-rose-700 flex items-center gap-1"><Plus className="w-4 h-4"/> 新增</button>
          </div>
          <div className="space-y-2">
            {settings.illustrators.map((ill: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" value={ill.teacher} onChange={e => updateArrayItem('illustrators', i, 'teacher', e.target.value)} className="w-32 border rounded px-2 py-1 text-sm" placeholder="老師" />
                <input type="text" value={ill.style} onChange={e => updateArrayItem('illustrators', i, 'style', e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="畫風" />
                <input type="number" value={ill.basePrice} onChange={e => updateArrayItem('illustrators', i, 'basePrice', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="雙人價格" title="雙人價格" />
                <input type="number" value={ill.petPrice} onChange={e => updateArrayItem('illustrators', i, 'petPrice', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="寵物價格" title="寵物價格" />
                <button onClick={() => removeArrayItem('illustrators', i)} className="p-1 text-stone-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </section>

        {/* Addons */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-stone-800">加購項目 (隨訂單數量)</h3>
            <button onClick={() => addArrayItem('addons', { id: `addon_${Date.now()}`, name: '新項目', price: 0, type: 'per_item', defaultQtyType: 'order_qty' })} className="text-sm text-rose-600 hover:text-rose-700 flex items-center gap-1"><Plus className="w-4 h-4"/> 新增</button>
          </div>
          <div className="space-y-2">
            {settings.addons.map((addon: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" value={addon.name} onChange={e => updateArrayItem('addons', i, 'name', e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="項目名稱" />
                <input type="number" value={addon.price} onChange={e => updateArrayItem('addons', i, 'price', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="單價" />
                <select value={addon.type || 'per_item'} onChange={e => updateArrayItem('addons', i, 'type', e.target.value)} className="w-32 border rounded px-2 py-1 text-sm bg-white">
                  <option value="per_item">依份數計算</option>
                  <option value="per_item_min_100">未滿百以百計</option>
                </select>
                <select value={addon.defaultQtyType || 'order_qty'} onChange={e => updateArrayItem('addons', i, 'defaultQtyType', e.target.value)} className="w-32 border rounded px-2 py-1 text-sm bg-white">
                  <option value="order_qty">根據訂購數量</option>
                  <option value="fixed_1">默認 1</option>
                </select>
                <button onClick={() => removeArrayItem('addons', i)} className="p-1 text-stone-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </section>

        {/* Independent Addons */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-stone-800">獨立加購項目 (可填數量)</h3>
            <button onClick={() => addArrayItem('independentAddons', { id: `ind_${Date.now()}`, name: '新項目', price: 0, defaultQtyType: 'fixed_1' })} className="text-sm text-rose-600 hover:text-rose-700 flex items-center gap-1"><Plus className="w-4 h-4"/> 新增</button>
          </div>
          <div className="space-y-2">
            {settings.independentAddons.map((addon: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="text" value={addon.name} onChange={e => updateArrayItem('independentAddons', i, 'name', e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="項目名稱" />
                <input type="number" value={addon.price} onChange={e => updateArrayItem('independentAddons', i, 'price', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="單價" />
                <select value={addon.defaultQtyType || 'fixed_1'} onChange={e => updateArrayItem('independentAddons', i, 'defaultQtyType', e.target.value)} className="w-32 border rounded px-2 py-1 text-sm bg-white">
                  <option value="order_qty">根據訂購數量</option>
                  <option value="fixed_1">默認 1</option>
                </select>
                <button onClick={() => removeArrayItem('independentAddons', i)} className="p-1 text-stone-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
        </section>

        {/* Discounts */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-bold text-stone-800">折扣設定 (僅限有選擇主方案)</h3>
            <button onClick={() => addArrayItem('discounts', { minQty: 0, rate: 1, name: '新折扣' })} className="text-sm text-rose-600 hover:text-rose-700 flex items-center gap-1"><Plus className="w-4 h-4"/> 新增</button>
          </div>
          <div className="space-y-2">
            {settings.discounts.map((discount: any, i: number) => (
              <div key={i} className="flex gap-2 items-center">
                <input type="number" value={discount.minQty} onChange={e => updateArrayItem('discounts', i, 'minQty', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="最低數量" title="最低數量" />
                <input type="number" value={discount.rate} onChange={e => updateArrayItem('discounts', i, 'rate', Number(e.target.value))} className="w-24 border rounded px-2 py-1 text-sm" placeholder="折扣率" title="折扣率 (例如 0.9 = 9折)" step="0.01" />
                <input type="text" value={discount.name} onChange={e => updateArrayItem('discounts', i, 'name', e.target.value)} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="折扣名稱" />
                <button onClick={() => removeArrayItem('discounts', i)} className="p-1 text-stone-400 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-500 mt-2">請注意：折扣率填寫 0.9 代表 9 折，0.85 代表 85 折。折扣僅適用於「有選擇主方案」的訂單。</p>
        </section>

        {/* Terms */}
        <section>
          <h3 className="text-md font-bold text-stone-800 mb-4">注意事項條款</h3>
          <textarea
            value={settings.terms}
            onChange={e => setSettings({ ...settings, terms: e.target.value })}
            className="w-full h-64 border border-stone-300 rounded-lg p-4 text-sm font-mono leading-relaxed focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </section>

      </div>
    </div>
  );
}
