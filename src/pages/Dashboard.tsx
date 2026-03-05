import React, { useState, useEffect } from 'react';
import { Bell, Plus, ChevronRight } from 'lucide-react';
import { Transaction, Card } from '../types';
import { apiFetch } from '../services/api';

interface DashboardProps {
  onAddTransaction: (cardId?: number) => void;
  refreshKey?: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onAddTransaction, refreshKey }) => {
  const [stats, setStats] = useState({ monthlyProfit: 0 });
  const [upcomingCards, setUpcomingCards] = useState<Card[]>([]);
  const [filterDays, setFilterDays] = useState(5);
  const [cards, setCards] = useState<Card[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchStats();
    fetchData();
  }, [refreshKey]);

  const fetchStats = async () => {
    const res = await apiFetch('/api/stats');
    const data = await res.json();
    setStats(data);
  };

  const fetchData = async () => {
    const [cardsRes, transRes] = await Promise.all([
      apiFetch('/api/cards'),
      apiFetch('/api/transactions')
    ]);
    const cardsData = await cardsRes.json();
    const transData = await transRes.json();
    setCards(Array.isArray(cardsData) ? cardsData : []);
    setTransactions(Array.isArray(transData) ? transData : []);
  };

  useEffect(() => {
    const today = new Date().getDate();
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const filtered = cards.filter(card => {
      let diff = card.billing_day - today;
      // Handle month wrap around if needed, but simple logic for now
      return diff >= 0 && diff <= filterDays;
    });
    setUpcomingCards(filtered);
  }, [cards, filterDays]);

  const hasTransactionThisMonth = (cardId: number) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return transactions.some(t => t.card_id === cardId && t.dao_date.startsWith(currentMonth));
  };

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-bank-blue text-white p-6 rounded-b-[32px] shadow-lg mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-white/70 text-xs">Lợi nhuận tháng này</p>
            <h1 className="text-2xl font-bold">
              {(stats.monthlyProfit || 0).toLocaleString('vi-VN')} <span className="text-sm font-normal">đ</span>
            </h1>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bell size={20} />
          </div>
        </div>
        <button 
          onClick={onAddTransaction}
          className="w-full bg-white text-bank-blue font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Plus size={20} />
          Tạo giao dịch mới
        </button>
      </div>

      {/* Upcoming Cards */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Bell size={16} className="text-orange-500" />
            Thẻ sắp đến hạn
          </h2>
          <select 
            value={filterDays} 
            onChange={(e) => setFilterDays(Number(e.target.value))}
            className="bg-white border border-black/5 rounded-lg px-2 py-1 text-xs font-medium outline-none"
          >
            <option value={5}>5 ngày</option>
            <option value={10}>10 ngày</option>
            <option value={15}>15 ngày</option>
          </select>
        </div>

        <div className="space-y-3">
          {upcomingCards.length === 0 ? (
            <p className="text-center text-bank-muted py-8 text-sm">Không có thẻ nào sắp đến hạn</p>
          ) : (
            upcomingCards.map((card) => {
              const done = hasTransactionThisMonth(card.id);
              return (
                <div 
                  key={card.id} 
                  className="bank-card flex justify-between items-center animate-in fade-in slide-in-from-bottom-2 duration-500"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm">{card.customer_name}</span>
                      <span className="text-[10px] text-bank-muted">• {card.holder_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-bank-bg px-2 py-0.5 rounded font-mono">
                        {card.bank_name} ****{card.last4}
                      </span>
                      <span className="text-xs text-bank-muted">Hạn: {card.billing_day}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${done ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {done ? 'ĐÃ NHẬP' : 'CHƯA NHẬP'}
                    </span>
                    {!done && (
                      <button 
                        onClick={() => onAddTransaction(card.id)}
                        className="text-bank-blue text-xs font-bold flex items-center"
                      >
                        Đáo ngay <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
