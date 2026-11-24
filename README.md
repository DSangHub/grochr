# Grochr — Grocery shopping in a hurry

Full-stack demo: flyer aggregation → unit-price comparison → multi-store cart →
smart delivery routing (Uber Direct / DoorDash Drive / Instacart Platform).

## Run

### Backend
cd server
npm install
npm run seed       # seeds 4 stores, 4 flyers, 60 products
npm run dev        # http://localhost:4000

### Frontend
cd client
npm install
npm run dev        # http://localhost:5173 (proxies /api -> :4000)

Open http://localhost:5173, click "Continue as guest", search for
"chicken" or "milk", add items, open cart → Checkout. The routing engine
will pick the cheapest feasible delivery partner per store and dispatch
the order.

## How the routing engine works

For each store in the cart:
1. Ask every delivery partner for a quote (fee, ETA, feasibility by distance).
2. Discard infeasible quotes (out of range).
3. Pick the lowest fee (tiebreak: ETA).
4. On checkout, call `partner.createDelivery()` and store the external ID.

Replace `server/services/deliveryAdapters.js` with real API calls to:
- Uber Direct:      POST /v1/deliveries
- DoorDash Drive:   POST /drive/v2/deliveries
- Instacart Platform: POST /fulfillment/v1/orders

## Next steps for production
- Stripe checkout (currently mocked)
- Flyer OCR ingestion (PDF → products)
- Real partner webhooks → order status updates
- Multi-tenant store/admin panel
- Postgres + Redis (currently SQLite for demo)
