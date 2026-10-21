import { useState, useCallback, useEffect } from 'react';
import './index.css';
import BottomNav from './components/BottomNav';
import ItemsPage from './pages/ItemsPage';
import BillsPage from './pages/BillsPage';
import TrendsPage from './pages/TrendsPage';
import SettingsPage from './pages/SettingsPage';
import AddModal from './components/AddModal';
import ItemEditModal from './components/ItemEditModal';
import BillUploadModal from './components/BillUploadModal';
import { pullFromCloud } from './sync';

export default function App() {
  const [activeTab, setActiveTab] = useState('items');
  const [showAddChoiceModal, setShowAddChoiceModal] = useState(false);
  const [showItemCreateModal, setShowItemCreateModal] = useState(false);
  const [showBillUploadModal, setShowBillUploadModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // ── Auto Cloud Sync Lifecycle ──
  useEffect(() => {
    // Initial pull on start
    pullFromCloud().catch(() => {});

    // Listen to background sync update event
    const handleSynced = () => {
      refresh();
    };
    window.addEventListener('bill-data-synced', handleSynced);

    // Pull when tab/screen becomes visible or focused
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pullFromCloud().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // Periodic check every 45 seconds while active
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        pullFromCloud().catch(() => {});
      }
    }, 45000);

    return () => {
      window.removeEventListener('bill-data-synced', handleSynced);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      clearInterval(timer);
    };
  }, [refresh]);

  const renderPage = () => {
    switch (activeTab) {
      case 'items':
        return <ItemsPage key={refreshKey} onRefresh={refresh} />;
      case 'bills':
        return <BillsPage key={refreshKey} onRefresh={refresh} />;
      case 'trends':
        return <TrendsPage key={refreshKey} />;
      case 'settings':
        return <SettingsPage key={refreshKey} onRefresh={refresh} />;
      default:
        return <ItemsPage key={refreshKey} onRefresh={refresh} />;
    }
  };

  return (
    <div className="relative min-h-dvh">
      {/* Active Page View */}
      <main>{renderPage()}</main>

      {/* Floating Bottom Navigation Bar matching screenshot */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAdd={() => setShowAddChoiceModal(true)}
      />

      {/* Quick Add Choices Modal */}
      {showAddChoiceModal && (
        <AddModal
          onClose={() => setShowAddChoiceModal(false)}
          onAddItem={() => {
            setShowAddChoiceModal(false);
            setShowItemCreateModal(true);
          }}
          onAddBill={() => {
            setShowAddChoiceModal(false);
            setShowBillUploadModal(true);
          }}
        />
      )}

      {/* Direct Item Create Modal */}
      {showItemCreateModal && (
        <ItemEditModal
          item={null}
          onClose={() => setShowItemCreateModal(false)}
          onRefresh={() => {
            setActiveTab('items');
            refresh();
          }}
        />
      )}

      {/* Direct Bill Upload Modal */}
      {showBillUploadModal && (
        <BillUploadModal
          onClose={() => setShowBillUploadModal(false)}
          onRefresh={() => {
            setActiveTab('bills');
            refresh();
          }}
        />
      )}
    </div>
  );
}
