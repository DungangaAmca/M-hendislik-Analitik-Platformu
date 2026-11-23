import React, { useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { ScatterRegressionChart } from '../components/Charts';
import { AnalysisRecord, Dataset } from '../domain/types';
import { RegressionMethod, RegressionResult, runRegression } from '../engines/regressionEngine';

interface RegressionViewProps {
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

const REG_METHODS: Array<{ id: RegressionMethod; label: string }> = [
  { id: 'linear', label: 'Linear Regression' },
  { id: 'multiple', label: 'Multiple Regression' },
  { id: 'polynomial', label: 'Polynomial Regression' },
  { id: 'logistic', label: 'Logistic Regression' },
  { id: 'poisson', label: 'Poisson Regression' },
  { id: 'ridge', label: 'Ridge (L2)' },
  { id: 'lasso', label: 'Lasso (L1)' },
  { id: 'elastic_net', label: 'Elastic Net' },
  { id: 'robust', label: 'Robust (Huber)' },
];

export const RegressionView: React.FC<RegressionViewProps> = ({ dataset, onRecordAnalysis }) => {
  const numCols = dataset.columns.filter((c) => c.type === 'numeric');
  const [method, setMethod] = useState<RegressionMethod>('multiple');
  const [target, setTarget] = useState<string>(numCols[Math.min(4, numCols.length - 1)]?.name ?? numCols[0]?.name ?? '');
  const [predictors, setPredictors] = useState<string[]>(
    numCols.slice(0, 3).map((c) => c.name).filter((n) => n !== target)
  );
  const [degree, setDegree] = useState<number>(2);
  const [lambda, setLambda] = useState<number>(1.0);
  const [l1Ratio, setL1Ratio] = useState<number>(0.5);
  const [result, setResult] = useState<RegressionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTarget = numCols.some((c) => c.name === target) ? target : (numCols[0]?.name ?? '');
  const availablePreds = numCols.filter((c) => c.name !== activeTarget);
  const activePreds = predictors.filter((p) => availablePreds.some((c) => c.name === p));
  const effectivePreds = activePreds.length > 0 ? activePreds : availablePreds.slice(0, 2).map((c) => c.name);

  const togglePredictor = (name: string) => {
    setPredictors((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  };

  const handleRun = () => {
    setError(null);
    try {
      if (!activeTarget || effectivePreds.length === 0) {
        throw new Error('Hedef (Y) ve en az 1 açıklayıcı (X) sayısal değişken seçiniz.');
      }
      const predsToUse = method === 'linear' || method === 'polynomial' ? [effectivePreds[0]] : effectivePreds;
      const validRows = dataset.rows.filter(
        (r) =>
          typeof r[activeTarget] === 'number' &&
          predsToUse.every((p) => typeof r[p] === 'number' && Number.isFinite(r[p] as number))
      );
      const y = validRows.map((r) => r[activeTarget] as number);
      const X = validRows.map((r) => predsToUse.map((p) => r[p] as number));

      const res = runRegression(method, X, y, predsToUse, activeTarget, { degree, lambda, l1Ratio });
      setResult(res);
      onRecordAnalysis({
        id: `an_${Date.now()}`,
        title: `${activeTarget} — ${res.methodName}`,
        module: 'Regresyon Modülü',
        datasetName: dataset.name,
        createdAt: 'Az önce',
        keyMetricLabel: res.accuracy !== undefined ? 'Doğruluk' : 'R²',
        keyMetricValue: res.accuracy !== undefined ? `%${(res.accuracy * 100).toFixed(1)}` : `%${(res.rSquared * 100).toFixed(1)}`,
        interpretation: res.turkishInterpretation,
        status: res.rSquared >= 0.6 || (res.accuracy ?? 0) >= 0.75 ? 'Nominal' : 'Uyarı',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regresyon hesaplanamadı.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Regresyon Modülü (9 Algoritma)</h2>
            <p className="text-xs text-slate-500 mt-0.5">Klasik OLS, GLM (Lojistik/Poisson), Düzenlileştirilmiş (Ridge/Lasso/ElasticNet) ve Robust</p>
          </div>
          <HelpTooltip guideKey="regression" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {REG_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                method === m.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Hedef Değişken (Y)</label>
            <select
              value={activeTarget}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            >
              {numCols.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Açıklayıcı Değişkenler (X) {method === 'linear' || method === 'polynomial' ? '— İlk seçili kullanılır' : ''}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availablePreds.map((c) => {
                const selected = effectivePreds.includes(c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => togglePredictor(c.name)}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-slate-900 dark:bg-blue-700 text-white border-slate-900 dark:border-blue-700'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="md:col-span-3 flex items-end justify-end gap-2">
            {method === 'polynomial' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Derece</label>
                <input
                  type="number"
                  min={2}
                  max={4}
                  value={degree}
                  onChange={(e) => setDegree(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
            )}
            {(method === 'ridge' || method === 'lasso' || method === 'elastic_net') && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Ceza (λ)</label>
                <input
                  type="number"
                  step="0.5"
                  min={0.1}
                  value={lambda}
                  onChange={(e) => setLambda(Number(e.target.value))}
                  className="w-20 px-2 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
            )}
            {method === 'elastic_net' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">L1 Oranı</label>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  max={0.9}
                  value={l1Ratio}
                  onChange={(e) => setL1Ratio(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleRun}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Modeli Eğit
            </button>
          </div>
        </div>

        {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>}
      </div>

      {result && (
        <div className="space-y-6">
          {/* Metrics & Equation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{result.methodName}</h3>
              <span className="text-xs font-mono text-slate-500">n = {result.n} gözlem</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
                <div className="text-xs text-slate-500">{result.accuracy !== undefined ? 'Sınıflandırma Doğruluğu' : 'R² (Açıklanan Varyans)'}</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                  %{((result.accuracy ?? result.rSquared) * 100).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
                <div className="text-xs text-slate-500">{result.pseudoR2 !== undefined ? 'McFadden Pseudo-R²' : 'Düzeltilmiş R²'}</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  %{((result.pseudoR2 ?? result.adjRSquared) * 100).toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
                <div className="text-xs text-slate-500">RMSE (Kök Ort. Kare Hata)</div>
                <div className="text-lg font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                  {result.rmse.toFixed(4)}
                </div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md">
                <div className="text-xs text-slate-500">F-İstatistiği / p</div>
                <div className="text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
                  {result.fStat !== undefined ? `${result.fStat.toFixed(2)} (p=${result.fPValue?.toFixed(4)})` : `MAE: ${result.mae.toFixed(4)}`}
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-md font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto">
              {result.equation}
            </div>

            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <strong>Mühendislik Yorumu: </strong>
              {result.turkishInterpretation}
            </div>
          </div>

          {/* Coefficients Table & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-white">
                Model Katsayıları
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-2 px-4 font-semibold">Terim</th>
                      <th className="text-right py-2 px-3 font-semibold">Katsayı (β)</th>
                      <th className="text-right py-2 px-3 font-semibold">Std. Hata</th>
                      <th className="text-right py-2 px-3 font-semibold">t / z</th>
                      <th className="text-right py-2 px-3 font-semibold">p-Değeri</th>
                      <th className="text-right py-2 px-4 font-semibold">VIF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {result.coefficients.map((c) => (
                      <tr key={c.term}>
                        <td className="py-2 px-4 font-medium text-slate-900 dark:text-white">{c.term}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{c.coef.toFixed(4)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{c.se > 0 ? c.se.toFixed(4) : '—'}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{c.stat.toFixed(3)}</td>
                        <td
                          className={`py-2 px-3 text-right font-mono tabular-nums ${
                            c.pValue !== null && c.pValue < 0.05 ? 'text-blue-700 dark:text-blue-400 font-semibold' : ''
                          }`}
                        >
                          {c.pValue !== null ? c.pValue.toFixed(4) : '—'}
                        </td>
                        <td className="py-2 px-4 text-right font-mono tabular-nums">{c.vif !== undefined ? c.vif.toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                {result.xPlot ? 'Regresyon Eğrisi (X vs Y)' : 'Gerçekleşen (Y) vs Tahmin Edilen (Ŷ)'}
              </h3>
              <ScatterRegressionChart
                xs={result.xPlot ?? result.yActual}
                ys={result.xPlot ? result.yActual : result.yPred}
                yPred={result.xPlot ? result.yPred : result.yActual}
                xLabel={result.xPlot ? effectivePreds[0] : `Gerçek ${activeTarget}`}
                yLabel={result.xPlot ? activeTarget : `Tahmin ${activeTarget}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
