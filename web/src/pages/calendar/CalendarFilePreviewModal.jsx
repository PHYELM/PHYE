import React from "react";
import { createPortal } from "react-dom";

export default function CalendarFilePreviewModal({ file, onClose }) {
  if (!file) return null;

  // Soporta ambos formatos: {file_type, file_url, file_name} y {type, dataUrl, name}
  const name     = file.file_name || file.name || "Archivo";
  const url      = file.file_url  || file.dataUrl || "";
  const rawType  = String(file.file_type || file.type || "").toLowerCase();

  const isImage = rawType.startsWith("image/") || rawType.includes("image");
  const isPdf   = rawType.includes("pdf");

  return createPortal(
    <div
      className="calModalBack"
      style={{ zIndex: 999999 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="calModal"
        style={{ width: "min(1100px, 96vw)", display: "flex", flexDirection: "column", maxHeight: "calc(100dvh - 40px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="calModalHead" style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {/* Ícono según tipo */}
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: isImage ? "rgba(26,115,232,0.08)" : isPdf ? "rgba(217,48,37,0.08)" : "rgba(26,115,232,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isImage ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isImage ? "#1a73e8" : "#d93025"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              ) : isPdf ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d93025" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              )}
            </div>
            <div className="calModalTitle" style={{ fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {/* Botón descargar */}
            {url && (
              <a href={url} download={name}
                style={{
                  height: 32, borderRadius: 20, border: "1px solid var(--cal-line)",
                  background: "#fff", color: "var(--cal-text)", fontSize: 13,
                  fontWeight: 500, padding: "0 12px", display: "flex", alignItems: "center",
                  gap: 5, textDecoration: "none", cursor: "pointer",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Descargar
              </a>
            )}
            <button className="calModalClose" type="button" onClick={onClose}
              style={{ width: 32, height: 32, fontSize: 16 }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, background: "#f8f9fa", position: "relative" }}>
          {isImage && url ? (
            <img src={url} alt={name} style={{
              width: "100%", height: "100%", objectFit: "contain",
              display: "block", background: "#f1f3f4",
              minHeight: "min(70dvh, 700px)",
            }} />
          ) : (url) ? (
            <iframe src={url} title={name} style={{
              width: "100%", border: 0,
              height: "min(80dvh, 860px)", display: "block",
            }} />
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: 40, gap: 12,
              color: "var(--cal-soft)", minHeight: 200,
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div style={{ fontSize: 14 }}>No hay vista previa disponible para este archivo.</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}