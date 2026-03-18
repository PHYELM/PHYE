import React from "react";

export default function CalendarToolbar({
  monthLabel,
  search,
  onSearchChange,
  onPrev,
  onNext,
  onToday,
  viewMode,
  onViewModeChange,
  calendarView,
  onCalendarViewChange,
  onCreate,
  canManageCalendar,
}) {
  return (
    <div className="calCard calToolbar">
      {canManageCalendar && (
        <button className="calBtn isPrimary" type="button" onClick={onCreate}>
          + Crear
        </button>
      )}

      <div className="calSegment">
        <button type="button" onClick={onPrev}>‹</button>
        <button type="button" onClick={onToday}>Hoy</button>
        <button type="button" onClick={onNext}>›</button>
      </div>

      <div className="calTitle">{monthLabel}</div>

      {/* Search con ícono y hint de funcionalidad */}
      <div className="calSearchWrap" title="Busca en títulos, ubicaciones, trabajadores y departamentos">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="calSearch"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar eventos, lugares, trabajadores..."
        />
      </div>

      <div className="calSegment">
        <button
          type="button"
          className={viewMode === "calendar" ? "active" : ""}
          onClick={() => onViewModeChange("calendar")}
        >
          Calendario
        </button>
        <button
          type="button"
          className={viewMode === "list" ? "active" : ""}
          onClick={() => onViewModeChange("list")}
        >
          Eventos
        </button>
      </div>

      <div className="calSegment">
        <button
          type="button"
          className={calendarView === "day" ? "active" : ""}
          onClick={() => onCalendarViewChange("day")}
        >
          Día
        </button>
        <button
          type="button"
          className={calendarView === "week" ? "active" : ""}
          onClick={() => onCalendarViewChange("week")}
        >
          Semana
        </button>
        <button
          type="button"
          className={calendarView === "month" ? "active" : ""}
          onClick={() => onCalendarViewChange("month")}
        >
          Mes
        </button>
      </div>
    </div>
  );
}