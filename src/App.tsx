import React, { useState, useEffect } from "react";
import { Download, CheckCircle, FileText, LayoutTemplate, Send, Users, Upload, Plus, Trash2, Edit2, AlertCircle, X, LogOut, Search, Settings, Copy, Printer, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { PrintWorkOrderModal } from './components/PrintWorkOrderModal';
import { EditOrderModal } from './components/EditOrderModal';
import FinancialReport from './components/FinancialReport';
import QuotationGenerator from './components/QuotationGenerator';
import QuotationList from './components/QuotationList';
import QuotationLink from './components/QuotationLink';
import QuotationSettings from './components/QuotationSettings';
import MarketingExport from './components/MarketingExport';
import { ShippingAssistant } from './components/ShippingAssistant';
import { LabelGenerator } from './components/LabelGenerator';
import { Document, Page, pdfjs } from 'react-pdf';

// Email Notification Form Component
const ShippingEmailForm = ({ sub, token, settings, onSettingsUpdated }: { sub: any, token: string, settings: Record<string, string>, onSettingsUpdated: () => void }) => {
  const parseTemplate = (template: string) => {
    if (!template) return '';
    return template
      .replace(/{{order_id}}/g, sub.id || '')
      .replace(/{{groom_name}}/g, sub.groom_name_zh || '')
      .replace(/{{bride_name}}/g, sub.bride_name_zh || '')
      .replace(/{{tracking_number}}/g, sub.tracking_number || '尚未填寫');
  };

  const defaultSubject = parseTemplate(settings.email_subject || "您的喜帖快遞已寄出 - 訂單 #{{order_id}}");
  const defaultBody = parseTemplate(settings.email_body || "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n您的喜帖已經寄出囉！\n快遞單號為：{{tracking_number}}\n\n如有任何問題，歡迎隨時與我們聯繫。\n\n祝您 順心\nMini Style Cards");

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  
  const [templateSubject, setTemplateSubject] = useState(settings.email_subject || "您的喜帖快遞已寄出 - 訂單 #{{order_id}}");
  const [templateBody, setTemplateBody] = useState(settings.email_body || "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n您的喜帖已經寄出囉！\n快遞單號為：{{tracking_number}}\n\n如有任何問題，歡迎隨時與我們聯繫。\n\n祝您 順心\nMini Style Cards");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Update body automatically if tracking number changes and it's still close to default
  useEffect(() => {
    setSubject(parseTemplate(settings.email_subject || "您的喜帖快遞已寄出 - 訂單 #{{order_id}}"));
    setBody(parseTemplate(settings.email_body || "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n您的喜帖已經寄出囉！\n快遞單號為：{{tracking_number}}\n\n如有任何問題，歡迎隨時與我們聯繫。\n\n祝您 順心\nMini Style Cards"));
  }, [sub.tracking_number, sub.groom_name_zh, sub.bride_name_zh, settings]);

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email_subject: templateSubject,
          email_body: templateBody
        })
      });
      if (res.ok) {
        onSettingsUpdated();
        setIsEditingTemplate(false);
        alert("預設文字已更新！");
      } else {
        alert("儲存失敗，請稍後再試。");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("儲存失敗，請稍後再試。");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSend = async () => {
    if (!sub.email) {
      alert("此訂單沒有填寫 Email");
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch(`/api/orders/${sub.id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: sub.email,
          subject,
          body
        })
      });
      if (res.ok) {
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
      } else {
        alert("發送失敗");
      }
    } catch (error) {
      alert("發送失敗");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-100">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-stone-500">出貨通知信 (Email)</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">收件人: {sub.email || '未提供'}</span>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center"
          >
            {isExpanded ? '收起' : '展開編輯'}
            {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-stone-50 p-3 rounded-md border border-stone-200">
          {isEditingTemplate ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-stone-800">編輯預設文字樣板</h4>
                <button onClick={() => setIsEditingTemplate(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-stone-500">
                您可以使用以下變數，系統發送時會自動替換為訂單資訊：<br/>
                <code className="bg-stone-200 px-1 rounded">{"{{order_id}}"}</code> 訂單編號, 
                <code className="bg-stone-200 px-1 rounded ml-1">{"{{groom_name}}"}</code> 新郎姓名, 
                <code className="bg-stone-200 px-1 rounded ml-1">{"{{bride_name}}"}</code> 新娘姓名, 
                <code className="bg-stone-200 px-1 rounded ml-1">{"{{tracking_number}}"}</code> 快遞單號
              </p>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">預設主旨</label>
                <input
                  type="text"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-3 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">預設內文</label>
                <textarea
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  rows={6}
                  className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-3 py-1.5 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingTemplate(false)}
                  className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 rounded-md text-sm font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  className="px-3 py-1.5 bg-stone-800 text-white rounded-md hover:bg-stone-900 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {isSavingTemplate ? '儲存中...' : '儲存為預設'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-3 py-1.5 mb-2"
                placeholder="信件主旨"
              />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                rows={6}
                className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-3 py-1.5 mb-2"
                placeholder="信件內容"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsEditingTemplate(true)}
                  className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2 transition-colors"
                >
                  編輯預設文字
                </button>
                <button
                  onClick={handleSend}
                  disabled={isSending}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-md text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSending ? '發送中...' : sendSuccess ? '已發送 ✓' : '直接寄出'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type DesignerData = {
  id: number;
  name: string;
  username: string;
  role?: string;
};

export type WeddingData = {
  id?: number;
  order_type?: string;
  groom_name_zh: string;
  groom_name_en: string;
  bride_name_zh: string;
  bride_name_en: string;
  wedding_date: string;
  wedding_time?: string;
  venue_name: string;
  venue_address: string;
  template_id: string;
  contact_source?: string;
  social_id?: string;
  groom_father_name?: string;
  groom_mother_name?: string;
  bride_father_name?: string;
  bride_mother_name?: string;
  grandparents_names?: string;
  schedule_tea_ceremony?: string;
  schedule_wedding_ceremony?: string;
  schedule_welcome_reception?: string;
  schedule_lunch_banquet?: string;
  schedule_dinner_banquet?: string;
  schedule_seeing_off?: string;
  invitation_quantity?: string;
  envelope_sender_address?: string;
  receiver_name?: string;
  receiver_phone?: string;
  receiver_address?: string;
  email?: string;
  schedule_unconfirmed?: boolean;
  wax_seal_style?: string;
  wax_seal_color?: string;
  envelope_color?: string;
  envelope_foil_position?: string;
  envelope_logo?: string;
  designer_id?: number;
  status?: string;
  created_at?: string;
  order_code?: string;
  payment_date?: string;
  amount?: number;
  design_deadline?: string;
  delivery_date?: string;
  tracking_number?: string;
  processing_options?: string;
  bank_last_5?: string;
  tax?: number;
  invoice_number?: string;
  tags?: string;
  unsubscribed?: number;
  marketing_count_30d?: number;
  last_marketing_sent_at?: string;
  notes?: string;
};

type TemplateData = {
  id: string;
  name: string;
  filename: string;
  filename_back?: string;
};

export const processingOptionsSchema: Record<string, {display: string, value: string}[]> = {
  "Illustrator": [
    {"display": "#Kay老師 / 蠟筆風雙人插畫", "value": "#Kay老師 / 蠟筆風雙人插畫"},
    {"display": "#Soi Soi老師 / 水彩風雙人插畫", "value": "#Soi Soi老師 / 水彩風雙人插畫"},
    {"display": "#戴花老師 / 可愛似顏繪製", "value": "#戴花老師 / 可愛似顏繪製"},
    {"display": "#戴花老師 / 時尚水彩風", "value": "#戴花老師 / 時尚水彩風"},
    {"display": "#小著老師 / 無臉色塊", "value": "#小著老師 / 無臉色塊"},
    {"display": "#Su Su老師 / 豆豆風雙人插畫", "value": "#Su Su老師 / 豆豆風雙人插畫"},
    {"display": "#LI老師 / 韓風寫實似顏繪", "value": "#LI老師 / 韓風寫實似顏繪"},
    {"display": "#Leo老師 / 線條插畫", "value": "#Leo老師 / 線條插畫"},
    {"display": "#客供自備插畫檔案", "value": "#客供自備插畫檔案"}
  ],
  "Material": [
    {"display": "#300um象牙卡-單卡式套餐", "value": "#300um象牙卡-單卡式套餐"},
    {"display": "#380um雪綿卡-單卡式套餐", "value": "#380um雪綿卡-單卡式套餐"},
    {"display": "#300um象牙卡-(拱形)單卡式套餐", "value": "#300um象牙卡-(拱形)式套餐"},
    {"display": "#300um雙面霧-(拱形)單卡式套餐", "value": "#300um雙面霧-(拱形)式套餐"},
    {"display": "#300um象牙卡-(雙開門式)套餐", "value": "#300um象牙卡-(雙開門式)套餐"},
    {"display": "#300um雙面霧-單卡式套餐", "value": "#300um雙面霧-單卡式套餐"},
    {"display": "#300um雙面霧-雙開門式套餐", "value": "#300um雙面霧-雙開門式套餐"},
    {"display": "#300um象牙卡-對折式套餐", "value": "#300um象牙卡-對折式套餐"},
    {"display": "#300um雙面霧-對折式套餐", "value": "#300um雙面霧-對折式套餐"},
    {"display": "#2mm厚彩色壓克力套餐", "value": "#2mm厚彩色壓克力套餐"},
    {"display": "#壓克力要霧面的", "value": "#壓克力要霧面的"},
    {"display": "#手工紙套餐", "value": "#手工紙套餐"},
    {"display": "#凸版印刷單卡式套餐", "value": "#凸版印刷單卡式套餐"},
    {"display": "#副卡(單面印刷)", "value": "#副卡(單面印刷)"},
    {"display": "#副卡(雙面印刷)", "value": "#副卡(雙面印刷)"},
    {"display": "#透明封套", "value": "#透明封套"},
    {"display": "#喜餅卡", "value": "#喜餅卡"},
    {"display": "#彌月卡", "value": "#彌月卡"},
    {"display": "#地圖卡/流程卡", "value": "#地圖卡/流程卡"},
    {"display": "#地圖卡", "value": "#地圖卡"},
    {"display": "#流程卡", "value": "#流程卡"},
    {"display": "#DressCode 卡", "value": "#DressCode 卡"},
    {"display": "#謝卡(單面)", "value": "#謝卡(單面)"},
    {"display": "#謝卡(雙面)", "value": "#謝卡(雙面)"},
    {"display": "#客制尺寸特殊卡", "value": "#客制尺寸特殊卡"}
  ],
  "Envelope": [
    {"display": "#顏色待定", "value": "#顏色待定"},
    {"display": "#酒紅", "value": "#酒紅"},
    {"display": "#杜丹紅", "value": "#杜丹紅"},
    {"display": "#蒼粉", "value": "#蒼粉"},
    {"display": "#乾燥玫瑰粉", "value": "#乾燥玫瑰粉"},
    {"display": "#沙漠粉", "value": "#沙漠粉"},
    {"display": "#橘粉", "value": "#橘粉"},
    {"display": "#太妃橘", "value": "#太妃橘"},
    {"display": "#裸膚", "value": "#裸膚"},
    {"display": "#奶茶", "value": "#奶茶"},
    {"display": "#卡駝", "value": "#卡駝"},
    {"display": "#秋香綠", "value": "#秋香綠"},
    {"display": "#蘚苔綠", "value": "#蘚苔綠"},
    {"display": "#墨綠", "value": "#墨綠"},
    {"display": "#灰白玉", "value": "#灰白玉"},
    {"display": "#清水灰", "value": "#清水灰"},
    {"display": "#海軍藍", "value": "#海軍藍"},
    {"display": "#天空藍", "value": "#天空藍"},
    {"display": "#鐵灰藍", "value": "#鐵灰藍"},
    {"display": "#黑色", "value": "#黑色"},
    {"display": "#透明色", "value": "#透明色"},
    {"display": "#丁香紫", "value": "#丁香紫"},
    {"display": "#深紫色", "value": "#深紫色"},
    {"display": "#10K信封(常用款)", "value": "#10K信封(常用款)"},
    {"display": "#12K信封(扁長型)", "value": "#12K信封(扁長型)"},
    {"display": "#信封燙金-單面", "value": "#信封燙金-單面"},
    {"display": "#信封燙金-[雙面]", "value": "#信封燙金-[雙面]"},
    {"display": "#信封印刷-單面", "value": "#信封印刷-單面"},
    {"display": "#信封印刷-雙面", "value": "#信封印刷-雙面"},
    {"display": "#正面中式", "value": "#正面中式"},
    {"display": "#背面西式", "value": "#背面西式"},
    {"display": "#燙[銀色]箔", "value": "#燙[銀色]箔"},
    {"display": "#燙[白色]箔", "value": "#燙[白色]箔"},
    {"display": "#燙[金色]箔", "value": "#燙[金色]箔"},
    {"display": "#燙[霧金]箔", "value": "#燙[霧金]箔"},
    {"display": "#燙[紅銅金]箔", "value": "#燙[紅銅金]箔"},
    {"display": "#燙[玫瑰金]箔", "value": "#燙[玫瑰金]箔"}
  ],
  "BackingPaper": [
    {"display": "#延伸喜帖設計", "value": "#延伸喜帖設計"},
    {"display": "#延伸婚禮書約設計", "value": "#延伸婚禮書約設計"},
    {"display": "#公版設計", "value": "#公版設計"}
  ],
  "CardsBronzing": [
    {"display": "#卡片_單面_燙金", "value": "#卡片_單面_燙金"},
    {"display": "#卡片_雙面_燙金", "value": "#卡片_雙面_燙金"},
    {"display": "#卡片_三面_燙金", "value": "#卡片_三面_燙金"},
    {"display": "#卡片_四面_燙金", "value": "#卡片_四面_燙金"},
    {"display": "#燙淺金箔", "value": "#燙淺金箔"},
    {"display": "#燙霧金箔", "value": "#燙霧金箔"},
    {"display": "#燙銅金箔", "value": "#燙銅金箔"},
    {"display": "#燙玫瑰金箔", "value": "#燙玫瑰金箔"}
  ],
  "EnvelopeBronzing": [
    {"display": "#信封_單面_燙金", "value": "#信封_單面_燙金"},
    {"display": "#信封_雙面_燙金", "value": "#信封_雙面_燙金"},
    {"display": "#信封_單面_印刷", "value": "#信封_單面_印刷"},
    {"display": "#信封_雙面_印刷", "value": "#信封_雙面_印刷"},
    {"display": "#信封_正面中式", "value": "#信封_正面中式"},
    {"display": "#信封_背面西式", "value": "#信封_背面西式"},
    {"display": "#燙淺金箔", "value": "#燙淺金箔"},
    {"display": "#燙霧金箔", "value": "#燙霧金箔"},
    {"display": "#燙銅金箔", "value": "#燙銅金箔"},
    {"display": "#燙玫瑰金箔", "value": "#燙玫瑰金箔"}
  ],
  "Sticker": [
    {"display": "#金屬燙金貼紙 Save the date", "value": "#金屬燙金貼紙 Save the date"},
    {"display": "#金屬燙金貼紙 With love", "value": "#金屬燙金貼紙 With love"},
    {"display": "#封蠟貼紙：Save the date", "value": "#封蠟貼紙：Save the date"},
    {"display": "#封蠟貼紙：With love", "value": "#封蠟貼紙：With love"},
    {"display": "#封蠟貼紙：花草", "value": "#封蠟貼紙：花草"},
    {"display": "#封蠟貼紙：牽手", "value": "#封蠟貼紙：牽手"},
    {"display": "#封蠟貼紙：Ｍ", "value": "#封蠟貼紙：Ｍ"},
    {"display": "#封蠟貼紙：帝王花", "value": "#封蠟貼紙：帝王花"},
    {"display": "#封蠟貼紙：小腳ㄚ", "value": "#封蠟貼紙：小腳ㄚ"},
    {"display": "#封蠟貼紙：客製內容", "value": "#封蠟貼紙：客製內容"},
    {"display": "#公版貼紙", "value": "#公版貼紙"},
    {"display": "#顏色：待定", "value": "#顏色：待定"},
    {"display": "#封蠟貼紙樣式：待定", "value": "#封蠟貼紙樣式：待定"},
    {"display": "#顏色：霧金", "value": "#顏色：霧金"},
    {"display": "#顏色：復古金", "value": "#顏色：復古金"},
    {"display": "#顏色：紅銅金", "value": "#顏色：紅銅金"},
    {"display": "#顏色：古銅金", "value": "#顏色：古銅金"},
    {"display": "#顏色：咖啡金", "value": "#顏色：咖啡金"},
    {"display": "#顏色：白色", "value": "#顏色：白色"},
    {"display": "#顏色：淺粉色", "value": "#顏色：淺粉色"},
    {"display": "#顏色：銀色", "value": "#顏色：銀色"},
    {"display": "#顏色：裸膚色", "value": "#顏色：裸膚色"},
    {"display": "#顏色：卡駝色", "value": "#顏色：卡駝色"}
  ],
  "WaxStrips": [
    {"display": "#蠟條(包)：霧金", "value": "#蠟條(包)：霧金"},
    {"display": "#蠟條(包)：復古金", "value": "#蠟條(包)：復古金"},
    {"display": "#蠟條(包)：紅銅金", "value": "#蠟條(包)：紅銅金"},
    {"display": "#蠟條(包)：古銅金", "value": "#蠟條(包)：古銅金"},
    {"display": "#蠟條(包)：咖啡金", "value": "#蠟條(包)：咖啡金"},
    {"display": "#蠟條(包)：白色", "value": "#蠟條(包)：白色"},
    {"display": "#蠟條(包)：淺粉色", "value": "#蠟條(包)：淺粉色"},
    {"display": "#蠟條(包)：銀色", "value": "#蠟條(包)：銀色"},
    {"display": "#蠟條(包)：裸膚色", "value": "#蠟條(包)：裸膚色"},
    {"display": "#蠟條(包)：卡駝色", "value": "#蠟條(包)：卡駝色"}
  ],
  "MarriageContract": [
    {"display": "#壓克力書約(附木底座)", "value": "#壓克力書約(附木底座)"},
    {"display": "#壓克力書約(霧面)(附木底座)", "value": "#壓克力書約(霧面)(附木底座)"},
    {"display": "#登記用紙本書約x2", "value": "#登記用紙本書約x2"},
    {"display": "#登記用紙本書約x2(先出貨)", "value": "#登記用紙本書約x2(先出貨)"},
    {"display": "#登記用紙本書約x3", "value": "#登記用紙本書約x3"},
    {"display": "#客制書約夾", "value": "#客制書約夾"},
    {"display": "#胡桃木相框", "value": "#胡桃木相框"},
    {"display": "#先出貨無插畫版本紙本書約", "value": "#先出貨無插畫版本紙本書約"}
  ],
  "Oath": [
    {"display": "#誓言本-顏色待定", "value": "#誓言本-顏色待定"},
    {"display": "#誓言本-裸膚色", "value": "#誓言本-裸膚色"},
    {"display": "#誓言本-卡駝色", "value": "#誓言本-卡駝色"},
    {"display": "#誓言本-芥黃色", "value": "#誓言本-芥黃色"},
    {"display": "#誓言本-白色", "value": "#誓言本-白色"},
    {"display": "#誓言本-灰白玉", "value": "#誓言本-灰白玉"},
    {"display": "#誓言本-湖水綠", "value": "#誓言本-湖水綠"},
    {"display": "#誓言本-墨綠", "value": "#誓言本-墨綠"},
    {"display": "#誓言本-乾燥粉", "value": "#誓言本-乾燥粉"},
    {"display": "#誓言本-太妃橘", "value": "#誓言本-太妃橘"},
    {"display": "#誓言本-酒紅", "value": "#誓言本-酒紅"},
    {"display": "#誓言本-天空藍", "value": "#誓言本-天空藍"},
    {"display": "#誓言本-霧藍", "value": "#誓言本-霧藍"},
    {"display": "#誓言本-鐵灰", "value": "#誓言本-鐵灰"}
  ],
  "Ribbon": [
    {"display": "#緞帶-顏色待定", "value": "#緞帶-顏色待定"},
    {"display": "#緞帶-裸膚色", "value": "#緞帶-裸膚色"},
    {"display": "#緞帶-卡駝色", "value": "#緞帶-卡駝色"},
    {"display": "#緞帶-芥黃色", "value": "#緞帶-芥黃色"},
    {"display": "#緞帶-白色", "value": "#緞帶-白色"},
    {"display": "#緞帶-灰白玉", "value": "#緞帶-灰白玉"},
    {"display": "#緞帶-湖水綠", "value": "#緞帶-湖水綠"},
    {"display": "#緞帶-墨綠", "value": "#緞帶-墨綠"},
    {"display": "#緞帶-乾燥粉", "value": "#緞帶-乾燥粉"},
    {"display": "#緞帶-太妃橘", "value": "#緞帶-太妃橘"},
    {"display": "#緞帶-酒紅", "value": "#緞帶-酒紅"},
    {"display": "#緞帶-天空藍", "value": "#緞帶-天空藍"},
    {"display": "#緞帶-霧藍", "value": "#緞帶-霧藍"},
    {"display": "#緞帶-鐵灰", "value": "#緞帶-鐵灰"}
  ],
  "Others": [
    {"display": "#客制禮金簿", "value": "#客制禮金簿"},
    {"display": "#客制簽到本", "value": "#客制簽到本"},
    {"display": "#客制簽名軸", "value": "#客制簽名軸"},
    {"display": "#立牌(珍珠板)", "value": "#立牌(珍珠板)"},
    {"display": "#無框畫(小)-33x24cm", "value": "#無框畫(小)-33x24cm"},
    {"display": "#無框畫(中)-38x45.5cm", "value": "#無框畫(中)-38x45.5cm"},
    {"display": "#無框畫(大)-343.5x63.5cm", "value": "#無框畫(大)-343.5x63.5cm"},
    {"display": "#樣品包", "value": "#樣品包"},
    {"display": "#陶瓷杯墊", "value": "#陶瓷杯墊"},
    {"display": "#面紙包", "value": "#面紙包"},
    {"display": "#茶包", "value": "#茶包"},
    {"display": "#咖啡包", "value": "#咖啡包"},
    {"display": "#乾燥花", "value": "#乾燥花"},
    {"display": "#壓克力飛機綁繩", "value": "#壓克力飛機綁繩"},
    {"display": "#壓克力位卡", "value": "#壓克力位卡"},
    {"display": "#客制封蠟印章25mm(盒)", "value": "#客制封蠟印章25mm(盒)"},
    {"display": "#客制封蠟印章30mm(盒)", "value": "#客制封蠟印章30mm(盒)"}
  ]
};

export const processingOptionLabels: Record<string, string> = {
  "Illustrator": "插畫",
  "Material": "卡片印刷",
  "CardsBronzing": "卡片燙金",
  "Envelope": "信封製作",
  "BackingPaper": "內襯製作",
  "Sticker": "貼紙選擇",
  "WaxStrips": "蠟條(9條1包)",
  "MarriageContract": "結婚書約",
  "Oath": "誓言本",
  "Ribbon": "緞帶",
  "Others": "其他"
};

// Marketing Email Form Component
const MarketingEmailForm = ({ sub, token, settings, onSettingsUpdated }: { sub: any, token: string, settings: Record<string, string>, onSettingsUpdated: () => void }) => {
  const parseTemplate = (template: string) => {
    if (!template) return '';
    const unsubscribeLink = `${window.location.origin}/api/unsubscribe/${sub.id}`;
    return template
      .replace(/{{order_id}}/g, sub.id || '')
      .replace(/{{groom_name}}/g, sub.groom_name_zh || '')
      .replace(/{{bride_name}}/g, sub.bride_name_zh || '')
      .replace(/{{unsubscribe_link}}/g, unsubscribeLink);
  };

  const defaultSubject = parseTemplate(settings.marketing_email_subject || "專屬優惠通知");
  const defaultBody = parseTemplate(settings.marketing_email_body || "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n感謝您選擇 Mini Style Cards！\n\n我們為您準備了專屬優惠，歡迎回購！\n\n祝您 順心\nMini Style Cards\n\n若您不想再收到此類通知，請點擊以下連結退訂：\n{{unsubscribe_link}}");

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  
  const [templateSubject, setTemplateSubject] = useState(settings.marketing_email_subject || "專屬優惠通知");
  const [templateBody, setTemplateBody] = useState(settings.marketing_email_body || "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n感謝您選擇 Mini Style Cards！\n\n我們為您準備了專屬優惠，歡迎回購！\n\n祝您 順心\nMini Style Cards\n\n若您不想再收到此類通知，請點擊以下連結退訂：\n{{unsubscribe_link}}");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  useEffect(() => {
    setSubject(parseTemplate(settings.marketing_email_subject || "專屬優惠通知"));
    setBody(parseTemplate(settings.marketing_email_body || "親愛的 {{groom_name}} & {{bride_name}} 您好，\n\n感謝您選擇 Mini Style Cards！\n\n我們為您準備了專屬優惠，歡迎回購！\n\n祝您 順心\nMini Style Cards\n\n若您不想再收到此類通知，請點擊以下連結退訂：\n{{unsubscribe_link}}"));
  }, [sub.groom_name_zh, sub.bride_name_zh, settings]);

  const handleSaveTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          marketing_email_subject: templateSubject,
          marketing_email_body: templateBody
        })
      });
      if (res.ok) {
        onSettingsUpdated();
        setIsEditingTemplate(false);
        alert("預設文字已更新！");
      } else {
        alert("儲存失敗，請稍後再試。");
      }
    } catch (error) {
      console.error("Error saving template:", error);
      alert("儲存失敗，請稍後再試。");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleSend = async () => {
    const email = sub.receiver_email || sub.email;
    if (!email) {
      alert("此訂單沒有填寫 Email");
      return;
    }
    if (sub.unsubscribed) {
      alert("此客戶已退訂，無法發送行銷信件");
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch(`/api/weddings/${sub.id}/marketing-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          body
        })
      });
      if (res.ok) {
        setSendSuccess(true);
        setTimeout(() => setSendSuccess(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "發送失敗");
      }
    } catch (error) {
      alert("發送失敗");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-stone-100">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-stone-500">行銷信件 (Email)</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">收件人: {sub.receiver_email || sub.email || '未提供'}</span>
          {sub.unsubscribed === 1 && <span className="text-xs text-rose-500 font-medium">已退訂</span>}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center"
          >
            {isExpanded ? '收起' : '展開編輯'}
            {isExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="space-y-2 bg-stone-50 p-3 rounded-lg border border-stone-100 mb-3 relative">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-stone-700">編輯行銷信件</h4>
            <button 
              onClick={() => setIsEditingTemplate(!isEditingTemplate)}
              className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              {isEditingTemplate ? '取消修改預設' : '修改預設文字'}
            </button>
          </div>

          {isEditingTemplate ? (
            <div className="space-y-2 bg-white p-3 rounded border border-rose-100">
              <p className="text-xs text-rose-600 mb-2">修改預設文字 (支援變數: {"{{order_id}}, {{groom_name}}, {{bride_name}}, {{unsubscribe_link}}"})</p>
              <input 
                type="text" 
                value={templateSubject}
                onChange={(e) => setTemplateSubject(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                placeholder="預設主旨"
              />
              <textarea 
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none min-h-[100px]"
                placeholder="預設內文"
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleSaveTemplate}
                  disabled={isSavingTemplate}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-50"
                >
                  {isSavingTemplate ? '儲存中...' : '儲存為預設'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none"
                placeholder="信件主旨"
              />
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-stone-300 rounded focus:ring-1 focus:ring-rose-500 outline-none min-h-[100px]"
                placeholder="信件內文"
              />
            </>
          )}
        </div>
      )}

      <button 
        onClick={handleSend}
        disabled={isSending}
        className={`w-full flex items-center justify-center gap-2 py-1.5 rounded text-sm font-medium transition-colors ${
          sendSuccess 
            ? 'bg-green-500 text-white' 
            : 'bg-rose-500 hover:bg-rose-600 text-white disabled:bg-stone-300'
        }`}
      >
        {sendSuccess ? (
          <><CheckCircle className="w-4 h-4" /> 已發送</>
        ) : (
          <><Send className="w-4 h-4" /> {isSending ? '發送中...' : '發送行銷信件'}</>
        )}
      </button>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<"form" | "success" | "dashboard" | "login" | "quotation_link">("form");
  const [dashboardTab, setDashboardTab] = useState<"orders" | "quotation" | "quotation_records" | "quotation_settings" | "templates" | "marketing" | "shipping" | "labels">("orders");
  const [editQuoteData, setEditQuoteData] = useState<any>(null);
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [currentUser, setCurrentUser] = useState<{id: number, name: string, role?: string} | null>(
    localStorage.getItem("admin_user") ? JSON.parse(localStorage.getItem("admin_user")!) : null
  );
  const [designers, setDesigners] = useState<DesignerData[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [publicSettings, setPublicSettings] = useState<Record<string, string>>({});
  
  useEffect(() => {
    fetch('/api/settings/public')
      .then(res => res.json())
      .then(data => setPublicSettings(data))
      .catch(console.error);
  }, []);

  const [filterDesignerId, setFilterDesignerId] = useState<number | "all">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dashboardMonth, setDashboardMonth] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDesigner, setShowAddDesigner] = useState(false);
  const [newDesigner, setNewDesigner] = useState({ name: "", username: "", password: "" });
  const [editingDesignerId, setEditingDesignerId] = useState<number | null>(null);
  const [editDesignerData, setEditDesignerData] = useState({ name: "", password: "" });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
    linkToCopy?: string;
  }>({ isOpen: false, type: "alert", title: "", message: "" });

  const showAlert = (title: string, message: string) => {
    setModal({ isOpen: true, type: "alert", title, message });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, type: "confirm", title, message, onConfirm });
  };

  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const [formData, setFormData] = useState<WeddingData>({
    groom_name_zh: "",
    groom_name_en: "",
    bride_name_zh: "",
    bride_name_en: "",
    wedding_date: "",
    venue_name: "",
    venue_address: "",
    template_id: "",
    contact_source: "",
    social_id: "",
    groom_father_name: "",
    groom_mother_name: "",
    bride_father_name: "",
    bride_mother_name: "",
    grandparents_names: "",
    schedule_tea_ceremony: "",
    schedule_wedding_ceremony: "",
    schedule_welcome_reception: "",
    schedule_lunch_banquet: "",
    schedule_dinner_banquet: "",
    schedule_seeing_off: "",
    invitation_quantity: "",
    envelope_sender_address: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    email: "",
    schedule_unconfirmed: false,
    wax_seal_style: "",
    wax_seal_color: "",
    envelope_color: "",
    envelope_foil_position: "",
    envelope_logo: "",
  });
  const [submittedId, setSubmittedId] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<WeddingData[]>([]);
  
  // Template upload state
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [currentOrderCode, setCurrentOrderCode] = useState<string | null>(null);
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<WeddingData | null>(null);
  const [editingOrder, setEditingOrder] = useState<WeddingData | null>(null);
  const [newOrderData, setNewOrderData] = useState<Partial<WeddingData>>({
    order_type: "invitation",
    template_id: "",
    contact_source: "",
    social_id: "",
    designer_id: undefined,
    payment_date: "",
    amount: 0,
    design_deadline: "",
    delivery_date: "",
    invitation_quantity: "",
    wax_seal_style: "",
    wax_seal_color: "",
    envelope_color: "",
    envelope_foil_position: "",
    envelope_logo: "",
    processing_options: "{}"
  });

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/form/")) {
      const code = path.split("/")[2];
      if (code) {
        setCurrentOrderCode(code);
        setView("form");
        fetchOrderDetails(code);
      }
    } else if (path.startsWith("/quote/")) {
      const id = path.split("/")[2];
      if (id) {
        setCurrentQuoteId(id);
        setView("quotation_link");
      }
    } else if (path === "/admin") {
      setView(token ? "dashboard" : "login");
    } else {
      // Default to login if not a form link
      setView(token ? "dashboard" : "login");
    }
  }, []);

  const fetchOrderDetails = async (code: string) => {
    setIsFormLoading(true);
    try {
      const res = await fetch(`/api/orders/code/${code}`);
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, ...data }));
      } else {
        showAlert("錯誤", "找不到此訂單，請確認網址是否正確。");
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      showAlert("錯誤", "載入訂單資料失敗。");
    } finally {
      setIsFormLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      const data = await res.json();
      setTemplates(data);
      if (data.length > 0 && !formData.template_id) {
        setFormData(prev => ({ ...prev, template_id: data[0].id }));
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrderCode) {
      showAlert("錯誤", "無效的訂單連結。");
      return;
    }

    try {
      const res = await fetch(`/api/orders/code/${currentOrderCode}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setView("success");
      } else {
        showAlert("錯誤", data.error || "提交失敗，請稍後再試。");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      showAlert("錯誤", "提交失敗，請稍後再試。");
    }
  };

  const handleUpdateOrder = async (updatedOrder: WeddingData) => {
    if (!token || !updatedOrder.id) return;
    
    try {
      const res = await fetch(`/api/orders/${updatedOrder.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedOrder)
      });
      
      if (!res.ok) throw new Error("更新失敗");
      
      setSubmissions(prev => prev.map(sub => sub.id === updatedOrder.id ? { ...sub, ...updatedOrder } : sub));
      setEditingOrder(null);
      showAlert("成功", "訂單已更新");
    } catch (error) {
      console.error(error);
      showAlert("錯誤", "更新訂單失敗，請稍後再試");
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (!newOrderData.template_id) {
      showAlert("錯誤", "請選擇一個樣板");
      return;
    }

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newOrderData)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setShowCreateOrder(false);
        setNewOrderData({
          order_type: "invitation",
          template_id: "",
          contact_source: "",
          social_id: "",
          designer_id: undefined,
          payment_date: "",
          amount: 0,
          design_deadline: "",
          delivery_date: "",
          invitation_quantity: "",
          wax_seal_style: "",
          wax_seal_color: "",
          envelope_color: "",
          envelope_foil_position: "",
          envelope_logo: "",
          processing_options: "{}"
        });
        const link = `${window.location.origin}/form/${data.order_code}`;
        setModal({
          isOpen: true,
          type: "alert",
          title: "成功",
          message: `訂單已建立！專屬客戶填單網址:\n${link}`,
          linkToCopy: link
        });
        loadDashboard();
      } else {
        showAlert("錯誤", data.error || "建立訂單失敗");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      showAlert("錯誤", "發生錯誤，請稍後再試");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        setCurrentUser(data.designer);
        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_user", JSON.stringify(data.designer));
        setLoginForm({ username: "", password: "" });
        loadDashboard(data.token);
      } else {
        showAlert("登入失敗", data.error || "帳號或密碼錯誤");
      }
    } catch (error) {
      showAlert("登入失敗", "發生錯誤，請稍後再試");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    setView("login");
  };

  const loadDashboard = async (authToken = token) => {
    if (!authToken) {
      setView("login");
      return;
    }
    try {
      const res = await fetch("/api/weddings", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      } else {
        console.error("API did not return an array for submissions", data);
        setSubmissions([]);
      }

      const dRes = await fetch("/api/designers", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (dRes.ok) {
        const dData = await dRes.json();
        setDesigners(dData);
      }

      const sRes = await fetch("/api/settings", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (sRes.ok) {
        const sData = await sRes.json();
        setSettings(sData);
      }

      setView("dashboard");
    } catch (error) {
      console.error("Error loading dashboard:", error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (token && view === "dashboard") {
      interval = setInterval(() => {
        loadDashboard(token);
      }, 60000); // Changed from 15000 to 60000 (1 minute)
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [token, view]);

  const handleAssignDesigner = async (orderId: number, designerId: number | "") => {
    try {
      const res = await fetch(`/api/weddings/${orderId}/assign`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ designer_id: designerId === "" ? null : designerId }),
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(sub => sub.id === orderId ? { ...sub, designer_id: designerId === "" ? undefined : designerId } : sub));
      }
    } catch (error) {
      console.error("Error assigning designer:", error);
    }
  };

  const [isEditingRecommendedTags, setIsEditingRecommendedTags] = useState(false);
  const [recommendedTagsInput, setRecommendedTagsInput] = useState("");

  const handleSaveRecommendedTags = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ recommended_tags: recommendedTagsInput })
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, recommended_tags: recommendedTagsInput }));
        setIsEditingRecommendedTags(false);
      }
    } catch (error) {
      console.error("Error saving tags:", error);
    }
  };

  const handleUpdateTags = async (orderId: number, tags: string[]) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ tags: JSON.stringify(tags) }),
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(sub => sub.id === orderId ? { ...sub, tags: JSON.stringify(tags) } : sub));
      }
    } catch (error) {
      console.error("Error updating tags:", error);
    }
  };

  const handleChangeStatus = async (orderId: number, status: string) => {
    try {
      const res = await fetch(`/api/weddings/${orderId}/status`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setSubmissions(prev => prev.map(sub => sub.id === orderId ? { ...sub, status } : sub));
      }
    } catch (error) {
      console.error("Error changing status:", error);
    }
  };

  const handleDeleteOrder = (id: number) => {
    showConfirm("刪除訂單", "確定要刪除這筆訂單嗎？", async () => {
      try {
        const res = await fetch(`/api/weddings/${id}`, { 
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) loadDashboard();
      } catch (error) {
        console.error("Error deleting order:", error);
      }
    });
  };

  const handleDuplicateOrder = (id: number) => {
    showConfirm("複製訂單", "確定要複製這筆訂單嗎？這將會產生一個新的填寫連結。", async () => {
      try {
        const res = await fetch(`/api/orders/${id}/duplicate`, { 
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          showAlert("成功", "訂單已成功複製！");
          loadDashboard();
        } else {
          const data = await res.json();
          showAlert("錯誤", data.error || "複製訂單失敗");
        }
      } catch (error) {
        console.error("Error duplicating order:", error);
        showAlert("錯誤", "發生錯誤，請稍後再試");
      }
    });
  };

  const handleUpdateTracking = async (id: number, trackingNumber: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/tracking`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tracking_number: trackingNumber })
      });
      if (res.ok) loadDashboard();
    } catch (error) {
      console.error("Error updating tracking:", error);
    }
  };

  const handleUpdatePayment = async (id: number, paymentDate: string, amount: number) => {
    try {
      const res = await fetch(`/api/orders/${id}/payment`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payment_date: paymentDate, amount })
      });
      if (res.ok) loadDashboard();
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const handleUpdateDates = async (id: number, designDeadline: string, deliveryDate: string) => {
    try {
      const res = await fetch(`/api/orders/${id}/dates`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ design_deadline: designDeadline, delivery_date: deliveryDate })
      });
      if (res.ok) loadDashboard();
    } catch (error) {
      console.error("Error updating dates:", error);
    }
  };

  const handleAddDesigner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/designers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newDesigner)
      });
      if (res.ok) {
        showAlert("成功", "已成功新增設計師帳號");
        setNewDesigner({ name: "", username: "", password: "" });
        const dRes = await fetch("/api/designers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dRes.ok) {
          const dData = await dRes.json();
          setDesigners(dData);
        }
      } else {
        const data = await res.json();
        showAlert("錯誤", data.error || "新增失敗");
      }
    } catch (error) {
      console.error("Error adding designer:", error);
      showAlert("錯誤", "發生未知的錯誤");
    }
  };

  const handleUpdateDesigner = async (id: number, name: string, password?: string) => {
    try {
      const res = await fetch(`/api/designers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, password })
      });
      if (res.ok) {
        showAlert("成功", "已成功更新設計師資料");
        const dRes = await fetch("/api/designers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dRes.ok) {
          const dData = await dRes.json();
          setDesigners(dData);
        }
      } else {
        const data = await res.json();
        showAlert("錯誤", data.error || "更新失敗");
      }
    } catch (error) {
      console.error("Error updating designer:", error);
    }
  };

  const handleDeleteDesigner = async (id: number) => {
    showConfirm("刪除設計師", "確定要刪除此設計師帳號嗎？這將會把該設計師負責的訂單設為「未指派」。", async () => {
      try {
        const res = await fetch(`/api/designers/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          showAlert("成功", "已成功刪除設計師帳號");
          const dRes = await fetch("/api/designers", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (dRes.ok) {
            const dData = await dRes.json();
            setDesigners(dData);
          }
          loadDashboard(); // Refresh orders to show unassigned
        } else {
          const data = await res.json();
          showAlert("錯誤", data.error || "刪除失敗");
        }
      } catch (error) {
        console.error("Error deleting designer:", error);
      }
    });
  };

  const handleDeleteTemplate = (id: string) => {
    showConfirm("刪除樣板", "確定要刪除這個樣板嗎？", async () => {
      try {
        const res = await fetch(`/api/templates/${id}`, { 
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) fetchTemplates();
      } catch (error) {
        console.error("Error deleting template:", error);
      }
    });
  };

  const handleEditTemplateClick = (template: TemplateData) => {
    setEditingTemplate(template);
    setUploadName(template.name);
    setUploadFile(null);
  };

  const cancelEditTemplate = () => {
    setEditingTemplate(null);
    setUploadName("");
    setUploadFile(null);
  };

  const handleTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName) return;
    if (!editingTemplate && !uploadFile) return;

    if (uploadFile && uploadFile.size > 100 * 1024 * 1024) {
      showAlert("錯誤", "檔案大小不能超過 100MB，請壓縮 PDF 檔案後再試。");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("name", uploadName);
    if (uploadFile) formData.append("file", uploadFile);

    try {
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : "/api/templates";
      const method = editingTemplate ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error("檔案太大，請上傳小於 100MB 的檔案。");
        }
      }
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error(res.status === 413 ? "檔案太大，請上傳小於 100MB 的檔案。" : "伺服器發生錯誤，請稍後再試。");
      }

      if (data.success) {
        showAlert("成功", editingTemplate ? "樣板更新成功！" : "樣板上傳成功！");
        cancelEditTemplate();
        fetchTemplates(); // Refresh template list
      } else {
        showAlert("錯誤", data.error || "操作失敗");
      }
    } catch (error: any) {
      console.error("Error saving template:", error);
      showAlert("錯誤", error.message || "操作失敗，請稍後再試。");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView("form")}>
            <FileText className="text-rose-500" />
            <span className="font-serif font-semibold text-xl tracking-wide">MiniStyleCards</span>
          </div>
          {currentUser && (
            <nav className="flex gap-4">
              <button
                onClick={() => setView("form")}
                className={`text-sm font-medium ${view === "form" ? "text-rose-500" : "text-stone-500 hover:text-stone-900"}`}
              >
                填寫表單 (客戶端)
              </button>
              <button
                onClick={() => loadDashboard()}
                className={`text-sm font-medium ${view === "dashboard" ? "text-rose-500" : "text-stone-500 hover:text-stone-900"}`}
              >
                設計師後台
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setView("financial_report")}
                  className={`text-sm font-medium ${view === "financial_report" ? "text-rose-500" : "text-stone-500 hover:text-stone-900"}`}
                >
                  財務報表
                </button>
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {view === "form" && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-stone-100">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif text-stone-800 mb-3">
                {formData.order_type === 'invitation' ? '婚卡訂購資訊填寫' : '訂購資訊填寫'}
              </h1>
              
              <div className="flex flex-col items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 bg-stone-100 text-stone-600 px-3 py-1.5 rounded-full text-sm font-medium">
                  <span className="text-stone-400">訂單編號</span>
                  <span className="font-mono">{formData.order_code}</span>
                </div>
                {(formData.social_id || formData.receiver_name || formData.groom_name_zh || formData.bride_name_zh) && (
                  <div className="text-stone-500 text-sm flex items-center gap-2">
                    <span>專屬表單：</span>
                    <span className="font-medium text-stone-700">
                      {formData.social_id || formData.receiver_name || [formData.groom_name_zh, formData.bride_name_zh].filter(Boolean).join(' & ')}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-stone-500">
                {formData.order_type === 'invitation' 
                  ? '請告訴我們有關您婚禮的細節，讓我們幫您量身訂製最適合你的婚禮邀請卡。'
                  : '請填寫您的聯絡與收件資訊，以便我們為您處理訂單。'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 聯絡資訊 */}
              <section>
                <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2 border-b pb-2">
                  <Users className="w-5 h-5 text-rose-400" />
                  聯絡資訊
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">
                      {formData.order_type === 'invitation' ? '喜帖到貨收件人姓名' : '收件人姓名'}
                    </label>
                    <input required type="text" name="receiver_name" value={formData.receiver_name} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：王小明" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">收件人電話</label>
                    <input required type="tel" name="receiver_phone" value={formData.receiver_phone} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：0912345678" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-1">收件人地址</label>
                    <input required type="text" name="receiver_address" value={formData.receiver_address} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：台北市信義區信義路五段7號" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-1">Email (電子發票用)</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：example@email.com" />
                  </div>
                </div>
              </section>

              {formData.order_type === 'invitation' && (
                <>
                  {/* 新人資訊 */}
                  <section>
                    <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2 border-b pb-2">
                      <Users className="w-5 h-5 text-rose-400" />
                      新人與長輩資訊
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">新郎姓名 (中文)</label>
                        <input required type="text" name="groom_name_zh" value={formData.groom_name_zh} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：王小明" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">新郎姓名 (英文)</label>
                        <input required type="text" name="groom_name_en" value={formData.groom_name_en} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：Ming Wang" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">新娘姓名 (中文)</label>
                        <input required type="text" name="bride_name_zh" value={formData.bride_name_zh} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：陳小美" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">新娘姓名 (英文)</label>
                        <input required type="text" name="bride_name_en" value={formData.bride_name_en} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：Mei Chen" />
                      </div>
                      <div className="md:col-span-2 mt-2 border-t border-stone-100 pt-4">
                        <h3 className="text-sm font-medium text-stone-800 mb-3 bg-stone-50 inline-block px-3 py-1 rounded-md">男方家長 (選填)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">父親姓名</label>
                            <input type="text" name="groom_father_name" value={formData.groom_father_name} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：王大明" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">母親姓名</label>
                            <input type="text" name="groom_mother_name" value={formData.groom_mother_name} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：林美麗" />
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2 mt-2">
                        <h3 className="text-sm font-medium text-stone-800 mb-3 bg-stone-50 inline-block px-3 py-1 rounded-md">女方家長 (選填)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">父親姓名</label>
                            <input type="text" name="bride_father_name" value={formData.bride_father_name} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：陳建國" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">母親姓名</label>
                            <input type="text" name="bride_mother_name" value={formData.bride_mother_name} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：張淑芬" />
                          </div>
                        </div>
                      </div>
                      <div className="md:col-span-2 mt-2">
                        <label className="block text-sm font-medium text-stone-700 mb-1">祖父母名 (若需加上請在此備註)</label>
                        <input type="text" name="grandparents_names" value={formData.grandparents_names} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="選填，例：男方祖父 王阿土" />
                      </div>
                    </div>
                  </section>

                  {/* 婚宴資訊 */}
                  <section>
                    <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2 border-b pb-2">
                      <FileText className="w-5 h-5 text-rose-400" />
                      婚宴資訊
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">婚宴日期</label>
                        <input required type="date" name="wedding_date" value={formData.wedding_date} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-1">宴客場地名稱 / 廳別樓層</label>
                        <input required type="text" name="venue_name" value={formData.venue_name} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：台北萬豪酒店 / 8F 萬豪廳" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-1">宴客場地地址</label>
                        <input required type="text" name="venue_address" value={formData.venue_address} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：台北市中山區樂群二路199號" />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-stone-700 mb-1">婚禮當日行程時間 (勾選並填入時間)</label>
                      <p className="text-xs text-stone-500 mb-3">時間流程不確定沒關係，到時候核對稿件都可以再更新資訊喔。</p>
                      <div className="space-y-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-stone-200">
                          <input 
                            type="checkbox" 
                            id="check_schedule_unconfirmed"
                            name="schedule_unconfirmed"
                            checked={formData.schedule_unconfirmed || false}
                            onChange={(e) => setFormData(prev => ({ ...prev, schedule_unconfirmed: e.target.checked }))}
                            className="w-4 h-4 text-rose-500 rounded border-stone-300 focus:ring-rose-500"
                          />
                          <label htmlFor="check_schedule_unconfirmed" className="text-sm font-medium text-stone-700">尚未確認</label>
                        </div>
                        
                        <div className={`space-y-3 ${formData.schedule_unconfirmed ? 'opacity-50 pointer-events-none' : ''}`}>
                          {[
                            { id: 'schedule_tea_ceremony', label: '奉茶儀式' },
                            { id: 'schedule_wedding_ceremony', label: '證婚儀式' },
                            { id: 'schedule_welcome_reception', label: '迎賓酒會' },
                            { id: 'schedule_lunch_banquet', label: '浪漫午宴' },
                            { id: 'schedule_dinner_banquet', label: '浪漫晚宴' },
                            { id: 'schedule_seeing_off', label: '禮賓謝客' }
                          ].map(item => (
                            <div key={item.id} className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                id={`check_${item.id}`}
                                checked={!!formData[item.id as keyof WeddingData]}
                                onChange={(e) => {
                                  if (!e.target.checked) {
                                    setFormData(prev => ({ ...prev, [item.id]: "" }));
                                  } else {
                                    setFormData(prev => ({ ...prev, [item.id]: "12:00" })); // Default time when checked
                                  }
                                }}
                                className="w-4 h-4 text-rose-500 rounded border-stone-300 focus:ring-rose-500"
                              />
                              <label htmlFor={`check_${item.id}`} className="text-sm text-stone-700 w-20">{item.label}</label>
                              <input 
                                type="time" 
                                name={item.id}
                                value={formData[item.id as keyof WeddingData] as string || ""}
                                onChange={handleInputChange}
                                disabled={formData[item.id as keyof WeddingData] === ""}
                                className="px-3 py-1.5 border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all disabled:opacity-50 disabled:bg-stone-100 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* 訂購細節 */}
              {formData.order_type === 'invitation' && (
                <section>
                  <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2 border-b pb-2">
                    <LayoutTemplate className="w-5 h-5 text-rose-400" />
                    訂購資訊
                  </h2>
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">所需喜帖數量</label>
                      <input required type="number" name="invitation_quantity" value={formData.invitation_quantity} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：100" />
                    </div>

                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-stone-800">a. 若有加購升級封蠟貼紙，請選擇款式（若使用方案附贈的燙金貼紙請跳過此題）</h3>
                        {currentUser && (
                          <label className="cursor-pointer bg-white border border-stone-200 shadow-sm text-stone-600 px-2 py-1 rounded text-xs hover:bg-stone-50 flex items-center gap-1 transition-colors">
                            <Upload className="w-3 h-3" />
                            更換圖片
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  try {
                                    const res = await fetch('/api/settings', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                      body: JSON.stringify({ wedding_form_image_a: reader.result })
                                    });
                                    if (res.ok) {
                                      setPublicSettings(prev => ({ ...prev, wedding_form_image_a: reader.result as string }));
                                      alert('圖片更新成功');
                                    } else alert('圖片更新失敗');
                                  } catch(e) { alert('發生錯誤'); }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <img src={publicSettings.wedding_form_image_a || "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80"} alt="Wax Seal Options" className="w-full h-auto rounded-lg mb-4 object-cover max-h-[300px]" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">樣式</label>
                          <select 
                            name="wax_seal_style" 
                            value={formData.wax_seal_style} 
                            onChange={handleInputChange} 
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all bg-white"
                          >
                            <option value="">金屬燙金貼紙 (預設)</option>
                            <option value="Save the date">Save the date</option>
                            <option value="With love">With love</option>
                            <option value="花草">花草</option>
                            <option value="牽手">牽手</option>
                            <option value="帝王花">帝王花</option>
                            <option value="MiniStyleCards Logo">MiniStyleCards Logo</option>
                            <option value="客製內容">客製內容</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-stone-500 mb-1">顏色</label>
                          <select 
                            name="wax_seal_color" 
                            value={formData.wax_seal_color} 
                            onChange={handleInputChange} 
                            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all bg-white"
                          >
                            <option value="">無 (預設)</option>
                            <option value="霧金">霧金</option>
                            <option value="紅銅金">紅銅金</option>
                            <option value="古銅金">古銅金</option>
                            <option value="咖啡金">咖啡金</option>
                            <option value="復古金">復古金</option>
                            <option value="白色">白色</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="text-sm font-medium text-stone-800">b. 請填想要的信封顏色</h3>
                          <p className="text-xs text-stone-500 mb-3">50份以上最多可選兩個顏色</p>
                        </div>
                        {currentUser && (
                          <label className="cursor-pointer bg-white border border-stone-200 shadow-sm text-stone-600 px-2 py-1 rounded text-xs hover:bg-stone-50 flex items-center gap-1 transition-colors mt-0.5">
                            <Upload className="w-3 h-3" />
                            更換圖片
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  try {
                                    const res = await fetch('/api/settings', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                      body: JSON.stringify({ wedding_form_image_b: reader.result })
                                    });
                                    if (res.ok) {
                                      setPublicSettings(prev => ({ ...prev, wedding_form_image_b: reader.result as string }));
                                      alert('圖片更新成功');
                                    } else alert('圖片更新失敗');
                                  } catch(e) { alert('發生錯誤'); }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <img src={publicSettings.wedding_form_image_b || "https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?auto=format&fit=crop&w=800&q=80"} alt="Envelope Colors" className="w-full h-auto rounded-lg mb-4 object-cover max-h-[300px]" />
                      <input type="text" name="envelope_color" value={formData.envelope_color} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：酒紅色" />
                    </div>

                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h3 className="text-sm font-medium text-stone-800">c. 請選擇信封燙金位置</h3>
                          <p className="text-xs text-stone-500 mb-3">註：套餐贈送『單面』燙印，正面(中文地址)、背面(英文地址)二選一。<br/>雙面燙金 須加購！請私訊加購 完成款項才算成立</p>
                        </div>
                        {currentUser && (
                          <label className="cursor-pointer bg-white border border-stone-200 shadow-sm text-stone-600 px-2 py-1 rounded text-xs hover:bg-stone-50 flex items-center gap-1 transition-colors mt-0.5 shrink-0 ml-2">
                            <Upload className="w-3 h-3" />
                            更換圖片
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  try {
                                    const res = await fetch('/api/settings', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                      body: JSON.stringify({ wedding_form_image_c: reader.result })
                                    });
                                    if (res.ok) {
                                      setPublicSettings(prev => ({ ...prev, wedding_form_image_c: reader.result as string }));
                                      alert('圖片更新成功');
                                    } else alert('圖片更新失敗');
                                  } catch(e) { alert('發生錯誤'); }
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <img src={publicSettings.wedding_form_image_c || "https://images.unsplash.com/photo-1464802686167-b939a6910659?auto=format&fit=crop&w=800&q=80"} alt="Foil Positions" className="w-full h-auto rounded-lg mb-4 object-cover max-h-[300px]" />
                      <div className="space-y-2">
                        {[
                          "不需要燙金，信封正反面皆為『空白』無燙金資訊。",
                          "背面西式 英文地址",
                          "正面中式 中文地址",
                          "加購一面燙金$6/份 (燙金未滿100份以100份計算)"
                        ].map((option, idx) => (
                          <label key={idx} className="flex items-start gap-3 cursor-pointer">
                            <input 
                              type="radio" 
                              name="envelope_foil_position" 
                              value={option}
                              checked={formData.envelope_foil_position === option}
                              onChange={handleInputChange}
                              className="mt-1 w-4 h-4 text-rose-500 border-stone-300 focus:ring-rose-500"
                            />
                            <span className="text-sm text-stone-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <h3 className="text-sm font-medium text-stone-800 mb-1">d. 信封上寄件人地址或資訊</h3>
                      <p className="text-xs text-rose-500 mb-3 font-medium">請提供郵遞區號！郵遞區號！！！英文地址可至中華郵政自行翻譯，再提供會比較準確唷 謝謝</p>
                      <textarea name="envelope_sender_address" value={formData.envelope_sender_address} onChange={(e) => setFormData(prev => ({ ...prev, envelope_sender_address: e.target.value }))} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all min-h-[100px]" placeholder="可輸入男方家/女方家/雙方，請務必包含郵遞區號" />
                    </div>

                    <div className="bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <h3 className="text-sm font-medium text-stone-800 mb-1">e. 信封燙印Logo</h3>
                      <p className="text-xs text-stone-500 mb-3">請輸入代號 (A-O)</p>
                      <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80" alt="Envelope Logos" className="w-full h-auto rounded-lg mb-4 object-cover max-h-[300px]" />
                      <input type="text" name="envelope_logo" value={formData.envelope_logo} onChange={handleInputChange} className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" placeholder="例：A" />
                    </div>
                  </div>
                </section>
              )}

              {/* 寄件資訊 removed as it's now in 訂購資訊 */}

              <button type="submit" className="w-full bg-rose-500 hover:bg-rose-600 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2">
                <Send className="w-5 h-5" />
                送出資料
              </button>
            </form>
          </div>
        )}

        {view === "success" && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-2xl shadow-sm border border-stone-100 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif text-stone-800 mb-2">感謝您的填寫！</h2>
            <p className="text-stone-500 mb-8">
              {formData.order_type === 'invitation'
                ? '您的婚宴資訊已成功送出，我們的設計師將會盡快為您處理專屬的婚禮邀請卡。'
                : '您的訂購資訊已成功送出，我們將會盡快為您處理後續事宜。'}
            </p>
            
            <button onClick={() => setView("form")} className="text-stone-500 hover:text-stone-800 font-medium">
              返回表單
            </button>
          </div>
        )}

        {view === "quotation_link" && currentQuoteId && (
          <QuotationLink quotationId={currentQuoteId} />
        )}

        {view === "financial_report" && currentUser?.role === 'admin' && (
          <FinancialReport token={token!} designers={designers} showAlert={(t, m) => setModal({ isOpen: true, type: "alert", title: t, message: m })} />
        )}

        {view === "login" && (
          <div className="max-w-md mx-auto bg-white p-10 rounded-2xl shadow-sm border border-stone-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif text-stone-800 mb-2">設計師登入</h2>
              <p className="text-stone-500">請輸入您的帳號密碼以進入後台</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">帳號</label>
                <input 
                  required 
                  type="text" 
                  value={loginForm.username} 
                  onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))} 
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">密碼</label>
                <input 
                  required 
                  type="password" 
                  value={loginForm.password} 
                  onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))} 
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" 
                />
              </div>
              <button type="submit" className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-xl transition-colors mt-6">
                登入
              </button>
            </form>
          </div>
        )}

        {view === "dashboard" && (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between mb-8 gap-4 w-full">
              <div className="flex items-center justify-between w-full xl:w-auto">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-serif text-stone-800 shrink-0">設計師後台</h1>
                  {currentUser && (
                    <span className="text-sm text-stone-500 bg-stone-100 px-3 py-1 rounded-full shrink-0">
                      Hi, {currentUser.name}
                    </span>
                  )}
                </div>
                {/* Mobile logout */}
                <button 
                  onClick={handleLogout}
                  className="p-2 text-stone-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors xl:hidden shrink-0"
                  title="登出"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto overflow-hidden">
                <button
                  onClick={() => {
                    setNewOrderData({
                      order_type: "invitation",
                      template_id: "",
                      contact_source: "",
                      social_id: "",
                      designer_id: undefined,
                      payment_date: "",
                      amount: 0,
                      design_deadline: "",
                      delivery_date: "",
                      invitation_quantity: "",
                      wax_seal_style: "",
                      wax_seal_color: "",
                      envelope_color: "",
                      envelope_foil_position: "",
                      envelope_logo: "",
                      processing_options: "{}"
                    });
                    setShowCreateOrder(true);
                  }}
                  className="flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  新增訂單
                </button>
                <div className="flex-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex bg-stone-200 p-1 rounded-lg w-max shrink-0 bg-opacity-70 backdrop-blur-sm">
                    <button 
                      onClick={() => setDashboardTab("orders")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dashboardTab === "orders" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                    >
                      訂單
                    </button>
                    <button 
                      onClick={() => setDashboardTab("quotation")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dashboardTab === "quotation" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                    >
                      計算機
                    </button>
                    <button 
                      onClick={() => setDashboardTab("quotation_records")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dashboardTab === "quotation_records" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                    >
                      紀錄
                    </button>
                    <button 
                      onClick={() => setDashboardTab("templates")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dashboardTab === "templates" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                    >
                      樣板
                    </button>
                    <button 
                      onClick={() => setDashboardTab("marketing")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${dashboardTab === "marketing" ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
                    >
                      行銷
                    </button>
                    <div className="w-px h-6 bg-stone-300 mx-1 opacity-50 self-center shrink-0"></div>
                    <button 
                      onClick={() => setDashboardTab("shipping")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${dashboardTab === "shipping" ? "bg-white text-amber-700 shadow-sm" : "text-amber-700/80 hover:text-amber-700"}`}
                    >
                      🚀 出貨
                    </button>
                    <button 
                      onClick={() => setDashboardTab("labels")}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${dashboardTab === "labels" ? "bg-white text-indigo-600 shadow-sm" : "text-indigo-600/80 hover:text-indigo-600"}`}
                    >
                      🖨️ 標籤
                    </button>
                  </div>
                </div>
                {/* Desktop logout */}
                <button 
                  onClick={handleLogout}
                  className="p-2 text-stone-500 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors hidden xl:block shrink-0"
                  title="登出"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {dashboardTab === "orders" && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-stone-800">訂單統計</h3>
                  <select
                    value={dashboardMonth}
                    onChange={(e) => setDashboardMonth(e.target.value)}
                    className="px-3 py-1.5 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="all">全部月份 (歷史總計)</option>
                    {Array.from(new Set(submissions.map(s => s.created_at?.substring(0, 7)).filter(Boolean))).sort().reverse().map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                
                {(() => {
                  const statsSubmissions = dashboardMonth === "all" 
                    ? submissions 
                    : submissions.filter(sub => sub.created_at?.startsWith(dashboardMonth));
                  
                  return (
                    <>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                          <p className="text-sm text-stone-500 mb-1">{dashboardMonth === "all" ? "總訂單數" : "該月訂單數"}</p>
                          <p className="text-2xl font-serif text-stone-800">{statsSubmissions.length}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                          <p className="text-sm text-stone-500 mb-1">平均喜帖數量</p>
                          <p className="text-2xl font-serif text-stone-800">
                            {(() => {
                              const invitationOrders = statsSubmissions.filter(sub => sub.order_type === 'invitation');
                              return invitationOrders.length > 0 
                                ? Math.round(invitationOrders.reduce((acc, sub) => acc + (sub.invitation_quantity || 0), 0) / invitationOrders.length)
                                : 0;
                            })()}
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                          <p className="text-sm text-stone-500 mb-1">{dashboardMonth === "all" ? "本月新訂單" : "已結案訂單"}</p>
                          <p className="text-2xl font-serif text-stone-800">
                            {dashboardMonth === "all" 
                              ? submissions.filter(sub => {
                                  const date = new Date(sub.created_at || "");
                                  const now = new Date();
                                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                                }).length
                              : statsSubmissions.filter(sub => sub.status === "已結案").length
                            }
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                          <p className="text-sm text-stone-500 mb-1">待處理訂單</p>
                          <p className="text-2xl font-serif text-stone-800">
                            {statsSubmissions.filter(sub => sub.status === "新進訂單" || !sub.status).length}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                          <p className="text-sm font-medium text-stone-800 mb-3">地區分佈</p>
                          <div className="space-y-2">
                            {statsSubmissions.length === 0 ? (
                              <div className="text-sm text-stone-400 text-center py-4">尚無訂單資料</div>
                            ) : (
                              ["台北", "新北", "桃園", "台中", "台南", "高雄", "新竹", "苗栗", "彰化", "南投", "雲林", "嘉義", "屏東", "宜蘭", "花蓮", "台東"].map(city => {
                                const count = statsSubmissions.filter(s => 
                                  s.venue_address?.includes(city) || 
                                  (city === "台北" && s.venue_address?.includes("臺北")) ||
                                  (city === "台中" && s.venue_address?.includes("臺中")) ||
                                  (city === "台南" && s.venue_address?.includes("臺南")) ||
                                  (city === "台東" && s.venue_address?.includes("臺東"))
                                ).length;
                                if (count === 0) return null;
                                return (
                                  <div key={city} className="flex items-center justify-between text-sm">
                                    <span className="text-stone-600">{city}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${(count / statsSubmissions.length) * 100}%` }} />
                                      </div>
                                      <span className="text-stone-500 w-8 text-right">{count}</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            {statsSubmissions.length > 0 && !["台北", "新北", "桃園", "台中", "台南", "高雄", "新竹", "苗栗", "彰化", "南投", "雲林", "嘉義", "屏東", "宜蘭", "花蓮", "台東"].some(city => statsSubmissions.filter(s => s.venue_address?.includes(city) || (city === "台北" && s.venue_address?.includes("臺北")) || (city === "台中" && s.venue_address?.includes("臺中")) || (city === "台南" && s.venue_address?.includes("臺南")) || (city === "台東" && s.venue_address?.includes("臺東"))).length > 0) && (
                              <div className="text-sm text-stone-400 text-center py-4">無符合的地區資料</div>
                            )}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-stone-100">
                          <p className="text-sm font-medium text-stone-800 mb-3">聯絡來源</p>
                          <div className="space-y-2">
                            {statsSubmissions.length === 0 ? (
                              <div className="text-sm text-stone-400 text-center py-4">尚無訂單資料</div>
                            ) : (
                              ["FB", "IG", "Line", "官網", "其他"].map(source => {
                                const count = statsSubmissions.filter(s => s.contact_source === source).length;
                                if (count === 0) return null;
                                return (
                                  <div key={source} className="flex items-center justify-between text-sm">
                                    <span className="text-stone-600">{source}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-32 h-2 bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(count / statsSubmissions.length) * 100}%` }} />
                                      </div>
                                      <span className="text-stone-500 w-8 text-right">{count}</span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            {statsSubmissions.length > 0 && !["FB", "IG", "Line", "官網", "其他"].some(source => statsSubmissions.filter(s => s.contact_source === source).length > 0) && (
                              <div className="text-sm text-stone-400 text-center py-4">無符合的來源資料</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 w-full">
                      <span className="text-sm font-medium text-stone-700 whitespace-nowrap">訂單狀態：</span>
                      <div className="flex gap-2">
                        {[
                          { id: "all", label: "全部訂單" },
                          { id: "等待填寫資料", label: "等待填寫資料" },
                          { id: "新進訂單", label: "新進訂單" },
                          { id: "設計中", label: "設計中" },
                          { id: "製作中", label: "製作中" },
                          { id: "已發印", label: "已發印" },
                          { id: "已出貨", label: "已出貨" },
                          { id: "已結案", label: "已結案" }
                        ].map(status => (
                          <button
                            key={status.id}
                            onClick={() => setFilterStatus(status.id)}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${filterStatus === status.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 w-full">
                      <span className="text-sm font-medium text-stone-700 whitespace-nowrap">篩選設計師：</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setFilterDesignerId("all")}
                          className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${filterDesignerId === "all" ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                        >
                          全部設計師
                        </button>
                        {designers.map(designer => (
                          <button
                            key={designer.id}
                            onClick={() => setFilterDesignerId(designer.id)}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${filterDesignerId === designer.id ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
                          >
                            {designer.name}
                          </button>
                        ))}
                        {currentUser?.role === 'admin' && (
                          <button
                            onClick={() => setShowAddDesigner(true)}
                            className="px-3 py-1.5 text-sm rounded-full transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1 whitespace-nowrap"
                          >
                            <Settings className="w-4 h-4" />
                            管理設計師
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="relative w-full md:w-64 shrink-0">
                    <input
                      type="text"
                      placeholder="搜尋姓名、電話、編號、日期、狀態..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                    />
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b border-stone-200">
                          <th className="py-4 px-6 font-medium text-stone-600 text-sm whitespace-nowrap">訂單編號</th>
                          <th className="py-4 px-6 font-medium text-stone-600 text-sm whitespace-nowrap">社群帳號</th>
                          <th className="py-4 px-6 font-medium text-stone-600 text-sm whitespace-nowrap">付款日 / 金額</th>
                          <th className="py-4 px-6 font-medium text-stone-600 text-sm whitespace-nowrap">設計完成日 / 交件日</th>
                          <th className="py-4 px-6 font-medium text-stone-600 text-sm whitespace-nowrap">負責設計師</th>
                          <th className="py-4 px-6 font-medium text-stone-600 text-sm whitespace-nowrap">狀態</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {submissions
                          .filter(sub => filterDesignerId === "all" || sub.designer_id === filterDesignerId)
                          .filter(sub => {
                            if (filterStatus === "all") return true;
                            if (filterStatus === "等待填寫資料") return !sub.status || sub.status === "等待填寫資料";
                            return sub.status === filterStatus;
                          })
                          .filter(sub => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            return (
                              sub.id?.toString().includes(q) ||
                              sub.groom_name_zh?.toLowerCase().includes(q) ||
                              sub.bride_name_zh?.toLowerCase().includes(q) ||
                              sub.groom_name_en?.toLowerCase().includes(q) ||
                              sub.bride_name_en?.toLowerCase().includes(q) ||
                              sub.receiver_name?.toLowerCase().includes(q) ||
                              sub.receiver_phone?.includes(q) ||
                              sub.social_id?.toLowerCase().includes(q) ||
                              sub.wedding_date?.includes(q) ||
                              sub.status?.toLowerCase().includes(q) ||
                              sub.order_code?.toLowerCase().includes(q)
                            );
                          })
                          .length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-stone-500">目前尚無訂單</td>
                          </tr>
                        ) : (
                          submissions
                            .filter(sub => filterDesignerId === "all" || sub.designer_id === filterDesignerId)
                            .filter(sub => {
                              if (filterStatus === "all") return true;
                              if (filterStatus === "等待填寫資料") return !sub.status || sub.status === "等待填寫資料";
                              return sub.status === filterStatus;
                            })
                            .filter(sub => {
                              if (!searchQuery) return true;
                              const q = searchQuery.toLowerCase();
                              return (
                                sub.id?.toString().includes(q) ||
                                sub.groom_name_zh?.toLowerCase().includes(q) ||
                                sub.bride_name_zh?.toLowerCase().includes(q) ||
                                sub.groom_name_en?.toLowerCase().includes(q) ||
                                sub.bride_name_en?.toLowerCase().includes(q) ||
                                sub.receiver_name?.toLowerCase().includes(q) ||
                                sub.receiver_phone?.includes(q) ||
                                sub.social_id?.toLowerCase().includes(q) ||
                                sub.wedding_date?.includes(q) ||
                                sub.status?.toLowerCase().includes(q) ||
                                sub.order_code?.toLowerCase().includes(q)
                              );
                            })
                            .map((sub) => {
                            const templateName = templates.find(t => t.id === sub.template_id)?.name || sub.template_id;
                            const isExpanded = expandedOrderId === sub.id;
                            return (
                              <React.Fragment key={sub.id}>
                                <tr className="hover:bg-stone-50/50 transition-colors border-b-0">
                                  <td className="py-4 px-6 text-sm">
                                    <div className="font-medium text-stone-800">#{sub.id}</div>
                                    <div className="text-xs text-stone-500">{sub.order_code}</div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="font-medium text-stone-800">{sub.social_id || "-"}</div>
                                    <div className="text-xs text-stone-500">{sub.contact_source || "-"}</div>
                                  </td>
                                  <td className="py-4 px-6 text-sm text-stone-700">
                                    <div>{sub.payment_date || "未付款"}</div>
                                    <div className="text-stone-500">${sub.amount || 0}</div>
                                  </td>
                                  <td className="py-4 px-6 text-sm text-stone-700">
                                    <div className="text-rose-600 font-medium mb-1 border border-rose-200 bg-rose-50 px-1.5 py-0.5 rounded inline-block text-xs">婚期: {sub.wedding_date || "-"}</div>
                                    <div>設計: {sub.design_deadline || "-"}</div>
                                    <div className="text-stone-500 flex items-center gap-1">
                                      {sub.wedding_date && sub.delivery_date && 
                                        (new Date(sub.wedding_date).getTime() - new Date(sub.delivery_date).getTime()) < 45 * 24 * 60 * 60 * 1000 && (
                                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="交件日距離婚期低於1.5個月" />
                                      )}
                                      交件: {sub.delivery_date || "-"}
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    <select
                                      value={sub.designer_id || ""}
                                      onChange={(e) => sub.id && handleAssignDesigner(sub.id, e.target.value ? Number(e.target.value) : "")}
                                      className="text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none bg-stone-50 px-2 py-1"
                                    >
                                      <option value="">尚未指派</option>
                                      {designers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="py-4 px-6">
                                    <select
                                      value={sub.status || "等待填寫資料"}
                                      onChange={(e) => sub.id && handleChangeStatus(sub.id, e.target.value)}
                                      className={`text-sm rounded-md outline-none px-2 py-1 font-medium ${
                                        sub.status === "已結案" ? "bg-stone-100 text-stone-700 border-stone-200" :
                                        sub.status === "已出貨" ? "bg-green-100 text-green-700 border-green-200" :
                                        sub.status === "已發印" ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                                        sub.status === "製作中" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                        sub.status === "設計中" ? "bg-pink-100 text-pink-700 border-pink-200" :
                                        sub.status === "新進訂單" ? "bg-purple-100 text-purple-700 border-purple-200" :
                                        "bg-yellow-100 text-yellow-700 border-yellow-200"
                                      }`}
                                    >
                                      <option value="等待填寫資料">等待填寫資料</option>
                                      <option value="新進訂單">新進訂單</option>
                                      <option value="設計中">設計中</option>
                                      <option value="製作中">製作中</option>
                                      <option value="已發印">已發印</option>
                                      <option value="已出貨">已出貨</option>
                                      <option value="已結案">已結案</option>
                                    </select>
                                  </td>
                                </tr>
                                <tr className="hover:bg-stone-50/50 transition-colors border-t-0">
                                  <td colSpan={6} className="pt-0 pb-4 px-6 text-right">
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <button
                                          onClick={() => {
                                            const url = `${window.location.origin}/form/${sub.order_code}`;
                                            navigator.clipboard.writeText(url);
                                            showAlert("成功", "已複製問卷表單連結！");
                                          }}
                                          className="inline-flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                          title="複製問卷連結"
                                        >
                                          <Copy className="w-4 h-4" />
                                          複製連結
                                        </button>
                                        <button
                                          onClick={() => setExpandedOrderId(isExpanded ? null : sub.id!)}
                                          className="inline-flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                          {isExpanded ? "隱藏詳情" : "查看詳情"}
                                        </button>
                                        <button
                                          onClick={() => setEditingOrder(sub)}
                                          className="inline-flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-stone-200"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                          編輯
                                        </button>
                                        <a 
                                          href={`/api/weddings/${sub.id}/download-txt?token=${token}`}
                                          target="_blank"
                                          className="inline-flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                          <FileText className="w-4 h-4" />
                                          下載 TXT
                                        </a>
                                        <a 
                                          href={`/api/weddings/${sub.id}/download?token=${token}`}
                                          target="_blank"
                                          className="inline-flex items-center justify-center gap-1 bg-stone-900 hover:bg-stone-800 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                          <Download className="w-4 h-4" />
                                          下載底圖 (PDF)
                                        </a>
                                        <button
                                          onClick={() => setPrintingOrder(sub)}
                                          className="inline-flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border border-stone-200"
                                        >
                                          <Printer className="w-4 h-4" />
                                          列印工作單
                                        </button>
                                        <button
                                          onClick={() => sub.id && handleDuplicateOrder(sub.id)}
                                          className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200 rounded-lg transition-colors ml-2"
                                          title="複製訂單"
                                        >
                                          <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => sub.id && handleDeleteOrder(sub.id)}
                                          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                          title="刪除訂單"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-stone-50/80 border-b border-stone-200">
                                    <td colSpan={7} className="px-6 py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                        <div>
                                          <h4 className="font-medium text-stone-800 mb-2 border-b border-stone-200 pb-1">聯絡資訊</h4>
                                          <div className="space-y-1 text-stone-600">
                                            <p><span className="text-stone-400">來源：</span>{sub.contact_source || "未提供"}</p>
                                            <p><span className="text-stone-400">社群帳號：</span>{sub.social_id || "未提供"}</p>
                                            <p><span className="text-stone-400">收件人：</span>{sub.receiver_name || "未提供"}</p>
                                            <p><span className="text-stone-400">電話：</span>{sub.receiver_phone || "未提供"}</p>
                                            <p><span className="text-stone-400">Email：</span>{sub.email || "未提供"}</p>
                                            <p><span className="text-stone-400">地址：</span>{sub.receiver_address || "未提供"}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-stone-800 mb-2 border-b border-stone-200 pb-1">新人、長輩與場地資訊</h4>
                                          <div className="space-y-1 text-stone-600">
                                            <p><span className="text-stone-400">新郎：</span>{sub.groom_name_zh} {sub.groom_name_en}</p>
                                            <p><span className="text-stone-400">新娘：</span>{sub.bride_name_zh} {sub.bride_name_en}</p>
                                            <p className="mt-2 pt-2 border-t border-stone-100"><span className="text-stone-400">男方家長：</span>{sub.groom_father_name} {sub.groom_mother_name}</p>
                                            <p><span className="text-stone-400">女方家長：</span>{sub.bride_father_name} {sub.bride_mother_name}</p>
                                            {sub.grandparents_names && <p><span className="text-stone-400">祖父母：</span>{sub.grandparents_names}</p>}
                                            <p className="mt-2 pt-2 border-t border-stone-100"><span className="text-stone-400">場地名稱：</span>{sub.venue_name}</p>
                                            <p><span className="text-stone-400">場地地址：</span>{sub.venue_address}</p>
                                          </div>
                                          
                                          <h4 className="font-medium text-stone-800 mt-6 mb-2 border-b border-stone-200 pb-1">詳細行程時間</h4>
                                          {sub.schedule_unconfirmed ? (
                                            <p className="text-stone-600">尚未確認</p>
                                          ) : (
                                            <div className="space-y-1 text-stone-600">
                                              {sub.schedule_tea_ceremony && <p><span className="text-stone-400">奉茶：</span>{sub.schedule_tea_ceremony}</p>}
                                              {sub.schedule_wedding_ceremony && <p><span className="text-stone-400">證婚：</span>{sub.schedule_wedding_ceremony}</p>}
                                              {sub.schedule_welcome_reception && <p><span className="text-stone-400">迎賓：</span>{sub.schedule_welcome_reception}</p>}
                                              {sub.schedule_lunch_banquet && <p><span className="text-stone-400">午宴：</span>{sub.schedule_lunch_banquet}</p>}
                                              {sub.schedule_dinner_banquet && <p><span className="text-stone-400">晚宴：</span>{sub.schedule_dinner_banquet}</p>}
                                              {sub.schedule_seeing_off && <p><span className="text-stone-400">謝客：</span>{sub.schedule_seeing_off}</p>}
                                              {!sub.schedule_tea_ceremony && !sub.schedule_wedding_ceremony && !sub.schedule_welcome_reception && !sub.schedule_lunch_banquet && !sub.schedule_dinner_banquet && !sub.schedule_seeing_off && <p>無提供詳細行程</p>}
                                            </div>
                                          )}
                                        </div>
                                        <div>
                                          <h4 className="font-medium text-stone-800 mb-2 border-b border-stone-200 pb-1">訂購資訊</h4>
                                          <div className="space-y-1 text-stone-600">
                                            <p><span className="text-stone-400">樣板：</span><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-800">{templateName}</span></p>
                                            <p><span className="text-stone-400">數量：</span>{sub.invitation_quantity || "未提供"}</p>
                                            <p><span className="text-stone-400">封蠟樣式：</span>{sub.wax_seal_style || "未提供"}</p>
                                            <p><span className="text-stone-400">封蠟顏色：</span>{sub.wax_seal_color || "未提供"}</p>
                                            <p><span className="text-stone-400">信封顏色：</span>{sub.envelope_color || "未提供"}</p>
                                            <p><span className="text-stone-400">燙金位置：</span>{sub.envelope_foil_position || "未提供"}</p>
                                            <p><span className="text-stone-400">信封燙印Logo：</span>{sub.envelope_logo || "未提供"}</p>
                                            <p><span className="text-stone-400">寄件資訊：</span><br/>{sub.envelope_sender_address || "未提供"}</p>
                                          </div>
                                        </div>
                                        <div className="md:col-span-3 border-t border-stone-200 pt-4 mt-2">
                                          <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                                            <Tag className="w-4 h-4 text-rose-500" />
                                            客戶標籤
                                          </h4>
                                          <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm flex flex-wrap gap-2 items-center mb-2">
                                            {(() => {
                                              let parsedTags: string[] = [];
                                              try { parsedTags = sub.tags ? JSON.parse(sub.tags) : []; } catch (e) {}
                                              return parsedTags.map((tag: string, idx: number) => (
                                                <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-medium border border-rose-100">
                                                  {tag}
                                                  <button
                                                    onClick={() => {
                                                      const newTags = parsedTags.filter((_: string, i: number) => i !== idx);
                                                      handleUpdateTags(sub.id!, newTags);
                                                    }}
                                                    className="hover:text-rose-900"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </span>
                                              ));
                                            })()}
                                            <input
                                              type="text"
                                              placeholder="+ 自訂標籤 (按 Enter)"
                                              className="text-sm bg-transparent border-none outline-none placeholder:text-stone-400 w-40 focus:ring-0 p-1"
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  const val = e.currentTarget.value.trim();
                                                  let currentTags: string[] = [];
                                                  try { currentTags = sub.tags ? JSON.parse(sub.tags) : []; } catch (err) {}
                                                  if (val && !currentTags.includes(val)) {
                                                    handleUpdateTags(sub.id!, [...currentTags, val]);
                                                    e.currentTarget.value = '';
                                                  }
                                                }
                                              }}
                                            />
                                          </div>
                                          <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-xs text-stone-500">推薦標籤：</span>
                                            {isEditingRecommendedTags ? (
                                              <div className="flex items-center gap-2 w-full mt-1">
                                                <input
                                                  type="text"
                                                  value={recommendedTagsInput}
                                                  onChange={(e) => setRecommendedTagsInput(e.target.value)}
                                                  className="flex-1 text-sm border border-stone-300 rounded-md px-2 py-1 outline-none focus:border-rose-500"
                                                  placeholder="請輸入標籤，以逗號分隔 (例如: VIP,急件)"
                                                />
                                                <button onClick={handleSaveRecommendedTags} className="text-xs bg-stone-800 text-white px-3 py-1.5 rounded-md hover:bg-stone-900 transition-colors">儲存</button>
                                                <button onClick={() => setIsEditingRecommendedTags(false)} className="text-xs bg-stone-200 text-stone-600 px-3 py-1.5 rounded-md hover:bg-stone-300 transition-colors">取消</button>
                                              </div>
                                            ) : (
                                              <>
                                                {(settings.recommended_tags ? settings.recommended_tags.split(',').map(t => t.trim()).filter(Boolean) : ['已買書約', '潛在彌月客', 'VIP', '急件', '海外客戶', '需特別注意']).map(tag => (
                                                  <button
                                                    key={tag}
                                                    onClick={() => {
                                                      let currentTags: string[] = [];
                                                      try { currentTags = sub.tags ? JSON.parse(sub.tags) : []; } catch (err) {}
                                                      if (!currentTags.includes(tag)) {
                                                        handleUpdateTags(sub.id!, [...currentTags, tag]);
                                                      }
                                                    }}
                                                    className="text-xs px-2 py-1 rounded-md bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                                                  >
                                                    + {tag}
                                                  </button>
                                                ))}
                                                <button
                                                  onClick={() => {
                                                    const currentRecTags = settings.recommended_tags ? settings.recommended_tags.split(',').map(t => t.trim()).filter(Boolean).join(', ') : '已買書約, 潛在彌月客, VIP, 急件, 海外客戶, 需特別注意';
                                                    setRecommendedTagsInput(currentRecTags);
                                                    setIsEditingRecommendedTags(true);
                                                  }}
                                                  className="text-xs text-stone-400 hover:text-stone-600 underline underline-offset-2 ml-1"
                                                >
                                                  編輯
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <div className="md:col-span-3 border-t border-stone-200 pt-4 mt-2">
                                          <h4 className="font-medium text-stone-800 mb-3 flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-stone-500" />
                                            訂單管理
                                          </h4>
                                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                              <label className="block text-xs font-medium text-stone-500 mb-1">付款日期</label>
                                              <input 
                                                type="date" 
                                                className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-2 py-1.5"
                                                value={sub.payment_date || ""}
                                                onChange={(e) => {
                                                  setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, payment_date: e.target.value } : s));
                                                  sub.id && handleUpdatePayment(sub.id, e.target.value, sub.amount || 0);
                                                }}
                                              />
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                              <label className="block text-xs font-medium text-stone-500 mb-1">訂單金額</label>
                                              <div className="relative">
                                                <span className="absolute left-2 top-1.5 text-stone-400 text-sm">$</span>
                                                <input 
                                                  type="number" 
                                                  className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none pl-6 pr-2 py-1.5"
                                                  value={sub.amount || ""}
                                                  onChange={(e) => {
                                                    setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, amount: Number(e.target.value) } : s));
                                                  }}
                                                  onBlur={(e) => sub.id && handleUpdatePayment(sub.id, sub.payment_date || "", Number(e.target.value))}
                                                  placeholder="0"
                                                />
                                              </div>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                              <label className="block text-xs font-medium text-stone-500 mb-1">設計完成日</label>
                                              <input 
                                                type="date" 
                                                className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-2 py-1.5"
                                                value={sub.design_deadline || ""}
                                                onChange={(e) => {
                                                  setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, design_deadline: e.target.value } : s));
                                                  sub.id && handleUpdateDates(sub.id, e.target.value, sub.delivery_date || "");
                                                }}
                                              />
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
                                              <label className="block text-xs font-medium text-stone-500 mb-1">最後交件日</label>
                                              <input 
                                                type="date" 
                                                className="w-full text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-2 py-1.5"
                                                value={sub.delivery_date || ""}
                                                onChange={(e) => {
                                                  setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, delivery_date: e.target.value } : s));
                                                  sub.id && handleUpdateDates(sub.id, sub.design_deadline || "", e.target.value);
                                                }}
                                              />
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-stone-200 shadow-sm md:col-span-2 lg:col-span-4">
                                              <label className="block text-xs font-medium text-stone-500 mb-1">快遞單號</label>
                                              <div className="flex gap-2">
                                                <input 
                                                  type="text" 
                                                  className="flex-1 text-sm border-stone-300 rounded-md focus:ring-rose-500 focus:border-rose-500 outline-none px-3 py-1.5"
                                                  value={sub.tracking_number || ""}
                                                  onChange={(e) => {
                                                    setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, tracking_number: e.target.value } : s));
                                                  }}
                                                  onBlur={(e) => sub.id && handleUpdateTracking(sub.id, e.target.value)}
                                                  placeholder="請輸入快遞單號 (輸入完畢點擊空白處儲存)"
                                                />
                                              </div>
                                              <ShippingEmailForm sub={sub} token={token} settings={settings} onSettingsUpdated={() => loadDashboard()} />
                                              <MarketingEmailForm sub={sub} token={token} settings={settings} onSettingsUpdated={() => loadDashboard()} />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6 text-blue-800">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    設計師工作流程說明
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700/80 mb-4">
                    <li>點擊「下載底圖 (PDF)」取得您上傳的原始 PDF 檔案（完全保留 Illustrator 編輯功能）。</li>
                    <li>點擊「下載 TXT」取得客戶填寫的資料。</li>
                    <li>使用 Adobe Illustrator 開啟下載的 PDF 底圖。</li>
                    <li>從 TXT 檔中複製客戶資料，貼上到設計底圖進行排版與字體調整。</li>
                    <li>排版完成後，即可存檔送印。</li>
                  </ol>
                  <div className="bg-white/60 rounded-lg p-4 text-sm mt-4">
                    <h4 className="font-bold mb-2 flex items-center gap-1 text-blue-900">
                      <span className="text-amber-500">💡</span> 貼上文字不跑版的技巧
                    </h4>
                    <p className="mb-2 text-blue-800">在 Illustrator 中複製貼上文字時，您可以使用以下方式確保格式正確：</p>
                    <ul className="list-disc list-inside space-y-1.5 ml-1 text-blue-700/90">
                      <li><strong>方法一（最推薦）：</strong>從 TXT 檔中複製文字，在 AI 中雙擊進入文字框後，使用快捷鍵 <kbd className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-xs font-sans shadow-sm">Ctrl+Alt+Shift+V</kbd> (Mac 為 <kbd className="bg-white border border-blue-200 px-1.5 py-0.5 rounded text-xs font-sans shadow-sm">Cmd+Option+Shift+V</kbd>) 進行「貼上但不含格式」。</li>
                      <li><strong>方法二：</strong>貼上文字後，選取該文字，使用「滴管工具 (I)」點擊旁邊正確樣式的文字，即可瞬間套用字體與顏色。</li>
                    </ul>
                  </div>
                </div>
              </>
            )}

            {dashboardTab === "quotation" && (
              <QuotationGenerator 
                editQuoteData={editQuoteData}
                onClearEdit={() => setEditQuoteData(null)}
              />
            )}

            {dashboardTab === "quotation_records" && (
              <QuotationList 
                onEditQuote={(quote) => {
                  setEditQuoteData(quote);
                  setDashboardTab("quotation");
                }}
                onConvertToOrder={(quote) => {
                const data = JSON.parse(quote.quotation_data);
                
                const processingOptions: Record<string, { tags: string[], quantity: number }> = {};
                
                // Package -> Material & Envelope
                if (data.quotationData?.pkg?.name && data.quotationData.pkg.id !== 'none') {
                  processingOptions["Material"] = { tags: [`#${data.quotationData.pkg.name}`], quantity: data.customer?.quantity || 0 };
                  processingOptions["Envelope"] = { tags: ["#顏色待定", "#信封燙金-單面"], quantity: data.customer?.quantity || 0 };
                }
                
                // Illustrator
                if (data.selectedIllustratorId && data.selectedIllustratorId !== 'none') {
                  const ill = data.quotationData?.addonDetails?.find((a: any) => a.name === '插畫師專屬插畫');
                  if (ill && ill.customText) {
                    const match = ill.customText.match(/老師：(.*?)\n/);
                    const styleMatch = ill.customText.match(/畫風：(.*?)\n/);
                    if (match && styleMatch) {
                      processingOptions["Illustrator"] = { tags: [`#${match[1]}老師 / ${styleMatch[1]}`], quantity: 1 };
                    } else {
                      processingOptions["Illustrator"] = { tags: ["#客供自備插畫檔案"], quantity: 1 };
                    }
                  } else {
                    processingOptions["Illustrator"] = { tags: ["#客供自備插畫檔案"], quantity: 1 };
                  }
                }
                
                // Addons
                let hasWaxSeal = false;
                if (data.selectedAddons) {
                  Object.keys(data.selectedAddons).forEach(addonId => {
                    if (data.selectedAddons[addonId]) {
                      // Find the addon name from settings
                      let addonsList: any[] = [];
                      let independentAddonsList: any[] = [];
                      try {
                        if (settings.quotation_addons) addonsList = JSON.parse(settings.quotation_addons);
                        if (settings.quotation_independent_addons) independentAddonsList = JSON.parse(settings.quotation_independent_addons);
                      } catch (e) {
                        console.error("Failed to parse addons from settings", e);
                      }
                      
                      const addonInfo = addonsList.find((a: any) => a.id === addonId) || 
                                        independentAddonsList.find((a: any) => a.id === addonId);
                      const addonName = addonInfo ? addonInfo.name : '';
                      
                      const defaultQtyType = addonInfo?.defaultQtyType || (addonsList.some((a: any) => a.id === addonId) ? 'order_qty' : 'fixed_1');
                      const defaultQty = defaultQtyType === 'fixed_1' ? 1 : (data.customer?.quantity || 100);
                      const qty = data.addonQuantities?.[addonId] !== undefined ? data.addonQuantities[addonId] : defaultQty;

                      let isMapped = false;

                      // Material mapping
                      if (addonName.includes('資訊小卡') || addonId === 'card_single' || addonId === 'card_double' || addonId === 'card_shape') {
                        if (!processingOptions["Material"]) processingOptions["Material"] = { tags: [], quantity: qty };
                        if (!processingOptions["Material"].tags.includes("#婚禮資訊小卡")) {
                          processingOptions["Material"].tags.push("#婚禮資訊小卡");
                        }
                        isMapped = true;
                      }
                      if (addonName.includes('地圖卡') || addonId === 'map_card') {
                        if (!processingOptions["Material"]) processingOptions["Material"] = { tags: [], quantity: qty };
                        if (!processingOptions["Material"].tags.includes("#地圖卡")) {
                          processingOptions["Material"].tags.push("#地圖卡");
                        }
                        isMapped = true;
                      }
                      
                      // Ribbon mapping
                      if (addonName.includes('緞帶') || addonId === 'ribbon') {
                        processingOptions["Ribbon"] = { tags: ["#緞帶-顏色待定"], quantity: qty };
                        isMapped = true;
                      }
                      
                      // Sticker mapping
                      if (addonName.includes('封蠟貼紙') || addonId === 'wax_seal') {
                        hasWaxSeal = true;
                        processingOptions["Sticker"] = { tags: ["#封蠟貼紙樣式：待定", "#顏色：霧金"], quantity: qty };
                        isMapped = true;
                      }
                      
                      // Others mapping
                      if (addonName.includes('內襯') || addonId === 'liner') {
                        if (!processingOptions["BackingPaper"]) processingOptions["BackingPaper"] = { tags: [], quantity: qty };
                        processingOptions["BackingPaper"].tags.push("#信封內襯");
                        isMapped = true;
                      }
                      if (addonName.includes('透明封套') || addonId === 'clear_sleeve') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: qty };
                        processingOptions["Others"].tags.push("#透明封套");
                        isMapped = true;
                      }
                      if (addonName.includes('飛機吊飾') || addonId === 'airplane') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: qty };
                        processingOptions["Others"].tags.push("#飛機吊飾 (含綁繩)");
                        isMapped = true;
                      }
                      if (addonName.includes('杯墊') || addonId === 'coaster') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: qty };
                        processingOptions["Others"].tags.push("#陶瓷杯墊");
                        isMapped = true;
                      }
                      
                      // CardsBronzing mapping
                      if (!addonName.includes('信封') && ((addonName.includes('燙金') && (addonName.includes('單面') || addonName.includes('單'))) || addonId === 'foil_single')) {
                        processingOptions["CardsBronzing"] = { tags: ["#卡片_單面_燙金"], quantity: qty };
                        isMapped = true;
                      } else if (!addonName.includes('信封') && ((addonName.includes('燙金') && (addonName.includes('雙面') || addonName.includes('雙'))) || addonId === 'foil_double')) {
                        processingOptions["CardsBronzing"] = { tags: ["#卡片_雙面_燙金"], quantity: qty };
                        isMapped = true;
                      }
                      
                      // Oath mapping
                      if (addonName.includes('誓言本') || addonId === 'vow_book') {
                        processingOptions["Oath"] = { tags: ["#誓言本-顏色待定"], quantity: qty };
                        isMapped = true;
                      }
                      
                      // WaxStrips mapping
                      if (addonName.includes('蠟條') || addonId === 'wax_strips') {
                        processingOptions["WaxStrips"] = { tags: ["#蠟條(9條1包)"], quantity: qty };
                        isMapped = true;
                      }
                      
                      // EnvelopeBronzing mapping
                      if ((addonName.includes('信封') && addonName.includes('燙金')) || addonId === 'env_foil') {
                        if (!processingOptions["Envelope"]) processingOptions["Envelope"] = { tags: [], quantity: 0 };
                        if (!processingOptions["Envelope"].tags.includes("#信封燙金-單面")) processingOptions["Envelope"].tags.push("#信封燙金-單面");
                        processingOptions["Envelope"].quantity = Math.max(processingOptions["Envelope"].quantity, qty);
                        isMapped = true;
                      }
                      
                      // Envelope mapping
                      if ((addonName.includes('信封') && !addonName.includes('燙金') && !addonName.includes('內襯')) || addonId === 'env_extra') {
                        if (!processingOptions["Envelope"]) processingOptions["Envelope"] = { tags: [], quantity: 0 };
                        if (!processingOptions["Envelope"].tags.includes("#顏色待定")) processingOptions["Envelope"].tags.push("#顏色待定");
                        processingOptions["Envelope"].quantity += qty;
                        isMapped = true;
                      }
                      
                      // More Others mapping
                      if (addonName.includes('禮金簿') || addonName.includes('簽到本') || addonId === 'guest_book') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                        processingOptions["Others"].tags.push('#禮金簿/簽到本');
                        processingOptions["Others"].quantity += qty;
                        isMapped = true;
                      }
                      if (addonName.includes('簽名軸') || addonId === 'scroll') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                        processingOptions["Others"].tags.push('#簽名軸');
                        processingOptions["Others"].quantity += qty;
                        isMapped = true;
                      }
                      if (addonName.includes('封蠟印章') || addonId === 'wax_stamp') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                        processingOptions["Others"].tags.push('#客製封蠟印章');
                        processingOptions["Others"].quantity += qty;
                        isMapped = true;
                      }
                      if (addonName.includes('樣品包') || addonId === 'sample') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                        processingOptions["Others"].tags.push('#樣品包');
                        processingOptions["Others"].quantity += qty;
                        isMapped = true;
                      }
                      if (addonName.includes('面紙包') || addonId === 'tissue') {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                        processingOptions["Others"].tags.push('#客製面紙包/100包');
                        processingOptions["Others"].quantity += qty;
                        isMapped = true;
                      }
                      
                      if (addonName.includes('無框畫') || addonId.startsWith('frame')) {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                        if (addonName.includes('小') || addonId === 'frame_s') processingOptions["Others"].tags.push(`#無框畫(小)-33x24cm`);
                        if (addonName.includes('中') || addonId === 'frame_m') processingOptions["Others"].tags.push(`#無框畫(中)-38x45.5cm`);
                        if (addonName.includes('大') || addonId === 'frame_l') processingOptions["Others"].tags.push(`#無框畫(大)-343.5x63.5cm`);
                        processingOptions["Others"].quantity += qty;
                        isMapped = true;
                      }

                      // Fallback mapping for unknown addons
                      if (!isMapped && addonName) {
                        if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                        processingOptions["Others"].tags.push(`#${addonName}`);
                        processingOptions["Others"].quantity = Math.max(processingOptions["Others"].quantity, qty);
                      }
                    }
                  });
                }
                
                if (!hasWaxSeal && data.selectedPackageId && data.selectedPackageId !== 'none') {
                  processingOptions["Sticker"] = { tags: ["#金屬燙金貼紙 With love"], quantity: data.customer?.quantity || 0 };
                }
                
                if (data.coasterQty && data.coasterQty > 0) {
                  if (!processingOptions["Others"]) processingOptions["Others"] = { tags: [], quantity: 0 };
                  processingOptions["Others"].tags.push("#陶瓷杯墊");
                  processingOptions["Others"].quantity += data.coasterQty;
                }
                
                // Certificate
                if (data.certificateId && data.certificateId !== 'none') {
                  let certTags: string[] = [];
                  if (data.certificateId === 'cert_a' || data.certificateId === 'A') certTags = ["#壓克力書約(附木底座)", "#登記用紙本書約x3", "#客制書約夾", "#胡桃木相框"];
                  if (data.certificateId === 'cert_b' || data.certificateId === 'B') certTags = ["#壓克力書約(附木底座)", "#登記用紙本書約x3", "#客制書約夾"];
                  if (data.certificateId === 'cert_c' || data.certificateId === 'C') certTags = ["#登記用紙本書約x3", "#客制書約夾"];
                  if (certTags.length > 0) {
                    processingOptions["MarriageContract"] = { tags: certTags, quantity: 1 };
                  }
                }

                setNewOrderData({
                  ...newOrderData,
                  social_id: quote.ig_handle || '',
                  delivery_date: quote.delivery_date || '',
                  amount: quote.total_amount || 0,
                  invitation_quantity: data.customer?.quantity?.toString() || '',
                  wedding_date: quote.wedding_date || '',
                  email: quote.email || '',
                  receiver_phone: quote.phone || '',
                  receiver_name: quote.customer_name || '',
                  notes: quote.notes || '',
                  processing_options: JSON.stringify(processingOptions)
                });
                setShowCreateOrder(true);
              }} />
            )}

            {dashboardTab === "marketing" && (
              <MarketingExport 
                submissions={submissions} 
                availableTags={Array.from(new Set([
                  ...(settings.recommended_tags ? settings.recommended_tags.split(',').map(t => t.trim()).filter(Boolean) : ['已買書約', '潛在彌月客', 'VIP', '急件', '海外客戶', '需特別注意']),
                  ...submissions.flatMap(sub => {
                    try {
                      return sub.tags ? JSON.parse(sub.tags) : [];
                    } catch(e) {
                      return [];
                    }
                  })
                ]))} 
              />
            )}

            {dashboardTab === "templates" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2">
                      {editingTemplate ? <Edit2 className="w-5 h-5 text-rose-400" /> : <Upload className="w-5 h-5 text-rose-400" />}
                      {editingTemplate ? "編輯樣板" : "上傳新樣板"}
                    </h2>
                    <form onSubmit={handleTemplateSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">樣板名稱</label>
                        <input 
                          required 
                          type="text" 
                          value={uploadName} 
                          onChange={(e) => setUploadName(e.target.value)} 
                          className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" 
                          placeholder="例：浪漫花草款" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">
                          PDF 樣板檔案 {editingTemplate && <span className="text-stone-400 font-normal">(若不更改可留空)</span>}
                        </label>
                        <input 
                          required={!editingTemplate}
                          type="file" 
                          accept=".pdf"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)} 
                          className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 transition-all" 
                        />
                        <p className="text-xs text-stone-500 mt-2">
                          請上傳包含正反面畫布的單一 PDF 檔案（尺寸、出血皆已設定好）。系統會自動在最後方新增一頁純文字資料頁。
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="submit" 
                          disabled={isUploading}
                          className="flex-1 bg-stone-900 hover:bg-stone-800 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isUploading ? "儲存中..." : (editingTemplate ? <><CheckCircle className="w-4 h-4" /> 儲存變更</> : <><Plus className="w-4 h-4" /> 新增樣板</>)}
                        </button>
                        {editingTemplate && (
                          <button 
                            type="button"
                            onClick={cancelEditTemplate}
                            className="px-4 py-2 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
                
                <div className="lg:col-span-2">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
                    <h2 className="text-lg font-medium text-stone-800 mb-4 flex items-center gap-2">
                      <LayoutTemplate className="w-5 h-5 text-rose-400" />
                      現有樣板列表
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {templates.map((template) => (
                        <div key={template.id} className="border border-stone-200 rounded-xl p-4 flex flex-col items-center gap-3 relative group">
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => handleEditTemplateClick(template)} className="p-1.5 bg-white shadow-sm border border-stone-200 text-stone-500 hover:text-blue-500 rounded-md transition-colors" title="編輯">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteTemplate(template.id)} className="p-1.5 bg-white shadow-sm border border-stone-200 text-stone-500 hover:text-red-500 rounded-md transition-colors" title="刪除">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="w-full aspect-[2/3] bg-stone-100 border border-stone-200 rounded-md flex items-center justify-center shadow-sm relative overflow-hidden">
                            {template.filename.endsWith('.pdf') ? (
                              <div className="w-full h-full overflow-hidden flex items-center justify-center">
                                <Document
                                  file={`/templates/${template.filename}`}
                                  loading={<div className="text-xs text-stone-400">載入中...</div>}
                                  error={<div className="text-xs text-rose-400">無法載入</div>}
                                >
                                  <Page 
                                    pageNumber={1} 
                                    width={150} 
                                    renderTextLayer={false} 
                                    renderAnnotationLayer={false} 
                                  />
                                </Document>
                              </div>
                            ) : (
                              <>
                                <img 
                                  src={`/templates/${template.filename}`} 
                                  alt={template.name} 
                                  className="w-full h-full object-cover" 
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    if (target.nextElementSibling) {
                                      target.nextElementSibling.classList.remove('hidden');
                                    }
                                  }} 
                                />
                                <LayoutTemplate className="w-8 h-8 text-stone-400 hidden" />
                              </>
                            )}
                          </div>
                          <div className="text-center w-full">
                            <div className="font-medium text-stone-800 text-sm truncate px-2">{template.name}</div>
                            <div className="text-xs text-stone-500 mt-1 truncate px-2" title={template.filename}>
                              {template.filename}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900">
                    <h3 className="font-medium mb-3 flex items-center gap-2 text-amber-800">
                      <AlertCircle className="w-5 h-5" />
                      PDF 模式說明
                    </h3>
                    <div className="space-y-4 text-sm text-amber-800/90">
                      <p>系統已全面升級為「單一 PDF 模式」，以解決 SVG 替換文字時對位不準確的問題，提供更穩定、精準的印刷工作流：</p>
                      <ul className="list-disc list-inside space-y-2 ml-2">
                        <li><strong>上傳底圖：</strong> 您只需上傳設計好的 PDF 底圖（包含正確的尺寸與出血設定，若有正反面請放在同一個 PDF 檔案的兩個畫布中）。</li>
                        <li><strong>不需設定變數：</strong> 底圖上不需要放置任何 <code>{`{{變數}}`}</code>，您可以留白，或是放上轉外框的假字作為排版參考。</li>
                        <li><strong>完全保留編輯功能：</strong> 系統不會修改您上傳的 PDF，確保您下載時能 100% 保留 Illustrator 的編輯屬性（不會有文字被強制轉外框的問題）。</li>
                        <li><strong>設計師作業：</strong> 點擊「下載底圖 (PDF)」與「下載 TXT」。在 Illustrator 中開啟 PDF 底圖，並從 TXT 檔中複製客戶資料貼上排版。排版完成後即可直接送印。</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {dashboardTab === "shipping" && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <ShippingAssistant />
              </div>
            )}

            {dashboardTab === "labels" && (
              <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <LabelGenerator />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-stone-400 text-sm">
        <div className="flex items-center justify-center gap-4">
          <span>&copy; {new Date().getFullYear()} Mini Style Cards. All rights reserved.</span>
        </div>
      </footer>

      {/* Custom Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-stone-900 mb-2">{modal.title}</h3>
            <p className="text-stone-600 mb-6 whitespace-pre-wrap break-all">{modal.message}</p>
            <div className="flex justify-end gap-3">
              {modal.linkToCopy && (
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(modal.linkToCopy!);
                    // Optional: could show a brief toast here, but for now just copy
                  }} 
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  複製連結
                </button>
              )}
              {modal.type === "confirm" && (
                <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                  取消
                </button>
              )}
              <button 
                onClick={() => {
                  if (modal.type === "confirm" && modal.onConfirm) modal.onConfirm();
                  closeModal();
                }} 
                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Work Order Modal */}
      {printingOrder && (
        <PrintWorkOrderModal 
          order={printingOrder} 
          onClose={() => setPrintingOrder(null)} 
          designers={designers}
        />
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={handleUpdateOrder}
          templates={templates}
          designers={designers}
        />
      )}

      {/* Create Order Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 my-8">
              <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif text-stone-800">新增訂單</h3>
              <button onClick={() => setShowCreateOrder(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-stone-700 mb-2">訂單類型 *</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="order_type" 
                      value="invitation" 
                      checked={newOrderData.order_type === 'invitation'} 
                      onChange={(e) => setNewOrderData(prev => ({ ...prev, order_type: e.target.value, template_id: "" }))}
                      className="text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm text-stone-700">婚卡設計 (含喜帖)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="order_type" 
                      value="peripheral" 
                      checked={newOrderData.order_type === 'peripheral'} 
                      onChange={(e) => setNewOrderData(prev => ({ ...prev, order_type: e.target.value, template_id: "none" }))}
                      className="text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm text-stone-700">僅周邊商品 (無喜帖)</span>
                  </label>
                </div>
              </div>

              {newOrderData.order_type === 'invitation' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-stone-700 mb-2">樣板選擇 *</label>
                  <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                    {templates.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => setNewOrderData(prev => ({ ...prev, template_id: t.id }))}
                        className={`flex-none w-32 cursor-pointer rounded-xl border-2 transition-all snap-start overflow-hidden ${newOrderData.template_id === t.id ? 'border-rose-500 shadow-md' : 'border-stone-200 hover:border-stone-300'}`}
                      >
                        <div className="w-full aspect-[2/3] bg-stone-100 relative pointer-events-none flex items-center justify-center overflow-hidden">
                          {t.filename.endsWith('.pdf') ? (
                            <Document
                              file={`/templates/${t.filename}`}
                              loading={<div className="text-xs text-stone-400">載入中...</div>}
                              error={<div className="text-xs text-rose-400">無法載入</div>}
                            >
                              <Page 
                                pageNumber={1} 
                                width={128} 
                                renderTextLayer={false} 
                                renderAnnotationLayer={false} 
                              />
                            </Document>
                          ) : (
                            <img 
                              src={`/templates/${t.filename}`} 
                              alt={t.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className={`p-2 text-center text-xs font-medium truncate ${newOrderData.template_id === t.id ? 'bg-rose-50 text-rose-700' : 'bg-white text-stone-600'}`}>
                          {t.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!newOrderData.template_id && (
                    <p className="text-xs text-rose-500 mt-1">請選擇一個樣板</p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">指派設計師</label>
                  <select
                    value={newOrderData.designer_id || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, designer_id: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  >
                    <option value="">未指派</option>
                    {designers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">付款日期</label>
                  <input
                    type="date"
                    value={newOrderData.payment_date || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, payment_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">金額</label>
                  <input
                    type="number"
                    value={newOrderData.amount || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">設計完成日</label>
                  <input
                    type="date"
                    value={newOrderData.design_deadline || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, design_deadline: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">最後交件日</label>
                  <input
                    type="date"
                    value={newOrderData.delivery_date || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, delivery_date: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">喜帖數量</label>
                  <input
                    type="text"
                    value={newOrderData.invitation_quantity || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, invitation_quantity: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">聯絡來源</label>
                  <select
                    value={newOrderData.contact_source || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, contact_source: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  >
                    <option value="">請選擇聯絡來源</option>
                    <option value="FB">FB</option>
                    <option value="IG">IG</option>
                    <option value="Line">Line</option>
                    <option value="官網">官網</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">社群帳號</label>
                  <input
                    type="text"
                    value={newOrderData.social_id || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, social_id: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1">備註</label>
                  <textarea
                    value={newOrderData.notes || ""}
                    onChange={(e) => setNewOrderData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all resize-none"
                    placeholder="訂單備註事項..."
                  />
                </div>
              </div>
              
              <div className="border-t border-stone-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-stone-800 mb-3">加工選項 (選填)</h4>
                <div className="space-y-4">
                  {Object.entries(processingOptionLabels).map(([key, label]) => {
                    const currentOptions = newOrderData.processing_options ? JSON.parse(newOrderData.processing_options) : {};
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
                                    setNewOrderData(prev => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
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
                                list={`datalist-${key}`}
                                placeholder="+ Tag"
                                className="w-full bg-transparent text-sm text-stone-600 outline-none placeholder:text-stone-400"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = e.currentTarget.value.trim();
                                    if (val && !currentTags.includes(val)) {
                                      const newTags = [...currentTags, val];
                                      const newOptions = { ...currentOptions, [key]: { tags: newTags, quantity: currentQuantity } };
                                      setNewOrderData(prev => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
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
                                      setNewOrderData(prev => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
                                    }
                                    e.target.value = '';
                                  }
                                }}
                              />
                              <datalist id={`datalist-${key}`}>
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
                              setNewOrderData(prev => ({ ...prev, processing_options: JSON.stringify(newOptions) }));
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

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-stone-200">
                <button type="button" onClick={() => setShowCreateOrder(false)} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                  取消
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors">
                  建立訂單並產生連結
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}

      {/* Add Designer Modal */}
      {showAddDesigner && currentUser?.role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif text-stone-800">管理設計師帳號</h3>
              <button onClick={() => { setShowAddDesigner(false); setEditingDesignerId(null); }} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-8">
              <h4 className="text-sm font-medium text-stone-500 mb-3 uppercase tracking-wider">現有設計師</h4>
              <div className="space-y-3">
                {designers.map(designer => (
                  <div key={designer.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                    {editingDesignerId === designer.id ? (
                      <div className="flex-1 flex items-center gap-3">
                        <input
                          type="text"
                          value={editDesignerData.name}
                          onChange={(e) => setEditDesignerData(prev => ({ ...prev, name: e.target.value }))}
                          className="px-3 py-1.5 text-sm border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-500 outline-none w-32"
                          placeholder="顯示名稱"
                        />
                        <input
                          type="password"
                          value={editDesignerData.password}
                          onChange={(e) => setEditDesignerData(prev => ({ ...prev, password: e.target.value }))}
                          className="px-3 py-1.5 text-sm border border-stone-300 rounded-md focus:ring-2 focus:ring-rose-500 outline-none w-40"
                          placeholder="新密碼 (不改請留白)"
                        />
                        <button
                          onClick={() => {
                            handleUpdateDesigner(designer.id, editDesignerData.name, editDesignerData.password);
                            setEditingDesignerId(null);
                          }}
                          className="px-3 py-1.5 text-sm bg-stone-900 text-white rounded-md hover:bg-stone-800"
                        >
                          儲存
                        </button>
                        <button
                          onClick={() => setEditingDesignerId(null)}
                          className="px-3 py-1.5 text-sm bg-stone-200 text-stone-700 rounded-md hover:bg-stone-300"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="font-medium text-stone-800">{designer.name}</div>
                          <div className="text-xs text-stone-500">@{designer.username}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingDesignerId(designer.id);
                              setEditDesignerData({ name: designer.name, password: "" });
                            }}
                            className="p-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-200 rounded-md transition-colors"
                            title="編輯"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDesigner(designer.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-md transition-colors"
                            title="刪除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {designers.length === 0 && (
                  <div className="text-sm text-stone-500 italic p-3 text-center bg-stone-50 rounded-lg border border-stone-200">
                    目前沒有設計師帳號
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-stone-200">
              <h4 className="text-sm font-medium text-stone-500 mb-4 uppercase tracking-wider">新增設計師</h4>
              <form onSubmit={handleAddDesigner} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">顯示名稱</label>
                    <input 
                      required 
                      type="text" 
                      value={newDesigner.name} 
                      onChange={(e) => setNewDesigner(prev => ({ ...prev, name: e.target.value }))} 
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" 
                      placeholder="例如：Leo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">登入帳號</label>
                    <input 
                      required 
                      type="text" 
                      value={newDesigner.username} 
                      onChange={(e) => setNewDesigner(prev => ({ ...prev, username: e.target.value }))} 
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" 
                      placeholder="例如：leo_design"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">登入密碼</label>
                    <input 
                      required 
                      type="password" 
                      value={newDesigner.password} 
                      onChange={(e) => setNewDesigner(prev => ({ ...prev, password: e.target.value }))} 
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all" 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => { setShowAddDesigner(false); setEditingDesignerId(null); }} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">
                    關閉
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors">
                    新增帳號
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
