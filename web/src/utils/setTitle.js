export function setTitle(section) {
  const base = "PHYELM";
  const clean = String(section || "").trim();
  document.title = clean ? `${base} | ${clean}` : base;
}