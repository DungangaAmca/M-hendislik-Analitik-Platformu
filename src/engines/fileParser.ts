import * as XLSX from 'xlsx';
import { ColumnDataType, ColumnProfile, DataRow, Dataset, OutlierDetail } from '../domain/types';
import { chiSquareUpperP, mean, median, quantile, stdDev } from './mathCore';

function parseScalar(raw: unknown): string | number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  const str = String(raw).trim();
  if (str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'na' || str.toLowerCase() === 'nan') {
    return null;
  }
  const normalized = str.includes(',') && !str.includes('.') && /^-?\d+,\d+$/.test(str)
    ? str.replace(',', '.')
    : str;
  const num = Number(normalized);
  if (!Number.isNaN(num) && normalized !== '') {
    return num;
  }
  return str;
}

export function profileRows(
  name: string,
  sourceFormat: Dataset['sourceFormat'],
  rawRows: Record<string, unknown>[],
  notes?: string
): Dataset {
  if (rawRows.length === 0) {
    throw new Error('Yüklenen dosyada işlenebilir veri satırı bulunamadı.');
  }

  const colNames = Array.from(
    rawRows.reduce((set, row) => {
      Object.keys(row).forEach((k) => {
        if (k.trim() !== '') set.add(k.trim());
      });
      return set;
    }, new Set<string>())
  );

  const rows: DataRow[] = rawRows.map((raw) => {
    const clean: DataRow = {};
    for (const col of colNames) {
      clean[col] = parseScalar(raw[col]);
    }
    return clean;
  });

  let totalMissing = 0;
  let totalOutliers = 0;

  const columns: ColumnProfile[] = colNames.map((colName) => {
    const values = rows.map((r) => r[colName]);
    const nonNull = values.filter((v): v is string | number => v !== null);
    const missingCount = values.length - nonNull.length;
    totalMissing += missingCount;
    const missingPct = values.length > 0 ? (missingCount / values.length) * 100 : 0;

    const numericVals = nonNull.filter((v): v is number => typeof v === 'number');
    const isNumeric = nonNull.length > 0 && numericVals.length >= nonNull.length * 0.75;

    let type: ColumnDataType = 'categorical';
    if (isNumeric) {
      type = 'numeric';
    } else {
      const dateMatches = nonNull.filter(
        (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)
      ).length;
      if (nonNull.length > 0 && dateMatches >= nonNull.length * 0.8) {
        type = 'datetime';
      }
    }

    const uniqueCount = new Set(nonNull.map((v) => String(v))).size;

    if (type === 'numeric' && numericVals.length > 0) {
      const sorted = [...numericVals].sort((a, b) => a - b);
      const m = mean(numericVals);
      const s = stdDev(numericVals, true);
      const q1 = quantile(sorted, 0.25);
      const med = quantile(sorted, 0.5);
      const q3 = quantile(sorted, 0.75);
      const iqr = q3 - q1;

      const n = numericVals.length;
      let skew = 0;
      let kurt = 0;
      if (s > 0 && n > 2) {
        let m3 = 0;
        let m4 = 0;
        for (const x of numericVals) {
          const z = (x - m) / s;
          m3 += z * z * z;
          m4 += z * z * z * z;
        }
        skew = m3 / n;
        kurt = m4 / n - 3;
      }
      // Jarque-Bera normality approximation
      const jb = (n / 6) * (skew * skew + (kurt * kurt) / 4);
      const normalityP = n >= 8 ? chiSquareUpperP(jb, 2) : 1;

      const mad = median(numericVals.map((v) => Math.abs(v - med)));
      const outliers: OutlierDetail[] = [];
      const lowFence = q1 - 1.5 * iqr;
      const highFence = q3 + 1.5 * iqr;

      rows.forEach((r, idx) => {
        const v = r[colName];
        if (typeof v === 'number') {
          const modZ = mad > 0 ? (0.6745 * (v - med)) / mad : s > 0 ? (v - m) / s : 0;
          if (iqr > 0 && (v < lowFence || v > highFence)) {
            outliers.push({ rowIndex: idx + 1, value: v, method: 'IQR', zScore: modZ });
          } else if (Math.abs(modZ) > 3.5) {
            outliers.push({ rowIndex: idx + 1, value: v, method: 'ModZ', zScore: modZ });
          }
        }
      });

      totalOutliers += outliers.length;

      return {
        name: colName,
        type,
        count: nonNull.length,
        missingCount,
        missingPct,
        uniqueCount,
        mean: m,
        sd: s,
        min: sorted[0],
        q1,
        median: med,
        q3,
        max: sorted[sorted.length - 1],
        iqr,
        skewness: skew,
        kurtosis: kurt,
        normalityP,
        outliers,
      };
    }

    const freqMap = new Map<string, number>();
    nonNull.forEach((v) => {
      const key = String(v);
      freqMap.set(key, (freqMap.get(key) ?? 0) + 1);
    });
    const topCategories = Array.from(freqMap.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      name: colName,
      type,
      count: nonNull.length,
      missingCount,
      missingPct,
      uniqueCount,
      outliers: [],
      topCategories,
    };
  });

  return {
    id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    sourceFormat,
    createdAt: new Date().toISOString(),
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    rows,
    totalMissing,
    totalOutliers,
    notes,
  };
}

function parseDelimitedText(text: string): Record<string, unknown>[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('Metin dosyasında başlık ve en az bir veri satırı bulunmalıdır.');
  }
  const first = lines[0];
  const delimiters = [';', '\t', '|', ','];
  let bestDelim = ',';
  let bestCount = -1;
  for (const d of delimiters) {
    const count = first.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      bestDelim = d;
    }
  }
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === bestDelim && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map((h, i) => h || `Sutun_${i + 1}`);
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? null;
    });
    rows.push(row);
  }
  return rows;
}

function parseXmlRows(xmlText: string): Record<string, unknown>[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parserErr = doc.querySelector('parsererror');
  if (parserErr) {
    throw new Error('XML sözdizimi geçersiz.');
  }
  const root = doc.documentElement;
  const children = Array.from(root.children);
  if (children.length === 0) {
    throw new Error('XML dosyasında kayıt düğümü bulunamadı.');
  }
  return children.map((node) => {
    const obj: Record<string, unknown> = {};
    Array.from(node.attributes).forEach((attr) => {
      obj[attr.name] = attr.value;
    });
    Array.from(node.children).forEach((child) => {
      obj[child.tagName] = child.textContent?.trim() ?? null;
    });
    return obj;
  });
}

// SPSS .sav binary parser (Record Type 2 variable headers + uncompressed/ZLIB-free bytecoded data)
function parseSavBinary(buffer: ArrayBuffer): Record<string, unknown>[] {
  const view = new DataView(buffer);
  const decoder = new TextDecoder('utf-8');
  const magic = decoder.decode(new Uint8Array(buffer, 0, 4));
  if (magic !== '$FL2' && magic !== '$FL3') {
    throw new Error('Geçersiz SPSS .sav dosya imzası ($FL2/$FL3 bekleniyor).');
  }
  const littleEndian = view.getInt32(64, true) === 2 || view.getInt32(64, true) === 3 || view.getInt32(68, true) !== 0;
  const compression = view.getInt32(72, littleEndian);
  const ncases = view.getInt32(80, littleEndian);
  const bias = view.getFloat64(84, littleEndian);

  let offset = 176;
  const varNames: string[] = [];
  const varTypes: number[] = [];

  while (offset + 4 <= buffer.byteLength) {
    const recType = view.getInt32(offset, littleEndian);
    offset += 4;
    if (recType === 2) {
      const typeCode = view.getInt32(offset, littleEndian);
      const hasVarLabel = view.getInt32(offset + 4, littleEndian);
      const nMissing = view.getInt32(offset + 8, littleEndian);
      const nameBytes = new Uint8Array(buffer, offset + 20, 8);
      const name = decoder.decode(nameBytes).trim().replace(/\0/g, '');
      offset += 28;
      if (typeCode !== -1) {
        varNames.push(name || `V_${varNames.length + 1}`);
        varTypes.push(typeCode);
      }
      if (hasVarLabel === 1) {
        const labelLen = view.getInt32(offset, littleEndian);
        const padded = Math.ceil(labelLen / 4) * 4;
        offset += 4 + padded;
      }
      if (nMissing !== 0) {
        offset += Math.abs(nMissing) * 8;
      }
    } else if (recType === 3) {
      const count = view.getInt32(offset, littleEndian);
      offset += 4;
      for (let i = 0; i < count; i++) {
        offset += 8;
        const lblLen = new Uint8Array(buffer, offset, 1)[0];
        const padded = Math.ceil((lblLen + 1) / 8) * 8;
        offset += padded;
      }
    } else if (recType === 4) {
      const count = view.getInt32(offset, littleEndian);
      offset += 4 + count * 4;
    } else if (recType === 6) {
      const count = view.getInt32(offset, littleEndian);
      offset += 4 + count * 80;
    } else if (recType === 7) {
      const subType = view.getInt32(offset, littleEndian);
      const size = view.getInt32(offset + 4, littleEndian);
      const count = view.getInt32(offset + 8, littleEndian);
      offset += 12 + size * count;
      if (subType < 0) break;
    } else if (recType === 999) {
      offset += 4;
      break;
    } else {
      break;
    }
  }

  if (varNames.length === 0) {
    throw new Error('SAV dosyasında değişken tanımı okunamadı.');
  }

  const rows: Record<string, unknown>[] = [];
  if (compression === 0) {
    const totalCases = ncases > 0 ? ncases : Math.floor((buffer.byteLength - offset) / (varNames.length * 8));
    for (let r = 0; r < totalCases && offset + 8 <= buffer.byteLength; r++) {
      const row: Record<string, unknown> = {};
      for (let c = 0; c < varNames.length; c++) {
        if (varTypes[c] === 0) {
          const val = view.getFloat64(offset, littleEndian);
          row[varNames[c]] = val < -1e30 ? null : Number(val.toFixed(6));
          offset += 8;
        } else {
          const chunks = Math.ceil(varTypes[c] / 8);
          const strBytes = new Uint8Array(buffer, offset, chunks * 8);
          row[varNames[c]] = decoder.decode(strBytes).replace(/\0/g, '').trim();
          offset += chunks * 8;
        }
      }
      rows.push(row);
    }
  } else if (compression === 1) {
    // Standard SPSS bytecode compression
    let codeBuf: number[] = [];
    let bufIdx = 8;
    const nextCode = (): number | null => {
      if (bufIdx >= 8) {
        if (offset + 8 > buffer.byteLength) return null;
        codeBuf = Array.from(new Uint8Array(buffer, offset, 8));
        offset += 8;
        bufIdx = 0;
      }
      return codeBuf[bufIdx++];
    };
    let done = false;
    while (!done && (ncases <= 0 || rows.length < ncases)) {
      const row: Record<string, unknown> = {};
      for (let c = 0; c < varNames.length; c++) {
        const code = nextCode();
        if (code === null || code === 252) {
          done = true;
          break;
        }
        if (varTypes[c] === 0) {
          if (code === 0) {
            c--;
            continue;
          } else if (code === 253) {
            if (offset + 8 > buffer.byteLength) {
              done = true;
              break;
            }
            row[varNames[c]] = Number(view.getFloat64(offset, littleEndian).toFixed(6));
            offset += 8;
          } else if (code === 254) {
            row[varNames[c]] = null;
          } else if (code === 255) {
            row[varNames[c]] = null;
          } else {
            row[varNames[c]] = code - bias;
          }
        } else {
          const chunks = Math.ceil(varTypes[c] / 8);
          let strVal = '';
          for (let k = 0; k < chunks; k++) {
            const sc = k === 0 ? code : nextCode();
            if (sc === 254) strVal += '        ';
            else if (sc === 253 && offset + 8 <= buffer.byteLength) {
              strVal += decoder.decode(new Uint8Array(buffer, offset, 8));
              offset += 8;
            }
          }
          row[varNames[c]] = strVal.replace(/\0/g, '').trim();
        }
      }
      if (!done && Object.keys(row).length > 0) rows.push(row);
    }
  } else {
    throw new Error('ZLIB sıkıştırmalı (.zsav) SPSS dosyası yerine sıkıştırılmamış veya standart sıkıştırmalı .sav yükleyin.');
  }

  if (rows.length === 0) {
    throw new Error('SAV dosyasından veri satırı çıkarılamadı.');
  }
  return rows;
}

// Parquet binary verification + JSON-embedded or uncompressed plain-text table parser
function parseParquetBuffer(buffer: ArrayBuffer): Record<string, unknown>[] {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8');
  if (bytes.length < 12) {
    throw new Error('Parquet dosyası çok kısa veya bozuk.');
  }
  const head = decoder.decode(bytes.slice(0, 4));
  const tail = decoder.decode(bytes.slice(bytes.length - 4));
  if (head !== 'PAR1' || tail !== 'PAR1') {
    throw new Error('Geçersiz Parquet dosya imzası (PAR1 başlık/altlık bulunamadı).');
  }
  // Extract readable UTF-8 schema/JSON lines if embedded or inspect Parquet metadata length
  const view = new DataView(buffer);
  const metaLen = view.getInt32(bytes.length - 8, true);
  if (metaLen <= 0 || metaLen > bytes.length - 12) {
    throw new Error('Parquet Thrift metadata uzunluğu geçersiz.');
  }
  // Check if file carries an uncompressed JSON/CSV row payload or readable ASCII numeric columns
  const bodyText = decoder.decode(bytes.slice(4, bytes.length - 8 - metaLen));
  const jsonMatch = bodyText.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  }
  throw new Error(
    `Parquet dosyası doğrulandı (PAR1, metadata ${metaLen} bayt), ancak ikili sütun sıkıştırması tarayıcıda doğrudan açılamıyor. Lütfen CSV, XLSX veya JSON formatında dışa aktarıp yükleyin.`
  );
}

export async function parseUploadedFile(file: File): Promise<Dataset> {
  const ext = file.name.split('.').pop()?.toUpperCase() ?? '';
  const buffer = await file.arrayBuffer();

  if (ext === 'XLSX' || ext === 'XLS') {
    const wb = XLSX.read(buffer, { type: 'array' });
    const firstSheet = wb.SheetNames[0];
    if (!firstSheet) throw new Error('Excel çalışma kitabında sayfa bulunamadı.');
    const sheet = wb.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    return profileRows(file.name, ext as 'XLSX' | 'XLS', rows);
  }

  if (ext === 'CSV' || ext === 'TXT') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const rows = parseDelimitedText(text);
    return profileRows(file.name, ext as 'CSV' | 'TXT', rows);
  }

  if (ext === 'JSON') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed?.rows)
          ? parsed.rows
          : null;
    if (!rows || rows.length === 0) {
      throw new Error('JSON dosyası bir nesne dizisi ([{...}]) içermelidir.');
    }
    return profileRows(file.name, 'JSON', rows);
  }

  if (ext === 'XML') {
    const text = new TextDecoder('utf-8').decode(buffer);
    const rows = parseXmlRows(text);
    return profileRows(file.name, 'XML', rows);
  }

  if (ext === 'SAV') {
    const rows = parseSavBinary(buffer);
    return profileRows(file.name, 'SAV', rows);
  }

  if (ext === 'PARQUET') {
    const rows = parseParquetBuffer(buffer);
    return profileRows(file.name, 'Parquet', rows);
  }

  throw new Error(
    `Desteklenmeyen dosya uzantısı (.${ext}). Desteklenen formatlar: XLSX, XLS, CSV, TXT, JSON, XML, SAV, Parquet.`
  );
}
