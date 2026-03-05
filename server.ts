import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");
const JWT_SECRET = "credit-card-manager-jwt-secret-key-v1";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS card_holders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    holder_name TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS banks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank_name TEXT NOT NULL,
    pos_fee_percent REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    holder_id INTEGER,
    bank_id INTEGER,
    last4 TEXT,
    credit_limit REAL,
    billing_day INTEGER,
    customer_fee_percent REAL DEFAULT 1.7,
    FOREIGN KEY (holder_id) REFERENCES card_holders(id),
    FOREIGN KEY (bank_id) REFERENCES banks(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER,
    dao_amount REAL,
    bank_fee_percent REAL,
    customer_fee_percent REAL,
    bank_fee_amount REAL,
    customer_fee_amount REAL,
    net_profit REAL,
    status TEXT DEFAULT 'dang_dao',
    dao_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    default_customer_fee_percent REAL DEFAULT 0
  );
`);

// Migration: Check for missing columns
const tables = ['cards', 'transactions'];
tables.forEach(table => {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  const hasCustomerFee = columns.some(c => c.name === 'customer_fee_percent');
  if (!hasCustomerFee) {
    console.log(`Adding customer_fee_percent to ${table}`);
    db.exec(`ALTER TABLE ${table} ADD COLUMN customer_fee_percent REAL DEFAULT 1.7`);
  }
});

// Seed default user and settings
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
const hashedPassword = bcrypt.hashSync("123", 10);
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run("0933628822", hashedPassword);
} else {
  // Force update password for this specific user to ensure it's '123'
  db.prepare("UPDATE users SET password = ? WHERE username = ?").run(hashedPassword, "0933628822");
}

const settingsCount = db.prepare("SELECT count(*) as count FROM settings").get() as { count: number };
if (settingsCount.count === 0) {
  db.prepare("INSERT INTO settings (default_customer_fee_percent) VALUES (?)").run(2.0);
}

const bankCount = db.prepare("SELECT count(*) as count FROM banks").get() as { count: number };
if (bankCount.count < 10) {
  const defaultBanks = [
    "ABBANK", "ACB", "Agribank", "BIDV", "Eximbank", "GPBank", "HDBank", "HSBC", 
    "Indovina Bank", "Kienlongbank", "LPBank", "MBBank", "MSB", "Sacombank", 
    "Saigonbank", "SeABank", "SHB", "Techcombank", "TPBank", "VIB", "VietBank", 
    "Vietcombank", "VietinBank", "VPBank"
  ];
  const stmt = db.prepare("INSERT OR IGNORE INTO banks (bank_name, pos_fee_percent) VALUES (?, ?)");
  defaultBanks.forEach(bank => stmt.run(bank, 1.5));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.set('trust proxy', 1);

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.userId;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  // Auth Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    console.log("Login attempt:", { username });
    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as any;
    if (user) {
      const isMatch = bcrypt.compareSync(password, user.password);
      if (isMatch) {
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
        res.json({ success: true, username: user.username, token });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/me", (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ loggedIn: false });
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare("SELECT username FROM users WHERE id = ?").get(decoded.userId) as any;
      res.json({ loggedIn: true, user });
    } catch (err) {
      res.json({ loggedIn: false });
    }
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings LIMIT 1").get();
    res.json(settings);
  });

  app.post("/api/settings", requireAuth, (req, res) => {
    const { default_customer_fee_percent } = req.body;
    db.prepare("UPDATE settings SET default_customer_fee_percent = ? WHERE id = 1").run(default_customer_fee_percent);
    res.json({ success: true });
  });

  // Banks
  app.get("/api/banks", (req, res) => {
    const banks = db.prepare("SELECT * FROM banks ORDER BY bank_name ASC").all();
    res.json(banks);
  });

  app.post("/api/banks", requireAuth, (req, res) => {
    const { bank_name, pos_fee_percent } = req.body;
    const result = db.prepare("INSERT INTO banks (bank_name, pos_fee_percent) VALUES (?, ?)").run(bank_name, pos_fee_percent);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/banks/:id", requireAuth, (req, res) => {
    const { bank_name, pos_fee_percent } = req.body;
    db.prepare("UPDATE banks SET bank_name = ?, pos_fee_percent = ? WHERE id = ?").run(bank_name, pos_fee_percent, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/banks/:id", requireAuth, (req, res) => {
    // Check if bank is used in cards
    const count = db.prepare("SELECT count(*) as count FROM cards WHERE bank_id = ?").get(req.params.id) as { count: number };
    if (count.count > 0) {
      return res.status(400).json({ error: "Không thể xóa ngân hàng đã có thẻ liên kết" });
    }
    db.prepare("DELETE FROM banks WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Customers
  app.get("/api/customers", (req, res) => {
    const customers = db.prepare("SELECT * FROM customers ORDER BY name ASC").all();
    res.json(customers);
  });

  app.post("/api/customers", requireAuth, (req, res) => {
    try {
      console.log("POST /api/customers body:", req.body);
      const { name, phone, note } = req.body;
      const result = db.prepare("INSERT INTO customers (name, phone, note) VALUES (?, ?, ?)").run(name, phone, note);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      console.error("Error adding customer:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/customers/:id", requireAuth, (req, res) => {
    try {
      console.log(`PUT /api/customers/${req.params.id} body:`, req.body);
      const { name, phone, note } = req.body;
      db.prepare("UPDATE customers SET name = ?, phone = ?, note = ? WHERE id = ?").run(name, phone, note, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating customer:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/customers/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM transactions WHERE card_id IN (SELECT id FROM cards WHERE holder_id IN (SELECT id FROM card_holders WHERE customer_id = ?))").run(req.params.id);
    db.prepare("DELETE FROM cards WHERE holder_id IN (SELECT id FROM card_holders WHERE customer_id = ?)").run(req.params.id);
    db.prepare("DELETE FROM card_holders WHERE customer_id = ?").run(req.params.id);
    db.prepare("DELETE FROM customers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Card Holders
  app.get("/api/card-holders", (req, res) => {
    const holders = db.prepare(`
      SELECT ch.*, c.name as customer_name 
      FROM card_holders ch 
      JOIN customers c ON ch.customer_id = c.id 
      ORDER BY ch.holder_name ASC
    `).all();
    res.json(holders);
  });

  app.post("/api/card-holders", requireAuth, (req, res) => {
    const { customer_id, holder_name } = req.body;
    const result = db.prepare("INSERT INTO card_holders (customer_id, holder_name) VALUES (?, ?)").run(customer_id, holder_name);
    res.json({ id: result.lastInsertRowid });
  });

  // Cards
  app.get("/api/cards", (req, res) => {
    const cards = db.prepare(`
      SELECT c.*, ch.holder_name, b.bank_name, b.pos_fee_percent, cust.name as customer_name, cust.id as customer_id
      FROM cards c
      JOIN card_holders ch ON c.holder_id = ch.id
      JOIN banks b ON c.bank_id = b.id
      JOIN customers cust ON ch.customer_id = cust.id
      ORDER BY cust.name ASC
    `).all();
    res.json(cards);
  });

  app.post("/api/cards", requireAuth, (req, res) => {
    try {
      console.log("POST /api/cards body:", req.body);
      const { holder_id, bank_id, last4, credit_limit, billing_day, customer_fee_percent } = req.body;
      const result = db.prepare("INSERT INTO cards (holder_id, bank_id, last4, credit_limit, billing_day, customer_fee_percent) VALUES (?, ?, ?, ?, ?, ?)").run(holder_id, bank_id, last4, credit_limit, billing_day, customer_fee_percent || 1.7);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      console.error("Error adding card:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/cards/:id", requireAuth, (req, res) => {
    try {
      console.log(`PUT /api/cards/${req.params.id} body:`, req.body);
      const { holder_id, bank_id, last4, credit_limit, billing_day, customer_fee_percent } = req.body;
      db.prepare("UPDATE cards SET holder_id = ?, bank_id = ?, last4 = ?, credit_limit = ?, billing_day = ?, customer_fee_percent = ? WHERE id = ?").run(holder_id, bank_id, last4, credit_limit, billing_day, customer_fee_percent, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating card:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/cards/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM transactions WHERE card_id = ?").run(req.params.id);
    db.prepare("DELETE FROM cards WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Transactions
  app.get("/api/transactions", (req, res) => {
    const transactions = db.prepare(`
      SELECT t.*, c.last4, b.bank_name, ch.holder_name, cust.name as customer_name
      FROM transactions t
      JOIN cards c ON t.card_id = c.id
      JOIN banks b ON c.bank_id = b.id
      JOIN card_holders ch ON c.holder_id = ch.id
      JOIN customers cust ON ch.customer_id = cust.id
      ORDER BY t.dao_date DESC, t.id DESC
    `).all();
    res.json(transactions);
  });

  app.post("/api/transactions", requireAuth, (req, res) => {
    try {
      console.log("POST /api/transactions body:", req.body);
      const { card_id, dao_amount, bank_fee_percent, customer_fee_percent, bank_fee_amount, customer_fee_amount, net_profit, status, dao_date } = req.body;
      const result = db.prepare(`
        INSERT INTO transactions (card_id, dao_amount, bank_fee_percent, customer_fee_percent, bank_fee_amount, customer_fee_amount, net_profit, status, dao_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(card_id, dao_amount, bank_fee_percent, customer_fee_percent, bank_fee_amount, customer_fee_amount, net_profit, status, dao_date);
      res.json({ id: result.lastInsertRowid });
    } catch (err: any) {
      console.error("Error adding transaction:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/transactions/:id/status", requireAuth, (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE transactions SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/transactions/:id", requireAuth, (req, res) => {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Dashboard Stats
  app.get("/api/stats", (req, res) => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthlyProfit = db.prepare(`
      SELECT SUM(net_profit) as total 
      FROM transactions 
      WHERE dao_date LIKE ? AND status != 'dang_dao'
    `).get(currentMonth + "%") as any;

    res.json({
      monthlyProfit: monthlyProfit.total || 0
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
