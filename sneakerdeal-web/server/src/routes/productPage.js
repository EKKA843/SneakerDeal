// Server-rendered product detail pages (/shoes/:id) — the home page is a
// pure SPA (all content fetched by app.js after load), which search
// engines can't reliably use to index individual products by name. This
// route renders full HTML (name, price, offers, JSON-LD Product schema)
// directly in the response so each shoe is a real, indexable, linkable
// page instead of only existing as a card inside the catalog SPA.
const express = require("express");
const Product = require("../models/Product");
const { enrichProduct } = require("../services/enrichProduct");
const { escapeHtml } = require("../services/escapeHtml");

const router = express.Router();

const CATEGORY_LABELS = {
  lifestyle: "ลำลอง/ไลฟ์สไตล์",
  running: "วิ่ง",
  basketball: "บาสเก็ตบอล",
  skate: "สเก็ต",
  sandal: "รองเท้าแตะ/รัดส้น"
};

function formatBaht(n) {
  return "฿" + Math.round(n).toLocaleString("th-TH");
}

// Same "cheapest available price, no size selected" rule the homepage
// card uses by default, so the price shown here matches what a shopper
// sees when they click through from the catalog.
function cheapestNetPrice(offer) {
  if (offer.inStock === false) return Infinity;
  if (offer.priceMode === "range") return offer.minNetPrice ?? Infinity;
  const inStock = offer.sizePrices.filter(sp => sp.inStock !== false);
  if (inStock.length === 0) return Infinity;
  return Math.min(...inStock.map(sp => sp.netPrice));
}

function renderOfferRow(offer, isBest) {
  const inStock = offer.inStock !== false && cheapestNetPrice(offer) < Infinity;
  const discountLabel = `โค้ด ${escapeHtml(offer.code)} (-${Math.round(offer.discount * 100)}%)`;

  let priceHtml = "";
  let note = "";
  if (!inStock) {
    note = "สินค้าหมดสต็อกที่ร้านนี้";
  } else if (offer.priceMode === "range") {
    const { netMin, netMax } = offer.priceRange;
    const priceLabel = netMin === netMax ? formatBaht(netMin) : `${formatBaht(netMin)} - ${formatBaht(netMax)}`;
    priceHtml = `<div class="price-net">${priceLabel}</div>`;
    note = `ช่วงราคาตามไซส์ • ${discountLabel}`;
  } else {
    const cheapest = offer.sizePrices
      .filter(sp => sp.inStock !== false)
      .reduce((min, sp) => (sp.netPrice < min.netPrice ? sp : min));
    priceHtml = `<div class="price-net">${formatBaht(cheapest.netPrice)}</div><div class="price-orig">${formatBaht(cheapest.price)}</div>`;
    note = `เริ่มต้นไซส์ EU ${cheapest.size} • ${discountLabel}`;
  }

  return `
    <div class="offer${isBest ? " best" : ""}">
      <div class="offer-store">
        <div class="store-name"><span class="store-badge ${escapeHtml(offer.type)}">${escapeHtml(offer.store)}</span></div>
        <div class="offer-note${inStock ? "" : " oos"}">${note}</div>
      </div>
      <div class="offer-price">
        ${priceHtml}
        <a class="buy-btn${inStock ? "" : " disabled"}" href="${escapeHtml(offer.url)}" target="_blank" rel="noopener noreferrer nofollow sponsored">ไปที่ร้าน</a>
      </div>
    </div>
  `;
}

router.get("/shoes/:id", async (req, res) => {
  const product = await Product.findOne(
    { id: req.params.id },
    { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
  ).lean();
  if (!product) return res.status(404).send("Product not found");

  const p = enrichProduct(product);
  const sorted = [...p.offers].sort((a, b) => cheapestNetPrice(a) - cheapestNetPrice(b));
  const bestOffer = sorted.find(o => cheapestNetPrice(o) < Infinity) || sorted[0];
  const bestPrice = bestOffer ? cheapestNetPrice(bestOffer) : null;

  const name = escapeHtml(p.name);
  const brand = escapeHtml(p.brand);
  const categoryLabel = CATEGORY_LABELS[p.category] || p.category;
  const priceText = Number.isFinite(bestPrice) ? formatBaht(bestPrice) : "";
  const title = `${p.name} เช็กราคา${priceText ? ` เริ่มต้น ${priceText}` : ""} | SneakerDeal`;
  const description = `เปรียบเทียบราคา ${p.name} จาก ${p.brand} ทุกร้านในที่เดียว${priceText ? ` เริ่มต้น ${priceText}` : ""} พร้อมไซส์ที่มีของจริง`;
  const canonicalUrl = `https://sneakerdeal.onrender.com/shoes/${encodeURIComponent(p.id)}`;

  const offersJsonLd = p.offers
    .filter(o => cheapestNetPrice(o) < Infinity)
    .map(o => ({
      "@type": "Offer",
      price: Math.round(cheapestNetPrice(o)),
      priceCurrency: "THB",
      availability: "https://schema.org/InStock",
      url: o.url,
      seller: { "@type": "Organization", name: o.store }
    }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    brand: { "@type": "Brand", name: p.brand },
    category: categoryLabel,
    image: p.image,
    url: canonicalUrl,
    offers: offersJsonLd.length
      ? { "@type": "AggregateOffer", priceCurrency: "THB", lowPrice: Math.round(bestPrice), offerCount: offersJsonLd.length, offers: offersJsonLd }
      : undefined
  };

  res.send(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonicalUrl}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="SneakerDeal">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(p.image)}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:locale" content="th_TH">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/style.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href="/">
      <svg class="brand-mark" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path d="M6 30.5c0-2 1.2-3.6 3-4.4l7.6-3.4c1.3-.6 2.3-1.6 2.9-2.9l1.6-3.6c.7-1.6 2.3-2.6 4-2.6.9 0 1.8.3 2.5.9l6.6 5.1c1 .8 2.3 1.2 3.6 1.2H40c1.1 0 2 .9 2 2v3.2c0 1.1-.8 2-1.9 2.2l-4.6.8c-.7.1-1.3.5-1.7 1.1-.6.9-1.6 1.4-2.7 1.4H10c-2.2 0-4-1.8-4-4z"
              stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
        <path d="M17 26.5h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        <circle cx="34.5" cy="30.5" r="1.6" fill="currentColor"/>
      </svg>
      SneakerDeal
    </a>
  </div>
</header>

<nav class="breadcrumb"><a href="/">หน้าแรก</a> / <a href="/?category=${encodeURIComponent(p.category)}">${escapeHtml(categoryLabel)}</a> / ${name}</nav>

<main class="product-detail-wrap">
  <article class="card product-detail">
    <div class="card-media">
      <img src="${escapeHtml(p.image)}" alt="${name}">
    </div>
    <div class="card-body">
      <div class="card-brand">${brand} <span class="category-badge">${escapeHtml(categoryLabel)}</span></div>
      <h1 class="card-name">${name}</h1>
      <div class="card-sizes">ไซส์ทั้งหมด: ${p.sizes.map(s => "EU " + s).join(", ")}</div>
      <div class="offer-list">
        ${sorted.map(o => renderOfferRow(o, o === bestOffer)).join("")}
      </div>
    </div>
  </article>
</main>

<footer class="footer">
  <p>ราคาและสต็อกอัปเดตโดยแอดมิน — คลิกปุ่ม "ไปที่ร้าน" เพื่อเปิดหน้าร้านค้าจริงของแต่ละแพลตฟอร์ม</p>
</footer>

</body>
</html>`);
});

module.exports = router;
