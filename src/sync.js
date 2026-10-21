// ── Bill Cloud Sync Manager (GitHub Gist Powered) ──
// Uses GitHub Personal Access Token (with gist scope) for 100% private, reliable, cross-device sync.

const SYNC_CONFIG_KEY = 'bill_gist_sync_config';
const GIST_FILENAME = 'bill-app-data.json';

export function getSyncConfig() {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return {
    token: '',
    gistId: '',
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

export function clearSyncConfig() {
  localStorage.removeItem(SYNC_CONFIG_KEY);
  return {
    token: '',
    gistId: '',
    autoSync: true,
    lastSyncTime: null,
  };
}

function getLocalPayload() {
  const rawItems = localStorage.getItem('bill_items') || '[]';
  const rawBills = localStorage.getItem('bill_bills') || '[]';
  const rawSettings = localStorage.getItem('bill_settings') || '{}';
  const lastUpdated = parseInt(localStorage.getItem('bill_last_updated') || '0', 10) || Date.now();
  return {
    items: JSON.parse(rawItems),
    bills: JSON.parse(rawBills),
    settings: JSON.parse(rawSettings),
    updatedAt: Math.max(lastUpdated, Date.now()),
    version: '1.0',
  };
}

// Find existing Gist containing bill-app-data.json or create a new one
export async function getOrCreateGistId(token) {
  const cleanToken = token.trim();
  const config = getSyncConfig();

  if (config.gistId) {
    return config.gistId;
  }

  // Query user's recent gists to check if one was created on another device
  const listRes = await fetch('https://api.github.com/gists?per_page=30', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err.message || `GitHub Token 验证失败 (${listRes.status})`);
  }

  const gists = await listRes.json();
  const existing = gists.find((g) => g.files && g.files[GIST_FILENAME]);
  if (existing) {
    saveSyncConfig({ gistId: existing.id });
    return existing.id;
  }

  // Not found -> create new secret Gist
  const localPayload = getLocalPayload();
  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'Bill App 个人记账与物品数据同步 (Private)',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(localPayload, null, 2),
        },
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.message || `创建云端 Gist 失败 (${createRes.status})`);
  }

  const newGist = await createRes.json();
  saveSyncConfig({ gistId: newGist.id });
  return newGist.id;
}

// Push local data to GitHub Gist
export async function pushToCloud() {
  const config = getSyncConfig();
  if (!config.token) return { success: false, reason: '未配置 GitHub Token' };

  const gistId = await getOrCreateGistId(config.token);
  const payload = getLocalPayload();

  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${config.token.trim()}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: 'Bill App 个人记账与物品数据同步 (Private)',
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(payload, null, 2),
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Gist 推送失败 (${res.status})`);
  }

  saveSyncConfig({ lastSyncTime: Date.now() });
  return { success: true, timestamp: Date.now() };
}

// Pull from GitHub Gist and merge if newer
export async function pullFromCloud() {
  const config = getSyncConfig();
  if (!config.token) return { updated: false, reason: '未配置 GitHub Token' };

  const gistId = await getOrCreateGistId(config.token);

  const res = await fetch(`https://api.github.com/gists/${gistId}?_t=${Date.now()}`, {
    headers: {
      Authorization: `Bearer ${config.token.trim()}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Gist 获取失败 (${res.status})`);
  }

  const gist = await res.json();
  const file = gist.files && gist.files[GIST_FILENAME];
  if (!file || !file.content) {
    return { updated: false };
  }

  let cloudData;
  try {
    cloudData = JSON.parse(file.content);
  } catch (_) {
    return { updated: false };
  }

  const localUpdated = parseInt(localStorage.getItem('bill_last_updated') || '0', 10);

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

    window.dispatchEvent(new CustomEvent('bill-data-synced', { detail: cloudData }));
    return { updated: true, cloudData };
  } else if (localUpdated > cloudData.updatedAt) {
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
  if (!config.token || !config.autoSync) return;
  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    pushToCloud().catch((err) => console.warn('Auto Gist push failed:', err));
  }, delayMs);
}
