// Mock catalog data — demo prices/stock. Replace with live feed from
// affiliate APIs / stock-checker automation described in CLAUDE.md later.
module.exports = [
  {
    id: "nk-af1-07",
    name: "Nike Air Force 1 '07",
    brand: "Nike",
    category: "lifestyle",
    image: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b7d9211c-26e7-431a-ac24-b0540fb3c00f/air-force-1-07-shoes.png",
    sizes: [39, 40, 41, 42, 43, 44],
    offers: [
      { store: "Nike Official (TH)", type: "official", price: 4200, code: "NIKE10", discount: 0.10, inStockSizes: [40, 41, 42, 43], url: "https://www.nike.com/th/" },
      { store: "Shopee Mall", type: "shopee", price: 3990, code: "SPXSALE", discount: 0.05, inStockSizes: [39, 41, 44], url: "https://shopee.co.th/" },
      { store: "Lazada Mall", type: "lazada", price: 4050, code: "LZDSHOE", discount: 0.08, inStockSizes: [40, 42], url: "https://www.lazada.co.th/" }
    ]
  },
  {
    id: "ad-samba-og",
    name: "Adidas Samba OG",
    brand: "Adidas",
    category: "lifestyle",
    image: "https://assets.adidas.com/images/w_600,f_auto,q_auto/b3d5d1a7c2e94c6a9e6faf5900f5e6e5_9366/Samba_OG_Shoes_White_B75806_01_standard.jpg",
    sizes: [38, 39, 40, 41, 42, 43],
    offers: [
      { store: "Adidas Official (TH)", type: "official", price: 3900, code: "ADI15", discount: 0.15, inStockSizes: [39, 40, 42], url: "https://www.adidas.co.th/" },
      { store: "Shopee Mall", type: "shopee", price: 3690, code: "SPXSALE", discount: 0.05, inStockSizes: [38, 41, 43], url: "https://shopee.co.th/" },
      { store: "TikTok Shop", type: "tiktok", price: 3550, code: "TTS9", discount: 0.09, inStockSizes: [40, 41], url: "https://shop.tiktok.com/" }
    ]
  },
  {
    id: "nb-550",
    name: "New Balance 550",
    brand: "New Balance",
    category: "lifestyle",
    image: "https://nb.scene7.com/is/image/NB/bb550lwt_nb_02_i?$pdpflexf2$&wid=440&hei=440",
    sizes: [39, 40, 41, 42, 43, 44, 45],
    offers: [
      { store: "New Balance Official (TH)", type: "official", price: 4500, code: "NB5OFF", discount: 0.05, inStockSizes: [41, 42, 43, 45], url: "https://www.newbalance.co.th/" },
      { store: "Lazada Mall", type: "lazada", price: 4190, code: "LZDSHOE", discount: 0.08, inStockSizes: [39, 40, 44], url: "https://www.lazada.co.th/" },
      { store: "Shopee Mall", type: "shopee", price: 4290, code: "SPXSALE", discount: 0.05, inStockSizes: [42, 43], url: "https://shopee.co.th/" }
    ]
  },
  {
    id: "cv-ctas-hi",
    name: "Converse Chuck Taylor All Star Hi",
    brand: "Converse",
    category: "lifestyle",
    image: "https://www.converse.com/dw/image/v2/BCZC_PRD/on/demandware.static/-/Sites-converse-master-catalog/default/m1622-2/images/a_107/M9160_A_107X1.jpg",
    sizes: [37, 38, 39, 40, 41, 42],
    offers: [
      { store: "Shopee Mall", type: "shopee", price: 2190, code: "SPXSALE", discount: 0.05, inStockSizes: [37, 39, 41, 42], url: "https://shopee.co.th/" },
      { store: "Lazada Mall", type: "lazada", price: 2290, code: "LZDSHOE", discount: 0.08, inStockSizes: [38, 40], url: "https://www.lazada.co.th/" }
    ]
  },
  {
    id: "nk-dunk-low",
    name: "Nike Dunk Low Retro",
    brand: "Nike",
    category: "skate",
    image: "https://static.nike.com/a/images/t_PDP_1728_v1/f_auto,q_auto:eco/b1bcbca4-e853-4df7-b329-5be3c61ee057/dunk-low-retro-shoes.png",
    sizes: [39, 40, 41, 42, 43, 44],
    offers: [
      { store: "Nike Official (TH)", type: "official", price: 3600, code: "NIKE10", discount: 0.10, inStockSizes: [40, 43], url: "https://www.nike.com/th/" },
      { store: "TikTok Shop", type: "tiktok", price: 3390, code: "TTS9", discount: 0.09, inStockSizes: [39, 41, 42, 44], url: "https://shop.tiktok.com/" },
      { store: "Shopee Mall", type: "shopee", price: 3450, code: "SPXSALE", discount: 0.05, inStockSizes: [41, 44], url: "https://shopee.co.th/" }
    ]
  },
  {
    id: "as-gel-nyc",
    name: "ASICS Gel-NYC",
    brand: "ASICS",
    category: "running",
    image: "https://images.asics.com/is/image/asics/1201A789_020_SR_RT_GLB?$sfcc_details$",
    sizes: [38, 39, 40, 41, 42, 43],
    offers: [
      { store: "ASICS Official (TH)", type: "official", price: 4800, code: "ASX12", discount: 0.12, inStockSizes: [39, 40, 41], url: "https://www.asics.com/th/" },
      { store: "Lazada Mall", type: "lazada", price: 4390, code: "LZDSHOE", discount: 0.08, inStockSizes: [38, 42, 43], url: "https://www.lazada.co.th/" }
    ]
  }
];
