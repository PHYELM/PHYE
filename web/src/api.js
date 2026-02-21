const API_BASE =
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
  const url =
    /^https?:\/\//i.test(path) ? path : `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}