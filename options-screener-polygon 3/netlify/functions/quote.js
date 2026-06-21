const https = require("https");
const TOKEN = process.env.POLYGON_API_KEY;

function polygonGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.polygon.io",
      path: `${path}?apiKey=${TOKEN}`,
      method: "GET",
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.end();
  });
}

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  const symbol = event.queryStringParameters?.symbol;
  if (!symbol) return { statusCode: 400, headers, body: JSON.stringify({ error: "symbol required" }) };
  try {
    const data = await polygonGet(`/v2/last/trade/${symbol}`);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
