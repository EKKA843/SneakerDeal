const cron = require("node-cron");
const Product = require("../models/Product");
const { fetchStructuredProductData } = require("../services/structuredDataFetcher");

// Only offers with a `sourceUrl` set are auto-refreshed — that's an opt-in
// per offer (set it in the admin panel). Everything else stays fully
// manual, unaffected by this job.
async function runOnce() {
  const products = await Product.find({ "offers.sourceUrl": { $exists: true, $ne: "" } });
  let refreshed = 0;

  for (const product of products) {
    let changed = false;
    for (const offer of product.offers) {
      if (!offer.sourceUrl) continue;
      let data;
      try {
        data = await fetchStructuredProductData(offer.sourceUrl);
      } catch (err) {
        console.warn(`[priceRefreshJob] ${product.id} / ${offer.store}: ${err.message}`);
        continue;
      }
      if (!data) {
        console.warn(`[priceRefreshJob] ${product.id} / ${offer.store}: no schema.org Product found at ${offer.sourceUrl}`);
        continue;
      }
      offer.priceMode = "range";
      offer.priceRange = { min: Math.round(data.price), max: Math.round(data.price) };
      offer.sizePrices = [];
      offer.inStock = data.availability.includes("instock");
      offer.lastUpdated = new Date();
      changed = true;
    }
    if (changed) {
      await product.save();
      refreshed++;
    }
  }

  console.log(`[priceRefreshJob] refreshed ${refreshed}/${products.length} products at ${new Date().toISOString()}`);
}

function start(schedule) {
  runOnce().catch(err => console.error("[priceRefreshJob] initial run failed:", err));
  cron.schedule(schedule || "*/30 * * * *", () => {
    runOnce().catch(err => console.error("[priceRefreshJob] run failed:", err));
  });
}

module.exports = { start, runOnce };
