require("dotenv").config();
const path = require("path");
const express = require("express");
const { connectDB } = require("./db");
const productsRouter = require("./routes/products");
const adminRouter = require("./routes/admin");
const productPageRouter = require("./routes/productPage");
const sitemapRouter = require("./routes/sitemap");
const priceRefreshJob = require("./jobs/priceRefreshJob");

const app = express();
const webRoot = path.join(__dirname, "..", "..");

app.use("/api/products", productsRouter);
app.use("/api/admin", adminRouter);
app.use(productPageRouter);
app.use(sitemapRouter);

// Clean URL for the admin panel — /admin instead of /admin.html.
// ("/" already serves index.html with no extension in the URL, since
// that's express.static's default `index` file.)
app.get("/admin", (req, res) => res.sendFile(path.join(webRoot, "admin.html")));

app.use(express.static(webRoot));

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    priceRefreshJob.start(process.env.PRICE_REFRESH_CRON);
    app.listen(PORT, () => console.log(`SneakerDeal server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
