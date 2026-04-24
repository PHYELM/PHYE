const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const LOGO_DARK_PATH = path.join(__dirname, "../../web/public/assets/PH.png");
const LOGO_LIGHT_PATH = path.join(__dirname, "../../web/public/assets/PHYEWHITE.png");
const LOGO_PATH = LOGO_DARK_PATH;

const BRAND = {
  navy: "061A2D",
  navy2: "072735",
  green: "7AD957",
  greenDark: "5F8F2A",
  border: "DBE5EF",
  soft: "F8FBFF",
  text: "0F172A",
  muted: "64748B",
};

function hexToRgb(hex) {
  const clean = String(hex || "")
    .replace("#", "")
    .trim();

  const normalized =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean.padEnd(6, "0").slice(0, 6);

  const r = parseInt(normalized.slice(0, 2), 16) || 0;
  const g = parseInt(normalized.slice(2, 4), 16) || 0;
  const b = parseInt(normalized.slice(4, 6), 16) || 0;

  return { r, g, b };
}

function pdfRgb(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgb(r / 255, g / 255, b / 255);
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function toTitleCaseText(value = "") {
  return String(value || "").replace(/(^|\s)([a-záéíóúñü])/giu, (match) => match.toUpperCase());
}

function safeString(value = "") {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatDateDisplay(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  }

  const match = safeString(raw).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  return safeString(raw);
}

function formatTimeDisplay(raw) {
  if (!raw) return "";
  const text = safeString(raw).trim();

  const asDate = new Date(text);
  if (!Number.isNaN(asDate.getTime())) {
    const hh = String(asDate.getHours()).padStart(2, "0");
    const mm = String(asDate.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const match = text.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : text;
}

function formatDateTimeDisplay(raw) {
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hh}:${mm}`;
  }

  return safeString(raw);
}

function currencyDisplay(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? `$${num.toFixed(2)}` : safeString(value);
}

function normalizeChoiceOption(option, idx = 0) {
  if (typeof option === "object" && option) {
    return {
      value: option.value ?? `opt_${idx}`,
      label: option.label ?? `Opción ${idx + 1}`,
      isOther: Boolean(option.isOther),
      children: Array.isArray(option.children) ? option.children : [],
      allowText: Boolean(option.allowText),
      textPlaceholder: option.textPlaceholder ?? "",
      textSuffix: option.textSuffix ?? "",
      color: option.color || "",
    };
  }

  const text = safeString(option || `Opción ${idx + 1}`);
  const isOther = normalizeText(text) === "OTROS";

  return {
    value: isOther ? "__other__" : `opt_${idx}`,
    label: text,
    isOther,
    children: [],
    allowText: false,
    textPlaceholder: "",
    textSuffix: "",
    color: "",
  };
}

function parseDataUrlImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const [meta, base64] = dataUrl.split(",");
  if (!meta || !base64) return null;

  const mimeMatch = meta.match(/^data:(.*?);base64$/);
  const mime = mimeMatch?.[1] || "image/png";

  return {
    mime,
    buffer: Buffer.from(base64, "base64"),
  };
}

function getPngDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 24) return null;
  const signature = buffer.toString("hex", 0, 8);
  if (signature !== "89504e470d0a1a0a") return null;

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function getJpegDimensions(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const size = buffer.readUInt16BE(offset + 2);

    const isSOF =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf;

    if (isSOF) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    if (size <= 0) break;
    offset += 2 + size;
  }

  return null;
}

function getImageDimensionsFromBuffer(buffer, mime = "") {
  const lowerMime = safeString(mime).toLowerCase();

  if (lowerMime.includes("png")) {
    return getPngDimensions(buffer);
  }

  if (lowerMime.includes("jpeg") || lowerMime.includes("jpg")) {
    return getJpegDimensions(buffer);
  }

  return getPngDimensions(buffer) || getJpegDimensions(buffer);
}

function excelColumnWidthToPixels(width = 8.43) {
  return Math.max(24, Math.round(Number(width || 8.43) * 7 + 5));
}

function excelRowHeightToPixels(height = 15) {
  return Math.max(18, Math.round((Number(height || 15) * 96) / 72));
}

function getExcelRangePixelBox(worksheet, rowStartZero, rowEndZero, colStartZero, colEndZero) {
  let width = 0;
  let height = 0;

  for (let c = colStartZero; c < colEndZero; c += 1) {
    width += excelColumnWidthToPixels(worksheet.getColumn(c + 1).width);
  }

  for (let r = rowStartZero; r < rowEndZero; r += 1) {
    const row = worksheet.getRow(r + 1);
    height += excelRowHeightToPixels(row.height || worksheet.properties.defaultRowHeight || 20);
  }

  return { width, height };
}

async function addContainedExcelImage({
  workbook,
  worksheet,
  buffer,
  mime,
  rowStart,
  rowEnd,
  colStart,
  colEnd,
  paddingX = 10,
  paddingY = 8,
}) {
  const dims = getImageDimensionsFromBuffer(buffer, mime);
  if (!dims?.width || !dims?.height) return;

  const imageId = workbook.addImage({
    buffer,
    extension: mime.includes("png") ? "png" : "jpeg",
  });

  const rowStartZero = Math.max(0, rowStart - 1);
  const rowEndZero = Math.max(rowStartZero + 1, rowEnd);
  const colStartZero = Math.max(0, colStart);
  const colEndZero = Math.max(colStartZero + 1, colEnd);

  const box = getExcelRangePixelBox(
    worksheet,
    rowStartZero,
    rowEndZero,
    colStartZero,
    colEndZero
  );

  const innerWidth = Math.max(20, box.width - paddingX * 2);
  const innerHeight = Math.max(20, box.height - paddingY * 2);

  const scale = Math.min(innerWidth / dims.width, innerHeight / dims.height);
  const drawWidth = Math.max(18, Math.round(dims.width * scale));
  const drawHeight = Math.max(18, Math.round(dims.height * scale));

  const avgColWidth = box.width / Math.max(1, colEndZero - colStartZero);
  const avgRowHeight = box.height / Math.max(1, rowEndZero - rowStartZero);

  const offsetX = paddingX + (innerWidth - drawWidth) / 2;
  const offsetY = paddingY + (innerHeight - drawHeight) / 2;

  worksheet.addImage(imageId, {
    tl: {
      col: colStartZero + offsetX / avgColWidth,
      row: rowStartZero + offsetY / avgRowHeight,
    },
    ext: {
      width: drawWidth,
      height: drawHeight,
    },
    editAs: "oneCell",
  });
}

function getFileExtension(name = "") {
  const parts = safeString(name).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function getFileLabel(file = {}) {
  const type = safeString(file?.type).toLowerCase();
  const name = safeString(file?.name);

  if (type.startsWith("image/")) return `Imagen: ${name}`;
  if (type.includes("pdf") || name.toLowerCase().endsWith(".pdf")) return `PDF: ${name}`;
  if (
    type.includes("word") ||
    name.toLowerCase().endsWith(".doc") ||
    name.toLowerCase().endsWith(".docx")
  ) {
    return `Word: ${name}`;
  }
  if (
    type.includes("sheet") ||
    type.includes("excel") ||
    name.toLowerCase().endsWith(".xls") ||
    name.toLowerCase().endsWith(".xlsx") ||
    name.toLowerCase().endsWith(".csv")
  ) {
    return `Excel: ${name}`;
  }

  return name || "Archivo";
}

function flattenMultiselectValue(field, rawValue) {
  const normalizedOptions = (field?.options || []).map((option, idx) =>
    normalizeChoiceOption(option, idx)
  );

  const state =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? {
          selected: Array.isArray(rawValue.selected) ? rawValue.selected : [],
          otherText: rawValue.otherText ?? "",
          childSelections:
            rawValue.childSelections && typeof rawValue.childSelections === "object"
              ? rawValue.childSelections
              : {},
          optionTextValues:
            rawValue.optionTextValues && typeof rawValue.optionTextValues === "object"
              ? rawValue.optionTextValues
              : {},
        }
      : {
          selected: Array.isArray(rawValue) ? rawValue : [],
          otherText: "",
          childSelections: {},
          optionTextValues: {},
        };

  const lines = normalizedOptions
    .filter((option) => state.selected.includes(option.value))
    .map((option) => {
      const childValues = state.childSelections?.[option.value] || [];
      const childLabels = (option.children || [])
        .filter((child) => childValues.includes(child.value))
        .map((child) => child.label);

      const optionText = state.optionTextValues?.[option.value] || "";

      if ((option.isOther || option.value === "__other__") && state.otherText) {
        return `${option.label}: ${state.otherText}`;
      }

      if (option.allowText && optionText) {
        return `${option.label}: ${optionText}${option.textSuffix ? ` ${option.textSuffix}` : ""}`;
      }

      if (childLabels.length) {
        return `${option.label} (${childLabels.join(", ")})`;
      }

      return option.label;
    });

  return {
    text: lines.join(", "),
    lines,
  };
}

function flattenSelectValue(field, rawValue) {
  const normalizedOptions = (field?.options || []).map((option, idx) =>
    normalizeChoiceOption(option, idx)
  );

  const currentValue =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? rawValue
      : { value: typeof rawValue === "string" ? rawValue : "", otherText: "" };

  const selectedOption = normalizedOptions.find(
    (option) => option.value === currentValue.value
  );

  if (currentValue.value === "__other__" && currentValue.otherText) {
    return `Otros: ${currentValue.otherText}`;
  }

  return selectedOption?.label || "";
}

function flattenAnswerValue(field, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return {
      text: "",
      lines: [],
      kind: "empty",
    };
  }

  if (field?.type === "traffic_light") {
    const option = (field.options || []).find((opt) => opt.value === rawValue);
    const text = option?.label || safeString(rawValue);
    return {
      text,
      lines: [text],
      kind: "traffic_light",
      color: option?.color || "",
    };
  }

  if (field?.type === "select") {
    const text = flattenSelectValue(field, rawValue);
    return {
      text,
      lines: text ? [text] : [],
      kind: "select",
    };
  }

  if (field?.type === "multiselect") {
    const result = flattenMultiselectValue(field, rawValue);
    return {
      text: result.text,
      lines: result.lines,
      kind: "multiselect",
    };
  }

  if (field?.type === "currency") {
    const text = currencyDisplay(rawValue);
    return {
      text,
      lines: [text],
      kind: "currency",
    };
  }

  if (field?.type === "date") {
    const text = formatDateDisplay(rawValue);
    return {
      text,
      lines: text ? [text] : [],
      kind: "date",
    };
  }

  if (field?.type === "time") {
    const text = formatTimeDisplay(rawValue);
    return {
      text,
      lines: text ? [text] : [],
      kind: "time",
    };
  }

  if (field?.type === "datetime") {
    const text = formatDateTimeDisplay(rawValue);
    return {
      text,
      lines: text ? [text] : [],
      kind: "datetime",
    };
  }

  if (field?.type === "address" && typeof rawValue === "object") {
    const text = [
      rawValue.street,
      rawValue.city,
      rawValue.state,
      rawValue.zip,
      rawValue.reference,
    ]
      .filter(Boolean)
      .join(", ");

    return {
      text,
      lines: text ? [text] : [],
      kind: "address",
    };
  }

  if (field?.type === "agenda" && typeof rawValue === "object") {
    const lines = [
      rawValue.date ? `Fecha: ${formatDateTimeDisplay(rawValue.date) || rawValue.date}` : "",
      rawValue.contact ? `Responsable: ${rawValue.contact}` : "",
      rawValue.note ? `Nota: ${rawValue.note}` : "",
    ].filter(Boolean);

    return {
      text: lines.join(" | "),
      lines,
      kind: "agenda",
    };
  }

  if ((field?.type === "file" || field?.type === "image") && Array.isArray(rawValue)) {
    const lines = rawValue.map((file) => getFileLabel(file)).filter(Boolean);
    return {
      text: lines.join(", "),
      lines,
      kind: field?.type,
      files: rawValue,
    };
  }

  if (field?.type === "signature") {
    const signatureValue =
      typeof rawValue === "string"
        ? rawValue
        : rawValue?.signature || "";

    const detailsSource =
      rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
        ? rawValue.details && typeof rawValue.details === "object"
          ? rawValue.details
          : Object.fromEntries(
              Object.entries(rawValue).filter(([key]) => key !== "signature")
            )
        : {};

    const detailEntries = Object.entries(detailsSource || {})
      .map(([key, value]) => ({
        key,
        value: safeString(value || "").trim(),
      }))
      .filter((item) => item.value);

    const detailLines = detailEntries.map((item) => item.value);

    return {
      text: signatureValue ? "Firma capturada" : "",
      lines: [
        ...(signatureValue ? ["Firma capturada"] : []),
        ...detailLines,
      ],
      kind: "signature",
      signature: signatureValue,
      signatureDetails: detailEntries,
    };
  }

  if (field?.type === "table_purchase" && Array.isArray(rawValue)) {
    const rows = rawValue.map((row) => ({
      descripcion: row.description || "—",
      cantidad: safeString(row.qty || "0"),
      costo: currencyDisplay(row.unit_cost || 0),
      importe: currencyDisplay(row.amount || 0),
    }));

    return {
      text: rows
        .map((row) => `${row.descripcion} | Cant: ${row.cantidad} | Costo: ${row.costo} | Importe: ${row.importe}`)
        .join(" ; "),
      lines: rows.map(
        (row) => `${row.descripcion} | Cant: ${row.cantidad} | Costo: ${row.costo} | Importe: ${row.importe}`
      ),
      kind: "table_purchase",
      rows,
    };
  }

  if (field?.type === "cart" && Array.isArray(rawValue)) {
    const rows = rawValue.map((row) => ({
      producto: row.name || "—",
      cantidad: safeString(row.qty || "0"),
      precio: currencyDisplay(row.price || 0),
      importe: currencyDisplay(row.amount || 0),
    }));

    return {
      text: rows
        .map((row) => `${row.producto} | Cant: ${row.cantidad} | Precio: ${row.precio} | Importe: ${row.importe}`)
        .join(" ; "),
      lines: rows.map(
        (row) => `${row.producto} | Cant: ${row.cantidad} | Precio: ${row.precio} | Importe: ${row.importe}`
      ),
      kind: "cart",
      rows,
    };
  }

  if (field?.type === "product_list" && Array.isArray(rawValue)) {
    const lines = rawValue
      .map((item) => (typeof item === "string" ? item : item?.name || ""))
      .filter(Boolean);

    return {
      text: lines.join(", "),
      lines,
      kind: "product_list",
    };
  }

  if (typeof rawValue === "object") {
    const text = JSON.stringify(rawValue);
    return {
      text,
      lines: [text],
      kind: "json",
    };
  }

  const text = safeString(rawValue);
  return {
    text,
    lines: [text],
    kind: "text",
  };
}

function buildEntries(form, answer) {
  return (form?.fields || [])
    .filter((field) => field?.type !== "captcha")
    .map((field) => {
      const rawValue = answer?.answers?.[field.id];
      const flattened = flattenAnswerValue(field, rawValue);

      return {
        id: field.id,
        label: field.label || "Campo",
        type: field.type || "text",
        required: Boolean(field.required),
        helpText: field.help_text || "",
        rawValue,
        ...flattened,
        normalizedLabel: normalizeText(field.label || ""),
      };
    });
}

function buildFormFolioPrefix(title = "") {
  const clean = String(title || "")
    .trim()
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "FRM";

  const words = clean.split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 3).padEnd(3, "X");
  }

  return words
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join("")
    .padEnd(3, "X")
    .slice(0, 3);
}

function padFolioNumber(num) {
  return String(Math.max(1, Number(num || 1))).padStart(4, "0");
}

function getComputedAnswerFolio(form, answer) {
  if (answer?.folio) return answer.folio;
  const prefix = buildFormFolioPrefix(form?.title || "");
  return `${prefix}${padFolioNumber(1)}`;
}

function splitEntries(entries) {
  const metaKeywords = [
    "NOMBRE",
    "CLIENTE",
    "RAZON SOCIAL",
    "DOMICILIO",
    "DIRECCION",
    "COLONIA",
    "CIUDAD",
    "MUNICIPIO",
    "TELEFONO",
    "TEL",
    "CELULAR",
    "FECHA",
    "HORA",
    "FOLIO",
  ];

  const meta = [];
  const content = [];
  const signatures = [];
  const evidences = [];
  const structured = [];

  for (const entry of entries) {
    if (entry.kind === "signature") {
      signatures.push(entry);
      continue;
    }

    if (entry.kind === "image" || entry.kind === "file") {
      evidences.push(entry);
      continue;
    }

    if (entry.kind === "table_purchase" || entry.kind === "cart") {
      structured.push(entry);
      continue;
    }

    const isMeta = metaKeywords.some((term) => entry.normalizedLabel.includes(term));
    if (isMeta) {
      meta.push(entry);
    } else {
      content.push(entry);
    }
  }

  return { meta, content, signatures, evidences, structured };
}

function buildExportModel(form, answer) {
  const entries = buildEntries(form, answer);
  const grouped = splitEntries(entries);

  const createdAt =
    answer?.submitted_at ||
    answer?.updated_at ||
    answer?.created_at ||
    new Date().toISOString();

  const workerName =
    answer?.worker?.full_name ||
    answer?.worker?.username ||
    "—";

  const departmentName =
    answer?.department?.name ||
    "—";

  const levelName =
    answer?.level?.name ||
    "—";

  return {
    folio: getComputedAnswerFolio(form, answer),
    title: form?.title || "Formulario",
    description: form?.description || "",
    createdAt,
    createdAtDisplay: formatDateTimeDisplay(createdAt),
    workerName,
    departmentName,
    levelName,
    entries,
    ...grouped,
  };
}

function getPrintablePrincipalEntries(model) {
  return [...(model?.meta || [])];
}

function getPrintableDetailEntries(model) {
  return [
    ...(model?.content || []),
    ...(model?.structured || []),
    ...(model?.evidences || []),
  ];
}

function chunkArray(list = [], size = 1) {
  const safeSize = Math.max(1, Number(size || 1));
  const out = [];
  for (let i = 0; i < list.length; i += safeSize) {
    out.push(list.slice(i, i + safeSize));
  }
  return out;
}

function extractFolioParts(folio = "") {
  const text = safeString(folio).trim().toUpperCase();
  const match = text.match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    return {
      raw: text || "—",
      prefix: "",
      number: null,
      padded: "",
    };
  }

  return {
    raw: text,
    prefix: match[1],
    number: Number(match[2]),
    padded: match[2],
  };
}

function compressFolioRanges(folios = []) {
  const parsed = (folios || [])
    .map((folio) => extractFolioParts(folio))
    .filter((item) => item.raw && item.raw !== "—");

  if (!parsed.length) return "—";

  const groups = new Map();

  parsed.forEach((item) => {
    const key = item.prefix || "__NO_PREFIX__";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const result = [];

  for (const [prefix, items] of groups.entries()) {
    const sortable = items
      .filter((item) => Number.isFinite(item.number))
      .sort((a, b) => a.number - b.number);

    const nonNumeric = items.filter((item) => !Number.isFinite(item.number)).map((item) => item.raw);

    if (!sortable.length) {
      result.push(...nonNumeric);
      continue;
    }

    let start = sortable[0];
    let prev = sortable[0];

    for (let i = 1; i < sortable.length; i += 1) {
      const current = sortable[i];

      if (current.number === prev.number + 1) {
        prev = current;
        continue;
      }

      if (start.number === prev.number) {
        result.push(start.raw);
      } else {
        result.push(`${prefix}${start.padded}-${prefix}${prev.padded}`);
      }

      start = current;
      prev = current;
    }

    if (start.number === prev.number) {
      result.push(start.raw);
    } else {
      result.push(`${prefix}${start.padded}-${prefix}${prev.padded}`);
    }

    result.push(...nonNumeric);
  }

  return result.join(", ");
}

function getAnswerSignatureLabel(entry = {}) {
  const detailLines = Array.isArray(entry.signatureDetails)
    ? entry.signatureDetails.map((item) => safeString(item.value || "").trim()).filter(Boolean)
    : [];

  if (detailLines.length) {
    return detailLines.join(" | ");
  }

  return "Firma capturada";
}

function getPdfLineHeight(size = 10) {
  return size + 4;
}

function estimatePdfTextHeight(text = "", size = 10, width = 200) {
  const estimatedChars = Math.max(12, Math.floor(width / (size * 0.53)));
  const lines = wrapTextByChars(text, estimatedChars);
  return Math.max(getPdfLineHeight(size), lines.length * getPdfLineHeight(size));
}

function fileExistsSafe(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function wrapTextByChars(text = "", maxChars = 80) {
  const raw = String(text || "").replace(/\r/g, "");
  if (!raw.trim()) return [""];

  const sourceLines = raw.split("\n");
  const result = [];

  for (const sourceLine of sourceLines) {
    const cleanLine = sourceLine.trim();
    if (!cleanLine) {
      result.push("");
      continue;
    }

    const words = cleanLine.split(/\s+/);
    let current = "";

    for (const word of words) {
      if (!current) {
        current = word;
        continue;
      }

      const next = `${current} ${word}`;
      if (next.length > maxChars) {
        result.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current) result.push(current);
  }

  return result.length ? result : [""];
}

function drawRect(page, x, y, width, height, options = {}) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderWidth: options.borderWidth ?? 1,
    borderColor: options.borderColor || pdfRgb(BRAND.border),
    color: options.fillColor || undefined,
    opacity: typeof options.opacity === "number" ? options.opacity : 1,
  });
}

function drawLine(page, x1, y1, x2, y2, options = {}) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness: options.thickness ?? 1,
    color: options.color || pdfRgb(BRAND.border),
    opacity: typeof options.opacity === "number" ? options.opacity : 1,
  });
}

function drawText(page, text, x, y, font, size = 10, options = {}) {
  page.drawText(String(text || ""), {
    x,
    y,
    size,
    font,
    color: options.color || pdfRgb(BRAND.text),
  });
}

function drawWrappedText(page, text, x, yTop, maxWidth, font, size = 10, options = {}) {
  const lineHeight = options.lineHeight || size + 3;
  const estimatedChars = Math.max(12, Math.floor(maxWidth / (size * 0.53)));
  const lines = wrapTextByChars(text, estimatedChars);
  const color = options.color || pdfRgb(BRAND.text);

  lines.forEach((line, index) => {
    page.drawText(String(line || ""), {
      x,
      y: yTop - size - index * lineHeight,
      size,
      font,
      color,
    });
  });

  return {
    lines,
    height: Math.max(lineHeight, lines.length * lineHeight),
  };
}
async function embedPdfImageFromAny(pdfDoc, file = {}) {
  const candidates = [
    file?.dataUrl,
    file?.previewUrl,
    file?.url,
    file?.publicUrl,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    if (!candidate.startsWith("data:")) continue;

    const parsed = parseDataUrlImage(candidate);
    if (!parsed) continue;

    try {
      if (parsed.mime.includes("png")) {
        const image = await pdfDoc.embedPng(parsed.buffer);
        return { image, extension: "png" };
      }

      if (parsed.mime.includes("jpg") || parsed.mime.includes("jpeg")) {
        const image = await pdfDoc.embedJpg(parsed.buffer);
        return { image, extension: "jpeg" };
      }
    } catch {
      //
    }
  }

  return null;
}

async function drawPdfImageMosaic({
  pdfDoc,
  page,
  files = [],
  x,
  yTop,
  width,
  height,
}) {
  const images = [];

  for (const file of files) {
    const embedded = await embedPdfImageFromAny(pdfDoc, file);
    if (embedded?.image) {
      images.push(embedded.image);
    }
  }

  if (!images.length) {
    drawRect(page, x, yTop - height, width, height, {
      fillColor: pdfRgb("F8FAFC"),
      borderColor: pdfRgb(BRAND.border),
    });

    return;
  }

  const total = images.length;
  const gap = 8;

  let cols = 1;
  let rows = 1;

  if (total === 1) {
    cols = 1;
    rows = 1;
  } else if (total === 2) {
    cols = 2;
    rows = 1;
  } else if (total <= 4) {
    cols = 2;
    rows = 2;
  } else {
    cols = 3;
    rows = Math.ceil(total / 3);
  }

  const cellW = (width - gap * (cols - 1)) / cols;
  const cellH = (height - gap * (rows - 1)) / rows;

  images.slice(0, cols * rows).forEach((img, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;

    const boxX = x + col * (cellW + gap);
    const boxY = yTop - row * (cellH + gap);

    drawRect(page, boxX, boxY - cellH, cellW, cellH, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 0.8,
    });

    const imgScale = Math.min(cellW / img.width, cellH / img.height);
    const drawW = img.width * imgScale;
    const drawH = img.height * imgScale;
    const drawX = boxX + (cellW - drawW) / 2;
    const drawY = (boxY - cellH) + (cellH - drawH) / 2;

    page.drawImage(img, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  });
}

async function insertExcelImagesMosaic(workbook, worksheet, files = [], rowStart, rowEnd, colStart = 0, colEnd = 12) {
  const validFiles = (files || []).filter((file) => {
    const src = file?.dataUrl || file?.previewUrl || "";
    return typeof src === "string" && src.startsWith("data:image/");
  });

  if (!validFiles.length) return;

  const total = Math.min(validFiles.length, 6);

  let cols = 1;
  let rows = 1;

  if (total === 1) {
    cols = 1;
    rows = 1;
  } else if (total === 2) {
    cols = 2;
    rows = 1;
  } else if (total <= 4) {
    cols = 2;
    rows = 2;
  } else {
    cols = 3;
    rows = 2;
  }

  const totalCols = colEnd - colStart;
  const totalRows = rowEnd - rowStart;

  for (let idx = 0; idx < total; idx += 1) {
    const file = validFiles[idx];
    const src = file?.dataUrl || file?.previewUrl || "";
    const parsed = parseDataUrlImage(src);
    if (!parsed) continue;

    const imageId = workbook.addImage({
      buffer: parsed.buffer,
      extension: parsed.mime.includes("png") ? "png" : "jpeg",
    });

    const row = Math.floor(idx / cols);
    const col = idx % cols;

    const cellColSpan = totalCols / cols;
    const cellRowSpan = totalRows / rows;

    worksheet.addImage(imageId, {
      tl: {
        col: colStart + col * cellColSpan + 0.15,
        row: rowStart + row * cellRowSpan + 0.15,
      },
      br: {
        col: colStart + (col + 1) * cellColSpan - 0.15,
        row: rowStart + (row + 1) * cellRowSpan - 0.15,
      },
      editAs: "oneCell",
    });
  }
}
function getFieldCardHeight(entry) {
  if (entry.kind === "table_purchase" || entry.kind === "cart") {
    const rows = Array.isArray(entry.rows) ? entry.rows.length : 0;
    return 96 + rows * 20 + 24;
  }

  if (entry.kind === "signature") {
    const detailCount = Array.isArray(entry.signatureDetails)
      ? entry.signatureDetails.length
      : 0;

    return 170 + detailCount * 24;
  }

  if (entry.kind === "image") {
    const total = Array.isArray(entry.files) ? entry.files.length : 0;

    if (total <= 0) return 110;
    if (total === 1) return 188;
    if (total <= 4) return 246;
    return 286;
  }

  if (entry.kind === "file") {
    const lines = Array.isArray(entry.lines) ? entry.lines.length : 1;
    return Math.max(110, 74 + lines * 18);
  }

  const lines = Array.isArray(entry.lines) && entry.lines.length ? entry.lines.length : 1;
  return Math.max(94, 62 + lines * 17 + (entry.helpText ? 20 : 0));
}

function shouldUseFullWidth(entry) {
  return [
    "textarea",
    "address",
    "agenda",
    "table_purchase",
    "cart",
    "file",
    "image",
    "signature",
  ].includes(entry.type) || ["table_purchase", "cart", "file", "image", "signature"].includes(entry.kind);
}
function createPdfPage(pdfDoc) {
  return pdfDoc.addPage([612, 792]);
}

async function drawPdfPageScaffold({
  pdfDoc,
  page,
  model,
  font,
  fontBold,
}) {
  await drawPdfHeader({
    pdfDoc,
    page,
    model,
    font,
    fontBold,
  });

  drawMetaCard(page, 24, 612, 170, "Respondido por", model.workerName, font, fontBold);
  drawMetaCard(page, 204, 612, 130, "Departamento", model.departmentName, font, fontBold);
  drawMetaCard(page, 344, 612, 110, "Nivel", model.levelName, font, fontBold);
  drawMetaCard(page, 464, 612, 124, "Fecha", model.createdAtDisplay, font, fontBold);
}

function drawCenteredSectionTitle(page, y, title, fontBold) {
  drawRect(page, 158, y - 4, 296, 26, {
    fillColor: pdfRgb("FFFFFF"),
    borderColor: pdfRgb("B7E48A"),
    borderWidth: 1.4,
  });

  const titleWidth = fontBold.widthOfTextAtSize(title, 12);
  drawText(page, title, 306 - titleWidth / 2, y + 4, fontBold, 12, {
    color: pdfRgb("000000"),
  });
}

function getPdfContentTopY() {
  return 556;
}

function getPdfContentBottomY() {
  return 88;
}

function getPdfSectionStartY(currentY) {
  return currentY - 18;
}

async function ensurePdfPageForSection({
  pdfDoc,
  model,
  font,
  fontBold,
}) {
  const page = createPdfPage(pdfDoc);

  await drawPdfPageScaffold({
    pdfDoc,
    page,
    model,
    font,
    fontBold,
  });

  return {
    page,
    cursorY: getPdfContentTopY(),
  };
}

async function renderPdfEntriesFlow({
  pdfDoc,
  model,
  font,
  fontBold,
  initialPage,
  initialCursorY,
  entries,
  sectionTitle,
}) {
  let page = initialPage;
  let cursorY = initialCursorY;

  const colGap = 14;
  const leftX = 24;
  const rightX = 312;
  const colW = 276;
  const sectionBlockHeight = 36;

  const startNewPageWithSection = async () => {
    const next = await ensurePdfPageForSection({
      pdfDoc,
      model,
      font,
      fontBold,
    });

    page = next.page;
    cursorY = next.cursorY;

    drawCenteredSectionTitle(page, cursorY, sectionTitle, fontBold);
    cursorY = getPdfSectionStartY(cursorY);
  };

  const firstEntryHeight = entries.length ? getFieldCardHeight(entries[0]) : 0;
  if (cursorY - sectionBlockHeight - firstEntryHeight < getPdfContentBottomY()) {
    await startNewPageWithSection();
  } else {
    drawCenteredSectionTitle(page, cursorY, sectionTitle, fontBold);
    cursorY = getPdfSectionStartY(cursorY);
  }

  let leftY = cursorY;
  let rightY = cursorY;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const height = getFieldCardHeight(entry);

    if (shouldUseFullWidth(entry)) {
      const topY = Math.min(leftY, rightY);

      if (topY - height < getPdfContentBottomY()) {
        await startNewPageWithSection();
        leftY = cursorY;
        rightY = cursorY;
      }

      const fullTopY = Math.min(leftY, rightY);
       await drawEntryCard(page, entry, 24, fullTopY, 564, height, font, fontBold, pdfDoc);

      leftY = fullTopY - height - colGap - 6;
      rightY = leftY;
      continue;
    }

    const isOnlyOneEntryInSection = entries.length === 1;

    let useLeft = leftY >= rightY;
    let targetX = isOnlyOneEntryInSection ? 168 : useLeft ? leftX : rightX;
    let targetY = useLeft ? leftY : rightY;
    if (targetY - height < getPdfContentBottomY()) {
      const otherY = useLeft ? rightY : leftY;

      if (otherY - height >= getPdfContentBottomY()) {
        useLeft = !useLeft;
        targetX = useLeft ? leftX : rightX;
        targetY = useLeft ? leftY : rightY;
      } else {
        await startNewPageWithSection();
        leftY = cursorY;
        rightY = cursorY;
        useLeft = true;
        targetX = leftX;
        targetY = leftY;
      }
    }

    await drawEntryCard(
      page,
      entry,
      targetX,
      targetY,
      isOnlyOneEntryInSection ? 276 : colW,
      height,
      font,
      fontBold,
      pdfDoc
    );

    if (isOnlyOneEntryInSection) {
      leftY = targetY - height - colGap - 4;
      rightY = leftY;
    } else if (useLeft) {
      leftY = targetY - height - colGap - 4;
    } else {
      rightY = targetY - height - colGap - 4;
    }
  }

  const diffBetweenColumns = Math.abs(leftY - rightY);

  if (entries.length === 1 || diffBetweenColumns > 120) {
    // empuja el cursor de forma más equilibrada cuando quedó una sola tarjeta visible
    cursorY = Math.min(leftY, rightY);
  }

  return {
    page,
    cursorY,
  };
}

async function renderPdfSignaturesSection({
  pdfDoc,
  model,
  font,
  fontBold,
  initialPage,
  initialCursorY,
}) {
  if (!model.signatures.length) {
    return {
      page: initialPage,
      cursorY: initialCursorY,
    };
  }

  let page = initialPage;
  let cursorY = initialCursorY;

  const entries = model.signatures.slice(0, 2);
  const maxDetails = Math.max(
    ...entries.map((item) =>
      Array.isArray(item?.signatureDetails) ? item.signatureDetails.length : 0
    ),
    0
  );

  const blockHeight = 170 + maxDetails * 24;

  if (cursorY - blockHeight < getPdfContentBottomY()) {
    const next = await ensurePdfPageForSection({
      pdfDoc,
      model,
      font,
      fontBold,
    });

    page = next.page;
    cursorY = next.cursorY;
  }

  drawCenteredSectionTitle(page, cursorY, "FIRMAS", fontBold);

  let baseY = cursorY - 22;

  for (const entry of entries) {
    const details = Array.isArray(entry?.signatureDetails) ? entry.signatureDetails : [];
    const cardHeight = 120 + details.length * 24;

    drawRect(page, 96, baseY - cardHeight, 420, cardHeight, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(BRAND.border),
    });

    drawRect(page, 96, baseY - 32, 420, 32, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.navy),
    });

    const title = entry?.label || "Firma";
    const titleWidth = fontBold.widthOfTextAtSize(title, 11);
    drawText(page, title, 306 - titleWidth / 2, baseY - 20, fontBold, 11, {
      color: pdfRgb("FFFFFF"),
    });

    drawLine(page, 156, baseY - 82, 456, baseY - 82, {
      color: pdfRgb(BRAND.text),
      thickness: 1,
    });

    const signature = parseDataUrlImage(entry?.signature || "");
    if (signature) {
      const image = signature.mime.includes("png")
        ? await pdfDoc.embedPng(signature.buffer)
        : await pdfDoc.embedJpg(signature.buffer);

      page.drawImage(image, {
        x: 168,
        y: baseY - 78,
        width: 276,
        height: 42,
      });
    }

    let detailY = baseY - 102;

    details.forEach((detail) => {
      drawRect(page, 146, detailY - 18, 320, 20, {
        fillColor: pdfRgb(BRAND.navy),
        borderColor: pdfRgb(BRAND.navy),
      });

      const text = safeString(detail.value || "—");
      const textWidth = fontBold.widthOfTextAtSize(text, 9);
      drawText(page, text, 306 - textWidth / 2, detailY - 11, fontBold, 9, {
        color: pdfRgb("FFFFFF"),
      });

      detailY -= 24;
    });

    baseY -= cardHeight + 18;
  }

  return {
    page,
    cursorY: baseY - 4,
  };
}
async function embedLogo(pdfDoc) {
  if (!fileExistsSafe(LOGO_PATH)) return null;

  const logoBytes = fs.readFileSync(LOGO_PATH);
  const ext = path.extname(LOGO_PATH).toLowerCase();

  if (ext === ".jpg" || ext === ".jpeg") {
    return pdfDoc.embedJpg(logoBytes);
  }

  return pdfDoc.embedPng(logoBytes);
}

async function drawPdfHeader({ pdfDoc, page, model, font, fontBold }) {
  const headerY = 678;
  const headerHeight = 92;

  drawRect(page, 24, headerY, 564, headerHeight, {
    fillColor: pdfRgb(BRAND.navy),
    borderColor: pdfRgb(BRAND.navy),
  });

  const logo = await embedLogo(pdfDoc);
  if (logo) {
    page.drawImage(logo, {
      x: 36,
      y: headerY + 16,
      width: 108,
      height: 62,
    });
  }

  drawText(page, model.title || "Formulario", 158, headerY + 60, fontBold, 20, {
    color: pdfRgb("FFFFFF"),
  });

  if (model.description) {
    drawWrappedText(page, model.description, 158, headerY + 42, 250, font, 9, {
      color: pdfRgb("E2E8F0"),
      lineHeight: 12,
    });
  }

  drawText(page, "FOLIO", 500, headerY + 60, fontBold, 12, {
    color: pdfRgb("FFFFFF"),
  });

  const folioText = String(model.folio || "—");
  const folioWidth = fontBold.widthOfTextAtSize(folioText, 18);
  drawText(page, folioText, 518 - folioWidth / 2, headerY + 30, fontBold, 18, {
    color: pdfRgb("FFFFFF"),
  });

  drawRect(page, 24, headerY - 8, 564, 5, {
    fillColor: pdfRgb(BRAND.green),
    borderColor: pdfRgb(BRAND.green),
  });
}

function drawMetaCard(page, x, y, width, label, value, font, fontBold) {
  drawRect(page, x, y, width, 50, {
    fillColor: pdfRgb("FFFFFF"),
    borderColor: pdfRgb(BRAND.border),
  });

  drawText(page, label, x + 12, y + 32, fontBold, 8, { color: pdfRgb(BRAND.muted) });
  drawWrappedText(page, value || "—", x + 12, y + 26, width - 24, fontBold, 11, {
    color: pdfRgb(BRAND.text),
    lineHeight: 13,
  });
}
async function drawEntryCard(page, entry, x, y, width, height, font, fontBold, pdfDoc) {
  drawRect(page, x, y - height, width, height, {
    fillColor: pdfRgb("FFFFFF"),
    borderColor: pdfRgb("C9D5E2"),
    borderWidth: 1.1,
  });

  drawRect(page, x, y - 42, width, 42, {
    fillColor: pdfRgb(BRAND.navy),
    borderColor: pdfRgb(BRAND.navy),
    borderWidth: 1.1,
  });

  const title = entry.label || "Campo";
  const titleWidth = fontBold.widthOfTextAtSize(title, 11);
  drawText(page, title, x + width / 2 - titleWidth / 2, y - 27, fontBold, 11, {
    color: pdfRgb("FFFFFF"),
  });

  if (entry.required) {
    drawText(page, "*", x + width - 16, y - 27, fontBold, 12, {
      color: pdfRgb("FF6B6B"),
    });
  }

  if (entry.helpText) {
    drawWrappedText(page, entry.helpText, x + 12, y - 50, width - 24, font, 8, {
      color: pdfRgb(BRAND.muted),
      lineHeight: 10,
    });
  }

  const bodyTop = y - (entry.helpText ? 68 : 50);

  if (entry.kind === "traffic_light") {
    const badgeColor = entry.color || "#94A3B8";
    drawRect(page, x + 12, bodyTop - 32, 180, 28, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(badgeColor),
      borderWidth: 1.2,
    });

    drawRect(page, x + 22, bodyTop - 23, 11, 11, {
      fillColor: pdfRgb(badgeColor),
      borderColor: pdfRgb(badgeColor),
      borderWidth: 1,
    });

    drawText(page, entry.text || "—", x + 40, bodyTop - 22, fontBold, 11, {
      color: pdfRgb(BRAND.text),
    });
    return;
  }

  if (entry.kind === "table_purchase" || entry.kind === "cart") {
    const rows = Array.isArray(entry.rows) ? entry.rows : [];
    const col1 = entry.kind === "table_purchase" ? "Descripción" : "Producto";
    const col2 = "Cant.";
    const col3 = entry.kind === "table_purchase" ? "Costo" : "Precio";
    const col4 = "Importe";

    const tableX = x + 12;
    const tableY = bodyTop - 8;
    const tableW = width - 24;
    const colW = [tableW * 0.43, tableW * 0.14, tableW * 0.20, tableW * 0.23];
    const rowH = 20;

    drawRect(page, tableX, tableY - rowH, tableW, rowH, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.navy),
    });

    drawText(page, col1, tableX + 6, tableY - 13, fontBold, 8, { color: pdfRgb("FFFFFF") });
    drawText(page, col2, tableX + colW[0] + 6, tableY - 13, fontBold, 8, { color: pdfRgb("FFFFFF") });
    drawText(page, col3, tableX + colW[0] + colW[1] + 6, tableY - 13, fontBold, 8, { color: pdfRgb("FFFFFF") });
    drawText(page, col4, tableX + colW[0] + colW[1] + colW[2] + 6, tableY - 13, fontBold, 8, {
      color: pdfRgb("FFFFFF"),
    });

    let cursorY = tableY - rowH;
    rows.forEach((row, idx) => {
      cursorY -= rowH;

      drawRect(page, tableX, cursorY, tableW, rowH, {
        fillColor: pdfRgb(idx % 2 === 0 ? "FFFFFF" : "F6F9FC"),
        borderColor: pdfRgb(BRAND.border),
        borderWidth: 0.6,
      });

      const values =
        entry.kind === "table_purchase"
          ? [row.descripcion, row.cantidad, row.costo, row.importe]
          : [row.producto, row.cantidad, row.precio, row.importe];

      drawText(page, values[0], tableX + 6, cursorY + 6, font, 8.5);
      drawText(page, values[1], tableX + colW[0] + 6, cursorY + 6, font, 8.5);
      drawText(page, values[2], tableX + colW[0] + colW[1] + 6, cursorY + 6, font, 8.5);
      drawText(page, values[3], tableX + colW[0] + colW[1] + colW[2] + 6, cursorY + 6, font, 8.5);
    });

    return;
  }

  if (entry.kind === "signature") {
    const detailLines = Array.isArray(entry.signatureDetails)
      ? entry.signatureDetails.map((item) => item.value).filter(Boolean)
      : [];

    if (detailLines.length) {
      drawWrappedText(page, detailLines.join("\n"), x + 16, bodyTop, width - 32, fontBold, 9.5, {
        color: pdfRgb(BRAND.text),
        lineHeight: 13,
      });
    }

    const parsed = parseDataUrlImage(entry.signature || "");
    if (parsed) {
      const img = parsed.mime.includes("png")
        ? await pdfDoc.embedPng(parsed.buffer)
        : await pdfDoc.embedJpg(parsed.buffer);

      const sigMaxW = width - 64;
      const sigMaxH = 58;
      const scale = Math.min(sigMaxW / img.width, sigMaxH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = x + (width - drawW) / 2;
      const drawY = y - height + 22;

      drawLine(page, x + 24, drawY + drawH + 6, x + width - 24, drawY + drawH + 6, {
        color: pdfRgb(BRAND.text),
        thickness: 1,
      });

      page.drawImage(img, {
        x: drawX,
        y: drawY + 10,
        width: drawW,
        height: drawH,
      });
    }

    return;
  }

  if (entry.kind === "image") {
    const files = Array.isArray(entry.files) ? entry.files : [];

    await drawPdfImageMosaic({
      pdfDoc,
      page,
      files,
      x: x + 14,
      yTop: bodyTop - 4,
      width: width - 28,
      height: height - 66,
    });

    return;
  }

  if (entry.kind === "file") {
    const text = Array.isArray(entry.lines) && entry.lines.length
      ? entry.lines.join("\n")
      : entry.text || "—";

    drawWrappedText(page, text || "—", x + 18, bodyTop, width - 36, font, 10, {
      color: pdfRgb(BRAND.text),
      lineHeight: 14,
    });

    return;
  }

  const text = Array.isArray(entry.lines) && entry.lines.length ? entry.lines.join("\n") : entry.text || "—";
  drawWrappedText(page, text || "—", x + 18, bodyTop, width - 36, font, 10.5, {
    color: pdfRgb(BRAND.text),
    lineHeight: 14,
  });
}

async function generatePdfBuffer(form, answer) {
  const model = buildExportModel(form, answer);

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = createPdfPage(pdfDoc);

  await drawPdfPageScaffold({
    pdfDoc,
    page,
    model,
    font,
    fontBold,
  });

  const PAGE_LEFT = 24;
  const PAGE_RIGHT = 588;
  const PAGE_TOP = 556;
  const PAGE_BOTTOM = 54;
  const CONTENT_W = PAGE_RIGHT - PAGE_LEFT;

  let cursorY = PAGE_TOP;

  function ensureSpace(heightNeeded = 30) {
    if (cursorY - heightNeeded >= PAGE_BOTTOM) return true;
    return false;
  }

  async function newPage() {
    page = createPdfPage(pdfDoc);

    await drawPdfPageScaffold({
      pdfDoc,
      page,
      model,
      font,
      fontBold,
    });

    cursorY = PAGE_TOP;
  }

  async function ensurePageSpace(heightNeeded = 30) {
    if (!ensureSpace(heightNeeded)) {
      await newPage();
    }
  }

  function drawSectionTitle(title) {
    drawRect(page, 158, cursorY - 4, 296, 24, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb("B7E48A"),
      borderWidth: 1.4,
    });

    const titleWidth = fontBold.widthOfTextAtSize(title, 12);
    drawText(page, title, 306 - titleWidth / 2, cursorY + 4, fontBold, 12, {
      color: pdfRgb("000000"),
    });

    cursorY -= 30;
  }

  function drawLabelValueRow(label, value, options = {}) {
    const leftW = options.leftWidth || 170;
    const rightW = CONTENT_W - leftW;
    const x1 = PAGE_LEFT;
    const x2 = PAGE_LEFT + leftW;

    const text = safeString(value || "—");
    const textHeight = estimatePdfTextHeight(text, 10.5, rightW - 18);
    const rowH = Math.max(26, textHeight + 12);

    drawRect(page, x1, cursorY, leftW, rowH, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    drawRect(page, x2, cursorY, rightW, rowH, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    const labelWidth = fontBold.widthOfTextAtSize(label, 10);
    drawText(page, label, x1 + (leftW / 2) - (labelWidth / 2), cursorY + rowH - 17, fontBold, 10, {
      color: pdfRgb("FFFFFF"),
    });

    drawWrappedText(page, text, x2 + 8, cursorY + rowH - 7, rightW - 16, font, 10.5, {
      color: pdfRgb(BRAND.text),
      lineHeight: 14,
    });

    cursorY -= rowH;
  }

  function drawSimpleTextCard(title, lines = []) {
    const textLines = Array.isArray(lines) && lines.length ? lines : ["—"];
    const text = textLines.join("\n");
    const bodyHeight = Math.max(42, estimatePdfTextHeight(text, 10, CONTENT_W - 30) + 12);
    const totalH = 28 + bodyHeight;

    drawRect(page, PAGE_LEFT, cursorY, CONTENT_W, 28, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    drawRect(page, PAGE_LEFT, cursorY - totalH + 28, CONTENT_W, bodyHeight, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    const titleWidth = fontBold.widthOfTextAtSize(title, 10.5);
    drawText(page, title, PAGE_LEFT + CONTENT_W / 2 - titleWidth / 2, cursorY + 9, fontBold, 10.5, {
      color: pdfRgb("FFFFFF"),
    });

    drawWrappedText(page, text, PAGE_LEFT + 10, cursorY - 8, CONTENT_W - 20, font, 10, {
      color: pdfRgb(BRAND.text),
      lineHeight: 14,
    });

    cursorY -= totalH;
  }

  function drawTrafficRow(title, value, colorHex = "#94A3B8") {
    const totalH = 56;

    drawRect(page, PAGE_LEFT, cursorY, CONTENT_W, 28, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    drawRect(page, PAGE_LEFT, cursorY - 28, CONTENT_W, 28, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    const titleWidth = fontBold.widthOfTextAtSize(title, 10.5);
    drawText(page, title, PAGE_LEFT + CONTENT_W / 2 - titleWidth / 2, cursorY + 9, fontBold, 10.5, {
      color: pdfRgb("FFFFFF"),
    });

    drawRect(page, PAGE_LEFT + 16, cursorY - 20, 10, 10, {
      fillColor: pdfRgb(colorHex),
      borderColor: pdfRgb(colorHex),
      borderWidth: 1,
    });

    drawText(page, value || "—", PAGE_LEFT + 34, cursorY - 19, fontBold, 10, {
      color: pdfRgb(BRAND.text),
    });

    cursorY -= totalH;
  }

  async function drawSignatureBlock(entry) {
    const detailLabel = getAnswerSignatureLabel(entry);
    const blockH = 138;

    drawRect(page, 96, cursorY, 420, 28, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    drawRect(page, 96, cursorY - blockH + 28, 420, blockH - 28, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    const title = entry.label || "Firma";
    const titleWidth = fontBold.widthOfTextAtSize(title, 10.5);
    drawText(page, title, 306 - titleWidth / 2, cursorY + 9, fontBold, 10.5, {
      color: pdfRgb("FFFFFF"),
    });

    drawLine(page, 156, cursorY - 86, 456, cursorY - 86, {
      color: pdfRgb(BRAND.text),
      thickness: 1,
    });

    const parsed = parseDataUrlImage(entry.signature || "");
    if (parsed) {
      const img = parsed.mime.includes("png")
        ? await pdfDoc.embedPng(parsed.buffer)
        : await pdfDoc.embedJpg(parsed.buffer);

      const maxW = 260;
      const maxH = 54;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const drawX = 306 - drawW / 2;
      const drawY = cursorY - 82 - (drawH / 2) + 12;

      page.drawImage(img, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
      });
    }

    drawRect(page, 146, cursorY - 120, 320, 20, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.navy),
      borderWidth: 1,
    });

    const labelWidth = fontBold.widthOfTextAtSize(detailLabel, 9);
    drawText(page, detailLabel, 306 - labelWidth / 2, cursorY - 114, fontBold, 9, {
      color: pdfRgb("FFFFFF"),
    });

    cursorY -= blockH;
  }

  async function drawImageBlock(entry) {
    const files = Array.isArray(entry.files) ? entry.files : [];
    const galleryH = files.length <= 1 ? 180 : files.length <= 4 ? 220 : 270;
    const totalH = 28 + galleryH;

    drawRect(page, PAGE_LEFT, cursorY, CONTENT_W, 28, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    drawRect(page, PAGE_LEFT, cursorY - totalH + 28, CONTENT_W, galleryH, {
      fillColor: pdfRgb("FFFFFF"),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    const titleWidth = fontBold.widthOfTextAtSize(entry.label || "Evidencia", 10.5);
    drawText(page, entry.label || "Evidencia", PAGE_LEFT + CONTENT_W / 2 - titleWidth / 2, cursorY + 9, fontBold, 10.5, {
      color: pdfRgb("FFFFFF"),
    });

    await drawPdfImageMosaic({
      pdfDoc,
      page,
      files,
      x: PAGE_LEFT + 10,
      yTop: cursorY - 8,
      width: CONTENT_W - 20,
      height: galleryH - 18,
    });

    cursorY -= totalH;
  }

  function drawStructuredTable(entry) {
    const rows = Array.isArray(entry.rows) ? entry.rows : [];
    const rowH = 22;
    const tableH = 28 + 24 + Math.max(1, rows.length) * rowH;

    drawRect(page, PAGE_LEFT, cursorY, CONTENT_W, 28, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    const titleWidth = fontBold.widthOfTextAtSize(entry.label || "Detalle", 10.5);
    drawText(page, entry.label || "Detalle", PAGE_LEFT + CONTENT_W / 2 - titleWidth / 2, cursorY + 9, fontBold, 10.5, {
      color: pdfRgb("FFFFFF"),
    });

    const tableY = cursorY - 28;
    const colW = [CONTENT_W * 0.44, CONTENT_W * 0.14, CONTENT_W * 0.20, CONTENT_W * 0.22];
    const h1 = entry.kind === "table_purchase" ? "Descripción" : "Producto";
    const h2 = "Cantidad";
    const h3 = entry.kind === "table_purchase" ? "Costo" : "Precio";
    const h4 = "Importe";

    drawRect(page, PAGE_LEFT, tableY, CONTENT_W, 24, {
      fillColor: pdfRgb(BRAND.navy),
      borderColor: pdfRgb(BRAND.border),
      borderWidth: 1,
    });

    drawText(page, h1, PAGE_LEFT + 8, tableY + 8, fontBold, 9, { color: pdfRgb("FFFFFF") });
    drawText(page, h2, PAGE_LEFT + colW[0] + 8, tableY + 8, fontBold, 9, { color: pdfRgb("FFFFFF") });
    drawText(page, h3, PAGE_LEFT + colW[0] + colW[1] + 8, tableY + 8, fontBold, 9, { color: pdfRgb("FFFFFF") });
    drawText(page, h4, PAGE_LEFT + colW[0] + colW[1] + colW[2] + 8, tableY + 8, fontBold, 9, { color: pdfRgb("FFFFFF") });

    let rowTop = tableY - 24;
    const printableRows = rows.length ? rows : [{}];

    printableRows.forEach((row, idx) => {
      drawRect(page, PAGE_LEFT, rowTop, CONTENT_W, rowH, {
        fillColor: pdfRgb(idx % 2 === 0 ? "FFFFFF" : "F8FBFF"),
        borderColor: pdfRgb(BRAND.border),
        borderWidth: 1,
      });

      const values = entry.kind === "table_purchase"
        ? [
            row.descripcion || "—",
            safeString(row.cantidad || "0"),
            safeString(row.costo || "—"),
            safeString(row.importe || "—"),
          ]
        : [
            row.producto || "—",
            safeString(row.cantidad || "0"),
            safeString(row.precio || "—"),
            safeString(row.importe || "—"),
          ];

      drawText(page, values[0], PAGE_LEFT + 8, rowTop + 7, font, 8.5, { color: pdfRgb(BRAND.text) });
      drawText(page, values[1], PAGE_LEFT + colW[0] + 8, rowTop + 7, font, 8.5, { color: pdfRgb(BRAND.text) });
      drawText(page, values[2], PAGE_LEFT + colW[0] + colW[1] + 8, rowTop + 7, font, 8.5, { color: pdfRgb(BRAND.text) });
      drawText(page, values[3], PAGE_LEFT + colW[0] + colW[1] + colW[2] + 8, rowTop + 7, font, 8.5, { color: pdfRgb(BRAND.text) });

      rowTop -= rowH;
    });

    cursorY -= tableH;
  }

  const principalEntries = getPrintablePrincipalEntries(model);
  const detailEntries = getPrintableDetailEntries(model);
  const signatureEntries = [...(model.signatures || [])];

  if (principalEntries.length) {
    await ensurePageSpace(60);
    drawSectionTitle("DATOS PRINCIPALES");

    for (const entry of principalEntries) {
      const value = flattenEntryForGridCell(entry) || "—";
      const estimatedHeight = Math.max(26, estimatePdfTextHeight(value, 10.5, CONTENT_W - 186) + 12);

      await ensurePageSpace(estimatedHeight + 4);
      drawLabelValueRow(entry.label || "Campo", value);
    }

    cursorY -= 10;
  }

  if (detailEntries.length) {
    await ensurePageSpace(60);
    drawSectionTitle("DETALLE DE RESPUESTAS");

    for (const entry of detailEntries) {
      if (entry.kind === "traffic_light") {
        await ensurePageSpace(64);
        drawTrafficRow(entry.label || "Campo", entry.text || "—", entry.color || "#94A3B8");
        continue;
      }

      if (entry.kind === "table_purchase" || entry.kind === "cart") {
        const rows = Array.isArray(entry.rows) ? entry.rows.length : 1;
        const needed = 28 + 24 + Math.max(1, rows) * 22 + 6;
        await ensurePageSpace(needed);
        drawStructuredTable(entry);
        continue;
      }

      if (entry.kind === "image") {
        const files = Array.isArray(entry.files) ? entry.files.length : 0;
        const galleryH = files <= 1 ? 180 : files <= 4 ? 220 : 270;
        await ensurePageSpace(28 + galleryH + 8);
        await drawImageBlock(entry);
        continue;
      }

      const lines = Array.isArray(entry.lines) && entry.lines.length ? entry.lines : [entry.text || "—"];
      const estimated = Math.max(42, estimatePdfTextHeight(lines.join("\n"), 10, CONTENT_W - 30) + 12);
      await ensurePageSpace(28 + estimated + 8);
      drawSimpleTextCard(entry.label || "Campo", lines);
    }

    cursorY -= 10;
  }

  if (signatureEntries.length) {
    await ensurePageSpace(60);
    drawSectionTitle("FIRMAS");

    for (const entry of signatureEntries) {
      await ensurePageSpace(150);
      await drawSignatureBlock(entry);
      cursorY -= 8;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function setCellBorder(cell) {
  cell.border = {
    top: { style: "thin", color: { argb: BRAND.border } },
    left: { style: "thin", color: { argb: BRAND.border } },
    bottom: { style: "thin", color: { argb: BRAND.border } },
    right: { style: "thin", color: { argb: BRAND.border } },
  };
}

function styleSectionTitle(ws, row, fromCol, toCol, title) {
  ws.mergeCells(row, fromCol, row, toCol);
  const cell = ws.getCell(row, fromCol);
  cell.value = title;
  cell.font = { bold: true, size: 12, color: { argb: "000000" } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF" },
  };
  cell.border = {
    top: { style: "thin", color: { argb: "B7E48A" } },
    left: { style: "thin", color: { argb: "B7E48A" } },
    bottom: { style: "thin", color: { argb: "B7E48A" } },
    right: { style: "thin", color: { argb: "B7E48A" } },
  };
  ws.getRow(row).height = 24;
}

function writeLabelValueRow(ws, row, label, value) {
  ws.mergeCells(`A${row}:D${row}`);
  ws.mergeCells(`E${row}:L${row}`);

  const labelCell = ws.getCell(`A${row}`);
  labelCell.value = label;
  labelCell.font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
  labelCell.alignment = { horizontal: "center", vertical: "middle" };
  labelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };

  const valueCell = ws.getCell(`E${row}`);
  valueCell.value = value || "—";
  valueCell.font = { bold: false, size: 11, color: { argb: BRAND.text } };
  valueCell.alignment = { vertical: "middle", wrapText: true };
  valueCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF" },
  };

  setCellBorder(labelCell);
  setCellBorder(valueCell);

  const estimatedLines = wrapTextByChars(value || "—", 70).length || 1;
  ws.getRow(row).height = Math.max(26, estimatedLines * 17);
}

function writeFieldCardExcel(ws, startRow, entry) {
  const titleRow = startRow;
  const bodyRow = startRow + 1;
  const spacerRow = startRow + 2;

  ws.mergeCells(`A${titleRow}:L${titleRow}`);
  ws.mergeCells(`A${bodyRow}:L${bodyRow}`);

  const titleCell = ws.getCell(`A${titleRow}`);
  titleCell.value = entry.label || "Campo";
  titleCell.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  setCellBorder(titleCell);

  const bodyCell = ws.getCell(`A${bodyRow}`);
  bodyCell.font = { size: 11, color: { argb: BRAND.text } };
  bodyCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  bodyCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF" },
  };
  setCellBorder(bodyCell);

  ws.getRow(titleRow).height = 26;
  ws.getRow(spacerRow).height = 10;

  if (entry.kind === "table_purchase" || entry.kind === "cart") {
    bodyCell.value = "";
    ws.getRow(bodyRow).height = 12;
    return {
      nextRow: spacerRow + 1,
      tableStartRow: bodyRow + 1,
    };
  }

  if (entry.kind === "signature") {
    const detailLines = Array.isArray(entry.signatureDetails)
      ? entry.signatureDetails.map((item) => item.value).filter(Boolean)
      : [];

    bodyCell.value = detailLines.length ? detailLines.join("\n") : "Firma capturada";
    bodyCell.alignment = { horizontal: "center", vertical: "bottom", wrapText: true };
    ws.getRow(bodyRow).height = Math.max(82, 42 + detailLines.length * 18);

    return {
      nextRow: spacerRow + 1,
      signatureRow: bodyRow,
    };
  }

  if (entry.kind === "image") {
    bodyCell.value = "";
    ws.getRow(bodyRow).height = 120;

    return {
      nextRow: spacerRow + 1,
      imageRow: bodyRow,
      imageRowEnd: bodyRow + 4,
    };
  }

  if (entry.kind === "file") {
    const text =
      Array.isArray(entry.lines) && entry.lines.length
        ? entry.lines.join("\n\n")
        : entry.text || "—";

    bodyCell.value = text || "—";
    bodyCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    const lines = wrapTextByChars(text || "—", 80).length || 1;
    ws.getRow(bodyRow).height = Math.max(44, lines * 18);

    return {
      nextRow: spacerRow + 1,
    };
  }

  const text =
    Array.isArray(entry.lines) && entry.lines.length
      ? entry.lines.join("\n\n")
      : entry.text || "—";

  bodyCell.value = text || "—";
  const lines = wrapTextByChars(text || "—", 80).length || 1;
  ws.getRow(bodyRow).height = Math.max(38, lines * 18);

  return {
    nextRow: spacerRow + 1,
  };
}
async function insertExcelSignatureImage(
  workbook,
  worksheet,
  dataUrl,
  rowStart,
  rowEnd,
  colStart = 0,
  colEnd = 12
) {
  const parsed = parseDataUrlImage(dataUrl);
  if (!parsed) return;

  await addContainedExcelImage({
    workbook,
    worksheet,
    buffer: parsed.buffer,
    mime: parsed.mime,
    rowStart,
    rowEnd,
    colStart,
    colEnd,
    paddingX: 22,
    paddingY: 10,
  });
}

async function insertExcelLogo(workbook, worksheet) {
  if (!fileExistsSafe(LOGO_PATH)) return;

  const ext = path.extname(LOGO_PATH).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  const buffer = fs.readFileSync(LOGO_PATH);

  await addContainedExcelImage({
    workbook,
    worksheet,
    buffer,
    mime,
    rowStart: 1,
    rowEnd: 3,
    colStart: 0,
    colEnd: 3,
    paddingX: 18,
    paddingY: 6,
  });
}

async function generateExcelBuffer(form, answer) {
  const model = buildExportModel(form, answer);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OpenAI";
  workbook.lastModifiedBy = "OpenAI";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Respuesta", {
    views: [{ state: "frozen", ySplit: 6 }],
    properties: { defaultRowHeight: 20 },
  });

  worksheet.columns = [
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  await insertExcelLogo(workbook, worksheet);

  worksheet.mergeCells("D1:I2");
  const titleCell = worksheet.getCell("D1");
  titleCell.value = model.title || "Formulario";
  titleCell.font = { bold: true, size: 18, color: { argb: BRAND.text } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("D3:I4");
  const descCell = worksheet.getCell("D3");
  descCell.value = model.description || "Exportación de respuesta";
  descCell.font = { size: 10, color: { argb: BRAND.muted } };
  descCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  worksheet.mergeCells("J1:L1");
  const folioTitleCell = worksheet.getCell("J1");
  folioTitleCell.value = "FOLIO";
  folioTitleCell.font = { bold: true, size: 12, color: { argb: "FFFFFF" } };
  folioTitleCell.alignment = { horizontal: "center", vertical: "middle" };
  folioTitleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };
  setCellBorder(folioTitleCell);

  worksheet.mergeCells("J2:L3");
  const folioValueCell = worksheet.getCell("J2");
  folioValueCell.value = model.folio || "—";
  folioValueCell.font = { bold: true, size: 18, color: { argb: "FFFFFF" } };
  folioValueCell.alignment = { horizontal: "center", vertical: "middle" };
  folioValueCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };
  setCellBorder(folioValueCell);

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 24;
  worksheet.getRow(4).height = 20;

  styleSectionTitle(worksheet, 6, 1, 12, "DATOS GENERALES");
  writeLabelValueRow(worksheet, 7, "Respondido por", model.workerName);
  writeLabelValueRow(worksheet, 8, "Departamento", model.departmentName);
  writeLabelValueRow(worksheet, 9, "Nivel", model.levelName);
  writeLabelValueRow(worksheet, 10, "Fecha", model.createdAtDisplay);

  let row = 12;

  const principalEntries = getPrintablePrincipalEntries(model);
  const detailEntries = getPrintableDetailEntries(model);
  const signatureEntries = [...(model.signatures || [])];

  if (principalEntries.length) {
    styleSectionTitle(worksheet, row, 1, 12, "DATOS PRINCIPALES");
    row += 1;

    for (const entry of principalEntries) {
      const text = flattenEntryForGridCell(entry) || "—";
      writeLabelValueRow(worksheet, row, entry.label || "Campo", text);
      worksheet.getRow(row).height = Math.max(26, wrapTextByChars(text, 80).length * 16);
      row += 1;
    }

    row += 1;
  }

  if (detailEntries.length) {
    styleSectionTitle(worksheet, row, 1, 12, "DETALLE DE RESPUESTAS");
    row += 1;

    for (const entry of detailEntries) {
      if (entry.kind === "table_purchase" || entry.kind === "cart") {
        worksheet.mergeCells(`A${row}:L${row}`);
        const titleCell2 = worksheet.getCell(`A${row}`);
        titleCell2.value = entry.label || "Detalle";
        titleCell2.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
        titleCell2.alignment = { horizontal: "center", vertical: "middle" };
        titleCell2.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: BRAND.navy },
        };
        setCellBorder(titleCell2);
        worksheet.getRow(row).height = 24;
        row += 1;

        worksheet.mergeCells(`A${row}:E${row}`);
        worksheet.mergeCells(`F${row}:G${row}`);
        worksheet.mergeCells(`H${row}:I${row}`);
        worksheet.mergeCells(`J${row}:L${row}`);

        worksheet.getCell(`A${row}`).value = entry.kind === "table_purchase" ? "Descripción" : "Producto";
        worksheet.getCell(`F${row}`).value = "Cantidad";
        worksheet.getCell(`H${row}`).value = entry.kind === "table_purchase" ? "Costo" : "Precio";
        worksheet.getCell(`J${row}`).value = "Importe";

        ["A", "F", "H", "J"].forEach((col) => {
          const cell = worksheet.getCell(`${col}${row}`);
          cell.font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: BRAND.navy },
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          setCellBorder(cell);
        });

        worksheet.getRow(row).height = 22;
        row += 1;

        const rows = Array.isArray(entry.rows) && entry.rows.length ? entry.rows : [{}];

        rows.forEach((tableRow, index) => {
          worksheet.mergeCells(`A${row}:E${row}`);
          worksheet.mergeCells(`F${row}:G${row}`);
          worksheet.mergeCells(`H${row}:I${row}`);
          worksheet.mergeCells(`J${row}:L${row}`);

          const values = entry.kind === "table_purchase"
            ? [
                tableRow.descripcion || "—",
                safeString(tableRow.cantidad || "0"),
                safeString(tableRow.costo || "—"),
                safeString(tableRow.importe || "—"),
              ]
            : [
                tableRow.producto || "—",
                safeString(tableRow.cantidad || "0"),
                safeString(tableRow.precio || "—"),
                safeString(tableRow.importe || "—"),
              ];

          worksheet.getCell(`A${row}`).value = values[0];
          worksheet.getCell(`F${row}`).value = values[1];
          worksheet.getCell(`H${row}`).value = values[2];
          worksheet.getCell(`J${row}`).value = values[3];

          ["A", "F", "H", "J"].forEach((col) => {
            const cell = worksheet.getCell(`${col}${row}`);
            cell.font = { size: 10.5, color: { argb: BRAND.text } };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: index % 2 === 0 ? "FFFFFF" : BRAND.soft },
            };
            setCellBorder(cell);
          });

          worksheet.getRow(row).height = 24;
          row += 1;
        });

        row += 1;
        continue;
      }

      if (entry.kind === "image") {
        worksheet.mergeCells(`A${row}:L${row}`);
        const titleCell2 = worksheet.getCell(`A${row}`);
        titleCell2.value = entry.label || "Evidencia";
        titleCell2.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
        titleCell2.alignment = { horizontal: "center", vertical: "middle" };
        titleCell2.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: BRAND.navy },
        };
        setCellBorder(titleCell2);
        worksheet.getRow(row).height = 24;
        row += 1;

        const imageStartRow = row;
        const imageEndRow = row + 5;

        worksheet.mergeCells(`A${imageStartRow}:L${imageEndRow}`);
        const imgCell = worksheet.getCell(`A${imageStartRow}`);
        imgCell.value = "";
        imgCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFF" },
        };
        setCellBorder(imgCell);

        for (let r = imageStartRow; r <= imageEndRow; r += 1) {
          worksheet.getRow(r).height = 34;
        }

        await insertExcelImagesMosaic(
          workbook,
          worksheet,
          entry.files || [],
          imageStartRow,
          imageEndRow,
          0,
          12
        );

        row = imageEndRow + 2;
        continue;
      }

      if (entry.kind === "traffic_light") {
        writeLabelValueRow(worksheet, row, entry.label || "Campo", entry.text || "—");
        const valueCell = worksheet.getCell(`E${row}`);
        valueCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: excelArgb(entry.color || "FFFFFF") },
        };
        valueCell.font = { bold: true, size: 11, color: { argb: BRAND.text } };
        worksheet.getRow(row).height = 24;
        row += 1;
        continue;
      }

      const text =
        Array.isArray(entry.lines) && entry.lines.length
          ? entry.lines.join("\n")
          : entry.text || "—";

      writeLabelValueRow(worksheet, row, entry.label || "Campo", text);
      worksheet.getRow(row).height = Math.max(28, wrapTextByChars(text, 82).length * 16);
      row += 1;
    }

    row += 1;
  }

  if (signatureEntries.length) {
    styleSectionTitle(worksheet, row, 1, 12, "FIRMAS");
    row += 1;

    for (const entry of signatureEntries) {
      const titleRow = row;
      const imageStartRow = row + 1;
      const imageEndRow = row + 6;
      const detailRow = row + 7;

      worksheet.mergeCells(`A${titleRow}:L${titleRow}`);
      const titleCell2 = worksheet.getCell(`A${titleRow}`);
      titleCell2.value = entry.label || "Firma";
      titleCell2.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
      titleCell2.alignment = { horizontal: "center", vertical: "middle" };
      titleCell2.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BRAND.navy },
      };
      setCellBorder(titleCell2);
      worksheet.getRow(titleRow).height = 24;

      worksheet.mergeCells(`A${imageStartRow}:L${imageEndRow}`);
      const signatureBoxCell = worksheet.getCell(`A${imageStartRow}`);
      signatureBoxCell.value = "";
      signatureBoxCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF" },
      };
      setCellBorder(signatureBoxCell);

      for (let r = imageStartRow; r <= imageEndRow; r += 1) {
        worksheet.getRow(r).height = 32;
      }

      if (entry.signature) {
        await insertExcelSignatureImage(
          workbook,
          worksheet,
          entry.signature,
          imageStartRow,
          imageEndRow + 1,
          0,
          12
        );
      }

      worksheet.mergeCells(`A${detailRow}:L${detailRow}`);
      const detailCell = worksheet.getCell(`A${detailRow}`);
      detailCell.value = getAnswerSignatureLabel(entry);
      detailCell.font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
      detailCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      detailCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: BRAND.navy },
      };
      setCellBorder(detailCell);
      worksheet.getRow(detailRow).height = 22;

      row = detailRow + 2;
    }
  }
  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.3,
      right: 0.3,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
function excelArgb(hex = "FFFFFF") {
  return String(hex || "FFFFFF").replace("#", "").toUpperCase().padEnd(6, "0").slice(0, 6);
}

function flattenEntryForGridCell(entry) {
  if (!entry) return "—";

  if (entry.kind === "signature") {
    const details = Array.isArray(entry.signatureDetails)
      ? entry.signatureDetails.map((item) => item.value).filter(Boolean)
      : [];

    return details.length ? details.join(" | ") : "Firma capturada";
  }

  if (entry.kind === "table_purchase" || entry.kind === "cart") {
    return Array.isArray(entry.lines) && entry.lines.length
      ? entry.lines.join("\n")
      : "—";
  }

  if (entry.kind === "image" || entry.kind === "file") {
    return Array.isArray(entry.lines) && entry.lines.length
      ? entry.lines.join("\n")
      : "—";
  }

  if (entry.kind === "multiselect") {
    return Array.isArray(entry.lines) && entry.lines.length
      ? entry.lines.join("\n")
      : entry.text || "—";
  }

  if (entry.kind === "traffic_light") {
    return entry.text || "—";
  }

  return entry.text || "—";
}

function styleGridHeaderRow(ws, rowNumber) {
  const row = ws.getRow(rowNumber);
  row.height = 28;

  row.eachCell((cell) => {
    cell.font = { bold: true, size: 10.5, color: { argb: "FFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: BRAND.navy },
    };
    setCellBorder(cell);
  });
}

function styleGridDataCell(cell, { centered = true, fill = "FFFFFF", bold = false } = {}) {
  cell.font = { bold, size: 10, color: { argb: BRAND.text } };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
    shrinkToFit: false,
    textRotation: 0,
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };
  setCellBorder(cell);
}

async function generateAnswersGridExcelBuffer(form, answers = [], exportMeta = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OpenAI";
  workbook.lastModifiedBy = "OpenAI";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Respuestas", {
    views: [{ state: "frozen", ySplit: 6 }],
    properties: { defaultRowHeight: 22 },
  });

  const fields = (form?.fields || []).filter((field) => field?.type !== "captcha");
  const models = (answers || []).map((answer) => buildExportModel(form, answer));
  const folioSummary = compressFolioRanges(models.map((item) => item.folio).filter(Boolean));
  const exportDate = formatDateTimeDisplay(new Date().toISOString());
  const filtersText = safeString(exportMeta?.filtersText || exportMeta?.filters || "Filtros aplicados en la exportación");

  const columns = [
    { key: "folio", header: "Folio", width: 16 },
    { key: "workerName", header: "Respondido por", width: 22 },
    { key: "departmentName", header: "Departamento", width: 18 },
    { key: "levelName", header: "Nivel", width: 16 },
    { key: "createdAtDisplay", header: "Fecha", width: 18 },
    ...fields.map((field) => ({
      key: field.id,
      header: field.label || "Campo",
      width:
        field.type === "textarea" ||
        field.type === "address" ||
        field.type === "agenda" ||
        field.type === "file" ||
        field.type === "image"
          ? 30
          : field.type === "signature"
          ? 28
          : 18,
      fieldType: field.type,
    })),
  ];

  worksheet.columns = columns.map((col) => ({
    key: col.key,
    width: col.width,
  }));

  await insertExcelLogo(workbook, worksheet);

  worksheet.mergeCells("D1:I2");
  const titleCell = worksheet.getCell("D1");
  titleCell.value = `${form?.title || "Exportación de respuestas"} — TABLA GENERAL`;
  titleCell.font = { bold: true, size: 17, color: { argb: BRAND.text } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells("J1:L1");
  const exportLabelCell = worksheet.getCell("J1");
  exportLabelCell.value = "FECHA DE EXPORTACIÓN";
  exportLabelCell.font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
  exportLabelCell.alignment = { horizontal: "center", vertical: "middle" };
  exportLabelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };
  setCellBorder(exportLabelCell);

  worksheet.mergeCells("J2:L2");
  const exportValueCell = worksheet.getCell("J2");
  exportValueCell.value = exportDate;
  exportValueCell.font = { bold: true, size: 11, color: { argb: "FFFFFF" } };
  exportValueCell.alignment = { horizontal: "center", vertical: "middle" };
  exportValueCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };
  setCellBorder(exportValueCell);

  worksheet.mergeCells("A4:C4");
  worksheet.getCell("A4").value = "FOLIOS EXPORTADOS";
  worksheet.getCell("A4").font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
  worksheet.getCell("A4").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A4").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };
  setCellBorder(worksheet.getCell("A4"));

  worksheet.mergeCells("D4:L4");
  worksheet.getCell("D4").value = folioSummary;
  worksheet.getCell("D4").font = { bold: true, size: 10.5, color: { argb: BRAND.text } };
  worksheet.getCell("D4").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  worksheet.getCell("D4").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF" },
  };
  setCellBorder(worksheet.getCell("D4"));

  worksheet.mergeCells("A5:C5");
  worksheet.getCell("A5").value = "FILTROS";
  worksheet.getCell("A5").font = { bold: true, size: 10, color: { argb: "FFFFFF" } };
  worksheet.getCell("A5").alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getCell("A5").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: BRAND.navy },
  };
  setCellBorder(worksheet.getCell("A5"));

  worksheet.mergeCells("D5:L5");
  worksheet.getCell("D5").value = filtersText;
  worksheet.getCell("D5").font = { size: 10.5, color: { argb: BRAND.text } };
  worksheet.getCell("D5").alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  worksheet.getCell("D5").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFF" },
  };
  setCellBorder(worksheet.getCell("D5"));

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 18;
  worksheet.getRow(4).height = 22;
  worksheet.getRow(5).height = 24;

  const headerRowNumber = 6;
  const headerRow = worksheet.getRow(headerRowNumber);
  headerRow.values = columns.map((col) => col.header);
  styleGridHeaderRow(worksheet, headerRowNumber);

  for (const model of models) {
    const entryMap = new Map((model.entries || []).map((entry) => [entry.id, entry]));

    const rowData = {
      folio: model.folio || "—",
      workerName: model.workerName || "—",
      departmentName: model.departmentName || "—",
      levelName: model.levelName || "—",
      createdAtDisplay: model.createdAtDisplay || "—",
    };

    fields.forEach((field) => {
      const entry = entryMap.get(field.id);
      rowData[field.id] = flattenEntryForGridCell(entry);
    });

    const row = worksheet.addRow(rowData);
    const excelRowNumber = row.number;
    let maxLines = 1;
    let requiresTallRow = false;

    columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      const field = fields.find((item) => item.id === col.key);
      const entry = field ? entryMap.get(field.id) : null;

      let fill = "FFFFFF";
      let centered = true;
      let bold = false;

      if (field?.type === "traffic_light" && entry?.color) {
        fill = excelArgb(entry.color);
        bold = true;
      }

      if (
        field?.type === "textarea" ||
        field?.type === "address" ||
        field?.type === "agenda" ||
        field?.type === "file" ||
        field?.type === "image" ||
        field?.type === "multiselect" ||
        field?.type === "table_purchase" ||
        field?.type === "cart"
      ) {
        centered = false;
      }

      styleGridDataCell(cell, { centered, fill, bold });

      const text = typeof cell.value === "object" && cell.value?.text
        ? safeString(cell.value.text)
        : safeString(cell.value || "");

      const lineCount = Math.max(1, wrapTextByChars(text, centered ? 24 : 36).length);
      maxLines = Math.max(maxLines, lineCount);

      if (field?.type === "signature") {
        requiresTallRow = true;
      }
    });

    row.height = requiresTallRow
      ? 72
      : Math.max(28, Math.min(80, 18 * maxLines));

    for (const [fieldIndex, field] of fields.entries()) {
      const entry = entryMap.get(field.id);
      const excelColumnIndex = 6 + fieldIndex;
      const cell = row.getCell(excelColumnIndex);

      if (field.type === "signature" && entry?.signature) {
        const parsed = parseDataUrlImage(entry.signature);

        if (parsed) {
          await addContainedExcelImage({
            workbook,
            worksheet,
            buffer: parsed.buffer,
            mime: parsed.mime,
            rowStart: excelRowNumber,
            rowEnd: excelRowNumber + 1,
            colStart: excelColumnIndex - 1,
            colEnd: excelColumnIndex,
            paddingX: 8,
            paddingY: 16,
          });
        }

        cell.value = getAnswerSignatureLabel(entry);
        cell.alignment = {
          horizontal: "center",
          vertical: "bottom",
          wrapText: true,
        };
        cell.font = { size: 8.5, color: { argb: BRAND.text } };
      }

      if ((field.type === "file" || field.type === "image") && entry?.files?.length) {
        const firstUrl =
          entry.files.find((file) => file?.publicUrl)?.publicUrl ||
          entry.files.find((file) => file?.url)?.url ||
          "";

        if (firstUrl && /^https?:\/\//i.test(firstUrl)) {
          cell.value = {
            text: flattenEntryForGridCell(entry),
            hyperlink: firstUrl,
          };
          cell.font = {
            color: { argb: "2563EB" },
            underline: true,
            size: 10,
          };
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        }
      }
    }
  }

  worksheet.autoFilter = {
    from: "A6",
    to: worksheet.getCell(6, columns.length).address,
  };

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.3,
      bottom: 0.3,
      header: 0.15,
      footer: 0.15,
    },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
module.exports = {
  buildExportModel,
  generateExcelBuffer,
  generatePdfBuffer,
  generateAnswersGridExcelBuffer,
};