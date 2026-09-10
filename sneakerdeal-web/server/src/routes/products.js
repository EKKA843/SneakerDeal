const express = require("express");
const Product = require("../models/Product");
const { computeNetPrice } = require("../services/discountEngine");

const router = express.Router();

router.get("/", async (req, res) => {
  const products = await Product.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean();
  const withNetPrice = products.map(p => ({
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
  }));
  res.json(withNetPrice);
});

module.exports = router;
