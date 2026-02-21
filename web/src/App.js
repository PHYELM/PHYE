import React, { useEffect, useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem("worker");
    if (raw) setWorker(JSON.parse(raw));
  }, []);

  if (!worker) return <Login onLogin={(w) => setWorker(w)} />;

  return (
    <Dashboard
      worker={worker}
      onLogout={() => {
        localStorage.removeItem("worker");
        setWorker(null);
      }}
    />
  );
}