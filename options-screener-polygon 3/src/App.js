import React, { useState, useEffect, useCallback, useRef } from "react";
import Screener from "./components/Screener";
import TopPlays from "./components/TopPlays";
import FilterPanel from "./components/FilterPanel";
import StatusBar from "./components/StatusBar";
import "./App.css";

const DEFAULT_TICKERS = ["SPY", "QQQ", "NVDA", "TSLA", "AAPL", "SPX"];
const STORAGE_KEY = "scalp_screener_tickers";

const DEFAULT_FILTERS = {
  deltaMin: 0.15, deltaMax: 0.70,
  gammaMin: 0.01, thetaMax: 1.00,
  ivrMin: 0, voiMin: 0,
  spreadMax: 0.50, dteMax: 5,
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
  const [debugData, setDebugData] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const intervalRef = useRef(null);

  const handleTickersChange = (newTickers) => {
    setTickers(newTickers);
    saveTickers(newTickers);
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setScanProgress(`Scanning 0/${tickers.length}`);

    let completed = 0;
    const allResults = [];
    const allDebug = [];

    try {
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
            if (data.debug) allDebug.push(data.debug);
            return data.results || [];
          } catch (err) {
            console.warn(`Failed ${ticker}:`, err.message);
            allDebug.push({ ticker, error: err.message });
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
      setDebugData(allDebug);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <button className="scan-btn" onClick={resetFilters} title="Reset filters to defaults">
            ↺ Reset
          </button>
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

      {!loading && results.length === 0 && lastScan && (
        <div className="debug-panel">
          <button className="debug-toggle" onClick={() => setShowDebug(!showDebug)}>
            {showDebug ? "▼" : "▶"} No results — show diagnostic info
          </button>
          {showDebug && (
            <div className="debug-content">
              {debugData.map((d, i) => (
                <div key={i} className="debug-row">
                  <strong>{d.ticker}</strong>
                  {d.error && <span className="debug-error"> — Error: {d.error}</span>}
                  {!d.error && (
                    <span>
                      {" "}— Polygon status: {d.status || "n/a"} |
                      contracts returned: {d.resultCount ?? "n/a"} |
                      total seen: {d.totalSeen ?? 0} |
                      skipped (no greeks): {d.skippedNoGreeks ?? 0}
                      {d.errorMsg && <span className="debug-error"> | API error: {d.errorMsg}</span>}
                    </span>
                  )}
                </div>
              ))}
              <div className="debug-hint">
                If "contracts returned" is 0, Polygon isn't returning data for that ticker (check market hours or plan tier).
                If "skipped (no greeks)" is high relative to total seen, your plan may not include real-time greeks for these contracts.
                Otherwise, try Reset to widen filters back to defaults.
              </div>
            </div>
          )}
        </div>
      )}

      {topPlays.length > 0 && <TopPlays plays={topPlays} />}
      <Screener results={results} loading={loading} />
    </div>
  );
}
