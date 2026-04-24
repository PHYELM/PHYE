import React, { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "../api";
import "./OperationsModule.css";
import {
  TbTruck, TbPlus, TbSearch, TbEdit, TbTrash, TbRefresh,
  TbX, TbAlertTriangle, TbClock, TbMapPin, TbUser,
  TbActivity, TbEye, TbNotes, TbArrowRight,
} from "react-icons/tb";

// ─── Constants ────────────────────────────────────────────────
const STATUSES = {
  pending:    { label: "Pendiente",      color: "#64748b", bg: "#f1f5f9" },
  scheduled:  { label: "Programado",     color: "#2563eb", bg: "#eff6ff" },
  preparing:  { label: "En preparación", color: "#d97706", bg: "#fffbeb" },
  on_way:     { label: "En camino",      color: "#ea580c", bg: "#fff7ed" },
  on_site:    { label: "En sitio",       color: "#0d9488", bg: "#f0fdfa" },
  loading:    { label: "Cargando",       color: "#7c3aed", bg: "#f5f3ff" },
  unloading:  { label: "Descargando",    color: "#4f46e5", bg: "#eef2ff" },
  completed:  { label: "Finalizado",     color: "#16a34a", bg: "#f0fdf4" },
  incident:   { label: "Incidencia",     color: "#dc2626", bg: "#fef2f2" },
  cancelled:  { label: "Cancelado",      color: "#9ca3af", bg: "#f9fafb" },
};

const STATUS_FLOW = [
  "all","pending","scheduled","preparing","on_way",
  "on_site","loading","unloading","completed","incident","cancelled",
];

const INCIDENT_TYPES = {
  delay:              "Retraso",
  mechanical:         "Falla mecánica",
  client_unavailable: "Cliente no disponible",
  route_blocked:      "Ruta bloqueada",
  missing_document:   "Documento faltante",
  fuel:               "Combustible",
  other:              "Otro",
};

const PRIORITIES = {
  low:      { label: "Baja",    color: "#16a34a" },
  medium:   { label: "Media",   color: "#d97706" },
  high:     { label: "Alta",    color: "#ea580c" },
  critical: { label: "Crítica", color: "#dc2626" },
};

const EVENT_TYPES = [
  { value: "unit_assigned",     label: "Unidad asignada" },
  { value: "departed",          label: "Operador salió de base" },
  { value: "arrived_client",    label: "Llegó a cliente" },
  { value: "delay",             label: "Se presentó retraso" },
  { value: "loading_started",   label: "Inició carga" },
  { value: "loading_done",      label: "Carga completada" },
  { value: "unloading_started", label: "Inició descarga" },
  { value: "service_done",      label: "Servicio completado" },
  { value: "incident",          label: "Incidencia reportada" },
  { value: "custom",            label: "Nota personalizada" },
];

// ─── Helpers ──────────────────────────────────────────────────
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function toInputDT(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  return d.toISOString().slice(0, 16);
}

function StatusBadge({ status }) {
  const s = STATUSES[status] || STATUSES.pending;
  return <span className="opsBadge" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

function PriorityBadge({ priority }) {
  const p = PRIORITIES[priority] || PRIORITIES.medium;
  return <span className="opsBadge" style={{ color: p.color, background: p.color + "18" }}>{p.label}</span>;
}

function emptyOperation(worker) {
  return {
    title: "",
    status: "pending",
    priority: "medium",
    unit_name: "",
    operator_name: "",
    client_name: "",
    origin: "",
    destination: "",
    scheduled_at: "",
    real_departure_at: "",
    real_arrival_at: "",
    observations: "",
    created_by: worker?.id || null,
  };
}

// ─── Operation Form Modal ─────────────────────────────────────
function OperationFormModal({ open, mode, form, setForm, onClose, onSave }) {
  if (!open) return null;
  const ro = mode === "view";

  const inp = (label, key, type = "text", placeholder = "") => (
    <div className="opsField">
      <label>{label}</label>
      <input className="opsInput" type={type} value={form[key] ?? ""} readOnly={ro}
        placeholder={placeholder}
        onChange={(e) => !ro && setForm((p) => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="opsModalBack" onMouseDown={onClose}>
      <div className="opsModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="opsModalTop">
          <div className="opsModalTitle">
            {mode === "create" ? "Nueva operación" : mode === "edit" ? "Editar operación" : "Detalle de operación"}
          </div>
          <button type="button" className="opsIconBtn" onClick={onClose}><TbX /></button>
        </div>

        <div className="opsModalBody">
          <div className="opsGrid">
            <div className="opsField opsField--span2">
              <label>Título / Descripción</label>
              <input className="opsInput" value={form.title ?? ""} readOnly={ro}
                placeholder="Ej. Entrega sanitarios a Coppel"
                onChange={(e) => !ro && setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="opsField">
              <label>Estado</label>
              <select
                className="opsInput"
                value={form.status}
                disabled={ro}
                onChange={(e) =>
                  !ro && setForm((p) => ({ ...p, status: e.target.value }))
                }
              >
                {Object.entries(STATUSES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="opsField">
              <label>Prioridad</label>
              <select
                className="opsInput"
                value={form.priority || "medium"}
                disabled={ro}
                onChange={(e) =>
                  !ro && setForm((p) => ({ ...p, priority: e.target.value }))
                }
              >
                {Object.entries(PRIORITIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {inp("Unidad", "unit_name", "text", "Ej. Unidad 84")}
            {inp("Operador", "operator_name", "text", "Nombre del operador")}
            {inp("Cliente", "client_name", "text", "Nombre del cliente")}
            {inp("Origen", "origin", "text", "Punto de partida")}
            {inp("Destino", "destination", "text", "Punto de llegada")}
            {inp("Fecha / hora programada", "scheduled_at", "datetime-local")}
            {inp("Salida real", "real_departure_at", "datetime-local")}
            {inp("Llegada real", "real_arrival_at", "datetime-local")}

            <div className="opsField opsField--span2">
              <label>Observaciones</label>
              <textarea className="opsTextarea" value={form.observations ?? ""} readOnly={ro}
                placeholder="Observaciones generales de la operación..."
                onChange={(e) => !ro && setForm((p) => ({ ...p, observations: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="opsModalActions">
          <button type="button" className="opsBtn opsBtnGhost" onClick={onClose}>Cerrar</button>
          {!ro && <button type="button" className="opsBtn opsBtnPrimary" onClick={onSave}>Guardar operación</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────
function OperationDetailDrawer({ open, operation, onClose, currentWorker, onRefresh }) {
  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newEvent, setNewEvent] = useState({ event_type: "custom", description: "" });
  const [newIncident, setNewIncident] = useState({ incident_type: "delay", priority: "medium", description: "" });
  const [addingEvent, setAddingEvent] = useState(false);
  const [addingIncident, setAddingIncident] = useState(false);
  const [tab, setTab] = useState("timeline");

  const loadDetail = useCallback(async () => {
    if (!operation?.id) return;
    setLoadingDetail(true);
    try {
      const resp = await apiFetch(`/api/operations/${operation.id}`);
      setEvents(resp?.data?.events || []);
      setIncidents(resp?.data?.incidents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  }, [operation?.id]);

  useEffect(() => {
    if (open) { loadDetail(); setTab("timeline"); setAddingEvent(false); setAddingIncident(false); }
  }, [open, loadDetail]);

  async function saveEvent() {
    if (!newEvent.description.trim()) {
      Swal.fire("Falta descripción", "Escribe una descripción para el evento.", "warning"); return;
    }
    try {
      await apiFetch(`/api/operations/${operation.id}/events`, {
        method: "POST", body: JSON.stringify({ ...newEvent, created_by: currentWorker?.id }),
      });
      setNewEvent({ event_type: "custom", description: "" });
      setAddingEvent(false); loadDetail();
    } catch (e) { Swal.fire("Error", e.message, "error"); }
  }

  async function saveIncident() {
    if (!newIncident.description.trim()) {
      Swal.fire("Falta descripción", "Escribe una descripción de la incidencia.", "warning"); return;
    }
    try {
      await apiFetch(`/api/operations/${operation.id}/incidents`, {
        method: "POST", body: JSON.stringify({ ...newIncident, created_by: currentWorker?.id }),
      });
      setNewIncident({ incident_type: "delay", priority: "medium", description: "" });
      setAddingIncident(false); loadDetail(); onRefresh();
    } catch (e) { Swal.fire("Error", e.message, "error"); }
  }

  async function resolveIncident(incidentId) {
    try {
      await apiFetch(`/api/operations/${operation.id}/incidents/${incidentId}`, {
        method: "PUT", body: JSON.stringify({ resolved: true }),
      });
      loadDetail();
    } catch (e) { Swal.fire("Error", e.message, "error"); }
  }

  if (!open || !operation) return null;

  const unresolvedCount = incidents.filter((i) => !i.resolved).length;

  return (
    <div className="opsDrawerBack" onMouseDown={onClose}>
      <div className="opsDrawer" onMouseDown={(e) => e.stopPropagation()}>

        <div className="opsDrawerTop">
          <div>
            <div className="opsDrawerTitle">{operation.title || "Operación sin título"}</div>
            <div className="opsDrawerSub">
              <StatusBadge status={operation.status} />
              <PriorityBadge priority={operation.priority} />
              {operation.unit_name && (
                <span className="opsDrawerMeta">
                  <TbTruck /> {operation.unit_name}
                </span>
              )}
              {operation.operator_name && (
                <span className="opsDrawerMeta">
                  <TbUser /> {operation.operator_name}
                </span>
              )}
            </div>
          </div>
          <button type="button" className="opsIconBtn" onClick={onClose}><TbX /></button>
        </div>

        <div className="opsInfoRow">
          {operation.client_name && <div className="opsInfoItem"><TbUser /><span>{operation.client_name}</span></div>}
          {operation.origin && <div className="opsInfoItem"><TbMapPin /><span>{operation.origin}</span></div>}
          {operation.destination && <div className="opsInfoItem"><TbArrowRight /><span>{operation.destination}</span></div>}
          {operation.scheduled_at && <div className="opsInfoItem"><TbClock /><span>{formatDate(operation.scheduled_at)}</span></div>}
        </div>

        <div className="opsDetailTabs">
          <button type="button" className={`opsDetailTab${tab === "timeline" ? " active" : ""}`} onClick={() => setTab("timeline")}>
            <TbActivity /> Línea de tiempo {events.length > 0 && <span className="opsTabBadge">{events.length}</span>}
          </button>
          <button type="button" className={`opsDetailTab${tab === "incidents" ? " active" : ""}`} onClick={() => setTab("incidents")}>
            <TbAlertTriangle /> Incidencias
            {unresolvedCount > 0 && <span className="opsTabBadge opsTabBadgeRed">{unresolvedCount}</span>}
          </button>
        </div>

        <div className="opsDrawerBody">
          {loadingDetail ? (
            <div className="opsDetailEmpty">Cargando...</div>
          ) : tab === "timeline" ? (
            <>
              <div className="opsTimeline">
                {events.length === 0 && <div className="opsDetailEmpty">Sin eventos registrados. Agrega el primero.</div>}
                {events.map((ev, i) => (
                  <div key={ev.id || i} className="opsTimelineItem">
                    <div className="opsTimelineDot" />
                    <div className="opsTimelineContent">
                      <div className="opsTimelineLabel">
                        {EVENT_TYPES.find((e) => e.value === ev.event_type)?.label || ev.event_type}
                      </div>
                      <div className="opsTimelineDesc">{ev.description}</div>
                      <div className="opsTimelineTime">{formatDate(ev.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>

              {!addingEvent ? (
                <button type="button" className="opsBtn opsBtnGhost opsAddBtn" onClick={() => setAddingEvent(true)}>
                  <TbPlus /> Registrar evento
                </button>
              ) : (
                <div className="opsAddForm">
                  <div className="opsField">
                    <label>Tipo de evento</label>
                    <select className="opsInput" value={newEvent.event_type}
                      onChange={(e) => setNewEvent((p) => ({ ...p, event_type: e.target.value }))}>
                      {EVENT_TYPES.map((et) => <option key={et.value} value={et.value}>{et.label}</option>)}
                    </select>
                  </div>
                  <div className="opsField">
                    <label>Descripción</label>
                    <textarea className="opsTextarea opsTextareaSm" value={newEvent.description}
                      placeholder="Descripción del evento..."
                      onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="opsAddFormActions">
                    <button type="button" className="opsBtn opsBtnGhost" onClick={() => setAddingEvent(false)}>Cancelar</button>
                    <button type="button" className="opsBtn opsBtnPrimary" onClick={saveEvent}>Guardar evento</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="opsIncidentsList">
                {incidents.length === 0 && <div className="opsDetailEmpty">Sin incidencias registradas.</div>}
                {incidents.map((inc, i) => (
                  <div key={inc.id || i} className={`opsIncidentCard${inc.resolved ? " resolved" : ""}`}>
                    <div className="opsIncidentHeader">
                      <span className="opsIncidentType">{INCIDENT_TYPES[inc.incident_type] || inc.incident_type}</span>
                      <PriorityBadge priority={inc.priority} />
                      {inc.resolved
                        ? <span className="opsResolvedTag">✓ Resuelta</span>
                        : <button type="button" className="opsResolveBtn" onClick={() => resolveIncident(inc.id)}>Marcar resuelta</button>
                      }
                    </div>
                    <div className="opsIncidentDesc">{inc.description}</div>
                    <div className="opsIncidentTime">{formatDate(inc.created_at)}</div>
                  </div>
                ))}
              </div>

              {!addingIncident ? (
                <button type="button" className="opsBtn opsBtnGhost opsAddBtn" onClick={() => setAddingIncident(true)}>
                  <TbPlus /> Registrar incidencia
                </button>
              ) : (
                <div className="opsAddForm">
                  <div className="opsField">
                    <label>Tipo de incidencia</label>
                    <select className="opsInput" value={newIncident.incident_type}
                      onChange={(e) => setNewIncident((p) => ({ ...p, incident_type: e.target.value }))}>
                      {Object.entries(INCIDENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="opsField">
                    <label>Prioridad</label>
                    <select className="opsInput" value={newIncident.priority}
                      onChange={(e) => setNewIncident((p) => ({ ...p, priority: e.target.value }))}>
                      {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="opsField">
                    <label>Descripción</label>
                    <textarea className="opsTextarea opsTextareaSm" value={newIncident.description}
                      placeholder="Descripción de la incidencia..."
                      onChange={(e) => setNewIncident((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="opsAddFormActions">
                    <button type="button" className="opsBtn opsBtnGhost" onClick={() => setAddingIncident(false)}>Cancelar</button>
                    <button type="button" className="opsBtn opsBtnDanger" onClick={saveIncident}>Registrar incidencia</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {operation.observations && (
          <div className="opsDrawerObs">
            <TbNotes /> <span>{operation.observations}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────
export default function OperationsModule({ currentWorker }) {
  const worker = currentWorker || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyOperation(worker));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      const resp = await apiFetch(`/api/operations?${params.toString()}`);
      setRows(resp?.data || []);
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudieron cargar las operaciones", "error");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter]);

  useEffect(() => { loadRows(); }, [loadRows]);

  function openCreate() {
    setModalMode("create"); setEditingId(null);
    setForm(emptyOperation(worker)); setModalOpen(true);
  }
  function openEdit(row) {
    setModalMode("edit"); setEditingId(row.id);
    setForm({ ...emptyOperation(worker), ...row,
      scheduled_at: toInputDT(row.scheduled_at),
      real_departure_at: toInputDT(row.real_departure_at),
      real_arrival_at: toInputDT(row.real_arrival_at),
    });
    setModalOpen(true);
  }
  function openDetail(row) { setSelectedOp(row); setDrawerOpen(true); }
  function closeModal() { setModalOpen(false); setEditingId(null); setForm(emptyOperation(worker)); }

  async function saveRow() {
    if (!String(form.title || "").trim()) {
      Swal.fire("Falta título", "Escribe un título para la operación.", "warning"); return;
    }
    const payload = { ...form, created_by: worker?.id || null };
    try {
      if (modalMode === "edit" && editingId) {
        await apiFetch(`/api/operations/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/operations`, { method: "POST", body: JSON.stringify(payload) });
      }
      closeModal(); await loadRows();
      Swal.fire("Guardado", modalMode === "edit" ? "Operación actualizada." : "Operación creada.", "success");
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo guardar la operación", "error");
    }
  }

  async function deleteRow(row) {
    const result = await Swal.fire({
      title: "¿Eliminar operación?",
      text: `Se eliminará "${row.title || "la operación seleccionada"}".`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar", reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await apiFetch(`/api/operations/${row.id}`, { method: "DELETE" });
      await loadRows();
      Swal.fire("Eliminada", "La operación fue eliminada.", "success");
    } catch (e) { Swal.fire("Error", e.message, "error"); }
  }

  const kpis = useMemo(() => ({
    total:      rows.length,
    programmed: rows.filter((r) => ["scheduled","preparing"].includes(r.status)).length,
    active:     rows.filter((r) => ["on_way","on_site","loading","unloading"].includes(r.status)).length,
    completed:  rows.filter((r) => r.status === "completed").length,
    incidents:  rows.filter((r) => r.status === "incident").length,
  }), [rows]);

  return (
    <div className="opsWrap">
      <div className="opsTopbar">
        <div>
          <h1 className="opsTitle"><TbTruck /> Operaciones</h1>
          <p className="opsSub">Gestión operativa de unidades, operadores, rutas e incidencias en campo</p>
        </div>
        <div className="opsTopActions">
          <button
  type="button"
  className={`opsRefreshIcon ${loading ? "is-spinning" : ""}`}
  onClick={loadRows}
  title="Recargar"
  aria-label="Recargar"
  disabled={loading}
>
  <TbRefresh />
</button>
          <button
  type="button"
  className="opsCreateIcon"
  onClick={openCreate}
  title="Nueva operación"
  aria-label="Nueva operación"
>
  <TbPlus />
</button>
        </div>
      </div>

      <div className="opsKpis">
        <div className="opsKpiCard"><div className="opsKpiLabel">Total</div><div className="opsKpiValue">{kpis.total}</div></div>
        <div className="opsKpiCard"><div className="opsKpiLabel">Programados</div><div className="opsKpiValue">{kpis.programmed}</div></div>
        <div className="opsKpiCard opsKpiCard--active"><div className="opsKpiLabel">En curso</div><div className="opsKpiValue">{kpis.active}</div></div>
        <div className="opsKpiCard opsKpiCard--ok"><div className="opsKpiLabel">Finalizados</div><div className="opsKpiValue">{kpis.completed}</div></div>
        <div className="opsKpiCard opsKpiCard--warn"><div className="opsKpiLabel">Incidencias</div><div className="opsKpiValue">{kpis.incidents}</div></div>
      </div>

      <div className="opsStatusTabs">
        {STATUS_FLOW.map((s) => (
          <button key={s} type="button"
            className={`opsStatusTab${statusFilter === s ? " active" : ""}`}
            style={statusFilter === s && s !== "all" ? { borderColor: STATUSES[s]?.color, color: STATUSES[s]?.color, background: STATUSES[s]?.bg } : {}}
            onClick={() => setStatusFilter(s)}>
            {s === "all" ? "Todos" : STATUSES[s]?.label}
          </button>
        ))}
      </div>

      <div className="opsFilters">
        <div className="opsSearch">
          <TbSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, cliente, unidad, operador..." />
        </div>
      </div>

      <div className="opsCard">
        <div className="opsTableWrap">
          <table className="opsTable">
            <thead>
              <tr>
                <th>Operación</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Unidad / Operador</th>
                <th>Cliente</th>
                <th>Ruta</th>
                <th>Programado</th>
                <th className="opsThRight">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="opsEmpty">Cargando operaciones...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="opsEmpty">No hay operaciones registradas.</td></tr>
              ) : rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="opsPrimaryCell">
                      <div className="opsPrimaryIcon"><TbTruck /></div>
                      <div>
                        <div className="opsPrimaryTitle">{row.title || "Sin título"}</div>
                        <div className="opsPrimarySub">{formatDate(row.created_at)}</div>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td><PriorityBadge priority={row.priority} /></td>
                  <td>
                    <div className="opsMetaStack">
                      {row.unit_name && <span><TbTruck /> {row.unit_name}</span>}
                      {row.operator_name && <span><TbUser /> {row.operator_name}</span>}
                      {!row.unit_name && !row.operator_name && (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </div>
                  </td>
                  <td>{row.client_name || "—"}</td>
                  <td>
                    {(row.origin || row.destination) ? (
                      <div className="opsRoute">
                        <span>{row.origin || "—"}</span>
                        <TbArrowRight className="opsRouteArrow" />
                        <span>{row.destination || "—"}</span>
                      </div>
                    ) : "—"}
                  </td>
                  <td>{formatDate(row.scheduled_at)}</td>
                  <td className="opsTdRight">
                    <div className="opsActions">
                      <button type="button" className="opsIconBtn" onClick={() => openDetail(row)} title="Ver detalle"><TbEye /></button>
                      <button type="button" className="opsIconBtn" onClick={() => openEdit(row)} title="Editar"><TbEdit /></button>
                      <button type="button" className="opsIconBtn opsIconBtnDanger" onClick={() => deleteRow(row)} title="Eliminar"><TbTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OperationFormModal
        open={modalOpen} mode={modalMode} form={form} setForm={setForm}
        onClose={closeModal} onSave={saveRow}
      />
      <OperationDetailDrawer
        open={drawerOpen} operation={selectedOp}
        onClose={() => setDrawerOpen(false)}
        currentWorker={worker} onRefresh={loadRows}
      />
    </div>
  );
}