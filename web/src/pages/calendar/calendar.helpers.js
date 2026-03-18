export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getRangeForView(date, view) {
  const base = new Date(date);

  if (view === "month") {
    const start = startOfMonth(base);
    const end = endOfMonth(base);
    return { start, end };
  }

  if (view === "week") {
    const start = startOfDay(base);
    const day = start.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + mondayOffset);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  return {
    start: startOfDay(base),
    end: endOfDay(base),
  };
}

export function formatMonthYearEs(date) {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateEs(date) {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTimeEs(date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatHourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const safeHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${safeHour} ${suffix}`;
}

export function formatDateInputLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function getDateKeyLocal(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildMonthMatrix(date) {
  const cursor = startOfMonth(date);
  const firstDay = cursor.getDay();
  const mondayOffset = firstDay === 0 ? -6 : 1 - firstDay;
  cursor.setDate(cursor.getDate() + mondayOffset);

  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}

export function isSameDay(a, b) {
  return getDateKeyLocal(a) === getDateKeyLocal(b);
}

export function minutesBetween(a, b) {
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
}