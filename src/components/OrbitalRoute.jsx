import './OrbitalRoute.css';

// Anillo "Orbital Route": acento animado de la pantalla de carga.
// Las animaciones viven en clases CSS (no en style inline) para que
// prefers-reduced-motion pueda desactivarlas.
export default function OrbitalRoute() {
  return (
    <svg className="orbital-route" viewBox="0 0 200 200" width="96" height="96" aria-hidden="true">
      <defs>
        <filter id="glowOrbital">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#6C7BFF" floodOpacity="0.8" />
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="white" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 6" />
      <g className="orbital-route-giro">
        <circle
          className="orbital-route-trazo"
          cx="100" cy="100" r="62" fill="none" stroke="white" strokeWidth="3"
          strokeLinecap="round" strokeDasharray="292 97" filter="url(#glowOrbital)"
        />
        <circle cx="100" cy="38" r="4.5" fill="#6C7BFF" stroke="white" strokeWidth="1.5" />
      </g>
      <circle className="orbital-route-destello" cx="100" cy="100" r="18" fill="none" stroke="white" strokeWidth="1" opacity="0" />
      <g className="orbital-route-pin">
        <g transform="translate(100 100)">
          <path d="M0,-14 C7,-14 13,-8 13,-1 C13,9 0,20 0,20 C0,20 -13,9 -13,-1 C-13,-8 -7,-14 0,-14 Z" fill="#FFFFFF" />
          <circle cx="0" cy="-1" r="4.5" fill="#1E2A78" />
        </g>
      </g>
    </svg>
  );
}
