import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import QuotePublicPreview from "./pages/QuotePublicPreview";

export default function App() {
  const [worker, setWorker] = useState(null);
  const location = useLocation();
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("worker");
    if (raw) setWorker(JSON.parse(raw));
  }, []);

  if (!worker) {
    return (
      <Routes>
        <Route path="/cotizacion/:token" element={<QuotePublicPreview />} />
        <Route path="*" element={<Login onLogin={(w) => setWorker(w)} />} />
      </Routes>
    );
  }

  const dashboardElement = (
    <Dashboard
      worker={worker}
      onLogout={() => {
        localStorage.removeItem("worker");
        setWorker(null);
      }}
    />
  );

  return (
    <Routes>
      <Route path="/" element={dashboardElement} />
      <Route path="/admin" element={dashboardElement} />
      <Route path="/forms" element={dashboardElement} />
      <Route path="/forms/:formId" element={dashboardElement} />
      <Route path="/inventory" element={dashboardElement} />
      <Route path="/quotes" element={dashboardElement} />
      <Route path="/services" element={dashboardElement} />
      <Route path="/sales" element={dashboardElement} />
      <Route path="/calendar" element={dashboardElement} />
<Route path="/cotizacion/:token" element={<QuotePublicPreview />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}