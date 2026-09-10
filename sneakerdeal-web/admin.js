const tokenGate = document.getElementById("tokenGate");
const tokenInput = document.getElementById("tokenInput");
const tokenSaveBtn = document.getElementById("tokenSaveBtn");
const tokenError = document.getElementById("tokenError");
const adminApp = document.getElementById("adminApp");
const adminList = document.getElementById("adminList");
const offerRowsEl = document.getElementById("offerRows");
const addOfferRowBtn = document.getElementById("addOfferRowBtn");
const createProductBtn = document.getElementById("createProductBtn");
const createProductMsg = document.getElementById("createProductMsg");
const npSizesEl = document.getElementById("npSizes");
const npCategoryEl = document.getElementById("npCategory");
const adminSearch = document.getElementById("adminSearch");
const adminListEmpty = document.getElementById("adminListEmpty");

const TOKEN_KEY = "sneakerdeal_admin_token";
const STORE_TYPES = ["official", "shopee", "lazada", "tiktok", "other"];
const ALL_SIZES = Array.from({ length: 46 - 36 + 1 }, (_, i) => 36 + i); // EU 36-46
const CATEGORIES = [
  { value: "lifestyle", label: "ลำลอง/ไลฟ์สไตล์" },
  { value: "running", label: "วิ่ง" },
  { value: "basketball", label: "บาสเก็ตบอล" },
  { value: "skate", label: "สเก็ต" },
  { value: "sandal", label: "รองเท้าแตะ/รัดส้น" }
];
const categoryLabel = value => (CATEGORIES.find(c => c.value === value) || CATEGORIES[0]).label;

function populateCategorySelect(select, selected) {
  select.innerHTML = "";
  CATEGORIES.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.value;
    opt.textContent = c.label;
    if (c.value === selected) opt.selected = true;
    select.appendChild(opt);
  });
}

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
}
function setToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "x-admin-token": getToken()
    }
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// ---------- Size chip picker (yes/no — used only for the product's full size range) ----------
function renderSizeChips(container, sizes, selectedSet, onChange) {
  container.innerHTML = "";
  if (sizes.length === 0) {
    container.classList.add("empty-hint");
    return;
  }
  container.classList.remove("empty-hint");
  sizes.forEach(size => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "size-chip" + (selectedSet.has(size) ? " selected" : "");
    chip.textContent = size;
    chip.onclick = () => {
      if (selectedSet.has(size)) selectedSet.delete(size);
      else selectedSet.add(size);
      chip.classList.toggle("selected");
      if (onChange) onChange();
    };
    container.appendChild(chip);
  });
}

// Same as renderSizeChips, but with "select all / clear all" buttons above
// the grid — for the product-level size range, ticking 36-46 one at a time
// gets tedious. `container` gets fully rebuilt on every call.
function renderSizePickerWithControls(container, sizes, selectedSet, onChange) {
  container.innerHTML = "";
  const controls = document.createElement("div");
  controls.className = "size-picker-controls";

  const selectAllBtn = document.createElement("button");
  selectAllBtn.type = "button";
  selectAllBtn.className = "mini-btn";
  selectAllBtn.textContent = "เลือกทุกไซส์";

  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "mini-btn";
  clearBtn.textContent = "ล้างทั้งหมด";

  controls.appendChild(selectAllBtn);
  controls.appendChild(clearBtn);
  container.appendChild(controls);

  const chipsWrap = document.createElement("div");
  container.appendChild(chipsWrap);

  function refresh() {
    renderSizeChips(chipsWrap, sizes, selectedSet, onChange);
  }

  selectAllBtn.onclick = () => {
    sizes.forEach(s => selectedSet.add(s));
    refresh();
    if (onChange) onChange();
  };
  clearBtn.onclick = () => {
    selectedSet.clear();
    refresh();
    if (onChange) onChange();
  };

  refresh();
}

// ---------- Size -> price grid (used per offer — same shoe can cost a
// different amount per size at the same store) ----------
// `priceMap` is a Map<size, {price, inStock}>, mutated in place. No entry
// at all means the store never carries that size; an entry with
// inStock:false means it's just temporarily sold out (price kept so
// re-stocking is a one-click toggle, not a re-type).
function renderSizePriceGrid(container, sizes, priceMap) {
  container.innerHTML = "";
  if (sizes.length === 0) {
    container.classList.add("empty-hint");
    return;
  }
  container.classList.remove("empty-hint");
  sizes.forEach(size => {
    const entry = priceMap.get(size);
    const cell = document.createElement("div");
    cell.className = "size-price-cell" + (entry ? " filled" : "") + (entry && !entry.inStock ? " oos" : "");
    cell.innerHTML = `
      <label>${size}</label>
      <input type="number" min="0" class="sp-price" value="${entry ? entry.price : ""}" placeholder="—">
      <button type="button" class="sp-stock-toggle" ${entry ? "" : "hidden"}>${entry && !entry.inStock ? "หมด" : "มีของ"}</button>
    `;
    const input = cell.querySelector(".sp-price");
    const toggleBtn = cell.querySelector(".sp-stock-toggle");

    input.addEventListener("input", () => {
      const val = Number(input.value);
      if (!input.value.trim() || val <= 0) {
        priceMap.delete(size);
      } else {
        const prevInStock = priceMap.get(size)?.inStock ?? true;
        priceMap.set(size, { price: val, inStock: prevInStock });
      }
      const now = priceMap.get(size);
      cell.classList.toggle("filled", !!now);
      cell.classList.toggle("oos", !!now && !now.inStock);
      toggleBtn.hidden = !now;
      if (now) toggleBtn.textContent = now.inStock ? "มีของ" : "หมด";
    });

    toggleBtn.addEventListener("click", () => {
      const now = priceMap.get(size);
      if (!now) return;
      now.inStock = !now.inStock;
      toggleBtn.textContent = now.inStock ? "มีของ" : "หมด";
      cell.classList.toggle("oos", !now.inStock);
    });

    container.appendChild(cell);
  });
}

function readSizePrices(priceMap) {
  return [...priceMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([size, entry]) => ({ size, price: entry.price, inStock: entry.inStock !== false }));
}

// ---------- Pricing section (shared) ----------
// One store either has an exact price per size ("perSize") or just
// publishes a general min-max range across whatever sizes it carries
// ("range") — some resellers don't break prices down by size at all.
// `getSizes()` returns the current size list (a live function so an
// add-product row can react as the product-level size picker changes).
function createPricingSection(getSizes, initialOffer) {
  const wrap = document.createElement("div");
  wrap.className = "pricing-section";
  const startMode = initialOffer && initialOffer.priceMode === "range" ? "range" : "perSize";

  wrap.innerHTML = `
    <div class="price-mode-toggle">
      <button type="button" class="mode-btn" data-mode="perSize">ราคาต่อไซส์</button>
      <button type="button" class="mode-btn" data-mode="range">ช่วงราคา (ต่ำสุด-สูงสุด)</button>
    </div>
    <div class="grid-wrap size-price-grid"></div>
    <div class="range-wrap" hidden>
      <div class="field">
        <label>ราคาต่ำสุด</label>
        <input type="number" min="0" class="range-min">
      </div>
      <div class="field">
        <label>ราคาสูงสุด</label>
        <input type="number" min="0" class="range-max">
      </div>
    </div>
  `;

  const priceMap = new Map(
    (initialOffer?.sizePrices || []).map(sp => [sp.size, { price: sp.price, inStock: sp.inStock !== false }])
  );
  const gridWrap = wrap.querySelector(".grid-wrap");
  const rangeWrap = wrap.querySelector(".range-wrap");
  const minInput = wrap.querySelector(".range-min");
  const maxInput = wrap.querySelector(".range-max");
  if (initialOffer?.priceRange) {
    minInput.value = initialOffer.priceRange.min ?? "";
    maxInput.value = initialOffer.priceRange.max ?? "";
  }

  let currentMode = startMode;

  function renderGrid() {
    renderSizePriceGrid(gridWrap, [...getSizes()].sort((a, b) => a - b), priceMap);
  }

  function setMode(mode) {
    currentMode = mode;
    wrap.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
    gridWrap.hidden = mode !== "perSize";
    rangeWrap.hidden = mode !== "range";
  }

  wrap.querySelectorAll(".mode-btn").forEach(btn => {
    btn.onclick = () => setMode(btn.dataset.mode);
  });

  setMode(startMode);
  renderGrid();

  return {
    el: wrap,
    refreshSizes: renderGrid,
    read() {
      if (currentMode === "range") {
        const min = Number(minInput.value);
        const max = Number(maxInput.value);
        const valid = min > 0 && max > 0 && min <= max;
        return { priceMode: "range", priceRange: valid ? { min, max } : null, sizePrices: [] };
      }
      return { priceMode: "perSize", sizePrices: readSizePrices(priceMap), priceRange: null };
    }
  };
}

function pricingHasData(pricing) {
  return pricing.priceMode === "range" ? !!pricing.priceRange : pricing.sizePrices.length > 0;
}

// ---------- Add product form ----------

const npSizesSelected = new Set();

function renderNpSizePicker() {
  renderSizePickerWithControls(npSizesEl, ALL_SIZES, npSizesSelected, () => {
    syncAllOfferRowSizePickers();
  });
}

function syncAllOfferRowSizePickers() {
  offerRowsEl.querySelectorAll(".offer-row").forEach(row => row._pricing.refreshSizes());
}

function createOfferRow() {
  const row = document.createElement("div");
  row.className = "offer-row";
  row.innerHTML = `
    <div class="field">
      <label>ชื่อร้าน</label>
      <input class="o-store" type="text" placeholder="เช่น Shopee Mall">
    </div>
    <div class="field type-field">
      <label>ประเภท</label>
      <select class="o-type">
        ${STORE_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}
      </select>
    </div>
    <div class="field discount-field">
      <label>ส่วนลด (0-1)</label>
      <input class="o-discount" type="number" min="0" max="1" step="0.01" value="0">
    </div>
    <div class="field code-field">
      <label>โค้ด</label>
      <input class="o-code" type="text">
    </div>
    <div class="field url-field">
      <label>ลิงก์ร้านค้า</label>
      <input class="o-url" type="text" placeholder="https://...">
    </div>
    <div class="field url-field">
      <label>ลิงก์หน้าสินค้าจริง (ถ้ามี — ใช้ดึงราคาอัตโนมัติ)</label>
      <input class="o-source-url" type="text" placeholder="https://sasom.co.th/...">
    </div>
    <div class="field sizes-field"></div>
    <button type="button" class="remove-row-btn">ลบร้านนี้</button>
  `;
  row.querySelector(".remove-row-btn").onclick = () => row.remove();
  row._pricing = createPricingSection(() => npSizesSelected, null);
  row.querySelector(".sizes-field").appendChild(row._pricing.el);
  return row;
}

addOfferRowBtn.addEventListener("click", () => {
  offerRowsEl.appendChild(createOfferRow());
});

function readOfferRows() {
  return [...offerRowsEl.querySelectorAll(".offer-row")].map(row => ({
    store: row.querySelector(".o-store").value.trim(),
    type: row.querySelector(".o-type").value,
    discount: Number(row.querySelector(".o-discount").value) || 0,
    code: row.querySelector(".o-code").value.trim(),
    ...row._pricing.read(),
    url: row.querySelector(".o-url").value.trim(),
    sourceUrl: row.querySelector(".o-source-url").value.trim()
  }));
}

function resetAddProductForm() {
  document.getElementById("npName").value = "";
  document.getElementById("npBrand").value = "";
  document.getElementById("npImage").value = "";
  populateCategorySelect(npCategoryEl, "lifestyle");
  npSizesSelected.clear();
  renderNpSizePicker();
  offerRowsEl.innerHTML = "";
  offerRowsEl.appendChild(createOfferRow());
}

createProductBtn.addEventListener("click", async () => {
  createProductMsg.textContent = "";
  createProductMsg.className = "create-msg";

  const name = document.getElementById("npName").value.trim();
  const brand = document.getElementById("npBrand").value.trim();
  const image = document.getElementById("npImage").value.trim();
  const category = npCategoryEl.value;
  const sizes = [...npSizesSelected].sort((a, b) => a - b);
  const offers = readOfferRows().filter(o => o.store && o.url && pricingHasData(o));

  if (!name || !brand || !image || sizes.length === 0 || offers.length === 0) {
    createProductMsg.textContent = "กรุณากรอกชื่อ, แบรนด์, รูปภาพ, ไซส์ และร้านค้าที่มีราคาอย่างน้อย 1 ร้าน";
    createProductMsg.classList.add("error");
    return;
  }

  try {
    await apiFetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, brand, image, category, sizes, offers })
    });
    createProductMsg.textContent = "เพิ่มสินค้าสำเร็จ";
    createProductMsg.classList.add("success");
    resetAddProductForm();
    await refreshAdminList();
  } catch (err) {
    createProductMsg.textContent = "เพิ่มสินค้าไม่สำเร็จ: " + err.message;
    createProductMsg.classList.add("error");
  }
});

// ---------- Existing product list / edit / delete ----------

function renderOfferForm(product, offer) {
  const row = document.createElement("div");
  row.className = "admin-offer";

  row.innerHTML = `
    <div class="field store"><div class="store-label">${offer.store}</div></div>
    <div class="field discount">
      <label>ส่วนลด (0-1)</label>
      <input type="number" class="f-discount" value="${offer.discount}" min="0" max="1" step="0.01">
    </div>
    <div class="field code">
      <label>โค้ด</label>
      <input type="text" class="f-code" value="${offer.code}">
    </div>
    <div class="field affiliate-url-field">
      <label>ลิงก์ Affiliate (ปุ่ม "ไปที่ร้าน" — ลูกค้ากดแล้วคุณได้ค่าคอมมิชชัน)</label>
      <input type="text" class="f-url" value="${offer.url || ""}" placeholder="https://atth.me/go/... หรือลิงก์ affiliate ของร้าน">
    </div>
    <div class="field source-url-field">
      <label>ลิงก์หน้าสินค้าจริง (ถ้ามี — ใช้ดึงราคาอัตโนมัติเท่านั้น ไม่ใช่ลิงก์ affiliate)</label>
      <input type="text" class="f-source-url" value="${offer.sourceUrl || ""}" placeholder="https://sasom.co.th/...">
    </div>
    <div class="field sizes"></div>
    ${offer.inStock === false ? '<div class="auto-oos-note">ระบบดึงข้อมูลอัตโนมัติพบว่าสินค้าหมดที่ร้านนี้</div>' : ""}
  `;
  const pricing = createPricingSection(() => product.sizes, offer);
  row.querySelector(".field.sizes").appendChild(pricing.el);

  const saveBtn = document.createElement("button");
  saveBtn.className = "save-btn";
  saveBtn.textContent = "บันทึก";
  saveBtn.onclick = async () => {
    saveBtn.textContent = "กำลังบันทึก...";
    saveBtn.classList.remove("saved");
    const discount = Number(row.querySelector(".f-discount").value);
    const code = row.querySelector(".f-code").value.trim();
    const url = row.querySelector(".f-url").value.trim();
    const sourceUrl = row.querySelector(".f-source-url").value.trim();

    if (!url) {
      saveBtn.textContent = "กรอกลิงก์ Affiliate ก่อนบันทึก";
      return;
    }

    try {
      await apiFetch(`/api/admin/products/${product.id}/offers/${encodeURIComponent(offer.store)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discount, code, url, sourceUrl, ...pricing.read() })
      });
      saveBtn.textContent = "บันทึกแล้ว";
      saveBtn.classList.add("saved");
    } catch (err) {
      saveBtn.textContent = "บันทึกไม่สำเร็จ ลองใหม่";
      console.error(err);
    }
  };

  row.appendChild(saveBtn);

  const genLinkBtn = document.createElement("button");
  genLinkBtn.type = "button";
  genLinkBtn.className = "secondary-btn gen-affiliate-link-btn";
  genLinkBtn.textContent = "สร้างลิงก์ affiliate อัตโนมัติ";
  genLinkBtn.title = "เรียก AccessTrade API เพื่อสร้างลิงก์ affiliate จาก \"ลิงก์หน้าสินค้าจริง\" แล้วบันทึกเป็น \"ลิงก์ร้านค้า\" ให้อัตโนมัติ — ต้องตั้งค่า ACCESSTRADE_* ใน .env ก่อน";
  genLinkBtn.onclick = async () => {
    genLinkBtn.textContent = "กำลังสร้างลิงก์...";
    genLinkBtn.disabled = true;
    try {
      await apiFetch(`/api/admin/products/${product.id}/offers/${encodeURIComponent(offer.store)}/generate-affiliate-link`, {
        method: "POST"
      });
      genLinkBtn.textContent = "สร้างลิงก์สำเร็จ";
      await refreshAdminList();
    } catch (err) {
      genLinkBtn.textContent = "สร้างลิงก์ affiliate อัตโนมัติ";
      genLinkBtn.disabled = false;
      alert("สร้างลิงก์ไม่สำเร็จ: " + err.message);
    }
  };
  row.appendChild(genLinkBtn);

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-offer-btn";
  removeBtn.type = "button";
  removeBtn.textContent = "ลบร้านนี้";
  removeBtn.onclick = async () => {
    if (!confirm(`ลบร้าน "${offer.store}" ออกจากสินค้านี้?`)) return;
    try {
      await apiFetch(`/api/admin/products/${product.id}/offers/${encodeURIComponent(offer.store)}`, {
        method: "DELETE"
      });
      await refreshAdminList();
    } catch (err) {
      alert("ลบไม่สำเร็จ: " + err.message);
    }
  };
  row.appendChild(removeBtn);

  return row;
}

// Form for adding a new store/offer to a product that already exists.
// Size choices are fixed to that product's existing size range.
function renderAddOfferForm(product) {
  const wrap = document.createElement("div");
  wrap.className = "add-offer-form";

  wrap.innerHTML = `
    <div class="offer-row">
      <div class="field">
        <label>ชื่อร้าน</label>
        <input class="na-store" type="text" placeholder="เช่น Shopee Mall">
      </div>
      <div class="field type-field">
        <label>ประเภท</label>
        <select class="na-type">
          ${STORE_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}
        </select>
      </div>
      <div class="field discount-field">
        <label>ส่วนลด (0-1)</label>
        <input class="na-discount" type="number" min="0" max="1" step="0.01" value="0">
      </div>
      <div class="field code-field">
        <label>โค้ด</label>
        <input class="na-code" type="text">
      </div>
      <div class="field url-field">
        <label>ลิงก์ร้านค้า</label>
        <input class="na-url" type="text" placeholder="https://...">
      </div>
      <div class="field url-field">
        <label>ลิงก์หน้าสินค้าจริง (ถ้ามี — ใช้ดึงราคาอัตโนมัติ)</label>
        <input class="na-source-url" type="text" placeholder="https://sasom.co.th/...">
      </div>
      <div class="field sizes-field"></div>
    </div>
    <div class="add-product-actions">
      <button type="button" class="secondary-btn na-submit">เพิ่มร้านนี้</button>
      <span class="create-msg na-msg"></span>
    </div>
  `;
  const pricing = createPricingSection(() => product.sizes, null);
  wrap.querySelector(".sizes-field").appendChild(pricing.el);

  const msg = wrap.querySelector(".na-msg");
  wrap.querySelector(".na-submit").onclick = async () => {
    msg.textContent = "";
    msg.className = "create-msg na-msg";

    const store = wrap.querySelector(".na-store").value.trim();
    const url = wrap.querySelector(".na-url").value.trim();
    const pricingData = pricing.read();
    if (!store || !url || !pricingHasData(pricingData)) {
      msg.textContent = "กรอกชื่อร้าน, ลิงก์ และราคาให้ครบ";
      msg.classList.add("error");
      return;
    }

    try {
      await apiFetch(`/api/admin/products/${product.id}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          type: wrap.querySelector(".na-type").value,
          discount: Number(wrap.querySelector(".na-discount").value) || 0,
          code: wrap.querySelector(".na-code").value.trim(),
          ...pricingData,
          url,
          sourceUrl: wrap.querySelector(".na-source-url").value.trim()
        })
      });
      await refreshAdminList();
    } catch (err) {
      msg.textContent = "เพิ่มร้านไม่สำเร็จ: " + err.message;
      msg.classList.add("error");
    }
  };

  return wrap;
}

// Form for editing a product's own info (name, brand, image, and its size
// range) — e.g. a new size just released. Removing a size here also drops
// any offer prices set for that size, so the two stay consistent.
function renderEditProductForm(product) {
  const wrap = document.createElement("div");
  wrap.className = "edit-product-form";
  const sizesSelected = new Set(product.sizes);

  wrap.innerHTML = `
    <div class="form-grid">
      <div class="field">
        <label>ชื่อรุ่น</label>
        <input class="ep-name" type="text" value="${product.name}">
      </div>
      <div class="field">
        <label>แบรนด์</label>
        <input class="ep-brand" type="text" value="${product.brand}">
      </div>
      <div class="field">
        <label>หมวดหมู่</label>
        <select class="ep-category"></select>
      </div>
      <div class="field field-wide">
        <label>ลิงก์รูปภาพ</label>
        <input class="ep-image" type="text" value="${product.image}">
      </div>
      <div class="field field-wide">
        <label>ไซส์ทั้งหมดที่มีขาย (คลิกเพิ่ม/เอาออกได้)</label>
        <div class="ep-sizes size-picker"></div>
      </div>
    </div>
    <div class="add-product-actions">
      <button type="button" class="secondary-btn ep-submit">บันทึกข้อมูลสินค้า</button>
      <span class="create-msg ep-msg"></span>
    </div>
  `;
  renderSizePickerWithControls(wrap.querySelector(".ep-sizes"), ALL_SIZES, sizesSelected);
  populateCategorySelect(wrap.querySelector(".ep-category"), product.category);

  const msg = wrap.querySelector(".ep-msg");
  wrap.querySelector(".ep-submit").onclick = async () => {
    msg.textContent = "";
    msg.className = "create-msg ep-msg";

    const name = wrap.querySelector(".ep-name").value.trim();
    const brand = wrap.querySelector(".ep-brand").value.trim();
    const image = wrap.querySelector(".ep-image").value.trim();
    const category = wrap.querySelector(".ep-category").value;
    const sizes = [...sizesSelected].sort((a, b) => a - b);

    if (!name || !brand || !image || sizes.length === 0) {
      msg.textContent = "กรอกชื่อ, แบรนด์, รูปภาพ และเลือกไซส์อย่างน้อย 1 ไซส์";
      msg.classList.add("error");
      return;
    }

    try {
      await apiFetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, brand, image, category, sizes })
      });
      await refreshAdminList();
    } catch (err) {
      msg.textContent = "บันทึกไม่สำเร็จ: " + err.message;
      msg.classList.add("error");
    }
  };

  return wrap;
}

function renderProduct(product) {
  const card = document.createElement("div");
  card.className = "admin-product";

  const header = document.createElement("div");
  header.className = "admin-product-header";
  header.innerHTML = `
    <div class="admin-product-main">
      <div class="admin-thumb">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <div class="thumb-fallback">ไม่มีรูป</div>
      </div>
      <div>
        <h3>${product.name}</h3>
        <div class="brand-line">${product.brand} • ${categoryLabel(product.category)} — ไซส์ทั้งหมด: ${product.sizes.join(", ")}</div>
      </div>
    </div>
  `;
  const thumb = header.querySelector(".admin-thumb");
  thumb.querySelector("img").onerror = () => thumb.classList.add("broken");

  const headerActions = document.createElement("div");
  headerActions.className = "header-actions";

  const editProductForm = renderEditProductForm(product);
  editProductForm.hidden = true;
  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "edit-product-btn";
  editBtn.textContent = "แก้ไขข้อมูลสินค้า";
  editBtn.onclick = () => { editProductForm.hidden = !editProductForm.hidden; };
  headerActions.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "delete-product-btn";
  deleteBtn.textContent = "ลบสินค้านี้";
  deleteBtn.onclick = async () => {
    if (!confirm(`ลบ "${product.name}" ทิ้งเลยหรือไม่?`)) return;
    try {
      await apiFetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      await refreshAdminList();
    } catch (err) {
      alert("ลบไม่สำเร็จ: " + err.message);
    }
  };
  headerActions.appendChild(deleteBtn);
  header.appendChild(headerActions);
  card.appendChild(header);
  card.appendChild(editProductForm);

  product.offers.forEach(offer => card.appendChild(renderOfferForm(product, offer)));

  const addOfferForm = renderAddOfferForm(product);
  addOfferForm.hidden = true;
  const toggleAddOfferBtn = document.createElement("button");
  toggleAddOfferBtn.type = "button";
  toggleAddOfferBtn.className = "secondary-btn toggle-add-offer-btn";
  toggleAddOfferBtn.textContent = "+ เพิ่มร้านค้า/โปรโมชั่นใหม่";
  toggleAddOfferBtn.onclick = () => { addOfferForm.hidden = !addOfferForm.hidden; };
  card.appendChild(toggleAddOfferBtn);
  card.appendChild(addOfferForm);

  return card;
}

let allProducts = [];

function matchesSearch(product, query) {
  if (!query) return true;
  const haystack = [product.name, product.brand, ...product.offers.map(o => o.store)]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function renderFilteredList() {
  const query = adminSearch.value.trim().toLowerCase();
  const filtered = allProducts.filter(p => matchesSearch(p, query));
  adminList.innerHTML = "";
  filtered.forEach(p => adminList.appendChild(renderProduct(p)));
  adminListEmpty.hidden = filtered.length > 0;
}

async function refreshAdminList() {
  allProducts = await apiFetch("/api/admin/products");
  renderFilteredList();
}

adminSearch.addEventListener("input", renderFilteredList);

async function showAdminApp(token) {
  await refreshAdminList();
  setToken(token);
  tokenGate.hidden = true;
  adminApp.hidden = false;
  populateCategorySelect(npCategoryEl, "lifestyle");
  renderNpSizePicker();
  if (offerRowsEl.children.length === 0) offerRowsEl.appendChild(createOfferRow());
}

tokenSaveBtn.addEventListener("click", async () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  tokenError.hidden = true;
  setToken(token);
  try {
    await showAdminApp(token);
  } catch {
    tokenError.hidden = false;
  }
});

(async function init() {
  const saved = getToken();
  if (!saved) return;
  try {
    await showAdminApp(saved);
  } catch {
    // saved token no longer valid — show the login form as-is
  }
})();
