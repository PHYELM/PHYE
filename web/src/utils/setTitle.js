export function setTitle(section) {
  const base = "ECOVISA";
  const clean = String(section || "").trim();
  document.title = clean ? `${base} | ${clean}` : base;
}