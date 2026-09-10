const catalogEl = document.getElementById("catalog");
const emptyStateEl = document.getElementById("emptyState");
const errorStateEl = document.getElementById("errorState");
const searchInput = document.getElementById("searchInput");
const sizeSelect = document.getElementById("sizeSelect");
const categorySelect = document.getElementById("categorySelect");
const brandBannerEl = document.getElementById("brandBanner");

const CATEGORIES = [
  { value: "lifestyle", key: "categoryLifestyle" },
  { value: "running", key: "categoryRunning" },
  { value: "basketball", key: "categoryBasketball" },
  { value: "skate", key: "categorySkate" },
  { value: "sandal", key: "categorySandal" }
];
const categoryLabel = value => {
  const c = CATEGORIES.find(c => c.value === value);
  return c ? I18N.t(c.key) : value;
};

// Domains used to fetch each brand's real logo via Google's public favicon
// service (https://www.google.com/s2/favicons?domain=<domain> — no key or
// signup needed). Clearbit's free Logo API, the more obvious choice, was
// shut down in December 2025; its official successor (logo.dev) requires a
// signed-up API token, so this avoids that friction. Brands not listed
// here fall back to guessing "<name-without-spaces>.com", which works for
// most single-word brand names but not multi-word ones (hence the explicit
// entries below).
const BRAND_LOGO_DOMAINS = {
  "Nike": "nike.com",
  "Jordan": "jordan.com",
  "adidas": "adidas.com",
  "New Balance": "newbalance.com",
  "Asics": "asics.com",
  "Birkenstock": "birkenstock.com",
  "Crocs": "crocs.com",
  "Puma": "puma.com",
  "Converse": "converse.com",
  "Salomon": "salomon.com",
  "On": "on-running.com",
  "Vans": "vans.com",
  "Hoka": "hoka.com",
  "Onitsuka Tiger": "onitsukatiger.com",
  "Bape": "bape.com",
  "norda": "nordarun.com",
  "Anta": "anta.com",
  "Yeezy": "adidas.com",
  "Reebok": "reebok.com",
  "Skechers": "skechers.com",
  "Saucony": "saucony.com",
  "Mizuno": "mizuno.com",
  "Timberland": "timberland.com"
};

function brandLogoUrl(brand) {
  const domain = BRAND_LOGO_DOMAINS[brand] || `${brand.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

let PRODUCTS = [];
let selectedBrand = "";

function formatBaht(n) {
  return "฿" + Math.round(n).toLocaleString("th-TH");
}

function formatRelativeTime(isoString) {
  if (!isoString) return "";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return I18N.t("updatedJustNow");
  if (mins < 60) return I18N.t("updatedMinsAgo", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return I18N.t("updatedHoursAgo", { n: hours });
  const days = Math.round(hours / 24);
  return I18N.t("updatedDaysAgo", { n: days });
}

// Same shoe can cost a different amount per size at the same store, so
// price lookups always go through a specific size entry. With no size
// selected yet, we show whichever in-stock size is cheapest at that store.
// A size with no entry at all means the store never carries it; a size
// with an entry but inStock:false means it's just temporarily sold out —
// both are unavailable to buy, but only the first should disappear from
// "does this store even have this size" checks a shopper might reason about.
// (Range-priced offers skip this — they don't have per-size data.)
function pickSizeEntry(offer, selectedSize) {
  if (offer.inStock === false) return null;
  if (selectedSize) {
    const sp = offer.sizePrices.find(sp => sp.size === Number(selectedSize));
    return sp && sp.inStock !== false ? sp : null;
  }
  const inStock = offer.sizePrices.filter(sp => sp.inStock !== false);
  if (inStock.length === 0) return null;
  return inStock.reduce((min, sp) => (sp.netPrice < min.netPrice ? sp : min), inStock[0]);
}

// A range-priced offer only knows an overall min/max, not which sizes it
// covers, so it's treated as covering every size the product comes in —
// unless the whole offer has been auto-flagged out of stock.
function offerHasSize(offer, size) {
  if (offer.inStock === false) return false;
  if (offer.priceMode === "range") return true;
  return offer.sizePrices.some(sp => sp.size === Number(size) && sp.inStock !== false);
}

function contextNetPrice(offer, selectedSize) {
  if (offer.inStock === false) return Infinity;
  if (offer.priceMode === "range") return offer.minNetPrice ?? Infinity;
  const entry = pickSizeEntry(offer, selectedSize);
  return entry ? entry.netPrice : Infinity;
}

function populateCategoryOptions() {
  const previousValue = categorySelect.value;
  categorySelect.querySelectorAll("option[value]:not([value=''])").forEach(opt => opt.remove());
  const present = new Set(PRODUCTS.map(p => p.category));
  CATEGORIES.filter(c => present.has(c.value)).forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = I18N.t(c.key);
    categorySelect.appendChild(opt);
  });
  categorySelect.value = previousValue;
}

// One banner per brand, most-stocked first, showing the brand's real logo
// (fetched by domain via Clearbit's logo API — see brandLogoUrl). Clicking
// a banner narrows the catalog to that brand only; clicking the active one
// (or "ทั้งหมด") clears the filter back to all.
function populateBrandBanner() {
  const byBrand = new Map();
  PRODUCTS.forEach(p => byBrand.set(p.brand, (byBrand.get(p.brand) || 0) + 1));
  const brands = [...byBrand.entries()].sort((a, b) => b[1] - a[1]);

  brandBannerEl.innerHTML = "";

  const allCard = document.createElement("button");
  allCard.type = "button";
  allCard.className = "brand-card brand-card-all" + (selectedBrand === "" ? " active" : "");
  allCard.innerHTML = `<span class="brand-card-name">${I18N.t("allBrands")}</span>`;
  allCard.onclick = () => {
    selectedBrand = "";
    populateBrandBanner();
    render();
  };
  brandBannerEl.appendChild(allCard);

  brands.forEach(([brand]) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "brand-card" + (selectedBrand === brand ? " active" : "");
    card.innerHTML = `
      <img class="brand-logo" src="${brandLogoUrl(brand)}" alt="${brand}" loading="lazy">
      <span class="brand-logo-fallback">${brand}</span>
    `;
    card.querySelector(".brand-logo").onerror = function () {
      this.hidden = true;
      card.classList.add("logo-missing");
    };
    card.onclick = () => {
      selectedBrand = selectedBrand === brand ? "" : brand;
      populateBrandBanner();
      render();
    };
    brandBannerEl.appendChild(card);
  });
}

function populateSizeOptions() {
  const sizes = new Set();
  PRODUCTS.forEach(p => p.sizes.forEach(s => sizes.add(s)));
  [...sizes].sort((a, b) => a - b).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = `EU ${s}`;
    sizeSelect.appendChild(opt);
  });
}

function renderOfferRow(offer, isBest, selectedSize) {
  const row = document.createElement("div");
  const discountLabel = I18N.t("codeLabel", { code: offer.code, pct: Math.round(offer.discount * 100) });

  let inStock, priceHtml, note;

  if (offer.inStock === false) {
    inStock = false;
    priceHtml = "";
    note = I18N.t("outOfStockHere");
  } else if (offer.priceMode === "range") {
    inStock = true;
    const { netMin, netMax } = offer.priceRange;
    const priceLabel = netMin === netMax
      ? formatBaht(netMin)
      : `${formatBaht(netMin)} - ${formatBaht(netMax)}`;
    priceHtml = `<div class="price-net">${priceLabel}</div>`;
    note = `${I18N.t("priceVariesBySize")} • ${discountLabel}`;
  } else {
    const entry = pickSizeEntry(offer, selectedSize);
    inStock = !!entry;
    if (!inStock) {
      note = I18N.t("selectedSizeOos");
    } else if (selectedSize) {
      note = discountLabel;
    } else {
      note = `${I18N.t("fromSize", { size: entry.size })} • ${discountLabel}`;
    }
    priceHtml = inStock
      ? `<div class="price-net">${formatBaht(entry.netPrice)}</div><div class="price-orig">${formatBaht(entry.price)}</div>`
      : "";
  }

  row.className = "offer" + (isBest ? " best" : "");
  row.innerHTML = `
    <div class="offer-store">
      <div class="store-name">
        <span class="store-badge ${offer.type}">${offer.store}</span>
      </div>
      <div class="offer-note ${inStock ? "" : "oos"}">${note}</div>
      <div class="offer-updated">${formatRelativeTime(offer.lastUpdated)}</div>
    </div>
    <div class="offer-price">
      ${priceHtml}
      <a class="buy-btn ${inStock ? "" : "disabled"}"
         href="${offer.url}" target="_blank" rel="noopener noreferrer">
         ${I18N.t("goToStore")}
      </a>
    </div>
  `;
  return row;
}

function renderCard(product, selectedSize) {
  const visibleOffers = selectedSize
    ? product.offers.filter(o => offerHasSize(o, selectedSize))
    : product.offers;

  if (selectedSize && visibleOffers.length === 0) return null;

  const sorted = [...product.offers].sort(
    (a, b) => contextNetPrice(a, selectedSize) - contextNetPrice(b, selectedSize)
  );
  const bestOffer = sorted.find(o => contextNetPrice(o, selectedSize) < Infinity) || sorted[0];

  const card = document.createElement("article");
  card.className = "card";

  const detailUrl = `/shoes/${encodeURIComponent(product.id)}`;

  const media = document.createElement("div");
  media.className = "card-media";
  const mediaLink = document.createElement("a");
  mediaLink.href = detailUrl;
  const img = document.createElement("img");
  img.src = product.image;
  img.alt = product.name;
  img.loading = "lazy";
  img.onerror = () => { media.classList.add("broken"); };
  const fallback = document.createElement("div");
  fallback.className = "img-fallback";
  fallback.innerHTML = `<span>${I18N.t("noImage")}</span>`;
  mediaLink.appendChild(img);
  media.appendChild(mediaLink);
  media.appendChild(fallback);

  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <div class="card-brand">${product.brand} <span class="category-badge">${categoryLabel(product.category)}</span></div>
    <h3 class="card-name"><a href="${detailUrl}">${product.name}</a></h3>
    <div class="card-sizes">${I18N.t("allSizesLabel")} ${product.sizes.map(s => "EU " + s).join(", ")}</div>
  `;

  const offerList = document.createElement("div");
  offerList.className = "offer-list";
  sorted.forEach(o => {
    offerList.appendChild(renderOfferRow(o, o === bestOffer, selectedSize));
  });
  body.appendChild(offerList);

  card.appendChild(media);
  card.appendChild(body);
  return card;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const selectedSize = sizeSelect.value;
  const selectedCategory = categorySelect.value;

  catalogEl.innerHTML = "";
  let shown = 0;

  PRODUCTS
    .filter(p =>
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query)
    )
    .filter(p => !selectedCategory || p.category === selectedCategory)
    .filter(p => !selectedBrand || p.brand === selectedBrand)
    .forEach(p => {
      const card = renderCard(p, selectedSize);
      if (card) {
        catalogEl.appendChild(card);
        shown++;
      }
    });

  emptyStateEl.hidden = shown > 0;
}

searchInput.addEventListener("input", render);
sizeSelect.addEventListener("change", render);
categorySelect.addEventListener("change", render);

// ---------- Language + theme toggle buttons ----------

const langToggleBtn = document.getElementById("langToggleBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");

function updateLangButton() {
  langToggleBtn.textContent = I18N.t("langToggleLabel");
}

function updateThemeButton() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  themeToggleBtn.textContent = isDark ? I18N.t("themeToggleLabelLight") : I18N.t("themeToggleLabel");
}

langToggleBtn.addEventListener("click", () => {
  I18N.setLang(I18N.lang === "th" ? "en" : "th");
});

themeToggleBtn.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  setStoredTheme(next);
  updateThemeButton();
});

I18N.onChange(() => {
  updateLangButton();
  updateThemeButton();
  populateCategoryOptions();
  populateBrandBanner();
  render();
});

async function init() {
  I18N.applyStaticStrings();
  updateLangButton();
  updateThemeButton();
  try {
    const res = await fetch("/api/products");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    PRODUCTS = await res.json();
    populateCategoryOptions();
    populateSizeOptions();
    populateBrandBanner();

    // Honor a ?category= link (e.g. the breadcrumb on a /shoes/:id page)
    // so it actually narrows the catalog instead of just landing on "/".
    const categoryFromUrl = new URLSearchParams(location.search).get("category");
    if (categoryFromUrl && [...categorySelect.options].some(o => o.value === categoryFromUrl)) {
      categorySelect.value = categoryFromUrl;
    }

    render();
  } catch (err) {
    console.error("Failed to load products:", err);
    errorStateEl.hidden = false;
  }
}

init();
