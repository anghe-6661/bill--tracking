import { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import ItemDetailModal from '../components/ItemDetailModal';
import ItemEditModal from '../components/ItemEditModal';
import { getItems, calcCostPerDay } from '../store';

export default function ItemsPage({ onRefresh }) {
  const items = getItems();

  const [activeTab, setActiveTab] = useState('all'); // all | active | retired | sold
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Modals
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Extract all categories
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category || '其他'));
    return ['all', ...Array.from(set)];
  }, [items]);

  // Filtered & Sorted items
  const displayItems = useMemo(() => {
    let result = [...items];

    if (activeTab !== 'all') {
      result = result.filter((i) => i.status === activeTab);
    }

    if (selectedCategory !== 'all') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case 'cpd_desc':
        result.sort((a, b) => calcCostPerDay(b) - calcCostPerDay(a));
        break;
      case 'cpd_asc':
        result.sort((a, b) => calcCostPerDay(a) - calcCostPerDay(b));
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'date_desc':
        result.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
        break;
      default:
        break;
    }

    return result;
  }, [items, activeTab, selectedCategory, searchQuery, sortBy]);

  return (
    <div
      className="px-4 pb-24 safe-top min-h-screen"
      style={{
        background:
          'radial-gradient(ellipse 100% 65% at 20% -10%, rgba(226, 246, 181, 0.7) 0%, rgba(242, 249, 225, 0.4) 40%, rgba(245, 246, 248, 0) 70%), #F5F6F8',
      }}
    >
      {/* ── 顶部标题区: pt-6 pb-3 flex justify-between items-center, Bill text-[26px] font-bold text-gray-900 ── */}
      <div className="pt-6 pb-3 flex justify-between items-center">
        <h1 className="text-[26px] font-bold text-gray-900 leading-none">Bill</h1>
        <button
          onClick={() => {
            // 收起时清空搜索词，避免列表被不可见的过滤条件卡住
            if (showSearch) setSearchQuery('');
            setShowSearch(!showSearch);
          }}
          className="w-10 h-10 rounded-full border border-black/15 bg-transparent flex items-center justify-center active:scale-95 transition"
          title="搜索"
        >
          <Search className="w-5 h-5 text-gray-800" strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Expandable Search Bar ── */}
      {showSearch && (
        <div className="mb-3 animate-slide-up">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              autoFocus
              placeholder="搜索物品名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-white rounded-xl border border-gray-200 text-sm shadow-2xs outline-none focus:border-[#34C759]"
            />
          </div>
        </div>
      )}

      {/* ── 筛选栏容器: mt-2 mb-4 flex items-center justify-between ── */}
      <div className="mt-2 mb-4 flex items-center justify-between">
        {/* 左侧 4 个胶囊按钮: px-4 py-1.5 rounded-full text-[13px] font-medium, padding: 6px 16px */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {[
            { key: 'all', label: '全部' },
            { key: 'active', label: '服役中' },
            { key: 'retired', label: '已退役' },
            { key: 'sold', label: '已卖出' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all active:scale-95 whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[#1C1C1E] text-white'
                    : 'bg-white text-gray-500 shadow-xs hover:bg-gray-50'
                }`}
                style={{ padding: '6px 16px' }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 右侧三个小图标（排序、筛选、多选）: w-4 h-4 text-gray-700, gap-3 */}
        <div className="flex items-center gap-3 pr-0.5 flex-shrink-0 text-gray-700">
          {/* Icon 1: 排序图标 */}
          <button
            onClick={() => {
              const nextSort =
                sortBy === 'default'
                  ? 'cpd_desc'
                  : sortBy === 'cpd_desc'
                  ? 'cpd_asc'
                  : 'default';
              setSortBy(nextSort);
            }}
            className="p-1 active:scale-90 transition flex items-center justify-center text-gray-700"
            title="排序"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h2M6 6v12M4 18h4" />
              <path d="M14 6l4 4M18 6v12" />
            </svg>
          </button>

          {/* Icon 2: 漏斗滑块筛选图标 */}
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="p-1 active:scale-90 transition flex items-center justify-center text-gray-700"
            title="分类筛选"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />
              <path d="M19 13h3M18 17h4" />
            </svg>
          </button>

          {/* Icon 3: 圆角打勾方框图标 */}
          <button
            onClick={() => alert(`当前共有 ${items.length} 件在册装备`)}
            className="p-1 active:scale-90 transition flex items-center justify-center text-gray-700"
            title="装备清单"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Category selector dropdown if filter opened */}
      {showFilterMenu && (
        <div className="p-3.5 mb-3 rounded-2xl bg-white border border-gray-200/80 shadow-sm animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#1C1C1E]">物品分类筛选</span>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setShowFilterMenu(false);
              }}
              className="text-xs text-[#34C759] font-semibold"
            >
              重置全部
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setSelectedCategory(c);
                  setShowFilterMenu(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  selectedCategory === c
                    ? 'bg-[#18181B] text-white'
                    : 'bg-[#F2F2F7] text-[#4A4A52] hover:bg-gray-200'
                }`}
              >
                {c === 'all' ? '全部' : c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Double-Column Item Cards Grid (完美还原参考图布局，自然充盈屏幕) ── */}
      {displayItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-3.5 items-stretch">
          {displayItems.map((item) => (
            <ItemCard key={item.id} item={item} onClick={setSelectedItem} />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center mt-6">
          <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3 text-2xl">
            📦
          </div>
          <p className="font-bold text-sm text-[#1A1A2E] mb-1">暂无对应物品</p>
          <p className="text-xs text-[#8E8E9A] mb-4">可以点击下方按钮添加新装备并计算每日成本</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#18181B] text-white text-xs font-bold shadow-xs active:scale-95 transition"
          >
            <Plus size={14} />
            <span>添加新物品</span>
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={(it) => setEditingItem(it)}
          onRefresh={onRefresh}
        />
      )}

      {(showAddModal || editingItem) && (
        <ItemEditModal
          item={editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
