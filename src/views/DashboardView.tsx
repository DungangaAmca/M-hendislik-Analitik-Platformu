import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Database,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import {
  AiSuggestion,
  AnalysisRecord,
  Dataset,
  ModuleId,
  ProjectRecord,
  SpcAlarm,
} from '../domain/types';

interface DashboardViewProps {
  datasets: Dataset[];
  activeDataset: Dataset;
  projects: ProjectRecord[];
  analyses: AnalysisRecord[];
  alarms: SpcAlarm[];
  suggestions: AiSuggestion[];
  onSelectDataset: (id: string) => void;
  onNavigate: (module: ModuleId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  datasets,
  activeDataset,
  projects,
  analyses,
  alarms,
  suggestions,
  onSelectDataset,
  onNavigate,
}) => {
  const numericCols = activeDataset.columns.filter((c) => c.type === 'numeric');
  const missingRate =
    activeDataset.rowCount * activeDataset.columnCount > 0
      ? ((activeDataset.totalMissing / (activeDataset.rowCount * activeDataset.columnCount)) * 100).toFixed(2)
      : '0.00';

  return (
    <div className="space-y-6">
      {/* Top Corporate Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Aktif Veri Seti</div>
          <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white truncate">{activeDataset.name}</div>
          <div className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
            {activeDataset.rowCount} satır · {activeDataset.columnCount} sütun
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Yürütülen Analizler</div>
          <div className="mt-1 text-2xl font-semibold font-mono text-slate-900 dark:text-white tabular-nums">{analyses.length}</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Son oturum kayıtları</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Aktif SPC Alarmları</div>
          <div className="mt-1 text-2xl font-semibold font-mono text-red-600 dark:text-red-400 tabular-nums">{alarms.length}</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">Western Electric & Sınır Dışı</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Veri Bütünlüğü</div>
          <div className="mt-1 text-2xl font-semibold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
            %{(100 - Number(missingRate)).toFixed(2)}
          </div>
          <div className="mt-1 text-xs font-mono text-slate-600 dark:text-slate-400 tabular-nums">
            {activeDataset.totalMissing} eksik · {activeDataset.totalOutliers} aykırı
          </div>
        </div>
      </div>

      {/* Primary Row: Son Projeler & Veri Durumu */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Card 1: Son Projeler */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Son Projeler</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('sixsigma')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>DMAIC Merkezi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-2 font-medium">Proje Adı</th>
                  <th className="pb-2 font-medium">Birim</th>
                  <th className="pb-2 font-medium">DMAIC Fazı</th>
                  <th className="pb-2 font-medium text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {projects.map((prj) => (
                  <tr
                    key={prj.id}
                    onClick={() => {
                      onSelectDataset(prj.datasetId);
                      onNavigate('sixsigma');
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{prj.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {prj.owner} · {prj.updatedAt}
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-xs text-slate-600 dark:text-slate-300">{prj.facility}</td>
                    <td className="py-3 pr-3 text-xs font-medium text-slate-700 dark:text-slate-200">{prj.phase}</td>
                    <td className="py-3 text-right text-xs font-medium">
                      <span
                        className={
                          prj.status === 'Nominal'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : prj.status === 'Uyarı'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-red-700 dark:text-red-400'
                        }
                      >
                        {prj.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Card 2: Veri Durumu */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Veri Durumu</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('data')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Veri Yükle / İncele</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Yüklü Veri Seti Sayısı</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">{datasets.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Sayısal / Kategorik Değişken</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">
                {numericCols.length} / {activeDataset.columnCount - numericCols.length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Eksik Hücre Oranı</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-white">%{missingRate}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span>Otomatik Aykırı Gözlem (IQR/Mod-Z)</span>
              <span className="font-mono font-semibold text-amber-700 dark:text-amber-400">
                {activeDataset.totalOutliers} kayıt
              </span>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 mb-2">Hızlı Veri Seti Seçimi</div>
              <div className="space-y-1.5">
                {datasets.map((ds) => (
                  <button
                    key={ds.id}
                    type="button"
                    onClick={() => onSelectDataset(ds.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs rounded-md border transition-colors cursor-pointer ${
                      ds.id === activeDataset.id
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 text-slate-900 dark:text-white font-medium'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="truncate pr-2">{ds.name}</span>
                    <span className="font-mono text-slate-500 shrink-0">
                      {ds.rowCount}×{ds.columnCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Secondary Row: Son Analizler, SPC Alarmları, Yapay Zeka Önerileri */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 3: Son Analizler */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Son Analizler</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Raporla
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {analyses.slice(0, 4).map((an) => (
              <div key={an.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{an.title}</div>
                  <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                    {an.keyMetricValue}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {an.module} · {an.createdAt}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{an.interpretation}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Card 4: SPC Alarmları */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">SPC Alarmları</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('spc')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              SPC Merkezi
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {alarms.map((al) => (
              <div key={al.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-900 dark:text-white font-mono">{al.parameter}</span>
                  <span
                    className={`text-xs font-semibold ${
                      al.severity === 'Alarm' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {al.severity}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {al.unit} · {al.chartType} · Nokta #{al.pointIndex}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{al.ruleViolated}</p>
                <div className="text-xs font-mono text-slate-500 mt-1 tabular-nums">
                  Gözlenen: {al.observedValue} / Sınır: {al.limitValue}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Card 5: Yapay Zeka Önerileri */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Yapay Zeka Önerileri</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ai')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI Motoru
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {suggestions.map((sug) => (
              <div key={sug.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{sug.title}</div>
                  <span
                    className={`text-xs font-semibold shrink-0 ${
                      sug.priority === 'Yüksek' ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    {sug.priority} Öncelik
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{sug.rationale}</p>
                <button
                  type="button"
                  onClick={() => onNavigate(sug.targetModule)}
                  className="mt-2 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Modülü Aç</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
