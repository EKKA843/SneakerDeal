// Run this ONCE, locally, to turn your AccessTrade login into the
// userUid + secretKey that accessTradeClient.js needs — this script never
// sends your password anywhere except AccessTrade's own auth endpoint, and
// never writes it to a file or prints it back.
//
// Usage (PowerShell):
//   $env:ACCESSTRADE_EMAIL = "you@example.com"
//   $env:ACCESSTRADE_PASSWORD = "your-password"
//   node src/scripts/getAccessTradeCredentials.js
//
// Copy the printed userUid/secretKey into server/.env as
// ACCESSTRADE_USER_UID / ACCESSTRADE_SECRET_KEY, then close this terminal
// (so the password doesn't linger in shell history — PowerShell keeps a
// command history file, so prefer typing $env:ACCESSTRADE_PASSWORD in a
// fresh window you'll close right after).
const crypto = require("crypto");

// Base host is a best guess (Thailand's publisher API host from
// support.accesstrade.global/api/api-endpoints.html is "gurkha.accesstrade.in.th"
// for the other v1 endpoints; this auth endpoint's host isn't explicitly
// documented). If this 404s, check AccessTrade's docs/support for the
// correct host and edit BASE_URL below.
const BASE_URL = "https://gurkha.accesstrade.in.th";

async function main() {
  const email = process.env.ACCESSTRADE_EMAIL;
  const password = process.env.ACCESSTRADE_PASSWORD;
  if (!email || !password) {
    console.error("Set ACCESSTRADE_EMAIL and ACCESSTRADE_PASSWORD env vars first (see header comment).");
    process.exit(1);
  }

  const passwordHash = crypto.createHash("md5").update(password).digest("hex");
  const authToken = crypto.createHash("sha256").update(`${email}:${passwordHash}`).digest("hex");

  const res = await fetch(`${BASE_URL}/publishers/auth/${encodeURIComponent(email)}`, {
    headers: { Authorization: authToken }
  });

  if (!res.ok) {
    console.error(`HTTP ${res.status} — check BASE_URL, or that email/password are correct.`);
    console.error(await res.text().catch(() => ""));
    process.exit(1);
  }

  const body = await res.json();
  console.log("Success. Add these to server/.env:");
  console.log(`ACCESSTRADE_USER_UID=${body.userUid}`);
  console.log(`ACCESSTRADE_SECRET_KEY=${body.secretKey}`);
  console.log(`# accountId: ${body.accountId}`);
}

main();
