import React from "react";
import { formatDateTimeEs } from "./calendar.helpers.js";

export default function CalendarEventsTable({ events, loading, onEventClick }) {
  return (
    <div className="calTableWrap">
      {loading ? (
        <div className="calEmpty">Cargando eventos...</div>
      ) : events.length === 0 ? (
        <div className="calEmpty">No se encontraron eventos.</div>
      ) : (
        <table className="calTable">
          <thead>
            <tr>
              <th>Título</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Ubicación</th>
              <th>Departamentos</th>
              <th>Visibilidad</th>
              <th>Creador</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>
                  <button
                    type="button"
                    className="calLinkBtn"
                    onClick={() => onEventClick(event)}
                  >
                    {event.title}
                  </button>
                </td>
                <td>{formatDateTimeEs(event.starts_at)}</td>
                <td>{formatDateTimeEs(event.ends_at)}</td>
                <td>{event.location || "—"}</td>
                <td>{(event.departments || []).map((d) => d.name).join(", ") || "—"}</td>
                <td>{event.visibility === "PRIVATE" ? "Privado" : "Público"}</td>
                <td>{event.creator?.full_name || event.creator?.username || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}