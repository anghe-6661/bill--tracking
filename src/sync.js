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
async function jsonOrThrow(res, label) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `${label} (${res.status})`);
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
function mergeData(cloud, local) {
  const deletedItemIds = [...new Set([...(cloud.deletedItemIds || []), ...(local.deletedItemIds || [])].map(String))];
  const deletedBillIds = [...new Set([...(cloud.deletedBillIds || []), ...(local.deletedBillIds || [])].map(String))];
  return {
    items: mergeRecords(cloud.items, local.items).filter((item) => !deletedItemIds.includes(String(item.id))),
    bills: mergeRecords(cloud.bills, local.bills).filter((bill) => !deletedBillIds.includes(String(bill.id))),
    deletedItemIds,
    deletedBillIds,
    settings: local.updatedAt > cloud.updatedAt ? local.settings : cloud.settings,
    updatedAt: Math.max(Date.now(), cloud.updatedAt + 1, local.updatedAt + 1),
    version: '1.1',
  };
}
async function findGist(token) {
  const list = await jsonOrThrow(
    await fetch(`${API}?per_page=100`, { headers: headers(token) }), 'GitHub Token 验证失败'
  );
  return list.find((gist) => gist.files?.[FILE]);
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
    const raw = await fetch(rawUrl, {
      headers: { Authorization: `Bearer ${token.trim()}` },
      cache: 'no-store',
    });
    if (!raw.ok) throw new Error(`完整云端备份读取失败 (${raw.status})`);
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
    let result = cloud;
    let updated = false;
    let pushed = false;
    if (local.updatedAt > config.lastSyncedDataAt && cloud.updatedAt > config.lastSyncedDataAt) {
      result = mergeData(cloud, local);
      await writeGist(config.token, id, result);
      writeLocal(result);
      updated = pushed = true;
    } else if (cloud.updatedAt > local.updatedAt) {
      writeLocal(cloud);
      updated = true;
    } else if (local.updatedAt > cloud.updatedAt) {
      await writeGist(config.token, id, local);
      result = local;
      pushed = true;
    }
    saveSyncConfig({ lastSyncTime: Date.now(), lastSyncedDataAt: result.updatedAt, lastError: '' });
    return { updated, pushed };
  } catch (error) {
    saveSyncConfig({ lastError: error.message || '网络异常' });
    throw error;
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
