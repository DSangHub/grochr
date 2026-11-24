import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
import React, { useEffect, useState } from 'react';
import { api, setToken, clearToken } from './api.js';
import ProductCard from './components/ProductCard.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import AuthModal from './components/AuthModal.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [stores, setStores] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [storeId, setStoreId] = useState('');
  const [compare, setCompare] = useState([]);
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [showCart, setShowCart] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { api.stores().then(setStores); }, []);

  useEffect(() => {
    if (!user) { setCompare([]); return; }
    load();
  }, [query, category, storeId, user]);

  async function load() {
    try {
      const [products, cartData] = await Promise.all([
        api.products({ q: query, category, storeId }),
        api.cart()
      ]);
      setCompare(groupProducts(products));
      setCart(cartData);
    } catch (e) { flash(e.message); }
  }

  function groupProducts(products) {
    const map = {};
    for (const p of products) (map[p.name] ||= []).push(p);
    return Object.entries(map).map(([name, offers]) => ({
      name,
      offers: offers.sort((a, b) => a.unit_price - b.unit_price),
      best: offers[0]
    }));
  }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function onGuest() {
    const { token, user } = await api.guestLogin();
    setToken(token); setUser(user); setShowAuth(false); flash('Signed in as guest');
  }

  async function addToCart(productId) {
    if (!user) { setShowAuth(true); return; }
    await api.addToCart(productId, 1);
    const c = await api.cart();
    setCart(c); flash('Added to cart');
  }

  async function updateQty(id, qty) {
    await api.updateCartItem(id, qty);
    setCart(await api.cart());
  }

  async function removeItem(id) {
    await api.removeCartItem(id);
    setCart(await api.cart());
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">🛒</span>
          <div>
            <h1>Grochr</h1>
            <p>Grocery shopping in a hurry — save time and money.</p>
          </div>
        </div>
        <div className="header-actions">
          {user ? <span className="user">{user.name}</span> : <button onClick={() => setShowAuth(true)}>Sign in</button>}
          <button className="cart-btn" onClick={() => setShowCart(true)}>
            Cart · ${cart.subtotal.toFixed(2)} ({cart.items.reduce((s, i) => s + i.qty, 0)})
          </button>
        </div>
      </header>

      <section className="controls">
        <input
          placeholder="Search products (e.g. chicken, milk, coffee)…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <select value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {['Meat','Dairy','Produce','Bakery','Pantry'].map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={storeId} onChange={e => setStoreId(e.target.value)}>
          <option value="">All stores</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </section>

      {!user && (
        <div className="banner">
          Sign in to compare prices and check out. <button onClick={() => setShowAuth(true)}>Get started</button>
        </div>
      )}

      <main className="grid">
        {compare.map(group => (
          <ProductCard key={group.name} group={group} onAdd={addToCart} />
        ))}
        {user && !compare.length && <p className="empty">No products match your search.</p>}
      </main>

      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => setShowCart(false)}
          onUpdate={updateQty}
          onRemove={removeItem}
          onCheckout={() => { setShowCart(false); setShowCheckout(true); }}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          onPlaced={async () => { setCart(await api.cart()); flash('Order placed!'); }}
        />
      )}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onGuest={onGuest}
          onAuth={(token, u) => { setToken(token); setUser(u); setShowAuth(false); }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
} import React from 'react';

export default function ProductCard({ group, onAdd }) {
  const best = group.best;
  const worst = group.offers[group.offers.length - 1];
  const savings = worst && worst.id !== best.id
    ? ((worst.unit_price - best.unit_price) / worst.unit_price * 100).toFixed(0)
    : 0;

  return (
    <div className="card">
      <img src={best.image_url} alt={group.name} />
      <div className="card-body">
        <h3>{group.name}</h3>
        <p className="brand">{best.brand} · {best.size} · {best.category}</p>
        <div className="best-offer">
          <div>
            <span className="price">${best.price.toFixed(2)}</span>
            <span className="unit">${best.unit_price.toFixed(2)} {best.unit_label}</span>
          </div>
          <span className="store">{best.store_name}</span>
        </div>
        {savings > 0 && <p className="savings">Save {savings}% vs. {worst.store_name}</p>}

        <details>
          <summary>Compare {group.offers.length} stores</summary>
          <ul className="offers">
            {group.offers.map(o => (
              <li key={o.id}>
                <span>{o.store_name}</span>
                <span>${o.price.toFixed(2)} · ${o.unit_price.toFixed(2)} {o.unit_label}</span>
              </li>
            ))}
          </ul>
        </details>

        <button onClick={() => onAdd(best.id)}>Add best price</button>
      </div>
    </div>
  );
} import React from 'react';

export default function CartDrawer({ cart, onClose, onUpdate, onRemove, onCheckout }) {
  const byStore = {};
  for (const it of cart.items) (byStore[it.store_name] ||= []).push(it);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={e => e.stopPropagation()}>
        <header>
          <h2>Your cart</h2>
          <button onClick={onClose}>✕</button>
        </header>

        {!cart.items.length && <p className="empty">Cart is empty.</p>}

        {Object.entries(byStore).map(([store, items]) => (
          <section key={store} className="store-group">
            <h3>{store}</h3>
            {items.map(it => (
              <div key={it.id} className="cart-row">
                <div>
                  <p>{it.name}</p>
                  <small>${it.price.toFixed(2)} each</small>
                </div>
                <div className="qty">
                  <button onClick={() => onUpdate(it.id, it.qty - 1)}>−</button>
                  <span>{it.qty}</span>
                  <button onClick={() => onUpdate(it.id, it.qty + 1)}>+</button>
                  <button className="remove" onClick={() => onRemove(it.id)}>🗑</button>
                </div>
              </div>
            ))}
          </section>
        ))}

        <footer>
          <p>Subtotal: <strong>${cart.subtotal.toFixed(2)}</strong></p>
          <button disabled={!cart.items.length} onClick={onCheckout}>
            Checkout &amp; compare delivery
          </button>
        </footer>
      </aside>
    </div>
  );
} import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function CheckoutModal({ onClose, onPlaced }) {
  const [quote, setQuote] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    setBusy(true); setErr('');
    try { setQuote(await api.quoteOrder()); }
    catch (e) { setErr(e.message); }
    setBusy(false);
  }

  async function placeOrder() {
    setBusy(true); setErr('');
    try {
      const r = await api.checkout();
      setResult(r);
      onPlaced?.();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header>
          <h2>Checkout — Smart Delivery Routing</h2>
          <button onClick={onClose}>✕</button>
        </header>

        {busy && !quote && <p>Calculating best delivery route…</p>}
        {err && <p className="error">{err}</p>}

        {quote && !result && (
          <>
            {quote.stores.map(s => (
              <section key={s.store.id} className="quote-card">
                <h3>{s.store.name}</h3>
                {s.best ? (
                  <>
                    <p className="best-partner">
                      ✅ Best: <strong>{s.best.partner}</strong> · ${s.best.fee.toFixed(2)} · {s.best.etaMin} min · {s.best.distanceKm} km
                    </p>
                    <details>
                      <summary>All delivery options ({s.quotes.length})</summary>
                      <ul>
                        {s.quotes.map(q => (
                          <li key={q.partner} className={q.partner === s.best.partner ? 'win' : ''}>
                            {q.partner}: ${q.fee.toFixed(2)} · {q.etaMin} min
                          </li>
                        ))}
                      </ul>
                    </details>
                  </>
                ) : <p className="error">No delivery partner available</p>}
              </section>
            ))}

            <div className="totals">
              <p>Subtotal: ${quote.subtotal.toFixed(2)}</p>
              <p>Delivery: ${quote.deliveryTotal.toFixed(2)}</p>
              <p><strong>Total: ${quote.total.toFixed(2)}</strong></p>
            </div>

            <button disabled={busy} onClick={placeOrder}>
              {busy ? 'Placing…' : `Place order — $${quote.total.toFixed(2)}`}
            </button>
          </>
        )}

        {result && (
          <div className="success">
            <h3>🎉 Order #{result.orderId} placed!</h3>
            <p>Total: ${result.total.toFixed(2)}</p>
            <ul>
              {result.dispatches.map((d, i) => (
                <li key={i}>
                  {d.store} → <strong>{d.partner}</strong> (ETA {d.etaMin} min, ID {d.externalId})
                </li>
              ))}
            </ul>
            <button onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
} import React, { useState } from 'react';
import { api } from '../api.js';

export default function AuthModal({ onClose, onGuest, onAuth }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      const r = mode === 'login'
        ? await api.login(email, password)
        : await api.register(email, password, name);
      onAuth(r.token, r.user);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal auth" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <header>
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <button type="button" onClick={onClose}>✕</button>
        </header>
        {err && <p className="error">{err}</p>}
        {mode === 'register' && (
          <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        )}
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">{mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="switch">
          {mode === 'login'
            ? <>No account? <a onClick={() => setMode('register')}>Register</a></>
            : <>Have an account? <a onClick={() => setMode('login')}>Sign in</a></>}
        </p>
        <button type="button" className="ghost" onClick={onGuest}>Continue as guest</button>
      </form>
    </div>
  );
}
