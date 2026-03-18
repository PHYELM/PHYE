import React from "react";
import { createPortal } from "react-dom";
import { TbPlus, TbSettings, TbTrash, TbX } from "react-icons/tb";
import ProSelect from "../../components/ProSelect/ProSelect";
import {
  FIELD_TYPE_OPTIONS,
  VISIBILITY_OPTIONS,
  TRAFFIC_LIGHT_DEFAULT_OPTIONS,
} from "./forms.constants";

export default function FieldConfigModal({
  field,
  isOpen,
  onToggle,
  onClose,
  onChangeFieldType,
  onUpdateField,
  onUpdateFieldSettings,
  onAddOption,
}) {
  if (!field) return null;

  const modal = isOpen
    ? createPortal(
        <div
          className="gf-field-config__overlay"
          onMouseDown={onClose}
        >
          <div
            className="gf-field-config__panel gf-field-config__panel--overlay"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="gf-field-config__panelHeader">
              <div className="gf-field-config__panelTitle">Configuración del campo</div>

              <button
                type="button"
                className="gf-field-config__panelClose"
                onClick={onClose}
                title="Cerrar"
              >
                <TbX />
              </button>
            </div>

            <div className="forms-stack">
              <div>
                <label className="forms-label">Tipo de campo</label>
                <div className="forms-select-shell">
                  <ProSelect
                    className="forms-select"
                    value={field.type}
                    onChange={(e) => onChangeFieldType(field.id, e.target.value)}
                    placeholder="Tipo"
                  >
                    {FIELD_TYPE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </ProSelect>
                </div>
              </div>

              <div>
                <label className="forms-label">Etiqueta</label>
                <input
                  className="forms-input"
                  value={field.label || ""}
                  onChange={(e) => onUpdateField(field.id, { label: e.target.value })}
                  placeholder="Etiqueta del campo"
                />
              </div>

              <div>
                <label className="forms-label">Placeholder</label>
                <input
                  className="forms-input"
                  value={field.placeholder || ""}
                  onChange={(e) => onUpdateField(field.id, { placeholder: e.target.value })}
                  placeholder="Placeholder"
                />
              </div>

              <div>
                <label className="forms-label">Texto de ayuda</label>
                <textarea
                  className="forms-textarea"
                  value={field.help_text || ""}
                  onChange={(e) => onUpdateField(field.id, { help_text: e.target.value })}
                  placeholder="Texto de ayuda"
                />
              </div>

              <div>
                <label className="forms-label">Visibilidad</label>
                <div className="forms-select-shell">
                  <ProSelect
                    className="forms-select"
                    value={field.settings?.visibility || "all"}
                    onChange={(e) =>
                      onUpdateFieldSettings(field.id, { visibility: e.target.value })
                    }
                    placeholder="Visibilidad"
                  >
                    {VISIBILITY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </ProSelect>
                </div>
              </div>

              <label className="gf-checkline">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(e) =>
                    onUpdateField(field.id, { required: e.target.checked })
                  }
                />
                <span>Campo obligatorio</span>
              </label>

              {["select", "multiselect"].includes(field.type) ? (
                <div className="forms-stack">
                  <div className="answer-actions" style={{ justifyContent: "space-between" }}>
                    <h4 className="forms-section-title" style={{ marginBottom: 0 }}>
                      Opciones
                    </h4>
                    <button
                      className="forms-btn forms-btn--ghost"
                      type="button"
                      onClick={() => onAddOption(field.id)}
                    >
                      <TbPlus />
                      Opción
                    </button>
                  </div>

                  {(field.options || []).map((option, index) => (
                    <div className="option-row" key={index}>
                      <input
                        className="forms-input"
                        value={option}
                        onChange={(e) => {
                          const next = [...(field.options || [])];
                          next[index] = e.target.value;
                          onUpdateField(field.id, { options: next });
                        }}
                      />
                      <button
                        className="forms-mini-btn"
                        type="button"
                        onClick={() => {
                          const next = [...(field.options || [])];
                          next.splice(index, 1);
                          onUpdateField(field.id, { options: next });
                        }}
                      >
                        <TbTrash />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {field.type === "traffic_light" ? (
                <div className="forms-stack">
                  <div className="answer-actions" style={{ justifyContent: "space-between" }}>
                    <h4 className="forms-section-title" style={{ marginBottom: 0 }}>
                      Opciones del semáforo
                    </h4>
                  </div>

                  {(field.options && field.options.length
                    ? field.options
                    : TRAFFIC_LIGHT_DEFAULT_OPTIONS
                  ).map((option, index) => (
                    <div className="traffic-light-edit-row" key={index}>
                      <div
                        className="traffic-light-edit-row__color"
                        style={{ background: option.color }}
                      />
                      <input
                        className="forms-input"
                        value={option.label || ""}
                        onChange={(e) => {
                          const baseOptions =
                            field.options && field.options.length
                              ? [...field.options]
                              : [...TRAFFIC_LIGHT_DEFAULT_OPTIONS];

                          baseOptions[index] = {
                            ...baseOptions[index],
                            label: e.target.value,
                          };

                          onUpdateField(field.id, { options: baseOptions });
                        }}
                        placeholder="Texto de la opción"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {field.type === "number" ? (
                <div className="forms-row-2">
                  <div>
                    <label className="forms-label">Mínimo</label>
                    <input
                      className="forms-input"
                      value={field.settings?.min || ""}
                      onChange={(e) =>
                        onUpdateFieldSettings(field.id, { min: e.target.value })
                      }
                      placeholder="Mínimo"
                    />
                  </div>

                  <div>
                    <label className="forms-label">Máximo</label>
                    <input
                      className="forms-input"
                      value={field.settings?.max || ""}
                      onChange={(e) =>
                        onUpdateFieldSettings(field.id, { max: e.target.value })
                      }
                      placeholder="Máximo"
                    />
                  </div>
                </div>
              ) : null}

              {field.type === "currency" ? (
                <div className="forms-row-2">
                  <div>
                    <label className="forms-label">Símbolo</label>
                    <input
                      className="forms-input"
                      value={field.settings?.currencySymbol || "$"}
                      onChange={(e) =>
                        onUpdateFieldSettings(field.id, {
                          currencySymbol: e.target.value,
                        })
                      }
                      placeholder="Símbolo"
                    />
                  </div>

                  <div>
                    <label className="forms-label">Máximo</label>
                    <input
                      className="forms-input"
                      value={field.settings?.max || ""}
                      onChange={(e) =>
                        onUpdateFieldSettings(field.id, { max: e.target.value })
                      }
                      placeholder="Máximo"
                    />
                  </div>
                </div>
              ) : null}

              {field.type === "file" || field.type === "image" ? (
                <div className="forms-row-2">
                  <div>
                    <label className="forms-label">Máximo de archivos</label>
                    <input
                      className="forms-input"
                      type="number"
                      min="1"
                      max="5"
                      value={Math.min(5, Math.max(1, Number(field.settings?.maxFiles || 1)))}
                      onChange={(e) =>
                        onUpdateFieldSettings(field.id, {
                          maxFiles: Math.min(5, Math.max(1, Number(e.target.value || 1))),
                        })
                      }
                      placeholder="1 a 5"
                    />
                  </div>

                  <div>
                    <label className="forms-label">Tipo permitido</label>
                    <input
                      className="forms-input"
                      value={field.type === "image" ? "Solo imágenes" : "Cualquier documento"}
                      readOnly
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="gf-field-config">
      <button
        type="button"
        className={`gf-field-config__toggle ${isOpen ? "gf-field-config__toggle--active" : ""}`}
        onClick={onToggle}
        title="Configuración del campo"
      >
        <TbSettings />
      </button>

      {modal}
    </div>
  );
}