// Minimal client-side i18n: a flat key -> {th, en} string table, applied to
// any element carrying data-i18n (textContent) or data-i18n-placeholder
// (input placeholder). Dynamic strings built in app.js call I18N.t(key,
// vars) directly instead of going through the DOM.
const STRINGS = {
  tagline: { th: "เช็กราคาจบในที่เดียว", en: "Compare prices in one place" },
  heroTitle: {
    th: "รู้ทันทีว่าคู่ที่คุณอยากได้<br>ซื้อที่ไหนถูกสุด และไซส์ไหนมีของจริง",
    en: "Know instantly which store has the pair you want<br>at the best price with real stock"
  },
  heroSub: {
    th: "เปรียบเทียบราคาสุทธิจาก Official Store, Shopee Mall, Lazada Mall และ TikTok Shop ในหน้าเดียว",
    en: "Compare net prices from Official Store, Shopee Mall, Lazada Mall and TikTok Shop in one place"
  },
  searchPlaceholder: {
    th: "ค้นหารุ่นรองเท้า เช่น Air Force 1, Samba...",
    en: "Search for a shoe, e.g. Air Force 1, Samba..."
  },
  allCategories: { th: "ทุกหมวดหมู่", en: "All categories" },
  allSizes: { th: "ทุกไซส์", en: "All sizes" },
  allBrands: { th: "ทั้งหมด", en: "All" },
  pairsCount: { th: "{n} คู่", en: "{n} pairs" },
  emptyState: {
    th: "ไม่พบสินค้าที่ตรงกับเงื่อนไข ลองเปลี่ยนไซส์หรือคำค้นหาดูนะ",
    en: "No matching products. Try a different size or search term."
  },
  errorState: {
    th: "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    en: "Failed to load products. Please try again."
  },
  footer: {
    th: 'ราคาและสต็อกอัปเดตโดยแอดมิน — คลิกปุ่ม "ไปที่ร้าน" เพื่อเปิดหน้าร้านค้าจริงของแต่ละแพลตฟอร์ม',
    en: 'Prices and stock are updated by the admin — click "Go to Store" to open each platform\'s real store page'
  },
  categoryLifestyle: { th: "ลำลอง/ไลฟ์สไตล์", en: "Lifestyle" },
  categoryRunning: { th: "วิ่ง", en: "Running" },
  categoryBasketball: { th: "บาสเก็ตบอล", en: "Basketball" },
  categorySkate: { th: "สเก็ต", en: "Skate" },
  categorySandal: { th: "รองเท้าแตะ/รัดส้น", en: "Sandals" },
  allSizesLabel: { th: "ไซส์ทั้งหมด:", en: "All sizes:" },
  noImage: { th: "ไม่มีรูปภาพ", en: "No image" },
  goToStore: { th: "ไปที่ร้าน", en: "Go to Store" },
  outOfStockHere: { th: "สินค้าหมดสต็อกที่ร้านนี้", en: "Out of stock at this store" },
  selectedSizeOos: { th: "ไซส์ที่เลือกหมดสต็อกร้านนี้", en: "Selected size is out of stock here" },
  priceVariesBySize: { th: "ช่วงราคาตามไซส์", en: "Price varies by size" },
  fromSize: { th: "เริ่มต้นไซส์ EU {size}", en: "From EU {size}" },
  codeLabel: { th: "โค้ด {code} (-{pct}%)", en: "Code {code} (-{pct}%)" },
  updatedJustNow: { th: "อัปเดตล่าสุด: เมื่อสักครู่", en: "Updated: just now" },
  updatedMinsAgo: { th: "อัปเดตล่าสุด: {n} นาทีที่แล้ว", en: "Updated: {n} min ago" },
  updatedHoursAgo: { th: "อัปเดตล่าสุด: {n} ชั่วโมงที่แล้ว", en: "Updated: {n} hr ago" },
  updatedDaysAgo: { th: "อัปเดตล่าสุด: {n} วันที่แล้ว", en: "Updated: {n} days ago" },
  langToggleLabel: { th: "EN", en: "TH" },
  themeToggleLabel: { th: "โหมดมืด", en: "Dark mode" },
  themeToggleLabelLight: { th: "โหมดสว่าง", en: "Light mode" }
};

const LANG_KEY = "sneakerdeal_lang";

function getLang() {
  try { return localStorage.getItem(LANG_KEY) || "th"; } catch { return "th"; }
}

function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch {}
}

function t(key, vars) {
  const entry = STRINGS[key];
  if (!entry) return key;
  let text = entry[I18N.lang] || entry.th;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
}

// Applies the current language to every element with data-i18n /
// data-i18n-placeholder in the document — called on load and whenever the
// language changes.
function applyStaticStrings() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.innerHTML = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  });
  document.documentElement.lang = I18N.lang;
}

const I18N = {
  lang: getLang(),
  t,
  applyStaticStrings,
  setLang(lang) {
    I18N.lang = lang;
    setLang(lang);
    applyStaticStrings();
    I18N.listeners.forEach(fn => fn(lang));
  },
  listeners: [],
  onChange(fn) {
    I18N.listeners.push(fn);
  }
};

window.I18N = I18N;
