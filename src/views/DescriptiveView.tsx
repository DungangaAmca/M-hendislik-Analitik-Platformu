import React, { useMemo, useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { BoxplotChart, HistogramChart, ViolinChart } from '../components/Charts';
import { AnalysisRecord, Dataset } from '../domain/types';
import {
  computeDescriptiveStats,
  extractNumericColumn,
  groupNumericByCategory,
} from '../engines/descriptiveStats';

interface DescriptiveViewProps {
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

export const DescriptiveView: React.FC<DescriptiveViewProps> = ({ dataset, onRecordAnalysis }) => {
  const numCols = dataset.columns.filter((c) => c.type === 'numeric');
  const catCols = dataset.columns.filter((c) => c.type === 'categorical');

  const [selectedVar, setSelectedVar] = useState<string>(numCols[0]?.name ?? '');
  const [groupVar, setGroupVar] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState(false);

  const activeVar = numCols.some((c) => c.name === selectedVar) ? selectedVar : (numCols[0]?.name ?? '');

  const { overallSummary, groupedSummaries } = useMemo(() => {
    if (!activeVar) return { overallSummary: null, groupedSummaries: [] };
    const { values, missing } = extractNumericColumn(dataset.rows, activeVar);
    if (values.length === 0) return { overallSummary: null, groupedSummaries: [] };
    const overall = computeDescriptiveStats(values, missing, activeVar);
    const grouped =
      groupVar && catCols.some((c) => c.name === groupVar)
        ? groupNumericByCategory(dataset.rows, activeVar, groupVar).map((g) => g.summary)
        : [overall];
    return { overallSummary: overall, groupedSummaries: grouped };
  }, [dataset, activeVar, groupVar, catCols]);

  const handleSaveResult = () => {
    if (!overallSummary) return;
    onRecordAnalysis({
      id: `an_${Date.now()}`,
      title: `${activeVar} Tanımlayıcı İstatistikler`,
      module: 'Tanımlayıcı İstatistikler',
      datasetName: dataset.name,
      createdAt: 'Az önce',
      keyMetricLabel: 'Ort ± SD',
      keyMetricValue: `${overallSummary.mean.toFixed(3)} ± ${overallSummary.sd.toFixed(3)}`,
      interpretation: `Medyan ${overallSummary.median.toFixed(3)}, %95 GA [${overallSummary.ci95Low.toFixed(3)}, ${overallSummary.ci95High.toFixed(3)}].`,
      status: overallSummary.outliers.length > 0 ? 'Uyarı' : 'Nominal',
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Controls & Educational Help */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Sayısal Değişken</label>
            <select
              value={activeVar}
              onChange={(e) => setSelectedVar(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            >
              {numCols.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Gruplama Değişkeni (İsteğe Bağlı)</label>
            <select
              value={groupVar}
              onChange={(e) => setGroupVar(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            >
              <option value="">Gruplama Yok (Tümü)</option>
              {catCols.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveResult}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {savedNotice ? 'Raporlara Eklendi' : 'Analizi Kaydet'}
          </button>
          <HelpTooltip guideKey="descriptive" />
        </div>
      </div>

      {overallSummary ? (
        <>
          {/* Tabular Summary Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="text-left py-2.5 px-4 font-semibold">Grup</th>
                    <th className="text-right py-2.5 px-3 font-semibold">n</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Ortalama</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Medyan</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Mod</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Varyans</th>
                    <th className="text-right py-2.5 px-3 font-semibold">Std. Sapma (SD)</th>
                    <th className="text-right py-2.5 px-4 font-semibold">%95 Güven Aralığı</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {groupedSummaries.map((s) => (
                    <tr key={s.group}>
                      <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{s.group}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.n}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold">{s.mean.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.median.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.mode.map((m) => m.toFixed(3)).join(', ')}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.variance.toFixed(4)}</td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">{s.sd.toFixed(4)}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        [{s.ci95Low.toFixed(3)}, {s.ci95High.toFixed(3)}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3 Charts: Histogram, Boxplot, Violin Plot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Histogram ve Normal Eğri</h3>
              <HistogramChart summary={overallSummary} />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Kutu Grafiği (Boxplot)</h3>
              <BoxplotChart summaries={groupedSummaries} />
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Keman Grafiği (Violin Plot — KDE)</h3>
              <ViolinChart summaries={groupedSummaries} />
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center text-sm text-slate-500">
          Seçili veri setinde sayısal değişken bulunamadı.
        </div>
      )}
    </div>
  );
};
