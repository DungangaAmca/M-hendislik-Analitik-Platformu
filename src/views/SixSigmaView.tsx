import React, { useState } from 'react';
import { HelpTooltip } from '../components/HelpTooltip';
import { IshikawaDiagram, ParetoChart } from '../components/Charts';

type SixSigmaTab = 'dmaic' | 'sipoc' | 'voc_ctq' | 'pareto' | 'ishikawa' | 'fmea' | 'control_plan';

interface FmeaItem {
  id: number;
  processStep: string;
  failureMode: string;
  effect: string;
  severity: number;
  occurrence: number;
  detection: number;
  action: string;
}

export const SixSigmaView: React.FC = () => {
  const [tab, setTab] = useState<SixSigmaTab>('dmaic');

  // DMAIC
  const [dmaicPhases, setDmaicPhases] = useState([
    { phase: 'D — Tanımlama (Define)', owner: 'Dr. Hakan Demir', deliverable: 'Proje Beratı & SIPOC', progress: 100, status: 'Tamamlandı' },
    { phase: 'M — Ölçme (Measure)', owner: 'Elif Kaya', deliverable: 'Gage R&R (%11,2) & Başlangıç Cpk (1,18)', progress: 100, status: 'Tamamlandı' },
    { phase: 'A — Analiz (Analyze)', owner: 'Murat Yılmaz', deliverable: 'Ishikawa 6M & Çoklu Regresyon Kök Neden', progress: 80, status: 'Devam Ediyor' },
    { phase: 'I — İyileştirme (Improve)', owner: 'Dr. Hakan Demir', deliverable: 'Taguchi L9 Optimum Baziklik Ayarı', progress: 45, status: 'Devam Ediyor' },
    { phase: 'C — Kontrol (Control)', owner: 'Elif Kaya', deliverable: 'EWMA Kontrol Planı & SOP Güncelleme', progress: 20, status: 'Planlandı' },
  ]);

  // Pareto
  const [paretoItems, setParetoItems] = useState([
    { label: 'Yüksek [Si] Sıçraması', count: 42 },
    { label: 'Cüruf Baziklik Sapması', count: 29 },
    { label: 'Yüksek [S] Kükürt', count: 16 },
    { label: 'Düşük Metal Sıcaklığı', count: 9 },
    { label: 'Tüyer Nem Dalgalanması', count: 5 },
    { label: 'Diğer', count: 3 },
  ]);
  const [newParetoLabel, setNewParetoLabel] = useState('');
  const [newParetoCount, setNewParetoCount] = useState(10);

  // Ishikawa
  const [problem, setProblem] = useState('Yüksek Fırın Sıcak Metal [Si] > %0,65 Sapması');
  const [causes, setCauses] = useState<Record<string, string[]>>({
    'İnsan (Man)': ['Vardiya devir iletişim eksiği', 'Manuel numune zamanlaması'],
    'Makine (Machine)': ['Tüyer soğutma sızıntısı', 'PCI enjeksiyon nozul aşınması'],
    'Malzeme (Material)': ['Kok nem dalgalanması', 'Sinter FeO değişkenliği'],
    'Yöntem (Method)': ['Baziklik düzeltme gecikmesi', 'Döküm açma aralığı farkı'],
    'Ölçüm (Measurement)': ['XRF spektrometre kalibrasyon kayması', 'Pirometre cüruf etkisi'],
    'Çevre (Environment)': ['Hava nemi artışı', 'Ham madde stok sahası yağışı'],
  });

  // FMEA
  const [fmeaList, setFmeaList] = useState<FmeaItem[]>([
    {
      id: 1,
      processStep: 'Cüruf Baziklik Kontrolü',
      failureMode: 'B2 < 1,10 (Asidik cüruf)',
      effect: 'Sıcak metal kükürt [S] artışı ve çelikhane maliyet artışı',
      severity: 8,
      occurrence: 4,
      detection: 4,
      action: 'Vardiya başı kireçtaşı şarj düzeltme çizelgesi ve anlık XRF alarmı',
    },
    {
      id: 2,
      processStep: 'PCI Kömür Enjeksiyonu',
      failureMode: 'Enjeksiyon debisinde ani düşüş',
      effect: 'RAFT yükselmesi ve sıcak metal [Si] sıçraması',
      severity: 7,
      occurrence: 5,
      detection: 3,
      action: 'Diferansiyel basınç sensörü ile tıkanma erken uyarısı',
    },
    {
      id: 3,
      processStep: 'BOF Konvertör Üfleme',
      failureMode: 'Son nokta sıcaklık > 1690 °C',
      effect: 'Refrakter aşınması ve tandiş süperheat yükselmesi',
      severity: 8,
      occurrence: 3,
      detection: 3,
      action: 'Sub-lance dinamik model kalibrasyonu',
    },
  ]);

  // Control Plan
  const [controlRows] = useState([
    { param: 'Sıcak Metal [Si]', spec: '0,35 – 0,65 %', method: 'XRF Spektrometre', freq: 'Her Döküm', chart: 'I-MR / Capability', reaction: 'Kok/Cevher oranını %1 ayarla' },
    { param: 'Cüruf Baziklik (B2)', spec: '1,12 – 1,24', method: 'XRF Cüruf Analizi', freq: '2 Saatte 1', chart: 'EWMA (λ=0,2)', reaction: 'Kireçtaşı şarjını düzelt' },
    { param: 'Tandiş Süperheat', spec: '15 – 30 °C', method: 'Sürekli Termokupl', freq: 'Sürekli', chart: 'Xbar-R (n=5)', reaction: 'Döküm hızını ±0,1 m/dk ayarla' },
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Altı Sigma (Six Sigma) Yönetim Merkezi</h2>
            <p className="text-xs text-slate-500 mt-0.5">DMAIC, SIPOC, VOC → CTQ, Pareto, Ishikawa 6M, FMEA (RPN) ve Kontrol Planı</p>
          </div>
          <HelpTooltip guideKey="sixsigma" />
        </div>

        <div className="flex flex-wrap gap-1.5 pt-4">
          {[
            { id: 'dmaic', label: 'DMAIC Takibi' },
            { id: 'sipoc', label: 'SIPOC Diyagramı' },
            { id: 'voc_ctq', label: 'VOC & CTQ Ağacı' },
            { id: 'pareto', label: 'Pareto (80/20)' },
            { id: 'ishikawa', label: 'Ishikawa (Balık Kılçığı)' },
            { id: 'fmea', label: 'FMEA (RPN Hesabı)' },
            { id: 'control_plan', label: 'Kontrol Planı' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as SixSigmaTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === t.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* DMAIC */}
      {tab === 'dmaic' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">DMAIC Faz İlerleyişi</h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {dmaicPhases.map((p, idx) => (
              <div key={p.phase} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">{p.phase}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Sorumlu: {p.owner} · Çıktı: {p.deliverable}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={p.progress}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const next = [...dmaicPhases];
                      next[idx] = {
                        ...p,
                        progress: val,
                        status: val === 100 ? 'Tamamlandı' : val > 0 ? 'Devam Ediyor' : 'Planlandı',
                      };
                      setDmaicPhases(next);
                    }}
                    className="w-32"
                  />
                  <span className="font-mono text-xs w-12 text-right font-semibold">%{p.progress}</span>
                  <span className="text-xs font-medium w-24 text-right text-slate-600 dark:text-slate-300">{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIPOC */}
      {tab === 'sipoc' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
            SIPOC Süreç Haritası — Yüksek Fırın Sıcak Metal Üretimi
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 text-xs">
            {[
              { title: 'S — Tedarikçiler', items: ['Sinter Tesisi #1', 'Kok Fabrikası', 'Pelet / Parça Cevher', 'Kireçtaşı Ocağı', 'Oksijen Tesisi'] },
              { title: 'I — Girdiler', items: ['Sinter (Fe %57)', 'Metalürjik Kok & PCI', 'Ön Isıtılmış Rüzgar (1180 °C)', 'Kireçtaşı & Dolomit', 'O₂ Zenginleştirme'] },
              { title: 'P — Süreç Adımları', items: ['1. Hammadde Şarjı', '2. İndirgeme & Ergitme', '3. Cüruf Oluşumu', '4. Döküm Açma (Tap)', '5. Torpido ile Çelikhane'] },
              { title: 'O — Çıktılar', items: ['Sıcak Metal (1490 °C)', 'Granüle Yüksek Fırın Cürufu', 'Yüksek Fırın Gazı (BFG)', 'Baca Tozu'] },
              { title: 'C — Müşteriler', items: ['BOF Çelikhane', 'Kükürt Giderme İstasyonu', 'Çimento Öğütme (Cüruf)', 'Enerji Santrali (BFG)'] },
            ].map((col) => (
              <div key={col.title} className="p-4 space-y-2">
                <div className="font-semibold text-blue-700 dark:text-blue-400 pb-2 border-b border-slate-100 dark:border-slate-800">
                  {col.title}
                </div>
                <ul className="space-y-1.5 text-slate-700 dark:text-slate-300">
                  {col.items.map((it) => (
                    <li key={it}>• {it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VOC -> CTQ */}
      {tab === 'voc_ctq' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
            Müşteri Sesi (VOC) → Kalite İçin Kritik (CTQ) Çevrim Matrisi
          </h3>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2 px-3 text-left">Müşteri Sesi (VOC)</th>
                <th className="py-2 px-3 text-left">Temel İhtiyaç (Driver)</th>
                <th className="py-2 px-3 text-left">CTQ Parametresi</th>
                <th className="py-2 px-3 text-right">Hedef / Spec Sınırı</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <tr>
                <td className="py-2.5 px-3 font-medium">BOF konvertörde düşük kireç tüketimi ve kararlı üfleme</td>
                <td className="py-2.5 px-3">Düşük ve kararlı sıcak metal silisyumu</td>
                <td className="py-2.5 px-3 font-semibold text-blue-700 dark:text-blue-400">Sıcak Metal [Si] %</td>
                <td className="py-2.5 px-3 text-right font-mono">%0,35 – %0,65 (Cpk ≥ 1,33)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Yüksek mukavemetli çelikte düşük kükürt</td>
                <td className="py-2.5 px-3">Etkin kükürt tutumu</td>
                <td className="py-2.5 px-3 font-semibold text-blue-700 dark:text-blue-400">Sıcak Metal [S] %</td>
                <td className="py-2.5 px-3 text-right font-mono">≤ %0,035</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">Hadde bobinlerde dar kalınlık toleransı</td>
                <td className="py-2.5 px-3">Kararlı son haddeleme sıcaklığı</td>
                <td className="py-2.5 px-3 font-semibold text-blue-700 dark:text-blue-400">Kalınlık Sapması</td>
                <td className="py-2.5 px-3 text-right font-mono">±0,050 mm</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Pareto */}
      {tab === 'pareto' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Pareto Analizi (%80 / %20 Kök Neden Önceliklendirme)</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Hata türü..."
                value={newParetoLabel}
                onChange={(e) => setNewParetoLabel(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
              />
              <input
                type="number"
                min={1}
                value={newParetoCount}
                onChange={(e) => setNewParetoCount(Number(e.target.value))}
                className="w-16 px-2 py-1 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newParetoLabel.trim()) return;
                  setParetoItems((prev) => [...prev, { label: newParetoLabel.trim(), count: Math.max(1, newParetoCount) }]);
                  setNewParetoLabel('');
                }}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-700 rounded cursor-pointer"
              >
                Ekle
              </button>
            </div>
          </div>
          <ParetoChart items={paretoItems} />
        </div>
      )}

      {/* Ishikawa */}
      {tab === 'ishikawa' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Ishikawa (6M Balık Kılçığı) Kök Neden Diyagramı</h3>
            <input
              type="text"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-80 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
            />
          </div>
          <IshikawaDiagram problemStatement={problem} causes={causes} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {Object.entries(causes).map(([cat, list]) => (
              <div key={cat} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded">
                <div className="font-semibold mb-1">{cat}</div>
                <input
                  type="text"
                  value={list.join(', ')}
                  onChange={(e) =>
                    setCauses((prev) => ({
                      ...prev,
                      [cat]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FMEA */}
      {tab === 'fmea' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Proses FMEA (Şiddet × Olasılık × Saptanabilirlik = RPN)</h3>
            <button
              type="button"
              onClick={() =>
                setFmeaList((prev) => [
                  ...prev,
                  {
                    id: Date.now(),
                    processStep: 'Yeni Proses Adımı',
                    failureMode: 'Hata Modu',
                    effect: 'Proses Etkisi',
                    severity: 6,
                    occurrence: 4,
                    detection: 4,
                    action: 'Önleyici aksiyon planı',
                  },
                ])
              }
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 rounded cursor-pointer"
            >
              Satır Ekle
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2 px-3 text-left">Proses Adımı</th>
                  <th className="py-2 px-3 text-left">Hata Modu</th>
                  <th className="py-2 px-2 text-center">Ş (S)</th>
                  <th className="py-2 px-2 text-center">O (O)</th>
                  <th className="py-2 px-2 text-center">S (D)</th>
                  <th className="py-2 px-3 text-right">RPN</th>
                  <th className="py-2 px-3 text-left">Önerilen Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {fmeaList.map((item, idx) => {
                  const rpn = item.severity * item.occurrence * item.detection;
                  return (
                    <tr key={item.id}>
                      <td className="py-2 px-3 font-medium">{item.processStep}</td>
                      <td className="py-2 px-3">{item.failureMode}</td>
                      {(['severity', 'occurrence', 'detection'] as const).map((field) => (
                        <td key={field} className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={item[field]}
                            onChange={(e) => {
                              const next = [...fmeaList];
                              next[idx] = { ...item, [field]: Math.min(10, Math.max(1, Number(e.target.value))) };
                              setFmeaList(next);
                            }}
                            className="w-12 px-1 py-0.5 text-center font-mono border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800"
                          />
                        </td>
                      ))}
                      <td className={`py-2 px-3 text-right font-mono font-semibold tabular-nums ${rpn >= 100 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {rpn}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{item.action}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Control Plan */}
      {tab === 'control_plan' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 text-sm font-semibold">
            Standart Proses Kontrol Planı
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-4 text-left">Kontrol Parametresi</th>
                  <th className="py-2.5 px-3 text-left">Spesifikasyon</th>
                  <th className="py-2.5 px-3 text-left">Ölçüm Yöntemi</th>
                  <th className="py-2.5 px-3 text-left">Frekans</th>
                  <th className="py-2.5 px-3 text-left">SPC Grafiği</th>
                  <th className="py-2.5 px-4 text-left">Reaksiyon Planı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {controlRows.map((r) => (
                  <tr key={r.param}>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">{r.param}</td>
                    <td className="py-2.5 px-3 font-mono">{r.spec}</td>
                    <td className="py-2.5 px-3">{r.method}</td>
                    <td className="py-2.5 px-3">{r.freq}</td>
                    <td className="py-2.5 px-3 font-medium text-blue-700 dark:text-blue-400">{r.chart}</td>
                    <td className="py-2.5 px-4">{r.reaction}</td>
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
