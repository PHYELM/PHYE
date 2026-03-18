import React from "react";
import dayjs from "dayjs";
import { TRAFFIC_LIGHT_DEFAULT_OPTIONS } from "./forms.constants";

export function createEditorRule() {
  return {
    department_id: "",
    apply_all_levels: true,
    level_ids: [],
  };
}

export function getLocalWorker() {
  const candidates = [
    localStorage.getItem("worker"),
    localStorage.getItem("user"),
    localStorage.getItem("ecovisa_worker"),
    localStorage.getItem("authUser"),
  ];

  for (const item of candidates) {
    if (!item) continue;
    try {
      const parsed = JSON.parse(item);
      if (parsed?.id) return parsed;
      if (parsed?.worker?.id) return parsed.worker;
      if (parsed?.user?.id) return parsed.user;
    } catch (_) {}
  }

  return null;
}

export function randomColor() {
  const palette = [
    "#2563eb",
    "#0ea5e9",
    "#10b981",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
    "#ec4899",
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}
export function createSignatureDetailField(index = 0) {
  return {
    id: `sig_meta_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
    label: `Subcampo ${index + 1}`,
    placeholder: "",
  };
}
export function createField(type, index = 0) {
  const map = {
    text: {
      label: "Campo de texto",
      placeholder: "Escribe aquí...",
      options: [],
      settings: { visibility: "all" },
    },
    number: {
      label: "Campo numérico",
      placeholder: "0",
      options: [],
      settings: { min: "", max: "", step: "1", visibility: "all" },
    },
    currency: {
      label: "Monto",
      placeholder: "0.00",
      options: [],
      settings: { min: "", max: "", currencySymbol: "$", visibility: "all" },
    },
    textarea: {
      label: "Párrafo",
      placeholder: "Escribe una descripción...",
      options: [],
      settings: { rows: 4, visibility: "all" },
    },
    select: {
      label: "Selecciona una opción",
      placeholder: "",
      options: [
        { value: "opcion_1", label: "Opción 1" },
        { value: "opcion_2", label: "Opción 2" },
        { value: "opcion_3", label: "Opción 3" },
        { value: "__other__", label: "Otros", isOther: true },
      ],
      settings: { visibility: "all", allow_other: true },
    },
    multiselect: {
      label: "Selecciona múltiples opciones",
      placeholder: "",
      options: [
        {
          value: "camion_vactor",
          label: "Camión Vactor",
          children: [],
          allowText: true,
          textPlaceholder: "Cantidad",
          textSuffix: "hrs",
        },
        {
          value: "agua",
          label: "Agua",
          children: [],
          allowText: true,
          textPlaceholder: "Cantidad",
          textSuffix: "ml",
        },
        {
          value: "material",
          label: "Material",
          children: [],
          allowText: true,
          textPlaceholder: "Cantidad",
          textSuffix: "kg",
        },
        { value: "__other__", label: "Otros", isOther: true, children: [] },
      ],
      settings: { visibility: "all", allow_other: true },
    },
    traffic_light: {
      label: "Validación",
      placeholder: "",
      options: TRAFFIC_LIGHT_DEFAULT_OPTIONS,
      settings: { visibility: "all" },
    },
    phone: {
      label: "Teléfono",
      placeholder: "6671234567",
      options: [],
      settings: { visibility: "all" },
    },
    email: {
      label: "Correo electrónico",
      placeholder: "correo@empresa.com",
      options: [],
      settings: { visibility: "all" },
    },
    address: {
      label: "Dirección",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
    date: {
      label: "Fecha",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
    time: {
      label: "Hora",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
    datetime: {
      label: "Fecha y hora",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
    file: {
      label: "Subida de archivos",
      placeholder: "",
      options: [],
      settings: { maxFiles: 5, accept: "*", visibility: "all" },
    },
    image: {
      label: "Subida de fotos",
      placeholder: "",
      options: [],
      settings: { maxFiles: 5, accept: "image/*", visibility: "all" },
    },
    signature: {
      label: "Firma",
      placeholder: "",
      options: [],
      settings: {
        visibility: "all",
        signature_details: [],
      },
    },
    table_purchase: {
      label: "Tabla de compra / entrada",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
    product_list: {
      label: "Lista de productos",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
    cart: {
      label: "Carrito de compra",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
    agenda: {
      label: "Agenda",
      placeholder: "",
      options: [],
      settings: { visibility: "all" },
    },
  };

  const base = map[type] || map.text;

  return {
    id: `field_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    label: base.label,
    placeholder: base.placeholder,
    help_text: "",
    required: false,
    options: base.options,
    settings: base.settings,
  };
}

export function getContrastTextColor(hexColor) {
  const hex = String(hexColor || "#2563eb").replace("#", "");
  const normalized =
    hex.length === 3
      ? hex.split("").map((char) => char + char).join("")
      : hex.padEnd(6, "0").slice(0, 6);

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness >= 160 ? "#0f172a" : "#ffffff";
}

export function openNativeFilePicker(fieldId, fileInputRefs) {
  const input = fileInputRefs.current?.[fieldId];
  if (!input) return;
  input.value = "";
  input.click();
}

export function buildBlobUrlFromDataUrl(dataUrl) {
  try {
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
      return "";
    }

    const [meta, base64] = dataUrl.split(",");
    if (!meta || !base64) return "";

    const mimeMatch = meta.match(/^data:(.*?);base64$/);
    const mime = mimeMatch?.[1] || "application/octet-stream";

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: mime });
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

export function fileToDataUrl(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      const percent = Math.min(95, Math.round((event.loaded / event.total) * 100));
      onProgress(percent);
    };

    reader.onloadstart = () => {
      if (onProgress) onProgress(8);
    };

    reader.onload = () => {
      if (onProgress) onProgress(100);
      resolve(reader.result);
    };

    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export function createLocalFileId(file) {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${file.name}`;
}

export function getFileExtension(name = "") {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function isPreviewableInModal(file = {}) {
  if (!file?.dataUrl) return false;
  if (String(file.type || "").startsWith("image/")) return true;
  if (file.type === "application/pdf") return true;
  if (
    String(file.type || "").startsWith("text/") ||
    ["txt", "json", "csv", "md"].includes(getFileExtension(file.name))
  ) {
    return true;
  }
  return false;
}

export function getFileThumb(file = {}) {
  if (String(file.type || "").startsWith("image/")) {
    return file.dataUrl || "";
  }
  return "";
}

export function parseDateValue(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export function parseTimeValue(value) {
  if (!value) return null;
  const parsed = dayjs(`2000-01-01T${value}`);
  return parsed.isValid() ? parsed : null;
}

export function parseDateTimeValue(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

export function formatDateValue(value) {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : "";
}

export function formatTimeValue(value) {
  if (!value) return "";
  const parsed = dayjs(value);
  if (parsed.isValid()) return parsed.format("HH:mm");
  const parsedTime = dayjs(`2000-01-01T${value}`);
  return parsedTime.isValid() ? parsedTime.format("HH:mm") : "";
}

export function normalizeAnswerValue(field, value) {
  if (field.type === "select") {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return {
        value: value.value ?? "",
        otherText: value.otherText ?? "",
      };
    }

    return {
      value: typeof value === "string" ? value : "",
      otherText: "",
    };
  }

  if (field.type === "multiselect") {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return {
        selected: Array.isArray(value.selected) ? value.selected : [],
        otherText: value.otherText ?? "",
        childSelections:
          value.childSelections && typeof value.childSelections === "object"
            ? value.childSelections
            : {},
        optionTextValues:
          value.optionTextValues && typeof value.optionTextValues === "object"
            ? value.optionTextValues
            : {},
      };
    }

    if (Array.isArray(value)) {
      return {
        selected: value,
        otherText: "",
        childSelections: {},
        optionTextValues: {},
      };
    }

    return {
      selected: [],
      otherText: "",
      childSelections: {},
      optionTextValues: {},
    };
  }

  if (field.type === "file" || field.type === "image") {
    return Array.isArray(value) ? value : [];
  }

  if (field.type === "signature") {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return {
        signature: value.signature ?? value.dataUrl ?? "",
        details:
          value.details && typeof value.details === "object" && !Array.isArray(value.details)
            ? value.details
            : {},
      };
    }

    return {
      signature: typeof value === "string" ? value : "",
      details: {},
    };
  }

  if (field.type === "table_purchase") {
    return Array.isArray(value)
      ? value
      : [{ description: "", qty: 1, unit_cost: 0, amount: 0 }];
  }

  if (field.type === "product_list") {
    return Array.isArray(value) ? value : [];
  }

  if (field.type === "cart") {
    return Array.isArray(value) ? value : [];
  }

  if (field.type === "address") {
    return value && typeof value === "object"
      ? value
      : { street: "", city: "", state: "", zip: "", reference: "" };
  }

  if (field.type === "agenda") {
    return value && typeof value === "object"
      ? value
      : { date: "", note: "", contact: "" };
  }

  return value ?? "";
}

export function renderPanelEmptyState(icon, title, subtitle) {
  return (
    <div className="forms-empty-pro">
      <div className="forms-empty-pro__icon">{icon}</div>
      <div className="forms-empty-pro__title">{title}</div>
      <div className="forms-empty-pro__text">{subtitle}</div>
    </div>
  );
}

export function getLevelsNamesByIds(levels = [], ids = []) {
  return levels
    .filter((lvl) => ids.includes(lvl.id))
    .map((lvl) => lvl.name);
}

export function scrollToInsertZone(insertIndex) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const target = document.getElementById(`builder-insert-zone-${insertIndex}`);
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    });
  });
}

export function toTitleCaseText(value) {
  if (value === null || value === undefined) return "";

  const text = String(value);

  return text.replace(/(^|\s)([a-záéíóúñü])/giu, (match) => match.toUpperCase());
}