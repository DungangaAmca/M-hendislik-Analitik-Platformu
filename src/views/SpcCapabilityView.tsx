import React, { useMemo, useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { ControlChartSvg, HistogramChart } from '../components/Charts';
import { AnalysisRecord, Dataset } from '../domain/types';
import { computeDescriptiveStats, extractNumericColumn } from '../engines/descriptiveStats';
import {
  CapabilityResult,
  computeCapability,
  computeSpcChart,
  SpcChartType,
  SpcResult,
} from '../engines/spcCapabilityEngine';

interface SpcCapabilityViewProps {
  mode: 'spc' | 'capability';
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

const SPC_CHARTS: Array<{ id: SpcChartType; label: string }> = [
  { id: 'xbar_r', label: 'Xbar-R' },
  { id: 'xbar_s', label: 'Xbar-S' },
  { id: 'i_mr', label: 'I-MR' },
  { id: 'c', label: 'C Chart' },
  { id: 'u', label: 'U Chart' },
  { id: 'p', label: 'P Chart' },
  { id: 'np', label: 'NP Chart' },
  { id: 'ewma', label: 'EWMA' },
  { id: 'cusum', label: 'CUSUM' },
];

export const SpcCapabilityView: React.FC<SpcCapabilityViewProps> = ({
  mode,
  dataset,
  onRecordAnalysis,
}) => {
  const numCols = dataset.columns.filter((c) => c.type === 'numeric');
  const [selectedCol, setSelectedCol] = useState<string>(numCols[Math.min(4, numCols.length - 1)]?.name ?? numCols[0]?.name ?? '');
  const activeCol = numCols.some((c) => c.name === selectedCol) ? selectedCol : (numCols[0]?.name ?? '');

  // SPC State
  const [chartType, setChartType] = useState<SpcChartType>('i_mr');
  const [subgroupSize, setSubgroupSize] = useState<number>(5);
  const [sampleSize, setSampleSize] = useState<number>(50);
  const [ewmaLambda, setEwmaLambda] = useState<number>(0.2);

  // Capability State
  const colProfile = dataset.columns.find((c) => c.name === activeCol);
  const defaultMean = colProfile?.mean ?? 0.5;
  const defaultSd = colProfile?.sd ?? 0.05;
  const [lslInput, setLslInput] = useState<string>('');
  const [uslInput, setUslInput] = useState<string>('');
  const [targetInput, setTargetInput] = useState<string>('');

  const { values } = useMemo(() => extractNumericColumn(dataset.rows, activeCol), [dataset, activeCol]);

  const effectiveLsl = lslInput !== '' ? Number(lslInput) : Number((defaultMean - 3.2 * defaultSd).toFixed(3));
  const effectiveUsl = uslInput !== '' ? Number(uslInput) : Number((defaultMean + 3.2 * defaultSd).toFixed(3));
  const effectiveTarget = targetInput !== '' ? Number(targetInput) : Number(defaultMean.toFixed(3));

  const spcResult: SpcResult | null = useMemo(() => {
    if (mode !== 'spc' || values.length < 4) return null;
    try {
      return computeSpcChart(chartType, values, { subgroupSize, sampleSize, ewmaLambda });
    } catch {
      return null;
    }
  }, [mode, chartType, values, subgroupSize, sampleSize, ewmaLambda]);

  const capResult: CapabilityResult | null = useMemo(() => {
    if (mode !== 'capability' || values.length < 5 || effectiveUsl <= effectiveLsl) return null;
    try {
      return computeCapability(values, effectiveLsl, effectiveUsl, effectiveTarget, subgroupSize);
    } catch {
      return null;
    }
  }, [mode, values, effectiveLsl, effectiveUsl, effectiveTarget, subgroupSize]);

  const capSummary = useMemo(() => {
    if (mode !== 'capability' || values.length < 5) return null;
    return computeDescriptiveStats(values, 0, activeCol);
  }, [mode, values, activeCol]);

  const saveAnalysis = () => {
    if (mode === 'spc' && spcResult) {
      onRecordAnalysis({
        id: `an_${Date.now()}`,
        title: `${activeCol} — ${spcResult.title}`,
        module: 'SPC Merkezi',
        datasetName: dataset.name,
        createdAt: 'Az önce',
        keyMetricLabel: 'İhlal Sayısı',
        keyMetricValue: `${spcResult.violationCount} nokta`,
        interpretation: spcResult.turkishSummary,
        status: spcResult.inControl ? 'Nominal' : 'Alarm',
      });
    } else if (mode === 'capability' && capResult) {
      onRecordAnalysis({
        id: `an_${Date.now()}`,
        title: `${activeCol} Proses Yeterlilik Sixpack`,
        module: 'Capability Modülü',
        datasetName: dataset.name,
        createdAt: 'Az önce',
        keyMetricLabel: 'Cp / Cpk',
        keyMetricValue: `${capResult.cp.toFixed(2)} / ${capResult.cpk.toFixed(2)}`,
        interpretation: `${capResult.status} · Tahmini Hata: ${capResult.ppmOverall.toFixed(0)} PPM`,
        status: capResult.cpk >= 1.33 ? 'Nominal' : capResult.cpk >= 1.0 ? 'Uyarı' : 'Alarm',
      });
    }
  };

  if (mode === 'spc') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">İstatistiksel Proses Kontrol (SPC) Merkezi</h2>
              <p className="text-xs text-slate-500 mt-0.5">Xbar-R, Xbar-S, I-MR, C, U, P, NP, EWMA, CUSUM ve Western Electric kural denetimi</p>
            </div>
            <HelpTooltip guideKey="spc" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SPC_CHARTS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChartType(c.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  chartType === c.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">İzlenen Parametre</label>
              <select
                value={activeCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
              >
                {numCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {(chartType === 'xbar_r' || chartType === 'xbar_s') && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Alt Grup Boyutu (n)</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={subgroupSize}
                  onChange={(e) => setSubgroupSize(Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
            )}

            {(chartType === 'u' || chartType === 'p' || chartType === 'np') && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Denetim Birimi / Örneklem (n)</label>
                <input
                  type="number"
                  min={1}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-24 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
            )}

            {chartType === 'ewma' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">EWMA Ağırlığı (λ)</label>
                <input
                  type="number"
                  step="0.05"
                  min={0.05}
                  max={0.8}
                  value={ewmaLambda}
                  onChange={(e) => setEwmaLambda(Number(e.target.value))}
                  className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
                />
              </div>
            )}

            <button
              type="button"
              onClick={saveAnalysis}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
            >
              SPC Kaydını Ekle
            </button>
          </div>
        </div>

        {spcResult ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{spcResult.title}</h3>
              <span className={`text-xs font-semibold ${spcResult.inControl ? 'text-emerald-700' : 'text-red-600'}`}>
                {spcResult.inControl ? 'Kontrol Altında (Nominal)' : `${spcResult.violationCount} Kural İhlali`}
              </span>
            </div>

            <ControlChartSvg title={spcResult.primaryLabel} points={spcResult.primaryPoints} />
            {spcResult.secondaryPoints && spcResult.secondaryLabel && (
              <ControlChartSvg title={spcResult.secondaryLabel} points={spcResult.secondaryPoints} />
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md text-xs text-slate-700 dark:text-slate-200">
              <strong>SPC Değerlendirmesi: </strong>
              {spcResult.turkishSummary}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 text-xs text-amber-700">
            Seçili grafik türü ve alt grup boyutu için yeterli gözlem bulunmuyor.
          </div>
        )}
      </div>
    );
  }

  // CAPABILITY & SIXPACK MODE
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Proses Yeterlilik Modülü & Capability Sixpack</h2>
            <p className="text-xs text-slate-500 mt-0.5">Cp, Cpk, Pp, Ppk, Cpm (Taguchi) ve 6 panelli Minitab düzeyinde yeterlilik incelemesi</p>
          </div>
          <HelpTooltip guideKey="capability" />
        </div>

        <div className="flex flex-wrap items-end gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Parametre</label>
            <select
              value={activeCol}
              onChange={(e) => {
                setSelectedCol(e.target.value);
                setLslInput('');
                setUslInput('');
                setTargetInput('');
              }}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            >
              {numCols.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Alt Spec (LSL)</label>
            <input
              type="number"
              step="0.01"
              value={lslInput !== '' ? lslInput : effectiveLsl}
              onChange={(e) => setLslInput(e.target.value)}
              className="w-28 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hedef (Target)</label>
            <input
              type="number"
              step="0.01"
              value={targetInput !== '' ? targetInput : effectiveTarget}
              onChange={(e) => setTargetInput(e.target.value)}
              className="w-28 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Üst Spec (USL)</label>
            <input
              type="number"
              step="0.01"
              value={uslInput !== '' ? uslInput : effectiveUsl}
              onChange={(e) => setUslInput(e.target.value)}
              className="w-28 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Alt Grup (n)</label>
            <input
              type="number"
              min={2}
              max={10}
              value={subgroupSize}
              onChange={(e) => setSubgroupSize(Number(e.target.value))}
              className="w-20 px-2.5 py-1.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800"
            />
          </div>

          <button
            type="button"
            onClick={saveAnalysis}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            Yeterlilik Raporla
          </button>
        </div>
      </div>

      {capResult && capSummary && (
        <div className="space-y-6">
          {/* Core Indices Row */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { label: 'Cp (Potansiyel)', val: capResult.cp.toFixed(2) },
              { label: 'Cpk (Gerçekleşen)', val: capResult.cpk.toFixed(2), highlight: true },
              { label: 'Pp (Genel Pot.)', val: capResult.pp.toFixed(2) },
              { label: 'Ppk (Genel Gerç.)', val: capResult.ppk.toFixed(2) },
              { label: 'Cpm (Taguchi)', val: capResult.cpm.toFixed(2) },
              { label: 'Sigma Düzeyi / PPM', val: `${capResult.zBench.toFixed(2)}σ · ${capResult.ppmOverall.toFixed(0)}` },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
                <div className="text-xs text-slate-500">{item.label}</div>
                <div
                  className={`mt-1 text-lg font-mono font-semibold tabular-nums ${
                    item.highlight
                      ? capResult.cpk >= 1.33
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : capResult.cpk >= 1.0
                          ? 'text-amber-600'
                          : 'text-red-600'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          {/* Capability Sixpack Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Capability Sixpack — {activeCol}</h3>
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">{capResult.status}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ControlChartSvg
                title="1. Alt Grup Ortalamaları (Xbar)"
                points={capResult.subgroupMeans.map((v, i) => ({
                  index: i + 1,
                  value: v,
                  ucl: capResult.xbarUcl,
                  cl: capResult.xbarCl,
                  lcl: capResult.xbarLcl,
                  violatedRules: v > capResult.xbarUcl || v < capResult.xbarLcl ? ['Sınır Dışı'] : [],
                }))}
                height={185}
              />

              <ControlChartSvg
                title="2. Alt Grup Değişim Aralığı (R)"
                points={capResult.subgroupRanges.map((v, i) => ({
                  index: i + 1,
                  value: v,
                  ucl: capResult.rUcl,
                  cl: capResult.rCl,
                  lcl: 0,
                  violatedRules: v > capResult.rUcl ? ['Sınır Dışı'] : [],
                }))}
                height={185}
              />

              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-2">
                  3. Yeterlilik Histogramı (LSL={effectiveLsl}, Hedef={effectiveTarget}, USL={effectiveUsl})
                </div>
                <HistogramChart summary={capSummary} lsl={effectiveLsl} usl={effectiveUsl} target={effectiveTarget} height={200} />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">4. İstatistik & Verim Özeti</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded flex justify-between">
                    <span className="text-slate-500">Ortalama</span>
                    <span className="font-mono font-semibold">{capResult.mean.toFixed(4)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded flex justify-between">
                    <span className="text-slate-500">σ (Grup İçi)</span>
                    <span className="font-mono font-semibold">{capResult.sdWithin.toFixed(4)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded flex justify-between">
                    <span className="text-slate-500">σ (Genel)</span>
                    <span className="font-mono font-semibold">{capResult.sdOverall.toFixed(4)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded flex justify-between">
                    <span className="text-slate-500">Beklenen Verim</span>
                    <span className="font-mono font-semibold text-emerald-700">%{capResult.yieldPct.toFixed(3)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded flex justify-between">
                    <span className="text-slate-500">PPM (Kısa Dönem)</span>
                    <span className="font-mono font-semibold">{capResult.ppmWithin.toFixed(1)}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded flex justify-between">
                    <span className="text-slate-500">PPM (Uzun Dönem)</span>
                    <span className="font-mono font-semibold">{capResult.ppmOverall.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
