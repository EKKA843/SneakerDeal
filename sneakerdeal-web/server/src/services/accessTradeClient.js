// Generates real AccessTrade affiliate tracking links (the same atth.me/go/...
// links already used in the catalog) via the AccessTrade Publisher API,
// instead of creating them by hand on the publisher dashboard.
//
// Requires ACCESSTRADE_USER_UID + ACCESSTRADE_SECRET_KEY in .env — obtain
// these by running scripts/getAccessTradeCredentials.js once (see that
// file's header comment). Also requires ACCESSTRADE_SITE_ID and
// ACCESSTRADE_CAMPAIGN_ID, which identify which of your sites/campaigns the
// link is generated under (the SASOM campaign id is 1114, from the
// publisher dashboard URL; the site id still needs to be looked up — see
// scripts/listAccessTradeSites.js).
const crypto = require("crypto");

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// A minimal HS256 JWT — sub: userUid, iat: now — signed with the account's
// secretKey, per AccessTrade's publisher API auth spec. No library needed
// for a token this simple.
function signJwt(userUid, secretKey) {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = { sub: userUid, iat: Math.floor(Date.now() / 1000) };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set — see server/src/services/accessTradeClient.js`);
  return value;
}

async function accessTradeRequest(path, options = {}) {
  const userUid = requireEnv("ACCESSTRADE_USER_UID");
  const secretKey = requireEnv("ACCESSTRADE_SECRET_KEY");
  const token = signJwt(userUid, secretKey);

  // Thailand-specific base host — AccessTrade's API host differs by
  // country (support.accesstrade.global/api/api-endpoints.html).
  const res = await fetch(`https://gurkha.accesstrade.in.th${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`AccessTrade API ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

// Turns a plain product page URL into a tracked affiliate link
// (https://atth.me/go/...). This is the automated equivalent of pasting
// the URL into the "Create Custom Link" tool on the publisher dashboard.
async function generateAffiliateLink(landingUrl, { name } = {}) {
  const siteId = requireEnv("ACCESSTRADE_SITE_ID");
  const campaignId = requireEnv("ACCESSTRADE_CAMPAIGN_ID");

  const body = await accessTradeRequest(
    `/v1/publishers/me/sites/${siteId}/campaigns/${campaignId}/creatives/custom`,
    {
      method: "POST",
      body: JSON.stringify({ landingUrl, name: name || landingUrl })
    }
  );

  const affiliateLink = body?.content?.[0]?.affiliateLink;
  if (!affiliateLink) throw new Error(`No affiliateLink in response: ${JSON.stringify(body)}`);
  return affiliateLink;
}

module.exports = { generateAffiliateLink, accessTradeRequest };
