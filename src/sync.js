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

// Pure JavaScript SHA-256 (Works in all environments including non-HTTPS http:// contexts)
function pureSha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const s1h = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const ch = (hash[0] & hash[1]) ^ (~hash[0] & hash[2]);
      const temp1 =
        hash[7] +
        (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
        ((hash[4] & hash[5]) ^ (~hash[4] & hash[6])) +
        k[i] +
        w[i];
      const temp2 = s1h + ((hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Compute deterministic 32-char key from passphrase using pure SHA-256 (compatible with http and https)
export function getStorageKey(passphrase) {
  if (!passphrase) return null;
  const str = 'bill_sync_v1_' + passphrase.trim();
  let binaryStr = str;
  try {
    binaryStr = unescape(encodeURIComponent(str));
  } catch (_) {}
  return pureSha256(binaryStr).slice(0, 32);
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
