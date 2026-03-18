import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch, apiDownload } from "../api";
import ProSelect from "../components/ProSelect/ProSelect";
import FormsResponsesTable from "./FormsResponsesTable";
import FilePreviewModal from "./forms/FilePreviewModal";
import FieldConfigModal from "./forms/FieldConfigModal";
import BuilderSideConfig from "./forms/BuilderSideConfig";
import FormDashboardCard from "./forms/FormDashboardCard";
import {
  renderFieldByType as renderFieldByTypeExternal,
  renderAnswerValue as renderAnswerValueExternal,
} from "./forms/FormFieldRenderer";
import "./FormsModule.css";
import "./FormsModuleBuilderPro.css";
import {
  TbPlus,
  TbTrash,
  TbEye,
  TbSend,
  TbLayoutGrid,
  TbForms,
  TbFileText,
  TbX,
  TbDeviceFloppy,
  TbNotes,
  TbListCheck,
  TbGripVertical,
  TbChevronUp,
  TbChevronDown,
  TbCopy,
  TbFileTypePdf,
  TbFileTypeXls,
} from "react-icons/tb";
import {
  FIELD_LIBRARY,
  ICON_OPTIONS,
  getFormIcon,
  getFieldIcon,
} from "./forms/forms.constants";
import {
  getLocalWorker,
  randomColor,
  createField,
  getContrastTextColor,
  normalizeAnswerValue,
  renderPanelEmptyState,
  scrollToInsertZone,
  createLocalFileId,
  fileToDataUrl,
  buildBlobUrlFromDataUrl,
  toTitleCaseText,
} from "./forms/forms.helpers";

export default function FormsModule({ currentWorker }) {
  const worker = useMemo(() => currentWorker || getLocalWorker(), [currentWorker]);
  const navigate = useNavigate();
  const { formId } = useParams();

  const [catalogs, setCatalogs] = useState({
    departments: [],
    levels: [],
    products: [],
  });
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [layoutFilter, setLayoutFilter] = useState("");
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [viewMode, setViewMode] = useState("dashboard");
  const [answers, setAnswers] = useState([]);
  const [currentAnswerId, setCurrentAnswerId] = useState(null);
  const [currentAnswerMeta, setCurrentAnswerMeta] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openCardMenuId, setOpenCardMenuId] = useState(null);
  const [respondModalOpen, setRespondModalOpen] = useState(false);
  const [respondModalMode, setRespondModalMode] = useState("create");
  const [builder, setBuilder] = useState({
    id: null,
    title: "",
    description: "",
    color: "#2563eb",
    icon: "clipboard",
    cover_url: "",
    layout_mode: "stack",
    settings: { submit_label: "Enviar formulario" },
    fields: [],
    responder_department_ids: [],
    editor_rules: [],
  });

  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [builderInsertIndex, setBuilderInsertIndex] = useState(null);
  const [hoveredInsertIndex, setHoveredInsertIndex] = useState(null);
  const [responderMenuOpen, setResponderMenuOpen] = useState(false);
  const [editorDeptMenuOpen, setEditorDeptMenuOpen] = useState(false);
  const [openFieldConfigId, setOpenFieldConfigId] = useState(null);
  const [draggedFieldId, setDraggedFieldId] = useState(null);
  const [answerState, setAnswerState] = useState({});
  const [filePreviewModal, setFilePreviewModal] = useState(null);
  const [fileDragOverMap, setFileDragOverMap] = useState({});
  const [fileLoadingMap, setFileLoadingMap] = useState({});

  const signatureRefs = useRef({});
  const builderInsertMenuRef = useRef(null);
  const fileInputRefs = useRef({});
  const lastInsertedFieldRef = useRef(null);

  const isDirection = String(worker?.department_name || worker?.department?.name || "")
    .trim()
    .toUpperCase() === "DIRECCION";

  async function loadCatalogs() {
    const resp = await apiFetch(`/api/forms/meta/catalogs`);
    setCatalogs(resp?.data || { departments: [], levels: [], products: [] });
  }

  async function loadForms() {
    if (!worker?.id) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("worker_id", worker.id);
      if (listSearch.trim()) params.set("q", listSearch.trim());
      if (departmentFilter) params.set("department_id", departmentFilter);
      if (layoutFilter) params.set("layout_mode", layoutFilter);

      const resp = await apiFetch(`/api/forms?${params.toString()}`);
      const rows = resp?.data || [];
      setForms(rows);

      if (rows.length && !selectedFormId) {
        setSelectedFormId(rows[0].id);
      }

      if (!rows.some((f) => f.id === selectedFormId)) {
        setSelectedFormId(rows[0]?.id || null);
      }
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudieron cargar los formularios", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadFormDetail(targetFormId, nextMode = "answer") {
    if (!targetFormId || !worker?.id) return;

    try {
      const resp = await apiFetch(`/api/forms/${targetFormId}?worker_id=${worker.id}`);
      const form = resp?.data;

      setSelectedForm(form);
      setSelectedFormId(targetFormId);
      setViewMode(nextMode);

      if (nextMode === "answer") {
        hydrateAnswerState(form);
      }

      if (nextMode === "responses") {
        await loadAnswers(targetFormId);
      }
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo cargar el formulario", "error");
    }
  }

  async function loadAnswers(targetFormId) {
    if (!targetFormId || !worker?.id) return;

    try {
      const resp = await apiFetch(`/api/forms/${targetFormId}/answers?worker_id=${worker.id}`);
      setAnswers(resp?.data || []);
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudieron cargar las respuestas", "error");
    }
  }

  function hydrateAnswerState(form, answerRow = null) {
    const base = {};

    (form?.fields || [])
      .filter((field) => field?.type !== "captcha")
      .forEach((field) => {
        base[field.id] = normalizeAnswerValue(field, answerRow?.answers?.[field.id]);
      });

    setAnswerState(base);
    setCurrentAnswerId(answerRow?.id || null);
    setCurrentAnswerMeta(answerRow || null);
  }

  useEffect(() => {
    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (worker?.id) {
      loadForms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker?.id]);

  useEffect(() => {
    if (!worker?.id) return;
    if (viewMode === "builder") return;

    if (formId) {
      loadFormDetail(formId, "responses");
      return;
    }

      setViewMode("dashboard");
      setSelectedForm(null);
      setSelectedFormId(null);
      setCurrentAnswerId(null);
      setCurrentAnswerMeta(null);
  }, [formId, worker?.id]);

  useEffect(() => {
    function closeCardMenu() {
      setOpenCardMenuId(null);
    }

    document.addEventListener("click", closeCardMenu);
    return () => {
      document.removeEventListener("click", closeCardMenu);
    };
  }, []);

  useEffect(() => {
    if (builderInsertIndex === null) return;

    function handleClickOutside(event) {
      if (!builderInsertMenuRef.current) return;
      if (!builderInsertMenuRef.current.contains(event.target)) {
        setBuilderInsertIndex(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [builderInsertIndex]);

  useEffect(() => {
    if (!openFieldConfigId) {
      document.body.style.overflow = "";
      document.body.classList.remove("gf-config-open");
      return;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpenFieldConfigId(null);
      }
    }

    document.body.style.overflow = "hidden";
    document.body.classList.add("gf-config-open");
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("gf-config-open");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openFieldConfigId]);

  useEffect(() => {
    if (!filePreviewModal) {
      document.body.classList.remove("forms-filePreview-open");
      document.body.style.overflow = "";
      return;
    }

    document.body.classList.add("forms-filePreview-open");
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setFilePreviewModal(null);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.classList.remove("forms-filePreview-open");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [filePreviewModal]);

  useEffect(() => {
    if (!selectedForm?.id || !worker?.id) return;
    if (viewMode === "builder") return;

    const streamUrl = `/api/forms/${selectedForm.id}/answers/stream?worker_id=${worker.id}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = () => {
      loadAnswers(selectedForm.id);
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [selectedForm?.id, worker?.id, viewMode]);

  const selectedField = useMemo(
    () => builder.fields.find((f) => f.id === selectedFieldId) || null,
    [builder.fields, selectedFieldId]
  );

  const CARDS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(forms.length / CARDS_PER_PAGE));

  const paginatedForms = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    const end = start + CARDS_PER_PAGE;
    return forms.slice(start, end);
  }, [forms, currentPage]);

  const paginationLabel = useMemo(() => {
    if (!forms.length) return "0-0 de 0";
    const start = (currentPage - 1) * CARDS_PER_PAGE + 1;
    const end = Math.min(currentPage * CARDS_PER_PAGE, forms.length);
    return `${start}-${end} de ${forms.length}`;
  }, [forms.length, currentPage]);

  function resetBuilder() {
    setBuilder({
      id: null,
      title: "",
      description: "",
      color: randomColor(),
      icon: "clipboard",
      cover_url: "",
      layout_mode: "stack",
      settings: { submit_label: "Enviar formulario" },
      fields: [],
      responder_department_ids: [],
      editor_rules: [],
    });
    setSelectedFieldId(null);
    setBuilderInsertIndex(null);
  }

  function startCreateForm() {
    resetBuilder();
    setBuilderInsertIndex(null);
    setViewMode("builder");
  }

  function startEditForm(form) {
    const groupedRules = (form.editor_rules || []).reduce((acc, rule) => {
      const depId = rule.department_id;
      if (!depId) return acc;

      if (!acc[depId]) {
        acc[depId] = {
          department_id: depId,
          apply_all_levels: false,
          level_ids: [],
        };
      }

      if (!rule.level_id) {
        acc[depId].apply_all_levels = true;
        acc[depId].level_ids = [];
      } else if (!acc[depId].apply_all_levels) {
        acc[depId].level_ids.push(rule.level_id);
      }

      return acc;
    }, {});

    setBuilder({
      id: form.id,
      title: form.title || "",
      description: form.description || "",
      color: form.color || "#2563eb",
      icon: form.icon || "clipboard",
      cover_url: form.cover_url || "",
      layout_mode: "stack",
      settings: form.settings || { submit_label: "Enviar formulario" },
            fields: Array.isArray(form.fields)
        ? form.fields.filter((field) => field?.type !== "captcha")
        : [],
      responder_department_ids: (form.responder_departments || []).map((r) => r.department_id),
      editor_rules: Object.values(groupedRules),
    });

    setSelectedFieldId(form?.fields?.[0]?.id || null);
    setViewMode("builder");
  }

  function addFieldAt(type, insertIndex = builder.fields.length) {
    const nextField = createField(type, builder.fields.length);

    setBuilder((prev) => {
      const nextFields = [...prev.fields];
      const safeIndex = Math.max(0, Math.min(insertIndex, nextFields.length));
      nextFields.splice(safeIndex, 0, nextField);

      return {
        ...prev,
        fields: nextFields,
      };
    });

    setSelectedFieldId(nextField.id);
    setBuilderInsertIndex(null);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const target = document.getElementById(`builder-field-${nextField.id}`);
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      });
    });
  }

  function updateBuilderField(fieldId, patch) {
    setBuilder((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field
      ),
    }));
  }

  function updateBuilderFieldSettings(fieldId, patch) {
    setBuilder((prev) => ({
      ...prev,
      fields: prev.fields.map((field) =>
        field.id === fieldId
          ? { ...field, settings: { ...(field.settings || {}), ...patch } }
          : field
      ),
    }));
  }

  function removeField(fieldId) {
    setBuilder((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId),
    }));

    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  }

  function duplicateField(fieldId) {
    const source = builder.fields.find((f) => f.id === fieldId);
    if (!source) return;

    const copy = {
      ...source,
      id: `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: `${source.label} (copia)`,
      x: Number(source.x || 20) + 26,
      y: Number(source.y || 20) + 26,
    };

    setBuilder((prev) => ({
      ...prev,
      fields: [...prev.fields, copy],
    }));
    setSelectedFieldId(copy.id);
  }

  function moveField(fieldId, direction) {
    const currentIndex = builder.fields.findIndex((field) => field.id === fieldId);
    if (currentIndex === -1) return;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= builder.fields.length) return;

    const nextFields = [...builder.fields];
    [nextFields[currentIndex], nextFields[nextIndex]] = [nextFields[nextIndex], nextFields[currentIndex]];

    setBuilder((prev) => ({
      ...prev,
      fields: nextFields,
    }));
  }

  function handleFieldDragStart(fieldId) {
    setDraggedFieldId(fieldId);
  }

  function handleFieldDrop(targetFieldId) {
    if (!draggedFieldId || draggedFieldId === targetFieldId) {
      setDraggedFieldId(null);
      return;
    }

    const fields = [...builder.fields];
    const draggedIndex = fields.findIndex((field) => field.id === draggedFieldId);
    const targetIndex = fields.findIndex((field) => field.id === targetFieldId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedFieldId(null);
      return;
    }

    const [draggedItem] = fields.splice(draggedIndex, 1);
    fields.splice(targetIndex, 0, draggedItem);

    setBuilder((prev) => ({
      ...prev,
      fields,
    }));

    setDraggedFieldId(null);
  }

  function changeFieldType(fieldId, nextType) {
    setBuilder((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => {
        if (field.id !== fieldId) return field;
        const template = createField(nextType, 0);
        return {
          ...field,
          type: nextType,
          placeholder: template.placeholder,
          options: template.options,
          settings: template.settings,
          w: template.w,
          h: template.h,
        };
      }),
    }));
  }

  function addOption() {
    if (!selectedField) return;

    updateBuilderField(selectedField.id, {
      options: [...(selectedField.options || []), `Opción ${(selectedField.options || []).length + 1}`],
    });
  }

  function updateOption(index, value) {
    if (!selectedField) return;
    const next = [...(selectedField.options || [])];
    next[index] = value;
    updateBuilderField(selectedField.id, { options: next });
  }

  function removeOption(index) {
    if (!selectedField) return;
    const next = [...(selectedField.options || [])];
    next.splice(index, 1);
    updateBuilderField(selectedField.id, { options: next });
  }

  function toggleResponderDepartment(depId) {
    setBuilder((prev) => {
      const exists = prev.responder_department_ids.includes(depId);

      return {
        ...prev,
        responder_department_ids: exists
          ? prev.responder_department_ids.filter((id) => id !== depId)
          : [...prev.responder_department_ids, depId],
      };
    });
  }

  function addEditorRule() {
    setBuilder((prev) => ({
      ...prev,
      editor_rules: [...prev.editor_rules, { department_id: "", apply_all_levels: true, level_ids: [] }],
    }));
  }

  function updateEditorRule(index, patch) {
    setBuilder((prev) => ({
      ...prev,
      editor_rules: prev.editor_rules.map((rule, i) => {
        if (i !== index) return rule;
        return { ...rule, ...patch };
      }),
    }));
  }

  function removeEditorRule(index) {
    setBuilder((prev) => ({
      ...prev,
      editor_rules: prev.editor_rules.filter((_, i) => i !== index),
    }));
  }

  function toggleEditorRuleLevel(index, levelId) {
    setBuilder((prev) => ({
      ...prev,
      editor_rules: prev.editor_rules.map((rule, i) => {
        if (i !== index) return rule;

        const exists = rule.level_ids.includes(levelId);

        return {
          ...rule,
          apply_all_levels: false,
          level_ids: exists
            ? rule.level_ids.filter((id) => id !== levelId)
            : [...rule.level_ids, levelId],
        };
      }),
    }));
  }

  function addEditorRuleByDepartment(depId) {
    if (!depId) return;

    setBuilder((prev) => {
      const exists = prev.editor_rules.some((rule) => rule.department_id === depId);
      if (exists) return prev;

      return {
        ...prev,
        editor_rules: [
          ...prev.editor_rules,
          {
            department_id: depId,
            apply_all_levels: true,
            level_ids: [],
          },
        ],
      };
    });

    setEditorDeptMenuOpen(false);
  }

  function removeResponderDepartment(depId) {
    setBuilder((prev) => ({
      ...prev,
      responder_department_ids: prev.responder_department_ids.filter((id) => id !== depId),
    }));
  }

  function renderInsertFieldMenu(insertIndex) {
    if (builderInsertIndex !== insertIndex) return null;

    return (
      <div className="gf-inlineInsertMenu gf-inlineInsertMenu--picker">
        <div className="gf-inlineInsertMenu__selectWrap" />

        <div className="gf-inlineInsertMenu__grid gf-inlineInsertMenu__grid--picker">
          {FIELD_LIBRARY.map((field) => (
            <button
              key={`${field.type}_${insertIndex}`}
              type="button"
              className="gf-inlineInsertMenu__pickerItem"
              onClick={() => {
                addFieldAt(field.type, insertIndex);
                setBuilderInsertIndex(null);
              }}
            >
              <span className="gf-inlineInsertMenu__pickerIcon">{field.icon}</span>
              <span className="gf-inlineInsertMenu__pickerLabel">{field.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderInsertFieldAnchor(insertIndex, mode = "floating") {
    const isOpen = builderInsertIndex === insertIndex;
    const isVisible = mode === "default" || hoveredInsertIndex === insertIndex || isOpen;

    return (
      <div
        className={`gf-inlineInsert gf-inlineInsert--${mode} ${
          isVisible ? "gf-inlineInsert--visible" : ""
        } ${isOpen ? "gf-inlineInsert--open" : ""}`}
        ref={isOpen ? builderInsertMenuRef : null}
        onMouseEnter={() => setHoveredInsertIndex(insertIndex)}
        onMouseLeave={() => setHoveredInsertIndex((prev) => (prev === insertIndex ? null : prev))}
      >
        <button
          type="button"
          className={`gf-inlineInsert__btn ${isOpen ? "gf-inlineInsert__btn--active" : ""}`}
          onClick={() => {
            const nextValue = builderInsertIndex === insertIndex ? null : insertIndex;
            setBuilderInsertIndex(nextValue);

            if (nextValue !== null) {
              scrollToInsertZone(insertIndex);
            }
          }}
          title="Agregar pregunta"
        >
          <TbPlus />
        </button>

        {renderInsertFieldMenu(insertIndex)}
      </div>
    );
  }

  async function saveBuilder() {
    if (!worker?.id) return;

    if (!builder.title.trim()) {
      Swal.fire("Falta título", "Escribe el nombre del formulario", "warning");
      return;
    }

    if (!builder.fields.length) {
      Swal.fire("Sin campos", "Agrega al menos un campo", "warning");
      return;
    }

    const flattenedEditorRules = (builder.editor_rules || [])
      .filter((rule) => rule.department_id)
      .flatMap((rule) => {
        if (rule.apply_all_levels || !rule.level_ids?.length) {
          return [
            {
              department_id: rule.department_id,
              level_id: "",
              min_authority: 1,
            },
          ];
        }

        return rule.level_ids.map((levelId) => ({
          department_id: rule.department_id,
          level_id: levelId,
          min_authority: 1,
        }));
      });

    try {
const payload = {
  worker_id: worker.id,
  title: toTitleCaseText(builder.title),
  description: builder.description || "",
  color: builder.color || "#2563eb",
  icon: builder.icon || "clipboard",
  cover_url: builder.cover_url || "",
  layout_mode: "stack",
  fields: (builder.fields || [])
    .filter((field) => field?.type !== "captcha")
    .map((field) => ({
      ...field,
      label: toTitleCaseText(field.label),
      help_text: typeof field.help_text === "string" ? field.help_text.replace(/\s+/g, " ").trim() : field.help_text,
    })),
  settings: builder.settings || {},
  responder_department_ids: builder.responder_department_ids || [],
  editor_rules: flattenedEditorRules,
};
      if (builder.id) {
        await apiFetch(`/api/forms/${builder.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/forms`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      Swal.fire("Guardado", "El formulario fue guardado correctamente", "success");
      await loadForms();
      setViewMode("dashboard");
      resetBuilder();
      setBuilderInsertIndex(null);
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo guardar el formulario", "error");
    }
  }

  async function handleDuplicate(targetFormId) {
    try {
      await apiFetch(`/api/forms/${targetFormId}/duplicate`, {
        method: "POST",
        body: JSON.stringify({ worker_id: worker.id }),
      });

      await loadForms();
      Swal.fire("Listo", "Formulario duplicado", "success");
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo duplicar", "error");
    }
  }

  async function handleDelete(targetFormId) {
    const result = await Swal.fire({
      title: "¿Eliminar formulario?",
      text: "Esta acción también eliminará sus respuestas.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/api/forms/${targetFormId}?worker_id=${worker.id}`, {
        method: "DELETE",
      });

      if (selectedFormId === targetFormId) {
        setSelectedFormId(null);
        setSelectedForm(null);
      }

      await loadForms();
      Swal.fire("Eliminado", "Formulario eliminado correctamente", "success");
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo eliminar", "error");
    }
  }

  async function handleDeleteAnswer(answer) {
    const result = await Swal.fire({
      title: "¿Eliminar respuesta?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await apiFetch(`/api/forms/answers/${answer.id}?worker_id=${worker.id}`, {
        method: "DELETE",
      });

      await loadAnswers(selectedForm.id);

      Swal.fire({
        icon: "success",
        title: "Respuesta eliminada",
        text: "La respuesta fue eliminada correctamente.",
        confirmButtonText: "Aceptar",
      });
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo eliminar la respuesta", "error");
    }
  }

    async function handleDeleteSelectedAnswers(answerIds = []) {
    if (!Array.isArray(answerIds) || !answerIds.length) {
      Swal.fire("Sin selección", "Selecciona al menos una respuesta.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: "¿Eliminar respuestas seleccionadas?",
      text: `Se eliminarán ${answerIds.length} respuesta(s). Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return false;

    try {
      const resp = await apiFetch(`/api/forms/answers/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({
          worker_id: worker.id,
          answer_ids: answerIds,
        }),
      });

      loadAnswers(selectedForm.id);

      Swal.fire({
        icon: "success",
        title: "Respuestas eliminadas",
        text: `${resp?.deleted_count || answerIds.length} respuesta(s) eliminada(s) correctamente.`,
        confirmButtonText: "Aceptar",
      });

      return true;
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudieron eliminar las respuestas seleccionadas", "error");
      return false;
    }
  }

  function goToFormsDashboard() {
    setRespondModalOpen(false);
    setRespondModalMode("create");
    setViewMode("dashboard");
    setSelectedForm(null);
    setSelectedFormId(null);
    setCurrentAnswerId(null);
    setCurrentAnswerMeta(null);
    navigate("/forms");
  }

  async function handleExportCurrentAnswer(format = "pdf") {
    if (!currentAnswerMeta?.id || !worker?.id) return;

    const formatLabel = format === "xlsx" ? "Excel" : "PDF";

    try {
      Swal.fire({
        title: `Exportando ${formatLabel}`,
        text: "Espera un momento mientras se genera el archivo...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await apiDownload(
        `/api/forms/answers/${currentAnswerMeta.id}/export?worker_id=${worker.id}&format=${format}`,
        `${currentAnswerMeta?.folio || "respuesta"}.${format === "xlsx" ? "xlsx" : "pdf"}`
      );

      Swal.fire({
        icon: "success",
        title: `${formatLabel} exportado`,
        text: `El archivo ${formatLabel} se generó correctamente.`,
        confirmButtonText: "Aceptar",
        timer: 1800,
        timerProgressBar: true,
      });
    } catch (e) {
      Swal.fire(
        "Error",
        e.message || `No se pudo exportar el archivo ${String(format).toUpperCase()}`,
        "error"
      );
    }
  }

  async function handleExportAnswersGridExcel({
    selectedIds = [],
    search = "",
    datePreset = "",
  } = {}) {
    if (!selectedForm?.id || !worker?.id) return;

    const idsParam = Array.isArray(selectedIds) && selectedIds.length
      ? `&answer_ids=${encodeURIComponent(selectedIds.join(","))}`
      : "";

    const searchParam = search ? `&q=${encodeURIComponent(search)}` : "";
    const dateParam = datePreset ? `&date_preset=${encodeURIComponent(datePreset)}` : "";

    try {
      Swal.fire({
        title: "Exportando Excel",
        text: "Preparando tabla de respuestas...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await apiDownload(
        `/api/forms/${selectedForm.id}/answers/export-grid?worker_id=${worker.id}${idsParam}${searchParam}${dateParam}`,
        `${String(selectedForm.title || "respuestas").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "respuestas"}-tabla.xlsx`
      );

      Swal.fire({
        icon: "success",
        title: "Excel exportado",
        text: "La tabla de respuestas se exportó correctamente.",
        timer: 1800,
        timerProgressBar: true,
        confirmButtonText: "Aceptar",
      });
    } catch (e) {
      Swal.fire(
        "Error",
        e.message || "No se pudo exportar la tabla de respuestas a Excel",
        "error"
      );
    }
  }

  function openFormWorkspace(targetFormId) {
    if (!targetFormId) return;
    setOpenCardMenuId(null);
    navigate(`/forms/${targetFormId}`);
  }
  function showFormInfo(form) {
    const departments = (form.affected_departments || []).map((dep) => dep.name).join(", ") || "—";

    Swal.fire({
      title: form.title || "Formulario sin título",
      html: `
        <div style="text-align:left;display:grid;gap:10px;font-size:14px;line-height:1.5;">
          <div><b>Descripción:</b> ${form.description || "Sin descripción"}</div>
          <div><b>Campos:</b> ${form.total_fields || 0}</div>
          <div><b>Creador:</b> ${form.creator?.full_name || form.creator?.username || "—"}</div>
          <div><b>Departamentos:</b> ${departments}</div>
        </div>
      `,
      icon: "info",
      confirmButtonText: "Cerrar",
    });
  }

  function updateAnswer(field, value) {
    setAnswerState((prev) => ({
      ...prev,
      [field.id]: value,
    }));
  }

  async function handleFiles(field, files) {
    const maxFiles = Math.min(5, Math.max(1, Number(field?.settings?.maxFiles || 1)));
    const acceptImagesOnly = field.type === "image";

    const currentFiles = Array.isArray(answerState[field.id]) ? answerState[field.id] : [];
    const remainingSlots = Math.max(0, maxFiles - currentFiles.length);

    if (remainingSlots <= 0) {
      Swal.fire("Límite alcanzado", `Solo puedes subir ${maxFiles} archivo(s)`, "warning");
      return;
    }

    const selectedRaw = Array.from(files || []).slice(0, remainingSlots);
    const selected = acceptImagesOnly
      ? selectedRaw.filter((file) => String(file.type || "").startsWith("image/"))
      : selectedRaw;

    if (acceptImagesOnly && selected.length !== selectedRaw.length) {
      Swal.fire(
        "Archivo no permitido",
        "En el campo de fotos solo se permiten imágenes.",
        "warning"
      );
    }

    for (const rawFile of selected) {
      const tempId = createLocalFileId(rawFile);
      const isImage = String(rawFile.type || "").startsWith("image/");

      const tempEntry = {
        id: tempId,
        name: rawFile.name,
        originalName: rawFile.name,
        type: rawFile.type,
        size: rawFile.size,
        dataUrl: "",
        previewUrl: "",
        uploading: true,
        progress: 0,
        isImage,
      };

      setAnswerState((prev) => {
        const current = Array.isArray(prev[field.id]) ? prev[field.id] : [];
        return {
          ...prev,
          [field.id]: [...current, tempEntry],
        };
      });

      setFileLoadingMap((prev) => ({ ...prev, [tempId]: true }));

      try {
        const dataUrl = await fileToDataUrl(rawFile, (percent) => {
          setAnswerState((prev) => {
            const current = Array.isArray(prev[field.id]) ? prev[field.id] : [];
            return {
              ...prev,
              [field.id]: current.map((item) =>
                item.id === tempId
                  ? {
                      ...item,
                      progress: percent,
                      uploading: percent < 100,
                    }
                  : item
              ),
            };
          });
        });

        const blobUrl = buildBlobUrlFromDataUrl(dataUrl);

        setAnswerState((prev) => {
          const current = Array.isArray(prev[field.id]) ? prev[field.id] : [];
          return {
            ...prev,
            [field.id]: current.map((item) =>
              item.id === tempId
                ? {
                    ...item,
                    dataUrl,
                    blobUrl,
                    previewUrl: isImage ? dataUrl : "",
                    progress: 100,
                    uploading: false,
                  }
                : item
            ),
          };
        });
      } catch (error) {
        setAnswerState((prev) => {
          const current = Array.isArray(prev[field.id]) ? prev[field.id] : [];
          return {
            ...prev,
            [field.id]: current.filter((item) => item.id !== tempId),
          };
        });

        Swal.fire("Error", error.message || "No se pudo procesar el archivo", "error");
      } finally {
        setFileLoadingMap((prev) => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
      }
    }
  }

  function removeUploadedFile(field, fileId) {
    const files = Array.isArray(answerState[field.id]) ? answerState[field.id] : [];
    const fileToRemove = files.find((file) => file.id === fileId);

    if (fileToRemove?.blobUrl) {
      URL.revokeObjectURL(fileToRemove.blobUrl);
    }

    updateAnswer(
      field,
      files.filter((file) => file.id !== fileId)
    );
  }

  function renameUploadedFile(field, fileId, nextName) {
    const files = Array.isArray(answerState[field.id]) ? answerState[field.id] : [];

    updateAnswer(
      field,
      files.map((file) =>
        file.id === fileId
          ? {
              ...file,
              name: nextName,
            }
          : file
      )
    );
  }

  function openFilePreview(file) {
    setFilePreviewModal(file);
  }

  function closeFilePreview() {
    setFilePreviewModal(null);
  }

  function handleFileDrop(event, field) {
    event.preventDefault();
    event.stopPropagation();
    setFileDragOverMap((prev) => ({ ...prev, [field.id]: false }));
    if (!event.dataTransfer?.files?.length) return;
    handleFiles(field, event.dataTransfer.files);
  }

  function handleFileDragState(fieldId, active) {
    setFileDragOverMap((prev) => ({ ...prev, [fieldId]: active }));
  }

  function addPurchaseRow(field) {
    const rows = Array.isArray(answerState[field.id]) ? answerState[field.id] : [];
    updateAnswer(field, [...rows, { description: "", qty: 1, unit_cost: 0, amount: 0 }]);
  }

  function updatePurchaseRow(field, index, patch) {
    const rows = Array.isArray(answerState[field.id]) ? [...answerState[field.id]] : [];
    const current = rows[index] || { description: "", qty: 1, unit_cost: 0, amount: 0 };
    const next = { ...current, ...patch };
    next.amount = Number(next.qty || 0) * Number(next.unit_cost || 0);
    rows[index] = next;
    updateAnswer(field, rows);
  }

  function removePurchaseRow(field, index) {
    const rows = Array.isArray(answerState[field.id]) ? [...answerState[field.id]] : [];
    rows.splice(index, 1);
    updateAnswer(field, rows);
  }

  function toggleProductSelection(field, product) {
    const rows = Array.isArray(answerState[field.id]) ? [...answerState[field.id]] : [];
    const exists = rows.some((r) => r.product_id === product.id);

    if (exists) {
      updateAnswer(
        field,
        rows.filter((r) => r.product_id !== product.id)
      );
      return;
    }

    updateAnswer(field, [
      ...rows,
      {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        price: product.price,
        qty: 1,
        amount: Number(product.price || 0),
      },
    ]);
  }

  function updateCartRow(field, productId, patch) {
    const rows = Array.isArray(answerState[field.id]) ? [...answerState[field.id]] : [];
    const idx = rows.findIndex((r) => r.product_id === productId);
    if (idx === -1) return;

    const current = rows[idx];
    const next = { ...current, ...patch };
    next.qty = Number(next.qty || 1);
    next.price = Number(next.price || 0);
    next.amount = next.qty * next.price;
    rows[idx] = next;
    updateAnswer(field, rows);
  }

  function removeCartRow(field, productId) {
    const rows = Array.isArray(answerState[field.id]) ? [...answerState[field.id]] : [];
    updateAnswer(
      field,
      rows.filter((r) => r.product_id !== productId)
    );
  }

  function validateAnswers(form) {
    for (const field of form?.fields || []) {
      const value = answerState[field.id];

      if (field.required) {
        if (field.type === "multiselect" && (!Array.isArray(value) || !value.length)) {
          return `El campo "${field.label}" es obligatorio`;
        }

        if ((field.type === "file" || field.type === "image") && (!Array.isArray(value) || !value.length)) {
          return `El campo "${field.label}" es obligatorio`;
        }

        if (field.type === "signature" && !value) {
          return `La firma "${field.label}" es obligatoria`;
        }

        if (field.type === "address") {
          if (!value?.street || !value?.city) {
            return `Completa la dirección en "${field.label}"`;
          }
        }

        if (field.type === "table_purchase" && (!Array.isArray(value) || !value.length)) {
          return `La tabla "${field.label}" requiere al menos una fila`;
        }

        if (field.type === "cart" && (!Array.isArray(value) || !value.length)) {
          return `El carrito "${field.label}" requiere al menos un producto`;
        }

        if (
          !["multiselect", "file", "image", "signature", "address", "table_purchase", "cart"].includes(
            field.type
          )
        ) {
          if (value === null || value === undefined || value === "") {
            return `El campo "${field.label}" es obligatorio`;
          }
        }
      }

      if (field.type === "email" && value) {
        const emailValue = String(value).trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValue.includes("@")) {
          return `El campo "${field.label}" debe incluir el símbolo @`;
        }

        if (!emailRegex.test(emailValue)) {
          return `El campo "${field.label}" debe contener un correo válido`;
        }
      }


    }

    return null;
  }

  async function submitAnswers(status = "SUBMITTED") {
    if (!selectedForm || !worker?.id) return;

    const errorMsg = validateAnswers(selectedForm);
    if (errorMsg && status === "SUBMITTED") {
      Swal.fire("Validación", errorMsg, "warning");
      return;
    }

    try {
      const payload = {
        worker_id: worker.id,
        answers: answerState,
        status,
      };

      let savedAnswer = null;

      if (currentAnswerId) {
        const resp = await apiFetch(`/api/forms/answers/${currentAnswerId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        savedAnswer = resp?.data || null;
      } else {
        const resp = await apiFetch(`/api/forms/${selectedForm.id}/answers`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        savedAnswer = resp?.data || null;
        setCurrentAnswerId(resp?.data?.id || null);
      }

      if (status === "DRAFT") {
        loadAnswers(selectedForm.id);

        await Swal.fire({
          icon: "success",
          title: "Borrador guardado",
          text: "Tu progreso fue guardado",
          confirmButtonText: "Aceptar",
        });
        return;
      }

      setRespondModalOpen(false);
      setRespondModalMode("create");

      loadAnswers(selectedForm.id);

      Swal.fire({
        icon: "success",
        title: currentAnswerId ? "Respuesta actualizada" : "Formulario enviado",
        text: currentAnswerId
          ? "La respuesta fue actualizada correctamente"
          : "La respuesta fue registrada correctamente",
        confirmButtonText: "Aceptar",
      });
    } catch (e) {
      Swal.fire("Error", e.message || "No se pudo guardar la respuesta", "error");
    }
  }

  async function handleQuickUpdateAnswer(answer, field, nextValue) {
    if (!answer?.id || !field?.id || !worker?.id) return;

    const nextAnswers = {
      ...(answer.answers || {}),
      [field.id]: nextValue,
    };

    setAnswers((prev) =>
      prev.map((item) =>
        item.id === answer.id
          ? {
              ...item,
              answers: nextAnswers,
            }
          : item
      )
    );

    try {
      await apiFetch(`/api/forms/answers/${answer.id}`, {
        method: "PUT",
        body: JSON.stringify({
          worker_id: worker.id,
          answers: nextAnswers,
          status: answer.status || "SUBMITTED",
        }),
      });
    } catch (e) {
      await loadAnswers(selectedForm.id);
      Swal.fire("Error", e.message || "No se pudo actualizar la respuesta", "error");
    }
  }
  function renderPreviewField(field) {
    return (
      <div className="builder-field__body">
        <div className="field-label">
          <span>{field.label}</span>
          {field.required ? <span className="required-dot">*</span> : null}
        </div>
        {field.help_text ? <div className="field-help">{field.help_text}</div> : null}
        <div className="field-surface">{renderFieldByType(field, null, true)}</div>
      </div>
    );
  }

  function renderFieldByType(field, live = true, previewOnly = false) {
    return renderFieldByTypeExternal({
      field,
      value: answerState[field.id],
      live,
      previewOnly,
      updateAnswer,
      updateBuilderField,
      handleFiles,
      removeUploadedFile,
      renameUploadedFile,
      openFilePreview,
      handleFileDrop,
      handleFileDragState,
      addPurchaseRow,
      updatePurchaseRow,
      removePurchaseRow,
      toggleProductSelection,
      updateCartRow,
      removeCartRow,
      fileDragOverMap,
      fileInputRefs,
      signatureRefs,
      catalogs,
    });
  }

  function renderAnswerValue(field, value) {
    return renderAnswerValueExternal({
      field,
      value,
      openFilePreview,
    });
  }

  function renderFieldInlineConfig(field) {
    return (
      <FieldConfigModal
        field={field}
        isOpen={openFieldConfigId === field.id}
        onToggle={(e) => {
          e.stopPropagation();
          setSelectedFieldId(field.id);
          setOpenFieldConfigId((prev) => (prev === field.id ? null : field.id));
        }}
        onClose={() => setOpenFieldConfigId(null)}
        onChangeFieldType={changeFieldType}
        onUpdateField={updateBuilderField}
        onUpdateFieldSettings={updateBuilderFieldSettings}
        onAddOption={(fieldId) => {
          setSelectedFieldId(fieldId);
          setTimeout(() => {
            const currentField = builder.fields.find((item) => item.id === fieldId);
            if (!currentField) return;

            updateBuilderField(fieldId, {
              options: [...(currentField.options || []), `Opción ${(currentField.options || []).length + 1}`],
            });
          }, 0);
        }}
      />
    );
  }

  function renderBuilderSideConfig() {
    return (
      <BuilderSideConfig
        builder={builder}
        catalogs={catalogs}
        toggleResponderDepartment={toggleResponderDepartment}
        removeResponderDepartment={removeResponderDepartment}
        addEditorRuleByDepartment={addEditorRuleByDepartment}
        updateEditorRule={updateEditorRule}
        removeEditorRule={removeEditorRule}
        toggleEditorRuleLevel={toggleEditorRuleLevel}
      />
    );
  }

  function renderBuilderCanvas() {
    const iconSelectOptions = ICON_OPTIONS.map((item) => ({
      value: item.value,
      label: item.label,
      icon: item.Icon,
    }));

    return (
      <div className="gf-builderPro">
        <div className="gf-builderPro__top">
          <div className="gf-builderPro__mainColumn">
            <div className="gf-builderPro__metaCard">
              <div className="gf-builderPro__metaRow">
                <div className="gf-builderPro__controls">
                  <div className="gf-builderPro__iconPickerWrap">
                    <ProSelect
                      className="gf-builderPro__iconPicker"
                      value={builder.icon}
                      onChange={(e) =>
                        setBuilder((prev) => ({ ...prev, icon: e.target.value }))
                      }
                      placeholder=""
                      options={iconSelectOptions}
                      renderValue={(opt) => {
                        const Icon = opt.icon;
                        return (
                          <span className="gf-builderPro__iconPickerValue">
                            <Icon />
                            <span>{opt.label}</span>
                          </span>
                        );
                      }}
                      renderOption={(opt, meta) => {
                        const Icon = opt.icon;
                        return (
                          <>
                            <span className="proSelectItemMain proSelectItemMain--iconOnlyDark">
                              <span className="proSelectItemIcon proSelectItemIcon--bare">
                                <Icon />
                              </span>
                              <span className="proSelectItemLabel">{opt.label}</span>
                            </span>
                            {meta.selected ? (
                              <span className="proSelectCheck">✓</span>
                            ) : (
                              <span className="proSelectCheck" />
                            )}
                          </>
                        );
                      }}
                    />

                    <label
                      className="gf-builder__colorBtn gf-builder__colorBtn--inline gf-builder__colorPicker"
                      style={{ "--gf-accent": builder.color || "#2563eb" }}
                      title="Cambiar color del formulario"
                    >
                      <span className="gf-builder__colorDot" />
                      <input
                        className="gf-builder__colorNativeInput"
                        type="color"
                        value={builder.color}
                        onChange={(e) =>
                          setBuilder((prev) => ({ ...prev, color: e.target.value }))
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>

<input
  className="gf-builderPro__titleInput"
  value={builder.title}
  onChange={(e) =>
    setBuilder((prev) => ({
      ...prev,
      title: toTitleCaseText(e.target.value),
    }))
  }
  placeholder="Formulario sin título"
/>

              <textarea
                className="gf-builderPro__descInput"
                value={builder.description}
                onChange={(e) =>
                  setBuilder((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Descripción del formulario"
              />
            </div>

            <div className="gf-builderPro__fieldsWrap gf-builderPro__fieldsWrap--underHeader">
              {!builder.fields.length ? (
                <div className="gf-builderPro__emptyBlock">
                  {renderInsertFieldAnchor(0, "default")}
                  <div className="gf-builder__emptyCard">
                    {renderPanelEmptyState(
                      <TbListCheck />,
                      "Sin preguntas todavía",
                      "Agrega una pregunta para comenzar a construir el formulario."
                    )}
                  </div>
                </div>
              ) : (
                <div className="gf-builder__questions">
                  {builder.fields.map((field, index) => (
                    <React.Fragment key={field.id}>
                      <div
                        id={`builder-insert-zone-${index}`}
                        className="gf-questionInsertZone gf-questionInsertZone--top"
                        onMouseEnter={() => setHoveredInsertIndex(index)}
                        onMouseLeave={() =>
                          setHoveredInsertIndex((prev) => (prev === index ? null : prev))
                        }
                      >
                        {renderInsertFieldAnchor(index, "floating")}
                      </div>

                      <div
                        id={`builder-field-${field.id}`}
                        className={`gf-question-card ${
                          selectedFieldId === field.id ? "gf-question-card--active" : ""
                        } ${draggedFieldId === field.id ? "gf-question-card--dragging" : ""}`}
                        onClick={() => setSelectedFieldId(field.id)}
                        draggable
                        onDragStart={() => handleFieldDragStart(field.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleFieldDrop(field.id)}
                        onDragEnd={() => setDraggedFieldId(null)}
                      >
                        <div className="gf-question-card__handle" title="Arrastrar para reordenar">
                          <TbGripVertical />
                        </div>

                        <div className="gf-question-card__body">
                          <div className="gf-question-card__top">
                            <div className="gf-question-card__type">
                              {FIELD_LIBRARY.find((x) => x.type === field.type)?.icon}
                              <span>
                                {FIELD_LIBRARY.find((x) => x.type === field.type)?.label || field.type}
                              </span>
                            </div>

                            <div className="gf-question-card__actions">
                              <button
                                type="button"
                                className="forms-mini-btn"
                                disabled={index === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, "up");
                                }}
                                title="Mover arriba"
                              >
                                <TbChevronUp />
                              </button>

                              <button
                                type="button"
                                className="forms-mini-btn"
                                disabled={index === builder.fields.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, "down");
                                }}
                                title="Mover abajo"
                              >
                                <TbChevronDown />
                              </button>

                              {renderFieldInlineConfig(field)}

                              <button
                                className="forms-mini-btn"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicateField(field.id);
                                }}
                                title="Duplicar"
                              >
                                <TbCopy />
                              </button>

                              <button
                                className="forms-mini-btn"
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeField(field.id);
                                }}
                                title="Eliminar"
                              >
                                <TbTrash />
                              </button>
                            </div>
                          </div>

                          <div className="gf-question-card__title">
<input
  className="gf-question-card__titleInput"
  value={field.label || ""}
  onChange={(e) =>
    updateBuilderField(field.id, {
      label: toTitleCaseText(e.target.value),
    })
  }
  placeholder="Pregunta sin título"
  onClick={(e) => e.stopPropagation()}
/>
                          </div>

                          {field.help_text ? (
                            <div className="gf-question-card__help">{field.help_text}</div>
                          ) : null}

                          <div className="gf-question-card__preview">
                            {renderFieldByType(field, false, true)}
                          </div>

                          <div className="gf-question-card__meta">
                            {field.required ? <span className="gf-chip">Obligatorio</span> : null}
                            {field.settings?.visibility === "editor_only" ? (
                              <span className="gf-chip gf-chip--dark">Solo editor</span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div
                        id={`builder-insert-zone-${index + 1}`}
                        className="gf-questionInsertZone gf-questionInsertZone--bottom"
                        onMouseEnter={() => setHoveredInsertIndex(index + 1)}
                        onMouseLeave={() =>
                          setHoveredInsertIndex((prev) => (prev === index + 1 ? null : prev))
                        }
                      >
                        {index === builder.fields.length - 1
                          ? renderInsertFieldAnchor(index + 1, "floating")
                          : null}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="gf-builderPro__aside">
            <div className="gf-builderPro__actionCard">
              <div className="gf-builderPro__actionButtons">
                <button
                  className="forms-btn forms-btn--ghost"
                  type="button"
                  onClick={() => {
                    setViewMode("dashboard");
                    setSelectedForm(null);
                    setCurrentAnswerId(null);
                    resetBuilder();
                  }}
                >
                  <TbLayoutGrid />
                  Dashboard
                </button>

                <button
                  className="forms-btn forms-btn--ghost"
                  type="button"
                  onClick={() => {
                    setViewMode("dashboard");
                    resetBuilder();
                  }}
                >
                  <TbX />
                  Cancelar
                </button>

                <button
                  className="forms-btn forms-btn--primary"
                  type="button"
                  onClick={saveBuilder}
                >
                  <TbDeviceFloppy />
                  Guardar formulario
                </button>
              </div>
            </div>

            {renderBuilderSideConfig()}
          </div>
        </div>
      </div>
    );
  }

  function renderPreviewPanel() {
    const formColor = builder.color || "#2563eb";
    const textColor = getContrastTextColor(formColor);

    return (
      <div className="preview-shell">
        <div className="preview-form">
          {builder.cover_url ? (
            <img className="preview-cover" src={builder.cover_url} alt="cover" />
          ) : null}

          <div
            className="preview-header"
            style={{
              background: formColor,
              color: textColor,
              textAlign: "center",
            }}
          >
            <h2
              className="preview-title preview-title--icon"
              style={{
                justifyContent: "center",
                textAlign: "center",
                color: textColor,
              }}
            >
              <span className="preview-title__icon">{getFormIcon(builder.icon)}</span>
              <span>{builder.title || "Formulario sin título"}</span>
            </h2>

            <p
              className="preview-desc"
              style={{
                textAlign: "center",
                color: textColor,
              }}
            >
              {builder.description || "Sin descripción"}
            </p>
          </div>

          <div className="preview-fields">
            {builder.layout_mode === "flow"
              ? builder.fields.map((field) => (
                  <div className="answer-card" key={field.id}>
                    <div className="field-label" style={{ justifyContent: "center", textAlign: "center" }}>
                      <span>{field.label}</span>
                      {field.required ? <span className="required-dot">*</span> : null}
                    </div>
                    {field.help_text ? (
                      <div className="field-help field-help--centered">{field.help_text}</div>
                    ) : null}
                    {renderFieldByType(field, false, true)}
                  </div>
                ))
              : builder.fields
                  .slice()
                  .sort((a, b) => (a.y || 0) - (b.y || 0))
                  .map((field) => (
                    <div className="answer-card" key={field.id}>
                      <div className="field-label" style={{ justifyContent: "center", textAlign: "center" }}>
                        <span>{field.label}</span>
                        {field.required ? <span className="required-dot">*</span> : null}
                      </div>
                      {field.help_text ? (
                        <div className="field-help field-help--centered">{field.help_text}</div>
                      ) : null}
                      {renderFieldByType(field, false, true)}
                    </div>
                  ))}
          </div>
        </div>
      </div>
    );
  }

  function renderAnswerPanel() {
    if (!selectedForm) {
      return renderPanelEmptyState(
        <TbEye />,
        "Sin formulario seleccionado",
        "Selecciona un formulario de la izquierda para ver su contenido y responderlo."
      );
    }

    const readOnly = respondModalMode === "view";
    const formColor = selectedForm.color || "#2563eb";
    const textColor = getContrastTextColor(formColor);
    const canEditAnswers =
      Boolean(selectedForm?.access?.canEditAnswers) ||
      Boolean(selectedForm?.access?.isDirectionUser);

    return (
      <div className="preview-shell">
        <div className="preview-form">
          {selectedForm.cover_url ? (
            <img className="preview-cover" src={selectedForm.cover_url} alt="cover" />
          ) : null}

          <div
            className="preview-header"
            style={{
              background: formColor,
              color: textColor,
              textAlign: "center",
            }}
          >
            <h2
              className="preview-title preview-title--icon"
              style={{
                justifyContent: "center",
                textAlign: "center",
                color: textColor,
              }}
            >
              <span className="preview-title__icon">{getFormIcon(selectedForm.icon)}</span>
              <span>{selectedForm.title}</span>
            </h2>

            <p
              className="preview-desc"
              style={{
                textAlign: "center",
                color: textColor,
              }}
            >
              {selectedForm.description || "Sin descripción"}
            </p>
          </div>

          <div className="preview-fields">
            {readOnly && currentAnswerMeta?.folio ? (
              <div className="answer-card answer-card--modalCentered" key="__folio_preview">
                <div
                  className="field-label field-label--hero"
                  style={{ justifyContent: "center", textAlign: "center" }}
                >
                  <span
                    className="field-label__main"
                    style={{ justifyContent: "center", width: "100%" }}
                  >
                    <span className="field-label__icon">{getFieldIcon("text")}</span>
                    <span className="field-label__text">Folio</span>
                  </span>
                </div>

                <div className="field-content field-content--centered field-content--readonlyPreview">
                  <div className="kv-item__value" style={{ fontSize: 22, fontWeight: 900 }}>
                    {currentAnswerMeta.folio}
                  </div>
                </div>
              </div>
            ) : null}

            {(selectedForm.fields || [])
              .filter((field) => {
                if (field?.type === "captcha") return false;

                const visibility = field?.settings?.visibility || "all";
                if (visibility === "editor_only" && !canEditAnswers) {
                  return false;
                }
                return true;
              })
              .map((field) => (
                <div className="answer-card answer-card--modalCentered" key={field.id}>
                  <div
                    className="field-label field-label--hero"
                    style={{ justifyContent: "center", textAlign: "center" }}
                  >
                    <span
                      className="field-label__main"
                      style={{ justifyContent: "center", width: "100%" }}
                    >
                      <span className="field-label__icon">{getFieldIcon(field.type)}</span>
                      <span className="field-label__text">{field.label}</span>
                    </span>

                    <span
                      className="field-label__meta"
                      style={{ justifyContent: "center", width: "100%" }}
                    >
                      {field.required ? <span className="required-dot">*</span> : null}
                      {field?.settings?.visibility === "editor_only" ? (
                        <span className="kobo-badge kobo-badge--editor">Solo editor</span>
                      ) : null}
                    </span>
                  </div>

                  {field.help_text ? (
                    <div className="field-help field-help--centered">{field.help_text}</div>
                  ) : null}

                  <div
                    className={`field-content field-content--centered ${
                      readOnly ? "field-content--readonlyPreview" : ""
                    }`}
                  >
                    {readOnly
                      ? renderAnswerValue(field, answerState[field.id])
                      : renderFieldByType(field, true, false)}
                  </div>
                </div>
              ))}
          </div>

          {!readOnly ? (
            <div className="answer-actions">
              <button
                className="forms-btn forms-btn--ghost"
                type="button"
                onClick={() => submitAnswers("DRAFT")}
              >
                <TbDeviceFloppy />
                Guardar borrador
              </button>

              <button
                className="forms-btn forms-btn--primary"
                type="button"
                onClick={() => submitAnswers("SUBMITTED")}
              >
                <TbSend />
                {selectedForm.settings?.submit_label || "Enviar formulario"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  function renderResponsesPanel() {
    if (!selectedForm) {
      return renderPanelEmptyState(
        <TbFileText />,
        "Sin formulario seleccionado",
        "Selecciona un formulario para visualizar sus respuestas."
      );
    }

    const canEditAnswers =
      Boolean(selectedForm?.access?.canEditAnswers) ||
      Boolean(selectedForm?.access?.isDirectionUser);

    return (
      <FormsResponsesTable
        form={selectedForm}
        answers={answers}
        canEditAnswers={canEditAnswers}
        onBackToForms={goToFormsDashboard}
        onOpenRespondModal={() => {
          hydrateAnswerState(selectedForm);
          setCurrentAnswerId(null);
          setRespondModalMode("create");
          setRespondModalOpen(true);
        }}
        onOpenFilePreview={openFilePreview}
        onQuickUpdateAnswer={handleQuickUpdateAnswer}
        onDeleteAnswer={handleDeleteAnswer}
        onDeleteSelectedAnswers={handleDeleteSelectedAnswers}
        onExportAnswersExcel={handleExportAnswersGridExcel}
        respondModalMode={respondModalMode}
        respondModalOpen={respondModalOpen}
        respondModalTitle={
          respondModalMode === "view"
            ? "Vista previa de respuesta"
            : respondModalMode === "edit"
            ? "Editar respuesta"
            : "Responder formulario"
        }
        respondModalHeaderActions={
          respondModalMode === "view" && currentAnswerMeta?.id ? (
            <div className="forms-exportHeaderActions">
              <button
                type="button"
                className="forms-exportIconBtn forms-exportIconBtn--pdf"
                title="Exportar respuesta a PDF"
                aria-label="Exportar respuesta a PDF"
                onClick={() => handleExportCurrentAnswer("pdf")}
              >
                <TbFileTypePdf />
              </button>

              <button
                type="button"
                className="forms-exportIconBtn forms-exportIconBtn--excel"
                title="Exportar respuesta a Excel"
                aria-label="Exportar respuesta a Excel"
                onClick={() => handleExportCurrentAnswer("xlsx")}
              >
                <TbFileTypeXls />
              </button>
            </div>
          ) : null
        }
        respondModalContent={renderAnswerPanel()}
        onRequestCloseRespondModal={() => {
          setRespondModalOpen(false);
          setRespondModalMode("create");
          setCurrentAnswerMeta(null);
        }}
        onEditAnswer={(answer) => {
          hydrateAnswerState(selectedForm, answer);
          setRespondModalMode("edit");
          setRespondModalOpen(true);
        }}
        onViewAnswer={(answer) => {
          hydrateAnswerState(selectedForm, answer);
          setRespondModalMode("view");
          setRespondModalOpen(true);
        }}
      />
    );
  }
  function renderDetailPage() {
    return (
      <div className="forms-detailPage">
        <div className="forms-panel forms-panel--detailPage forms-panel--detailClean">
          <div className="forms-panel__body forms-panel__body--detail forms-panel__body--detailFull">
            {renderResponsesPanel()}
          </div>
        </div>
      </div>
    );
  }

  if (!worker?.id) {
    return (
      <div className="forms-page">
        <div className="forms-shell">
          <div className="empty-state">
            No encontré el usuario en localStorage. Debes iniciar sesión primero.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="forms-page">
      <FilePreviewModal
        file={filePreviewModal}
        onClose={closeFilePreview}
      />

      <div className="forms-shell">
        {viewMode !== "builder" && !formId ? (
          <>
            <div className="forms-topbar">
              <div className="forms-title-wrap">
                <h1 className="forms-title">Módulo de Formularios</h1>
                <p className="forms-subtitle">
                  Dashboard independiente para creación, respuesta y control de formularios dinámicos.
                </p>
              </div>

              <div className="forms-top-actions">
                <button
                  className="forms-btn forms-btn--ghost"
                  type="button"
                  onClick={goToFormsDashboard}
                >
                  <TbLayoutGrid />
                  Dashboard
                </button>

                {isDirection ? (
                  <button
                    className="forms-btn forms-btn--primary"
                    type="button"
                    onClick={startCreateForm}
                  >
                    <TbPlus />
                    Nuevo formulario
                  </button>
                ) : null}
              </div>
            </div>

            <div className="forms-filters">
              <input
                className="forms-search"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Buscar por título, descripción, creador o departamento..."
              />

              <ProSelect
                className="forms-select"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                placeholder="Todos los departamentos"
              >
                <option value="">Todos los departamentos</option>
                {catalogs.departments.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </ProSelect>


            </div>
          </>
        ) : null}

        {viewMode === "builder" ? (
          <div className="gf-builder-layout gf-builder-layout--pro">
            {renderBuilderCanvas()}
          </div>
        ) : formId ? (
          renderDetailPage()
        ) : (
          <div className="forms-grid forms-grid--dashboard">
            <div className="forms-panel forms-panel--cards">
              <div className="forms-panel__header">
                <h3 className="forms-panel__title">Formularios</h3>

                <div className="forms-panel__header-right">
                  <div className="forms-badge">
                    <TbNotes />
                    {loading ? "Cargando..." : `${forms.length} resultado(s)`}
                  </div>

                  <div className="forms-badge">
                    Página {currentPage} / {totalPages}
                  </div>
                </div>
              </div>

              <div className="forms-panel__body forms-panel__body--cards">
                <div className="forms-list forms-list--grid">
                  {!forms.length ? (
                    renderPanelEmptyState(
                      <TbForms />,
                      "Sin formularios disponibles",
                      "Todavía no hay formularios cargados para este usuario o con los filtros actuales."
                    )
                  ) : (
                    paginatedForms.map((form) => (
                      <FormDashboardCard
                        key={form.id}
                        form={form}
                        openCardMenuId={openCardMenuId}
                        setOpenCardMenuId={setOpenCardMenuId}
                        startEditForm={startEditForm}
                        handleDuplicate={handleDuplicate}
                        handleDelete={handleDelete}
                        showFormInfo={showFormInfo}
                        openFormWorkspace={openFormWorkspace}
                      />
                    ))
                  )}
                </div>

                {forms.length > 0 ? (
                  <div className="forms-pagination forms-pagination--pill">
                    <div className="forms-pagination__info">{paginationLabel}</div>

                    <div className="forms-pagination__pill">
                      <button
                        className="forms-pagination__nav forms-pagination__nav--prev"
                        type="button"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      >
                        Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                        .filter((page) => {
                          if (totalPages <= 7) return true;
                          if (page === 1 || page === totalPages) return true;
                          if (Math.abs(page - currentPage) <= 1) return true;
                          return false;
                        })
                        .map((page, index, arr) => {
                          const prevPage = arr[index - 1];
                          const showDots = prevPage && page - prevPage > 1;

                          return (
                            <React.Fragment key={`page_${page}`}>
                              {showDots ? (
                                <span className="forms-pagination__dots">...</span>
                              ) : null}

                              <button
                                type="button"
                                className={`forms-pagination__page ${
                                  currentPage === page ? "forms-pagination__page--active" : ""
                                }`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          );
                        })}

                      <button
                        className="forms-pagination__nav forms-pagination__nav--next"
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}