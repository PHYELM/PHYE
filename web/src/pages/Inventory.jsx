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
} from "react-icons/tb";

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
  // datos
  items = [],
  // para Pie
  pieA = 0,
  pieB = 0,
  pieLabelA = "A",
  pieLabelB = "B",
  // para tabla
  tableRows = [],
  tableCols = [],
  // chart palette
  chartTone = "teal", // teal | blue | green | red | purple
}) {
  if (view === "table") {
    return (
      <div className="invCardBody isScroll viewTable">
        <MiniTableView rows={tableRows} cols={tableCols} />
      </div>
    );
  }

  if (view === "pie") {
    return (
      <div className="invCardBody">
        <div className={`invChartTone ${chartTone}`}>
          <MiniPieChart a={pieA} b={pieB} labelA={pieLabelA} labelB={pieLabelB} />
        </div>
      </div>
    );
  }

  if (view === "line") {
    return (
      <div className="invCardBody">
        <div className={`invChartTone ${chartTone}`}>
          <MiniLineChart items={items} />
        </div>
      </div>
    );
  }

  // default bar
  return (
    <div className="invCardBody">
      <div className={`invChartTone ${chartTone}`}>
        <MiniBarsChart items={items} />
      </div>
    </div>
  );
}
/* =========================
  Modal pro (simple)
========================= */
function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="invModalBack" onMouseDown={onClose}>
      <div className="invModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="invModalTop">
          <div className="invModalTitle">{title}</div>
          <button className="invIconBtn" onClick={onClose} type="button">✕</button>
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

  // ✅ TOP widgets (dashboard pro)
  const [topStock, setTopStock] = useState([]);
  const [topIn, setTopIn] = useState([]);
  const [topOut, setTopOut] = useState([]);
  const [topValued, setTopValued] = useState([]);

// ui
// ui
const [q, setQ] = useState("");
const [movementOpen, setMovementOpen] = useState(false);
const [movementType, setMovementType] = useState("IN");
const [movementReason, setMovementReason] = useState("");
const [movementItems, setMovementItems] = useState([]);

// ✅ Crear producto (modal pro)
const [productOpen, setProductOpen] = useState(false);
const [productDraft, setProductDraft] = useState({
  name: "",
  sku: "",
  unit: "pz",
  // ✅ crudo mientras escribes
  cost: "",
  price: "",
  stock_min: 0,
});
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
  const setView = (id, view) => {
    setCardView((p) => ({ ...p, [id]: view }));
    setOpenCardMenu(null);
  };

  const allowed = useMemo(
    () => canAccessModule("inventory", currentWorker, policies),
    [currentWorker, policies]
  );

async function loadAll() {
  setLoading(true);
  setLoadError("");

  try {
    // policies (para permisos)
    const p = await apiFetch("/api/admin/access-policies").catch((e) => {
      console.warn("⚠️ policies failed:", e.message);
      return { data: [] };
    });

    const endpoints = [
      { key: "products", url: "/api/inventory/products" },
      { key: "stock", url: "/api/inventory/stock" },
      { key: "analytics", url: "/api/inventory/analytics?days=30" },
      { key: "activity", url: "/api/inventory/activity?limit=25&offset=0" },
      { key: "topStock", url: "/api/inventory/top-stock?limit=8" },
      { key: "topIn", url: "/api/inventory/top-in?days=30&limit=8" },
      { key: "topOut", url: "/api/inventory/top-out?days=30&limit=8" },
      { key: "topValued", url: "/api/inventory/top-valued?days=30&limit=8" },
    ];

    const results = await Promise.allSettled(endpoints.map((e) => apiFetch(e.url)));

    const byKey = {};
    const failed = [];

    results.forEach((r, i) => {
      const k = endpoints[i].key;
      if (r.status === "fulfilled") {
        byKey[k] = r.value?.data || [];
      } else {
        byKey[k] = [];
        failed.push(`${endpoints[i].url} -> ${r.reason?.message || r.reason}`);
        console.warn("❌ Inventory endpoint failed:", endpoints[i].url, r.reason?.message || r.reason);
      }
    });

    if (failed.length) {
      setLoadError(`Fallaron ${failed.length} endpoints. Revisa consola/Network.`);
    }

    setPolicies(p.data || []);

    setProducts(byKey.products || []);
    setStock(byKey.stock || []);
    setAnalytics(byKey.analytics || []);
    setActivity(byKey.activity || []);

    setTopStock(byKey.topStock || []);
    setTopIn(byKey.topIn || []);
    setTopOut(byKey.topOut || []);
    setTopValued(byKey.topValued || []);
  } finally {
    setLoading(false);
  }
}
useEffect(() => {
  loadAll();
  // eslint-disable-next-line
}, []);

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
          loadAll();
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

  function openMovement(type) {
    setMovementType(type);
    setMovementReason("");
    setMovementItems([{ product_id: "", qty: 1, unit_cost: 0 }]);
    setMovementOpen(true);
  }

  function addMovementRow() {
    setMovementItems((prev) => [...prev, { product_id: "", qty: 1, unit_cost: 0 }]);
  }

  function updateMovementRow(i, key, val) {
    setMovementItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)));
  }

  function removeMovementRow(i) {
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

setMovementOpen(false);
await loadAll();
setTab("dashboard");

    setMovementOpen(false);
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
    stock_min: 0,
  });
  setProductOpen(true);
}

async function saveProduct() {
const name = String(productDraft.name || "").trim();
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
        stock_min: Number(productDraft.stock_min || 0),
        created_by: currentWorker?.id || null,
      }),
    }),
  {
    loadingTitle: "Creando producto…",
    successTitle: "Producto creado",
  }
);

setProductOpen(false);
await loadAll();
setTab("products");
}
  if (!allowed) {
    return (
      <div className="invWrap">
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
    <div className="invWrap">
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
    <button className="invBtn invGhost" type="button" onClick={loadAll} title="Recargar">
      <TbRefresh /> Recargar
    </button>

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
          <div className="invKpiTileTitle">ENTRADAS (30 DÍAS)</div>
          <div className="invKpiTileIcon"><TbArrowBigUpLines /></div>
        </div>
        <div className="invKpiTileValue">{totals.sumIn}</div>
        <div className="invKpiTileSub">Movimientos IN</div>
        <SparkBars values={totals.sparkIn} />
      </div>

      <div className="invKpiTile toneOut">
        <div className="invKpiTileTop">
          <div className="invKpiTileTitle">SALIDAS (30 DÍAS)</div>
          <div className="invKpiTileIcon"><TbArrowBigDownLines /></div>
        </div>
        <div className="invKpiTileValue">{totals.sumOut}</div>
        <div className="invKpiTileSub">Movimientos OUT</div>
        <SparkBars values={totals.sparkOut} />
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
  {/* ========= IZQUIERDA: Top Stock (card grande) ========= */}
  <div className="invCard invBigCard invCol8 invRow2">
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
      items={topStock.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.stock || 0) }))}
      tableRows={topStock}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "sku", label: "SKU", align: "c", render: (r) => (r.sku || "-") },
        { key: "stock", label: "Stock", align: "r", render: (r) => <b>{Number(r.stock || 0)}</b> },
      ]}
    />
  </div>

  {/* ========= DERECHA ARRIBA: Entradas/Salidas (pie o tabla) ========= */}
  <div className="invCard invCol4">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbArrowsUpDown /> Entradas / Salidas</div>
        <div className="invCardSub">Volumen (30 días) · cambia vista con ⋮</div>
      </div>

      <CardTopActions
        id="io"
        openCardMenu={openCardMenu}
        setOpenCardMenu={setOpenCardMenu}
        setView={setView}
      />
    </div>

    <RenderCardView
      view={cardView.io || "pie"}
      chartTone="teal"
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

  {/* ========= DERECHA ABAJO: Top Valorizados (bar/line/tabla) ========= */}
  <div className="invCard invCol4">
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
      items={topValued.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.value || 0) }))}
      tableRows={topValued}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "qty", label: "Qty", align: "c", render: (r) => Number(r.qty || 0) },
        { key: "value", label: "$", align: "r", render: (r) => <b>${Math.round(Number(r.value || 0)).toLocaleString()}</b> },
      ]}
    />
  </div>

  {/* ========= FILA MEDIA: Top IN y Top OUT ========= */}
  <div className="invCard invHalf invCol6">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbArrowBigUpLines /> Top Entradas</div>
        <div className="invCardSub">Por producto (30 días) · cambia vista con ⋮</div>
      </div>

      <CardTopActions
        id="topIn"
        openCardMenu={openCardMenu}
        setOpenCardMenu={setOpenCardMenu}
        setView={setView}
      />
    </div>

    <RenderCardView
      view={cardView.topIn}
      chartTone="green"
      items={topIn.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.qty || 0) }))}
      tableRows={topIn}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "sku", label: "SKU", align: "c", render: (r) => (r.sku || "-") },
        { key: "qty", label: "Qty", align: "r", render: (r) => <b>{Number(r.qty || 0)}</b> },
      ]}
    />
  </div>

  <div className="invCard invHalf invCol6">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbArrowBigDownLines /> Top Salidas</div>
        <div className="invCardSub">Por producto (30 días) · cambia vista con ⋮</div>
      </div>

      <CardTopActions
        id="topOut"
        openCardMenu={openCardMenu}
        setOpenCardMenu={setOpenCardMenu}
        setView={setView}
      />
    </div>

    <RenderCardView
      view={cardView.topOut}
      chartTone="red"
      items={topOut.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.qty || 0) }))}
      tableRows={topOut}
      tableCols={[
        { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
        { key: "sku", label: "SKU", align: "c", render: (r) => (r.sku || "-") },
        { key: "qty", label: "Qty", align: "r", render: (r) => <b>{Number(r.qty || 0)}</b> },
      ]}
    />
  </div>

  {/* ========= ABAJO: Actividad (12/12 para NO dejar huecos) ========= */}
  <div className="invCard invCol12">
    <div className="invCardTop invCardTopCompact">
      <div>
        <div className="invCardTitle"><TbClock /> Actividad reciente</div>
        <div className="invCardSub">Últimos eventos (auto) · scroll interno</div>
      </div>
    </div>

    <div className="invCardBody isScroll">
      {activity.length === 0 ? (
        <div className="invEmpty">Sin actividad aún</div>
      ) : (
        <div className="invFeed">
          {activity.slice(0, 12).map((a) => (
            <div className="invFeedRow" key={a.id}>
              <div className="invFeedLeft">
                {a.actor_profile_photo_url ? (
                  <img className="invAvatar" src={a.actor_profile_photo_url} alt="actor" />
                ) : (
                  <div className="invAvatarPh"><TbUserCircle /></div>
                )}
              </div>
              <div className="invFeedMid">
                <div className="invFeedTitle">
                  <b>{a.actor_full_name || a.actor_username || "Usuario"}</b> · {a.action}
                </div>
                <div className="invFeedSub" style={{ opacity: 0.75 }}>
                  {a.actor_department || ""}{a.meta?.type ? ` · ${a.meta.type}` : ""}{a.meta?.reason ? ` · ${a.meta.reason}` : ""}
                </div>
              </div>
              <div className="invFeedRight" style={{ opacity: 0.65 }}>
                {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
        <table className="invTable">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th className="c">Unidad</th>
              <th className="c">Costo</th>
              <th className="c">Precio</th>
              <th className="c">Min</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name}</b></td>
                <td>{p.sku || "-"}</td>
                <td className="c">{p.unit || "-"}</td>
<td className="c">{MXN.format(Number(p.cost || 0))}</td>
<td className="c">{MXN.format(Number(p.price || 0))}</td>
                <td className="c">{Number(p.stock_min || 0)}</td>
              </tr>
            ))}
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
  <div className="invGrid">
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
      ) : (
        <RenderCardView
          view={cardView.perf30}
          chartTone="blue"
          items={analytics.map((x) => ({ value: Number(x.qty_in || 0) + Number(x.qty_out || 0) }))}
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
          ]}
        />
      )}
    </div>

    {/* ===== Top Entradas ===== */}
    <div className="invCard">
      <div className="invCardTop invCardTopCompact">
        <div>
          <div className="invCardTitle"><TbArrowBigUpLines /> Top Entradas</div>
          <div className="invCardSub">Cambia vista con ⋮</div>
        </div>

        <CardTopActions
          id="aTopIn"
          openCardMenu={openCardMenu}
          setOpenCardMenu={setOpenCardMenu}
          setView={setView}
        />
      </div>

      {topIn.length === 0 ? (
        <div className="invEmpty">Sin datos</div>
      ) : (
        <RenderCardView
          view={cardView.aTopIn}
          chartTone="green"
          items={topIn.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.qty || 0) }))}
          tableRows={topIn}
          tableCols={[
            { key: "name", label: "Producto", render: (r) => <b>{r.name || r.product_name || "-"}</b> },
            { key: "sku", label: "SKU", align: "c", render: (r) => (r.sku || "-") },
            { key: "qty", label: "Qty", align: "r", render: (r) => <b>{Number(r.qty || 0)}</b> },
          ]}
        />
      )}
    </div>

    {/* ===== Top Salidas ===== */}
    <div className="invCard">
      <div className="invCardTop invCardTopCompact">
        <div>
          <div className="invCardTitle"><TbArrowBigDownLines /> Top Salidas</div>
          <div className="invCardSub">Cambia vista con ⋮</div>
        </div>

        <CardTopActions
          id="aTopOut"
          openCardMenu={openCardMenu}
          setOpenCardMenu={setOpenCardMenu}
          setView={setView}
        />
      </div>

      {topOut.length === 0 ? (
        <div className="invEmpty">Sin datos</div>
      ) : (
        <RenderCardView
          view={cardView.aTopOut}
          chartTone="red"
          items={topOut.map((x) => ({ label: x.name || x.product_name || "-", value: Number(x.qty || 0) }))}
          tableRows={topOut}
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
        <div className="invCardTop">
          <div className="invCardTitle"><TbClock /> Historial (Activity)</div>
        </div>

        {activity.length === 0 ? (
          <div className="invEmpty">Sin historial aún</div>
        ) : (
          <div className="invTableWrap">
            <table className="invTable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Actor</th>
                  <th>Acción</th>
                  <th>Meta</th>
                </tr>
              </thead>
              <tbody>
                {activity.map((a) => (
                  <tr key={a.id}>
                    <td>{a.created_at ? new Date(a.created_at).toLocaleString() : "-"}</td>
                    <td>{a.actor_full_name || a.actor_username || "-"}</td>
                    <td><b>{a.action}</b></td>
                    <td style={{ opacity: 0.8 }}>
                      {a.meta?.type ? `type=${a.meta.type} ` : ""}
                      {a.meta?.total_qty ? `qty=${a.meta.total_qty} ` : ""}
                      {a.meta?.total_value ? `val=${a.meta.total_value} ` : ""}
                      {a.meta?.reason ? `· ${a.meta.reason}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

          {/* =========================
              Product Modal (DENTRO del fragment)
          ========================= */}
          <Modal
            open={productOpen}
            title="Crear producto"
            onClose={() => setProductOpen(false)}
          >
<div className="invForm">
  <div className="invField invSpan2">
    <label>Nombre</label>
    <input
      value={productDraft.name}
      onChange={(e) =>
        setProductDraft((p) => ({ ...p, name: toTitleCaseLive(e.target.value) }))
      }
      placeholder="Ej: Tornillo 1/4, Aceite, Cable..."
    />
  </div>

  <div className="invField">
    <label>SKU</label>
    <input
      value={productDraft.sku}
      onChange={(e) =>
        setProductDraft((p) => ({ ...p, sku: toSkuUpperLive(e.target.value) }))
      }
      placeholder="Opcional"
    />
  </div>

  <div className="invField">
    <label>Unidad</label>
    <ProSelect
      value={productDraft.unit}
      onChange={(e) => setProductDraft((p) => ({ ...p, unit: e.target.value }))}
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
        // ✅ deja vacío o números con punto
        if (v === "" || /^\d*\.?\d*$/.test(v)) {
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
          setProductDraft((p) => ({ ...p, price: v }));
        }
      }}
      placeholder="0.00"
    />
  </div>
</div>

  <div className="invField invSpan2">
    <label>Stock mínimo</label>
    <input
      type="number"
      value={productDraft.stock_min}
      onChange={(e) => setProductDraft((p) => ({ ...p, stock_min: e.target.value }))}
    />
  </div>

  <div className="invFormActions">
    <button className="invBtn invGhost" type="button" onClick={() => setProductOpen(false)}>
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
            onClose={() => setMovementOpen(false)}
          >
            <div className="invForm">
              <div className="invField invSpan2">
                <label>Motivo</label>
<input
  value={movementReason}
  onChange={(e) => setMovementReason(toTitleCaseLive(e.target.value))}
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
                <button className="invBtn invGhost" type="button" onClick={() => setMovementOpen(false)}>
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