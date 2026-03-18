import React from "react";
import { createPortal } from "react-dom";
import { TbDownload, TbFile, TbX } from "react-icons/tb";
import { getFileExtension } from "./forms.helpers";

export default function FilePreviewModal({ file, onClose }) {
  if (!file) return null;

  const isImage = String(file.type || "").startsWith("image/");
  const isPdf = file.type === "application/pdf";
  const isText =
    String(file.type || "").startsWith("text/") ||
    ["txt", "json", "csv", "md"].includes(getFileExtension(file.name));

  return createPortal(
    <div
      className="file-preview-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="file-preview-modal__dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="file-preview-modal__header">
          <div className="file-preview-modal__title">
            {file.name || "Vista previa"}
          </div>

          <div className="file-preview-modal__actions">
            {file.dataUrl ? (
              <a
                className="file-preview-modal__action"
                href={file.dataUrl}
                download={file.name || "archivo"}
                onClick={(e) => e.stopPropagation()}
              >
                <TbDownload />
              </a>
            ) : null}

            <button
              type="button"
              className="file-preview-modal__action file-preview-modal__action--close"
              title="Cerrar vista previa"
              aria-label="Cerrar vista previa"
              onClick={() => onClose?.()}
            >
              <TbX />
            </button>
          </div>
        </div>

        <div className="file-preview-modal__body">
          {isImage ? (
            <img
              src={file.dataUrl}
              alt={file.name || "preview"}
              className="file-preview-modal__image"
            />
          ) : null}

          {isPdf ? (
            <iframe
              src={file.dataUrl}
              title={file.name || "preview-pdf"}
              className="file-preview-modal__frame"
            />
          ) : null}

          {isText ? (
            <iframe
              src={file.dataUrl}
              title={file.name || "preview-text"}
              className="file-preview-modal__frame"
            />
          ) : null}

          {!isImage && !isPdf && !isText ? (
            <div className="file-preview-modal__empty">
              <div className="file-preview-modal__emptyIcon">
                <TbFile />
              </div>

              <div>No hay vista previa integrada para este archivo.</div>

              {file.dataUrl ? (
                <a
                  className="forms-btn forms-btn--primary"
                  href={file.dataUrl}
                  download={file.name || "archivo"}
                  onClick={(e) => e.stopPropagation()}
                >
                  <TbDownload />
                  Descargar archivo
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}