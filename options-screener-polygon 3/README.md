# Options Scalp Screener — Netlify + Polygon.io

Real-time options screener with greeks, scoring engine, and entry/exit targets.
Powered by Polygon.io. No brokerage account needed — execute trades in Webull.

---

## Setup (5 steps, ~10 minutes)

### Step 1 — Get your Polygon API key
1. Go to https://polygon.io → click **Get Started Free**
2. Sign up → verify email
3. Go to **Dashboard** → **API Keys**
4. Your default key is already there — copy it
5. Upgrade to the **Starter plan ($29/mo)** — required for options greeks (delta, gamma, theta)
   - Free plan does NOT include options greeks

### Step 2 — Push to GitHub
1. Go to https://github.com → click **New repository**
2. Name it `options-screener` → Create repository
3. Drag and drop the entire unzipped project folder into GitHub → Commit changes

### Step 3 — Connect to Netlify
1. Go to https://netlify.com → Log in (or sign up free)
2. Click **Add new site** → **Import an existing project** → **GitHub**
3. Select your `options-screener` repo
4. Build settings auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `build`
5. Click **Deploy site**

### Step 4 — Add your Polygon API key (IMPORTANT)
1. In Netlify → **Site settings** → **Environment variables**
2. Click **Add a variable** and add:

| Key | Value |
|---|---|
| `POLYGON_API_KEY` | your key from Step 1 |

3. Click **Save**
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**

### Step 5 — Open your site
Netlify gives you a URL like `https://your-site-name.netlify.app`
Open it → click **Scan now** → live greeks load instantly.

---

## How it works

```
Browser (React app)
    ↓  POST /api/scan
Netlify redirect
    ↓
/.netlify/functions/scan  ← your API key lives here only
    ↓  HTTPS requests
Polygon.io options snapshots API
    ↓  contracts + greeks + quotes
Back to your browser → scored + ranked
```

Your API key never touches the browser — it only exists inside Netlify's serverless function.

---

## Scoring engine

Each contract scored 0–100:

| Factor | Weight | What it measures |
|---|---|---|
| Gamma scalp potential | 35% | High gamma = option moves fast with stock |
| Liquidity | 30% | Tight spread + volume = clean fills, no slippage |
| Momentum | 25% | Vol/OI ratio = real fresh activity |
| Risk/reward | 10% | Delta ÷ theta = gain speed vs time decay |

**Score 70+** → 🔥 Hot — strong entry
**Score 45–69** → ✅ Entry — valid scalp
**Score <45** → 👁 Watch — wait

---

## Entry / exit guide

| DTE | Profit target | Stop loss |
|---|---|---|
| 0DTE | +25% | −50% |
| 1DTE | +30% | −50% |
| 2–3DTE | +40% | −50% |

Entry = bid/ask midpoint (use a limit order, never pay the ask)
Stop = always 50% of premium paid — protects against blow-ups

---

## Troubleshooting

**"POLYGON_API_KEY not set"** → Check Netlify env vars and redeploy

**0 results** → Outside market hours (Polygon data is live only during market hours), or filters too tight

**Greeks all showing 0** → You're on the free Polygon plan — upgrade to Starter ($29/mo) for greeks

**Build fails** → Make sure `netlify.toml` is in the root of the uploaded folder
