require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const { runOnce } = require("./jobs/priceRefreshJob");

connectDB()
  .then(runOnce)
  .then(() => mongoose.disconnect())
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
