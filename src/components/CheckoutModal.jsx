import React, { useEffect, useState } from 'react';
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
              {busy ? 'Placing…' : `Demo checkout — $${quote.total.toFixed(2)}`}
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
}