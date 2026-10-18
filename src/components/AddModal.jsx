import { Package, Receipt, X } from 'lucide-react';

export default function AddModal({ onClose, onAddItem, onAddBill }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">快速添加</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition">
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={onAddBill}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-[#4CD964]/15 flex items-center justify-center">
              <Receipt size={24} className="text-[#4CD964]" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[15px]">上传账单截图</p>
              <p className="text-xs text-[#8E8E9A] mt-0.5">AI 智能识别消费记录</p>
            </div>
          </button>
          <button
            onClick={onAddItem}
            className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 rounded-xl bg-[#007AFF]/15 flex items-center justify-center">
              <Package size={24} className="text-[#007AFF]" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[15px]">添加新物品</p>
              <p className="text-xs text-[#8E8E9A] mt-0.5">追踪物品日均成本</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
