import { mean, normalCdf, normalInv, stdDev } from './mathCore';

export type SpcChartType = 'xbar_r' | 'xbar_s' | 'i_mr' | 'c' | 'u' | 'p' | 'np' | 'ewma' | 'cusum';

export interface SpcSeriesPoint {
  index: number;
  value: number;
  ucl: number;
  cl: number;
  lcl: number;
  violatedRules: string[];
}

export interface SpcResult {
  chartType: SpcChartType;
  title: string;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryPoints: SpcSeriesPoint[];
  secondaryPoints?: SpcSeriesPoint[];
  violationCount: number;
  inControl: boolean;
  turkishSummary: string;
}

export interface CapabilityResult {
  n: number;
  mean: number;
  sdWithin: number;
  sdOverall: number;
  lsl: number;
  usl: number;
  target: number;
  cp: number;
  cpk: number;
  pp: number;
  ppk: number;
  cpm: number;
  zBench: number;
  ppmWithin: number;
  ppmOverall: number;
  yieldPct: number;
  status: 'Yeterli (Cpk ≥ 1.33)' | 'Sınırda (1.00 ≤ Cpk < 1.33)' | 'Yetersiz (Cpk < 1.00)';
  values: number[];
  subgroupMeans: number[];
  subgroupRanges: number[];
  xbarUcl: number;
  xbarCl: number;
  xbarLcl: number;
  rUcl: number;
  rCl: number;
}

// ASTM / AIAG SPC constants for subgroup size n = 2..10
const A2: Record<number, number> = { 2: 1.88, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483, 7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308 };
const D3: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136, 9: 0.184, 10: 0.223 };
const D4: Record<number, number> = { 2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004, 7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777 };
const A3: Record<number, number> = { 2: 2.659, 3: 1.954, 4: 1.628, 5: 1.427, 6: 1.287, 7: 1.182, 8: 1.099, 9: 1.032, 10: 0.975 };
const B3: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0.03, 7: 0.118, 8: 0.185, 9: 0.239, 10: 0.284 };
const B4: Record<number, number> = { 2: 3.267, 3: 2.568, 4: 2.266, 5: 2.089, 6: 1.97, 7: 1.882, 8: 1.815, 9: 1.761, 10: 1.716 };
const C4: Record<number, number> = { 2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.94, 6: 0.9515, 7: 0.9594, 8: 0.965, 9: 0.9693, 10: 0.9727 };
const D2: Record<number, number> = { 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.97, 10: 3.078 };

function applyWesternElectricRules(points: SpcSeriesPoint[]): SpcSeriesPoint[] {
  const n = points.length;
  // Rule 1: Point beyond 3 sigma (UCL/LCL)
  for (let i = 0; i < n; i++) {
    const p = points[i];
    if (p.value > p.ucl || p.value < p.lcl) {
      p.violatedRules.push('Kural 1: 3σ kontrol sınırı dışı');
    }
  }
  // Rule 2: 7 consecutive points on same side of CL
  for (let i = 6; i < n; i++) {
    const slice = points.slice(i - 6, i + 1);
    if (slice.every((p) => p.value > p.cl) || slice.every((p) => p.value < p.cl)) {
      points[i].violatedRules.push('Kural 2: Merkez hattının aynı tarafında 7 nokta');
    }
  }
  // Rule 3: 6 consecutive points steadily increasing or decreasing
  for (let i = 5; i < n; i++) {
    const slice = points.slice(i - 5, i + 1).map((p) => p.value);
    let inc = true;
    let dec = true;
    for (let k = 1; k < slice.length; k++) {
      if (slice[k] <= slice[k - 1]) inc = false;
      if (slice[k] >= slice[k - 1]) dec = false;
    }
    if (inc || dec) {
      points[i].violatedRules.push('Kural 3: 6 ardışık noktada sürekli trend');
    }
  }
  return points;
}

export function computeSpcChart(
  chartType: SpcChartType,
  values: number[],
  options: { subgroupSize?: number; sampleSize?: number; ewmaLambda?: number; cusumK?: number; cusumH?: number } = {}
): SpcResult {
  if (values.length < 4) throw new Error('SPC grafiği için en az 4 gözlem gereklidir.');
  const m = Math.min(10, Math.max(2, options.subgroupSize ?? 5));

  if (chartType === 'xbar_r' || chartType === 'xbar_s') {
    const subgroups: number[][] = [];
    for (let i = 0; i + m <= values.length; i += m) {
      subgroups.push(values.slice(i, i + m));
    }
    if (subgroups.length < 2) throw new Error(`Alt grup boyutu (${m}) için en az ${m * 2} gözlem gereklidir.`);
    const means = subgroups.map((g) => mean(g));
    const xDoubleBar = mean(means);

    if (chartType === 'xbar_r') {
      const ranges = subgroups.map((g) => Math.max(...g) - Math.min(...g));
      const rBar = mean(ranges);
      const uclX = xDoubleBar + A2[m] * rBar;
      const lclX = xDoubleBar - A2[m] * rBar;
      const uclR = D4[m] * rBar;
      const lclR = D3[m] * rBar;
      const p1 = applyWesternElectricRules(
        means.map((v, i) => ({ index: i + 1, value: v, ucl: uclX, cl: xDoubleBar, lcl: lclX, violatedRules: [] }))
      );
      const p2 = applyWesternElectricRules(
        ranges.map((v, i) => ({ index: i + 1, value: v, ucl: uclR, cl: rBar, lcl: lclR, violatedRules: [] }))
      );
      const violations = p1.filter((p) => p.violatedRules.length > 0).length + p2.filter((p) => p.violatedRules.length > 0).length;
      return {
        chartType,
        title: `Xbar-R Kontrol Grafiği (n=${m})`,
        primaryLabel: 'Alt Grup Ortalaması (Xbar)',
        secondaryLabel: 'Alt Grup Aralığı (R)',
        primaryPoints: p1,
        secondaryPoints: p2,
        violationCount: violations,
        inControl: violations === 0,
        turkishSummary:
          violations === 0
            ? `Proses istatistiksel kontrol altındadır (X̄=${xDoubleBar.toFixed(4)}, R̄=${rBar.toFixed(4)}).`
            : `${violations} noktada kontrol sınırı/Western Electric kural ihlali tespit edildi. Özel neden araştırması gereklidir.`,
      };
    } else {
      const sds = subgroups.map((g) => stdDev(g, true));
      const sBar = mean(sds);
      const uclX = xDoubleBar + A3[m] * sBar;
      const lclX = xDoubleBar - A3[m] * sBar;
      const uclS = B4[m] * sBar;
      const lclS = B3[m] * sBar;
      const p1 = applyWesternElectricRules(
        means.map((v, i) => ({ index: i + 1, value: v, ucl: uclX, cl: xDoubleBar, lcl: lclX, violatedRules: [] }))
      );
      const p2 = applyWesternElectricRules(
        sds.map((v, i) => ({ index: i + 1, value: v, ucl: uclS, cl: sBar, lcl: lclS, violatedRules: [] }))
      );
      const violations = p1.filter((p) => p.violatedRules.length > 0).length + p2.filter((p) => p.violatedRules.length > 0).length;
      return {
        chartType,
        title: `Xbar-S Kontrol Grafiği (n=${m})`,
        primaryLabel: 'Alt Grup Ortalaması (Xbar)',
        secondaryLabel: 'Alt Grup Standart Sapması (S)',
        primaryPoints: p1,
        secondaryPoints: p2,
        violationCount: violations,
        inControl: violations === 0,
        turkishSummary:
          violations === 0
            ? `Xbar-S grafiğine göre proses kararlıdır (X̄=${xDoubleBar.toFixed(4)}, S̄=${sBar.toFixed(4)}).`
            : `Xbar-S grafiğinde ${violations} adet kural ihlali saptandı.`,
      };
    }
  }

  if (chartType === 'i_mr') {
    const mr = values.slice(1).map((v, i) => Math.abs(v - values[i]));
    const xBar = mean(values);
    const mrBar = mean(mr);
    const sigmaW = mrBar / 1.128;
    const uclI = xBar + 3 * sigmaW;
    const lclI = xBar - 3 * sigmaW;
    const uclMR = 3.267 * mrBar;
    const p1 = applyWesternElectricRules(
      values.map((v, i) => ({ index: i + 1, value: v, ucl: uclI, cl: xBar, lcl: lclI, violatedRules: [] }))
    );
    const p2 = applyWesternElectricRules(
      mr.map((v, i) => ({ index: i + 2, value: v, ucl: uclMR, cl: mrBar, lcl: 0, violatedRules: [] }))
    );
    const violations = p1.filter((p) => p.violatedRules.length > 0).length + p2.filter((p) => p.violatedRules.length > 0).length;
    return {
      chartType,
      title: 'I-MR Tekil Değer ve Hareketli Aralık Grafiği',
      primaryLabel: 'Tekil Değerler (I)',
      secondaryLabel: 'Hareketli Aralık (MR)',
      primaryPoints: p1,
      secondaryPoints: p2,
      violationCount: violations,
      inControl: violations === 0,
      turkishSummary:
        violations === 0
          ? `Tekil ölçümler kontrol altındadır (Ortalama=${xBar.toFixed(4)}, Tahmini σ_within=${sigmaW.toFixed(4)}).`
          : `I-MR grafiğinde ${violations} noktada özel neden sinyali görüldü.`,
    };
  }

  if (chartType === 'c' || chartType === 'u') {
    const counts = values.map((v) => Math.max(0, Math.round(v)));
    const unitN = Math.max(1, options.sampleSize ?? 1);
    if (chartType === 'c') {
      const cBar = mean(counts);
      const ucl = cBar + 3 * Math.sqrt(Math.max(0.01, cBar));
      const lcl = Math.max(0, cBar - 3 * Math.sqrt(Math.max(0.01, cBar)));
      const p1 = applyWesternElectricRules(
        counts.map((v, i) => ({ index: i + 1, value: v, ucl, cl: cBar, lcl, violatedRules: [] }))
      );
      const violations = p1.filter((p) => p.violatedRules.length > 0).length;
      return {
        chartType,
        title: 'C Kontrol Grafiği (Birim Kusur Sayısı)',
        primaryLabel: 'Kusur Sayısı (C)',
        primaryPoints: p1,
        violationCount: violations,
        inControl: violations === 0,
        turkishSummary: `Ortalama kusur sayısı C̄=${cBar.toFixed(2)}. ${violations === 0 ? 'Kontrol altında.' : `${violations} noktada sınır dışı kusur artışı var.`}`,
      };
    } else {
      const uVals = counts.map((c) => c / unitN);
      const uBar = mean(uVals);
      const ucl = uBar + 3 * Math.sqrt(Math.max(1e-5, uBar / unitN));
      const lcl = Math.max(0, uBar - 3 * Math.sqrt(Math.max(1e-5, uBar / unitN)));
      const p1 = applyWesternElectricRules(
        uVals.map((v, i) => ({ index: i + 1, value: v, ucl, cl: uBar, lcl, violatedRules: [] }))
      );
      const violations = p1.filter((p) => p.violatedRules.length > 0).length;
      return {
        chartType,
        title: `U Kontrol Grafiği (Birim Başına Kusur, n=${unitN})`,
        primaryLabel: 'Birim Başına Kusur (U)',
        primaryPoints: p1,
        violationCount: violations,
        inControl: violations === 0,
        turkishSummary: `Ortalama birim kusur oranı Ū=${uBar.toFixed(4)}. ${violations === 0 ? 'Kontrol altında.' : `${violations} adet ihlal tespit edildi.`}`,
      };
    }
  }

  if (chartType === 'p' || chartType === 'np') {
    const sampleN = Math.max(1, options.sampleSize ?? 50);
    // If values are <=1 treat as proportions, else treat as defective counts
    const isProp = values.every((v) => v >= 0 && v <= 1);
    const counts = isProp ? values.map((v) => Math.round(v * sampleN)) : values.map((v) => Math.min(sampleN, Math.max(0, Math.round(v))));
    const props = counts.map((c) => c / sampleN);
    const pBar = Math.min(0.999, Math.max(0.001, mean(props)));

    if (chartType === 'p') {
      const sdP = Math.sqrt((pBar * (1 - pBar)) / sampleN);
      const ucl = Math.min(1, pBar + 3 * sdP);
      const lcl = Math.max(0, pBar - 3 * sdP);
      const p1 = applyWesternElectricRules(
        props.map((v, i) => ({ index: i + 1, value: v, ucl, cl: pBar, lcl, violatedRules: [] }))
      );
      const violations = p1.filter((p) => p.violatedRules.length > 0).length;
      return {
        chartType,
        title: `P Kontrol Grafiği (Hatalı Oranı, n=${sampleN})`,
        primaryLabel: 'Hatalı Oranı (P)',
        primaryPoints: p1,
        violationCount: violations,
        inControl: violations === 0,
        turkishSummary: `Ortalama hatalı oranı P̄=%${(pBar * 100).toFixed(2)}. ${violations === 0 ? 'Proses oranı kararlı.' : `${violations} noktada sapma tespit edildi.`}`,
      };
    } else {
      const npBar = sampleN * pBar;
      const sdNP = Math.sqrt(sampleN * pBar * (1 - pBar));
      const ucl = npBar + 3 * sdNP;
      const lcl = Math.max(0, npBar - 3 * sdNP);
      const p1 = applyWesternElectricRules(
        counts.map((v, i) => ({ index: i + 1, value: v, ucl, cl: npBar, lcl, violatedRules: [] }))
      );
      const violations = p1.filter((p) => p.violatedRules.length > 0).length;
      return {
        chartType,
        title: `NP Kontrol Grafiği (Hatalı Adedi, n=${sampleN})`,
        primaryLabel: 'Hatalı Adedi (NP)',
        primaryPoints: p1,
        violationCount: violations,
        inControl: violations === 0,
        turkishSummary: `Ortalama hatalı ürün adedi nP̄=${npBar.toFixed(2)}. ${violations === 0 ? 'Kontrol altında.' : `${violations} noktada sınır ihlali var.`}`,
      };
    }
  }

  if (chartType === 'ewma') {
    const lambda = Math.min(0.9, Math.max(0.05, options.ewmaLambda ?? 0.2));
    const L = 3.0;
    const mu0 = mean(values);
    const mr = values.slice(1).map((v, i) => Math.abs(v - values[i]));
    const sigma = (mean(mr) / 1.128) || stdDev(values, true) || 1;
    let zPrev = mu0;
    const pts: SpcSeriesPoint[] = values.map((x, idx) => {
      const t = idx + 1;
      const zt = lambda * x + (1 - lambda) * zPrev;
      zPrev = zt;
      const factor = Math.sqrt((lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * t)));
      const ucl = mu0 + L * sigma * factor;
      const lcl = mu0 - L * sigma * factor;
      const violatedRules = zt > ucl || zt < lcl ? [`EWMA (λ=${lambda}) kayma sinyali`] : [];
      return { index: t, value: zt, ucl, cl: mu0, lcl, violatedRules };
    });
    const violations = pts.filter((p) => p.violatedRules.length > 0).length;
    return {
      chartType,
      title: `EWMA Kontrol Grafiği (λ=${lambda}, L=${L})`,
      primaryLabel: 'Üstel Ağırlıklı Ortalama (Z_t)',
      primaryPoints: pts,
      violationCount: violations,
      inControl: violations === 0,
      turkishSummary:
        violations === 0
          ? `EWMA grafiğinde küçük ortalama kayması saptanmadı (Merkez=${mu0.toFixed(4)}).`
          : `EWMA grafiği ${violations} noktada küçük/orta ölçekli proses kayması yakaladı.`,
    };
  }

  // CUSUM
  const mu0 = mean(values);
  const mr = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const sigma = (mean(mr) / 1.128) || stdDev(values, true) || 1;
  const k = (options.cusumK ?? 0.5) * sigma;
  const h = (options.cusumH ?? 5.0) * sigma;
  let cPlus = 0;
  let cMinus = 0;
  const posPts: SpcSeriesPoint[] = [];
  const negPts: SpcSeriesPoint[] = [];
  values.forEach((x, idx) => {
    cPlus = Math.max(0, cPlus + (x - (mu0 + k)));
    cMinus = Math.max(0, cMinus + ((mu0 - k) - x));
    posPts.push({
      index: idx + 1,
      value: cPlus,
      ucl: h,
      cl: 0,
      lcl: 0,
      violatedRules: cPlus > h ? ['Üst CUSUM (C⁺ > H) kayma sinyali'] : [],
    });
    negPts.push({
      index: idx + 1,
      value: -cMinus,
      ucl: 0,
      cl: 0,
      lcl: -h,
      violatedRules: cMinus > h ? ['Alt CUSUM (C⁻ > H) kayma sinyali'] : [],
    });
  });
  const violations =
    posPts.filter((p) => p.violatedRules.length > 0).length +
    negPts.filter((p) => p.violatedRules.length > 0).length;
  return {
    chartType: 'cusum',
    title: 'CUSUM Kümülatif Toplam Kontrol Grafiği',
    primaryLabel: 'Üst Kümülatif Toplam (C⁺)',
    secondaryLabel: 'Alt Kümülatif Toplam (-C⁻)',
    primaryPoints: posPts,
    secondaryPoints: negPts,
    violationCount: violations,
    inControl: violations === 0,
    turkishSummary:
      violations === 0
        ? `CUSUM grafiğinde karar eşiği (H=${h.toFixed(3)}) aşılmadı.`
        : `CUSUM grafiği ${violations} noktada birikimli ortalama kayması tespit etti.`,
  };
}

export function computeCapability(
  values: number[],
  lsl: number,
  usl: number,
  target?: number,
  subgroupSize = 5
): CapabilityResult {
  if (values.length < 5) throw new Error('Proses yeterliliği için en az 5 ölçüm gerekir.');
  if (usl <= lsl) throw new Error('USL değeri LSL değerinden büyük olmalıdır.');
  const tVal = target ?? 0.5 * (lsl + usl);
  const m = mean(values);
  const sdOverall = stdDev(values, true) || 1e-6;

  // Within SD from subgroups or moving range
  const sgSize = Math.min(10, Math.max(2, subgroupSize));
  const subgroups: number[][] = [];
  for (let i = 0; i + sgSize <= values.length; i += sgSize) {
    subgroups.push(values.slice(i, i + sgSize));
  }
  const subgroupMeans = subgroups.length >= 2 ? subgroups.map((g) => mean(g)) : values;
  const subgroupRanges =
    subgroups.length >= 2
      ? subgroups.map((g) => Math.max(...g) - Math.min(...g))
      : values.slice(1).map((v, i) => Math.abs(v - values[i]));

  const rBar = mean(subgroupRanges);
  const sdWithin = (subgroups.length >= 2 ? rBar / D2[sgSize] : rBar / 1.128) || sdOverall;

  const cp = (usl - lsl) / (6 * sdWithin);
  const cpu = (usl - m) / (3 * sdWithin);
  const cpl = (m - lsl) / (3 * sdWithin);
  const cpk = Math.min(cpu, cpl);

  const pp = (usl - lsl) / (6 * sdOverall);
  const ppu = (usl - m) / (3 * sdOverall);
  const ppl = (m - lsl) / (3 * sdOverall);
  const ppk = Math.min(ppu, ppl);

  const tau = Math.sqrt(sdOverall * sdOverall + (m - tVal) ** 2);
  const cpm = tau > 0 ? (usl - lsl) / (6 * tau) : 0;

  const pOutW = normalCdf(lsl, m, sdWithin) + (1 - normalCdf(usl, m, sdWithin));
  const pOutO = normalCdf(lsl, m, sdOverall) + (1 - normalCdf(usl, m, sdOverall));
  const ppmWithin = pOutW * 1_000_000;
  const ppmOverall = pOutO * 1_000_000;
  const yieldPct = (1 - pOutO) * 100;
  const zBench = normalInv(1 - Math.min(0.499999, Math.max(1e-9, pOutO))) + 1.5;

  const xDoubleBar = mean(subgroupMeans);
  const xbarUcl = subgroups.length >= 2 ? xDoubleBar + A2[sgSize] * rBar : xDoubleBar + 3 * sdWithin;
  const xbarLcl = subgroups.length >= 2 ? xDoubleBar - A2[sgSize] * rBar : xDoubleBar - 3 * sdWithin;
  const rUcl = subgroups.length >= 2 ? D4[sgSize] * rBar : 3.267 * rBar;

  const status: CapabilityResult['status'] =
    cpk >= 1.33 ? 'Yeterli (Cpk ≥ 1.33)' : cpk >= 1.0 ? 'Sınırda (1.00 ≤ Cpk < 1.33)' : 'Yetersiz (Cpk < 1.00)';

  return {
    n: values.length,
    mean: m,
    sdWithin,
    sdOverall,
    lsl,
    usl,
    target: tVal,
    cp,
    cpk,
    pp,
    ppk,
    cpm,
    zBench,
    ppmWithin,
    ppmOverall,
    yieldPct,
    status,
    values,
    subgroupMeans,
    subgroupRanges,
    xbarUcl,
    xbarCl: xDoubleBar,
    xbarLcl,
    rUcl,
    rCl: rBar,
  };
}
