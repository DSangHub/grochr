import React from 'react';

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
}