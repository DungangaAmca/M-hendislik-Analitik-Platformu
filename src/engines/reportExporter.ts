import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { jsPDF } from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import * as XLSX from 'xlsx';
import { AnalysisRecord, Dataset, SpcAlarm } from '../domain/types';

export interface ReportExportInput {
  title: string;
  facility: string;
  author: string;
  executiveSummary: string;
  dataset: Dataset;
  analyses: AnalysisRecord[];
  alarms: SpcAlarm[];
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Convert Turkish special characters to ASCII-safe equivalents strictly for jsPDF standard Helvetica fallback
function trToAscii(str: string): string {
  return str
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'G')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 'S')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'O')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'C')
    .replace(/σ/g, 'sigma')
    .replace(/μ/g, 'mu')
    .replace(/β/g, 'beta')
    .replace(/η/g, 'eta')
    .replace(/Δ/g, 'Delta')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/·/g, '-');
}

export async function exportWordReport(input: ReportExportInput): Promise<void> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: input.title,
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tesis: ${input.facility} | Hazırlayan: ${input.author} | Tarih: ${new Date().toLocaleDateString('tr-TR')}`,
                size: 20,
                color: '475569',
              }),
            ],
            spacing: { after: 280 },
          }),
          new Paragraph({
            text: '1. Türkçe Yönetici Özeti',
            heading: HeadingLevel.HEADING_1,
          }),
          ...input.executiveSummary.split('\n').filter(Boolean).map(
            (line) =>
              new Paragraph({
                text: line,
                spacing: { after: 140 },
              })
          ),
          new Paragraph({
            text: `2. Veri Seti Profili (${input.dataset.name})`,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240 },
          }),
          new Paragraph({
            text: `Toplam Gözlem: ${input.dataset.rowCount} satır | Değişken: ${input.dataset.columnCount} sütun | Eksik Değer: ${input.dataset.totalMissing} | Aykırı Değer: ${input.dataset.totalOutliers}`,
            spacing: { after: 180 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ['Değişken', 'Tip', 'Gözlem', 'Ortalama', 'Std. Sapma', 'Medyan'].map(
                  (h) =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                    })
                ),
              }),
              ...input.dataset.columns.slice(0, 14).map(
                (col) =>
                  new TableRow({
                    children: [
                      col.name,
                      col.type === 'numeric' ? 'Sayısal' : 'Kategorik',
                      String(col.count),
                      col.mean !== undefined ? col.mean.toFixed(3) : '-',
                      col.sd !== undefined ? col.sd.toFixed(3) : '-',
                      col.median !== undefined ? col.median.toFixed(3) : '-',
                    ].map((cellText) => new TableCell({ children: [new Paragraph(cellText)] }))
                  })
              ),
            ],
          }),
          new Paragraph({
            text: '3. Yürütülen İstatistiksel Analizler',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 280 },
          }),
          ...input.analyses.map(
            (a) =>
              new Paragraph({
                children: [
                  new TextRun({ text: `• ${a.title} (${a.module}): `, bold: true }),
                  new TextRun({ text: `${a.keyMetricLabel} = ${a.keyMetricValue}. ${a.interpretation}` }),
                ],
                spacing: { after: 100 },
              })
          ),
          new Paragraph({
            text: '4. Aktif SPC Kontrol Dışı Alarmlar',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240 },
          }),
          ...input.alarms.map(
            (al) =>
              new Paragraph({
                text: `• [${al.severity}] ${al.parameter} (${al.chartType}, Nokta #${al.pointIndex}): ${al.ruleViolated} — Gözlenen: ${al.observedValue}`,
                spacing: { after: 80 },
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerDownload(blob, `MAP_Muhendislik_Raporu_${Date.now()}.docx`);
}

export function exportExcelReport(input: ReportExportInput): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Yönetici Özeti & Metrikler
  const summaryRows = [
    ['Mühendislik Analitik Platformu (MAP) — Analiz Raporu'],
    ['Rapor Başlığı', input.title],
    ['Tesis / Birim', input.facility],
    ['Hazırlayan', input.author],
    ['Tarih', new Date().toLocaleString('tr-TR')],
    ['Aktif Veri Seti', input.dataset.name],
    ['Satır / Sütun', `${input.dataset.rowCount} / ${input.dataset.columnCount}`],
    [],
    ['Türkçe Yönetici Özeti'],
    [input.executiveSummary],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Yonetici_Ozeti');

  // Sheet 2: Sütun Profili
  const profileData = input.dataset.columns.map((c) => ({
    Sutun: c.name,
    Tip: c.type,
    Gozlem: c.count,
    Eksik: c.missingCount,
    Ortalama: c.mean ?? '',
    StdSapma: c.sd ?? '',
    Min: c.min ?? '',
    Q1: c.q1 ?? '',
    Medyan: c.median ?? '',
    Q3: c.q3 ?? '',
    Max: c.max ?? '',
    AykiriSayisi: c.outliers.length,
  }));
  const wsProfile = XLSX.utils.json_to_sheet(profileData);
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Sutun_Profili');

  // Sheet 3: Analizler
  const analysesData = input.analyses.map((a) => ({
    Baslik: a.title,
    Modul: a.module,
    Metrik: a.keyMetricLabel,
    Deger: a.keyMetricValue,
    Durum: a.status,
    Yorum: a.interpretation,
  }));
  const wsAnalyses = XLSX.utils.json_to_sheet(analysesData);
  XLSX.utils.book_append_sheet(wb, wsAnalyses, 'Analiz_Sonuclari');

  // Sheet 4: Ham Veri
  const wsData = XLSX.utils.json_to_sheet(input.dataset.rows.slice(0, 500));
  XLSX.utils.book_append_sheet(wb, wsData, 'Ham_Veri');

  XLSX.writeFile(wb, `MAP_Veri_ve_Analiz_${Date.now()}.xlsx`);
}

export async function exportPowerPointReport(input: ReportExportInput): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // Slide 1: Cover
  const s1 = pptx.addSlide();
  s1.background = { color: '0F172A' };
  s1.addText('MÜHENDİSLİK ANALİTİK PLATFORMU (MAP)', {
    x: 0.8,
    y: 1.2,
    w: 11.5,
    fontSize: 13,
    bold: true,
    color: '60A5FA',
  });
  s1.addText(input.title, {
    x: 0.8,
    y: 2.0,
    w: 11.5,
    fontSize: 32,
    bold: true,
    color: 'FFFFFF',
  });
  s1.addText(`${input.facility}  ·  ${input.author}  ·  ${new Date().toLocaleDateString('tr-TR')}`, {
    x: 0.8,
    y: 3.4,
    w: 11.5,
    fontSize: 15,
    color: 'CBD5E1',
  });

  // Slide 2: Executive Summary
  const s2 = pptx.addSlide();
  s2.addText('Türkçe Yönetici Özeti', { x: 0.6, y: 0.5, w: 12, fontSize: 22, bold: true, color: '0F172A' });
  s2.addText(input.executiveSummary, {
    x: 0.6,
    y: 1.3,
    w: 12.1,
    h: 5.5,
    fontSize: 13,
    color: '334155',
    valign: 'top',
  });

  // Slide 3: Dataset & Statistical Summary Table
  const s3 = pptx.addSlide();
  s3.addText(`Veri Profili — ${input.dataset.name}`, { x: 0.6, y: 0.5, w: 12, fontSize: 20, bold: true, color: '0F172A' });
  const numCols = input.dataset.columns.filter((c) => c.type === 'numeric').slice(0, 7);
  const tableRows: PptxGenJS.TableRow[] = [
    [
      { text: 'Parametre', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'n', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Ortalama', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Std. Sapma', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Medyan', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
      { text: 'Aykırı', options: { bold: true, fill: { color: '1E293B' }, color: 'FFFFFF' } },
    ],
    ...numCols.map((c) => [
      { text: c.name },
      { text: String(c.count) },
      { text: c.mean?.toFixed(3) ?? '-' },
      { text: c.sd?.toFixed(3) ?? '-' },
      { text: c.median?.toFixed(3) ?? '-' },
      { text: String(c.outliers.length) },
    ]),
  ];
  s3.addTable(tableRows, { x: 0.6, y: 1.3, w: 12.1, fontSize: 11, border: { pt: 1, color: 'CBD5E1' } });

  // Slide 4: Key Analyses & SPC Alarms
  const s4 = pptx.addSlide();
  s4.addText('Analiz Bulguları ve SPC Alarmları', { x: 0.6, y: 0.5, w: 12, fontSize: 20, bold: true, color: '0F172A' });
  const bulletText = [
    ...input.analyses.slice(0, 5).map((a) => `• ${a.title}: ${a.keyMetricLabel} = ${a.keyMetricValue} (${a.status})`),
    ...input.alarms.slice(0, 4).map((al) => `• [SPC ${al.severity}] ${al.parameter}: ${al.ruleViolated}`),
  ].join('\n');
  s4.addText(bulletText, { x: 0.6, y: 1.3, w: 12.1, h: 5.5, fontSize: 13, color: '1E293B', valign: 'top' });

  await pptx.writeFile({ fileName: `MAP_Yonetim_Sunumu_${Date.now()}.pptx` });
}

export function exportPdfReport(input: ReportExportInput): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 18;
  const pageH = 280;

  const addWrapped = (text: string, size = 10, bold = false, color: [number, number, number] = [30, 41, 59]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(trToAscii(text), 175) as string[];
    for (const line of lines) {
      if (y > pageH) {
        doc.addPage();
        y = 18;
      }
      doc.text(line, 16, y);
      y += size * 0.48 + 1.2;
    }
    y += 2;
  };

  addWrapped('MUHENDISLIK ANALITIK PLATFORMU (MAP)', 10, true, [29, 78, 216]);
  addWrapped(input.title, 16, true, [15, 23, 42]);
  addWrapped(`Tesis: ${input.facility} | Hazirlayan: ${input.author} | Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 9, false, [100, 116, 139]);
  y += 3;

  addWrapped('1. Yonetici Ozeti', 12, true, [15, 23, 42]);
  addWrapped(input.executiveSummary, 10);

  addWrapped(`2. Veri Seti Profili (${input.dataset.name})`, 12, true, [15, 23, 42]);
  addWrapped(
    `Satir: ${input.dataset.rowCount} | Sutun: ${input.dataset.columnCount} | Eksik Deger: ${input.dataset.totalMissing} | Aykiri Deger: ${input.dataset.totalOutliers}`,
    10
  );
  input.dataset.columns
    .filter((c) => c.type === 'numeric')
    .slice(0, 10)
    .forEach((c) => {
      addWrapped(
        `- ${c.name}: n=${c.count}, Ort=${c.mean?.toFixed(3)}, SD=${c.sd?.toFixed(3)}, Medyan=${c.median?.toFixed(3)}, Min/Max=${c.min?.toFixed(2)}/${c.max?.toFixed(2)}`,
        9
      );
    });

  addWrapped('3. Analiz Sonuclari', 12, true, [15, 23, 42]);
  input.analyses.forEach((a) => {
    addWrapped(`- ${a.title} [${a.status}]: ${a.keyMetricLabel} = ${a.keyMetricValue}. ${a.interpretation}`, 9.5);
  });

  addWrapped('4. Aktif SPC Alarmlari', 12, true, [15, 23, 42]);
  input.alarms.forEach((al) => {
    addWrapped(`- [${al.severity}] ${al.parameter} (${al.chartType} #${al.pointIndex}): ${al.ruleViolated}`, 9.5);
  });

  doc.save(`MAP_Muhendislik_Raporu_${Date.now()}.pdf`);
}
