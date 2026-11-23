import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDescriptiveStats } from '../src/engines/descriptiveStats.ts';
import {
  runChiSquareIndependence,
  runFTest,
  runFriedman,
  runKruskalWallis,
  runMannWhitney,
  runMoodMedian,
  runOneSampleT,
  runOneSampleZ,
  runPairedT,
  runSignTest,
  runTwoSampleT,
  runWilcoxon,
} from '../src/engines/hypothesisTests.ts';
import { runRegression } from '../src/engines/regressionEngine.ts';
import { runOneWayAnova, runTwoWayAnova } from '../src/engines/anovaEngine.ts';
import { computeCapability, computeSpcChart } from '../src/engines/spcCapabilityEngine.ts';
import { analyzeDoeRuns, generateDoeMatrix, runReliabilityAnalysis } from '../src/engines/doeReliabilityEngine.ts';
import { analyzeBlastFurnace, runAutoMLBenchmark, runHoltForecast, runKMeansClustering } from '../src/engines/sixSigmaMlSteelEngine.ts';

test('Descriptive stats engine computes exact moments and CI', () => {
  const res = computeDescriptiveStats([10, 12, 14, 16, 18]);
  assert.equal(res.mean, 14);
  assert.equal(res.median, 14);
  assert.ok(Math.abs(res.sd - Math.sqrt(10)) < 1e-6);
  assert.ok(res.ci95Low < 14 && res.ci95High > 14);
});

test('All 12 hypothesis tests execute with valid p-values', () => {
  const a = [10, 11, 12, 13, 14, 15];
  const b = [20, 21, 22, 23, 24, 25];
  const c = [15, 16, 17, 18, 19, 20];

  assert.ok(runOneSampleT(a, 12.5).pValue > 0.9);
  assert.ok(runTwoSampleT(a, b).pValue < 0.001);
  assert.ok(runPairedT(a, b).pValue < 0.001);
  assert.ok(runOneSampleZ(a, 12.5, 1.8).pValue > 0.9);
  assert.ok(runFTest(a, b).pValue > 0.9);
  assert.ok(runMannWhitney(a, b).pValue < 0.01);
  assert.ok(runMoodMedian([{ name: 'A', values: a }, { name: 'B', values: b }]).pValue < 0.01);
  assert.ok(runWilcoxon(a, b).pValue < 0.05);
  assert.ok(runKruskalWallis([{ name: 'A', values: a }, { name: 'B', values: b }]).pValue < 0.01);
  assert.ok(runFriedman([a, b, c], ['A', 'B', 'C']).pValue < 0.01);
  assert.ok(runSignTest(a, 12.5).pValue > 0.9);
  const rows = [
    { v: 'A', ok: 'Evet' }, { v: 'A', ok: 'Evet' }, { v: 'A', ok: 'Evet' },
    { v: 'B', ok: 'Hayır' }, { v: 'B', ok: 'Hayır' }, { v: 'B', ok: 'Hayır' },
  ];
  assert.ok(runChiSquareIndependence(rows, 'v', 'ok').pValue < 0.05);
});

test('Regression, ANOVA, SPC, Capability, DOE, Reliability, ML, Steel engines produce accurate outputs', () => {
  const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]];
  const y = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  const reg = runRegression('linear', X, y, ['X'], 'Y');
  assert.ok(reg.rSquared > 0.99);

  const anovaRows = [
    { g: 'A', y: 10 }, { g: 'A', y: 11 }, { g: 'A', y: 12 },
    { g: 'B', y: 20 }, { g: 'B', y: 21 }, { g: 'B', y: 22 },
  ];
  const anova = runOneWayAnova(anovaRows, 'y', 'g');
  assert.ok(anova.table[0].p !== null && anova.table[0].p < 0.001);

  const spc = computeSpcChart('i_mr', [0.5, 0.51, 0.49, 0.52, 0.50, 0.48, 0.51, 0.50]);
  assert.equal(spc.primaryPoints.length, 8);

  const cap = computeCapability([0.5, 0.51, 0.49, 0.52, 0.50, 0.48, 0.51, 0.50, 0.50, 0.49], 0.35, 0.65, 0.5, 5);
  assert.ok(cap.cp > 1.5 && cap.cpk > 1.5);

  const factors = [{ name: 'A', low: 10, high: 20 }, { name: 'B', low: 1, high: 2 }];
  const runs = generateDoeMatrix('full_factorial', factors);
  const doe = analyzeDoeRuns('full_factorial', factors, runs);
  assert.ok(doe.effects.length >= 2);

  const rel = runReliabilityAnalysis('weibull', [100, 200, 300, 400, 500]);
  assert.ok((rel.shapeBeta ?? 0) > 0 && rel.mttf > 0);

  const clust = runKMeansClustering([[1, 1], [1.1, 1.2], [5, 5], [5.2, 4.9], [9, 9], [9.1, 8.8]], ['x1', 'x2'], 3);
  assert.equal(clust.clusters.length, 3);

  const fc = runHoltForecast([10, 12, 14, 16, 18, 20], 3);
  assert.equal(fc.forecast.length, 3);

  const aml = runAutoMLBenchmark(X, y, 'regression');
  assert.ok(aml.length >= 3);

  const bf = analyzeBlastFurnace({
    blastTempC: 1180,
    blastMoistureG: 18,
    o2EnrichmentPct: 3.8,
    pciKgT: 162,
    cokeKgT: 335,
    hotMetalSiPct: 0.52,
    hotMetalSPct: 0.026,
    slagCaO: 41.2,
    slagSiO2: 35.1,
  });
  assert.equal(bf.metrics.length, 5);
});
