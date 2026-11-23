import React, { useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { AnalysisRecord, Dataset } from '../domain/types';
import { extractNumericColumn, groupNumericByCategory } from '../engines/descriptiveStats';
import {
  HypothesisTestResult,
  HypothesisTestType,
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
} from '../engines/hypothesisTests';

interface HypothesisViewProps {
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

const TEST_CATALOG: Array<{ id: HypothesisTestType; label: string; family: string }> = [
  { id: 'one_sample_t', label: 'One-Sample T Test', family: 'Parametrik' },
  { id: 'two_sample_t', label: 'Two-Sample T Test', family: 'Parametrik' },
  { id: 'paired_t', label: 'Paired T Test', family: 'Parametrik' },
  { id: 'z_test', label: 'Z Test', family: 'Parametrik' },
  { id: 'f_test', label: 'F Test (Varyans)', family: 'Parametrik' },
  { id: 'mann_whitney', label: 'Mann-Whitney U', family: 'Parametrik Olmayan' },
  { id: 'mood_median', label: 'Mood Median Test', family: 'Parametrik Olmayan' },
  { id: 'wilcoxon', label: 'Wilcoxon Signed-Rank', family: 'Parametrik Olmayan' },
  { id: 'kruskal_wallis', label: 'Kruskal-Wallis H', family: 'Parametrik Olmayan' },
  { id: 'friedman', label: 'Friedman Test', family: 'Parametrik Olmayan' },
  { id: 'sign_test', label: 'Sign Test', family: 'Parametrik Olmayan' },
  { id: 'chi_square', label: 'Chi-Square (Ki-Kare)', family: 'Kategorik' },
];

export const HypothesisView: React.FC<HypothesisViewProps> = ({ dataset, onRecordAnalysis }) => {
  const numCols = dataset.columns.filter((c) => c.type === 'numeric');
  const catCols = dataset.columns.filter((c) => c.type === 'categorical');

  const [testType, setTestType] = useState<HypothesisTestType>('one_sample_t');
  const [col1, setCol1] = useState<string>(numCols[0]?.name ?? '');
  const [col2, setCol2] = useState<string>(numCols[1]?.name ?? numCols[0]?.name ?? '');
  const [col3, setCol3] = useState<string>(numCols[2]?.name ?? numCols[0]?.name ?? '');
  const [cat1, setCat1] = useState<string>(catCols[0]?.name ?? '');
  const [cat2, setCat2] = useState<string>(catCols[1]?.name ?? catCols[0]?.name ?? '');
  const [targetVal, setTargetVal] = useState<string>('0.50');
  const [knownSigma, setKnownSigma] = useState<string>('0.05');
  const [alpha, setAlpha] = useState<number>(0.05);
  const [result, setResult] = useState<HypothesisTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeNum1 = numCols.some((c) => c.name === col1) ? col1 : (numCols[0]?.name ?? '');
  const activeNum2 = numCols.some((c) => c.name === col2) ? col2 : (numCols[1]?.name ?? numCols[0]?.name ?? '');
  const activeNum3 = numCols.some((c) => c.name === col3) ? col3 : (numCols[2]?.name ?? numCols[0]?.name ?? '');
  const activeCat1 = catCols.some((c) => c.name === cat1) ? cat1 : (catCols[0]?.name ?? '');
  const activeCat2 = catCols.some((c) => c.name === cat2) ? cat2 : (catCols[1]?.name ?? catCols[0]?.name ?? '');

  const executeTest = () => {
    setError(null);
    try {
      let res: HypothesisTestResult;
      const x1 = extractNumericColumn(dataset.rows, activeNum1).values;
      const x2 = extractNumericColumn(dataset.rows, activeNum2).values;
      const x3 = extractNumericColumn(dataset.rows, activeNum3).values;
      const mu0 = Number(targetVal) || 0;
      const sig = Number(knownSigma) || 1;

      switch (testType) {
        case 'one_sample_t':
          res = runOneSampleT(x1, mu0, alpha);
          break;
        case 'z_test':
          res = runOneSampleZ(x1, mu0, sig, alpha);
          break;
        case 'sign_test':
          res = runSignTest(x1, mu0, alpha);
          break;
        case 'two_sample_t':
        case 'f_test':
        case 'mann_whitney': {
          if (activeCat1) {
            const groups = groupNumericByCategory(dataset.rows, activeNum1, activeCat1);
            if (groups.length >= 2) {
              const g1 = extractNumericColumn(
                dataset.rows.filter((r) => String(r[activeCat1]) === groups[0].group),
                activeNum1
              ).values;
              const g2 = extractNumericColumn(
                dataset.rows.filter((r) => String(r[activeCat1]) === groups[1].group),
                activeNum1
              ).values;
              res =
                testType === 'two_sample_t'
                  ? runTwoSampleT(g1, g2, alpha)
                  : testType === 'f_test'
                    ? runFTest(g1, g2, alpha)
                    : runMannWhitney(g1, g2, alpha);
              break;
            }
          }
          res =
            testType === 'two_sample_t'
              ? runTwoSampleT(x1, x2, alpha)
              : testType === 'f_test'
                ? runFTest(x1, x2, alpha)
                : runMannWhitney(x1, x2, alpha);
          break;
        }
        case 'paired_t':
          res = runPairedT(x1, x2, alpha);
          break;
        case 'wilcoxon':
          res = runWilcoxon(x1, x2, alpha);
          break;
        case 'mood_median':
        case 'kruskal_wallis': {
          if (!activeCat1) throw new Error('Bu test için kategorik gruplama sütunu gerekir.');
          const cats = Array.from(new Set(dataset.rows.map((r) => String(r[activeCat1] ?? '')))).filter(Boolean);
          const groups = cats.map((name) => ({
            name,
            values: extractNumericColumn(
              dataset.rows.filter((r) => String(r[activeCat1]) === name),
              activeNum1
            ).values,
          })).filter((g) => g.values.length > 0);
          res = testType === 'mood_median' ? runMoodMedian(groups, alpha) : runKruskalWallis(groups, alpha);
          break;
        }
        case 'friedman':
          res = runFriedman([x1, x2, x3], [activeNum1, activeNum2, activeNum3], alpha);
          break;
        case 'chi_square':
          if (!activeCat1 || !activeCat2) throw new Error('Ki-Kare için iki kategorik sütun gerekir.');
          res = runChiSquareIndependence(dataset.rows, activeCat1, activeCat2, alpha);
          break;
      }

      setResult(res);
      onRecordAnalysis({
        id: `an_${Date.now()}`,
        title: res.testName,
        module: 'Hipotez Testleri',
        datasetName: dataset.name,
        createdAt: 'Az önce',
        keyMetricLabel: 'p-değeri',
        keyMetricValue: res.pValue.toFixed(4),
        interpretation: res.turkishConclusion,
        status: res.rejectNull ? 'Uyarı' : 'Nominal',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test hesaplanamadı.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Test Selector Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Hipotez Testleri (12 İstatistiksel Test)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Parametrik, parametrik olmayan ve kategorik doğrulama motoru</p>
          </div>
          <HelpTooltip guideKey="hypothesis" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TEST_CATALOG.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTestType(t.id)}
              className={`px-3 py-2 text-left rounded-md border text-xs transition-colors cursor-pointer ${
                testType === t.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 font-semibold'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="truncate">{t.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{t.family}</div>
            </button>
          ))}
        </div>

        {/* Dynamic Parameter Inputs */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-end gap-4">
          {testType !== 'chi_square' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">1. Sayısal Değişken</label>
              <select
                value={activeNum1}
                onChange={(e) => setCol1(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {(testType === 'paired_t' || testType === 'wilcoxon' || testType === 'friedman') && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">2. Sayısal Değişken</label>
              <select
                value={activeNum2}
                onChange={(e) => setCol2(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {testType === 'friedman' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">3. Sayısal Değişken</label>
              <select
                value={activeNum3}
                onChange={(e) => setCol3(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {(testType === 'two_sample_t' ||
            testType === 'f_test' ||
            testType === 'mann_whitney' ||
            testType === 'mood_median' ||
            testType === 'kruskal_wallis' ||
            testType === 'chi_square') && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Kategorik Grup (Faktör)</label>
              <select
                value={activeCat1}
                onChange={(e) => setCat1(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {catCols.length === 0 ? (
                  <option value="">Kategorik sütun yok (2 sayısal sütun kullanılır)</option>
                ) : (
                  catCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))
                )}
              </select>
            </div>
          )}

          {testType === 'chi_square' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">2. Kategorik Sütun</label>
              <select
                value={activeCat2}
                onChange={(e) => setCat2(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {catCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {(testType === 'one_sample_t' || testType === 'z_test' || testType === 'sign_test') && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Test Edilen Hedef (μ₀ / Medyan)</label>
              <input
                type="number"
                step="0.01"
                value={targetVal}
                onChange={(e) => setTargetVal(e.target.value)}
                className="w-32 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
          )}

          {testType === 'z_test' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bilinen Popülasyon σ</label>
              <input
                type="number"
                step="0.005"
                value={knownSigma}
                onChange={(e) => setKnownSigma(e.target.value)}
                className="w-32 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Anlamlılık (α)</label>
            <select
              value={alpha}
              onChange={(e) => setAlpha(Number(e.target.value))}
              className="px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            >
              <option value={0.01}>0,01 (%99 Güven)</option>
              <option value={0.05}>0,05 (%95 Güven)</option>
              <option value={0.1}>0,10 (%90 Güven)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={executeTest}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Testi Çalıştır
          </button>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>
        )}
      </div>

      {/* Results Panel */}
      {result && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">{result.testName}</h3>
              <div className="text-xs text-slate-500 mt-0.5">
                {result.nullHypothesis} · {result.altHypothesis}
              </div>
            </div>
            <div className={`text-sm font-semibold ${result.rejectNull ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {result.rejectNull ? 'H₀ Reddedilir (Anlamlı Fark Var)' : 'H₀ Reddedilemez (Anlamlı Fark Yok)'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
              <div className="text-xs text-slate-500">{result.statisticLabel}</div>
              <div className="text-lg font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {result.statisticValue.toFixed(4)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
              <div className="text-xs text-slate-500">p-Değeri</div>
              <div className={`text-lg font-mono font-semibold tabular-nums mt-0.5 ${result.pValue < result.alpha ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {result.pValue.toFixed(4)}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
              <div className="text-xs text-slate-500">Serbestlik Derecesi (df)</div>
              <div className="text-lg font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {result.dfLabel}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
              <div className="text-xs text-slate-500">%95 Güven Aralığı</div>
              <div className="text-sm font-mono font-semibold text-slate-900 dark:text-white tabular-nums mt-1">
                {result.ci95 ? `[${result.ci95[0].toFixed(3)}, ${result.ci95[1].toFixed(3)}]` : '—'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {result.details.map((d) => (
              <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">{d.label}</span>
                <span className="font-mono font-medium text-slate-900 dark:text-slate-100">{d.value}</span>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
            <strong>Mühendislik Yorumu: </strong>
            {result.turkishConclusion}
          </div>
        </div>
      )}
    </div>
  );
};
