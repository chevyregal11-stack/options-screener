import React from "react";

export default function StatusBar({
  loading, lastScan, error, resultCount, tickers, onTickersChange,
}) {
  function handleTickerInput(e) {
    const val = e.target.value;
    const parsed = val
      .toUpperCase()
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (parsed.length > 0) onTickersChange(parsed);
  }

  const dotClass = loading ? "loading" : error ? "error" : "";
  const statusText = loading
    ? "Scanning..."
    : lastScan
    ? `Last scan: ${lastScan.toLocaleTimeString()}`
    : "Not scanned yet";

  return (
    <div className="status-bar">
      <div className="status-info">
        <div className={`status-dot ${dotClass}`} />
        <span className="status-text">{statusText}</span>
        {!loading && !error && lastScan && (
          <span className="status-count">{resultCount} matches</span>
        )}
        {error && <span className="status-error">Error: {error}</span>}
      </div>
      <div className="ticker-input-wrap">
        <label>Watchlist:</label>
        <input
          className="ticker-input"
          defaultValue={tickers.join(", ")}
          onBlur={handleTickerInput}
          placeholder="SPY, QQQ, NVDA, TSLA..."
        />
      </div>
    </div>
  );
}
