const mongoose = require("mongoose");

// One store can sell the same shoe at a different price per size (common
// for resellers), so price lives per-size rather than once per offer.
// A size with NO entry here means the store never carries that size at
// all. A size WITH an entry but inStock:false means the store does carry
// it but is temporarily sold out — the price is kept so re-stocking is a
// one-click toggle instead of re-typing the price.
const SizePriceSchema = new mongoose.Schema(
  {
    size: { type: Number, required: true },
    price: { type: Number, required: true },
    inStock: { type: Boolean, default: true }
  },
  { _id: false }
);

// Some stores don't publish an exact price per size — just a general
// "starts at X, up to Y" range across whatever sizes they carry.
const PriceRangeSchema = new mongoose.Schema(
  {
    min: { type: Number, required: true },
    max: { type: Number, required: true }
  },
  { _id: false }
);

const OfferSchema = new mongoose.Schema(
  {
    store: { type: String, required: true },
    type: { type: String, required: true }, // official | shopee | lazada | tiktok | other
    code: { type: String, default: "" },
    discount: { type: Number, default: 0 }, // 0.1 = 10%
    priceMode: { type: String, enum: ["perSize", "range"], default: "perSize" },
    sizePrices: { type: [SizePriceSchema], default: [] }, // used when priceMode = "perSize"
    priceRange: { type: PriceRangeSchema, default: undefined }, // used when priceMode = "range"
    inStock: { type: Boolean, default: true }, // overall availability (used by auto-refresh)
    url: { type: String, required: true },
    // The real product page to auto-refresh price/stock from (schema.org
    // data on the page). Distinct from `url`, which is the affiliate/buy
    // link and must not change. Leave blank to manage this offer manually.
    sourceUrl: { type: String, default: "" },
    lastUpdated: { type: Date, default: Date.now }
  },
  { _id: false }
);

const CATEGORIES = ["lifestyle", "running", "basketball", "skate", "sandal"];

const ProductSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    image: { type: String, required: true },
    category: { type: String, enum: CATEGORIES, default: "lifestyle" },
    sizes: { type: [Number], default: [] },
    offers: { type: [OfferSchema], default: [] }
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", ProductSchema);
Product.CATEGORIES = CATEGORIES;

module.exports = Product;
