import React, { useState, useEffect, useCallback, useRef } from "react";
import Screener from "./components/Screener";
import TopPlays from "./components/TopPlays";
import FilterPanel from "./components/FilterPanel";
import StatusBar from "./components/StatusBar";
import "./App.css";

const DEFAULT_TICKERS = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "SPX"];

const DEFAULT_FILTERS = {
  deltaMin: 0.25,
  deltaMax: 0.6,
  gammaMin: 0.06,
  thetaMax: 0.25,
  ivrMin: 35,
  voiMin: 1.5,
  spreadMax: 0.08,
  dteMax: 3,
  types: ["call", "put"],
};

// Netlify redirects /api/scan → /.netlify/functions/scan automatically
const API_BASE = "/api";

function App() {
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tickers, setTickers] = useState(DEFAULT_TICKERS);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const intervalRef = useRef(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers, filters }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Server error ${res.status}: ${errText.slice(0, 120)}`);
      }
      const data = await res.json();
      setResults(data);
      setLastScan(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [tickers, filters]);

  // Auto-scan every 60 seconds during market hours (ET)
  useEffect(() => {
    if (autoScan) {
      scan();
      intervalRef.current = setInterval(() => {
        const now = new Date();
        const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
        const day = et.getDay();
        const mins = et.getHours() * 60 + et.getMinutes();
        const isMarketHours = day >= 1 && day <= 5 && mins >= 570 && mins <= 960;
        if (isMarketHours) scan();
      }, 60000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoScan, scan]);

  const topPlays = results.slice(0, 3);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>Options Scalp Screener</h1>
          <span className="header-sub">Powered by Tradier</span>
        </div>
        <div className="header-right">
          <label className="auto-toggle">
            <input
              type="checkbox"
              checked={autoScan}
              onChange={(e) => setAutoScan(e.target.checked)}
            />
            Auto-scan (60s)
          </label>
          <button className="scan-btn" onClick={scan} disabled={loading}>
            {loading ? "Scanning..." : "⟳ Scan now"}
          </button>
        </div>
      </header>

      <StatusBar
        loading={loading}
        lastScan={lastScan}
        error={error}
        resultCount={results.length}
        tickers={tickers}
        onTickersChange={setTickers}
      />

      <FilterPanel filters={filters} onChange={setFilters} />

      {topPlays.length > 0 && <TopPlays plays={topPlays} />}

      <Screener results={results} loading={loading} />
    </div>
  );
}

export default App;
