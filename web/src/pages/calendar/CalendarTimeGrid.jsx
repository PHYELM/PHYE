import React from "react";
import { formatDateEs, formatHourLabel, minutesBetween } from "./calendar.helpers";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
export default function CalendarTimeGrid({
  selectedDate,
  view,
  events,
  loading,
  onSlotClick,
  onEventClick,
  canManageCalendar,
}) {
const handleSlot = (hour) => {
    if (!canManageCalendar) return;
    const start = new Date(selectedDate);
    start.setHours(hour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    onSlotClick({ start, end });
  };
  return (
    <div className="calGrid">
      <div className="calGridHeader">
        <div className="calGridHeaderAside" />
        <div className="calGridHeaderMain">{formatDateEs(selectedDate)}</div>
      </div>

      <div className="calGridBody">
        {loading ? (
          <div className="calEmpty">Cargando eventos...</div>
        ) : (
          HOURS.map((hour) => {
            const eventsAtHour = events.filter((event) => {
              const start = new Date(event.starts_at);
              return start.getHours() === hour;
            });

            return (
              <div className="calHourRow" key={hour}>
                <div className="calHourLabel">{formatHourLabel(hour)}</div>

                <div
                  className="calHourCell"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSlot(hour)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSlot(hour);
                  }}
                >
                  {eventsAtHour.map((event) => {
                    const start = new Date(event.starts_at);
                    const end = new Date(event.ends_at);
                    const mins = minutesBetween(start, end);
                    const height = Math.max(38, Math.min(180, mins * 1.08));

                    return (
                      <button
                        key={event.id}
                        type="button"
                        className="calEventPill"
                        style={{
                          top: 6,
                          height,
                          background: event.color || "#2563eb",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <div className="calEventPillTitle">{event.title}</div>
                        <div className="calEventPillMeta">
                          {start.toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          · {(event.departments || []).map((d) => d.name).join(", ") || "Sin departamento"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}