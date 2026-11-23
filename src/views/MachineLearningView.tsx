import React, { useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { ClusterPlotSvg, ForecastChartSvg } from '../components/Charts';
import { AnalysisRecord, Dataset } from '../domain/types';
import { extractNumericColumn } from '../engines/descriptiveStats';
import {
  AnomalyResult,
  ClusteringResult,
  ForecastResult,
  MlModelComparison,
  runAnomalyDetection,
  runAutoMLBenchmark,
  runHoltForecast,
  runKMeansClustering,
} from '../engines/sixSigmaMlSteelEngine';

interface MachineLearningViewProps {
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

type MlTab = 'automl' | 'classification' | 'regression' | 'clustering' | 'forecasting' | 'anomaly';

export const MachineLearningView: React.FC<MachineLearningViewProps> = ({
  dataset,
  onRecordAnalysis,
}) => {
  const numCols = dataset.columns.filter((c) => c.type === 'numeric');
  const [tab, setTab] = useState<MlTab>('automl');
  const [targetCol, setTargetCol] = useState<string>(numCols[Math.min(4, numCols.length - 1)]?.name ?? numCols[0]?.name ?? '');
  const [kClusters, setKClusters] = useState<number>(3);
  const [horizon, setHorizon] = useState<number>(8);
  const [zThresh, setZThresh] = useState<number>(2.4);

  const [mlModels, setMlModels] = useState<MlModelComparison[] | null>(null);
  const [clusterRes, setClusterRes] = useState<ClusteringResult | null>(null);
  const [forecastRes, setForecastRes] = useState<ForecastResult | null>(null);
  const [anomalyRes, setAnomalyRes] = useState<AnomalyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTarget = numCols.some((c) => c.name === targetCol) ? targetCol : (numCols[0]?.name ?? '');
  const featureCols = numCols.filter((c) => c.name !== activeTarget).slice(0, 4).map((c) => c.name);

  const runModule = () => {
    setError(null);
    try {
      if (tab === 'automl' || tab === 'classification' || tab === 'regression') {
        const taskType: 'classification' | 'regression' = tab === 'classification' ? 'classification' : 'regression';
        if (featureCols.length < 1) throw new Error('Özellik sütunu bulunamadı.');
        const valid = dataset.rows.filter(
          (r) => typeof r[activeTarget] === 'number' && featureCols.every((f) => typeof r[f] === 'number')
        );
        const X = valid.map((r) => featureCols.map((f) => r[f] as number));
        const y = valid.map((r) => r[activeTarget] as number);
        const models = runAutoMLBenchmark(X, y, taskType);
        setMlModels(models);
        const best = models[0];
        onRecordAnalysis({
          id: `an_${Date.now()}`,
          title: `ML ${tab.toUpperCase()} — ${activeTarget}`,
          module: 'Machine Learning',
          datasetName: dataset.name,
          createdAt: 'Az önce',
          keyMetricLabel: best.metricName,
          keyMetricValue: `%${(best.score * 100).toFixed(1)}`,
          interpretation: `En iyi model: ${best.modelName} (${best.secondaryMetric}: ${best.secondaryValue.toFixed(4)}).`,
          status: 'Nominal',
        });
      } else if (tab === 'clustering') {
        const cols = numCols.slice(0, 3).map((c) => c.name);
        const valid = dataset.rows.filter((r) => cols.every((c) => typeof r[c] === 'number'));
        const X = valid.map((r) => cols.map((c) => r[c] as number));
        const res = runKMeansClustering(X, cols, kClusters);
        setClusterRes(res);
        onRecordAnalysis({
          id: `an_${Date.now()}`,
          title: `K-Means Kümeleme (k=${kClusters})`,
          module: 'Machine Learning',
          datasetName: dataset.name,
          createdAt: 'Az önce',
          keyMetricLabel: 'Silhouette',
          keyMetricValue: res.silhouette.toFixed(3),
          interpretation: `${res.clusters.length} çalışma rejimi ayrıştırıldı.`,
          status: 'Nominal',
        });
      } else if (tab === 'forecasting') {
        const series = extractNumericColumn(dataset.rows, activeTarget).values;
        const res = runHoltForecast(series, horizon);
        setForecastRes(res);
        onRecordAnalysis({
          id: `an_${Date.now()}`,
          title: `Holt-Winters Öngörü — ${activeTarget}`,
          module: 'Machine Learning',
          datasetName: dataset.name,
          createdAt: 'Az önce',
          keyMetricLabel: 'MAPE',
          keyMetricValue: `%${res.mape.toFixed(2)}`,
          interpretation: `Gelecek ${horizon} adım için %95 güven bantlı tahmin üretildi.`,
          status: 'Nominal',
        });
      } else if (tab === 'anomaly') {
        const cols = numCols.slice(0, 4).map((c) => c.name);
        const valid = dataset.rows.filter((r) => cols.every((c) => typeof r[c] === 'number'));
        const X = valid.map((r) => cols.map((c) => r[c] as number));
        const res = runAnomalyDetection(X, cols, zThresh);
        setAnomalyRes(res);
        onRecordAnalysis({
          id: `an_${Date.now()}`,
          title: 'Çok Değişkenli Anomali Tespiti',
          module: 'Machine Learning',
          datasetName: dataset.name,
          createdAt: 'Az önce',
          keyMetricLabel: 'Anomali Sayısı',
          keyMetricValue: `${res.anomalyCount} / ${res.totalPoints}`,
          interpretation: `Mod-Z > ${zThresh} eşiğine göre ${res.anomalyCount} anormal proses gözlemi saptandı.`,
          status: res.anomalyCount > 0 ? 'Uyarı' : 'Nominal',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ML çalıştırılamadı.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Makine Öğrenmesi & AutoML Modülü</h2>
            <p className="text-xs text-slate-500 mt-0.5">Classification, Regression, Clustering, Forecasting, Anomaly Detection ve AutoML</p>
          </div>
          <HelpTooltip guideKey="ml" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'automl', label: 'AutoML Karşılaştırma' },
            { id: 'classification', label: 'Classification' },
            { id: 'regression', label: 'Regression' },
            { id: 'clustering', label: 'Clustering (K-Means)' },
            { id: 'forecasting', label: 'Forecasting (Zaman Serisi)' },
            { id: 'anomaly', label: 'Anomaly Detection' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as MlTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === t.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          {(tab === 'automl' || tab === 'classification' || tab === 'regression' || tab === 'forecasting') && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hedef / Seri Değişkeni</label>
              <select
                value={activeTarget}
                onChange={(e) => setTargetCol(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {tab === 'clustering' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Küme Sayısı (k)</label>
              <input
                type="number"
                min={2}
                max={6}
                value={kClusters}
                onChange={(e) => setKClusters(Number(e.target.value))}
                className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
              />
            </div>
          )}

          {tab === 'forecasting' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Öngörü Ufku (Adım)</label>
              <input
                type="number"
                min={3}
                max={24}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
              />
            </div>
          )}

          {tab === 'anomaly' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mod-Z Anomali Eşiği</label>
              <input
                type="number"
                step="0.2"
                min={1.5}
                max={5}
                value={zThresh}
                onChange={(e) => setZThresh(Number(e.target.value))}
                className="w-24 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
              />
            </div>
          )}

          <button
            type="button"
            onClick={runModule}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            Algoritmayı Çalıştır
          </button>
        </div>

        {error && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">{error}</div>}
      </div>

      {/* Results: AutoML / Classification / Regression */}
      {(tab === 'automl' || tab === 'classification' || tab === 'regression') && mlModels && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
            Model Performans Sıralaması (%75 Eğitim / %25 Test Ayrımı)
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-4 text-left">Sıra</th>
                <th className="py-2.5 px-3 text-left">Algoritma</th>
                <th className="py-2.5 px-3 text-right">Ana Metrik</th>
                <th className="py-2.5 px-3 text-right">İkincil Metrik</th>
                <th className="py-2.5 px-4 text-left">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {mlModels.map((m, idx) => (
                <tr key={m.modelName} className={idx === 0 ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}>
                  <td className="py-2.5 px-4 font-mono font-semibold">#{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{m.modelName}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700 dark:text-blue-400">
                    {m.metricName}: %{(m.score * 100).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {m.secondaryMetric}: {m.secondaryValue.toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{m.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results: Clustering */}
      {tab === 'clustering' && clusterRes && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">K-Means Küme Dağılımı</h3>
              <span className="text-xs font-mono text-slate-500">Silhouette: {clusterRes.silhouette.toFixed(3)}</span>
            </div>
            <ClusterPlotSvg points={clusterRes.points} xLabel={clusterRes.xLabel} yLabel={clusterRes.yLabel} />
          </div>
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold">Küme Merkezleri (Rejim Profilleri)</h3>
            {clusterRes.clusters.map((c) => (
              <div key={c.clusterId} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded text-xs">
                <div className="font-semibold text-slate-900 dark:text-white mb-1">
                  Küme {c.clusterId} ({c.count} gözlem)
                </div>
                <div className="font-mono text-slate-600 dark:text-slate-300">
                  {Object.entries(c.centroid).map(([k, v]) => `${k}: ${v.toFixed(2)}`).join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results: Forecasting */}
      {tab === 'forecasting' && forecastRes && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Holt Çift Üstel Düzeltme Zaman Serisi Öngörüsü</h3>
            <span className="text-xs font-mono text-slate-500">
              MAE: {forecastRes.mae.toFixed(3)} · MAPE: %{forecastRes.mape.toFixed(2)}
            </span>
          </div>
          <ForecastChartSvg historical={forecastRes.historical} forecast={forecastRes.forecast} />
        </div>
      )}

      {/* Results: Anomaly Detection */}
      {tab === 'anomaly' && anomalyRes && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Çok Değişkenli Anomali Tarama Sonucu</h3>
            <span className="text-xs font-mono font-semibold text-red-600">
              {anomalyRes.anomalyCount} anomali / {anomalyRes.totalPoints} gözlem
            </span>
          </div>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 text-left">Satır #</th>
                  <th className="py-2 px-3 text-right">Anomali Skoru</th>
                  <th className="py-2 px-3 text-left">Durum</th>
                  <th className="py-2 px-3 text-left">Parametre Değerleri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {anomalyRes.points
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 15)
                  .map((pt) => (
                    <tr key={pt.index}>
                      <td className="py-2 px-3 font-mono">{pt.index}</td>
                      <td className={`py-2 px-3 text-right font-mono font-semibold ${pt.isAnomaly ? 'text-red-600' : ''}`}>
                        {pt.score.toFixed(3)}
                      </td>
                      <td className="py-2 px-3">{pt.isAnomaly ? 'Anomali' : 'Normal'}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {Object.entries(pt.values).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
