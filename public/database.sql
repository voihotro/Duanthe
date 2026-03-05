-- Tạo bảng users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  password VARCHAR(255)
);

-- Tạo bảng customers
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(255),
  note TEXT
);

-- Tạo bảng card_holders
CREATE TABLE IF NOT EXISTS card_holders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  holder_name VARCHAR(255) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Tạo bảng banks
CREATE TABLE IF NOT EXISTS banks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_name VARCHAR(255) NOT NULL,
  pos_fee_percent DECIMAL(5, 2) DEFAULT 0
);

-- Tạo bảng cards
CREATE TABLE IF NOT EXISTS cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  holder_id INT,
  bank_id INT,
  last4 VARCHAR(10),
  credit_limit DECIMAL(15, 2),
  billing_day INT,
  customer_fee_percent DECIMAL(5, 2) DEFAULT 1.7,
  FOREIGN KEY (holder_id) REFERENCES card_holders(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_id) REFERENCES banks(id) ON DELETE SET NULL
);

-- Tạo bảng transactions
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_id INT,
  dao_amount DECIMAL(15, 2),
  bank_fee_percent DECIMAL(5, 2),
  customer_fee_percent DECIMAL(5, 2),
  bank_fee_amount DECIMAL(15, 2),
  customer_fee_amount DECIMAL(15, 2),
  net_profit DECIMAL(15, 2),
  status VARCHAR(50) DEFAULT 'dang_dao',
  dao_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);

-- Tạo bảng settings
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  default_customer_fee_percent DECIMAL(5, 2) DEFAULT 0
);

-- Insert dữ liệu mẫu cho settings
INSERT INTO settings (default_customer_fee_percent) 
SELECT 2.0 WHERE NOT EXISTS (SELECT * FROM settings);

-- Insert dữ liệu mẫu cho users (Mật khẩu là 123)
-- Lưu ý: Bạn nên đổi mật khẩu sau khi đăng nhập
INSERT INTO users (username, password) 
SELECT '0933628822', '123' 
WHERE NOT EXISTS (SELECT * FROM users);
