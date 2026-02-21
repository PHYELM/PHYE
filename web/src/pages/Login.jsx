import React, { useMemo, useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { apiFetch } from "../api.js";
import "./Login.css";

function toTitleCase(value) {

  return value
    .replace(/\s+/g, " ")
    .trimStart() // permite escribir al inicio sin rebotar raro
    .split(" ")
    .map((w) => {
      const s = w.trim();
      if (!s) return "";
      const lower = s.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
function validatePassword(raw, opts = {}) {
  const value = (raw || "").trim();
  const allowLegacy = !!opts.allowLegacy; // ✅ excepción para director

  if (allowLegacy) {
    // Para el usuario director (tests): solo pedimos que no esté vacío
    if (value.length === 0) return { ok: false, msg: "Ingresa tu contraseña." };
    return { ok: true, msg: "" };
  }

  // Regla estándar: mínimo 8, al menos 4 letras y 4 números
  if (value.length < 8) {
    return { ok: false, msg: "La contraseña debe tener mínimo 8 caracteres." };
  }

  const letters = (value.match(/[A-Za-z]/g) || []).length;
  const numbers = (value.match(/[0-9]/g) || []).length;

  if (letters < 4 || numbers < 4) {
    return { ok: false, msg: "Debe incluir al menos 4 letras y 4 números." };
  }

  return { ok: true, msg: "" };
}
export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

const isDirector = useMemo(() => username.trim().toLowerCase() === "director", [username]);

const passCheck = useMemo(
  () => validatePassword(password, { allowLegacy: isDirector }),
  [password, isDirector]
);

const canSubmit = useMemo(() => {
  return username.trim().length > 0 && passCheck.ok && !loading;
}, [username, passCheck.ok, loading]);

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr("");
    setLoading(true);
    try {
const payload = {
  username: username.trim().toLowerCase(), // ✅ coincide con BD: director
password: password.replace(/\s+/g, "").trim().toUpperCase()
};

      const { worker } = await apiFetch("/api/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      localStorage.setItem("worker", JSON.stringify(worker));
      onLogin(worker);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-left">
          {/* 1) Logo ECOVISA centrado (imagen) */}
          <div className="brand-center">
            <img
              className="brand-logo"
              src={`${process.env.PUBLIC_URL}/assets/ECOVISA_TEXT.png`}
              alt="ECOVISA"
              draggable="false"
              
            />
          </div>

          {/* 2) GIF login */}
          <div className="login-gifWrap">
            <img
              className="login-gif"
              src={`${process.env.PUBLIC_URL}/assets/login.gif`}
              alt="Animación de login"
              draggable="false"
            />
          </div>

<p className="login-note">
  <span>Acceso interno. Dirección administra usuarios y módulos.</span>
  <span>Todos los Derechos Reservados</span>
  <span>ECOVISA ©</span>
</p>
        </div>

        <div className="login-right">
          <h2 className="login-title">Iniciar sesión</h2>
          <p className="login-hint">Ingresa tus credenciales</p>

          <form onSubmit={submit} className="login-form">
            <div className="field">
              <div className="label">Usuario</div>
<input
  className="input"
  placeholder="Ingresa tu usuario"
  value={username}
  onChange={(e) => setUsername(toTitleCase(e.target.value))}
  autoComplete="username"
  inputMode="text"
/>
            </div>

            <div className="field">
              <div className="label">Contraseña</div>

              <div className="input-wrap">
                <input
                  className="input input-password"
                  placeholder="Ingresa tu contraseña"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    // ✅ todo en mayúsculas (tu regla)
                    setPassword(e.target.value.toUpperCase());
                    // si había error de login, lo quitamos cuando escribe
                    if (err) setErr("");
                  }}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  title={showPass ? "Ocultar" : "Mostrar"}
                >
                  {showPass ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>

              {/* ✅ feedback de validación */}
{!isDirector && !passCheck.ok && password.length > 0 && (
  <div className="hint-error">{passCheck.msg}</div>
)}
            </div>

            <button className="btn btn-primary" disabled={!canSubmit}>
              {loading ? "ENTRANDO..." : "ENTRAR"}
            </button>

            {err && <p className="error">{err}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}