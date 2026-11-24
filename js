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
