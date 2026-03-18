import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("worker");
    if (raw) setWorker(JSON.parse(raw));
  }, []);

  if (!worker) return <Login onLogin={(w) => setWorker(w)} />;

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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}