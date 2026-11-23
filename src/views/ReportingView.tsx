import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Presentation, Printer, Sparkles } from 'lucide-react';
import { AnalysisRecord, Dataset, SpcAlarm } from '../domain/types';
import {
  exportExcelReport,
  exportPdfReport,
  exportPowerPointReport,
  exportWordReport,
} from '../engines/reportExporter';

interface ReportingViewProps {
  dataset: Dataset;
  analyses: AnalysisRecord[];
  alarms: SpcAlarm[];
}

export const ReportingView: React.FC<ReportingViewProps> = ({ dataset, analyses, alarms }) => {
  const [title, setTitle] = useState('Entegre Demir Çelik Proses ve Kalite Analitik Raporu');
  const [facility, setFacility] = useState('Yüksek Fırınlar & Çelikhane Direktörlüğü');
  const [author, setAuthor] = useState('Mühendislik Analitik Ekibi');
  const [summary, setSummary] = useState(
    `Bu çalışma kapsamında ${dataset.name} veri seti (${dataset.rowCount} satır, ${dataset.columnCount} değişken) üzerinde istatistiksel proses kontrol (SPC), yeterlilik ve çok değişkenli analizler yürütülmüştür.\n` +
      `Veri kalitesi taramasında ${dataset.totalMissing} eksik hücre ve ${dataset.totalOutliers} istatistiksel aykırı değer tespit edilmiştir. Aktif SPC izlemelerinde ${alarms.length} adet kontrol dışı alarm kaydı bulunmaktadır.\n` +
      `Yürütülen ${analyses.length} adet analiz bulgusu doğrultusunda proses merkezleme ve baziklik kontrolünün standartlaştırılması önerilmektedir.`
  );
  const [aiBusy, setAiBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const generateAiSummary = async () => {
    setAiBusy(true);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/ai/executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectTitle: title, analyses, spcAlarms: alarms }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Yönetici özeti üretilemedi.');
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'AI özet hatası.');
    } finally {
      setAiBusy(false);
    }
  };

  const payload = {
    title,
    facility,
    author,
    executiveSummary: summary,
    dataset,
    analyses,
    alarms,
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Raporlama ve Yönetici Sunumu Sistemi</h2>
            <p className="text-xs text-slate-500 mt-0.5">Word (.docx), PDF (.pdf), Excel (.xlsx) ve PowerPoint (.pptx) çıktı motoru</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportWordReport(payload)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word (.docx)</span>
            </button>
            <button
              type="button"
              onClick={() => exportPdfReport(payload)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF (.pdf)</span>
            </button>
            <button
              type="button"
              onClick={() => exportExcelReport(payload)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => exportPowerPointReport(payload)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-md cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5" />
              <span>PowerPoint (.pptx)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Rapor Başlığı</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tesis / Direktörlük</label>
            <input
              type="text"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hazırlayan</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-500">Türkçe Yönetici Özeti</label>
            <button
              type="button"
              onClick={generateAiSummary}
              disabled={aiBusy}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiBusy ? 'AI Yazıyor...' : 'Yapay Zeka ile Yönetici Özeti Üret'}</span>
            </button>
          </div>
          <textarea
            rows={5}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full p-3 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
          />
        </div>

        {statusMsg && <div className="p-2.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded">{statusMsg}</div>}
      </div>

      {/* Live Print Preview Sheet */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-5">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">MÜHENDİSLİK ANALİTİK PLATFORMU (MAP)</div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">{title}</h3>
          <div className="text-xs text-slate-500 mt-1">
            {facility} · {author} · {new Date().toLocaleDateString('tr-TR')}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">1. Yönetici Özeti</h4>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{summary}</p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
            2. Dahil Edilen Analiz Kayıtları ({analyses.length})
          </h4>
          <table className="w-full text-xs border border-slate-200 dark:border-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="py-2 px-3 text-left">Analiz</th>
                <th className="py-2 px-3 text-left">Modül</th>
                <th className="py-2 px-3 text-right">Temel Metrik</th>
                <th className="py-2 px-3 text-left">Yorum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analyses.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 px-3 font-medium">{a.title}</td>
                  <td className="py-2 px-3 text-slate-500">{a.module}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">{a.keyMetricValue}</td>
                  <td className="py-2 px-3">{a.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
