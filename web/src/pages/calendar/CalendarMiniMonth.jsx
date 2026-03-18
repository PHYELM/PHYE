import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildMonthMatrix,
  isSameDay,
  startOfMonth,
} from "./calendar.helpers";

const DAY_NAMES = ["D", "L", "M", "X", "J", "V", "S"];

const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTH_FULL  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function decadeStart(year) {
  return Math.floor(year / 10) * 10;
}

const navBtnStyle = {
  width: 28, height: 28, borderRadius: 8,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#fff", color: "var(--cal-text)",
  fontWeight: 900, fontSize: 16, cursor: "pointer",
  display: "grid", placeItems: "center",
  transition: "background 140ms,border-color 140ms,transform 140ms",
  lineHeight: 1,
};

// ── Year picker ───────────────────────────────────────────────────────────────
function YearPicker({ currentYear, selectedYear, onSelect }) {
  const [decade, setDecade] = useState(() => decadeStart(currentYear));
  const years = useMemo(() => {
    const list = [];
    for (let y = decade - 1; y <= decade + 10; y++) list.push(y);
    return list;
  }, [decade]);

  return (
    <div style={{ userSelect: "none" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "28px 1fr 28px",
        alignItems: "center", gap: 4, marginBottom: 8,
      }}>
        <button type="button" onClick={() => setDecade((d) => d - 10)} style={navBtnStyle}>‹</button>
        <span style={{ textAlign: "center", fontWeight: 900, fontSize: 13, color: "var(--cal-text)", letterSpacing: "-0.2px" }}>
          {decade} – {decade + 9}
        </span>
        <button type="button" onClick={() => setDecade((d) => d + 10)} style={navBtnStyle}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
        {years.map((y) => {
          const isSelected = y === selectedYear;
          const isOutside  = y < decade || y > decade + 9;
          return (
            <button key={y} type="button" onClick={() => onSelect(y)} style={{
              height: 34, borderRadius: 9,
              border: isSelected ? "none" : "1px solid rgba(15,23,42,0.07)",
              background: isSelected ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "rgba(248,250,255,0.8)",
              color: isSelected ? "#fff" : isOutside ? "rgba(30,41,59,0.28)" : "var(--cal-text)",
              fontWeight: 800, fontSize: 12, cursor: "pointer",
              boxShadow: isSelected ? "0 6px 14px rgba(37,99,235,0.22)" : "none",
              transition: "background 140ms,color 140ms,box-shadow 140ms",
            }}>{y}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Month picker ──────────────────────────────────────────────────────────────
function MonthPicker({ selectedMonth, onSelect }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
      {MONTH_SHORT.map((label, idx) => {
        const isSelected = idx === selectedMonth;
        return (
          <button key={idx} type="button" onClick={() => onSelect(idx)} style={{
            height: 34, borderRadius: 9,
            border: isSelected ? "none" : "1px solid rgba(15,23,42,0.07)",
            background: isSelected ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "rgba(248,250,255,0.8)",
            color: isSelected ? "#fff" : "var(--cal-text)",
            fontWeight: 800, fontSize: 12, cursor: "pointer",
            boxShadow: isSelected ? "0 6px 14px rgba(37,99,235,0.22)" : "none",
            transition: "background 140ms,color 140ms,box-shadow 140ms",
          }}>{label}</button>
        );
      })}
    </div>
  );
}

// ── Portal dropdown ───────────────────────────────────────────────────────────
function PickerPortal({ anchorRef, children, onClose }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    function recalc() {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      setPos({
        top:   r.bottom + window.scrollY + 6,
        left:  r.left   + window.scrollX + r.width / 2,
        width: Math.max(r.width, 240),
      });
    }
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    const onDown = (e) => {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown",   onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown",   onKey);
    };
  }, [onClose, anchorRef]);

  return createPortal(
    <div style={{
      position:  "absolute",
      top:       pos.top,
      left:      pos.left,
      transform: "translateX(-50%)",
      zIndex:    99999,
      width:     `min(${pos.width}px, 90vw)`,
      padding:   12,
      borderRadius: 16,
      border:    "1px solid rgba(15,23,42,0.08)",
      background:"rgba(255,255,255,0.98)",
      boxShadow: "0 18px 36px rgba(15,23,42,0.14)",
      backdropFilter: "blur(12px)",
      animation: "calFadeIn 150ms ease",
    }}>
      {children}
    </div>,
    document.body
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function CalendarMiniMonth({ selectedDate, onDateChange }) {
  const monthCursor = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const cells       = useMemo(() => buildMonthMatrix(monthCursor), [monthCursor]);

  const [pickerMode, setPickerMode] = useState(null); // "year" | "month" | null
  const [pickerMonth, setPickerMonth] = useState(monthCursor.getMonth());
  const [pickerYear,  setPickerYear]  = useState(monthCursor.getFullYear());

  const anchorRef = useRef(null); // referencia al bloque del título

  useEffect(() => {
    setPickerMonth(monthCursor.getMonth());
    setPickerYear(monthCursor.getFullYear());
  }, [monthCursor]);

  const goMonth = (delta) => {
    const next = new Date(monthCursor);
    next.setMonth(next.getMonth() + delta);
    onDateChange(next);
  };

  const handleYearSelect = (year) => {
    setPickerYear(year);
    setPickerMode("month");
  };

  const handleMonthSelect = (month) => {
    const next = new Date(selectedDate);
    next.setFullYear(pickerYear);
    next.setMonth(month);
    onDateChange(next);
    setPickerMode(null);
  };

  const curMonth = monthCursor.getMonth();
  const curYear  = monthCursor.getFullYear();

  return (
    <div className="calMiniWrap" style={{ padding: "2px 0" }}>

      {/* ── Cabecera ── */}
      <div className="calMiniHeader" style={{ marginBottom: 8 }}>
        <button
          className="calMiniNavBtn" type="button"
          onClick={() => goMonth(-1)}
          style={{ width: 28, height: 28, fontSize: 16, borderRadius: 8 }}
        >‹</button>

        {/* Anchor para el portal */}
        <div ref={anchorRef} style={{ position: "relative", minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 4, height: 30,
          }}>
            {/* Mes */}
            <button type="button"
              onClick={() => setPickerMode((m) => (m === "month" ? null : "month"))}
              style={{
                border: "none",
                background: pickerMode === "month" ? "rgba(37,99,235,0.08)" : "transparent",
                borderRadius: 7, padding: "2px 6px",
                fontWeight: 900, fontSize: 13,
                color: "var(--cal-blue)", cursor: "pointer",
                letterSpacing: "-0.2px", transition: "background 140ms",
              }}
            >{MONTH_FULL[curMonth]}</button>

            {/* Año */}
            <button type="button"
              onClick={() => setPickerMode((m) => (m === "year" ? null : "year"))}
              style={{
                border: "none",
                background: pickerMode === "year" ? "rgba(37,99,235,0.08)" : "transparent",
                borderRadius: 7, padding: "2px 6px",
                fontWeight: 900, fontSize: 13,
                color: "var(--cal-text)",
                opacity: pickerMode === "year" ? 1 : 0.72,
                cursor: "pointer", letterSpacing: "-0.2px",
                transition: "background 140ms,opacity 140ms",
              }}
            >{curYear}</button>
          </div>
        </div>

        <button
          className="calMiniNavBtn" type="button"
          onClick={() => goMonth(1)}
          style={{ width: 28, height: 28, fontSize: 16, borderRadius: 8 }}
        >›</button>
      </div>

      {/* ── Portal: se renderiza en document.body, flota sobre todo ── */}
      {pickerMode && (
        <PickerPortal
          anchorRef={anchorRef}
          onClose={() => setPickerMode(null)}
        >
          {/* Pestañas Mes / Año */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 10,
            background: "rgba(15,23,42,0.04)",
            borderRadius: 10, padding: 3,
          }}>
            {["month","year"].map((mode) => (
              <button key={mode} type="button"
                onClick={() => setPickerMode(mode)}
                style={{
                  flex: 1, height: 30, borderRadius: 8, border: "none",
                  background: pickerMode === mode ? "#fff" : "transparent",
                  color: pickerMode === mode ? "var(--cal-blue)" : "var(--cal-soft)",
                  fontWeight: 900, fontSize: 12, cursor: "pointer",
                  boxShadow: pickerMode === mode ? "0 2px 8px rgba(15,23,42,0.08)" : "none",
                  transition: "background 140ms,color 140ms",
                }}
              >{mode === "month" ? "Mes" : "Año"}</button>
            ))}
          </div>

          {pickerMode === "year" && (
            <YearPicker
              currentYear={curYear}
              selectedYear={pickerYear}
              onSelect={handleYearSelect}
            />
          )}

          {pickerMode === "month" && (
            <>
              <div style={{
                textAlign: "center", fontWeight: 900, fontSize: 13,
                color: "var(--cal-text)", marginBottom: 8, opacity: 0.6,
              }}>{pickerYear}</div>
              <MonthPicker
                selectedMonth={pickerMonth}
                onSelect={handleMonthSelect}
              />
            </>
          )}
        </PickerPortal>
      )}

      {/* ── Nombres de días ── */}
      <div className="calMiniGrid calMiniGridDays" style={{ marginBottom: 2, gap: 2 }}>
        {DAY_NAMES.map((name, idx) => (
          <div className="calMiniDayName" key={`${name}-${idx}`} style={{
            height: 24, fontSize: 10, fontWeight: 900,
            letterSpacing: "0.4px", color: "rgba(30,41,59,0.45)",
          }}>{name}</div>
        ))}
      </div>

      {/* ── Grid de días ── */}
      <div className="calMiniGrid" style={{ gap: 2 }}>
        {cells.map((date) => {
          const outside  = date.getMonth() !== monthCursor.getMonth();
          const selected = isSameDay(date, selectedDate);
          const isToday  = isSameDay(date, new Date());
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <button
              key={date.toISOString()}
              type="button"
              className={[
                "calMiniCell",
                outside  ? "isOutside"  : "",
                selected ? "isSelected" : "",
                isToday && !selected ? "isToday" : "",
              ].filter(Boolean).join(" ")}
              onClick={() => onDateChange(date)}
              style={{
                height: 28, borderRadius: 7, fontSize: 12,
                fontWeight: selected ? 900 : 700,
                color: selected ? "#fff"
                  : outside ? "rgba(30,41,59,0.2)"
                  : isWeekend ? "rgba(239,68,68,0.75)"
                  : "var(--cal-text)",
              }}
            >{date.getDate()}</button>
          );
        })}
      </div>
    </div>
  );
}