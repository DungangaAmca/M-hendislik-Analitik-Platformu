import { mean, normalPdf, quantile, stdDev, tInv, variance } from './mathCore';

export interface DescriptiveSummary {
  group: string;
  n: number;
  missing: number;
  mean: number;
  seMean: number;
  sd: number;
  variance: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  iqr: number;
  mode: number[];
  ci95Low: number;
  ci95High: number;
  skewness: number;
  kurtosis: number;
  outliers: number[];
  histogramBins: Array<{ x0: number; x1: number; count: number; density: number; normalY: number }>;
  violinPoints: Array<{ y: number; density: number }>;
}

export function computeDescriptiveStats(
  values: number[],
  missing = 0,
  group = 'Tümü'
): DescriptiveSummary {
  const n = values.length;
  if (n === 0) {
    throw new Error('Tanımlayıcı istatistikler için en az 1 sayısal gözlem gereklidir.');
  }
  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  const v = variance(values, true);
  const s = Math.sqrt(v);
  const se = s / Math.sqrt(n);
  const tCrit = n > 1 ? tInv(0.975, n - 1) : 0;
  const ci95Low = m - tCrit * se;
  const ci95High = m + tCrit * se;

  const q1 = quantile(sorted, 0.25);
  const med = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  // Mode calculation (rounded to 4 decimals for continuous stability)
  const counts = new Map<number, number>();
  let maxFreq = 0;
  for (const x of values) {
    const rounded = Number(x.toFixed(4));
    const c = (counts.get(rounded) ?? 0) + 1;
    counts.set(rounded, c);
    if (c > maxFreq) maxFreq = c;
  }
  const mode =
    maxFreq > 1
      ? Array.from(counts.entries())
          .filter(([, c]) => c === maxFreq)
          .map(([val]) => val)
          .slice(0, 3)
      : [med];

  let skew = 0;
  let kurt = 0;
  if (s > 0 && n > 2) {
    let m3 = 0;
    let m4 = 0;
    for (const x of values) {
      const z = (x - m) / s;
      m3 += z ** 3;
      m4 += z ** 4;
    }
    skew = m3 / n;
    kurt = m4 / n - 3;
  }

  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((x) => iqr > 0 && (x < lowFence || x > highFence));

  // Histogram bins (Sturges / Freedman-Diaconis clamped 6..18)
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  const range = maxVal - minVal || 1;
  const binCount = Math.min(18, Math.max(6, Math.ceil(1 + 3.322 * Math.log10(n))));
  const binWidth = range / binCount;

  const histogramBins = Array.from({ length: binCount }, (_, i) => {
    const x0 = minVal + i * binWidth;
    const x1 = x0 + binWidth;
    const count = values.filter((val) =>
      i === binCount - 1 ? val >= x0 && val <= x1 + 1e-9 : val >= x0 && val < x1
    ).length;
    const mid = 0.5 * (x0 + x1);
    const density = count / (n * binWidth);
    const normalY = s > 0 ? normalPdf(mid, m, s) * n * binWidth : 0;
    return { x0, x1, count, density, normalY };
  });

  // Gaussian KDE for Violin Plot (Silverman bandwidth)
  const bw = Math.max(range * 0.06, 1.06 * (s || range * 0.1) * Math.pow(n, -0.2));
  const steps = 36;
  const pad = bw * 1.5;
  const vMin = minVal - pad;
  const vMax = maxVal + pad;
  const violinPoints = Array.from({ length: steps }, (_, i) => {
    const y = vMin + (i / (steps - 1)) * (vMax - vMin);
    let dens = 0;
    for (const x of values) {
      const u = (y - x) / bw;
      dens += Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
    }
    return { y, density: dens / (n * bw) };
  });

  return {
    group,
    n,
    missing,
    mean: m,
    seMean: se,
    sd: s,
    variance: v,
    min: minVal,
    q1,
    median: med,
    q3,
    max: maxVal,
    iqr,
    mode,
    ci95Low,
    ci95High,
    skewness: skew,
    kurtosis: kurt,
    outliers,
    histogramBins,
    violinPoints,
  };
}

export function extractNumericColumn(rows: Record<string, unknown>[], col: string): {
  values: number[];
  missing: number;
} {
  const values: number[] = [];
  let missing = 0;
  for (const r of rows) {
    const val = r[col];
    if (typeof val === 'number' && Number.isFinite(val)) {
      values.push(val);
    } else {
      missing++;
    }
  }
  return { values, missing };
}

export function groupNumericByCategory(
  rows: Record<string, unknown>[],
  numCol: string,
  catCol: string
): Array<{ group: string; summary: DescriptiveSummary }> {
  const map = new Map<string, { vals: number[]; missing: number }>();
  for (const r of rows) {
    const g = r[catCol] === null || r[catCol] === undefined ? 'Eksik Grup' : String(r[catCol]);
    if (!map.has(g)) map.set(g, { vals: [], missing: 0 });
    const bucket = map.get(g)!;
    const v = r[numCol];
    if (typeof v === 'number' && Number.isFinite(v)) bucket.vals.push(v);
    else bucket.missing++;
  }
  const results: Array<{ group: string; summary: DescriptiveSummary }> = [];
  for (const [group, data] of map.entries()) {
    if (data.vals.length > 0) {
      results.push({ group, summary: computeDescriptiveStats(data.vals, data.missing, group) });
    }
  }
  return results;
}
