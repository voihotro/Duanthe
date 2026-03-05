import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Transactions from './pages/Transactions';
import Debt from './pages/Debt';
import Settings from './pages/Settings';
import TransactionModal from './components/TransactionModal';
import { Transaction } from './types';

const AppContent = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialCardId, setInitialCardId] = useState<number | undefined>(undefined);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { isLoggedIn } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const openModal = (cardId?: number) => {
    setInitialCardId(cardId);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'home': return <Dashboard onAddTransaction={openModal} refreshKey={refreshKey} />;
      case 'customers': return <Customers onAddTransaction={openModal} onEditTransaction={openEditModal} refreshKey={refreshKey} />;
      case 'transactions': return <Transactions onAddTransaction={openModal} refreshKey={refreshKey} />;
      case 'debt': return <Debt refreshKey={refreshKey} />;
      case 'settings': return <Settings />;
      default: return <Dashboard onAddTransaction={openModal} refreshKey={refreshKey} />;
    }
  };

  return (
    <div className="min-h-screen bg-bank-bg max-w-md mx-auto relative shadow-2xl">
      <main className="animate-in fade-in duration-500">
        {renderPage()}
      </main>
      
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {isLoggedIn && (
        <TransactionModal 
          isOpen={isModalOpen} 
          onClose={() => {
            setIsModalOpen(false);
            setInitialCardId(undefined);
            setEditingTransaction(null);
          }} 
          initialCardId={initialCardId}
          initialTransaction={editingTransaction}
          onSuccess={triggerRefresh}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
