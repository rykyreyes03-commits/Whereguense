function PanelPasaporte({ sellos, total }) {
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
      maxWidth: '280px' 
    }}>
      <h3>Sellos obtenidos: {sellos.length}/{total}</h3>
      <ul style={{ paddingLeft: '20px', maxHeight: '300px', overflowY: 'auto' }}>
        {sellos.map(s => (
          <li key={s.id} style={{ fontSize: '0.9rem', marginBottom: '4px' }}>
            {s.nombre} ({s.fecha})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PanelPasaporte;