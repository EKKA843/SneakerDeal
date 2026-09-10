# SneakerDeal

Sneaker price & size comparison platform. Static frontend (vanilla JS) served
by an Express/MongoDB backend — no build step.

## Local development

```
cd sneakerdeal-web/server
cp .env.example .env   # fill in MONGODB_URI and ADMIN_TOKEN
npm install
npm start
```

Site: http://localhost:4000 — Admin panel: http://localhost:4000/admin

## Deploying to Render

This repo includes a `render.yaml` Blueprint at the root.

1. On [Render](https://dashboard.render.com), **New +** → **Blueprint**, connect this GitHub repo.
2. Render reads `render.yaml` and creates the web service automatically
   (root dir `sneakerdeal-web/server`, `npm install` / `npm start`).
3. Set the two required environment variables in the Render dashboard
   (marked `sync: false` in the Blueprint, so Render won't ask for a value
   until you set it — never commit these):
   - `MONGODB_URI` — your Atlas connection string
   - `ADMIN_TOKEN` — any long random string; this is what the admin panel
     needs to authenticate (paste the same value into `/admin`'s login box)
4. **MongoDB Atlas → Network Access**: allow connections from Render.
   Render's outbound IP isn't static on the free tier, so add `0.0.0.0/0`
   (Allow Access from Anywhere) unless you're on a paid Atlas tier with a
   static IP / VPC peering.
5. Deploy. First boot seeds nothing automatically — if the database is
   empty, run `npm run seed` once against the same `MONGODB_URI` (locally,
   pointed at the prod database) to load the starter catalog, or add
   products directly via `/admin`.

`PRICE_REFRESH_CRON` (optional) controls how often offers with a
`sourceUrl` get their price/stock auto-refreshed from SASOM — defaults to
every 30 minutes.
