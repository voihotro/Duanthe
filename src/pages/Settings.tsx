import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, Percent, Building2, Plus, Trash2, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Bank, Settings as SettingsType } from '../types';
import { apiFetch } from '../services/api';

const Settings: React.FC = () => {
  const { isLoggedIn, login, logout, user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [newBankName, setNewBankName] = useState('');
  const [newBankFee, setNewBankFee] = useState(1.6);
  const [showBanks, setShowBanks] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchBanks();
  }, []);

  const fetchSettings = async () => {
    const res = await apiFetch('/api/settings');
    setSettings(await res.json());
  };

  const fetchBanks = async () => {
    const res = await apiFetch('/api/banks');
    const data = await res.json();
    setBanks(Array.isArray(data) ? data : []);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(username, password);
    if (!success) setError('Sai tài khoản hoặc mật khẩu');
  };

  const updateDefaultFee = async (val: number) => {
    await apiFetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_customer_fee_percent: val })
    });
    fetchSettings();
  };

  const addBank = async () => {
    if (!newBankName) return;
    
    if (editingBank) {
      await apiFetch(`/api/banks/${editingBank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_name: newBankName, pos_fee_percent: newBankFee })
      });
      setEditingBank(null);
    } else {
      await apiFetch('/api/banks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_name: newBankName, pos_fee_percent: newBankFee })
      });
    }
    
    setNewBankName('');
    setNewBankFee(1.6);
    fetchBanks();
  };

  const deleteBank = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ngân hàng này?')) return;
    const res = await apiFetch(`/api/banks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchBanks();
    } else {
      const data = await res.json();
      alert(data.error || 'Có lỗi xảy ra');
    }
  };

  const startEditBank = (bank: Bank) => {
    setEditingBank(bank);
    setNewBankName(bank.bank_name);
    setNewBankFee(bank.pos_fee_percent);
  };

  const cancelEditBank = () => {
    setEditingBank(null);
    setNewBankName('');
    setNewBankFee(1.6);
  };

  if (!isLoggedIn) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-sm bank-card">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-bank-blue rounded-2xl flex items-center justify-center text-white">
              <LogIn size={32} />
            </div>
          </div>
          <h1 className="text-xl font-bold text-center mb-6">Đăng nhập hệ thống</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-bank-muted mb-1 block">TÀI KHOẢN</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
                placeholder="Nhập số điện thoại"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-bank-muted mb-1 block">MẬT KHẨU</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bank-bg border border-black/5 rounded-xl py-3 px-4 outline-none"
                placeholder="••••••"
              />
            </div>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
            <button className="w-full bg-bank-blue text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-transform">
              Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Cài đặt</h1>
        <button onClick={logout} className="text-red-500 flex items-center gap-1 font-bold text-[11px]">
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>

      <div className="bank-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Percent size={18} className="text-bank-blue" />
          <h2 className="font-bold text-sm">Phí mặc định</h2>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="number" 
            step="0.1"
            value={settings?.default_customer_fee_percent || 0}
            onChange={(e) => updateDefaultFee(Number(e.target.value))}
            className="flex-1 bg-bank-bg border border-black/5 rounded-xl py-2 px-4 outline-none font-bold"
          />
          <span className="font-bold text-bank-muted">%</span>
        </div>
        <p className="text-[10px] text-bank-muted mt-2 italic">Áp dụng cho các giao dịch mới tạo.</p>
      </div>

      <div className="bank-card">
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => setShowBanks(!showBanks)}
        >
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-bank-blue" />
            <h2 className="font-bold text-sm">Quản lý ngân hàng</h2>
          </div>
          {showBanks ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
        
        {showBanks && (
          <>
            <div className="space-y-3 mb-6">
              {banks.map(bank => (
                <div key={bank.id} className="group flex justify-between items-center p-3 bg-bank-bg rounded-xl relative">
                  <div>
                    <p className="font-bold text-sm">{bank.bank_name}</p>
                    <p className="text-[10px] text-bank-muted">Phí POS: {bank.pos_fee_percent}%</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute right-3 bg-bank-bg pl-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditBank(bank); }}
                      className="p-1.5 bg-white border border-black/5 rounded-lg text-bank-blue hover:bg-gray-50"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteBank(bank.id); }}
                      className="p-1.5 bg-white border border-black/5 rounded-lg text-red-500 hover:bg-gray-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-black/5 pt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-bank-muted uppercase">
                  {editingBank ? 'Cập nhật ngân hàng' : 'Thêm ngân hàng mới'}
                </h3>
                {editingBank && (
                  <button onClick={cancelEditBank} className="text-red-500 text-[10px] font-bold flex items-center gap-1">
                    <X size={12} /> Hủy
                  </button>
                )}
              </div>
              <input 
                type="text" 
                placeholder="Tên ngân hàng"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="w-full bg-bank-bg border border-black/5 rounded-xl py-2 px-4 outline-none text-sm"
              />
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Phí POS %"
                  value={newBankFee}
                  onChange={(e) => setNewBankFee(Number(e.target.value))}
                  className="flex-1 bg-bank-bg border border-black/5 rounded-xl py-2 px-4 outline-none text-sm"
                />
                <button 
                  onClick={addBank}
                  className="bg-bank-blue text-white p-2 rounded-xl active:scale-95"
                >
                  {editingBank ? <Edit2 size={20} /> : <Plus size={20} />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
