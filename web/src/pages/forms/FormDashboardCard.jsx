import React from "react";
import { TbCopy, TbDotsVertical, TbEdit, TbEye, TbTrash, TbBuilding,
  TbBriefcase, TbTruckDelivery, TbChartBar, TbTools, TbHeartHandshake,
  TbUsersGroup, TbShield, TbBuildingWarehouse, TbFileText, TbDeviceDesktop,
  TbHeadset, TbCoin, TbShoppingCart, TbReportAnalytics, TbCalendarEvent,
  TbClipboardCheck, TbBolt, TbSchool, TbSettings, TbMapPin, TbPackage,
  TbClipboardText,
} from "react-icons/tb";
import { getFormIcon } from "./forms.constants";

/* ── mismo mapa de íconos que AdminPanel ── */
const DEPT_ICONS = [
  { key: "briefcase", Icon: TbBriefcase },
  { key: "truck",     Icon: TbTruckDelivery },
  { key: "chart",     Icon: TbChartBar },
  { key: "tools",     Icon: TbTools },
  { key: "handshake", Icon: TbHeartHandshake },
  { key: "users",     Icon: TbUsersGroup },
  { key: "shield",    Icon: TbShield },
  { key: "warehouse", Icon: TbBuildingWarehouse },
  { key: "file",      Icon: TbFileText },
  { key: "it",        Icon: TbDeviceDesktop },
  { key: "support",   Icon: TbHeadset },
  { key: "coin",      Icon: TbCoin },
  { key: "cart",      Icon: TbShoppingCart },
  { key: "report",    Icon: TbReportAnalytics },
  { key: "calendar",  Icon: TbCalendarEvent },
  { key: "check",     Icon: TbClipboardCheck },
  { key: "bolt",      Icon: TbBolt },
  { key: "school",    Icon: TbSchool },
  { key: "settings",  Icon: TbSettings },
  { key: "map",       Icon: TbMapPin },
  { key: "package",   Icon: TbPackage },
  { key: "clipboard", Icon: TbClipboardText },
];

function DeptIcon({ iconKey, size = 16 }) {
  const found = DEPT_ICONS.find((x) => x.key === iconKey);
  const I = found?.Icon || TbBuilding;
  return <I style={{ fontSize: size }} />;
}

/* ── luminancia para decidir ícono negro/blanco ── */
function parseColorToRgb(input = "") {
  const c = String(input).trim().toLowerCase();
  if (c.startsWith("#")) {
    const h = c.replace("#", "");
    const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return null;
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }
  const m = c.match(/^rgba?\(\s*([0-9.]+)[,\s]\s*([0-9.]+)[,\s]\s*([0-9.]+)/i);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  const h = c.match(/^hsla?\(\s*([0-9.]+)[,\s]\s*([0-9.]+)%[,\s]\s*([0-9.]+)%/i);
  if (h) {
    const hh = ((+h[1]) % 360 + 360) % 360, s = +h[2] / 100, l = +h[3] / 100;
    const c2 = (1 - Math.abs(2*l - 1)) * s, x = c2 * (1 - Math.abs((hh/60)%2 - 1)), mm = l - c2/2;
    let r=0,g=0,b=0;
    if(hh<60){r=c2;g=x;}else if(hh<120){r=x;g=c2;}
    else if(hh<180){g=c2;b=x;}else if(hh<240){g=x;b=c2;}
    else if(hh<300){r=x;b=c2;}else{r=c2;b=x;}
    return{r:Math.round((r+mm)*255),g:Math.round((g+mm)*255),b:Math.round((b+mm)*255)};
  }
  return null;
}

function isLightColor(color) {
  const rgb = parseColorToRgb(color);
  if (!rgb) return true;
  return (0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b) / 255 > 0.55;
}

/* ── componente principal ── */
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
/* departamentos respondedores — normaliza estructura anidada {department:{...}} vs plana */
  const rawDepts = form.responder_departments || [];
  const respDepts = rawDepts.length > 0
    ? rawDepts.map((item) => item.department || item).filter(Boolean)
    : (form.affected_departments || []);

  /* color del héroe = primer depto respondedor o color del form */
  const heroColor = respDepts[0]?.color || form.color || "#2563eb";

  return (
    <button
      type="button"
      className="form-card form-card--dashboardButton"
      onClick={() => openFormWorkspace(form.id)}
      style={{ height: "auto", minHeight: 0 }}
    >
      {/* Hero reducido con color del primer depto respondedor */}
      <div
        className="form-card__heroMini"
        style={{ background: heroColor, height: 64, minHeight: 64, flexShrink: 0 }}
      />

      {/* Ícono flotante más compacto */}
<div className="form-card__floatingIcon">
        <span>{getFormIcon(form.icon)}</span>
      </div>

      {/* Menú 3 puntos */}
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
              <button type="button" className="form-card__menuItem"
                onClick={(e) => { e.stopPropagation(); setOpenCardMenuId(null); startEditForm(form); }}>
                <span className="form-card__menuIcon form-card__menuIcon--edit"><TbEdit /></span>
                Editar
              </button>
              <button type="button" className="form-card__menuItem"
                onClick={(e) => { e.stopPropagation(); setOpenCardMenuId(null); handleDuplicate(form.id); }}>
                <span className="form-card__menuIcon form-card__menuIcon--dupe"><TbCopy /></span>
                Duplicar
              </button>
              <button type="button" className="form-card__menuItem"
                onClick={(e) => { e.stopPropagation(); setOpenCardMenuId(null); showFormInfo(form); }}>
                <span className="form-card__menuIcon form-card__menuIcon--info"><TbEye /></span>
                Más información
              </button>
              <div className="form-card__menuDivider" />
              <button type="button" className="form-card__menuItem form-card__menuItem--danger"
                onClick={(e) => { e.stopPropagation(); setOpenCardMenuId(null); handleDelete(form.id); }}>
                <span className="form-card__menuIcon form-card__menuIcon--del"><TbTrash /></span>
                Eliminar
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

<div className="form-card__content">
        {/* Título: se ajusta al contenido como celda Excel, nunca se corta */}
<h3 className="form-card__dashboardTitle">
          {form.title || "Formulario sin título"}
        </h3>

{/* Burbujas de departamentos respondedores — máx 5 visibles + "+N" */}
        {respDepts.length > 0 && (() => {
          const MAX_VISIBLE = 5;
          const visible = respDepts.slice(0, MAX_VISIBLE);
          const overflow = respDepts.length - MAX_VISIBLE;
          return (
            <div className="form-card__deptCircles">
              {visible.map((dep) => {
                const bg = dep.color || "#334155";
                const fg = isLightColor(bg) ? "#0f172a" : "#ffffff";
                return (
                  <div
                    key={dep.id || dep.department_id}
                    className="form-card__deptCircle"
                    title={dep.name}
                    style={{ background: bg }}
                  >
                    <span style={{
                      color: fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                      lineHeight: 1,
                    }}>
                     <DeptIcon iconKey={dep.icon} size={18} />
                    </span>
                  </div>
                );
              })}
              {overflow > 0 && (
                <div
                  className="form-card__deptCircle"
                  title={`${overflow} departamentos más`}
                  style={{
                    background: "#e2e8f0",
                    color: "#475569",
                    fontSize: 10,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: "0 0 30px",
                    width: 30,
                    height: 30,
                    minWidth: 30,
                    maxWidth: 30,
                    borderRadius: "50%",
                  }}
                >
                  +{overflow}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </button>
  );
}