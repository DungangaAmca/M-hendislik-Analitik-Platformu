import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { AiAnalysisResponse, AnalysisRecord, Dataset } from '../domain/types';

interface AiEngineViewProps {
  dataset: Dataset;
  onRecordAnalysis: (rec: AnalysisRecord) => void;
}

export const AiEngineView: React.FC<AiEngineViewProps> = ({ dataset, onRecordAnalysis }) => {
  const [prompt, setPrompt] = useState<string>('Bu veriyi analiz et');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (customPrompt?: string) => {
    setLoading(true);
    setError(null);
    const query = customPrompt ?? prompt;

    try {
      const colSummary = dataset.columns.map((c) => ({
        name: c.name,
        type: c.type,
        count: c.count,
        missingCount: c.missingCount,
        mean: c.mean,
        sd: c.sd,
        median: c.median,
        outliers: c.outliers.length,
        normalityP: c.normalityP,
      }));

      const resp = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName: dataset.name,
          rowCount: dataset.rowCount,
          columns: colSummary,
          sampleRows: dataset.rows.slice(0, 5),
          userPrompt: query,
          recentFindings: {
            totalMissing: dataset.totalMissing,
            totalOutliers: dataset.totalOutliers,
          },
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Yapay zeka analizi başarısız oldu.');
      }

      setResult(data as AiAnalysisResponse);
      onRecordAnalysis({
        id: `an_${Date.now()}`,
        title: `AI Analiz Motoru — ${dataset.name}`,
        module: 'AI Analiz Motoru',
        datasetName: dataset.name,
        createdAt: 'Az önce',
        keyMetricLabel: 'Öneri Sayısı',
        keyMetricValue: `${(data.onerilenAnalizler ?? []).length} analiz`,
        interpretation: data.ozetYorum ?? 'Yapay zeka analizi tamamlandı.',
        status: dataset.totalOutliers > 0 ? 'Uyarı' : 'Nominal',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sunucu bağlantısı kurulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Analiz Motoru</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Aktif Veri Seti: <strong>{dataset.name}</strong> ({dataset.rowCount} satır, {dataset.columnCount} sütun) · Otomatik tip tanıma, eksik/aykırı tarama ve Türkçe istatistik danışmanı
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAnalyze('Bu veriyi analiz et')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{loading ? 'Analiz Ediliyor...' : 'Bu veriyi analiz et'}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAnalyze();
            }}
            placeholder="Sorunuzu Türkçe yazın (ör. Bu veride [Si] yükselmesinin nedenini nasıl test etmeliyim?)"
            className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md"
          />
          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-md cursor-pointer disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Soruyu Gönder</span>
          </button>
        </div>

        {/* Immediate Automatic Profile Snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
            <div className="text-slate-500">Tanınan Sayısal / Kategorik</div>
            <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
              {dataset.columns.filter((c) => c.type === 'numeric').length} / {dataset.columns.filter((c) => c.type !== 'numeric').length}
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
            <div className="text-slate-500">Eksik Hücre Sayısı</div>
            <div className="font-mono font-semibold text-amber-600 mt-0.5">{dataset.totalMissing}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
            <div className="text-slate-500">Aykırı Gözlem (IQR/Mod-Z)</div>
            <div className="font-mono font-semibold text-red-600 mt-0.5">{dataset.totalOutliers}</div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md">
            <div className="text-slate-500">Normal Dağılmayan Sütun</div>
            <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
              {dataset.columns.filter((c) => c.normalityP !== undefined && c.normalityP < 0.05).length} sütun
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-md">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                Türkçe Mühendislik Özeti ve Yorum
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {result.ozetYorum}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-800">
                Veri Kalitesi, Eksik ve Aykırı Değer Değerlendirmesi
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {result.veriKalitesiDegerlendirmesi}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
              Önerilen İstatistiksel Analizler ve Gerekçeleri
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {(result.onerilenAnalizler ?? []).map((item, idx) => (
                <div key={idx} className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.analizAdi} <span className="text-slate-400 font-normal">· {item.modul}</span>
                    </span>
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">{item.oncelik}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Neden önerildi: </strong>
                    {item.nedenOnerildi}
                  </p>
                  <p className="text-xs text-slate-500">
                    <strong>Beklenen çıktı: </strong>
                    {item.beklenenCikti}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {(result.prosesAksiyonlari ?? []).length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Önerilen Proses Aksiyonları</h3>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                {result.prosesAksiyonlari.map((act, i) => (
                  <li key={i}>• {act}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
