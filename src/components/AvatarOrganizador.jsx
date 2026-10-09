import { useState } from 'react';
import { inicialDe } from '../utils/eventos';

// Avatar redondo del organizador: su logo, o su inicial si no tiene logo (o si no carga).
function AvatarOrganizador({ nombre, logoUrl, tamano = 28, className = '' }) {
  const [logoFallido, setLogoFallido] = useState(null);
  const conLogo = Boolean(logoUrl) && logoFallido !== logoUrl;
  return (
    <span
      className={`avatar-organizador ${className}`}
      style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.46) }}
      aria-hidden="true"
    >
      {conLogo ? (
        <img src={logoUrl} alt="" onError={() => setLogoFallido(logoUrl)} />
      ) : (
        inicialDe(nombre)
      )}
    </span>
  );
}

export default AvatarOrganizador;
