import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Trash2 } from 'lucide-react';
import { Transaction } from '../types';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

interface TransactionsProps {
  onAddTransaction: (cardId?: number) => void;
  refreshKey?: number;
}

const Transactions: React.FC<TransactionsProps> = ({ onAddTransaction, refreshKey }) => {
  const { isLoggedIn } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  useEffect(() => {
    fetchTransactions();
  }, [refreshKey]);

  const fetchTransactions = async () => {
    const res = await apiFetch('/api/transactions');
    const data = await res.json();
    setTransactions(Array.isArray(data) ? data : []);
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    if (!isLoggedIn) return;
    
    const statuses: Transaction['status'][] = ['dang_dao', 'chua_thanh_toan', 'da_thanh_toan'];
    const nextIndex = (statuses.indexOf(currentStatus as any) + 1) % statuses.length;
    const nextStatus = statuses[nextIndex];

    const res = await apiFetch(`/api/transactions/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    
    if (res.ok) {
      fetchTransactions();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Không thể cập nhật trạng thái giao dịch');
    }
  };

  const deleteTransaction = async (id: number) => {
    if (!isLoggedIn) return;
    setConfirmModal({
      show: true,
      title: 'Xóa giao dịch',
      message: 'Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        const res = await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchTransactions();
        } else {
          const errorData = await res.json();
          alert(errorData.error || 'Không thể xóa giao dịch');
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const filtered = transactions.filter(t => {
    const matchesSearch = t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.bank_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesDate = (!fromDate || t.dao_date >= fromDate) && (!toDate || t.dao_date <= toDate);
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'dang_dao': return 'Đang đáo';
      case 'chua_thanh_toan': return 'Chưa thanh toán';
      case 'da_thanh_toan': return 'Đã thanh toán';
      default: return status;
    }
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Giao dịch</h1>
        {isLoggedIn && (
          <button 
            onClick={() => onAddTransaction()}
            className="bg-bank-blue text-white p-2 rounded-xl shadow-md active:scale-95"
          >
            <Plus size={18} />
          </button>
        )}
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-muted" size={18} />
            <input 
              type="text"
              placeholder="Tìm khách hàng, ngân hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-black/5 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-bank-blue/20 transition-all text-sm"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-black/5 rounded-xl px-3 py-3 outline-none text-sm font-medium"
          >
            <option value="all">Tất cả</option>
            <option value="dang_dao">Đang đáo</option>
            <option value="chua_thanh_toan">Chưa trả</option>
            <option value="da_thanh_toan">Đã trả</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-black/5 rounded-xl p-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-bank-muted uppercase">Từ:</span>
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="flex-1 text-xs outline-none bg-transparent"
            />
          </div>
          <div className="bg-white border border-black/5 rounded-xl p-2 flex items-center gap-2">
            <span className="text-[10px] font-bold text-bank-muted uppercase">Đến:</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="flex-1 text-xs outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((t) => (
          <div 
            key={t.id} 
            className="bank-card animate-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{t.customer_name}</span>
                  <span className="text-[9px] text-bank-muted">• {t.holder_name}</span>
                </div>
                <div className="text-xs text-bank-muted">
                  {t.bank_name} ****{t.last4} | {t.dao_date}
                </div>
              </div>
              <button 
                onClick={() => toggleStatus(t.id, t.status)}
                className={`status-badge status-${t.status} active:scale-95 transition-transform`}
              >
                {getStatusLabel(t.status)}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-black/5">
              <div>
                <p className="text-[9px] text-bank-muted uppercase tracking-wider">Số tiền đáo</p>
                <p className="font-bold text-bank-blue text-sm">{(t.dao_amount || 0).toLocaleString('vi-VN')} đ</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-bank-muted uppercase tracking-wider">Lợi nhuận</p>
                <p className="font-bold text-green-600 text-sm">{(t.net_profit || 0).toLocaleString('vi-VN')} đ</p>
              </div>
            </div>

            <div className="flex justify-between items-center mt-3 text-[9px] text-bank-muted">
              <span>Phí POS: {t.bank_fee_percent}% ({(t.bank_fee_amount || 0).toLocaleString('vi-VN')}đ)</span>
              <div className="flex items-center gap-3">
                <span>Phí thu: {t.customer_fee_percent}% ({(t.customer_fee_amount || 0).toLocaleString('vi-VN')}đ)</span>
                {isLoggedIn && (
                  <button onClick={() => deleteTransaction(t.id)} className="text-red-400">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
          <div 
            className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in duration-200"
          >
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-base mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-bank-muted mb-6 leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600 active:scale-95 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-500 text-white shadow-lg shadow-red-200 active:scale-95 transition-all"
                >
                  Đồng ý xóa
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
