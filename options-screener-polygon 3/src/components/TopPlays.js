import React from "react";

export default function TopPlays({ plays }) {
  return (
    <div className="top-plays">
      <div className="section-title">⚡ Top plays</div>
      <div className="plays-grid">
        {plays.map((play, i) => (
          <PlayCard key={`${play.ticker}-${play.strike}-${play.type}-${i}`} play={play} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

function PlayCard({ play, rank }) {
  const upside = (((play.targetPrice - play.entryPrice) / play.entryPrice) * 100).toFixed(0);
  const downside = (((play.entryPrice - play.stopPrice) / play.entryPrice) * 100).toFixed(0);

  const expDate = new Date(play.expiration + "T00:00:00");
  const expLabel = expDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className={`play-card rank-${rank}`}>
      <div className="play-header">
        <div>
          <div className="play-title">
            {play.ticker} ${play.strike} {play.type.toUpperCase()}
          </div>
          <div className="play-sub">
            Exp {expLabel} · {play.dte === 0 ? "0DTE" : `${play.dte}DTE`} · IV {play.iv}%
          </div>
        </div>
        <div className="score-circle">
          <span className="score-num">{play.score}</span>
          <span className="score-label">score</span>
        </div>
      </div>

      <div className="profit-badge">
        Take profits at +{play.profitTargetPct}% (+${(play.entryPrice * play.profitTargetPct / 100).toFixed(2)}/contract×100)
      </div>

      <div className="play-levels">
        <div className="level">
          <div className="level-label">Entry</div>
          <div className="level-val entry">${play.entryPrice}</div>
          <div className="level-sub">mid price</div>
        </div>
        <div className="level">
          <div className="level-label">Target</div>
          <div className="level-val target">${play.targetPrice}</div>
          <div className="level-sub">+{upside}%</div>
        </div>
        <div className="level">
          <div className="level-label">Stop</div>
          <div className="level-val stop">${play.stopPrice}</div>
          <div className="level-sub">−{downside}%</div>
        </div>
      </div>

      <div className="play-greeks">
        <div className="greek">
          <span className="greek-name">Δ Delta</span>
          <span className="greek-val">{play.delta.toFixed(2)}</span>
        </div>
        <div className="greek">
          <span className="greek-name">Γ Gamma</span>
          <span className="greek-val">{play.gamma.toFixed(3)}</span>
        </div>
        <div className="greek">
          <span className="greek-name">Θ Theta</span>
          <span className="greek-val">−${play.theta.toFixed(2)}</span>
        </div>
        <div className="greek">
          <span className="greek-name">Vol/OI</span>
          <span className="greek-val">{play.voi.toFixed(1)}×</span>
        </div>
        <div className="greek">
          <span className="greek-name">Spread</span>
          <span className="greek-val">${play.spread.toFixed(2)}</span>
        </div>
      </div>

      <div className="play-reason">
        <strong>Why:</strong> {play.reason}
      </div>
    </div>
  );
}
