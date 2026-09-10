const express = require("express");
const Product = require("../models/Product");
const { enrichProduct } = require("../services/enrichProduct");

const router = express.Router();

router.get("/", async (req, res) => {
  const products = await Product.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean();
  res.json(products.map(enrichProduct));
});

module.exports = router;
