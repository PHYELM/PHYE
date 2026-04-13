import React, { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "../api";
import ClientSelectPro from "../components/ClientSelectPro";
import LocationPickerModal from "../components/LocationPickerModal";
import "./ServiceSheetsModule.css";
import {
  TbRouteSquare,
  TbPlus,
  TbSearch,
  TbEdit,
  TbTrash,
  TbRefresh,
  TbClipboardText,
  TbMapPin,
  TbTruckDelivery,
  TbCalendarEvent,
  TbUser,
  TbCurrencyDollar,
  TbPackages,
  TbX,
} from "react-icons/tb";

const STATUS_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendiente" },
  { value: "scheduled", label: "Programada" },
  { value: "in_progress", label: "En proceso" },
  { value: "completed", label: "Completada" },
  { value: "cancelled", label: "Cancelada" },
];

const STATUS_STYLES = {
  pending: {
    label: "Pendiente",
    bg: "#fff7ed",
    color: "#c2410c",
    border: "#fdba74",
    dot: "#f97316",
  },
  scheduled: {
    label: "Programada",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#93c5fd",
    dot: "#3b82f6",
  },
  in_progress: {
    label: "En proceso",
    bg: "#f5f3ff",
    color: "#6d28d9",
    border: "#c4b5fd",
    dot: "#8b5cf6",
  },
  completed: {
    label: "Completada",
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
  return STATUS_STYLES[status] || STATUS_STYLES.pending;
}

function emptyServiceSheet(worker) {
  return {
    client_id: "",
    client_name: "",
    route_name: "",
    city: "",
    location: "",
    location_lat: null,
    location_lng: null,
    quantity: 0,
    unit_price: 0,
    total_price: 0,
    delivery_date: "",
    pickup_date: "",
    service_type: "",
    status: "pending",
    notes: "",
    created_by: worker?.id || null,
  };
}

function ServiceSheetModal({
  open,
  mode,
  form,
  setForm,
  onClose,
  onSave,
  onOpenLocationPicker,
  selectedClient,
  setSelectedClient,
}) {
  if (!open) return null;

  const readOnly = mode === "view";

  return (
    <div className="ssModalBack" onMouseDown={onClose}>
      <div
        className="ssModal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ssModalTop">
          <div className="ssModalTitle">
            {mode === "create" && "Nueva hoja de servicio"}
            {mode === "edit" && "Editar hoja de servicio"}
            {mode === "view" && "Detalle de hoja de servicio"}
          </div>

          <button
            type="button"
            className="ssIconBtn"
            onClick={onClose}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <TbX />
          </button>
        </div>

        <div className="ssModalBody">
          <div className="ssFormGrid">
            <div className="ssField">
              <label>Cliente</label>
              {readOnly ? (
                <input
                  className="ssInput"
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
                      setForm((prev) => ({
                        ...prev,
                        client_id: "",
                        client_name: "",
                      }));
                      return;
                    }

                    setSelectedClient(client);
                    setForm((prev) => ({
                      ...prev,
                      client_id: client.id,
                      client_name: client.name || "",
                      city: prev.city || client.city || "",
                      location: prev.location || client.address || "",
                    }));
                  }}
                  placeholder="Buscar cliente por nombre..."
                />
              )}
            </div>

            <div className="ssField">
              <label>Ruta</label>
              <input
                className="ssInput"
                value={form.route_name}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, route_name: e.target.value }))
                }
                placeholder="Ej. Mochis / Guasave / Norte"
              />
            </div>

            <div className="ssField">
              <label>Ciudad</label>
              <input
                className="ssInput"
                value={form.city}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
                placeholder="Ciudad"
              />
            </div>

            <div className="ssField">
              <label>Ubicación</label>

              <div className="ssLocationRow">
                <input
                  className="ssInput"
                  value={form.location}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="Ubicación del servicio"
                />

                {!readOnly && (
                  <button
                    type="button"
                    className="ssMapBtn"
                    onClick={onOpenLocationPicker}
                  >
                    <TbMapPin />
                    Mapa
                  </button>
                )}
              </div>

              {(form.location_lat || form.location_lng) && (
                <div className="ssLocationMeta">
                  Coordenadas: {Number(form.location_lat || 0).toFixed(6)} · {Number(form.location_lng || 0).toFixed(6)}
                </div>
              )}
            </div>

            <div className="ssField">
              <label>Cantidad</label>
              <input
                className="ssInput"
                type="number"
                step="0.01"
                value={form.quantity}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => {
                    const nextQuantity = Number(e.target.value || 0);
                    const nextUnitPrice = Number(prev.unit_price || 0);

                    return {
                      ...prev,
                      quantity: e.target.value,
                      total_price: Number((nextQuantity * nextUnitPrice).toFixed(2)),
                    };
                  })
                }
                placeholder="0"
              />
            </div>

            <div className="ssField">
              <label>Precio unitario</label>
              <input
                className="ssInput"
                type="number"
                step="0.01"
                value={form.unit_price}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => {
                    const nextUnitPrice = Number(e.target.value || 0);
                    const nextQuantity = Number(prev.quantity || 0);

                    return {
                      ...prev,
                      unit_price: e.target.value,
                      total_price: Number((nextQuantity * nextUnitPrice).toFixed(2)),
                    };
                  })
                }
                placeholder="0.00"
              />
            </div>
            <div className="ssField">
              <label>Total</label>
              <input
                className="ssInput"
                type="number"
                step="0.01"
                value={form.total_price}
                readOnly
                placeholder="0.00"
              />
            </div>
            <div className="ssField">
              <label>Tipo de servicio</label>
              <input
                className="ssInput"
                value={form.service_type}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, service_type: e.target.value }))
                }
                placeholder="Ej. Sanitario / Lavamanos / Entrega / Retiro"
              />
            </div>

            <div className="ssField">
              <label>Fecha de entrega</label>
              <input
                className="ssInput"
                type="date"
                value={form.delivery_date || ""}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, delivery_date: e.target.value }))
                }
              />
            </div>

            <div className="ssField">
              <label>Fecha de retiro</label>
              <input
                className="ssInput"
                type="date"
                value={form.pickup_date || ""}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, pickup_date: e.target.value }))
                }
              />
            </div>

            <div className="ssField">
              <label>Estado</label>
              <select
                className="ssInput"
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

            <div className="ssField ssField--span2">
              <label>Notas</label>
              <textarea
                className="ssTextarea"
                value={form.notes}
                readOnly={readOnly}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Observaciones, detalles del servicio, evidencias pendientes, comentarios..."
              />
            </div>
          </div>
        </div>

        <div className="ssModalActions">
          <button type="button" className="ssBtn ssBtnGhost" onClick={onClose}>
            Cerrar
          </button>

          {!readOnly && (
            <button type="button" className="ssBtn ssBtnPrimary" onClick={onSave}>
              Guardar hoja
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ServiceSheetsModule({ currentWorker }) {
  const worker = currentWorker || null;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyServiceSheet(worker));
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());

      const resp = await apiFetch(`/api/service-sheets?${params.toString()}`);
      setRows(resp?.data || []);
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudieron cargar las hojas de servicio", "error");
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setSelectedClient(null);
    setForm(emptyServiceSheet(worker));
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
            city: row.city || "",
            address: row.location || "",
          }
        : null
    );
    setForm({
      ...emptyServiceSheet(worker),
      ...row,
      quantity: Number(row.quantity || 0),
      unit_price: Number(row.unit_price || 0),
      total_price: Number(row.total_price || 0),
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
            city: row.city || "",
            address: row.location || "",
          }
        : null
    );
    setForm({
      ...emptyServiceSheet(worker),
      ...row,
      quantity: Number(row.quantity || 0),
      unit_price: Number(row.unit_price || 0),
      total_price: Number(row.total_price || 0),
    });
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setLocationPickerOpen(false);
    setSelectedClient(null);
    setForm(emptyServiceSheet(worker));
  }

  function openLocationPicker() {
    setLocationPickerOpen(true);
  }

  function handleConfirmLocation(payload) {
    setForm((prev) => ({
      ...prev,
      location: payload?.location || prev.location,
      city: payload?.city || prev.city,
      location_lat: payload?.lat ?? prev.location_lat,
      location_lng: payload?.lng ?? prev.location_lng,
    }));
    setLocationPickerOpen(false);
  }

  async function saveRow() {
    if (!form.client_id) {
      Swal.fire("Falta cliente", "Selecciona un cliente válido.", "warning");
      return;
    }

    const safeQuantity = Number(form.quantity || 0);
    const safeUnitPrice = Number(form.unit_price || 0);
    const safeTotalPrice = Number((safeQuantity * safeUnitPrice).toFixed(2));

    const payload = {
      ...form,
      client_id: form.client_id,
      client_name: form.client_name || selectedClient?.name || "",
      city: form.city || selectedClient?.city || "",
      location: form.location || selectedClient?.address || "",
      created_by: worker?.id || null,
      quantity: safeQuantity,
      unit_price: safeUnitPrice,
      total_price: safeTotalPrice,
    };

    try {
      if (modalMode === "edit" && editingId) {
        await apiFetch(`/api/service-sheets/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/service-sheets`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      closeModal();
      await loadRows();

      Swal.fire(
        "Guardado",
        modalMode === "edit"
          ? "La hoja de servicio fue actualizada correctamente."
          : "La hoja de servicio fue creada correctamente.",
        "success"
      );
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo guardar la hoja de servicio", "error");
    }
  }

  async function deleteRow(row) {
    const result = await Swal.fire({
      title: "¿Eliminar hoja de servicio?",
      text: `Se eliminará el registro de ${row.client_name || "servicio seleccionado"}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/api/service-sheets/${row.id}`, {
        method: "DELETE",
      });

      await loadRows();

      Swal.fire("Eliminada", "La hoja de servicio fue eliminada correctamente.", "success");
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo eliminar la hoja de servicio", "error");
    }
  }

  const kpis = useMemo(() => {
    const totalRows = rows.length;
    const totalAmount = rows.reduce((acc, item) => acc + Number(item.total_price || 0), 0);
    const totalQty = rows.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
    const pendingCount = rows.filter(
      (item) => item.status === "pending" || item.status === "scheduled"
    ).length;

    return {
      totalRows,
      totalAmount,
      totalQty,
      pendingCount,
    };
  }, [rows]);

  return (
    <div className="ssWrap">
      <div className="ssTopbar">
        <div>
          <h1 className="ssTitle">
            <TbRouteSquare />
            Hoja de Servicios
          </h1>
          <p className="ssSub">
            Gestión de rutas, ubicaciones, cantidades, precios, entregas y retiros
          </p>
        </div>

        <div className="ssTopActions">
          <button
            type="button"
            className="ssBtn ssBtnGhost"
            onClick={loadRows}
            title="Recargar"
          >
            <TbRefresh />
            Recargar
          </button>

          <button
            type="button"
            className="ssBtn ssBtnPrimary"
            onClick={openCreate}
          >
            <TbPlus />
            Nueva hoja
          </button>
        </div>
      </div>

      <div className="ssKpis">
        <div className="ssKpiCard">
          <div className="ssKpiLabel">Servicios</div>
          <div className="ssKpiValue">{kpis.totalRows}</div>
        </div>

        <div className="ssKpiCard">
          <div className="ssKpiLabel">Cantidad total</div>
          <div className="ssKpiValue">{kpis.totalQty}</div>
        </div>

        <div className="ssKpiCard">
          <div className="ssKpiLabel">Monto total</div>
          <div className="ssKpiValue">{formatCurrency(kpis.totalAmount)}</div>
        </div>

        <div className="ssKpiCard">
          <div className="ssKpiLabel">Pendientes</div>
          <div className="ssKpiValue">{kpis.pendingCount}</div>
        </div>
      </div>

      <div className="ssFilters">
        <div className="ssSearch">
          <TbSearch />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cliente, ruta, ciudad o ubicación..."
          />
        </div>

        <select
          className="ssSelect"
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

      <div className="ssCard">
        <div className="ssTableWrap">
          <table className="ssTable">
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Ruta / Ciudad</th>
                <th>Ubicación</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Entrega</th>
                <th>Retiro</th>
                <th>Estado</th>
                <th className="ssThRight">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="ssEmpty">
                    Cargando hojas de servicio...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="ssEmpty">
                    No hay hojas de servicio registradas.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const statusUi = getStatusStyle(row.status);

                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="ssPrimaryCell">
                          <div className="ssPrimaryIcon">
                            <TbClipboardText />
                          </div>
                          <div>
                            <div className="ssPrimaryTitle">
                              {row.client_name || "Sin cliente"}
                            </div>
                            <div className="ssPrimarySub">
                              {row.service_type || "Sin tipo"} · {formatDate(row.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="ssInlineMeta">
                          <TbTruckDelivery />
                          <span>{row.route_name || "—"} {row.city ? `· ${row.city}` : ""}</span>
                        </div>
                      </td>

                      <td>
                        <div className="ssInlineMeta">
                          <TbMapPin />
                          <span>{row.location || "—"}</span>
                        </div>
                      </td>

                      <td>
                        <div className="ssInlineMeta">
                          <TbPackages />
                          <span>{Number(row.quantity || 0)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="ssMoneyCell">
                          <TbCurrencyDollar />
                          <span>{formatCurrency(row.total_price)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="ssInlineMeta">
                          <TbCalendarEvent />
                          <span>{formatDate(row.delivery_date)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="ssInlineMeta">
                          <TbCalendarEvent />
                          <span>{formatDate(row.pickup_date)}</span>
                        </div>
                      </td>

                      <td>
                        <span
                          className="ssStatus"
                          style={{
                            background: statusUi.bg,
                            color: statusUi.color,
                            borderColor: statusUi.border,
                          }}
                        >
                          <span
                            className="ssStatusDot"
                            style={{ background: statusUi.dot }}
                          />
                          {statusUi.label}
                        </span>
                      </td>

                      <td className="ssTdRight">
                        <div className="ssActions">
                          <button
                            type="button"
                            className="ssIconBtn"
                            onClick={() => openView(row)}
                            title="Ver"
                          >
                            <TbClipboardText />
                          </button>

                          <button
                            type="button"
                            className="ssIconBtn"
                            onClick={() => openEdit(row)}
                            title="Editar"
                          >
                            <TbEdit />
                          </button>

                          <button
                            type="button"
                            className="ssIconBtn"
                            onClick={async () => {
                              try {
                                await apiFetch("/api/invoices", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    client_id: row.client_id || null,
                                    client_name: row.client_name || "",
                                    service_sheet_id: row.id,
                                    delivery_date: row.delivery_date || null,
                                    service_location: row.location || "",
                                    subtotal: Number(row.total_price || 0),
                                    tax: Number((Number(row.total_price || 0) * 0.16).toFixed(2)),
                                    total: Number((Number(row.total_price || 0) * 1.16).toFixed(2)),
                                    status: "draft",
                                    created_by: worker?.id || null,
                                  }),
                                });

                                Swal.fire(
                                  "Factura creada",
                                  "La factura se generó correctamente desde la hoja de servicio.",
                                  "success"
                                );
                              } catch (e) {
                                Swal.fire(
                                  "Error",
                                  e.message || "No se pudo generar la factura.",
                                  "error"
                                );
                              }
                            }}
                            title="Facturar"
                          >
                            <TbCurrencyDollar />
                          </button>

                          <button
                            type="button"
                            className="ssIconBtn ssIconBtnDanger"
                            onClick={() => deleteRow(row)}
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
      <ServiceSheetModal
        open={modalOpen}
        mode={modalMode}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSave={saveRow}
        onOpenLocationPicker={openLocationPicker}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
      />

      <LocationPickerModal
        open={locationPickerOpen}
        initialQuery={form.location}
        initialLat={form.location_lat}
        initialLng={form.location_lng}
        onClose={() => setLocationPickerOpen(false)}
        onConfirm={handleConfirmLocation}
      />
    </div>
  );
}
