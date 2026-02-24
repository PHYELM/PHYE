import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch, API_BASE } from "../api.js";
import "./Inventory.css";
import ProSelect from "../components/ProSelect/ProSelect";
import {
  TbPackage,
  TbArrowsUpDown,
  TbArrowBigUpLines,
  TbArrowBigDownLines,
  TbSearch,
  TbPlus,
  TbChartBar,
  TbClock,
  TbRefresh,
  TbDotsVertical,
  TbUserCircle,
  TbCurrencyDollar,
  TbX, // ✅ cerrar pro
} from "react-icons/tb";
import ReactECharts from "echarts-for-react";

/* =========================
  5) Activity UI Mapper (NO backend changes)
  - backend guarda PRODUCT_CREATED, MOVEMENT_CREATED, etc.
  - frontend lo mapea a UI pro
========================= */
function activityUI(a) {
  const action = String(a?.action || "");
  const meta = a?.meta || {};

  const base = {
    tone: "neutral", // neutral | green | red | blue | purple | amber
    icon: <TbClock />,
    title: "Actividad",
    verb: "realizó una acción",
  };

  if (action === "PRODUCT_CREATED") {
    return {
      tone: "green",
      icon: <TbPlus />,
      title: "Producto creado",
      verb: "ha creado un producto",
    };
  }

  if (action === "MOVEMENT_CREATED") {
    const type = String(meta?.type || "");
    if (type === "IN") {
      return {
        tone: "blue",
        icon: <TbArrowBigUpLines />,
        title: "Entrada registrada",
        verb: "ha registrado una entrada",
      };
    }
    if (type === "OUT") {
      return {
        tone: "red",
        icon: <TbArrowBigDownLines />,
        title: "Salida registrada",
        verb: "ha registrado una salida",
      };
    }
    return {
      tone: "purple",
      icon: <TbArrowsUpDown />,
      title: "Movimiento registrado",
      verb: "ha registrado un movimiento",
    };
  }

  // si en el futuro agregas más actions, aquí las mapeas
  return base;
}

function formatActivityDate(dt) {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return String(dt);
  }
}

/* =========================
  Permisos (mismo concepto adminpanel)
  - Usa access_policies: depto + level => allowed_modules
========================= */
function canAccessModule(moduleKey, currentWorker, policies = []) {
  if (!currentWorker?.department_id || !currentWorker?.level_id) return true; // fallback

  const p = (policies || []).find(
    (x) => String(x.department_id) === String(currentWorker.department_id) &&
          String(x.level_id) === String(currentWorker.level_id)
  );

  // si no existe policy -> por tu regla: permite todo
  if (!p) return true;

  const allowed = p.allowed_modules || [];
  return allowed.includes(moduleKey);
}

/* =========================
  Mini Charts (SVG, sin librerías)
========================= */
function SparkBars({ values = [] }) {
  const max = Math.max(1, ...values.map((v) => Number(v || 0)));
  return (
    <div className="invSpark">
      {values.slice(-14).map((v, i) => (
        <span
          key={i}
          className="invSparkBar"
          style={{ height: `${Math.max(6, (Number(v || 0) / max) * 100)}%` }}
          title={String(v)}
        />
      ))}
    </div>
  );
}

function Donut({ a = 0, b = 0, labelA = "Entradas", labelB = "Salidas" }) {
  const total = Math.max(1, Number(a) + Number(b));
  const aPct = (Number(a) / total) * 100;
  return (
    <div className="invDonutWrap">
      <svg className="invDonut" viewBox="0 0 42 42">
        <circle className="invDonutBg" cx="21" cy="21" r="15.915" />
        <circle
          className="invDonutA"
          cx="21"
          cy="21"
          r="15.915"
          strokeDasharray={`${aPct} ${100 - aPct}`}
          strokeDashoffset="25"
        />
      </svg>
      <div className="invDonutLegend">
        <div className="invLegendRow"><span className="invLegendDot a" /> {labelA}: <b>{a}</b></div>
        <div className="invLegendRow"><span className="invLegendDot b" /> {labelB}: <b>{b}</b></div>
      </div>
    </div>
  );
}
/* =========================
  Mini Charts (SVG) + View switcher
========================= */
const CARD_VIEWS = [
  { key: "table", label: "Tabla" },
  { key: "bar", label: "Barras" },
  { key: "line", label: "Líneas" },
  { key: "pie", label: "Pastel" },
];
// =========================
// ✅ Filtros por CARD (ProSelect) - GLOBAL
// (CardRangeFilter está fuera de Inventory, por eso debe existir aquí)
// =========================
const CARD_RANGES = [
  { key: "7", label: "Hace 7 días", type: "days", value: 7 },
  { key: "30", label: "Hace 30 días", type: "days", value: 30 },
  { key: "90", label: "Hace 90 días", type: "days", value: 90 },
  { key: "this_month", label: "Este mes", type: "month", value: "this" },
  { key: "last_month", label: "Mes pasado", type: "month", value: "last" },
];
/* =========================
  Text transforms + Money
  - Title Case para inputs de texto (NO búsqueda)
  - SKU siempre en mayúsculas
  - Moneda MXN ($)
========================= */
const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toTitleCaseLive(value) {
  const s = String(value ?? "");
  // conserva espacios mientras escribes
  return s
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const lower = part.toLocaleLowerCase("es-MX");
      const first = lower.charAt(0).toLocaleUpperCase("es-MX");
      return first + lower.slice(1);
    })
    .join("");
}

function toSkuUpperLive(value) {
  return String(value ?? "").toLocaleUpperCase("es-MX");
}

function parseMoneyToNumber(input) {
  const raw = String(input ?? "");
  // deja números y punto decimal
  const cleaned = raw.replace(/[^\d.]/g, "");
  // evita múltiples puntos
  const parts = cleaned.split(".");
  const normalized =
    parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function MiniBarsChart({ items = [], valueKey = "value", labelKey = "label" }) {
  const top = (items || []).slice(0, 8);
  const max = Math.max(1, ...top.map((x) => Number(x?.[valueKey] || 0)));
  return (
    <div className="invChartBox">
      <svg className="invChartSvg" viewBox="0 0 320 180" preserveAspectRatio="none">
        {/* baseline */}
        <line x1="18" y1="160" x2="312" y2="160" stroke="rgba(10,12,14,0.14)" strokeWidth="2" />
        {top.map((x, i) => {
          const v = Number(x?.[valueKey] || 0);
          const h = (v / max) * 120;
          const barW = 28;
          const gap = 10;
          const x0 = 22 + i * (barW + gap);
          const y0 = 160 - h;
          return (
            <g key={i}>
              <rect
                x={x0}
                y={y0}
                width={barW}
                height={h}
                rx="8"
                fill="var(--invChartMain)"
                opacity="0.85"
              />
              <text
                x={x0 + barW / 2}
                y={174}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(10,12,14,0.62)"
              >
                {(String(x?.[labelKey] || "")).slice(0, 4)}
              </text>
              <text
                x={x0 + barW / 2}
                y={y0 - 6}
                textAnchor="middle"
                fontSize="10"
                fill="rgba(10,12,14,0.78)"
              >
                {Math.round(v)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MiniLineChart({ items = [], valueKey = "value" }) {
  const top = (items || []).slice(0, 12);
  const vals = top.map((x) => Number(x?.[valueKey] || 0));
  const max = Math.max(1, ...vals);
  const min = Math.min(0, ...vals);

  const w = 320, h = 180;
  const padL = 18, padR = 8, padT = 12, padB = 20;

  const toX = (i) => {
    const n = Math.max(1, top.length - 1);
    return padL + (i / n) * (w - padL - padR);
  };
  const toY = (v) => {
    const span = Math.max(1, max - min);
    const t = (v - min) / span;
    return (h - padB) - t * (h - padT - padB);
  };

  const d = top.map((x, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(Number(x?.[valueKey] || 0))}`).join(" ");

  return (
    <div className="invChartBox">
      <svg className="invChartSvg" viewBox="0 0 320 180" preserveAspectRatio="none">
        <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} stroke="rgba(10,12,14,0.14)" strokeWidth="2" />
        <path d={d} fill="none" stroke="var(--invChartMain)" strokeWidth="3" strokeLinecap="round" />
        {top.map((x, i) => {
          const v = Number(x?.[valueKey] || 0);
          return (
            <g key={i}>
              <circle cx={toX(i)} cy={toY(v)} r="4" fill="var(--invChartMain)" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MiniPieChart({ a = 0, b = 0, labelA = "A", labelB = "B" }) {
  return (
    <div className="invChartBox invChartPie">
      <Donut a={a} b={b} labelA={labelA} labelB={labelB} />
    </div>
  );
}

function CardMenu({ open, anchorRight = false, onPick }) {
  if (!open) return null;
  return (
    <div className={`invCardMenu ${anchorRight ? "r" : ""}`}>
      {CARD_VIEWS.map((v) => (
        <button key={v.key} type="button" className="invMenuItem" onClick={() => onPick(v.key)}>
          {v.label}
        </button>
      ))}
    </div>
  );
}
function MiniTableView({ rows = [], cols = [] }) {
  // cols: [{ key, label, align?: "l"|"c"|"r", render?: (row)=>node }]
  return (
    <div className="invMiniTableView">
      <div className="invMiniTableHead">
        {cols.map((c) => (
          <div key={c.key} className={`invMiniCell ${c.align || "l"}`}>
            {c.label}
          </div>
        ))}
      </div>

      <div className="invMiniTableBody">
        {rows.length === 0 ? (
          <div className="invEmpty" style={{ padding: 12 }}>Sin datos</div>
        ) : (
          rows.map((r, i) => (
            <div className="invMiniTableRow" key={r.id || r.product_id || i}>
              {cols.map((c) => (
                <div key={c.key} className={`invMiniCell ${c.align || "l"}`}>
                  {c.render ? c.render(r) : (r?.[c.key] ?? "-")}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
function CardRangeFilter({ value, onChange, ariaLabel = "filtro" }) {
  return (
    <div style={{ minWidth: 180 }}>
      <ProSelect value={value} onChange={onChange} ariaLabel={ariaLabel} placeholder="Periodo">
        {CARD_RANGES.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
          </option>
        ))}
      </ProSelect>
    </div>
  );
}
function CardTopActions({ id, openCardMenu, setOpenCardMenu, setView }) {
  return (
    <div className="invCardTopActions">
      <button
        className="invIconBtn"
        type="button"
        title="Vista"
        onClick={() => setOpenCardMenu((p) => (p === id ? null : id))}
      >
        <TbDotsVertical />
      </button>

      <CardMenu
        open={openCardMenu === id}
        anchorRight
        onPick={(view) => setView(id, view)}
      />
    </div>
  );
}

function RenderCardView({
  view = "bar",
  items = [],

  // pie (si se pasan, usa 2 slices; si NO, arma pie con items)
  pieA = null,
  pieB = null,
  pieLabelA = "Entradas",
  pieLabelB = "Salidas",

  // tabla
  tableRows = [],
  tableCols = [],

  chartTone = "teal", // teal | blue | green | red | purple

  // ✅ altura controlable (para que la card grande NO tenga huecos)
  height = 240,
}) {
  // ✅ tabla
  if (view === "table") {
    return (
      <div className="invCardBody isScroll viewTable">
        <MiniTableView rows={tableRows} cols={tableCols} />
      </div>
    );
  }

  // ===== paleta por tono (sin “colores random”) =====
  const toneColor = (() => {
    if (chartTone === "blue") return "#60a5fa";
    if (chartTone === "green") return "#34d399";
    if (chartTone === "red") return "#fb7185";
    if (chartTone === "purple") return "#a78bfa";
    return "#2dd4bf"; // teal
  })();

  // normaliza items -> {name, value}
  const data = (items || []).map((x, idx) => ({
    name: String(x?.label ?? `#${idx + 1}`),
    value: Number(x?.value ?? x ?? 0),
  }));

  // ✅ opciones base
  const base = {
    animation: true,
    animationDuration: 650,
    animationEasing: "cubicOut",
    grid: { left: 10, right: 16, top: 18, bottom: 28, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: {
      type: "category",
      data: data.map((d) => d.name),
      axisLabel: {
        color: "rgba(10,12,14,0.62)",
        fontWeight: 800,
        interval: 0,
        hideOverlap: true,
      },
      axisLine: { lineStyle: { color: "rgba(10,12,14,0.14)" } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "rgba(10,12,14,0.62)", fontWeight: 800 },
      splitLine: { lineStyle: { color: "rgba(10,12,14,0.10)" } },
    },
  };

if (view === "pie") {
  const hasTwo =
    Number.isFinite(Number(pieA)) && Number.isFinite(Number(pieB));

  const pieData = hasTwo
    ? [
        { name: pieLabelA, value: Number(pieA || 0) },
        { name: pieLabelB, value: Number(pieB || 0) },
      ]
    : (data || []).filter((d) => d.value > 0).slice(0, 8);

  const option = {
    tooltip: { trigger: "item" },
    legend: {
      top: "5%",
      left: "center",
      type: "scroll",
      textStyle: { fontWeight: 900, color: "rgba(10,12,14,0.70)" },
    },
    series: [
      {
        name: "Distribución",
        type: "pie",
        radius: ["40%", "70%"],           // ✅ donut
        center: ["50%", "60%"],           // ✅ baja para evitar cortes
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: {                          // ✅ oculto normal
          show: false,
          position: "center",
        },
        emphasis: {                       // ✅ grande al centro en hover/tap
          scale: true,
          scaleSize: 6,
          label: {
            show: true,
            fontSize: 34,
            fontWeight: "bold",
            color: "rgba(10,12,14,0.88)",
            formatter: (p) => `${p.name}\n${p.value}`,
          },
        },
        labelLine: { show: false },
        minAngle: 6,
        data: (pieData.length ? pieData : [{ name: "Sin datos", value: 1 }]).map((p, i) => ({
          ...p,
          itemStyle: hasTwo
            ? { color: i === 0 ? toneColor : "rgba(10,12,14,0.18)" }
            : { color: i === 0 ? toneColor : undefined },
        })),
      },
    ],
  };

  return (
    <div className="invCardBody">
      <div className="invEChartWrap" style={{ minHeight: height, height }}>
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
      </div>
    </div>
  );
}
if (view === "line") {
  const option = {
    title: { text: "", left: "left" }, // lo dejamos vacío para tu UI
    tooltip: { trigger: "axis" },
    legend: { top: 6 },
    toolbox: {
      show: true,
      right: 6,
      feature: {
        dataZoom: { yAxisIndex: "none" },
        dataView: { readOnly: true },
        magicType: { type: ["line", "bar"] },
        restore: {},
        saveAsImage: {},
      },
    },
    grid: { left: 12, right: 18, top: 42, bottom: 34, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((d) => d.name),
      axisLabel: { color: "rgba(10,12,14,0.62)", fontWeight: 900, hideOverlap: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "rgba(10,12,14,0.14)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "rgba(10,12,14,0.62)", fontWeight: 900 },
      splitLine: { lineStyle: { color: "rgba(10,12,14,0.10)" } },
    },
    series: [
      {
        name: "Valor",
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        data: data.map((d) => d.value),
        lineStyle: { width: 3, color: toneColor },
        itemStyle: { color: toneColor },
        areaStyle: { opacity: 0.10, color: toneColor },

        markPoint: {
          data: [
            { type: "max", name: "Max" },
            { type: "min", name: "Min" },
          ],
        },
        markLine: {
          data: [{ type: "average", name: "Avg" }],
        },
      },
    ],
    dataZoom: [{ type: "inside" }, { type: "slider", height: 16, bottom: 8 }],
  };

  return (
    <div className="invCardBody">
      <div className="invEChartWrap" style={{ minHeight: height, height }}>
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
      </div>
    </div>
  );
}

  // ✅ BAR (default)
const option = {
  animation: true,
  tooltip: {
    trigger: "axis",
    axisPointer: {
      type: "cross",
      crossStyle: { color: "rgba(10,12,14,0.45)" },
    },
  },
  toolbox: {
    show: true,
    right: 6,
    feature: {
      dataView: { show: true, readOnly: true },
      magicType: { show: true, type: ["line", "bar"] },
      restore: { show: true },
      saveAsImage: { show: true },
    },
  },
  legend: {
    data: ["Valor"],
    top: 6,
    textStyle: { fontWeight: 900, color: "rgba(10,12,14,0.70)" },
  },
  grid: { left: 12, right: 18, top: 42, bottom: 34, containLabel: true },
  xAxis: [
    {
      type: "category",
      data: data.map((d) => d.name),
      axisPointer: { type: "shadow" },
      axisLabel: { color: "rgba(10,12,14,0.62)", fontWeight: 900, hideOverlap: true },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "rgba(10,12,14,0.14)" } },
    },
  ],
  yAxis: [
    {
      type: "value",
      name: "Cantidad",
      min: 0,
      axisLabel: { color: "rgba(10,12,14,0.62)", fontWeight: 900 },
      splitLine: { lineStyle: { color: "rgba(10,12,14,0.10)" } },
    },
  ],
  series: [
    {
      name: "Valor",
      type: "bar",
      data: data.map((d) => d.value),
      barWidth: 26,
      itemStyle: { color: toneColor, borderRadius: [10, 10, 10, 10] },
      emphasis: { focus: "series" },
      tooltip: {
        valueFormatter: (v) => `${v}`,
      },
    },
  ],
};

  return (
<div className="invCardBody">
  <div className="invEChartWrap" style={{ minHeight: height, height }}>
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} notMerge />
  </div>
</div>
  );
}
/* =========================
  Modal pro (simple)
========================= */
function Modal({
  open,
  title,
  onClose,              // cierra directo (sin confirm)
  onRequestClose,       // cierra “intentando” (ESC/backdrop/botón X) -> puede preguntar confirm
  children,
}) {
  const [closing, setClosing] = useState(false);

  // cuando se abre, resetea closing
  useEffect(() => {
    if (open) setClosing(false);
  }, [open]);

  // ESC
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") {
        (onRequestClose || onClose)?.();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onRequestClose]);

  // cierre con animación (interno)
  const closeAnimated = async () => {
    setClosing(true);
    await new Promise((r) => setTimeout(r, 170)); // debe empatar con CSS
    onClose?.();
  };

  // click backdrop
  const handleBackdrop = async () => {
    if (onRequestClose) return onRequestClose();
    return closeAnimated();
  };

  // botón X
  const handleX = async () => {
    if (onRequestClose) return onRequestClose();
    return closeAnimated();
  };

  if (!open) return null;

  return (
    <div className={`invModalBack ${closing ? "isClosing" : ""}`} onMouseDown={handleBackdrop}>
      <div
        className={`invModal ${closing ? "isClosing" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="invModalTop">
          <div className="invModalTitle">{title}</div>
<button className="invIconBtn invCloseBtn" onClick={handleX} type="button" aria-label="Cerrar">
  <TbX />
</button>
        </div>

        <div className="invModalBody">{children}</div>
      </div>
    </div>
  );
}
// =========================
// SweetAlerts PRO (confirm + loading + toast)
// =========================
async function swalConfirm({ title, text, confirmText = "Sí, continuar", icon = "warning" }) {
  const r = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusCancel: true,
    heightAuto: false,
  });
  return r.isConfirmed;
}

function swalLoading(title = "Procesando…") {
  Swal.fire({
    title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
    heightAuto: false,
  });
}

function swalToast(icon, title) {
  return Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    showConfirmButton: false,
    timer: 2200,
    timerProgressBar: true,
    heightAuto: false,
  });
}

async function swalApiWrap(fn, { loadingTitle, successTitle } = {}) {
  try {
    if (loadingTitle) swalLoading(loadingTitle);
    const res = await fn();
    Swal.close();
    if (successTitle) await swalToast("success", successTitle);
    return res;
  } catch (e) {
    Swal.close();
    await Swal.fire({
      icon: "error",
      title: "Error",
      text: e?.message || "Algo falló",
      heightAuto: false,
    });
    throw e;
  }
}
/* =========================
  Main
========================= */
export default function Inventory({ currentWorker }) {
  const [tab, setTab] = useState("dashboard"); // dashboard | products | stock | movements | analytics
const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  // data
  const [policies, setPolicies] = useState([]);
  const [products, setProducts] = useState([]);
  const [stock, setStock] = useState([]);
const [analytics, setAnalytics] = useState([]);
const [activity, setActivity] = useState([]);

// ✅ métricas PRO
const [metrics, setMetrics] = useState(null);

  // ✅ TOP widgets (dashboard pro)
  const [topStock, setTopStock] = useState([]);
  const [topIn, setTopIn] = useState([]);
  const [topOut, setTopOut] = useState([]);
  const [topValued, setTopValued] = useState([]);

  // ✅ 5) Top Entradas + Top Salidas (toggle tipo carrusel)
  const [topIOPane, setTopIOPane] = useState("IN");   // IN | OUT
  const [aTopIOPane, setATopIOPane] = useState("IN"); // analytics tab

// ui
const [q, setQ] = useState("");
const [movementOpen, setMovementOpen] = useState(false);
const [movementType, setMovementType] = useState("IN");
const [movementReason, setMovementReason] = useState("");
const [movementItems, setMovementItems] = useState([]);

// ✅ dirty control (movimiento)
const [movementDirty, setMovementDirty] = useState(false);

const [productOpen, setProductOpen] = useState(false);
const [productDraft, setProductDraft] = useState({
  name: "",
  sku: "",
  unit: "pz",
  cost: "",
  price: "",
});

// ✅ dirty control (producto)
const [productDirty, setProductDirty] = useState(false);
  // ✅ menú abierto (id de la card) o null
  const [openCardMenu, setOpenCardMenu] = useState(null);
// ✅ vista por card (table|bar|line|pie)
const [cardView, setCardView] = useState({
  // dashboard
  topStock: "bar",
  io: "pie",
  topIn: "bar",
  topOut: "bar",
  topValued: "line",

  // analytics tab
  perf30: "line",
  aTopIn: "bar",
  aTopOut: "bar",
  aValued: "line",
});


const [cardRange, setCardRange] = useState({
  // dashboard
  io: "30",
  topIn: "30",
  topOut: "30",
  topValued: "30",

  // analytics tab
  perf30: "30",
  aTopIO: "30",
  aValued: "30",

  // historial
  movements: "30",
});

function rangeToDays(rangeKey) {
  const r = CARD_RANGES.find((x) => x.key === rangeKey) || CARD_RANGES[1];
if (r.type === "days") return Number(r.value) || 30;

  // month-based
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const diffDays = (a, b) => Math.ceil((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
  if (r.value === "this") return Math.max(7, diffDays(now, start));
return Number(Math.max(7, diffDays(now, startLast))) || 30;
}

function filterByRange(list = [], rangeKey) {
  const days = rangeToDays(rangeKey);
  const min = Date.now() - days * 24 * 60 * 60 * 1000;
  return (list || []).filter((x) => {
    const t = x?.created_at ? new Date(x.created_at).getTime() : 0;
    return t >= min;
  });
}
  const setView = (id, view) => {
    setCardView((p) => ({ ...p, [id]: view }));
    setOpenCardMenu(null);
  };

const allowed = useMemo(
  () => canAccessModule("inventory", currentWorker, policies),
  [currentWorker, policies]
);

/* =========================
   ✅ CARGA PRINCIPAL (loadAll)
   - days controla analytics/metrics/top/activity
   - lightweight=true evita recargar products/stock/policies cada vez
========================= */
async function loadAll({ days = 30, lightweight = false } = {}) {
  setLoading(true);

  // ✅ policies solo si no es lightweight
  let p = { data: [] };
  if (!lightweight) {
    p = await apiFetch("/api/admin/access-policies").catch((e) => {
      console.warn("⚠️ policies failed:", e.message);
      return { data: [] };
    });
  }

  const endpoints = [
    // solo al cargar “completo”
    ...(!lightweight
      ? [
          { key: "products", url: "/api/inventory/products" },
          { key: "stock", url: "/api/inventory/stock" },
        ]
      : []),

    // dashboard/analytics depende del periodo
    { key: "analytics", url: `/api/inventory/analytics?days=${days}` },
    { key: "metrics", url: `/api/inventory/metrics?days=${days}`, optional: true },

    { key: "activity", url: `/api/inventory/activity?days=${days}&limit=25&offset=0` },

    { key: "topStock", url: "/api/inventory/top-stock?limit=8" },
    { key: "topIn", url: `/api/inventory/top-in?days=${days}&limit=8` },
    { key: "topOut", url: `/api/inventory/top-out?days=${days}&limit=8` },
    { key: "topValued", url: `/api/inventory/top-valued?days=${days}&limit=8` },
  ];

  try {
    const results = await Promise.allSettled(endpoints.map((e) => apiFetch(e.url)));

    const byKey = {};
    const failed = [];

    results.forEach((r, i) => {
      const k = endpoints[i].key;

      if (r.status === "fulfilled") {
        byKey[k] = r.value?.data ?? null;
        return;
      }

      const isOptional = !!endpoints[i].optional;
      byKey[k] = null;

      if (!isOptional) {
        failed.push(`${endpoints[i].url} -> ${r.reason?.message || r.reason}`);
      }

      console.warn(
        "❌ Inventory endpoint failed:",
        endpoints[i].url,
        r.reason?.message || r.reason,
        isOptional ? "(optional)" : ""
      );
    });

    setLoadError(failed.length ? `Fallaron ${failed.length} endpoints. Revisa consola/Network.` : "");

    if (!lightweight) {
      setPolicies(p.data || []);
      setProducts(byKey.products || []);
      setStock(byKey.stock || []);
    }

    setAnalytics(byKey.analytics || []);
    setMetrics(byKey.metrics || null);
    setActivity(byKey.activity || []);

    setTopStock(byKey.topStock || []);
    setTopIn(byKey.topIn || []);
    setTopOut(byKey.topOut || []);
    setTopValued(byKey.topValued || []);
  } finally {
    setLoading(false);
  }
}

/* =========================
   ✅ Recargar dashboard por periodo
========================= */
async function reloadDashboardDays(days) {
  return loadAll({ days, lightweight: true });
}
useEffect(() => {
  loadAll();
  // eslint-disable-next-line
}, []);
useEffect(() => {
  // fuerza a ECharts a recalcular layout (móvil/rotación/cambio tab)
  const t = setTimeout(() => {
    window.dispatchEvent(new Event("resize"));
  }, 80);
  return () => clearTimeout(t);
}, [tab, openCardMenu, cardView, cardRange]);
/* =========================
   Realtime (SSE)
   - Se actualiza SOLO cuando entra/sale algo o crean producto
========================= */
useEffect(() => {
  let es;
  let fallbackTimer;

  const connect = () => {
    try {
      // ✅ arma URL igual que apiFetch (evita /api/api si API_BASE="/api")
      const sseUrl = (() => {
        const base = String(API_BASE || "").replace(/\/+$/, ""); // sin slash final
        let p = "/api/inventory/stream";
        if (base.endsWith("/api") && p.startsWith("/api/")) {
          p = p.replace(/^\/api/, ""); // quita solo el primer /api
        }
        return `${base}${p}`;
      })();

      es = new EventSource(sseUrl);

es.onmessage = (ev) => {
  try {
    const msg = JSON.parse(ev.data || "{}");
    if (!msg?.type) return;

    // ✅ toaster LOW STOCK (a todos con inventario abierto)
    if (msg.type === "LOW_STOCK") {
      const name = msg.name || "Producto";
      const rem = Number(msg.remaining || 0);

      Swal.fire({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4200,
        timerProgressBar: true,
        icon: "warning",
        title: "Alerta",
        html: `
          <div style="font-weight:900;opacity:.9;margin-top:2px">
            <span style="opacity:.75">El producto</span> <b>${name}</b>
            <span style="opacity:.75">se está acabando</span>
          </div>
          <div style="font-weight:900;opacity:.85;margin-top:2px">
            Quedan <b>${rem}</b> en stock
          </div>
        `,
        background: "rgba(255,255,255,0.96)",
        didOpen: (toast) => {
          toast.style.borderRadius = "14px";
          toast.style.boxShadow = "0 18px 70px rgba(0,0,0,0.18)";
        },
        heightAuto: false,
      });
    }

    // ✅ recarga datos (stock se actualiza)
    if (msg.type === "MOVEMENT_CREATED" || msg.type === "PRODUCT_CREATED" || msg.type === "LOW_STOCK") {
      loadAll();
    }
  } catch (e) {}
};

      es.onerror = () => {
        try { es?.close?.(); } catch (e) {}
        es = null;

        if (!fallbackTimer) {
          fallbackTimer = setInterval(() => loadAll(), 15000);
        }
      };
    } catch (e) {
      if (!fallbackTimer) {
        fallbackTimer = setInterval(() => loadAll(), 15000);
      }
    }
  };

  connect();

  return () => {
    try { es?.close?.(); } catch (e) {}
    if (fallbackTimer) clearInterval(fallbackTimer);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
  // métricas dashboard
  const totals = useMemo(() => {
    const totalProducts = products.length;
    const totalStock = stock.reduce((a, x) => a + Number(x.stock || 0), 0);

    const last = analytics || [];
    const sumIn = last.reduce((a, x) => a + Number(x.qty_in || 0), 0);
    const sumOut = last.reduce((a, x) => a + Number(x.qty_out || 0), 0);
    const valIn = last.reduce((a, x) => a + Number(x.value_in || 0), 0);
    const valOut = last.reduce((a, x) => a + Number(x.value_out || 0), 0);

    // spark
    const sparkIn = last.map((x) => Number(x.qty_in || 0));
    const sparkOut = last.map((x) => Number(x.qty_out || 0));

    return {
      totalProducts,
      totalStock,
      sumIn,
      sumOut,
      valIn,
      valOut,
      sparkIn,
      sparkOut,
    };
  }, [products, stock, analytics]);

  // filtros
  const filteredProducts = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => {
      const hay = `${p.sku || ""} ${p.name || ""} ${p.unit || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [products, q]);

  const filteredStock = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return stock;
    return stock.filter((p) => {
      const hay = `${p.sku || ""} ${p.name || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [stock, q]);
const stockByProductId = useMemo(() => {
  const m = new Map();
  (stock || []).forEach((s) => {
    const id = String(s.product_id || s.id || "");
    if (!id) return;
    m.set(id, Number(s.stock || 0));
  });
  return m;
}, [stock]);
  function openMovement(type) {
    setMovementType(type);
    setMovementReason("");
    setMovementItems([{ product_id: "", qty: 1, unit_cost: 0 }]);
    setMovementOpen(true);
  }

function addMovementRow() {
  setMovementDirty(true);
  setMovementItems((prev) => [...prev, { product_id: "", qty: 1, unit_cost: 0 }]);
}
function updateMovementRow(i, key, val) {
  setMovementDirty(true);
  setMovementItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
}
function removeMovementRow(i) {
  setMovementDirty(true);
  setMovementItems((prev) => prev.filter((_, idx) => idx !== i));
}

async function saveMovement() {
  const items = movementItems
    .map((it) => ({
      product_id: it.product_id,
      qty: Number(it.qty || 0),
      unit_cost: parseMoneyToNumber(it.unit_cost),
    }))
    .filter((x) => x.product_id && x.qty > 0);

  // ✅ CIERRA MODAL ANTES de cualquier SweetAlert
  setMovementOpen(false);
  await new Promise((r) => setTimeout(r, 180));

  if (items.length === 0) {
    await Swal.fire({
      icon: "info",
      title: "Falta información",
      text: "Agrega al menos 1 producto con cantidad > 0",
      heightAuto: false,
    });
    return;
  }

  const ok = await swalConfirm({
    title: movementType === "IN" ? "Confirmar entrada" : "Confirmar salida",
    text: `Se registrarán ${items.length} producto(s). ¿Deseas continuar?`,
    confirmText: "Registrar",
    icon: "question",
  });
  if (!ok) return;

  try {
    await swalApiWrap(
      () =>
        apiFetch("/api/inventory/movements", {
          method: "POST",
          body: JSON.stringify({
            type: movementType,
            reason: movementReason,
            created_by: currentWorker?.id || null,
            items,
          }),
        }),
      {
        loadingTitle: "Registrando movimiento…",
        successTitle: "Movimiento registrado",
      }
    );
  } catch (e) {
    // ✅ si backend detecta insuficiente (400)
    const msg = String(e?.message || "");
    const raw = e?.raw || null;

    // si tu apiFetch no trae raw, igual lo cubrimos por texto
    if (msg.includes("INSUFFICIENT_STOCK")) {
      await Swal.fire({
        icon: "warning",
        title: "No se puede registrar la salida",
        html: `
          <div style="text-align:left;font-weight:800;opacity:.9;margin-bottom:8px">
            No hay stock suficiente para completar la salida.
          </div>
          <div style="text-align:left;opacity:.85">
            Revisa cantidades vs existencias.
          </div>
        `,
        heightAuto: false,
      });
      return;
    }

    // fallback normal (swalApiWrap ya muestra error)
    return;
  }

  await loadAll();
  setTab("dashboard");
}
function openCreateProduct() {
  setProductDraft({
    name: "",
    sku: "",
    unit: "pz",
    cost: "",
    price: "",
  });
  setProductOpen(true);
}

async function saveProduct() {
  const name = String(productDraft.name || "").trim();

  // ✅ CIERRA MODAL ANTES de cualquier SweetAlert
  setProductOpen(false);
  await new Promise((r) => setTimeout(r, 180));

  if (!name) {
    await Swal.fire({
      icon: "info",
      title: "Falta nombre",
      text: "Escribe el nombre del producto.",
      heightAuto: false,
    });
    return;
  }

  const ok = await swalConfirm({
    title: "Confirmar producto",
    text: `¿Crear el producto "${name}"?`,
    confirmText: "Crear",
    icon: "question",
  });
  if (!ok) return;

  await swalApiWrap(
    () =>
      apiFetch("/api/inventory/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          sku: String(productDraft.sku || "").trim(),
          unit: productDraft.unit || "pz",
          cost: parseMoneyToNumber(productDraft.cost),
          price: parseMoneyToNumber(productDraft.price),
          created_by: currentWorker?.id || null,
        }),
      }),
    {
      loadingTitle: "Creando producto…",
      successTitle: "Producto creado",
    }
  );

  await loadAll();
  setTab("products");
}

/* =========================
   ✅ 2.5 Confirmación al cerrar (ESC / backdrop / X / Cancelar)
========================= */
async function confirmCloseIfDirty(kind) {
  const isDirty = kind === "product" ? productDirty : movementDirty;

  if (!isDirty) return true;

  const r = await Swal.fire({
    icon: "warning",
    title: "¿Cancelar cambios?",
    text: "No has guardado. Si sales, se perderán los cambios.",
    showCancelButton: true,
    confirmButtonText: "Sí, salir",
    cancelButtonText: "Volver",
    reverseButtons: true,
    focusCancel: true,
    heightAuto: false,
  });

  return r.isConfirmed;
}

async function requestCloseProductModal() {
  const ok = await confirmCloseIfDirty("product");
  if (!ok) return;
  setProductOpen(false);
  setProductDirty(false);
}

async function requestCloseMovementModal() {
  const ok = await confirmCloseIfDirty("movement");
  if (!ok) return;
  setMovementOpen(false);
  setMovementDirty(false);
}

if (!allowed) {
  return (
   <div className="invWrap invMonday">
      <div className="invNoAccess">
        <div className="invNoAccessTitle">Sin acceso</div>
        <div className="invNoAccessSub">
          Tu puesto/departamento no tiene permiso para el módulo <b>Inventario</b>.
        </div>
      </div>
    </div>
  );
}

return (
  <div className="invWrap invFluid">
 {/* Header pro */}
<div className="invTop">
  <div className="invTopLeft">
    <div className="invTitle">
      <TbPackage /> Inventario
    </div>
    <div className="invSub">
      Dashboard · Productos · Stock · Movimientos · Rendimientos
    </div>
  </div>

  {/* ✅ Búsqueda centrada entre título y botones */}
  <div className="invTopMid">
    <div className="invSearch">
      <TbSearch />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar producto, sku, unidad..."
      />
    </div>
  </div>

  {/* ✅ Botones arriba derecha */}
  <div className="invTopRight">
    <button className="invBtn invIn" type="button" onClick={() => openMovement("IN")}>
      <TbArrowBigUpLines /> Entrada
    </button>

    <button className="invBtn invOut" type="button" onClick={() => openMovement("OUT")}>
      <TbArrowBigDownLines /> Salida
    </button>
  </div>
</div>

      {/* Tabs */}
      <div className="invTabs">
        <button className={`invTab ${tab === "dashboard" ? "on" : ""}`} onClick={() => setTab("dashboard")}>
          Inicio
        </button>
        <button className={`invTab ${tab === "products" ? "on" : ""}`} onClick={() => setTab("products")}>
          Productos
        </button>
        <button className={`invTab ${tab === "stock" ? "on" : ""}`} onClick={() => setTab("stock")}>
          Stock
        </button>
        <button className={`invTab ${tab === "analytics" ? "on" : ""}`} onClick={() => setTab("analytics")}>
          Rendimientos
        </button>
        <button className={`invTab ${tab === "movements" ? "on" : ""}`} onClick={() => setTab("movements")}>
          Historial
        </button>
      </div>

     {loading ? (
  <div className="invLoading">Cargando inventario…</div>
) : (
  <>
    {/* ✅ Banner de error si algo falló */}
    {loadError ? (
      <div className="invCard" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>⚠️ Inventario: carga parcial</div>
        <div style={{ opacity: 0.8 }}>{loadError}</div>
        <div style={{ opacity: 0.65, marginTop: 6 }}>
          Abre DevTools → Network y revisa qué endpoint responde 404/500.
        </div>
      </div>
    ) : null}

    {/* =========================
        DASHBOARD
    ========================= */}
{tab === "dashboard" && (
  <div className="invDash">
    {/* ===== KPIs (arriba, estilo software) ===== */}
    <div className="invKpiRow">
      <div className="invKpiTile toneA">
        <div className="invKpiTileTop">
          <div className="invKpiTileTitle">TOTAL PRODUCTOS</div>
          <div className="invKpiTileIcon"><TbPackage /></div>
        </div>
        <div className="invKpiTileValue">{totals.totalProducts}</div>
        <div className="invKpiTileSub">Catálogo activo</div>
      </div>

      <div className="invKpiTile toneB">
        <div className="invKpiTileTop">
          <div className="invKpiTileTitle">STOCK TOTAL</div>
          <div className="invKpiTileIcon"><TbChartBar /></div>
        </div>
        <div className="invKpiTileValue">{totals.totalStock}</div>
        <div className="invKpiTileSub">Existencias acumuladas</div>
      </div>

<div className="invKpiTile toneIn">
  <div className="invKpiTileTop">
    <div className="invKpiTileTitle">ENTRADAS ({rangeToDays(cardRange.io)} DÍAS)</div>
    <div className="invKpiTileIcon"><TbArrowBigUpLines /></div>
  </div>
  <div className="invKpiTileValue">{totals.sumIn}</div>
  <div className="invKpiTileSub">Movimientos IN</div>
</div>

<div className="invKpiTile toneOut">
  <div className="invKpiTileTop">
    <div className="invKpiTileTitle">SALIDAS (30 DÍAS)</div>
    <div className="invKpiTileIcon"><TbArrowBigDownLines /></div>
  </div>
  <div className="invKpiTileValue">{totals.sumOut}</div>
  <div className="invKpiTileSub">Movimientos OUT</div>
</div>

      <div className="invKpiTile toneMoney">
        <div className="invKpiTileTop">
          <div className="invKpiTileTitle">VALOR MOVIDO (30 DÍAS)</div>
          <div className="invKpiTileIcon"><TbCurrencyDollar /></div>
        </div>
        <div className="invKpiTileValue">
          ${Math.round((totals.valIn || 0) + (totals.valOut || 0)).toLocaleString()}
        </div>
        <div className="invKpiTileSub">Entradas + Salidas</div>
      </div>
    </div>

{/* ===== Zona central PRO (aprovecha todo el espacio) ===== */}
<div className="invDashGridPro">
  {/* ========= IZQUIERDA: Top Stock ========= */}
  <div className="invCard invCol6">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbChartBar /> Top Productos Inventario</div>
        <div className="invCardSub">Mayor stock actual · cambia vista con ⋮</div>
      </div>

      <CardTopActions
        id="topStock"
        openCardMenu={openCardMenu}
        setOpenCardMenu={setOpenCardMenu}
        setView={setView}
      />
    </div>

    <RenderCardView
      view={cardView.topStock}
      chartTone="blue"
      height={260}
      items={topStock.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.stock || 0) }))}
      tableRows={topStock}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "sku", label: "SKU", align: "c", render: (r) => (r.sku || "-") },
        { key: "stock", label: "Stock", align: "r", render: (r) => <b>{Number(r.stock || 0)}</b> },
      ]}
    />
  </div>

  {/* ========= DERECHA ARRIBA: Entradas/Salidas ========= */}
  <div className="invCard invCol6">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbArrowsUpDown /> Entradas / Salidas</div>
        <div className="invCardSub">Volumen ({rangeToDays(cardRange.io)} días) · cambia vista con ⋮</div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <CardRangeFilter
          value={cardRange.io}
          ariaLabel="periodo-io"
          onChange={async (e) => {
            const v = e.target.value;
            setCardRange((p) => ({ ...p, io: v }));
            await reloadDashboardDays(rangeToDays(v));
          }}
        />

        <CardTopActions
          id="io"
          openCardMenu={openCardMenu}
          setOpenCardMenu={setOpenCardMenu}
          setView={setView}
        />
      </div>
    </div>

    <RenderCardView
      view={cardView.io || "pie"}
      chartTone="teal"
      height={260}
      pieA={totals.sumIn}
      pieB={totals.sumOut}
      pieLabelA="Entradas"
      pieLabelB="Salidas"
      tableRows={[
        { id: "in", label: "Entradas", value: totals.sumIn },
        { id: "out", label: "Salidas", value: totals.sumOut },
      ]}
      tableCols={[
        { key: "label", label: "Tipo", render: (r) => <b>{r.label}</b> },
        { key: "value", label: "Cantidad", align: "r", render: (r) => <b>{Number(r.value || 0)}</b> },
      ]}
    />
  </div>

  {/* ========= FILA: Top Valorizados (izq) + Actividad (der) ========= */}
  <div className="invCard invCol6">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbCurrencyDollar /> Top Valorizados</div>
        <div className="invCardSub">Mayor $ movido (periodo) · cambia vista con ⋮</div>
      </div>

      <CardTopActions
        id="topValued"
        openCardMenu={openCardMenu}
        setOpenCardMenu={setOpenCardMenu}
        setView={setView}
      />
    </div>

    <RenderCardView
      view={cardView.topValued}
      chartTone="purple"
      height={260}
      items={topValued.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.value || 0) }))}
      tableRows={topValued}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "qty", label: "Qty", align: "c", render: (r) => Number(r.qty || 0) },
        { key: "value", label: "$", align: "r", render: (r) => <b>${Math.round(Number(r.value || 0)).toLocaleString()}</b> },
      ]}
    />
  </div>

  <div className="invCard invCol6">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbClock /> Actividad reciente</div>
        <div className="invCardSub">Filtrado por periodo · actualizado en tiempo real</div>
      </div>

      <CardRangeFilter
        value={cardRange.movements}
        ariaLabel="periodo-actividad"
        onChange={async (e) => {
          const v = e.target.value;
          setCardRange((p) => ({ ...p, movements: v }));
          await reloadDashboardDays(rangeToDays(v));
        }}
      />
    </div>

<div className="invCardBody isScroll">
  {activity.length === 0 ? (
    <div className="invEmpty">Sin actividad aún</div>
  ) : (
    <div className="invFeed">
      {activity.map((a) => {
        const ui = activityUI(a);
        const who = a.actor_full_name || a.actor_username || "Usuario";
        const when = a.created_at ? new Date(a.created_at).toLocaleString() : "";

        const details = [];
        if (a.actor_department) details.push(a.actor_department);
        if (a.meta?.type)
          details.push(
            a.meta.type === "IN"
              ? "Entrada"
              : a.meta.type === "OUT"
              ? "Salida"
              : String(a.meta.type)
          );
        if (a.meta?.reason) details.push(String(a.meta.reason));

        return (
          <div className={`invActRow tone-${ui.tone}`} key={a.id}>
            <div className="invActAvatar">
              {a.actor_profile_photo_url ? (
                <img src={a.actor_profile_photo_url} alt={who} />
              ) : (
                <div className="invActAvatarPh">
                  <TbUserCircle />
                </div>
              )}
            </div>

            <div className="invActBody">
              <div className="invActTopLine">
                <div className="invActIcon">{ui.icon}</div>
                <div className="invActTitle">{ui.title}</div>
                <div className="invActTime">{when}</div>
              </div>

              <div className="invActText">
                <b>{who}</b> {ui.verb}
              </div>

              {details.length ? (
                <div className="invActMeta">
                  {details.map((t, i) => (
                    <span className="invActChip" key={i}>
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
  </div>

  {/* ========= Top Entradas / Salidas (DOBLE, ancho 2 cards) ========= */}
  <div className="invCard invCol12">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbArrowsUpDown /> Top Entradas / Salidas</div>
        <div className="invCardSub">Por producto ({rangeToDays(cardRange.topIn)} días)</div>
      </div>

  <div className="invCardTools">
  <div className="invRange">
    <CardRangeFilter
      value={cardRange.topIn}
      ariaLabel="periodo-top-io"
      onChange={async (e) => {
        const v = e.target.value;
        setCardRange((p) => ({ ...p, topIn: v, topOut: v }));
        await reloadDashboardDays(rangeToDays(v));
      }}
    />
  </div>

  <div className="invSeg">
    <button
      type="button"
      className={`invTab ${topIOPane === "IN" ? "on" : ""}`}
      onClick={() => setTopIOPane("IN")}
    >
      <TbArrowBigUpLines /> Entradas
    </button>

    <button
      type="button"
      className={`invTab ${topIOPane === "OUT" ? "on" : ""}`}
      onClick={() => setTopIOPane("OUT")}
    >
      <TbArrowBigDownLines /> Salidas
    </button>
  </div>

  <div className="invDots">
    <CardTopActions
      id={topIOPane === "IN" ? "topIn" : "topOut"}
      openCardMenu={openCardMenu}
      setOpenCardMenu={setOpenCardMenu}
      setView={setView}
    />
  </div>
</div>
    </div>

    <RenderCardView
      view={cardView[topIOPane === "IN" ? "topIn" : "topOut"] || "bar"}
      chartTone={topIOPane === "IN" ? "green" : "red"}
      height={320}  // ✅ más grande “como 2 cards”
      items={(topIOPane === "IN" ? topIn : topOut).map((x) => ({
        label: x.name || x.product_name || "-",
        value: Number(x.qty || 0),
      }))}
      tableRows={topIOPane === "IN" ? topIn : topOut}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "sku", label: "SKU", align: "c", render: (r) => (r.sku || "-") },
        { key: "qty", label: "Qty", align: "r", render: (r) => <b>{Number(r.qty || 0)}</b> },
      ]}
    />
  </div>
</div>
  </div>
)}
{tab === "products" && (
  <div className="invCard">
    <div className="invCardTop invCardTopRow">
      <div className="invCardTitle"><TbPackage /> Productos</div>

      <button className="invBtn invPrimary" type="button" onClick={openCreateProduct}>
        <TbPlus /> Crear
      </button>
    </div>

    {filteredProducts.length === 0 ? (
      <div className="invEmpty">No hay productos. Crea uno con “Crear”.</div>
    ) : (
      <div className="invTableWrap">
        <table className="invTable invTableSku">
          <thead>
            <tr>
              <th>Nombre</th>
              <th className="c">SKU</th>
              <th className="c">Unidad</th>
              <th className="c">Costo</th>
              <th className="c">Precio</th>
              <th className="c">Stock</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => {
              const st = stockByProductId.get(String(p.id)) ?? 0;
              const low = st <= 10;

              return (
                <tr key={p.id} className={low ? "isLow" : ""}>
                  <td>
                    <div className="invProdName">
                      <b>{p.name}</b>
                      {low ? <span className="invBadgeLow">Bajo</span> : null}
                    </div>
                  </td>
                  <td className="c">
                    <span className="invSkuPill">{p.sku || "-"}</span>
                  </td>
                  <td className="c">{p.unit || "-"}</td>
                  <td className="c">{MXN.format(Number(p.cost || 0))}</td>
                  <td className="c">{MXN.format(Number(p.price || 0))}</td>
                  <td className="c">
                    <span className={`invStockPill ${low ? "low" : ""}`}>
                      {Number(st)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
    {/* =========================
        STOCK
    ========================= */}
    {tab === "stock" && (
      <div className="invCard">
        <div className="invCardTop">
          <div className="invCardTitle"><TbPackage /> Stock</div>
        </div>

        {filteredStock.length === 0 ? (
          <div className="invEmpty">Sin stock (o no hay productos aún).</div>
        ) : (
          <div className="invTableWrap">
            <table className="invTable">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th className="c">Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((s) => (
                  <tr key={s.product_id || s.id}>
                    <td><b>{s.name || s.product_name}</b></td>
                    <td>{s.sku || "-"}</td>
                    <td className="c"><b>{Number(s.stock || 0)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

    {/* =========================
        ANALYTICS
    ========================= */}
{tab === "analytics" && (
  <div className="invAnalyticsCol">
    {/* =========================
    KPIs PRO (Rendimientos)
========================= */}
<div className="invKpiRow">
  <div className="invKpiTile toneB">
    <div className="invKpiTileTop">
      <div className="invKpiTileTitle">VALOR TOTAL INVENTARIO</div>
      <div className="invKpiTileIcon"><TbCurrencyDollar /></div>
    </div>
    <div className="invKpiTileValue">
      {MXN.format(Number(metrics?.total_inventory_value || 0))}
    </div>
    <div className="invKpiTileSub">Costo acumulado actual</div>
  </div>

  <div className="invKpiTile toneIn">
    <div className="invKpiTileTop">
      <div className="invKpiTileTitle">FLUJO ENTRADAS (PERIODO)</div>
      <div className="invKpiTileIcon"><TbArrowBigUpLines /></div>
    </div>
    <div className="invKpiTileValue">{Number(metrics?.flow?.qty_in || 0)}</div>
    <div className="invKpiTileSub">{MXN.format(Number(metrics?.flow?.value_in || 0))}</div>
  </div>

  <div className="invKpiTile toneOut">
    <div className="invKpiTileTop">
      <div className="invKpiTileTitle">FLUJO SALIDAS (PERIODO)</div>
      <div className="invKpiTileIcon"><TbArrowBigDownLines /></div>
    </div>
    <div className="invKpiTileValue">{Number(metrics?.flow?.qty_out || 0)}</div>
    <div className="invKpiTileSub">{MXN.format(Number(metrics?.flow?.value_out || 0))}</div>
  </div>

  <div className="invKpiTile toneMoney">
    <div className="invKpiTileTop">
      <div className="invKpiTileTitle">UTILIDAD ESTIMADA (PERIODO)</div>
      <div className="invKpiTileIcon"><TbChartBar /></div>
    </div>
    <div className="invKpiTileValue">
      {MXN.format(Number(metrics?.profit_period_est || 0))}
    </div>
    <div className="invKpiTileSub">Basado en (price - cost)</div>
  </div>

  <div className="invKpiTile toneA">
    <div className="invKpiTileTop">
      <div className="invKpiTileTitle">ROTACIÓN INVENTARIO</div>
      <div className="invKpiTileIcon"><TbArrowsUpDown /></div>
    </div>
    <div className="invKpiTileValue">
      {(Number(metrics?.rotation || 0)).toFixed(2)}x
    </div>
    <div className="invKpiTileSub">COGS / Inventario actual</div>
  </div>
</div>
    {/* ===== Rendimiento (30 días) ===== */}
    <div className="invCard">
      <div className="invCardTop invCardTopCompact">
        <div>
          <div className="invCardTitle"><TbChartBar /> Rendimiento (30 días)</div>
          <div className="invCardSub">Cambia vista con ⋮</div>
        </div>

        <CardTopActions
          id="perf30"
          openCardMenu={openCardMenu}
          setOpenCardMenu={setOpenCardMenu}
          setView={setView}
        />
      </div>

      {analytics.length === 0 ? (
        <div className="invEmpty">Sin datos aún (registra entradas/salidas).</div>
      ) : cardView.perf30 === "table" ? (
        <RenderCardView
          view="table"
          tableRows={analytics.map((x, i) => ({
            id: x.day || i,
            day: x.day || "-",
            qty_in: Number(x.qty_in || 0),
            qty_out: Number(x.qty_out || 0),
            value_in: Number(x.value_in || 0),
            value_out: Number(x.value_out || 0),
          }))}
          tableCols={[
            { key: "day", label: "Día", render: (r) => <b>{r.day}</b> },
            { key: "qty_in", label: "IN", align: "r", render: (r) => <b>{r.qty_in}</b> },
            { key: "qty_out", label: "OUT", align: "r", render: (r) => <b>{r.qty_out}</b> },
            { key: "value_in", label: "$ IN", align: "r", render: (r) => <b>{MXN.format(r.value_in)}</b> },
            { key: "value_out", label: "$ OUT", align: "r", render: (r) => <b>{MXN.format(r.value_out)}</b> },
          ]}
        />
      ) : cardView.perf30 === "pie" ? (
        <RenderCardView
          view="pie"
          chartTone="teal"
          height={260}
          pieA={(analytics || []).reduce((a, x) => a + Number(x.qty_in || 0), 0)}
          pieB={(analytics || []).reduce((a, x) => a + Number(x.qty_out || 0), 0)}
          pieLabelA="Entradas"
          pieLabelB="Salidas"
          tableRows={[
            { id: "in", label: "Entradas", value: (analytics || []).reduce((a, x) => a + Number(x.qty_in || 0), 0) },
            { id: "out", label: "Salidas", value: (analytics || []).reduce((a, x) => a + Number(x.qty_out || 0), 0) },
          ]}
          tableCols={[
            { key: "label", label: "Tipo", render: (r) => <b>{r.label}</b> },
            { key: "value", label: "Cantidad", align: "r", render: (r) => <b>{Number(r.value || 0)}</b> },
          ]}
        />
      ) : (
        <div className="invCardBody">
          <div className="invEChartWrap" style={{ minHeight: 260, height: 260 }}>
            <ReactECharts
              notMerge
              style={{ height: "100%", width: "100%" }}
              option={{
                animation: true,
                tooltip: { trigger: "axis" },
                grid: { left: 14, right: 14, top: 26, bottom: 34, containLabel: true },
                legend: {
                  top: 6,
                  textStyle: { fontWeight: 900, color: "rgba(10,12,14,0.75)" },
                },
                xAxis: {
                  type: "category",
                  boundaryGap: cardView.perf30 === "bar",
                  data: (analytics || []).map((x) => String(x.day || "")),
                  axisLabel: {
                    hideOverlap: true,
                    color: "rgba(10,12,14,0.65)",
                    fontWeight: 900,
                    formatter: (v) => String(v).slice(5, 10), // ✅ recorta fecha tipo MM-DD (evita amontonado)
                  },
                  axisLine: { lineStyle: { color: "rgba(10,12,14,0.14)" } },
                  axisTick: { show: false },
                },
                yAxis: {
                  type: "value",
                  axisLabel: { color: "rgba(10,12,14,0.65)", fontWeight: 900 },
                  splitLine: { lineStyle: { color: "rgba(10,12,14,0.10)" } },
                },
                dataZoom: [
                  { type: "inside", start: 0, end: 100 },
                  { type: "slider", height: 16, bottom: 8, start: 0, end: 100 },
                ],
                series:
                  cardView.perf30 === "line"
                    ? [
                        {
                          name: "Entradas",
                          type: "line",
                          smooth: true,
                          symbol: "circle",
                          symbolSize: 7,
                          lineStyle: { width: 3 },
                          areaStyle: { opacity: 0.10 },
                          data: (analytics || []).map((x) => Number(x.qty_in || 0)),
                        },
                        {
                          name: "Salidas",
                          type: "line",
                          smooth: true,
                          symbol: "circle",
                          symbolSize: 7,
                          lineStyle: { width: 3 },
                          areaStyle: { opacity: 0.10 },
                          data: (analytics || []).map((x) => Number(x.qty_out || 0)),
                        },
                      ]
                    : [
                        {
                          name: "Entradas",
                          type: "bar",
                          data: (analytics || []).map((x) => Number(x.qty_in || 0)),
                          barWidth: 18,
                          itemStyle: { borderRadius: [10, 10, 10, 10] },
                        },
                        {
                          name: "Salidas",
                          type: "bar",
                          data: (analytics || []).map((x) => Number(x.qty_out || 0)),
                          barWidth: 18,
                          itemStyle: { borderRadius: [10, 10, 10, 10] },
                        },
                      ],
              }}
            />
          </div>
        </div>
      )}
    </div>

{/* ===== Top Entradas / Salidas (UNA card con toggle) ===== */}
<div className="invCard">
  <div className="invCardTop invCardTopCompact">
    <div>
      <div className="invCardTitle"><TbArrowsUpDown /> Top Entradas / Salidas</div>
      <div className="invCardSub">Cambia panel y vista con ⋮</div>
    </div>

    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className={`invTab ${aTopIOPane === "IN" ? "on" : ""}`}
          onClick={() => setATopIOPane("IN")}
          style={{ padding: "8px 12px" }}
        >
          <TbArrowBigUpLines /> Entradas
        </button>

        <button
          type="button"
          className={`invTab ${aTopIOPane === "OUT" ? "on" : ""}`}
          onClick={() => setATopIOPane("OUT")}
          style={{ padding: "8px 12px" }}
        >
          <TbArrowBigDownLines /> Salidas
        </button>
      </div>

      <CardTopActions
        id={aTopIOPane === "IN" ? "aTopIn" : "aTopOut"}
        openCardMenu={openCardMenu}
        setOpenCardMenu={setOpenCardMenu}
        setView={setView}
      />
    </div>
  </div>

  {(aTopIOPane === "IN" ? topIn : topOut).length === 0 ? (
    <div className="invEmpty">Sin datos</div>
  ) : (
    <RenderCardView
      view={cardView[aTopIOPane === "IN" ? "aTopIn" : "aTopOut"] || "bar"}
      chartTone={aTopIOPane === "IN" ? "green" : "red"}
      items={(aTopIOPane === "IN" ? topIn : topOut).map((x) => ({
        label: x.name || x.product_name || "-",
        value: Number(x.qty || 0),
      }))}
      tableRows={aTopIOPane === "IN" ? topIn : topOut}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "sku", label: "SKU", align: "c", render: (r) => (r.sku || "-") },
        { key: "qty", label: "Qty", align: "r", render: (r) => <b>{Number(r.qty || 0)}</b> },
      ]}
    />
  )}
</div>
    {/* ===== Más valor movido ===== */}
    <div className="invCard">
      <div className="invCardTop invCardTopCompact">
        <div>
          <div className="invCardTitle"><TbCurrencyDollar /> Más valor movido</div>
          <div className="invCardSub">Cambia vista con ⋮</div>
        </div>

        <CardTopActions
          id="aValued"
          openCardMenu={openCardMenu}
          setOpenCardMenu={setOpenCardMenu}
          setView={setView}
        />
      </div>

      {topValued.length === 0 ? (
        <div className="invEmpty">Sin datos</div>
      ) : (
        <RenderCardView
          view={cardView.aValued}
          chartTone="purple"
          items={topValued.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.value || 0) }))}
          tableRows={topValued}
          tableCols={[
            { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
            { key: "qty", label: "Qty", align: "c", render: (r) => Number(r.qty || 0) },
            { key: "value", label: "$", align: "r", render: (r) => <b>${Math.round(Number(r.value || 0)).toLocaleString()}</b> },
          ]}
        />
      )}
    </div>
  </div>
)}

    {/* =========================
        MOVEMENTS / HISTORIAL
    ========================= */}
    {tab === "movements" && (
      <div className="invCard">
<div className="invCardTop invCardTopCompact">
  <div>
    <div className="invCardTitle"><TbClock /> Historial</div>
    <div className="invCardSub">Filtrado por periodo (backend) · scroll interno</div>
  </div>

  <CardRangeFilter
    value={cardRange.movements}
    ariaLabel="periodo-historial"
    onChange={async (e) => {
      const v = e.target.value;
      setCardRange((p) => ({ ...p, movements: v }));
      await reloadDashboardDays(rangeToDays(v));
    }}
  />
</div>
        <div className="invCardBody isScroll">
          {activity.length === 0 ? (
            <div className="invEmpty">Sin historial aún</div>
          ) : (
            <div className="invFeed">
              {activity.map((a) => {
                
                const ui = activityUI(a);
                const who = a.actor_full_name || a.actor_username || "Usuario";
                const when = a.created_at ? new Date(a.created_at).toLocaleString() : "";

                const details = [];
                if (a.actor_department) details.push(a.actor_department);
                if (a.meta?.type) details.push(a.meta.type === "IN" ? "Entrada" : a.meta.type === "OUT" ? "Salida" : String(a.meta.type));
                if (a.meta?.reason) details.push(String(a.meta.reason));

                return (
                  <div className={`invActRow tone-${ui.tone}`} key={a.id}>
                    <div className="invActAvatar">
                      {a.actor_profile_photo_url ? (
                        <img src={a.actor_profile_photo_url} alt={who} />
                      ) : (
                        <div className="invActAvatarPh"><TbUserCircle /></div>
                      )}
                    </div>

                    <div className="invActBody">
                      <div className="invActTopLine">
                        <div className="invActIcon">{ui.icon}</div>
                        <div className="invActTitle">{ui.title}</div>
                        <div className="invActTime">{when}</div>
                      </div>

                      <div className="invActText">
                        <b>{who}</b> {ui.verb}
                      </div>

                      {details.length ? (
                        <div className="invActMeta">
                          {details.map((t, i) => (
                            <span className="invActChip" key={i}>{t}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    )}

          {/* =========================
              Product Modal (DENTRO del fragment)
          ========================= */}
<Modal
  open={productOpen}
  title="Crear producto"
  onClose={() => setProductOpen(false)}          // cierre directo (solo lo usa el modal internamente)
  onRequestClose={requestCloseProductModal}     // ✅ ESC / backdrop / X preguntan si hay cambios
>
  <div className="invForm invFormPro">
    <div className="invField invSpan2">
      <label>Nombre</label>
      <input
        value={productDraft.name}
        onChange={(e) => {
          setProductDirty(true);
          setProductDraft((p) => ({ ...p, name: toTitleCaseLive(e.target.value) }));
        }}
        placeholder="Ej: Tornillo 1/4, Aceite, Cable..."
      />
    </div>

    <div className="invField">
      <label>SKU</label>
      <input
        value={productDraft.sku}
        onChange={(e) => {
          setProductDirty(true);
          setProductDraft((p) => ({ ...p, sku: toSkuUpperLive(e.target.value) }));
        }}
        placeholder="Opcional"
      />
    </div>

    <div className="invField">
      <label>Unidad</label>
      <ProSelect
        value={productDraft.unit}
        onChange={(e) => {
          setProductDirty(true);
          setProductDraft((p) => ({ ...p, unit: e.target.value }));
        }}
        ariaLabel="unidad"
        placeholder="Selecciona unidad"
      >
        <option value="pz">Pieza (pz)</option>
        <option value="kg">Kilogramo (kg)</option>
        <option value="g">Gramo (g)</option>
        <option value="lt">Litro (lt)</option>
        <option value="ml">Mililitro (ml)</option>
        <option value="m">Metro (m)</option>
        <option value="cm">Centímetro (cm)</option>
        <option value="caja">Caja</option>
        <option value="paq">Paquete</option>
      </ProSelect>
    </div>

    <div className="invField">
      <label>Costo</label>
      <div className="invMoneyWrap">
        <span className="invMoneyPrefix">$</span>
        <input
          className="invMoneyInput"
          inputMode="decimal"
          value={productDraft.cost}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) {
              setProductDirty(true);
              setProductDraft((p) => ({ ...p, cost: v }));
            }
          }}
          placeholder="0.00"
        />
      </div>
    </div>

    <div className="invField">
      <label>Precio</label>
      <div className="invMoneyWrap">
        <span className="invMoneyPrefix">$</span>
        <input
          className="invMoneyInput"
          inputMode="decimal"
          value={productDraft.price}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || /^\d*\.?\d*$/.test(v)) {
              setProductDirty(true);
              setProductDraft((p) => ({ ...p, price: v }));
            }
          }}
          placeholder="0.00"
        />
      </div>
    </div>

    <div className="invFormActions">
      <button className="invBtn invGhost" type="button" onClick={requestCloseProductModal}>
        Cancelar
      </button>
      <button className="invBtn invPrimary" type="button" onClick={saveProduct}>
        Guardar
      </button>
    </div>
  </div>
</Modal>

          {/* =========================
              Movement Modal (DENTRO del fragment)
          ========================= */}
<Modal
  open={movementOpen}
  title={movementType === "IN" ? "Registrar Entrada" : "Registrar Salida"}
  onClose={() => setMovementOpen(false)}            // cierre directo (solo lo usa el modal internamente)
  onRequestClose={requestCloseMovementModal}       // ✅ ESC / backdrop / X preguntan si hay cambios
>
  <div className="invForm">
    <div className="invField invSpan2">
      <label>Motivo</label>
      <input
        value={movementReason}
        onChange={(e) => {
          setMovementDirty(true);
          setMovementReason(toTitleCaseLive(e.target.value));
        }}
        placeholder="Ej: Compra, Ajuste, Salida material, etc."
      />
    </div>

    <div className="invItems">
      <div className="invItemsHead">
        <div>Producto</div>
        <div className="c">Cantidad</div>
        <div className="c">Costo unit</div>
        <div className="c"> </div>
      </div>

      {movementItems.map((row, i) => (
        <div className="invItemsRow" key={i}>
          <ProSelect
            value={row.product_id}
            onChange={(e) => updateMovementRow(i, "product_id", e.target.value)}
            ariaLabel="producto"
            placeholder="Selecciona producto…"
          >
            <option value="">Selecciona…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.sku ? `· ${p.sku}` : ""}
              </option>
            ))}
          </ProSelect>

          <input
            className="c"
            type="number"
            value={row.qty}
            onChange={(e) => updateMovementRow(i, "qty", e.target.value)}
          />

          <div className="invMoneyWrap">
            <span className="invMoneyPrefix">$</span>
            <input
              className="c invMoneyInput"
              inputMode="decimal"
              value={String(row.unit_cost ?? "")}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || /^\d*\.?\d*$/.test(v)) {
                  updateMovementRow(i, "unit_cost", v);
                }
              }}
              placeholder="0.00"
            />
          </div>

          <button className="invBtn invGhost" type="button" onClick={() => removeMovementRow(i)}>
            Quitar
          </button>
        </div>
      ))}

      <button className="invBtn invGhost" type="button" onClick={addMovementRow}>
        <TbPlus /> Agregar producto
      </button>
    </div>

    <div className="invFormActions">
      <button className="invBtn invGhost" type="button" onClick={requestCloseMovementModal}>
        Cancelar
      </button>
      <button
        className={`invBtn ${movementType === "IN" ? "invIn" : "invOut"}`}
        type="button"
        onClick={saveMovement}
      >
        Guardar
      </button>
    </div>
  </div>
</Modal>
        </>
      )}

    </div>
  );
}