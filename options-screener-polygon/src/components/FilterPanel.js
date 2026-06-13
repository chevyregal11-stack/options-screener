import React, { useState } from "react";

export default function FilterPanel({ filters, onChange }) {
  const [types, setTypes] = useState(filters.types);

  function update(key, val) {
    onChange({ ...filters, [key]: val });
  }

  function toggleType(t) {
    let next;
    if (types.includes(t) && types.length > 1) {
      next = types.filter((x) => x !== t);
    } else if (!types.includes(t)) {
      next = [...types, t];
    } else {
      next = types;
    }
    setTypes(next);
    onChange({ ...filters, types: next });
  }

  return (
    <div className="filter-panel">
      <div className="filter-panel-title">Filters</div>
      <div className="filter-grid">
        <div className="filter-item">
          <label>Delta min</label>
          <input type="range" min="10" max="70" step="1"
            value={Math.round(filters.deltaMin * 100)}
            onChange={(e) => update("deltaMin", e.target.value / 100)} />
          <div className="filter-value">{filters.deltaMin.toFixed(2)}</div>
        </div>
        <div className="filter-item">
          <label>Delta max</label>
          <input type="range" min="20" max="80" step="1"
            value={Math.round(filters.deltaMax * 100)}
            onChange={(e) => update("deltaMax", e.target.value / 100)} />
          <div className="filter-value">{filters.deltaMax.toFixed(2)}</div>
        </div>
        <div className="filter-item">
          <label>Min gamma</label>
          <input type="range" min="1" max="30" step="1"
            value={Math.round(filters.gammaMin * 100)}
            onChange={(e) => update("gammaMin", e.target.value / 100)} />
          <div className="filter-value">≥ {filters.gammaMin.toFixed(2)}</div>
        </div>
        <div className="filter-item">
          <label>Max theta/day</label>
          <input type="range" min="1" max="60" step="1"
            value={Math.round(filters.thetaMax * 100)}
            onChange={(e) => update("thetaMax", e.target.value / 100)} />
          <div className="filter-value">≤ ${filters.thetaMax.toFixed(2)}</div>
        </div>
        <div className="filter-item">
          <label>Min vol/OI</label>
          <input type="range" min="1" max="20" step="1"
            value={Math.round(filters.voiMin * 2)}
            onChange={(e) => update("voiMin", e.target.value / 2)} />
          <div className="filter-value">≥ {filters.voiMin.toFixed(1)}×</div>
        </div>
        <div className="filter-item">
          <label>Max spread</label>
          <input type="range" min="1" max="20" step="1"
            value={Math.round(filters.spreadMax * 100)}
            onChange={(e) => update("spreadMax", e.target.value / 100)} />
          <div className="filter-value">≤ ${filters.spreadMax.toFixed(2)}</div>
        </div>
        <div className="filter-item">
          <label>DTE max</label>
          <input type="range" min="0" max="7" step="1"
            value={filters.dteMax}
            onChange={(e) => update("dteMax", parseInt(e.target.value))} />
          <div className="filter-value">0 – {filters.dteMax} DTE</div>
        </div>
        <div className="filter-item">
          <label>Type</label>
          <div className="type-btns" style={{marginTop: 6}}>
            <button
              className={`type-btn ${types.includes("call") ? "active-call" : ""}`}
              onClick={() => toggleType("call")}>Calls</button>
            <button
              className={`type-btn ${types.includes("put") ? "active-put" : ""}`}
              onClick={() => toggleType("put")}>Puts</button>
          </div>
        </div>
      </div>
    </div>
  );
}
