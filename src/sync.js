// ── Bill Cloud Sync Manager (KV-backed encrypted/hashed sync) ──

const DEFAULT_BUCKET = 'Y6SxTFDA9hTaKaHGfVjB2K';
const SYNC_CONFIG_KEY = 'bill_sync_config';

export function getSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    passphrase: '',
    bucket: DEFAULT_BUCKET,
    autoSync: true,
    lastSyncTime: null,
  };
}

export function saveSyncConfig(updates) {
  const current = getSyncConfig();
  const next = { ...current, ...updates };
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(next));
  return next;
}

// Compute deterministic 32-char key from passphrase using SHA-256
export async function getStorageKey(passphrase) {
  if (!passphrase) return null;
  const str = 'bill_sync_v1_' + passphrase.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Push local data to cloud
export async function pushToCloud() {
  const config = getSyncConfig();
  if (!config.passphrase) return { success: false, reason: '未设置同步口令' };

  const storageKey = await getStorageKey(config.passphrase);
  const bucket = config.bucket || DEFAULT_BUCKET;
  const url = `https://kvdb.io/${bucket}/${storageKey}`;

  const rawItems = localStorage.getItem('bill_items') || '[]';
  const rawBills = localStorage.getItem('bill_bills') || '[]';
  const rawSettings = localStorage.getItem('bill_settings') || '{}';
  const lastUpdated = parseInt(localStorage.getItem('bill_last_updated') || '0', 10) || Date.now();

  const payload = {
    items: JSON.parse(rawItems),
    bills: JSON.parse(rawBills),
    settings: JSON.parse(rawSettings),
    updatedAt: Math.max(lastUpdated, Date.now()),
    version: '1.0',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`云端同步失败: HTTP ${res.status}`);
  }

  saveSyncConfig({ lastSyncTime: Date.now() });
  return { success: true, timestamp: Date.now() };
}

// Pull cloud data and merge if newer
export async function pullFromCloud() {
  const config = getSyncConfig();
  if (!config.passphrase) return { updated: false, reason: '未设置同步口令' };

  const storageKey = await getStorageKey(config.passphrase);
  const bucket = config.bucket || DEFAULT_BUCKET;
  const url = `https://kvdb.io/${bucket}/${storageKey}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (res.status === 404) {
    // Cloud storage key does not exist yet -> push our local data to initialize
    await pushToCloud();
    return { updated: true, isNew: true };
  }

  if (!res.ok) {
    throw new Error(`获取云端数据失败: HTTP ${res.status}`);
  }

  const cloudData = await res.json();
  if (!cloudData || !cloudData.updatedAt) {
    return { updated: false };
  }

  const localUpdated = parseInt(localStorage.getItem('bill_last_updated') || '0', 10);

  // If cloud data is strictly newer than local data
  if (cloudData.updatedAt > localUpdated) {
    if (Array.isArray(cloudData.items)) {
      localStorage.setItem('bill_items', JSON.stringify(cloudData.items));
    }
    if (Array.isArray(cloudData.bills)) {
      localStorage.setItem('bill_bills', JSON.stringify(cloudData.bills));
    }
    if (cloudData.settings && typeof cloudData.settings === 'object') {
      localStorage.setItem('bill_settings', JSON.stringify(cloudData.settings));
    }
    localStorage.setItem('bill_last_updated', String(cloudData.updatedAt));
    saveSyncConfig({ lastSyncTime: Date.now() });

    // Broadcast sync event to refresh current view
    window.dispatchEvent(new CustomEvent('bill-data-synced', { detail: cloudData }));
    return { updated: true, cloudData };
  } else if (localUpdated > cloudData.updatedAt) {
    // Local data is newer -> push to cloud
    await pushToCloud();
    return { updated: false, pushed: true };
  }

  saveSyncConfig({ lastSyncTime: Date.now() });
  return { updated: false };
}

// Debounced auto-push helper
let pushTimeout = null;
export function triggerDebouncedPush(delayMs = 1500) {
  const config = getSyncConfig();
  if (!config.passphrase || !config.autoSync) return;
  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    pushToCloud().catch((err) => console.warn('Auto sync push failed:', err));
  }, delayMs);
}
