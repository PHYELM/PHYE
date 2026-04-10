import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TbChevronLeft, TbChevronRight, TbCalendar, TbX } from 'react-icons/tb';

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DAYS_ABBR = ['Lu','Ma','Mi','Ju','Vi','Sa','Do'];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year, month) {
  // 0=Sunday en JS → convertimos a 0=Monday
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str + 'T12:00:00');
  return isNaN(d) ? null : d;
}
function toYMD(d) {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function formatDisplay(str) {
  if (!str) return '';
  const d = parseDate(str);
  if (!d) return str;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MiniDatePicker({ value, onChange, placeholder = 'Seleccionar fecha', label }) {
  const [open,     setOpen]     = useState(false);
  const [mode,     setMode]     = useState('days');   // 'days' | 'months' | 'years'
  const [viewYear,  setViewYear] = useState(() => {
    const d = parseDate(value);
    return d ? d.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseDate(value);
    return d ? d.getMonth() : new Date().getMonth();
  });
  const [dropPos,  setDropPos]  = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropRef    = useRef(null);

  const selected = parseDate(value);

  // sync view when value changes externally
  useEffect(() => {
    const d = parseDate(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
  }, [value]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e) {
      if (dropRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  function openPicker() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dpH = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > dpH + 10 ? rect.bottom + 6 : rect.top - dpH - 6;
    setDropPos({ top, left: rect.left });
    setMode('days');
    setOpen(true);
  }

  function selectDay(day) {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toYMD(d));
    setOpen(false);
  }

  function clearDate(e) {
    e.stopPropagation();
    onChange('');
  }

  /* ── build calendar grid ─────────────────────────── */
  const daysInMonth   = getDaysInMonth(viewYear, viewMonth);
  const firstWeekDay  = getFirstDayOfWeek(viewYear, viewMonth);
  const today         = new Date();
  const todayStr      = toYMD(today);

  const cells = [];
  for (let i = 0; i < firstWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  /* ── year range for year picker ──────────────────── */
  const yearBase  = Math.floor(viewYear / 10) * 10;
  const yearRange = Array.from({ length: 12 }, (_, i) => yearBase + i - 1);

  const navy = '#1a3c5e';

  return (
    <>
      {label && (
        <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPicker}
        style={{
          width: '100%', minHeight: 42, padding: '0 12px',
          border: `1px solid ${open ? 'rgba(37,99,235,0.42)' : '#dbe4ef'}`,
          borderRadius: 10,
          background: '#fff',
          color: value ? '#0f172a' : '#94a3b8',
          fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.10)' : 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
          boxSizing: 'border-box',
        }}
      >
        <TbCalendar size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{value ? formatDisplay(value) : placeholder}</span>
        {value && (
          <span
            onClick={clearDate}
            style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 2 }}
          >
            <TbX size={13} />
          </span>
        )}
      </button>

{/* Dropdown via portal */}
      {open && createPortal(
        <>
          {/* overlay transparente que cierra al hacer click fuera */}
          <div
            style={{
              position: 'fixed', inset: 0,
              zIndex: 99998, background: 'transparent',
            }}
            onMouseDown={() => setOpen(false)}
          />
          <div
            ref={dropRef}
            style={{
              position: 'fixed',
              top: dropPos.top,
              left: dropPos.left,
              zIndex: 99999,
            width: 300,
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 18,
            boxShadow: '0 16px 48px rgba(15,23,42,0.18)',
            padding: '14px 14px 12px',
            userSelect: 'none',
          }}
        >

          {/* Header: month/year nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <button type="button" onClick={() => {
              if (mode === 'days')   { let m = viewMonth - 1; let y = viewYear; if (m < 0) { m = 11; y--; } setViewMonth(m); setViewYear(y); }
              if (mode === 'years')  setViewYear(y => y - 10);
            }}
              style={{ ...navBtnStyle }}>
              <TbChevronLeft size={14} />
            </button>

            <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center' }}>
              <button type="button"
                onClick={() => setMode(m => m === 'months' ? 'days' : 'months')}
                style={{ ...headerBtnStyle, color: mode === 'months' ? navy : '#0f172a' }}>
                {MONTHS[viewMonth]}
              </button>
              <button type="button"
                onClick={() => setMode(m => m === 'years' ? 'days' : 'years')}
                style={{ ...headerBtnStyle, color: mode === 'years' ? navy : '#0f172a' }}>
                {viewYear}
              </button>
            </div>

            <button type="button" onClick={() => {
              if (mode === 'days')  { let m = viewMonth + 1; let y = viewYear; if (m > 11) { m = 0; y++; } setViewMonth(m); setViewYear(y); }
              if (mode === 'years') setViewYear(y => y + 10);
            }}
              style={{ ...navBtnStyle }}>
              <TbChevronRight size={14} />
            </button>
          </div>

          {/* MONTH PICKER */}
          {mode === 'months' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
              {MONTHS.map((m, i) => (
                <button key={m} type="button"
                  onClick={() => { setViewMonth(i); setMode('days'); }}
                  style={{
                    height: 36, borderRadius: 10, border: '1px solid',
                    fontSize: 12, fontWeight: 800, cursor: 'pointer',
                    borderColor: viewMonth === i ? navy : '#e2e8f0',
                    background:  viewMonth === i ? navy : '#f8fafc',
                    color:       viewMonth === i ? '#fff' : '#0f172a',
                  }}>
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* YEAR PICKER */}
          {mode === 'years' && (
            <>
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8 }}>
                {yearRange[0] + 1} – {yearRange[yearRange.length - 2]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {yearRange.map(y => {
                  const isCurrent = y === viewYear;
                  const isEdge    = y === yearRange[0] || y === yearRange[yearRange.length - 1];
                  return (
                    <button key={y} type="button"
                      onClick={() => { setViewYear(y); setMode('days'); }}
                      style={{
                        height: 38, borderRadius: 10, border: '1px solid',
                        fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        borderColor: isCurrent ? navy : '#e2e8f0',
                        background:  isCurrent ? navy : '#f8fafc',
                        color: isCurrent ? '#fff' : isEdge ? '#94a3b8' : '#0f172a',
                        opacity: isEdge ? 0.5 : 1,
                      }}>
                      {y}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* DAY PICKER */}
          {mode === 'days' && (
            <>
              {/* Week headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
                {DAYS_ABBR.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 900, color: '#94a3b8', padding: '4px 0' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                {cells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const dayStr   = toYMD(new Date(viewYear, viewMonth, day));
                  const isSel    = selected && toYMD(selected) === dayStr;
                  const isToday  = dayStr === todayStr;
                  return (
                    <button key={day} type="button"
                      onClick={() => selectDay(day)}
                      style={{
                        height: 34, borderRadius: 8,
                        border: isToday && !isSel ? `1px solid ${navy}` : '1px solid transparent',
                        background: isSel ? navy : 'transparent',
                        color: isSel ? '#fff' : isToday ? navy : '#0f172a',
                        fontSize: 13, fontWeight: isSel || isToday ? 900 : 700,
                        cursor: 'pointer',
                        transition: 'background 120ms',
                      }}
                      onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <button type="button"
                  onClick={() => { const t = new Date(); onChange(toYMD(t)); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); setOpen(false); }}
                  style={{
                    border: 0, background: 'transparent', color: navy,
                    fontSize: 12, fontWeight: 900, cursor: 'pointer', textDecoration: 'underline',
                  }}>
                  Hoy
                </button>
              </div>
            </>
          )}

</div>
        </>,
        document.body
      )}
    </>
  );
}

/* shared button styles */
const navBtnStyle = {
  width: 30, height: 30, borderRadius: 8,
  border: '1px solid #e2e8f0', background: '#f8fafc',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0, color: '#475569',
};
const headerBtnStyle = {
  height: 30, padding: '0 10px', borderRadius: 8,
  border: '1px solid transparent', background: 'transparent',
  fontSize: 14, fontWeight: 900, cursor: 'pointer',
  transition: 'background 120ms, color 120ms',
};