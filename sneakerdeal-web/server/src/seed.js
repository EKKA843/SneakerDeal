require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const Product = require("./models/Product");
const seedData = require("./seedData");

async function run() {
  await connectDB();
  await Product.deleteMany({});
  await Product.insertMany(seedData);
  console.log(`Seeded ${seedData.length} products.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
