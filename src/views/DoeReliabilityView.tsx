import React, { useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { SurvivalCurveChart } from '../components/Charts';
import { AnalysisRecord, Dataset } from '../domain/types';
import { extractNumericColumn } from '../engines/descriptiveStats';
import {
  analyzeDoeRuns,
  DoeAnalysisResult,
  DoeDesignType,
  DoeFactor,
  DoeRun,
  generateDoeMatrix,
  ReliabilityMethod,
  ReliabilityResult,
  runReliabilityAnalysis,
} from '../engines/doeReliabilityEngine';

interface DoeReliabilityViewProps {
  mode: 'doe' | 'reliability';
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

const DOE_TYPES: Array<{ id: DoeDesignType; label: string }> = [
  { id: 'full_factorial', label: 'Full Factorial (2^k)' },
  { id: 'fractional_factorial', label: 'Fractional Factorial' },
  { id: 'rsm', label: 'Response Surface (RSM)' },
  { id: 'ccd', label: 'Central Composite (CCD)' },
  { id: 'box_behnken', label: 'Box-Behnken' },
  { id: 'mixture', label: 'Mixture Design' },
  { id: 'taguchi', label: 'Taguchi (L9 / S-N)' },
];

const REL_METHODS: Array<{ id: ReliabilityMethod; label: string }> = [
  { id: 'weibull', label: 'Weibull Ömür' },
  { id: 'exponential', label: 'Exponential' },
  { id: 'lognormal', label: 'Lognormal' },
  { id: 'survival', label: 'Survival (Kaplan-Meier)' },
  { id: 'growth', label: 'Reliability Growth (Crow-AMSAA)' },
];

export const DoeReliabilityView: React.FC<DoeReliabilityViewProps> = ({
  mode,
  dataset,
  onRecordAnalysis,
}) => {
  // DOE State
  const [doeType, setDoeType] = useState<DoeDesignType>('full_factorial');
  const [factors, setFactors] = useState<DoeFactor[]>([
    { name: 'Kok_Orani', low: 320, high: 360 },
    { name: 'Baziklik_B2', low: 1.12, high: 1.24 },
    { name: 'Ruzgar_Temp', low: 1150, high: 1210 },
  ]);
  const [taguchiGoal, setTaguchiGoal] = useState<'larger' | 'smaller' | 'nominal'>('larger');
  const [runs, setRuns] = useState<DoeRun[]>(() => generateDoeMatrix('full_factorial', [
    { name: 'Kok_Orani', low: 320, high: 360 },
    { name: 'Baziklik_B2', low: 1.12, high: 1.24 },
    { name: 'Ruzgar_Temp', low: 1150, high: 1210 },
  ], 'larger'));
  const [doeResult, setDoeResult] = useState<DoeAnalysisResult | null>(null);

  // Reliability State
  const numCols = dataset.columns.filter((c) => c.type === 'numeric');
  const [relMethod, setRelMethod] = useState<ReliabilityMethod>('weibull');
  const [relInputText, setRelInputText] = useState<string>(
    '1240, 1850, 2410, 2890, 3120, 3450, 3890, 4150, 4620, 5100, 5480, 6100'
  );
  const [censorText, setCensorText] = useState<string>('1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0');
  const [relCol, setRelCol] = useState<string>('');
  const [relResult, setRelResult] = useState<ReliabilityResult | null>(null);
  const [relError, setRelError] = useState<string | null>(null);

  const rebuildMatrix = (nextType: DoeDesignType, nextGoal = taguchiGoal) => {
    setDoeType(nextType);
    const mat = generateDoeMatrix(nextType, factors, nextGoal);
    setRuns(mat);
    setDoeResult(null);
  };

  const runDoeAnalysis = () => {
    const res = analyzeDoeRuns(doeType, factors, runs, taguchiGoal);
    setDoeResult(res);
    onRecordAnalysis({
      id: `an_${Date.now()}`,
      title: `DOE — ${res.designName}`,
      module: 'DOE Modülü',
      datasetName: 'Deney Tasarımı Matrisi',
      createdAt: 'Az önce',
      keyMetricLabel: 'Model R²',
      keyMetricValue: `%${(res.rSquared * 100).toFixed(1)}`,
      interpretation: res.turkishInterpretation,
      status: 'Nominal',
    });
  };

  const executeReliability = () => {
    setRelError(null);
    try {
      let times: number[] = [];
      let flags: number[] | undefined = undefined;
      if (relCol) {
        times = extractNumericColumn(dataset.rows, relCol).values.map((v) => Math.abs(v));
      } else {
        times = relInputText
          .split(/[\s,;]+/)
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
        const parsedFlags = censorText
          .split(/[\s,;]+/)
          .map((s) => Number(s.trim()))
          .filter((n) => n === 0 || n === 1);
        if (parsedFlags.length === times.length) flags = parsedFlags;
      }

      const res = runReliabilityAnalysis(relMethod, times, flags);
      setRelResult(res);
      onRecordAnalysis({
        id: `an_${Date.now()}`,
        title: res.methodName,
        module: 'Reliability Modülü',
        datasetName: relCol || 'Ekipman Ömür Verisi',
        createdAt: 'Az önce',
        keyMetricLabel: 'MTTF / B10',
        keyMetricValue: `${res.mttf.toFixed(0)} / ${res.b10Life.toFixed(0)}`,
        interpretation: res.turkishInterpretation,
        status: 'Nominal',
      });
    } catch (err) {
      setRelError(err instanceof Error ? err.message : 'Güvenilirlik analizi başarısız.');
    }
  };

  if (mode === 'doe') {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Deney Tasarımı (DOE) Modülü</h2>
              <p className="text-xs text-slate-500 mt-0.5">Full/Fractional Factorial, RSM, CCD, Box-Behnken, Mixture ve Taguchi</p>
            </div>
            <HelpTooltip guideKey="doe" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DOE_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => rebuildMatrix(t.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  doeType === t.id
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Factor Config */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            {factors.map((f, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md space-y-2 text-xs">
                <input
                  type="text"
                  value={f.name}
                  onChange={(e) => {
                    const next = [...factors];
                    next[idx] = { ...f, name: e.target.value };
                    setFactors(next);
                  }}
                  className="w-full px-2 py-1 font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Alt:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={f.low}
                    onChange={(e) => {
                      const next = [...factors];
                      next[idx] = { ...f, low: Number(e.target.value) };
                      setFactors(next);
                    }}
                    className="w-20 px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                  />
                  <span className="text-slate-500">Üst:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={f.high}
                    onChange={(e) => {
                      const next = [...factors];
                      next[idx] = { ...f, high: Number(e.target.value) };
                      setFactors(next);
                    }}
                    className="w-20 px-2 py-1 font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {doeType === 'taguchi' && (
                <select
                  value={taguchiGoal}
                  onChange={(e) => {
                    const g = e.target.value as typeof taguchiGoal;
                    setTaguchiGoal(g);
                    rebuildMatrix(doeType, g);
                  }}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
                >
                  <option value="larger">S/N Hedefi: En Büyük En İyi</option>
                  <option value="smaller">S/N Hedefi: En Küçük En İyi</option>
                  <option value="nominal">S/N Hedefi: Nominal En İyi</option>
                </select>
              )}
              <button
                type="button"
                onClick={() => rebuildMatrix(doeType)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Matrisi Yenile
              </button>
            </div>
            <button
              type="button"
              onClick={runDoeAnalysis}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              Deneyi Analiz Et
            </button>
          </div>
        </div>

        {/* Design Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
              Deney Matrisi ({runs.length} Koşu) — Yanıt (Y) değerleri düzenlenebilir
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3 text-left">Koşu</th>
                    {factors.map((f) => (
                      <th key={f.name} className="py-2 px-3 text-right">{f.name}</th>
                    ))}
                    <th className="py-2 px-3 text-right">Yanıt (Y)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {runs.map((r, idx) => (
                    <tr key={r.runOrder}>
                      <td className="py-1.5 px-3 font-mono">{r.runOrder}</td>
                      {r.actual.map((val, j) => (
                        <td key={j} className="py-1.5 px-3 text-right font-mono tabular-nums">{val}</td>
                      ))}
                      <td className="py-1.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.1"
                          value={r.response}
                          onChange={(e) => {
                            const next = [...runs];
                            next[idx] = { ...r, response: Number(e.target.value) };
                            setRuns(next);
                          }}
                          className="w-20 px-2 py-0.5 text-right font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
              Faktör Etkileri ve Optimum Pencere
            </h3>
            {doeResult ? (
              <>
                <div className="space-y-2">
                  {doeResult.effects.map((eff) => (
                    <div key={eff.term} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800">
                      <span className="font-medium">{eff.term}</span>
                      <div className="flex items-center gap-3 font-mono tabular-nums">
                        <span>Etki: {eff.effect.toFixed(3)}</span>
                        <span>|t|: {eff.tValue.toFixed(2)}</span>
                        <span className={eff.significant ? 'text-red-600 font-semibold' : 'text-slate-400'}>
                          {eff.significant ? 'Anlamlı' : 'Zayıf'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {doeResult.snRatios && (
                  <div className="pt-2">
                    <div className="text-xs font-semibold mb-1.5">Taguchi S/N Oranları (dB)</div>
                    {doeResult.snRatios.map((sn) => (
                      <div key={sn.factor} className="flex justify-between text-xs py-1 font-mono">
                        <span>{sn.factor}</span>
                        <span>En İyi Seviye: {sn.bestLevel}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md text-xs leading-relaxed">
                  {doeResult.turkishInterpretation}
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Deney yanıtlarını inceleyin ve yukarıdan <strong>Deneyi Analiz Et</strong> düğmesine tıklayın.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RELIABILITY MODE
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Güvenilirlik ve Ömür (Reliability) Modülü</h2>
            <p className="text-xs text-slate-500 mt-0.5">Weibull, Exponential, Lognormal, Kaplan-Meier Sağkalım ve Crow-AMSAA Güvenilirlik Büyümesi</p>
          </div>
          <HelpTooltip guideKey="reliability" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {REL_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setRelMethod(m.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                relMethod === m.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-slate-500 mb-1">Arıza / Çalışma Süreleri (Saat veya Çevrim)</label>
            <input
              type="text"
              value={relInputText}
              onChange={(e) => {
                setRelCol('');
                setRelInputText(e.target.value);
              }}
              className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Sansür Bayrağı (1=Arıza, 0=Sansürlü)</label>
            <input
              type="text"
              value={censorText}
              onChange={(e) => setCensorText(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Veya Veri Seti Sütunu</label>
            <select
              value={relCol}
              onChange={(e) => setRelCol(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            >
              <option value="">Manuel Liste Kullan</option>
              {numCols.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end justify-end">
            <button
              type="button"
              onClick={executeReliability}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              Ömür Analizi Yap
            </button>
          </div>
        </div>
        {relError && <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md">{relError}</div>}
      </div>

      {relResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
              {relResult.methodName}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {relResult.shapeBeta !== undefined && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded">
                  <div className="text-slate-500">Şekil (β / σ)</div>
                  <div className="text-base font-mono font-semibold mt-0.5">{relResult.shapeBeta.toFixed(3)}</div>
                </div>
              )}
              {relResult.scaleEta !== undefined && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded">
                  <div className="text-slate-500">Karakteristik Ömür (η)</div>
                  <div className="text-base font-mono font-semibold mt-0.5">{relResult.scaleEta.toFixed(1)}</div>
                </div>
              )}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded">
                <div className="text-slate-500">MTTF (Ort. Ömür)</div>
                <div className="text-base font-mono font-semibold mt-0.5">{relResult.mttf.toFixed(1)}</div>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded">
                <div className="text-slate-500">B10 / B50 / B90</div>
                <div className="text-xs font-mono font-semibold mt-1">
                  {relResult.b10Life.toFixed(0)} / {relResult.b50Life.toFixed(0)} / {relResult.b90Life.toFixed(0)}
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-md text-xs leading-relaxed">
              {relResult.turkishInterpretation}
            </div>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
              {relMethod === 'growth' ? 'Anlık MTBF Büyüme Eğrisi' : 'Güvenilirlik / Sağkalım Eğrisi R(t)'}
            </h3>
            <SurvivalCurveChart
              points={relResult.curvePoints}
              yLabel={relMethod === 'growth' ? 'Anlık MTBF' : 'Güvenilirlik R(t)'}
            />
          </div>
        </div>
      )}
    </div>
  );
};
