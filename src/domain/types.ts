export type ModuleId =
  | 'dashboard'
  | 'data'
  | 'descriptive'
  | 'hypothesis'
  | 'regression'
  | 'anova'
  | 'spc'
  | 'capability'
  | 'doe'
  | 'reliability'
  | 'sixsigma'
  | 'ml'
  | 'ai'
  | 'steel'
  | 'reports';

export type ColumnDataType = 'numeric' | 'categorical' | 'datetime';

export interface OutlierDetail {
  rowIndex: number;
  value: number;
  method: 'IQR' | 'ModZ';
  zScore: number;
}

export interface ColumnProfile {
  name: string;
  type: ColumnDataType;
  count: number;
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  mean?: number;
  sd?: number;
  min?: number;
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  iqr?: number;
  skewness?: number;
  kurtosis?: number;
  normalityP?: number;
  outliers: OutlierDetail[];
  topCategories?: Array<{ value: string; count: number }>;
}

export type DataRow = Record<string, string | number | null>;

export interface Dataset {
  id: string;
  name: string;
  sourceFormat: 'XLSX' | 'XLS' | 'CSV' | 'TXT' | 'JSON' | 'XML' | 'SAV' | 'Parquet' | 'Sistem';
  createdAt: string;
  rowCount: number;
  columnCount: number;
  columns: ColumnProfile[];
  rows: DataRow[];
  totalMissing: number;
  totalOutliers: number;
  notes?: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  facility: string;
  owner: string;
  phase: 'Tanımlama' | 'Ölçme' | 'Analiz' | 'İyileştirme' | 'Kontrol';
  datasetId: string;
  updatedAt: string;
  status: 'Nominal' | 'Uyarı' | 'Kritik';
}

export interface AnalysisRecord {
  id: string;
  title: string;
  module: string;
  datasetName: string;
  createdAt: string;
  keyMetricLabel: string;
  keyMetricValue: string;
  interpretation: string;
  status: 'Nominal' | 'Uyarı' | 'Alarm';
}

export interface SpcAlarm {
  id: string;
  chartType: string;
  parameter: string;
  unit: string;
  ruleViolated: string;
  pointIndex: number;
  observedValue: number;
  limitValue: number;
  severity: 'Uyarı' | 'Alarm';
  timestamp: string;
}

export interface AiSuggestion {
  id: string;
  title: string;
  rationale: string;
  targetModule: ModuleId;
  priority: 'Yüksek' | 'Orta' | 'Düşük';
}

export interface EducationalGuide {
  id: string;
  title: string;
  neZamanKullanilir: string;
  hangiVeriGerekir: string;
  varsayimlar: string;
  nasilYorumlanir: string;
  yuksekFiriniOrnegi: string;
}

export interface AiAnalysisResponse {
  ozetYorum: string;
  veriKalitesiDegerlendirmesi: string;
  onerilenAnalizler: Array<{
    analizAdi: string;
    modul: string;
    nedenOnerildi: string;
    beklenenCikti: string;
    oncelik: string;
  }>;
  prosesAksiyonlari: string[];
}
