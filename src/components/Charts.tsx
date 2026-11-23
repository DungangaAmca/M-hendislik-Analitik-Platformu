import React, { useState } from 'react';
import { DescriptiveSummary } from '../engines/descriptiveStats';
import { SpcSeriesPoint } from '../engines/spcCapabilityEngine';

// 1. Histogram + Normal Density Curve + Optional Spec Limits
export const HistogramChart: React.FC<{
  summary: DescriptiveSummary;
  lsl?: number;
  usl?: number;
  target?: number;
  height?: number;
}> = ({ summary, lsl, usl, target, height = 240 }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const bins = summary.histogramBins;
  if (bins.length === 0) return null;

  const w = 560;
  const h = height;
  const pad = { top: 20, right: 24, bottom: 36, left: 42 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const dataMin = Math.min(bins[0].x0, lsl ?? Infinity);
  const dataMax = Math.max(bins[bins.length - 1].x1, usl ?? -Infinity);
  const span = dataMax - dataMin || 1;
  const maxY = Math.max(...bins.map((b) => Math.max(b.count, b.normalY)), 1) * 1.12;

  const toX = (val: number) => pad.left + ((val - dataMin) / span) * innerW;
  const toY = (val: number) => pad.top + innerH - (val / maxY) * innerH;

  const curvePath = bins
    .map((b, i) => {
      const mx = toX(0.5 * (b.x0 + b.x1));
      const my = toY(b.normalY);
      return `${i === 0 ? 'M' : 'L'} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yVal = maxY * t;
          const yy = toY(yVal);
          return (
            <g key={t}>
              <line x1={pad.left} y1={yy} x2={w - pad.right} y2={yy} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
              <text x={pad.left - 6} y={yy + 3} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
                {yVal.toFixed(0)}
              </text>
            </g>
          );
        })}

        {bins.map((b, i) => {
          const x0 = toX(b.x0);
          const x1 = toX(b.x1);
          const bw = Math.max(2, x1 - x0 - 2);
          const yy = toY(b.count);
          const bh = Math.max(0, pad.top + innerH - yy);
          return (
            <rect
              key={i}
              x={x0 + 1}
              y={yy}
              width={bw}
              height={bh}
              rx="2"
              className={hoverIdx === i ? 'fill-blue-700' : 'fill-blue-600/80'}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          );
        })}

        <path d={curvePath} fill="none" stroke="#0F172A" className="dark:stroke-slate-200" strokeWidth="2" />

        {lsl !== undefined && (
          <g>
            <line x1={toX(lsl)} y1={pad.top} x2={toX(lsl)} y2={pad.top + innerH} stroke="#DC2626" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={toX(lsl)} y={pad.top - 5} textAnchor="middle" className="fill-red-600 text-[10px] font-mono font-semibold">LSL</text>
          </g>
        )}
        {target !== undefined && (
          <g>
            <line x1={toX(target)} y1={pad.top} x2={toX(target)} y2={pad.top + innerH} stroke="#16A34A" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={toX(target)} y={pad.top - 5} textAnchor="middle" className="fill-emerald-600 text-[10px] font-mono font-semibold">Hedef</text>
          </g>
        )}
        {usl !== undefined && (
          <g>
            <line x1={toX(usl)} y1={pad.top} x2={toX(usl)} y2={pad.top + innerH} stroke="#DC2626" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={toX(usl)} y={pad.top - 5} textAnchor="middle" className="fill-red-600 text-[10px] font-mono font-semibold">USL</text>
          </g>
        )}

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = dataMin + span * t;
          return (
            <text key={t} x={toX(val)} y={h - 12} textAnchor="middle" className="fill-slate-500 text-[10px] font-mono">
              {val.toFixed(2)}
            </text>
          );
        })}
      </svg>

      {hoverIdx !== null && bins[hoverIdx] && (
        <div className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-300">
          Aralık: [{bins[hoverIdx].x0.toFixed(3)}, {bins[hoverIdx].x1.toFixed(3)}] · Frekans: {bins[hoverIdx].count}
        </div>
      )}
    </div>
  );
};

// 2. Grouped Boxplot Chart
export const BoxplotChart: React.FC<{ summaries: DescriptiveSummary[] }> = ({ summaries }) => {
  if (summaries.length === 0) return null;
  const w = 520;
  const h = 240;
  const pad = { top: 20, right: 20, bottom: 38, left: 48 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const allMin = Math.min(...summaries.map((s) => s.min));
  const allMax = Math.max(...summaries.map((s) => s.max));
  const span = allMax - allMin || 1;
  const toY = (v: number) => pad.top + innerH - ((v - allMin) / span) * innerH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const val = allMin + span * t;
        const yy = toY(val);
        return (
          <g key={t}>
            <line x1={pad.left} y1={yy} x2={w - pad.right} y2={yy} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
            <text x={pad.left - 6} y={yy + 3} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
              {val.toFixed(2)}
            </text>
          </g>
        );
      })}

      {summaries.map((s, idx) => {
        const cx = pad.left + ((idx + 0.5) / summaries.length) * innerW;
        const boxW = Math.min(48, (innerW / summaries.length) * 0.45);
        const lowWhisker = Math.max(s.min, s.q1 - 1.5 * s.iqr);
        const highWhisker = Math.min(s.max, s.q3 + 1.5 * s.iqr);

        return (
          <g key={s.group}>
            <line x1={cx} y1={toY(highWhisker)} x2={cx} y2={toY(lowWhisker)} stroke="#64748B" strokeWidth="1.5" />
            <line x1={cx - boxW * 0.35} y1={toY(highWhisker)} x2={cx + boxW * 0.35} y2={toY(highWhisker)} stroke="#64748B" strokeWidth="1.5" />
            <line x1={cx - boxW * 0.35} y1={toY(lowWhisker)} x2={cx + boxW * 0.35} y2={toY(lowWhisker)} stroke="#64748B" strokeWidth="1.5" />
            <rect
              x={cx - boxW / 2}
              y={toY(s.q3)}
              width={boxW}
              height={Math.max(2, toY(s.q1) - toY(s.q3))}
              fill="#DBEAFE"
              stroke="#1D4ED8"
              strokeWidth="1.5"
              rx="2"
            />
            <line x1={cx - boxW / 2} y1={toY(s.median)} x2={cx + boxW / 2} y2={toY(s.median)} stroke="#0F172A" strokeWidth="2" />
            <circle cx={cx} cy={toY(s.mean)} r="3" fill="#1D4ED8" />
            {s.outliers.map((out, oi) => (
              <circle key={oi} cx={cx} cy={toY(out)} r="3" fill="none" stroke="#DC2626" strokeWidth="1.5" />
            ))}
            <text x={cx} y={h - 12} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">
              {s.group}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// 3. Violin Plot Chart
export const ViolinChart: React.FC<{ summaries: DescriptiveSummary[] }> = ({ summaries }) => {
  if (summaries.length === 0) return null;
  const w = 520;
  const h = 240;
  const pad = { top: 20, right: 20, bottom: 38, left: 48 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const allY = summaries.flatMap((s) => s.violinPoints.map((p) => p.y));
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  const ySpan = yMax - yMin || 1;
  const toY = (v: number) => pad.top + innerH - ((v - yMin) / ySpan) * innerH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const val = yMin + ySpan * t;
        const yy = toY(val);
        return (
          <g key={t}>
            <line x1={pad.left} y1={yy} x2={w - pad.right} y2={yy} stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
            <text x={pad.left - 6} y={yy + 3} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
              {val.toFixed(2)}
            </text>
          </g>
        );
      })}

      {summaries.map((s, idx) => {
        const cx = pad.left + ((idx + 0.5) / summaries.length) * innerW;
        const maxHalfW = Math.min(44, (innerW / summaries.length) * 0.36);
        const maxDens = Math.max(...s.violinPoints.map((p) => p.density), 1e-6);

        const rightPts = s.violinPoints.map((p) => `${(cx + (p.density / maxDens) * maxHalfW).toFixed(1)},${toY(p.y).toFixed(1)}`);
        const leftPts = [...s.violinPoints].reverse().map((p) => `${(cx - (p.density / maxDens) * maxHalfW).toFixed(1)},${toY(p.y).toFixed(1)}`);
        const poly = [...rightPts, ...leftPts].join(' ');

        return (
          <g key={s.group}>
            <polygon points={poly} fill="#93C5FD" fillOpacity="0.45" stroke="#1D4ED8" strokeWidth="1.4" />
            <line x1={cx} y1={toY(s.q1)} x2={cx} y2={toY(s.q3)} stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
            <circle cx={cx} cy={toY(s.median)} r="3.5" fill="#FFFFFF" stroke="#0F172A" strokeWidth="1.5" />
            <text x={cx} y={h - 12} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">
              {s.group}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// 4. SPC Control Chart SVG
export const ControlChartSvg: React.FC<{
  title: string;
  points: SpcSeriesPoint[];
  height?: number;
}> = ({ title, points, height = 220 }) => {
  const [hovered, setHovered] = useState<SpcSeriesPoint | null>(null);
  if (points.length === 0) return null;

  const w = 720;
  const h = height;
  const pad = { top: 26, right: 64, bottom: 30, left: 52 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const allVals = points.flatMap((p) => [p.value, p.ucl, p.lcl]);
  const yMin = Math.min(...allVals);
  const yMax = Math.max(...allVals);
  const yPad = (yMax - yMin || 1) * 0.12;
  const minBound = yMin - yPad;
  const maxBound = yMax + yPad;
  const span = maxBound - minBound || 1;

  const toX = (i: number) => pad.left + (i / Math.max(1, points.length - 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - minBound) / span) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.value).toFixed(1)}`).join(' ');
  const uclPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.ucl).toFixed(1)}`).join(' ');
  const clPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.cl).toFixed(1)}`).join(' ');
  const lclPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(p.lcl).toFixed(1)}`).join(' ');

  const last = points[points.length - 1];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        {hovered ? (
          <span className="font-mono text-slate-600 dark:text-slate-300">
            Nokta #{hovered.index}: {hovered.value.toFixed(4)}
            {hovered.violatedRules.length > 0 ? ` — ${hovered.violatedRules[0]}` : ' (Kontrol İçinde)'}
          </span>
        ) : (
          <span className="font-mono text-slate-500">
            UCL: {last.ucl.toFixed(3)} · CL: {last.cl.toFixed(3)} · LCL: {last.lcl.toFixed(3)}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
        <path d={uclPath} fill="none" stroke="#DC2626" strokeWidth="1.2" strokeDasharray="5 4" />
        <path d={clPath} fill="none" stroke="#16A34A" strokeWidth="1.4" />
        <path d={lclPath} fill="none" stroke="#DC2626" strokeWidth="1.2" strokeDasharray="5 4" />

        <text x={w - pad.right + 6} y={toY(last.ucl) + 3} className="fill-red-600 text-[10px] font-mono">UCL</text>
        <text x={w - pad.right + 6} y={toY(last.cl) + 3} className="fill-emerald-600 text-[10px] font-mono">CL</text>
        <text x={w - pad.right + 6} y={toY(last.lcl) + 3} className="fill-red-600 text-[10px] font-mono">LCL</text>

        <path d={linePath} fill="none" stroke="#1D4ED8" strokeWidth="1.8" />

        {points.map((p, i) => {
          const bad = p.violatedRules.length > 0;
          return (
            <circle
              key={p.index}
              cx={toX(i)}
              cy={toY(p.value)}
              r={bad ? 4.5 : 3}
              fill={bad ? '#DC2626' : '#1D4ED8'}
              stroke="#FFFFFF"
              strokeWidth="1"
              className="cursor-pointer"
              onMouseEnter={() => setHovered(p)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}

        <text x={pad.left - 8} y={toY(maxBound) + 10} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">{maxBound.toFixed(2)}</text>
        <text x={pad.left - 8} y={toY(minBound)} textAnchor="end" className="fill-slate-400 text-[10px] font-mono">{minBound.toFixed(2)}</text>
      </svg>
    </div>
  );
};

// 5. Scatter + Regression / Actual vs Predicted Plot
export const ScatterRegressionChart: React.FC<{
  xs: number[];
  ys: number[];
  yPred: number[];
  xLabel: string;
  yLabel: string;
}> = ({ xs, ys, yPred, xLabel, yLabel }) => {
  if (xs.length === 0) return null;
  const w = 540;
  const h = 250;
  const pad = { top: 20, right: 24, bottom: 38, left: 52 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys, ...yPred);
  const yMax = Math.max(...ys, ...yPred);
  const xSpan = xMax - xMin || 1;
  const ySpan = yMax - yMin || 1;

  const toX = (v: number) => pad.left + ((v - xMin) / xSpan) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - yMin) / ySpan) * innerH;

  const sortedLine = xs
    .map((x, i) => ({ x, yp: yPred[i] }))
    .sort((a, b) => a.x - b.x)
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toX(pt.x).toFixed(1)} ${toY(pt.yp).toFixed(1)}`)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0, 0.5, 1].map((t) => {
        const yv = yMin + ySpan * t;
        const yy = toY(yv);
        return (
          <g key={t}>
            <line x1={pad.left} y1={yy} x2={w - pad.right} y2={yy} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <text x={pad.left - 6} y={yy + 3} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{yv.toFixed(2)}</text>
          </g>
        );
      })}
      {xs.map((x, i) => (
        <circle key={i} cx={toX(x)} cy={toY(ys[i])} r="3.5" fill="#2563EB" fillOpacity="0.7" />
      ))}
      <path d={sortedLine} fill="none" stroke="#DC2626" strokeWidth="2" />
      <text x={pad.left + innerW / 2} y={h - 8} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[11px]">{xLabel}</text>
      <text x={14} y={pad.top + innerH / 2} textAnchor="middle" transform={`rotate(-90 14 ${pad.top + innerH / 2})`} className="fill-slate-600 dark:fill-slate-300 text-[11px]">{yLabel}</text>
    </svg>
  );
};

// 6. Pareto Chart (Bars + Cumulative % Curve)
export const ParetoChart: React.FC<{
  items: Array<{ label: string; count: number }>;
}> = ({ items }) => {
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((a, b) => a + b.count, 0) || 1;
  let cum = 0;
  const enriched = sorted.map((it) => {
    cum += it.count;
    return { ...it, cumPct: (cum / total) * 100 };
  });

  const w = 620;
  const h = 240;
  const pad = { top: 20, right: 44, bottom: 44, left: 44 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const maxC = Math.max(...enriched.map((e) => e.count), 1);

  const barSlot = innerW / Math.max(1, enriched.length);
  const barW = Math.min(48, barSlot * 0.62);

  const cumLine = enriched
    .map((e, i) => {
      const cx = pad.left + (i + 0.5) * barSlot;
      const cy = pad.top + innerH - (e.cumPct / 100) * innerH;
      return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    })
    .join(' ');

  const y80 = pad.top + innerH - 0.8 * innerH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <line x1={pad.left} y1={y80} x2={w - pad.right} y2={y80} stroke="#D97706" strokeDasharray="4 3" strokeWidth="1" />
      <text x={w - pad.right + 4} y={y80 + 3} className="fill-amber-600 text-[10px] font-mono">80%</text>

      {enriched.map((e, i) => {
        const cx = pad.left + (i + 0.5) * barSlot;
        const bh = (e.count / maxC) * innerH;
        const yy = pad.top + innerH - bh;
        return (
          <g key={e.label}>
            <rect x={cx - barW / 2} y={yy} width={barW} height={bh} rx="2" fill="#1D4ED8" fillOpacity="0.85" />
            <text x={cx} y={yy - 4} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200 text-[10px] font-mono">{e.count}</text>
            <text x={cx} y={h - 14} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[10px]">
              {e.label.length > 14 ? `${e.label.slice(0, 12)}…` : e.label}
            </text>
          </g>
        );
      })}

      <path d={cumLine} fill="none" stroke="#DC2626" strokeWidth="2" />
      {enriched.map((e, i) => {
        const cx = pad.left + (i + 0.5) * barSlot;
        const cy = pad.top + innerH - (e.cumPct / 100) * innerH;
        return <circle key={i} cx={cx} cy={cy} r="3" fill="#DC2626" />;
      })}
    </svg>
  );
};

// 7. Reliability / Survival Curve SVG
export const SurvivalCurveChart: React.FC<{
  points: Array<{ t: number; reliability: number }>;
  yLabel?: string;
}> = ({ points, yLabel = 'Güvenilirlik R(t)' }) => {
  if (points.length === 0) return null;
  const w = 540;
  const h = 230;
  const pad = { top: 20, right: 20, bottom: 34, left: 48 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const tMax = Math.max(...points.map((p) => p.t), 1);
  const rMax = Math.max(...points.map((p) => p.reliability), 1);
  const toX = (t: number) => pad.left + (t / tMax) * innerW;
  const toY = (r: number) => pad.top + innerH - (r / rMax) * innerH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.t).toFixed(1)} ${toY(p.reliability).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const yy = toY(f * rMax);
        return (
          <g key={f}>
            <line x1={pad.left} y1={yy} x2={w - pad.right} y2={yy} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
            <text x={pad.left - 6} y={yy + 3} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">
              {rMax <= 1.05 ? `${(f * 100).toFixed(0)}%` : (f * rMax).toFixed(0)}
            </text>
          </g>
        );
      })}
      <path d={path} fill="none" stroke="#1D4ED8" strokeWidth="2.2" />
      <text x={pad.left + innerW / 2} y={h - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">Çalışma Süresi (t)</text>
      <text x={14} y={pad.top + innerH / 2} textAnchor="middle" transform={`rotate(-90 14 ${pad.top + innerH / 2})`} className="fill-slate-500 text-[10px]">{yLabel}</text>
    </svg>
  );
};

// 8. 6M Ishikawa Fishbone Diagram
export const IshikawaDiagram: React.FC<{
  problemStatement: string;
  causes: Record<string, string[]>;
}> = ({ problemStatement, causes }) => {
  const categories = Object.keys(causes).slice(0, 6);
  const w = 760;
  const h = 320;
  const spineY = 160;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
      {/* Main Spine */}
      <line x1="40" y1={spineY} x2="585" y2={spineY} stroke="#0F172A" className="dark:stroke-slate-300" strokeWidth="2.5" />
      <polygon points={`585,${spineY - 6} 600,${spineY} 585,${spineY + 6}`} fill="#0F172A" className="dark:fill-slate-300" />

      {/* Head Box */}
      <rect x="602" y={spineY - 36} width="146" height="72" rx="6" fill="#1D4ED8" />
      <text x="675" y={spineY - 4} textAnchor="middle" className="fill-white text-[11px] font-semibold">
        {problemStatement.slice(0, 22)}
      </text>
      <text x="675" y={spineY + 14} textAnchor="middle" className="fill-blue-100 text-[10px]">
        {problemStatement.slice(22, 44)}
      </text>

      {categories.map((cat, idx) => {
        const isTop = idx % 2 === 0;
        const colIdx = Math.floor(idx / 2);
        const anchorX = 165 + colIdx * 175;
        const endX = anchorX - 65;
        const endY = isTop ? 36 : 284;
        const items = (causes[cat] ?? []).slice(0, 3);

        return (
          <g key={cat}>
            <line x1={endX} y1={endY} x2={anchorX} y2={spineY} stroke="#475569" strokeWidth="1.8" />
            <rect x={endX - 50} y={isTop ? 10 : 288} width="110" height="22" rx="4" fill="#F1F5F9" stroke="#CBD5E1" />
            <text x={endX + 5} y={isTop ? 25 : 303} textAnchor="middle" className="fill-slate-900 text-[11px] font-semibold">
              {cat}
            </text>
            {items.map((item, ii) => {
              const frac = 0.28 + ii * 0.24;
              const bx = endX + (anchorX - endX) * frac;
              const by = endY + (spineY - endY) * frac;
              return (
                <g key={ii}>
                  <line x1={bx - 42} y1={by} x2={bx} y2={by} stroke="#94A3B8" strokeWidth="1.2" />
                  <text x={bx - 46} y={by + 3} textAnchor="end" className="fill-slate-600 dark:fill-slate-300 text-[10px]">
                    {item.slice(0, 20)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

// 9. Clustering 2D Scatter
export const ClusterPlotSvg: React.FC<{
  points: Array<{ x: number; y: number; cluster: number }>;
  xLabel: string;
  yLabel: string;
}> = ({ points, xLabel, yLabel }) => {
  if (points.length === 0) return null;
  const colors = ['#1D4ED8', '#16A34A', '#D97706', '#DC2626', '#7C3AED'];
  const w = 520;
  const h = 230;
  const pad = { top: 18, right: 20, bottom: 34, left: 48 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const xMin = Math.min(...points.map((p) => p.x));
  const xMax = Math.max(...points.map((p) => p.x));
  const yMin = Math.min(...points.map((p) => p.y));
  const yMax = Math.max(...points.map((p) => p.y));
  const toX = (v: number) => pad.left + ((v - xMin) / (xMax - xMin || 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {points.map((p, i) => (
        <circle
          key={i}
          cx={toX(p.x)}
          cy={toY(p.y)}
          r="4"
          fill={colors[(p.cluster - 1) % colors.length]}
          fillOpacity="0.82"
        />
      ))}
      <text x={pad.left + innerW / 2} y={h - 6} textAnchor="middle" className="fill-slate-500 text-[10px]">{xLabel}</text>
      <text x={14} y={pad.top + innerH / 2} textAnchor="middle" transform={`rotate(-90 14 ${pad.top + innerH / 2})`} className="fill-slate-500 text-[10px]">{yLabel}</text>
    </svg>
  );
};

// 10. Time Series Forecast Chart
export const ForecastChartSvg: React.FC<{
  historical: Array<{ t: number; actual: number; fitted: number }>;
  forecast: Array<{ t: number; point: number; low95: number; high95: number }>;
}> = ({ historical, forecast }) => {
  const w = 640;
  const h = 230;
  const pad = { top: 20, right: 24, bottom: 30, left: 48 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const allT = [...historical.map((d) => d.t), ...forecast.map((d) => d.t)];
  const allY = [
    ...historical.map((d) => d.actual),
    ...forecast.flatMap((d) => [d.low95, d.high95]),
  ];
  const tMin = Math.min(...allT);
  const tMax = Math.max(...allT);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);

  const toX = (t: number) => pad.left + ((t - tMin) / (tMax - tMin || 1)) * innerW;
  const toY = (v: number) => pad.top + innerH - ((v - yMin) / (yMax - yMin || 1)) * innerH;

  const histPath = historical.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(d.t).toFixed(1)} ${toY(d.actual).toFixed(1)}`).join(' ');
  const lastHist = historical[historical.length - 1];
  const fcPts = lastHist ? [{ t: lastHist.t, point: lastHist.actual, low95: lastHist.actual, high95: lastHist.actual }, ...forecast] : forecast;
  const fcPath = fcPts.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(d.t).toFixed(1)} ${toY(d.point).toFixed(1)}`).join(' ');

  const ciPoly = [
    ...fcPts.map((d) => `${toX(d.t).toFixed(1)},${toY(d.high95).toFixed(1)}`),
    ...[...fcPts].reverse().map((d) => `${toX(d.t).toFixed(1)},${toY(d.low95).toFixed(1)}`),
  ].join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <polygon points={ciPoly} fill="#93C5FD" fillOpacity="0.35" />
      <path d={histPath} fill="none" stroke="#0F172A" className="dark:stroke-slate-200" strokeWidth="1.8" />
      <path d={fcPath} fill="none" stroke="#1D4ED8" strokeWidth="2.2" strokeDasharray="5 3" />
      <text x={pad.left - 6} y={toY(yMax) + 6} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{yMax.toFixed(2)}</text>
      <text x={pad.left - 6} y={toY(yMin)} textAnchor="end" className="fill-slate-500 text-[10px] font-mono">{yMin.toFixed(2)}</text>
    </svg>
  );
};
