import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Filter, Plus, X } from 'lucide-react';
import { WeddingData } from '../App';

interface MarketingExportProps {
  submissions: WeddingData[];
  availableTags: string[];
}

export default function MarketingExport({ submissions, availableTags }: MarketingExportProps) {
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);
  const [dateFilterType, setDateFilterType] = useState<'none' | 'future_more_than' | 'future_less_than' | 'past_more_than' | 'past_less_than'>('none');
  const [daysOffset, setDaysOffset] = useState<number>(30);
  const [excludeSentWithin7Days, setExcludeSentWithin7Days] = useState(true);
  const [excludeSentMoreThan3Times30Days, setExcludeSentMoreThan3Times30Days] = useState(true);
  const [excludeUnsubscribed, setExcludeUnsubscribed] = useState(true);
  
  const handleExport = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const filtered = submissions.filter(sub => {
      // Marketing filters
      if (excludeUnsubscribed && sub.unsubscribed === 1) return false;
      
      if (excludeSentWithin7Days && sub.last_marketing_sent_at) {
        const lastSent = new Date(sub.last_marketing_sent_at);
        const diffDays = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays <= 7) return false;
      }

      if (excludeSentMoreThan3Times30Days && sub.marketing_count_30d && sub.marketing_count_30d >= 3) {
        return false;
      }

      let tags: string[] = [];
      try {
        tags = sub.tags ? JSON.parse(sub.tags) : [];
      } catch (e) {}

      // Tag Union (Include any)
      if (includeTags.length > 0) {
        const hasIncluded = includeTags.some(tag => tags.includes(tag));
        if (!hasIncluded) return false;
      }

      // Tag Exclusion (Exclude any)
      if (excludeTags.length > 0) {
        const hasExcluded = excludeTags.some(tag => tags.includes(tag));
        if (hasExcluded) return false;
      }

      // Time Filtering
      if (dateFilterType !== 'none') {
        if (!sub.wedding_date) return false; // If no wedding date, exclude it when time filter is active

        const weddingDate = new Date(sub.wedding_date);
        const diffTime = weddingDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Positive means future, negative means past

        if (dateFilterType === 'future_more_than') {
          if (diffDays <= daysOffset) return false;
        } else if (dateFilterType === 'future_less_than') {
          if (diffDays < 0 || diffDays >= daysOffset) return false;
        } else if (dateFilterType === 'past_more_than') {
          if (diffDays > -daysOffset) return false;
        } else if (dateFilterType === 'past_less_than') {
          if (diffDays > 0 || diffDays <= -daysOffset) return false;
        }
      }

      return true;
    });

    const exportData = filtered.map(sub => {
      let tags: string[] = [];
      try {
        tags = sub.tags ? JSON.parse(sub.tags) : [];
      } catch (e) {}

      return {
        '訂單編號': sub.order_code || '',
        '訂單類型': sub.order_type === 'peripheral' ? '周邊商品' : '婚卡設計',
        '收件人姓名': sub.receiver_name || '',
        '電話': sub.receiver_phone || '',
        'Email': sub.email || '',
        '地址': sub.receiver_address || '',
        '新郎姓名': sub.groom_name_zh || '',
        '新娘姓名': sub.bride_name_zh || '',
        '婚宴日期': sub.wedding_date || '',
        '標籤': tags.join(', '),
        '聯絡來源': sub.contact_source || '',
        '社群帳號': sub.social_id || '',
        '金額': sub.amount || 0,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "行銷名單");
    XLSX.writeFile(wb, `行銷名單_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleTag = (tag: string, listType: 'include' | 'exclude') => {
    if (listType === 'include') {
      setIncludeTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
      setExcludeTags(prev => prev.filter(t => t !== tag));
    } else {
      setExcludeTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
      setIncludeTags(prev => prev.filter(t => t !== tag));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-stone-800 flex items-center gap-2">
          <Filter className="w-5 h-5 text-rose-400" />
          行銷名單篩選與匯出
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          匯出 Excel
        </button>
      </div>

      <div className="space-y-6">
        {/* Include Tags */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">包含標籤 (聯集：符合任一即可)</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={`inc-${tag}`}
                onClick={() => toggleTag(tag, 'include')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  includeTags.includes(tag)
                    ? 'bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {tag}
                {includeTags.includes(tag) && <X className="w-3 h-3 inline-block ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Exclude Tags */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">排除標籤 (排除：符合任一即排除)</label>
          <div className="flex flex-wrap gap-2">
            {availableTags.map(tag => (
              <button
                key={`exc-${tag}`}
                onClick={() => toggleTag(tag, 'exclude')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  excludeTags.includes(tag)
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {tag}
                {excludeTags.includes(tag) && <X className="w-3 h-3 inline-block ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Marketing Filters */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">行銷信件發送限制 (避免過度打擾客戶)</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={excludeSentWithin7Days} 
                onChange={(e) => setExcludeSentWithin7Days(e.target.checked)}
                className="text-rose-500 focus:ring-rose-500 rounded"
              />
              <span className="text-sm text-stone-600">排除 7 天內已寄送過行銷信件的客戶</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={excludeSentMoreThan3Times30Days} 
                onChange={(e) => setExcludeSentMoreThan3Times30Days(e.target.checked)}
                className="text-rose-500 focus:ring-rose-500 rounded"
              />
              <span className="text-sm text-stone-600">排除 30 天內已寄送超過 3 封行銷信件的客戶</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={excludeUnsubscribed} 
                onChange={(e) => setExcludeUnsubscribed(e.target.checked)}
                className="text-rose-500 focus:ring-rose-500 rounded"
              />
              <span className="text-sm text-stone-600">排除已退訂的客戶</span>
            </label>
          </div>
        </div>

        {/* Date Filter */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">婚期時間篩選</label>
          <div className="flex items-center gap-4">
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-sm"
            >
              <option value="none">不篩選時間</option>
              <option value="future_more_than">距離婚期大於 X 天 (未來)</option>
              <option value="future_less_than">距離婚期小於 X 天 (未來)</option>
              <option value="past_more_than">婚期已過大於 X 天 (過去)</option>
              <option value="past_less_than">婚期已過小於 X 天 (過去)</option>
            </select>
            
            {dateFilterType !== 'none' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={daysOffset}
                  onChange={(e) => setDaysOffset(Number(e.target.value))}
                  className="w-20 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-sm"
                  min="0"
                />
                <span className="text-sm text-stone-600">天</span>
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-2">
            {dateFilterType === 'future_more_than' && `篩選條件：婚期在距離今天 ${daysOffset} 天之後的客戶 (例如：還有很久才結婚)`}
            {dateFilterType === 'future_less_than' && `篩選條件：婚期在距離今天 ${daysOffset} 天之內的客戶 (例如：快要結婚了)`}
            {dateFilterType === 'past_more_than' && `篩選條件：婚期已經過去超過 ${daysOffset} 天的客戶 (例如：結完婚很久了，適合彌月行銷)`}
            {dateFilterType === 'past_less_than' && `篩選條件：婚期已經過去，但在 ${daysOffset} 天之內的客戶 (例如：剛結完婚)`}
          </p>
        </div>
      </div>
    </div>
  );
}
