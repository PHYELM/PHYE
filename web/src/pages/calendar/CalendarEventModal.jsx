import React, { useEffect, useMemo, useRef, useState } from "react";
import ProSelect from "../../components/ProSelect/ProSelect";
import FilePreviewModal from "./CalendarFilePreviewModal";
import { TbEye, TbFile } from "react-icons/tb";
import Swal from "sweetalert2";
export default function CalendarEventModal({
  open,
  onClose,
  onSave,
  worker,
  viewer,
  departments,
  workers,
  initialEvent,
}) {
  const [form, setForm] = useState(() => {
    const existingFiles = Array.isArray(initialEvent?.files) ? initialEvent.files : [];
const deptIds = Array.isArray(initialEvent?.department_ids)
  ? initialEvent.department_ids
  : Array.isArray(initialEvent?.departments)
  ? initialEvent.departments.map((d) => d.id).filter(Boolean)
  : [];

const workerIds = Array.isArray(initialEvent?.worker_ids)
  ? initialEvent.worker_ids
  : Array.isArray(initialEvent?.workers)
  ? initialEvent.workers.map((w) => w.id).filter(Boolean)
  : [];
    return {
      id: initialEvent?.id || "",
      title: initialEvent?.title || "",
      description: initialEvent?.description || "",
      location: initialEvent?.location || "",
      visibility: initialEvent?.visibility || "PUBLIC",
      starts_at: initialEvent?.starts_at || "",
      ends_at: initialEvent?.ends_at || "",
      all_day: !!initialEvent?.all_day,
      department_ids: deptIds,
      worker_ids: workerIds,
      files: [],
      existing_files: existingFiles,
      removed_file_ids: [],
    };
  });

  const [deptSelect, setDeptSelect] = useState("");
  const [workerSelect, setWorkerSelect] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );

  const workerOptions = useMemo(
    () => workers.map((w) => ({ value: w.id, label: w.full_name || w.username })),
    [workers]
  );

  const creatorName = viewer?.full_name || worker?.full_name || worker?.username || "Usuario";
  const creatorDept = viewer?.department?.name || worker?.department_name || "—";
  const creatorAvatar = viewer?.profile_photo_url || worker?.profile_photo_url || "";

  const addDepartment = () => {
    if (!deptSelect) return;
    if (form.department_ids.includes(deptSelect)) return;
    setForm((prev) => ({ ...prev, department_ids: [...prev.department_ids, deptSelect] }));
    setDeptSelect("");
  };

  const addWorker = () => {
    if (!workerSelect) return;
    if (form.worker_ids.includes(workerSelect)) return;
    setForm((prev) => ({ ...prev, worker_ids: [...prev.worker_ids, workerSelect] }));
    setWorkerSelect("");
  };

  const removeDepartment = (id) =>
    setForm((prev) => ({ ...prev, department_ids: prev.department_ids.filter((x) => x !== id) }));

  const removeWorker = (id) =>
    setForm((prev) => ({ ...prev, worker_ids: prev.worker_ids.filter((x) => x !== id) }));

  const removeExistingFile = (fileId) =>
    setForm((prev) => ({
      ...prev,
      existing_files: prev.existing_files.filter((f) => f.id !== fileId),
      removed_file_ids: [...prev.removed_file_ids, fileId],
    }));

  const handleNewFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    const current = Array.isArray(form.files) ? form.files : [];
    const slots = 5 - (Array.isArray(form.existing_files) ? form.existing_files.length : 0);
    const merged = [...current, ...picked].slice(0, Math.max(0, slots));
    setForm((prev) => ({ ...prev, files: merged }));
    e.target.value = "";
  };

  const removeNewFile = (index) =>
    setForm((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }));

const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave(form);
      await Swal.fire({
        title: form.id ? "¡Evento actualizado!" : "¡Evento creado!",
        text: form.id ? "Los cambios se guardaron correctamente." : "Tu evento fue creado correctamente.",
        icon: "success",
        timer: 1800,
        timerProgressBar: true,
        showConfirmButton: false,
        position: "top-end",
        toast: true,
      });
    } catch {
      Swal.fire({
        title: "Error",
        text: "No se pudo guardar el evento. Intenta de nuevo.",
        icon: "error",
        confirmButtonColor: "#1a73e8",
        confirmButtonText: "Entendido",
      });
    } finally {
      setSaving(false);
    }
  };
// Detecta si el form tiene cambios respecto al estado inicial
  const isDirty =
    form.title.trim() !== "" ||
    form.description.trim() !== "" ||
    form.location.trim() !== "" ||
    form.department_ids.length > 0 ||
    form.worker_ids.length > 0 ||
    form.files.length > 0;

  const handleClose = () => {
    if (isDirty) {
      Swal.fire({
        title: "¿Descartar cambios?",
        text: "Tienes información sin guardar. Se perderá si cierras.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d93025",
        cancelButtonColor: "#1a73e8",
        confirmButtonText: "Sí, descartar",
        cancelButtonText: "Seguir editando",
      }).then((result) => {
        if (result.isConfirmed) onClose();
      });
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isDirty]);

  // early return DESPUÉS de todos los hooks
  if (!open) return null;


  const existingCount = (form.existing_files || []).length;
  const newCount = (form.files || []).length;
  const totalFiles = existingCount + newCount;
  const slotsLeft = 5 - totalFiles;

return (
    <div className="calModalBack"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="calModal">

        {/* ── Header ── */}
        <div className="calModalHead">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <div className="calModalTitle">
              {form.id ? "Editar evento" : "Nuevo evento"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--cal-soft)" }}>
              {creatorAvatar ? (
                <img src={creatorAvatar} alt="avatar"
                  style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg,#1a73e8,#4285f4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 10, fontWeight: 700,
                }}>
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              <span style={{ fontWeight: 500, color: "var(--cal-text)" }}>{creatorName}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{creatorDept}</span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>{new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
<button className="calModalClose" type="button" onClick={handleClose}>✕</button>
        </div>

        {/* ── Form ── */}
        <form onSubmit={submit}>
          <div className="calModalBody">
            <div className="calFormGrid">

              {/* Título */}
              <div className="calField full">
                <input
                  className="calTitleInput"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Añade un título"
                  required
                />
              </div>

              {/* Inicio */}
              <div className="calField">
                <div className="calLabel">Inicio</div>
                <input className="calDateInput" type="datetime-local" value={form.starts_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))} required />
              </div>

              {/* Fin */}
              <div className="calField">
                <div className="calLabel">Fin</div>
                <input className="calDateInput" type="datetime-local" value={form.ends_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, ends_at: e.target.value }))} required />
              </div>

              {/* Ubicación */}
              <div className="calField">
                <div className="calLabel">Ubicación</div>
                <input className="calInput" value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="Añadir ubicación" />
              </div>

              {/* Visibilidad */}
              <div className="calField">
                <div className="calLabel">Visibilidad</div>
                <select className="calNativeSelect" value={form.visibility}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibility: e.target.value }))}>
                  <option value="PUBLIC">Público</option>
                  <option value="PRIVATE">Privado</option>
                </select>
              </div>

              {/* Descripción */}
              <div className="calField full">
                <div className="calLabel">Descripción</div>
                <textarea className="calTextarea" value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Añadir descripción" />
              </div>

              {/* Departamentos */}
              <div className="calField full">
                <div className="calLabel">Departamentos incluidos</div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10 }}>
                  <ProSelect value={deptSelect} onChange={(e) => setDeptSelect(e.target.value)}
                    options={departmentOptions} placeholder="Selecciona un departamento" />
                  <button className="calBtn" type="button" onClick={addDepartment}>Agregar</button>
                </div>
                <div className="calChipList">
                  {form.department_ids.map((id) => {
                    const found = departments.find((d) => d.id === id);
                    if (!found) return null;
                    return (
                      <span className="calChip" key={id}>
                        {found.name}
                        <button type="button" onClick={() => removeDepartment(id)}>✕</button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Trabajadores */}
              <div className="calField full">
                <div className="calLabel">Trabajadores incluidos</div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10 }}>
                  <ProSelect value={workerSelect} onChange={(e) => setWorkerSelect(e.target.value)}
                    options={workerOptions} placeholder="Selecciona un trabajador" />
                  <button className="calBtn" type="button" onClick={addWorker}>Agregar</button>
                </div>
                <div className="calChipList">
                  {form.worker_ids.map((id) => {
                    const found = workers.find((w) => w.id === id);
                    if (!found) return null;
                    return (
                      <span className="calChip" key={id}>
                        {found.full_name || found.username}
                        <button type="button" onClick={() => removeWorker(id)}>✕</button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* ── Archivos ── */}
              <div className="calField full">
                <div className="calLabel">Archivos adjuntos (máximo 5)</div>

                {/* Grid de thumbnails */}
                {totalFiles > 0 && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
                    gap: 8, marginBottom: 10,
                  }}>
                    {/* Archivos del servidor */}
                    {(form.existing_files || []).map((file) => {
                      const isImg = String(file.file_type || "").startsWith("image/");
                      return (
                        <div key={file.id} style={{
                          position: "relative", borderRadius: 10,
                          border: "1px solid var(--cal-line)", background: "#f8f9fa",
                          overflow: "hidden", aspectRatio: "1", cursor: "pointer",
                        }}
                          onClick={() => setPreviewFile({ name: file.file_name, dataUrl: file.file_url, type: file.file_type || "" })}
                        >
                          {isImg
                            ? <img src={file.file_url} alt={file.file_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                <TbFile size={22} style={{ color: "var(--cal-blue)" }} />
                                <span style={{ fontSize: 9, fontWeight: 600, color: "var(--cal-soft)", textAlign: "center", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90%" }}>{file.file_name}</span>
                              </div>
                          }
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 150ms" }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                            <TbEye size={20} style={{ color: "#fff" }} />
                          </div>
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); removeExistingFile(file.id); }}
                            style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                        </div>
                      );
                    })}

                    {/* Archivos nuevos */}
                    {(form.files || []).map((file, index) => {
                      const isImg = String(file.type || "").startsWith("image/");
                      const localUrl = isImg ? URL.createObjectURL(file) : null;
                      return (
                        <div key={`new-${file.name}-${index}`} style={{
                          position: "relative", borderRadius: 10,
                          border: "1.5px solid rgba(26,115,232,0.25)", background: "#f0f4ff",
                          overflow: "hidden", aspectRatio: "1", cursor: isImg ? "pointer" : "default",
                        }}
                          onClick={() => {
                            if (!isImg) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => setPreviewFile({ name: file.name, dataUrl: ev.target.result, type: file.type || "" });
                            reader.readAsDataURL(file);
                          }}
                        >
                          {isImg && localUrl
                            ? <img src={localUrl} alt={file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                                <TbFile size={22} style={{ color: "var(--cal-blue)" }} />
                                <span style={{ fontSize: 9, fontWeight: 600, color: "var(--cal-soft)", textAlign: "center", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "90%" }}>{file.name}</span>
                              </div>
                          }
                          {isImg && (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 150ms" }}
                              onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                              onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                              <TbEye size={20} style={{ color: "#fff" }} />
                            </div>
                          )}
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); removeNewFile(index); }}
                            style={{ position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.55)", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Drop zone */}
                {slotsLeft > 0 && (
                  <label htmlFor="cal-file-upload"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(26,115,232,0.6)"; e.currentTarget.style.background = "#eef3ff"; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = "rgba(26,115,232,0.3)"; e.currentTarget.style.background = "#f8f9ff"; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = "rgba(26,115,232,0.3)";
                      e.currentTarget.style.background = "#f8f9ff";
                      const picked = Array.from(e.dataTransfer.files || []);
                      const current = Array.isArray(form.files) ? form.files : [];
                      setForm((prev) => ({ ...prev, files: [...current, ...picked].slice(0, slotsLeft + current.length > 5 ? 5 - existingCount : slotsLeft + current.length) }));
                    }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: "28px 20px", borderRadius: 12, border: "1.5px dashed rgba(26,115,232,0.3)", background: "#f8f9ff", cursor: "pointer", transition: "border-color 150ms, background 150ms" }}
                  >
                    <input id="cal-file-upload" ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={handleNewFiles} />
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(26,115,232,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cal-text)" }}>Arrastra archivos aquí</div>
                      <div style={{ fontSize: 12, color: "var(--cal-muted)", marginTop: 2 }}>{slotsLeft} espacio(s) restante(s)</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: "var(--cal-blue)", padding: "4px 14px", borderRadius: 20, border: "1px solid rgba(26,115,232,0.25)", background: "rgba(26,115,232,0.06)" }}>
                      Seleccionar archivos
                    </div>
                  </label>
                )}
              </div>

            </div>
          </div>

          <div className="calModalFoot">
            <button className="calBtn" type="button" onClick={handleClose}>Cancelar</button>
           <button className="calBtn isPrimary" type="submit" disabled={saving}
              style={{ opacity: saving ? 0.7 : 1, transition: "opacity 150ms" }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>

      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </div>
  );
}