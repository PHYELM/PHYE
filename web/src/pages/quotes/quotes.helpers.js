export function formatCurrency(amount, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency || 'MXN',
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function calculateItemAmount(item) {
  const line = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
  const disc = line * ((Number(item.discount_pct) || 0) / 100);
  return Math.round((line - disc) * 100) / 100;
}

export function calculateTotals(items = [], taxRate = 16, extraDiscount = 0) {
  const subtotal      = items.reduce((s, it) => s + calculateItemAmount(it), 0);
  const afterDiscount = Math.max(0, subtotal - (Number(extraDiscount) || 0));
  const taxAmount     = afterDiscount * ((Number(taxRate) || 0) / 100);
  const r = n => Math.round(n * 100) / 100;
  return { subtotal: r(subtotal), taxAmount: r(taxAmount), total: r(afterDiscount + taxAmount) };
}

export function createEmptyItem(sortOrder = 0) {
  return {
    _id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    description: '', unit: 'pieza',
    quantity: 1, unit_price: 0, discount_pct: 0, amount: 0,
    sort_order: sortOrder,
  };
}

export function isExpired(validUntil) {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}
export function titleCaseLive(str = '') {
  const s = String(str);
  let out = '';
  let newWord = true;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    // espacios y saltos = separador de palabra
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      out += ch;
      newWord = true;
      continue;
    }

    // letras normales y acentuadas — NUNCA activan newWord por sí solas
    if (/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(ch)) {
      out += newWord
        ? ch.toLocaleUpperCase('es-MX')
        : ch.toLocaleLowerCase('es-MX');
      newWord = false;
      continue;
    }

    // números, guiones, puntos, etc. — no activan nueva palabra
    out += ch;
    newWord = false;
  }

  return out;
}