import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FiMenu, FiX, FiLogOut, FiCamera, FiBell } from "react-icons/fi";
import Cropper from "react-easy-crop";
import Swal from "sweetalert2";
import {
  TbHome2,
  TbUsers,
  TbClipboardText,
  TbBox,
  TbTruckDelivery,
  TbMapPin,
  TbCurrencyDollar,
  TbFileInvoice,
  TbUserCircle
} from "react-icons/tb";
import { apiFetch } from "../api.js";
import "./Navbar.css";
import { useNavigate, useLocation } from "react-router-dom";

const ICONS = {
  home: <TbHome2 />,
  admin: <TbUsers />,
  forms: <TbClipboardText />,
  inventory: <TbBox />,
  services: <TbTruckDelivery />,
  gps: <TbMapPin />,
  sales: <TbCurrencyDollar />,
  quotes: <TbFileInvoice />
};

export default function Navbar({ worker, active, onChange, onLogout }) {
const [mobileOpen, setMobileOpen] = useState(false);
const navigate = useNavigate();
const location = useLocation();

// ✅ Mapa de rutas reales (ajústalo a tus paths reales si cambian)
const ROUTES = useMemo(() => ({
  home: "/",
  admin: "/admin",
  forms: "/forms",
  inventory: "/inventory",
  quotes: "/quotes",
  services: "/services",
  sales: "/sales",
  gps: "/gps"
}), []);
// Perfil
const [profileOpen, setProfileOpen] = useState(false);
const [profileClosing, setProfileClosing] = useState(false);

// Notificaciones
const [notifOpen, setNotifOpen] = useState(false);
const [notifClosing, setNotifClosing] = useState(false);
const [notifTab, setNotifTab] = useState("all"); // "all" | "unread"
const openProfile = () => {
  setNotifOpen(false);
  setNotifClosing(false);
  setProfileClosing(false);
  setProfileOpen(true);
};

const closeProfile = () => {
  setProfileClosing(true);
  setTimeout(() => {
    setProfileOpen(false);
    setProfileClosing(false);
  }, 160);
};

const openNotif = () => {
  setProfileOpen(false);
  setProfileClosing(false);
  setNotifClosing(false);
  setNotifOpen(true);
};

const closeNotif = () => {
  setNotifClosing(true);
  setTimeout(() => {
    setNotifOpen(false);
    setNotifClosing(false);
  }, 160);
};
  const fileRef = useRef(null);
  const profileRef = useRef(null);
  const navCenterRef = useRef(null);
const navBtnRefs = useRef({});
const [activePill, setActivePill] = useState({ x: 0, w: 44, ready: false });
// --- Avatar crop (tipo Facebook)
const [cropOpen, setCropOpen] = useState(false);
const [rawImageUrl, setRawImageUrl] = useState("");
const [rawFileType, setRawFileType] = useState("image/jpeg");
const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const items = useMemo(
    () => [
      { key: "home", label: "Inicio" },
      { key: "admin", label: "Admin" },
      { key: "forms", label: "Formularios" },
      { key: "inventory", label: "Inventario" },
      { key: "quotes", label: "Cotizaciones" },
      { key: "services", label: "Servicios" },
      { key: "sales", label: "Ventas" },
      { key: "gps", label: "GPS" }
    ],
    []
  );

const handleGo = (key) => {
  onChange(key);

  // ✅ Navegación real si existe route para ese key
  const path = ROUTES[key];
  if (path && location.pathname !== path) {
    navigate(path);
  }

  // ✅ Cierre con animación (no “desaparece” de golpe)
  setMobileOpen(false);
};
useEffect(() => {
  const update = () => {
    const container = navCenterRef.current;
    const btn = navBtnRefs.current?.[active];
    if (!container || !btn) return;

    const c = container.getBoundingClientRect();
    const b = btn.getBoundingClientRect();

    const x = (b.left - c.left) + container.scrollLeft; // soporta scroll horizontal
    const w = b.width;

    setActivePill({ x, w, ready: true });
  };

  update();
  window.addEventListener("resize", update);
  return () => window.removeEventListener("resize", update);
}, [active, items.length]);
  // Cerrar dropdown al click afuera
useEffect(() => {
  const onDown = (e) => {
    if (!profileRef.current) return;
    if (!profileRef.current.contains(e.target)) {
      if (profileOpen) closeProfile();
      if (notifOpen) closeNotif();
    }
  };
  document.addEventListener("mousedown", onDown);
  return () => document.removeEventListener("mousedown", onDown);
}, [profileOpen, notifOpen]);
// ✅ Cerrar drawer con ESC (mobile/desktop)
useEffect(() => {
  const onKey = (e) => {
    if (e.key === "Escape") setMobileOpen(false);
  };
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}, []);
  // ✅ Asegura depto/puesto aunque el worker venga incompleto desde login/localStorage
  useEffect(() => {
    const run = async () => {
      if (!worker?.id) return;
      try {
        const data = await apiFetch(`/api/workers/${worker.id}`);
        const w = data?.worker;
if (w) {
  setWorkerMeta({
    department_name: w.department_name || "",
    level_name: w.level_name || ""
  });

  // opcional: sincroniza para que el resto de la UI lo vea
  worker.department_name = w.department_name || worker.department_name || "";
  worker.level_name = w.level_name || worker.level_name || "";

  // ✅ SI el backend trae la foto, la metemos a estado local (y al worker por compatibilidad)
  const photo = w.profile_photo_url || "";
  if (photo) {
    setAvatarUrl(photo);
    worker.profile_photo_url = photo;
  }
}
      } catch (e) {
        // si falla, no rompas UI
        console.warn("No se pudo refrescar worker meta:", e?.message || e);
      }
    };
    run();
  }, [worker?.id]);
const [avatarUrl, setAvatarUrl] = useState(worker?.profile_photo_url || "");

// Mantén sincronizado si el padre actualiza worker
useEffect(() => {
  setAvatarUrl(worker?.profile_photo_url || "");
}, [worker?.profile_photo_url]);
useEffect(() => {
  if (!mobileOpen) return;

  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = prev;
  };
}, [mobileOpen]);
  // --- Helpers (Title Case)
  const toTitleCase = (str = "") =>
    String(str)
      .trim()
      .toLowerCase()
      .replace(/\b\p{L}/gu, (m) => m.toUpperCase()); // soporta acentos

  // Pide: el nombre que se muestra debe ser el username (login)
  const fullNameRaw = (worker?.username || "Usuario").trim();
  const fullName = toTitleCase(fullNameRaw);

  // --- Meta real (depto/puesto) refrescada desde backend
  const [workerMeta, setWorkerMeta] = useState({
    department_name: "",
    level_name: ""
  });

  // (pide: PUESTO y DEPARTAMENTO por nombre)
  const department = toTitleCase(
    workerMeta.department_name ||
    worker?.department_name ||
    worker?.department ||
    "—"
  );

  const position = toTitleCase(
    workerMeta.level_name ||
    worker?.level_name ||
    worker?.level ||
    "—"
  );

  // === Notificaciones (dummy por ahora) ===
// Luego lo conectamos a Supabase (tabla notifications) sin tocar el UI.
const [notifications, setNotifications] = useState([
  {
    id: "n1",
    avatar: avatarUrl || "",
    user: fullName,
    dept: department,
    action: "hizo un cambio en Cotizaciones",
    date: new Date(Date.now() - 60 * 60 * 1000),
    read: false
  },
  {
    id: "n2",
    avatar: avatarUrl || "",
    user: fullName,
    dept: department,
    action: "creó un nuevo formulario",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    read: false
  }
]);
// ✅ Si el avatar cambia (login / fetch / update), actualiza los items dummy
useEffect(() => {
  if (!avatarUrl) return;
  setNotifications((prev) =>
    prev.map((n) => ({ ...n, avatar: avatarUrl }))
  );
}, [avatarUrl]);
const formatNotifTime = (d) => {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(d);
  } catch {
    return String(d);
  }
};

// (dummy) badge si hay notifs
const unreadCount = notifications.filter(n => !n.read).length;
const hasNotif = unreadCount > 0;
const handleMarkAllSeen = () => {
  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
};
const filteredNotifications =
  notifTab === "unread" ? notifications.filter((n) => !n.read) : notifications;

const handleMarkOneSeen = (id) => {
  setNotifications((prev) =>
    prev.map((n) => (n.id === id ? { ...n, read: true } : n))
  );
};
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc, cropPixels, mimeType = "image/jpeg") {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, 0.92);
  });
}

const onCropComplete = useCallback((_, croppedPixels) => {
  setCroppedAreaPixels(croppedPixels);
}, []);
  async function handlePickPhoto() {
    if (fileRef.current) fileRef.current.click();
  }

async function handleUploadPhoto(e) {
  const file = e.target.files?.[0];
  if (!file || !worker?.id) return;

  const ok = ["image/png", "image/jpeg", "image/webp"].includes(file.type);
  if (!ok) {
    setProfileOpen(false);
    await Swal.fire({ icon: "error", title: "Formato no válido", text: "Solo PNG, JPG o WEBP." });
    e.target.value = "";
    return;
  }

  const url = URL.createObjectURL(file);
  setRawImageUrl(url);
  setRawFileType(file.type);
  setCrop({ x: 0, y: 0 });
  setZoom(1);
  setCroppedAreaPixels(null);

  // abre modal de recorte
  setCropOpen(true);

  // reset input para permitir subir la misma foto otra vez
  e.target.value = "";
}
async function handleCancelCrop() {
  if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
  setCropOpen(false);
  setProfileOpen(false);

  await Swal.fire({
    icon: "info",
    title: "Foto cancelada",
    text: "No se realizaron cambios."
  });
}

async function handleSaveCroppedPhoto() {
  try {
    if (!worker?.id || !rawImageUrl || !croppedAreaPixels) return;

    const blob = await getCroppedBlob(rawImageUrl, croppedAreaPixels, rawFileType);
    if (!blob) throw new Error("No se pudo recortar la imagen");

    const ext =
      rawFileType === "image/png" ? "png" :
      rawFileType === "image/webp" ? "webp" : "jpg";

    const fd = new FormData();
    fd.append("photo", blob, `avatar.${ext}`);

    const data = await apiFetch(`/api/workers/${worker.id}/photo`, {
      method: "POST",
      body: fd
    });

if (data?.profile_photo_url) {
  setAvatarUrl(data.profile_photo_url);              // ✅ re-render seguro
  worker.profile_photo_url = data.profile_photo_url; // opcional
}

    if (rawImageUrl) URL.revokeObjectURL(rawImageUrl);
    setCropOpen(false);
    setProfileOpen(false);

    await Swal.fire({
      icon: "success",
      title: "Foto actualizada",
      text: "Tu foto se guardó correctamente."
    });
  } catch (err) {
    setCropOpen(false);
    setProfileOpen(false);
    await Swal.fire({
      icon: "error",
      title: "Error al subir foto",
      text: err?.message || "Ocurrió un error"
    });
  }
}
  return (
    <header className="nav">
      <div className="nav-row">
        {/* LEFT */}
        <div className="nav-left">
          <button
            className="nav-burger"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            title="Menú"
          >
            <FiMenu />
          </button>

          <button
            className="nav-logoBtn"
            onClick={() => handleGo("home")}
            aria-label="Ir a inicio"
            title="Inicio"
          >
            <img
              className="nav-logo-img"
              src="/assets/ECOVISACONTEXTO.png"
              alt="ECOVISA"
            />
          </button>
        </div>

        {/* CENTER */}
<nav className="nav-center" aria-label="Módulos" ref={navCenterRef}>
  {/* Indicador que se desliza */}
  <span
    className={`nav-activePill ${activePill.ready ? "ready" : ""}`}
    style={{
      transform: `translateX(${activePill.x}px) translateY(-50%)`,
      width: `${activePill.w}px`
    }}
    aria-hidden
  />

  {items.map((it) => (
    <button
      key={it.key}
      ref={(el) => (navBtnRefs.current[it.key] = el)}
      className={`nav-iconBtn ${active === it.key ? "active" : ""}`}
      onClick={() => handleGo(it.key)}
      data-tip={it.label}
      aria-label={it.label}
      type="button"
    >
      <span className="nav-icon">{ICONS[it.key]}</span>
    </button>
  ))}
</nav>

        {/* RIGHT (avatar/icon + nombre) */}
<div className="nav-right" ref={profileRef}>
  {/* Campana */}
<button
  className={`nav-iconBtn nav-bellBtn ${notifOpen ? "active" : ""}`}
  onClick={() => (notifOpen ? closeNotif() : openNotif())}
  aria-label="Abrir notificaciones"
  title="Notificaciones"
  type="button"
>
  <span className="nav-icon">
    <FiBell />
  </span>

  {hasNotif && (
    <span
      className="nav-bellBadge"
      aria-label={`${unreadCount} notificaciones no leídas`}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )}
</button>

  {/* Botón usuario */}
  <button
    className="nav-userBtn"
    onClick={() => (profileOpen ? closeProfile() : openProfile())}
    aria-label="Abrir perfil"
    title="Perfil"
  >
    <span className="nav-userAvatar">
      {avatarUrl ? (
       <img
  className="nav-userAvatarImg"
  src={avatarUrl}
  alt="Foto de perfil"
  onError={() => setAvatarUrl("")}
/>
      ) : (
        <span className="nav-userAvatarIcon" aria-hidden>
          <TbUserCircle />
        </span>
      )}
    </span>

    <span className="nav-userName" title={fullName}>
      {fullName}
    </span>
  </button>

  {/* Panel notificaciones */}
{notifOpen && (
  <div className={`nav-notifMenu ${notifClosing ? "closing" : ""}`} role="menu">
    <div className="nav-notifHeader">
      <div className="nav-notifTitle">Notificaciones</div>
      <button
        className="nav-notifClose"
        onClick={closeNotif}
        aria-label="Cerrar notificaciones"
        title="Cerrar"
      >
        <FiX />
      </button>
    </div>

    {/* ✅ Tabs */}
    <div className="nav-notifTabs" role="tablist" aria-label="Filtrar notificaciones">
      <button
        type="button"
        className={`nav-notifTab ${notifTab === "all" ? "active" : ""}`}
        onClick={() => setNotifTab("all")}
        role="tab"
        aria-selected={notifTab === "all"}
      >
        Todas
        <span className="nav-notifTabCount">{notifications.length}</span>
      </button>

      <button
        type="button"
        className={`nav-notifTab ${notifTab === "unread" ? "active" : ""}`}
        onClick={() => setNotifTab("unread")}
        role="tab"
        aria-selected={notifTab === "unread"}
      >
        No leídas
        <span className="nav-notifTabCount">{unreadCount}</span>
      </button>
    </div>

    <div className="nav-notifList">
      {filteredNotifications.length === 0 ? (
        <div className="nav-notifEmpty">
          {notifTab === "unread" ? "No tienes notificaciones no leídas." : "No tienes notificaciones."}
        </div>
      ) : (
        filteredNotifications.map((n) => (
          <button
            key={n.id}
            className={`nav-notifItem ${!n.read ? "unread" : "read"}`}
            onClick={() => handleMarkOneSeen(n.id)} // ✅ NO cierra, solo marca leída
            type="button"
          >
            <span className="nav-notifAvatar">
{(n.avatar || avatarUrl) ? (
  <img src={n.avatar || avatarUrl} alt="" />
) : (
  <span className="nav-notifAvatarFallback" aria-hidden>
    <TbUserCircle />
  </span>
)}
            </span>

            <span className="nav-notifText">
              <span className="nav-notifLine1">
                <b>{n.user}</b>, del departamento de <b>{n.dept}</b> {n.action}.
              </span>
              <span className="nav-notifLine2">{formatNotifTime(n.date)}</span>
            </span>

            {!n.read ? <span className="nav-notifUnread" aria-hidden /> : <span className="nav-notifReadSpacer" aria-hidden />}
          </button>
        ))
      )}
    </div>

    {/* ✅ Marcar todas sin cerrar */}
    <button
      className="nav-notifFooter solid"
      type="button"
      onClick={handleMarkAllSeen}
      disabled={unreadCount === 0}
      aria-disabled={unreadCount === 0}
      title={unreadCount === 0 ? "No hay no leídas" : "Marcar todas como visto"}
    >
      Marcar todas como visto
    </button>
  </div>
)}

  {/* Menú Perfil */}
  {profileOpen && (
    <div className={`nav-profileMenu ${profileClosing ? "closing" : ""}`} role="menu">
      <div className="nav-profileHeader">
        <div className="nav-profileHeaderSpacer" />
        <div className="nav-profileHeaderName" title={fullName}>
          <span className="nav-profileHeaderLabel">USUARIO:</span>
          <span className="nav-profileHeaderValue">{fullName}</span>
        </div>
        <button className="nav-profileClose" onClick={closeProfile} aria-label="Cerrar" title="Cerrar">
          <FiX />
        </button>
      </div>

      {/* Avatar editable */}
      <div className="nav-profileAvatarArea">
        <button
          className="nav-profileAvatarBtn"
          onClick={handlePickPhoto}
          aria-label="Cambiar foto de perfil"
          title="Cambiar foto"
        >
          {avatarUrl ? (
            <img className="nav-profileAvatarImg" src={avatarUrl} alt="Foto de perfil" />
          ) : (
            <div className="nav-profileAvatarFallback" aria-hidden>
              <TbUserCircle />
            </div>
          )}
          <span className="nav-profileCam" aria-hidden>
            <FiCamera />
          </span>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleUploadPhoto}
          style={{ display: "none" }}
        />
      </div>

      {/* Info */}
      <div className="nav-profileInfo">
        <div className="nav-profileInfoRow">
          <span className="nav-profileLabel">PUESTO:</span>
          <span className="nav-profileValue" title={String(position)}>{position}</span>
        </div>
        <div className="nav-profileInfoRow">
          <span className="nav-profileLabel">DEPARTAMENTO:</span>
          <span className="nav-profileValue" title={String(department)}>{department}</span>
        </div>
      </div>

      <div className="nav-profileActions">
        <button className="nav-profileLogout" onClick={onLogout}>
          <FiLogOut />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )}
</div>
      </div>

{/* MOBILE DRAWER */}
<div className={`nav-drawer ${mobileOpen ? "open" : ""}`} role="dialog" aria-modal="true">
  {/* ✅ Backdrop primero para que NO tape el panel */}
  <button
    className="nav-drawer-backdrop"
    onClick={() => setMobileOpen(false)}
    aria-label="Cerrar menú"
    title="Cerrar"
    type="button"
  />

  {/* ✅ Panel encima */}
  <div className="nav-drawer-inner" role="document">
    <div className="nav-drawer-head">
      <img className="nav-drawer-logo" src="/assets/ECOVISACONTEXTO.png" alt="ECOVISA" />
      <button
        className="nav-drawer-close"
        onClick={() => setMobileOpen(false)}
        aria-label="Cerrar menú"
        title="Cerrar"
        type="button"
      >
        <FiX />
      </button>
    </div>

    <div className="nav-drawer-list">
      {items.map((it) => (
        <button
          key={it.key}
          className={`nav-drawer-item ${active === it.key ? "active" : ""}`}
          onClick={() => handleGo(it.key)}
          type="button"
        >
          <span className="nav-drawer-ico">{ICONS[it.key]}</span>
          <span className="nav-drawer-txt">{it.label}</span>
        </button>
      ))}
    </div>

    <button className="nav-drawer-logout" onClick={onLogout} type="button">
      <FiLogOut />
      <span>Cerrar sesión</span>
    </button>
  </div>
</div>
      {/* MODAL CROP (tipo FB) */}
{cropOpen && (
  <div className="avatarCrop-backdrop" role="dialog" aria-modal="true">
    <div className="avatarCrop-modal">
      <div className="avatarCrop-head">
        <div className="avatarCrop-title">Recortar foto</div>
        <button className="avatarCrop-x" onClick={handleCancelCrop} aria-label="Cerrar">
          <FiX />
        </button>
      </div>

      <div className="avatarCrop-body">
        <div className="avatarCrop-cropper">
          <Cropper
            image={rawImageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="avatarCrop-zoomRow">
          <span>-</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span>+</span>
        </div>
      </div>

      <div className="avatarCrop-actions">
        <button className="avatarCrop-btn ghost" onClick={handleCancelCrop}>
          Cancelar
        </button>
        <button className="avatarCrop-btn solid" onClick={handleSaveCroppedPhoto}>
          Guardar
        </button>
      </div>
    </div>
  </div>
)}
    </header>
  );
}