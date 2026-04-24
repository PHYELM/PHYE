import React, { useMemo } from "react";
import {
  addDays,
  formatDateEs,
  formatHourLabel,
  getDateKeyLocal,
  minutesBetween,
  startOfDay,
} from "./calendar.helpers";

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
  const visibleDays = useMemo(() => {
    if (view !== "week") return [startOfDay(selectedDate)];

    const base = startOfDay(selectedDate);
    const day = base.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = addDays(base, mondayOffset);

    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate, view]);

  const handleSlot = (dayDate, hour) => {
    if (!canManageCalendar) return;

    const start = new Date(dayDate);
    start.setHours(hour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    onSlotClick({ start, end });
  };

  return (
    <div className={`calGrid ${view === "week" ? "calGridWeek" : ""}`}>
      <div className="calGridHeader">
        <div className="calGridHeaderAside" />

        <div
          className="calGridHeaderMain"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`,
          }}
        >
          {visibleDays.map((dayDate) => (
            <div key={getDateKeyLocal(dayDate)}>
              {view === "week"
                ? dayDate.toLocaleDateString("es-MX", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })
                : formatDateEs(dayDate)}
            </div>
          ))}
        </div>
      </div>

      <div className="calGridBody">
        {loading ? (
          <div className="calEmpty">Cargando eventos...</div>
        ) : (
          HOURS.map((hour) => (
            <div className="calHourRow" key={hour}>
              <div className="calHourLabel">{formatHourLabel(hour)}</div>

              <div
                className="calHourCell calHourCellMulti"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))`,
                }}
              >
                {visibleDays.map((dayDate) => {
                  const dayKey = getDateKeyLocal(dayDate);

                  const eventsAtHour = events.filter((event) => {
                    const start = new Date(event.starts_at);
                    return (
                      getDateKeyLocal(start) === dayKey &&
                      start.getHours() === hour
                    );
                  });

                  return (
                    <div
                      key={`${dayKey}-${hour}`}
                      className="calHourSubCell"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSlot(dayDate, hour)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSlot(dayDate, hour);
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
                              ·{" "}
                              {(event.departments || [])
                                .map((d) => d.name)
                                .join(", ") || "Sin departamento"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}