import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import Swal from "sweetalert2";
import "./CalendarModule.css";
import CalendarToolbar from "./calendar/CalendarToolbar.jsx";
import CalendarSidebar from "./calendar/CalendarSidebar.jsx";
import CalendarTimeGrid from "./calendar/CalendarTimeGrid.jsx";
import CalendarEventModal from "./calendar/CalendarEventModal.jsx";
import CalendarEventDetailsModal from "./calendar/CalendarEventDetailsModal.jsx";
import CalendarEventsTable from "./calendar/CalendarEventsTable.jsx";
import FilePreviewModal from "./forms/FilePreviewModal.jsx";
import {
  addDays,
  endOfDay,
  endOfMonth,
  formatDateInputLocal,
  formatMonthYearEs,
  getDateKeyLocal,
  getRangeForView,
  startOfDay,
  startOfMonth,
} from "./calendar/calendar.helpers.js";
export default function CalendarModule({ currentWorker }) {
  const [meta, setMeta] = useState({
    viewer: null,
    departments: [],
    workers: [],
  });
  const [events, setEvents] = useState([]);
  const [viewMode, setViewMode] = useState("calendar");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("day");
  const [deptFilterIds, setDeptFilterIds] = useState([]);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  const [slotDraft, setSlotDraft] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

const isDirection = useMemo(() => {
    const name = String(meta.viewer?.department?.name || currentWorker?.department_name || "")
      .trim()
      .toUpperCase();
    return name === "DIRECCION";
  }, [meta.viewer, currentWorker]);

  const canManageCalendar = useMemo(() => {
    if (isDirection) return true;
    return Boolean(meta.viewer?.level?.can_manage_calendar);
  }, [isDirection, meta.viewer]);

  const selectedRange = useMemo(() => {
    return getRangeForView(selectedDate, calendarView);
  }, [selectedDate, calendarView]);

  const loadMeta = useCallback(async () => {
    const data = await apiFetch(`/api/calendar/meta?workerId=${currentWorker.id}`);
    setMeta(data);
  }, [currentWorker.id]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const from = selectedRange.start.toISOString();
      const to = selectedRange.end.toISOString();
      const params = new URLSearchParams({
        workerId: currentWorker.id,
        from,
        to,
        search,
      });

      if (isDirection && deptFilterIds.length > 0) {
        params.set("departmentIds", deptFilterIds.join(","));
      }

      const data = await apiFetch(`/api/calendar/events?${params.toString()}`);
      setEvents(data.events || []);
    } finally {
      setLoading(false);
    }
  }, [currentWorker.id, selectedRange, search, deptFilterIds, isDirection]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handlePrev = () => {
    if (calendarView === "day") {
      setSelectedDate((prev) => addDays(prev, -1));
      return;
    }
    if (calendarView === "week") {
      setSelectedDate((prev) => addDays(prev, -7));
      return;
    }
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() - 1);
    setSelectedDate(d);
  };

  const handleNext = () => {
    if (calendarView === "day") {
      setSelectedDate((prev) => addDays(prev, 1));
      return;
    }
    if (calendarView === "week") {
      setSelectedDate((prev) => addDays(prev, 7));
      return;
    }
    const d = new Date(selectedDate);
    d.setMonth(d.getMonth() + 1);
    setSelectedDate(d);
  };

  const handleToday = () => setSelectedDate(new Date());

  const handleOpenCreateFromSlot = ({ start, end }) => {
    setSlotDraft({ start, end });
    setSelectedEvent(null);
    setCreateOpen(true);
  };

  const handleOpenCreateQuick = () => {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);

    const end = new Date(nextHour);
    end.setHours(end.getHours() + 1);

    setSlotDraft({ start: nextHour, end });
    setSelectedEvent(null);
    setCreateOpen(true);
  };

  const handleOpenEvent = async (eventItem) => {
    const data = await apiFetch(
      `/api/calendar/events/${eventItem.id}?workerId=${currentWorker.id}`
    );
    setSelectedEvent(data.event);
    setDetailsOpen(true);
  };

const handleSaveEvent = async (payload) => {
    // Cierra el modal inmediatamente — no espera al servidor
    setCreateOpen(false);

    // Optimistic: agrega el evento localmente de inmediato
    const tempId = `temp_${Date.now()}`;
    const optimisticEvent = {
      id: payload.id || tempId,
      title: payload.title,
      description: payload.description || "",
      location: payload.location || "",
      visibility: payload.visibility || "PUBLIC",
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      all_day: !!payload.all_day,
      color: "#1a73e8",
      departments: (payload.department_ids || [])
        .map((id) => meta.departments.find((d) => d.id === id))
        .filter(Boolean),
      workers: [],
      files: [],
      _pending: true,
    };

    if (!payload.id) {
      // Es nuevo: agrega optimisticamente
      setEvents((prev) => [...prev, optimisticEvent]);
    } else {
      // Es edición: actualiza optimisticamente
      setEvents((prev) =>
        prev.map((ev) => ev.id === payload.id ? { ...ev, ...optimisticEvent } : ev)
      );
    }

    setSelectedEvent(null);
    setSlotDraft(null);

    // Sube al servidor en segundo plano
    const formData = new FormData();
    formData.append("title", payload.title);
    formData.append("description", payload.description || "");
    formData.append("location", payload.location || "");
    formData.append("visibility", payload.visibility || "PUBLIC");
    formData.append("starts_at", payload.starts_at);
    formData.append("ends_at", payload.ends_at);
    formData.append("all_day", payload.all_day ? "true" : "false");
    formData.append("worker_id", currentWorker.id);
    formData.append("department_ids", JSON.stringify(payload.department_ids || []));
    formData.append("worker_ids", JSON.stringify(payload.worker_ids || []));
    formData.append("removed_file_ids", JSON.stringify(payload.removed_file_ids || []));

    (payload.files || []).forEach((file) => {
      if (file instanceof File) formData.append("files", file);
    });

    let url = "/api/calendar/events";
    let method = "POST";

    if (payload.id) {
      url = `/api/calendar/events/${payload.id}`;
      method = "PATCH";
    }

    try {
      const data = await apiFetch(url, { method, body: formData });

      // Reemplaza el optimista con la data real del servidor
      await loadEvents();

      if (detailsOpen && data.event?.id) {
        const reloaded = await apiFetch(
          `/api/calendar/events/${data.event.id}?workerId=${currentWorker.id}`
        );
        setSelectedEvent(reloaded.event);
      }
    } catch {
      // Si falla, revierte el optimista
      setEvents((prev) =>
        prev.filter((ev) => ev.id !== tempId && !ev._pending)
      );
      Swal.fire({
        title: "Error al guardar",
        text: "No se pudo guardar el evento. Intenta de nuevo.",
        icon: "error",
        confirmButtonColor: "#1a73e8",
        confirmButtonText: "Entendido",
      });
    }
  };

const handleDeleteEvent = async (eventId) => {
    // Optimistic: cierra y quita de inmediato
    setDetailsOpen(false);
    setSelectedEvent(null);
    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));

    try {
      await apiFetch(`/api/calendar/events/${eventId}?workerId=${currentWorker.id}`, {
        method: "DELETE",
      });
      Swal.fire({
        title: "Evento eliminado",
        icon: "success",
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
      await loadEvents();
    } catch {
      // Si falla, recarga para restaurar
      await loadEvents();
      Swal.fire({
        title: "Error",
        text: "No se pudo eliminar el evento.",
        icon: "error",
        confirmButtonColor: "#1a73e8",
        confirmButtonText: "Entendido",
      });
    }
  };
  const handleEditEvent = () => {
    setDetailsOpen(false);
    setCreateOpen(true);
  };

const handleAddComment = async (comment) => {
    if (!selectedEvent?.id) return;

    await apiFetch(`/api/calendar/events/${selectedEvent.id}/comments`, {
      method: "POST",
      body: JSON.stringify({
        worker_id: currentWorker.id,
        comment,
      }),
    });

    const reloaded = await apiFetch(
      `/api/calendar/events/${selectedEvent.id}?workerId=${currentWorker.id}`
    );
    setSelectedEvent(reloaded.event);
  };

  const handleDeleteComment = async (commentId) => {
    if (!selectedEvent?.id) return;

    // Optimistic: quita el comentario de inmediato
    setSelectedEvent((prev) => ({
      ...prev,
      comments: (prev.comments || []).filter((c) => c.id !== commentId),
    }));

    await apiFetch(
      `/api/calendar/events/${selectedEvent.id}/comments/${commentId}?workerId=${currentWorker.id}`,
      { method: "DELETE" }
    );
  };

  const handleEditComment = async (commentId, newText) => {
    if (!selectedEvent?.id) return;

    // Optimistic: actualiza el texto de inmediato
    setSelectedEvent((prev) => ({
      ...prev,
      comments: (prev.comments || []).map((c) =>
        c.id === commentId ? { ...c, comment: newText } : c
      ),
    }));

    await apiFetch(
      `/api/calendar/events/${selectedEvent.id}/comments/${commentId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          worker_id: currentWorker.id,
          comment: newText,
        }),
      }
    );
  };

  const monthLabel = useMemo(() => formatMonthYearEs(selectedDate), [selectedDate]);

  const dayEvents = useMemo(() => {
    if (calendarView === "month") return events;
    const key = getDateKeyLocal(selectedDate);
    return events.filter((event) => getDateKeyLocal(new Date(event.starts_at)) === key);
  }, [events, selectedDate, calendarView]);

  return (
    <div className="ecCalendar">
<CalendarToolbar
        monthLabel={monthLabel}
        search={search}
        onSearchChange={setSearch}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        calendarView={calendarView}
        onCalendarViewChange={setCalendarView}
        onCreate={handleOpenCreateQuick}
        canManageCalendar={canManageCalendar}
      />
      <div className="ecCalendar-shell">
<CalendarSidebar
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          departments={meta.departments}
          deptFilterIds={deptFilterIds}
          onDeptFilterChange={setDeptFilterIds}
          isDirection={isDirection}
          canManageCalendar={canManageCalendar}
        />
        <section className="ecCalendar-main">
          {viewMode === "calendar" ? (
<CalendarTimeGrid
              selectedDate={selectedDate}
              view={calendarView}
              events={dayEvents}
              loading={loading}
              onSlotClick={handleOpenCreateFromSlot}
              onEventClick={handleOpenEvent}
              canManageCalendar={canManageCalendar}
            />
          ) : (
            <CalendarEventsTable
              events={events}
              loading={loading}
              departments={meta.departments}
              onEventClick={handleOpenEvent}
            />
          )}
        </section>
      </div>

      {createOpen && (
        <CalendarEventModal
          open={createOpen}
          onClose={() => {
            setCreateOpen(false);
            if (!detailsOpen) setSelectedEvent(null);
          }}
          onSave={handleSaveEvent}
          worker={currentWorker}
          viewer={meta.viewer}
          departments={meta.departments}
          workers={meta.workers}
          initialEvent={
            selectedEvent
              ? {
                  ...selectedEvent,
                  department_ids: (selectedEvent.departments || []).map((d) => d.id),
                  worker_ids: (selectedEvent.workers || []).map((w) => w.id),
                }
              : {
                  title: "",
                  description: "",
                  location: "",
                  visibility: "PUBLIC",
                  all_day: false,
                  starts_at: formatDateInputLocal(slotDraft?.start || startOfDay(new Date())),
                  ends_at: formatDateInputLocal(slotDraft?.end || endOfDay(new Date())),
                  department_ids: [],
                  worker_ids: [],
                  files: [],
                }
          }
        />
      )}

{detailsOpen && selectedEvent && (
        <CalendarEventDetailsModal
          open={detailsOpen}
          event={selectedEvent}
          viewer={meta.viewer}
          canManageCalendar={canManageCalendar}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedEvent(null);
          }}
          onEdit={handleEditEvent}
          onDelete={handleDeleteEvent}
          onComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onEditComment={handleEditComment}
          onPreviewFile={(file) => setPreviewFile(file)}
        />
      )}

{previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}