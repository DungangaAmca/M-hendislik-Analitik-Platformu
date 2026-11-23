import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileOutput,
  Flame,
  FlaskConical,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Layers,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
} from 'lucide-react';
import {
  AnalysisRecord,
  Dataset,
  ModuleId,
  ProjectRecord,
  SpcAlarm,
} from './domain/types';
import {
  INITIAL_ALARMS,
  INITIAL_DATASETS,
  INITIAL_SUGGESTIONS,
  loadStoredAnalyses,
  loadStoredProjects,
  saveStoredAnalyses,
} from './repositories/datasetRepository';
import { AiEngineView } from './views/AiEngineView';
import { AnovaView } from './views/AnovaView';
import { DashboardView } from './views/DashboardView';
import { DataCenterView } from './views/DataCenterView';
import { DescriptiveView } from './views/DescriptiveView';
import { DoeReliabilityView } from './views/DoeReliabilityView';
import { HypothesisView } from './views/HypothesisView';
import { MachineLearningView } from './views/MachineLearningView';
import { RegressionView } from './views/RegressionView';
import { ReportingView } from './views/ReportingView';
import { SixSigmaView } from './views/SixSigmaView';
import { SpcCapabilityView } from './views/SpcCapabilityView';
import { SteelPackagesView } from './views/SteelPackagesView';

interface NavGroup {
  groupLabel: string;
  items: Array<{ id: ModuleId; label: string; icon: React.ComponentType<{ className?: string }> }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupLabel: 'Genel Bakış',
    items: [
      { id: 'dashboard', label: 'Kontrol Paneli', icon: LayoutDashboard },
      { id: 'data', label: 'Veri Yönetim Merkezi', icon: Database },
      { id: 'ai', label: 'AI Analiz Motoru', icon: Sparkles },
    ],
  },
  {
    groupLabel: 'İstatistik & Modelleme',
    items: [
      { id: 'descriptive', label: 'Tanımlayıcı İstatistik', icon: BarChart3 },
      { id: 'hypothesis', label: 'Hipotez Testleri', icon: CheckCircle2 },
      { id: 'regression', label: 'Regresyon Modülü', icon: TrendingUp },
      { id: 'anova', label: 'ANOVA & GLM', icon: Layers },
    ],
  },
  {
    groupLabel: 'Kalite & Güvenilirlik',
    items: [
      { id: 'spc', label: 'SPC Merkezi', icon: Activity },
      { id: 'capability', label: 'Capability (Cp/Cpk)', icon: Gauge },
      { id: 'doe', label: 'DOE Deney Tasarımı', icon: FlaskConical },
      { id: 'reliability', label: 'Güvenilirlik (Weibull)', icon: ShieldCheck },
      { id: 'sixsigma', label: 'Altı Sigma (DMAIC)', icon: GitBranch },
    ],
  },
  {
    groupLabel: 'Endüstriyel AI & Rapor',
    items: [
      { id: 'ml', label: 'Makine Öğrenmesi', icon: BrainCircuit },
      { id: 'steel', label: 'Demir Çelik Paketleri', icon: Flame },
      { id: 'reports', label: 'Raporlama Sistemi', icon: FileOutput },
    ],
  },
];

const MODULE_TITLES: Record<ModuleId, string> = {
  dashboard: 'Kontrol Paneli',
  data: 'Veri Yönetim Merkezi',
  descriptive: 'Tanımlayıcı İstatistikler',
  hypothesis: 'Hipotez Testleri',
  regression: 'Regresyon Modülü',
  anova: 'ANOVA Modülü',
  spc: 'SPC Merkezi',
  capability: 'Capability Modülü',
  doe: 'DOE Deney Tasarımı',
  reliability: 'Güvenilirlik Modülü',
  sixsigma: 'Altı Sigma Modülü',
  ml: 'Machine Learning & AutoML',
  ai: 'AI Analiz Motoru',
  steel: 'Demir Çelik Hazır Paketleri',
  reports: 'Raporlama Sistemi',
};

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [datasets, setDatasets] = useState<Dataset[]>(INITIAL_DATASETS);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(INITIAL_DATASETS[0].id);
  const [projects] = useState<ProjectRecord[]>(loadStoredProjects);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>(loadStoredAnalyses);
  const [alarms] = useState<SpcAlarm[]>(INITIAL_ALARMS);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [darkMode]);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId) ?? datasets[0];

  const handleAddDataset = (ds: Dataset) => {
    setDatasets((prev) => [ds, ...prev]);
    setActiveDatasetId(ds.id);
  };

  const handleRecordAnalysis = (rec: AnalysisRecord) => {
    setAnalyses((prev) => {
      const next = [rec, ...prev].slice(0, 20);
      saveStoredAnalyses(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Sidebar Navigation (256px) */}
      <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="h-14 px-5 flex items-center border-b border-slate-200 dark:border-slate-800">
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            MAP Analitik
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.groupLabel}>
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {group.groupLabel}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveModule(item.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb left · Dataset & Primary Action right */}
        <header className="h-14 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-8 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 min-w-0">
            <span className="whitespace-nowrap">Mühendislik Analitik Platformu</span>
            <span aria-hidden="true">/</span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {MODULE_TITLES[activeModule]}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              aria-label="Aktif Veri Seti"
              value={activeDataset.id}
              onChange={(e) => setActiveDatasetId(e.target.value)}
              className="max-w-[220px] truncate px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              aria-label="Tema Değiştir"
              className="p-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setActiveModule('ai')}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI ile Analiz Et
            </button>
          </div>
        </header>

        {/* Viewport Workspace */}
        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto">
          {activeModule === 'dashboard' && (
            <DashboardView
              datasets={datasets}
              activeDataset={activeDataset}
              projects={projects}
              analyses={analyses}
              alarms={alarms}
              suggestions={INITIAL_SUGGESTIONS}
              onSelectDataset={setActiveDatasetId}
              onNavigate={setActiveModule}
            />
          )}
          {activeModule === 'data' && (
            <DataCenterView
              datasets={datasets}
              activeDataset={activeDataset}
              onSelectDataset={setActiveDatasetId}
              onAddDataset={handleAddDataset}
            />
          )}
          {activeModule === 'descriptive' && (
            <DescriptiveView dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'hypothesis' && (
            <HypothesisView dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'regression' && (
            <RegressionView dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'anova' && (
            <AnovaView dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'spc' && (
            <SpcCapabilityView mode="spc" dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'capability' && (
            <SpcCapabilityView mode="capability" dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'doe' && (
            <DoeReliabilityView mode="doe" dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'reliability' && (
            <DoeReliabilityView mode="reliability" dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'sixsigma' && <SixSigmaView />}
          {activeModule === 'ml' && (
            <MachineLearningView dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'ai' && (
            <AiEngineView dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'steel' && (
            <SteelPackagesView dataset={activeDataset} onRecordAnalysis={handleRecordAnalysis} />
          )}
          {activeModule === 'reports' && (
            <ReportingView dataset={activeDataset} analyses={analyses} alarms={alarms} />
          )}
        </main>
      </div>
    </div>
  );
}
