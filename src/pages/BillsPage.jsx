import { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Upload,
  Camera,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Edit2,
  X,
  CreditCard,
} from 'lucide-react';
import {
  getBills,
  deleteBill,
  getSettings,
  saveSettings,
  getTodaySpent,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
} from '../store';
import BillUploadModal from '../components/BillUploadModal';

export default function BillsPage({ onRefresh }) {
  const bills = getBills();
  const settings = getSettings();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState(settings.dailyBudget || 150);
  const [previewImage, setPreviewImage] = useState(null);

  // Group bills by date
  const groupedBills = useMemo(() => {
    const groups = {};
    const sorted = [...bills].sort((a, b) => new Date(b.time) - new Date(a.time));

    sorted.forEach((bill) => {
      const dateKey = bill.date || bill.time.split(' ')[0];
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: dateKey,
          items: [],
          total: 0,
        };
      }
      groups[dateKey].items.push(bill);
      groups[dateKey].total += bill.amount;
    });

    return Object.values(groups);
  }, [bills]);

  // Today calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySpent = getTodaySpent(bills);
  const dailyBudget = settings.dailyBudget || 150;
  const remainingBudget = dailyBudget - todaySpent;
  const spentRatio = Math.min(todaySpent / dailyBudget, 1);
  const isOverspent = todaySpent > dailyBudget;
  const isWarning = !isOverspent && remainingBudget / dailyBudget <= 0.2;

  // Monthly spent
  const currentMonthPrefix = todayStr.slice(0, 7);
  const monthTotal = bills
    .filter((b) => b.date?.startsWith(currentMonthPrefix))
    .reduce((sum, b) => sum + b.amount, 0);

  // Progress bar color & status text
  let progressColor = '#34C759'; // green
  let statusBadge = {
    text: '额度充裕',
    bg: 'bg-emerald-50 text-[#34C759] border-emerald-200',
    icon: CheckCircle,
  };

  if (isOverspent) {
    progressColor = '#FF3B30'; // red
    statusBadge = {
      text: `已超支 ¥${(todaySpent - dailyBudget).toFixed(2)}`,
      bg: 'bg-red-50 text-[#FF3B30] border-red-200',
      icon: AlertTriangle,
    };
  } else if (isWarning) {
    progressColor = '#FF9500'; // orange
    statusBadge = {
      text: '预警：余额不足20%',
      bg: 'bg-amber-50 text-[#FF9500] border-amber-200',
      icon: AlertTriangle,
    };
  }

  const handleUpdateBudget = (e) => {
    e.preventDefault();
    const newBudget = parseFloat(budgetInput) || 150;
    saveSettings({ ...settings, dailyBudget: newBudget });
    setShowBudgetModal(false);
    onRefresh();
  };

  const handleDeleteBill = (id, merchant) => {
    if (confirm(`确定要删除“${merchant}”这笔账单吗？`)) {
      deleteBill(id);
      onRefresh();
    }
  };

  // Human date label
  const getDateLabel = (dateStr) => {
    if (dateStr === todayStr) return '今天';
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === yesterday.toISOString().split('T')[0]) return '昨天';

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
    }
    return dateStr;
  };

  return (
    <div className="px-4.5 pt-5 pb-32 safe-top">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[28px] font-black tracking-tight text-[#1A1A2E]">日常账单</h1>
          <p className="text-xs text-[#8E8E9A]">每日消费预算与截图记账</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#1A1A2E] text-white text-xs font-bold shadow-xs active:scale-95 transition"
        >
          <Camera size={14} />
          <span>截图记账</span>
        </button>
      </div>

      {/* ── 今日额度看板（核心卡片） ── */}
      <div className="card p-5 mb-5 bg-gradient-to-br from-white to-[#F9FAFC] border border-gray-100/80 shadow-md">
        {/* Top line: Header & Edit budget */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8E8E9A]">今日预算额度</span>
            <span className="text-xs font-semibold text-[#1A1A2E]">¥{dailyBudget.toFixed(2)}</span>
            <button
              onClick={() => {
                setBudgetInput(dailyBudget);
                setShowBudgetModal(true);
              }}
              className="p-1 rounded-md hover:bg-gray-100 text-[#8E8E9A] transition"
              title="修改预算"
            >
              <Edit2 size={12} />
            </button>
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}
          >
            <statusBadge.icon size={12} />
            <span>{statusBadge.text}</span>
          </div>
        </div>

        {/* Large Remaining Quota Display */}
        <div className="mb-4">
          <p className="text-xs font-medium text-[#8E8E9A] mb-0.5">今日剩余可用额度</p>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-[36px] font-black tracking-tight text-price ${isOverspent ? 'text-[#FF3B30]' : 'text-[#1A1A2E]'
                }`}
            >
              ¥{Math.abs(remainingBudget).toFixed(2)}
            </span>
            {isOverspent && (
              <span className="text-xs font-bold text-[#FF3B30] ml-1 bg-red-100/60 px-2 py-0.5 rounded-md">
                超额支出
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="w-full h-2.5 rounded-full bg-[#E5E6EB] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(spentRatio * 100, 100)}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#8E8E9A] font-medium">
            <span>已消费 ¥{todaySpent.toFixed(2)} ({((todaySpent / dailyBudget) * 100).toFixed(0)}%)</span>
            <span>预算上限 ¥{dailyBudget.toFixed(2)}</span>
          </div>
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
          <div>
            <p className="text-[10px] text-[#8E8E9A] mb-0.5">今日笔数</p>
            <p className="text-xs font-extrabold text-[#1A1A2E]">
              {bills.filter((b) => b.date === todayStr).length} 笔
            </p>
          </div>
          <div className="border-x border-gray-100">
            <p className="text-[10px] text-[#8E8E9A] mb-0.5">本月累计支出</p>
            <p className="text-xs font-extrabold text-[#1A1A2E]">¥{monthTotal.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8E8E9A] mb-0.5">平均单笔</p>
            <p className="text-xs font-extrabold text-[#1A1A2E]">
              ¥
              {bills.length > 0
                ? (bills.reduce((s, b) => s + b.amount, 0) / bills.length).toFixed(1)
                : '0.0'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick Action Card ── */}
      <button
        onClick={() => setShowUploadModal(true)}
        className="w-full p-3.5 mb-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white flex items-center justify-between shadow-md active:scale-[0.98] transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Upload size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-bold text-sm">上传微信/支付宝截图记账</p>
            <p className="text-[11px] text-white/80">AI 秒级提取金额、商户与分类</p>
          </div>
        </div>
        <span className="text-xs font-bold bg-white text-emerald-800 px-3 py-1.5 rounded-full shadow-2xs">
          开始识别
        </span>
      </button>

      {/* ── 每日账单时间轴 ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#1A1A2E]">消费明细时间轴</h2>
          <span className="text-xs text-[#8E8E9A]">共 {bills.length} 笔支出</span>
        </div>

        {groupedBills.length > 0 ? (
          groupedBills.map((group) => (
            <div key={group.date} className="space-y-2">
              {/* Date Group Header */}
              <div className="flex items-center justify-between px-2 pt-1 text-xs font-bold text-[#8E8E9A]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#1A1A2E]">{getDateLabel(group.date)}</span>
                  <span className="text-[11px] font-normal">({group.date})</span>
                </div>
                <span>
                  支出 ¥{group.total.toFixed(2)} · {group.items.length}笔
                </span>
              </div>

              {/* Items in this date */}
              <div className="card divide-y divide-gray-100 overflow-hidden">
                {group.items.map((bill) => {
                  const icon = CATEGORY_ICONS[bill.category] || '📦';
                  const color = CATEGORY_COLORS[bill.category] || '#95A5A6';
                  const timeDisplay = bill.time.includes(' ')
                    ? bill.time.split(' ')[1]
                    : bill.time;

                  return (
                    <div
                      key={bill.id}
                      className="p-3.5 flex items-center justify-between hover:bg-gray-50/60 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Category icon */}
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 shadow-2xs"
                          style={{ background: `${color}18` }}
                        >
                          {icon}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-[13.5px] text-[#1A1A2E] truncate">
                            {bill.merchant}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-[#8E8E9A] mt-0.5">
                            <span>{timeDisplay}</span>
                            <span>·</span>
                            <span>{bill.payMethod || '移动支付'}</span>
                            {bill.screenshot && (
                              <button
                                onClick={() => setPreviewImage(bill.screenshot)}
                                className="text-emerald-600 font-semibold underline underline-offset-2 flex items-center gap-0.5"
                              >
                                <span>截图</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right amount & delete */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-extrabold text-[15px] text-[#1A1A2E] text-price">
                            -¥{bill.amount.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-[#8E8E9A]">{bill.category}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteBill(bill.id, bill.merchant)}
                          className="p-1.5 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="card p-8 text-center">
            <p className="text-xs text-[#8E8E9A]">暂无账单记录，点击上方按钮上传截图记一笔</p>
          </div>
        )}
      </div>

      {/* ── Adjust Budget Modal ── */}
      {showBudgetModal && (
        <div className="overlay" onClick={() => setShowBudgetModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <h3 className="font-bold text-base text-[#1A1A2E] mb-2">设定每日消费预算额度</h3>
            <p className="text-xs text-[#8E8E9A] mb-4">
              设置合理的每日预算，超支时系统将变红报警，结余充裕时自动显示绿色。
            </p>
            <form onSubmit={handleUpdateBudget} className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-[#F8F9FA] rounded-2xl border border-gray-200">
                <span className="text-2xl font-black text-[#1A1A2E]">¥</span>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  className="w-full text-2xl font-bold bg-transparent outline-none text-price"
                />
                <span className="text-xs text-[#8E8E9A]">/天</span>
              </div>

              {/* Quick suggestions */}
              <div className="flex items-center gap-2">
                {[50, 100, 150, 200, 300, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBudgetInput(val)}
                    className="flex-1 py-1.5 rounded-lg bg-gray-100 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    ¥{val}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white font-bold text-sm shadow-md active:scale-95 transition"
              >
                保存预算
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Bill Upload Modal ── */}
      {showUploadModal && (
        <BillUploadModal
          onClose={() => setShowUploadModal(false)}
          onRefresh={onRefresh}
        />
      )}

      {/* ── Fullscreen Screenshot Preview Modal ── */}
      {previewImage && (
        <div className="overlay" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-sm max-h-[85vh] p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Receipt preview"
              className="max-h-[80vh] rounded-2xl shadow-2xl object-contain bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
