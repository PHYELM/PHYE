import React from "react";
import SignatureCanvas from "react-signature-canvas";
import ProSelect from "../../components/ProSelect/ProSelect";
import dayjs from "dayjs";
import "dayjs/locale/es-mx";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import {
  TbPhoto,
  TbUpload,
  TbFile,
  TbEye,
  TbDownload,
  TbX,
  TbTrash,
  TbPlus,
  TbPackage,
} from "react-icons/tb";
import { TRAFFIC_LIGHT_DEFAULT_OPTIONS } from "./forms.constants";
import {
  openNativeFilePicker,
  getFileExtension,
  isPreviewableInModal,
  getFileThumb,
  parseDateValue,
  parseTimeValue,
  parseDateTimeValue,
  formatDateValue,
  formatTimeValue,
  toTitleCaseText,
  createSignatureDetailField,
} from "./forms.helpers";

function syncSignatureCanvas(sigPad) {
  if (!sigPad || typeof window === "undefined") return;

  const canvas = sigPad.getCanvas?.();
  if (!canvas) return;

  const parent = canvas.parentElement;
  if (!parent) return;

  const rect = parent.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const nextWidth = Math.round(rect.width * ratio);
  const nextHeight = Math.round(rect.height * ratio);

  if (canvas.width === nextWidth && canvas.height === nextHeight) return;

  const previousData = !sigPad.isEmpty?.() ? sigPad.toData() : null;

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  canvas.style.width = `${Math.round(rect.width)}px`;
  canvas.style.height = `${Math.round(rect.height)}px`;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
  }

  sigPad.clear();

  if (previousData && previousData.length) {
    try {
      sigPad.fromData(previousData);
    } catch (error) {
      console.error("No se pudo restaurar la firma tras redimensionar:", error);
    }
  }
}

function getSafeSignatureDataUrl(sigPad) {
  if (!sigPad || sigPad.isEmpty?.()) return "";
  try {
    return sigPad.getCanvas?.().toDataURL("image/png") || "";
  } catch (error) {
    console.error("No se pudo generar la firma:", error);
    return "";
  }
}

function createChoiceOption(label = "Nueva opción", extra = {}) {
  return {
    value: `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label,
    children: [],
    ...extra,
  };
}

function normalizeChoiceOption(option, idx = 0) {
  if (typeof option === "object" && option) {
    return {
      value: option.value ?? `opt_${idx}`,
      label: option.label ?? `Opción ${idx + 1}`,
      isOther: Boolean(option.isOther),
      children: Array.isArray(option.children) ? option.children : [],
      allowText: Boolean(option.allowText),
      textPlaceholder: option.textPlaceholder ?? "",
      textSuffix: option.textSuffix ?? "",
    };
  }

  const text = String(option || `Opción ${idx + 1}`);
  const isOther = text.trim().toLowerCase() === "otros";

  return {
    value: isOther ? "__other__" : `opt_${idx}`,
    label: text,
    isOther,
    children: [],
    allowText: false,
    textPlaceholder: "",
    textSuffix: "",
  };
}

function moveArrayItem(list = [], fromIndex, toIndex) {
  const next = [...list];
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= next.length ||
    toIndex >= next.length ||
    fromIndex === toIndex
  ) {
    return next;
  }

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
function normalizeSignatureDetailField(item, idx = 0) {
  if (item && typeof item === "object") {
    return {
      id: item.id || `sig_meta_${idx}`,
      label: item.label || `Subcampo ${idx + 1}`,
      placeholder: item.placeholder || "",
    };
  }

  return {
    id: `sig_meta_${idx}`,
    label: `Subcampo ${idx + 1}`,
    placeholder: "",
  };
}
export function renderFieldByType({
  field,
  value,
  live = true,
  previewOnly = false,
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
}) {
  if (field.type === "text") {
    return (
      <input
        className="field-box"
        type="text"
        placeholder={field.placeholder || ""}
        value={previewOnly ? field.placeholder || "" : live ? value || "" : ""}
        readOnly={!live || previewOnly}
        onChange={(e) => {
          if (previewOnly) {
            updateBuilderField(field.id, { placeholder: e.target.value });
            return;
          }
          updateAnswer(field, toTitleCaseText(e.target.value));
        }}
        onClick={(e) => previewOnly && e.stopPropagation()}
      />
    );
  }

  if (field.type === "number") {
    return (
      <input
        className="field-box"
        type="text"
        inputMode="numeric"
        placeholder={field.placeholder || ""}
        value={previewOnly ? field.placeholder || "0" : live ? value || "" : ""}
        readOnly={!live || previewOnly}
        onChange={(e) => {
          const onlyNumbers = String(e.target.value || "").replace(/[^\d.-]/g, "");
          if (previewOnly) {
            updateBuilderField(field.id, { placeholder: onlyNumbers });
            return;
          }
          updateAnswer(field, onlyNumbers);
        }}
        onClick={(e) => previewOnly && e.stopPropagation()}
      />
    );
  }

  if (field.type === "currency") {
    return (
      <div className="inline-grid-2" style={{ gridTemplateColumns: "80px 1fr" }}>
        <input
          className="field-box"
          type="text"
          value={field.settings?.currencySymbol || "$"}
          readOnly
        />
        <input
          className="field-box"
          type="text"
          inputMode="decimal"
          placeholder={field.placeholder || "0.00"}
          value={live ? value || "" : ""}
          readOnly={!live}
          onChange={(e) => {
            const clean = String(e.target.value || "").replace(/[^\d.]/g, "");
            const parts = clean.split(".");
            const normalized =
              parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : clean;
            updateAnswer(field, normalized);
          }}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <textarea
        className="field-box field-box--textarea"
        placeholder={field.placeholder || ""}
        value={live ? value || "" : ""}
        readOnly={!live}
        onChange={(e) => updateAnswer(field, toTitleCaseText(e.target.value))}
      />
    );
  }

  if (field.type === "select") {
    const normalizedOptions = (field.options || []).map((option, idx) =>
      normalizeChoiceOption(option, idx)
    );

    const currentValue =
      value && typeof value === "object" && !Array.isArray(value)
        ? value
        : { value: typeof value === "string" ? value : "", otherText: "" };

    if (previewOnly) {
      return (
        <div className="gf-optionPreviewList">
          {normalizedOptions.map((option, idx) => {
            const isOther = option.value === "__other__" || option.isOther;

            return (
              <div
                key={`${field.id}_${option.value}_${idx}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(idx));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndex = Number(e.dataTransfer.getData("text/plain"));
                  const toIndex = idx;
                  updateBuilderField(field.id, {
                    options: moveArrayItem(normalizedOptions, fromIndex, toIndex),
                  });
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 10,
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: isOther ? "1.5px dashed #f59e0b" : "1px solid #dbe5f0",
                  background: isOther ? "#fff7ed" : "#ffffff",
                  boxShadow: isOther ? "inset 0 0 0 1px rgba(245,158,11,0.12)" : "none",
                }}
              >
                <button
                  type="button"
                  title="Arrastrar opción"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "grab",
                    fontSize: 18,
                    lineHeight: 1,
                    color: isOther ? "#b45309" : "#64748b",
                  }}
                >
                  ⋮⋮
                </button>

                <input
                  className="gf-optionPreviewInput"
                  value={option.label || ""}
                  onChange={(e) => {
                    const next = [...normalizedOptions];
                    next[idx] = {
                      ...next[idx],
                      label: toTitleCaseText(e.target.value),
                    };
                    updateBuilderField(field.id, { options: next });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={
                    isOther
                      ? {
                          borderColor: "#f59e0b",
                          background: "#fffbeb",
                          fontWeight: 800,
                        }
                      : undefined
                  }
                />

                <button
                  type="button"
                  className="forms-mini-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = normalizedOptions.filter((_, optionIndex) => optionIndex !== idx);
                    updateBuilderField(field.id, { options: next });
                  }}
                  title="Eliminar opción"
                >
                  <TbTrash />
                </button>
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
            <button
              type="button"
              className="forms-btn forms-btn--ghost"
              onClick={(e) => {
                e.stopPropagation();
                updateBuilderField(field.id, {
                  options: [
                    ...normalizedOptions.filter((item) => item.value !== "__other__"),
                    createChoiceOption(
                      `Opción ${normalizedOptions.filter((item) => item.value !== "__other__").length + 1}`
                    ),
                    ...normalizedOptions.filter((item) => item.value === "__other__"),
                  ],
                });
              }}
            >
              <TbPlus />
              Agregar opción
            </button>

            {!normalizedOptions.some((item) => item.value === "__other__") ? (
              <button
                type="button"
                className="forms-btn forms-btn--ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  updateBuilderField(field.id, {
                    options: [
                      ...normalizedOptions,
                      {
                        value: "__other__",
                        label: "Otros",
                        isOther: true,
                        children: [],
                      },
                    ],
                  });
                }}
              >
                <TbPlus />
                Agregar "Otros"
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="forms-stack">
        <div className="forms-select-shell">
          <ProSelect
            className="forms-select forms-select--field"
            value={live ? currentValue.value || "" : ""}
            disabled={!live}
            onChange={(e) =>
              updateAnswer(field, {
                ...currentValue,
                value: e.target.value,
              })
            }
            placeholder="Selecciona una opción"
          >
            <option value="">Selecciona una opción</option>
            {normalizedOptions.map((option, idx) => (
              <option key={`${field.id}_${option.value}_${idx}`} value={option.value}>
                {option.value === "__other__" ? `✦ ${option.label}` : option.label}
              </option>
            ))}
          </ProSelect>
        </div>

        {currentValue.value === "__other__" ? (
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              border: "1px dashed #f59e0b",
              background: "#fff7ed",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#b45309",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              Opción personalizada
            </div>

            <input
              className="field-box"
              type="text"
              placeholder="Especifica otro..."
              value={currentValue.otherText || ""}
              readOnly={!live}
              onChange={(e) =>
                updateAnswer(field, {
                  ...currentValue,
                  otherText: toTitleCaseText(e.target.value),
                })
              }
              style={{
                borderColor: "#f59e0b",
                background: "#fffbeb",
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (field.type === "multiselect") {
    const normalizedOptions = (field.options || []).map((option, idx) =>
      normalizeChoiceOption(option, idx)
    );

    const state =
      value && typeof value === "object" && !Array.isArray(value)
        ? {
            selected: Array.isArray(value.selected) ? value.selected : [],
            otherText: value.otherText ?? "",
            childSelections:
              value.childSelections && typeof value.childSelections === "object"
                ? value.childSelections
                : {},
            optionTextValues:
              value.optionTextValues && typeof value.optionTextValues === "object"
                ? value.optionTextValues
                : {},
          }
        : {
            selected: Array.isArray(value) ? value : [],
            otherText: "",
            childSelections: {},
            optionTextValues: {},
          };

    const selected = Array.isArray(state.selected) ? state.selected : [];
    const childSelections =
      state.childSelections && typeof state.childSelections === "object"
        ? state.childSelections
        : {};
    const optionTextValues =
      state.optionTextValues && typeof state.optionTextValues === "object"
        ? state.optionTextValues
        : {};
    if (previewOnly) {
      return (
        <div className="gf-optionPreviewList">
          {normalizedOptions.map((option, idx) => {
            const isOther = option.value === "__other__" || option.isOther;

            return (
              <div
                key={`${field.id}_${option.value}_${idx}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(idx));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const fromIndex = Number(e.dataTransfer.getData("text/plain"));
                  const toIndex = idx;
                  updateBuilderField(field.id, {
                    options: moveArrayItem(normalizedOptions, fromIndex, toIndex),
                  });
                }}
                style={{
                  border: isOther ? "1.5px dashed #f59e0b" : "1px solid #dbe5f0",
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 12,
                  background: isOther ? "#fff7ed" : "#fff",
                  boxShadow: isOther ? "inset 0 0 0 1px rgba(245,158,11,0.12)" : "none",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 28px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    title="Arrastrar opción"
                    onClick={(e) => e.preventDefault()}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "grab",
                      fontSize: 18,
                      lineHeight: 1,
                      color: isOther ? "#b45309" : "#64748b",
                    }}
                  >
                    ⋮⋮
                  </button>

                  <input type="checkbox" disabled />

                  <input
                    className="gf-optionPreviewInput"
                    value={option.label || ""}
                    onChange={(e) => {
                      const next = [...normalizedOptions];
                      next[idx] = {
                        ...next[idx],
                        label: toTitleCaseText(e.target.value),
                      };
                      updateBuilderField(field.id, { options: next });
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={
                      isOther
                        ? {
                            borderColor: "#f59e0b",
                            background: "#fffbeb",
                            fontWeight: 800,
                          }
                        : undefined
                    }
                  />

                  <button
                    type="button"
                    className="forms-mini-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = normalizedOptions.filter((_, optionIndex) => optionIndex !== idx);
                      updateBuilderField(field.id, { options: next });
                    }}
                    title="Eliminar opción"
                  >
                    <TbTrash />
                  </button>
                </div>

                {isOther ? (
                  <div
                    style={{
                      marginTop: 10,
                      marginLeft: 34,
                      fontSize: 12,
                      fontWeight: 800,
                      color: "#b45309",
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                    }}
                  >
                    Opción especial con texto libre
                  </div>
                ) : null}
                <div style={{ marginTop: 12, marginLeft: 34 }}>
                  {!isOther ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(option.allowText)}
                          onChange={(e) => {
                            const next = [...normalizedOptions];
                            next[idx] = {
                              ...next[idx],
                              allowText: e.target.checked,
                              textPlaceholder: e.target.checked
                                ? next[idx]?.textPlaceholder || "Cantidad"
                                : "",
                              textSuffix: e.target.checked
                                ? next[idx]?.textSuffix || ""
                                : "",
                            };
                            updateBuilderField(field.id, { options: next });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        Permitir texto adicional al seleccionar esta opción
                      </label>

                      {option.allowText ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 140px",
                            gap: 10,
                          }}
                        >
                          <input
                            className="gf-optionPreviewInput"
                            value={option.textPlaceholder || ""}
                            placeholder="Placeholder"
                            onChange={(e) => {
                              const next = [...normalizedOptions];
                              next[idx] = {
                                ...next[idx],
                                textPlaceholder: toTitleCaseText(e.target.value),
                              };
                              updateBuilderField(field.id, { options: next });
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />

                          <input
                            className="gf-optionPreviewInput"
                            value={option.textSuffix || ""}
                            placeholder="Sufijo"
                            onChange={(e) => {
                              const next = [...normalizedOptions];
                              next[idx] = {
                                ...next[idx],
                                textSuffix: e.target.value.toUpperCase(),
                              };
                              updateBuilderField(field.id, { options: next });
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {(option.children || []).map((child, childIdx) => (
                    <div
                      key={`${field.id}_${option.value}_child_${childIdx}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("childIndex", String(childIdx));
                        e.dataTransfer.setData("parentValue", String(option.value));
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();

                        const fromChildIndex = Number(e.dataTransfer.getData("childIndex"));
                        const parentValue = e.dataTransfer.getData("parentValue");

                        if (parentValue !== String(option.value)) return;

                        const next = [...normalizedOptions];
                        const currentChildren = [...(next[idx].children || [])];
                        next[idx] = {
                          ...next[idx],
                          children: moveArrayItem(currentChildren, fromChildIndex, childIdx),
                        };

                        updateBuilderField(field.id, { options: next });
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "24px 22px 1fr auto",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                    >
                      <button
                        type="button"
                        title="Arrastrar subselección"
                        onClick={(e) => e.preventDefault()}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "grab",
                          fontSize: 16,
                          lineHeight: 1,
                          color: "#64748b",
                        }}
                      >
                        ⋮⋮
                      </button>

                      <input type="checkbox" disabled />

                      <input
                        className="gf-optionPreviewInput"
                        value={child?.label || ""}
                        onChange={(e) => {
                          const next = [...normalizedOptions];
                          const nextChildren = [...(next[idx].children || [])];
                          nextChildren[childIdx] = {
                            ...nextChildren[childIdx],
                            label: toTitleCaseText(e.target.value),
                          };
                          next[idx] = {
                            ...next[idx],
                            children: nextChildren,
                          };
                          updateBuilderField(field.id, { options: next });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <button
                        type="button"
                        className="forms-mini-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = [...normalizedOptions];
                          next[idx] = {
                            ...next[idx],
                            children: (next[idx].children || []).filter(
                              (_, removeChildIdx) => removeChildIdx !== childIdx
                            ),
                          };
                          updateBuilderField(field.id, { options: next });
                        }}
                        title="Eliminar subopción"
                      >
                        <TbTrash />
                      </button>
                    </div>
                  ))}

                  {!isOther ? (
                    <button
                      type="button"
                      className="forms-btn forms-btn--ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = [...normalizedOptions];
                        next[idx] = {
                          ...next[idx],
                          children: [
                            ...(next[idx].children || []),
                            {
                              value: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                              label: `Subopción ${(next[idx].children || []).length + 1}`,
                            },
                          ],
                        };
                        updateBuilderField(field.id, { options: next });
                      }}
                    >
                      <TbPlus />
                      Agregar subselección
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
            <button
              type="button"
              className="forms-btn forms-btn--ghost"
              onClick={(e) => {
                e.stopPropagation();
                updateBuilderField(field.id, {
                  options: [
                    ...normalizedOptions.filter((item) => item.value !== "__other__"),
                    createChoiceOption(
                      `Opción ${normalizedOptions.filter((item) => item.value !== "__other__").length + 1}`
                    ),
                    ...normalizedOptions.filter((item) => item.value === "__other__"),
                  ],
                });
              }}
            >
              <TbPlus />
              Agregar opción
            </button>

            {!normalizedOptions.some((item) => item.value === "__other__") ? (
              <button
                type="button"
                className="forms-btn forms-btn--ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  updateBuilderField(field.id, {
                    options: [
                      ...normalizedOptions,
                      {
                        value: "__other__",
                        label: "Otros",
                        isOther: true,
                        children: [],
                      },
                    ],
                  });
                }}
              >
                <TbPlus />
                Agregar "Otros"
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div>
        {normalizedOptions.map((option, idx) => {
          const isChecked = selected.includes(option.value);
          const isOther = option.value === "__other__" || option.isOther;

          return (
            <div
              key={`${field.id}_${option.value}_${idx}`}
              style={{
                marginBottom: 10,
                padding: isOther ? 12 : 0,
                borderRadius: isOther ? 14 : 0,
                border: isOther && isChecked ? "1px dashed #f59e0b" : "none",
                background: isOther && isChecked ? "#fff7ed" : "transparent",
              }}
            >
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={!live}
                  onChange={(e) => {
                    if (!live) return;

                    if (e.target.checked) {
                      updateAnswer(field, {
                        ...state,
                        selected: [...selected, option.value],
                      });
                    } else {
                      const nextChildSelections = { ...childSelections };
                      delete nextChildSelections[option.value];

                      const nextOptionTextValues = { ...optionTextValues };
                      delete nextOptionTextValues[option.value];

                      updateAnswer(field, {
                        ...state,
                        selected: selected.filter((x) => x !== option.value),
                        childSelections: nextChildSelections,
                        optionTextValues: nextOptionTextValues,
                        otherText: option.value === "__other__" ? "" : state.otherText,
                      });
                    }
                  }}
                />
                <span style={isOther ? { fontWeight: 800, color: "#b45309" } : undefined}>
                  {isOther ? `✦ ${option.label}` : option.label}
                </span>
              </label>

              {isOther && isChecked ? (
                <div style={{ marginLeft: 34, marginTop: 8 }}>
                  <input
                    className="field-box"
                    type="text"
                    placeholder="Especifica otro..."
                    value={state.otherText || ""}
                    readOnly={!live}
                    onChange={(e) =>
                      updateAnswer(field, {
                        ...state,
                        otherText: toTitleCaseText(e.target.value),
                      })
                    }
                    style={{
                      borderColor: "#f59e0b",
                      background: "#fffbeb",
                    }}
                  />
                </div>
              ) : null}

              {!isOther && isChecked && option.allowText ? (
                <div
                  style={{
                    marginLeft: 34,
                    marginTop: 8,
                    display: "grid",
                    gridTemplateColumns: option.textSuffix ? "minmax(140px, 220px) auto" : "minmax(140px, 220px)",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    className="field-box"
                    type="text"
                    placeholder={option.textPlaceholder || "Escribe un valor"}
                    value={optionTextValues[option.value] || ""}
                    readOnly={!live}
                    onChange={(e) =>
                      updateAnswer(field, {
                        ...state,
                        optionTextValues: {
                          ...optionTextValues,
                          [option.value]: toTitleCaseText(e.target.value),
                        },
                      })
                    }
                  />

                  {option.textSuffix ? (
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 13,
                        color: "#334155",
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      {option.textSuffix}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {!isOther && isChecked && Array.isArray(option.children) && option.children.length ? (
                <div style={{ marginLeft: 34, marginTop: 8 }}>
                  {option.children.map((child, childIdx) => {
                    const currentChildSelected = Array.isArray(childSelections[option.value])
                      ? childSelections[option.value]
                      : [];

                    const childValue = child?.value || `child_${childIdx}`;
                    const childChecked = currentChildSelected.includes(childValue);

                    return (
                      <label className="checkbox-line" key={`${option.value}_${childValue}_${childIdx}`}>
                        <input
                          type="checkbox"
                          checked={childChecked}
                          disabled={!live}
                          onChange={(e) => {
                            if (!live) return;

                            const nextParentChildren = Array.isArray(childSelections[option.value])
                              ? [...childSelections[option.value]]
                              : [];

                            const nextChildSelections = { ...childSelections };

                            if (e.target.checked) {
                              nextChildSelections[option.value] = [
                                ...nextParentChildren,
                                childValue,
                              ];
                            } else {
                              nextChildSelections[option.value] = nextParentChildren.filter(
                                (item) => item !== childValue
                              );
                            }

                            updateAnswer(field, {
                              ...state,
                              childSelections: nextChildSelections,
                            });
                          }}
                        />
                        <span>{child?.label || `Subopción ${childIdx + 1}`}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (field.type === "traffic_light") {
    const selectedValue = live ? value || "" : "";
    const options =
      Array.isArray(field.options) && field.options.length
        ? field.options
        : TRAFFIC_LIGHT_DEFAULT_OPTIONS;

    const selectedOption = options.find((opt) => opt.value === selectedValue);

    if (previewOnly) {
      return (
        <div className="traffic-light-field">
          <div className="gf-optionPreviewList">
            {options.map((option, idx) => (
              <div className="traffic-light-edit-row" key={`${field.id}_${idx}`}>
                <div
                  className="traffic-light-edit-row__color"
                  style={{ background: option.color }}
                />
                <input
                  className="gf-optionPreviewInput"
                  value={option.label || ""}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx] = {
                      ...next[idx],
                      label: toTitleCaseText(e.target.value),
                    };
                    updateBuilderField(field.id, { options: next });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Texto de la opción"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="traffic-light-field">
        <div className="forms-select-shell">
          <ProSelect
            className="forms-select forms-select--field traffic-select"
            value={selectedValue}
            disabled={!live}
            onChange={(e) => updateAnswer(field, e.target.value)}
            placeholder="Selecciona validación"
            options={[
              { value: "", label: "Selecciona validación", color: "#94a3b8" },
              ...options.map((option) => ({
                value: option.value,
                label: option.label,
                color: option.color,
              })),
            ]}
            renderValue={(opt) => {
              const current =
                opt && opt.value !== ""
                  ? opt
                  : selectedOption
                  ? {
                      value: selectedOption.value,
                      label: selectedOption.label,
                      color: selectedOption.color,
                    }
                  : null;

              return (
                <span
                  className={`traffic-select__pill ${
                    current?.value ? "traffic-select__pill--selected" : "traffic-select__pill--placeholder"
                  }`}
                  style={
                    current?.value
                      ? {
                          "--traffic-color": current.color || "#94a3b8",
                        }
                      : undefined
                  }
                >
                  <span
                    className="traffic-select__dot"
                    style={{
                      background: current?.color || "#cbd5e1",
                    }}
                  />
                  <span className="traffic-select__text">
                    {current?.label || "Selecciona validación"}
                  </span>
                </span>
              );
            }}
            renderOption={(opt, meta) => (
              <div
                className={`traffic-select__option ${
                  meta.selected ? "traffic-select__option--selected" : ""
                }`}
              >
                <span
                  className={`traffic-select__pill traffic-select__pill--menu ${
                    opt.value ? "traffic-select__pill--selected" : "traffic-select__pill--placeholder"
                  }`}
                  style={
                    opt.value
                      ? {
                          "--traffic-color": opt.color || "#94a3b8",
                        }
                      : undefined
                  }
                >
                  <span
                    className="traffic-select__dot"
                    style={{ background: opt.color || "#cbd5e1" }}
                  />
                  <span className="traffic-select__text">{opt.label}</span>
                </span>
              </div>
            )}
          />
        </div>

        <div className="traffic-light-field__legend" style={{ justifyContent: "center" }}>
          {options.map((option, idx) => (
            <div
              className="traffic-light-field__legendItem"
              key={`${field.id}_legend_${idx}`}
              style={{ fontWeight: 900 }}
            >
              <span
                className="traffic-light-field__dot"
                style={{ background: option.color }}
              />
              <span>{option.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === "phone") {
    return (
      <input
        className="field-box"
        type="text"
        inputMode="numeric"
        placeholder={field.placeholder || ""}
        value={live ? value || "" : ""}
        readOnly={!live}
        onChange={(e) => {
          const onlyNumbers = String(e.target.value || "").replace(/\D/g, "");
          updateAnswer(field, onlyNumbers);
        }}
      />
    );
  }

  if (field.type === "email") {
    return (
      <input
        className="field-box"
        type="email"
        inputMode="email"
        placeholder={field.placeholder || "correo@dominio.com"}
        value={live ? value || "" : ""}
        readOnly={!live}
        required={!!field.required}
        pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
        title="Ingresa un correo válido que incluya @"
        onChange={(e) => updateAnswer(field, e.target.value)}
        onInvalid={(e) => {
          e.target.setCustomValidity("Ingresa un correo válido que incluya @");
        }}
        onInput={(e) => {
          e.target.setCustomValidity("");
        }}
      />
    );
  }

  if (field.type === "address") {
    const addr = value || { street: "", city: "", state: "", zip: "", reference: "" };
    return (
      <div className="forms-stack">
        <input
          className="field-box"
          placeholder="Calle y número"
          value={addr.street || ""}
          readOnly={!live}
          onChange={(e) =>
            updateAnswer(field, { ...addr, street: toTitleCaseText(e.target.value) })
          }
        />
        <div className="inline-grid-3">
          <input
            className="field-box"
            placeholder="Ciudad"
            value={addr.city || ""}
            readOnly={!live}
            onChange={(e) =>
              updateAnswer(field, { ...addr, city: toTitleCaseText(e.target.value) })
            }
          />
          <input
            className="field-box"
            placeholder="Estado"
            value={addr.state || ""}
            readOnly={!live}
            onChange={(e) =>
              updateAnswer(field, { ...addr, state: toTitleCaseText(e.target.value) })
            }
          />
          <input
            className="field-box"
            placeholder="CP"
            value={addr.zip || ""}
            readOnly={!live}
            onChange={(e) =>
              updateAnswer(field, { ...addr, zip: e.target.value.replace(/\D/g, "") })
            }
          />
        </div>
        <input
          className="field-box"
          placeholder="Referencia"
          value={addr.reference || ""}
          readOnly={!live}
          onChange={(e) =>
            updateAnswer(field, { ...addr, reference: toTitleCaseText(e.target.value) })
          }
        />
      </div>
    );
  }

  if (field.type === "date") {
    const pickerValue = parseDateValue(live ? value : "");

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es-mx">
        <div className="forms-stack forms-stack--centered">
          <div
            className="forms-row-2"
            style={{
              gridTemplateColumns: "minmax(220px, 320px) auto",
              justifyContent: "center",
            }}
          >
            <DatePicker
              value={pickerValue}
              disabled={!live || previewOnly}
              onChange={(newValue) => {
                if (!live || previewOnly) return;
                updateAnswer(field, newValue ? newValue.format("YYYY-MM-DD") : "");
              }}
              format="DD/MM/YYYY"
              views={["year", "month", "day"]}
              openTo="day"
              showDaysOutsideCurrentMonth
              slotProps={{
                textField: {
                  fullWidth: true,
                  placeholder: field.placeholder || "Selecciona fecha",
                },
                field: {
                  clearable: true,
                },
                popper: {
                  placement: "bottom-start",
                  className: "forms-picker-popper",
                },
                mobilePaper: {
                  className: "forms-picker-mobilePaper",
                },
                desktopPaper: {
                  className: "forms-picker-desktopPaper",
                },
              }}
            />

            {!previewOnly ? (
              <button
                type="button"
                className="forms-btn forms-btn--ghost"
                onClick={() => updateAnswer(field, dayjs().format("YYYY-MM-DD"))}
              >
                Hoy
              </button>
            ) : null}
          </div>
        </div>
      </LocalizationProvider>
    );
  }

  if (field.type === "time") {
    const pickerValue = parseTimeValue(live ? value : "");

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es-mx">
        <div className="forms-stack forms-stack--centered">
          <div
            className="forms-row-2"
            style={{
              gridTemplateColumns: "minmax(180px, 260px) auto",
              justifyContent: "center",
            }}
          >
            <TimePicker
              value={pickerValue}
              disabled={!live || previewOnly}
              onChange={(newValue) => {
                if (!live || previewOnly) return;
                updateAnswer(field, newValue ? newValue.format("HH:mm") : "");
              }}
              ampm={false}
              views={["hours", "minutes"]}
              slotProps={{
                textField: {
                  fullWidth: true,
                  placeholder: field.placeholder || "Selecciona hora",
                },
                field: {
                  clearable: true,
                },
                popper: {
                  placement: "bottom-start",
                  className: "forms-picker-popper",
                },
                mobilePaper: {
                  className: "forms-picker-mobilePaper",
                },
                desktopPaper: {
                  className: "forms-picker-desktopPaper",
                },
              }}
            />

            {!previewOnly ? (
              <button
                type="button"
                className="forms-btn forms-btn--ghost"
                onClick={() => updateAnswer(field, dayjs().format("HH:mm"))}
              >
                Ahora
              </button>
            ) : null}
          </div>
        </div>
      </LocalizationProvider>
    );
  }

  if (field.type === "datetime") {
    const pickerValue = parseDateTimeValue(live ? value : "");

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es-mx">
        <div className="forms-stack forms-stack--centered">
          <div className="field-pickerRow field-pickerRow--compact" style={{ justifyContent: "center" }}>
            <div className="field-pickerInput field-pickerInput--datetime" style={{ minWidth: 280, maxWidth: 360 }}>
              <DateTimePicker
                value={pickerValue}
                disabled={!live || previewOnly}
                onChange={(newValue) => {
                  if (!live || previewOnly) return;
                  updateAnswer(
                    field,
                    newValue ? newValue.format("YYYY-MM-DDTHH:mm") : ""
                  );
                }}
                ampm={false}
                views={["year", "month", "day", "hours", "minutes"]}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    placeholder: field.placeholder || "Selecciona fecha y hora",
                  },
                  field: {
                    clearable: true,
                  },
                  popper: {
                    placement: "bottom-start",
                    className: "forms-picker-popper",
                  },
                  mobilePaper: {
                    className: "forms-picker-mobilePaper",
                  },
                  desktopPaper: {
                    className: "forms-picker-desktopPaper",
                  },
                }}
              />
            </div>

            {!previewOnly ? (
              <button
                type="button"
                className="forms-btn forms-btn--ghost field-pickerBtn"
                onClick={() => updateAnswer(field, dayjs().format("YYYY-MM-DDTHH:mm"))}
              >
                Hoy
              </button>
            ) : null}
          </div>
        </div>
      </LocalizationProvider>
    );
  }

  if (field.type === "file" || field.type === "image") {
    const files = Array.isArray(value) ? value : [];
    const maxFiles = Math.min(5, Math.max(1, Number(field.settings?.maxFiles || 1)));
    const isImageField = field.type === "image";
    const dragActive = Boolean(fileDragOverMap[field.id]);
    const canAddMore = files.length < maxFiles;
    const hasFiles = files.length > 0;

    if (previewOnly) {
      return (
        <div className="upload-dropzone upload-dropzone--preview upload-dropzone--centered">
          <div className="upload-dropzone__icon">
            {isImageField ? <TbPhoto /> : <TbUpload />}
          </div>
          <div className="upload-dropzone__title">
            {isImageField ? "Arrastra fotos aquí" : "Arrastra archivos aquí"}
          </div>
          <div className="upload-dropzone__hint">
            Máximo {maxFiles} archivo(s)
          </div>
        </div>
      );
    }

    return (
      <div className="forms-stack forms-stack--centered">
        <input
          ref={(ref) => {
            if (ref) fileInputRefs.current[field.id] = ref;
          }}
          type="file"
          hidden
          multiple={maxFiles > 1}
          accept={isImageField ? "image/*" : undefined}
          onChange={async (e) => {
            const selectedFiles = e.target.files;
            if (!selectedFiles || !selectedFiles.length) {
              e.target.value = "";
              return;
            }

            await handleFiles(field, selectedFiles);
            e.target.value = "";
          }}
        />

        {!hasFiles ? (
          <div
            className={`upload-dropzone upload-dropzone--centered ${dragActive ? "upload-dropzone--active" : ""} ${
              !canAddMore ? "upload-dropzone--disabled" : ""
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!canAddMore) return;
              handleFileDragState(field.id, true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!canAddMore) return;
              handleFileDragState(field.id, true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFileDragState(field.id, false);
            }}
            onDrop={(e) => {
              if (!canAddMore) {
                e.preventDefault();
                e.stopPropagation();
                handleFileDragState(field.id, false);
                return;
              }
              handleFileDrop(e, field);
            }}
            onClick={() => {
              if (!canAddMore) return;
              openNativeFilePicker(field.id, fileInputRefs);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!canAddMore) return;
                openNativeFilePicker(field.id, fileInputRefs);
              }
            }}
          >
            <div className="upload-dropzone__icon">
              {isImageField ? <TbPhoto /> : <TbUpload />}
            </div>

            <div className="upload-dropzone__title">
              {isImageField ? "Arrastra fotos aquí" : "Arrastra archivos aquí"}
            </div>

            <div className="upload-dropzone__or">o</div>

            <button
              type="button"
              className="upload-dropzone__browse"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!canAddMore) return;
                openNativeFilePicker(field.id, fileInputRefs);
              }}
            >
              Seleccionar archivos
            </button>

            <div className="upload-dropzone__hint">
              {isImageField ? "Solo imágenes" : "Cualquier documento"} • Máximo {maxFiles}
            </div>
          </div>
        ) : (
          <div className="upload-galleryWrap">
            <div className="upload-galleryHead">
              <div className="upload-galleryHead__count">
                {files.length} / {maxFiles} archivo(s)
              </div>

              {canAddMore ? (
                <button
                  type="button"
                  className="forms-btn forms-btn--ghost upload-galleryHead__addBtn"
                  onClick={() => openNativeFilePicker(field.id, fileInputRefs)}
                >
                  <TbPlus />
                  Agregar
                </button>
              ) : null}
            </div>

            <div className="upload-grid upload-grid--gallery">
              {files.map((file, idx) => {
                const thumb = getFileThumb(file);
                const previewable = isPreviewableInModal(file);
                const extension = getFileExtension(file.name || "");
                const fileTypeLabel = isImageField
                  ? "Foto"
                  : extension
                  ? extension.toUpperCase()
                  : "Archivo";

                return (
                  <div className="upload-card upload-card--gallery" key={file.id || `${field.id}_${idx}`}>
                    <button
                      type="button"
                      className="upload-card__remove"
                      onClick={() => removeUploadedFile(field, file.id)}
                      title="Eliminar archivo"
                    >
                      <TbX />
                    </button>

                    <div
                      className={`upload-card__preview upload-card__preview--gallery ${previewable ? "upload-card__preview--clickable" : ""}`}
                      onClick={() => previewable && openFilePreview(file)}
                    >
                      {thumb ? (
                        <img src={thumb} alt={file.name} className="upload-card__image upload-card__image--gallery" />
                      ) : (
                        <div className="upload-card__fileThumb">
                          {isImageField ? <TbPhoto /> : <TbFile />}
                        </div>
                      )}
                    </div>

                    <div className="upload-card__meta upload-card__meta--gallery">
                      <div className="upload-card__fileType">{fileTypeLabel}</div>

                      <input
                        className="upload-card__nameInput upload-card__nameInput--gallery"
                        value={file.name || ""}
                        onChange={(e) => renameUploadedFile(field, file.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      <div className="upload-card__size">
                        {Math.max(1, Math.round((Number(file.size || 0) / 1024) * 10) / 10)} KB
                      </div>

                      {file.uploading || Number(file.progress || 0) < 100 ? (
                        <div className="upload-card__progressWrap">
                          <div className="upload-card__progressBar">
                            <div
                              className="upload-card__progressFill"
                              style={{ width: `${Number(file.progress || 0)}%` }}
                            />
                          </div>
                          <div className="upload-card__progressText">
                            Subiendo {Number(file.progress || 0)}%
                          </div>
                        </div>
                      ) : (
                        <div className="upload-card__actions upload-card__actions--centered">
                          {previewable ? (
                            <button
                              type="button"
                              className="upload-card__action"
                              onClick={() => openFilePreview(file)}
                            >
                              <TbEye />
                              Ver
                            </button>
                          ) : null}

                          {file.dataUrl ? (
                            <a
                              className="upload-card__action"
                              href={file.dataUrl}
                              download={file.name || "archivo"}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <TbDownload />
                              Descargar
                            </a>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (field.type === "signature") {
    const signatureDetails = Array.isArray(field.settings?.signature_details)
      ? field.settings.signature_details.map((item, idx) =>
          normalizeSignatureDetailField(item, idx)
        )
      : [];

    const signatureState =
      value && typeof value === "object" && !Array.isArray(value)
        ? {
            signature: value.signature ?? value.dataUrl ?? "",
            details:
              value.details && typeof value.details === "object" && !Array.isArray(value.details)
                ? value.details
                : {},
          }
        : {
            signature: typeof value === "string" ? value : "",
            details: {},
          };

    if (previewOnly) {
      return (
        <div className="forms-stack forms-stack--centered" style={{ width: "100%" }}>
          <div className="field-signature">
            <div style={{ height: 220, background: "#fff" }} />
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: 760,
              display: "grid",
              gap: 12,
              marginTop: 12,
            }}
          >
            {signatureDetails.map((detail, idx) => (
              <div
                key={`${field.id}_${detail.id}_${idx}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "24px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid #dbe5f0",
                  background: "#ffffff",
                }}
              >
                <button
                  type="button"
                  title="Arrastrar subcampo"
                  onClick={(e) => e.preventDefault()}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "grab",
                    fontSize: 18,
                    lineHeight: 1,
                    color: "#64748b",
                  }}
                >
                  ⋮⋮
                </button>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <input
                    className="gf-optionPreviewInput"
                    value={detail.label || ""}
                    placeholder="Etiqueta"
                    onChange={(e) => {
                      const next = signatureDetails.map((item, itemIdx) =>
                        itemIdx === idx
                          ? {
                              ...item,
                              label: toTitleCaseText(e.target.value),
                            }
                          : item
                      );

                      updateBuilderField(field.id, {
                        settings: {
                          ...(field.settings || {}),
                          signature_details: next,
                        },
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <input
                    className="gf-optionPreviewInput"
                    value={detail.placeholder || ""}
                    placeholder="Placeholder"
                    onChange={(e) => {
                      const next = signatureDetails.map((item, itemIdx) =>
                        itemIdx === idx
                          ? {
                              ...item,
                              placeholder: toTitleCaseText(e.target.value),
                            }
                          : item
                      );

                      updateBuilderField(field.id, {
                        settings: {
                          ...(field.settings || {}),
                          signature_details: next,
                        },
                      });
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <button
                  type="button"
                  className="forms-mini-btn"
                  onClick={(e) => {
                    e.stopPropagation();

                    const next = signatureDetails.filter((_, itemIdx) => itemIdx !== idx);

                    updateBuilderField(field.id, {
                      settings: {
                        ...(field.settings || {}),
                        signature_details: next,
                      },
                    });
                  }}
                  title="Eliminar subcampo"
                >
                  <TbTrash />
                </button>
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <button
                type="button"
                className="forms-btn forms-btn--ghost"
                onClick={(e) => {
                  e.stopPropagation();

                  const next = [
                    ...signatureDetails,
                    createSignatureDetailField(signatureDetails.length),
                  ];

                  updateBuilderField(field.id, {
                    settings: {
                      ...(field.settings || {}),
                      signature_details: next,
                    },
                  });
                }}
              >
                <TbPlus />
                Agregar subcampo de firma
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="forms-stack forms-stack--centered" style={{ width: "100%" }}>
        {signatureDetails.length ? (
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              display: "grid",
              gap: 12,
              marginBottom: 12,
            }}
          >
            {signatureDetails.map((detail, idx) => (
              <div
                key={`${field.id}_${detail.id}_${idx}`}
                style={{
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#0f172a",
                    textAlign: "center",
                  }}
                >
                  {detail.label || `Subcampo ${idx + 1}`}
                </div>

                <input
                  className="field-box"
                  type="text"
                  placeholder={detail.placeholder || detail.label || "Escribe aquí..."}
                  value={signatureState.details?.[detail.id] || ""}
                  readOnly={!live}
                  onChange={(e) =>
                    updateAnswer(field, {
                      ...signatureState,
                      details: {
                        ...(signatureState.details || {}),
                        [detail.id]: toTitleCaseText(e.target.value),
                      },
                    })
                  }
                  style={{
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        <div
          className="field-signature field-signature--paint"
          style={{
            background: "#fff",
            borderRadius: 16,
            overflow: "hidden",
            width: "100%",
            maxWidth: 760,
            height: 220,
          }}
          onMouseEnter={() => {
            const sigPad = signatureRefs.current[field.id];
            syncSignatureCanvas(sigPad);
          }}
          onTouchStart={() => {
            const sigPad = signatureRefs.current[field.id];
            syncSignatureCanvas(sigPad);
          }}
        >
          <SignatureCanvas
            ref={(ref) => {
              if (!ref) return;
              signatureRefs.current[field.id] = ref;
              requestAnimationFrame(() => {
                syncSignatureCanvas(ref);
              });
            }}
            penColor="#111827"
            minWidth={1}
            maxWidth={2.2}
            dotSize={1}
            throttle={0}
            velocityFilterWeight={0}
            minDistance={0}
            clearOnResize={false}
            onBegin={() => {
              const sigPad = signatureRefs.current[field.id];
              syncSignatureCanvas(sigPad);
            }}
            onEnd={() => {
              const sigPad = signatureRefs.current[field.id];
              const dataUrl = getSafeSignatureDataUrl(sigPad);
              updateAnswer(field, {
                ...signatureState,
                signature: dataUrl || "",
              });
            }}
            canvasProps={{
              className: "field-signature__canvas",
              style: {
                width: "100%",
                height: "220px",
                background: "#ffffff",
                cursor: "crosshair",
                display: "block",
                touchAction: "none",
                userSelect: "none",
                WebkitUserSelect: "none",
              },
            }}
          />
        </div>

        <div className="answer-actions" style={{ justifyContent: "center" }}>
          <button
            className="forms-btn forms-btn--ghost"
            type="button"
            onClick={() => {
              const sigPad = signatureRefs.current[field.id];
              sigPad?.clear();
              updateAnswer(field, {
                ...signatureState,
                signature: "",
              });
            }}
          >
            Limpiar
          </button>

          <button
            className="forms-btn forms-btn--primary"
            type="button"
            onClick={() => {
              const sigPad = signatureRefs.current[field.id];
              syncSignatureCanvas(sigPad);
              const dataUrl = getSafeSignatureDataUrl(sigPad);
              updateAnswer(field, {
                ...signatureState,
                signature: dataUrl || "",
              });
            }}
          >
            Guardar firma
          </button>
        </div>

        {signatureState.signature ? (
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              borderRadius: 16,
              background: "#fff",
              border: "1px solid #dbe5f0",
              padding: 14,
            }}
          >
            <img
              src={signatureState.signature}
              alt="Firma"
              style={{
                width: "100%",
                maxHeight: 170,
                objectFit: "contain",
                borderRadius: 14,
                background: "#fff",
              }}
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (field.type === "table_purchase") {
    const rows = Array.isArray(value) ? value : [];
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return (
      <div className="forms-stack">
        <table className="forms-table-lite">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Costo unitario</th>
              <th>Importe</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${field.id}_${index}`}>
                <td>
                  <input
                    className="field-box"
                    value={row.description || ""}
                    readOnly={!live}
                    onChange={(e) =>
                      updatePurchaseRow(field, index, {
                        description: toTitleCaseText(e.target.value),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    className="field-box"
                    type="number"
                    value={row.qty || 1}
                    readOnly={!live}
                    onChange={(e) =>
                      updatePurchaseRow(field, index, { qty: e.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    className="field-box"
                    type="number"
                    step="0.01"
                    value={row.unit_cost || 0}
                    readOnly={!live}
                    onChange={(e) =>
                      updatePurchaseRow(field, index, { unit_cost: e.target.value })
                    }
                  />
                </td>
                <td>${Number(row.amount || 0).toFixed(2)}</td>
                <td>
                  {live ? (
                    <button
                      className="forms-mini-btn"
                      type="button"
                      onClick={() => removePurchaseRow(field, index)}
                    >
                      <TbTrash />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="answer-actions" style={{ justifyContent: "space-between" }}>
          <div className="forms-badge">Total: ${total.toFixed(2)}</div>
          {live ? (
            <button
              className="forms-btn forms-btn--ghost"
              type="button"
              onClick={() => addPurchaseRow(field)}
            >
              <TbPlus />
              Agregar fila
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (field.type === "product_list") {
    const rows = Array.isArray(value) ? value : [];
    return (
      <div className="forms-stack">
        <div className="small-note">
          Selecciona uno o varios productos del catálogo
        </div>
        <div className="forms-stack">
          {catalogs.products.map((product) => {
            const checked = rows.some((x) => x.product_id === product.id);
            return (
              <label className="checkbox-line" key={product.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!live}
                  onChange={() => toggleProductSelection(field, product)}
                />
                <span>
                  {product.name} {product.sku ? `(${product.sku})` : ""} — ${Number(product.price || 0).toFixed(2)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (field.type === "cart") {
    const rows = Array.isArray(value) ? value : [];
    const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

    return (
      <div className="forms-stack forms-stack--centered">
        <div className="cart-toolbar">
          <div className="cart-toolbar__title">Explorar productos</div>
          <div className="forms-badge forms-badge--success">
            Total del carrito: ${total.toFixed(2)}
          </div>
        </div>

        <div className="cart-productsExplorer">
          {catalogs.products.length === 0 ? (
            <div className="empty-state">No hay productos disponibles en inventario.</div>
          ) : (
            catalogs.products.map((product) => {
              const active = rows.some((r) => r.product_id === product.id);

              return (
                <button
                  key={product.id}
                  type="button"
                  className={`cart-productCard ${active ? "cart-productCard--active" : ""}`}
                  onClick={() => live && toggleProductSelection(field, product)}
                  disabled={!live}
                >
                  <div className="cart-productCard__media">
                    <TbPackage />
                  </div>

                  <div className="cart-productCard__body">
                    <div className="cart-productCard__name">{product.name}</div>
                    <div className="cart-productCard__meta">
                      <span>{product.sku || "Sin SKU"}</span>
                      <span>{product.unit || "pz"}</span>
                    </div>
                    <div className="cart-productCard__price">
                      ${Number(product.price || 0).toFixed(2)}
                    </div>
                  </div>

                  {active ? <div className="cart-productCard__check">✓</div> : null}
                </button>
              );
            })
          )}
        </div>

        <table className="forms-table-lite forms-table-lite--cart">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Importe</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product_id}>
                <td>
                  <div className="cart-rowProduct">
                    <div className="cart-rowProduct__icon">
                      <TbPackage />
                    </div>
                    <div className="cart-rowProduct__text">
                      <div className="cart-rowProduct__name">{row.name}</div>
                      <div className="cart-rowProduct__sku">{row.sku || "Sin SKU"}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <input
                    className="field-box field-box--compactCenter"
                    type="number"
                    min="1"
                    value={row.qty || 1}
                    readOnly={!live}
                    onChange={(e) =>
                      updateCartRow(field, row.product_id, { qty: e.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    className="field-box field-box--compactCenter"
                    type="number"
                    step="0.01"
                    value={row.price || 0}
                    readOnly={!live}
                    onChange={(e) =>
                      updateCartRow(field, row.product_id, { price: e.target.value })
                    }
                  />
                </td>
                <td>${Number(row.amount || 0).toFixed(2)}</td>
                <td>
                  {live ? (
                    <button
                      className="forms-mini-btn"
                      type="button"
                      onClick={() => removeCartRow(field, row.product_id)}
                    >
                      <TbTrash />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (field.type === "agenda") {
    const ag = value || { date: "", note: "", contact: "" };

    return (
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es-mx">
        <div className="forms-stack forms-stack--centered">
          <div
            className="forms-row-2"
            style={{
              gridTemplateColumns: "minmax(260px, 360px) auto",
              justifyContent: "center",
            }}
          >
            <DateTimePicker
              value={parseDateTimeValue(ag.date || "")}
              disabled={!live}
              onChange={(newValue) =>
                updateAnswer(field, {
                  ...ag,
                  date: newValue ? newValue.format("YYYY-MM-DDTHH:mm") : "",
                })
              }
              ampm={false}
              views={["year", "month", "day", "hours", "minutes"]}
              slotProps={{
                textField: {
                  fullWidth: true,
                  placeholder: "Fecha y hora",
                },
                field: {
                  clearable: true,
                },
                popper: {
                  placement: "bottom-start",
                  className: "forms-picker-popper",
                },
                mobilePaper: {
                  className: "forms-picker-mobilePaper",
                },
                desktopPaper: {
                  className: "forms-picker-desktopPaper",
                },
              }}
            />

            <button
              type="button"
              className="forms-btn forms-btn--ghost"
              onClick={() =>
                updateAnswer(field, {
                  ...ag,
                  date: dayjs().format("YYYY-MM-DDTHH:mm"),
                })
              }
            >
              Ahora
            </button>
          </div>

          <input
            className="field-box"
            type="text"
            placeholder="Contacto / responsable"
            value={ag.contact || ""}
            readOnly={!live}
            onChange={(e) =>
              updateAnswer(field, { ...ag, contact: toTitleCaseText(e.target.value) })
            }
          />

          <textarea
            className="field-box field-box--textarea"
            placeholder="Notas de agenda"
            value={ag.note || ""}
            readOnly={!live}
            onChange={(e) =>
              updateAnswer(field, { ...ag, note: toTitleCaseText(e.target.value) })
            }
          />
        </div>
      </LocalizationProvider>
    );
  }

  return <input className="field-box" type="text" readOnly />;
}

export function renderAnswerValue({ field, value, openFilePreview }) {
  if (value === null || value === undefined || value === "") {
    return <div className="kv-item__value">—</div>;
  }

  if (field.type === "traffic_light") {
    const option = (field.options || []).find((opt) => opt.value === value);

    if (!option) {
      return <div className="kv-item__value">{toTitleCaseText(String(value))}</div>;
    }

    return (
      <span
        className="traffic-select__pill traffic-select__pill--selected"
        style={{ "--traffic-color": option.color || "#94a3b8" }}
      >
        <span
          className="traffic-select__dot"
          style={{ background: option.color || "#94a3b8" }}
        />
        <span className="traffic-select__text">{option.label}</span>
      </span>
    );
  }

  if (field.type === "address") {
    return (
      <div className="kv-item__value">
        {[value.street, value.city, value.state, value.zip, value.reference]
          .filter(Boolean)
          .join(", ")}
      </div>
    );
  }

  if (field.type === "file" || field.type === "image") {
    return (
      <div className="upload-grid">
        {(value || []).map((file, idx) => {
          const thumb = getFileThumb(file);
          const previewable = isPreviewableInModal(file);

          return (
            <div className="upload-card" key={file.id || idx}>
              <div
                className={`upload-card__preview ${previewable ? "upload-card__preview--clickable" : ""}`}
                onClick={() => previewable && openFilePreview(file)}
              >
                {thumb ? (
                  <img src={thumb} alt={file.name} className="upload-card__image" />
                ) : (
                  <div className="upload-card__fileIcon">
                    {field.type === "image" ? <TbPhoto /> : <TbFile />}
                  </div>
                )}
              </div>

              <div className="upload-card__meta">
                <div className="upload-card__nameStatic">{file.name}</div>

                <div className="upload-card__actions">
                  {previewable ? (
                    <button
                      type="button"
                      className="upload-card__action"
                      onClick={() => openFilePreview(file)}
                    >
                      <TbEye />
                      Ver
                    </button>
                  ) : null}

                  {file.dataUrl ? (
                    <a
                      className="upload-card__action"
                      href={file.dataUrl}
                      download={file.name || "archivo"}
                    >
                      <TbDownload />
                      Descargar
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (field.type === "signature") {
    const signatureState =
      value && typeof value === "object" && !Array.isArray(value)
        ? {
            signature: value.signature ?? value.dataUrl ?? "",
            details:
              value.details && typeof value.details === "object" && !Array.isArray(value.details)
                ? value.details
                : {},
          }
        : {
            signature: typeof value === "string" ? value : "",
            details: {},
          };

    const signatureDetails = Array.isArray(field.settings?.signature_details)
      ? field.settings.signature_details.map((item, idx) =>
          normalizeSignatureDetailField(item, idx)
        )
      : [];

    return (
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          margin: "0 auto",
          display: "grid",
          gap: 12,
        }}
      >
        {signatureDetails.length ? (
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {signatureDetails.map((detail, idx) => {
              const detailValue = signatureState.details?.[detail.id];
              if (!detailValue) return null;

              return (
                <div
                  key={`${detail.id}_${idx}`}
                  style={{
                    border: "1px solid #dbe5f0",
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#fff",
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      background: "#0b2239",
                      color: "#fff",
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    {detail.label || `Subcampo ${idx + 1}`}
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {detailValue}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {signatureState.signature ? (
          <img
            src={signatureState.signature}
            alt="Firma"
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 12,
              background: "#fff",
              border: "1px solid #dbe5f0",
              padding: 10,
            }}
          />
        ) : (
          <div className="kv-item__value">—</div>
        )}
      </div>
    );
  }

  if (field.type === "multiselect") {
    const normalizedOptions = (field.options || []).map((option, idx) =>
      normalizeChoiceOption(option, idx)
    );

    const state =
      value && typeof value === "object" && !Array.isArray(value)
        ? {
            selected: Array.isArray(value.selected) ? value.selected : [],
            otherText: value.otherText ?? "",
            childSelections:
              value.childSelections && typeof value.childSelections === "object"
                ? value.childSelections
                : {},
            optionTextValues:
              value.optionTextValues && typeof value.optionTextValues === "object"
                ? value.optionTextValues
                : {},
          }
        : {
            selected: Array.isArray(value) ? value : [],
            otherText: "",
            childSelections: {},
            optionTextValues: {},
          };

    const labels = normalizedOptions
      .filter((option) => (state.selected || []).includes(option.value))
      .map((option) => {
        const childValues = state?.childSelections?.[option.value] || [];
        const childLabels = (option.children || [])
          .filter((child) => childValues.includes(child.value))
          .map((child) => child.label);

        const optionText = state?.optionTextValues?.[option.value] || "";

        if ((option.isOther || option.value === "__other__") && state.otherText) {
          return `✦ ${option.label}: ${state.otherText}`;
        }

        if (option.allowText && optionText) {
          const suffix = option.textSuffix ? ` ${option.textSuffix}` : "";
          return `${option.label}: ${optionText}${suffix}`;
        }

        if (childLabels.length) {
          return `${option.label} (${childLabels.join(", ")})`;
        }

        return option.label;
      });

    return <div className="kv-item__value">{labels.join(", ") || "—"}</div>;
  }

  if (field.type === "product_list") {
    const text = (value || []).map((x) => (typeof x === "string" ? x : x.name)).join(", ");
    return <div className="kv-item__value">{text || "—"}</div>;
  }

  if (field.type === "table_purchase" || field.type === "cart") {
    return (
      <table className="forms-table-lite">
        <thead>
          <tr>
            {field.type === "table_purchase" ? (
              <>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Costo</th>
                <th>Importe</th>
              </>
            ) : (
              <>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Importe</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {(value || []).map((row, idx) => (
            <tr key={idx}>
              {field.type === "table_purchase" ? (
                <>
                  <td>{row.description}</td>
                  <td>{row.qty}</td>
                  <td>${Number(row.unit_cost || 0).toFixed(2)}</td>
                  <td>${Number(row.amount || 0).toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td>{row.name}</td>
                  <td>{row.qty}</td>
                  <td>${Number(row.price || 0).toFixed(2)}</td>
                  <td>${Number(row.amount || 0).toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  if (field.type === "date") {
    return <div className="kv-item__value">{formatDateValue(value) || "—"}</div>;
  }

  if (field.type === "time") {
    return <div className="kv-item__value">{formatTimeValue(value) || "—"}</div>;
  }

  if (field.type === "datetime") {
    const parsed = parseDateTimeValue(value);
    return (
      <div className="kv-item__value">
        {parsed ? parsed.format("DD/MM/YYYY HH:mm") : "—"}
      </div>
    );
  }

  if (field.type === "agenda") {
    return (
      <div className="kv-item__value">
        {value.date ? `${value.date}` : ""} {value.contact ? `— ${value.contact}` : ""}
        {value.note ? ` — ${value.note}` : ""}
      </div>
    );
  }

  if (field.type === "select") {
    const normalizedOptions = (field.options || []).map((option, idx) =>
      normalizeChoiceOption(option, idx)
    );

    const currentValue =
      value && typeof value === "object" && !Array.isArray(value)
        ? value
        : { value: typeof value === "string" ? value : "", otherText: "" };

    const selectedOption = normalizedOptions.find(
      (option) => option.value === currentValue.value
    );

    if (currentValue.value === "__other__" && currentValue.otherText) {
      return (
        <div
          className="kv-item__value"
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px dashed #f59e0b",
            background: "#fff7ed",
            fontWeight: 700,
          }}
        >
          ✦ Otros: {currentValue.otherText}
        </div>
      );
    }

    return <div className="kv-item__value">{selectedOption?.label || "—"}</div>;
  }

  if (typeof value === "object") {
    return <div className="kv-item__value">{JSON.stringify(value)}</div>;
  }

  return <div className="kv-item__value">{toTitleCaseText(String(value))}</div>;
}