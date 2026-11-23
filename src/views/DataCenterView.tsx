import React, { useRef, useState } from 'react';
import { FileSpreadsheet, Search, Upload } from 'lucide-react';
import { Dataset } from '../domain/types';
import { parseUploadedFile } from '../engines/fileParser';

interface DataCenterViewProps {
  datasets: Dataset[];
  activeDataset: Dataset;
  onSelectDataset: (id: string) => void;
  onAddDataset: (ds: Dataset) => void;
}

export const DataCenterView: React.FC<DataCenterViewProps> = ({
  datasets,
  activeDataset,
  onSelectDataset,
  onAddDataset,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'missing_outlier' | 'grid'>('profile');

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const ds = await parseUploadedFile(files[0]);
      onAddDataset(ds);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Dosya okunurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = activeDataset.rows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header & File Upload Dropzone */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Veri Yönetim Merkezi</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Desteklenen formatlar: XLSX, XLS, CSV, TXT, JSON, XML, SAV (SPSS), Parquet · Yükleme sonrası otomatik profilleme
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={activeDataset.id}
              onChange={(e) => onSelectDataset(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.rowCount}×{d.columnCount})
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt,.json,.xml,.sav,.parquet"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{loading ? 'İşleniyor...' : 'Dosya Yükle'}</span>
            </button>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="mt-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-md p-4 bg-slate-50/70 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <FileSpreadsheet className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
            <span>
              Mühendislik dosyanızı buraya sürükleyip bırakın. Sistem otomatik olarak <strong>eksik değer analizi</strong>,{' '}
              <strong>aykırı değer tespiti</strong> ve <strong>sütun profili</strong> oluşturacaktır.
            </span>
          </div>
          <span className="text-xs font-mono text-slate-500 shrink-0">
            Format: {activeDataset.sourceFormat}
          </span>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        {[
          { id: 'profile', label: 'Sütun Profili' },
          { id: 'missing_outlier', label: `Eksik & Aykırı Analizi (${activeDataset.totalMissing + activeDataset.totalOutliers})` },
          { id: 'grid', label: `Veri Tablosu (${activeDataset.rowCount} satır)` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === t.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Column Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left py-2.5 px-4 font-semibold">Sütun Adı</th>
                  <th className="text-left py-2.5 px-3 font-semibold">Veri Tipi</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Gözlem (n)</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Eksik</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Ortalama</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Std. Sapma</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Min / Medyan / Max</th>
                  <th className="text-right py-2.5 px-3 font-semibold">Normallik (p)</th>
                  <th className="text-right py-2.5 px-4 font-semibold">Aykırı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeDataset.columns.map((col) => (
                  <tr key={col.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{col.name}</td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {col.type === 'numeric' ? 'Sayısal' : col.type === 'datetime' ? 'Tarih/Zaman' : 'Kategorik'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">{col.count}</td>
                    <td className={`py-2.5 px-3 text-right font-mono tabular-nums ${col.missingCount > 0 ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                      {col.missingCount} (%{col.missingPct.toFixed(1)})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {col.mean !== undefined ? col.mean.toFixed(3) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {col.sd !== undefined ? col.sd.toFixed(3) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {col.min !== undefined
                        ? `${col.min.toFixed(2)} / ${col.median?.toFixed(2)} / ${col.max?.toFixed(2)}`
                        : `${col.uniqueCount} benzersiz sınıf`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {col.normalityP !== undefined ? (
                        <span className={col.normalityP < 0.05 ? 'text-amber-600' : 'text-emerald-700 dark:text-emerald-400'}>
                          {col.normalityP.toFixed(3)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono tabular-nums ${col.outliers.length > 0 ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                      {col.outliers.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Missing & Outlier Diagnostics */}
      {activeTab === 'missing_outlier' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
              Eksik Değer Analizi
            </h3>
            <div className="space-y-2.5">
              {activeDataset.columns.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{c.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${Math.min(100, c.missingPct)}%` }}
                      />
                    </div>
                    <span className="font-mono tabular-nums w-20 text-right">
                      {c.missingCount} (%{c.missingPct.toFixed(1)})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
              Aykırı Değer Analizi (1,5×IQR ve Modifiye Z-Skoru)
            </h3>
            {activeDataset.totalOutliers === 0 ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Aktif veri setinde istatistiksel aykırı değer tespit edilmedi.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="text-left py-1.5 font-medium">Değişken</th>
                      <th className="text-right py-1.5 font-medium">Satır #</th>
                      <th className="text-right py-1.5 font-medium">Değer</th>
                      <th className="text-right py-1.5 font-medium">Mod-Z</th>
                      <th className="text-right py-1.5 font-medium">Yöntem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeDataset.columns.flatMap((c) =>
                      c.outliers.map((out, idx) => (
                        <tr key={`${c.name}_${idx}`}>
                          <td className="py-1.5 font-medium text-slate-900 dark:text-slate-100">{c.name}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">{out.rowIndex}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums text-red-600">{out.value}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">{out.zScore.toFixed(2)}</td>
                          <td className="py-1.5 text-right font-mono">{out.method}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Data Grid */}
      {activeTab === 'grid' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tabloda ara..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md"
              />
            </div>
            <span className="text-xs font-mono text-slate-500">
              Gösterilen: {Math.min(100, filteredRows.length)} / {filteredRows.length} satır
            </span>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold text-slate-500">#</th>
                  {activeDataset.columns.map((c) => (
                    <th key={c.name} className="py-2 px-3 text-left font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.slice(0, 100).map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-3 font-mono text-slate-400 tabular-nums">{idx + 1}</td>
                    {activeDataset.columns.map((c) => {
                      const val = row[c.name];
                      return (
                        <td
                          key={c.name}
                          className={`py-1.5 px-3 whitespace-nowrap ${
                            typeof val === 'number' ? 'font-mono tabular-nums text-right' : 'text-left'
                          } ${val === null ? 'text-amber-600 italic' : 'text-slate-800 dark:text-slate-200'}`}
                        >
                          {val === null ? 'Eksik' : String(val)}
                        </td>
                      );
                    })}
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
