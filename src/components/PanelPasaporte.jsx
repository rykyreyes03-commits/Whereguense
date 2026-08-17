import { obtenerRango } from '../utils/rango';

function PanelPasaporte({ sellos, total }) {
  const progreso = Math.round((sellos.length / total) * 100);
  const nivel = obtenerRango(sellos.length);

  return (
    <div style={{ 
      position: 'absolute', 
      top: '80px', 
      right: '10px', 
      background: 'white', 
      padding: '15px', 
      borderRadius: '8px', 
      zIndex: 1000, 
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)', 
      maxWidth: '280px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎭</div>
      <h3 style={{ color: nivel.color, margin: '5px 0' }}>
        {nivel.nombre}
      </h3>
      
      <div style={{ background: '#eee', height: '8px', borderRadius: '4px', margin: '10px 0' }}>
        <div style={{ 
          width: `${progreso}%`, 
          height: '100%', 
          background: nivel.color, 
          borderRadius: '4px' 
        }}></div>
      </div>
      
      <p style={{ fontSize: '0.9rem' }}>
        Sellos: {sellos.length}/{total} ({progreso}%)
      </p>

      <ul style={{ paddingLeft: '20px', maxHeight: '250px', overflowY: 'auto', textAlign: 'left' }}>
        {sellos.map(s => (
          <li key={s.id} style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
            {s.nombre} ({s.fecha})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PanelPasaporte;