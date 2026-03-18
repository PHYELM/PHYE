import React, { useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import "./Dashboard.css";

import AdminPanel from "./AdminPanel.jsx";
import Inventory from "./Inventory.jsx";
import FormsModule from "./FormsModule.jsx";
import CalendarModule from "./CalendarModule.jsx";
import { setTitle } from "../utils/setTitle";
import {
  TbBox,
  TbTruckDelivery,
  TbCalendarMonth,
  TbFileInvoice,
  TbCurrencyDollar,
  TbClipboardText,
  TbUsers
} from "react-icons/tb";

export default function Dashboard({ worker, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const ROUTES = useMemo(
    () => ({
      home: "/",
      admin: "/admin",
      forms: "/forms",
      inventory: "/inventory",
      quotes: "/quotes",
      services: "/services",
      sales: "/sales",
      calendar: "/calendar"
    }),
    []
  );

  const getKeyFromPath = useCallback(
    (pathname) => {
      const entries = Object.entries(ROUTES).sort(
        (a, b) => b[1].length - a[1].length
      );

      for (const [key, path] of entries) {
        if (path === "/") {
          if (pathname === "/") return "home";
          continue;
        }
        if (pathname === path || pathname.startsWith(path + "/")) return key;
      }

      return "home";
    },
    [ROUTES]
  );

  const tab = useMemo(() => getKeyFromPath(location.pathname), [
    location.pathname,
    getKeyFromPath
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("ecovisa_active_tab");
    if (!saved) return;

    if (location.pathname === "/" && saved !== "home") {
      const path = ROUTES[saved] || "/";
      navigate(path, { replace: true });
    }
  }, [location.pathname, ROUTES, navigate]);

  const goTab = useCallback(
    (key) => {
      const path = ROUTES[key] || "/";
      if (location.pathname !== path) navigate(path);
      localStorage.setItem("ecovisa_active_tab", key);
    },
    [ROUTES, navigate, location.pathname]
  );

  const TAB_TITLES = useMemo(
    () => ({
      home: "Inicio",
      admin: "Admin Panel",
      forms: "Formularios",
      inventory: "Inventario",
      quotes: "Cotizaciones",
      services: "Servicios",
      sales: "Ventas / POS",
      calendar: "Calendario"
    }),
    []
  );

  useEffect(() => {
    setTitle(TAB_TITLES[tab] || "Dashboard");
  }, [tab, TAB_TITLES]);

  useEffect(() => {
    const vv = window.visualViewport;

    const setVh = () => {
      const h = (vv?.height ?? window.innerHeight) * 0.01;
      document.documentElement.style.setProperty("--vh", `${h}px`);
    };

    setVh();

    window.addEventListener("resize", setVh);
    window.addEventListener("orientationchange", setVh);

    vv?.addEventListener("resize", setVh);
    vv?.addEventListener("scroll", setVh);

    return () => {
      window.removeEventListener("resize", setVh);
      window.removeEventListener("orientationchange", setVh);
      vv?.removeEventListener("resize", setVh);
      vv?.removeEventListener("scroll", setVh);
    };
  }, []);

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
        key: "calendar",
        title: "Calendario",
        desc: "Citas · Visitas · Eventos · Cumpleaños",
        tone: "navy",
        size: "span1",
        icon: <TbCalendarMonth />
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
      <Navbar worker={worker} active={tab} onChange={goTab} onLogout={onLogout} />

      <main className={`app-main ${tab === "home" ? "app-main--home" : ""}`}>
        {tab === "home" && (
          <section className="dash dash--fit">
            <div className="dash-head dash-head--center dash-head--tight"></div>

            <div className="mosaic mosaic--fit">
              {modules.map((m) => (
                <button
                  key={m.key}
                  className={`mTile mTile--big mTile--${m.key} ${m.tone} ${m.size}`}
                  onClick={() => goTab(m.key)}
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
            <div className="module-head"></div>
            <AdminPanel currentWorker={worker} />
          </section>
        )}

        {tab === "inventory" && (
          <section className="module">
            <div className="module-head"></div>
            <Inventory currentWorker={worker} />
          </section>
        )}

        {tab === "forms" && (
          <section className="module">
            <div className="module-head"></div>
            <FormsModule currentWorker={worker} />
          </section>
        )}

        {tab === "calendar" && (
          <section className="module">
            <div className="module-head"></div>
            <CalendarModule currentWorker={worker} />
          </section>
        )}

        {tab !== "home" &&
          tab !== "admin" &&
          tab !== "inventory" &&
          tab !== "forms" &&
          tab !== "calendar" && (
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