import {
  AiSuggestion,
  AnalysisRecord,
  Dataset,
  ProjectRecord,
  SpcAlarm,
} from '../domain/types';
import { profileRows } from '../engines/fileParser';

function createBlastFurnaceDataset(): Dataset {
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 60; i++) {
    const shift = i % 3 === 0 ? 'Vardiya A' : i % 3 === 1 ? 'Vardiya B' : 'Vardiya C';
    const coke = 335 + Math.sin(i * 0.4) * 12 + (i % 5) * 2.1;
    const pci = 160 - Math.sin(i * 0.4) * 8 + ((i * 7) % 9) * 1.1;
    const blastTemp = 1175 + Math.cos(i * 0.3) * 18 + (shift === 'Vardiya B' ? 6 : 0);
    const basicity = 1.17 + Math.sin(i * 0.25) * 0.045;
    // Realistic metallurgical correlation for hot metal Si% and S%
    const si =
      0.51 +
      0.004 * (coke - 335) +
      0.0015 * (blastTemp - 1175) -
      0.28 * (basicity - 1.17) +
      (i === 23 ? 0.26 : 0) +
      Math.sin(i * 1.3) * 0.028;
    const s = Math.max(
      0.012,
      0.026 - 0.08 * (basicity - 1.17) - 0.015 * (si - 0.51) + Math.cos(i * 0.9) * 0.003
    );
    const hmTemp = 1492 + 48 * (si - 0.51) + Math.sin(i * 0.6) * 8;
    const defectFlag = si > 0.62 || s > 0.033 ? 1 : 0;

    rows.push({
      Dokum_No: 2401 + i,
      Vardiya: shift,
      Kok_Orani_kgt: Number(coke.toFixed(1)),
      PCI_kgt: Number(pci.toFixed(1)),
      Ruzgar_Sicakligi_C: Number(blastTemp.toFixed(1)),
      Curuf_Baziklik_B2: Number(basicity.toFixed(3)),
      Sicak_Metal_Si_Pct: i === 41 ? null : Number(si.toFixed(3)),
      Sicak_Metal_S_Pct: Number(s.toFixed(4)),
      Sicak_Metal_C_Temp: Number(hmTemp.toFixed(1)),
      Limit_Disi_Bayrak: defectFlag,
    });
  }
  const ds = profileRows(
    'Yuksek_Firin_2_Sicak_Metal.xlsx',
    'Sistem',
    rows,
    'Yüksek Fırın #2 son 60 döküm kimyasal analiz ve termal proses verisi'
  );
  ds.id = 'ds_bf2';
  return ds;
}

function createSinterDataset(): Dataset {
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 48; i++) {
    const harman = i % 2 === 0 ? 'Harman-Tip-1' : 'Harman-Tip-2';
    const cokeBreeze = 4.05 + Math.sin(i * 0.35) * 0.25;
    const moisture = 7.1 + Math.cos(i * 0.4) * 0.35;
    const feo = 8.4 + 1.8 * (cokeBreeze - 4.05) + Math.sin(i * 0.8) * 0.32;
    const ti = 77.2 + 2.4 * (cokeBreeze - 4.05) - 1.1 * Math.abs(moisture - 7.1) + (harman === 'Harman-Tip-2' ? 1.1 : 0);
    rows.push({
      Parti_No: `SN-${101 + i}`,
      Harman: harman,
      Kok_Tozu_Pct: Number(cokeBreeze.toFixed(2)),
      Nem_Pct: Number(moisture.toFixed(2)),
      FeO_Pct: Number(feo.toFixed(2)),
      Tambur_Dayanimi_TI: Number(ti.toFixed(2)),
    });
  }
  const ds = profileRows(
    'Sinter_Tesisi_Tambur_FeO.csv',
    'Sistem',
    rows,
    'Sinter bandı 48 parti dayanım ve mineraloji kayıtları'
  );
  ds.id = 'ds_sinter';
  return ds;
}

function createBofCastingDataset(): Dataset {
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < 50; i++) {
    const kalite = i % 3 === 0 ? 'S235JR' : i % 3 === 1 ? 'S355J2' : 'DD11';
    const o2 = 51.5 + Math.sin(i * 0.45) * 2.4;
    const endTemp = 1666 + 1.9 * (o2 - 51.5) + Math.cos(i * 0.7) * 6;
    const superheat = 22 + 0.25 * (endTemp - 1666) + Math.sin(i * 0.5) * 3.5;
    const speed = 1.38 - 0.012 * (superheat - 22) + Math.cos(i * 0.6) * 0.05;
    const tensile = kalite === 'S355J2' ? 525 + Math.sin(i) * 14 : kalite === 'S235JR' ? 425 + Math.cos(i) * 12 : 345 + Math.sin(i) * 10;
    const defects = superheat > 26 ? 2 : speed > 1.44 ? 1 : 0;
    rows.push({
      Sarj_No: `BOF-${500 + i}`,
      Celik_Kalitesi: kalite,
      O2_Tuketimi_Nm3t: Number(o2.toFixed(2)),
      BOF_Bitis_Sicakligi_C: Number(endTemp.toFixed(1)),
      Tandis_Superheat_C: Number(superheat.toFixed(1)),
      Dokum_Hizi_mdk: Number(speed.toFixed(3)),
      Cekme_Dayanimi_MPa: Number(tensile.toFixed(1)),
      Yuzey_Kusur_Adedi: defects,
    });
  }
  const ds = profileRows(
    'BOF_CCM_Hadde_Kalite.xlsx',
    'Sistem',
    rows,
    'Çelikhane BOF konvertör, sürekli döküm ve mekanik kalite verisi'
  );
  ds.id = 'ds_bof';
  return ds;
}

export const INITIAL_DATASETS: Dataset[] = [
  createBlastFurnaceDataset(),
  createSinterDataset(),
  createBofCastingDataset(),
];

export const INITIAL_PROJECTS: ProjectRecord[] = [
  {
    id: 'prj_1',
    title: 'YF #2 Sıcak Metal [Si] Varyasyon Azaltma (DMAIC)',
    facility: 'Yüksek Fırınlar Müdürlüğü',
    owner: 'Dr. Hakan Demir',
    phase: 'Analiz',
    datasetId: 'ds_bf2',
    updatedAt: '2026-11-22',
    status: 'Uyarı',
  },
  {
    id: 'prj_2',
    title: 'Sinter Tambur İndeksi (TI ≥ %77) Optimizasyonu',
    facility: 'Sinter Tesisi #1',
    owner: 'Elif Kaya',
    phase: 'İyileştirme',
    datasetId: 'ds_sinter',
    updatedAt: '2026-11-21',
    status: 'Nominal',
  },
  {
    id: 'prj_3',
    title: 'BOF–CCM Süperheat ve Yüzey Kusuru Kontrolü',
    facility: 'Çelikhane ve Sürekli Döküm',
    owner: 'Murat Yılmaz',
    phase: 'Kontrol',
    datasetId: 'ds_bof',
    updatedAt: '2026-11-20',
    status: 'Nominal',
  },
];

export const INITIAL_ANALYSES: AnalysisRecord[] = [
  {
    id: 'an_1',
    title: 'Sıcak Metal [Si] Yeterlilik Sixpack',
    module: 'Capability Modülü',
    datasetName: 'Yuksek_Firin_2_Sicak_Metal.xlsx',
    createdAt: 'Bugün 10:15',
    keyMetricLabel: 'Cpk / Ppk',
    keyMetricValue: '1,18 / 1,11',
    interpretation: 'Proses sınırda yeterli; merkezleme kayması ve 1 adet aykırı döküm (#2424) giderilirse Cpk 1,40 üzerine çıkar.',
    status: 'Uyarı',
  },
  {
    id: 'an_2',
    title: 'Kok Oranı & Baziklik Çoklu Regresyonu',
    module: 'Regresyon Modülü',
    datasetName: 'Yuksek_Firin_2_Sicak_Metal.xlsx',
    createdAt: 'Bugün 09:40',
    keyMetricLabel: 'R² / p',
    keyMetricValue: '%78,4 / 0,0001',
    interpretation: 'Cüruf bazikliği B2 ve kok oranı sıcak metal silisyumunu anlamlı şekilde açıklamaktadır.',
    status: 'Nominal',
  },
  {
    id: 'an_3',
    title: 'Harman Tipi — Sinter Tambur Dayanımı T-Testi',
    module: 'Hipotez Testleri',
    datasetName: 'Sinter_Tesisi_Tambur_FeO.csv',
    createdAt: 'Dün 16:20',
    keyMetricLabel: 'p-değeri',
    keyMetricValue: '0,0038',
    interpretation: 'Harman-Tip-2 ile Tambur Dayanımı istatistiksel olarak +1,12 puan daha yüksektir.',
    status: 'Nominal',
  },
];

export const INITIAL_ALARMS: SpcAlarm[] = [
  {
    id: 'alm_1',
    chartType: 'I-MR',
    parameter: 'Sicak_Metal_Si_Pct',
    unit: 'Yüksek Fırın #2',
    ruleViolated: 'Kural 1: 3σ kontrol sınırı dışı (UCL = %0,67)',
    pointIndex: 24,
    observedValue: 0.77,
    limitValue: 0.67,
    severity: 'Alarm',
    timestamp: '2026-11-23 08:12',
  },
  {
    id: 'alm_2',
    chartType: 'EWMA (λ=0.2)',
    parameter: 'BOF_Bitis_Sicakligi_C',
    unit: 'Çelikhane BOF-1',
    ruleViolated: 'Küçük ortalama kayması (+9 °C sürüklenme)',
    pointIndex: 38,
    observedValue: 1679.4,
    limitValue: 1676.0,
    severity: 'Uyarı',
    timestamp: '2026-11-23 07:45',
  },
];

export const INITIAL_SUGGESTIONS: AiSuggestion[] = [
  {
    id: 'sug_1',
    title: 'Döküm #2424 Silisyum Sıçraması İçin Kök Neden Regresyonu',
    rationale: 'YF #2 veri setinde 1 aykırı yüksek [Si] değeri ve 1 eksik ölçüm tespit edildi. Robust (Huber) Regresyon ile aykırı değerin model eğimini bozması engellenebilir.',
    targetModule: 'regression',
    priority: 'Yüksek',
  },
  {
    id: 'sug_2',
    title: 'Vardiyalar Arası Cüruf Bazikliği ANOVA Kontrolü',
    rationale: 'Vardiya A, B ve C arasında Rüzgar Sıcaklığı ve [Si] dağılımı farklılık gösteriyor. One-Way ANOVA + Tukey HSD ile vardiya farkı doğrulanmalıdır.',
    targetModule: 'anova',
    priority: 'Orta',
  },
  {
    id: 'sug_3',
    title: 'Süperheat Penceresi İçin Lojistik Kusur Risk Modeli',
    rationale: 'Tandiş süperheat > 26 °C olduğunda yüzey kusuru riski artıyor. Lojistik Regresyon ve EWMA ile erken uyarı eşiği kurulmalıdır.',
    targetModule: 'ml',
    priority: 'Orta',
  },
];

const STORAGE_KEYS = {
  analyses: 'map_analyses_v1',
  projects: 'map_projects_v1',
};

export function loadStoredAnalyses(): AnalysisRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.analyses);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage parse failure
  }
  return INITIAL_ANALYSES;
}

export function saveStoredAnalyses(items: AnalysisRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.analyses, JSON.stringify(items.slice(0, 20)));
  } catch {
    // ignore quota error
  }
}

export function loadStoredProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.projects);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return INITIAL_PROJECTS;
}
