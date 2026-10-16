'use client';

import { useMemo, useRef, useState } from 'react';
import { HORMONE_COLORS } from '@/lib/estrous/colors';
import { HORMONES, HORMONE_INFO, hormoneLevel, phaseOn, type Hormone, type Outcome } from '@/lib/estrous/cycle';

const W = 900;
const H = 268;
const M = { top: 60, right: 16, bottom: 34, left: 44 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const PHASE_SHORT: Record<string, string> = {
  estrus: 'Heat',
  metestrus: 'Metestrus',
  diestrus: 'Diestrus',
  proestrus: 'Proestrus',
  pregnancy: 'Pregnancy',
};

/** Relative hormone levels over the cycle, synced to the 3D: click or drag to change the day. */
export default function HormoneChart({
  outcome,
  maxDay,
  day,
  onDay,
}: {
  outcome: Outcome;
  maxDay: number;
  day: number;
  onDay: (d: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const series = HORMONES.filter((h) => outcome === 'pregnant' || h !== 'ifnTau');

  const x = (d: number) => M.left + (d / maxDay) * PW;
  const y = (v: number) => M.top + (1 - v) * PH;

  const paths = useMemo(() => {
    const out: Record<string, { d: string; peak: [number, number] }> = {};
    for (const h of series) {
      let d = '';
      let peak: [number, number] = [0, 0];
      for (let t = 0; t <= maxDay + 1e-6; t += 0.1) {
        const val = hormoneLevel(h, t, outcome);
        if (val > peak[1] + 1e-3 || (h === 'estradiol' && val >= peak[1] - 1e-3)) peak = [t, val];
        d += `${d ? 'L' : 'M'}${x(t).toFixed(1)},${y(val).toFixed(1)}`;
      }
      out[h] = { d, peak };
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, maxDay]);

  // Phase strip along the top.
  const phases = useMemo(() => {
    const bands: Array<{ from: number; to: number; phase: string }> = [];
    for (let t = 0; t <= maxDay; t += 0.25) {
      const p = phaseOn(t, outcome);
      const last = bands[bands.length - 1];
      if (last && last.phase === p) last.to = t + 0.25;
      else bands.push({ from: t, to: t + 0.25, phase: p });
    }
    return bands;
  }, [outcome, maxDay]);

  // Direct labels just above each series' peak, nudged sideways if two would collide.
  // Series that stay low (e.g. PGF2α in pregnancy) rely on the legend instead.
  const directLabels = useMemo(() => {
    const out: Array<{ h: Hormone; x: number; y: number }> = [];
    const order = [...series].sort((a, b) => paths[a].peak[0] - paths[b].peak[0]);
    for (const h of order) {
      const [pd, pv] = paths[h].peak;
      if (pv < 0.3) continue;
      const clampX = (v: number) => Math.min(W - M.right - 24, Math.max(M.left + 20, v));
      const baseY = y(pv) - 7;
      const tries = [
        { x: clampX(x(pd)), y: baseY },
        { x: clampX(x(pd)), y: baseY - 14 },
        { x: clampX(x(pd) + 38), y: baseY },
        { x: clampX(x(pd) - 38), y: baseY },
      ];
      const free = tries.find((c) => out.every((o) => Math.abs(o.x - c.x) > 44 || Math.abs(o.y - c.y) > 14));
      out.push({ h, ...(free ?? { x: tries[0].x, y: baseY + 16 }) });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths]);

  const dayFromEvent = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    return Math.min(maxDay, Math.max(0, ((px - M.left) / PW) * maxDay));
  };

  const ticks = Array.from({ length: Math.floor(maxDay / (maxDay > 25 ? 5 : 3)) + 1 }, (_, i) => i * (maxDay > 25 ? 5 : 3));
  const hd = hover ?? null;

  return (
    <figure className="hc">
      <figcaption className="hc-head">
        <b>Hormone levels</b>
        <span className="hc-sub">Relative — each hormone scaled to its own peak. Click or drag on the chart to move the day.</span>
      </figcaption>
      <ul className="hc-legend" aria-label="Legend">
        {series.map((h) => (
          <li key={h}>
            <i style={{ background: HORMONE_COLORS[h] }} aria-hidden="true" />
            {HORMONE_INFO[h].name}
          </li>
        ))}
      </ul>
      <div className="hc-wrap">
        <div className="hc-inner">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Relative hormone levels across the cycle"
          onPointerMove={(e) => {
            const d = dayFromEvent(e.clientX);
            setHover(d);
            if (e.buttons === 1 && d !== null) onDay(Math.round(d * 4) / 4);
          }}
          onPointerLeave={() => setHover(null)}
          onPointerDown={(e) => {
            const d = dayFromEvent(e.clientX);
            if (d !== null) onDay(Math.round(d * 4) / 4);
          }}
        >
          {/* phase strip */}
          {phases.map((b) => (
            <g key={`${b.phase}-${b.from}`}>
              <rect x={x(b.from)} y={6} width={Math.max(0, x(b.to) - x(b.from) - 2)} height={18} rx={4} className={`hc-phase hc-phase-${b.phase}`} />
              {x(b.to) - x(b.from) > 56 && (
                <text x={(x(b.from) + x(b.to)) / 2} y={19} textAnchor="middle" className="hc-phase-text">
                  {PHASE_SHORT[b.phase]}
                </text>
              )}
            </g>
          ))}
          {/* grid + axes */}
          {[0, 0.5, 1].map((g) => (
            <g key={g}>
              <line x1={M.left} x2={W - M.right} y1={y(g)} y2={y(g)} className="hc-grid" />
              <text x={M.left - 8} y={y(g) + 4} textAnchor="end" className="hc-tick">
                {g === 0 ? 'low' : g === 1 ? 'peak' : ''}
              </text>
            </g>
          ))}
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={H - 12} textAnchor="middle" className="hc-tick">
              {t}
            </text>
          ))}
          <text x={M.left - 8} y={H - 12} textAnchor="end" className="hc-tick">
            day
          </text>
          {/* series */}
          {series.map((h) => (
            <path key={h} d={paths[h].d} fill="none" stroke={HORMONE_COLORS[h]} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {/* direct labels at each series' peak (identity never colour-alone) */}
          {directLabels.map((l) => (
            <text key={l.h} x={l.x} y={l.y} textAnchor="middle" className="hc-direct">
              {HORMONE_INFO[l.h].short}
            </text>
          ))}
          {/* current day */}
          <line x1={x(day)} x2={x(day)} y1={M.top - 4} y2={M.top + PH} className="hc-now" />
          {series.map((h) => (
            <circle key={h} cx={x(day)} cy={y(hormoneLevel(h, day, outcome))} r={4.5} fill={HORMONE_COLORS[h]} stroke="#fcfcfb" strokeWidth={2} />
          ))}
          {/* hover crosshair */}
          {hd !== null && <line x1={x(hd)} x2={x(hd)} y1={M.top} y2={M.top + PH} className="hc-hover" />}
        </svg>
        {hd !== null && (
          <div className="hc-tip" style={{ left: `${(x(hd) / W) * 100}%` }}>
            <b>Day {hd.toFixed(1)}</b>
            {series.map((h) => (
              <span key={h}>
                <i style={{ background: HORMONE_COLORS[h] }} aria-hidden="true" />
                {HORMONE_INFO[h].short}
                <em>{Math.round(hormoneLevel(h, hd, outcome) * 100)}%</em>
              </span>
            ))}
          </div>
        )}
        </div>
      </div>
      <p className="hc-scroll-hint">Swipe sideways to see the whole cycle · tap to jump to a day</p>
      <details className="hc-table">
        <summary>Show as a table</summary>
        <div className="hc-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                {series.map((h) => (
                  <th key={h}>{HORMONE_INFO[h].short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxDay + 1 }, (_, d) => (
                <tr key={d}>
                  <td>{d}</td>
                  {series.map((h: Hormone) => (
                    <td key={h}>{Math.round(hormoneLevel(h, d, outcome) * 100)}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
