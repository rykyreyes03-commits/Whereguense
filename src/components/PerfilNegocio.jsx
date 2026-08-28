import { useState } from 'react';
import './PerfilNegocio.css';
import TopBar from './TopBar';
import SeleccionUbicacion from './SeleccionUbicacion';

const DIAS_SEMANA = 'Lunes a viernes';
const DIAS_FIN = 'Sábado a domingo';

const HORARIOS_POR_DEFECTO = {
  entreSemana: { inicio: '07:00', fin: '18:00' },
  finDeSemana: { inicio: '09:00', fin: '15:00' },
};

function PerfilNegocio({
  negocio,
  onNavigate,
  onActualizarHorarios,
  onActualizarUbicacion,
  onAgregarProducto,
  onEliminarProducto,
}) {
  const [editandoHorarios, setEditandoHorarios] = useState(false);
  const [horarios, setHorarios] = useState(negocio?.horarios || HORARIOS_POR_DEFECTO);
  const [mostrandoMapa, setMostrandoMapa] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState('');

  if (mostrandoMapa) {
    return (
      <SeleccionUbicacion
        ubicacionInicial={negocio?.ubicacion}
        onCancelar={() => setMostrandoMapa(false)}
        onConfirmar={(punto) => {
          onActualizarUbicacion(punto);
          setMostrandoMapa(false);
        }}
      />
    );
  }

  const guardarHorarios = () => {
    onActualizarHorarios(horarios);
    setEditandoHorarios(false);
  };

  const handleAgregarProducto = () => {
    const nombre = nuevoProducto.trim();
    if (!nombre) return;
    onAgregarProducto(nombre);
    setNuevoProducto('');
  };

  return (
    <div className="perfilnegocio-wrapper">
      <TopBar
        onMenuClick={() => onNavigate('menu')}
        rightSlot={
          <button
            className="perfilnegocio-config"
            onClick={() => onNavigate('menu')}
            aria-label="Configuración"
            type="button"
          >
            ⚙️
          </button>
        }
      />

      <div className="perfilnegocio-contenido">
        <div className="perfilnegocio-avatar">🏪</div>
        <h1 className="perfilnegocio-nombre">{negocio?.nombre || 'Tu negocio'}</h1>
        <span className="perfilnegocio-categoria">{negocio?.categoria}</span>

        <section className="perfilnegocio-seccion">
          <div className="perfilnegocio-seccion-header">
            <h2>Horarios</h2>
            <button
              className="perfilnegocio-editar"
              onClick={() => setEditandoHorarios(!editandoHorarios)}
              type="button"
            >
              {editandoHorarios ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editandoHorarios ? (
            <div className="perfilnegocio-horarios-form">
              <label>{DIAS_SEMANA}</label>
              <div className="perfilnegocio-horarios-fila">
                <input
                  type="time"
                  value={horarios.entreSemana.inicio}
                  onChange={(e) =>
                    setHorarios({
                      ...horarios,
                      entreSemana: { ...horarios.entreSemana, inicio: e.target.value },
                    })
                  }
                />
                <span>a</span>
                <input
                  type="time"
                  value={horarios.entreSemana.fin}
                  onChange={(e) =>
                    setHorarios({
                      ...horarios,
                      entreSemana: { ...horarios.entreSemana, fin: e.target.value },
                    })
                  }
                />
              </div>

              <label>{DIAS_FIN}</label>
              <div className="perfilnegocio-horarios-fila">
                <input
                  type="time"
                  value={horarios.finDeSemana.inicio}
                  onChange={(e) =>
                    setHorarios({
                      ...horarios,
                      finDeSemana: { ...horarios.finDeSemana, inicio: e.target.value },
                    })
                  }
                />
                <span>a</span>
                <input
                  type="time"
                  value={horarios.finDeSemana.fin}
                  onChange={(e) =>
                    setHorarios({
                      ...horarios,
                      finDeSemana: { ...horarios.finDeSemana, fin: e.target.value },
                    })
                  }
                />
              </div>

              <button className="perfilnegocio-guardar" onClick={guardarHorarios} type="button">
                Guardar horarios
              </button>
            </div>
          ) : (
            <div className="perfilnegocio-horarios-vista">
              <p>
                <strong>{DIAS_SEMANA}:</strong> {horarios.entreSemana.inicio} – {horarios.entreSemana.fin}
              </p>
              <p>
                <strong>{DIAS_FIN}:</strong> {horarios.finDeSemana.inicio} – {horarios.finDeSemana.fin}
              </p>
            </div>
          )}
        </section>

        <button className="perfilnegocio-ubicacion-btn" onClick={() => setMostrandoMapa(true)} type="button">
          📍 Confirmar ubicación
        </button>

        <div className="perfilnegocio-separador"></div>

        <section className="perfilnegocio-seccion">
          <h2>Fotos</h2>
          <p className="perfilnegocio-fotos-nota">
            {negocio?.cantidadFotos || 0} foto(s) subidas en el registro. La galería completa se activa cuando
            conectemos el backend.
          </p>
        </section>

        <section className="perfilnegocio-seccion">
          <h2>Tus productos</h2>
          <div className="perfilnegocio-productos-grid">
            {(negocio?.productos || []).map((p) => (
              <div key={p.id} className="perfilnegocio-producto-card">
                <span>{p.nombre}</span>
                <button
                  className="perfilnegocio-producto-quitar"
                  onClick={() => onEliminarProducto(p.id)}
                  aria-label={`Quitar ${p.nombre}`}
                  type="button"
                >
                  ✕
                </button>
              </div>
            ))}
            {(!negocio?.productos || negocio.productos.length === 0) && (
              <p className="perfilnegocio-productos-vacio">Todavía no agregas productos o categorías.</p>
            )}
          </div>

          <div className="perfilnegocio-producto-nuevo">
            <input
              type="text"
              placeholder="Ej. Máscaras, Hamacas..."
              value={nuevoProducto}
              onChange={(e) => setNuevoProducto(e.target.value)}
            />
            <button onClick={handleAgregarProducto} type="button">
              + Agregar
            </button>
          </div>
        </section>

        <button className="perfilnegocio-qr-btn" onClick={() => onNavigate('generarQR')} type="button">
          🔳 Generar QR de sello
        </button>
      </div>
    </div>
  );
}

export default PerfilNegocio;
