// Run after getAccessTradeCredentials.js and setting ACCESSTRADE_USER_UID /
// ACCESSTRADE_SECRET_KEY in server/.env — lists your sites and their
// affiliated campaigns so you can find the siteId + campaignId to put in
// ACCESSTRADE_SITE_ID / ACCESSTRADE_CAMPAIGN_ID (the SASOM campaign is
// likely id 1114, from the publisher dashboard URL, but the siteId isn't
// derivable from that URL alone).
require("dotenv").config();
const { accessTradeRequest } = require("../services/accessTradeClient");

async function main() {
  const sites = await accessTradeRequest("/v1/publishers/me/sites");
  console.log("Sites:", JSON.stringify(sites, null, 2));

  for (const site of sites.content || sites.sites || []) {
    const siteId = site.id || site.siteId;
    if (!siteId) continue;
    try {
      const campaigns = await accessTradeRequest(`/v1/publishers/me/sites/${siteId}/campaigns/affiliated`);
      console.log(`\nCampaigns for site ${siteId}:`, JSON.stringify(campaigns, null, 2));
    } catch (err) {
      console.error(`Failed to list campaigns for site ${siteId}: ${err.message}`);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
