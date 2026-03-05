import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, FileText, CreditCard, ChevronRight, ArrowLeft, History, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { Customer, CardHolder, Card, Transaction, Bank } from '../types';
import { apiFetch } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface CustomersProps {
  onAddTransaction: (cardId?: number) => void;
  onEditTransaction?: (transaction: Transaction) => void;
  refreshKey?: number;
}

const Customers: React.FC<CustomersProps> = ({ onAddTransaction, onEditTransaction, refreshKey }) => {
  const { isLoggedIn } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [holders, setHolders] = useState<CardHolder[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  // Add/Edit customer modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newNote, setNewNote] = useState('');

  // Add/Edit card modal
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [newCardBankId, setNewCardBankId] = useState<number | ''>('');
  const [newCardHolderName, setNewCardHolderName] = useState('');
  const [newCardLast4, setNewCardLast4] = useState('');
  const [newCardLimit, setNewCardLimit] = useState<number | ''>('');
  const [newCardBillingDay, setNewCardBillingDay] = useState<number>(1);
  const [newCardCustomerFee, setNewCardCustomerFee] = useState<number>(1.7);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    const [cRes, hRes, crRes, tRes, bRes] = await Promise.all([
      apiFetch('/api/customers'),
      apiFetch('/api/card-holders'),
      apiFetch('/api/cards'),
      apiFetch('/api/transactions'),
      apiFetch('/api/banks')
    ]);
    
    const [cData, hData, crData, tData, bData] = await Promise.all([
      cRes.json(),
      hRes.json(),
      crRes.json(),
      tRes.json(),
      bRes.json()
    ]);

    setCustomers(Array.isArray(cData) ? cData : []);
    setHolders(Array.isArray(hData) ? hData : []);
    setCards(Array.isArray(crData) ? crData : []);
    setTransactions(Array.isArray(tData) ? tData : []);
    setBanks(Array.isArray(bData) ? bData : []);
  };


  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    const method = editingCustomer ? 'PUT' : 'POST';
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
    
    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, phone: newPhone, note: newNote })
    });
    
    if (res.ok) {
      setShowAddModal(false);
      setEditingCustomer(null);
      setNewName('');
      setNewPhone('');
      setNewNote('');
      fetchData();
      if (selectedCustomer && editingCustomer) {
        setSelectedCustomer({ ...selectedCustomer, name: newName, phone: newPhone, note: newNote });
      }
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Không thể lưu khách hàng. Vui lòng thử lại.');
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    setConfirmModal({
      show: true,
      title: 'Xóa khách hàng',
      message: 'Xóa khách hàng sẽ xóa toàn bộ thẻ và giao dịch liên quan. Bạn có chắc chắn muốn xóa?',
      onConfirm: async () => {
        const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setSelectedCustomer(null);
          fetchData();
        } else {
          const errorData = await res.json();
          alert(errorData.error || 'Không thể xóa khách hàng');
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteCard = async (id: number) => {
    setConfirmModal({
      show: true,
      title: 'Xóa thẻ',
      message: 'Xóa thẻ sẽ xóa toàn bộ giao dịch liên quan. Bạn có chắc chắn muốn xóa?',
      onConfirm: async () => {
        const res = await apiFetch(`/api/cards/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setSelectedCard(prev => (prev?.id === id ? null : prev));
          fetchData();
        } else {
          const errorData = await res.json();
          alert(errorData.error || 'Không thể xóa thẻ');
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const handleDeleteTransaction = async (id: number) => {
    setConfirmModal({
      show: true,
      title: 'Xóa giao dịch',
      message: 'Bạn có chắc chắn muốn xóa giao dịch này? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        const res = await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchData();
        } else {
          const errorData = await res.json();
          alert(errorData.error || 'Không thể xóa giao dịch');
        }
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const toggleTransactionStatus = async (t: Transaction) => {
    const statuses: Transaction['status'][] = ['dang_dao', 'chua_thanh_toan', 'da_thanh_toan'];
    const currentIndex = statuses.indexOf(t.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    const res = await apiFetch(`/api/transactions/${t.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    });
    
    if (res.ok) {
      fetchData();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Không thể cập nhật trạng thái giao dịch');
    }
  };

  const startEditCard = (card: Card) => {
    setEditingCard(card);
    setNewCardBankId(card.bank_id);
    setNewCardHolderName(card.holder_name);
    setNewCardLast4(card.last4);
    setNewCardLimit(card.credit_limit || '');
    setNewCardBillingDay(card.billing_day || 1);
    setNewCardCustomerFee(card.customer_fee_percent || 1.7);
    setShowAddCardModal(true);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || newCardBankId === '' || !newCardHolderName || !newCardLast4 || newCardLimit === '') {
      alert('Vui lòng điền đầy đủ thông tin thẻ');
      return;
    }

    try {
      // 1. Create or find holder
      let holderId: number;
      const existingHolder = holders.find(h => 
        h.customer_id === selectedCustomer.id && 
        h.holder_name.toLowerCase().trim() === newCardHolderName.toLowerCase().trim()
      );
      
      if (existingHolder) {
        holderId = existingHolder.id;
      } else {
        const hRes = await apiFetch('/api/card-holders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: selectedCustomer.id, holder_name: newCardHolderName.trim() })
        });
        if (!hRes.ok) throw new Error('Không thể tạo chủ thẻ');
        const hData = await hRes.json();
        holderId = hData.id;
      }

      // 2. Create or Update card
      const method = editingCard ? 'PUT' : 'POST';
      const url = editingCard ? `/api/cards/${editingCard.id}` : '/api/cards';

      const cRes = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holder_id: holderId,
          bank_id: Number(newCardBankId),
          last4: newCardLast4.trim(),
          credit_limit: Number(newCardLimit),
          billing_day: Number(newCardBillingDay),
          customer_fee_percent: Number(newCardCustomerFee)
        })
      });

      if (cRes.ok) {
        setShowAddCardModal(false);
        setEditingCard(null);
        setNewCardBankId('');
        setNewCardHolderName('');
        setNewCardLast4('');
        setNewCardLimit('');
        setNewCardBillingDay(1);
        setNewCardCustomerFee(1.7);
        
        await fetchData();

        // Update selectedCard if we just edited it
        if (editingCard && selectedCard && editingCard.id === selectedCard.id) {
          const updatedBank = banks.find(b => b.id === Number(newCardBankId));
          setSelectedCard(prev => prev ? ({
            ...prev,
            bank_id: Number(newCardBankId),
            bank_name: updatedBank?.bank_name || prev.bank_name,
            pos_fee_percent: updatedBank?.pos_fee_percent || prev.pos_fee_percent,
            holder_name: newCardHolderName,
            last4: newCardLast4,
            credit_limit: Number(newCardLimit),
            billing_day: Number(newCardBillingDay),
            customer_fee_percent: Number(newCardCustomerFee)
          }) : null);
        }
      } else {
        const errorData = await cRes.json();
        alert(errorData.error || 'Không thể lưu thẻ. Vui lòng thử lại.');
      }
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi lưu thẻ');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  const getCustomerCards = (customerId: number) => {
    const customerHolders = holders.filter(h => h.customer_id === customerId);
    return cards.filter(c => customerHolders.some(h => h.id === c.holder_id));
  };

  const getCardTransactions = (cardId: number) => {
    return transactions.filter(t => t.card_id === cardId);
  };

  // Main Render Logic
  return (
    <div className="p-4 pb-24">
      {selectedCard ? (
        /* 1. Card History View */
        <div 
          key="card-view"
          className="animate-in slide-in-from-right-4 duration-300"
        >
          <button 
            onClick={() => setSelectedCard(null)}
              className="flex items-center gap-1 text-bank-blue font-bold mb-6 text-sm"
            >
              <ArrowLeft size={18} /> Quay lại thẻ
            </button>

            <div className="bank-card mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selectedCard.bank_name}</h2>
                  <p className="text-bank-muted font-mono text-xs">****{selectedCard.last4}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-bank-muted uppercase">Hạn mức</p>
                  <p className="font-bold text-bank-blue text-sm">{(selectedCard.credit_limit || 0).toLocaleString('vi-VN')}đ</p>
                  {isLoggedIn && (
                    <div className="flex gap-2 justify-end mt-2">
                      <button 
                        onClick={() => startEditCard(selectedCard)}
                        className="p-1.5 bg-blue-50 text-bank-blue rounded-lg active:scale-95 transition-transform"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCard(selectedCard.id)}
                        className="p-1.5 bg-red-50 text-red-500 rounded-lg active:scale-95 transition-transform"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-[11px] text-bank-muted">
                <span>Chủ thẻ: {selectedCard.holder_name}</span>
                <span>Ngày chốt: {selectedCard.billing_day}</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <History size={16} className="text-bank-blue" /> Lịch sử giao dịch
              </h3>
              {isLoggedIn && (
                <button 
                  onClick={() => onAddTransaction(selectedCard.id)}
                  className="bg-bank-blue text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
                >
                  <Plus size={14} /> Thêm GD
                </button>
              )}
            </div>

            <div className="space-y-3">
              {getCardTransactions(selectedCard.id).length === 0 ? (
                <p className="text-center text-bank-muted py-8 text-xs italic">Chưa có giao dịch nào</p>
              ) : (
                getCardTransactions(selectedCard.id).map(t => (
                  <div key={t.id} className="bg-white p-3 rounded-xl border border-black/5 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm text-bank-blue">{(t.dao_amount || 0).toLocaleString('vi-VN')}đ</p>
                        <p className="text-[10px] text-bank-muted">{t.dao_date}</p>
                      </div>
                      <div className="text-right">
                        <button 
                          onClick={() => toggleTransactionStatus(t)}
                          className={`status-badge status-${t.status} active:scale-95 transition-transform`}
                        >
                          {t.status === 'dang_dao' ? 'Đang đáo' : t.status === 'chua_thanh_toan' ? 'Chưa thanh toán' : 'Đã thanh toán'}
                        </button>
                        <p className="text-[10px] text-green-600 font-bold mt-1">Lợi nhuận: +{(t.net_profit || 0).toLocaleString('vi-VN')}đ</p>
                        {isLoggedIn && (
                          <div className="flex gap-1 justify-end mt-1">
                            {onEditTransaction && (
                              <button 
                                onClick={() => onEditTransaction(t)}
                                className="text-bank-blue p-1"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="text-red-400 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-black/5">
                      <div className="flex justify-between text-[9px]">
                        <span className="text-bank-muted">Chủ thẻ:</span>
                        <span className="font-medium">{t.holder_name}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-bank-muted">Ngân hàng:</span>
                        <span className="font-medium">{t.bank_name}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-bank-muted">Số thẻ:</span>
                        <span className="font-medium font-mono">****{t.last4}</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-bank-muted">Phí POS:</span>
                        <span className="font-medium">{t.bank_fee_percent}% ({(t.bank_fee_amount || 0).toLocaleString('vi-VN')}đ)</span>
                      </div>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-bank-muted">Phí thu khách:</span>
                        <span className="font-medium">{t.customer_fee_percent}% ({(t.customer_fee_amount || 0).toLocaleString('vi-VN')}đ)</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
      ) : selectedCustomer ? (
        /* 2. Customer Detail View */
        <div 
          key="customer-view"
          className="animate-in slide-in-from-right-4 duration-300"
        >
          <div className="flex justify-between items-center mb-6">
            <button 
              onClick={() => setSelectedCustomer(null)}
                className="flex items-center gap-1 text-bank-blue font-bold text-sm"
              >
                <ArrowLeft size={18} /> Quay lại
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingCustomer(selectedCustomer);
                    setNewName(selectedCustomer.name);
                    setNewPhone(selectedCustomer.phone || '');
                    setNewNote(selectedCustomer.note || '');
                    setShowAddModal(true);
                  }}
                  className="p-2 bg-white border border-black/5 rounded-xl text-bank-blue"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                  className="p-2 bg-white border border-black/5 rounded-xl text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="bank-card mb-6">
              <h2 className="text-xl font-bold mb-2">{selectedCustomer.name}</h2>
              <div className="flex items-center gap-2 text-bank-muted mb-4 text-sm">
                <Phone size={14} /> <span>{selectedCustomer.phone || 'Chưa có SĐT'}</span>
              </div>
              {selectedCustomer.note && (
                <div className="bg-bank-bg p-3 rounded-xl text-[11px] text-bank-muted italic">
                  {selectedCustomer.note}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <CreditCard size={16} className="text-bank-blue" /> Danh sách thẻ
              </h3>
              <button 
                onClick={() => {
                  setEditingCard(null);
                  setNewCardHolderName(selectedCustomer.name);
                  setNewCardBankId('');
                  setNewCardLast4('');
                  setNewCardLimit('');
                  setNewCardBillingDay(1);
                  setNewCardCustomerFee(1.7);
                  setShowAddCardModal(true);
                }}
                className="bg-bank-blue text-white px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1"
              >
                <Plus size={14} /> Thêm thẻ
              </button>
            </div>

            <div className="space-y-3">
              {getCustomerCards(selectedCustomer.id).length === 0 ? (
                <p className="text-center text-bank-muted py-8 text-xs italic">Khách hàng chưa có thẻ</p>
              ) : (
                getCustomerCards(selectedCustomer.id).map(card => (
                  <div 
                    key={card.id}
                    onClick={() => setSelectedCard(card)}
                    className="group w-full bank-card flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer relative"
                  >
                    <div className="text-left">
                      <p className="font-bold text-sm">{card.bank_name}</p>
                      <p className="text-[11px] text-bank-muted font-mono">****{card.last4}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2 group-hover:opacity-0 transition-opacity">
                        <p className="text-[9px] text-bank-muted uppercase">Hạn mức</p>
                        <p className="text-xs font-bold text-bank-blue">{(card.credit_limit || 0).toLocaleString('vi-VN')}đ</p>
                      </div>
                      
                      <div className="absolute right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => startEditCard(card)}
                          className="p-1.5 bg-white border border-black/5 rounded-lg text-bank-blue hover:bg-gray-50"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1.5 bg-white border border-black/5 rounded-lg text-red-500 hover:bg-gray-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <ChevronRight size={16} className="text-bank-muted group-hover:opacity-0 transition-opacity" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
      ) : (
        /* 3. Main List View */
        <div 
          key="list-view"
          className="animate-in fade-in duration-300"
        >
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-xl font-bold">Khách hàng</h1>
              {isLoggedIn && (
                <button 
                  onClick={() => {
                    setEditingCustomer(null);
                    setNewName('');
                    setNewPhone('');
                    setNewNote('');
                    setShowAddModal(true);
                  }}
                  className="bg-bank-blue text-white p-2 rounded-xl shadow-md active:scale-95"
                >
                  <UserPlus size={20} />
                </button>
              )}
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-bank-muted" size={16} />
              <input 
                type="text"
                placeholder="Tìm tên hoặc số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-black/5 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-bank-blue/20 transition-all text-sm"
              />
            </div>

            <div className="space-y-3">
              {filteredCustomers.map((customer) => {
                const customerCards = getCustomerCards(customer.id);

                return (
                  <div 
                    key={customer.id} 
                    onClick={() => setSelectedCustomer(customer)}
                    className="group bank-card cursor-pointer active:scale-[0.98] transition-all flex justify-between items-center relative animate-in slide-in-from-bottom-2 duration-300"
                  >
                    <div>
                      <h3 className="font-bold text-sm">{customer.name}</h3>
                      <div className="flex items-center gap-1 text-bank-muted text-[11px]">
                        <Phone size={12} />
                        <span>{customer.phone || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-bank-bg px-2 py-0.5 rounded-lg text-[9px] font-bold text-bank-blue uppercase group-hover:opacity-0 transition-opacity">
                        {customerCards.length} THẺ
                      </div>
                      
                      <div className="absolute right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            setEditingCustomer(customer);
                            setNewName(customer.name);
                            setNewPhone(customer.phone || '');
                            setNewNote(customer.note || '');
                            setShowAddModal(true);
                          }}
                          className="p-1.5 bg-white border border-black/5 rounded-lg text-bank-blue hover:bg-gray-50"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="p-1.5 bg-white border border-black/5 rounded-lg text-red-500 hover:bg-gray-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <ChevronRight size={16} className="text-bank-muted group-hover:opacity-0 transition-opacity" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      )}

      {/* MODALS - Always rendered */}
      
      {/* Add/Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div 
            className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200"
          >
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm">{editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveCustomer} className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Họ và tên</label>
                  <input 
                    placeholder="Tên khách hàng" 
                    value={newName} 
                    onChange={e => setNewName(e.target.value)} 
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-4 outline-none text-sm focus:ring-2 focus:ring-bank-blue/20" 
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Số điện thoại</label>
                  <input 
                    placeholder="Số điện thoại" 
                    value={newPhone} 
                    onChange={e => setNewPhone(e.target.value)} 
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-4 outline-none text-sm focus:ring-2 focus:ring-bank-blue/20" 
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Ghi chú</label>
                  <textarea 
                    placeholder="Ghi chú thêm..." 
                    value={newNote} 
                    onChange={e => setNewNote(e.target.value)} 
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-4 outline-none min-h-[80px] text-sm focus:ring-2 focus:ring-bank-blue/20" 
                  />
                </div>
                <button type="submit" className="w-full bg-bank-blue text-white py-3 rounded-xl font-bold shadow-lg text-sm active:scale-[0.98] transition-all">
                  {editingCustomer ? 'Cập nhật' : 'Lưu khách hàng'}
                </button>
              </form>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
          <div 
            className="bg-white w-full max-w-xs rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in duration-200"
          >
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm">{editingCard ? 'Cập nhật thẻ' : 'Thêm thẻ mới'}</h3>
                <button onClick={() => setShowAddCardModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddCard} className="space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Ngân hàng</label>
                  <select 
                    value={newCardBankId} onChange={e => setNewCardBankId(Number(e.target.value))}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-3 outline-none text-sm focus:ring-2 focus:ring-bank-blue/20" required
                  >
                    <option value="">Chọn ngân hàng</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Tên chủ thẻ</label>
                  <input 
                    placeholder="Tên in trên thẻ" value={newCardHolderName} onChange={e => setNewCardHolderName(e.target.value)}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-3 outline-none text-sm focus:ring-2 focus:ring-bank-blue/20" required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">4 số cuối</label>
                    <input 
                      placeholder="1234" maxLength={4} value={newCardLast4} onChange={e => setNewCardLast4(e.target.value)}
                      className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-3 outline-none text-sm focus:ring-2 focus:ring-bank-blue/20" required
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Ngày chốt</label>
                    <input 
                      type="number" min={1} max={31} value={newCardBillingDay} onChange={e => setNewCardBillingDay(Number(e.target.value))}
                      className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-3 outline-none text-sm focus:ring-2 focus:ring-bank-blue/20" required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Hạn mức</label>
                  <input 
                    type="number" placeholder="50000000" value={newCardLimit} onChange={e => setNewCardLimit(Number(e.target.value))}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-3 outline-none text-sm font-bold text-bank-blue focus:ring-2 focus:ring-bank-blue/20" required
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-bank-muted uppercase mb-1 block">Phí thu khách (%)</label>
                  <input 
                    type="number" step="0.1" value={newCardCustomerFee} onChange={e => setNewCardCustomerFee(Number(e.target.value))}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-2.5 px-3 outline-none text-sm focus:ring-2 focus:ring-bank-blue/20" required
                  />
                </div>
                <button type="submit" className="w-full bg-bank-blue text-white py-3 rounded-xl font-bold shadow-lg text-sm mt-2 active:scale-[0.98] transition-all">
                  {editingCard ? 'Cập nhật thẻ' : 'Lưu thẻ'}
                </button>
              </form>
          </div>
        </div>
      )}

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

export default Customers;
