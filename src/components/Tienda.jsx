import { useState } from 'react';
import './Tienda.css';
import { accesorios } from '../data/accesorios';
import { obtenerNivel } from '../utils/rango';

function cargarComprados() {
  try {
    const guardados = JSON.parse(localStorage.getItem('accesoriosComprados') || '[]');
    if (Array.isArray(guardados)) {
      return guardados;
    }
  } catch (error) {
    console.error('Error leyendo accesorios comprados:', error);
  }
  return [];
}

function Tienda({ sellos, onNavigate }) {
  const [pestanaActiva, setPestanaActiva] = useState('gratis');
  const [comprados, setComprados] = useState(cargarComprados);

  const nivelUsuario = obtenerNivel(sellos.length);

  const handleComprar = (accesorio) => {
    const confirmado = window.confirm(
      'Esto es una simulación de compra — la pasarela de pago real se integrará cuando el equipo confirme el proveedor (ver sección 9 del documento de especificaciones). ¿Simular compra exitosa?'
    );
    if (!confirmado) return;

    const nuevosComprados = [...comprados, accesorio.id];
    setComprados(nuevosComprados);
    try {
      localStorage.setItem('accesoriosComprados', JSON.stringify(nuevosComprados));
    } catch (error) {
      console.error('Error guardando accesorio comprado:', error);
    }
  };

  const handleVerRequisito = (accesorio) => {
    alert(`Necesitas alcanzar el nivel ${accesorio.nivelRequerido} para desbloquear "${accesorio.nombre}". Tu nivel actual es ${nivelUsuario}.`);
  };

  const accesoriosGratis = accesorios.filter(a => a.tipo === 'gratis');
  const accesoriosExclusivos = accesorios.filter(a => a.tipo === 'exclusivo');

  return (
    <div className="tienda-wrapper">
      <header className="tienda-header">
        <button className="volver-btn" onClick={() => onNavigate?.('perfil')}>
          ← Volver
        </button>
        <h1>Tienda de accesorios</h1>
      </header>

      <div className="tienda-contenido">
        <div className="tienda-tabs">
          <button
            className={`tienda-tab ${pestanaActiva === 'gratis' ? 'activo' : ''}`}
            onClick={() => setPestanaActiva('gratis')}
          >
            Desbloqueables por nivel
          </button>
          <button
            className={`tienda-tab ${pestanaActiva === 'exclusivo' ? 'activo' : ''}`}
            onClick={() => setPestanaActiva('exclusivo')}
          >
            Exclusivos
          </button>
        </div>

        {pestanaActiva === 'gratis' && (
          <ul className="tienda-lista">
            {accesoriosGratis.map((accesorio) => {
              const desbloqueado = nivelUsuario >= accesorio.nivelRequerido;
              return (
                <li key={accesorio.id} className="tienda-item">
                  <span className="tienda-emoji">
                    {desbloqueado ? accesorio.emoji : '🔒'}
                  </span>
                  <div className="tienda-info">
                    <strong>{accesorio.nombre}</strong>
                    <span>Nivel {accesorio.nivelRequerido}</span>
                  </div>
                  {desbloqueado ? (
                    <span className="tienda-estado desbloqueado">Desbloqueado</span>
                  ) : (
                    <button className="tienda-btn" onClick={() => handleVerRequisito(accesorio)}>
                      Ver requisito
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {pestanaActiva === 'exclusivo' && (
          <ul className="tienda-lista">
            {accesoriosExclusivos.map((accesorio) => {
              const yaComprado = comprados.includes(accesorio.id);
              return (
                <li key={accesorio.id} className="tienda-item">
                  <span className="tienda-emoji">{accesorio.emoji}</span>
                  <div className="tienda-info">
                    <strong>{accesorio.nombre}</strong>
                    <span>{accesorio.precio}</span>
                  </div>
                  {yaComprado ? (
                    <span className="tienda-estado comprado">Ya comprado</span>
                  ) : (
                    <button className="tienda-btn comprar" onClick={() => handleComprar(accesorio)}>
                      Comprar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Tienda;
