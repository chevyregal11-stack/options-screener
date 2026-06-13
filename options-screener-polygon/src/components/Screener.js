import React, { useState } from "react";

export default function Screener({ results, loading }) {
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  function signal(r) {
    if (r.score >= 70) return { label: "🔥 Hot", cls: "sig-hot" };
    if (r.score >= 45) return { label: "✅ Entry", cls: "sig-entry" };
    return { label: "👁 Watch", cls: "sig-watch" };
  }

  function SortTh({ k, children }) {
    const active = sortKey === k;
    return (
      <th
        onClick={() => handleSort(k)}
        style={{ cursor: "pointer", userSelect: "none",
          color: active ? "#8888ee" : undefined }}
      >
        {children} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
      </th>
    );
  }

  return (
    <div className="screener">
      {loading && <div className="loading-bar" />}
      <div className="screener-header">
        <span className="screener-title">All results</span>
        <span className="screener-count">{results.length} contracts</span>
      </div>

      {results.length === 0 && !loading ? (
        <div className="empty-state">
          <h3>No contracts match your filters</h3>
          <p>Try widening the delta range, lowering gamma min, or increasing DTE max.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <SortTh k="ticker">Ticker</SortTh>
                <th>Type</th>
                <th>Strike / Exp</th>
                <SortTh k="score">Score</SortTh>
                <SortTh k="delta">Delta</SortTh>
                <SortTh k="gamma">Gamma</SortTh>
                <SortTh k="theta">Theta</SortTh>
                <SortTh k="iv">IV%</SortTh>
                <SortTh k="voi">Vol/OI</SortTh>
                <SortTh k="spread">Spread</SortTh>
                <SortTh k="mid">Mid</SortTh>
                <th>Entry → Target</th>
                <th>Signal</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const sig = signal(r);
                const barW = Math.round(r.delta * 80);
                const expDate = new Date(r.expiration + "T00:00:00");
                const expLabel = expDate.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
                const scoreClass = r.score >= 70 ? "score-high" : r.score >= 45 ? "score-mid" : "score-low";
                return (
                  <tr key={i}>
                    <td className="ticker-cell">{r.ticker}</td>
                    <td>
                      <span className={`badge badge-${r.type}`}>{r.type}</span>
                    </td>
                    <td style={{ color: "#666678" }}>
                      ${r.strike} · {expLabel} · {r.dte}d
                    </td>
                    <td>
                      <span className={`score-pill ${scoreClass}`}>{r.score}</span>
                    </td>
                    <td>
                      <div className="delta-bar-wrap">
                        <div className="delta-bar" style={{ width: barW }} />
                        {r.delta.toFixed(2)}
                      </div>
                    </td>
                    <td>{r.gamma.toFixed(3)}</td>
                    <td style={{ color: "#ff6666" }}>−${r.theta.toFixed(2)}</td>
                    <td>{r.iv}%</td>
                    <td>{r.voi.toFixed(1)}×</td>
                    <td style={{ color: r.spread <= 0.04 ? "#22c55e" : "#f59e0b" }}>
                      ${r.spread.toFixed(2)}
                    </td>
                    <td>${r.mid.toFixed(2)}</td>
                    <td style={{ fontSize: 12 }}>
                      <span style={{ color: "#c0c0ff" }}>${r.entryPrice}</span>
                      <span style={{ color: "#444458" }}> → </span>
                      <span style={{ color: "#22c55e" }}>${r.targetPrice}</span>
                      <span style={{ color: "#555568" }}> (+{r.profitTargetPct}%)</span>
                    </td>
                    <td className={sig.cls}>{sig.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
