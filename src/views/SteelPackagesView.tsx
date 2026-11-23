import React, { useMemo, useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { AnalysisRecord, Dataset } from '../domain/types';
import {
  analyzeBlastFurnace,
  analyzeBof,
  analyzeContinuousCasting,
  analyzeEnergyEfficiency,
  analyzeRollingMill,
  analyzeSinter,
  SteelPackageAnalysis,
} from '../engines/sixSigmaMlSteelEngine';

interface SteelPackagesViewProps {
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

type SteelPkg = 'bf' | 'sinter' | 'bof' | 'ccm' | 'rolling' | 'energy';

const PACKAGES: Array<{ id: SteelPkg; label: string }> = [
  { id: 'bf', label: 'Yüksek Fırın Analizi' },
  { id: 'sinter', label: 'Sinter Analizi' },
  { id: 'bof', label: 'BOF Analizi' },
  { id: 'ccm', label: 'Sürekli Döküm Analizi' },
  { id: 'rolling', label: 'Haddehane Analizi' },
  { id: 'energy', label: 'Enerji Verimliliği Analizi' },
];

export const SteelPackagesView: React.FC<SteelPackagesViewProps> = ({ dataset, onRecordAnalysis }) => {
  const [pkg, setPkg] = useState<SteelPkg>('bf');

  // Yüksek Fırın
  const [bf, setBf] = useState({
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

  // Sinter
  const [sinter, setSinter] = useState({
    tumblerIndex: 77.4,
    feoPct: 8.5,
    moisturePct: 7.1,
    cokeBreezePct: 4.1,
    basicityB2: 1.85,
  });

  // BOF
  const [bof, setBof] = useState({
    hotMetalC: 4.35,
    endPointC: 0.048,
    endPointTempC: 1668,
    o2ConsumedNm3T: 51.8,
    limeKgT: 48,
    yieldPct: 91.2,
  });

  // CCM
  const [ccm, setCcm] = useState({
    tundishTempC: 1546,
    liquidusTempC: 1522,
    castingSpeedMMin: 1.38,
    moldDeltaTC: 7.6,
    specificWaterLKg: 0.85,
  });

  // Haddehane
  const [rolling, setRolling] = useState({
    targetThicknessMm: 2.5,
    actualThicknessMm: 2.518,
    finishTempC: 874,
    coilingTempC: 615,
    tensileMPa: 438,
  });

  // Enerji
  const [energy, setEnergy] = useState({
    totalEnergyGjT: 18.1,
    bfgRecoveryPct: 94.8,
    cogRecoveryPct: 97.2,
    wasteHeatMw: 38.5,
    co2IntensityTCs: 1.79,
  });

  const syncFromDataset = () => {
    const findMean = (substr: string) => dataset.columns.find((c) => c.name.toLowerCase().includes(substr) && c.mean !== undefined)?.mean;
    if (pkg === 'bf') {
      setBf((prev) => ({
        ...prev,
        blastTempC: Number((findMean('ruzgar') ?? prev.blastTempC).toFixed(1)),
        pciKgT: Number((findMean('pci') ?? prev.pciKgT).toFixed(1)),
        cokeKgT: Number((findMean('kok') ?? prev.cokeKgT).toFixed(1)),
        hotMetalSiPct: Number((findMean('_si_') ?? prev.hotMetalSiPct).toFixed(3)),
        hotMetalSPct: Number((findMean('_s_') ?? prev.hotMetalSPct).toFixed(4)),
      }));
    } else if (pkg === 'sinter') {
      setSinter((prev) => ({
        ...prev,
        tumblerIndex: Number((findMean('tambur') ?? prev.tumblerIndex).toFixed(2)),
        feoPct: Number((findMean('feo') ?? prev.feoPct).toFixed(2)),
        moisturePct: Number((findMean('nem') ?? prev.moisturePct).toFixed(2)),
        cokeBreezePct: Number((findMean('kok') ?? prev.cokeBreezePct).toFixed(2)),
      }));
    } else if (pkg === 'bof') {
      setBof((prev) => ({
        ...prev,
        endPointTempC: Number((findMean('bitis_sicakligi') ?? prev.endPointTempC).toFixed(1)),
        o2ConsumedNm3T: Number((findMean('o2') ?? prev.o2ConsumedNm3T).toFixed(2)),
      }));
    } else if (pkg === 'ccm') {
      const sh = findMean('superheat');
      const sp = findMean('dokum_hizi');
      setCcm((prev) => ({
        ...prev,
        tundishTempC: sh !== undefined ? Number((prev.liquidusTempC + sh).toFixed(1)) : prev.tundishTempC,
        castingSpeedMMin: sp !== undefined ? Number(sp.toFixed(3)) : prev.castingSpeedMMin,
      }));
    } else if (pkg === 'rolling') {
      const rm = findMean('cekme');
      if (rm !== undefined) setRolling((prev) => ({ ...prev, tensileMPa: Number(rm.toFixed(1)) }));
    }
  };

  const analysis: SteelPackageAnalysis = useMemo(() => {
    switch (pkg) {
      case 'bf':
        return analyzeBlastFurnace(bf);
      case 'sinter':
        return analyzeSinter(sinter);
      case 'bof':
        return analyzeBof(bof);
      case 'ccm':
        return analyzeContinuousCasting(ccm);
      case 'rolling':
        return analyzeRollingMill(rolling);
      case 'energy':
        return analyzeEnergyEfficiency(energy);
    }
  }, [pkg, bf, sinter, bof, ccm, rolling, energy]);

  const saveSteelRecord = () => {
    const first = analysis.metrics[0];
    onRecordAnalysis({
      id: `an_${Date.now()}`,
      title: analysis.packageTitle,
      module: 'Demir Çelik Paketleri',
      datasetName: dataset.name,
      createdAt: 'Az önce',
      keyMetricLabel: first.label,
      keyMetricValue: `${first.value} ${first.unit}`,
      interpretation: analysis.recommendations[0],
      status: analysis.metrics.some((m) => m.status === 'Alarm')
        ? 'Alarm'
        : analysis.metrics.some((m) => m.status === 'Uyarı')
          ? 'Uyarı'
          : 'Nominal',
    });
  };

  const renderNumberField = (label: string, val: number, step: number, onChange: (v: number) => void) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="number"
        step={step}
        value={val}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Demir Çelik Hazır Mühendislik Paketleri</h2>
            <p className="text-xs text-slate-500 mt-0.5">Entegre tesis proses hesaplayıcıları ve metalürjik hedef penceresi denetimi</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={syncFromDataset}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Aktif Veriden Ortalamaları Çek
            </button>
            <button
              type="button"
              onClick={saveSteelRecord}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              Raporlara Ekle
            </button>
            <HelpTooltip guideKey="steel" />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PACKAGES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPkg(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                pkg === p.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Dynamic Parameter Inputs per Steel Package */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
          {pkg === 'bf' && (
            <>
              {renderNumberField('Rüzgar Sıcaklığı (°C)', bf.blastTempC, 5, (v) => setBf({ ...bf, blastTempC: v }))}
              {renderNumberField('Rüzgar Nemi (g/Nm³)', bf.blastMoistureG, 1, (v) => setBf({ ...bf, blastMoistureG: v }))}
              {renderNumberField('O₂ Zenginleştirme (%)', bf.o2EnrichmentPct, 0.2, (v) => setBf({ ...bf, o2EnrichmentPct: v }))}
              {renderNumberField('PCI Oranı (kg/thm)', bf.pciKgT, 2, (v) => setBf({ ...bf, pciKgT: v }))}
              {renderNumberField('Kok Oranı (kg/thm)', bf.cokeKgT, 2, (v) => setBf({ ...bf, cokeKgT: v }))}
              {renderNumberField('Sıcak Metal [Si] (%)', bf.hotMetalSiPct, 0.01, (v) => setBf({ ...bf, hotMetalSiPct: v }))}
              {renderNumberField('Sıcak Metal [S] (%)', bf.hotMetalSPct, 0.002, (v) => setBf({ ...bf, hotMetalSPct: v }))}
              {renderNumberField('Cüruf CaO (%)', bf.slagCaO, 0.2, (v) => setBf({ ...bf, slagCaO: v }))}
              {renderNumberField('Cüruf SiO₂ (%)', bf.slagSiO2, 0.2, (v) => setBf({ ...bf, slagSiO2: v }))}
            </>
          )}

          {pkg === 'sinter' && (
            <>
              {renderNumberField('Tambur İndeksi TI (%)', sinter.tumblerIndex, 0.2, (v) => setSinter({ ...sinter, tumblerIndex: v }))}
              {renderNumberField('Sinter FeO (%)', sinter.feoPct, 0.1, (v) => setSinter({ ...sinter, feoPct: v }))}
              {renderNumberField('Karışım Nem (%)', sinter.moisturePct, 0.1, (v) => setSinter({ ...sinter, moisturePct: v }))}
              {renderNumberField('Kok Tozu (%)', sinter.cokeBreezePct, 0.05, (v) => setSinter({ ...sinter, cokeBreezePct: v }))}
              {renderNumberField('Sinter Bazikliği (B2)', sinter.basicityB2, 0.05, (v) => setSinter({ ...sinter, basicityB2: v }))}
            </>
          )}

          {pkg === 'bof' && (
            <>
              {renderNumberField('Sıcak Metal [C] (%)', bof.hotMetalC, 0.05, (v) => setBof({ ...bof, hotMetalC: v }))}
              {renderNumberField('Son Nokta [C] (%)', bof.endPointC, 0.005, (v) => setBof({ ...bof, endPointC: v }))}
              {renderNumberField('Döküm Sıcaklığı (°C)', bof.endPointTempC, 2, (v) => setBof({ ...bof, endPointTempC: v }))}
              {renderNumberField('O₂ Tüketimi (Nm³/t)', bof.o2ConsumedNm3T, 0.5, (v) => setBof({ ...bof, o2ConsumedNm3T: v }))}
              {renderNumberField('Metalik Verim (%)', bof.yieldPct, 0.2, (v) => setBof({ ...bof, yieldPct: v }))}
            </>
          )}

          {pkg === 'ccm' && (
            <>
              {renderNumberField('Tandiş Sıcaklığı (°C)', ccm.tundishTempC, 1, (v) => setCcm({ ...ccm, tundishTempC: v }))}
              {renderNumberField('Likidüs Sıcaklığı (°C)', ccm.liquidusTempC, 1, (v) => setCcm({ ...ccm, liquidusTempC: v }))}
              {renderNumberField('Döküm Hızı (m/dk)', ccm.castingSpeedMMin, 0.05, (v) => setCcm({ ...ccm, castingSpeedMMin: v }))}
              {renderNumberField('Kalıp Su ΔT (°C)', ccm.moldDeltaTC, 0.2, (v) => setCcm({ ...ccm, moldDeltaTC: v }))}
              {renderNumberField('Özgül Su (L/kg)', ccm.specificWaterLKg, 0.05, (v) => setCcm({ ...ccm, specificWaterLKg: v }))}
            </>
          )}

          {pkg === 'rolling' && (
            <>
              {renderNumberField('Hedef Kalınlık (mm)', rolling.targetThicknessMm, 0.1, (v) => setRolling({ ...rolling, targetThicknessMm: v }))}
              {renderNumberField('Ölçülen Kalınlık (mm)', rolling.actualThicknessMm, 0.005, (v) => setRolling({ ...rolling, actualThicknessMm: v }))}
              {renderNumberField('FRT Sıcaklığı (°C)', rolling.finishTempC, 5, (v) => setRolling({ ...rolling, finishTempC: v }))}
              {renderNumberField('Sarma Sıcaklığı (°C)', rolling.coilingTempC, 5, (v) => setRolling({ ...rolling, coilingTempC: v }))}
              {renderNumberField('Çekme Dayanımı (MPa)', rolling.tensileMPa, 5, (v) => setRolling({ ...rolling, tensileMPa: v }))}
            </>
          )}

          {pkg === 'energy' && (
            <>
              {renderNumberField('SEC (GJ/tcs)', energy.totalEnergyGjT, 0.1, (v) => setEnergy({ ...energy, totalEnergyGjT: v }))}
              {renderNumberField('BFG Geri Kazanım (%)', energy.bfgRecoveryPct, 0.2, (v) => setEnergy({ ...energy, bfgRecoveryPct: v }))}
              {renderNumberField('COG Geri Kazanım (%)', energy.cogRecoveryPct, 0.2, (v) => setEnergy({ ...energy, cogRecoveryPct: v }))}
              {renderNumberField('Atık Isı Gücü (MW)', energy.wasteHeatMw, 1, (v) => setEnergy({ ...energy, wasteHeatMw: v }))}
              {renderNumberField('CO₂ Yoğunluğu (t/tcs)', energy.co2IntensityTCs, 0.05, (v) => setEnergy({ ...energy, co2IntensityTCs: v }))}
            </>
          )}
        </div>
      </div>

      {/* Output KPIs & Recommendations */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
          {analysis.packageTitle}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analysis.metrics.map((m) => (
            <div key={m.label} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{m.label}</span>
                <span
                  className={`font-semibold ${
                    m.status === 'Nominal' ? 'text-emerald-700' : m.status === 'Uyarı' ? 'text-amber-600' : 'text-red-600'
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <div className="mt-1 text-xl font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                {m.value} <span className="text-xs font-normal text-slate-500">{m.unit}</span>
              </div>
              <div className="mt-1 text-[11px] font-mono text-slate-500">Hedef: {m.targetRange}</div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-md space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
          <div className="font-semibold text-slate-900 dark:text-white">Metalürjik Aksiyon Önerileri</div>
          {analysis.recommendations.map((rec, i) => (
            <div key={i}>• {rec}</div>
          ))}
        </div>
      </div>
    </div>
  );
};
