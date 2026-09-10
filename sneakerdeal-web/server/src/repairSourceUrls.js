// One-off repair: 9 offers had their `sourceUrl` (plain SASOM product page,
// used for auto price-refresh) accidentally overwritten with the same
// value as `url` (the atth.me affiliate link) by a concurrency bug — see
// session notes. Since `url` still holds the correct affiliate link, and
// that link's meta-refresh target IS the real product page, we can recover
// the lost sourceUrl by resolving it instead of guessing.
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const Product = require("./models/Product");

const BROKEN_IDS = [
  "new-balance-530-white-silver-navy",
  "samba-og-cloud-white-core-black",
  "puma-speedcat-og-for-all-time-red-white",
  "adidas-adizero-evo-sl-white",
  "adidas-adizero-evo-sl-black-white",
  "adidas-adizero-evo-sl-lucid-lemon",
  "adidas-adizero-evo-sl-lucid-red-black",
  "nike-air-force-1-07-triple-white",
  "nike-air-force-1-07-low-jewel-white-black"
];

async function resolveRealUrl(affiliateUrl) {
  const res = await fetch(affiliateUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (SneakerDealBot repair script)" }
  });
  const html = await res.text();
  const match = html.match(/http-equiv=['"]refresh['"][^>]*url=([^'">]+)/i);
  if (!match) throw new Error(`No meta-refresh target found at ${affiliateUrl}`);
  const target = match[1].replace(/&amp;/g, "&");
  return target.split("?")[0]; // drop utm_source / atnct tracking params
}

async function run() {
  await connectDB();
  for (const id of BROKEN_IDS) {
    const product = await Product.findOne({ id });
    if (!product) {
      console.warn(`Not found: ${id}`);
      continue;
    }
    const offer = product.offers.find(o => o.store === "SASOM");
    if (!offer) {
      console.warn(`No SASOM offer on: ${id}`);
      continue;
    }
    const realUrl = await resolveRealUrl(offer.url);
    offer.sourceUrl = realUrl;
    await product.save();
    console.log(`Fixed ${id}: sourceUrl -> ${realUrl}`);
  }
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
