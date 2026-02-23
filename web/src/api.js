export const API_BASE =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost" ? "http://localhost:3001" : "");

export async function apiFetch(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  // Si ya viene url completa (http/https), no la toques
  const url = (() => {
    if (/^https?:\/\//i.test(path)) return path;

    // normaliza base y path
    const base = String(API_BASE || "").replace(/\/+$/, ""); // sin slash al final
    let p = String(path || "");
    if (!p.startsWith("/")) p = "/" + p;

    // ✅ evita /api/api cuando el base ya trae /api
    if (base.endsWith("/api") && p.startsWith("/api/")) {
      p = p.replace(/^\/api/, ""); // quita solo el primer /api
    }

    return `${base}${p}`;
  })();
  console.log("🌐 apiFetch ->", url);
  const res = await fetch(url, {
    ...options,
    headers,
    // credentials: "include", // ❌ quítalo si no usas cookies/sesión
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}