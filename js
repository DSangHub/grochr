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
