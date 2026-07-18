const REQUIRED_COMMERCIAL_OFFERS = ["trial", "base", "plus_ai", "catalog_100", "catalog_200"];

export function getCommercialPrices(items) {
  const prices = Object.create(null);
  for (const item of items || []) {
    if (!REQUIRED_COMMERCIAL_OFFERS.includes(item?.offering_code)) continue;
    if (!Number.isInteger(item.amount_ars) || item.amount_ars < 0) continue;
    prices[item.offering_code] = item.amount_ars;
  }
  return REQUIRED_COMMERCIAL_OFFERS.every((offeringCode) => Object.hasOwn(prices, offeringCode)) ? { ...prices } : null;
}

export function formatCommercialPrice(amountArs) {
  return `ARS ${amountArs.toLocaleString("es-AR")}`;
}