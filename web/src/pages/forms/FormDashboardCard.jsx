import React from "react";
import { TbCopy, TbDotsVertical, TbEdit, TbEye, TbTrash } from "react-icons/tb";
import { getFormIcon } from "./forms.constants";

export default function FormDashboardCard({
  form,
  openCardMenuId,
  setOpenCardMenuId,
  startEditForm,
  handleDuplicate,
  handleDelete,
  showFormInfo,
  openFormWorkspace,
}) {
  const departments = (form.affected_departments || []).slice(0, 3);

  return (
    <button
      type="button"
      className="form-card form-card--dashboardButton"
      onClick={() => openFormWorkspace(form.id)}
    >
      <div
        className="form-card__heroMini"
        style={{ background: form.color || "#2563eb" }}
      />

      <div className="form-card__floatingIcon">
        <span>{getFormIcon(form.icon)}</span>
      </div>

      {form?.permissions?.can_manage ? (
        <div className="form-card__menuWrap" onClick={(e) => e.stopPropagation()}>
          <button
            className="form-card__menuBtn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenCardMenuId((prev) => (prev === form.id ? null : form.id));
            }}
            title="Acciones"
          >
            <TbDotsVertical />
          </button>

          {openCardMenuId === form.id ? (
            <div className="form-card__menu">
              <button
                type="button"
                className="form-card__menuItem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCardMenuId(null);
                  startEditForm(form);
                }}
              >
                <TbEdit />
                Editar
              </button>

              <button
                type="button"
                className="form-card__menuItem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCardMenuId(null);
                  handleDuplicate(form.id);
                }}
              >
                <TbCopy />
                Duplicar
              </button>

              <button
                type="button"
                className="form-card__menuItem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCardMenuId(null);
                  handleDelete(form.id);
                }}
              >
                <TbTrash />
                Eliminar
              </button>

              <button
                type="button"
                className="form-card__menuItem"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCardMenuId(null);
                  showFormInfo(form);
                }}
              >
                <TbEye />
                Más información
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="form-card__content">
        <h3 className="form-card__dashboardTitle">
          {form.title || "Formulario sin título"}
        </h3>

        <div className="form-card__dashboardMeta">
          <span>{form.total_fields || 0} campos</span>
          <span>{form.creator?.full_name || form.creator?.username || "—"}</span>
        </div>

        <div className="form-card__chips form-card__chips--center">
          {departments.map((dep) => (
            <span
              className="dep-chip"
              key={dep.id}
              style={{ background: dep.color || "#334155" }}
            >
              <span>{dep.icon || "🏢"}</span>
              <span>{dep.name}</span>
            </span>
          ))}

          {(form.affected_departments || []).length > 3 ? (
            <span className="dep-chip dep-chip--more">
              +{(form.affected_departments || []).length - 3}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}