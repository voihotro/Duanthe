import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Download } from 'lucide-react';
import { Transaction, Customer } from '../types';
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../services/api';

interface DebtProps {
  refreshKey?: number;
}

const Debt: React.FC<DebtProps> = ({ refreshKey }) => {
  const { isLoggedIn } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const fetchData = async () => {
    const [tRes, cRes] = await Promise.all([
      apiFetch('/api/transactions'),
      apiFetch('/api/customers')
    ]);
    const tData = await tRes.json();
    const cData = await cRes.json();
    setTransactions(Array.isArray(tData) ? tData : []);
    setCustomers(Array.isArray(cData) ? cData : []);
  };

  const getCustomerStats = (customerId: number) => {
    const customerTrans = transactions.filter(t => {
      // This is a bit inefficient but works for now. 
      // In a real app, we'd have the customer_id in the transaction object from the join.
      return t.customer_name === customers.find(c => c.id === customerId)?.name;
    });

    const totalDao = customerTrans.reduce((sum, t) => sum + t.dao_amount, 0);
    const totalFeeToCollect = customerTrans.filter(t => t.status === 'chua_thanh_toan').reduce((sum, t) => sum + t.customer_fee_amount, 0);
    const totalCollected = customerTrans.filter(t => t.status === 'da_thanh_toan').reduce((sum, t) => sum + t.customer_fee_amount, 0);
    const totalProfit = customerTrans.filter(t => t.status !== 'dang_dao').reduce((sum, t) => sum + t.net_profit, 0);

    return { totalDao, totalFeeToCollect, totalCollected, totalProfit };
  };

  const exportExcel = () => {
    if (!isLoggedIn) return;

    // Sheet 1: General Data
    const sheet1Data = transactions.map(t => ({
      'Khách hàng': t.customer_name,
      'Chủ thẻ': t.holder_name,
      '4 số cuối': t.last4,
      'Ngân hàng': t.bank_name,
      'Số tiền đáo': t.dao_amount,
      'Phí POS': t.bank_fee_amount,
      'Phí thu khách': t.customer_fee_amount,
      'Thực nhận': t.net_profit,
      'Trạng thái': t.status,
      'Ngày đáo': t.dao_date
    }));

    // Sheet 2: Debt
    const sheet2Data = customers.map(c => {
      const stats = getCustomerStats(c.id);
      return {
        'Khách hàng': c.name,
        'Tổng chưa thanh toán': stats.totalFeeToCollect,
        'Tổng đã thu': stats.totalCollected,
        'Tổng lợi nhuận': stats.totalProfit
      };
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
    XLSX.utils.book_append_sheet(wb, ws1, "Du_lieu_chung");
    XLSX.utils.book_append_sheet(wb, ws2, "Cong_no_khach_hang");

    const date = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
    XLSX.writeFile(wb, `quan_ly_dao_the_${date}.xlsx`);
  };

  const totals = {
    dao: transactions.reduce((sum, t) => sum + t.dao_amount, 0),
    debt: transactions.filter(t => t.status === 'chua_thanh_toan').reduce((sum, t) => sum + t.customer_fee_amount, 0),
    collected: transactions.filter(t => t.status === 'da_thanh_toan').reduce((sum, t) => sum + t.customer_fee_amount, 0),
    profit: transactions.filter(t => t.status !== 'dang_dao').reduce((sum, t) => sum + t.net_profit, 0)
  };

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">Công nợ</h1>
        {isLoggedIn && (
          <button 
            onClick={exportExcel}
            className="bg-green-600 text-white p-2 rounded-xl shadow-md active:scale-95 flex items-center gap-2 px-3"
          >
            <Download size={16} />
            <span className="text-xs font-bold">Xuất Excel</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl shadow-sm border border-black/5 p-3 transition-all active:scale-[0.98] bg-bank-blue text-white">
          <DollarSign size={20} className="mb-2 opacity-70" />
          <p className="text-[10px] opacity-70 uppercase">Tổng đã đáo</p>
          <p className="font-bold text-sm">{(totals.dao || 0).toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="rounded-2xl shadow-sm border border-black/5 p-3 transition-all active:scale-[0.98] bg-orange-500 text-white">
          <TrendingDown size={20} className="mb-2 opacity-70" />
          <p className="text-[10px] opacity-70 uppercase">Còn phải thu</p>
          <p className="font-bold text-sm">{(totals.debt || 0).toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="rounded-2xl shadow-sm border border-black/5 p-3 transition-all active:scale-[0.98] bg-green-600 text-white">
          <TrendingUp size={20} className="mb-2 opacity-70" />
          <p className="text-[10px] opacity-70 uppercase">Tổng đã thu</p>
          <p className="font-bold text-sm">{(totals.collected || 0).toLocaleString('vi-VN')}đ</p>
        </div>
        <div className="rounded-2xl shadow-sm border border-black/5 p-3 transition-all active:scale-[0.98] bg-purple-600 text-white">
          <Wallet size={20} className="mb-2 opacity-70" />
          <p className="text-[10px] opacity-70 uppercase">Tổng lợi nhuận</p>
          <p className="font-bold text-sm">{(totals.profit || 0).toLocaleString('vi-VN')}đ</p>
        </div>
      </div>

      <h2 className="text-base font-bold mb-4">Chi tiết theo khách</h2>
      <div className="space-y-4">
        {customers.map(customer => {
          const stats = getCustomerStats(customer.id);
          if (stats.totalDao === 0) return null;

          return (
            <div 
              key={customer.id} 
              className="bank-card animate-in slide-in-from-bottom-2 duration-300"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-sm">{customer.name}</h3>
                {stats.totalFeeToCollect > 0 && (
                  <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[9px] font-bold">
                    NỢ: {(stats.totalFeeToCollect || 0).toLocaleString('vi-VN')}đ
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <div className="text-bank-muted">Tổng đáo:</div>
                <div className="text-right font-medium">{(stats.totalDao || 0).toLocaleString('vi-VN')}đ</div>
                <div className="text-bank-muted">Đã thu:</div>
                <div className="text-right font-medium text-green-600">{(stats.totalCollected || 0).toLocaleString('vi-VN')}đ</div>
                <div className="text-bank-muted">Lợi nhuận:</div>
                <div className="text-right font-medium text-purple-600">{(stats.totalProfit || 0).toLocaleString('vi-VN')}đ</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Debt;
