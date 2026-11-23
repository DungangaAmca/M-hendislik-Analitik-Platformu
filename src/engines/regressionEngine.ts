import {
  fUpperP,
  invertMatrix,
  matMul,
  matVecMul,
  mean,
  stdDev,
  transpose,
  tTwoTailedP,
} from './mathCore';

export type RegressionMethod =
  | 'linear'
  | 'multiple'
  | 'polynomial'
  | 'logistic'
  | 'poisson'
  | 'ridge'
  | 'lasso'
  | 'elastic_net'
  | 'robust';

export interface CoefficientRow {
  term: string;
  coef: number;
  se: number;
  stat: number;
  pValue: number | null;
  vif?: number;
}

export interface RegressionResult {
  methodName: string;
  target: string;
  n: number;
  rSquared: number;
  adjRSquared: number;
  rmse: number;
  mae: number;
  fStat?: number;
  fPValue?: number;
  accuracy?: number;
  pseudoR2?: number;
  deviance?: number;
  coefficients: CoefficientRow[];
  equation: string;
  yActual: number[];
  yPred: number[];
  residuals: number[];
  xPlot?: number[];
  turkishInterpretation: string;
}

function buildDesignMatrix(X: number[][], addIntercept = true): number[][] {
  if (!addIntercept) return X.map((row) => [...row]);
  return X.map((row) => [1, ...row]);
}

function computeVifs(X: number[][]): number[] {
  const p = X[0]?.length ?? 0;
  if (p <= 1) return X[0] ? [1] : [];
  const vifs: number[] = [];
  for (let j = 0; j < p; j++) {
    const yj = X.map((r) => r[j]);
    const Xother = X.map((r) => [1, ...r.filter((_, idx) => idx !== j)]);
    try {
      const Xt = transpose(Xother);
      const beta = matVecMul(invertMatrix(matMul(Xt, Xother)), matVecMul(Xt, yj));
      const pred = Xother.map((row) => row.reduce((a, v, k) => a + v * beta[k], 0));
      const my = mean(yj);
      const sst = yj.reduce((a, v) => a + (v - my) ** 2, 0);
      const sse = yj.reduce((a, v, idx) => a + (v - pred[idx]) ** 2, 0);
      const r2 = sst > 0 ? Math.max(0, Math.min(0.999, 1 - sse / sst)) : 0;
      vifs.push(1 / (1 - r2));
    } catch {
      vifs.push(1);
    }
  }
  return vifs;
}

function fitOLS(Xraw: number[][], y: number[], termNames: string[], methodName: string, target: string): RegressionResult {
  const n = y.length;
  const p = termNames.length;
  if (n <= p + 1) throw new Error('Regresyon için gözlem sayısı parametre sayısından fazla olmalıdır.');

  const X = buildDesignMatrix(Xraw, true);
  const Xt = transpose(X);
  const XtXInv = invertMatrix(matMul(Xt, X));
  const beta = matVecMul(XtXInv, matVecMul(Xt, y));
  const yPred = X.map((row) => row.reduce((acc, v, j) => acc + v * beta[j], 0));
  const residuals = y.map((yi, i) => yi - yPred[i]);

  const my = mean(y);
  const sst = y.reduce((a, v) => a + (v - my) ** 2, 0);
  const sse = residuals.reduce((a, r) => a + r * r, 0);
  const ssr = Math.max(0, sst - sse);
  const dfModel = p;
  const dfErr = n - p - 1;
  const mse = sse / dfErr;
  const rmse = Math.sqrt(sse / n);
  const mae = mean(residuals.map((r) => Math.abs(r)));
  const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
  const adjR2 = sst > 0 ? 1 - ((1 - r2) * (n - 1)) / dfErr : 0;
  const fStat = mse > 0 && dfModel > 0 ? (ssr / dfModel) / mse : 0;
  const fP = dfModel > 0 ? fUpperP(fStat, dfModel, dfErr) : 1;
  const vifs = computeVifs(Xraw);

  const allTerms = ['Sabit (Intercept)', ...termNames];
  const coefficients: CoefficientRow[] = allTerms.map((term, j) => {
    const se = Math.sqrt(Math.max(0, mse * XtXInv[j][j]));
    const t = se > 0 ? beta[j] / se : 0;
    const pv = tTwoTailedP(t, dfErr);
    return {
      term,
      coef: beta[j],
      se,
      stat: t,
      pValue: pv,
      vif: j === 0 ? undefined : vifs[j - 1],
    };
  });

  const eqParts = coefficients.map((c, idx) =>
    idx === 0
      ? c.coef.toFixed(4)
      : `${c.coef >= 0 ? '+' : '-'} ${Math.abs(c.coef).toFixed(4)}·${c.term}`
  );

  const sigVars = coefficients
    .slice(1)
    .filter((c) => (c.pValue ?? 1) < 0.05)
    .map((c) => c.term);

  return {
    methodName,
    target,
    n,
    rSquared: r2,
    adjRSquared: adjR2,
    rmse,
    mae,
    fStat,
    fPValue: fP,
    coefficients,
    equation: `${target} = ${eqParts.join(' ')}`,
    yActual: y,
    yPred,
    residuals,
    xPlot: Xraw.length > 0 && Xraw[0].length === 1 ? Xraw.map((r) => r[0]) : undefined,
    turkishInterpretation:
      `Model hedef değişken (${target}) varyansının %${(r2 * 100).toFixed(1)}’ini açıklamaktadır (Düz. R² = %${(adjR2 * 100).toFixed(1)}, F = ${fStat.toFixed(2)}, p = ${fP.toFixed(4)}). ` +
      (sigVars.length > 0
        ? `İstatistiksel olarak anlamlı (p < 0,05) açıklayıcılar: ${sigVars.join(', ')}.`
        : 'Hiçbir açıklayıcı değişken p < 0,05 düzeyinde tek başına anlamlı bulunmamıştır.'),
  };
}

export function runRegression(
  method: RegressionMethod,
  Xraw: number[][],
  y: number[],
  predictors: string[],
  target: string,
  options: { degree?: number; lambda?: number; l1Ratio?: number } = {}
): RegressionResult {
  const n = y.length;
  if (n < 5 || Xraw.length !== n) {
    throw new Error('Regresyon analizi için en az 5 eksiksiz gözlem gereklidir.');
  }

  if (method === 'linear') {
    const x1 = Xraw.map((r) => [r[0]]);
    return fitOLS(x1, y, [predictors[0]], 'Basit Doğrusal Regresyon (Linear)', target);
  }

  if (method === 'multiple') {
    return fitOLS(Xraw, y, predictors, 'Çoklu Doğrusal Regresyon (Multiple OLS)', target);
  }

  if (method === 'polynomial') {
    const deg = Math.min(4, Math.max(2, options.degree ?? 2));
    const baseName = predictors[0];
    const polyX = Xraw.map((r) => {
      const val = r[0];
      return Array.from({ length: deg }, (_, d) => Math.pow(val, d + 1));
    });
    const names = Array.from({ length: deg }, (_, d) => (d === 0 ? baseName : `${baseName}^${d + 1}`));
    const res = fitOLS(polyX, y, names, `Polinom Regresyon (Derece ${deg})`, target);
    res.xPlot = Xraw.map((r) => r[0]);
    return res;
  }

  if (method === 'logistic') {
    // Convert y to binary 0/1 (if not already 0/1, split by median)
    const uniqueVals = Array.from(new Set(y));
    const isBinary = uniqueVals.every((v) => v === 0 || v === 1);
    const med = [...y].sort((a, b) => a - b)[Math.floor(y.length / 2)];
    const yBin = isBinary ? y : y.map((v) => (v >= med ? 1 : 0));

    const X = buildDesignMatrix(Xraw, true);
    const p = X[0].length;
    let beta = new Array(p).fill(0);
    // Newton-Raphson IRLS with mild ridge guard
    for (let iter = 0; iter < 25; iter++) {
      const probs = X.map((row) => {
        const z = Math.max(-20, Math.min(20, row.reduce((a, v, j) => a + v * beta[j], 0)));
        return 1 / (1 + Math.exp(-z));
      });
      const grad = new Array(p).fill(0);
      const H: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      for (let i = 0; i < n; i++) {
        const err = probs[i] - yBin[i];
        const w = Math.max(1e-6, probs[i] * (1 - probs[i]));
        for (let j = 0; j < p; j++) {
          grad[j] += err * X[i][j];
          for (let k = 0; k < p; k++) {
            H[j][k] += w * X[i][j] * X[i][k];
          }
        }
      }
      for (let j = 0; j < p; j++) H[j][j] += 1e-4;
      const Hinv = invertMatrix(H);
      const step = matVecMul(Hinv, grad);
      let maxDiff = 0;
      for (let j = 0; j < p; j++) {
        beta[j] -= step[j];
        maxDiff = Math.max(maxDiff, Math.abs(step[j]));
      }
      if (maxDiff < 1e-6) break;
    }

    const yProb = X.map((row) => {
      const z = Math.max(-20, Math.min(20, row.reduce((a, v, j) => a + v * beta[j], 0)));
      return 1 / (1 + Math.exp(-z));
    });
    const preds = yProb.map((pr) => (pr >= 0.5 ? 1 : 0));
    const acc = preds.filter((pr, i) => pr === yBin[i]).length / n;
    const pBase = Math.max(1e-6, Math.min(1 - 1e-6, mean(yBin)));
    const llNull = yBin.reduce((a, yi) => a + yi * Math.log(pBase) + (1 - yi) * Math.log(1 - pBase), 0);
    const llModel = yBin.reduce((a, yi, i) => {
      const pr = Math.max(1e-6, Math.min(1 - 1e-6, yProb[i]));
      return a + yi * Math.log(pr) + (1 - yi) * Math.log(1 - pr);
    }, 0);
    const pseudoR2 = llNull !== 0 ? Math.max(0, 1 - llModel / llNull) : 0;

    // Fisher info SE
    const Hfin: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const w = Math.max(1e-6, yProb[i] * (1 - yProb[i]));
      for (let j = 0; j < p; j++) {
        for (let k = 0; k < p; k++) Hfin[j][k] += w * X[i][j] * X[i][k];
      }
    }
    for (let j = 0; j < p; j++) Hfin[j][j] += 1e-5;
    const cov = invertMatrix(Hfin);

    const terms = ['Sabit (Intercept)', ...predictors];
    const coefficients: CoefficientRow[] = terms.map((term, j) => {
      const se = Math.sqrt(Math.max(0, cov[j][j]));
      const z = se > 0 ? beta[j] / se : 0;
      const pv = tTwoTailedP(z, 1000);
      return { term, coef: beta[j], se, stat: z, pValue: pv };
    });
    const residuals = yBin.map((yi, i) => yi - yProb[i]);

    return {
      methodName: 'Lojistik Regresyon (Binary Logistic)',
      target,
      n,
      rSquared: pseudoR2,
      adjRSquared: pseudoR2,
      rmse: Math.sqrt(mean(residuals.map((r) => r * r))),
      mae: mean(residuals.map((r) => Math.abs(r))),
      accuracy: acc,
      pseudoR2,
      deviance: -2 * llModel,
      coefficients,
      equation: `logit(P(${target}=1)) = ${coefficients
        .map((c, i) => (i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? '+' : '-'} ${Math.abs(c.coef).toFixed(3)}·${c.term}`))
        .join(' ')}`,
      yActual: yBin,
      yPred: yProb,
      residuals,
      turkishInterpretation: `Sınıflandırma doğruluğu %${(acc * 100).toFixed(1)}, McFadden Pseudo-R² = %${(pseudoR2 * 100).toFixed(1)}. ${
        isBinary ? '' : `Not: Sürekli hedef değer medyan (${med.toFixed(3)}) üzerinden 0/1 sınıfına dönüştürülmüştür.`
      }`,
    };
  }

  if (method === 'poisson') {
    const yCount = y.map((v) => Math.max(0, Math.round(v)));
    const X = buildDesignMatrix(Xraw, true);
    const p = X[0].length;
    let beta = new Array(p).fill(0);
    beta[0] = Math.log(Math.max(0.1, mean(yCount)));
    for (let iter = 0; iter < 25; iter++) {
      const mus = X.map((row) => Math.exp(Math.max(-10, Math.min(10, row.reduce((a, v, j) => a + v * beta[j], 0)))));
      const grad = new Array(p).fill(0);
      const H: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      for (let i = 0; i < n; i++) {
        const err = mus[i] - yCount[i];
        const w = Math.max(1e-6, mus[i]);
        for (let j = 0; j < p; j++) {
          grad[j] += err * X[i][j];
          for (let k = 0; k < p; k++) H[j][k] += w * X[i][j] * X[i][k];
        }
      }
      for (let j = 0; j < p; j++) H[j][j] += 1e-4;
      const step = matVecMul(invertMatrix(H), grad);
      let maxDiff = 0;
      for (let j = 0; j < p; j++) {
        beta[j] -= step[j];
        maxDiff = Math.max(maxDiff, Math.abs(step[j]));
      }
      if (maxDiff < 1e-6) break;
    }
    const yPred = X.map((row) => Math.exp(Math.max(-10, Math.min(10, row.reduce((a, v, j) => a + v * beta[j], 0)))));
    const residuals = yCount.map((yi, i) => yi - yPred[i]);
    const my = mean(yCount);
    const sst = yCount.reduce((a, v) => a + (v - my) ** 2, 0);
    const sse = residuals.reduce((a, r) => a + r * r, 0);
    const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
    const Hfin: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      const w = Math.max(1e-6, yPred[i]);
      for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) Hfin[j][k] += w * X[i][j] * X[i][k];
    }
    for (let j = 0; j < p; j++) Hfin[j][j] += 1e-5;
    const cov = invertMatrix(Hfin);
    const coefficients: CoefficientRow[] = ['Sabit (Intercept)', ...predictors].map((term, j) => {
      const se = Math.sqrt(Math.max(0, cov[j][j]));
      const z = se > 0 ? beta[j] / se : 0;
      return { term, coef: beta[j], se, stat: z, pValue: tTwoTailedP(z, 1000) };
    });
    return {
      methodName: 'Poisson Sayım Regresyonu (Log-Link)',
      target,
      n,
      rSquared: r2,
      adjRSquared: r2,
      rmse: Math.sqrt(sse / n),
      mae: mean(residuals.map((r) => Math.abs(r))),
      coefficients,
      equation: `ln(E[${target}]) = ${coefficients
        .map((c, i) => (i === 0 ? c.coef.toFixed(3) : `${c.coef >= 0 ? '+' : '-'} ${Math.abs(c.coef).toFixed(3)}·${c.term}`))
        .join(' ')}`,
      yActual: yCount,
      yPred,
      residuals,
      turkishInterpretation: `Sayım (hata/olay adedi) verisi için log-bağlantılı Poisson modeli kuruldu (Açıklanan varyans ≈ %${(r2 * 100).toFixed(1)}). Pozitif katsayılar olay oranını eksponansiyel artırır.`,
    };
  }

  if (method === 'robust') {
    // Huber IRLS
    const X = buildDesignMatrix(Xraw, true);
    const p = X[0].length;
    const Xt = transpose(X);
    let beta = matVecMul(invertMatrix(matMul(Xt, X)), matVecMul(Xt, y));
    for (let iter = 0; iter < 20; iter++) {
      const res = y.map((yi, i) => yi - X[i].reduce((a, v, j) => a + v * beta[j], 0));
      const absRes = [...res.map((r) => Math.abs(r))].sort((a, b) => a - b);
      const scale = (absRes[Math.floor(absRes.length / 2)] || 1e-4) / 0.6745;
      const c = 1.345 * Math.max(scale, 1e-6);
      const weights = res.map((r) => (Math.abs(r) <= c ? 1 : c / Math.abs(r)));
      const XtWX: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
      const XtWy = new Array(p).fill(0);
      for (let i = 0; i < n; i++) {
        const w = weights[i];
        for (let j = 0; j < p; j++) {
          XtWy[j] += w * X[i][j] * y[i];
          for (let k = 0; k < p; k++) XtWX[j][k] += w * X[i][j] * X[i][k];
        }
      }
      beta = matVecMul(invertMatrix(XtWX), XtWy);
    }
    const yPred = X.map((row) => row.reduce((a, v, j) => a + v * beta[j], 0));
    const residuals = y.map((yi, i) => yi - yPred[i]);
    const my = mean(y);
    const sst = y.reduce((a, v) => a + (v - my) ** 2, 0);
    const sse = residuals.reduce((a, r) => a + r * r, 0);
    const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;
    const mse = sse / Math.max(1, n - p);
    const cov = invertMatrix(matMul(Xt, X));
    const coefficients: CoefficientRow[] = ['Sabit (Intercept)', ...predictors].map((term, j) => {
      const se = Math.sqrt(Math.max(0, mse * cov[j][j]));
      const t = se > 0 ? beta[j] / se : 0;
      return { term, coef: beta[j], se, stat: t, pValue: tTwoTailedP(t, Math.max(1, n - p)) };
    });
    return {
      methodName: 'Gürbüz Regresyon (Huber IRLS)',
      target,
      n,
      rSquared: r2,
      adjRSquared: 1 - ((1 - r2) * (n - 1)) / Math.max(1, n - p),
      rmse: Math.sqrt(sse / n),
      mae: mean(residuals.map((r) => Math.abs(r))),
      coefficients,
      equation: `${target} = ${coefficients
        .map((c, i) => (i === 0 ? c.coef.toFixed(4) : `${c.coef >= 0 ? '+' : '-'} ${Math.abs(c.coef).toFixed(4)}·${c.term}`))
        .join(' ')}`,
      yActual: y,
      yPred,
      residuals,
      turkishInterpretation: `Huber ağırlıklandırması sayesinde aşırı aykırı gözlemlerin regresyon eğimi üzerindeki bozucu etkisi bastırılmıştır (R² = %${(r2 * 100).toFixed(1)}).`,
    };
  }

  // Ridge, Lasso, Elastic Net (standardized predictors + unstandardized back-transform)
  const lambda = options.lambda ?? 1.0;
  const l1Ratio = method === 'ridge' ? 0 : method === 'lasso' ? 1 : (options.l1Ratio ?? 0.5);
  const p = Xraw[0].length;
  const xMeans = Array.from({ length: p }, (_, j) => mean(Xraw.map((r) => r[j])));
  const xSds = Array.from({ length: p }, (_, j) => stdDev(Xraw.map((r) => r[j]), false) || 1);
  const yMean = mean(y);
  const Xs = Xraw.map((r) => r.map((v, j) => (v - xMeans[j]) / xSds[j]));
  const yc = y.map((v) => v - yMean);

  let w = new Array(p).fill(0);
  if (method === 'ridge') {
    const Xt = transpose(Xs);
    const XtX = matMul(Xt, Xs);
    for (let j = 0; j < p; j++) XtX[j][j] += lambda;
    w = matVecMul(invertMatrix(XtX), matVecMul(Xt, yc));
  } else {
    // Coordinate Descent for Lasso / Elastic Net
    const alphaL1 = lambda * l1Ratio;
    const alphaL2 = lambda * (1 - l1Ratio);
    for (let iter = 0; iter < 200; iter++) {
      for (let j = 0; j < p; j++) {
        let rho = 0;
        let zj = 0;
        for (let i = 0; i < n; i++) {
          let predWithoutJ = 0;
          for (let k = 0; k < p; k++) if (k !== j) predWithoutJ += Xs[i][k] * w[k];
          rho += Xs[i][j] * (yc[i] - predWithoutJ);
          zj += Xs[i][j] * Xs[i][j];
        }
        const soft = rho > alphaL1 ? rho - alphaL1 : rho < -alphaL1 ? rho + alphaL1 : 0;
        w[j] = soft / (zj + alphaL2 + 1e-8);
      }
    }
  }

  const origCoefs = w.map((wj, j) => wj / xSds[j]);
  const intercept = yMean - origCoefs.reduce((a, cj, j) => a + cj * xMeans[j], 0);
  const yPred = Xraw.map((r) => intercept + r.reduce((a, v, j) => a + v * origCoefs[j], 0));
  const residuals = y.map((yi, i) => yi - yPred[i]);
  const sst = y.reduce((a, v) => a + (v - yMean) ** 2, 0);
  const sse = residuals.reduce((a, r) => a + r * r, 0);
  const r2 = sst > 0 ? Math.max(0, 1 - sse / sst) : 0;

  const coefficients: CoefficientRow[] = [
    { term: 'Sabit (Intercept)', coef: intercept, se: 0, stat: 0, pValue: null },
    ...predictors.map((term, j) => ({
      term,
      coef: origCoefs[j],
      se: 0,
      stat: w[j],
      pValue: null,
    })),
  ];

  const label =
    method === 'ridge'
      ? `Ridge Regresyon (L2, λ=${lambda})`
      : method === 'lasso'
        ? `Lasso Regresyon (L1, λ=${lambda})`
        : `Elastic Net Regresyon (λ=${lambda}, L1=${l1Ratio})`;

  return {
    methodName: label,
    target,
    n,
    rSquared: r2,
    adjRSquared: 1 - ((1 - r2) * (n - 1)) / Math.max(1, n - p - 1),
    rmse: Math.sqrt(sse / n),
    mae: mean(residuals.map((r) => Math.abs(r))),
    coefficients,
    equation: `${target} = ${coefficients
      .map((c, i) => (i === 0 ? c.coef.toFixed(4) : `${c.coef >= 0 ? '+' : '-'} ${Math.abs(c.coef).toFixed(4)}·${c.term}`))
      .join(' ')}`,
    yActual: y,
    yPred,
    residuals,
    turkishInterpretation: `${label} ile çoklu doğrusal bağlantı ve aşırı öğrenme cezalandırıldı (R² = %${(r2 * 100).toFixed(1)}, RMSE = ${Math.sqrt(sse / n).toFixed(4)}). Sıfıra indirgenen katsayılar modelden elenen değişkenleri gösterir.`,
  };
}
