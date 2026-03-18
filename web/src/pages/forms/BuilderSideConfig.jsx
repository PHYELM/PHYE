import React from "react";
import { TbTrash, TbX } from "react-icons/tb";
import ProSelect from "../../components/ProSelect/ProSelect";
import { getLevelsNamesByIds } from "./forms.helpers";

export default function BuilderSideConfig({
  builder,
  catalogs,
  toggleResponderDepartment,
  removeResponderDepartment,
  addEditorRuleByDepartment,
  updateEditorRule,
  removeEditorRule,
  toggleEditorRuleLevel,
}) {
  const responderOptions = catalogs.departments
    .filter((dep) => !builder.responder_department_ids.includes(dep.id))
    .map((dep) => ({
      value: dep.id,
      label: dep.name,
    }));

  const editorOptions = catalogs.departments
    .filter((dep) => !builder.editor_rules.some((rule) => rule.department_id === dep.id))
    .map((dep) => ({
      value: dep.id,
      label: dep.name,
    }));

  return (
    <div className="gf-builderAsideStack">
      <div className="gf-config__card gf-config__card--builder">
        <div className="gf-config__head">
          <h4 className="gf-config__title">Departamentos que responden</h4>
          <p className="gf-config__text">
            Define quién puede ver y responder este formulario.
          </p>
        </div>

        <div className="forms-stack">
          <ProSelect
            className="forms-select forms-select--field"
            value=""
            onChange={(e) => toggleResponderDepartment(e.target.value)}
            placeholder="Selecciona departamentos"
            options={responderOptions}
          />

          <div className="gf-selectionBox">
            {builder.responder_department_ids.length === 0 ? (
              <div className="gf-config__empty">No has agregado departamentos respondentes.</div>
            ) : (
              builder.responder_department_ids.map((depId) => {
                const dep = catalogs.departments.find((item) => item.id === depId);
                if (!dep) return null;

                return (
                  <div className="gf-selectionTag" key={dep.id}>
                    <span className="gf-selectionTag__label">{dep.name}</span>
                    <button
                      type="button"
                      className="gf-selectionTag__remove"
                      onClick={() => removeResponderDepartment(dep.id)}
                    >
                      <TbX />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="gf-config__card gf-config__card--builder">
        <div className="gf-config__head gf-config__head--row">
          <div>
            <h4 className="gf-config__title">Departamentos que editan respuestas</h4>
            <p className="gf-config__text">
              Agrega departamentos y limita su edición por nivel cuando sea necesario.
            </p>
          </div>
        </div>

        <div className="forms-stack">
          <ProSelect
            className="forms-select forms-select--field"
            value=""
            onChange={(e) => addEditorRuleByDepartment(e.target.value)}
            placeholder="Departamentos con permisos de edición"
            options={editorOptions}
          />

          <div className="gf-ruleList">
            {builder.editor_rules.length === 0 ? (
              <div className="gf-config__empty">No has agregado reglas de edición.</div>
            ) : (
              builder.editor_rules.map((rule, index) => {
                const depName =
                  catalogs.departments.find((dep) => dep.id === rule.department_id)?.name ||
                  "Departamento";

                const selectedLevels = getLevelsNamesByIds(catalogs.levels, rule.level_ids || []);

                return (
                  <div className="gf-rule" key={index}>
                    <div className="gf-rule__summary">
                      <div className="gf-rule__summaryTitle">{depName}</div>
                      <div className="gf-rule__summaryText">
                        {rule.apply_all_levels
                          ? "Todos los niveles"
                          : selectedLevels.length
                          ? selectedLevels.join(", ")
                          : "Sin niveles seleccionados"}
                      </div>
                    </div>

                    <div className="gf-rule__mode">
                      <button
                        type="button"
                        className={`gf-mode-btn ${
                          rule.apply_all_levels ? "gf-mode-btn--active" : ""
                        }`}
                        onClick={() =>
                          updateEditorRule(index, {
                            apply_all_levels: true,
                            level_ids: [],
                          })
                        }
                      >
                        Todos
                      </button>

                      <button
                        type="button"
                        className={`gf-mode-btn ${
                          !rule.apply_all_levels ? "gf-mode-btn--active" : ""
                        }`}
                        onClick={() =>
                          updateEditorRule(index, {
                            apply_all_levels: false,
                            level_ids: rule.level_ids || [],
                          })
                        }
                      >
                        Por niveles
                      </button>

                      <button
                        className="forms-mini-btn"
                        type="button"
                        onClick={() => removeEditorRule(index)}
                        title="Eliminar regla"
                      >
                        <TbTrash />
                      </button>
                    </div>

                    {!rule.apply_all_levels ? (
                      <div className="gf-levels">
                        {catalogs.levels.map((lvl) => {
                          const active = rule.level_ids.includes(lvl.id);

                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              className={`gf-level-chip ${
                                active ? "gf-level-chip--active" : ""
                              }`}
                              onClick={() => toggleEditorRuleLevel(index, lvl.id)}
                            >
                              {lvl.name}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}