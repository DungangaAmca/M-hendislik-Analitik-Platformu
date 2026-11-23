import { invertMatrix, matMul, matVecMul, mean, normalInv, stdDev, transpose } from './mathCore';

export type DoeDesignType =
  | 'full_factorial'
  | 'fractional_factorial'
  | 'rsm'
  | 'ccd'
  | 'box_behnken'
  | 'mixture'
  | 'taguchi';

export interface DoeFactor {
  name: string;
  low: number;
  high: number;
}

export interface DoeRun {
  runOrder: number;
  stdOrder: number;
  coded: number[];
  actual: number[];
  response: number;
}

export interface DoeAnalysisResult {
  designName: string;
  factors: DoeFactor[];
  runs: DoeRun[];
  effects: Array<{ term: string; effect: number; tValue: number; significant: boolean }>;
  snRatios?: Array<{ factor: string; levelLowSN: number; levelMidSN?: number; levelHighSN: number; bestLevel: string }>;
  optimalSettings: Record<string, number>;
  rSquared: number;
  turkishInterpretation: string;
}

const L9_ARRAY = [
  [1, 1, 1],
  [1, 2, 2],
  [1, 3, 3],
  [2, 1, 2],
  [2, 2, 3],
  [2, 3, 1],
  [3, 1, 3],
  [3, 2, 1],
  [3, 3, 2],
];

const L4_ARRAY = [
  [-1, -1, 1],
  [-1, 1, -1],
  [1, -1, -1],
  [1, 1, 1],
];

export function generateDoeMatrix(
  designType: DoeDesignType,
  factors: DoeFactor[],
  taguchiGoal: 'larger' | 'smaller' | 'nominal' = 'larger'
): DoeRun[] {
  const k = Math.max(2, Math.min(4, factors.length));
  const fSlice = factors.slice(0, k);
  let codedMatrix: number[][] = [];

  if (designType === 'full_factorial') {
    const nRuns = Math.pow(2, k);
    for (let i = 0; i < nRuns; i++) {
      codedMatrix.push(
        Array.from({ length: k }, (_, j) => ((i >> j) & 1 ? 1 : -1))
      );
    }
  } else if (designType === 'fractional_factorial') {
    if (k <= 2) {
      codedMatrix = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    } else if (k === 3) {
      // 2^(3-1) Resolution III: C = A * B
      codedMatrix = L4_ARRAY;
    } else {
      // 2^(4-1) Resolution IV: D = A * B * C
      for (let i = 0; i < 8; i++) {
        const a = i & 1 ? 1 : -1;
        const b = i & 2 ? 1 : -1;
        const c = i & 4 ? 1 : -1;
        codedMatrix.push([a, b, c, a * b * c]);
      }
    }
  } else if (designType === 'ccd' || designType === 'rsm') {
    const nFact = Math.pow(2, k);
    for (let i = 0; i < nFact; i++) {
      codedMatrix.push(Array.from({ length: k }, (_, j) => ((i >> j) & 1 ? 1 : -1)));
    }
    const alpha = Math.pow(nFact, 0.25);
    for (let j = 0; j < k; j++) {
      const lowAxial = new Array(k).fill(0);
      lowAxial[j] = Number((-alpha).toFixed(3));
      const highAxial = new Array(k).fill(0);
      highAxial[j] = Number(alpha.toFixed(3));
      codedMatrix.push(lowAxial, highAxial);
    }
    codedMatrix.push(new Array(k).fill(0), new Array(k).fill(0), new Array(k).fill(0));
  } else if (designType === 'box_behnken') {
    const kk = Math.max(3, k);
    for (let i = 0; i < kk; i++) {
      for (let j = i + 1; j < kk; j++) {
        for (const a of [-1, 1]) {
          for (const b of [-1, 1]) {
            const row = new Array(k).fill(0);
            if (i < k) row[i] = a;
            if (j < k) row[j] = b;
            codedMatrix.push(row);
          }
        }
      }
    }
    codedMatrix.push(new Array(k).fill(0), new Array(k).fill(0));
  } else if (designType === 'mixture') {
    // Simplex-Lattice {k, 2} mixture design
    for (let i = 0; i < k; i++) {
      const pure = new Array(k).fill(0);
      pure[i] = 1;
      codedMatrix.push(pure);
    }
    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const bin = new Array(k).fill(0);
        bin[i] = 0.5;
        bin[j] = 0.5;
        codedMatrix.push(bin);
      }
    }
    codedMatrix.push(new Array(k).fill(Number((1 / k).toFixed(3))));
  } else {
    // Taguchi L9 (3-level coded as -1, 0, +1)
    codedMatrix = L9_ARRAY.map((row) =>
      Array.from({ length: k }, (_, j) => (row[j % 3] === 1 ? -1 : row[j % 3] === 2 ? 0 : 1))
    );
  }

  // Deterministic realistic metallurgical response surface simulation so initial table is immediately analyzable & editable
  return codedMatrix.map((coded, idx) => {
    const actual = coded.map((c, j) => {
      const f = fSlice[j];
      if (designType === 'mixture') {
        return Number((f.low + c * (f.high - f.low)).toFixed(3));
      }
      const mid = 0.5 * (f.low + f.high);
      const half = 0.5 * (f.high - f.low);
      return Number((mid + c * half).toFixed(3));
    });
    const base = taguchiGoal === 'smaller' ? 0.55 : 78.0;
    const sign = taguchiGoal === 'smaller' ? -1 : 1;
    const c0 = coded[0] ?? 0;
    const c1 = coded[1] ?? 0;
    const c2 = coded[2] ?? 0;
    const synthY =
      base +
      sign * (2.4 * c0 - 1.5 * c1 + 0.9 * c2 + 0.8 * c0 * c1 - 0.6 * c0 * c0) +
      Math.sin(idx * 1.7) * 0.28;
    return {
      runOrder: idx + 1,
      stdOrder: idx + 1,
      coded,
      actual,
      response: Number(synthY.toFixed(3)),
    };
  });
}

export function analyzeDoeRuns(
  designType: DoeDesignType,
  factors: DoeFactor[],
  runs: DoeRun[],
  taguchiGoal: 'larger' | 'smaller' | 'nominal' = 'larger'
): DoeAnalysisResult {
  const k = Math.min(factors.length, runs[0]?.coded.length ?? 2);
  const fSlice = factors.slice(0, k);
  const y = runs.map((r) => r.response);
  const n = y.length;

  // Build design matrix: intercept + linear terms (+ quadratic for RSM/CCD/Box-Behnken)
  const termNames: string[] = [...fSlice.map((f) => f.name)];
  const includeQuad = designType === 'rsm' || designType === 'ccd' || designType === 'box_behnken';
  if (k >= 2 && designType !== 'taguchi' && designType !== 'mixture') {
    termNames.push(`${fSlice[0].name}×${fSlice[1].name}`);
  }
  if (includeQuad) {
    fSlice.forEach((f) => termNames.push(`${f.name}²`));
  }

  const X = runs.map((r) => {
    const row = [1, ...r.coded.slice(0, k)];
    if (k >= 2 && designType !== 'taguchi' && designType !== 'mixture') {
      row.push(r.coded[0] * r.coded[1]);
    }
    if (includeQuad) {
      r.coded.slice(0, k).forEach((c) => row.push(c * c));
    }
    return row;
  });

  const Xt = transpose(X);
  const XtX = matMul(Xt, X);
  for (let i = 0; i < XtX.length; i++) XtX[i][i] += 1e-6;
  const XtXInv = invertMatrix(XtX);
  const beta = matVecMul(XtXInv, matVecMul(Xt, y));
  const yPred = X.map((row) => row.reduce((a, v, j) => a + v * beta[j], 0));
  const residuals = y.map((yi, i) => yi - yPred[i]);
  const my = mean(y);
  const sst = y.reduce((a, v) => a + (v - my) ** 2, 0);
  const sse = residuals.reduce((a, r) => a + r * r, 0);
  const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
  const dfE = Math.max(1, n - beta.length);
  const mse = sse / dfE;

  const effects = termNames.map((term, idx) => {
    const b = beta[idx + 1] ?? 0;
    const se = Math.sqrt(Math.max(1e-8, mse * XtXInv[idx + 1][idx + 1]));
    const tVal = Math.abs(b / se);
    return {
      term,
      effect: b * 2,
      tValue: tVal,
      significant: tVal > 2.0,
    };
  });

  const optimalSettings: Record<string, number> = {};
  fSlice.forEach((f, j) => {
    const b = beta[j + 1] ?? 0;
    if (designType === 'mixture') {
      optimalSettings[f.name] = Number((1 / k).toFixed(3));
    } else {
      const wantHigh = taguchiGoal === 'smaller' ? b < 0 : b >= 0;
      optimalSettings[f.name] = wantHigh ? f.high : f.low;
    }
  });

  let snRatios: DoeAnalysisResult['snRatios'] = undefined;
  if (designType === 'taguchi') {
    const calcSN = (vals: number[]): number => {
      if (vals.length === 0) return 0;
      if (taguchiGoal === 'larger') {
        const avgInvSq = mean(vals.map((v) => 1 / Math.max(1e-6, v * v)));
        return -10 * Math.log10(avgInvSq);
      }
      if (taguchiGoal === 'smaller') {
        const avgSq = mean(vals.map((v) => v * v));
        return -10 * Math.log10(Math.max(1e-9, avgSq));
      }
      const m = mean(vals);
      const v = stdDev(vals, true) ** 2 || 1e-6;
      return 10 * Math.log10((m * m) / v);
    };

    snRatios = fSlice.map((f, j) => {
      const lowVals = runs.filter((r) => r.coded[j] === -1).map((r) => r.response);
      const midVals = runs.filter((r) => r.coded[j] === 0).map((r) => r.response);
      const highVals = runs.filter((r) => r.coded[j] === 1).map((r) => r.response);
      const snL = calcSN(lowVals);
      const snM = calcSN(midVals);
      const snH = calcSN(highVals);
      const best =
        snL >= snM && snL >= snH ? `${f.low}` : snM >= snH ? `${(0.5 * (f.low + f.high)).toFixed(2)}` : `${f.high}`;
      return {
        factor: f.name,
        levelLowSN: snL,
        levelMidSN: snM,
        levelHighSN: snH,
        bestLevel: best,
      };
    });
  }

  const sigNames = effects.filter((e) => e.significant).map((e) => e.term);
  return {
    designName: designType.toUpperCase(),
    factors: fSlice,
    runs,
    effects,
    snRatios,
    optimalSettings,
    rSquared: r2,
    turkishInterpretation:
      `Deney modeli R² = %${(r2 * 100).toFixed(1)} uyum sağlamıştır. ` +
      (sigNames.length > 0
        ? `İstatistiksel olarak baskın faktörler: ${sigNames.join(', ')}. `
        : 'Faktör etkileri ılımlı düzeydedir. ') +
      `Önerilen optimum ayar: ${Object.entries(optimalSettings)
        .map(([kName, v]) => `${kName}=${v}`)
        .join(', ')}.`,
  };
}

// ---------------- RELIABILITY & SURVIVAL ENGINE ----------------

export type ReliabilityMethod = 'weibull' | 'exponential' | 'lognormal' | 'survival' | 'growth';

export interface ReliabilityResult {
  methodName: string;
  nTotal: number;
  nFailures: number;
  nCensored: number;
  shapeBeta?: number;
  scaleEta?: number;
  mttf: number;
  b10Life: number;
  b50Life: number;
  b90Life: number;
  hazardRate?: number;
  curvePoints: Array<{ t: number; reliability: number; cdf: number }>;
  probPlotPoints: Array<{ x: number; y: number; label: string }>;
  turkishInterpretation: string;
}

export function runReliabilityAnalysis(
  method: ReliabilityMethod,
  times: number[],
  censoredFlags?: number[] // 1 = failure, 0 = censored
): ReliabilityResult {
  const clean = times
    .map((t, i) => ({ t: Math.max(0.01, t), fail: censoredFlags ? (censoredFlags[i] === 0 ? 0 : 1) : 1 }))
    .filter((d) => Number.isFinite(d.t))
    .sort((a, b) => a.t - b.t);

  const failures = clean.filter((d) => d.fail === 1).map((d) => d.t);
  if (failures.length < 3) {
    throw new Error('Güvenilirlik analizi için en az 3 arıza (sansürsüz) gözlemi gereklidir.');
  }

  const nTotal = clean.length;
  const nFailures = failures.length;
  const nCensored = nTotal - nFailures;

  if (method === 'weibull') {
    // Bernard's median ranks + Rank Regression on Y (ln(-ln(1-F)) vs ln(t))
    const nF = failures.length;
    const xs = failures.map((t) => Math.log(t));
    const ys = failures.map((_, i) => {
      const f = (i + 1 - 0.3) / (nF + 0.4);
      return Math.log(-Math.log(1 - f));
    });
    const mx = mean(xs);
    const my = mean(ys);
    let num = 0;
    let den = 0;
    for (let i = 0; i < nF; i++) {
      num += (xs[i] - mx) * (ys[i] - my);
      den += (xs[i] - mx) ** 2;
    }
    const beta = den > 0 ? Math.max(0.2, num / den) : 1.0;
    const intercept = my - beta * mx;
    const eta = Math.exp(-intercept / beta);

    const bLife = (p: number) => eta * Math.pow(-Math.log(1 - p), 1 / beta);
    const b10 = bLife(0.1);
    const b50 = bLife(0.5);
    const b90 = bLife(0.9);
    const mttf = eta * Math.exp(0.5772 * (1 / beta - 1) * 0.25); // clean approx around gamma(1+1/beta)
    const maxT = Math.max(...failures, b90) * 1.15;
    const curvePoints = Array.from({ length: 30 }, (_, i) => {
      const t = (i / 29) * maxT;
      const r = Math.exp(-Math.pow(t / eta, beta));
      return { t, reliability: r, cdf: 1 - r };
    });

    const failureMode =
      beta < 0.9
        ? 'β < 1: Erken dönem (bebek ölümleri / montaj hatası) arızaları baskın.'
        : beta <= 1.15
          ? 'β ≈ 1: Zamandan bağımsız rastgele arıza rejimi.'
          : 'β > 1: Aşınma ve yorulma kaynaklı yaşlanma arızaları hakim; planlı önleyici bakım etkilidir.';

    return {
      methodName: '2-Parametreli Weibull Ömür Analizi',
      nTotal,
      nFailures,
      nCensored,
      shapeBeta: beta,
      scaleEta: eta,
      mttf,
      b10Life: b10,
      b50Life: b50,
      b90Life: b90,
      curvePoints,
      probPlotPoints: xs.map((x, i) => ({ x, y: ys[i], label: `t=${failures[i].toFixed(1)}` })),
      turkishInterpretation: `Weibull Şekil β = ${beta.toFixed(3)}, Karakteristik Ömür η = ${eta.toFixed(1)}, B10 Ömür = ${b10.toFixed(1)}. ${failureMode}`,
    };
  }

  if (method === 'exponential') {
    const totalTime = clean.reduce((a, d) => a + d.t, 0);
    const mttf = totalTime / nFailures;
    const lambda = 1 / mttf;
    const b10 = -mttf * Math.log(0.9);
    const b50 = -mttf * Math.log(0.5);
    const b90 = -mttf * Math.log(0.1);
    const maxT = b90 * 1.15;
    const curvePoints = Array.from({ length: 30 }, (_, i) => {
      const t = (i / 29) * maxT;
      const r = Math.exp(-lambda * t);
      return { t, reliability: r, cdf: 1 - r };
    });
    return {
      methodName: 'Üstel (Exponential) Sabit Arıza Hızı Modeli',
      nTotal,
      nFailures,
      nCensored,
      mttf,
      hazardRate: lambda,
      b10Life: b10,
      b50Life: b50,
      b90Life: b90,
      curvePoints,
      probPlotPoints: failures.map((t, i) => ({
        x: t,
        y: -Math.log(1 - (i + 0.7) / (nFailures + 0.4)),
        label: `t=${t.toFixed(1)}`,
      })),
      turkishInterpretation: `Sabit arıza oranı λ = ${lambda.toExponential(3)} /birim zaman, MTTF = ${mttf.toFixed(1)}, B10 = ${b10.toFixed(1)}.`,
    };
  }

  if (method === 'lognormal') {
    const lnT = failures.map((t) => Math.log(t));
    const mu = mean(lnT);
    const sigma = stdDev(lnT, true) || 0.25;
    const mttf = Math.exp(mu + 0.5 * sigma * sigma);
    const b10 = Math.exp(mu + normalInv(0.1) * sigma);
    const b50 = Math.exp(mu);
    const b90 = Math.exp(mu + normalInv(0.9) * sigma);
    const maxT = b90 * 1.15;
    const curvePoints = Array.from({ length: 30 }, (_, i) => {
      const t = Math.max(1e-4, (i / 29) * maxT);
      const z = (Math.log(t) - mu) / sigma;
      // Logistic approximation to normal survival for smooth curve
      const cdf = 1 / (1 + Math.exp(-1.702 * z));
      return { t, reliability: 1 - cdf, cdf };
    });
    return {
      methodName: 'Lognormal Ömür Dağılımı Analizi',
      nTotal,
      nFailures,
      nCensored,
      shapeBeta: sigma,
      scaleEta: b50,
      mttf,
      b10Life: b10,
      b50Life: b50,
      b90Life: b90,
      curvePoints,
      probPlotPoints: lnT.map((x, i) => ({
        x,
        y: normalInv((i + 0.7) / (nFailures + 0.4)),
        label: `t=${failures[i].toFixed(1)}`,
      })),
      turkishInterpretation: `Lognormal parametreler: μ(ln)=${mu.toFixed(3)}, σ(ln)=${sigma.toFixed(3)}. Medyan ömür (B50) = ${b50.toFixed(1)}, MTTF = ${mttf.toFixed(1)}.`,
    };
  }

  if (method === 'survival') {
    // Kaplan-Meier Non-Parametric Survival Estimator
    let surv = 1.0;
    let atRisk = nTotal;
    const curvePoints: Array<{ t: number; reliability: number; cdf: number }> = [
      { t: 0, reliability: 1, cdf: 0 },
    ];
    let b10 = clean[clean.length - 1].t;
    let b50 = clean[clean.length - 1].t;
    let b90 = clean[clean.length - 1].t;
    let found10 = false;
    let found50 = false;
    let found90 = false;

    for (const item of clean) {
      if (item.fail === 1 && atRisk > 0) {
        surv *= (atRisk - 1) / atRisk;
      }
      atRisk--;
      curvePoints.push({ t: item.t, reliability: surv, cdf: 1 - surv });
      if (!found10 && surv <= 0.9) {
        b10 = item.t;
        found10 = true;
      }
      if (!found50 && surv <= 0.5) {
        b50 = item.t;
        found50 = true;
      }
      if (!found90 && surv <= 0.1) {
        b90 = item.t;
        found90 = true;
      }
    }
    const mttf = mean(failures);
    return {
      methodName: 'Kaplan-Meier Sağkalım Analizi (Survival)',
      nTotal,
      nFailures,
      nCensored,
      mttf,
      b10Life: b10,
      b50Life: b50,
      b90Life: b90,
      curvePoints,
      probPlotPoints: curvePoints.slice(1).map((p) => ({ x: p.t, y: p.reliability, label: `S(t)=${(p.reliability * 100).toFixed(0)}%` })),
      turkishInterpretation: `Kaplan-Meier basamak fonksiyonu ${nCensored} sansürlü ve ${nFailures} arızalı gözlemle hesaplandı. Medyan sağkalım süresi = ${b50.toFixed(1)}.`,
    };
  }

  // Crow-AMSAA Reliability Growth (cumulative failure times)
  const cumTimes: number[] = [];
  let acc = 0;
  for (const t of failures) {
    acc += t;
    cumTimes.push(acc);
  }
  const T = cumTimes[cumTimes.length - 1];
  const denom = cumTimes.reduce((s, ti) => s + Math.log(T / Math.max(1e-6, ti)), 0);
  const betaGrowth = denom > 0 ? nFailures / denom : 1.0;
  const lambdaGrowth = nFailures / Math.pow(T, betaGrowth);
  const currentMTBF = 1 / (lambdaGrowth * betaGrowth * Math.pow(T, betaGrowth - 1));
  const curvePoints = cumTimes.map((ct, i) => ({
    t: ct,
    reliability: 1 / (lambdaGrowth * betaGrowth * Math.pow(ct, betaGrowth - 1)),
    cdf: i + 1,
  }));

  return {
    methodName: 'Crow-AMSAA Güvenilirlik Büyümesi (Reliability Growth)',
    nTotal,
    nFailures,
    nCensored: 0,
    shapeBeta: betaGrowth,
    mttf: currentMTBF,
    b10Life: currentMTBF * 0.105,
    b50Life: currentMTBF * 0.693,
    b90Life: currentMTBF * 2.302,
    curvePoints,
    probPlotPoints: cumTimes.map((ct, i) => ({
      x: Math.log(ct),
      y: Math.log(i + 1),
      label: `N=${i + 1}`,
    })),
    turkishInterpretation:
      `Crow-AMSAA büyüme parametresi β = ${betaGrowth.toFixed(3)}. ` +
      (betaGrowth < 1
        ? `β < 1 olduğundan sistem güvenilirliği iyileşmektedir (Güncel Anlık MTBF = ${currentMTBF.toFixed(1)}).`
        : `β ≥ 1 olduğundan arıza sıklığı artmaktadır; bakım/tasarım müdahalesi önerilir.`),
  };
}
