import { Home, Receipt, TrendingUp, Settings, Plus } from 'lucide-react';

const tabs = [
  { key: 'items', label: 'Bill', icon: Home },
  { key: 'bills', label: '账单', icon: Receipt },
  { key: 'trends', label: '趋势', icon: TrendingUp },
  { key: 'settings', label: '设置', icon: Settings },
];

export default function BottomNav({ activeTab, onTabChange, onAdd }) {
  return (
    <div className="bottom-nav">
      {/* ── Left Rounded Capsule with 4 Tabs ── */}
      <div className="nav-capsule">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              <Icon
                size={21}
                strokeWidth={isActive ? 2.3 : 1.9}
                className={isActive ? 'text-[#34C759]' : 'text-[#2A2A35]'}
              />
              <span className={isActive ? 'text-[#34C759]' : 'text-[#2A2A35]'}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Right Floating Circular '+' Button ── */}
      <button
        type="button"
        className="nav-fab"
        onClick={onAdd}
        title="快速添加"
      >
        <Plus size={26} strokeWidth={2.4} className="text-[#1C1C1E]" />
      </button>
    </div>
  );
}
