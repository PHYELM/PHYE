import React, { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "../api";
import "./WeeklyReportsModule.css";
import {
  TbReportAnalytics, TbPlus, TbSearch, TbEdit, TbTrash, TbRefresh,
  TbCalendarEvent, TbCurrencyDollar, TbNotes, TbFileText, TbX,
  TbChevronDown, TbChevronUp, TbTruck, TbUsers, TbPackage,
  TbTarget, TbReceipt, TbUserSearch, TbAlertTriangle, TbClipboardList,
  TbBuilding,
} from "react-icons/tb";

// ─── Formatters ───────────────────────────────────────────────
function formatCurrency(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  }).format(date);
}

// ─── Row templates ────────────────────────────────────────────
const EMPTY_COLLECTION_ROW = () => ({ client_name: "", amount: 0, observations: "" });
const EMPTY_PROSPECT_ROW   = () => ({ prospect_name: "", follow_up_date: "", observations: "" });
const EMPTY_PORTFOLIO_ROW  = () => ({ client_name: "", amount: 0, observations: "" });
const EMPTY_VEHICLE_ROW    = () => ({ unit_name: "", km_initial: 0, km_final: 0, km_total: 0, fuel_amount: 0, performance: 0, maintenance_amount: 0, observations: "" });
const EMPTY_EXPENSE_ROW    = () => ({ concept: "", amount: 0, observations: "" });
const EMPTY_UNIT_ROW       = () => ({ unit_name: "", observations: "" });
const EMPTY_GOAL_ROW       = (concept = "") => ({ concept, objective: 0, real: 0, amount: 0, next_week_goal: 0, observations: "" });
const DEFAULT_GOALS        = ["Sanitarios", "Fosas", "Traila", "Lavamanos"].map(EMPTY_GOAL_ROW);
const EMPTY_SNAPSHOT       = () => ({ obra_service: 0, evento_service: 0, obra_patios: 0, evento_patios: 0, total_units: 0, observations: "" });

// ─── Form state ───────────────────────────────────────────────
function emptyWeeklyReport(worker) {
  return {
    week_label: "", branch_name: "", month_label: "", start_date: "", end_date: "",
    sales_2025: 0, budget_2026: 0, sales_2026: 0, weekly_billing: 0, sales_without_invoice: 0,
    total_sales: 0, total_collected: 0,
    collection_entries: [],
    weekly_goals: DEFAULT_GOALS.map((g) => ({ ...g })),
    prospecting_entries: [], portfolio_issues: [], vehicle_entries: [],
    extra_expenses: [], unit_reports: [],
    inventory_snapshot: EMPTY_SNAPSHOT(),
    summary: "", notes: "", report_observations: "", team_observations: "",
    created_by: worker?.id || null,
  };
}

function hydrateRow(row, worker) {
  return {
    ...emptyWeeklyReport(worker), ...row,
    total_sales: Number(row.total_sales || 0),
    total_collected: Number(row.total_collected || 0),
    sales_2025: Number(row.sales_2025 || 0),
    budget_2026: Number(row.budget_2026 || 0),
    sales_2026: Number(row.sales_2026 || 0),
    weekly_billing: Number(row.weekly_billing || 0),
    sales_without_invoice: Number(row.sales_without_invoice || 0),
    collection_entries:   Array.isArray(row.collection_entries)   ? row.collection_entries   : [],
    weekly_goals:         Array.isArray(row.weekly_goals) && row.weekly_goals.length > 0 ? row.weekly_goals : DEFAULT_GOALS.map((g) => ({ ...g })),
    prospecting_entries:  Array.isArray(row.prospecting_entries)  ? row.prospecting_entries  : [],
    portfolio_issues:     Array.isArray(row.portfolio_issues)     ? row.portfolio_issues      : [],
    vehicle_entries:      Array.isArray(row.vehicle_entries)      ? row.vehicle_entries       : [],
    extra_expenses:       Array.isArray(row.extra_expenses)       ? row.extra_expenses        : [],
    unit_reports:         Array.isArray(row.unit_reports)         ? row.unit_reports          : [],
    inventory_snapshot:   row.inventory_snapshot && typeof row.inventory_snapshot === "object" ? row.inventory_snapshot : EMPTY_SNAPSHOT(),
  };
}

// ─── Accordion Section ────────────────────────────────────────
function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="wrSection">
      <button type="button" className="wrSectionHeader" onClick={() => setOpen((o) => !o)}>
        <span className="wrSectionIcon">{icon}</span>
        <span className="wrSectionTitle">{title}</span>
        <span className="wrSectionChevron">{open ? <TbChevronUp /> : <TbChevronDown />}</span>
      </button>
      {open && <div className="wrSectionBody">{children}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function WeeklyReportModal({ open, mode, form, setForm, onClose, onSave }) {
  if (!open) return null;
  const ro = mode === "view";

  function addRow(field, template) {
    setForm((p) => ({ ...p, [field]: [...(p[field] || []), template()] }));
  }
  function updRow(field, i, key, val) {
    setForm((p) => {
      const arr = [...(p[field] || [])];
      arr[i] = { ...arr[i], [key]: val };
      return { ...p, [field]: arr };
    });
  }
  function delRow(field, i) {
    setForm((p) => {
      const arr = [...(p[field] || [])];
      arr.splice(i, 1);
      return { ...p, [field]: arr };
    });
  }
  function updSnap(key, val) {
    setForm((p) => ({ ...p, inventory_snapshot: { ...(p.inventory_snapshot || EMPTY_SNAPSHOT()), [key]: val } }));
  }

  const snap = form.inventory_snapshot || EMPTY_SNAPSHOT();
  const totalCobranza    = (form.collection_entries || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalGastos      = (form.extra_expenses     || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalCombustible = (form.vehicle_entries    || []).reduce((s, r) => s + Number(r.fuel_amount || 0), 0);
  const totalMtto        = (form.vehicle_entries    || []).reduce((s, r) => s + Number(r.maintenance_amount || 0), 0);
  const totalInv         = Number(snap.obra_service || 0) + Number(snap.evento_service || 0) + Number(snap.obra_patios || 0) + Number(snap.evento_patios || 0);
  const pctAlcance       = Number(form.budget_2026) > 0 ? ((Number(form.sales_2026 || 0) / Number(form.budget_2026)) * 100).toFixed(1) : null;

  const inp = (label, key, type = "text", placeholder = "") => (
    <div className="wrField">
      <label>{label}</label>
      <input className="wrInput" type={type} step={type === "number" ? "0.01" : undefined}
        value={form[key] ?? ""} readOnly={ro} placeholder={placeholder}
        onChange={(e) => !ro && setForm((p) => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  const ta = (label, key, placeholder = "") => (
    <div className="wrField wrField--span2">
      <label>{label}</label>
      <textarea className="wrTextarea" value={form[key] ?? ""} readOnly={ro} placeholder={placeholder}
        onChange={(e) => !ro && setForm((p) => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="wrModalBack" onMouseDown={onClose}>
      <div className="wrModal wrModalLarge" onMouseDown={(e) => e.stopPropagation()}>

        <div className="wrModalTop">
          <div className="wrModalTitle">
            {mode === "create" && "Nueva bitácora semanal"}
            {mode === "edit"   && "Editar bitácora semanal"}
            {mode === "view"   && "Detalle de bitácora semanal"}
          </div>
          <button type="button" className="wrIconBtn" onClick={onClose} aria-label="Cerrar"><TbX /></button>
        </div>

        <div className="wrModalBody">

          {/* 1. ENCABEZADO */}
          <Section title="Encabezado" icon={<TbFileText />}>
            <div className="wrFormGrid">
              {inp("Etiqueta de semana", "week_label", "text", "Ej. Del 19 al 24 Enero 2026")}
              {inp("Sucursal", "branch_name", "text", "Ej. Culiacán")}
              {inp("Mes", "month_label", "text", "Ej. Enero 2026")}
              {inp("Fecha inicial", "start_date", "date")}
              {inp("Fecha final", "end_date", "date")}
            </div>
          </Section>

          {/* 2. VENTAS */}
          <Section title="Ventas" icon={<TbCurrencyDollar />}>
            <div className="wrFormGrid">
              {inp("Venta 2025", "sales_2025", "number", "0.00")}
              {inp("Presupuesto 2026", "budget_2026", "number", "0.00")}
              {inp("Venta 2026 (acumulado)", "sales_2026", "number", "0.00")}
              {inp("Facturación semanal", "weekly_billing", "number", "0.00")}
              {inp("Venta S/F (sin factura)", "sales_without_invoice", "number", "0.00")}
            </div>
            {pctAlcance !== null && (
              <div className="wrKpiInline">
                <span>% Alcance presupuesto:</span>
                <strong className={Number(pctAlcance) >= 100 ? "wrKpiGreen" : Number(pctAlcance) >= 80 ? "wrKpiYellow" : "wrKpiRed"}>
                  {pctAlcance}%
                </strong>
              </div>
            )}
          </Section>

          {/* 3. COBRANZA */}
          <Section title={`Cobranza${totalCobranza > 0 ? " — " + formatCurrency(totalCobranza) : ""}`} icon={<TbReceipt />}>
            <div className="wrDynTable">
              <table>
                <thead><tr>
                  <th>Cliente</th><th>Monto</th><th>Observaciones</th>
                  {!ro && <th style={{ width: 40 }}></th>}
                </tr></thead>
                <tbody>
                  {(form.collection_entries || []).map((row, i) => (
                    <tr key={i}>
                      <td><input className="wrInput wrInputSm" value={row.client_name} readOnly={ro} placeholder="Nombre del cliente" onChange={(e) => updRow("collection_entries", i, "client_name", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" type="number" step="0.01" value={row.amount} readOnly={ro} onChange={(e) => updRow("collection_entries", i, "amount", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" value={row.observations} readOnly={ro} onChange={(e) => updRow("collection_entries", i, "observations", e.target.value)} /></td>
                      {!ro && <td><button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => delRow("collection_entries", i)}><TbTrash /></button></td>}
                    </tr>
                  ))}
                  {(form.collection_entries || []).length === 0 && (
                    <tr><td colSpan={ro ? 3 : 4} className="wrDynEmpty">{ro ? "Sin registros." : "Agrega clientes cobrados esta semana."}</td></tr>
                  )}
                </tbody>
              </table>
              {!ro && <button type="button" className="wrBtn wrBtnGhost wrBtnSm" onClick={() => addRow("collection_entries", EMPTY_COLLECTION_ROW)}><TbPlus /> Agregar cliente</button>}
              {totalCobranza > 0 && <div className="wrTableTotal">Total cobrado / depositado: <strong>{formatCurrency(totalCobranza)}</strong></div>}
            </div>
          </Section>

          {/* 4. META SEMANAL */}
          <Section title="Meta Semanal" icon={<TbTarget />} defaultOpen={false}>
            <div className="wrDynTable wrDynTableWide">
              <table>
                <thead><tr>
                  <th>Concepto</th><th>Objetivo</th><th>Real</th><th>%</th>
                  <th>$ Venta</th><th>Meta próx. sem.</th><th>Observaciones</th>
                  {!ro && <th style={{ width: 40 }}></th>}
                </tr></thead>
                <tbody>
                  {(form.weekly_goals || []).map((row, i) => {
                    const pct = Number(row.objective) > 0 ? ((Number(row.real) / Number(row.objective)) * 100).toFixed(1) + "%" : "—";
                    return (
                      <tr key={i}>
                        <td><input className="wrInput wrInputSm" value={row.concept} readOnly={ro} onChange={(e) => updRow("weekly_goals", i, "concept", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" type="number" value={row.objective} readOnly={ro} onChange={(e) => updRow("weekly_goals", i, "objective", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" type="number" value={row.real} readOnly={ro} onChange={(e) => updRow("weekly_goals", i, "real", e.target.value)} /></td>
                        <td className="wrTdMuted">{pct}</td>
                        <td><input className="wrInput wrInputSm" type="number" step="0.01" value={row.amount} readOnly={ro} onChange={(e) => updRow("weekly_goals", i, "amount", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" type="number" value={row.next_week_goal} readOnly={ro} onChange={(e) => updRow("weekly_goals", i, "next_week_goal", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" value={row.observations} readOnly={ro} onChange={(e) => updRow("weekly_goals", i, "observations", e.target.value)} /></td>
                        {!ro && <td><button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => delRow("weekly_goals", i)}><TbTrash /></button></td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!ro && <button type="button" className="wrBtn wrBtnGhost wrBtnSm" onClick={() => addRow("weekly_goals", () => EMPTY_GOAL_ROW())}><TbPlus /> Agregar concepto</button>}
            </div>
          </Section>

          {/* 5. PROSPECTOS */}
          <Section title="Prospectos" icon={<TbUserSearch />} defaultOpen={false}>
            <div className="wrDynTable">
              <table>
                <thead><tr>
                  <th>Prospecto</th><th>Fecha seguimiento</th><th>Observaciones</th>
                  {!ro && <th style={{ width: 40 }}></th>}
                </tr></thead>
                <tbody>
                  {(form.prospecting_entries || []).map((row, i) => (
                    <tr key={i}>
                      <td><input className="wrInput wrInputSm" value={row.prospect_name} readOnly={ro} placeholder="Nombre del prospecto" onChange={(e) => updRow("prospecting_entries", i, "prospect_name", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" type="date" value={row.follow_up_date || ""} readOnly={ro} onChange={(e) => updRow("prospecting_entries", i, "follow_up_date", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" value={row.observations} readOnly={ro} onChange={(e) => updRow("prospecting_entries", i, "observations", e.target.value)} /></td>
                      {!ro && <td><button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => delRow("prospecting_entries", i)}><TbTrash /></button></td>}
                    </tr>
                  ))}
                  {(form.prospecting_entries || []).length === 0 && (
                    <tr><td colSpan={ro ? 3 : 4} className="wrDynEmpty">{ro ? "Sin prospectos registrados." : "Agrega prospectos en seguimiento."}</td></tr>
                  )}
                </tbody>
              </table>
              {!ro && <button type="button" className="wrBtn wrBtnGhost wrBtnSm" onClick={() => addRow("prospecting_entries", EMPTY_PROSPECT_ROW)}><TbPlus /> Agregar prospecto</button>}
            </div>
          </Section>

          {/* 6. CARTERA / POSTVENTA */}
          <Section title="Cartera / Reporte Postventa" icon={<TbAlertTriangle />} defaultOpen={false}>
            <div className="wrDynTable">
              <table>
                <thead><tr>
                  <th>Cliente</th><th>Monto en cartera</th><th>Observaciones</th>
                  {!ro && <th style={{ width: 40 }}></th>}
                </tr></thead>
                <tbody>
                  {(form.portfolio_issues || []).map((row, i) => (
                    <tr key={i}>
                      <td><input className="wrInput wrInputSm" value={row.client_name} readOnly={ro} placeholder="Nombre del cliente" onChange={(e) => updRow("portfolio_issues", i, "client_name", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" type="number" step="0.01" value={row.amount} readOnly={ro} onChange={(e) => updRow("portfolio_issues", i, "amount", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" value={row.observations} readOnly={ro} onChange={(e) => updRow("portfolio_issues", i, "observations", e.target.value)} /></td>
                      {!ro && <td><button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => delRow("portfolio_issues", i)}><TbTrash /></button></td>}
                    </tr>
                  ))}
                  {(form.portfolio_issues || []).length === 0 && (
                    <tr><td colSpan={ro ? 3 : 4} className="wrDynEmpty">{ro ? "Sin problemas de cartera." : "Agrega clientes con saldo pendiente o problemas de cobro."}</td></tr>
                  )}
                </tbody>
              </table>
              {!ro && <button type="button" className="wrBtn wrBtnGhost wrBtnSm" onClick={() => addRow("portfolio_issues", EMPTY_PORTFOLIO_ROW)}><TbPlus /> Agregar cliente en cartera</button>}
              {(form.portfolio_issues || []).length > 0 && (
                <div className="wrTableTotal">Total cartera: <strong>{formatCurrency((form.portfolio_issues || []).reduce((s, r) => s + Number(r.amount || 0), 0))}</strong></div>
              )}
            </div>
          </Section>

          {/* 7. INVENTARIOS */}
          <Section title={`Inventarios${totalInv > 0 ? " — " + totalInv + " unidades" : ""}`} icon={<TbPackage />} defaultOpen={false}>
            <div className="wrFormGrid">
              <div className="wrField"><label>Campo / Obra — Servicio</label><input className="wrInput" type="number" value={snap.obra_service || 0} readOnly={ro} onChange={(e) => updSnap("obra_service", e.target.value)} /></div>
              <div className="wrField"><label>Evento — Servicio</label><input className="wrInput" type="number" value={snap.evento_service || 0} readOnly={ro} onChange={(e) => updSnap("evento_service", e.target.value)} /></div>
              <div className="wrField"><label>Obra — Patios</label><input className="wrInput" type="number" value={snap.obra_patios || 0} readOnly={ro} onChange={(e) => updSnap("obra_patios", e.target.value)} /></div>
              <div className="wrField"><label>Evento — Patios</label><input className="wrInput" type="number" value={snap.evento_patios || 0} readOnly={ro} onChange={(e) => updSnap("evento_patios", e.target.value)} /></div>
              <div className="wrField"><label>Total unidades (manual)</label><input className="wrInput" type="number" value={snap.total_units || 0} readOnly={ro} onChange={(e) => updSnap("total_units", e.target.value)} /></div>
              <div className="wrField wrField--span2"><label>Observaciones de inventario</label><textarea className="wrTextarea" value={snap.observations || ""} readOnly={ro} onChange={(e) => updSnap("observations", e.target.value)} /></div>
            </div>
            <div className="wrKpiInline"><span>Total calculado (suma):</span><strong>{totalInv} unidades</strong></div>
          </Section>

          {/* 8. VEHÍCULOS */}
          <Section title={`Vehículos${totalCombustible > 0 ? " — Combustible: " + formatCurrency(totalCombustible) : ""}`} icon={<TbTruck />} defaultOpen={false}>
            <div className="wrDynTable wrDynTableWide">
              <table>
                <thead><tr>
                  <th>Unidad</th><th>Km inicial</th><th>Km final</th><th>Km total</th>
                  <th>Combustible $</th><th>Rendimiento</th><th>Mtto $</th><th>Observaciones</th>
                  {!ro && <th style={{ width: 40 }}></th>}
                </tr></thead>
                <tbody>
                  {(form.vehicle_entries || []).map((row, i) => {
                    const kmDiff = Number(row.km_final || 0) - Number(row.km_initial || 0);
                    return (
                      <tr key={i}>
                        <td><input className="wrInput wrInputSm" value={row.unit_name} readOnly={ro} placeholder="Ej. Unidad 84" onChange={(e) => updRow("vehicle_entries", i, "unit_name", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" type="number" value={row.km_initial} readOnly={ro} onChange={(e) => updRow("vehicle_entries", i, "km_initial", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" type="number" value={row.km_final} readOnly={ro} onChange={(e) => updRow("vehicle_entries", i, "km_final", e.target.value)} /></td>
                        <td className="wrTdMuted">{kmDiff > 0 ? kmDiff : "—"}</td>
                        <td><input className="wrInput wrInputSm" type="number" step="0.01" value={row.fuel_amount} readOnly={ro} onChange={(e) => updRow("vehicle_entries", i, "fuel_amount", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" type="number" step="0.01" value={row.performance} readOnly={ro} onChange={(e) => updRow("vehicle_entries", i, "performance", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" type="number" step="0.01" value={row.maintenance_amount} readOnly={ro} onChange={(e) => updRow("vehicle_entries", i, "maintenance_amount", e.target.value)} /></td>
                        <td><input className="wrInput wrInputSm" value={row.observations} readOnly={ro} onChange={(e) => updRow("vehicle_entries", i, "observations", e.target.value)} /></td>
                        {!ro && <td><button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => delRow("vehicle_entries", i)}><TbTrash /></button></td>}
                      </tr>
                    );
                  })}
                  {(form.vehicle_entries || []).length === 0 && (
                    <tr><td colSpan={ro ? 8 : 9} className="wrDynEmpty">{ro ? "Sin vehículos registrados." : "Agrega las unidades de la flota."}</td></tr>
                  )}
                </tbody>
              </table>
              {!ro && <button type="button" className="wrBtn wrBtnGhost wrBtnSm" onClick={() => addRow("vehicle_entries", EMPTY_VEHICLE_ROW)}><TbPlus /> Agregar unidad</button>}
              {(totalCombustible > 0 || totalMtto > 0) && (
                <div className="wrTableTotalsRow">
                  {totalCombustible > 0 && <span>Combustible total: <strong>{formatCurrency(totalCombustible)}</strong></span>}
                  {totalMtto > 0 && <span>Mantenimiento total: <strong>{formatCurrency(totalMtto)}</strong></span>}
                </div>
              )}
            </div>
          </Section>

          {/* 9. GASTOS EXTRAS */}
          <Section title={`Gastos Extras${totalGastos > 0 ? " — " + formatCurrency(totalGastos) : ""}`} icon={<TbReceipt />} defaultOpen={false}>
            <div className="wrDynTable">
              <table>
                <thead><tr>
                  <th>Concepto</th><th>Monto</th><th>Observaciones</th>
                  {!ro && <th style={{ width: 40 }}></th>}
                </tr></thead>
                <tbody>
                  {(form.extra_expenses || []).map((row, i) => (
                    <tr key={i}>
                      <td><input className="wrInput wrInputSm" value={row.concept} readOnly={ro} placeholder="Concepto del gasto" onChange={(e) => updRow("extra_expenses", i, "concept", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" type="number" step="0.01" value={row.amount} readOnly={ro} onChange={(e) => updRow("extra_expenses", i, "amount", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" value={row.observations} readOnly={ro} onChange={(e) => updRow("extra_expenses", i, "observations", e.target.value)} /></td>
                      {!ro && <td><button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => delRow("extra_expenses", i)}><TbTrash /></button></td>}
                    </tr>
                  ))}
                  {(form.extra_expenses || []).length === 0 && (
                    <tr><td colSpan={ro ? 3 : 4} className="wrDynEmpty">{ro ? "Sin gastos extras registrados." : "Agrega gastos extraordinarios de la semana."}</td></tr>
                  )}
                </tbody>
              </table>
              {!ro && <button type="button" className="wrBtn wrBtnGhost wrBtnSm" onClick={() => addRow("extra_expenses", EMPTY_EXPENSE_ROW)}><TbPlus /> Agregar gasto</button>}
              {totalGastos > 0 && <div className="wrTableTotal">Total gastos extras: <strong>{formatCurrency(totalGastos)}</strong></div>}
            </div>
          </Section>

          {/* 10. REPORTE DE UNIDADES */}
          <Section title="Reporte de Unidades" icon={<TbClipboardList />} defaultOpen={false}>
            <div className="wrDynTable">
              <table>
                <thead><tr>
                  <th>Unidad</th><th>Estado / Observaciones</th>
                  {!ro && <th style={{ width: 40 }}></th>}
                </tr></thead>
                <tbody>
                  {(form.unit_reports || []).map((row, i) => (
                    <tr key={i}>
                      <td><input className="wrInput wrInputSm" value={row.unit_name} readOnly={ro} placeholder="Ej. Unidad 86" onChange={(e) => updRow("unit_reports", i, "unit_name", e.target.value)} /></td>
                      <td><input className="wrInput wrInputSm" value={row.observations} readOnly={ro} placeholder="Ej. En reparación" onChange={(e) => updRow("unit_reports", i, "observations", e.target.value)} /></td>
                      {!ro && <td><button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => delRow("unit_reports", i)}><TbTrash /></button></td>}
                    </tr>
                  ))}
                  {(form.unit_reports || []).length === 0 && (
                    <tr><td colSpan={ro ? 2 : 3} className="wrDynEmpty">{ro ? "Sin unidades reportadas." : "Reporta unidades fuera de servicio o con incidencias."}</td></tr>
                  )}
                </tbody>
              </table>
              {!ro && <button type="button" className="wrBtn wrBtnGhost wrBtnSm" onClick={() => addRow("unit_reports", EMPTY_UNIT_ROW)}><TbPlus /> Agregar unidad</button>}
            </div>
          </Section>

          {/* 11. COLABORADORES Y OBSERVACIONES */}
          <Section title="Colaboradores y Observaciones" icon={<TbUsers />} defaultOpen={false}>
            <div className="wrFormGrid">
              {ta("Observaciones del equipo / colaboradores", "team_observations", "Comentarios sobre el equipo, incidencias, reconocimientos...")}
              {ta("Observaciones del reporte", "report_observations", "Notas internas del reporte, situaciones importantes...")}
              {ta("Resumen general de la semana", "summary", "Resumen ejecutivo: logros, pendientes, contexto general...")}
              {ta("Notas adicionales", "notes", "Pendientes, incidencias, comentarios finales...")}
            </div>
          </Section>

        </div>

        <div className="wrModalActions">
          <button type="button" className="wrBtn wrBtnGhost" onClick={onClose}>Cerrar</button>
          {!ro && <button type="button" className="wrBtn wrBtnPrimary" onClick={onSave}>Guardar reporte</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Main module ──────────────────────────────────────────────
export default function WeeklyReportsModule({ currentWorker }) {
  const worker = currentWorker || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyWeeklyReport(worker));

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const resp = await apiFetch(`/api/weekly-reports?${params.toString()}`);
      setRows(resp?.data || []);
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudieron cargar las bitácoras semanales", "error");
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { loadRows(); }, [loadRows]);

  function openCreate() {
    setModalMode("create"); setEditingId(null);
    setForm(emptyWeeklyReport(worker)); setModalOpen(true);
  }
  function openView(row) {
    setModalMode("view"); setEditingId(row.id);
    setForm(hydrateRow(row, worker)); setModalOpen(true);
  }
  function openEdit(row) {
    setModalMode("edit"); setEditingId(row.id);
    setForm(hydrateRow(row, worker)); setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false); setEditingId(null);
    setForm(emptyWeeklyReport(worker));
  }

  async function saveRow() {
    if (!String(form.week_label || "").trim()) {
      Swal.fire("Falta semana", "Escribe la etiqueta de la semana.", "warning");
      return;
    }
    const computedCollected = (form.collection_entries || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    const computedSales = Number(form.sales_2026 || 0) + Number(form.weekly_billing || 0) + Number(form.sales_without_invoice || 0);
    const payload = {
      ...form,
      created_by: worker?.id || null,
      sales_2025: Number(form.sales_2025 || 0),
      budget_2026: Number(form.budget_2026 || 0),
      sales_2026: Number(form.sales_2026 || 0),
      weekly_billing: Number(form.weekly_billing || 0),
      sales_without_invoice: Number(form.sales_without_invoice || 0),
      total_sales: Number(form.total_sales || 0) !== 0 ? Number(form.total_sales) : computedSales,
      total_collected: Number(form.total_collected || 0) !== 0 ? Number(form.total_collected) : computedCollected,
    };
    try {
      if (modalMode === "edit" && editingId) {
        await apiFetch(`/api/weekly-reports/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch(`/api/weekly-reports`, { method: "POST", body: JSON.stringify(payload) });
      }
      closeModal(); await loadRows();
      Swal.fire("Guardado", modalMode === "edit" ? "Bitácora actualizada correctamente." : "Bitácora creada correctamente.", "success");
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo guardar la bitácora semanal", "error");
    }
  }

  async function deleteRow(row) {
    const result = await Swal.fire({
      title: "¿Eliminar bitácora semanal?",
      text: `Se eliminará el reporte "${row.week_label || "seleccionado"}".`,
      icon: "warning", showCancelButton: true,
      confirmButtonText: "Sí, eliminar", cancelButtonText: "Cancelar", reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await apiFetch(`/api/weekly-reports/${row.id}`, { method: "DELETE" });
      await loadRows();
      Swal.fire("Eliminada", "La bitácora semanal fue eliminada correctamente.", "success");
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo eliminar la bitácora semanal", "error");
    }
  }

  const kpis = useMemo(() => {
    const totalReports   = rows.length;
    const totalSales     = rows.reduce((acc, r) => acc + Number(r.total_sales || 0), 0);
    const totalCollected = rows.reduce((acc, r) => acc + Number(r.total_collected || 0), 0);
    return { totalReports, totalSales, totalCollected, pending: totalSales - totalCollected };
  }, [rows]);

  return (
    <div className="wrWrap">
      <div className="wrTopbar">
        <div>
          <h1 className="wrTitle"><TbReportAnalytics /> Bitácora Semanal</h1>
          <p className="wrSub">Seguimiento semanal de ventas, cobranza, metas, flota, inventarios y observaciones operativas</p>
        </div>
        <div className="wrTopActions">
          <button type="button" className="wrBtn wrBtnGhost" onClick={loadRows}><TbRefresh /> Recargar</button>
          <button type="button" className="wrBtn wrBtnPrimary" onClick={openCreate}><TbPlus /> Nueva bitácora</button>
        </div>
      </div>

      <div className="wrKpis">
        <div className="wrKpiCard"><div className="wrKpiLabel">Reportes</div><div className="wrKpiValue">{kpis.totalReports}</div></div>
        <div className="wrKpiCard"><div className="wrKpiLabel">Ventas</div><div className="wrKpiValue">{formatCurrency(kpis.totalSales)}</div></div>
        <div className="wrKpiCard"><div className="wrKpiLabel">Cobrado</div><div className="wrKpiValue">{formatCurrency(kpis.totalCollected)}</div></div>
        <div className="wrKpiCard"><div className="wrKpiLabel">Pendiente</div><div className="wrKpiValue">{formatCurrency(kpis.pending)}</div></div>
      </div>

      <div className="wrFilters">
        <div className="wrSearch">
          <TbSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por semana, sucursal, resumen o notas..." />
        </div>
      </div>

      <div className="wrCard">
        <div className="wrTableWrap">
          <table className="wrTable">
            <thead>
              <tr>
                <th>Semana</th><th>Sucursal</th><th>Periodo</th>
                <th>Ventas</th><th>Cobrado</th><th>Pendiente</th>
                <th>Resumen</th><th className="wrThRight">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="wrEmpty">Cargando bitácoras semanales...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="wrEmpty">No hay bitácoras semanales registradas.</td></tr>
              ) : (
                rows.map((row) => {
                  const pending = Number(row.total_sales || 0) - Number(row.total_collected || 0);
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="wrPrimaryCell">
                          <div className="wrPrimaryIcon"><TbFileText /></div>
                          <div>
                            <div className="wrPrimaryTitle">{row.week_label || "Sin etiqueta"}</div>
                            <div className="wrPrimarySub">{formatDate(row.created_at)}</div>
                          </div>
                        </div>
                      </td>
                      <td><div className="wrInlineMeta"><TbBuilding /><span>{row.branch_name || "—"}</span></div></td>
                      <td><div className="wrInlineMeta"><TbCalendarEvent /><span>{formatDate(row.start_date)} — {formatDate(row.end_date)}</span></div></td>
                      <td><div className="wrMoneyCell"><TbCurrencyDollar /><span>{formatCurrency(row.total_sales)}</span></div></td>
                      <td><div className="wrMoneyCell wrMoneyCell--ok"><TbCurrencyDollar /><span>{formatCurrency(row.total_collected)}</span></div></td>
                      <td><div className="wrMoneyCell wrMoneyCell--warn"><TbCurrencyDollar /><span>{formatCurrency(pending)}</span></div></td>
                      <td><div className="wrSummaryCell"><TbNotes /><span>{row.summary || "—"}</span></div></td>
                      <td className="wrTdRight">
                        <div className="wrActions">
                          <button type="button" className="wrIconBtn" onClick={() => openView(row)} title="Ver"><TbFileText /></button>
                          <button type="button" className="wrIconBtn" onClick={() => openEdit(row)} title="Editar"><TbEdit /></button>
                          <button type="button" className="wrIconBtn wrIconBtnDanger" onClick={() => deleteRow(row)} title="Eliminar"><TbTrash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <WeeklyReportModal open={modalOpen} mode={modalMode} form={form} setForm={setForm} onClose={closeModal} onSave={saveRow} />
    </div>
  );
}