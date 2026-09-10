// One-off insertion of a batch of products fetched from SASOM product pages
// (schema.org data — same source structuredDataFetcher/priceRefreshJob use
// for ongoing refresh). Purely additive: only Product.create calls, no
// deleteMany/updateMany touching existing catalog rows.
require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const Product = require("./models/Product");

const BATCH_FILE = process.argv[2];
if (!BATCH_FILE) {
  console.error("Usage: node insertSasomBatch.js <path-to-batch.json>");
  process.exit(1);
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Same keyword rules as backfillCategory.js, kept in sync manually since
// this is a one-off script rather than shared infra.
const RULES = [
  { category: "sandal", keywords: ["birkenstock", "crocs", "sandal", "slide", "clog", "flip flop", "flip-flop"] },
  {
    category: "running",
    keywords: [
      "asics", "novablast", "gel-", "gel ", "kayano", "nimbus", "venture", "kahana",
      "metaspeed", "sonicblast", "superblast", "adizero", "norda", "pegasus",
      "vaporfly", "alphafly", "zoomx", "running", "marathon", "hoka", "brooks", "saucony",
      "on cloud", "on-cloud", "on running", "on-running", "salomon", "deviate nitro"
    ]
  },
  { category: "basketball", keywords: ["jordan", "kobe", "lebron", "kyrie", "basketball", "kd "] },
  { category: "skate", keywords: ["sb dunk", "vans", "skate", "half cab", "dunk low", "dunk high"] }
];

function classify(brand, name) {
  const haystack = `${brand} ${name}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some(k => haystack.includes(k))) return rule.category;
  }
  return "lifestyle";
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

async function run() {
  await connectDB();
  const items = JSON.parse(fs.readFileSync(BATCH_FILE, "utf8"));

  let created = 0;
  for (const item of items) {
    const id = await uniqueProductId(item.name);
    await Product.create({
      id,
      name: item.name,
      brand: item.brand,
      image: item.image,
      category: classify(item.brand, item.name),
      sizes: [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
      offers: [
        {
          store: "SASOM",
          type: "official",
          code: "",
          discount: 0,
          priceMode: "range",
          sizePrices: [],
          priceRange: { min: Math.round(item.price), max: Math.round(item.price) },
          inStock: item.availability.includes("instock"),
          url: item.sourceUrl,
          sourceUrl: item.sourceUrl,
          lastUpdated: new Date()
        }
      ]
    });
    created++;
  }

  console.log(`Inserted ${created} products.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
