import React, { useEffect, useMemo, useState } from "react";
import { formatDateTimeEs } from "./calendar.helpers";
import CalendarFilePreviewModal from "./CalendarFilePreviewModal";
import Swal from "sweetalert2";

export default function CalendarEventDetailsModal({
  open,
  event,
  viewer,
  onClose,
  onEdit,
  onDelete,
  onComment,
  onDeleteComment,
  onEditComment,
  onPreviewFile,
  canManageCalendar,
}) {
  const [comment, setComment] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [optimisticComments, setOptimisticComments] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingText, setEditingText] = useState("");

  const isDirection = useMemo(() =>
    String(viewer?.department?.name || "").trim().toUpperCase() === "DIRECCION",
    [viewer]
  );

  const isCreator = useMemo(() =>
    String(viewer?.id || "") === String(event?.created_by || ""),
    [viewer, event]
  );



  const canEditComment = (item) =>
    isDirection || String(viewer?.id || "") === String(item.worker?.id || item.worker_id || "");
const canEdit = canManageCalendar || isCreator;

  // Cierra con ESC o click fuera
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, comment]);

  const handleClose = () => {
    if (comment.trim()) {
      Swal.fire({
        title: "¿Salir sin enviar?",
        text: "Tienes un comentario sin enviar. Se perderá si cierras.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d93025",
        cancelButtonColor: "#1a73e8",
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Seguir editando",
      }).then((result) => {
        if (result.isConfirmed) {
          setComment("");
          onClose();
        }
      });
      return;
    }
    onClose();
  };

  if (!open || !event) return null;


const accentColor =
    event.creator?.department?.color ||
    event.color ||
    event.departments?.[0]?.color ||
    "#1a73e8";

  const handleComment = async () => {
    if (!comment.trim() || sending) return;
    const text = comment.trim();
    setComment("");
    setSending(true);

    const tempComment = {
      _tempId: `temp_${Date.now()}`,
      _pending: true,
      comment: text,
      created_at: new Date().toISOString(),
      worker: viewer,
    };
    setOptimisticComments((prev) => [...(prev ?? event.comments ?? []), tempComment]);

    try {
      await onComment(text);
    } finally {
      setSending(false);
      setOptimisticComments(null);
    }
  };

const handleDeleteComment = async (commentId) => {
    const result = await Swal.fire({
      title: "¿Eliminar comentario?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d93025",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      borderRadius: "12px",
    });
    if (!result.isConfirmed) return;
    await onDeleteComment(commentId);
  };
  const handleSaveEditComment = async (commentId) => {
    if (!editingText.trim()) return;
    await onEditComment(commentId, editingText.trim());
    setEditingCommentId(null);
    setEditingText("");
  };

  const displayComments = optimisticComments ?? event.comments ?? [];

  return (
    <>
<div className="calModalBack"
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
        <div className="calModal" style={{
          display: "flex", flexDirection: "column",
          maxHeight: "calc(100dvh - 40px)", overflow: "hidden",
        }}>

          {/* ── Hero con acento ── */}
          <div style={{
            background: `linear-gradient(135deg, ${accentColor}14 0%, ${accentColor}06 100%)`,
            borderBottom: `1px solid ${accentColor}28`,
            padding: "20px 24px 16px",
            position: "relative", flexShrink: 0,
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accentColor, borderRadius: "12px 12px 0 0" }} />

            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
              <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.4px", color: "var(--cal-text)", lineHeight: 1.2, wordBreak: "break-word", flex: 1, minWidth: 0 }}>
                {event.title}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
{canEdit && (
                  <>
                    <button type="button" onClick={onEdit} title="Editar evento"
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(26,115,232,0.2)", background: "rgba(26,115,232,0.06)", color: "#1a73e8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 140ms" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(26,115,232,0.14)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(26,115,232,0.06)"}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button type="button" title="Eliminar evento"
                      onClick={async () => {
                        const result = await Swal.fire({
                          title: "¿Eliminar evento?",
                          text: "Esta acción no se puede deshacer.",
                          icon: "warning",
                          showCancelButton: true,
                          confirmButtonColor: "#d93025",
                          cancelButtonColor: "#6b7280",
                          confirmButtonText: "Sí, eliminar",
                          cancelButtonText: "Cancelar",
                        });
                        if (result.isConfirmed) onDelete(event.id);
                      }}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid rgba(217,48,37,0.2)", background: "rgba(217,48,37,0.06)", color: "#d93025", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 140ms" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(217,48,37,0.14)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "rgba(217,48,37,0.06)"}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </>
                )}
<button className="calModalClose" type="button" onClick={handleClose}
                  style={{ width: 32, height: 32, fontSize: 16 }}>✕</button>
              </div>
            </div>

<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {/* Visibilidad */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 500, color: "var(--cal-text)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor, flexShrink: 0, display: "inline-block" }} />
                {event.visibility === "PRIVATE" ? "Privado" : "Público"}
              </span>
              {/* Inicio */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 500, color: "var(--cal-text)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatDateTimeEs(event.starts_at)}
              </span>
              {/* Fin */}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 500, color: "var(--cal-text)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0f9d58" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {formatDateTimeEs(event.ends_at)}
              </span>
              {/* Ubicación */}
              {event.location && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 500, color: "var(--cal-text)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d93025" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  {event.location}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${accentColor}22` }}>
              {event.creator?.profile_photo_url ? (
                <img src={event.creator.profile_photo_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${accentColor}40` }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                  {(event.creator?.full_name || event.creator?.username || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cal-text)", lineHeight: 1.2 }}>
                  {event.creator?.full_name || event.creator?.username || "Usuario"}
                </div>
                <div style={{ fontSize: 11, color: "var(--cal-soft)", marginTop: 1 }}>
                  {event.creator?.level?.name || "—"} · {event.creator?.department?.name || "—"} · Creado {formatDateTimeEs(event.created_at)}
                </div>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

            {event.description && (
              <div>
                <div className="calLabel" style={{ marginBottom: 6 }}>Descripción</div>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "#f8f9fa", border: "1px solid var(--cal-line)", fontSize: 14, lineHeight: 1.5 }}>
                  {event.description}
                </div>
              </div>
            )}

            {(event.departments || []).length > 0 && (
              <div>
                <div className="calLabel" style={{ marginBottom: 6 }}>Departamentos afectados</div>
                <div className="calChipList">
                  {event.departments.map((dept) => (
                    <span key={dept.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 16, background: `${dept.color || accentColor}18`, border: `1px solid ${dept.color || accentColor}40`, fontSize: 13, fontWeight: 500, color: dept.color || accentColor }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dept.color || accentColor, flexShrink: 0 }} />
                      {dept.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(event.workers || []).length > 0 && (
              <div>
                <div className="calLabel" style={{ marginBottom: 6 }}>Trabajadores incluidos</div>
                <div className="calChipList">
                  {event.workers.map((worker) => (
                    <span className="calChip" key={worker.id}>{worker.full_name || worker.username}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Documentos */}
            <div>
              <div className="calLabel" style={{ marginBottom: 6 }}>Documentos</div>
              {(event.files || []).length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--cal-muted)", padding: "8px 0" }}>No hay archivos adjuntos.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8 }}>
                  {event.files.map((file) => {
                    const isImg = String(file.file_type || "").startsWith("image/");
                    return (
                      <div key={file.id} style={{ position: "relative", borderRadius: 10, border: "1px solid var(--cal-line)", background: "#f8f9fa", overflow: "hidden", aspectRatio: "1", cursor: "pointer" }}
                        onClick={() => setPreviewFile({ file_name: file.file_name, file_url: file.file_url, file_type: file.file_type || "" })}>
                        {isImg
                          ? <img src={file.file_url} alt={file.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 4 }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--cal-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              <span style={{ fontSize: 9, fontWeight: 600, color: "var(--cal-soft)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90%" }}>{file.file_name}</span>
                            </div>
                        }
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 150ms" }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Comentarios ── */}
            <div>
              <div className="calLabel" style={{ marginBottom: 10 }}>Comentarios</div>

              {/* Input */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--cal-line)", background: "#fff", boxShadow: "0 1px 3px rgba(60,64,67,0.08)", marginBottom: 14 }}>
                <div style={{ flexShrink: 0, paddingTop: 2 }}>
                  {viewer?.profile_photo_url ? (
                    <img src={viewer.profile_photo_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>
                      {(viewer?.full_name || viewer?.username || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cal-text)" }}>{viewer?.full_name || viewer?.username || "Usuario"}</span>
                    <span style={{ fontSize: 11, color: "var(--cal-muted)" }}>
                      {[viewer?.level?.name, viewer?.department?.name].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe un comentario..."
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleComment(); } }}
                    style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", resize: "none", fontSize: 14, lineHeight: 1.5, color: "var(--cal-text)", background: "transparent", fontFamily: "inherit", minHeight: 60, padding: 0 }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--cal-line)" }}>
                    <span style={{ fontSize: 11, color: "var(--cal-muted)" }}>Ctrl+Enter para enviar</span>
                    <button className="calBtn isPrimary" type="button"
                      disabled={!comment.trim() || sending} onClick={handleComment}
                      style={{ height: 30, padding: "0 14px", fontSize: 13, opacity: (!comment.trim() || sending) ? 0.6 : 1 }}>
                      {sending ? "Enviando..." : "Comentar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displayComments.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--cal-muted)", padding: "8px 0" }}>No hay comentarios todavía.</div>
                ) : (
                  [...displayComments].reverse().map((item) => {
                    const deptColor = item.worker?.department?.color || accentColor;
                    const isOwner = canEditComment(item);
                    const isEditing = editingCommentId === item.id;

                    return (
                      <div key={item.id || item._tempId} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", borderRadius: 12, border: `1px solid ${deptColor}22`, background: `linear-gradient(135deg, ${deptColor}08 0%, #ffffff 100%)`, boxShadow: `0 2px 8px ${deptColor}12, 0 1px 2px rgba(0,0,0,0.04)`, opacity: item._pending ? 0.7 : 1, transition: "opacity 200ms" }}>
                        {/* Avatar */}
                        <div style={{ flexShrink: 0 }}>
                          {item.worker?.profile_photo_url ? (
                            <img src={item.worker.profile_photo_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: `2px solid ${deptColor}40` }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${deptColor}, ${deptColor}bb)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, border: `2px solid ${deptColor}40` }}>
                              {(item.worker?.full_name || item.worker?.username || "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--cal-text)" }}>
                                {item.worker?.full_name || item.worker?.username || "Usuario"}
                              </span>
                              {(item.worker?.level?.name || item.worker?.department?.name) && (
                                <span style={{ fontSize: 11, color: "#fff", fontWeight: 500, padding: "1px 7px", borderRadius: 10, background: deptColor }}>
                                  {item.worker?.level?.name || item.worker?.department?.name}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, color: "var(--cal-muted)", whiteSpace: "nowrap" }}>
                                {item._pending ? "Enviando..." : formatDateTimeEs(item.created_at)}
                              </span>
                              {/* Acciones editar/eliminar */}
{isOwner && !item._pending && (
                                <div style={{ display: "flex", gap: 3 }}>
                                  <button type="button" title="Editar comentario"
                                    onClick={() => { setEditingCommentId(item.id); setEditingText(item.comment); }}
                                    style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "transparent", color: "#1a73e8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 140ms" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(26,115,232,0.10)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                    </svg>
                                  </button>
                                  <button type="button" title="Eliminar comentario"
                                    onClick={() => handleDeleteComment(item.id)}
                                    style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "transparent", color: "#d93025", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 140ms" }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(217,48,37,0.10)"}
                                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                      <path d="M10 11v6"/><path d="M14 11v6"/>
                                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Texto o editor */}
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSaveEditComment(item.id); } if (e.key === "Escape") { setEditingCommentId(null); setEditingText(""); } }}
                                style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--cal-line)", borderRadius: 8, outline: "none", resize: "none", fontSize: 14, lineHeight: 1.5, color: "var(--cal-text)", background: "#fff", fontFamily: "inherit", minHeight: 60, padding: "8px 10px" }} />
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button type="button" className="calBtn"
                                  onClick={() => { setEditingCommentId(null); setEditingText(""); }}
                                  style={{ height: 28, padding: "0 10px", fontSize: 12 }}>Cancelar</button>
                                <button type="button" className="calBtn isPrimary"
                                  onClick={() => handleSaveEditComment(item.id)}
                                  style={{ height: 28, padding: "0 10px", fontSize: 12 }}>Guardar</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--cal-text)", wordBreak: "break-word" }}>
                              {item.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {previewFile && (
        <CalendarFilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </>
  );
}