import {
  binomProb,
  chiSquareUpperP,
  fUpperP,
  mean,
  median,
  normalCdf,
  normalInv,
  stdDev,
  tInv,
  tTwoTailedP,
  variance,
} from './mathCore';

export type HypothesisTestType =
  | 'one_sample_t'
  | 'two_sample_t'
  | 'paired_t'
  | 'z_test'
  | 'f_test'
  | 'mann_whitney'
  | 'mood_median'
  | 'wilcoxon'
  | 'kruskal_wallis'
  | 'friedman'
  | 'sign_test'
  | 'chi_square';

export interface HypothesisTestResult {
  testName: string;
  nullHypothesis: string;
  altHypothesis: string;
  statisticLabel: string;
  statisticValue: number;
  dfLabel: string;
  pValue: number;
  alpha: number;
  rejectNull: boolean;
  ci95?: [number, number];
  details: Array<{ label: string; value: string }>;
  turkishConclusion: string;
}

function rankArray(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(values.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

export function runOneSampleT(x: number[], mu0: number, alpha = 0.05): HypothesisTestResult {
  if (x.length < 2) throw new Error('One-Sample T Testi için en az 2 gözlem gereklidir.');
  const n = x.length;
  const m = mean(x);
  const s = stdDev(x, true);
  const se = s / Math.sqrt(n);
  const t = se > 0 ? (m - mu0) / se : m === mu0 ? 0 : m > mu0 ? 1e6 : -1e6;
  const df = n - 1;
  const p = tTwoTailedP(t, df);
  const tc = tInv(1 - alpha / 2, df);
  const ci: [number, number] = [m - tc * se, m + tc * se];
  const reject = p < alpha;
  return {
    testName: 'Tek Örneklem T-Testi (One-Sample T Test)',
    nullHypothesis: `H₀: μ = ${mu0}`,
    altHypothesis: `H₁: μ ≠ ${mu0}`,
    statisticLabel: 'T-İstatistiği',
    statisticValue: t,
    dfLabel: `${df}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    ci95: ci,
    details: [
      { label: 'Örneklem Sayısı (n)', value: `${n}` },
      { label: 'Ortalama', value: m.toFixed(4) },
      { label: 'Standart Sapma', value: s.toFixed(4) },
      { label: 'Ortalama Std. Hatası', value: se.toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha} olduğu için H₀ reddedilir. Proses ortalaması (${m.toFixed(4)}) hedef değerden (${mu0}) istatistiksel olarak anlamlı düzeyde farklıdır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha} olduğu için H₀ reddedilemez. Proses ortalaması ile hedef (${mu0}) arasında anlamlı fark bulunmamıştır.`,
  };
}

export function runTwoSampleT(x1: number[], x2: number[], alpha = 0.05): HypothesisTestResult {
  if (x1.length < 2 || x2.length < 2) throw new Error('Her iki grupta da en az 2 gözlem olmalıdır.');
  const n1 = x1.length;
  const n2 = x2.length;
  const m1 = mean(x1);
  const m2 = mean(x2);
  const v1 = variance(x1, true);
  const v2 = variance(x2, true);
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = se > 0 ? (m1 - m2) / se : m1 === m2 ? 0 : m1 > m2 ? 1e6 : -1e6;
  // Welch-Satterthwaite df
  const num = (v1 / n1 + v2 / n2) ** 2;
  const den = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
  const df = den > 0 ? num / den : n1 + n2 - 2;
  const p = tTwoTailedP(t, df);
  const tc = tInv(1 - alpha / 2, df);
  const diff = m1 - m2;
  const reject = p < alpha;
  return {
    testName: 'İki Örneklem Welch T-Testi (Two-Sample T Test)',
    nullHypothesis: 'H₀: μ₁ - μ₂ = 0',
    altHypothesis: 'H₁: μ₁ - μ₂ ≠ 0',
    statisticLabel: 'T-İstatistiği',
    statisticValue: t,
    dfLabel: df.toFixed(1),
    pValue: p,
    alpha,
    rejectNull: reject,
    ci95: [diff - tc * se, diff + tc * se],
    details: [
      { label: 'Grup 1 (n / Ort / SD)', value: `${n1} / ${m1.toFixed(4)} / ${Math.sqrt(v1).toFixed(4)}` },
      { label: 'Grup 2 (n / Ort / SD)', value: `${n2} / ${m2.toFixed(4)} / ${Math.sqrt(v2).toFixed(4)}` },
      { label: 'Ortalama Farkı (μ₁ - μ₂)', value: diff.toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: İki grubun ortalamaları arasındaki ${diff.toFixed(4)} birimlik fark istatistiksel olarak anlamlıdır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: İki grup ortalaması arasında istatistiksel olarak anlamlı fark saptanmamıştır.`,
  };
}

export function runPairedT(x1: number[], x2: number[], alpha = 0.05): HypothesisTestResult {
  const n = Math.min(x1.length, x2.length);
  if (n < 2) throw new Error('Eşleştirilmiş T Testi için en az 2 çift gözlem gereklidir.');
  const diffs = Array.from({ length: n }, (_, i) => x1[i] - x2[i]);
  const m = mean(diffs);
  const s = stdDev(diffs, true);
  const se = s / Math.sqrt(n);
  const t = se > 0 ? m / se : m === 0 ? 0 : m > 0 ? 1e6 : -1e6;
  const df = n - 1;
  const p = tTwoTailedP(t, df);
  const tc = tInv(1 - alpha / 2, df);
  const reject = p < alpha;
  return {
    testName: 'Eşleştirilmiş T-Testi (Paired T Test)',
    nullHypothesis: 'H₀: μ_fark = 0',
    altHypothesis: 'H₁: μ_fark ≠ 0',
    statisticLabel: 'T-İstatistiği',
    statisticValue: t,
    dfLabel: `${df}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    ci95: [m - tc * se, m + tc * se],
    details: [
      { label: 'Çift Sayısı (n)', value: `${n}` },
      { label: 'Ortalama Fark', value: m.toFixed(4) },
      { label: 'Farkların SD’si', value: s.toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: Öncesi ve sonrası eşleştirilmiş ölçümler arasındaki ${m.toFixed(4)} ortalama değişim anlamlıdır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: Eşleştirilmiş ölçümler arasında anlamlı bir kayma bulunmamıştır.`,
  };
}

export function runOneSampleZ(x: number[], mu0: number, knownSigma: number, alpha = 0.05): HypothesisTestResult {
  if (x.length < 1 || knownSigma <= 0) throw new Error('Z Testi için veri ve pozitif σ (bilinen SD) gereklidir.');
  const n = x.length;
  const m = mean(x);
  const se = knownSigma / Math.sqrt(n);
  const z = (m - mu0) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const zc = normalInv(1 - alpha / 2);
  const reject = p < alpha;
  return {
    testName: 'Tek Örneklem Z-Testi (One-Sample Z Test)',
    nullHypothesis: `H₀: μ = ${mu0}`,
    altHypothesis: `H₁: μ ≠ ${mu0}`,
    statisticLabel: 'Z-İstatistiği',
    statisticValue: z,
    dfLabel: '∞ (Normal)',
    pValue: p,
    alpha,
    rejectNull: reject,
    ci95: [m - zc * se, m + zc * se],
    details: [
      { label: 'n', value: `${n}` },
      { label: 'Örneklem Ortalaması', value: m.toFixed(4) },
      { label: 'Bilinen Popülasyon σ', value: knownSigma.toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: Bilinen standart sapma varsayımı altında ortalama (${m.toFixed(4)}) hedeften (${mu0}) anlamlı biçimde sapmıştır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: Örneklem ortalaması hedef değer ile uyumludur.`,
  };
}

export function runFTest(x1: number[], x2: number[], alpha = 0.05): HypothesisTestResult {
  if (x1.length < 2 || x2.length < 2) throw new Error('F Testi için her grupta en az 2 gözlem olmalıdır.');
  const v1 = variance(x1, true);
  const v2 = variance(x2, true);
  const f = v2 > 0 ? v1 / v2 : 1;
  const df1 = x1.length - 1;
  const df2 = x2.length - 1;
  const pOne = f >= 1 ? fUpperP(f, df1, df2) : fUpperP(1 / f, df2, df1);
  const p = Math.min(1, 2 * pOne);
  const reject = p < alpha;
  return {
    testName: 'Varyans Oranı F-Testi (Two-Sample F Test)',
    nullHypothesis: 'H₀: σ₁² / σ₂² = 1',
    altHypothesis: 'H₁: σ₁² / σ₂² ≠ 1',
    statisticLabel: 'F-İstatistiği',
    statisticValue: f,
    dfLabel: `(${df1}, ${df2})`,
    pValue: p,
    alpha,
    rejectNull: reject,
    details: [
      { label: 'Grup 1 SD / Varyans', value: `${Math.sqrt(v1).toFixed(4)} / ${v1.toFixed(4)}` },
      { label: 'Grup 2 SD / Varyans', value: `${Math.sqrt(v2).toFixed(4)} / ${v2.toFixed(4)}` },
      { label: 'SD Oranı (s₁ / s₂)', value: (Math.sqrt(v1) / (Math.sqrt(v2) || 1)).toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: İki grubun proses varyansları (değişkenlikleri) eşit değildir.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: İki grubun varyansları arasında istatistiksel olarak anlamlı fark yoktur (homojen varyans).`,
  };
}

export function runMannWhitney(x1: number[], x2: number[], alpha = 0.05): HypothesisTestResult {
  if (x1.length < 2 || x2.length < 2) throw new Error('Mann-Whitney için her grupta en az 2 gözlem gereklidir.');
  const combined = [...x1, ...x2];
  const ranks = rankArray(combined);
  const n1 = x1.length;
  const n2 = x2.length;
  const r1 = ranks.slice(0, n1).reduce((a, b) => a + b, 0);
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);
  const muU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = sigmaU > 0 ? (u - muU) / sigmaU : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const reject = p < alpha;
  return {
    testName: 'Mann-Whitney U Testi (Parametrik Olmayan)',
    nullHypothesis: 'H₀: İki grubun medyanları/dağılımları eşittir',
    altHypothesis: 'H₁: İki grubun medyanları farklıdır',
    statisticLabel: 'U-İstatistiği (W)',
    statisticValue: u,
    dfLabel: 'Normal Yaklaşım',
    pValue: p,
    alpha,
    rejectNull: reject,
    details: [
      { label: 'Grup 1 Medyan (n)', value: `${median(x1).toFixed(4)} (${n1})` },
      { label: 'Grup 2 Medyan (n)', value: `${median(x2).toFixed(4)} (${n2})` },
      { label: 'Z-Skoru', value: z.toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: Normallik varsayımı gerektirmeyen Mann-Whitney testine göre iki grubun lokasyonları (medyanları) anlamlı biçimde farklıdır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: İki grup arasında medyan düzeyinde anlamlı fark saptanmadı.`,
  };
}

export function runMoodMedian(groups: Array<{ name: string; values: number[] }>, alpha = 0.05): HypothesisTestResult {
  const all = groups.flatMap((g) => g.values);
  if (groups.length < 2 || all.length < 4) throw new Error('Mood Medyan testi için en az 2 grup gerekir.');
  const grandMed = median(all);
  let chi2 = 0;
  const totalN = all.length;
  let totalAbove = 0;
  const counts = groups.map((g) => {
    const above = g.values.filter((v) => v > grandMed).length;
    const belowEq = g.values.length - above;
    totalAbove += above;
    return { name: g.name, n: g.values.length, above, belowEq, med: median(g.values) };
  });
  const totalBelowEq = totalN - totalAbove;
  for (const c of counts) {
    const expAbove = (c.n * totalAbove) / totalN;
    const expBelow = (c.n * totalBelowEq) / totalN;
    if (expAbove > 0) chi2 += (c.above - expAbove) ** 2 / expAbove;
    if (expBelow > 0) chi2 += (c.belowEq - expBelow) ** 2 / expBelow;
  }
  const df = groups.length - 1;
  const p = chiSquareUpperP(chi2, df);
  const reject = p < alpha;
  return {
    testName: 'Mood Medyan Testi (Mood’s Median Test)',
    nullHypothesis: 'H₀: Tüm grupların medyanları eşittir',
    altHypothesis: 'H₁: En az bir grubun medyanı farklıdır',
    statisticLabel: 'Ki-Kare (χ²)',
    statisticValue: chi2,
    dfLabel: `${df}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    details: [
      { label: 'Genel Medyan', value: grandMed.toFixed(4) },
      ...counts.map((c) => ({
        label: `${c.name} (Medyan / >Genel)`,
        value: `${c.med.toFixed(3)} / ${c.above}/${c.n}`,
      })),
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: Gruplar arasında medyan düzeyinde istatistiksel olarak anlamlı fark vardır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: Grup medyanları arasında anlamlı fark bulunmamıştır.`,
  };
}

export function runWilcoxon(x1: number[], x2: number[], alpha = 0.05): HypothesisTestResult {
  const nRaw = Math.min(x1.length, x2.length);
  const diffs = Array.from({ length: nRaw }, (_, i) => x1[i] - x2[i]).filter((d) => d !== 0);
  const n = diffs.length;
  if (n < 2) throw new Error('Wilcoxon testi için sıfırdan farklı en az 2 eşleştirilmiş fark gerekir.');
  const absDiffs = diffs.map((d) => Math.abs(d));
  const ranks = rankArray(absDiffs);
  let wPlus = 0;
  let wMinus = 0;
  diffs.forEach((d, i) => {
    if (d > 0) wPlus += ranks[i];
    else wMinus += ranks[i];
  });
  const w = Math.min(wPlus, wMinus);
  const muW = (n * (n + 1)) / 4;
  const sigmaW = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
  const z = sigmaW > 0 ? (w - muW) / sigmaW : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const reject = p < alpha;
  return {
    testName: 'Wilcoxon İşaretli Sıralar Testi (Signed-Rank)',
    nullHypothesis: 'H₀: Eşleştirilmiş farkların medyanı = 0',
    altHypothesis: 'H₁: Eşleştirilmiş farkların medyanı ≠ 0',
    statisticLabel: 'W-İstatistiği',
    statisticValue: w,
    dfLabel: `n_etkin=${n}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    details: [
      { label: 'W⁺ / W⁻', value: `${wPlus.toFixed(1)} / ${wMinus.toFixed(1)}` },
      { label: 'Medyan Fark', value: median(diffs).toFixed(4) },
      { label: 'Z-Skoru', value: z.toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: Eşleştirilmiş ölçümler arasında parametrik olmayan anlamlı bir kayma mevcuttur.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: Eşleştirilmiş çiftler arasında anlamlı fark bulunmamıştır.`,
  };
}

export function runKruskalWallis(groups: Array<{ name: string; values: number[] }>, alpha = 0.05): HypothesisTestResult {
  if (groups.length < 2) throw new Error('Kruskal-Wallis için en az 2 grup gereklidir.');
  const flat: Array<{ val: number; gIdx: number }> = [];
  groups.forEach((g, idx) => g.values.forEach((v) => flat.push({ val: v, gIdx: idx })));
  const N = flat.length;
  if (N < 4) throw new Error('Yetersiz gözlem sayısı.');
  const ranks = rankArray(flat.map((f) => f.val));
  const rankSums = new Array(groups.length).fill(0);
  flat.forEach((item, i) => {
    rankSums[item.gIdx] += ranks[i];
  });
  let sumTerm = 0;
  groups.forEach((g, idx) => {
    if (g.values.length > 0) {
      sumTerm += (rankSums[idx] ** 2) / g.values.length;
    }
  });
  const H = (12 / (N * (N + 1))) * sumTerm - 3 * (N + 1);
  const df = groups.length - 1;
  const p = chiSquareUpperP(H, df);
  const reject = p < alpha;
  return {
    testName: 'Kruskal-Wallis H Testi',
    nullHypothesis: 'H₀: Tüm grup medyanları eşittir',
    altHypothesis: 'H₁: En az bir grup diğerlerinden farklıdır',
    statisticLabel: 'H-İstatistiği',
    statisticValue: H,
    dfLabel: `${df}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    details: groups.map((g, i) => ({
      label: `${g.name} (n=${g.values.length})`,
      value: `Medyan ${median(g.values).toFixed(3)} · Ort. Sıra ${(rankSums[i] / Math.max(1, g.values.length)).toFixed(1)}`,
    })),
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: En az bir grubun medyanı diğer gruplardan anlamlı şekilde ayrışmaktadır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: Gruplar arasında anlamlı fark tespit edilmedi.`,
  };
}

export function runFriedman(columns: number[][], colNames: string[], alpha = 0.05): HypothesisTestResult {
  const k = columns.length;
  const n = Math.min(...columns.map((c) => c.length));
  if (k < 2 || n < 2) throw new Error('Friedman testi için en az 2 işlem (sütun) ve 2 blok (satır) gereklidir.');
  const rankTotals = new Array(k).fill(0);
  for (let r = 0; r < n; r++) {
    const rowVals = columns.map((c) => c[r]);
    const rowRanks = rankArray(rowVals);
    rowRanks.forEach((rk, j) => {
      rankTotals[j] += rk;
    });
  }
  const sumSqRanks = rankTotals.reduce((acc, rt) => acc + rt * rt, 0);
  const Q = (12 / (n * k * (k + 1))) * sumSqRanks - 3 * n * (k + 1);
  const df = k - 1;
  const p = chiSquareUpperP(Q, df);
  const reject = p < alpha;
  return {
    testName: 'Friedman Blok Sıra Testi',
    nullHypothesis: 'H₀: Tekrarlı/bloklu işlemler arasında fark yoktur',
    altHypothesis: 'H₁: En az bir işlem farklı etkiye sahiptir',
    statisticLabel: 'Friedman Q (χ²)',
    statisticValue: Q,
    dfLabel: `${df}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    details: colNames.map((name, i) => ({
      label: name,
      value: `Sıra Toplamı: ${rankTotals[i].toFixed(1)} · Ort. Sıra: ${(rankTotals[i] / n).toFixed(2)}`,
    })),
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: Blok/tekrarlı ölçüm koşulları arasında istatistiksel olarak anlamlı fark vardır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: Koşullar arasında anlamlı fark bulunmamıştır.`,
  };
}

export function runSignTest(x: number[], hypothesizedMedian: number, alpha = 0.05): HypothesisTestResult {
  const diffs = x.map((v) => v - hypothesizedMedian).filter((d) => d !== 0);
  const n = diffs.length;
  if (n < 1) throw new Error('İşaret testi için medyan değerden farklı en az 1 gözlem gereklidir.');
  const plusCount = diffs.filter((d) => d > 0).length;
  const k = Math.min(plusCount, n - plusCount);
  let p = 0;
  for (let i = 0; i <= k; i++) {
    p += binomProb(i, n, 0.5);
  }
  p = Math.min(1, 2 * p);
  const reject = p < alpha;
  return {
    testName: 'İşaret Testi (Sign Test — Kesin Binom)',
    nullHypothesis: `H₀: Medyan = ${hypothesizedMedian}`,
    altHypothesis: `H₁: Medyan ≠ ${hypothesizedMedian}`,
    statisticLabel: 'Pozitif İşaret Sayısı',
    statisticValue: plusCount,
    dfLabel: `n=${n}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    details: [
      { label: 'Örneklem Medyanı', value: median(x).toFixed(4) },
      { label: 'Hedefin Üstünde (+)', value: `${plusCount}` },
      { label: 'Hedefin Altında (-)', value: `${n - plusCount}` },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: Gözlenen medyan (${median(x).toFixed(4)}) test edilen değerden (${hypothesizedMedian}) anlamlı düzeyde farklıdır.`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: Medyan değerin ${hypothesizedMedian} olduğu hipotezi reddedilemez.`,
  };
}

export function runChiSquareIndependence(
  rows: Record<string, unknown>[],
  colA: string,
  colB: string,
  alpha = 0.05
): HypothesisTestResult {
  const aCats = Array.from(new Set(rows.map((r) => String(r[colA] ?? 'Eksik')))).slice(0, 12);
  const bCats = Array.from(new Set(rows.map((r) => String(r[colB] ?? 'Eksik')))).slice(0, 12);
  if (aCats.length < 2 || bCats.length < 2) {
    throw new Error('Ki-Kare bağımsızlık testi için her iki kategorik sütunda da en az 2 sınıf bulunmalıdır.');
  }
  const table: number[][] = aCats.map(() => new Array(bCats.length).fill(0));
  rows.forEach((r) => {
    const ai = aCats.indexOf(String(r[colA] ?? 'Eksik'));
    const bi = bCats.indexOf(String(r[colB] ?? 'Eksik'));
    if (ai >= 0 && bi >= 0) table[ai][bi]++;
  });
  const rowTotals = table.map((row) => row.reduce((a, b) => a + b, 0));
  const colTotals = bCats.map((_, j) => table.reduce((acc, row) => acc + row[j], 0));
  const N = rowTotals.reduce((a, b) => a + b, 0);

  let chi2 = 0;
  for (let i = 0; i < aCats.length; i++) {
    for (let j = 0; j < bCats.length; j++) {
      const exp = (rowTotals[i] * colTotals[j]) / N;
      if (exp > 0) chi2 += (table[i][j] - exp) ** 2 / exp;
    }
  }
  const df = (aCats.length - 1) * (bCats.length - 1);
  const p = chiSquareUpperP(chi2, df);
  const cramersV = Math.sqrt(chi2 / (N * Math.max(1, Math.min(aCats.length - 1, bCats.length - 1))));
  const reject = p < alpha;
  return {
    testName: 'Ki-Kare Bağımsızlık Testi (Chi-Square Contingency)',
    nullHypothesis: `H₀: ${colA} ile ${colB} birbirinden bağımsızdır`,
    altHypothesis: `H₁: ${colA} ile ${colB} arasında ilişki vardır`,
    statisticLabel: 'Pearson Ki-Kare (χ²)',
    statisticValue: chi2,
    dfLabel: `${df}`,
    pValue: p,
    alpha,
    rejectNull: reject,
    details: [
      { label: 'Toplam Gözlem (N)', value: `${N}` },
      { label: 'Tablo Boyutu', value: `${aCats.length} × ${bCats.length}` },
      { label: 'Cramér V İlişki Gücü', value: cramersV.toFixed(4) },
    ],
    turkishConclusion: reject
      ? `p = ${p.toFixed(4)} < ${alpha}: ${colA} ve ${colB} kategorileri arasında istatistiksel olarak anlamlı bir bağımlılık vardır (Cramér V = ${cramersV.toFixed(3)}).`
      : `p = ${p.toFixed(4)} ≥ ${alpha}: İki kategorik değişken arasında anlamlı bir ilişki saptanmamıştır.`,
  };
}
