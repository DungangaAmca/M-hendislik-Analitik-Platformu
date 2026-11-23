import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY ortam değişkeni tanımlı değil.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'MAP Analytics Engine' });
});

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { datasetName, rowCount, columns, sampleRows, userPrompt, recentFindings } = req.body ?? {};
    if (!datasetName || !Array.isArray(columns)) {
      res.status(400).json({ error: 'Veri seti adı ve sütun profili gereklidir.' });
      return;
    }

    const ai = getGeminiClient();

    const promptText = `Sen kıdemli bir Altı Sigma Master Black Belt, İstatistikçi ve Demir-Çelik Proses Mühendisisin.
Aşağıdaki veri setini incele ve tamamen Türkçe, teknik açıdan kesin, uygulanabilir mühendislik analizi üret.

Veri Seti: ${datasetName}
Toplam Satır: ${rowCount}
Sütun Profilleri:
${JSON.stringify(columns, null, 2)}

Örnek Satırlar (ilk 5):
${JSON.stringify((sampleRows ?? []).slice(0, 5), null, 2)}

Ön İstatistik Bulguları:
${JSON.stringify(recentFindings ?? {}, null, 2)}

Kullanıcı Talebi: ${userPrompt || 'Bu veriyi analiz et: veri tiplerini tanı, eksikleri ve aykırıları değerlendir, uygun istatistiksel analizleri öner, neden önerdiğini açıkla ve sonuçları Türkçe yorumla.'}

Lütfen yanıtı JSON şemasına tam uyumlu olarak üret.`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: promptText,
      config: {
        systemInstruction:
          'Yanıtların yalnızca Türkçe olsun. Demir-çelik, yüksek fırın, kalite ve proses mühendisliği terminolojisini doğru kullan. Kesin istatistiksel gerekçeler sun.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ozetYorum: {
              type: Type.STRING,
              description: 'Veri setine dair kapsamlı Türkçe mühendislik ve istatistiksel yönetici özeti.',
            },
            veriKalitesiDegerlendirmesi: {
              type: Type.STRING,
              description: 'Eksik değerler, aykırı değerler ve dağılım çarpıklıkları hakkında değerlendirme.',
            },
            onerilenAnalizler: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  analizAdi: { type: Type.STRING },
                  modul: { type: Type.STRING },
                  nedenOnerildi: { type: Type.STRING },
                  beklenenCikti: { type: Type.STRING },
                  oncelik: { type: Type.STRING },
                },
              },
            },
            prosesAksiyonlari: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const text = (response.text ?? '{}').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Yapay zeka analizi sırasında hata oluştu.';
    const status = message.includes('GEMINI_API_KEY') ? 500 : 502;
    res.status(status).json({ error: message });
  }
});

app.post('/api/ai/executive-summary', async (req, res) => {
  try {
    const { projectTitle, analyses, spcAlarms } = req.body ?? {};
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Aşağıdaki analiz sonuçları ve SPC alarmları için üst yönetime sunulacak profesyonel bir Türkçe Yönetici Özeti yaz (3 paragraf, somut bulgular, Cp/Cpk veya p-değeri referansları ve aksiyon maddeleri):
Proje: ${projectTitle || 'Mühendislik Kalite ve Proses İyileştirme Raporu'}
Analizler: ${JSON.stringify(analyses ?? [])}
SPC Alarmları: ${JSON.stringify(spcAlarms ?? [])}`,
      config: {
        systemInstruction: 'Yalnızca Türkçe, kurumsal mühendislik raporu üslubuyla yaz.',
      },
    });

    res.json({ summary: (response.text ?? '').trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Yönetici özeti oluşturulamadı.';
    res.status(502).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MAP Sunucusu http://0.0.0.0:${PORT} adresinde çalışıyor.`);
  });
}

startServer();
