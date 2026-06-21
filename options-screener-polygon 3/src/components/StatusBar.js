import React, { useState, useEffect } from "react";

export default function StatusBar({
  loading, lastScan, error, resultCount, tickers, onTickersChange, scanProgress,
}) {
  const [inputVal, setInputVal] = useState(tickers.join(", "));

  useEffect(() => {
    setInputVal(tickers.join(", "));
  }, [tickers]);

  function handleSave() {
    const parsed = inputVal
      .toUpperCase()
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (parsed.length > 0) onTickersChange(parsed);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.target.blur(); handleSave(); }
  }

  const dotClass = loading ? "loading" : error ? "error" : "";
  const statusText = loading
    ? (scanProgress || "Scanning...")
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
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="SPY, QQQ, NVDA, TSLA..."
        />
        <button className="save-tickers-btn" onClick={handleSave}>Save</button>
      </div>
    </div>
  );
}
