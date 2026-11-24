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

      <p className="banner">Demo mode — sample grocery prices and delivery estimates. No live orders or payments.</p><section className="controls">
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
}