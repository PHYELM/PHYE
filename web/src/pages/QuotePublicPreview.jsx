import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { TbFileInvoice, TbDownload, TbCheck, TbBan } from 'react-icons/tb';
import '../pages/QuotesModule.css';

const STATUSES = {
  draft: 'Borrador',
  sent: 'Enviada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  expired: 'Vencida',
};

function fmtCur(n, cur = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: cur || 'MXN',
  }).format(Number(n) || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function QuotePublicPreview() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/quotes/public/${token}`)
      .then((r) => r.json())
      .then((r) => {
        if (r.data) setQuote(r.data);
        else setError('Cotización no encontrada');
      })
      .catch(() => setError('No se pudo cargar la cotización'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
        }}
      >
        <div style={{ color: '#64748b', fontFamily: 'system-ui', fontSize: 16 }}>
          Cargando cotización...
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f1f5f9',
          gap: 12,
        }}
      >
        <TbFileInvoice size={48} style={{ color: '#cbd5e1' }} />
        <div
          style={{
            fontFamily: 'system-ui',
            fontWeight: 700,
            fontSize: 18,
            color: '#64748b',
          }}
        >
          {error || 'No encontrada'}
        </div>
      </div>
    );
  }

  const client = quote.client || quote.client_snapshot || {};
  const items = quote.items || [];
  const st = STATUSES[quote.status] || quote.status;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f1f5f9',
        padding: 'clamp(16px, 4vw, 40px)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            padding: 'clamp(16px, 3vw, 28px)',
            marginBottom: 14,
            boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img
                src="/assets/EC.png"
                alt="ECOVISA"
                style={{ height: 52, width: 'auto' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 'clamp(18px, 2.5vw, 26px)',
                    color: '#1a3c5e',
                    letterSpacing: '-0.04em',
                  }}
                >
                  PHYELM
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    fontWeight: 600,
                  }}
                >
                  Ecología, Vida y Salud, S.A. de C.V.
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: 20, color: '#1a3c5e' }}>
                COTIZACIÓN
              </div>
              <div style={{ fontWeight: 900, fontSize: 16, color: '#2563eb' }}>
                {quote.folio || '—'}
              </div>
              <span
                className={`qt-status qt-status--${quote.status}`}
                style={{ marginTop: 4, display: 'inline-flex' }}
              >
                {quote.status === 'approved' ? (
                  <TbCheck size={12} style={{ marginRight: 4 }} />
                ) : null}
                {quote.status === 'rejected' ? (
                  <TbBan size={12} style={{ marginRight: 4 }} />
                ) : null}
                {st}
              </span>
            </div>
          </div>
        </div>

        {/* Cliente + fechas */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 14,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: 16,
              boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#94a3b8',
                marginBottom: 8,
              }}
            >
              Cliente
            </div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>
              {client.name || 'Sin cliente'}
            </div>
            {client.company && (
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                {client.company}
              </div>
            )}
            {client.rfc && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                RFC: {client.rfc}
              </div>
            )}
            {client.phone && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                Tel: {client.phone}
              </div>
            )}
            {client.email && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                {client.email}
              </div>
            )}
          </div>

          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              padding: 16,
              boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#94a3b8',
                marginBottom: 8,
              }}
            >
              Detalles
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 8 }}>
              {quote.title}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Fecha: {fmtDate(quote.created_at)}
            </div>
            {quote.valid_until && (
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                Válida hasta: {fmtDate(quote.valid_until)}
              </div>
            )}
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
              Moneda: {quote.currency || 'MXN'}
            </div>
          </div>
        </div>

        {/* Tabla de conceptos */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            marginBottom: 14,
            overflow: 'hidden',
            boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                minWidth: 500,
              }}
            >
              <thead>
                <tr>
                  {['Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Desc. %', 'Importe'].map(
                    (h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 14px',
                          textAlign: i > 1 ? 'right' : 'left',
                          fontSize: 11,
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.15em',
                          color: '#fff',
                          background: '#1a3c5e',
                          borderBottom: '2px solid #1a3c5e',
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#f8fafc' : '#fff' }}>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#0f172a',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {it.description}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: 13,
                        color: '#64748b',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {it.unit}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: 13,
                        textAlign: 'right',
                        color: '#0f172a',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {Number(it.quantity).toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: 13,
                        textAlign: 'right',
                        color: '#0f172a',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {fmtCur(it.unit_price, quote.currency)}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: 13,
                        textAlign: 'right',
                        color: '#64748b',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {Number(it.discount_pct) > 0 ? `${it.discount_pct}%` : '—'}
                    </td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontSize: 13,
                        textAlign: 'right',
                        fontWeight: 900,
                        color: '#0f172a',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      {fmtCur(it.amount, quote.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totales */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              minWidth: 240,
              boxShadow: '0 4px 12px rgba(15,23,42,0.04)',
            }}
          >
            {[
              ['Subtotal', fmtCur(quote.subtotal, quote.currency)],
              ...(Number(quote.discount_amount) > 0
                ? [['Descuento', `−${fmtCur(quote.discount_amount, quote.currency)}`]]
                : []),
              [`IVA (${quote.tax_rate || 0}%)`, fmtCur(quote.tax_amount, quote.currency)],
            ].map(([lbl, val]) => (
              <div
                key={lbl}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: '1px solid #f1f5f9',
                  fontSize: 13,
                }}
              >
                <span style={{ color: '#64748b', fontWeight: 700 }}>{lbl}</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{val}</span>
              </div>
            ))}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: '#1a3c5e',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>TOTAL</span>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>
                {fmtCur(quote.total, quote.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Términos + Notas */}
        {(quote.terms || quote.notes) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              marginBottom: 14,
            }}
          >
            {quote.terms && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#94a3b8',
                    marginBottom: 8,
                  }}
                >
                  Términos y Condiciones
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                  {quote.terms}
                </p>
              </div>
            )}

            {quote.notes && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #e2e8f0',
                  padding: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#94a3b8',
                    marginBottom: 8,
                  }}
                >
                  Notas
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                  {quote.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Download */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <a
            href={`/api/quotes/public/${token}/export/pdf`}
            download
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#1a3c5e',
              color: '#fff',
              borderRadius: 12,
              padding: '12px 24px',
              fontWeight: 800,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            <TbDownload size={16} />
            Descargar PDF
          </a>
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 11,
            color: '#94a3b8',
          }}
        >
          PHYELM — Proyectos Hidráulicos y Estructurales, S.A. de C.V. | www.phyelm.com
        </div>
      </div>
    </div>
  );
}