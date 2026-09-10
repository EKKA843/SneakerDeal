const dns = require("dns");
const mongoose = require("mongoose");

// The local network's default DNS resolver may not support SRV lookups,
// which mongodb+srv:// requires. Force a public resolver for this process only.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set — copy server/.env.example to server/.env and fill it in.");
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");
}

module.exports = { connectDB };
