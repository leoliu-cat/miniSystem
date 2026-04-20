import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

interface LabelData {
  Name: string;
  Phone: string;
  Address: string;
  Address2: string;
  [key: string]: string;
}

interface TextConfig {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isRotated180: boolean;
  isCenteredX: boolean;
}

export const LabelGenerator = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [excelData, setExcelData] = useState<LabelData[]>([]);
  
  const [labelWidth, setLabelWidth] = useState(150);
  const [labelHeight, setLabelHeight] = useState(50);
  const [showPrefixes, setShowPrefixes] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'Custom'>('A4');
  
  const [nameConfig, setNameConfig] = useState<TextConfig>({ x: 80, y: 15, fontSize: 14, color: '#000000', fontFamily: 'helvetica', isBold: false, isItalic: false, isRotated180: false, isCenteredX: false });
  const [phoneConfig, setPhoneConfig] = useState<TextConfig>({ x: 120, y: 15, fontSize: 12, color: '#000000', fontFamily: 'helvetica', isBold: false, isItalic: false, isRotated180: false, isCenteredX: false });
  const [addressConfig, setAddressConfig] = useState<TextConfig>({ x: 80, y: 30, fontSize: 12, color: '#000000', fontFamily: 'helvetica', isBold: false, isItalic: false, isRotated180: false, isCenteredX: false });
  const [address2Config, setAddress2Config] = useState<TextConfig>({ x: 80, y: 38, fontSize: 12, color: '#000000', fontFamily: 'helvetica', isBold: false, isItalic: false, isRotated180: false, isCenteredX: false });
  const [prefixConfig, setPrefixConfig] = useState<TextConfig>({ x: 0, y: 0, fontSize: 12, color: '#000000', fontFamily: 'helvetica', isBold: false, isItalic: false, isRotated180: false, isCenteredX: false });

  const [fontOptions, setFontOptions] = useState([
    { label: 'Helvetica / Arial', value: 'helvetica' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' },
    { label: 'Verdana', value: 'Verdana' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Noto Sans TC', value: 'Noto Sans TC' }
  ]);

  const a4Width = 210;
  const a4Height = 297;
  const customWidth = 275;
  const customHeight = 395;

  const currentPaperWidth = paperSize === 'A4' ? a4Width : customWidth;
  const currentPaperHeight = paperSize === 'A4' ? a4Height : customHeight;

  useEffect(() => {
    updatePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, excelData, labelWidth, labelHeight, showPrefixes, nameConfig, phoneConfig, addressConfig, address2Config, prefixConfig, paperSize]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const rotateImage = () => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      setImageUrl(canvas.toDataURL());
    };
    img.src = imageUrl;
  };

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as LabelData[];
      
      const mappedData = jsonData.map(row => ({
        Name: row['Name'] || row['姓名'] || '',
        Phone: row['Phone'] || row['電話'] || row['手機'] || '',
        Address: row['Address'] || row['地址'] || '',
        Address2: row['Address2'] || row['地址2'] || ''
      }));

      setExcelData(mappedData);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFontUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fontName = file.name.split('.')[0];
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, buffer);
      await fontFace.load();
      (document.fonts as any).add(fontFace);

      if (!fontOptions.find(f => f.value === fontName)) {
        setFontOptions(prev => [...prev, { label: `[自訂] ${fontName}`, value: fontName }]);
      }
      
      updatePreview(); // Trigger update
    } catch (error) {
      console.error('Error loading font:', error);
      alert('字體載入失敗，請確認檔案格式是否為有效的 TTF 或 OTF。');
    }
  };

  const getGridLayout = () => {
    const gap = 5; // mm
    const margin = 10; // mm
    const cols = Math.floor((currentPaperWidth - margin * 2 + gap) / (labelWidth + gap));
    const rows = Math.floor((currentPaperHeight - margin * 2 + gap) / (labelHeight + gap));
    return { cols: Math.max(1, cols), rows: Math.max(1, rows) };
  };

  const calculateLabelsPerPage = () => {
    const layout = getGridLayout();
    return layout.cols * layout.rows;
  };

  const updatePreview = () => {
    if (!imageUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const scale = 4; 
      canvas.width = labelWidth * scale;
      canvas.height = labelHeight * scale;

      // Draw Background
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw Text
      const data = excelData.length > 0 ? excelData[0] : { Name: '範例姓名', Phone: '0912-345-678', Address: '台北市信義區範例路123號', Address2: '4樓之2' };

      const drawText = (text: string, config: TextConfig, prefix: string) => {
        const content = text || '';
        if (!content && !showPrefixes) return;
        
        let textX = config.x * scale;
        const textY = config.y * scale;

        let pWidth = 0;
        let cWidth = 0;

        if (config.isCenteredX) {
            if (showPrefixes && prefix) {
                const pFontSize = prefixConfig.fontSize * 1.33 * scale;
                const pWeight = prefixConfig.isBold ? 'bold' : 'normal';
                const pStyle = prefixConfig.isItalic ? 'italic' : 'normal';
                ctx.font = `${pStyle} ${pWeight} ${pFontSize}px "${prefixConfig.fontFamily}", "Noto Sans TC", sans-serif`;
                pWidth = ctx.measureText(prefix).width;
            }
            if (content) {
                const cFontSize = config.fontSize * 1.33 * scale;
                const cWeight = config.isBold ? 'bold' : 'normal';
                const cStyle = config.isItalic ? 'italic' : 'normal';
                ctx.font = `${cStyle} ${cWeight} ${cFontSize}px "${config.fontFamily}", "Noto Sans TC", sans-serif`;
                cWidth = ctx.measureText(content).width;
            }
            const totalWidth = pWidth + cWidth;
            if (config.isRotated180) {
                textX = (labelWidth * scale + totalWidth) / 2;
            } else {
                textX = (labelWidth * scale - totalWidth) / 2;
            }
        }

        ctx.save();
        if (config.isRotated180) {
            ctx.translate(textX, textY);
            ctx.rotate(Math.PI);
            ctx.translate(-textX, -textY);
        }

        if (showPrefixes && prefix) {
            ctx.fillStyle = prefixConfig.color;
            const pFontSize = prefixConfig.fontSize * 1.33 * scale;
            const pWeight = prefixConfig.isBold ? 'bold' : 'normal';
            const pStyle = prefixConfig.isItalic ? 'italic' : 'normal';
            ctx.font = `${pStyle} ${pWeight} ${pFontSize}px "${prefixConfig.fontFamily}", "Noto Sans TC", sans-serif`;
            
            ctx.fillText(prefix, textX, textY);
            
            const prefixWidth = ctx.measureText(prefix).width;
            
            if (content) {
                ctx.fillStyle = config.color;
                const cFontSize = config.fontSize * 1.33 * scale;
                const cWeight = config.isBold ? 'bold' : 'normal';
                const cStyle = config.isItalic ? 'italic' : 'normal';
                ctx.font = `${cStyle} ${cWeight} ${cFontSize}px "${config.fontFamily}", "Noto Sans TC", sans-serif`;
                
                ctx.fillText(content, textX + prefixWidth, textY);
            }
        } else {
            if (content) {
                ctx.fillStyle = config.color;
                const cFontSize = config.fontSize * 1.33 * scale;
                const cWeight = config.isBold ? 'bold' : 'normal';
                const cStyle = config.isItalic ? 'italic' : 'normal';
                ctx.font = `${cStyle} ${cWeight} ${cFontSize}px "${config.fontFamily}", "Noto Sans TC", sans-serif`;
                
                ctx.fillText(content, textX, textY);
            }
        }
        ctx.restore();
      };
      
      drawText(data.Name, nameConfig, 'Name/    ');
      drawText(data.Phone, phoneConfig, 'Phone/    ');
      drawText(data.Address, addressConfig, 'Address/    ');
      drawText(data.Address2, address2Config, '');
    };
    img.src = imageUrl;
  };

  const generatePDF = async () => {
    if (!imageUrl || excelData.length === 0) return;

    // Ensure calculation uses the dynamic paper dimensions
    const currentWidth = paperSize === 'A4' ? a4Width : customWidth;
    const currentHeight = paperSize === 'A4' ? a4Height : customHeight;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperSize === 'A4' ? 'a4' : [currentWidth, currentHeight]
    });

    const data = excelData;
    const gap = 5; // mm
    const layout = getGridLayout();
    const labelsPerPage = layout.cols * layout.rows;

    const totalContentHeight = layout.rows * labelHeight + (layout.rows - 1) * gap;
    const startY = (currentHeight - totalContentHeight) / 2;
    
    const totalContentWidth = layout.cols * labelWidth + (layout.cols - 1) * gap;
    const startX = (currentWidth - totalContentWidth) / 2;

    const bgImg = new Image();
    bgImg.src = imageUrl;
    await new Promise(resolve => bgImg.onload = resolve);

    for (let i = 0; i < data.length; i++) {
      const posIndex = i % labelsPerPage;
      
      if (posIndex === 0 && i > 0) {
        doc.addPage();
      }

      const col = posIndex % layout.cols;
      const row = Math.floor(posIndex / layout.cols);

      const item = data[i];
      const x = startX + col * (labelWidth + gap);
      const y = startY + row * (labelHeight + gap);

      const canvas = document.createElement('canvas');
      const scale = 12; // 300 DPI
      canvas.width = labelWidth * scale;
      canvas.height = labelHeight * scale;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      const drawText = (text: string, config: TextConfig, prefix: string) => {
        const content = text || '';
        if (!content && !showPrefixes) return;
        
        let textX = config.x * scale;
        const textY = config.y * scale;

        let pWidth = 0;
        let cWidth = 0;

        if (config.isCenteredX) {
            if (showPrefixes && prefix) {
                const pFontSize = prefixConfig.fontSize * 1.33 * scale;
                const pWeight = prefixConfig.isBold ? 'bold' : 'normal';
                const pStyle = prefixConfig.isItalic ? 'italic' : 'normal';
                ctx.font = `${pStyle} ${pWeight} ${pFontSize}px "${prefixConfig.fontFamily}", "Noto Sans TC", sans-serif`;
                pWidth = ctx.measureText(prefix).width;
            }
            if (content) {
                const cFontSize = config.fontSize * 1.33 * scale;
                const cWeight = config.isBold ? 'bold' : 'normal';
                const cStyle = config.isItalic ? 'italic' : 'normal';
                ctx.font = `${cStyle} ${cWeight} ${cFontSize}px "${config.fontFamily}", "Noto Sans TC", sans-serif`;
                cWidth = ctx.measureText(content).width;
            }
            const totalWidth = pWidth + cWidth;
            if (config.isRotated180) {
                textX = (labelWidth * scale + totalWidth) / 2;
            } else {
                textX = (labelWidth * scale - totalWidth) / 2;
            }
        }

        ctx.save();
        if (config.isRotated180) {
            ctx.translate(textX, textY);
            ctx.rotate(Math.PI);
            ctx.translate(-textX, -textY);
        }

        if (showPrefixes && prefix) {
            ctx.fillStyle = prefixConfig.color;
            const pFontSize = prefixConfig.fontSize * 1.33 * scale;
            const pWeight = prefixConfig.isBold ? 'bold' : 'normal';
            const pStyle = prefixConfig.isItalic ? 'italic' : 'normal';
            ctx.font = `${pStyle} ${pWeight} ${pFontSize}px "${prefixConfig.fontFamily}", "Noto Sans TC", sans-serif`;
            
            ctx.fillText(prefix, textX, textY);
            
            const prefixWidth = ctx.measureText(prefix).width;
            
            if (content) {
                ctx.fillStyle = config.color;
                const cFontSize = config.fontSize * 1.33 * scale;
                const cWeight = config.isBold ? 'bold' : 'normal';
                const cStyle = config.isItalic ? 'italic' : 'normal';
                ctx.font = `${cStyle} ${cWeight} ${cFontSize}px "${config.fontFamily}", "Noto Sans TC", sans-serif`;
                
                ctx.fillText(content, textX + prefixWidth, textY);
            }
        } else {
            if (content) {
                ctx.fillStyle = config.color;
                const cFontSize = config.fontSize * 1.33 * scale;
                const cWeight = config.isBold ? 'bold' : 'normal';
                const cStyle = config.isItalic ? 'italic' : 'normal';
                ctx.font = `${cStyle} ${cWeight} ${cFontSize}px "${config.fontFamily}", "Noto Sans TC", sans-serif`;
                
                ctx.fillText(content, textX, textY);
            }
        }
        ctx.restore();
      };

      drawText(item.Name, nameConfig, 'Name/    ');
      drawText(item.Phone, phoneConfig, 'Phone/    ');
      drawText(item.Address, addressConfig, 'Address/    ');
      drawText(item.Address2, address2Config, '');

      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', x, y, labelWidth, labelHeight);
    }

    doc.save('labels.pdf');
  };

  const renderConfigOptions = (title: string, config: TextConfig, setConfig: React.Dispatch<React.SetStateAction<TextConfig>>) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-bold text-stone-700">{title}</label>
        <input type="color" value={config.color} onChange={e => setConfig({...config, color: e.target.value})} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-3 grid grid-cols-2 gap-2 mb-1">
          <select value={config.fontFamily} onChange={e => setConfig({...config, fontFamily: e.target.value})} className="w-full px-2 py-1 text-sm border rounded bg-white">
            {fontOptions.map(font => <option key={font.value} value={font.value}>{font.label}</option>)}
          </select>
          <div className="flex gap-1">
            <button onClick={() => setConfig({...config, isBold: !config.isBold})} className={`flex-1 px-2 py-1 border rounded hover:bg-stone-100 text-sm font-bold ${config.isBold ? 'bg-stone-300' : ''}`}>B</button>
            <button onClick={() => setConfig({...config, isItalic: !config.isItalic})} className={`flex-1 px-2 py-1 border rounded hover:bg-stone-100 text-sm italic ${config.isItalic ? 'bg-stone-300' : ''}`}>I</button>
            <button onClick={() => setConfig({...config, isCenteredX: !config.isCenteredX})} className={`flex-1 px-2 py-1 border rounded hover:bg-stone-100 text-sm flex items-center justify-center ${config.isCenteredX ? 'bg-stone-300' : ''}`} title="水平置中">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>
            </button>
            <button onClick={() => setConfig({...config, isRotated180: !config.isRotated180})} className={`flex-1 px-2 py-1 border rounded hover:bg-stone-100 text-sm flex items-center justify-center ${config.isRotated180 ? 'bg-stone-300' : ''}`} title="旋轉180度">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
          </div>
        </div>
        <div>
          <span className="text-[10px] text-stone-500 uppercase">X (mm)</span>
          <input type="number" value={config.x} disabled={config.isCenteredX} onChange={e => setConfig({...config, x: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>
        <div>
          <span className="text-[10px] text-stone-500 uppercase">Y (mm)</span>
          <input type="number" value={config.y} onChange={e => setConfig({...config, y: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded bg-white" />
        </div>
        <div>
          <span className="text-[10px] text-stone-500 uppercase">Size (pt)</span>
          <input type="number" value={config.fontSize} onChange={e => setConfig({...config, fontSize: Number(e.target.value)})} className="w-full px-2 py-1 text-sm border rounded bg-white" />
        </div>
      </div>
    </div>
  );

  return (
    <section id="label-generator" className="h-full overflow-auto bg-stone-50 text-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <span className="text-amber-700 font-bold tracking-[0.2em] uppercase text-sm">Custom Labels</span>
          <h2 className="text-4xl font-serif text-stone-900 mt-2">客製化標籤產生器</h2>
          <p className="text-stone-600 mt-4 max-w-2xl mx-auto font-light">
            上傳底圖與 Excel 名單，自動生成排版好的 PDF 標籤文件。
          </p>
        </div>

        {/* Steps 1 & 2 Above Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Step 1: Uploads */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-full">
              <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <span className="bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                上傳檔案
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">標籤底圖 (JPG)</label>
                  <div className="flex gap-2">
                    <input type="file" onChange={handleImageUpload} accept="image/jpeg, image/jpg" 
                           className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300 transition-all"/>
                    <button onClick={rotateImage} disabled={!imageUrl} className="p-2 bg-stone-200 rounded-lg hover:bg-stone-300 transition-colors disabled:opacity-50 shrink-0" title="旋轉圖片">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">名單 Excel (Name, Phone, Address, Address2)</label>
                  <input type="file" onChange={handleExcelUpload} accept=".xlsx, .xls"
                         className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300 transition-all"/>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1 flex items-center gap-2">
                    自訂字體 (TTF/OTF) <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">選填</span>
                  </label>
                  <input type="file" onChange={handleFontUpload} accept=".ttf, .otf, .woff, .woff2"
                         className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-stone-200 file:text-stone-700 hover:file:bg-stone-300 transition-all"/>
                </div>
                
                {excelData.length > 0 && (
                  <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    已載入 {excelData.length} 筆資料
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Layout Config */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm h-full flex flex-col">
              <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <span className="bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                版面設定 (mm)
              </h3>
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">輸出紙張尺寸</label>
                  <select 
                    value={paperSize} 
                    onChange={e => setPaperSize(e.target.value as 'A4' | 'Custom')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="A4">A4 (210 x 297 mm)</option>
                    <option value="Custom">客製 275 x 395 mm</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">標籤寬度</label>
                    <input type="number" value={labelWidth} onChange={e => setLabelWidth(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">標籤高度</label>
                    <input type="number" value={labelHeight} onChange={e => setLabelHeight(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="showPrefixes" checked={showPrefixes} onChange={e => setShowPrefixes(e.target.checked)} className="w-4 h-4 text-amber-600 rounded border-stone-300" />
                  <label htmlFor="showPrefixes" className="text-sm font-medium text-stone-700">自動加入前綴 (Name/ Phone/ etc.)</label>
                </div>
                
                {/* Prefix Config */}
                {showPrefixes && (
                  <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">前綴樣式設定</h4>
                    {renderConfigOptions('前綴文字', prefixConfig, setPrefixConfig)}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-center">
                <p className="text-xs text-stone-500">
                  每頁預估可排: <span className="font-bold text-amber-700">{calculateLabelsPerPage()}</span> 張
                </p>
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Controls - Step 3 */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Step 3: Text Config */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm overflow-visible">
               <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <span className="bg-stone-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                文字設定
              </h3>
              
              <div className="space-y-6">
                {renderConfigOptions('姓名 (Name)', nameConfig, setNameConfig)}
                <hr className="border-stone-200" />
                {renderConfigOptions('電話 (Phone)', phoneConfig, setPhoneConfig)}
                <hr className="border-stone-200" />
                {renderConfigOptions('地址 (Address)', addressConfig, setAddressConfig)}
                <hr className="border-stone-200" />
                {renderConfigOptions('地址2 (Address 2)', address2Config, setAddress2Config)}
              </div>
            </div>

            {/* Action */}
            <button 
                onClick={generatePDF} 
                disabled={!imageUrl || excelData.length === 0}
                className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              下載 PDF 標籤
            </button>

          </div>

          {/* Preview */}
          <div className="lg:col-span-2 relative">
            <div className="bg-stone-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center justify-center min-h-[600px] relative overflow-hidden lg:sticky lg:top-8">
              <div className="absolute top-4 left-4 text-white/50 text-xs font-mono">LABEL PREVIEW</div>
              
              {/* Canvas Container */}
              <div className="relative shadow-2xl transition-all duration-300" style={{ width: labelWidth * 3 }}>
                <canvas ref={canvasRef} className="bg-white w-full h-auto" />
                {!imageUrl && (
                  <div className="absolute inset-0 flex items-center justify-center text-stone-400 bg-stone-100 aspect-[3/1]">
                    <span className="text-sm">請上傳底圖以預覽</span>
                  </div>
                )}
              </div>

              <div className="mt-8 text-stone-400 text-sm text-center">
                <p>預覽顯示單張標籤效果。</p>
                <p className="text-xs mt-1 opacity-60">
                  PDF 輸出將以所選尺寸排列，每頁約 {calculateLabelsPerPage()} 張。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
