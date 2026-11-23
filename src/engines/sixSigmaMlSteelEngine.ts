import { invertMatrix, matMul, matVecMul, mean, median, stdDev, transpose } from './mathCore';

// ---------------- MACHINE LEARNING ENGINE ----------------

export interface MlModelComparison {
  modelName: string;
  metricName: string;
  score: number;
  secondaryMetric: string;
  secondaryValue: number;
  notes: string;
}

export interface ClusteringResult {
  k: number;
  inertia: number;
  silhouette: number;
  clusters: Array<{ clusterId: number; count: number; centroid: Record<string, number> }>;
  points: Array<{ x: number; y: number; cluster: number }>;
  xLabel: string;
  yLabel: string;
}

export interface ForecastResult {
  horizon: number;
  mae: number;
  mape: number;
  historical: Array<{ t: number; actual: number; fitted: number }>;
  forecast: Array<{ t: number; point: number; low95: number; high95: number }>;
}

export interface AnomalyResult {
  totalPoints: number;
  anomalyCount: number;
  threshold: number;
  points: Array<{ index: number; score: number; isAnomaly: boolean; values: Record<string, number> }>;
}

export function runKMeansClustering(
  X: number[][],
  featureNames: string[],
  k = 3
): ClusteringResult {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  if (n < k + 2 || p < 2) throw new Error('Kümeleme için en az 2 sayısal özellik ve k+2 gözlem gereklidir.');

  const means = Array.from({ length: p }, (_, j) => mean(X.map((r) => r[j])));
  const sds = Array.from({ length: p }, (_, j) => stdDev(X.map((r) => r[j]), false) || 1);
  const Xs = X.map((r) => r.map((v, j) => (v - means[j]) / sds[j]));

  // Deterministic K-Means++ initialization
  const centroids: number[][] = [Xs[0]];
  while (centroids.length < k) {
    let bestIdx = 0;
    let bestDist = -1;
    for (let i = 0; i < n; i++) {
      let minD = Infinity;
      for (const c of centroids) {
        const d = Xs[i].reduce((s, v, j) => s + (v - c[j]) ** 2, 0);
        if (d < minD) minD = d;
      }
      if (minD > bestDist) {
        bestDist = minD;
        bestIdx = i;
      }
    }
    centroids.push([...Xs[bestIdx]]);
  }

  const labels = new Array(n).fill(0);
  for (let iter = 0; iter < 30; iter++) {
    let changed = false;
    for (let i = 0; i < n; i++) {
      let bestC = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = Xs[i].reduce((s, v, j) => s + (v - centroids[c][j]) ** 2, 0);
        if (d < bestD) {
          bestD = d;
          bestC = c;
        }
      }
      if (labels[i] !== bestC) {
        labels[i] = bestC;
        changed = true;
      }
    }
    for (let c = 0; c < k; c++) {
      const members = Xs.filter((_, i) => labels[i] === c);
      if (members.length > 0) {
        for (let j = 0; j < p; j++) {
          centroids[c][j] = mean(members.map((m) => m[j]));
        }
      }
    }
    if (!changed) break;
  }

  let inertia = 0;
  for (let i = 0; i < n; i++) {
    const c = centroids[labels[i]];
    inertia += Xs[i].reduce((s, v, j) => s + (v - c[j]) ** 2, 0);
  }

  // Approximate Silhouette score
  let silSum = 0;
  for (let i = 0; i < n; i++) {
    const myC = labels[i];
    const same = Xs.filter((_, idx) => idx !== i && labels[idx] === myC);
    const a =
      same.length > 0
        ? mean(same.map((m) => Math.sqrt(m.reduce((s, v, j) => s + (v - Xs[i][j]) ** 2, 0))))
        : 0;
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === myC) continue;
      const other = Xs.filter((_, idx) => labels[idx] === c);
      if (other.length > 0) {
        const d = mean(other.map((m) => Math.sqrt(m.reduce((s, v, j) => s + (v - Xs[i][j]) ** 2, 0))));
        if (d < b) b = d;
      }
    }
    const denom = Math.max(a, b);
    silSum += denom > 0 && Number.isFinite(b) ? (b - a) / denom : 0;
  }

  const clusters = Array.from({ length: k }, (_, c) => {
    const membersRaw = X.filter((_, i) => labels[i] === c);
    const centroidObj: Record<string, number> = {};
    featureNames.forEach((fn, j) => {
      centroidObj[fn] = membersRaw.length > 0 ? mean(membersRaw.map((m) => m[j])) : means[j];
    });
    return { clusterId: c + 1, count: membersRaw.length, centroid: centroidObj };
  });

  return {
    k,
    inertia,
    silhouette: silSum / n,
    clusters,
    points: X.map((r, i) => ({ x: r[0], y: r[1], cluster: labels[i] + 1 })),
    xLabel: featureNames[0],
    yLabel: featureNames[1],
  };
}

export function runHoltForecast(series: number[], horizon = 8, alpha = 0.35, beta = 0.15): ForecastResult {
  if (series.length < 5) throw new Error('Zaman serisi öngörüsü için en az 5 gözlem gereklidir.');
  let level = series[0];
  let trend = series[1] - series[0];
  const historical: ForecastResult['historical'] = [];
  const errors: number[] = [];

  for (let t = 0; t < series.length; t++) {
    const fitted = level + trend;
    const err = series[t] - fitted;
    if (t > 0) errors.push(err);
    const nextLevel = alpha * series[t] + (1 - alpha) * (level + trend);
    const nextTrend = beta * (nextLevel - level) + (1 - beta) * trend;
    level = nextLevel;
    trend = nextTrend;
    historical.push({ t: t + 1, actual: series[t], fitted: t === 0 ? series[0] : fitted });
  }

  const rmse = Math.sqrt(mean(errors.map((e) => e * e))) || stdDev(series, true) * 0.2;
  const mae = mean(errors.map((e) => Math.abs(e)));
  const mape = mean(
    series.slice(1).map((v, i) => (Math.abs(v) > 1e-6 ? Math.abs(errors[i] / v) * 100 : 0))
  );

  const forecast: ForecastResult['forecast'] = [];
  for (let h = 1; h <= horizon; h++) {
    const pt = level + h * trend;
    const width = 1.96 * rmse * Math.sqrt(h);
    forecast.push({
      t: series.length + h,
      point: pt,
      low95: pt - width,
      high95: pt + width,
    });
  }

  return { horizon, mae, mape, historical, forecast };
}

export function runAnomalyDetection(
  X: number[][],
  featureNames: string[],
  zThreshold = 2.8
): AnomalyResult {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  if (n < 5 || p < 1) throw new Error('Anomali tespiti için en az 5 gözlem ve 1 sayısal sütun gerekir.');

  const meds = Array.from({ length: p }, (_, j) => median(X.map((r) => r[j])));
  const mads = Array.from({ length: p }, (_, j) => {
    const col = X.map((r) => r[j]);
    const md = median(col.map((v) => Math.abs(v - meds[j])));
    return md > 1e-6 ? md : stdDev(col, true) * 0.6745 || 1;
  });

  const points = X.map((row, idx) => {
    const zVec = row.map((v, j) => (0.6745 * (v - meds[j])) / mads[j]);
    const score = Math.sqrt(mean(zVec.map((z) => z * z)));
    const vals: Record<string, number> = {};
    featureNames.forEach((fn, j) => {
      vals[fn] = row[j];
    });
    return {
      index: idx + 1,
      score,
      isAnomaly: score > zThreshold,
      values: vals,
    };
  });

  return {
    totalPoints: n,
    anomalyCount: points.filter((pt) => pt.isAnomaly).length,
    threshold: zThreshold,
    points,
  };
}

export function runAutoMLBenchmark(
  Xraw: number[][],
  y: number[],
  taskType: 'regression' | 'classification'
): MlModelComparison[] {
  const n = y.length;
  if (n < 10) throw new Error('AutoML çapraz doğrulaması için en az 10 satır gereklidir.');
  const split = Math.floor(n * 0.75);
  const Xtr = Xraw.slice(0, split);
  const ytr = y.slice(0, split);
  const Xte = Xraw.slice(split);
  const yte = y.slice(split);

  const p = Xraw[0].length;
  const xM = Array.from({ length: p }, (_, j) => mean(Xtr.map((r) => r[j])));
  const xS = Array.from({ length: p }, (_, j) => stdDev(Xtr.map((r) => r[j]), false) || 1);
  const norm = (M: number[][]) => M.map((r) => r.map((v, j) => (v - xM[j]) / xS[j]));
  const Ztr = norm(Xtr);
  const Zte = norm(Xte);

  if (taskType === 'regression') {
    const evalReg = (pred: number[]) => {
      const rmse = Math.sqrt(mean(yte.map((v, i) => (v - pred[i]) ** 2)));
      const ym = mean(yte);
      const sst = yte.reduce((a, v) => a + (v - ym) ** 2, 0);
      const sse = yte.reduce((a, v, i) => a + (v - pred[i]) ** 2, 0);
      const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
      return { rmse, r2 };
    };

    // 1. OLS
    const Xtr1 = Ztr.map((r) => [1, ...r]);
    const Xte1 = Zte.map((r) => [1, ...r]);
    const Xt = transpose(Xtr1);
    const XtX = matMul(Xt, Xtr1);
    for (let j = 0; j < XtX.length; j++) XtX[j][j] += 1e-4;
    const bOls = matVecMul(invertMatrix(XtX), matVecMul(Xt, ytr));
    const predOls = Xte1.map((r) => r.reduce((a, v, j) => a + v * bOls[j], 0));
    const mOls = evalReg(predOls);

    // 2. Ridge (L2 = 5)
    const XtXR = matMul(Xt, Xtr1);
    for (let j = 1; j < XtXR.length; j++) XtXR[j][j] += 5.0;
    const bRidge = matVecMul(invertMatrix(XtXR), matVecMul(Xt, ytr));
    const predRidge = Xte1.map((r) => r.reduce((a, v, j) => a + v * bRidge[j], 0));
    const mRidge = evalReg(predRidge);

    // 3. KNN (k=5)
    const predKnn = Zte.map((row) => {
      const dists = Ztr.map((tr, i) => ({
        d: tr.reduce((s, v, j) => s + (v - row[j]) ** 2, 0),
        y: ytr[i],
      })).sort((a, b) => a.d - b.d);
      return mean(dists.slice(0, 5).map((d) => d.y));
    });
    const mKnn = evalReg(predKnn);

    // 4. Boosted Ensemble (OLS + Residual KNN)
    const trPredOls = Xtr1.map((r) => r.reduce((a, v, j) => a + v * bOls[j], 0));
    const trRes = ytr.map((v, i) => v - trPredOls[i]);
    const predBoost = Zte.map((row, idx) => {
      const dists = Ztr.map((tr, i) => ({
        d: tr.reduce((s, v, j) => s + (v - row[j]) ** 2, 0),
        r: trRes[i],
      })).sort((a, b) => a.d - b.d);
      return predOls[idx] + 0.5 * mean(dists.slice(0, 5).map((d) => d.r));
    });
    const mBoost = evalReg(predBoost);

    return [
      { modelName: 'Doğrusal Regresyon (OLS)', metricName: 'Test R²', score: mOls.r2, secondaryMetric: 'RMSE', secondaryValue: mOls.rmse, notes: 'Temel parametrik model' },
      { modelName: 'Ridge L2 Düzenlileştirilmiş', metricName: 'Test R²', score: mRidge.r2, secondaryMetric: 'RMSE', secondaryValue: mRidge.rmse, notes: 'Çoklu bağlantıya dirençli' },
      { modelName: 'K-En Yakın Komşu (KNN k=5)', metricName: 'Test R²', score: mKnn.r2, secondaryMetric: 'RMSE', secondaryValue: mKnn.rmse, notes: 'Doğrusal olmayan yerel uyum' },
      { modelName: 'Hibrit Gradient-Boosted OLS', metricName: 'Test R²', score: mBoost.r2, secondaryMetric: 'RMSE', secondaryValue: mBoost.rmse, notes: 'Artık öğrenmeli topluluk modeli' },
    ].sort((a, b) => b.score - a.score);
  }

  // Classification benchmark (binarized by median if continuous)
  const med = median(y);
  const bin = (arr: number[]) => (arr.every((v) => v === 0 || v === 1) ? arr : arr.map((v) => (v >= med ? 1 : 0)));
  const ytrB = bin(ytr);
  const yteB = bin(yte);

  const evalCls = (preds: number[]) => {
    const acc = preds.filter((pr, i) => pr === yteB[i]).length / Math.max(1, yteB.length);
    const tp = preds.filter((pr, i) => pr === 1 && yteB[i] === 1).length;
    const fp = preds.filter((pr, i) => pr === 1 && yteB[i] === 0).length;
    const fn = preds.filter((pr, i) => pr === 0 && yteB[i] === 1).length;
    const f1 = 2 * tp + fp + fn > 0 ? (2 * tp) / (2 * tp + fp + fn) : acc;
    return { acc, f1 };
  };

  // KNN k=3 & k=5
  const knnPredict = (kNN: number) =>
    Zte.map((row) => {
      const dists = Ztr.map((tr, i) => ({
        d: tr.reduce((s, v, j) => s + (v - row[j]) ** 2, 0),
        y: ytrB[i],
      })).sort((a, b) => a.d - b.d);
      return mean(dists.slice(0, kNN).map((d) => d.y)) >= 0.5 ? 1 : 0;
    });

  // Gaussian Naive Bayes / Centroid Classifier
  const posRows = Ztr.filter((_, i) => ytrB[i] === 1);
  const negRows = Ztr.filter((_, i) => ytrB[i] === 0);
  const cPos = Array.from({ length: p }, (_, j) => (posRows.length > 0 ? mean(posRows.map((r) => r[j])) : 0));
  const cNeg = Array.from({ length: p }, (_, j) => (negRows.length > 0 ? mean(negRows.map((r) => r[j])) : 0));
  const predCentroid = Zte.map((row) => {
    const dPos = row.reduce((s, v, j) => s + (v - cPos[j]) ** 2, 0);
    const dNeg = row.reduce((s, v, j) => s + (v - cNeg[j]) ** 2, 0);
    return dPos <= dNeg ? 1 : 0;
  });

  // Logistic Regression
  const XtrL = Ztr.map((r) => [1, ...r]);
  const XteL = Zte.map((r) => [1, ...r]);
  const beta = new Array(p + 1).fill(0);
  for (let it = 0; it < 15; it++) {
    for (let i = 0; i < XtrL.length; i++) {
      const z = Math.max(-15, Math.min(15, XtrL[i].reduce((a, v, j) => a + v * beta[j], 0)));
      const pr = 1 / (1 + Math.exp(-z));
      const err = ytrB[i] - pr;
      for (let j = 0; j <= p; j++) beta[j] += 0.1 * err * XtrL[i][j];
    }
  }
  const predLog = XteL.map((row) => {
    const z = row.reduce((a, v, j) => a + v * beta[j], 0);
    return 1 / (1 + Math.exp(-z)) >= 0.5 ? 1 : 0;
  });

  const mLog = evalCls(predLog);
  const mK3 = evalCls(knnPredict(3));
  const mK5 = evalCls(knnPredict(5));
  const mCent = evalCls(predCentroid);

  return [
    { modelName: 'Lojistik Sınıflandırıcı', metricName: 'Doğruluk', score: mLog.acc, secondaryMetric: 'F1 Skoru', secondaryValue: mLog.f1, notes: 'Doğrusal karar sınırı' },
    { modelName: 'KNN Sınıflandırıcı (k=3)', metricName: 'Doğruluk', score: mK3.acc, secondaryMetric: 'F1 Skoru', secondaryValue: mK3.f1, notes: 'Yerel komşuluk sınırı' },
    { modelName: 'KNN Sınıflandırıcı (k=5)', metricName: 'Doğruluk', score: mK5.acc, secondaryMetric: 'F1 Skoru', secondaryValue: mK5.f1, notes: 'Dengelenmiş komşuluk' },
    { modelName: 'Merkez Uzaklık (Centroid)', metricName: 'Doğruluk', score: mCent.acc, secondaryMetric: 'F1 Skoru', secondaryValue: mCent.f1, notes: 'Sınıf prototip sınıflandırıcısı' },
  ].sort((a, b) => b.score - a.score);
}

// ---------------- IRON & STEEL ENGINEERING PACKAGES ----------------

export interface SteelMetricCard {
  label: string;
  value: string;
  unit: string;
  targetRange: string;
  status: 'Nominal' | 'Uyarı' | 'Alarm';
}

export interface SteelPackageAnalysis {
  packageTitle: string;
  metrics: SteelMetricCard[];
  recommendations: string[];
}

export function analyzeBlastFurnace(params: {
  blastTempC: number;
  blastMoistureG: number;
  o2EnrichmentPct: number;
  pciKgT: number;
  cokeKgT: number;
  hotMetalSiPct: number;
  hotMetalSPct: number;
  slagCaO: number;
  slagSiO2: number;
}): SteelPackageAnalysis {
  // RAFT empirical metallurgical formula (°C)
  const raft =
    1490 +
    0.82 * params.blastTempC +
    52 * params.o2EnrichmentPct -
    6.2 * params.blastMoistureG -
    1.18 * params.pciKgT;
  const totalFuel = params.cokeKgT + params.pciKgT * 0.85;
  const b2 = params.slagSiO2 > 0 ? params.slagCaO / params.slagSiO2 : 0;
  const desulfRatio = params.hotMetalSPct > 0 ? (b2 * 12.5) / params.hotMetalSPct : 0;

  const metrics: SteelMetricCard[] = [
    {
      label: 'Teorik Alev Sıcaklığı (RAFT)',
      value: raft.toFixed(0),
      unit: '°C',
      targetRange: '2050 – 2250 °C',
      status: raft >= 2050 && raft <= 2250 ? 'Nominal' : raft >= 1980 && raft <= 2320 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'Eşdeğer Toplam Yakıt Oranı',
      value: totalFuel.toFixed(1),
      unit: 'kg/thm',
      targetRange: '470 – 510 kg/thm',
      status: totalFuel <= 515 ? 'Nominal' : totalFuel <= 540 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'Cüruf Bazikliği (B2 = CaO/SiO₂)',
      value: b2.toFixed(2),
      unit: 'oran',
      targetRange: '1,12 – 1,24',
      status: b2 >= 1.12 && b2 <= 1.24 ? 'Nominal' : b2 >= 1.05 && b2 <= 1.3 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'Sıcak Metal [Si] & [S]',
      value: `${params.hotMetalSiPct.toFixed(2)} / ${params.hotMetalSPct.toFixed(3)}`,
      unit: '%',
      targetRange: 'Si: 0,40–0,60 | S ≤ 0,035',
      status: params.hotMetalSiPct <= 0.65 && params.hotMetalSPct <= 0.035 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Kükürt Dağılım İndeksi (Ls)',
      value: desulfRatio.toFixed(0),
      unit: 'indeks',
      targetRange: '≥ 350',
      status: desulfRatio >= 350 ? 'Nominal' : 'Uyarı',
    },
  ];

  const recommendations: string[] = [];
  if (raft < 2050) recommendations.push('RAFT düşük: Rüzgar sıcaklığını veya O₂ zenginleştirmesini artırın ya da PCI debisini kademeli azaltın.');
  if (raft > 2250) recommendations.push('RAFT yüksek: Tüyer önü gaz geçirgenliğini korumak için nem ilavesi veya PCI artırımı değerlendirin.');
  if (b2 < 1.12) recommendations.push('Cüruf bazikliği düşük: Sıcak metal kükürt tutma kapasitesini artırmak için kireçtaşı/dolomit şarjını yükseltin.');
  if (params.hotMetalSiPct > 0.65) recommendations.push('Aşırı [Si] indirgenmesi: Fırın termal seviyesi yüksek, kok/cevher oranını %1,5 oranında dengeleyin.');
  if (recommendations.length === 0) recommendations.push('Tüm yüksek fırın termal ve cüruf baziklik dengeleri hedef işletme penceresindedir.');

  return { packageTitle: 'Yüksek Fırın Proses ve Termal Denge Analizi', metrics, recommendations };
}

export function analyzeSinter(params: {
  tumblerIndex: number;
  feoPct: number;
  moisturePct: number;
  cokeBreezePct: number;
  basicityB2: number;
}): SteelPackageAnalysis {
  const rdiEst = Math.max(15, 42 - 1.45 * params.feoPct + 4.2 * (params.basicityB2 - 1.8));
  const metrics: SteelMetricCard[] = [
    {
      label: 'Tambur Dayanım İndeksi (TI)',
      value: params.tumblerIndex.toFixed(1),
      unit: '% (+6,3mm)',
      targetRange: '≥ 76,0 %',
      status: params.tumblerIndex >= 76 ? 'Nominal' : params.tumblerIndex >= 73 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'Tahmini RDI (İndirgenme Bozunma)',
      value: rdiEst.toFixed(1),
      unit: '% (-3,15mm)',
      targetRange: '≤ 28,0 %',
      status: rdiEst <= 28 ? 'Nominal' : rdiEst <= 32 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'Sinter FeO İçeriği',
      value: params.feoPct.toFixed(2),
      unit: '%',
      targetRange: '7,5 – 9,5 %',
      status: params.feoPct >= 7.5 && params.feoPct <= 9.5 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Karışım Nem / Kok Tozu Oranı',
      value: `${params.moisturePct.toFixed(1)} / ${params.cokeBreezePct.toFixed(2)}`,
      unit: '%',
      targetRange: 'Nem: 6,8–7,5 | Kok: 3,8–4,5',
      status: params.moisturePct >= 6.5 && params.moisturePct <= 7.8 ? 'Nominal' : 'Uyarı',
    },
  ];
  const recommendations: string[] = [];
  if (params.tumblerIndex < 76) recommendations.push('Tambur dayanımı hedef altında: Kok tozu dozajını +0,15% artırın ve yatak yüksekliğini kontrol edin.');
  if (rdiEst > 28) recommendations.push('RDI yükselme eğiliminde: FeO oranını %8,5 bandına çekmek için yakıt dağılımını optimize edin.');
  if (recommendations.length === 0) recommendations.push('Sinter dayanım (TI), FeO ve RDI dengesi yüksek fırın şarjı için optimum seviyededir.');
  return { packageTitle: 'Sinter Tesisi Dayanım ve Mineraloji Analizi', metrics, recommendations };
}

export function analyzeBof(params: {
  hotMetalC: number;
  endPointC: number;
  endPointTempC: number;
  o2ConsumedNm3T: number;
  limeKgT: number;
  yieldPct: number;
}): SteelPackageAnalysis {
  const cDelta = params.hotMetalC - params.endPointC;
  const stoichO2 = cDelta * 9.33 + 14.5;
  const o2Efficiency = stoichO2 > 0 ? Math.min(100, (stoichO2 / Math.max(1, params.o2ConsumedNm3T)) * 100) : 0;

  const metrics: SteelMetricCard[] = [
    {
      label: 'Son Nokta Karbon [C]',
      value: params.endPointC.toFixed(3),
      unit: '%',
      targetRange: '0,035 – 0,065 %',
      status: params.endPointC >= 0.03 && params.endPointC <= 0.07 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Döküm Sonu Sıcaklık',
      value: params.endPointTempC.toFixed(0),
      unit: '°C',
      targetRange: '1650 – 1685 °C',
      status: params.endPointTempC >= 1650 && params.endPointTempC <= 1685 ? 'Nominal' : 'Alarm',
    },
    {
      label: 'Oksijen Kullanım Verimi',
      value: o2Efficiency.toFixed(1),
      unit: '%',
      targetRange: '≥ 88,0 %',
      status: o2Efficiency >= 88 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Sıvı Çelik Metalik Verim',
      value: params.yieldPct.toFixed(1),
      unit: '%',
      targetRange: '≥ 90,5 %',
      status: params.yieldPct >= 90.5 ? 'Nominal' : 'Uyarı',
    },
  ];
  const recommendations: string[] = [];
  if (params.endPointTempC > 1685) recommendations.push('Aşırı üfleme sıcaklığı: Refrakter aşınmasını önlemek için soğutucu hurda/demir cevheri balansını artırın.');
  if (params.endPointC < 0.03) recommendations.push('Aşırı dekarbürizasyon (overblow): Cürufta FeO artışı ve metalik verim kaybını önlemek için sub-lance kesim noktasını öne çekin.');
  if (recommendations.length === 0) recommendations.push('BOF konvertör son nokta yakalama penceresi ve oksijen verimliliği hedeftedir.');
  return { packageTitle: 'BOF Konvertör Üfleme ve Son Nokta Analizi', metrics, recommendations };
}

export function analyzeContinuousCasting(params: {
  tundishTempC: number;
  liquidusTempC: number;
  castingSpeedMMin: number;
  moldDeltaTC: number;
  specificWaterLKg: number;
}): SteelPackageAnalysis {
  const superheat = params.tundishTempC - params.liquidusTempC;
  const breakoutRisk =
    (superheat > 35 ? 35 : 0) +
    (params.castingSpeedMMin > 1.65 ? 30 : 0) +
    (params.moldDeltaTC < 5.5 || params.moldDeltaTC > 10.5 ? 25 : 0);

  const metrics: SteelMetricCard[] = [
    {
      label: 'Tandiş Süperheat (ΔT)',
      value: superheat.toFixed(1),
      unit: '°C',
      targetRange: '15 – 30 °C',
      status: superheat >= 15 && superheat <= 30 ? 'Nominal' : superheat <= 38 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'Döküm Hızı',
      value: params.castingSpeedMMin.toFixed(2),
      unit: 'm/dk',
      targetRange: '1,10 – 1,55 m/dk',
      status: params.castingSpeedMMin <= 1.6 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Kalıp Soğutma Suyu ΔT',
      value: params.moldDeltaTC.toFixed(1),
      unit: '°C',
      targetRange: '6,0 – 9,5 °C',
      status: params.moldDeltaTC >= 6 && params.moldDeltaTC <= 9.5 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Breakout / Yüzey Çatlağı Risk İndeksi',
      value: `${breakoutRisk}`,
      unit: 'puan',
      targetRange: '≤ 25 puan',
      status: breakoutRisk <= 25 ? 'Nominal' : breakoutRisk <= 50 ? 'Uyarı' : 'Alarm',
    },
  ];
  const recommendations: string[] = [];
  if (superheat > 30) recommendations.push('Yüksek süperheat: Kabuk incelmesi ve merkez segregasyonu riskine karşı döküm hızını %8 düşürün.');
  if (superheat < 15) recommendations.push('Düşük süperheat: Nozul tıkanması (clogging) riski nedeniyle tandiş indüksiyon ısıtmasını kontrol edin.');
  if (recommendations.length === 0) recommendations.push('Sürekli döküm kalıp ısı transferi ve süperheat dengesi stabildir.');
  return { packageTitle: 'Sürekli Döküm (CCM) Kalıp ve Süperheat Analizi', metrics, recommendations };
}

export function analyzeRollingMill(params: {
  targetThicknessMm: number;
  actualThicknessMm: number;
  finishTempC: number;
  coilingTempC: number;
  tensileMPa: number;
}): SteelPackageAnalysis {
  const thickErr = params.actualThicknessMm - params.targetThicknessMm;
  const metrics: SteelMetricCard[] = [
    {
      label: 'Kalınlık Sapması',
      value: (thickErr >= 0 ? '+' : '') + thickErr.toFixed(3),
      unit: 'mm',
      targetRange: '±0,050 mm',
      status: Math.abs(thickErr) <= 0.05 ? 'Nominal' : Math.abs(thickErr) <= 0.09 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'Son Haddeleme Sıcaklığı (FRT)',
      value: params.finishTempC.toFixed(0),
      unit: '°C',
      targetRange: '850 – 895 °C',
      status: params.finishTempC >= 850 && params.finishTempC <= 895 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Sarma Sıcaklığı (CT)',
      value: params.coilingTempC.toFixed(0),
      unit: '°C',
      targetRange: '580 – 650 °C',
      status: params.coilingTempC >= 580 && params.coilingTempC <= 650 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'Çekme Dayanımı (Rm)',
      value: params.tensileMPa.toFixed(0),
      unit: 'MPa',
      targetRange: '≥ 410 MPa',
      status: params.tensileMPa >= 410 ? 'Nominal' : 'Alarm',
    },
  ];
  const recommendations: string[] = [];
  if (Math.abs(thickErr) > 0.05) recommendations.push('AGC (Otomatik Kalınlık Kontrolü) hidrolik kapsül kazancı yeniden kalibre edilmelidir.');
  if (params.finishTempC < 850) recommendations.push('FRT düşük: İki fazlı bölgede haddelemeyi önlemek için tav fırını çıkış sıcaklığını +15 °C artırın.');
  if (recommendations.length === 0) recommendations.push('Haddehane boyutsal toleransı ve termomekanik sıcaklık penceresi nominaldir.');
  return { packageTitle: 'Sıcak Haddehane Tolerans ve Mekanik Özellik Analizi', metrics, recommendations };
}

export function analyzeEnergyEfficiency(params: {
  totalEnergyGjT: number;
  bfgRecoveryPct: number;
  cogRecoveryPct: number;
  wasteHeatMw: number;
  co2IntensityTCs: number;
}): SteelPackageAnalysis {
  const metrics: SteelMetricCard[] = [
    {
      label: 'Spesifik Enerji Tüketimi (SEC)',
      value: params.totalEnergyGjT.toFixed(2),
      unit: 'GJ/tcs',
      targetRange: '≤ 18,50 GJ/tcs',
      status: params.totalEnergyGjT <= 18.5 ? 'Nominal' : params.totalEnergyGjT <= 20.5 ? 'Uyarı' : 'Alarm',
    },
    {
      label: 'BFG Gaz Geri Kazanım Oranı',
      value: params.bfgRecoveryPct.toFixed(1),
      unit: '%',
      targetRange: '≥ 94,0 %',
      status: params.bfgRecoveryPct >= 94 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'COG Gaz Geri Kazanım Oranı',
      value: params.cogRecoveryPct.toFixed(1),
      unit: '%',
      targetRange: '≥ 96,0 %',
      status: params.cogRecoveryPct >= 96 ? 'Nominal' : 'Uyarı',
    },
    {
      label: 'CO₂ Emisyon Yoğunluğu',
      value: params.co2IntensityTCs.toFixed(2),
      unit: 'tCO₂/tcs',
      targetRange: '≤ 1,85 tCO₂/tcs',
      status: params.co2IntensityTCs <= 1.85 ? 'Nominal' : 'Uyarı',
    },
  ];
  const recommendations: string[] = [];
  if (params.totalEnergyGjT > 18.5) recommendations.push('Spesifik enerji tüketimi hedefin üzerinde: CDQ (Kuru Kok Söndürme) ve TRT (Tepe Basıncı Türbini) verimini gözden geçirin.');
  if (params.bfgRecoveryPct < 94) recommendations.push('BFG gaz kaybı var: Gaz tutucu (gasholder) basınç kontrol vanalarını ve meşale (flare) kaçaklarını denetleyin.');
  if (recommendations.length === 0) recommendations.push('Entegre tesis enerji geri kazanım ve karbon yoğunluğu performans hedeflerini karşılamaktadır.');
  return { packageTitle: 'Entegre Tesis Enerji Verimliliği ve Karbon Analizi', metrics, recommendations };
}
