import { useMemo } from 'react';
import {
  PieChart as PieIcon,
  BarChart3,
  Wallet,
  Award,
} from 'lucide-react';
import {
  getItems,
  getBills,
  getSettings,
  calcDaysUsed,
  calcCostPerDay,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
  isMonthlyBillCategory,
} from '../store';

export default function TrendsPage() {
  const items = getItems();
  const bills = getBills();
  const settings = getSettings();
  const dailyBudget = settings.dailyBudget || 150;

  // Active items asset analytics
  const activeItems = useMemo(() => items.filter((i) => i.status === 'active'), [items]);

  const totalAssetValue = useMemo(() => {
    return activeItems.reduce((sum, i) => sum + (i.isPriceless ? 0 : i.price), 0);
  }, [activeItems]);

  const totalDailyDepreciation = useMemo(() => {
    return activeItems.reduce((sum, i) => sum + calcCostPerDay(i), 0);
  }, [activeItems]);

  // Ranked items by daily cost
  const rankedItems = useMemo(() => {
    return [...activeItems].sort((a, b) => calcCostPerDay(b) - calcCostPerDay(a));
  }, [activeItems]);

  // Category spending breakdown (This month)
  const categoryStats = useMemo(() => {
    const map = {};
    let total = 0;
    bills.forEach((b) => {
      const cat = b.category || '其他';
      map[cat] = (map[cat] || 0) + b.amount;
      total += b.amount;
    });

    const list = Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      percent: total > 0 ? (amount / total) * 100 : 0,
      color: CATEGORY_COLORS[name] || '#95A5A6',
      icon: CATEGORY_ICONS[name] || '📦',
    }));

    list.sort((a, b) => b.amount - a.amount);
    return { list, total };
  }, [bills]);

  // Last 7 days budget tracking
  const last7DaysData = useMemo(() => {
    const days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];
      const label = i === 0 ? '今天' : `周${weekdayNames[d.getDay()]}`;

      // Sum bills on this date
      const spent = bills
        .filter((b) => b.date === dateStr && !isMonthlyBillCategory(b.category))
        .reduce((sum, b) => sum + b.amount, 0);

      days.push({
        date: dateStr,
        label,
        spent,
        isOver: spent > dailyBudget,
        budget: dailyBudget,
      });
    }

    return days;
  }, [bills, dailyBudget]);

  const maxDailySpent = Math.max(
    ...last7DaysData.map((d) => d.spent),
    dailyBudget * 1.2,
    100
  );

  return (
    <div className="px-4.5 pt-5 pb-32 safe-top">
      {/* ── Top Header ── */}
      <div className="mb-5">
        <h1 className="text-[28px] font-black tracking-tight text-[#1A1A2E]">统计趋势</h1>
        <p className="text-xs text-[#8E8E9A]">资产全景与消费达标分析</p>
      </div>

      {/* ── 资产与折旧核心卡片 ── */}
      <div className="card p-5 mb-5 bg-gradient-to-br from-[#1A1A2E] to-[#2C2C44] text-white shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
            <Wallet size={15} className="text-[#34C759]" />
            服役中总资产价值
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-gray-200">
            {activeItems.length} 件装备
          </span>
        </div>

        <div className="mb-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-price tracking-tight">
              ¥{totalAssetValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
          <div>
            <p className="text-gray-400 text-[11px] mb-0.5">每日总持有折旧</p>
            <p className="font-extrabold text-[#34C759] text-sm text-price whitespace-nowrap">
              ¥{totalDailyDepreciation.toFixed(2)}{' '}
              <span className="text-[10px] font-medium">/天</span>
            </p>
          </div>
          <div className="border-l border-white/10 pl-3">
            <p className="text-gray-400 text-[11px] mb-0.5">平均单件日均</p>
            <p className="font-extrabold text-white text-sm text-price whitespace-nowrap">
              ¥
              {activeItems.length > 0
                ? (totalDailyDepreciation / activeItems.length).toFixed(2)
                : '0.00'}{' '}
              <span className="text-[10px] font-medium">/天</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── 近 7 天消费与预算达标柱状图 ── */}
      <div className="card p-4 mb-5 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <BarChart3 size={16} className="text-[#1A1A2E]" />
            <h2 className="text-sm font-bold text-[#1A1A2E]">近 7 天预算达标分析</h2>
          </div>
          <span className="text-[11px] text-[#8E8E9A]">每日上限 ¥{dailyBudget}</span>
        </div>

        {/* Bar Chart Container */}
        <div className="h-44 pt-4 pb-1 flex items-end justify-between gap-2 px-1 relative">
          {/* Target Budget Reference Line */}
          <div
            className="absolute left-0 right-0 border-b border-dashed border-gray-300 z-0 flex items-center justify-end pr-1 pointer-events-none"
            style={{
              bottom: `${(dailyBudget / maxDailySpent) * 120 + 24}px`,
            }}
          >
            <span className="text-[9px] text-gray-400 font-semibold bg-white px-1">
              预算线 ¥{dailyBudget}
            </span>
          </div>

          {last7DaysData.map((d) => {
            const barHeight = Math.max((d.spent / maxDailySpent) * 120, 6);
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 z-10">
                <span className="text-[10px] font-bold text-[#4A4A52] text-price">
                  {d.spent > 0 ? `¥${d.spent.toFixed(0)}` : '¥0'}
                </span>
                <div className="w-full flex justify-center">
                  <div
                    className={`w-6 rounded-t-lg transition-all duration-500 ${d.isOver
                        ? 'bg-[#FF3B30] shadow-xs'
                        : d.spent === 0
                          ? 'bg-gray-200'
                          : 'bg-[#34C759]'
                      }`}
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-[#8E8E9A]">{d.label}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 mt-2 pt-2 border-t border-gray-100 text-[11px] text-[#8E8E9A]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#34C759]" />
            <span>预算内达标</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#FF3B30]" />
            <span>超支预警</span>
          </div>
        </div>
      </div>

      {/* ── 本月消费分类占比 ── */}
      <div className="card p-4 mb-5 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <PieIcon size={16} className="text-[#1A1A2E]" />
            <h2 className="text-sm font-bold text-[#1A1A2E]">消费分类占比</h2>
          </div>
          <span className="text-xs font-bold text-[#1A1A2E] text-price">
            累计 ¥{categoryStats.total.toFixed(2)}
          </span>
        </div>

        {/* Visual Multi-segment progress bar */}
        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-gray-100 mb-4 shadow-2xs">
          {categoryStats.list.map((cat) => (
            <div
              key={cat.name}
              style={{
                width: `${cat.percent}%`,
                backgroundColor: cat.color,
              }}
              className="h-full transition-all"
              title={`${cat.name}: ${cat.percent.toFixed(1)}%`}
            />
          ))}
        </div>

        {/* Category breakdown list */}
        <div className="space-y-2.5">
          {categoryStats.list.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-semibold text-[#1A1A2E]">
                  {cat.icon} {cat.name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-price">
                <span className="font-bold text-[#1A1A2E]">¥{cat.amount.toFixed(2)}</span>
                <span className="text-[#8E8E9A] w-12 text-right">
                  {cat.percent.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 物品日均成本排行榜 ── */}
      <div className="card p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Award size={16} className="text-[#FF9500]" />
            <h2 className="text-sm font-bold text-[#1A1A2E]">服役物品日均成本排行</h2>
          </div>
          <span className="text-[11px] text-[#8E8E9A]">每日折旧从高到低</span>
        </div>

        <div className="divide-y divide-gray-100">
          {rankedItems.slice(0, 5).map((item, idx) => {
            const cpd = calcCostPerDay(item);
            const days = calcDaysUsed(item);
            return (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${idx === 0
                        ? 'bg-amber-100 text-amber-700'
                        : idx === 1
                          ? 'bg-gray-200 text-gray-700'
                          : idx === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'text-gray-400'
                      }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-[#1A1A2E] truncate">{item.name}</p>
                    <p className="text-[10px] text-[#8E8E9A]">
                      {item.isPriceless ? '无价之宝' : `原价 ¥${item.price.toFixed(0)}`} · 已用 {days} 天
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`font-black text-sm text-price ${item.isPriceless ? 'text-[#FFB800]' : 'text-[#1A1A2E]'
                      }`}
                  >
                    ¥{cpd.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-[#8E8E9A]">/天</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
