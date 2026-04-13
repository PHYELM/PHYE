import React, { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "../api";
import ClientSelectPro from "../components/ClientSelectPro";
import "./InvoicesModule.css";
import {
  TbReceipt2,
  TbPlus,
  TbSearch,
  TbEdit,
  TbTrash,
  TbRefresh,
  TbFileInvoice,
  TbCalendarEvent,
  TbMapPin,
  TbUser,
  TbCurrencyDollar,
  TbFileDescription,
  TbRouteSquare,
  TbX,
} from "react-icons/tb";

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Borrador" },
  { value: "pending", label: "Pendiente" },
  { value: "issued", label: "Emitida" },
  { value: "paid", label: "Pagada" },
  { value: "cancelled", label: "Cancelada" },
];

const STATUS_STYLES = {
  draft: {
    label: "Borrador",
    bg: "#f8fafc",
    color: "#475569",
    border: "#cbd5e1",
    dot: "#94a3b8",
  },
  pending: {
    label: "Pendiente",
    bg: "#fff7ed",
    color: "#c2410c",
    border: "#fdba74",
    dot: "#f97316",
  },
  issued: {
    label: "Emitida",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#93c5fd",
    dot: "#3b82f6",
  },
  paid: {
    label: "Pagada",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#6ee7b7",
    dot: "#10b981",
  },
  cancelled: {
    label: "Cancelada",
    bg: "#f8fafc",
    color: "#64748b",
    border: "#cbd5e1",
    dot: "#94a3b8",
  },
};

function formatCurrency(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getStatusStyle(status) {
  return STATUS_STYLES[status] || STATUS_STYLES.draft;
}

function emptyInvoice(worker) {
  return {
    folio: "",
    client_id: "",
    client_name: "", // solo visual
    quote_id: "",
    service_sheet_id: "",
    delivery_date: "",
    billing_period: "",
    service_location: "",
    subtotal: 0,
    tax: 0,
    total: 0,
    status: "draft",
    notes: "",
    created_by: worker?.id || null,
  };
}

function InvoiceModal({
  open,
  mode,
  form,
  setForm,
  onClose,
  onSave,
  selectedClient,
  setSelectedClient,
  serviceSheets,
  selectedServiceSheet,
  setSelectedServiceSheet,
}) {
  if (!open) return null;

  const readOnly = mode === "view";

  return (
    <div className="invModalBack" onMouseDown={onClose}>
      <div
        className="invModal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="invModalTop">
          <div className="invModalTitle">
            {mode === "create" && "Nueva factura"}
            {mode === "edit" && "Editar factura"}
            {mode === "view" && "Detalle de factura"}
          </div>

          <button
            type="button"
            className="invIconBtn"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <TbX />
          </button>
        </div>

        <div className="invModalBody">
          <div className="invFormGrid">
            <div className="invField">
              <label>Folio</label>
              <input
                className="invInput"
                value={form.folio}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, folio: e.target.value }))
                }
                placeholder="Ej. FAC-2026-001"
              />
            </div>

            <div className="invField">
              <label>Cliente</label>
              {readOnly ? (
                <input
                  className="invInput"
                  value={form.client_name || ""}
                  readOnly
                  placeholder="Nombre del cliente"
                />
              ) : (
                <ClientSelectPro
                  value={form.client_id}
                  selectedClient={selectedClient}
                  onSelect={(client) => {
                    if (!client) {
                      setSelectedClient(null);
                      setSelectedServiceSheet(null);
                      setForm((prev) => ({
                        ...prev,
                        client_id: "",
                        client_name: "",
                        service_sheet_id: "",
                      }));
                      return;
                    }

                    setSelectedClient(client);
                    setForm((prev) => ({
                      ...prev,
                      client_id: client.id,
                      client_name: client.name || "",
                    }));
                  }}
                  placeholder="Buscar cliente por nombre..."
                />
              )}
            </div>

            <div className="invField">
              <label>Hoja de servicio</label>

              {form.service_sheet_id && (
                <div className="invLinkedBadge">
                  Factura generada desde hoja de servicio
                </div>
              )}

              {readOnly ? (
                <input
                  className="invInput"
                  value={
                    selectedServiceSheet
                      ? `${selectedServiceSheet.client_name || "Servicio"} · ${selectedServiceSheet.service_type || "Sin tipo"}`
                      : ""
                  }
                  readOnly
                  placeholder="Hoja de servicio"
                />
              ) : (
                <select
                  className="invInput"
                  value={form.service_sheet_id || ""}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    const sheet =
                      serviceSheets.find((item) => item.id === nextId) || null;

                    if (!sheet) {
                      setSelectedServiceSheet(null);
                      setForm((prev) => ({
                        ...prev,
                        service_sheet_id: "",
                      }));
                      return;
                    }

                    setSelectedServiceSheet(sheet);
                    setSelectedClient(
                      sheet.client_id
                        ? {
                            id: sheet.client_id,
                            name: sheet.client_name || "",
                          }
                        : null
                    );

                    setForm((prev) => {
                      const base = Number(sheet.total_price || 0);
                      const autoTax = Number((base * 0.16).toFixed(2));
                      const autoTotal = Number((base + autoTax).toFixed(2));

                      return {
                        ...prev,
                        service_sheet_id: sheet.id,
                        client_id: sheet.client_id || prev.client_id || "",
                        client_name: sheet.client_name || prev.client_name || "",
                        delivery_date: sheet.delivery_date || prev.delivery_date || "",
                        service_location: sheet.location || prev.service_location || "",
                        subtotal: base,
                        tax: autoTax,
                        total: autoTotal,
                      };
                    });
                  }}
                >
                  <option value="">Seleccionar hoja de servicio</option>
                  {serviceSheets
                    .filter((sheet) => {
                      if (!form.client_id) return true;
                      return sheet.client_id === form.client_id;
                    })
                    .map((sheet) => (
                      <option key={sheet.id} value={sheet.id}>
                        {(sheet.client_name || "Sin cliente") +
                          " · " +
                          (sheet.service_type || "Sin tipo") +
                          " · " +
                          (sheet.location || "Sin ubicación")}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="invField">
              <label>Fecha de entrega</label>
              <input
                className="invInput"
                type="date"
                value={form.delivery_date || ""}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, delivery_date: e.target.value }))
                }
              />
            </div>

            <div className="invField">
              <label>Periodo de facturación</label>
              <input
                className="invInput"
                value={form.billing_period}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, billing_period: e.target.value }))
                }
                placeholder="Ej. Semanal / Mensual / 19 al 24 Ene"
              />
            </div>

            <div className="invField">
              <label>Ubicación del servicio</label>
              <input
                className="invInput"
                value={form.service_location}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, service_location: e.target.value }))
                }
                placeholder="Ubicación o ruta"
              />
            </div>

            <div className="invField">
              <label>Estado</label>
              <select
                className="invInput"
                value={form.status}
                disabled={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                {STATUS_OPTIONS.filter((x) => x.value !== "all").map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="invField">
              <label>Subtotal</label>
              <input
                className="invInput"
                type="number"
                step="0.01"
                value={form.subtotal}
                readOnly={readOnly || !!form.service_sheet_id}
                onChange={(e) =>
                  setForm((prev) => {
                    const nextSubtotal = Number(e.target.value || 0);
                    const nextTax = Number(prev.tax || 0);

                    return {
                      ...prev,
                      subtotal: e.target.value,
                      total: Number((nextSubtotal + nextTax).toFixed(2)),
                    };
                  })
                }
                placeholder="0.00"
              />
            </div>

            <div className="invField">
              <label>Impuesto</label>
              <input
                className="invInput"
                type="number"
                step="0.01"
                value={form.tax}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => {
                    const nextTax = Number(e.target.value || 0);
                    const nextSubtotal = Number(prev.subtotal || 0);

                    return {
                      ...prev,
                      tax: e.target.value,
                      total: Number((nextSubtotal + nextTax).toFixed(2)),
                    };
                  })
                }
                placeholder="0.00"
              />
            </div>

            <div className="invField">
              <label>Total</label>
              <input
                className="invInput"
                type="number"
                step="0.01"
                value={form.total}
                readOnly
                placeholder="0.00"
              />
            </div>

            <div className="invField invField--span2">
              <label>Notas</label>
              <textarea
                className="invTextarea"
                value={form.notes}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Observaciones, condiciones, comentarios..."
              />
            </div>
          </div>
        </div>

        <div className="invModalActions">
          <button type="button" className="invBtn invBtnGhost" onClick={onClose}>
            Cerrar
          </button>

          {!readOnly && (
            <button type="button" className="invBtn invBtnPrimary" onClick={onSave}>
              Guardar factura
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoicesModule({ currentWorker }) {
  const worker = currentWorker || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyInvoice(worker));
  const [selectedClient, setSelectedClient] = useState(null);
  const [serviceSheets, setServiceSheets] = useState([]);
  const [selectedServiceSheet, setSelectedServiceSheet] = useState(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());

      const resp = await apiFetch(`/api/invoices?${params.toString()}`);
      setRows(resp?.data || []);
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudieron cargar las facturas", "error");
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  const loadServiceSheets = useCallback(async () => {
    try {
      const resp = await apiFetch("/api/service-sheets?status=all");
      setServiceSheets(resp?.data || []);
    } catch (e) {
      console.error("Error cargando hojas de servicio:", e);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    loadServiceSheets();
  }, [loadServiceSheets]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setSelectedClient(null);
    setSelectedServiceSheet(null);
    setForm(emptyInvoice(worker));
    setModalOpen(true);
  }

  function openView(row) {
    setModalMode("view");
    setEditingId(row.id);
    setSelectedClient(
      row?.client_id
        ? {
            id: row.client_id,
            name: row.client_name || "",
          }
        : null
    );
    setSelectedServiceSheet(
      row?.service_sheet_id
        ? serviceSheets.find((item) => item.id === row.service_sheet_id) || null
        : null
    );
    setForm({
      ...emptyInvoice(worker),
      ...row,
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total: Number(row.total || 0),
    });
    setModalOpen(true);
  }

  function openEdit(row) {
    setModalMode("edit");
    setEditingId(row.id);
    setSelectedClient(
      row?.client_id
        ? {
            id: row.client_id,
            name: row.client_name || "",
          }
        : null
    );
    setSelectedServiceSheet(
      row?.service_sheet_id
        ? serviceSheets.find((item) => item.id === row.service_sheet_id) || null
        : null
    );
    setForm({
      ...emptyInvoice(worker),
      ...row,
      subtotal: Number(row.subtotal || 0),
      tax: Number(row.tax || 0),
      total: Number(row.total || 0),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setSelectedClient(null);
    setSelectedServiceSheet(null);
    setForm(emptyInvoice(worker));
  }

  async function saveInvoice() {
    if (!form.client_id) {
      Swal.fire("Falta cliente", "Selecciona un cliente válido.", "warning");
      return;
    }

    const safeSubtotal = Number(form.subtotal || 0);
    const safeTax = Number(form.tax || 0);
    const safeTotal = Number((safeSubtotal + safeTax).toFixed(2));

    const payload = {
      ...form,
      client_id: form.client_id,
      client_name: form.client_name || selectedClient?.name || "",
      service_sheet_id: form.service_sheet_id || null,
      created_by: worker?.id || null,
      subtotal: safeSubtotal,
      tax: safeTax,
      total: safeTotal,
    };

    try {
      if (modalMode === "edit" && editingId) {
        await apiFetch(`/api/invoices/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/invoices`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeModal();
      await loadInvoices();

      Swal.fire(
        "Guardado",
        modalMode === "edit"
          ? "La factura fue actualizada correctamente."
          : "La factura fue creada correctamente.",
        "success"
      );
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo guardar la factura", "error");
    }
  }

  async function deleteInvoice(row) {
    const result = await Swal.fire({
      title: "¿Eliminar factura?",
      text: `Se eliminará ${row.folio || "la factura seleccionada"}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/api/invoices/${row.id}`, {
        method: "DELETE",
      });

      await loadInvoices();

      Swal.fire("Eliminada", "La factura fue eliminada correctamente.", "success");
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo eliminar la factura", "error");
    }
  }

  const kpis = useMemo(() => {
    const totalInvoices = rows.length;
    const totalAmount = rows.reduce((acc, item) => acc + Number(item.total || 0), 0);
    const paidAmount = rows
      .filter((item) => item.status === "paid")
      .reduce((acc, item) => acc + Number(item.total || 0), 0);
    const pendingCount = rows.filter(
      (item) => item.status === "pending" || item.status === "issued"
    ).length;

    return {
      totalInvoices,
      totalAmount,
      paidAmount,
      pendingCount,
    };
  }, [rows]);

  return (
    <div className="invWrap">
      <div className="invTopbar">
        <div>
          <h1 className="invTitle">
            <TbReceipt2 />
            Facturación
          </h1>
          <p className="invSub">
            Gestión de facturas, periodos de cobro y seguimiento de pagos
          </p>
        </div>

        <div className="invTopActions">
          <button
            type="button"
            className="invBtn invBtnGhost"
            onClick={loadInvoices}
            title="Recargar"
          >
            <TbRefresh />
            Recargar
          </button>

          <button
            type="button"
            className="invBtn invBtnPrimary"
            onClick={openCreate}
          >
            <TbPlus />
            Nueva factura
          </button>
        </div>
      </div>

      <div className="invKpis">
        <div className="invKpiCard">
          <div className="invKpiLabel">Facturas</div>
          <div className="invKpiValue">{kpis.totalInvoices}</div>
        </div>

        <div className="invKpiCard">
          <div className="invKpiLabel">Monto total</div>
          <div className="invKpiValue">{formatCurrency(kpis.totalAmount)}</div>
        </div>

        <div className="invKpiCard">
          <div className="invKpiLabel">Pagado</div>
          <div className="invKpiValue">{formatCurrency(kpis.paidAmount)}</div>
        </div>

        <div className="invKpiCard">
          <div className="invKpiLabel">Pendientes</div>
          <div className="invKpiValue">{kpis.pendingCount}</div>
        </div>
      </div>

      <div className="invFilters">
        <div className="invSearch">
          <TbSearch />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por folio, cliente o ubicación..."
          />
        </div>

        <select
          className="invSelect"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="invCard">
        <div className="invTableWrap">
          <table className="invTable">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Periodo</th>
                <th>Ubicación</th>
                <th>Total</th>
                <th>Estado</th>
                <th className="invThRight">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="invEmpty">
                    Cargando facturas...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="invEmpty">
                    No hay facturas registradas.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const statusUi = getStatusStyle(row.status);

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="invPrimaryCell">
                          <div className="invPrimaryIcon">
                            <TbFileInvoice />
                          </div>
                          <div>
                            <div className="invPrimaryTitle">
                              {row.folio || "Sin folio"}
                            </div>
                            <div className="invPrimarySub">
                              {formatDate(row.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="invInlineMeta">
                          <TbUser />
                          <span>{row.client_name || "—"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="invInlineMeta">
                          <TbCalendarEvent />
                          <span>{formatDate(row.delivery_date)}</span>
                        </div>
                      </td>

                      <td>{row.billing_period || "—"}</td>

                      <td>
                        <div className="invInlineMeta">
                          <TbMapPin />
                          <span>{row.service_location || "—"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="invMoneyCell">
                          <TbCurrencyDollar />
                          <span>{formatCurrency(row.total)}</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className="invStatus"
                          style={{
                            background: statusUi.bg,
                            color: statusUi.color,
                            borderColor: statusUi.border,
                          }}
                        >
                          <span
                            className="invStatusDot"
                            style={{ background: statusUi.dot }}
                          />
                          {statusUi.label}
                        </span>
                      </td>

                      <td className="invTdRight">
                        <div className="invActions">
                          <button
                            type="button"
                            className="invIconBtn"
                            onClick={() => openView(row)}
                            title="Ver"
                          >
                            <TbFileDescription />
                          </button>

                          <button
                            type="button"
                            className="invIconBtn"
                            onClick={() => openEdit(row)}
                            title="Editar"
                          >
                            <TbEdit />
                          </button>

                          <button
                            type="button"
                            className="invIconBtn invIconBtnDanger"
                            onClick={() => deleteInvoice(row)}
                            title="Eliminar"
                          >
                            <TbTrash />
                          </button>
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

      <InvoiceModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSave={saveInvoice}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        serviceSheets={serviceSheets}
        selectedServiceSheet={selectedServiceSheet}
        setSelectedServiceSheet={setSelectedServiceSheet}
      />
    </div>
  );
}