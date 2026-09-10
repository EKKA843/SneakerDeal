// Reads schema.org JSON-LD (<script type="application/ld+json">) that a
// store embeds in its own product pages for Google Shopping/SEO — data the
// store already publishes for external systems to read. Verified against
// SASOM's product pages (robots.txt explicitly allows crawling, and pages
// carry a real "Product" node with live price + availability).
//
// This intentionally only reads the ONE overall price/availability the
// page publishes — SASOM also embeds richer per-listing data broken down
// by size, but those sizes are labeled in US sizing while this catalog
// tracks EU sizing, and there's no exact universal US->EU table. Guessing
// that mapping risks showing the wrong price for the wrong size, so this
// stays at "one accurate price for the whole shoe" instead.
function findProductNode(parsed) {
  const nodes = Array.isArray(parsed) ? parsed : [parsed];
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    if (node["@graph"]) {
      const found = findProductNode(node["@graph"]);
      if (found) return found;
    }
    const type = node["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("Product")) return node;
  }
  return null;
}

function extractOffer(product) {
  if (!product || !product.offers) return null;
  const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  if (!offer || offer.price == null) return null;
  return {
    price: Number(offer.price),
    availability: String(offer.availability || "").toLowerCase()
  };
}

async function fetchStructuredProductData(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "SneakerDealBot/1.0 (+price comparison; contact: store owner)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();

  // A fresh RegExp per call — reusing one module-level /g regex across
  // calls corrupts its lastIndex between different HTML strings once a
  // match is found and the loop returns early.
  const jsonLdRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRe.exec(html))) {
    try {
      const parsed = JSON.parse(match[1]);
      const product = findProductNode(parsed);
      const offer = extractOffer(product);
      if (offer) return offer;
    } catch {
      // not valid JSON in this script tag — skip it
    }
  }
  return null;
}

module.exports = { fetchStructuredProductData };
