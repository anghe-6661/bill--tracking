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
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Cpu,
  Cloud,
  CloudUpload,
  CloudDownload,
  Check,
  Shuffle,
  Lock,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  exportAllData,
  importAllData,
  resetToDemoData,
  clearAllData,
} from '../store';
import {
  getSyncConfig,
  saveSyncConfig,
  clearSyncConfig,
  pushToCloud,
  pullFromCloud,
} from '../sync';

export default function SettingsPage({ onRefresh }) {
  const settings = getSettings();
  const fileInputRef = useRef(null);

  const [dailyBudget, setDailyBudget] = useState(settings.dailyBudget || 150);
  const [successMsg, setSuccessMsg] = useState('');

  // ── GitHub Gist Cloud Sync Configuration ──
  const [syncConfig, setSyncConfig] = useState(getSyncConfig());
  const [syncToken, setSyncToken] = useState(syncConfig.token || '');
  const [showSyncToken, setShowSyncToken] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const isSyncActive = Boolean(syncConfig.token);

  const handleSaveSync = async (e) => {
    e.preventDefault();
    const cleanToken = syncToken.trim();
    if (!cleanToken) {
      clearSyncConfig();
      setSyncConfig(getSyncConfig());
      showToast('已断开 GitHub 云端同步。');
      return;
    }

    saveSyncConfig({ token: cleanToken });
    setSyncConfig(getSyncConfig());
    setIsSyncing(true);
    try {
      const res = await pullFromCloud();
      if (res.updated) {
        showToast('✓ 已连接 GitHub Gist！已同步云端最新记录。');
        onRefresh();
      } else {
        await pushToCloud();
        showToast('✓ 已连接 GitHub Gist！本地数据已备份至云端。');
      }
    } catch (err) {
      showToast('同步提示: ' + (err.message || '网络异常'));
    } finally {
      setIsSyncing(false);
      setSyncConfig(getSyncConfig());
    }
  };

  const handleDisconnectSync = () => {
    clearSyncConfig();
    setSyncToken('');
    setSyncConfig(getSyncConfig());
    showToast('已清除 GitHub Token，断开云端同步。');
  };

  const handleManualPush = async () => {
    if (!syncConfig.token) return;
    setIsSyncing(true);
    try {
      await pushToCloud();
      showToast('✓ 已成功将本地最新数据推送至 GitHub Gist！');
      setSyncConfig(getSyncConfig());
    } catch (err) {
      alert('上传失败: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualPull = async () => {
    if (!syncConfig.token) return;
    setIsSyncing(true);
    try {
      const res = await pullFromCloud();
      if (res.updated) {
        showToast('✓ 已成功从 GitHub Gist 拉取并更新最新数据！');
        onRefresh();
      } else {
        showToast('本地数据已是最新。');
      }
      setSyncConfig(getSyncConfig());
    } catch (err) {
      alert('拉取失败: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // DeepSeek API Configuration
  const [deepseekKey, setDeepseekKey] = useState(
    localStorage.getItem('deepseek_api_key') || ''
  );
  const [deepseekModel, setDeepseekModel] = useState(
    localStorage.getItem('deepseek_model') || 'deepseek-flash'
  );
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState(
    localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com'
  );
  const [showKey, setShowKey] = useState(false);
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);
  const hasDeepSeekKey = Boolean(localStorage.getItem('deepseek_api_key'));

  const handleSaveDeepSeekConfig = (e) => {
    e.preventDefault();
    localStorage.setItem('deepseek_api_key', deepseekKey.trim());
    localStorage.setItem('deepseek_model', (deepseekModel || 'deepseek-flash').trim());
    localStorage.setItem('deepseek_base_url', (deepseekBaseUrl || 'https://api.deepseek.com').trim());
    showToast(deepseekKey ? 'DeepSeek 配置已保存！识图大模型已就绪。' : 'API Key 已清空，将使用演示模式。');
  };

  const handleClearDeepSeekKey = () => {
    localStorage.removeItem('deepseek_api_key');
    setDeepseekKey('');
    showToast('DeepSeek API Key 已清除。');
  };

  const handleForceReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (_) {}
    showToast('正在清空缓存并重新载入最新版本...');
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
  };

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
    if (confirm('⚠️ 高危操作：确定清空全部本地数据吗？此操作不可撤销！')) {
      clearAllData();
      showToast('本地记录已全部清空。');
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

      {/* ── GitHub Gist 私有多端同步配置 ── */}
      <div className="card p-4 mb-4 border border-blue-100 bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20 shadow-xs">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Cloud size={18} className="text-[#007AFF]" />
            <h2 className="text-sm font-bold text-[#1A1A2E]">GitHub Gist 私有多端同步</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isSyncActive
                ? 'text-[#34C759] bg-emerald-50 border border-emerald-200'
                : 'text-gray-500 bg-gray-100 border border-gray-200'
            }`}
          >
            {isSyncActive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                已连通私有云
              </>
            ) : (
              '未配置'
            )}
          </span>
        </div>

        <p className="text-[11px] text-[#4A4A52] leading-relaxed mb-3">
          使用您的 GitHub 账号（私有 Gist）实现手机与电脑实时同步。数据永久保存在您自己的账号下，安全私密，告别第三方服务阻断。
        </p>

        <form onSubmit={handleSaveSync} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-[#4A4A52] flex items-center gap-1">
                <Lock size={12} className="text-gray-500" />
                <span>GitHub Token (令牌)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowTokenHelp(!showTokenHelp)}
                className="text-[10px] font-semibold text-[#007AFF] hover:underline"
              >
                {showTokenHelp ? '收起教程 ▲' : '如何免费获取？20秒搞定 ▼'}
              </button>
            </div>

            {/* Token Guide Drawer */}
            {showTokenHelp && (
              <div className="mb-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-[11px] text-blue-900 space-y-1 leading-normal animate-slide-up">
                <p className="font-bold">仅需 3 步获取您的私有同步令牌：</p>
                <p>1. 浏览器打开 <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="underline font-semibold text-blue-700">github.com/settings/tokens</a>；</p>
                <p>2. 点击 <strong>Generate new token (classic)</strong>；</p>
                <p>3. 仅勾选 <strong>「gist」</strong> 权限（其他都不用选），点击底部绿色按钮生成并复制粘贴至下方即可。</p>
              </div>
            )}

            <div className="relative flex items-center">
              <input
                type={showSyncToken ? 'text' : 'password'}
                placeholder="ghp_..."
                value={syncToken}
                onChange={(e) => setSyncToken(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#007AFF] transition shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowSyncToken(!showSyncToken)}
                className="absolute right-3 text-[#8E8E9A] hover:text-[#1A1A2E] transition"
              >
                {showSyncToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSyncing}
              className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-bold shadow-xs active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>正在连接 GitHub…</span>
                </>
              ) : (
                <>
                  <Cloud size={14} />
                  <span>{isSyncActive ? '更新 Token 并同步' : '开启 GitHub 私有同步'}</span>
                </>
              )}
            </button>
            {isSyncActive && (
              <button
                type="button"
                onClick={handleDisconnectSync}
                className="px-3 py-2.5 rounded-xl bg-red-50 text-red-500 text-xs font-semibold border border-red-200 active:scale-95 transition"
              >
                断开
              </button>
            )}
          </div>

          {isSyncActive && (
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <div className="text-[11px] text-[#8E8E9A]">
                {syncConfig.lastSyncTime
                  ? `上次同步: ${new Date(syncConfig.lastSyncTime).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}`
                  : '已配置自动同步'}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleManualPull}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold text-[#1A1A2E] hover:bg-gray-50 flex items-center gap-1 active:scale-95 transition"
                >
                  <CloudDownload size={12} className="text-blue-600" />
                  <span>拉取云端</span>
                </button>
                <button
                  type="button"
                  onClick={handleManualPush}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold text-[#1A1A2E] hover:bg-gray-50 flex items-center gap-1 active:scale-95 transition"
                >
                  <CloudUpload size={12} className="text-emerald-600" />
                  <span>推送到云</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* ── DeepSeek AI 视觉识图配置 ── */}
      <div className="card p-4 mb-4 border border-gray-100 bg-gradient-to-br from-white to-blue-50/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <KeyRound size={17} className="text-[#007AFF]" />
            <h2 className="text-sm font-bold text-[#1A1A2E]">DeepSeek AI 识图配置</h2>
          </div>
          {hasDeepSeekKey && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#34C759] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Sparkles size={10} /> AI 已激活
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#8E8E9A] mb-3 leading-relaxed">
          配置后，上传账单截图 / 添加物品图片时将调用视觉大模型真实识别。
          官方识图主力大模型为 <strong className="text-[#007AFF]">deepseek-flash</strong>（注：deepseek-chat 为纯文本模型不支持图像）。
        </p>

        <form onSubmit={handleSaveDeepSeekConfig} className="space-y-2.5">
          {/* API Key */}
          <div>
            <label className="text-[11px] font-semibold text-[#4A4A52] mb-1 block">API Key (令牌)</label>
            <div className="relative flex items-center">
              <input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                className="w-full px-3 py-2 pr-10 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#007AFF] transition"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 text-[#8E8E9A] hover:text-[#1A1A2E] transition"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Model Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-[#4A4A52] block">识图大模型 (Model Name)</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setDeepseekModel('deepseek-flash')}
                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition"
                >
                  官方 flash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeepseekModel('deepseek-ai/deepseek-vl2');
                    setDeepseekBaseUrl('https://api.siliconflow.cn/v1');
                  }}
                  className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100 transition"
                >
                  硅基流动 VL2
                </button>
              </div>
            </div>
            <div className="relative flex items-center">
              <Cpu size={14} className="absolute left-3 text-gray-400" />
              <input
                type="text"
                placeholder="deepseek-flash"
                value={deepseekModel}
                onChange={(e) => setDeepseekModel(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs font-mono outline-none focus:border-[#007AFF] transition"
              />
            </div>
          </div>

          {/* Advanced toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedAi(!showAdvancedAi)}
              className="text-[11px] text-[#007AFF] hover:underline flex items-center gap-1"
            >
              {showAdvancedAi ? '隐藏高级设置 ▲' : '自定义 API 接口地址 (Base URL) ▼'}
            </button>
            {showAdvancedAi && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                <label className="text-[10px] text-[#8E8E9A] mb-1 block">API Base URL (默认为官方接口)</label>
                <input
                  type="text"
                  placeholder="https://api.deepseek.com"
                  value={deepseekBaseUrl}
                  onChange={(e) => setDeepseekBaseUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#F8F9FA] border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-[#007AFF] transition"
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-bold shadow-xs active:scale-95 transition"
            >
              保存 AI 配置
            </button>
            {hasDeepSeekKey && (
              <button
                type="button"
                onClick={handleClearDeepSeekKey}
                className="px-4 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-semibold border border-red-200 active:scale-95 transition"
              >
                清除
              </button>
            )}
          </div>
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
            <span>清空全部本地数据</span>
          </button>
        </div>
      </div>

      {/* ── 缓存更新与刷新 ── */}
      <div className="card p-4 mb-4 border border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#1A1A2E]">网页版本与更新</h3>
          <p className="text-[11px] text-[#8E8E9A]">若页面未同步最新功能，可清除缓存强制载入</p>
        </div>
        <button
          onClick={handleForceReload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] rounded-xl active:scale-95 transition"
        >
          <RefreshCw size={13} />
          <span>强制刷新</span>
        </button>
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
        <p className="font-bold text-[#1A1A2E]">Bill · 个人财务与物品日均成本工作台</p>
        <p>Version 1.0.0 · Designed for iPhone</p>
        <p className="text-[11px] opacity-75">Clean & Minimalist Design</p>
      </div>
    </div>
  );
}
