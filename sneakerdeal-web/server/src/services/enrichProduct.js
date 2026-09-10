const { computeNetPrice } = require("./discountEngine");

// Adds computed net prices (after each offer's discount code) to a plain
// product object — shared by the /api/products list and the server-
// rendered product detail page, so both show the same numbers.
function enrichProduct(p) {
  return {
    ...p,
    offers: p.offers.map(o => {
      if (o.inStock === false) {
        return { ...o, sizePrices: o.sizePrices || [], minNetPrice: null };
      }
      if (o.priceMode === "range" && o.priceRange) {
        const netMin = computeNetPrice(o.priceRange.min, o.discount);
        const netMax = computeNetPrice(o.priceRange.max, o.discount);
        return {
          ...o,
          priceRange: { ...o.priceRange, netMin, netMax },
          minNetPrice: netMin
        };
      }
      const sizePrices = o.sizePrices.map(sp => ({
        ...sp,
        netPrice: computeNetPrice(sp.price, o.discount)
      }));
      const inStockPrices = sizePrices.filter(sp => sp.inStock !== false);
      const minNetPrice = inStockPrices.length
        ? Math.min(...inStockPrices.map(sp => sp.netPrice))
        : null;
      return { ...o, sizePrices, minNetPrice };
    })
  };
}

module.exports = { enrichProduct };
