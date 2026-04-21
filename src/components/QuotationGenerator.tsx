import React, { useState, useEffect, useMemo } from 'react';
import { Copy, CheckCircle, Calculator, AlertCircle, FileText, Settings, Save } from 'lucide-react';
import QuotationSettings from './QuotationSettings';

const PACKAGES = [
  { id: 'none', name: '不需要喜帖套餐', price: 0, min: 0 },
  { id: 'single_65', name: '300um 單卡式', price: 65, min: 30 },
  { id: 'arch_70', name: '300um 拱型單卡式', price: 70, min: 30 },
  { id: 'fold_75', name: '300um 象牙卡對折式', price: 75, min: 50 },
  { id: 'door_80', name: '300um 雙開門式', price: 80, min: 50 },
  { id: 'ticket_90', name: '300um 象牙卡機票套組 (機票+護照)', price: 90, min: 30 },
  { id: 'pull_130', name: '300um 象牙卡抽拉式套組', price: 130, min: 30 },
  { id: 'acrylic_125', name: '2mm 透明壓克力單面印', price: 125, min: 30 },
];

const ILLUSTRATORS = [
  { id: 'none', teacher: '不需要', style: '', basePrice: 0, petPrice: 0 },
  { id: 'li', teacher: 'Li', style: '韓風寫實', basePrice: 7000, petPrice: 3500 },
  { id: 'xiaozhu', teacher: '小著', style: '色塊插畫', basePrice: 1800, petPrice: 500 },
  { id: 'susu', teacher: 'Su Su', style: '豆豆風', basePrice: 2500, petPrice: 500 },
  { id: 'soisoi', teacher: 'soi soi', style: '水彩風', basePrice: 2800, petPrice: 500 },
  { id: 'daihua_cute', teacher: '戴花', style: '可愛風', basePrice: 2800, petPrice: 500 },
  { id: 'daihua_fashion', teacher: '戴花', style: '時尚水彩風', basePrice: 3500, petPrice: 500 },
  { id: 'leo', teacher: 'Leo', style: '線條插畫', basePrice: 1000, petPrice: 500 },
  { id: 'crayon', teacher: '小著', style: '蠟筆風', basePrice: 3000, petPrice: 500 },
];

const ADDONS = [
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
];

const INDEPENDENT_ADDONS = [
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
];

const CERTIFICATES = [
  { id: 'none', name: '不需要', price: 0, desc: '' },
  { id: 'A', name: '結婚書約A', price: 3990, desc: '客製壓克力書約x1, 展示木底座x1, 紙本書約x2, 客製書約夾x1, 胡桃木紋相框x1' },
  { id: 'B', name: '結婚書約B', price: 3490, desc: '客製壓克力書約x1, 展示木底座x1, 紙本書約x2, 客製書約夾x1' },
  { id: 'C', name: '結婚書約C', price: 2890, desc: '紙本書約x3, 客製書約夾x1' },
];

interface QuotationGeneratorProps {
  editQuoteData?: any;
  onClearEdit?: () => void;
}

export default function QuotationGenerator({ editQuoteData, onClearEdit }: QuotationGeneratorProps) {
  const [settings, setSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const defaultSettings = {
        packages: PACKAGES,
        illustrators: ILLUSTRATORS,
        addons: ADDONS,
        independentAddons: INDEPENDENT_ADDONS,
        certificates: CERTIFICATES,
        discounts: [
          { minQty: 500, rate: 0.7, name: '500份以上 7 折' },
          { minQty: 400, rate: 0.8, name: '400份以上 8 折' },
          { minQty: 300, rate: 0.85, name: '300份以上 85 折' },
          { minQty: 200, rate: 0.9, name: '200份以上 9 折' },
        ],
        terms: `注意事項：
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
      };

      try {
        const response = await fetch('/api/settings', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          const newSettings = {
            packages: (data.quotation_packages ? JSON.parse(data.quotation_packages) : defaultSettings.packages) || defaultSettings.packages,
            illustrators: (data.quotation_illustrators ? JSON.parse(data.quotation_illustrators) : defaultSettings.illustrators) || defaultSettings.illustrators,
            addons: (data.quotation_addons ? JSON.parse(data.quotation_addons) : defaultSettings.addons) || defaultSettings.addons,
            independentAddons: (data.quotation_independent_addons ? JSON.parse(data.quotation_independent_addons) : defaultSettings.independentAddons) || defaultSettings.independentAddons,
            certificates: (data.quotation_certificates ? JSON.parse(data.quotation_certificates) : defaultSettings.certificates) || defaultSettings.certificates,
            discounts: (data.quotation_discounts ? JSON.parse(data.quotation_discounts) : defaultSettings.discounts) || defaultSettings.discounts,
            terms: data.quotation_terms || defaultSettings.terms
          };
          setSettings(newSettings);
        } else {
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setSettings(defaultSettings);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  const [customer, setCustomer] = useState({
    name: '',
    ig: '',
    email: '',
    phone: '',
    weddingDate: '',
    deliveryDate: '',
    quantity: 100
  });
  const [notes, setNotes] = useState('');

  const [selectedPackageId, setSelectedPackageId] = useState<string>('single_65');
  const [selectedAddons, setSelectedAddons] = useState<Record<string, boolean>>({});
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [selectedIllustratorId, setSelectedIllustratorId] = useState<string>('none');
  const [petCount, setPetCount] = useState<number>(0);
  const [certificateId, setCertificateId] = useState<string>('none');
  const [coasterQty, setCoasterQty] = useState<number>(0);
  const [isCopiedOrder, setIsCopiedOrder] = useState(false);
  const [isCopiedTerms, setIsCopiedTerms] = useState(false);
  const [isCopiedConfirm, setIsCopiedConfirm] = useState(false);
  const [isCopiedShortQuote, setIsCopiedShortQuote] = useState(false);
  const [isCopiedShipping, setIsCopiedShipping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (editQuoteData) {
      try {
        const data = JSON.parse(editQuoteData.quotation_data);
        if (data.customer) setCustomer(data.customer);
        if (data.selectedPackageId) setSelectedPackageId(data.selectedPackageId);
        if (data.selectedAddons) setSelectedAddons(data.selectedAddons);
        
        if (data.addonQuantities) {
          setAddonQuantities(data.addonQuantities);
        } else if (data.independentAddons) {
          setAddonQuantities(data.independentAddons);
          const newSelected = { ...(data.selectedAddons || {}) };
          Object.keys(data.independentAddons).forEach(key => {
            if (data.independentAddons[key] > 0) {
              newSelected[key] = true;
            }
          });
          setSelectedAddons(newSelected);
        }

        if (data.selectedIllustratorId) setSelectedIllustratorId(data.selectedIllustratorId);
        if (data.petCount !== undefined) setPetCount(data.petCount);
        if (data.certificateId) setCertificateId(data.certificateId);
        if (data.coasterQty !== undefined) setCoasterQty(data.coasterQty);
        if (editQuoteData.notes) setNotes(editQuoteData.notes);
        setSavedQuoteId(editQuoteData.id);
      } catch (e) {
        console.error("Failed to parse editQuoteData", e);
      }
    } else {
      // Reset form if no edit data
      setCustomer({
        name: '',
        ig: '',
        email: '',
        phone: '',
        weddingDate: '',
        deliveryDate: '',
        quantity: 100
      });
      setNotes('');
      setSelectedPackageId('single_65');
      setSelectedAddons({});
      setAddonQuantities({});
      setSelectedIllustratorId('none');
      setPetCount(0);
      setCertificateId('none');
      setCoasterQty(0);
      setSavedQuoteId(null);
    }
  }, [editQuoteData]);

  const handleAddonToggle = (id: string) => {
    const isChecked = !selectedAddons[id];
    setSelectedAddons(prev => ({ ...prev, [id]: isChecked }));
    
    if (isChecked && !addonQuantities[id]) {
      // Find the addon to check its defaultQtyType
      const addon = settings.addons.find((a: any) => a.id === id) || settings.independentAddons.find((a: any) => a.id === id);
      const defaultQtyType = addon?.defaultQtyType || (settings.addons.some((a: any) => a.id === id) ? 'order_qty' : 'fixed_1');
      const defaultQty = defaultQtyType === 'fixed_1' ? 1 : (customer.quantity || 100);
      
      setAddonQuantities(prev => ({ ...prev, [id]: defaultQty }));
    }
  };

  const handleAddonQuantityChange = (id: string, qty: number) => {
    setAddonQuantities(prev => ({ ...prev, [id]: qty }));
  };

  const quotationData = useMemo(() => {
    if (!settings) return null;

    let pkg = settings.packages.find((p: any) => p.id === selectedPackageId);
    if (!pkg) {
      if (selectedPackageId === 'none') {
        pkg = { id: 'none', name: '不需要喜帖套餐', price: 0, min: 0 };
      } else if (settings.packages.length > 0) {
        pkg = settings.packages[0];
      } else {
        return null;
      }
    }
    
    // 處理最低起訂量
    let calcQty = customer.quantity || 0;
    let qtyWarning = '';
    if (pkg.id !== 'none') {
      calcQty = Math.max(30, customer.quantity || 0);
      if (customer.quantity < 30) {
        qtyWarning = '最低起訂量為 30 份，已自動以 30 份計算。';
      }
      if (pkg.min > calcQty) {
        calcQty = pkg.min;
        qtyWarning = `此方案最低起訂量為 ${pkg.min} 份，已自動以 ${pkg.min} 份計算。`;
      }
    }

    // 主方案計算
    const baseTotal = calcQty * pkg.price;

    // 加購項目計算
    const addonDetails: { name: string, calcStr: string, total: number, suffix: string, customText?: string }[] = [];
    let addonsTotal = 0;

    if (selectedIllustratorId && selectedIllustratorId !== 'none') {
      const ill = settings.illustrators.find((i: any) => i.id === selectedIllustratorId);
      if (ill) {
        const illTotal = ill.basePrice + (petCount * ill.petPrice);
        let illStr = `(雙人插畫 ${ill.basePrice}元`;
        if (petCount > 0) illStr += ` + 寵物 ${petCount}隻 ${petCount * ill.petPrice}元`;
        illStr += `)`;
        
        const customText = `插畫師專屬插畫\n老師：${ill.teacher}\n畫風：${ill.style}\n費用： ${illStr} = NT$ ${illTotal.toLocaleString()}`;
        
        addonDetails.push({
          name: `插畫師專屬插畫`,
          calcStr: '',
          total: illTotal,
          suffix: '',
          customText
        });
        addonsTotal += illTotal;
      }
    }

    settings.addons.forEach((addon: any) => {
      if (selectedAddons[addon.id]) {
        let itemTotal = 0;
        let calcStr = '';
        let suffix = '';
        const qty = addonQuantities[addon.id] !== undefined ? addonQuantities[addon.id] : calcQty;
        
        if (addon.type === 'per_item_min_100') {
          const foilQty = Math.max(100, qty);
          itemTotal = foilQty * addon.price;
          if (qty < 100) {
            calcStr = `(${addon.price}元) x ${qty}份\n(未滿100份以100份計)`;
          } else {
            calcStr = `(${addon.price}元) x ${qty}份`;
          }
          suffix = ` = NT$ ${itemTotal.toLocaleString()}`;
        } else {
          itemTotal = qty * addon.price;
          calcStr = `(${addon.price}元) x ${qty}份`;
          suffix = ` = NT$ ${itemTotal.toLocaleString()}`;
          if (addon.id === 'wax_seal') {
            suffix += `\n   顏色：待定, 樣式：待定`;
          }
        }
        
        addonDetails.push({
          name: addon.name,
          calcStr,
          total: itemTotal,
          suffix
        });
        addonsTotal += itemTotal;
      }
    });

    settings.independentAddons.forEach((addon: any) => {
      if (selectedAddons[addon.id]) {
        const qty = addonQuantities[addon.id] !== undefined ? addonQuantities[addon.id] : calcQty;
        let finalQty = qty;
        let suffixText = '';
        if (addon.id === 'env_foil' && qty < 100) {
          finalQty = 100;
          suffixText = '\n(未滿100份以100份計)';
        }
        const itemTotal = finalQty * addon.price;
        addonDetails.push({
          name: addon.name,
          calcStr: `(${addon.price}元) x ${qty}${suffixText}`,
          total: itemTotal,
          suffix: ` = NT$ ${itemTotal.toLocaleString()}`
        });
        addonsTotal += itemTotal;
      }
    });

    if (certificateId && certificateId !== 'none') {
      const cert = settings.certificates.find((c: any) => c.id === certificateId);
      if (cert) {
        let customText = `${cert.name}\n單價：${cert.price}\n數量：1 組\n內含物包含：${cert.desc}\n🎁 贈送雙人插畫(豆豆風/色塊風/線條)\n單價：0 (僅限本次活動)\n插畫師：su su/小著/Leo\n注意＊\n**豆豆/色塊/蠟筆/線條風格不提供服裝造型姿勢修改，依照片為主繪製\n**豆豆風/蠟筆/戴花似顏繪都是以老師風格為主，偏卡通可愛風格，相似度不高，若對相似度或細節有強迫症或一定要求的新人，請另購我們的韓風寫實插畫唷，謝謝`;
        addonDetails.push({
          name: cert.name,
          calcStr: '',
          total: cert.price,
          suffix: '',
          customText
        });
        addonsTotal += cert.price;
      }
    }

    let shippingFee = 120; // 基本運費

    if (coasterQty > 0) {
      let coasterPrice = 0;
      if (coasterQty <= 9) coasterPrice = 90;
      else if (coasterQty <= 49) coasterPrice = 70;
      else if (coasterQty <= 299) coasterPrice = 60;
      else if (coasterQty <= 499) coasterPrice = 55;
      else coasterPrice = 53;

      const coasterTotal = coasterQty * coasterPrice;
      const coasterShipping = Math.ceil(coasterQty / 100) * 120;
      shippingFee += coasterShipping;
      
      let customText = `陶瓷杯墊\n單價：${coasterPrice}\n數量：${coasterQty} 個\n小計：NT$ ${coasterTotal.toLocaleString()}\n杯墊運費：NT$ ${coasterShipping.toLocaleString()}`;
      if (coasterQty >= 300) {
        customText += `\n🎁 註：300pcs以上贈送豆豆風/蠟筆風/水彩風, 雙人插畫三選一`;
      }

      addonDetails.push({
        name: '陶瓷杯墊',
        calcStr: '',
        total: coasterTotal,
        suffix: '',
        customText
      });
      addonsTotal += coasterTotal;
    }

    // 上機費計算
    let setupFee = 0;
    if (calcQty >= 30 && calcQty <= 50) setupFee = 2000;
    else if (calcQty >= 51 && calcQty <= 79) setupFee = 1500;
    else if (calcQty >= 80 && calcQty <= 99) setupFee = 1000;
    else setupFee = 0;

    // 折扣計算
    let discountRate = 1;
    let discountName = '';
    
    // 只有選擇了主方案 (非 'none') 才有折扣
    if (pkg && pkg.id !== 'none') {
      // 確保折扣規則依照數量由大到小排序，才能正確套用最高門檻的折扣
      const sortedDiscounts = [...settings.discounts].sort((a, b) => b.minQty - a.minQty);
      
      for (const discount of sortedDiscounts) {
        if (calcQty >= discount.minQty) {
          discountRate = discount.rate;
          discountName = discount.name;
          break;
        }
      }
    }

    const discountAmount = Math.round(baseTotal * (1 - discountRate));
    const subtotalValue = baseTotal + addonsTotal + setupFee - discountAmount;
    const finalTotal = subtotalValue + shippingFee;

    return {
      pkg,
      calcQty,
      qtyWarning,
      baseTotal,
      addonDetails,
      setupFee,
      discountName,
      discountAmount,
      subtotalValue,
      shippingFee,
      finalTotal
    };
  }, [settings, customer, selectedPackageId, selectedAddons, addonQuantities, selectedIllustratorId, petCount, certificateId, coasterQty]);

  const generateOrderText = () => {
    const { pkg, calcQty, baseTotal, addonDetails, setupFee, discountName, discountAmount, subtotalValue, shippingFee, finalTotal } = quotationData;
    
    let text = `您好，您的訂購資訊與報價如下：\n\n`;
    text += `👤 客戶：${customer.ig || '未填寫'}\n`;
    text += `   婚期：${customer.weddingDate || '未填寫'}\n`;
    text += `   交期：${customer.deliveryDate || '未填寫'}\n`;
    if (notes) {
      text += `   備註：${notes}\n`;
    }
    text += `\n`;

    if (pkg.id !== 'none') {
      text += `🏷️ 【主方案】${pkg.name}\n`;
      text += `包含：12x18cm 卡片、彩色信封、信封單面燙金、金屬燙金貼紙、電子喜帖(JPEG格式)\n`;
      text += `單價：${pkg.price} 元/份\n`;
      text += `數量：${calcQty} 份\n`;
      text += ` 小計：NT$ ${baseTotal.toLocaleString()}\n\n`;
    }

    if (addonDetails.length > 0) {
      text += `✨ 【專屬加購】\n`;
      addonDetails.forEach((item, idx) => {
        if (item.customText) {
          text += `${idx + 1}. ${item.customText}\n`;
        } else {
          text += `${idx + 1}. ${item.name} ${item.calcStr}${item.suffix}\n`;
        }
      });
      text += `\n`;
    }

    text += `【上機版費】\n`;
    if (setupFee === 0) {
      text += `100份以上免版費 = NT$ 0\n\n`;
    } else {
      text += `未滿100份基本上機費 = NT$ ${setupFee.toLocaleString()}\n\n`;
    }

    if (discountAmount > 0) {
      text += `🎁 【專屬優惠】\n`;
      text += `${discountName} = -NT$ ${discountAmount.toLocaleString()}\n\n`;
    }

    let equationParts = [];
    if (baseTotal > 0) {
      if (discountAmount > 0) {
        equationParts.push(`${baseTotal} - ${discountAmount}`);
      } else {
        equationParts.push(baseTotal);
      }
    }
    addonDetails.forEach(a => { if (a.total > 0) equationParts.push(a.total); });
    if (setupFee > 0) equationParts.push(setupFee);
    
    let equationStr = equationParts.join(' + ');

    text += `小計：${equationStr} = ${subtotalValue.toLocaleString()}\n`;
    text += `運費：${shippingFee}元\n`;
    text += `合計：NT$ ${finalTotal.toLocaleString()}\n`;
    text += `--------------------------------\n`;
    text += `【匯款資訊】\n`;
    text += `戶名：樂卡科技有限公司\n`;
    text += `帳號：82110000023603\n`;
    text += `銀行代碼：012\n`;
    text += `------------------------------\n`;
    text += `以上資訊麻煩幫我確認，\n`;
    text += `並提供收貨地址、收件人、收件人電話、email地址。\n`;
    text += `匯款後麻煩提供後五碼。\n`;
    text += `------------------------------\n`;

    return text;
  };

  const generateTermsText = () => {
    return settings.terms;
  };

  const handleCopyOrder = async () => {
    try {
      await navigator.clipboard.writeText(generateOrderText());
      setIsCopiedOrder(true);
      setTimeout(() => setIsCopiedOrder(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyTerms = async () => {
    try {
      await navigator.clipboard.writeText(generateTermsText());
      setIsCopiedTerms(true);
      setTimeout(() => setIsCopiedTerms(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyShipping = async () => {
    try {
      const text = `收件人資訊\n姓名：\n電話：\n地址(含郵遞區號)：\nEmail地址：\n可以先給我，我幫您成立訂單喔！謝謝你😊👍`;
      await navigator.clipboard.writeText(text);
      setIsCopiedShipping(true);
      setTimeout(() => setIsCopiedShipping(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleCopyConfirm = async () => {
    try {
      await navigator.clipboard.writeText("以上是您的訂購明細, 再麻煩您幫我確認喔～謝謝你😊");
      setIsCopiedConfirm(true);
      setTimeout(() => setIsCopiedConfirm(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSaveQuotation = async () => {
    setIsSaving(true);
    try {
      const data = {
        customer_name: customer.name,
        ig_handle: customer.ig,
        email: customer.email,
        phone: customer.phone,
        wedding_date: customer.weddingDate,
        delivery_date: customer.deliveryDate,
        notes: notes,
        quotation_data: JSON.stringify({
          customer,
          selectedPackageId,
          selectedAddons,
          addonQuantities,
          selectedIllustratorId,
          petCount,
          certificateId,
          coasterQty,
          quotationData,
          terms: settings.terms
        }),
        total_amount: quotationData.finalTotal
      };

      const isEditing = !!editQuoteData;
      const url = isEditing ? `/api/quotations/${editQuoteData.id}` : '/api/quotations';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        const resData = await response.json();
        if (!isEditing && resData.id) {
          setSavedQuoteId(resData.id);
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert('儲存失敗，請稍後再試');
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      alert('儲存失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyShortQuote = async () => {
    if (!quotationData) return;
    try {
      const { finalTotal } = quotationData;
      await navigator.clipboard.writeText(`${customer.ig || '未填寫'} NT$${finalTotal.toLocaleString()}`);
      setIsCopiedShortQuote(true);
      setTimeout(() => setIsCopiedShortQuote(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (loadingSettings || !settings || !quotationData) {
    return <div className="p-8 text-center text-stone-500">載入設定中...</div>;
  }

  if (showSettings) {
    return (
      <div className="lg:h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar">
        <QuotationSettings onClose={() => setShowSettings(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:h-[calc(100vh-12rem)]">
      {/* 左側：表單輸入區 */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden flex flex-col lg:h-full">
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg font-medium text-stone-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="truncate">{editQuoteData ? '編輯報價單' : '快速報價計算機'}</span>
          </h2>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {editQuoteData && onClearEdit && (
              <button
                onClick={onClearEdit}
                className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shrink-0"
              >
                取消編輯
              </button>
            )}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center flex-1 sm:flex-none gap-2 px-3 py-1.5 text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
              報價設定
            </button>
          </div>
        </div>
        
        <div className="p-6 lg:overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          {/* 1. 基本資料 */}
          <section>
            <h3 className="text-sm font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100">1. 基本資料</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">社群帳號</label>
                <input
                  type="text"
                  value={customer.ig}
                  onChange={e => setCustomer({...customer, ig: e.target.value})}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="@username"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">客戶姓名</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={e => setCustomer({...customer, name: e.target.value})}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="王小明"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Email (行銷/寄件用)</label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={e => setCustomer({...customer, email: e.target.value})}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">聯絡電話</label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={e => setCustomer({...customer, phone: e.target.value})}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  placeholder="0912345678"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">訂購總數量</label>
                <input
                  type="number"
                  value={customer.quantity}
                  onChange={e => setCustomer({...customer, quantity: Number(e.target.value)})}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  min="30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">婚期</label>
                <input
                  type="date"
                  value={customer.weddingDate}
                  onChange={e => setCustomer({...customer, weddingDate: e.target.value})}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">預計交期</label>
                <input
                  type="date"
                  value={customer.deliveryDate}
                  onChange={e => setCustomer({...customer, deliveryDate: e.target.value})}
                  className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-stone-500 mb-1">備註事項 (僅供內部查看)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="例如：急件、特殊需求、修改次數等..."
                className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none resize-none"
              />
            </div>
            {quotationData.qtyWarning && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                <AlertCircle className="w-4 h-4" />
                {quotationData.qtyWarning}
              </div>
            )}
          </section>

          {/* 2. 選擇套餐 */}
          <section>
            <h3 className="text-sm font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100">2. 選擇主方案</h3>
            <div className="space-y-2">
              <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedPackageId === 'none' ? 'border-rose-500 bg-rose-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="package"
                    value="none"
                    checked={selectedPackageId === 'none'}
                    onChange={() => setSelectedPackageId('none')}
                    className="text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-sm font-medium text-stone-700">不需要喜帖套餐</span>
                </div>
              </label>
              {settings.packages.filter((pkg: any) => pkg.id !== 'none').map((pkg: any) => (
                <label key={pkg.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${selectedPackageId === pkg.id ? 'border-rose-500 bg-rose-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="package"
                      value={pkg.id}
                      checked={selectedPackageId === pkg.id}
                      onChange={() => setSelectedPackageId(pkg.id)}
                      className="text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm font-medium text-stone-700">{pkg.name}</span>
                  </div>
                  {pkg.id !== 'none' && <span className="text-sm text-stone-500">{pkg.price} 元/份</span>}
                </label>
              ))}
            </div>
          </section>

          {/* 3. 加購項目 */}
          <section>
            <h3 className="text-sm font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100">3. 加購項目</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">插畫師專屬插畫</span>
                  <select
                    value={selectedIllustratorId}
                    onChange={(e) => setSelectedIllustratorId(e.target.value)}
                    className="text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                  >
                    {settings.illustrators.map((ill: any) => (
                      <option key={ill.id} value={ill.id}>
                        {ill.teacher} {ill.style ? `(${ill.style})` : ''} {ill.basePrice > 0 ? `(${ill.basePrice}元)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedIllustratorId !== 'none' && (
                  <div className="flex items-center justify-between pl-4 border-l-2 border-stone-200">
                    <span className="text-sm text-stone-600">寵物數量 (每隻 {settings.illustrators.find((i: any) => i.id === selectedIllustratorId)?.petPrice}元)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={petCount}
                        onChange={(e) => setPetCount(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-rose-500 outline-none text-right"
                        min="0"
                      />
                      <span className="text-sm text-stone-500">隻</span>
                    </div>
                  </div>
                )}
              </div>

              {settings.addons.map((addon: any) => (
                <div key={addon.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAddons[addon.id] || false}
                      onChange={() => handleAddonToggle(addon.id)}
                      className="rounded text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm font-medium text-stone-700">{addon.name}</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-500">
                      {addon.type === 'per_item_min_100' ? `${addon.price} 元/份 (未滿百以百計)` : `${addon.price} 元/份`}
                    </span>
                    {selectedAddons[addon.id] && (
                      <input
                        type="number"
                        value={addonQuantities[addon.id] !== undefined ? addonQuantities[addon.id] : ((addon.defaultQtyType || 'order_qty') === 'fixed_1' ? 1 : (customer.quantity || 100))}
                        onChange={(e) => handleAddonQuantityChange(addon.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-rose-500 outline-none text-right"
                        min="1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </div>
              ))}

              {settings.independentAddons.map((addon: any) => (
                <div key={addon.id} className="flex items-center justify-between p-3 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer transition-colors">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedAddons[addon.id] || false}
                      onChange={() => handleAddonToggle(addon.id)}
                      className="rounded text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm font-medium text-stone-700">{addon.name}</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-stone-500">{addon.price} 元/份</span>
                    {selectedAddons[addon.id] && (
                      <input
                        type="number"
                        value={addonQuantities[addon.id] !== undefined ? addonQuantities[addon.id] : ((addon.defaultQtyType || 'fixed_1') === 'fixed_1' ? 1 : (customer.quantity || 100))}
                        onChange={(e) => handleAddonQuantityChange(addon.id, Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-rose-500 outline-none text-right"
                        min="1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. 其他客製商品 */}
          <section>
            <h3 className="text-sm font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100">4. 其他客製商品</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">結婚書約</span>
                  <select
                    value={certificateId}
                    onChange={(e) => setCertificateId(e.target.value)}
                    className="text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-rose-500 outline-none bg-white max-w-[200px]"
                  >
                    <option value="none">不需要</option>
                    {settings.certificates.map((cert: any) => (
                      <option key={cert.id} value={cert.id}>
                        {cert.name} {cert.price > 0 ? `(${cert.price}元)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                <span className="text-sm font-medium text-stone-700">陶瓷杯墊</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={coasterQty || ''}
                    onChange={(e) => setCoasterQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 text-sm border border-stone-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-rose-500 outline-none text-right"
                    min="0"
                    placeholder="0"
                  />
                  <span className="text-sm text-stone-500">個</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 右側：報價預覽區 */}
      <div className="bg-stone-800 rounded-2xl shadow-lg overflow-hidden flex flex-col lg:h-full text-stone-100">
        <div className="p-4 border-b border-stone-700 bg-stone-900 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <h2 className="text-lg font-medium flex items-center gap-2 text-white whitespace-nowrap">
            <FileText className="w-5 h-5 text-rose-400" />
            報價單預覽
          </h2>
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <button
              onClick={handleCopyOrder}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isCopiedOrder ? 'bg-green-500 text-white' : 'bg-rose-600 text-white hover:bg-rose-700'
              }`}
            >
              {isCopiedOrder ? <><CheckCircle className="w-4 h-4" /> 已複製</> : <><Copy className="w-4 h-4" /> 完整報價</>}
            </button>
            <button
              onClick={handleCopyShortQuote}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isCopiedShortQuote ? 'bg-green-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isCopiedShortQuote ? <><CheckCircle className="w-4 h-4" /> 已複製</> : <><Copy className="w-4 h-4" /> 簡短報價</>}
            </button>
            <button
              onClick={handleCopyConfirm}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isCopiedConfirm ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isCopiedConfirm ? <><CheckCircle className="w-4 h-4" /> 已複製</> : <><Copy className="w-4 h-4" /> 明細確認</>}
            </button>
            <button
              onClick={handleCopyTerms}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isCopiedTerms ? 'bg-green-500 text-white' : 'bg-stone-700 text-white hover:bg-stone-600'
              }`}
            >
              {isCopiedTerms ? <><CheckCircle className="w-4 h-4" /> 已複製</> : <><Copy className="w-4 h-4" /> 複製條款</>}
            </button>
            <button
              onClick={handleCopyShipping}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isCopiedShipping ? 'bg-green-500 text-white' : 'bg-stone-700 text-white hover:bg-stone-600'
              }`}
            >
              {isCopiedShipping ? <><CheckCircle className="w-4 h-4" /> 已複製</> : <><Copy className="w-4 h-4" /> 收件資訊</>}
            </button>
            <div className="w-px h-6 bg-stone-700 mx-1 hidden sm:block"></div>
            <button
              onClick={handleSaveQuotation}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                saveSuccess ? 'bg-green-500 text-white' : 'bg-stone-700 text-white hover:bg-stone-600'
              } disabled:opacity-50`}
            >
              {saveSuccess ? <><CheckCircle className="w-4 h-4" /> 已儲存</> : <><Save className="w-4 h-4" /> 儲存紀錄</>}
            </button>
            {savedQuoteId && (
              <button
                onClick={() => {
                  const url = `${window.location.origin}/quote/${savedQuoteId}`;
                  navigator.clipboard.writeText(url);
                  alert('已複製報價連結！');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-rose-500 text-white hover:bg-rose-600"
              >
                <Copy className="w-4 h-4" /> 複製報價連結
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6 lg:overflow-y-auto flex-1 custom-scrollbar font-mono text-sm leading-relaxed whitespace-pre-wrap">
          {generateOrderText()}
          {'\n\n\n'}
          注意事項：
          {generateTermsText()}
        </div>
      </div>
    </div>
  );
}
