import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  DEFAULT_CATEGORIES,
  getCategoryColor,
  getCategoryIcon,
  isMonthlyBillCategory,
} from '../store';

export default function BudgetEditor({
  dailyBudget,
  categoryBudgets,
  categories,
  onSave,
  submitLabel = '保存预算',
}) {
  const [total, setTotal] = useState(String(dailyBudget || 150));
  const [rows, setRows] = useState(
    Object.entries(categoryBudgets || {})
      .filter(([name, amount]) => Number(amount) > 0 && !isMonthlyBillCategory(name))
      .map(([name, amount]) => ({ name, amount: String(amount) }))
  );
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const usedNames = rows.map((row) => row.name);
  const presetOptions = useMemo(() => {
    const all = [...new Set([...(categories || []), ...DEFAULT_CATEGORIES])];
    return all.filter((name) => !usedNames.includes(name) && !isMonthlyBillCategory(name));
  }, [categories, usedNames]);

  const totalValue = parseFloat(total) || 0;
  const allocated = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const unallocated = totalValue - allocated;
  const overAllocated = allocated > totalValue && totalValue > 0;

  const addRow = () => {
    const name = newName.trim();
    const amount = parseFloat(newAmount);
    if (!name || isMonthlyBillCategory(name)) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (usedNames.includes(name)) return;
    setRows((current) => [...current, { name, amount: String(amount) }]);
    setNewName('');
    setNewAmount('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextTotal = parseFloat(total) || 150;
    const nextBudgets = {};
    const nextCategories = [...(categories || [])];

    rows.forEach((row) => {
      const amount = parseFloat(row.amount);
      if (!row.name || isMonthlyBillCategory(row.name) || !Number.isFinite(amount) || amount <= 0) {
        return;
      }
      nextBudgets[row.name] = amount;
      if (!nextCategories.includes(row.name)) nextCategories.push(row.name);
    });

    onSave({
      dailyBudget: nextTotal,
      categoryBudgets: nextBudgets,
      categories: nextCategories,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-bold text-[#4A4A52] block mb-1.5">今日总预算</label>
        <div className="flex items-center gap-2 p-3 bg-[#F8F9FA] rounded-2xl border border-gray-200">
          <span className="text-2xl font-black text-[#1A1A2E] flex-shrink-0">¥</span>
          <input
            type="number"
            step="1"
            min="1"
            required
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="w-full flex-1 min-w-0 text-2xl font-bold bg-transparent outline-none text-price"
          />
          <span className="text-xs text-[#8E8E9A] whitespace-nowrap flex-shrink-0">/天</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {[50, 100, 150, 200, 300, 500].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setTotal(String(val))}
              className="flex-1 py-1.5 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700 hover:bg-gray-200"
            >
              ¥{val}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-[#4A4A52]">分类额度</label>
          <span className={`text-[11px] font-semibold ${overAllocated ? 'text-[#FF3B30]' : 'text-[#8E8E9A]'}`}>
            {overAllocated
              ? `超出总额 ¥${(allocated - totalValue).toFixed(0)}`
              : `未分配 ¥${Math.max(unallocated, 0).toFixed(0)}`}
          </span>
        </div>
        <p className="text-[11px] text-[#8E8E9A] mb-2">
          给吃饭、购物等单独设上限。订阅按月记账，不占当日额度。
        </p>

        {rows.length > 0 && (
          <div className="space-y-2 mb-3">
            {rows.map((row, index) => (
              <div key={`${row.name}-${index}`} className="flex items-center gap-2">
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: `${getCategoryColor(row.name)}18` }}
                >
                  {getCategoryIcon(row.name)}
                </span>
                <span className="flex-1 min-w-0 text-xs font-semibold text-[#1A1A2E] truncate">
                  {row.name}
                </span>
                <div className="flex items-center gap-1 w-28 px-2 py-1.5 rounded-xl bg-[#F8F9FA] border border-gray-200">
                  <span className="text-xs text-[#8E8E9A]">¥</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={row.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRows((current) =>
                        current.map((item, i) => (i === index ? { ...item, amount: value } : item))
                      );
                    }}
                    className="w-full bg-transparent text-xs font-bold outline-none text-price"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                  className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50"
                  title="移除该分类额度"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-2.5 rounded-2xl bg-[#F8F9FA] border border-gray-200 space-y-2">
          {presetOptions.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {presetOptions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setNewName(name)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                    newName === name
                      ? 'bg-[#1A1A2E] text-white'
                      : 'bg-white text-[#4A4A52] border border-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="自定义，如吃饭 / 购物"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs outline-none focus:border-[#1A1A2E]"
            />
            <div className="flex items-center gap-1 w-24 px-2 py-2 rounded-xl bg-white border border-gray-200">
              <span className="text-xs text-[#8E8E9A]">¥</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="额度"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-transparent text-xs font-bold outline-none text-price"
              />
            </div>
            <button
              type="button"
              onClick={addRow}
              className="w-9 h-9 rounded-xl bg-[#1A1A2E] text-white flex items-center justify-center flex-shrink-0 active:scale-95"
              title="添加分类额度"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white font-bold text-sm shadow-md active:scale-95 transition"
      >
        {submitLabel}
      </button>
    </form>
  );
}
