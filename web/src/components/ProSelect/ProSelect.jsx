import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ProSelect.css";

function getOptionsFromChildren(children) {
  const out = [];
  React.Children.forEach(children, (ch) => {
    if (!React.isValidElement(ch)) return;
    if (String(ch.type).toLowerCase() !== "option") return;
    out.push({
      value: ch.props.value ?? "",
      label: ch.props.children ?? "",
      disabled: !!ch.props.disabled,
    });
  });
  return out;
}

export default function ProSelect({
  value,
  onChange,
  children,
  className = "",
  style,
  disabled,
  ariaLabel,
  placeholder = "Seleccionar...",
  searchable = true, // ✅ type-to-search
}) {
  const options = useMemo(() => getOptionsFromChildren(children), [children]);

  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 220, origin: "top" });

  const [activeIndex, setActiveIndex] = useState(-1);
  const [typeBuf, setTypeBuf] = useState("");
  const typeTimer = useRef(null);

  const selectedIndex = useMemo(() => {
    const i = options.findIndex((o) => String(o.value) === String(value));
    return i;
  }, [options, value]);

  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex]?.label : "";

  const openMenu = () => {
    if (disabled) return;
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setTypeBuf("");
    setActiveIndex(-1);
  };

  // posicionar en portal
  useEffect(() => {
    if (!open) return;
    const b = btnRef.current;
    if (!b) return;

    const r = b.getBoundingClientRect();
    const margin = 8;
    const width = Math.max(220, Math.round(r.width));

    // estimación altura menú
    const estRow = 38;
    const estMaxRows = Math.min(options.length, 7);
    const estHeight = estRow * estMaxRows + 10;

    let left = Math.round(r.left);
    let top = Math.round(r.bottom + margin);
    let origin = "top";

    if (top + estHeight > window.innerHeight - 10) {
      top = Math.round(r.top - margin);
      origin = "bottom";
    }

    setPos({ top, left, width, origin });

    // set active al seleccionado (o primero habilitado)
    const startIdx =
      selectedIndex >= 0 && !options[selectedIndex]?.disabled
        ? selectedIndex
        : options.findIndex((o) => !o.disabled);
    setActiveIndex(startIdx);
  }, [open, options, selectedIndex]);

  // cerrar al click afuera
  useEffect(() => {
    function onDown(e) {
      if (!open) return;
      const b = btnRef.current;
      const m = menuRef.current;
      if (b && b.contains(e.target)) return;
      if (m && m.contains(e.target)) return;
      closeMenu();
    }
    if (open) window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // teclado global cuando está abierto
  useEffect(() => {
    function onKey(e) {
      if (!open) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu();
        btnRef.current?.focus();
        return;
      }

      const enabledIndexes = options
        .map((o, i) => ({ o, i }))
        .filter((x) => !x.o.disabled)
        .map((x) => x.i);

      if (enabledIndexes.length === 0) return;

      const cur = activeIndex >= 0 ? activeIndex : enabledIndexes[0];
      const curPos = enabledIndexes.indexOf(cur);

      const moveTo = (idx) => {
        setActiveIndex(idx);
        // scroll into view
        requestAnimationFrame(() => {
          const node = menuRef.current?.querySelector(`[data-idx="${idx}"]`);
          node?.scrollIntoView?.({ block: "nearest" });
        });
      };

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = enabledIndexes[Math.min(enabledIndexes.length - 1, curPos + 1)];
        moveTo(next);
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = enabledIndexes[Math.max(0, curPos - 1)];
        moveTo(prev);
        return;
      }

      if (e.key === "Home") {
        e.preventDefault();
        moveTo(enabledIndexes[0]);
        return;
      }

      if (e.key === "End") {
        e.preventDefault();
        moveTo(enabledIndexes[enabledIndexes.length - 1]);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const opt = options[cur];
        if (!opt || opt.disabled) return;
        onChange?.({ target: { value: opt.value } });
        closeMenu();
        btnRef.current?.focus();
        return;
      }

      // type-to-search
      if (searchable && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ch = e.key.toLowerCase();
        const nextBuf = (typeBuf + ch).slice(0, 40);
        setTypeBuf(nextBuf);

        if (typeTimer.current) clearTimeout(typeTimer.current);
        typeTimer.current = setTimeout(() => setTypeBuf(""), 650);

        const start = curPos >= 0 ? curPos : 0;

        const findFrom = (from) => {
          for (let k = 0; k < enabledIndexes.length; k++) {
            const idx = enabledIndexes[(from + k) % enabledIndexes.length];
            const lab = String(options[idx]?.label ?? "").toLowerCase();
            if (lab.startsWith(nextBuf)) return idx;
          }
          return -1;
        };

        const hit = findFrom(start);
        if (hit >= 0) moveTo(hit);
      }
    }

    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, options, activeIndex, onChange, typeBuf, searchable]);

  const handleBtnKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openMenu();
    }
  };

  const selectIndex = (idx) => {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange?.({ target: { value: opt.value } });
    closeMenu();
    btnRef.current?.focus();
  };

  return (
    <div className={`proSelectWrap ${disabled ? "isDisabled" : ""} ${className}`} style={style}>
      <button
        ref={btnRef}
        type="button"
        className={`proSelectBtn ${open ? "isOpen" : ""}`}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleBtnKeyDown}
        aria-label={ariaLabel || "select"}
        aria-haspopup="listbox"
        aria-expanded={open ? "true" : "false"}
        disabled={disabled}
      >
        <span className={`proSelectValue ${selectedLabel ? "" : "isPlaceholder"}`}>
          {selectedLabel || placeholder}
        </span>
        <span className="proSelectArrow" aria-hidden="true">▾</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              className={`proSelectMenu ${pos.origin === "bottom" ? "fromBottom" : "fromTop"}`}
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              role="listbox"
              aria-label={ariaLabel || "select-options"}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="proSelectMenuInner">
                {options.map((opt, idx) => {
                  const isSel = String(opt.value) === String(value);
                  const isActive = idx === activeIndex;

                  return (
                    <button
                      key={`${String(opt.value)}-${idx}`}
                      type="button"
                      className={`proSelectItem ${isSel ? "isSelected" : ""} ${isActive ? "isActive" : ""}`}
                      disabled={opt.disabled}
                      data-idx={idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => selectIndex(idx)}
                      role="option"
                      aria-selected={isSel ? "true" : "false"}
                      title={String(opt.label)}
                    >
                      <span className="proSelectItemLabel">{opt.label}</span>
                      {isSel ? <span className="proSelectCheck">✓</span> : <span className="proSelectCheck" />}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}