import { useState } from 'react';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [role, setRole] = useState('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await login(email.trim().toLowerCase(), password);
      } else {
        await register(name.trim(), email.trim().toLowerCase(), password, role);
      }
    } catch (err: any) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        padding: '2.5rem 1.5rem',
        boxSizing: 'border-box',
        backgroundColor: '#02160f',
      }}
    >
      {/* BACKGROUND MATRIX GRID */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(16, 185, 129, 0.22) 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }}
      />

      {/* AMBIENT GLOW ORBS */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '8%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.28) 0%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.2) 0%, transparent 70%)',
          filter: 'blur(95px)',
          pointerEvents: 'none',
        }}
      />

      {/* BRAND BANNER */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative', zIndex: 10 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '30px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            color: '#6ee7b7',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            marginBottom: '0.6rem',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 10px #10b981',
            }}
          />
          INTELLIGENT URBAN ECO-SYSTEM
        </div>
        <h1
          style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            margin: '0 0 0.4rem 0',
            background: 'linear-gradient(180deg, #ffffff 40%, #a7f3d0 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          WasteWatch AI
        </h1>
        <p style={{ margin: 0, fontSize: '0.92rem', color: '#94a3b8' }}>
          Autonomous 4-Tier Waste Routing, Verification & Operations Network
        </p>
      </div>

      {/* ========================================================= */}
      {/* 4-ROLE WORKFLOW GRID (IMAGE PRECISE REPLICA)             */}
      {/* ========================================================= */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '1240px',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(265px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {/* CARD 01: CITIZEN */}
          <div
            style={{
              backgroundColor: 'rgba(3, 27, 18, 0.88)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1.5px solid #10b981',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.15)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  color: '#6ee7b7',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem',
                }}
              >
                01 • CITIZEN
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>
                Scan & Report Waste
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.74rem' }}>
                Mobile AI scanner geotags illegal dumps
              </p>

              {/* Citizen Visual SVG */}
              <div
                style={{
                  background: 'rgba(1, 16, 11, 0.8)',
                  borderRadius: '10px',
                  border: '1px solid rgba(52, 211, 153, 0.15)',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 240 125" style={{ width: '100%', height: '110px' }}>
                  <circle cx="45" cy="35" r="9" fill="#10b981" />
                  <path d="M 45 45 L 45 88 M 45 60 L 68 55 M 45 88 L 36 115 M 45 88 L 54 115" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                  {/* Phone */}
                  <rect x="68" y="47" width="10" height="18" rx="2" fill="#34d399" />
                  {/* Green scanning rays */}
                  <polygon points="78,56 160,70 160,110 78,56" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.5)" strokeDasharray="3 3" />
                  {/* Detected garbage box */}
                  <rect x="145" y="75" width="46" height="32" rx="4" fill="rgba(239, 68, 68, 0.2)" stroke="#ef4444" strokeDasharray="3 3" />
                  <rect x="145" y="65" width="46" height="12" rx="2" fill="#ef4444" />
                  <text x="168" y="74" fontSize="8" fontWeight="bold" fill="#fff" textAnchor="middle">
                    PLASTIC: 97%
                  </text>
                  <circle cx="160" cy="95" r="6" fill="#f97316" />
                  {/* Pin tag */}
                  <g transform="translate(170, 20)">
                    <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.25)" stroke="#10b981" />
                    <text x="12" y="15" fontSize="10" textAnchor="middle" fill="#10b981">📍</text>
                    <text x="26" y="10" fontSize="7" fill="#6ee7b7" fontWeight="bold">LAT: 28.669</text>
                    <text x="26" y="18" fontSize="7" fill="#6ee7b7" fontWeight="bold">LNG: 77.453</text>
                  </g>
                </svg>
              </div>
            </div>

            <div
              style={{
                marginTop: '0.85rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid rgba(52, 211, 153, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>REPORT PIPELINE</div>
                <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700 }}>Auto-uploaded photo</div>
              </div>
              <span
                style={{
                  background: '#10b981',
                  color: '#022c22',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '3px 7px',
                  borderRadius: '6px',
                }}
              >
                +50 PTS
              </span>
            </div>
          </div>

          {/* CARD 02: SUPERVISOR */}
          <div
            style={{
              backgroundColor: 'rgba(3, 23, 33, 0.88)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1.5px solid #0284c7',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 0 25px rgba(2, 132, 199, 0.15)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(2, 132, 199, 0.2)',
                  border: '1px solid rgba(2, 132, 199, 0.5)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem',
                }}
              >
                02 • SUPERVISOR
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>
                Dispatch & Assign
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.74rem' }}>
                Zone triage, crew routing & priority allocation
              </p>

              {/* Supervisor Visual SVG */}
              <div
                style={{
                  background: 'rgba(1, 15, 23, 0.8)',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 240 125" style={{ width: '100%', height: '110px' }}>
                  {/* Desk screen */}
                  <rect x="25" y="15" width="190" height="85" rx="6" fill="#051c2c" stroke="#0284c7" strokeWidth="1.2" />
                  {/* Grid lines inside screen */}
                  <line x1="25" y1="40" x2="215" y2="40" stroke="rgba(2, 132, 199, 0.2)" />
                  <line x1="25" y1="65" x2="215" y2="65" stroke="rgba(2, 132, 199, 0.2)" />
                  {/* Route path */}
                  <polyline points="45,75 85,50 135,68 185,35" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                  <circle cx="45" cy="75" r="4.5" fill="#f87171" />
                  <circle cx="85" cy="50" r="4.5" fill="#fbbf24" />
                  <circle cx="135" cy="68" r="4.5" fill="#34d399" />
                  <circle cx="185" cy="35" r="5.5" fill="#38bdf8" />
                  {/* Route target tag */}
                  <rect x="140" y="22" width="68" height="12" rx="3" fill="#0284c7" />
                  <text x="174" y="31" fontSize="7" fill="#fff" fontWeight="bold" textAnchor="middle">
                    ROUTED TO: TRUCK #4
                  </text>
                  {/* Supervisor seated figure */}
                  <circle cx="120" cy="100" r="8" fill="#38bdf8" />
                  <path d="M 104 118 C 104 108 136 108 136 118 Z" fill="#0284c7" />
                </svg>
              </div>
            </div>

            <div
              style={{
                marginTop: '0.85rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid rgba(2, 132, 199, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>ACTIVE TASK</div>
                <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700 }}>Routed: 7 mins to sector</div>
              </div>
              <span
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                DISPATCH
              </span>
            </div>
          </div>

          {/* CARD 03: COLLECTOR */}
          <div
            style={{
              backgroundColor: 'rgba(33, 20, 4, 0.88)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1.5px solid #d97706',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 0 25px rgba(217, 119, 6, 0.15)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(217, 119, 6, 0.2)',
                  border: '1px solid rgba(217, 119, 6, 0.5)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  color: '#fbbf24',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem',
                }}
              >
                03 • COLLECTOR
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>
                Pickup & Resolve
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.74rem' }}>
                Electric smart vehicle sweeps & verifies proof
              </p>

              {/* Collector Visual SVG */}
              <div
                style={{
                  background: 'rgba(18, 11, 2, 0.8)',
                  borderRadius: '10px',
                  border: '1px solid rgba(251, 191, 36, 0.15)',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 240 125" style={{ width: '100%', height: '110px' }}>
                  {/* Worker figure */}
                  <circle cx="45" cy="40" r="8" fill="#f59e0b" />
                  <path d="M 45 48 L 45 88 M 45 58 L 60 70 M 45 88 L 36 112 M 45 88 L 54 112" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                  <rect x="37" y="52" width="16" height="24" rx="3" fill="#eab308" />
                  {/* Verified badge */}
                  <circle cx="28" cy="80" r="7" fill="#10b981" />
                  <text x="28" y="83" fontSize="9" fill="#fff" textAnchor="middle">✓</text>
                  {/* Electric Van */}
                  <g transform="translate(85, 30)">
                    <rect x="0" y="10" width="85" height="55" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                    <rect x="85" y="24" width="30" height="41" rx="4" fill="#042f24" stroke="#10b981" strokeWidth="1.5" />
                    <polygon points="88,28 110,28 112,45 88,45" fill="#34d399" opacity="0.4" />
                    {/* Headlight beam */}
                    <polygon points="115,50 145,40 145,68 115,56" fill="rgba(251, 191, 36, 0.2)" />
                    {/* Eco Leaf Logo on Van */}
                    <circle cx="42" cy="37" r="14" fill="#022c22" stroke="#10b981" strokeWidth="1" />
                    <text x="42" y="42" fontSize="13" textAnchor="middle" fill="#34d399">♻</text>
                    {/* Wheels */}
                    <circle cx="25" cy="65" r="11" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="95" cy="65" r="11" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
                  </g>
                </svg>
              </div>
            </div>

            <div
              style={{
                marginTop: '0.85rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid rgba(217, 119, 6, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>STATUS</div>
                <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700 }}>Cleaned & Resolved</div>
              </div>
              <span
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                PROOF: OK
              </span>
            </div>
          </div>

          {/* CARD 04: ADMIN */}
          <div
            style={{
              backgroundColor: 'rgba(23, 10, 36, 0.88)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1.5px solid #9333ea',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 0 25px rgba(147, 51, 234, 0.15)',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-block',
                  background: 'rgba(147, 51, 234, 0.2)',
                  border: '1px solid rgba(147, 51, 234, 0.5)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  color: '#c084fc',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem',
                }}
              >
                04 • ADMIN
              </div>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#ffffff', fontSize: '1.05rem', fontWeight: 700 }}>
                Master Governance
              </h3>
              <p style={{ margin: '0 0 1rem 0', color: '#94a3b8', fontSize: '0.74rem' }}>
                AI telemetry, heatmaps & system audit
              </p>

              {/* Admin Visual SVG */}
              <div
                style={{
                  background: 'rgba(14, 5, 23, 0.8)',
                  borderRadius: '10px',
                  border: '1px solid rgba(192, 132, 252, 0.15)',
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 240 125" style={{ width: '100%', height: '110px' }}>
                  {/* Heatmap Bubble Cluster */}
                  <circle cx="45" cy="35" r="16" fill="rgba(239, 68, 68, 0.4)" />
                  <circle cx="58" cy="42" r="14" fill="rgba(249, 115, 22, 0.4)" />
                  <circle cx="48" cy="50" r="12" fill="rgba(16, 185, 129, 0.4)" />
                  <text x="52" y="20" fontSize="7" fill="#c084fc" fontWeight="bold" textAnchor="middle">
                    HEATMAP: CITY WIDE
                  </text>
                  {/* Bar Telemetry Chart */}
                  <g transform="translate(130, 25)">
                    <rect x="0" y="25" width="8" height="25" rx="2" fill="#818cf8" />
                    <rect x="12" y="15" width="8" height="35" rx="2" fill="#38bdf8" />
                    <rect x="24" y="8" width="8" height="42" rx="2" fill="#34d399" />
                    <rect x="36" y="20" width="8" height="30" rx="2" fill="#f472b6" />
                    <rect x="48" y="10" width="8" height="40" rx="2" fill="#c084fc" />
                  </g>
                  {/* System Audit Checklist */}
                  <g transform="translate(20, 80)">
                    <text x="0" y="8" fontSize="7.5" fill="#a78bfa">✓ AI_MODEL: loaded weights</text>
                    <text x="0" y="19" fontSize="7.5" fill="#a78bfa">✓ ALL 4 TIERS ACTIVE & SYNCED</text>
                    <text x="0" y="30" fontSize="7.5" fill="#a78bfa">✓ ZERO PENDING ESCALATIONS</text>
                  </g>
                </svg>
              </div>
            </div>

            <div
              style={{
                marginTop: '0.85rem',
                paddingTop: '0.65rem',
                borderTop: '1px solid rgba(147, 51, 234, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>FULL ACCESS ROOT</div>
                <div style={{ fontSize: '0.72rem', color: '#e2e8f0', fontWeight: 700 }}>Dynamic Roles Provisioned</div>
              </div>
              <span
                style={{
                  background: '#9333ea',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}
              >
                ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* BOTTOM AUTONOMOUS CYCLE BAR */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem 1.5rem',
            borderRadius: '14px',
            backgroundColor: 'rgba(2, 22, 15, 0.95)',
            border: '1.2px solid rgba(52, 211, 153, 0.3)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ color: '#34d399', fontSize: '0.76rem', fontWeight: 800, letterSpacing: '0.05em' }}>
              AUTONOMOUS CYCLE LOOP:
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '2px' }}>
              1. Citizen Detects → 2. Supervisor Dispatches → 3. Collector Executes → 4. Admin Audits & Verifies
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                color: '#6ee7b7',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '8px',
              }}
            >
              99.8% SOLVED
            </span>
            <span
              style={{
                backgroundColor: 'rgba(2, 132, 199, 0.2)',
                border: '1px solid rgba(2, 132, 199, 0.5)',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '5px 12px',
                borderRadius: '8px',
              }}
            >
              AVG SLA: 14 MIN
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* AUTHENTICATION CARD                                      */}
      {/* ========================================================= */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'rgba(4, 25, 18, 0.85)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(16, 185, 129, 0.12)',
          padding: '2rem',
          color: '#ffffff',
        }}
      >
        {/* Toggle Mode */}
        <div
          style={{
            display: 'flex',
            background: 'rgba(2, 18, 12, 0.75)',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '1px solid rgba(52, 211, 153, 0.15)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.6rem 0',
              border: 'none',
              borderRadius: '9px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background:
                mode === 'signin'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
              color: mode === 'signin' ? '#ffffff' : '#64748b',
              boxShadow:
                mode === 'signin' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            style={{
              flex: 1,
              padding: '0.6rem 0',
              border: 'none',
              borderRadius: '9px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background:
                mode === 'register'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'transparent',
              color: mode === 'register' ? '#ffffff' : '#64748b',
              boxShadow:
                mode === 'register' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
            }}
          >
            Create account
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: '1.25rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#fca5a5',
              fontSize: '0.85rem',
              lineHeight: 1.4,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'register' && (
            <>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#6ee7b7',
                    letterSpacing: '0.06em',
                    marginBottom: '0.35rem',
                  }}
                >
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ashish Yadav"
                  style={{
                    width: '100%',
                    padding: '0.72rem 0.95rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    background: 'rgba(2, 18, 12, 0.7)',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#6ee7b7',
                    letterSpacing: '0.06em',
                    marginBottom: '0.35rem',
                  }}
                >
                  SYSTEM ROLE
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.72rem 0.95rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(52, 211, 153, 0.25)',
                    background: '#042217',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="citizen">01 • Citizen (Report & Track)</option>
                  <option value="supervisor">02 • Supervisor (Task & Dispatch)</option>
                  <option value="collector">03 • Collector (Field Cleanup)</option>
                  <option value="admin">04 • Administrator (Full Control)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#6ee7b7',
                letterSpacing: '0.06em',
                marginBottom: '0.35rem',
              }}
            >
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '0.72rem 0.95rem',
                borderRadius: '10px',
                border: '1px solid rgba(52, 211, 153, 0.25)',
                background: 'rgba(2, 18, 12, 0.7)',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#6ee7b7',
                letterSpacing: '0.06em',
                marginBottom: '0.35rem',
              }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.72rem 0.95rem',
                borderRadius: '10px',
                border: '1px solid rgba(52, 211, 153, 0.25)',
                background: 'rgba(2, 18, 12, 0.7)',
                color: '#ffffff',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.85rem',
              marginTop: '0.5rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              fontSize: '0.94rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.45)',
              transition: 'all 0.2s ease',
            }}
          >
            {loading
              ? 'Authenticating...'
              : mode === 'signin'
              ? 'Sign In to Workspace →'
              : 'Create Account & Continue →'}
          </button>
        </form>
      </div>
    </div>
  );
}