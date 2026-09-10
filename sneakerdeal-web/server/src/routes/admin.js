const express = require("express");
const Product = require("../models/Product");
const { generateAffiliateLink } = require("../services/accessTradeClient");

const router = express.Router();

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueProductId(name) {
  const base = slugify(name) || "product";
  let id = base;
  let suffix = 2;
  while (await Product.exists({ id })) {
    id = `${base}-${suffix++}`;
  }
  return id;
}

function normalizeSizePrices(sizePrices) {
  if (!Array.isArray(sizePrices)) return null;
  const cleaned = sizePrices
    .filter(sp => sp && sp.size != null && sp.price != null)
    .map(sp => ({
      size: Number(sp.size),
      price: Number(sp.price),
      inStock: sp.inStock !== false
    }));
  return cleaned.length ? cleaned : null;
}

function normalizePriceRange(priceRange) {
  if (!priceRange || priceRange.min == null || priceRange.max == null) return null;
  const min = Number(priceRange.min);
  const max = Number(priceRange.max);
  if (!(min > 0) || !(max > 0) || min > max) return null;
  return { min, max };
}

// Reads priceMode + the matching pricing payload from a request body and
// returns the fields to store, or null if neither mode has valid data.
function normalizeOfferPricing(body) {
  if (body.priceMode === "range") {
    const priceRange = normalizePriceRange(body.priceRange);
    if (!priceRange) return null;
    return { priceMode: "range", priceRange, sizePrices: [] };
  }
  const sizePrices = normalizeSizePrices(body.sizePrices);
  if (!sizePrices) return null;
  return { priceMode: "perSize", sizePrices, priceRange: undefined };
}

function requireAdminToken(req, res, next) {
  const token = req.header("x-admin-token");
  if (!process.env.ADMIN_TOKEN) {
    return res.status(500).json({ error: "ADMIN_TOKEN is not set on the server" });
  }
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
  next();
}

router.use(express.json());
router.use(requireAdminToken);

router.get("/products", async (req, res) => {
  const products = await Product.find({}, { _id: 0, __v: 0 }).lean();
  res.json(products);
});

// Add a new product to the catalog. `id` is auto-generated from the name
// if not given. Each offer needs a `sizePrices` array of { size, price } —
// price can differ per size within the same store.
router.post("/products", async (req, res) => {
  const { name, brand, image, category, sizes, offers } = req.body;

  if (!name || !brand || !image) {
    return res.status(400).json({ error: "name, brand and image are required" });
  }
  if (category != null && !Product.CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${Product.CATEGORIES.join(", ")}` });
  }
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return res.status(400).json({ error: "sizes must be a non-empty array of numbers" });
  }
  if (!Array.isArray(offers) || offers.length === 0) {
    return res.status(400).json({ error: "offers must have at least one entry" });
  }
  const normalizedOffers = [];
  for (const o of offers) {
    const pricing = normalizeOfferPricing(o);
    if (!o.store || !o.type || !o.url || !pricing) {
      return res.status(400).json({
        error: "each offer needs store, type, url and either per-size prices or a valid min/max range"
      });
    }
    normalizedOffers.push({
      store: o.store,
      type: o.type,
      code: o.code || "",
      discount: Number(o.discount) || 0,
      ...pricing,
      url: o.url,
      sourceUrl: o.sourceUrl || "",
      lastUpdated: new Date()
    });
  }

  const id = await uniqueProductId(name);
  const product = await Product.create({
    id,
    name,
    brand,
    image,
    category: category || "lifestyle",
    sizes: sizes.map(Number),
    offers: normalizedOffers
  });

  res.status(201).json(product);
});

// Edit a product's own info (name, brand, image, sizes) — e.g. a new size
// just released and needs adding to the size range. If a size is removed,
// any offer prices set for that size are dropped too so data stays
// consistent.
router.patch("/products/:id", async (req, res) => {
  const { name, brand, image, category, sizes } = req.body;

  const product = await Product.findOne({ id: req.params.id });
  if (!product) return res.status(404).json({ error: "Product not found" });

  if (category != null && !Product.CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${Product.CATEGORIES.join(", ")}` });
  }

  if (name != null) product.name = name;
  if (brand != null) product.brand = brand;
  if (image != null) product.image = image;
  if (category != null) product.category = category;
  if (Array.isArray(sizes)) {
    if (sizes.length === 0) {
      return res.status(400).json({ error: "sizes must be a non-empty array" });
    }
    const newSizes = sizes.map(Number);
    const newSizeSet = new Set(newSizes);
    product.sizes = newSizes;
    product.offers.forEach(offer => {
      offer.sizePrices = offer.sizePrices.filter(sp => newSizeSet.has(sp.size));
    });
  }

  await product.save();
  res.json(product);
});

router.delete("/products/:id", async (req, res) => {
  const result = await Product.deleteOne({ id: req.params.id });
  if (result.deletedCount === 0) return res.status(404).json({ error: "Product not found" });
  res.json({ ok: true });
});

// Manual price/stock entry for offers with no public affiliate API
// (Shopee Mall, Lazada Mall, TikTok Shop, ...). Identify the offer by its
// store name since that's unique within a product.
router.patch("/products/:id/offers/:store", async (req, res) => {
  const { id, store } = req.params;
  const { code, discount, sourceUrl, url, store: newStore, type } = req.body;

  const product = await Product.findOne({ id });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const offer = product.offers.find(o => o.store === store);
  if (!offer) return res.status(404).json({ error: "Offer not found on this product" });

  if (req.body.priceMode != null || req.body.sizePrices != null || req.body.priceRange != null) {
    const pricing = normalizeOfferPricing(req.body);
    if (!pricing) {
      return res.status(400).json({ error: "provide either per-size prices or a valid min/max range" });
    }
    offer.priceMode = pricing.priceMode;
    offer.sizePrices = pricing.sizePrices;
    offer.priceRange = pricing.priceRange;
  }
  if (newStore != null) {
    const trimmed = String(newStore).trim();
    if (!trimmed) {
      return res.status(400).json({ error: "store name cannot be blank" });
    }
    if (trimmed !== offer.store && product.offers.some(o => o.store === trimmed)) {
      return res.status(409).json({ error: "This product already has an offer with that store name" });
    }
    offer.store = trimmed;
  }
  if (type != null) offer.type = String(type);
  if (url != null) {
    if (!String(url).trim()) {
      return res.status(400).json({ error: "url cannot be blank — it's the buy-button link" });
    }
    offer.url = String(url).trim();
  }
  if (code != null) offer.code = String(code);
  if (discount != null) offer.discount = Number(discount);
  if (sourceUrl != null) offer.sourceUrl = String(sourceUrl);
  offer.lastUpdated = new Date();

  await product.save();
  res.json(product);
});

// Calls the AccessTrade Publisher API to turn this offer's sourceUrl (the
// plain, untracked product page) into a real tracked affiliate link, and
// saves the result as the offer's `url` — replacing the manual "copy the
// product link, paste it into the AccessTrade dashboard, copy the result
// back" workflow. Requires ACCESSTRADE_* env vars (see .env.example).
router.post("/products/:id/offers/:store/generate-affiliate-link", async (req, res) => {
  const { id, store } = req.params;

  const product = await Product.findOne({ id });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const offer = product.offers.find(o => o.store === store);
  if (!offer) return res.status(404).json({ error: "Offer not found on this product" });

  const landingUrl = offer.sourceUrl || offer.url;
  if (!landingUrl) {
    return res.status(400).json({ error: "This offer has no sourceUrl or url to generate a link from" });
  }

  try {
    const affiliateLink = await generateAffiliateLink(landingUrl, { name: `${product.name} — ${store}` });
    offer.url = affiliateLink;
    offer.lastUpdated = new Date();
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(502).json({ error: `AccessTrade API failed: ${err.message}` });
  }
});

// Add a new store/offer to a product that already exists — e.g. a store
// that wasn't listed yet, or a new promotion running under a distinct
// store label (store name must be unique within the product).
router.post("/products/:id/offers", async (req, res) => {
  const { id } = req.params;
  const { store, type, code, discount, url, sourceUrl } = req.body;

  const pricing = normalizeOfferPricing(req.body);
  if (!store || !type || !url || !pricing) {
    return res.status(400).json({
      error: "store, type, url and either per-size prices or a valid min/max range are required"
    });
  }

  const product = await Product.findOne({ id });
  if (!product) return res.status(404).json({ error: "Product not found" });

  if (product.offers.some(o => o.store === store)) {
    return res.status(409).json({ error: "This product already has an offer with that store name" });
  }

  product.offers.push({
    store,
    type,
    code: code || "",
    discount: Number(discount) || 0,
    ...pricing,
    url,
    sourceUrl: sourceUrl || "",
    lastUpdated: new Date()
  });

  await product.save();
  res.status(201).json(product);
});

// Remove one store/offer from a product (e.g. a promotion that ended),
// without deleting the whole product.
router.delete("/products/:id/offers/:store", async (req, res) => {
  const { id, store } = req.params;

  const product = await Product.findOne({ id });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const before = product.offers.length;
  product.offers = product.offers.filter(o => o.store !== store);
  if (product.offers.length === before) {
    return res.status(404).json({ error: "Offer not found on this product" });
  }

  await product.save();
  res.json(product);
});

module.exports = router;
