import { fUpperP, invertMatrix, matMul, matVecMul, mean, stdDev, transpose } from './mathCore';

export type AnovaMethod = 'one_way' | 'two_way' | 'nested' | 'repeated' | 'glm';

export interface AnovaRow {
  source: string;
  df: number;
  ss: number;
  ms: number;
  f: number | null;
  p: number | null;
}

export interface GroupStat {
  name: string;
  n: number;
  mean: number;
  sd: number;
}

export interface TukeyPair {
  pair: string;
  diff: number;
  se: number;
  pApprox: number;
  significant: boolean;
}

export interface AnovaResult {
  methodName: string;
  responseName: string;
  rSquared: number;
  table: AnovaRow[];
  groupStats: GroupStat[];
  tukeyPairs?: TukeyPair[];
  turkishConclusion: string;
}

export function runOneWayAnova(
  rows: Record<string, unknown>[],
  responseCol: string,
  factorCol: string
): AnovaResult {
  const groups = new Map<string, number[]>();
  for (const r of rows) {
    const y = r[responseCol];
    const g = r[factorCol];
    if (typeof y === 'number' && Number.isFinite(y) && g !== null && g !== undefined) {
      const key = String(g);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(y);
    }
  }
  const entries = Array.from(groups.entries()).filter(([, vals]) => vals.length > 0);
  if (entries.length < 2) throw new Error('Tek yönlü ANOVA için en az 2 grup gereklidir.');
  const allVals = entries.flatMap(([, vals]) => vals);
  const N = allVals.length;
  const k = entries.length;
  if (N <= k) throw new Error('Gözlem sayısı grup sayısından büyük olmalıdır.');

  const grandMean = mean(allVals);
  const sst = allVals.reduce((a, v) => a + (v - grandMean) ** 2, 0);
  let ssb = 0;
  const groupStats: GroupStat[] = entries.map(([name, vals]) => {
    const gm = mean(vals);
    ssb += vals.length * (gm - grandMean) ** 2;
    return { name, n: vals.length, mean: gm, sd: stdDev(vals, true) };
  });
  const sse = Math.max(0, sst - ssb);
  const dfB = k - 1;
  const dfE = N - k;
  const msB = ssb / dfB;
  const msE = sse / dfE;
  const f = msE > 0 ? msB / msE : 0;
  const p = fUpperP(f, dfB, dfE);

  // Tukey-Kramer pairwise comparisons (Bonferroni-adjusted Studentized approx)
  const tukeyPairs: TukeyPair[] = [];
  const nPairs = (k * (k - 1)) / 2;
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const g1 = groupStats[i];
      const g2 = groupStats[j];
      const diff = g1.mean - g2.mean;
      const se = Math.sqrt(msE * 0.5 * (1 / g1.n + 1 / g2.n));
      const q = se > 0 ? Math.abs(diff) / se : 0;
      const pRaw = fUpperP((q * q) / 2, 1, dfE);
      const pApprox = Math.min(1, pRaw * Math.max(1, nPairs * 0.65));
      tukeyPairs.push({
        pair: `${g1.name} - ${g2.name}`,
        diff,
        se,
        pApprox,
        significant: pApprox < 0.05,
      });
    }
  }

  return {
    methodName: 'Tek Yönlü Varyans Analizi (One-Way ANOVA)',
    responseName: responseCol,
    rSquared: sst > 0 ? ssb / sst : 0,
    table: [
      { source: factorCol, df: dfB, ss: ssb, ms: msB, f, p },
      { source: 'Hata (Grup İçi)', df: dfE, ss: sse, ms: msE, f: null, p: null },
      { source: 'Toplam', df: N - 1, ss: sst, ms: sst / (N - 1), f: null, p: null },
    ],
    groupStats,
    tukeyPairs,
    turkishConclusion:
      p < 0.05
        ? `p = ${p.toFixed(4)} < 0,05: ${factorCol} faktörünün seviyeleri arasında ${responseCol} ortalaması açısından istatistiksel olarak anlamlı fark vardır.`
        : `p = ${p.toFixed(4)} ≥ 0,05: ${factorCol} grupları arasında anlamlı bir ortalama farkı bulunmamıştır.`,
  };
}

export function runTwoWayAnova(
  rows: Record<string, unknown>[],
  responseCol: string,
  factorA: string,
  factorB: string
): AnovaResult {
  const valid = rows.filter(
    (r) =>
      typeof r[responseCol] === 'number' &&
      Number.isFinite(r[responseCol] as number) &&
      r[factorA] != null &&
      r[factorB] != null
  );
  const aLevels = Array.from(new Set(valid.map((r) => String(r[factorA]))));
  const bLevels = Array.from(new Set(valid.map((r) => String(r[factorB]))));
  if (aLevels.length < 2 || bLevels.length < 2) {
    throw new Error('Two-Way ANOVA için her iki faktörde en az 2 seviye bulunmalıdır.');
  }
  const N = valid.length;
  const grandMean = mean(valid.map((r) => r[responseCol] as number));
  const sst = valid.reduce((a, r) => a + ((r[responseCol] as number) - grandMean) ** 2, 0);

  let ssa = 0;
  for (const a of aLevels) {
    const vals = valid.filter((r) => String(r[factorA]) === a).map((r) => r[responseCol] as number);
    ssa += vals.length * (mean(vals) - grandMean) ** 2;
  }
  let ssb = 0;
  for (const b of bLevels) {
    const vals = valid.filter((r) => String(r[factorB]) === b).map((r) => r[responseCol] as number);
    ssb += vals.length * (mean(vals) - grandMean) ** 2;
  }

  let ssCells = 0;
  const groupStats: GroupStat[] = [];
  for (const a of aLevels) {
    for (const b of bLevels) {
      const vals = valid
        .filter((r) => String(r[factorA]) === a && String(r[factorB]) === b)
        .map((r) => r[responseCol] as number);
      if (vals.length > 0) {
        const cm = mean(vals);
        ssCells += vals.length * (cm - grandMean) ** 2;
        groupStats.push({ name: `${a} × ${b}`, n: vals.length, mean: cm, sd: stdDev(vals, true) });
      }
    }
  }
  const ssab = Math.max(0, ssCells - ssa - ssb);
  const sse = Math.max(0, sst - ssCells);
  const dfA = aLevels.length - 1;
  const dfB = bLevels.length - 1;
  const dfAB = dfA * dfB;
  const dfE = Math.max(1, N - groupStats.length);
  const msA = ssa / dfA;
  const msB = ssb / dfB;
  const msAB = dfAB > 0 ? ssab / dfAB : 0;
  const msE = sse / dfE;

  const fA = msE > 0 ? msA / msE : 0;
  const fB = msE > 0 ? msB / msE : 0;
  const fAB = msE > 0 ? msAB / msE : 0;
  const pA = fUpperP(fA, dfA, dfE);
  const pB = fUpperP(fB, dfB, dfE);
  const pAB = dfAB > 0 ? fUpperP(fAB, dfAB, dfE) : 1;

  return {
    methodName: 'İki Yönlü ANOVA (Two-Way + Etkileşim)',
    responseName: responseCol,
    rSquared: sst > 0 ? ssCells / sst : 0,
    table: [
      { source: factorA, df: dfA, ss: ssa, ms: msA, f: fA, p: pA },
      { source: factorB, df: dfB, ss: ssb, ms: msB, f: fB, p: pB },
      { source: `${factorA} × ${factorB}`, df: dfAB, ss: ssab, ms: msAB, f: fAB, p: pAB },
      { source: 'Hata', df: dfE, ss: sse, ms: msE, f: null, p: null },
      { source: 'Toplam', df: N - 1, ss: sst, ms: sst / Math.max(1, N - 1), f: null, p: null },
    ],
    groupStats,
    turkishConclusion: `Ana etkiler: ${factorA} (p=${pA.toFixed(4)}), ${factorB} (p=${pB.toFixed(4)}). Etkileşim terimi (${factorA}×${factorB}) p=${pAB.toFixed(4)} ${
      pAB < 0.05 ? 'ile anlamlıdır; faktörler birbirinin etkisini değiştirmektedir.' : 'ile anlamsızdır; faktörler bağımsız etki göstermektedir.'
    }`,
  };
}

export function runNestedAnova(
  rows: Record<string, unknown>[],
  responseCol: string,
  parentFactor: string,
  nestedFactor: string
): AnovaResult {
  const valid = rows.filter(
    (r) => typeof r[responseCol] === 'number' && r[parentFactor] != null && r[nestedFactor] != null
  );
  const parents = Array.from(new Set(valid.map((r) => String(r[parentFactor]))));
  if (parents.length < 2) throw new Error('Nested ANOVA için üst faktörde en az 2 seviye gereklidir.');
  const N = valid.length;
  const grandMean = mean(valid.map((r) => r[responseCol] as number));
  const sst = valid.reduce((a, r) => a + ((r[responseCol] as number) - grandMean) ** 2, 0);

  let ssA = 0;
  let ssBwithinA = 0;
  let totalSubGroups = 0;
  const groupStats: GroupStat[] = [];

  for (const a of parents) {
    const aRows = valid.filter((r) => String(r[parentFactor]) === a);
    const aVals = aRows.map((r) => r[responseCol] as number);
    const aMean = mean(aVals);
    ssA += aVals.length * (aMean - grandMean) ** 2;
    const bLevels = Array.from(new Set(aRows.map((r) => String(r[nestedFactor]))));
    totalSubGroups += bLevels.length;
    for (const b of bLevels) {
      const bVals = aRows.filter((r) => String(r[nestedFactor]) === b).map((r) => r[responseCol] as number);
      const bMean = mean(bVals);
      ssBwithinA += bVals.length * (bMean - aMean) ** 2;
      groupStats.push({ name: `${a} → ${b}`, n: bVals.length, mean: bMean, sd: stdDev(bVals, true) });
    }
  }
  const sse = Math.max(0, sst - ssA - ssBwithinA);
  const dfA = parents.length - 1;
  const dfB = Math.max(1, totalSubGroups - parents.length);
  const dfE = Math.max(1, N - totalSubGroups);
  const msA = ssA / dfA;
  const msB = ssBwithinA / dfB;
  const msE = sse / dfE;
  const fA = msB > 0 ? msA / msB : 0;
  const fB = msE > 0 ? msB / msE : 0;
  const pA = fUpperP(fA, dfA, dfB);
  const pB = fUpperP(fB, dfB, dfE);

  return {
    methodName: 'Yuvalanmış (Nested) ANOVA',
    responseName: responseCol,
    rSquared: sst > 0 ? (ssA + ssBwithinA) / sst : 0,
    table: [
      { source: parentFactor, df: dfA, ss: ssA, ms: msA, f: fA, p: pA },
      { source: `${nestedFactor} (${parentFactor} içinde)`, df: dfB, ss: ssBwithinA, ms: msB, f: fB, p: pB },
      { source: 'Hata (Birim İçi)', df: dfE, ss: sse, ms: msE, f: null, p: null },
      { source: 'Toplam', df: N - 1, ss: sst, ms: sst / Math.max(1, N - 1), f: null, p: null },
    ],
    groupStats,
    turkishConclusion: `${parentFactor} p=${pA.toFixed(4)}, alt faktör ${nestedFactor}(${parentFactor}) p=${pB.toFixed(4)}. Yuvalanmış alt gruplardaki varyans bileşeni ayrıştırılmıştır.`,
  };
}

export function runRepeatedMeasuresAnova(
  columns: number[][],
  colNames: string[],
  responseLabel = 'Tekrarlı Ölçüm'
): AnovaResult {
  const k = columns.length;
  const n = Math.min(...columns.map((c) => c.length));
  if (k < 2 || n < 3) throw new Error('Repeated Measures ANOVA için en az 2 koşul ve 3 denek/parti gerekir.');

  const allVals: number[] = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) allVals.push(columns[j][i]);
  const grandMean = mean(allVals);
  const sst = allVals.reduce((a, v) => a + (v - grandMean) ** 2, 0);

  const condMeans = columns.map((c) => mean(c.slice(0, n)));
  const ssCond = n * condMeans.reduce((a, cm) => a + (cm - grandMean) ** 2, 0);

  let ssSubj = 0;
  for (let i = 0; i < n; i++) {
    const rowMean = mean(columns.map((c) => c[i]));
    ssSubj += k * (rowMean - grandMean) ** 2;
  }
  const sse = Math.max(0, sst - ssCond - ssSubj);
  const dfCond = k - 1;
  const dfSubj = n - 1;
  const dfE = dfCond * dfSubj;
  const msCond = ssCond / dfCond;
  const msSubj = ssSubj / dfSubj;
  const msE = sse / Math.max(1, dfE);
  const f = msE > 0 ? msCond / msE : 0;
  const p = fUpperP(f, dfCond, dfE);

  return {
    methodName: 'Tekrarlı Ölçümler ANOVA (Repeated Measures)',
    responseName: responseLabel,
    rSquared: sst > 0 ? (ssCond + ssSubj) / sst : 0,
    table: [
      { source: 'Zaman / Koşul (Grup İçi)', df: dfCond, ss: ssCond, ms: msCond, f, p },
      { source: 'Birimler / Bloklar Arası', df: dfSubj, ss: ssSubj, ms: msSubj, f: null, p: null },
      { source: 'Hata (Artık)', df: dfE, ss: sse, ms: msE, f: null, p: null },
      { source: 'Toplam', df: n * k - 1, ss: sst, ms: sst / (n * k - 1), f: null, p: null },
    ],
    groupStats: colNames.map((name, j) => ({
      name,
      n,
      mean: condMeans[j],
      sd: stdDev(columns[j].slice(0, n), true),
    })),
    turkishConclusion:
      p < 0.05
        ? `p = ${p.toFixed(4)} < 0,05: Tekrarlı ölçümler/koşullar arasında birim içi anlamlı bir değişim vardır.`
        : `p = ${p.toFixed(4)} ≥ 0,05: Tekrarlı ölçümler arasında istatistiksel fark saptanmamıştır.`,
  };
}

export function runGLM(
  rows: Record<string, unknown>[],
  responseCol: string,
  factorCol: string,
  covariateCol: string
): AnovaResult {
  const valid = rows.filter(
    (r) =>
      typeof r[responseCol] === 'number' &&
      typeof r[covariateCol] === 'number' &&
      r[factorCol] != null
  );
  const levels = Array.from(new Set(valid.map((r) => String(r[factorCol]))));
  if (levels.length < 2 || valid.length < levels.length + 4) {
    throw new Error('GLM için en az 2 faktör seviyesi ve yeterli kovaryat gözlemi gerekir.');
  }
  const y = valid.map((r) => r[responseCol] as number);
  const n = y.length;
  const grandMean = mean(y);
  const sst = y.reduce((a, v) => a + (v - grandMean) ** 2, 0);

  // Full design matrix: [1, cov, dummy_1..dummy_{k-1}]
  const X = valid.map((r) => {
    const dummies = levels.slice(1).map((lvl) => (String(r[factorCol]) === lvl ? 1 : 0));
    return [1, r[covariateCol] as number, ...dummies];
  });
  const Xt = transpose(X);
  const beta = matVecMul(invertMatrix(matMul(Xt, X)), matVecMul(Xt, y));
  const yPred = X.map((row) => row.reduce((a, v, j) => a + v * beta[j], 0));
  const sseFull = y.reduce((a, yi, i) => a + (yi - yPred[i]) ** 2, 0);
  const dfFull = X[0].length - 1;
  const dfE = n - X[0].length;
  const msE = sseFull / Math.max(1, dfE);

  // Type III SS for covariate (drop col 1)
  const XnoCov = X.map((row) => [row[0], ...row.slice(2)]);
  const bNoCov = matVecMul(invertMatrix(matMul(transpose(XnoCov), XnoCov)), matVecMul(transpose(XnoCov), y));
  const sseNoCov = y.reduce((a, yi, i) => a + (yi - XnoCov[i].reduce((s, v, j) => s + v * bNoCov[j], 0)) ** 2, 0);
  const ssCov = Math.max(0, sseNoCov - sseFull);

  // Type III SS for factor (drop dummy cols)
  const XnoFac = X.map((row) => [row[0], row[1]]);
  const bNoFac = matVecMul(invertMatrix(matMul(transpose(XnoFac), XnoFac)), matVecMul(transpose(XnoFac), y));
  const sseNoFac = y.reduce((a, yi, i) => a + (yi - XnoFac[i].reduce((s, v, j) => s + v * bNoFac[j], 0)) ** 2, 0);
  const ssFac = Math.max(0, sseNoFac - sseFull);

  const dfFac = levels.length - 1;
  const fCov = msE > 0 ? ssCov / msE : 0;
  const fFac = msE > 0 ? (ssFac / dfFac) / msE : 0;
  const pCov = fUpperP(fCov, 1, dfE);
  const pFac = fUpperP(fFac, dfFac, dfE);

  return {
    methodName: 'Genel Doğrusal Model (GLM — Faktör + Kovaryat)',
    responseName: responseCol,
    rSquared: sst > 0 ? Math.max(0, 1 - sseFull / sst) : 0,
    table: [
      { source: `${covariateCol} (Kovaryat)`, df: 1, ss: ssCov, ms: ssCov, f: fCov, p: pCov },
      { source: `${factorCol} (Faktör)`, df: dfFac, ss: ssFac, ms: ssFac / dfFac, f: fFac, p: pFac },
      { source: 'Hata (Artık)', df: dfE, ss: sseFull, ms: msE, f: null, p: null },
      { source: 'Toplam', df: n - 1, ss: sst, ms: sst / (n - 1), f: null, p: null },
    ],
    groupStats: levels.map((lvl) => {
      const vals = valid.filter((r) => String(r[factorCol]) === lvl).map((r) => r[responseCol] as number);
      return { name: lvl, n: vals.length, mean: mean(vals), sd: stdDev(vals, true) };
    }),
    turkishConclusion: `GLM (R² = %${(sst > 0 ? (1 - sseFull / sst) * 100 : 0).toFixed(1)}): ${covariateCol} kovaryatı kontrol edildiğinde ${factorCol} etkisi p=${pFac.toFixed(4)} (${
      pFac < 0.05 ? 'anlamlı' : 'anlamsız'
    }), kovaryat etkisi p=${pCov.toFixed(4)}.`,
  };
}
