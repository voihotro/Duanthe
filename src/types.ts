export interface Customer {
  id: number;
  name: string;
  phone: string;
  note: string;
}

export interface CardHolder {
  id: number;
  customer_id: number;
  holder_name: string;
  customer_name?: string;
}

export interface Bank {
  id: number;
  bank_name: string;
  pos_fee_percent: number;
}

export interface Card {
  id: number;
  holder_id: number;
  bank_id: number;
  last4: string;
  credit_limit: number;
  billing_day: number;
  customer_fee_percent?: number;
  holder_name?: string;
  bank_name?: string;
  pos_fee_percent?: number;
  customer_name?: string;
  customer_id?: number;
}

export interface Transaction {
  id: number;
  card_id: number;
  dao_amount: number;
  bank_fee_percent: number;
  customer_fee_percent: number;
  bank_fee_amount: number;
  customer_fee_amount: number;
  net_profit: number;
  status: 'dang_dao' | 'chua_thanh_toan' | 'da_thanh_toan';
  dao_date: string;
  created_at?: string;
  last4?: string;
  bank_name?: string;
  holder_name?: string;
  customer_name?: string;
}

export interface Settings {
  id: number;
  default_customer_fee_percent: number;
}
