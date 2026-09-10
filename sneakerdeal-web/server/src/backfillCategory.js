// One-off, non-destructive migration: sets `category` on every product in
// the live DB based on keywords in its brand/name (unlike seed.js, this
// never deletes or overwrites anything else). Re-running it is safe — it
// only touches products whose category isn't already set.
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const Product = require("./models/Product");

// Checked in order — first match wins, so put the most specific families
// first (an ASICS running shoe should not fall through to "lifestyle").
const RULES = [
  { category: "sandal", keywords: ["birkenstock", "crocs", "sandal", "slide", "clog", "flip flop", "flip-flop"] },
  {
    category: "running",
    keywords: [
      "asics", "novablast", "gel-", "gel ", "kayano", "nimbus", "venture", "kahana",
      "metaspeed", "sonicblast", "superblast", "adizero", "norda", "pegasus",
      "vaporfly", "alphafly", "zoomx", "running", "marathon", "hoka", "brooks", "saucony"
    ]
  },
  { category: "basketball", keywords: ["jordan", "kobe", "lebron", "kyrie", "basketball", "kd "] },
  { category: "skate", keywords: ["sb dunk", "vans", "skate", "half cab", "dunk low", "dunk high"] }
];

function classify(product) {
  const haystack = `${product.brand} ${product.name}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some(k => haystack.includes(k))) return rule.category;
  }
  return "lifestyle";
}

async function run() {
  await connectDB();

  // .lean() skips schema defaults, so a product with no `category` in the
  // raw DB document comes back with category: undefined here — reading via
  // the model directly would apply the "lifestyle" default and make every
  // product look already-categorized.
  const products = await Product.find({}).lean();

  const counts = {};
  let updated = 0;
  for (const product of products) {
    const category = classify(product);
    counts[category] = (counts[category] || 0) + 1;
    if (product.category === category) continue;
    await Product.updateOne({ _id: product._id }, { $set: { category } });
    updated++;
  }

  console.log(`Checked ${products.length} products, set/changed category on ${updated}.`);
  console.log(counts);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
