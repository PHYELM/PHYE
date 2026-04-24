export const QUOTE_STATUSES = {
  draft:     { label: 'Borrador',   color: '#475569' },
  sent:      { label: 'Enviada',    color: '#7c3aed' },
  pending:   { label: 'En espera',  color: '#d97706' },
  approved:  { label: 'Aprobada',   color: '#2563eb' },
  rejected:  { label: 'Rechazada',  color: '#dc2626' },
  invoiced:  { label: 'Facturada',  color: '#0f766e' },
  paid:      { label: 'Pagada',     color: '#16a34a' },
  cancelled: { label: 'Cancelada',  color: '#6b7280' },
};

export const CURRENCIES = [
  { value: 'MXN', label: 'MXN — Peso Mexicano' },
  { value: 'USD', label: 'USD — Dólar' },
  { value: 'EUR', label: 'EUR — Euro' },
];

export const TAX_RATES = [0, 8, 16];

export const UNIT_OPTIONS = [
  'pieza', 'servicio', 'hora', 'día', 'mes',
  'kg', 'litro', 'metro', 'caja', 'lote', 'paquete',
];