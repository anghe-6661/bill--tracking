import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Sliders,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Share,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  exportAllData,
  importAllData,
  resetToDemoData,
  clearAllData,
} from '../store';

export default function SettingsPage({ onRefresh }) {
  const settings = getSettings();
  const fileInputRef = useRef(null);

  const [dailyBudget, setDailyBudget] = useState(settings.dailyBudget || 150);
  const [successMsg, setSuccessMsg] = useState('');

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const handleSaveBudget = (e) => {
    e.preventDefault();
    const b = parseFloat(dailyBudget) || 150;
    saveSettings({ ...settings, dailyBudget: b });
    showToast('预算设置已成功保存！');
    onRefresh();
  };

  const handleExport = () => {
    const dataStr = exportAllData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_财务与物品备份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON 备份数据已导出下载！');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        importAllData(reader.result);
        showToast('数据导入恢复成功！');
        onRefresh();
      } catch (err) {
        alert('导入失败，请确保选择的是有效的 JSON 备份文件！');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemo = () => {
    if (confirm('确定要恢复默认预置演示数据吗？当前新增的数据将被重置。')) {
      resetToDemoData();
      showToast('已恢复预置演示数据！');
      onRefresh();
    }
  };

  const handleClear = () => {
    if (confirm('⚠️ 高危操作：确定清空所有本地数据吗？此操作不可撤销！')) {
      clearAllData();
      showToast('所有数据已清空。');
      onRefresh();
    }
  };

  return (
    <div className="px-4.5 pt-5 pb-32 safe-top">
      {/* ── Top Header ── */}
      <div className="mb-5">
        <h1 className="text-[28px] font-black tracking-tight text-[#1A1A2E]">应用设置</h1>
        <p className="text-xs text-[#8E8E9A]">偏好配置、数据备份与 PWA 模式</p>
      </div>

      {/* Toast Alert */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-slide-up">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── 每日预算配置 ── */}
      <div className="card p-4 mb-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Sliders size={17} className="text-[#1A1A2E]" />
          <h2 className="text-sm font-bold text-[#1A1A2E]">日常消费每日预算</h2>
        </div>
        <form onSubmit={handleSaveBudget} className="space-y-3">
          <div className="flex items-center gap-2 p-2.5 bg-[#F8F9FA] rounded-xl border border-gray-200">
            <span className="text-lg font-bold text-[#1A1A2E]">¥</span>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              className="flex-1 text-base font-bold bg-transparent outline-none text-price"
            />
            <span className="text-xs text-[#8E8E9A]">/ 天</span>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[#1A1A2E] text-white text-xs font-bold shadow-xs active:scale-95 transition"
          >
            保存每日预算
          </button>
        </form>
      </div>

      {/* ── 数据备份与持久化 ── */}
      <div className="card p-4 mb-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={17} className="text-[#34C759]" />
          <h2 className="text-sm font-bold text-[#1A1A2E]">数据安全与备份 (JSON)</h2>
        </div>
        <p className="text-xs text-[#8E8E9A] mb-3">
          数据默认保存在本地浏览器中，随时可导出完整的 JSON 备份或跨设备迁移。
        </p>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition"
          >
            <Download size={14} />
            <span>一键导出备份</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition"
          >
            <Upload size={14} />
            <span>导入恢复数据</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleResetDemo}
            className="flex items-center justify-center gap-1 p-2 rounded-lg text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            <RotateCcw size={12} />
            <span>重置预置演示数据</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1 p-2 rounded-lg text-[11px] font-semibold text-red-500 hover:bg-red-50"
          >
            <Trash2 size={12} />
            <span>清空所有数据</span>
          </button>
        </div>
      </div>

      {/* ── iPhone iOS PWA 安装指南 ── */}
      <div className="card p-4 mb-4 border border-gray-100 bg-gradient-to-br from-white to-blue-50/40">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={17} className="text-[#007AFF]" />
          <h2 className="text-sm font-bold text-[#1A1A2E]">iOS PWA 全屏沉浸模式</h2>
        </div>
        <p className="text-xs text-[#4A4A52] leading-relaxed mb-3">
          为了获得与原生 iOS App 一致的极致流畅体验（隐藏 Safari 地址栏与底部工具栏）：
        </p>
        <div className="space-y-2 text-xs text-[#4A4A52] bg-white p-3 rounded-xl border border-blue-100/60 shadow-2xs">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
              1
            </span>
            <span>在 iPhone Safari 浏览器中打开本站</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
              2
            </span>
            <span>
              点击底部工具栏中间的 <Share size={12} className="inline text-blue-600" /> 分享按钮
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
              3
            </span>
            <span>
              下滑并点击 <strong>「添加到主屏幕」</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── 关于本应用 ── */}
      <div className="p-4 text-center text-[#8E8E9A] text-xs space-y-1">
        <p className="font-bold text-[#1A1A2E]">C · 个人财务与物品日均成本工作台</p>
        <p>Version 1.0.0 · Designed for iPhone</p>
        <p className="text-[11px] opacity-75">Clean & Minimalist Design</p>
      </div>
    </div>
  );
}
