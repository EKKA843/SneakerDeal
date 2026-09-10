// Dynamic sitemap — lists the homepage plus every product's /shoes/:id
// page, so search engines can discover and index each product individually
// instead of only the SPA homepage. (Static sitemap.xml can't do this
// since the catalog changes as the admin adds/removes products.)
const express = require("express");
const Product = require("../models/Product");

const router = express.Router();
const BASE_URL = "https://sneakerdeal.onrender.com";

router.get("/sitemap.xml", async (req, res) => {
  const products = await Product.find({}, { id: 1, updatedAt: 1, _id: 0 }).lean();

  const urls = [
    `<url><loc>${BASE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...products.map(p => {
      const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString().slice(0, 10) : "";
      return `<url><loc>${BASE_URL}/shoes/${encodeURIComponent(p.id)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    })
  ];

  res.type("application/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`
  );
});

module.exports = router;
