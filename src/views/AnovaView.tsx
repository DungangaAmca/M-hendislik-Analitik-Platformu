import React, { useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { AnalysisRecord, Dataset } from '../domain/types';
import { extractNumericColumn } from '../engines/descriptiveStats';
import {
  AnovaMethod,
  AnovaResult,
  runGLM,
  runNestedAnova,
  runOneWayAnova,
  runRepeatedMeasuresAnova,
  runTwoWayAnova,
} from '../engines/anovaEngine';

interface AnovaViewProps {
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

const ANOVA_METHODS: Array<{ id: AnovaMethod; label: string }> = [
  { id: 'one_way', label: 'One-Way ANOVA' },
  { id: 'two_way', label: 'Two-Way ANOVA' },
  { id: 'nested', label: 'Nested ANOVA' },
  { id: 'repeated', label: 'Repeated Measures' },
  { id: 'glm', label: 'Genel Doğrusal Model (GLM)' },
];

export const AnovaView: React.FC<AnovaViewProps> = ({ dataset, onRecordAnalysis }) => {
  const numCols = dataset.columns.filter((c) => c.type === 'numeric');
  const catCols = dataset.columns.filter((c) => c.type === 'categorical');

  const [method, setMethod] = useState<AnovaMethod>('one_way');
  const [responseCol, setResponseCol] = useState<string>(numCols[0]?.name ?? '');
  const [factorA, setFactorA] = useState<string>(catCols[0]?.name ?? '');
  const [factorB, setFactorB] = useState<string>(catCols[1]?.name ?? catCols[0]?.name ?? '');
  const [covariate, setCovariate] = useState<string>(numCols[1]?.name ?? numCols[0]?.name ?? '');
  const [repCols, setRepCols] = useState<string[]>(numCols.slice(0, 3).map((c) => c.name));
  const [result, setResult] = useState<AnovaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeResp = numCols.some((c) => c.name === responseCol) ? responseCol : (numCols[0]?.name ?? '');
  const activeFacA = catCols.some((c) => c.name === factorA) ? factorA : (catCols[0]?.name ?? '');
  const activeFacB = catCols.some((c) => c.name === factorB) ? factorB : (catCols[1]?.name ?? catCols[0]?.name ?? '');
  const activeCov = numCols.some((c) => c.name === covariate) ? covariate : (numCols[1]?.name ?? numCols[0]?.name ?? '');

  const handleRun = () => {
    setError(null);
    try {
      let res: AnovaResult;
      if (method === 'one_way') {
        if (!activeFacA) throw new Error('One-Way ANOVA için kategorik faktör sütunu gereklidir.');
        res = runOneWayAnova(dataset.rows, activeResp, activeFacA);
      } else if (method === 'two_way') {
        if (!activeFacA || !activeFacB || activeFacA === activeFacB) {
          throw new Error('Two-Way ANOVA için iki farklı kategorik faktör gerekir.');
        }
        res = runTwoWayAnova(dataset.rows, activeResp, activeFacA, activeFacB);
      } else if (method === 'nested') {
        if (!activeFacA || !activeFacB) throw new Error('Nested ANOVA için üst ve alt faktör gerekir.');
        res = runNestedAnova(dataset.rows, activeResp, activeFacA, activeFacB);
      } else if (method === 'repeated') {
        const colsToUse = repCols.filter((rc) => numCols.some((n) => n.name === rc));
        if (colsToUse.length < 2) throw new Error('Repeated Measures için en az 2 sayısal sütun seçiniz.');
        const arrays = colsToUse.map((cn) => extractNumericColumn(dataset.rows, cn).values);
        res = runRepeatedMeasuresAnova(arrays, colsToUse);
      } else {
        if (!activeFacA || !activeCov) throw new Error('GLM için 1 kategorik faktör ve 1 sayısal kovaryat gerekir.');
        res = runGLM(dataset.rows, activeResp, activeFacA, activeCov);
      }

      setResult(res);
      const mainP = res.table[0]?.p ?? 1;
      onRecordAnalysis({
        id: `an_${Date.now()}`,
        title: `${res.methodName} — ${activeResp}`,
        module: 'ANOVA Modülü',
        datasetName: dataset.name,
        createdAt: 'Az önce',
        keyMetricLabel: 'F / p',
        keyMetricValue: `${(res.table[0]?.f ?? 0).toFixed(2)} / ${mainP.toFixed(4)}`,
        interpretation: res.turkishConclusion,
        status: mainP < 0.05 ? 'Uyarı' : 'Nominal',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ANOVA hesaplanamadı.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">ANOVA ve Genel Doğrusal Model Modülü</h2>
            <p className="text-xs text-slate-500 mt-0.5">One-Way, Two-Way, Nested, Repeated Measures ve GLM</p>
          </div>
          <HelpTooltip guideKey="anova" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ANOVA_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                method === m.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          {method !== 'repeated' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Yanıt Değişkeni (Y)</label>
                <select
                  value={activeResp}
                  onChange={(e) => setResponseCol(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                >
                  {numCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Faktör A (Kategorik)</label>
                <select
                  value={activeFacA}
                  onChange={(e) => setFactorA(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                >
                  {catCols.length === 0 ? (
                    <option value="">Kategorik sütun yok</option>
                  ) : (
                    catCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)
                  )}
                </select>
              </div>
              {(method === 'two_way' || method === 'nested') && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {method === 'nested' ? 'Yuvalanmış Alt Faktör B' : 'Faktör B (Kategorik)'}
                  </label>
                  <select
                    value={activeFacB}
                    onChange={(e) => setFactorB(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                  >
                    {catCols.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {method === 'glm' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Sürekli Kovaryat (X)</label>
                  <select
                    value={activeCov}
                    onChange={(e) => setCovariate(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                  >
                    {numCols.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Tekrarlı Ölçüm Sütunları (En az 2)</label>
              <div className="flex flex-wrap gap-1.5">
                {numCols.map((c) => {
                  const sel = repCols.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() =>
                        setRepCols((prev) => (prev.includes(c.name) ? prev.filter((p) => p !== c.name) : [...prev, c.name]))
                      }
                      className={`px-2.5 py-1 text-xs rounded border cursor-pointer ${
                        sel ? 'bg-slate-900 text-white border-slate-900' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleRun}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Varyans Analizini Çalıştır
          </button>
        </div>

        {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>}
      </div>

      {result && (
        <div className="space-y-6">
          {/* ANOVA Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{result.methodName}</h3>
              <span className="text-xs font-mono text-slate-500">R² = %{(result.rSquared * 100).toFixed(2)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold">Varyans Kaynağı</th>
                    <th className="text-right py-2.5 px-3 font-semibold">df</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Kareler Toplamı (SS)</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Kareler Ort. (MS)</th>
                    <th className="text-right py-2.5 px-3 font-semibold">F-Değeri</th>
                    <th className="text-right py-2.5 px-4 font-semibold">p-Değeri</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.table.map((row) => (
                    <tr key={row.source}>
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{row.source}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{row.df}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{row.ss.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{row.ms.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{row.f !== null ? row.f.toFixed(3) : '—'}</td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-semibold ${
                          row.p !== null && row.p < 0.05 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {row.p !== null ? row.p.toFixed(4) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200">
              <strong>Sonuç: </strong>
              {result.turkishConclusion}
            </div>
          </div>

          {/* Group Means & Tukey Pairwise */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                Grup Ortalamaları
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-2 px-4 font-semibold">Grup</th>
                    <th className="text-right py-2 px-3 font-semibold">n</th>
                    <th className="text-right py-2 px-3 font-semibold">Ortalama</th>
                    <th className="text-right py-2 px-4 font-semibold">Std. Sapma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {result.groupStats.map((g) => (
                    <tr key={g.name}>
                      <td className="py-2 px-4 font-medium">{g.name}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{g.n}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold">{g.mean.toFixed(4)}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums">{g.sd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.tukeyPairs && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
                  Tukey HSD İkili Karşılaştırmalar
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left py-2 px-4 font-semibold">Çift</th>
                      <th className="text-right py-2 px-3 font-semibold">Fark</th>
                      <th className="text-right py-2 px-3 font-semibold">Düz. p</th>
                      <th className="text-right py-2 px-4 font-semibold">Karar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {result.tukeyPairs.map((tk) => (
                      <tr key={tk.pair}>
                        <td className="py-2 px-4 font-medium">{tk.pair}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{tk.diff.toFixed(4)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{tk.pApprox.toFixed(4)}</td>
                        <td className={`py-2 px-4 text-right font-semibold ${tk.significant ? 'text-red-600' : 'text-slate-500'}`}>
                          {tk.significant ? 'Farklı' : 'Benzer'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
