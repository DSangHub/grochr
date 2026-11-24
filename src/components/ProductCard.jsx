import React from 'react';

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
}