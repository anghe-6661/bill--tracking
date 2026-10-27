import { useState, useRef } from 'react';
import {
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Sliders,
  Smartphone,
  CheckCircle2,
  Share,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Cpu,
  Cloud,
  KeyRound,
  ChevronDown,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  exportAllData,
  importAllData,
  resetToDemoData,
  clearAllData,
} from '../store';
import BudgetEditor from '../components/BudgetEditor';
import {
  getSyncConfig,
  clearSyncConfig,
  connectSync,
  pushToCloud,
  friendlySyncError,
} from '../sync';

export default function SettingsPage({ onRefresh }) {
  const settings = getSettings();
  const fileInputRef = useRef(null);

  const [successMsg, setSuccessMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [syncConfig, setSyncConfig] = useState(getSyncConfig());
  const [syncToken, setSyncToken] = useState('');
  const [showSyncToken, setShowSyncToken] = useState(false);
  const [showSyncForm, setShowSyncForm] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncActive = Boolean(syncConfig.token);

  const [deepseekKey, setDeepseekKey] = useState('');
  const [deepseekModel, setDeepseekModel] = useState(
    localStorage.getItem('deepseek_model') || 'deepseek-flash'
  );
  const [deepseekBaseUrl, setDeepseekBaseUrl] = useState(
    localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com'
  );
  const [showKey, setShowKey] = useState(false);
  const [showAiForm, setShowAiForm] = useState(false);
  const [showAdvancedAi, setShowAdvancedAi] = useState(false);
  const [hasDeepSeekKey, setHasDeepSeekKey] = useState(
    Boolean(localStorage.getItem('deepseek_api_key'))
  );

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 2500);
  };

  const closeSyncForm = () => {
    setShowSyncForm(false);
    setShowSyncToken(false);
    setShowTokenHelp(false);
    setSyncToken('');
  };

  const closeAiForm = () => {
    setShowAiForm(false);
    setShowKey(false);
    setShowAdvancedAi(false);
    setDeepseekKey('');
  };

  const handleSaveSync = async (e) => {
    e.preventDefault();
    const cleanToken = syncToken.trim();
    if (!cleanToken) {
      showToast('请输入新的同步令牌后再保存。');
      return;
    }

    setIsSyncing(true);
    try {
      await connectSync(cleanToken);
      showToast('已连接，已合并本机与云端物品和账单。');
      onRefresh();
      closeSyncForm();
    } catch (err) {
      showToast('同步提示: ' + friendlySyncError(err));
    } finally {
      setIsSyncing(false);
      setSyncConfig(getSyncConfig());
    }
  };

  const handleDisconnectSync = () => {
    if (!confirm('确定断开多端同步吗？本地数据会保留，但不再自动上传或拉取。')) {
      return;
    }
    clearSyncConfig();
    setSyncConfig(getSyncConfig());
    closeSyncForm();
    showToast('已断开多端同步。');
  };

  const handleManualSync = async () => {
    if (!syncConfig.token) return;
    setIsSyncing(true);
    try {
      const res = await pushToCloud();
      showToast(res.updated ? '已合并本机与云端记录。' : res.pushed ? '已上传本地记录。' : '已是最新。');
      if (res.updated) onRefresh();
      setSyncConfig(getSyncConfig());
    } catch (err) {
      alert('同步失败: ' + friendlySyncError(err));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveDeepSeekConfig = (e) => {
    e.preventDefault();
    const cleanKey = deepseekKey.trim();
    const existingKey = localStorage.getItem('deepseek_api_key') || '';
    const nextKey = cleanKey || existingKey;

    if (!nextKey) {
      showToast('请输入 API Key 后再保存。');
      return;
    }

    localStorage.setItem('deepseek_api_key', nextKey);
    localStorage.setItem('deepseek_model', (deepseekModel || 'deepseek-flash').trim());
    localStorage.setItem(
      'deepseek_base_url',
      (deepseekBaseUrl || 'https://api.deepseek.com').trim()
    );
    setHasDeepSeekKey(true);
    closeAiForm();
    showToast(cleanKey ? 'AI 识图已开启。' : 'AI 识图配置已更新。');
  };

  const handleClearDeepSeekKey = () => {
    if (!confirm('确定关闭 AI 识图吗？之后上传图片将不再调用识别。')) {
      return;
    }
    localStorage.removeItem('deepseek_api_key');
    setHasDeepSeekKey(false);
    closeAiForm();
    showToast('已关闭 AI 识图。');
  };

  const handleForceReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch { /* caches API 不可用时忽略 */ }
    showToast('正在清空缓存并重新载入最新版本...');
    setTimeout(() => {
      window.location.reload(true);
    }, 500);
  };

  const handleSaveBudget = (next) => {
    saveSettings({ ...settings, ...next });
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
      } catch {
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

  const lastSyncLabel = syncConfig.lastSyncTime
    ? `上次同步 ${new Date(syncConfig.lastSyncTime).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
    : '已开启自动同步';

  return (
    <div className="px-4.5 pt-5 pb-32 safe-top">
      <div className="mb-5">
        <h1 className="text-[28px] font-black tracking-tight text-[#1A1A2E]">应用设置</h1>
        <p className="text-xs text-[#8E8E9A]">预算、备份与偏好</p>
      </div>

      {successMsg && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md animate-slide-up">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="card p-4 mb-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-1.5">
          <Sliders size={17} className="text-[#1A1A2E]" />
          <h2 className="text-sm font-bold text-[#1A1A2E]">今日预算</h2>
        </div>
        <p className="text-[11px] text-[#8E8E9A] mb-3">
          设置总预算，并按吃饭、购物等分类拆分额度。订阅按月记账。
        </p>
        <BudgetEditor
          dailyBudget={settings.dailyBudget}
          categoryBudgets={settings.categoryBudgets}
          categories={settings.categories}
          onSave={handleSaveBudget}
          submitLabel="保存预算"
        />
      </div>

      <div className="card p-4 mb-4 border border-gray-100">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Cloud size={18} className="text-[#007AFF]" />
            <h2 className="text-sm font-bold text-[#1A1A2E]">备份与同步</h2>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSyncActive ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
            {isSyncActive ? '已配置' : '未配置'}
          </span>
        </div>
        <p className="text-[11px] text-[#8E8E9A] leading-relaxed mb-3">
          数据保存在本机浏览器，可随时导出或导入 JSON 备份。要自动多端同步，请在 Safari、主屏幕和电脑用同一 GitHub 同步令牌连接；已有物品和账单会合并。
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
        {syncConfig.lastError && <p className="text-[11px] text-red-600 mb-2">上次同步失败：{syncConfig.lastError}</p>}

        {isSyncActive && !showSyncForm ? (
          <>
            <p className="text-[11px] text-[#8E8E9A] mb-2">{lastSyncLabel}</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition disabled:opacity-50"
              >
                <RefreshCw size={14} />
                <span>立即同步</span>
              </button>
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition"
              >
                <Download size={14} />
                <span>导出备份</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition"
              >
                <Upload size={14} />
                <span>导入恢复</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSyncForm(true)}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition"
              >
                <KeyRound size={14} />
                <span>更换 Token</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={handleDisconnectSync} className="text-[11px] font-semibold text-red-500">断开同步</button>
            </div>
          </>
        ) : !showSyncForm ? (
          <>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition"
              >
                <Download size={14} />
                <span>导出备份</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] active:scale-95 transition"
              >
                <Upload size={14} />
                <span>导入恢复</span>
              </button>
            </div>
            <button type="button" onClick={() => setShowSyncForm(true)} className="w-full py-2.5 rounded-xl bg-[#1A1A2E] text-white text-xs font-bold">连接同步</button>
          </>
        ) : (
          <form onSubmit={handleSaveSync} className="space-y-3">
            <p className="text-[11px] text-[#8E8E9A]">令牌保存在本机浏览器；GitHub Gist 备份不加密，请妥善保管令牌与备份链接。</p>
            <button type="button" onClick={() => setShowTokenHelp(!showTokenHelp)} className="text-[11px] text-[#007AFF]">{showTokenHelp ? '收起教程' : '如何获取 GitHub Token'}</button>
            {showTokenHelp && <p className="text-[11px] text-[#4A4A52]">打开 <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="underline">GitHub Token 设置</a>，生成 classic Token，只勾选 gist 权限。</p>}
            <div className="flex gap-2">
              <input type={showSyncToken ? 'text' : 'password'} value={syncToken} onChange={(e) => setSyncToken(e.target.value)} placeholder="输入新的同步令牌" autoComplete="off" className="min-w-0 flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs" />
              <button type="button" onClick={() => setShowSyncToken(!showSyncToken)} aria-label={showSyncToken ? '隐藏令牌' : '显示令牌'}>{showSyncToken ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={isSyncing} className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-bold disabled:opacity-50">{isSyncing ? '正在连接…' : '连接并合并'}</button>
              <button type="button" onClick={closeSyncForm} className="px-3 py-2.5 rounded-xl bg-[#F5F6F8] text-xs">取消</button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-gray-100">
          <button
            onClick={handleResetDemo}
            className="flex items-center justify-center gap-1 p-2 rounded-lg text-[11px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            <RotateCcw size={12} />
            <span>重置演示数据</span>
          </button>
          <button
            onClick={handleClear}
            className="flex items-center justify-center gap-1 p-2 rounded-lg text-[11px] font-semibold text-red-500 hover:bg-red-50"
          >
            <Trash2 size={12} />
            <span>清空本地数据</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced((open) => !open)}
        className="w-full card p-4 mb-4 border border-gray-100 flex items-center justify-between text-left active:scale-[0.99] transition"
        aria-expanded={showAdvanced}
      >
        <div>
          <h2 className="text-sm font-bold text-[#1A1A2E]">高级设置</h2>
          <p className="text-[11px] text-[#8E8E9A] mt-0.5">
            {hasDeepSeekKey ? 'AI 已开启' : 'AI 未开启'}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`text-[#8E8E9A] transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
        />
      </button>

      {showAdvanced && (
        <>
          <div className="card p-4 mb-4 border border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-[#007AFF]" />
                <h2 className="text-sm font-bold text-[#1A1A2E]">AI 识图</h2>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  hasDeepSeekKey
                    ? 'text-[#34C759] bg-emerald-50 border border-emerald-200'
                    : 'text-gray-500 bg-gray-100 border border-gray-200'
                }`}
              >
                {hasDeepSeekKey ? '已开启' : '未开启'}
              </span>
            </div>

            {hasDeepSeekKey && !showAiForm ? (
              <div className="space-y-3">
                <p className="text-[11px] text-[#8E8E9A]">当前模型 {deepseekModel}</p>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowAiForm(true)}
                    className="text-[11px] font-semibold text-[#007AFF]"
                  >
                    更换配置
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDeepSeekKey}
                    className="text-[11px] font-semibold text-red-500"
                  >
                    关闭
                  </button>
                </div>
              </div>
            ) : !hasDeepSeekKey && !showAiForm ? (
              <div>
                <p className="text-[11px] text-[#8E8E9A] leading-relaxed mb-3">
                  配置后，上传账单截图时会自动识别商户、金额和分类。
                </p>
                <button
                  type="button"
                  onClick={() => setShowAiForm(true)}
                  className="w-full py-2.5 rounded-xl bg-[#1A1A2E] text-white text-xs font-bold active:scale-95 transition"
                >
                  去配置
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveDeepSeekConfig} className="space-y-2.5">
                <p className="text-[11px] text-[#8E8E9A] leading-relaxed">
                  已保存的密钥不会显示在输入框中。只改模型时可以直接保存。
                </p>
                <div>
                  <label className="text-[11px] font-semibold text-[#4A4A52] mb-1 block">
                    {hasDeepSeekKey ? '新的 API Key（可选）' : 'API Key'}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder={hasDeepSeekKey ? '留空则保留现有密钥' : '输入 API Key'}
                      value={deepseekKey}
                      autoComplete="off"
                      onChange={(e) => setDeepseekKey(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs outline-none focus:border-[#007AFF] transition"
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#4A4A52]">识图模型</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setDeepseekModel('deepseek-flash')}
                        className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
                      >
                        官方 flash
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeepseekModel('deepseek-ai/deepseek-vl2');
                          setDeepseekBaseUrl('https://api.siliconflow.cn/v1');
                        }}
                        className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded"
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
                      className="w-full pl-8 pr-3 py-2 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs outline-none focus:border-[#007AFF] transition"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedAi(!showAdvancedAi)}
                    className="text-[11px] text-[#007AFF]"
                  >
                    {showAdvancedAi ? '隐藏接口地址' : '自定义接口地址'}
                  </button>
                  {showAdvancedAi && (
                    <input
                      type="text"
                      placeholder="https://api.deepseek.com"
                      value={deepseekBaseUrl}
                      onChange={(e) => setDeepseekBaseUrl(e.target.value)}
                      className="mt-1.5 w-full px-3 py-1.5 bg-[#F8F9FA] border border-gray-200 rounded-lg text-xs outline-none focus:border-[#007AFF] transition"
                    />
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-[#007AFF] text-white text-xs font-bold active:scale-95 transition"
                  >
                    保存配置
                  </button>
                  <button
                    type="button"
                    onClick={closeAiForm}
                    className="px-3 py-2 rounded-xl bg-[#F5F6F8] text-xs font-semibold text-[#4A4A52]"
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="card p-4 mb-4 border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-[#1A1A2E]">网页版本与更新</h3>
              <p className="text-[11px] text-[#8E8E9A]">页面未更新时可清除缓存后重载</p>
            </div>
            <button
              onClick={handleForceReload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F6F8] hover:bg-gray-200 text-xs font-bold text-[#1A1A2E] rounded-xl active:scale-95 transition"
            >
              <RefreshCw size={13} />
              <span>强制刷新</span>
            </button>
          </div>
        </>
      )}

      <div className="card p-4 mb-4 border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={17} className="text-[#007AFF]" />
          <h2 className="text-sm font-bold text-[#1A1A2E]">添加到主屏幕</h2>
        </div>
        <p className="text-xs text-[#4A4A52] leading-relaxed mb-3">
          在 iPhone Safari 中打开后，可以像原生应用一样全屏使用。
        </p>
        <div className="space-y-2 text-xs text-[#4A4A52] bg-[#F8F9FA] p-3 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
              1
            </span>
            <span>用 Safari 打开本站</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
              2
            </span>
            <span>
              点底部 <Share size={12} className="inline text-blue-600" /> 分享
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
              3
            </span>
            <span>
              选择 <strong>添加到主屏幕</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 text-center text-[#8E8E9A] text-xs space-y-1">
        <p className="font-bold text-[#1A1A2E]">Bill · 个人财务与物品日均成本工作台</p>
        <p>Version 1.0.0 · Designed for iPhone</p>
      </div>
    </div>
  );
}
