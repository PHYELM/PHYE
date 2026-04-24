import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  TbFileInvoice,
  TbDownload,
  TbCheck,
  TbBan,
  TbCalendar,
  TbUser,
  TbMail,
  TbPhone,
  TbWorld,
} from 'react-icons/tb';
import '../pages/QuotesModule.css';

const BRAND = {
  name: 'PHYELM',
  logo: '/assets/PH.png',
  web: 'https://phyelm.com.mx/',
  phone: '6688201036',
  email: 'czamoranog@phyelm.com.mx',
  navy: '#071827',
  blue: '#2563eb',
  soft: '#f8fafc',
};

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

function InfoLine({ icon, children }) {
  if (!children) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
      <span style={{ color: BRAND.blue, display: 'inline-flex' }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
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
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle at top, #e0f2fe 0%, #f8fafc 42%, #eef2f7 100%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          background: '#fff',
          border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: 22,
          padding: '22px 26px',
          boxShadow: '0 24px 70px rgba(15,23,42,0.10)',
          color: '#64748b',
          fontWeight: 800,
        }}>
          Cargando cotización...
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(circle at top, #e0f2fe 0%, #f8fafc 42%, #eef2f7 100%)',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
        padding: 24,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 24,
          border: '1px solid rgba(15,23,42,0.08)',
          padding: 34,
          textAlign: 'center',
          boxShadow: '0 24px 70px rgba(15,23,42,0.10)',
        }}>
          <TbFileInvoice size={52} style={{ color: '#cbd5e1', marginBottom: 12 }} />
          <div style={{ fontWeight: 950, fontSize: 20, color: '#334155' }}>
            {error || 'No encontrada'}
          </div>
        </div>
      </div>
    );
  }

  const client = quote.client || quote.client_snapshot || {};
  const items = quote.items || [];
  const st = STATUSES[quote.status] || quote.status;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top left, #dbeafe 0%, #f8fafc 34%, #eef2f7 100%)',
      padding: 'clamp(16px, 4vw, 42px)',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      color: '#0f172a',
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        <div style={{
          borderRadius: 30,
          overflow: 'hidden',
          background: '#fff',
          border: '1px solid rgba(15,23,42,0.08)',
          boxShadow: '0 30px 90px rgba(15,23,42,0.14)',
        }}>
          {/* HERO */}
          <div style={{
            background: `linear-gradient(135deg, ${BRAND.navy} 0%, #0f2a44 58%, #12385a 100%)`,
            color: '#fff',
            padding: 'clamp(22px, 4vw, 36px)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute',
              right: -90,
              top: -90,
              width: 260,
              height: 260,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{
              position: 'absolute',
              right: 80,
              bottom: -120,
              width: 260,
              height: 260,
              borderRadius: '50%',
              background: 'rgba(37,99,235,0.18)',
            }} />

            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 20,
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 74,
                  height: 74,
                  borderRadius: 20,
                  background: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 10,
                  boxShadow: '0 18px 40px rgba(0,0,0,0.22)',
                }}>
                  <img
                    src={BRAND.logo}
                    alt={BRAND.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>

                <div>
                  <div style={{
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    color: 'rgba(255,255,255,0.72)',
                    fontWeight: 900,
                    marginBottom: 5,
                  }}>
                    Previsualización pública
                  </div>
                  <div style={{
                    fontWeight: 950,
                    fontSize: 'clamp(28px, 4vw, 46px)',
                    letterSpacing: '-0.06em',
                    lineHeight: 1,
                  }}>
                    Cotización
                  </div>
                  <div style={{
                    marginTop: 8,
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.74)',
                    fontWeight: 600,
                  }}>
                    Documento comercial generado por {BRAND.name}
                  </div>
                </div>
              </div>

              <div style={{
                textAlign: 'right',
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.16)',
                borderRadius: 20,
                padding: '14px 16px',
                minWidth: 190,
                backdropFilter: 'blur(10px)',
              }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.70)', fontWeight: 900, letterSpacing: '0.14em' }}>
                  FOLIO
                </div>
                <div style={{ fontWeight: 950, fontSize: 24, marginTop: 4 }}>
                  {quote.folio || '—'}
                </div>
                <span
                  className={`qt-status qt-status--${quote.status}`}
                  style={{
                    marginTop: 10,
                    display: 'inline-flex',
                    background: quote.status === 'approved' ? '#dcfce7' : quote.status === 'rejected' ? '#fee2e2' : '#eff6ff',
                  }}
                >
                  {quote.status === 'approved' ? <TbCheck size={12} style={{ marginRight: 4 }} /> : null}
                  {quote.status === 'rejected' ? <TbBan size={12} style={{ marginRight: 4 }} /> : null}
                  {st}
                </span>
              </div>
            </div>
          </div>

          {/* BODY */}
          <div style={{ padding: 'clamp(18px, 3vw, 30px)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.15fr) minmax(280px, 0.85fr)',
              gap: 16,
              marginBottom: 16,
            }}>
              <div style={{
                borderRadius: 22,
                border: '1px solid #e2e8f0',
                padding: 20,
                background: '#ffffff',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: BRAND.blue,
                  fontWeight: 950,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 14,
                }}>
                  <TbUser size={18} />
                  Cliente
                </div>

                <div style={{ fontWeight: 950, fontSize: 21, letterSpacing: '-0.03em', marginBottom: 8 }}>
                  {client.name || 'Sin cliente'}
                </div>

                {client.company && (
                  <div style={{ color: '#334155', fontWeight: 800, fontSize: 14, marginBottom: 10 }}>
                    {client.company}
                  </div>
                )}

                <div style={{ display: 'grid', gap: 7 }}>
                  {client.rfc && <InfoLine icon={<TbFileInvoice size={15} />}>RFC: {client.rfc}</InfoLine>}
                  {client.phone && <InfoLine icon={<TbPhone size={15} />}>Tel: {client.phone}</InfoLine>}
                  {client.email && <InfoLine icon={<TbMail size={15} />}>{client.email}</InfoLine>}
                </div>
              </div>

              <div style={{
                borderRadius: 22,
                border: '1px solid #e2e8f0',
                padding: 20,
                background: '#f8fafc',
              }}>
                <div style={{
                  color: '#64748b',
                  fontWeight: 950,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 14,
                }}>
                  Detalles
                </div>

                <div style={{ fontWeight: 950, fontSize: 18, color: '#0f172a', marginBottom: 12 }}>
                  {quote.title || 'Cotización'}
                </div>

                <div style={{ display: 'grid', gap: 7 }}>
                  <InfoLine icon={<TbCalendar size={15} />}>Fecha: {fmtDate(quote.created_at)}</InfoLine>
                  {quote.valid_until && (
                    <InfoLine icon={<TbCalendar size={15} />}>Válida hasta: {fmtDate(quote.valid_until)}</InfoLine>
                  )}
                  <InfoLine icon={<TbWorld size={15} />}>Moneda: {quote.currency || 'MXN'}</InfoLine>
                </div>
              </div>
            </div>

            {/* TABLE */}
            <div style={{
              borderRadius: 22,
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              background: '#fff',
              marginBottom: 16,
            }}>
              <div style={{
                padding: '16px 18px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 17 }}>Conceptos cotizados</div>
                  <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                    {items.length} concepto{items.length === 1 ? '' : 's'} registrado{items.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                  <thead>
                    <tr>
                      {['Descripción', 'Unidad', 'Cant.', 'P. Unit.', 'Desc.', 'Importe'].map((h, i) => (
                        <th key={h} style={{
                          padding: '13px 16px',
                          textAlign: i > 1 ? 'right' : 'left',
                          fontSize: 11,
                          fontWeight: 950,
                          textTransform: 'uppercase',
                          letterSpacing: '0.13em',
                          color: '#64748b',
                          background: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{
                          padding: '15px 16px',
                          fontSize: 14,
                          fontWeight: 850,
                          color: '#0f172a',
                          borderBottom: '1px solid #eef2f7',
                        }}>
                          {it.description}
                        </td>
                        <td style={{ padding: '15px 16px', fontSize: 13, color: '#64748b', borderBottom: '1px solid #eef2f7' }}>
                          {it.unit || '—'}
                        </td>
                        <td style={{ padding: '15px 16px', fontSize: 13, textAlign: 'right', color: '#0f172a', borderBottom: '1px solid #eef2f7' }}>
                          {Number(it.quantity || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: '15px 16px', fontSize: 13, textAlign: 'right', color: '#0f172a', borderBottom: '1px solid #eef2f7' }}>
                          {fmtCur(it.unit_price, quote.currency)}
                        </td>
                        <td style={{ padding: '15px 16px', fontSize: 13, textAlign: 'right', color: '#64748b', borderBottom: '1px solid #eef2f7' }}>
                          {Number(it.discount_pct) > 0 ? `${it.discount_pct}%` : '—'}
                        </td>
                        <td style={{
                          padding: '15px 16px',
                          fontSize: 14,
                          textAlign: 'right',
                          fontWeight: 950,
                          color: BRAND.navy,
                          borderBottom: '1px solid #eef2f7',
                        }}>
                          {fmtCur(it.amount, quote.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOTALS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)',
              gap: 16,
              alignItems: 'start',
              marginBottom: 16,
            }}>
              <div style={{
                borderRadius: 22,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                padding: 18,
                minHeight: 120,
              }}>
                <div style={{ fontWeight: 950, fontSize: 15, marginBottom: 8 }}>
                  Observaciones comerciales
                </div>
                <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.65 }}>
                  {quote.notes || quote.terms || 'Sin observaciones adicionales registradas.'}
                </div>
              </div>

              <div style={{
                borderRadius: 22,
                overflow: 'hidden',
                border: '1px solid #dbeafe',
                background: '#fff',
                boxShadow: '0 16px 34px rgba(15,23,42,0.08)',
              }}>
                {[
                  ['Subtotal', fmtCur(quote.subtotal, quote.currency)],
                  ...(Number(quote.discount_amount) > 0
                    ? [['Descuento', `−${fmtCur(quote.discount_amount, quote.currency)}`]]
                    : []),
                  [`IVA (${quote.tax_rate || 0}%)`, fmtCur(quote.tax_amount, quote.currency)],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    borderBottom: '1px solid #eef2f7',
                    fontSize: 14,
                  }}>
                    <span style={{ color: '#64748b', fontWeight: 800 }}>{lbl}</span>
                    <span style={{ fontWeight: 900, color: '#0f172a' }}>{val}</span>
                  </div>
                ))}

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px',
                  background: BRAND.navy,
                }}>
                  <span style={{ color: '#fff', fontWeight: 950, fontSize: 15 }}>TOTAL</span>
                  <span style={{ color: '#fff', fontWeight: 950, fontSize: 24, letterSpacing: '-0.04em' }}>
                    {fmtCur(quote.total, quote.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              paddingTop: 8,
            }}>
              <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700 }}>
                {BRAND.phone} · {BRAND.email} · {BRAND.web}
              </div>

              <a
                href={`/api/quotes/public/${token}/export/pdf`}
                download
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  background: BRAND.navy,
                  color: '#fff',
                  borderRadius: 14,
                  padding: '13px 22px',
                  fontWeight: 900,
                  fontSize: 14,
                  textDecoration: 'none',
                  boxShadow: '0 14px 28px rgba(7,24,39,0.22)',
                }}
              >
                <TbDownload size={18} />
                Descargar PDF
              </a>
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: 22,
          fontSize: 12,
          color: '#94a3b8',
          fontWeight: 700,
        }}>
          {BRAND.name} · {BRAND.web}
        </div>
      </div>
    </div>
  );
}