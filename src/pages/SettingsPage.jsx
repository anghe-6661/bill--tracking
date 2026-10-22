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
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Cpu,
  Cloud,
  CloudUpload,
  CloudDownload,
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
  saveSyncConfig,
  clearSyncConfig,
  pushToCloud,
  pullFromCloud,
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

    saveSyncConfig({ token: cleanToken });
    setSyncConfig(getSyncConfig());
    setIsSyncing(true);
    try {
      const res = await pullFromCloud();
      if (res.updated) {
        showToast('已连接多端同步，并拉取了云端最新记录。');
        onRefresh();
      } else {
        await pushToCloud();
        showToast('已连接多端同步，本地数据已备份到云端。');
      }
      closeSyncForm();
    } catch (err) {
      showToast('同步提示: ' + (err.message || '网络异常'));
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

  const handleManualPush = async () => {
    if (!syncConfig.token) return;
    setIsSyncing(true);
    try {
      await pushToCloud();
      showToast('已将本地最新数据推送到云端。');
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
        showToast('已从云端拉取并更新最新数据。');
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
    } catch (_) {}
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
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={17} className="text-[#34C759]" />
          <h2 className="text-sm font-bold text-[#1A1A2E]">数据备份</h2>
        </div>
        <p className="text-xs text-[#8E8E9A] mb-3">
          数据保存在本机浏览器中，可随时导出或导入 JSON 备份。
        </p>

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
            {isSyncActive ? '同步已连接' : '同步未配置'}
            {' · '}
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
                <Cloud size={18} className="text-[#007AFF]" />
                <h2 className="text-sm font-bold text-[#1A1A2E]">多端同步</h2>
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                    已连接
                  </>
                ) : (
                  '未配置'
                )}
              </span>
            </div>

            {isSyncActive && !showSyncForm ? (
              <div className="space-y-3">
                <p className="text-[11px] text-[#8E8E9A]">{lastSyncLabel}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleManualPull}
                    disabled={isSyncing}
                    className="flex-1 px-2.5 py-2 rounded-xl bg-[#F5F6F8] text-[11px] font-semibold text-[#1A1A2E] hover:bg-gray-200 flex items-center justify-center gap-1 active:scale-95 transition disabled:opacity-50"
                  >
                    <CloudDownload size={12} className="text-blue-600" />
                    <span>拉取云端</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleManualPush}
                    disabled={isSyncing}
                    className="flex-1 px-2.5 py-2 rounded-xl bg-[#F5F6F8] text-[11px] font-semibold text-[#1A1A2E] hover:bg-gray-200 flex items-center justify-center gap-1 active:scale-95 transition disabled:opacity-50"
                  >
                    <CloudUpload size={12} className="text-emerald-600" />
                    <span>推送到云</span>
                  </button>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSyncForm(true)}
                    className="text-[11px] font-semibold text-[#007AFF]"
                  >
                    更换 Token
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnectSync}
                    className="text-[11px] font-semibold text-red-500"
                  >
                    断开
                  </button>
                </div>
              </div>
            ) : !isSyncActive && !showSyncForm ? (
              <div>
                <p className="text-[11px] text-[#8E8E9A] leading-relaxed mb-3">
                  手机和电脑使用同一份同步令牌，即可自动备份账单和物品。
                </p>
                <button
                  type="button"
                  onClick={() => setShowSyncForm(true)}
                  className="w-full py-2.5 rounded-xl bg-[#1A1A2E] text-white text-xs font-bold active:scale-95 transition"
                >
                  去配置
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveSync} className="space-y-3">
                <p className="text-[11px] text-[#8E8E9A] leading-relaxed">
                  令牌只用于连接你自己的 GitHub 私有备份，页面不会回显已保存的内容。
                </p>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#4A4A52]">同步令牌</label>
                    <button
                      type="button"
                      onClick={() => setShowTokenHelp(!showTokenHelp)}
                      className="text-[10px] font-semibold text-[#007AFF]"
                    >
                      {showTokenHelp ? '收起教程' : '如何获取'}
                    </button>
                  </div>
                  {showTokenHelp && (
                    <div className="mb-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/60 text-[11px] text-blue-900 space-y-1 leading-normal">
                      <p>1. 打开 <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="underline font-semibold text-blue-700">github.com/settings/tokens</a></p>
                      <p>2. 选择 Generate new token (classic)</p>
                      <p>3. 只勾选 gist 权限，生成后粘贴到下方</p>
                    </div>
                  )}
                  <div className="relative flex items-center">
                    <input
                      type={showSyncToken ? 'text' : 'password'}
                      placeholder="输入新的令牌"
                      value={syncToken}
                      autoComplete="off"
                      onChange={(e) => setSyncToken(e.target.value)}
                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-[#007AFF] transition"
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
                    className="flex-1 py-2.5 rounded-xl bg-[#007AFF] text-white text-xs font-bold active:scale-95 transition disabled:opacity-50"
                  >
                    {isSyncing ? '正在连接…' : isSyncActive ? '保存并同步' : '开启同步'}
                  </button>
                  <button
                    type="button"
                    onClick={closeSyncForm}
                    className="px-3 py-2.5 rounded-xl bg-[#F5F6F8] text-xs font-semibold text-[#4A4A52]"
                  >
                    取消
                  </button>
                </div>
              </form>
            )}
          </div>

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
                  配置后，上传账单截图或物品照片时会自动识别。
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
