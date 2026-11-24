function selectDelivery(stores, customer, services) {
  const options = [];
  for (const store of stores) {
    for (const svc of services.filter(s => s.covers(store.zone))) {
      const quote = svc.quote(store, customer, cartWeight);
      options.push({
        store, svc,
        score: quote.fee * 0.6 + quote.etaMin * 0.3 + quote.risk * 0.1
      });
    }
  }
  return optimizeAssignment(options); // cheapest feasible per store
}
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
...
const Database = require('better-sqlite3');
const db = new Database('grochr.db');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (...);
...
`);
module.exports = db; const haversine = (a, b) => {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

function quoteRoutes(stores, customer, cartByStore) {
  const partners = getPartners();
  const options = [];
  for (const store of stores) {
    for (const p of partners) {
      const quote = p.quote({ store, customer, items: cartByStore[store.id] });
      if (!quote.feasible) continue;
      const distance = haversine(store, customer);
      options.push({
        storeId: store.id,
        partner: p.name,
        distanceKm: +distance.toFixed(2),
        fee: quote.fee,
        etaMin: quote.etaMin,
        score: quote.fee * 0.6 + quote.etaMin * 0.3 + (quote.risk || 0) * 10
      });
    }
  }
  // pick best per store
  const bestByStore = {};
  for (const o of options) {
    if (!bestByStore[o.storeId] || o.score < bestByStore[o.storeId].score) {
      bestByStore[o.storeId] = o;
    }
  }
  return Object.values(bestByStore);
} 
function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
} // Uber Direct — good for short distances, higher per-km
// DoorDash Drive — cheap base, good mid-range
// Instacart Platform — flat fee, best for large orders / store-heavy
const Database = require('better-sqlite3');
const db = new Database('grochr.db');
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  address TEXT,
  lat REAL,
  lng REAL
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL
);

CREATE TABLE IF NOT EXISTS flyers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  week_start TEXT,
  week_end TEXT,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id INTEGER NOT NULL,
  flyer_id INTEGER,
  name TEXT NOT NULL,
  brand TEXT,
  size TEXT,
  category TEXT,
  price REAL NOT NULL,
  unit_price REAL NOT NULL,
  unit_label TEXT,
  image_url TEXT,
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, product_id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'placed',
  subtotal REAL NOT NULL,
  delivery_total REAL NOT NULL,
  total REAL NOT NULL,
  routing_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  delivery_partner TEXT,
  external_delivery_id TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
`);

module.exports = db; const db = require('./db');

db.exec('DELETE FROM products; DELETE FROM flyers; DELETE FROM stores;');

const stores = [
  { name: 'Fresh Market',   address: '120 State St, Chicago',  lat: 41.885, lng: -87.625 },
  { name: 'Value Grocer',   address: '410 W Erie St, Chicago', lat: 41.900, lng: -87.650 },
  { name: 'Organic Co-op',  address: '900 S Ashland, Chicago', lat: 41.860, lng: -87.680 },
  { name: 'Budget Foods',   address: '2200 N Halsted, Chicago',lat: 41.920, lng: -87.680 }
];

const insertStore = db.prepare('INSERT INTO stores (name,address,lat,lng) VALUES (?,?,?,?)');
const insertFlyer = db.prepare('INSERT INTO flyers (store_id,week_start,week_end) VALUES (?,?,?)');
const insertProduct = db.prepare(`
  INSERT INTO products (store_id,flyer_id,name,brand,size,category,price,unit_price,unit_label,image_url)
  VALUES (@store_id,@flyer_id,@name,@brand,@size,@category,@price,@unit_price,@unit_label,@image_url)
`);

const catalog = [
  // name, brand, size, category, basePricePer100g (unit)  -- price is randomized per store
  ['Chicken Breast', 'Farm Fresh', '1 kg',   'Meat',     0.89, 'per 100g'],
  ['Ground Beef',    'Prime Cut',  '500 g',  'Meat',     1.10, 'per 100g'],
  ['Milk 2%',        'DairyPure',  '2 L',    'Dairy',    0.18, 'per 100ml'],
  ['Cheddar Block',  'Old Mill',   '400 g',  'Dairy',    0.65, 'per 100g'],
  ['Free-Range Eggs','Happy Hen',  '12 ct',  'Dairy',    0.42, 'per egg'],
  ['Bananas',        'Chiquita',   '1 kg',   'Produce',  0.15, 'per 100g'],
  ['Gala Apples',    'Orchard',    '1.5 kg', 'Produce',  0.28, 'per 100g'],
  ['Broccoli',       'GreenLeaf',  '1 head', 'Produce',  0.55, 'per 100g'],
  ['Bread White',    'BakeHouse',  '675 g',  'Bakery',   0.32, 'per 100g'],
  ['Pasta Penne',    'Roma',       '500 g',  'Pantry',   0.30, 'per 100g'],
  ['Tomato Sauce',   'Nonna',      '680 ml', 'Pantry',   0.40, 'per 100ml'],
  ['Olive Oil',      'Verde',      '750 ml', 'Pantry',   1.20, 'per 100ml'],
  ['Coffee Beans',   'Roast Co',   '1 kg',   'Pantry',   1.80, 'per 100g'],
  ['Cereal Oats',    'Morning',    '1 kg',   'Pantry',   0.35, 'per 100g'],
  ['Orange Juice',   'Sunny',      '1.75 L', 'Dairy',    0.22, 'per 100ml']
];

const storeIds = stores.map(s => insertStore.run(s.name, s.address, s.lat, s.lng).lastInsertRowid);

storeIds.forEach((storeId, idx) => {
  const flyerId = insertFlyer.run(storeId, '2026-11-20', '2026-11-26').lastInsertRowid;
  const priceBias = [1.05, 0.88, 1.20, 0.78][idx]; // Fresh, Value, Organic, Budget
  for (const [name, brand, size, category, unitBase, unitLabel] of catalog) {
    const jitter = 0.9 + Math.random() * 0.2;
    const unit_price = +(unitBase * priceBias * jitter).toFixed(3);
    // rough qty to derive pack price
    const qty = parseFloat(size) || 1;
    const price = +(unit_price * qty * (size.includes('ml') ? 10 : size.includes('L') ? 100 : size.includes('kg') ? 10 : 1)).toFixed(2);
    insertProduct.run({
      store_id: storeId, flyer_id: flyerId, name, brand, size, category,
      price, unit_price, unit_label: unitLabel,
      image_url: `https://placehold.co/200x200?text=${encodeURIComponent(name)}`
    });
  }
});

console.log('Seeded', storeIds.length, 'stores with flyers & products.'); const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET = process.env.JWT_SECRET || 'grochr_dev_secret';

function sign(user) {
  return jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { sign, auth, hash: p => bcrypt.hashSync(p, 10), verify: bcrypt.compareSync };// Each adapter exposes:
//   quote({ store, customer, items }) -> { feasible, fee, etaMin }
//   createDelivery({ order, store, items }) -> { externalId, etaMin }
// Real integrations: replace .quote / .createDelivery bodies with
// Uber Direct / DoorDash Drive / Instacart Platform API calls.

const haversine = (a, b) => {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

const UBER = {
  name: 'Uber Direct',
  quote({ store, customer }) {
    const d = haversine(store, customer);
    if (d > 10) return { feasible: false };
    return { feasible: true, fee: +(2.99 + 1.20 * d).toFixed(2), etaMin: Math.round(10 + d * 2.5) };
  },
  createDelivery({ order }) {
    return { externalId: `uber_${order.id}_${Date.now()}`, etaMin: 30 };
  }
};

const DOORDASH = {
  name: 'DoorDash Drive',
  quote({ store, customer }) {
    const d = haversine(store, customer);
    if (d > 15) return { feasible: false };
    return { feasible: true, fee: +(3.75 + 0.85 * d).toFixed(2), etaMin: Math.round(15 + d * 2.0) };
  },
  createDelivery({ order }) {
    return { externalId: `dd_${order.id}_${Date.now()}`, etaMin: 40 };
  }
};

const INSTACART = {
  name: 'Instacart Platform',
  quote({ store, customer, items }) {
    const d = haversine(store, customer);
    if (d > 20) return { feasible: false };
    const weightBonus = Math.min(3, items.reduce((s, i) => s + i.qty, 0) * 0.15);
    return { feasible: true, fee: +(5.50 + 0.55 * d + weightBonus).toFixed(2), etaMin: Math.round(20 + d * 1.5) };
  },
  createDelivery({ order }) {
    return { externalId: `ic_${order.id}_${Date.now()}`, etaMin: 55 };
  }
};

const PARTNERS = [UBER, DOORDASH, INSTACART];
const byName = Object.fromEntries(PARTNERS.map(p => [p.name, p]));

module.exports = { PARTNERS, byName, haversine }; const { PARTNERS, haversine } = require('./deliveryAdapters');

/**
 * Given stores involved in the cart and the customer location,
 * return the best delivery option per store, plus all quotes for transparency.
 *
 * Strategy: for each store, evaluate every partner, discard infeasible,
 * then pick lowest fee (tiebreak: eta).
 */
function planDelivery(stores, customer, itemsByStore) {
  const plan = [];
  for (const store of stores) {
    const items = itemsByStore[store.id] || [];
    const quotes = [];
    for (const partner of PARTNERS) {
      const q = partner.quote({ store, customer, items });
      if (!q.feasible) continue;
      quotes.push({
        partner: partner.name,
        fee: q.fee,
        etaMin: q.etaMin,
        distanceKm: +haversine(store, customer).toFixed(2)
      });
    }
    if (!quotes.length) {
      plan.push({ store, quotes: [], best: null, error: 'No delivery partner available' });
      continue;
    }
    quotes.sort((a, b) => a.fee - b.fee || a.etaMin - b.etaMin);
    plan.push({ store, quotes, best: quotes[0] });
  }
  return plan;
}

module.exports = { planDelivery }; const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const db = require('./db');
const { sign, auth, hash, verify } = require('./auth');
const { planDelivery } = require('./services/routing');
const { byName } = require('./services/deliveryAdapters');

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_CUSTOMER = { lat: 41.8781, lng: -87.6298 }; // Chicago Loop

/* ---------------- Auth ---------------- */
app.post('/api/auth/register', (req, res) => {
  const { email, password, name, address, lat, lng } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email & password required' });
  try {
    const info = db.prepare(`
      INSERT INTO users (email,password_hash,name,address,lat,lng)
      VALUES (?,?,?,?,?,?)
    `).run(email, hash(password), name || email, address || 'Chicago', lat ?? DEFAULT_CUSTOMER.lat, lng ?? DEFAULT_CUSTOMER.lng);
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
    res.json({ token: sign(user), user: { id: user.id, email: user.email, name: user.name } });
  } catch (e) {
    res.status(400).json({ error: 'Email already in use' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user || !verify(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: sign(user), user: { id: user.id, email: user.email, name: user.name } });
});

app.post('/api/auth/guest', (req, res) => {
  const id = nanoid(8);
  const email = `guest_${id}@grochr.local`;
  const info = db.prepare(`
    INSERT INTO users (email,password_hash,name,address,lat,lng)
    VALUES (?,?,?,?,?,?)
  `).run(email, hash('guest'), `Guest ${id}`, 'Chicago Loop', DEFAULT_CUSTOMER.lat, DEFAULT_CUSTOMER.lng);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
  res.json({ token: sign(user), user: { id: user.id, email: user.email, name: user.name } });
});

/* ---------------- Stores / Flyers / Products ---------------- */
app.get('/api/stores', (_req, res) => {
  res.json(db.prepare('SELECT * FROM stores').all());
});

app.get('/api/flyers', (_req, res) => {
  const rows = db.prepare(`
    SELECT f.*, s.name AS store_name FROM flyers f JOIN stores s ON s.id=f.store_id
  `).all();
  res.json(rows);
});

app.get('/api/products', (req, res) => {
  const { q = '', category = '', storeId = '' } = req.query;
  let sql = `SELECT p.*, s.name AS store_name FROM products p JOIN stores s ON s.id=p.store_id WHERE 1=1`;
  const params = [];
  if (q) { sql += ` AND (p.name LIKE ? OR p.brand LIKE ?)`; params.push(`%${q}%`, `%${q}%`); }
  if (category) { sql += ` AND p.category = ?`; params.push(category); }
  if (storeId) { sql += ` AND p.store_id = ?`; params.push(storeId); }
  sql += ` ORDER BY p.name, p.unit_price ASC`;
  res.json(db.prepare(sql).all(...params));
});

// Compare: group by product name, sort stores by unit price (cheapest first)
app.get('/api/products/compare', (req, res) => {
  const q = req.query.q || '';
  const rows = db.prepare(`
    SELECT p.*, s.name AS store_name
    FROM products p JOIN stores s ON s.id=p.store_id
    WHERE p.name LIKE ?
    ORDER BY p.name, p.unit_price ASC
  `).all(`%${q}%`);
  const grouped = {};
  for (const r of rows) {
    (grouped[r.name] ||= []).push(r);
  }
  res.json(Object.entries(grouped).map(([name, offers]) => ({
    name,
    best: offers[0],
    offers
  })));
});

/* ---------------- Cart ---------------- */
app.get('/api/cart', auth, (req, res) => {
  const items = db.prepare(`
    SELECT ci.id, ci.qty, p.id AS product_id, p.name, p.brand, p.size,
           p.price, p.unit_price, p.unit_label, p.image_url,
           p.store_id, s.name AS store_name
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    JOIN stores s ON s.id = p.store_id
    WHERE ci.user_id = ?
  `).all(req.user.id);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  res.json({ items, subtotal: +subtotal.toFixed(2) });
});

app.post('/api/cart/items', auth, (req, res) => {
  const { productId, qty = 1 } = req.body;
  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, qty) VALUES (?,?,?)
    ON CONFLICT(user_id, product_id) DO UPDATE SET qty = qty + excluded.qty
  `).run(req.user.id, productId, qty);
  res.json({ ok: true });
});

app.patch('/api/cart/items/:id', auth, (req, res) => {
  const { qty } = req.body;
  if (qty <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  } else {
    db.prepare('UPDATE cart_items SET qty=? WHERE id=? AND user_id=?').run(qty, req.params.id, req.user.id);
  }
  res.json({ ok: true });
});

app.delete('/api/cart/items/:id', auth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ---------------- Orders ---------------- */
function loadCart(userId) {
  const items = db.prepare(`
    SELECT ci.id, ci.qty, p.id AS product_id, p.name, p.price, p.store_id
    FROM cart_items ci JOIN products p ON p.id=ci.product_id
    WHERE ci.user_id=?
  `).all(userId);
  const byStore = {};
  for (const it of items) (byStore[it.store_id] ||= []).push(it);
  return { items, byStore };
}

app.post('/api/orders/quote', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const customer = { lat: user.lat, lng: user.lng };
  const { items, byStore } = loadCart(req.user.id);
  if (!items.length) return res.status(400).json({ error: 'Cart empty' });

  const storeIds = Object.keys(byStore).map(Number);
  const stores = storeIds.map(id => db.prepare('SELECT * FROM stores WHERE id=?').get(id));
  const plan = planDelivery(stores, customer, byStore);

  const subtotal = +items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2);
  const deliveryTotal = +plan.reduce((s, p) => s + (p.best?.fee || 0), 0).toFixed(2);

  res.json({
    customer,
    stores: plan.map(p => ({
      store: { id: p.store.id, name: p.store.name },
      quotes: p.quotes,
      best: p.best,
      items: byStore[p.store.id]
    })),
    subtotal,
    deliveryTotal,
    total: +(subtotal + deliveryTotal).toFixed(2)
  });
});

app.post('/api/orders/checkout', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  const customer = { lat: user.lat, lng: user.lng };
  const { items, byStore } = loadCart(req.user.id);
  if (!items.length) return res.status(400).json({ error: 'Cart empty' });

  const stores = Object.keys(byStore).map(id => db.prepare('SELECT * FROM stores WHERE id=?').get(Number(id)));
  const plan = planDelivery(stores, customer, byStore);

  const subtotal = +items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2);
  const deliveryTotal = +plan.reduce((s, p) => s + (p.best?.fee || 0), 0).toFixed(2);
  const total = +(subtotal + deliveryTotal).toFixed(2);

  const info = db.prepare(`
    INSERT INTO orders (user_id, subtotal, delivery_total, total, routing_json)
    VALUES (?,?,?,?,?)
  `).run(req.user.id, subtotal, deliveryTotal, total, JSON.stringify(plan));

  const orderId = info.lastInsertRowid;

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, store_id, qty, unit_price, delivery_partner, external_delivery_id)
    VALUES (?,?,?,?,?,?,?)
  `);

  const dispatches = [];
  for (const p of plan) {
    if (!p.best) continue;
    const adapter = byName[p.best.partner];
    const dispatch = adapter.createDelivery({
      order: { id: orderId },
      store: p.store,
      items: byStore[p.store.id]
    });
    dispatches.push({ store: p.store.name, partner: p.best.partner, ...dispatch });
    for (const it of byStore[p.store.id]) {
      insertItem.run(orderId, it.product_id, it.store_id, it.qty, it.price, p.best.partner, dispatch.externalId);
    }
  }

  db.prepare('DELETE FROM cart_items WHERE user_id=?').run(req.user.id);

  res.json({
    orderId,
    subtotal,
    deliveryTotal,
    total,
    dispatches,
    message: 'Order placed. Deliveries dispatched to partners.'
  });
});

app.get('/api/orders', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(req.user.id);
  res.json(orders.map(o => ({ ...o, routing: JSON.parse(o.routing_json) })));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Grochr API on http://localhost:${PORT}`)); import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' } 
  }const BASE = '/api';
const getToken = () => localStorage.getItem('grochr_token');
export const setToken = t => localStorage.setItem('grochr_token', t);
export const clearToken = () => localStorage.removeItem('grochr_token');

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  guestLogin: () => req('/auth/guest', { method: 'POST' }),
  login: (email, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, name) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  stores: () => req('/stores'),
  flyers: () => req('/flyers'),
  products: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/products${qs ? '?' + qs : ''}`);
  },
  compare: q => req(`/products/compare?q=${encodeURIComponent(q)}`),

  cart: () => req('/cart'),
  addToCart: (productId, qty = 1) =>
    req('/cart/items', { method: 'POST', body: JSON.stringify({ productId, qty }) }),
  updateCartItem: (id, qty) =>
    req(`/cart/items/${id}`, { method: 'PATCH', body: JSON.stringify({ qty }) }),
  removeCartItem: id => req(`/cart/items/${id}`, { method: 'DELETE' }),

  quoteOrder: () => req('/orders/quote', { method: 'POST' }),
  checkout: () => req('/orders/checkout', { method: 'POST' }),
  orders: () => req('/orders')
};
});
