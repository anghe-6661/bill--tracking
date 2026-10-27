// Each browser, including an installed iOS home-screen app, owns separate storage.
const KEY = 'bill_gist_sync_config';
const FILE = 'bill-app-data.json';
const API = 'https://api.github.com/gists';
const defaults = () => ({ token: '', gistId: '', autoSync: true, lastSyncTime: null, lastSyncedDataAt: 0, lastError: '' });

export function getSyncConfig() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return defaults(); }
}
export function saveSyncConfig(updates) {
  const next = { ...getSyncConfig(), ...updates };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
export function clearSyncConfig() {
  localStorage.removeItem(KEY);
  return defaults();
}

const headers = (token) => ({
  Authorization: `Bearer ${token.trim()}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
});

// GitHub 原始报错对使用者不友好，翻译成带自助指引的提示；未匹配的保留原文。
export function friendlySyncError(error) {
  const raw = (error && error.message) || '';
  if (/Bad credentials|HTTP 401/i.test(raw)) {
    return '同步令牌无效或已过期：请到 GitHub 重新生成 classic Token（只勾 gist 权限），再在本页「更换 Token」。';
  }
  if (/云端备份缺失/.test(raw)) {
    return '云端备份缺失（本地数据未受影响）：请「断开同步」后重新连接同一 Token，用本机数据重建云端备份。';
  }
  if (/云端备份为空/.test(raw)) {
    return '云端备份为空（本地数据未受影响）：请「断开同步」后重新连接以重建备份。';
  }
  if (/云端备份格式错误/.test(raw)) {
    return '云端备份格式异常（本地数据未受影响）：请「断开同步」后重新连接。';
  }
  if (/HTTP 404/.test(raw)) {
    return '云端备份不存在或令牌无权访问：请「断开同步」后重新连接。';
  }
  if (/HTTP 403|rate limit/i.test(raw)) {
    return 'GitHub 请求频率受限：请过几分钟再点「立即同步」。';
  }
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(raw)) {
    return '网络连接失败：无法访问 GitHub，请检查网络后点「立即同步」重试。';
  }
  return raw || '同步失败，原因未知';
}

async function jsonOrThrow(res, label) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `${label} (HTTP ${res.status})`);
  return body;
}
function readLocal() {
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || fallback); }
    catch { return JSON.parse(fallback); }
  };
  return {
    items: read('bill_items', '[]'),
    bills: read('bill_bills', '[]'),
    settings: read('bill_settings', '{}'),
    deletedItemIds: read('bill_deleted_item_ids', '[]'),
    deletedBillIds: read('bill_deleted_bill_ids', '[]'),
    updatedAt: Number(localStorage.getItem('bill_last_updated')) || 0,
    version: '1.1',
  };
}
function writeLocal(data) {
  // Avoid store.save*: that would schedule another upload.
  localStorage.setItem('bill_items', JSON.stringify(data.items));
  localStorage.setItem('bill_bills', JSON.stringify(data.bills));
  localStorage.setItem('bill_settings', JSON.stringify(data.settings));
  localStorage.setItem('bill_deleted_item_ids', JSON.stringify(data.deletedItemIds || []));
  localStorage.setItem('bill_deleted_bill_ids', JSON.stringify(data.deletedBillIds || []));
  localStorage.setItem('bill_last_updated', String(data.updatedAt));
  window.dispatchEvent(new CustomEvent('bill-data-synced'));
}
function mergeRecords(cloud, local) {
  const records = new Map();
  for (const record of [...cloud, ...local]) {
    if (record?.id != null) records.set(String(record.id), record);
  }
  return [...records.values()];
}
function asSettings(data) {
  const settings = data?.settings;
  return settings && typeof settings === 'object' && !Array.isArray(settings) ? settings : {};
}
function budgetCount(settings) {
  const budgets = settings.categoryBudgets;
  return budgets && typeof budgets === 'object' && !Array.isArray(budgets) ? Object.keys(budgets).length : 0;
}
// 账单更新时间不能决定预算。分类额度跟着 settingsUpdatedAt 走，避免另一台设备记账后把预算盖掉。
export function pickSettings(cloud, local) {
  const cloudSettings = asSettings(cloud);
  const localSettings = asSettings(local);
  const cloudStamp = Number(cloudSettings.settingsUpdatedAt) || 0;
  const localStamp = Number(localSettings.settingsUpdatedAt) || 0;
  if (localStamp !== cloudStamp) return localStamp > cloudStamp ? localSettings : cloudSettings;
  const localHas = budgetCount(localSettings) > 0;
  const cloudHas = budgetCount(cloudSettings) > 0;
  if (localHas !== cloudHas) return localHas ? localSettings : cloudSettings;
  return (local.updatedAt || 0) >= (cloud.updatedAt || 0) ? localSettings : cloudSettings;
}
function mergeData(cloud, local) {
  const deletedItemIds = [...new Set([...(cloud.deletedItemIds || []), ...(local.deletedItemIds || [])].map(String))];
  const deletedBillIds = [...new Set([...(cloud.deletedBillIds || []), ...(local.deletedBillIds || [])].map(String))];
  return {
    items: mergeRecords(cloud.items, local.items).filter((item) => !deletedItemIds.includes(String(item.id))),
    bills: mergeRecords(cloud.bills, local.bills).filter((bill) => !deletedBillIds.includes(String(bill.id))),
    deletedItemIds,
    deletedBillIds,
    settings: pickSettings(cloud, local),
    updatedAt: Math.max(Date.now(), cloud.updatedAt + 1, local.updatedAt + 1),
    version: '1.1',
  };
}
async function findGist(token) {
  // Gist 列表按更新时间排序、每页 100 条；翻 3 页覆盖 300 条，降低多备份时绑错云端的概率。
  for (let page = 1; page <= 3; page += 1) {
    const list = await jsonOrThrow(
      await fetch(`${API}?per_page=100&page=${page}`, { headers: headers(token) }), 'GitHub Token 验证失败'
    );
    const hit = list.find((gist) => gist.files?.[FILE]);
    if (hit) return hit;
    if (list.length < 100) return undefined;
  }
  return undefined;
}
async function readGist(token, id) {
  const gist = await jsonOrThrow(
    await fetch(`${API}/${id}?_t=${Date.now()}`, { headers: headers(token), cache: 'no-store' }), 'Gist 获取失败'
  );
  const file = gist.files?.[FILE];
  if (!file) throw new Error('云端备份缺失，未覆盖本地数据');
  let content = file.content;
  if (file.truncated && file.raw_url) {
    const rawUrl = new URL(file.raw_url);
    if (rawUrl.protocol !== 'https:' || rawUrl.hostname !== 'gist.githubusercontent.com') {
      throw new Error('云端备份地址异常，未覆盖本地数据');
    }
    // 超过约 1MB 时接口只返回截断内容。raw 地址本身带密钥，不能再附加 Authorization：
    // 该域名不接受带令牌的跨域预检，浏览器会报 Failed to fetch。
    const raw = await fetch(rawUrl, { cache: 'no-store' });
    if (!raw.ok) throw new Error(`完整云端备份读取失败 (HTTP ${raw.status})`);
    content = await raw.text();
  }
  if (!content) throw new Error('云端备份为空，未覆盖本地数据');
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data.items) || !Array.isArray(data.bills) ||
        !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error();
    return { ...data, updatedAt: Number(data.updatedAt) || 0 };
  } catch {
    throw new Error('云端备份格式错误，未覆盖本地数据');
  }
}
async function writeGist(token, id, data) {
  await jsonOrThrow(await fetch(`${API}/${id}`, {
    method: 'PATCH', headers: headers(token),
    body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(data) } } }),
  }), 'Gist 推送失败');
}
async function createGist(token, data) {
  const gist = await jsonOrThrow(await fetch(API, {
    method: 'POST', headers: headers(token),
    body: JSON.stringify({
      description: 'Bill App 个人记账与物品数据同步', public: false,
      files: { [FILE]: { content: JSON.stringify(data) } },
    }),
  }), '创建云端 Gist 失败');
  return gist.id;
}

// First connection preserves unique records from both sides. It must finish
// before storing the token, so a failed connection cannot start auto-upload.
export async function connectSync(token) {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error('请输入同步令牌');
  const existing = await findGist(cleanToken);
  const local = readLocal();
  let gistId;
  let result;
  if (existing) {
    gistId = existing.id;
    result = mergeData(await readGist(cleanToken, gistId), local);
    await writeGist(cleanToken, gistId, result);
  } else {
    result = { ...local, updatedAt: Math.max(Date.now(), local.updatedAt + 1) };
    gistId = await createGist(cleanToken, result);
  }
  writeLocal(result);
  saveSyncConfig({ token: cleanToken, gistId, lastSyncTime: Date.now(), lastSyncedDataAt: result.updatedAt, lastError: '' });
  return { updated: true, created: !existing };
}
export async function getOrCreateGistId(token) {
  const config = getSyncConfig();
  if (config.gistId) return config.gistId;
  await connectSync(token);
  return getSyncConfig().gistId;
}

let inFlight = null;
async function syncNow() {
  const config = getSyncConfig();
  if (!config.token) return { updated: false, reason: '未配置 GitHub Token' };
  try {
    const id = config.gistId || await getOrCreateGistId(config.token);
    const cloud = await readGist(config.token, id);
    const local = readLocal();
    const settings = pickSettings(cloud, local);
    let result = cloud;
    let updated = false;
    let pushed = false;
    if (local.updatedAt > config.lastSyncedDataAt && cloud.updatedAt > config.lastSyncedDataAt) {
      result = mergeData(cloud, local);
      await writeGist(config.token, id, result);
      writeLocal(result);
      updated = pushed = true;
    } else if (cloud.updatedAt > local.updatedAt) {
      result = { ...cloud, settings };
      writeLocal(result);
      updated = true;
      if (settings !== cloud.settings) {
        result = { ...result, updatedAt: Date.now() };
        await writeGist(config.token, id, result);
        writeLocal(result);
        pushed = true;
      }
    } else if (local.updatedAt > cloud.updatedAt) {
      result = { ...local, settings };
      if (settings !== local.settings) result = { ...result, updatedAt: Date.now() };
      await writeGist(config.token, id, result);
      if (settings !== local.settings) writeLocal(result);
      pushed = true;
    } else if (settings !== local.settings || settings !== cloud.settings) {
      result = { ...local, settings, updatedAt: Date.now() };
      await writeGist(config.token, id, result);
      writeLocal(result);
      updated = pushed = true;
    }
    saveSyncConfig({ lastSyncTime: Date.now(), lastSyncedDataAt: result.updatedAt, lastError: '' });
    return { updated, pushed };
  } catch (error) {
    const message = friendlySyncError(error);
    saveSyncConfig({ lastError: message });
    throw new Error(message);
  }
}
function runSync() {
  if (inFlight) return inFlight;
  inFlight = syncNow().finally(() => { inFlight = null; });
  return inFlight;
}
export function pushToCloud() { return runSync(); }
export function pullFromCloud() { return runSync(); }

let pushTimeout = null;
export function triggerDebouncedPush(delayMs = 1500) {
  const config = getSyncConfig();
  if (!config.token || !config.autoSync) return;
  clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    runSync().catch((error) => console.warn('Auto Gist sync failed:', error));
  }, delayMs);
}
