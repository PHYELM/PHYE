import React, { useEffect, useMemo, useState } from "react";
import { toTitleCaseText } from "./forms/forms.helpers";
import ProSelect from "../components/ProSelect/ProSelect";
import {
  TbEdit,
  TbUsers,
  TbEye,
  TbX,
  TbFileText,
  TbLayoutGrid,
  TbSend,
  TbTrash,
  TbCheck,
  TbSquareRounded,
  TbChecklist,
  TbMapPin,
  TbAlignLeft,
  TbSignature,
  TbTable,
  TbListDetails,
  TbShoppingCart,
  TbPhoto,
  TbFile,
  TbFileTypePdf,
  TbFileTypeDoc,
  TbFileTypeXls,
  TbArrowsMaximize,
  TbSearch,
} from "react-icons/tb";
import { getFieldIcon } from "./forms/forms.constants";
import "./FormsResponsesTable.css";
import RespondFormModal from "./RespondFormModal";

function formatDateTime(raw) {
  if (!raw) return "—";
  try {
    return new Date(raw).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(raw);
  }
}

function getTrafficLightMeta(field, rawValue) {
  if (field?.type !== "traffic_light") return null;
  return (field.options || []).find((opt) => opt.value === rawValue) || null;
}

function getAnswerWorkerPhoto(answer) {
  return (
    answer?.worker?.profile_photo_url ||
    answer?.worker?.photo_url ||
    answer?.worker?.avatar_url ||
    answer?.worker?.image_url ||
    ""
  );
}

function getAnswerWorkerName(answer) {
  return answer?.worker?.full_name || answer?.worker?.username || "—";
}

function getAnswerWorkerRole(answer) {
  return answer?.level?.name || answer?.worker?.position || "—";
}

function getAnswerDate(answer) {
  return formatDateTime(
    answer?.submitted_at ||
      answer?.updated_at ||
      answer?.created_at ||
      answer?.answered_at
  );
}

function getFileIcon(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();

  if (type.startsWith("image/")) return <TbPhoto />;
  if (type.includes("pdf") || name.endsWith(".pdf")) return <TbFileTypePdf />;
  if (
    type.includes("word") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  ) {
    return <TbFileTypeDoc />;
  }
  if (
    type.includes("sheet") ||
    type.includes("excel") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv")
  ) {
    return <TbFileTypeXls />;
  }

  return <TbFile />;
}

function HeaderCell({ icon, title }) {
  return (
    <div className="frt-thContent">
      <span className="frt-thContent__icon">{icon}</span>
      <span className="frt-thContent__title">{title}</span>
    </div>
  );
}

function shouldOpenInModal(field, rawValue) {
  if (!field) return false;
  if (["textarea", "address", "agenda"].includes(field.type)) return true;
  return typeof rawValue === "string" && rawValue.length > 80;
}

function renderModalValue(field, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return "—";
  }

  if (field?.type === "address" && typeof rawValue === "object") {
    return [
      rawValue.street,
      rawValue.city,
      rawValue.state,
      rawValue.zip,
      rawValue.reference,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (field?.type === "agenda" && typeof rawValue === "object") {
    return [
      rawValue.date ? `Fecha: ${rawValue.date}` : "",
      rawValue.contact ? `Responsable: ${rawValue.contact}` : "",
      rawValue.note ? `Nota: ${rawValue.note}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  if (field?.type === "select" && rawValue && typeof rawValue === "object") {
    if (rawValue.value === "__other__" && rawValue.otherText) {
      return `Otros: ${rawValue.otherText}`;
    }
    return rawValue.value || "—";
  }

  if (field?.type === "signature") {
    const signatureState =
      rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
        ? {
            signature: rawValue.signature ?? rawValue.dataUrl ?? "",
            details:
              rawValue.details && typeof rawValue.details === "object" && !Array.isArray(rawValue.details)
                ? rawValue.details
                : {},
          }
        : {
            signature: typeof rawValue === "string" ? rawValue : "",
            details: {},
          };

    const detailDefs = Array.isArray(field?.settings?.signature_details)
      ? field.settings.signature_details
      : [];

    return (
      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {detailDefs.length ? (
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {detailDefs.map((detail, idx) => {
              const detailValue = signatureState.details?.[detail.id];
              if (!detailValue) return null;

              return (
                <div
                  key={`${detail.id}_${idx}`}
                  style={{
                    border: "1px solid #dbe5ef",
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
                      fontWeight: 900,
                      textAlign: "center",
                    }}
                  >
                    {detail.label || `Subcampo ${idx + 1}`}
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      textAlign: "center",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    {toTitleCaseText(String(detailValue))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {signatureState.signature ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img
              src={signatureState.signature}
              alt="Firma"
              style={{
                maxWidth: "100%",
                maxHeight: 260,
                objectFit: "contain",
                borderRadius: 14,
                border: "1px solid #dbe5ef",
                background: "#fff",
                padding: 10,
              }}
            />
          </div>
        ) : (
          "—"
        )}
      </div>
    );
  }

  if (field?.type === "multiselect" && rawValue && typeof rawValue === "object") {
    const normalizedOptions = (field.options || []).map((option, idx) => {
      if (typeof option === "object") {
        return {
          ...option,
          children: Array.isArray(option.children) ? option.children : [],
          allowText: Boolean(option.allowText),
          textPlaceholder: option.textPlaceholder ?? "",
          textSuffix: option.textSuffix ?? "",
        };
      }

      return {
        value: `opt_${idx}`,
        label: String(option || `Opción ${idx + 1}`),
        children: [],
        allowText: false,
        textPlaceholder: "",
        textSuffix: "",
      };
    });

    const state = {
      selected: Array.isArray(rawValue.selected) ? rawValue.selected : [],
      otherText: rawValue.otherText ?? "",
      childSelections:
        rawValue.childSelections && typeof rawValue.childSelections === "object"
          ? rawValue.childSelections
          : {},
      optionTextValues:
        rawValue.optionTextValues && typeof rawValue.optionTextValues === "object"
          ? rawValue.optionTextValues
          : {},
    };

    const labels = normalizedOptions
      .filter((option) => state.selected.includes(option.value))
      .map((option) => {
        const childValues = state.childSelections?.[option.value] || [];
        const childLabels = (option.children || [])
          .filter((child) => childValues.includes(child.value))
          .map((child) => child.label);

        const optionText = state.optionTextValues?.[option.value] || "";

        if ((option.isOther || option.value === "__other__") && state.otherText) {
          return `${option.label}: ${state.otherText}`;
        }

        if (option.allowText && optionText) {
          return `${option.label}: ${optionText}${option.textSuffix ? ` ${option.textSuffix}` : ""}`;
        }

        if (childLabels.length) {
          return `${option.label} (${childLabels.join(", ")})`;
        }

        return option.label;
      });

    if (!labels.length) return "—";

    return (
      <div className="frt-multiselectModalList">
        {labels.map((item, idx) => (
          <div className="frt-multiselectModalItem" key={idx}>
            <span className="frt-multiselectModalBullet">•</span>
            <span>{toTitleCaseText(String(item))}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof rawValue === "object") {
    return JSON.stringify(rawValue, null, 2);
  }

  return toTitleCaseText(String(rawValue));
}

function renderMiniTable(rows, kind = "purchase", onExpand = null, title = "") {
  if (!Array.isArray(rows) || !rows.length) {
    return <span className="frt-cellText">—</span>;
  }

  return (
    <div className="frt-miniTableWrap">
      {typeof onExpand === "function" ? (
        <button
          type="button"
          className="frt-miniTableExpandBtn"
          title="Ampliar"
          onClick={onExpand}
        >
          <TbArrowsMaximize />
        </button>
      ) : null}

      <table className="frt-miniTable">
        <thead>
          <tr>
            {kind === "purchase" ? (
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
          {rows.map((row, idx) => (
            <tr key={idx}>
              {kind === "purchase" ? (
                <>
                  <td>{row.description || "—"}</td>
                  <td>{row.qty || "—"}</td>
                  <td>${Number(row.unit_cost || 0).toFixed(2)}</td>
                  <td>${Number(row.amount || 0).toFixed(2)}</td>
                </>
              ) : (
                <>
                  <td>{row.name || "—"}</td>
                  <td>{row.qty || "—"}</td>
                  <td>${Number(row.price || 0).toFixed(2)}</td>
                  <td>${Number(row.amount || 0).toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderFileList(rawValue, onOpenFilePreview) {
  if (!Array.isArray(rawValue) || !rawValue.length) {
    return <span className="frt-cellText">—</span>;
  }

  return (
    <div className="frt-fileList">
      {rawValue.map((file, idx) => (
        <button
          key={file.id || `${file.name}_${idx}`}
          type="button"
          className="frt-fileItem"
          title={file.name || "Archivo"}
          onClick={() => onOpenFilePreview?.(file)}
        >
          <span className="frt-fileItem__icon">{getFileIcon(file)}</span>
          <span className="frt-fileItem__name">{file.name || "Archivo"}</span>
        </button>
      ))}
    </div>
  );
}

function buildClientFolioPrefix(title = "") {
  const clean = String(title || "")
    .trim()
    .toUpperCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "FRM";

  const words = clean.split(" ").filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 3).padEnd(3, "X");
  }

  return words
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join("")
    .padEnd(3, "X")
    .slice(0, 3);
}

function padClientFolioNumber(num) {
  return String(Math.max(1, Number(num || 1))).padStart(4, "0");
}

function compareAnswersForClientFolio(a, b) {
  const timeA = new Date(a?.created_at || 0).getTime();
  const timeB = new Date(b?.created_at || 0).getTime();

  if (timeA !== timeB) return timeA - timeB;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function getClientComputedFolio(answer, answers = [], formTitle = "") {
  if (answer?.folio) return answer.folio;

  const ordered = [...(answers || [])].sort(compareAnswersForClientFolio);
  const index = ordered.findIndex((row) => row?.id === answer?.id);

  if (index === -1) return "—";

  const prefix = buildClientFolioPrefix(formTitle);
  return `${prefix}${padClientFolioNumber(index + 1)}`;
}

function renderCellContent({
  answer,
  field,
  rawValue,
  canEditAnswers,
  onQuickUpdateAnswer,
  onExpand,
  onOpenFilePreview,
  onOpenRichPreview,
}) {
  const hasInlineSelect =
    canEditAnswers &&
    typeof onQuickUpdateAnswer === "function" &&
    (field?.type === "select" ||
      field?.type === "select_one" ||
      field?.type === "dropdown" ||
      field?.type === "traffic_light");

  if (hasInlineSelect) {
    const normalizedOptions = Array.isArray(field?.options) ? field.options : [];

    const selectedOption = normalizedOptions.find((opt) => {
      const value = typeof opt === "object" ? opt.value ?? opt.label : opt;
      return value === rawValue;
    });

    const selectColor =
      typeof selectedOption === "object" ? selectedOption.color : null;

    return (
      <select
        className="frt-inlineSelect"
        value={rawValue ?? ""}
        style={{
          background: selectColor || "#0f172a",
          color: "#fff",
          borderColor: selectColor || "#0f172a",
        }}
        onChange={(e) => onQuickUpdateAnswer(answer, field, e.target.value)}
      >
        <option value="">-</option>

        {normalizedOptions.map((opt, idx) => {
          const value =
            typeof opt === "object" ? opt.value ?? opt.label ?? `opt_${idx}` : opt;

          const label =
            typeof opt === "object"
              ? opt.label ?? opt.value ?? `Opción ${idx + 1}`
              : opt;

          return (
            <option key={`${field.id}_${value}_${idx}`} value={value}>
              {label}
            </option>
          );
        })}
      </select>
    );
  }

  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return <span className="frt-cellText">—</span>;
  }

  const trafficMeta = getTrafficLightMeta(field, rawValue);
  if (trafficMeta) {
    return (
      <span
        className="frt-traffic"
        style={{ "--traffic-color": trafficMeta.color || "#94a3b8" }}
        title={trafficMeta.label}
      >
        <span
          className="frt-traffic__dot"
          style={{ background: trafficMeta.color || "#94a3b8" }}
        />
        <span className="frt-traffic__text">{trafficMeta.label}</span>
      </span>
    );
  }

  if (field?.type === "signature") {
    const signatureState =
      rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
        ? {
            signature: rawValue.signature ?? rawValue.dataUrl ?? "",
            details:
              rawValue.details && typeof rawValue.details === "object" && !Array.isArray(rawValue.details)
                ? rawValue.details
                : {},
          }
        : {
            signature: typeof rawValue === "string" ? rawValue : "",
            details: {},
          };

    const detailDefs = Array.isArray(field?.settings?.signature_details)
      ? field.settings.signature_details
      : [];

    const visibleDetails = detailDefs
      .map((detail) => ({
        label: detail.label || "Dato",
        value: signatureState.details?.[detail.id] || "",
      }))
      .filter((item) => item.value)
      .slice(0, 2);

    if (!signatureState.signature && !visibleDetails.length) {
      return <span className="frt-cellText">—</span>;
    }

    return (
      <div
        style={{
          width: "100%",
          display: "grid",
          gap: 8,
          justifyItems: "center",
        }}
      >
        {visibleDetails.length ? (
          <div
            style={{
              width: "100%",
              display: "grid",
              gap: 6,
            }}
          >
            {visibleDetails.map((item, idx) => (
              <div
                key={`${field.id}_sig_detail_${idx}`}
                style={{
                  border: "1px solid #dbe5ef",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 4px 12px rgba(15,23,42,.05)",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    background: "linear-gradient(90deg, rgba(6, 26, 45, 0.98), rgba(7, 39, 53, 0.96))",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: 11,
                    textAlign: "center",
                  }}
                >
                  {item.label}
                </div>

                <div
                  style={{
                    padding: "8px 10px",
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    color: "#0f172a",
                    background: "#ffffff",
                  }}
                >
                  {toTitleCaseText(String(item.value))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {signatureState.signature ? (
          <div className="frt-signatureWrap">
            <button
              type="button"
              className="frt-richPreviewBtn"
              title="Ampliar firma"
              onClick={() =>
                onOpenRichPreview?.({
                  title: field.label,
                  content: (
                    <div
                      style={{
                        width: "100%",
                        display: "grid",
                        gap: 14,
                      }}
                    >
                      {detailDefs
                        .map((detail) => ({
                          label: detail.label || "Dato",
                          value: signatureState.details?.[detail.id] || "",
                        }))
                        .filter((item) => item.value).length ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                          }}
                        >
                          {detailDefs
                            .map((detail) => ({
                              label: detail.label || "Dato",
                              value: signatureState.details?.[detail.id] || "",
                            }))
                            .filter((item) => item.value)
                            .map((item, idx) => (
                              <div
                                key={`rich_sig_detail_${idx}`}
                                style={{
                                  border: "1px solid #dbe5ef",
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
                                    fontWeight: 900,
                                    textAlign: "center",
                                  }}
                                >
                                  {item.label}
                                </div>

                                <div
                                  style={{
                                    padding: "12px 14px",
                                    textAlign: "center",
                                    fontWeight: 800,
                                    color: "#0f172a",
                                  }}
                                >
                                  {toTitleCaseText(String(item.value))}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : null}

                      <div className="frt-richPreviewBody frt-richPreviewBody--signature">
                        <img
                          src={signatureState.signature}
                          alt="Firma"
                          className="frt-richPreviewSignatureImg"
                        />
                      </div>
                    </div>
                  ),
                })
              }
            >
              <TbArrowsMaximize />
            </button>

            <img
              src={signatureState.signature}
              alt="Firma"
              className="frt-signatureImg"
            />
          </div>
        ) : null}
      </div>
    );
  }

  if (field?.type === "table_purchase") {
    return renderMiniTable(
      rawValue,
      "purchase",
      () =>
        onOpenRichPreview?.({
          title: field.label,
          content: (
            <div className="frt-richPreviewBody">
              {renderMiniTable(rawValue, "purchase")}
            </div>
          ),
        }),
      field.label
    );
  }

  if (field?.type === "cart") {
    return renderMiniTable(
      rawValue,
      "cart",
      () =>
        onOpenRichPreview?.({
          title: field.label,
          content: (
            <div className="frt-richPreviewBody">
              {renderMiniTable(rawValue, "cart")}
            </div>
          ),
        }),
      field.label
    );
  }

  if (field?.type === "product_list" && Array.isArray(rawValue)) {
    return (
      <div className="frt-chipList">
        {rawValue.map((item, idx) => (
<span className="frt-chip" key={idx}>
  {toTitleCaseText(item)}
</span>
        ))}
      </div>
    );
  }

  if (field?.type === "select") {
    const normalizedOptions = (field.options || []).map((option, idx) => {
      if (typeof option === "object") return option;
      return {
        value: `opt_${idx}`,
        label: String(option || `Opción ${idx + 1}`),
      };
    });

    const state =
      rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
        ? rawValue
        : { value: typeof rawValue === "string" ? rawValue : "", otherText: "" };

    const selectedOption = normalizedOptions.find(
      (option) => option.value === state.value
    );

    if (state.value === "__other__" && state.otherText) {
      return <span className="frt-cellText frt-cellText--wrap">Otros: {state.otherText}</span>;
    }

    return <span className="frt-cellText frt-cellText--wrap">{selectedOption?.label || "—"}</span>;
  }

  if (field?.type === "multiselect") {
    const normalizedOptions = (field.options || []).map((option, idx) => {
      if (typeof option === "object") {
        return {
          ...option,
          children: Array.isArray(option.children) ? option.children : [],
          allowText: Boolean(option.allowText),
          textPlaceholder: option.textPlaceholder ?? "",
          textSuffix: option.textSuffix ?? "",
        };
      }

      return {
        value: `opt_${idx}`,
        label: String(option || `Opción ${idx + 1}`),
        children: [],
        allowText: false,
        textPlaceholder: "",
        textSuffix: "",
      };
    });

    const state =
      rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
        ? {
            selected: Array.isArray(rawValue.selected) ? rawValue.selected : [],
            otherText: rawValue.otherText ?? "",
            childSelections:
              rawValue.childSelections && typeof rawValue.childSelections === "object"
                ? rawValue.childSelections
                : {},
            optionTextValues:
              rawValue.optionTextValues && typeof rawValue.optionTextValues === "object"
                ? rawValue.optionTextValues
                : {},
          }
        : {
            selected: Array.isArray(rawValue) ? rawValue : [],
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
          return `${option.label}: ${state.otherText}`;
        }

        if (option.allowText && optionText) {
          return `${option.label}: ${optionText}${option.textSuffix ? ` ${option.textSuffix}` : ""}`;
        }

        if (childLabels.length) {
          return `${option.label} (${childLabels.join(", ")})`;
        }

        return option.label;
      });

    if (!labels.length) {
      return <span className="frt-cellText">—</span>;
    }

    const visibleLabels = labels.slice(0, 3);
    const hiddenCount = labels.length - visibleLabels.length;

    return (
      <div className="frt-multiselectWrap">
        <div className="frt-chipList frt-chipList--multiselect">
          {visibleLabels.map((item, idx) => (
            <span className="frt-chip frt-chip--multiselect" key={idx}>
              {toTitleCaseText(String(item))}
            </span>
          ))}

          {hiddenCount > 0 ? (
            <span className="frt-chip frt-chip--count">+{hiddenCount} más</span>
          ) : null}
        </div>

        <button
          type="button"
          className="frt-richPreviewBtn frt-richPreviewBtn--inline"
          title="Ampliar selección múltiple"
          onClick={() =>
            onOpenRichPreview?.({
              title: field.label,
              content: renderModalValue(field, rawValue),
            })
          }
        >
          <TbArrowsMaximize />
        </button>
      </div>
    );
  }

  if (field?.type === "file" || field?.type === "image") {
    return renderFileList(rawValue, onOpenFilePreview);
  }

  if (shouldOpenInModal(field, rawValue)) {
    return (
      <button
        type="button"
        className="frt-expandBtn frt-expandBtn--navy"
        onClick={onExpand}
        title="Ver detalle"
      >
        <TbEye />
      </button>
    );
  }

  if (field?.type === "address" && typeof rawValue === "object") {
    return (
      <span className="frt-cellText frt-cellText--wrap">
        {[rawValue.street, rawValue.city, rawValue.state, rawValue.zip]
          .filter(Boolean)
          .join(", ")}
      </span>
    );
  }

  if (field?.type === "agenda" && typeof rawValue === "object") {
    return (
      <span className="frt-cellText frt-cellText--wrap">
        {[rawValue.date, rawValue.contact].filter(Boolean).join(" • ")}
      </span>
    );
  }

  if (typeof rawValue === "object") {
    return (
      <span className="frt-cellText frt-cellText--wrap">
        {JSON.stringify(rawValue)}
      </span>
    );
  }

  return <span className="frt-cellText frt-cellText--wrap">{toTitleCaseText(String(rawValue))}</span>;
}
function getAnswerTimestamp(answer) {
  const raw =
    answer?.submitted_at ||
    answer?.updated_at ||
    answer?.created_at ||
    answer?.answered_at;

  const time = new Date(raw || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function matchesDateFilter(answer, dateFilter) {
  if (!dateFilter || dateFilter === "all") return true;

  const answerTime = getAnswerTimestamp(answer);
  if (!answerTime) return false;

  const now = Date.now();
  const diff = now - answerTime;

  const DAY = 24 * 60 * 60 * 1000;

  if (dateFilter === "today") {
    const today = new Date();
    const answerDate = new Date(answerTime);

    return (
      today.getFullYear() === answerDate.getFullYear() &&
      today.getMonth() === answerDate.getMonth() &&
      today.getDate() === answerDate.getDate()
    );
  }

  if (dateFilter === "7d") return diff <= 7 * DAY;
  if (dateFilter === "15d") return diff <= 15 * DAY;
  if (dateFilter === "30d") return diff <= 30 * DAY;

  return true;
}

function stringifyAnswerForSearch(answer, form, allAnswers) {
  const workerName = getAnswerWorkerName(answer);
  const workerRole = getAnswerWorkerRole(answer);
  const answeredAt = getAnswerDate(answer);
  const folio = getClientComputedFolio(answer, allAnswers, form?.title || "");

  const fieldValues = (form?.fields || [])
    .filter((field) => field?.type !== "captcha")
    .map((field) => {
      const rawValue = answer?.answers?.[field.id];

      if (rawValue === null || rawValue === undefined) return "";

      if (typeof rawValue === "string" || typeof rawValue === "number") {
        return String(rawValue);
      }

      if (Array.isArray(rawValue)) {
        return rawValue
          .map((item) => {
            if (typeof item === "string") return item;
            if (typeof item === "object" && item) {
              return Object.values(item).join(" ");
            }
            return "";
          })
          .join(" ");
      }

      if (typeof rawValue === "object") {
        return Object.values(rawValue).join(" ");
      }

      return "";
    })
    .join(" ");

  return [
    folio,
    workerName,
    workerRole,
    answeredAt,
    fieldValues,
  ]
    .join(" ")
    .toLowerCase();
}
export default function FormsResponsesTable({
  form,
  answers,
  onEditAnswer,
  onDeleteAnswer,
  onDeleteSelectedAnswers,
  onViewAnswer,
  onBackToForms,
  onOpenRespondModal,
  onOpenFilePreview,
  onQuickUpdateAnswer,
  onExportAnswersExcel,
  canEditAnswers = false,
  respondModalOpen = false,
  respondModalContent = null,
  respondModalTitle = "Responder formulario",
  respondModalHeaderActions = null,
  onRequestCloseRespondModal,
}) {
  const [expandedCell, setExpandedCell] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("");

  const visibleFields = useMemo(() => {
    const systemFolioField = {
      id: "__folio",
      type: "text",
      label: "Folio",
      system: true,
      settings: {
        visibility: "editor_only",
        read_only: true,
      },
    };

    const formFields = (form?.fields || []).filter(
      (field) => field?.type !== "captcha"
    );

    return [systemFolioField, ...formFields];
  }, [form]);

  const filteredAnswers = useMemo(() => {
    const normalizedSearch = String(searchTerm || "").trim().toLowerCase();

    const now = new Date();
    let minDate = null;

    if (datePreset === "today") {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (datePreset === "7d") {
      minDate = new Date(now);
      minDate.setDate(now.getDate() - 7);
    } else if (datePreset === "15d") {
      minDate = new Date(now);
      minDate.setDate(now.getDate() - 15);
    } else if (datePreset === "30d") {
      minDate = new Date(now);
      minDate.setDate(now.getDate() - 30);
    }

    return (answers || []).filter((answer) => {
      const answerDateRaw =
        answer?.submitted_at ||
        answer?.updated_at ||
        answer?.created_at ||
        answer?.answered_at;

      const answerDate = answerDateRaw ? new Date(answerDateRaw) : null;

      if (minDate && answerDate && answerDate < minDate) {
        return false;
      }

      if (!normalizedSearch) return true;

      const workerName = String(getAnswerWorkerName(answer) || "").toLowerCase();
      const workerRole = String(getAnswerWorkerRole(answer) || "").toLowerCase();
      const folio = String(
        getClientComputedFolio(answer, answers, form?.title || "")
      ).toLowerCase();

      const fieldsText = visibleFields
        .map((field) => {
          const rawValue =
            field.id === "__folio"
              ? getClientComputedFolio(answer, answers, form?.title || "")
              : answer?.answers?.[field.id];

          if (rawValue === null || rawValue === undefined) return "";
          if (typeof rawValue === "string" || typeof rawValue === "number") {
            return String(rawValue);
          }
          try {
            return JSON.stringify(rawValue);
          } catch {
            return "";
          }
        })
        .join(" ")
        .toLowerCase();

      return (
        workerName.includes(normalizedSearch) ||
        workerRole.includes(normalizedSearch) ||
        folio.includes(normalizedSearch) ||
        fieldsText.includes(normalizedSearch)
      );
    });
  }, [answers, searchTerm, datePreset, visibleFields, form]);

  const allSelected =
    filteredAnswers.length > 0 &&
    filteredAnswers.every((answer) => selectedIds.includes(answer.id));

  const toggleSelected = (answerId) => {
    setSelectedIds((prev) =>
      prev.includes(answerId)
        ? prev.filter((id) => id !== answerId)
        : [...prev, answerId]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredAnswers.map((answer) => answer.id);

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleDeleteSelectedClick = async () => {
    if (typeof onDeleteSelectedAnswers !== "function") return;
    if (!selectedIds.length) return;

    const ok = await onDeleteSelectedAnswers(selectedIds);

    if (ok) {
      setSelectedIds([]);
    }
  };

  const handleExportExcelClick = async () => {
    if (typeof onExportAnswersExcel !== "function") return;

    await onExportAnswersExcel({
      selectedIds,
      search: searchTerm,
      datePreset,
    });
  };

  useEffect(() => {
    const validIds = new Set((answers || []).map((answer) => answer.id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [answers]);
  return (
    <>
      <div className="frt-wrap frt-wrap--full">
        <div className="frt-head frt-head--toolbar">
          <div className="frt-head__left">
            <h2 className="frt-title">Respuestas — {form?.title || "Formulario"}</h2>
            <p className="frt-sub">
              {filteredAnswers.length} registro(s)
              {searchTerm || dateFilter !== "all" ? ` de ${answers.length}` : ""}
            </p>
          </div>

          <div className="frt-toolbarPro">
            <div className="frt-toolbarPro__filters">
              <div className="frt-searchBox">
                <span className="frt-searchBox__icon">
                  <TbSearch />
                </span>

                <input
                  className="frt-searchBox__input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar folio, usuario, respuesta..."
                />
              </div>

              <div className="frt-filterSelect">
                <ProSelect
                  className="forms-select"
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value)}
                  placeholder="Filtrar por fecha"
                >
                  <option value="">Todas las fechas</option>
                  <option value="today">Hoy</option>
                  <option value="7d">Hace 1 semana</option>
                  <option value="15d">Hace 15 días</option>
                  <option value="30d">Hace 30 días</option>
                </ProSelect>
              </div>
            </div>

            <div className="frt-head__actions frt-head__actions--pro">
              <button
                className="frt-proBtn frt-proBtn--slate"
                type="button"
                onClick={onBackToForms}
              >
                <span className="frt-proBtn__icon">
                  <TbLayoutGrid />
                </span>
                <span>Formularios</span>
              </button>

              {canEditAnswers ? (
                <>
                  <button
                    className="frt-proBtn frt-proBtn--blue"
                    type="button"
                    onClick={toggleSelectAll}
                  >
                    <span className="frt-proBtn__icon">
                      {allSelected ? <TbCheck /> : <TbChecklist />}
                    </span>
                    <span>{allSelected ? "Deseleccionar todo" : "Seleccionar todo"}</span>
                  </button>

                  <button
                    className="frt-iconBtn frt-iconBtn--excel"
                    type="button"
                    title={
                      selectedIds.length
                        ? `Exportar ${selectedIds.length} seleccionada(s) a Excel`
                        : "Exportar todas las respuestas filtradas a Excel"
                    }
                    onClick={handleExportExcelClick}
                  >
                    <TbFileTypeXls />
                  </button>

                  <button
                    className="frt-iconBtn frt-iconBtn--danger"
                    type="button"
                    title={`Eliminar seleccionadas (${selectedIds.length})`}
                    disabled={!selectedIds.length}
                    onClick={handleDeleteSelectedClick}
                  >
                    <TbTrash />
                    <span className="frt-iconBtn__count">{selectedIds.length}</span>
                  </button>
                </>
              ) : null}

              <button
                className="frt-proBtn frt-proBtn--green"
                type="button"
                onClick={onOpenRespondModal}
              >
                <span className="frt-proBtn__icon">
                  <TbSend />
                </span>
                <span>Responder</span>
              </button>
            </div>
          </div>
        </div>

        {!filteredAnswers.length ? (
          <div className="frt-empty">No hay respuestas con esos filtros.</div>
        ) : (
          <div className="frt-tableWrap frt-tableWrap--full">
            <div className="frt-tableViewport">
              <div className="frt-tableScroller">
                <table className="frt-table">
<thead>
  <tr>
    <th className="frt-th frt-th--actions">
      <HeaderCell icon={<TbChecklist />} title="Acciones" />
    </th>

    {visibleFields.map((field) => (
      <th key={field.id} className="frt-th">
        <HeaderCell
          icon={getFieldIcon(field.type)}
          title={field.label}
        />
      </th>
    ))}

    <th className="frt-th frt-th--answeredBy">
      <HeaderCell icon={<TbUsers />} title="Respondido por" />
    </th>
  </tr>
</thead>

<tbody>
  {filteredAnswers.map((answer) => {
    const workerPhoto = getAnswerWorkerPhoto(answer);
    const workerName = getAnswerWorkerName(answer);
    const workerRole = getAnswerWorkerRole(answer);
    const answeredAt = getAnswerDate(answer);
    const isSelected = selectedIds.includes(answer.id);

    return (
      <tr key={answer.id}>
        <td className="frt-cell frt-cell--actions">
          <div className="frt-actionGroup">
            <button
              type="button"
              className="frt-actionBtn"
              title="Visualizar"
              onClick={() => onViewAnswer?.(answer)}
            >
              <TbEye />
            </button>

            {canEditAnswers ? (
              <>
                <button
                  type="button"
                  className="frt-actionBtn"
                  title="Editar"
                  onClick={() => onEditAnswer?.(answer)}
                >
                  <TbEdit />
                </button>

                <button
                  type="button"
                  className="frt-actionBtn frt-actionBtn--danger"
                  title="Eliminar"
                  onClick={() => onDeleteAnswer?.(answer)}
                >
                  <TbTrash />
                </button>

                <button
                  type="button"
                  className={`frt-actionBtn frt-actionBtn--select ${isSelected ? "frt-actionBtn--selected" : ""}`}
                  title="Seleccionar"
                  onClick={() => toggleSelected(answer.id)}
                >
                  {isSelected ? <TbCheck /> : <TbSquareRounded />}
                </button>
              </>
            ) : null}
          </div>
        </td>

        {visibleFields.map((field) => {
          const rawValue =
            field.id === "__folio"
              ? getClientComputedFolio(answer, answers, form?.title || "")
              : answer.answers?.[field.id];

          return (
            <td key={`${answer.id}_${field.id}`} className="frt-cell">
              {renderCellContent({
                answer,
                field,
                rawValue,
                canEditAnswers,
                onQuickUpdateAnswer,
                onOpenFilePreview,
                onExpand: () =>
                  setExpandedCell({
                    title: field.label,
                    value: renderModalValue(field, rawValue),
                  }),
                onOpenRichPreview: ({ title, content }) =>
                  setExpandedCell({
                    title,
                    value: content,
                  }),
              })}
            </td>
          );
        })}

        <td className="frt-cell frt-cell--answeredBy">
          <div className="frt-answeredByCard">
            <div className="frt-answeredByCard__photoWrap">
              {workerPhoto ? (
                <img
                  src={workerPhoto}
                  alt={workerName}
                  className="frt-answeredByCard__photo"
                />
              ) : (
                <div className="frt-answeredByCard__photoPlaceholder">
                  <TbUsers />
                </div>
              )}
            </div>

            <div className="frt-answeredByCard__info">
              <div className="frt-answeredByCard__name">{workerName}</div>
              <div className="frt-answeredByCard__role">{workerRole}</div>
              <div className="frt-answeredByCard__date">{answeredAt}</div>
            </div>
          </div>
        </td>
      </tr>
    );
  })}
</tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {expandedCell ? (
        <div className="frt-modalBack" onClick={() => setExpandedCell(null)}>
          <div className="frt-modal frt-modal--pro" onClick={(e) => e.stopPropagation()}>
            <div className="frt-modal__top frt-modal__top--pro">
              <div className="frt-modal__titleWrap">
                <TbFileText />
                <h3>{expandedCell.title}</h3>
              </div>

              <button
                type="button"
                className="frt-modal__close"
                onClick={() => setExpandedCell(null)}
              >
                <TbX />
              </button>
            </div>

            <div className="frt-modal__body frt-modal__body--pro">
              {expandedCell.value}
            </div>
          </div>
        </div>
      ) : null}

<RespondFormModal
  open={respondModalOpen}
  title={respondModalTitle}
  headerActions={respondModalHeaderActions}
  skipCloseConfirm={respondModalTitle === "Vista previa de respuesta"}
  onRequestClose={onRequestCloseRespondModal}
>
  {respondModalContent}
</RespondFormModal>
    </>
  );
}