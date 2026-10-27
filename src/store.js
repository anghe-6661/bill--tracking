import { DEMO_ITEM_IMAGES } from './assets/demoImages';
import { omitBillScreenshots, triggerDebouncedPush } from './sync';

// Data store using localStorage with initial demo data
const STORAGE_KEYS = {
  ITEMS: 'bill_items',
  BILLS: 'bill_bills',
  SETTINGS: 'bill_settings',
};

// ── Initial Demo Items matching the screenshot ──
const DEMO_ITEMS = [
  {
    id: '1',
    name: '华为 FreeBuds4E2024',
    price: 401.00,
    purchaseDate: '2023-08-06',
    status: 'active',
    retiredDate: null,
    soldDate: null,
    soldPrice: 0,
    category: '数码',
    isPriceless: false,
    image: DEMO_ITEM_IMAGES.freebuds,
    imageColor: '#E8E5DE',
  },
  {
    id: '2',
    name: '98x+5080夜神',
    price: 24777.00,
    purchaseDate: '2026-01-25',
    status: 'active',
    retiredDate: null,
    soldDate: null,
    soldPrice: 0,
    category: '数码',
    isPriceless: false,
    image: DEMO_ITEM_IMAGES.pc,
    imageColor: '#2A1F3D',
  },
  {
    id: '3',
    name: 'samsung fold 7',
    price: 9200.00,
    purchaseDate: '2026-01-25',
    status: 'active',
    retiredDate: null,
    soldDate: null,
    soldPrice: 0,
    category: '数码',
    isPriceless: false,
    image: DEMO_ITEM_IMAGES.fold,
    imageColor: '#D4C5A9',
  },
  {
    id: '4',
    name: 'iwatch S11',
    price: 3299.00,
    purchaseDate: '2026-01-05',
    status: 'active',
    retiredDate: null,
    soldDate: null,
    soldPrice: 0,
    category: '数码',
    isPriceless: true,
    image: DEMO_ITEM_IMAGES.watch,
    imageColor: '#C5D4E8',
  },
  {
    id: '5',
    name: '领克 07GT',
    price: 170000.00,
    purchaseDate: '2026-10-08',
    status: 'active',
    retiredDate: null,
    soldDate: null,
    soldPrice: 0,
    category: '出行',
    isPriceless: false,
    image: DEMO_ITEM_IMAGES.car,
    imageColor: '#E8E8EC',
  },
  {
    id: '6',
    name: 'iPhone 16 Pro 256GB',
    price: 7499.00,
    purchaseDate: '2025-01-05',
    status: 'active',
    retiredDate: null,
    soldDate: null,
    soldPrice: 0,
    category: '数码',
    isPriceless: false,
    image: DEMO_ITEM_IMAGES.iphone,
    imageColor: '#D4DDE8',
  },
];

// ── Initial Demo Bills ──
const today = new Date().toISOString().split('T')[0];
const DEMO_BILLS = [
  {
    id: 'b1',
    merchant: '瑞幸咖啡',
    amount: 18.00,
    category: '餐饮美食',
    time: `${today} 08:32`,
    date: today,
    payMethod: '微信支付',
    screenshot: null,
  },
  {
    id: 'b2',
    merchant: '美团外卖',
    amount: 32.50,
    category: '餐饮美食',
    time: `${today} 12:15`,
    date: today,
    payMethod: '支付宝',
    screenshot: null,
  },
  {
    id: 'b3',
    merchant: '滴滴出行',
    amount: 25.00,
    category: '交通出行',
    time: `${today} 09:10`,
    date: today,
    payMethod: '微信支付',
    screenshot: null,
  },
  {
    id: 'b4',
    merchant: 'Apple Music',
    amount: 11.00,
    category: '数码订阅',
    time: `${today} 00:01`,
    date: today,
    payMethod: '支付宝',
    screenshot: null,
  },
  {
    id: 'b5',
    merchant: '盒马鲜生',
    amount: 45.80,
    category: '日常购物',
    time: `${today} 18:30`,
    date: today,
    payMethod: '支付宝',
    screenshot: null,
  },
];

export const DEFAULT_CATEGORIES = [
  '餐饮美食',
  '交通出行',
  '数码订阅',
  '日常购物',
  '会员',
  '娱乐',
  '医疗健康',
  '其他',
];

const DEFAULT_SETTINGS = {
  dailyBudget: 150,
  currency: '¥',
  categories: [...DEFAULT_CATEGORIES],
  categoryBudgets: {
    餐饮美食: 50,
    日常购物: 40,
    交通出行: 30,
  },
};

export const MONTHLY_BILL_CATEGORIES = ['数码订阅'];

export function isMonthlyBillCategory(name) {
  return MONTHLY_BILL_CATEGORIES.includes(name);
}

// ── Helpers ──
function loadData(key, fallback) {
  try {
    let raw = localStorage.getItem(key);
    // Backward compatibility: migrate legacy youshu_ keys if bill_ keys are not set yet
    if (!raw && key.startsWith('bill_')) {
      const legacyKey = key.replace('bill_', 'youshu_');
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        raw = legacyRaw;
        localStorage.setItem(key, legacyRaw);
        localStorage.removeItem(legacyKey);
      }
    }
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(`Failed to load ${key}:`, e);
  }
  return fallback;
}

function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem('bill_last_updated', Date.now().toString());
    triggerDebouncedPush();
  } catch (e) {
    console.warn(`Failed to save ${key}:`, e);
    throw e;
  }
}

// ── Public API ──
export function getItems() {
  const items = loadData(STORAGE_KEYS.ITEMS, DEMO_ITEMS);
  return items.map((item) => {
    // Previous builds saved hashed Vite asset URLs in localStorage/Gist. Those
    // files disappear on deployment, so resolve only known demo assets again.
    const oldDemoImage = typeof item.image === 'string' &&
      /(?:^|\/)assets\/(?:freebuds|pc|fold|watch|car|iphone)-[^/]+\.jpg(?:\?.*)?$/.test(item.image);
    if (!item.image || oldDemoImage || (typeof item.image === 'string' && item.image.startsWith('data:image/svg'))) {
      const name = item.name.toLowerCase();
      if (name.includes('freebuds') || item.id === '1') item.image = DEMO_ITEM_IMAGES.freebuds;
      else if (name.includes('5080') || name.includes('夜神') || item.id === '2') item.image = DEMO_ITEM_IMAGES.pc;
      else if (name.includes('fold') || item.id === '3') item.image = DEMO_ITEM_IMAGES.fold;
      else if (name.includes('watch') || name.includes('iwatch') || item.id === '4') item.image = DEMO_ITEM_IMAGES.watch;
      else if (name.includes('07gt') || name.includes('领克') || name.includes('车')) item.image = DEMO_ITEM_IMAGES.car;
      else if (name.includes('iphone') || item.id === '6') item.image = DEMO_ITEM_IMAGES.iphone;
    }
    return item;
  });
}

export function saveItems(items) {
  saveData(STORAGE_KEYS.ITEMS, items);
}

export function addItem(item) {
  const items = getItems();
  items.unshift({ ...item, id: Date.now().toString() });
  saveItems(items);
  return items;
}

export function updateItem(id, updates) {
  const items = getItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items[idx] = { ...items[idx], ...updates };
    saveItems(items);
  }
  return items;
}

export function deleteItem(id) {
  const deleted = new Set(JSON.parse(localStorage.getItem('bill_deleted_item_ids') || '[]'));
  deleted.add(String(id));
  localStorage.setItem('bill_deleted_item_ids', JSON.stringify([...deleted]));
  const items = getItems().filter((i) => i.id !== id);
  saveItems(items);
  return items;
}

export function getBills() {
  return loadData(STORAGE_KEYS.BILLS, DEMO_BILLS);
}

export function saveBills(bills) {
  saveData(STORAGE_KEYS.BILLS, omitBillScreenshots(bills));
}

export function addBill(bill) {
  const bills = getBills();
  const entry = { ...bill, id: Date.now().toString() };
  delete entry.screenshot;
  bills.push(entry);
  saveBills(bills);
  return bills;
}

export function deleteBill(id) {
  const deleted = new Set(JSON.parse(localStorage.getItem('bill_deleted_bill_ids') || '[]'));
  deleted.add(String(id));
  localStorage.setItem('bill_deleted_bill_ids', JSON.stringify([...deleted]));
  const bills = getBills().filter((b) => b.id !== id);
  saveBills(bills);
  return bills;
}

function placeBuiltinCategories(categories) {
  const list = [...categories];
  for (const name of DEFAULT_CATEGORIES) {
    if (list.includes(name)) continue;
    const anchor = name === '会员' ? list.indexOf('娱乐') : list.indexOf('其他');
    if (anchor === -1) list.push(name);
    else list.splice(anchor, 0, name);
  }
  return list;
}

export function normalizeSettings(raw = {}) {
  const categories = Array.isArray(raw.categories) && raw.categories.length > 0
    ? placeBuiltinCategories(raw.categories.filter((name) => typeof name === 'string' && name.trim()))
    : [...DEFAULT_CATEGORIES];

  const categoryBudgets = {};
  const sourceBudgets =
    raw.categoryBudgets && typeof raw.categoryBudgets === 'object'
      ? raw.categoryBudgets
      : {};
  Object.entries(sourceBudgets).forEach(([name, amount]) => {
    const value = parseFloat(amount);
    if (!name || isMonthlyBillCategory(name) || !Number.isFinite(value) || value <= 0) {
      return;
    }
    categoryBudgets[name] = value;
  });

  const extraCats = Object.keys(categoryBudgets).filter((name) => !categories.includes(name));
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    dailyBudget: parseFloat(raw.dailyBudget) > 0 ? parseFloat(raw.dailyBudget) : DEFAULT_SETTINGS.dailyBudget,
    categories: [...categories, ...extraCats],
    categoryBudgets,
    settingsUpdatedAt: Number(raw.settingsUpdatedAt) || 0,
  };
}

export function getSettings() {
  return normalizeSettings(loadData(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
}

export function saveSettings(settings) {
  saveData(STORAGE_KEYS.SETTINGS, normalizeSettings({
    ...settings,
    settingsUpdatedAt: Date.now(),
  }));
}

// ── Calculations ──
export function calcDaysUsed(item) {
  const start = new Date(item.purchaseDate);
  let end = new Date();
  if (item.status === 'retired' && item.retiredDate) {
    end = new Date(item.retiredDate);
  } else if (item.status === 'sold' && item.soldDate) {
    end = new Date(item.soldDate);
  }
  const diff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

export function calcCostPerDay(item) {
  if (item.isPriceless) return 0;
  const days = calcDaysUsed(item);
  const cost = item.price - (item.soldPrice || 0);
  return cost / days;
}

export function getTodayBills(bills) {
  const today = new Date().toISOString().split('T')[0];
  return bills.filter((b) => b.date === today);
}

export function getTodaySpent(bills) {
  return getTodayBills(bills)
    .filter((bill) => !isMonthlyBillCategory(bill.category))
    .reduce((sum, b) => sum + b.amount, 0);
}

export function getTodaySpentByCategory(bills) {
  const map = {};
  getTodayBills(bills).forEach((bill) => {
    const cat = bill.category || '其他';
    if (isMonthlyBillCategory(cat)) return;
    map[cat] = (map[cat] || 0) + bill.amount;
  });
  return map;
}

export function getMonthSpent(bills, category) {
  const monthPrefix = new Date().toISOString().split('T')[0].slice(0, 7);
  return bills
    .filter((bill) => {
      if (!bill.date?.startsWith(monthPrefix)) return false;
      if (category) return bill.category === category;
      return true;
    })
    .reduce((sum, bill) => sum + bill.amount, 0);
}

// ── Export / Import ──
export function exportAllData() {
  return JSON.stringify(
    {
      items: getItems(),
      bills: getBills(),
      settings: getSettings(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importAllData(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (data.items && !Array.isArray(data.items)) throw new Error('Invalid items');
  if (data.bills && !Array.isArray(data.bills)) throw new Error('Invalid bills');
  if (data.settings && (typeof data.settings !== 'object' || Array.isArray(data.settings))) {
    throw new Error('Invalid settings');
  }
  localStorage.removeItem('bill_deleted_item_ids');
  localStorage.removeItem('bill_deleted_bill_ids');
  if (data.items) saveItems(data.items);
  if (data.bills) saveBills(data.bills);
  if (data.settings) saveSettings(data.settings);
  return data;
}

export function resetToDemoData() {
  localStorage.removeItem('bill_deleted_item_ids');
  localStorage.removeItem('bill_deleted_bill_ids');
  saveItems(DEMO_ITEMS);
  saveBills(DEMO_BILLS);
  saveSettings(DEFAULT_SETTINGS);
}

export function clearAllData() {
  localStorage.setItem('bill_deleted_item_ids', JSON.stringify(getItems().map((item) => String(item.id))));
  localStorage.setItem('bill_deleted_bill_ids', JSON.stringify(getBills().map((bill) => String(bill.id))));
  saveItems([]);
  saveBills([]);
  saveSettings(DEFAULT_SETTINGS);
}

// ── Category Visuals ──
export const CATEGORY_ICONS = {
  '餐饮美食': '🍜',
  '交通出行': '🚗',
  '数码订阅': '📱',
  '日常购物': '🛒',
  '会员': '👑',
  '娱乐': '🎮',
  '医疗健康': '💊',
  '其他': '📦',
};

export const CATEGORY_COLORS = {
  '餐饮美食': '#FF6B6B',
  '交通出行': '#4ECDC4',
  '数码订阅': '#7C5CFC',
  '日常购物': '#FFB84D',
  '会员': '#C9A227',
  '娱乐': '#FF8ED4',
  '医疗健康': '#45B7D1',
  '其他': '#95A5A6',
};

const CUSTOM_CATEGORY_COLORS = ['#5B8DEF', '#F06595', '#20C997', '#FAB005', '#845EF7', '#FD7E14'];

export function getCategoryIcon(name) {
  return CATEGORY_ICONS[name] || '📦';
}

export function getCategoryColor(name) {
  if (CATEGORY_COLORS[name]) return CATEGORY_COLORS[name];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return CUSTOM_CATEGORY_COLORS[hash % CUSTOM_CATEGORY_COLORS.length];
}

// 旧账单把截图以 data URL 存在本地。打开应用时丢掉图片，不改更新时间，避免同步时盖掉另一台设备的新账单。
function discardStoredBillScreenshots() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (!raw || !raw.includes('data:image')) return;
    const bills = JSON.parse(raw);
    if (!Array.isArray(bills)) return;
    const next = omitBillScreenshots(bills);
    if (next.some((bill, index) => bill !== bills[index])) {
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(next));
    }
  } catch (error) {
    console.warn('Failed to drop bill screenshots:', error);
  }
}

discardStoredBillScreenshots();
