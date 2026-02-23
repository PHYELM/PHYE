const PROD_BACKEND = "https://logione-backend.onrender.com"; // <-- cambia si tu backend real es otro

export const API_BASE =
  process.env.REACT_APP_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3001"
    : PROD_BACKEND);

export async function apiFetch(path, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const url = (() => {
    if (/^https?:\/\//i.test(path)) return path;

    const base = String(API_BASE || "").replace(/\/+$/, "");
    let p = String(path || "");
    if (!p.startsWith("/")) p = "/" + p;

    if (base.endsWith("/api") && p.startsWith("/api/")) {
      p = p.replace(/^\/api/, "");
    }

    return `${base}${p}`;
  })();

  console.log("🌐 apiFetch ->", url);

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  // ✅ si el server devolvió HTML, es casi seguro que pegaste al front
  if (!isJson) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Respuesta no-JSON (probable URL incorrecta). URL=${url} content-type=${contentType} preview=${text.slice(0, 80)}`
    );
  }

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}