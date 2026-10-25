const priceFormatter = new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" });

// Greek price format: "49,00 €".
export function formatPrice(value) {
  return priceFormatter.format(Number(value) || 0);
}
