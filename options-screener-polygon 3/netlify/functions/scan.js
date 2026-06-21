const https = require("https");

const TOKEN = process.env.POLYGON_API_KEY;
const BASE = "api.polygon.io";

function polygonGet(path) {
  return new Promise((resolve, reject) => {
    const sep = path.includes("?") ? "&" : "?";
    const fullPath = `${path}${sep}apiKey=${TOKEN}`;
    const options = { hostname: BASE, path: fullPath, method: "GET", timeout: 8000 };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 200))); }
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
    req.end();
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function getDTE(expirationStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationStr + "T00:00:00");
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (!TOKEN) return { statusCode: 500, headers, body: JSON.stringify({ error: "POLYGON_API_KEY not set" }) };

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch (_) {}

  const { ticker, filters = {} } = body;
  if (!ticker) return { statusCode: 400, headers, body: JSON.stringify({ error: "ticker required" }) };

  const {
    deltaMin = 0.15, deltaMax = 0.70,
    gammaMin = 0.01, thetaMax = 1.00,
    voiMin = 0, spreadMax = 0.50,
    dteMax = 5, types = ["call", "put"],
  } = filters;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + dteMax);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const results = [];
  let totalSeen = 0;
  let skippedNoGreeks = 0;
  let debugInfo = {};

  try {
    const underlying = ticker === "SPX" ? "I:SPX" : ticker === "XSP" ? "I:XSP" : ticker;
    let nextUrl = `/v3/snapshot/options/${underlying}?expiration_date.gte=${todayStr}&expiration_date.lte=${maxDateStr}&limit=250`;
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < 3) {
      const data = await polygonGet(nextUrl);
      pages++;

      if (pages === 1) {
        debugInfo.status = data.status;
        debugInfo.requestId = data.request_id;
        debugInfo.resultCount = data.results ? data.results.length : 0;
        debugInfo.errorMsg = data.error || data.message || null;
      }

      if (data.status === "ERROR" || !data.results) break;

      const contracts = data.results || [];

      for (const contract of contracts) {
        totalSeen++;
        const details = contract.details || {};
        const greeks = contract.greeks || {};
        const day = contract.day || {};
        const lastQuote = contract.last_quote || {};

        const optType = details.contract_type;
        if (!optType || !types.includes(optType)) continue;

        // Skip contracts with no greeks data at all (deep ITM/OTM, Polygon often omits these)
        const hasGreeks = greeks && (greeks.delta !== undefined && greeks.delta !== null);
        if (!hasGreeks) { skippedNoGreeks++; continue; }

        const delta = Math.abs(greeks.delta || 0);
        const gamma = greeks.gamma || 0;
        const theta = Math.abs(greeks.theta || 0);
        const iv = contract.implied_volatility || 0;
        const volume = day.volume || 0;
        const oi = contract.open_interest || 0;
        const bid = lastQuote.bid || 0;
        const ask = lastQuote.ask || 0;
        const spread = ask > 0 && bid > 0 ? ask - bid : 0;
        const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : (contract.last_trade?.price || day.close || 0);
        const voi = oi > 0 ? volume / oi : (volume > 0 ? 99 : 0);
        const expiration = details.expiration_date || "";
        const dte = getDTE(expiration);
        const strike = details.strike_price || 0;

        // Soft filters — skip only truly broken/unusable contracts
        if (delta < deltaMin || delta > deltaMax) continue;
        if (gamma < gammaMin) continue;
        if (theta > thetaMax) continue;
        if (spreadMax > 0 && spread > spreadMax) continue;
        if (voi < voiMin) continue;
        if (mid < 0.02) continue;
        if (dte < 0 || dte > dteMax) continue;

        const gammaScore = Math.min(gamma / 0.25, 1) * 35;
        const liquidityScore =
          Math.min(volume / 5000, 1) * 15 +
          (spread > 0 ? Math.max(0, 1 - spread / 0.1) * 15 : 7.5);
        const momentumScore = Math.min(voi / 10, 1) * 25;
        const rrScore = (Math.min(delta / Math.max(theta, 0.01), 5) / 5) * 10;
        const totalScore = Math.round(gammaScore + liquidityScore + momentumScore + rrScore);

        const entryPrice = parseFloat(mid.toFixed(2));
        const profitTargetPct = dte === 0 ? 25 : dte <= 1 ? 30 : 40;
        const targetPrice = parseFloat((mid * (1 + profitTargetPct / 100)).toFixed(2));
        const stopPrice = parseFloat((mid * 0.5).toFixed(2));

        const reasons = [];
        if (gamma >= 0.12) reasons.push(`high gamma (${gamma.toFixed(2)}) means fast gains on moves`);
        if (voi >= 3) reasons.push(`${voi.toFixed(1)}x vol/OI confirms real activity`);
        if (spread > 0 && spread <= 0.03) reasons.push(`tight $${spread.toFixed(2)} spread = clean fills`);
        if (dte === 0) reasons.push(`0DTE — max gamma, move fast`);
        if (reasons.length === 0 && oi === 0 && volume === 0) reasons.push(`low recent activity — verify liquidity before entry`);
        const reason = reasons.length > 0 ? reasons.join("; ") : `balanced delta/gamma profile with adequate liquidity`;

        results.push({
          ticker, type: optType, strike, expiration, dte,
          delta: parseFloat(delta.toFixed(3)),
          gamma: parseFloat(gamma.toFixed(3)),
          theta: parseFloat(theta.toFixed(3)),
          iv: parseFloat((iv * 100).toFixed(1)),
          volume, oi,
          voi: parseFloat(voi.toFixed(2)),
          bid, ask,
          spread: parseFloat(spread.toFixed(2)),
          mid: entryPrice, score: totalScore,
          entryPrice, targetPrice, stopPrice, profitTargetPct, reason,
        });
      }

      if (data.next_url && contracts.length === 250) {
        nextUrl = data.next_url.replace("https://api.polygon.io", "").replace(/apiKey=[^&]+&?/, "").replace(/&$/, "");
        await sleep(100);
      } else {
        hasMore = false;
      }
    }
  } catch (err) {
    console.error(`Error scanning ${ticker}:`, err.message);
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ results: [], debug: { error: err.message, ticker } }),
    };
  }

  results.sort((a, b) => b.score - a.score);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      results,
      debug: { ticker, totalSeen, skippedNoGreeks, ...debugInfo },
    }),
  };
};
