import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { WeddingData, DesignerData } from '../App';

interface Expense {
  id?: number;
  expense_date: string;
  item_name: string;
  amount: number;
  category: string;
  notes: string;
}

interface Income {
  id?: number;
  income_date: string;
  item_name: string;
  amount: number;
  tax: number;
  bank_last_5: string;
  notes: string;
  invoice_number?: string;
}

interface FinancialReportProps {
  token: string;
  designers: DesignerData[];
  showAlert: (title: string, message: string) => void;
}

export default function FinancialReport({ token, designers, showAlert }: FinancialReportProps) {
  const [activeTab, setActiveTab] = useState<'income' | 'expense' | 'summary' | 'yearly'>('summary');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [weddings, setWeddings] = useState<WeddingData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing states
  const [editingWeddingId, setEditingWeddingId] = useState<number | null>(null);
  const [editWeddingData, setEditWeddingData] = useState<Partial<WeddingData>>({});

  const [editingExpenseId, setEditingExpenseId] = useState<number | null | 'new'>(null);
  const [editExpenseData, setEditExpenseData] = useState<Partial<Expense>>({});

  const [editingIncomeId, setEditingIncomeId] = useState<number | null | 'new'>(null);
  const [editIncomeData, setEditIncomeData] = useState<Partial<Income>>({});

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [weddingsRes, expensesRes, incomesRes] = await Promise.all([
        fetch('/api/weddings', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/expenses', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/incomes', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (weddingsRes.ok) {
        setWeddings(await weddingsRes.json());
      }
      if (expensesRes.ok) {
        setExpenses(await expensesRes.json());
      }
      if (incomesRes.ok) {
        setIncomes(await incomesRes.json());
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      showAlert("錯誤", "無法載入財務資料");
    } finally {
      setLoading(false);
    }
  };

  // Filter data by selected month
  const filteredWeddings = weddings.filter(w => {
    const dateStr = w.payment_date || w.created_at || "";
    return dateStr.startsWith(selectedMonth);
  });

  const filteredExpenses = expenses.filter(e => {
    return e.expense_date.startsWith(selectedMonth);
  });

  const filteredIncomes = incomes.filter(i => {
    return i.income_date.startsWith(selectedMonth);
  });

  const getWeddingTax = (w: WeddingData) => w.tax != null ? Number(w.tax) : Math.round((Number(w.amount) || 0) * 0.05);

  // Calculations
  const weddingsIncome = filteredWeddings.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const manualIncome = filteredIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalIncome = weddingsIncome + manualIncome;

  const weddingsTax = filteredWeddings.reduce((sum, w) => sum + getWeddingTax(w), 0);
  const manualTax = filteredIncomes.reduce((sum, i) => sum + (Number(i.tax) || 0), 0);
  const totalTax = weddingsTax + manualTax;

  const netIncome = totalIncome - totalTax;

  const totalExpense = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = netIncome - totalExpense;

  const expensesByCategory = filteredExpenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0);
    return acc;
  }, {} as Record<string, number>);

  // Handlers for Weddings (Income)
  const handleSaveWedding = async (id: number) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editWeddingData)
      });
      if (res.ok) {
        setWeddings(weddings.map(w => w.id === id ? { ...w, ...editWeddingData } : w));
        setEditingWeddingId(null);
        showAlert("成功", "已更新訂單財務資訊");
      } else {
        showAlert("錯誤", "更新失敗");
      }
    } catch (error) {
      showAlert("錯誤", "更新失敗");
    }
  };

  // Handlers for Expenses
  const handleSaveExpense = async () => {
    try {
      const isNew = editingExpenseId === 'new';
      const url = isNew ? '/api/expenses' : `/api/expenses/${editingExpenseId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editExpenseData)
      });

      if (res.ok) {
        if (isNew) {
          const data = await res.json();
          setExpenses([{ ...editExpenseData, id: data.id } as Expense, ...expenses]);
        } else {
          setExpenses(expenses.map(e => e.id === editingExpenseId ? { ...e, ...editExpenseData } as Expense : e));
        }
        setEditingExpenseId(null);
        showAlert("成功", "已儲存支出紀錄");
      } else {
        showAlert("錯誤", "儲存失敗");
      }
    } catch (error) {
      showAlert("錯誤", "儲存失敗");
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm("確定要刪除此支出紀錄嗎？")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setExpenses(expenses.filter(e => e.id !== id));
        showAlert("成功", "已刪除支出紀錄");
      } else {
        showAlert("錯誤", "刪除失敗");
      }
    } catch (error) {
      showAlert("錯誤", "刪除失敗");
    }
  };

  // Handlers for Incomes
  const handleSaveIncome = async () => {
    try {
      const isNew = editingIncomeId === 'new';
      const url = isNew ? '/api/incomes' : `/api/incomes/${editingIncomeId}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editIncomeData)
      });

      if (res.ok) {
        if (isNew) {
          const data = await res.json();
          setIncomes([{ ...editIncomeData, id: data.id } as Income, ...incomes]);
        } else {
          setIncomes(incomes.map(i => i.id === editingIncomeId ? { ...i, ...editIncomeData } as Income : i));
        }
        setEditingIncomeId(null);
        showAlert("成功", "已儲存收入紀錄");
      } else {
        showAlert("錯誤", "儲存失敗");
      }
    } catch (error) {
      showAlert("錯誤", "儲存失敗");
    }
  };

  const handleDeleteIncome = async (id: number) => {
    if (!window.confirm("確定要刪除此收入紀錄嗎？")) return;
    try {
      const res = await fetch(`/api/incomes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIncomes(incomes.filter(i => i.id !== id));
        showAlert("成功", "已刪除收入紀錄");
      } else {
        showAlert("錯誤", "刪除失敗");
      }
    } catch (error) {
      showAlert("錯誤", "刪除失敗");
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-stone-500">載入中...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-serif text-stone-800">財務報表</h2>
        <div className="flex items-center gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-stone-300 rounded-lg focus:ring-rose-500 focus:border-rose-500 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-100 bg-stone-50/50">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'summary' ? 'text-rose-600 border-b-2 border-rose-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}
        >
          損益表 (建議)
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'income' ? 'text-rose-600 border-b-2 border-rose-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}
        >
          收支表 (訂單收入)
        </button>
        <button
          onClick={() => setActiveTab('expense')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'expense' ? 'text-rose-600 border-b-2 border-rose-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}
        >
          支出表
        </button>
        <button
          onClick={() => setActiveTab('yearly')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'yearly' ? 'text-rose-600 border-b-2 border-rose-500 bg-white' : 'text-stone-500 hover:text-stone-700'}`}
        >
          年度報表
        </button>
      </div>

      <div className="p-6">
        {/* Summary Tab */}
        {activeTab === 'summary' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-stone-50 rounded-xl p-6 border border-stone-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="font-medium text-stone-700">本月總收入</h3>
                </div>
                <div className="text-3xl font-bold text-stone-900">${totalIncome.toLocaleString()}</div>
                <div className="text-sm text-stone-500 mt-1">稅金: ${totalTax.toLocaleString()}</div>
              </div>

              <div className="bg-stone-50 rounded-xl p-6 border border-stone-100">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <h3 className="font-medium text-stone-700">本月總支出</h3>
                </div>
                <div className="text-3xl font-bold text-stone-900">${totalExpense.toLocaleString()}</div>
              </div>

              <div className={`rounded-xl p-6 border ${netProfit >= 0 ? 'bg-rose-50 border-rose-100' : 'bg-stone-50 border-stone-200'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-rose-100 text-rose-600' : 'bg-stone-200 text-stone-600'}`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="font-medium text-stone-700">本月淨利</h3>
                </div>
                <div className={`text-3xl font-bold ${netProfit >= 0 ? 'text-rose-600' : 'text-stone-600'}`}>
                  ${netProfit.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-stone-800 mb-4 border-b border-stone-200 pb-2">損益表 (Income Statement)</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-stone-100">
                    <span className="text-stone-600">營業收入 (Sales Revenue)</span>
                    <span className="font-medium">${totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-stone-100">
                    <span className="text-stone-600">減：稅金 (Taxes)</span>
                    <span className="font-medium text-red-500">-${totalTax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-stone-200 font-medium">
                    <span className="text-stone-800">淨收入 (Net Revenue)</span>
                    <span>${netIncome.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-2">
                    <span className="text-stone-600 font-medium">營業費用 (Operating Expenses)</span>
                    <div className="pl-4 mt-2 space-y-2">
                      {Object.entries(expensesByCategory).map(([cat, amt]) => (
                        <div key={cat} className="flex justify-between py-1 text-stone-500">
                          <span>{cat}</span>
                          <span>${amt.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between py-2 border-b border-stone-200 font-medium">
                    <span className="text-stone-800">總費用 (Total Expenses)</span>
                    <span className="text-red-500">-${totalExpense.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between py-3 font-bold text-base">
                    <span className="text-stone-900">本期淨利 (Net Income)</span>
                    <span className={netProfit >= 0 ? 'text-rose-600' : 'text-red-600'}>${netProfit.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-stone-800 mb-4 border-b border-stone-200 pb-2">財務報表建議</h3>
                <div className="prose prose-sm text-stone-600">
                  <p>基於目前的收支紀錄與您提供的固定支出，為您提供以下財務報表建議：</p>
                  <ul>
                    <li className="mb-2"><strong>損益表 (Income Statement)：</strong>如左側所示，可清楚看出本月的獲利狀況。您的固定支出（如：房租 47,000、薪資含勞健保約 242,400、Adobe 6,760、水電瓦斯 5,000、AWS 2,500、管理費 2,350、雜支 20,000）皆屬於「營業費用」。建議在支出表中正確分類，以利準確計算每月淨利。</li>
                    <li className="mb-2"><strong>現金流量表 (Cash Flow)：</strong>目前系統以「匯款日期」與「支出日期」為基準，已具備「營業活動現金流」的雛形。特別注意：您的**貸款還款（每月 53,500）**屬於「籌資活動現金流出」，它會減少您的現金，但其中只有「利息」部分能列入損益表的費用，本金還款不影響淨利。</li>
                    <li><strong>資產負債表 (Balance Sheet)：</strong>若需產出完整的資產負債表，未來需進一步記錄「銀行存款餘額」、「應收帳款（未付款訂單）」、「存貨價值」及「應付帳款」。您償還貸款本金的動作，會同時減少資產（現金）與負債（銀行借款）。</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Income Tab */}
        {activeTab === 'income' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => {
                  const headers = ['訂單編號', '社群帳號', '指派設計師', '匯款日期', '訂單金額', '稅金', '匯款後五碼', '發票號碼'];
                  const rows = filteredWeddings.map(w => {
                    const designerName = designers.find(d => d.id === w.designer_id)?.name || '-';
                    return [
                      `#${w.id}`,
                      w.social_id || '-',
                      designerName,
                      w.payment_date || '-',
                      w.amount || 0,
                      getWeddingTax(w),
                      w.bank_last_5 || '-',
                      w.invoice_number || '-'
                    ].join(',');
                  });
                  
                  rows.push(['訂單小計', '', '', '', weddingsIncome, weddingsTax, '', ''].join(','));
                  
                  // Add other incomes to CSV
                  if (filteredIncomes.length > 0) {
                    rows.push(''); // Empty line separator
                    rows.push(['其他收入'].join(','));
                    rows.push(['日期', '項目名稱', '金額', '稅金', '匯款後五碼', '備註'].join(','));
                    filteredIncomes.forEach(i => {
                      rows.push([
                        i.income_date,
                        i.item_name,
                        i.amount,
                        i.tax,
                        i.bank_last_5 || '-',
                        i.notes || '-'
                      ].join(','));
                    });
                    rows.push(['其他收入小計', '', manualIncome, manualTax, '', ''].join(','));
                  }

                  rows.push(''); // Empty line separator
                  rows.push(['本月總計', '', '', '', totalIncome, totalTax, ''].join(','));

                  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `收支表_${selectedMonth}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors border border-stone-200"
              >
                <Download className="w-4 h-4" />
                匯出 Excel (CSV)
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm">訂單編號</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm">社群帳號</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm">指派設計師</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm">匯款日期</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">訂單金額</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">稅金</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm">匯款後五碼</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm">發票號碼</th>
                  <th className="py-3 px-4 font-medium text-stone-600 text-sm text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredWeddings.map(w => {
                  const isEditing = editingWeddingId === w.id;
                  const designerName = designers.find(d => d.id === w.designer_id)?.name || '-';

                  return (
                    <tr key={w.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 text-sm font-medium text-stone-800">#{w.id}</td>
                      <td className="py-3 px-4 text-sm text-stone-600">{w.social_id || '-'}</td>
                      <td className="py-3 px-4 text-sm text-stone-600">{designerName}</td>
                      
                      <td className="py-3 px-4 text-sm">
                        {isEditing ? (
                          <input 
                            type="date" 
                            value={editWeddingData.payment_date || ''} 
                            onChange={e => setEditWeddingData({...editWeddingData, payment_date: e.target.value})}
                            className="w-full border-stone-300 rounded px-2 py-1 text-sm"
                          />
                        ) : (w.payment_date || '-')}
                      </td>
                      
                      <td className="py-3 px-4 text-sm text-right">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editWeddingData.amount || ''} 
                            onChange={e => {
                              const val = Number(e.target.value);
                              setEditWeddingData({
                                ...editWeddingData, 
                                amount: val,
                                tax: Math.round(val * 0.05) // 自動計算 5% 稅金
                              });
                            }}
                            className="w-24 border-stone-300 rounded px-2 py-1 text-sm text-right"
                          />
                        ) : (`$${w.amount || 0}`)}
                      </td>

                      <td className="py-3 px-4 text-sm text-right">
                        {isEditing ? (
                          <input 
                            type="number" 
                            value={editWeddingData.tax || ''} 
                            onChange={e => setEditWeddingData({...editWeddingData, tax: Number(e.target.value)})}
                            className="w-20 border-stone-300 rounded px-2 py-1 text-sm text-right"
                          />
                        ) : (`$${getWeddingTax(w)}`)}
                      </td>

                      <td className="py-3 px-4 text-sm">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editWeddingData.bank_last_5 || ''} 
                            onChange={e => setEditWeddingData({...editWeddingData, bank_last_5: e.target.value})}
                            className="w-24 border-stone-300 rounded px-2 py-1 text-sm"
                            placeholder="後五碼"
                          />
                        ) : (w.bank_last_5 || '-')}
                      </td>

                      <td className="py-3 px-4 text-sm">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editWeddingData.invoice_number || ''} 
                            onChange={e => setEditWeddingData({...editWeddingData, invoice_number: e.target.value})}
                            className="w-32 border-stone-300 rounded px-2 py-1 text-sm"
                            placeholder="發票號碼"
                          />
                        ) : (w.invoice_number || '-')}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleSaveWedding(w.id!)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingWeddingId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingWeddingId(w.id!);
                              setEditWeddingData({
                                payment_date: w.payment_date,
                                amount: w.amount,
                                tax: getWeddingTax(w),
                                bank_last_5: w.bank_last_5,
                                invoice_number: w.invoice_number
                              });
                            }} 
                            className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredWeddings.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-stone-500">此月份無訂單收入紀錄</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Other Incomes Table */}
          <div className="mt-8 flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-stone-800">其他收入 (追加數量、補尾款等)</h3>
            <button
              onClick={() => {
                setEditingIncomeId('new');
                setEditIncomeData({ income_date: selectedMonth + '-01', item_name: '', amount: 0, tax: 0, bank_last_5: '', notes: '', invoice_number: '' });
              }}
              className="inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增其他收入
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="py-3 px-4 text-sm font-medium text-stone-500">日期</th>
                  <th className="py-3 px-4 text-sm font-medium text-stone-500">項目名稱</th>
                  <th className="py-3 px-4 text-sm font-medium text-stone-500 text-right">金額</th>
                  <th className="py-3 px-4 text-sm font-medium text-stone-500 text-right">稅金 (5%)</th>
                  <th className="py-3 px-4 text-sm font-medium text-stone-500">匯款後五碼</th>
                  <th className="py-3 px-4 text-sm font-medium text-stone-500">發票號碼</th>
                  <th className="py-3 px-4 text-sm font-medium text-stone-500">備註</th>
                  <th className="py-3 px-4 text-sm font-medium text-stone-500 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {editingIncomeId === 'new' && (
                  <tr className="bg-rose-50/30">
                    <td className="py-3 px-4 text-sm">
                      <input type="date" value={editIncomeData.income_date || ''} onChange={e => setEditIncomeData({...editIncomeData, income_date: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <input type="text" value={editIncomeData.item_name || ''} onChange={e => setEditIncomeData({...editIncomeData, item_name: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" placeholder="例如：追加數量" />
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <input type="number" value={editIncomeData.amount || ''} onChange={e => {
                        const amount = Number(e.target.value);
                        setEditIncomeData({...editIncomeData, amount, tax: Math.round(amount * 0.05)});
                      }} className="w-24 border-stone-300 rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <input type="number" value={editIncomeData.tax || ''} onChange={e => setEditIncomeData({...editIncomeData, tax: Number(e.target.value)})} className="w-20 border-stone-300 rounded px-2 py-1 text-sm text-right" />
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <input type="text" value={editIncomeData.bank_last_5 || ''} onChange={e => setEditIncomeData({...editIncomeData, bank_last_5: e.target.value})} className="w-24 border-stone-300 rounded px-2 py-1 text-sm" maxLength={5} />
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <input type="text" value={editIncomeData.invoice_number || ''} onChange={e => setEditIncomeData({...editIncomeData, invoice_number: e.target.value})} className="w-32 border-stone-300 rounded px-2 py-1 text-sm" placeholder="發票號碼" />
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <input type="text" value={editIncomeData.notes || ''} onChange={e => setEditIncomeData({...editIncomeData, notes: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={handleSaveIncome} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingIncomeId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredIncomes.map(i => {
                  const isEditing = editingIncomeId === i.id;
                  return (
                    <tr key={i.id} className="hover:bg-stone-50/50">
                      <td className="py-3 px-4 text-sm">
                        {isEditing ? (
                          <input type="date" value={editIncomeData.income_date || ''} onChange={e => setEditIncomeData({...editIncomeData, income_date: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                        ) : i.income_date}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-stone-800">
                        {isEditing ? (
                          <input type="text" value={editIncomeData.item_name || ''} onChange={e => setEditIncomeData({...editIncomeData, item_name: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                        ) : i.item_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {isEditing ? (
                          <input type="number" value={editIncomeData.amount || ''} onChange={e => {
                            const amount = Number(e.target.value);
                            setEditIncomeData({...editIncomeData, amount, tax: Math.round(amount * 0.05)});
                          }} className="w-24 border-stone-300 rounded px-2 py-1 text-sm text-right" />
                        ) : `$${i.amount}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        {isEditing ? (
                          <input type="number" value={editIncomeData.tax || ''} onChange={e => setEditIncomeData({...editIncomeData, tax: Number(e.target.value)})} className="w-20 border-stone-300 rounded px-2 py-1 text-sm text-right" />
                        ) : `$${i.tax}`}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {isEditing ? (
                          <input type="text" value={editIncomeData.bank_last_5 || ''} onChange={e => setEditIncomeData({...editIncomeData, bank_last_5: e.target.value})} className="w-24 border-stone-300 rounded px-2 py-1 text-sm" maxLength={5} />
                        ) : (i.bank_last_5 || '-')}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {isEditing ? (
                          <input type="text" value={editIncomeData.invoice_number || ''} onChange={e => setEditIncomeData({...editIncomeData, invoice_number: e.target.value})} className="w-32 border-stone-300 rounded px-2 py-1 text-sm" placeholder="發票號碼" />
                        ) : (i.invoice_number || '-')}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-500">
                        {isEditing ? (
                          <input type="text" value={editIncomeData.notes || ''} onChange={e => setEditIncomeData({...editIncomeData, notes: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                        ) : i.notes}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={handleSaveIncome} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingIncomeId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setEditingIncomeId(i.id!); setEditIncomeData(i); }} className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteIncome(i.id!)} className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredIncomes.length === 0 && editingIncomeId !== 'new' && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-500">此月份無其他收入紀錄</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Expense Tab */}
        {activeTab === 'expense' && (
          <div>
            <div className="mb-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  const headers = ['支出日期', '類別', '支出項目', '金額', '備註'];
                  const rows = filteredExpenses.map(e => [
                    e.expense_date,
                    e.category || '-',
                    e.item_name,
                    e.amount,
                    e.notes || '-'
                  ].join(','));
                  
                  rows.push('');
                  rows.push(['本月總計', '', '', totalExpense, ''].join(','));

                  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `支出表_${selectedMonth}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors border border-stone-200"
              >
                <Download className="w-4 h-4" />
                匯出 Excel (CSV)
              </button>
              <button
                onClick={() => {
                  setEditingExpenseId('new');
                  setEditExpenseData({
                    expense_date: `${selectedMonth}-01`,
                    item_name: '',
                    amount: 0,
                    category: '固定支出',
                    notes: ''
                  });
                }}
                className="inline-flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                新增支出
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm">支出日期</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm">類別</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm">支出項目</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">金額</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm">備註</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {editingExpenseId === 'new' && (
                    <tr className="bg-rose-50/30">
                      <td className="py-3 px-4">
                        <input type="date" value={editExpenseData.expense_date || ''} onChange={e => setEditExpenseData({...editExpenseData, expense_date: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                      </td>
                      <td className="py-3 px-4">
                        <select value={editExpenseData.category || ''} onChange={e => setEditExpenseData({...editExpenseData, category: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm">
                          <option value="租金">租金</option>
                          <option value="薪資與勞健保">薪資與勞健保</option>
                          <option value="貸款">貸款</option>
                          <option value="軟體與網路">軟體與網路</option>
                          <option value="水電瓦斯電信">水電瓦斯電信</option>
                          <option value="管理費">管理費</option>
                          <option value="貨款">貨款</option>
                          <option value="行銷費用">行銷費用</option>
                          <option value="雜支">雜支</option>
                          <option value="固定支出">固定支出</option>
                          <option value="變動支出">變動支出</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <input type="text" value={editExpenseData.item_name || ''} onChange={e => setEditExpenseData({...editExpenseData, item_name: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" placeholder="項目名稱" />
                      </td>
                      <td className="py-3 px-4">
                        <input type="number" value={editExpenseData.amount || ''} onChange={e => setEditExpenseData({...editExpenseData, amount: Number(e.target.value)})} className="w-24 border-stone-300 rounded px-2 py-1 text-sm text-right" />
                      </td>
                      <td className="py-3 px-4">
                        <input type="text" value={editExpenseData.notes || ''} onChange={e => setEditExpenseData({...editExpenseData, notes: e.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" placeholder="備註" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={handleSaveExpense} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingExpenseId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredExpenses.map(e => {
                    const isEditing = editingExpenseId === e.id;
                    return (
                      <tr key={e.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 text-sm">
                          {isEditing ? (
                            <input type="date" value={editExpenseData.expense_date || ''} onChange={ev => setEditExpenseData({...editExpenseData, expense_date: ev.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                          ) : e.expense_date}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {isEditing ? (
                            <select value={editExpenseData.category || ''} onChange={ev => setEditExpenseData({...editExpenseData, category: ev.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm">
                              <option value="租金">租金</option>
                              <option value="薪資與勞健保">薪資與勞健保</option>
                              <option value="貸款">貸款</option>
                              <option value="軟體與網路">軟體與網路</option>
                              <option value="水電瓦斯電信">水電瓦斯電信</option>
                              <option value="管理費">管理費</option>
                              <option value="貨款">貨款</option>
                              <option value="行銷費用">行銷費用</option>
                              <option value="雜支">雜支</option>
                              <option value="固定支出">固定支出</option>
                              <option value="變動支出">變動支出</option>
                            </select>
                          ) : (
                            <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs">{e.category}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-stone-800">
                          {isEditing ? (
                            <input type="text" value={editExpenseData.item_name || ''} onChange={ev => setEditExpenseData({...editExpenseData, item_name: ev.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                          ) : e.item_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          {isEditing ? (
                            <input type="number" value={editExpenseData.amount || ''} onChange={ev => setEditExpenseData({...editExpenseData, amount: Number(ev.target.value)})} className="w-24 border-stone-300 rounded px-2 py-1 text-sm text-right" />
                          ) : `$${e.amount}`}
                        </td>
                        <td className="py-3 px-4 text-sm text-stone-500">
                          {isEditing ? (
                            <input type="text" value={editExpenseData.notes || ''} onChange={ev => setEditExpenseData({...editExpenseData, notes: ev.target.value})} className="w-full border-stone-300 rounded px-2 py-1 text-sm" />
                          ) : e.notes}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={handleSaveExpense} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                              <button onClick={() => setEditingExpenseId(null)} className="p-1 text-stone-400 hover:bg-stone-100 rounded"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingExpenseId(e.id!);
                                  setEditExpenseData(e);
                                }} 
                                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(e.id!)}
                                className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredExpenses.length === 0 && editingExpenseId !== 'new' && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500">此月份無支出紀錄</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Yearly Tab */}
        {activeTab === 'yearly' && (() => {
          const year = selectedMonth.split('-')[0];
          const yearlyWeddings = weddings.filter(w => (w.payment_date || w.created_at || "").startsWith(year));
          const yearlyExpenses = expenses.filter(e => e.expense_date.startsWith(year));
          const yearlyIncomes = incomes.filter(i => i.income_date.startsWith(year));
          
          const yearlyIncome = yearlyWeddings.reduce((sum, w) => sum + (Number(w.amount) || 0), 0) + yearlyIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          const yearlyTax = yearlyWeddings.reduce((sum, w) => sum + getWeddingTax(w), 0) + yearlyIncomes.reduce((sum, i) => sum + (Number(i.tax) || 0), 0);
          const yearlyNetIncome = yearlyIncome - yearlyTax;
          const yearlyExpense = yearlyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
          const yearlyProfit = yearlyNetIncome - yearlyExpense;

          return (
            <div className="overflow-x-auto">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-stone-800">{year} 年度總表</h3>
                  <p className="text-sm text-stone-500">統計整年度各月份的營業收入、稅金與支出狀況。</p>
                </div>
                <button
                  onClick={() => {
                    const headers = ['月份', '營業收入', '稅金', '淨收入', '總支出', '本期淨利'];
                    const rows = Array.from({ length: 12 }, (_, i) => {
                      const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
                      const mWeddings = yearlyWeddings.filter(w => (w.payment_date || w.created_at || "").startsWith(monthStr));
                      const mExpenses = yearlyExpenses.filter(e => e.expense_date.startsWith(monthStr));
                      const mIncomes = yearlyIncomes.filter(inc => inc.income_date.startsWith(monthStr));
                      const mIncome = mWeddings.reduce((sum, w) => sum + (Number(w.amount) || 0), 0) + mIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
                      const mTax = mWeddings.reduce((sum, w) => sum + getWeddingTax(w), 0) + mIncomes.reduce((sum, inc) => sum + (Number(inc.tax) || 0), 0);
                      const mNetIncome = mIncome - mTax;
                      const mExpense = mExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                      const mProfit = mNetIncome - mExpense;
                      return [`${i + 1}月`, mIncome, mTax, mNetIncome, mExpense, mProfit].join(',');
                    });
                    rows.push(['年度總計', yearlyIncome, yearlyTax, yearlyNetIncome, yearlyExpense, yearlyProfit].join(','));
                    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', `年度報表_${year}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="inline-flex items-center gap-2 bg-stone-100 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-200 transition-colors border border-stone-200"
                >
                  <Download className="w-4 h-4" />
                  匯出 Excel (CSV)
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm">月份</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">營業收入</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">稅金 (5%)</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">淨收入</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">總支出</th>
                    <th className="py-3 px-4 font-medium text-stone-600 text-sm text-right">本期淨利</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
                    const mWeddings = yearlyWeddings.filter(w => (w.payment_date || w.created_at || "").startsWith(monthStr));
                    const mExpenses = yearlyExpenses.filter(e => e.expense_date.startsWith(monthStr));
                    const mIncomes = yearlyIncomes.filter(inc => inc.income_date.startsWith(monthStr));
                    
                    const mIncome = mWeddings.reduce((sum, w) => sum + (Number(w.amount) || 0), 0) + mIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
                    const mTax = mWeddings.reduce((sum, w) => sum + getWeddingTax(w), 0) + mIncomes.reduce((sum, inc) => sum + (Number(inc.tax) || 0), 0);
                    const mNetIncome = mIncome - mTax;
                    const mExpense = mExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                    const mProfit = mNetIncome - mExpense;

                    return (
                      <tr key={i} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4 text-sm font-medium text-stone-800">{i + 1}月</td>
                        <td className="py-3 px-4 text-sm text-right">${mIncome.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-right text-red-500">-${mTax.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-right font-medium">${mNetIncome.toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-right text-red-500">-${mExpense.toLocaleString()}</td>
                        <td className={`py-3 px-4 text-sm text-right font-bold ${mProfit >= 0 ? 'text-rose-600' : 'text-stone-500'}`}>
                          ${mProfit.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-stone-50 border-t-2 border-stone-200 font-bold">
                  <tr>
                    <td className="py-4 px-4 text-sm text-stone-800">年度總計</td>
                    <td className="py-4 px-4 text-sm text-right">${yearlyIncome.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-right text-red-500">-${yearlyTax.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-right">${yearlyNetIncome.toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-right text-red-500">-${yearlyExpense.toLocaleString()}</td>
                    <td className={`py-4 px-4 text-sm text-right ${yearlyProfit >= 0 ? 'text-rose-600' : 'text-stone-500'}`}>
                      ${yearlyProfit.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
