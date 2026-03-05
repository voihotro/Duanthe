import React from 'react';
import { Home, Users, ArrowLeftRight, Wallet, Settings as SettingsIcon } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'customers', label: 'Khách hàng', icon: Users },
    { id: 'transactions', label: 'Giao dịch', icon: ArrowLeftRight },
    { id: 'debt', label: 'Công nợ', icon: Wallet },
    { id: 'settings', label: 'Cài đặt', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/5 px-4 py-2 pb-safe flex justify-between items-center z-50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
          >
            <Icon size={24} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
