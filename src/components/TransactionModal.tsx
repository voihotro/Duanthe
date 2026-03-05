import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, UserPlus } from 'lucide-react';
import { Card, Bank, Customer, CardHolder, Settings, Transaction } from '../types';
import { apiFetch } from '../services/api';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCardId?: number;
  initialTransaction?: Transaction | null;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess, initialCardId, initialTransaction }) => {
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [holders, setHolders] = useState<CardHolder[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedHolderId, setSelectedHolderId] = useState<number | ''>('');
  const [selectedCardId, setSelectedCardId] = useState<number | ''>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [daoDate, setDaoDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<'dang_dao' | 'chua_thanh_toan' | 'da_thanh_toan'>('dang_dao');

  // Manual overrides
  const [posFeePercent, setPosFeePercent] = useState<number>(0);
  const [customerFeePercent, setCustomerFeePercent] = useState<number>(0);

  // New item states
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [showAddHolder, setShowAddHolder] = useState(false);
  const [newHolderName, setNewHolderName] = useState('');

  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardLast4, setNewCardLast4] = useState('');
  const [newCardLimit, setNewCardLimit] = useState<number | ''>('');
  const [newCardBillingDay, setNewCardBillingDay] = useState<number>(1);
  const [newCardBankId, setNewCardBankId] = useState<number | ''>('');

  const hasInitializedFees = useRef(false);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    } else {
      resetForm();
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    const [cRes, hRes, crRes, bRes, sRes] = await Promise.all([
      apiFetch('/api/customers'),
      apiFetch('/api/card-holders'),
      apiFetch('/api/cards'),
      apiFetch('/api/banks'),
      apiFetch('/api/settings')
    ]);
    const cData = await cRes.json();
    const hData = await hRes.json();
    const crData = await crRes.json();
    const bData = await bRes.json();
    const sData = await sRes.json();

    setCustomers(Array.isArray(cData) ? cData : []);
    setHolders(Array.isArray(hData) ? hData : []);
    setCards(Array.isArray(crData) ? crData : []);
    setBanks(Array.isArray(bData) ? bData : []);
    setSettings(sData);
    if (sData && sData.default_customer_fee_percent) {
      setCustomerFeePercent(sData.default_customer_fee_percent);
    }

    if (initialTransaction) {
      const card = crData.find((c: Card) => c.id === initialTransaction.card_id);
      if (card) {
        setSelectedCustomerId(card.customer_id);
        setSelectedHolderId(card.holder_id);
        setSelectedCardId(card.id);
      }
      setAmount(initialTransaction.dao_amount);
      setDaoDate(initialTransaction.dao_date);
      setStatus(initialTransaction.status);
      setPosFeePercent(initialTransaction.bank_fee_percent);
      setCustomerFeePercent(initialTransaction.customer_fee_percent);
      hasInitializedFees.current = true;
    } else if (initialCardId) {
      const card = crData.find((c: Card) => c.id === initialCardId);
      if (card) {
        setSelectedCardId(card.id);
        setSelectedHolderId(card.holder_id);
        setSelectedCustomerId(card.customer_id);
      }
    }
  };

  // ... (handlers for add customer/holder/card remain same)

  const handleAddCustomer = async () => {
    if (!newCustomerName) return;
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomerName.trim(), phone: newCustomerPhone.trim() })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Không thể thêm khách hàng');
      }
      const data = await res.json();
      const newC = { id: data.id, name: newCustomerName.trim(), phone: newCustomerPhone.trim(), note: '' };
      setCustomers([...customers, newC]);
      setSelectedCustomerId(data.id);
      setShowAddCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddHolder = async () => {
    if (!newHolderName || !selectedCustomerId) return;
    try {
      const res = await apiFetch('/api/card-holders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: Number(selectedCustomerId), holder_name: newHolderName.trim() })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Không thể thêm chủ thẻ');
      }
      const data = await res.json();
      const newH = { id: data.id, customer_id: Number(selectedCustomerId), holder_name: newHolderName.trim() };
      setHolders([...holders, newH]);
      setSelectedHolderId(data.id);
      setShowAddHolder(false);
      setNewHolderName('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddCard = async () => {
    if (!newCardLast4 || !selectedHolderId || !newCardBankId) return;
    try {
      const res = await apiFetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          holder_id: Number(selectedHolderId), 
          bank_id: Number(newCardBankId), 
          last4: newCardLast4.trim(), 
          credit_limit: Number(newCardLimit) || 0, 
          billing_day: Number(newCardBillingDay) || 1,
          customer_fee_percent: 1.7
        })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Không thể thêm thẻ');
      }
      const data = await res.json();
      const bank = banks.find(b => b.id === Number(newCardBankId));
      const holder = holders.find(h => h.id === Number(selectedHolderId));
      const customer = customers.find(c => c.id === Number(selectedCustomerId));
      
      const newCr: Card = { 
        id: data.id, 
        holder_id: Number(selectedHolderId), 
        bank_id: Number(newCardBankId), 
        last4: newCardLast4.trim(), 
        credit_limit: Number(newCardLimit) || 0, 
        billing_day: Number(newCardBillingDay) || 1,
        bank_name: bank?.bank_name || '',
        pos_fee_percent: bank?.pos_fee_percent || 0,
        holder_name: holder?.holder_name || '',
        customer_name: customer?.name || '',
        customer_id: customer?.id || 0,
        customer_fee_percent: 1.7
      };
      setCards([...cards, newCr]);
      setSelectedCardId(data.id);
      setShowAddCard(false);
      setNewCardLast4('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const selectedCard = cards.find(c => c.id === Number(selectedCardId));

  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatAmount = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) return '';
    return (Number(clean) || 0).toLocaleString('vi-VN');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setAmount(val ? Number(val) : '');
  };

  useEffect(() => {
    if (selectedCard) {
      if (initialTransaction && selectedCard.id === initialTransaction.card_id && hasInitializedFees.current) {
        hasInitializedFees.current = false;
        return;
      }

      setPosFeePercent(selectedCard.pos_fee_percent || 0);
      if (selectedCard.customer_fee_percent) {
        setCustomerFeePercent(selectedCard.customer_fee_percent);
      }
    }
  }, [selectedCard]);

  const handleSubmit = async () => {
    if (!selectedCardId || !amount || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const daoAmount = Number(amount);
      const bankFeeAmount = (daoAmount * posFeePercent) / 100;
      const customerFeeAmount = (daoAmount * customerFeePercent) / 100;
      const netProfit = customerFeeAmount - bankFeeAmount;

      const payload = {
        card_id: selectedCardId,
        dao_amount: daoAmount,
        bank_fee_percent: posFeePercent,
        customer_fee_percent: customerFeePercent,
        bank_fee_amount: bankFeeAmount,
        customer_fee_amount: customerFeeAmount,
        net_profit: netProfit,
        status,
        dao_date: daoDate
      };

      const url = initialTransaction ? `/api/transactions/${initialTransaction.id}` : '/api/transactions';
      const method = initialTransaction ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
        resetForm();
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Không thể lưu giao dịch. Vui lòng thử lại.');
      }
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi lưu giao dịch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCustomerId('');
    setSelectedHolderId('');
    setSelectedCardId('');
    setAmount('');
    setStatus('dang_dao');
    setDaoDate(new Date().toISOString().slice(0, 10));
    hasInitializedFees.current = false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{initialTransaction ? 'Cập nhật giao dịch' : 'Tạo giao dịch mới'}</h2>
          <button onClick={onClose} className="p-2 bg-bank-bg rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Step 1: Select Customer */}
          <div>
            <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Khách hàng</label>
            <div className="flex gap-2">
              <select 
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                className="flex-1 bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
              >
                <option value="">Chọn khách hàng</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button 
                onClick={() => setShowAddCustomer(true)}
                className="bg-bank-blue text-white p-3 rounded-xl"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>

          {/* Step 2: Select Holder (if customer selected) */}
          {selectedCustomerId && (
            <div>
              <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Chủ thẻ</label>
              <div className="flex gap-2">
                <select 
                  value={selectedHolderId}
                  onChange={(e) => setSelectedHolderId(Number(e.target.value))}
                  className="flex-1 bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
                >
                  <option value="">Chọn chủ thẻ</option>
                  {holders.filter(h => h.customer_id === Number(selectedCustomerId)).map(h => (
                    <option key={h.id} value={h.id}>{h.holder_name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setShowAddHolder(true)}
                  className="bg-bank-blue text-white p-3 rounded-xl"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Card (if holder selected) */}
          {selectedHolderId && (
            <div>
              <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Thẻ</label>
              <div className="flex gap-2">
                <select 
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(Number(e.target.value))}
                  className="flex-1 bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
                >
                  <option value="">Chọn thẻ</option>
                  {cards.filter(c => c.holder_id === Number(selectedHolderId)).map(c => (
                    <option key={c.id} value={c.id}>{c.bank_name} - ****{c.last4}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setShowAddCard(true)}
                  className="bg-bank-blue text-white p-3 rounded-xl"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Transaction Details */}
          {selectedCardId && (
            <div className="space-y-4 pt-4 border-t border-black/5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Số tiền đáo</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={formatAmount(amount.toString())}
                    onChange={handleAmountChange}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none font-bold text-bank-blue"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Ngày đáo</label>
                  <input 
                    type="date"
                    value={daoDate}
                    onChange={(e) => setDaoDate(e.target.value)}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Phí POS (%)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={posFeePercent}
                    onChange={(e) => setPosFeePercent(Number(e.target.value))}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Phí thu (%)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={customerFeePercent}
                    onChange={(e) => setCustomerFeePercent(Number(e.target.value))}
                    className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-bank-muted mb-2 block uppercase tracking-wider">Trạng thái</label>
                <div className="flex gap-2">
                  {(['dang_dao', 'chua_thanh_toan', 'da_thanh_toan'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        status === s ? `status-${s} ring-2 ring-current ring-offset-2` : 'bg-bank-bg text-bank-muted'
                      }`}
                    >
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-bank-bg p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-bank-muted">Phí POS:</span>
                  <span className="font-bold text-red-500">-{( ((Number(amount) || 0) * posFeePercent) / 100 ).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-bank-muted">Phí thu khách:</span>
                  <span className="font-bold text-bank-blue">{( ((Number(amount) || 0) * customerFeePercent) / 100 ).toLocaleString('vi-VN')}đ</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-black/10">
                  <span className="font-bold">Lợi nhuận:</span>
                  <span className="font-bold text-green-600">
                    {( (((Number(amount) || 0) * customerFeePercent) / 100) - (((Number(amount) || 0) * posFeePercent) / 100) ).toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full bg-bank-blue text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform mt-4 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? 'Đang xử lý...' : 'Xác nhận giao dịch'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Popups for adding new items */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 animate-in zoom-in duration-200">
            <h3 className="font-bold mb-4">Thêm khách hàng mới</h3>
            <input placeholder="Tên khách hàng" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 mb-3 outline-none" />
            <input placeholder="Số điện thoại" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 mb-4 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddCustomer(false)} className="flex-1 py-3 font-bold text-bank-muted">Hủy</button>
              <button onClick={handleAddCustomer} className="flex-1 bg-bank-blue text-white py-3 rounded-xl font-bold">Thêm</button>
            </div>
          </div>
        </div>
      )}

      {showAddHolder && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 animate-in zoom-in duration-200">
            <h3 className="font-bold mb-4">Thêm chủ thẻ mới</h3>
            <input placeholder="Tên chủ thẻ" value={newHolderName} onChange={e => setNewHolderName(e.target.value)} className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 mb-4 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddHolder(false)} className="flex-1 py-3 font-bold text-bank-muted">Hủy</button>
              <button onClick={handleAddHolder} className="flex-1 bg-bank-blue text-white py-3 rounded-xl font-bold">Thêm</button>
            </div>
          </div>
        </div>
      )}

      {showAddCard && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 max-h-[80vh] overflow-y-auto animate-in zoom-in duration-200">
            <h3 className="font-bold mb-4">Thêm thẻ mới</h3>
            <select value={newCardBankId} onChange={e => setNewCardBankId(Number(e.target.value))} className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 mb-3 outline-none">
              <option value="">Chọn ngân hàng</option>
              {banks.map(b => <option key={b.id} value={b.id}>{b.bank_name}</option>)}
            </select>
            <input placeholder="4 số cuối" maxLength={4} value={newCardLast4} onChange={e => setNewCardLast4(e.target.value)} className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 mb-3 outline-none" />
            <input placeholder="Hạn mức" type="number" value={newCardLimit} onChange={e => setNewCardLimit(Number(e.target.value))} className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 mb-3 outline-none" />
            <div className="mb-4">
              <label className="text-[10px] font-bold text-bank-muted mb-1 block">NGÀY ĐẾN HẠN (1-31)</label>
              <input type="number" min={1} max={31} value={newCardBillingDay} onChange={e => setNewCardBillingDay(Number(e.target.value))} className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddCard(false)} className="flex-1 py-3 font-bold text-bank-muted">Hủy</button>
              <button onClick={handleAddCard} className="flex-1 bg-bank-blue text-white py-3 rounded-xl font-bold">Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionModal;
