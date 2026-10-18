import { useState } from 'react';
import { X, Calendar, DollarSign, Clock, Trash2, Edit3, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { calcDaysUsed, calcCostPerDay, updateItem, deleteItem } from '../store';

export default function ItemDetailModal({ item, onClose, onEdit, onRefresh }) {
  const [showSoldInput, setShowSoldInput] = useState(false);
  const [soldPriceInput, setSoldPriceInput] = useState(item.soldPrice || '');
  const [soldDateInput, setSoldDateInput] = useState(
    item.soldDate || new Date().toISOString().split('T')[0]
  );

  const days = calcDaysUsed(item);
  const cpd = calcCostPerDay(item);

  const handleStatusChange = (newStatus) => {
    if (newStatus === 'sold') {
      setShowSoldInput(true);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    updateItem(item.id, {
      status: newStatus,
      retiredDate: newStatus === 'retired' ? today : null,
      soldDate: null,
      soldPrice: 0,
    });
    onRefresh();
    onClose();
  };

  const handleConfirmSold = () => {
    const sPrice = parseFloat(soldPriceInput) || 0;
    updateItem(item.id, {
      status: 'sold',
      soldPrice: sPrice,
      soldDate: soldDateInput,
    });
    onRefresh();
    onClose();
  };

  const handleDelete = () => {
    if (confirm(`确定要删除“${item.name}”吗？`)) {
      deleteItem(item.id);
      onRefresh();
      onClose();
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F1F5] text-xs font-medium text-[#4A4A52]">
            <span
              className={`w-2 h-2 rounded-full ${
                item.status === 'active'
                  ? 'bg-[#34C759] animate-pulse'
                  : item.status === 'sold'
                  ? 'bg-[#007AFF]'
                  : 'bg-[#8E8E9A]'
              }`}
            />
            <span>
              {item.status === 'active' ? '服役中' : item.status === 'sold' ? '已卖出' : '已退役'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="p-2 rounded-full hover:bg-gray-100 text-[#4A4A52] transition"
              title="编辑"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-full hover:bg-red-50 text-red-500 transition"
              title="删除"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-[#8E8E9A] transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Product Visual & Name */}
        <div className="flex items-center gap-4 mb-5 p-3 rounded-2xl bg-[#F8F9FA]">
          <div className="polaroid-frame w-20 h-20 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl"
                style={{ background: item.imageColor || '#E5E6EB' }}
              >
                📦
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-white text-[#8E8E9A] shadow-xs inline-block mb-1">
              {item.category || '物品'}
            </span>
            <h2 className="text-base font-bold text-[#1A1A2E] leading-snug line-clamp-2">
              {item.name}
            </h2>
          </div>
        </div>

        {/* Big Cost Display Card */}
        <div className="card p-4 mb-4 bg-gradient-to-br from-white to-[#FAFBFD] border border-gray-100">
          <p className="text-xs text-[#8E8E9A] font-medium mb-1">当前日均使用成本</p>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-3xl font-extrabold text-price ${
                item.isPriceless ? 'text-[#FFB800]' : 'text-[#1A1A2E]'
              }`}
            >
              ¥{cpd.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-[#8E8E9A]">/天</span>
          </div>

          {/* Formula calculation breakdown */}
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-[#8E8E9A] space-y-1.5">
            <div className="flex justify-between">
              <span>购买原价</span>
              <span className="font-semibold text-[#1A1A2E]">
                {item.isPriceless ? '无价之宝 (¥0.00)' : `¥${item.price.toFixed(2)}`}
              </span>
            </div>
            {item.status === 'sold' && (
              <div className="flex justify-between text-blue-600">
                <span>二手回血金额</span>
                <span className="font-semibold">-¥{(item.soldPrice || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>购买日期</span>
              <span className="font-medium text-[#1A1A2E]">{item.purchaseDate}</span>
            </div>
            <div className="flex justify-between">
              <span>累计使用天数</span>
              <span className="font-semibold text-[#1A1A2E]">{days} 天</span>
            </div>
            <div className="flex justify-between text-[11px] text-[#A0A0AB] pt-1">
              <span>计算公式</span>
              <span>
                {item.isPriceless
                  ? '无价之宝 = ¥0.00'
                  : `(¥${item.price} - ¥${item.soldPrice || 0}) ÷ ${days}天`}
              </span>
            </div>
          </div>
        </div>

        {/* Status Actions */}
        <div className="space-y-2 mb-2">
          <p className="text-xs font-bold text-[#8E8E9A] px-1">状态流转</p>

          {item.status !== 'active' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-gray-200 text-xs font-semibold hover:border-green-400 active:scale-[0.99] transition"
            >
              <div className="flex items-center gap-2">
                <RotateCcw size={15} className="text-[#34C759]" />
                <span>重新启用 · 恢复服役</span>
              </div>
              <ArrowRight size={14} className="text-gray-400" />
            </button>
          )}

          {item.status === 'active' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleStatusChange('retired')}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] text-[#4A4A52] text-xs font-semibold active:scale-[0.98] transition"
              >
                <span>📦 设为退役</span>
              </button>
              <button
                onClick={() => handleStatusChange('sold')}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 text-xs font-semibold active:scale-[0.98] transition"
              >
                <span>💰 二手转卖</span>
              </button>
            </div>
          )}

          {/* Sold Price Pop-in */}
          {showSoldInput && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 mt-2 space-y-3 animate-fade-in">
              <p className="text-xs font-bold text-blue-900">登记二手卖出回血</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-blue-800 block mb-1">卖出回血金额(¥)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={soldPriceInput}
                    onChange={(e) => setSoldPriceInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-blue-200 text-sm font-semibold outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-blue-800 block mb-1">卖出日期</label>
                  <input
                    type="date"
                    value={soldDateInput}
                    onChange={(e) => setSoldDateInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-blue-200 text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSoldInput(false)}
                  className="flex-1 py-2 rounded-lg bg-white text-xs font-medium text-gray-600 border border-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmSold}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm"
                >
                  确认卖出并回血
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
