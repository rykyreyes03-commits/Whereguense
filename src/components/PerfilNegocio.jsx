import { useRef, useState } from 'react';
import './PerfilNegocio.css';
import TopBar from './TopBar';
import SeleccionUbicacion from './SeleccionUbicacion';

const DIAS_SEMANA = 'Lunes a viernes';
const DIAS_FIN = 'Sábado a domingo';

const CATEGORIAS = ['Cafetería', 'Restaurante', 'Arte', 'Artesanía', 'Hospedaje', 'Otro'];

const HORARIOS_POR_DEFECTO = {
  entreSemana: { inicio: '07:00', fin: '18:00' },
  finDeSemana: { inicio: '09:00', fin: '15:00' },
};

const MAX_FOTOS = 6;
const FOTO_MAX_PX = 480;

function leerJSON(clave, porDefecto) {
  try {
    const v = JSON.parse(localStorage.getItem(clave));
    return v ?? porDefecto;
  } catch (error) {
    console.error(`Error leyendo ${clave}:`, error);
    return porDefecto;
  }
}

function guardarJSON(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (error) {
    console.error(`Error guardando ${clave}:`, error);
  }
}

function redimensionarImagen(file, maxPx) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const escala = Math.min(1, maxPx / Math.max(img.width, img.height));
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(file);
  });
}

function diasRestantesAnioGratis(fechaEnvio) {
  if (!fechaEnvio) return null;
  const inicio = new Date(fechaEnvio).getTime();
  if (Number.isNaN(inicio)) return null;
  const fin = inicio + 365 * 24 * 60 * 60 * 1000;
  return Math.ceil((fin - Date.now()) / (24 * 60 * 60 * 1000));
}

function PerfilNegocio({
  negocio,
  onNavigate,
  onActualizarHorarios,
  onActualizarUbicacion,
  onActualizarPerfil,
  onSubirLogo,
  onAgregarProducto,
  onEliminarProducto,
}) {
  const [fotos, setFotos] = useState(() => leerJSON('negocioFotos', []));

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [borradorPerfil, setBorradorPerfil] = useState({});

  const [editandoHorarios, setEditandoHorarios] = useState(false);
  const [horarios, setHorarios] = useState(negocio?.horarios || HORARIOS_POR_DEFECTO);
  const [mostrandoMapa, setMostrandoMapa] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState('');

  const logoInputRef = useRef(null);
  const fotosInputRef = useRef(null);

  if (mostrandoMapa) {
    return (
      <SeleccionUbicacion
        ubicacionInicial={negocio?.ubicacion}
        onCancelar={() => setMostrandoMapa(false)}
        onConfirmar={async (punto) => {
          const resultado = await onActualizarUbicacion(punto);
          if (resultado?.exito) {
            setMostrandoMapa(false);
          } else {
            window.alert(resultado?.mensaje || 'No se pudo actualizar la ubicación.');
          }
        }}
      />
    );
  }

  const nombre = negocio?.nombre || 'Tu negocio';
  const categoria = negocio?.categoria || 'Sin categoría';
  const inicial = nombre.trim().charAt(0).toUpperCase() || 'N';
  const activo = negocio?.estado === 'activo';
  const diasRestantes = diasRestantesAnioGratis(negocio?.fechaEnvio);

  const guardarHorarios = () => {
    onActualizarHorarios(horarios);
    setEditandoHorarios(false);
  };

  const abrirEdicionPerfil = () => {
    setBorradorPerfil({
      nombre,
      categoria,
      descripcion: negocio?.descripcion || '',
      telefono: negocio?.telefono || '',
    });
    setEditandoPerfil(true);
  };

  const guardarPerfil = async () => {
    const limpio = {
      nombre: (borradorPerfil.nombre || '').trim() || nombre,
      categoria: borradorPerfil.categoria || categoria,
      descripcion: (borradorPerfil.descripcion ?? negocio?.descripcion ?? '').trim(),
      telefono: (borradorPerfil.telefono ?? negocio?.telefono ?? '').trim(),
    };
    const resultado = await onActualizarPerfil(limpio);
    if (resultado.exito) {
      setEditandoPerfil(false);
    } else {
      window.alert(resultado.mensaje);
    }
  };

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const resultado = await onSubirLogo(file);
      if (!resultado.exito) {
        window.alert(resultado.mensaje);
      }
    } catch (err) {
      console.error(err);
      window.alert('No se pudo usar esa imagen. Prueba con otra.');
    }
  };

  const handleFotos = async (e) => {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    if (archivos.length === 0) return;
    const espacio = MAX_FOTOS - fotos.length;
    if (espacio <= 0) return;
    try {
      const nuevas = await Promise.all(
        archivos.slice(0, espacio).map((f) => redimensionarImagen(f, FOTO_MAX_PX))
      );
      const siguiente = [...fotos, ...nuevas];
      setFotos(siguiente);
      guardarJSON('negocioFotos', siguiente);
    } catch (err) {
      console.error(err);
      window.alert('Alguna imagen no se pudo procesar. Prueba con otras.');
    }
  };

  const quitarFoto = (indice) => {
    const siguiente = fotos.filter((_, i) => i !== indice);
    setFotos(siguiente);
    guardarJSON('negocioFotos', siguiente);
  };

  const handleAgregarProducto = () => {
    const valor = nuevoProducto.trim();
    if (!valor) return;
    onAgregarProducto(valor);
    setNuevoProducto('');
  };

  const productos = negocio?.productos || [];

  return (
    <div className="perfilnegocio-wrapper">
      <TopBar align="center" onMenuClick={() => onNavigate('menu')}>
        <button
          type="button"
          className={`perfilnegocio-logo ${negocio?.logoUrl ? 'perfilnegocio-logo--img' : ''}`}
          onClick={() => logoInputRef.current?.click()}
          aria-label="Cambiar logo del negocio"
        >
          {negocio?.logoUrl ? <img src={negocio.logoUrl} alt="Logo del negocio" /> : <span>{inicial}</span>}
          <span className="perfilnegocio-logo-camara" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
              <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.7l1-1.6A1 1 0 0 1 10 5h4a1 1 0 0 1 .85.4l1 1.6h1.65A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </span>
        </button>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogo}
          className="perfilnegocio-file-oculto"
        />

        <h1 className="perfilnegocio-nombre">{nombre}</h1>
        <span className="perfilnegocio-categoria">{categoria}</span>
        <p className="perfilnegocio-estado">
          {activo ? 'Activo' : negocio?.estado === 'rechazado' ? 'Registro rechazado' : 'Registro pendiente'}
          {activo && diasRestantes != null && (
            <>
              {' · '}
              {diasRestantes > 0
                ? `Año gratuito · ${diasRestantes} día${diasRestantes === 1 ? '' : 's'} restantes`
                : 'Año gratuito vencido'}
            </>
          )}
        </p>
        <button
          type="button"
          className="perfilnegocio-editar-perfil"
          onClick={editandoPerfil ? () => setEditandoPerfil(false) : abrirEdicionPerfil}
        >
          {editandoPerfil ? 'Cancelar' : 'Editar perfil'}
        </button>
      </TopBar>

      <div className="perfilnegocio-contenido">
        {editandoPerfil && (
          <div className="perfilnegocio-card">
            <h2 className="perfilnegocio-seccion-titulo">Editar perfil</h2>
            <label className="perfilnegocio-campo">
              Nombre del negocio
              <input
                type="text"
                value={borradorPerfil.nombre || ''}
                onChange={(e) => setBorradorPerfil({ ...borradorPerfil, nombre: e.target.value })}
              />
            </label>
            <span className="perfilnegocio-campo-label">Categoría</span>
            <div className="perfilnegocio-chips">
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`perfilnegocio-chip ${borradorPerfil.categoria === c ? 'activo' : ''}`}
                  onClick={() => setBorradorPerfil({ ...borradorPerfil, categoria: c })}
                >
                  {c}
                </button>
              ))}
            </div>
            <label className="perfilnegocio-campo">
              Descripción
              <textarea
                rows={3}
                value={borradorPerfil.descripcion || ''}
                onChange={(e) => setBorradorPerfil({ ...borradorPerfil, descripcion: e.target.value })}
                placeholder="Cuéntale al turista qué ofreces..."
              />
            </label>
            <label className="perfilnegocio-campo">
              Teléfono
              <input
                type="tel"
                value={borradorPerfil.telefono || ''}
                onChange={(e) => setBorradorPerfil({ ...borradorPerfil, telefono: e.target.value })}
                placeholder="Ej. 8888-8888"
              />
            </label>
            <button type="button" className="perfilnegocio-btn-primario" onClick={guardarPerfil}>
              Guardar cambios
            </button>
          </div>
        )}

        <section className="perfilnegocio-card">
          <div className="perfilnegocio-seccion-header">
            <h2 className="perfilnegocio-seccion-titulo">Horarios</h2>
            <button
              className="perfilnegocio-editar-chip"
              onClick={() => setEditandoHorarios(!editandoHorarios)}
              type="button"
            >
              {editandoHorarios ? 'Cancelar' : 'Editar'}
            </button>
          </div>

          {editandoHorarios ? (
            <div className="perfilnegocio-horarios-form">
              <label className="perfilnegocio-campo-label">{DIAS_SEMANA}</label>
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

              <label className="perfilnegocio-campo-label">{DIAS_FIN}</label>
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

              <button className="perfilnegocio-btn-primario" onClick={guardarHorarios} type="button">
                Guardar horarios
              </button>
            </div>
          ) : (
            <ul className="perfilnegocio-horarios-lista">
              <li>
                <span>{DIAS_SEMANA}</span>
                <strong>{horarios.entreSemana.inicio} – {horarios.entreSemana.fin}</strong>
              </li>
              <li>
                <span>{DIAS_FIN}</span>
                <strong>{horarios.finDeSemana.inicio} – {horarios.finDeSemana.fin}</strong>
              </li>
            </ul>
          )}
        </section>

        <section className="perfilnegocio-card">
          <div className="perfilnegocio-seccion-header">
            <h2 className="perfilnegocio-seccion-titulo">Ubicación</h2>
            {negocio?.ubicacion && (
              <button
                className="perfilnegocio-editar-chip"
                onClick={() => setMostrandoMapa(true)}
                type="button"
              >
                Cambiar
              </button>
            )}
          </div>

          {negocio?.ubicacion ? (
            <div className="perfilnegocio-ubicacion-ok">
              <span className="perfilnegocio-ubicacion-check" aria-hidden="true">✓</span>
              <div>
                <strong>Ubicación confirmada</strong>
                <span>
                  {negocio.ubicacion.lat.toFixed(5)}, {negocio.ubicacion.lng.toFixed(5)}
                </span>
              </div>
            </div>
          ) : (
            <button
              className="perfilnegocio-btn-primario"
              onClick={() => setMostrandoMapa(true)}
              type="button"
            >
              Confirmar ubicación en el mapa
            </button>
          )}
        </section>

        <section className="perfilnegocio-card">
          <div className="perfilnegocio-seccion-header">
            <h2 className="perfilnegocio-seccion-titulo">Fotos</h2>
            {fotos.length > 0 && fotos.length < MAX_FOTOS && (
              <button
                className="perfilnegocio-editar-chip"
                onClick={() => fotosInputRef.current?.click()}
                type="button"
              >
                Agregar más
              </button>
            )}
          </div>

          {fotos.length > 0 ? (
            <div className="perfilnegocio-fotos-grid">
              {fotos.map((src, i) => (
                <div key={i} className="perfilnegocio-foto">
                  <img src={src} alt={`Foto ${i + 1} del negocio`} />
                  <button
                    type="button"
                    className="perfilnegocio-foto-quitar"
                    onClick={() => quitarFoto(i)}
                    aria-label={`Quitar foto ${i + 1}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="perfilnegocio-empty">
              <span className="perfilnegocio-empty-icono" aria-hidden="true">📷</span>
              <p>Muestra tu local y tus productos. Las fotos ayudan a que los turistas te elijan.</p>
              <button
                type="button"
                className="perfilnegocio-btn-secundario"
                onClick={() => fotosInputRef.current?.click()}
              >
                Agregar fotos
              </button>
            </div>
          )}
          <input
            ref={fotosInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFotos}
            className="perfilnegocio-file-oculto"
          />
        </section>

        <section className="perfilnegocio-card">
          <h2 className="perfilnegocio-seccion-titulo">Tus productos</h2>

          {productos.length > 0 ? (
            <div className="perfilnegocio-productos">
              {productos.map((p) => (
                <span key={p.id} className="perfilnegocio-producto">
                  {p.nombre}
                  <button
                    className="perfilnegocio-producto-quitar"
                    onClick={() => onEliminarProducto(p.id)}
                    aria-label={`Quitar ${p.nombre}`}
                    type="button"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="perfilnegocio-productos-vacio">
              Aún no agregas productos ni categorías. Añade lo que ofreces para que aparezca en tu ficha.
            </p>
          )}

          <div className="perfilnegocio-producto-nuevo">
            <input
              type="text"
              placeholder="Ej. Máscaras, hamacas, café..."
              value={nuevoProducto}
              onChange={(e) => setNuevoProducto(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAgregarProducto()}
            />
            <button
              type="button"
              className="perfilnegocio-btn-secundario"
              onClick={handleAgregarProducto}
            >
              Agregar
            </button>
          </div>
        </section>

        <button
          className="perfilnegocio-qr-btn"
          onClick={() => onNavigate('generarQR')}
          type="button"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
            <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="8.5" y="8.5" width="3" height="3" rx="0.6" fill="currentColor" />
            <rect x="12.5" y="8.5" width="3" height="3" rx="0.6" fill="currentColor" />
            <rect x="8.5" y="12.5" width="3" height="3" rx="0.6" fill="currentColor" />
            <rect x="13" y="13" width="2" height="2" rx="0.5" fill="currentColor" />
          </svg>
          {negocio?.qr ? 'Ver QR de sello' : 'Generar QR de sello'}
        </button>
      </div>
    </div>
  );
}

export default PerfilNegocio;
