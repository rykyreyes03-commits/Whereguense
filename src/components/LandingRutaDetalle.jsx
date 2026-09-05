import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LandingRutaDetalle.css';
import LandingNavbar from './LandingNavbar';
import { sitios } from '../data/sitios';

const RUTAS_INFO = {
  dariana: {
    titulo: 'Ruta Dariana',
    texto: [
      'La Ruta Dariana urbana es un circuito peatonal de aproximadamente 1.2 kilómetros que atraviesa el corazón histórico de León.',
      'Este recorrido conecta los edificios coloniales, plazas y casonas que marcaron la vida, la obra y el descanso final de Rubén Darío, permitiendo caminar por las mismas calles que inspiraron el nacimiento del Modernismo literario.',
    ],
    conMapa: true,
  },
  culturales: {
    titulo: 'Circuitos culturales',
    texto: [
      'Los circuitos culturales de León complementan la Ruta Dariana permitiendo explorar la ciudad desde sus luchas históricas, su arte plástico, su tradición religiosa y sus mitos urbanos.',
      'Al compartirse el mismo trazado colonial, estos circuitos se cruzan constantemente con la Calle Real y la Plaza Mayor.',
    ],
    conMapa: false,
  },
  creativos: {
    titulo: 'Circuitos Creativos',
    texto: [
      'Los circuitos creativos de León aprovechan la infraestructura colonial, la energía universitaria y la tradición artesanal de la ciudad para conectar el diseño, las artes visuales, la innovación gastronómica y las industrias culturales.',
      'A diferencia de los circuitos museísticos o históricos tradicionales, estos itinerarios están enfocados en la producción visual, el diseño, la interacción directa con creadores locales y la oferta cultural independiente.',
    ],
    conMapa: false,
  },
};

const iconoPin = L.divIcon({
  className: 'lr-pin',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

function LandingRutaDetalle({ tipo, onNavigate, onComenzar }) {
  const info = RUTAS_INFO[tipo];
  const sitiosRuta = useMemo(() => sitios.slice(0, 8), []);

  return (
    <div className="landing">
      <LandingNavbar activo="landingMapas" onNavigate={onNavigate} onComenzar={onComenzar} />

      <section className="lr-hero">
        <div className="lr-hero-inner">
          <button className="lr-volver" onClick={() => onNavigate('landingMapas')} type="button">
            ← Mapas
          </button>
          <h1>{info.titulo}</h1>
        </div>
      </section>

      <section className="lr-contenido">
        <div className="lr-contenido-inner">
          <div className="lr-texto">
            {info.texto.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {info.conMapa ? (
            <div className="lr-mapa">
              <MapContainer
                center={[12.4375, -86.8783]}
                zoom={15}
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url={`https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_API_KEY}`}
                  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                />
                {sitiosRuta.map((sitio) => (
                  <Marker key={sitio.id} position={sitio.position} icon={iconoPin}>
                    <Popup>{sitio.name}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="lr-mapa lr-mapa--proximamente">
              <p>Mapa interactivo próximamente 🗺️</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default LandingRutaDetalle;
