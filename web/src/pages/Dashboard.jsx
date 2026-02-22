import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import "./Dashboard.css";

import AdminPanel from "./AdminPanel.jsx";

import {
  TbBox,
  TbTruckDelivery,
  TbMapPin,
  TbFileInvoice,
  TbCurrencyDollar,
  TbClipboardText,
  TbUsers
} from "react-icons/tb";

export default function Dashboard({ worker, onLogout }) {
  const location = useLocation();

  // URL -> TAB (debe coincidir con tus ROUTES del Navbar)
  const TAB_FROM_PATH = useMemo(
    () => ({
      "/": "home",
      "/admin": "admin",
      "/forms": "forms",
      "/inventory": "inventory",
      "/quotes": "quotes",
      "/services": "services",
      "/sales": "sales",
      "/gps": "gps"
    }),
    []
  );

  // ✅ arranca sincronizado con la URL (y fallback a localStorage)
  const getInitialTab = () => {
    const byPath = TAB_FROM_PATH[location.pathname];
    const saved = localStorage.getItem("ecovisa_active_tab");
    return byPath || saved || "home";
  };

  const [tab, setTab] = useState(getInitialTab);
    // ✅ “refresh suave” (remonta el contenido sin recargar toda la SPA)
  const [softRefreshTick, setSoftRefreshTick] = useState(0);
  // ✅ cuando cambia la ruta (incluye F5), actualiza el tab
  useEffect(() => {
    const byPath = TAB_FROM_PATH[location.pathname];
    if (byPath && byPath !== tab) setTab(byPath);
  }, [location.pathname, TAB_FROM_PATH]); // intencional: no dependemos de tab para evitar loops
  useEffect(() => {
    const onKeyDown = (e) => {
      const isF5 = e.key === "F5";
      const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R");
      if (isF5 || isCtrlR) {
        e.preventDefault();
        setSoftRefreshTick((t) => t + 1);
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);
    // ✅ FIX móvil: 100vh “real” (evita recortes por barra de URL)
// ✅ FIX móvil: 100vh “real” (evita recortes por barra de URL)
// Usa VisualViewport (Android/Chrome) para que NO se “corte” el final
useEffect(() => {
  const vv = window.visualViewport;

  const setVh = () => {
    const h = (vv?.height ?? window.innerHeight) * 0.01;
    document.documentElement.style.setProperty("--vh", `${h}px`);
  };

  setVh();

  // resize normal
  window.addEventListener("resize", setVh);
  window.addEventListener("orientationchange", setVh);

  // resize real del viewport visual (cuando aparece/desaparece barra)
  vv?.addEventListener("resize", setVh);
  vv?.addEventListener("scroll", setVh); // algunos android disparan cambios aquí

  return () => {
    window.removeEventListener("resize", setVh);
    window.removeEventListener("orientationchange", setVh);
    vv?.removeEventListener("resize", setVh);
    vv?.removeEventListener("scroll", setVh);
  };
}, []);
  // ✅ persistimos el tab para refrescos y reabrir app
  useEffect(() => {
    localStorage.setItem("ecovisa_active_tab", tab);
  }, [tab]);
  const modules = useMemo(
    () => [
      {
        key: "inventory",
        title: "Inventario",
        desc: "Entradas · Salidas · Stock",
        tone: "burgundy",
        size: "span2",
        icon: <TbBox />
      },
      {
        key: "services",
        title: "Servicios",
        desc: "Programados · Tipos · Estados",
        tone: "steel",
        size: "span2",
        icon: <TbTruckDelivery />
      },
      {
        key: "gps",
        title: "GPS",
        desc: "Unidades · Tracking · Historial",
        tone: "navy",
        size: "span1",
        icon: <TbMapPin />
      },
      {
        key: "quotes",
        title: "Cotizaciones",
        desc: "Clientes · Envíos · Aprobación",
        tone: "forest",
        size: "span1",
        icon: <TbFileInvoice />
      },
      {
        key: "sales",
        title: "Ventas / POS",
        desc: "Tickets · Métodos · Metas",
        tone: "teal",
        size: "span1",
        icon: <TbCurrencyDollar />
      },
      {
        key: "forms",
        title: "Formularios",
        desc: "Dinámicos · Respuestas · Export",
        tone: "violet",
        size: "span1",
        icon: <TbClipboardText />
      },
      {
        key: "admin",
        title: "Admin Panel",
        desc: "Usuarios · Deptos · Niveles",
        tone: "slate",
        size: "span4",
        icon: <TbUsers />
      }
    ],
    []
  );

  return (
    <div className="app-shell">
      <Navbar worker={worker} active={tab} onChange={setTab} onLogout={onLogout} />

           <main
        className={`app-main ${tab === "home" ? "app-main--home" : ""}`}
        key={`${tab}-${softRefreshTick}`}
      >
        {tab === "home" && (
          <section className="dash dash--fit">
            <div className="dash-head dash-head--center dash-head--tight">
              <h1 className="dash-title">Panel principal</h1>
              <p className="dash-sub">Selecciona un módulo</p>
            </div>

            <div className="mosaic mosaic--fit">
              {modules.map((m) => (
<button
  key={m.key}
  className={`mTile mTile--big mTile--${m.key} ${m.tone} ${m.size}`}
  onClick={() => setTab(m.key)}
  type="button"
>
                  <div className="mTile-hero">
                    <span className="mTile-ico mTile-ico--big" aria-hidden>
                      {m.icon}
                    </span>

                    <div className="mTile-text">
                      <div className="mTile-title mTile-title--big">{m.title}</div>
                      <div className="mTile-desc mTile-desc--big">{m.desc}</div>
                    </div>

                    <span className="mTile-go mTile-go--big" aria-hidden>
                      ›
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

{tab === "admin" && (
  <section className="module">
    <div className="module-head">

    </div>
    <AdminPanel currentWorker={worker} />
  </section>
)}
        {tab !== "home" && tab !== "admin" && (
          <section className="module">
            <div className="module-head">
              <h2>{tab.toUpperCase()}</h2>
              <p>MVP: este módulo lo conectamos en el siguiente paso.</p>
            </div>
            <div className="placeholder">Listo para conectar: {tab}</div>
          </section>
        )}
      </main>
    </div>
  );
}