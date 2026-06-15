import React, { useState, useEffect, useCallback, useRef } from "react";
import Screener from "./components/Screener";
import TopPlays from "./components/TopPlays";
import FilterPanel from "./components/FilterPanel";
import StatusBar from "./components/StatusBar";
import "./App.css";

const DEFAULT_TICKERS = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "SPX"];
const STORAGE_KEY = "scalp_screener_tickers";

const DEFAULT_FILTERS = {
  deltaMin: 0.25, deltaMax: 0.6,
  gammaMin: 0.06, thetaMax: 0.25,
  ivrMin: 35, voiMin: 1.5,
  spreadMax: 0.08, dteMax: 3,
  types: ["call", "put"],
};

function loadTickers() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return DEFAULT_TICKERS;
}

function saveTickers(tickers) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers)); } catch (_) {}
}

const API_BASE = "/api";

export default function App() {
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [tickers, setTickers] = useState(loadTickers);
  const [loading, setLoading] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [error, setError] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const [scanProgress, setScanProgress] = useState(null);
  const intervalRef = useRef(null);

  const handleTickersChange = (newTickers) => {
    setTickers(newTickers);
    saveTickers(newTickers);
  };

  // Scan one ticker at a time via parallel fetch calls
  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScanProgress(`Scanning 0/${tickers.length}`);

    let completed = 0;
    const allResults = [];

    try {
      // Run all tickers in parallel, 4 at a time to avoid rate limits
      const chunkSize = 4;
      for (let i = 0; i < tickers.length; i += chunkSize) {
        const chunk = tickers.slice(i, i + chunkSize);
        const promises = chunk.map(async (ticker) => {
          try {
            const res = await fetch(`${API_BASE}/scan`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ticker, filters }),
            });
            if (!res.ok) throw new Error(`${ticker}: ${res.status}`);
            const data = await res.json();
            return data;
          } catch (err) {
            console.warn(`Failed ${ticker}:`, err.message);
            return [];
          } finally {
            completed++;
            setScanProgress(`Scanning ${completed}/${tickers.length}`);
          }
        });

        const chunkResults = await Promise.all(promises);
        chunkResults.forEach(r => allResults.push(...r));
      }

      allResults.sort((a, b) => b.score - a.score);
      setResults(allResults);
      setLastScan(new Date());
      setScanProgress(null);
    } catch (err) {
      setError(err.message);
      setScanProgress(null);
    } finally {
      setLoading(false);
    }
  }, [tickers, filters]);

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
          <span className="header-sub">Powered by Polygon / Massive</span>
        </div>
        <div className="header-right">
          <label className="auto-toggle">
            <input type="checkbox" checked={autoScan}
              onChange={(e) => setAutoScan(e.target.checked)} />
            Auto-scan (60s)
          </label>
          <button className="scan-btn" onClick={scan} disabled={loading}>
            {loading ? (scanProgress || "Scanning...") : "⟳ Scan now"}
          </button>
        </div>
      </header>

      <StatusBar
        loading={loading} lastScan={lastScan} error={error}
        resultCount={results.length} tickers={tickers}
        onTickersChange={handleTickersChange}
        scanProgress={scanProgress}
      />

      <FilterPanel filters={filters} onChange={setFilters} />
      {topPlays.length > 0 && <TopPlays plays={topPlays} />}
      <Screener results={results} loading={loading} />
    </div>
  );
}
