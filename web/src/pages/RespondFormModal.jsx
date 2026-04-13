import React, { useCallback, useEffect, useState } from "react";
import { TbFileText, TbX } from "react-icons/tb";
import Swal from "sweetalert2";

export default function RespondFormModal({
  open = false,
  title = "Responder formulario",
  children = null,
  onRequestClose,
  skipCloseConfirm = false,
  headerActions = null,
}) {
  const [closing, setClosing] = useState(false);

  const confirmCloseRespondModal = useCallback(async () => {
    if (!onRequestClose) return;

    if (skipCloseConfirm) {
      onRequestClose();
      return;
    }

    const result = await Swal.fire({
      title: "¿Cerrar formulario?",
      text: "Si cierras ahora, la respuesta no guardada se perderá.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      onRequestClose();
    }
  }, [onRequestClose, skipCloseConfirm]);

  useEffect(() => {
    if (!open) return;

    function handleEsc(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        confirmCloseRespondModal();
      }
    }

    document.addEventListener("keydown", handleEsc);
    document.body.classList.add("frt-body-lock");

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.classList.remove("frt-body-lock");
    };
  }, [open, confirmCloseRespondModal]);

  if (!open) return null;

  return (
    <div
      className={`frt-respondBack ${closing ? "frt-respondBack--closing" : ""}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) confirmCloseRespondModal();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) confirmCloseRespondModal();
      }}
    >
      <div
        className={`frt-respondModal ${closing ? "frt-respondModal--closing" : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="frt-respondModal__top">
          <div className="frt-respondModal__titleWrap">
            <TbFileText />
            <h3>{title}</h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {headerActions}

            <button
              type="button"
              className="frt-respondModal__close"
              title="Cerrar formulario"
              aria-label="Cerrar formulario"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                confirmCloseRespondModal();
              }}
            >
              <TbX />
            </button>
          </div>
        </div>

        <div className="frt-respondModal__body">{children}</div>
      </div>
    </div>
  );
}