import { useEffect, useRef, useState } from 'react';
import { Check, X, Camera, Eye, ArrowLeft, Store, QrCode, Star, Palette, ChevronRight } from 'lucide-react';
import './PerfilNegocio.css';
import TopBar from './TopBar';
import SeleccionUbicacion from './SeleccionUbicacion';
import PerfilNegocioPublico from './PerfilNegocioPublico';
import EstadoNegocio from './EstadoNegocio';
import GenerarQR from './GenerarQR';
import BottomNavNegocio from './BottomNavNegocio';
import CampoOtro from './CampoOtro';
import { OPCIONES_CATEGORIA_NEGOCIO, OTRO_NEGOCIO, separarCategoriaNegocio, unirCategoriaNegocio } from '../utils/categoriasNegocio';

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];


const MAX_FOTOS = 6;
const TAMANO_MAX_MB = 5;

// Días que faltan hasta el vencimiento real de la suscripción (null si no hay fecha).
function diasRestantesSuscripcion(vencimiento) {
  if (!vencimiento) return null;
  const fin = new Date(vencimiento).getTime();
  if (Number.isNaN(fin)) return null;
  return Math.ceil((fin - Date.now()) / (24 * 60 * 60 * 1000));
}

// Mismo criterio que el candado de la base (016): un negocio activo sin fecha de
// vencimiento o con la fecha ya pasada no se ve en el mapa, así que tampoco ve su panel.
function suscripcionVencida(negocio) {
  if (negocio?.estado !== 'activo') return false;
  if (!negocio.vencimientoSuscripcion) return true;
  const fin = new Date(negocio.vencimientoSuscripcion).getTime();
  return Number.isNaN(fin) || fin <= Date.now();
}

function PerfilNegocio({
  negocio,
  horarios,
  fotos,
  productos,
  onNavigate,
  onActualizarHorarios,
  onActualizarUbicacion,
  onActualizarPerfil,
  onSubirLogo,
  onSubirFoto,
  onEliminarFoto,
  onAgregarProducto,
  onEliminarProducto,
  actividades,
  actividadesQR,
  onRecargarActividades,
  onCrearActividad,
  onReenviarSello,
  onEliminarActividad,
}) {
  // Pestaña activa: estado local (no es una pantalla de App.jsx). Se cambia desde la
  // barra inferior (BottomNavNegocio) y desde los accesos rápidos del Resumen.
  const [pestana, setPestana] = useState('resumen');
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [borradorPerfil, setBorradorPerfil] = useState({});

  const [editandoHorarios, setEditandoHorarios] = useState(false);
  const [horariosBorrador, setHorariosBorrador] = useState([]);
  const [mostrandoMapa, setMostrandoMapa] = useState(false);
  const [viendoComoTurista, setViendoComoTurista] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState('');

  const logoInputRef = useRef(null);
  const fotosInputRef = useRef(null);

  // La barra de pestañas ya no está arriba, al alcance tras subir: al cambiar de pestaña
  // se vuelve al inicio para no quedar a mitad del contenido de la anterior.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pestana]);

  // Suscripción vencida: reemplaza el panel entero (ninguna herramienta accesible).
  // Solo queda el menú de la barra superior para poder salir del flujo del negocio.
  if (suscripcionVencida(negocio)) {
    return (
      <div className="perfilnegocio-wrapper perfilnegocio-vencido">
        <TopBar align="center" onMenuClick={() => onNavigate('menu')} />
        <EstadoNegocio vista="vencido" nombreNegocio={negocio?.nombre} />
      </div>
    );
  }

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
  const diasRestantes = diasRestantesSuscripcion(negocio?.vencimientoSuscripcion);

  const abrirEdicionHorarios = () => {
    setHorariosBorrador(horarios.map((h) => ({ ...h })));
    setEditandoHorarios(true);
  };

  const actualizarDiaBorrador = (diaSemana, cambios) => {
    setHorariosBorrador((prev) =>
      prev.map((h) => (h.diaSemana === diaSemana ? { ...h, ...cambios } : h))
    );
  };

  const guardarHorarios = async () => {
    const resultado = await onActualizarHorarios(horariosBorrador);
    if (resultado.exito) {
      setEditandoHorarios(false);
    } else {
      window.alert(resultado.mensaje);
    }
  };

  const abrirEdicionPerfil = () => {
    const { opcion, otro } = separarCategoriaNegocio(negocio?.categoria);
    setBorradorPerfil({
      nombre,
      categoria: opcion,
      categoriaOtro: otro,
      descripcion: negocio?.descripcion || '',
      telefono: negocio?.telefono || '',
    });
    setEditandoPerfil(true);
  };

  const faltaCategoriaOtro = borradorPerfil.categoria === OTRO_NEGOCIO && !(borradorPerfil.categoriaOtro || '').trim();

  const guardarPerfil = async () => {
    if (faltaCategoriaOtro) return;
    const limpio = {
      nombre: (borradorPerfil.nombre || '').trim() || nombre,
      categoria: unirCategoriaNegocio(borradorPerfil.categoria, borradorPerfil.categoriaOtro) || negocio?.categoria || categoria,
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

    const archivosValidos = archivos.slice(0, espacio).filter((f) => {
      const tamanoMB = f.size / (1024 * 1024);
      if (tamanoMB > TAMANO_MAX_MB) {
        window.alert(`"${f.name}" pesa demasiado (máximo ${TAMANO_MAX_MB} MB). Prueba con una foto más liviana.`);
        return false;
      }
      return true;
    });

    for (const file of archivosValidos) {
      const resultado = await onSubirFoto(file);
      if (!resultado.exito) {
        window.alert(resultado.mensaje);
        break;
      }
    }
  };

  const quitarFoto = async (fotoId) => {
    const resultado = await onEliminarFoto(fotoId);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
    }
  };

  const handleAgregarProducto = async () => {
    const valor = nuevoProducto.trim();
    if (!valor) return;
    const resultado = await onAgregarProducto(valor);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
      return;
    }
    setNuevoProducto('');
  };

  const quitarProducto = async (productoId) => {
    const resultado = await onEliminarProducto(productoId);
    if (!resultado.exito) {
      window.alert(resultado.mensaje);
    }
  };

  return (
    <div className="perfilnegocio-wrapper perfilnegocio-wrapper--con-barra">
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
          {/* Si llegó aquí estando activo, la suscripción está vigente (si no, se muestra el aviso). */}
          {activo && diasRestantes != null && (
            <>
              {' · '}
              {diasRestantes === 1 ? 'Suscripción: queda 1 día' : `Suscripción: quedan ${diasRestantes} días`}
            </>
          )}
        </p>
        <button
          type="button"
          className="perfilnegocio-ver-turista"
          onClick={() => setViendoComoTurista(true)}
        >
          <Eye size={16} strokeWidth={2} aria-hidden="true" /> Ver como te ven los turistas
        </button>
      </TopBar>

      {viendoComoTurista && (
        <>
          {/* Mismo componente que abre el turista en el mapa: carga horarios, fotos y
              productos desde la base, así que muestra lo publicado, no borradores. */}
          <PerfilNegocioPublico
            negocio={{
              id: negocio?.id,
              name: negocio?.nombre,
              categoria: negocio?.categoria,
              descripcion: negocio?.descripcion,
              telefono: negocio?.telefono,
            }}
            onCerrar={() => setViendoComoTurista(false)}
          />
          <button
            type="button"
            className="perfilnegocio-volver-panel"
            onClick={() => setViendoComoTurista(false)}
          >
            <ArrowLeft size={18} strokeWidth={2.2} aria-hidden="true" /> Volver a mi panel
          </button>
        </>
      )}

      {/* key: al cambiar de pestaña se vuelve a montar y se repite la entrada escalonada */}
      <div className="perfilnegocio-contenido" key={pestana}>
        {pestana === 'resumen' && (
          <>
            <section className="perfilnegocio-card perfilnegocio-saludo">
              <h2 className="perfilnegocio-saludo-titulo">¡Hola, {nombre}!</h2>
              <p className="perfilnegocio-saludo-texto">Esto es lo que puedes hacer hoy en tu panel.</p>
            </section>

            {/* Aquí irá el resumen de reseñas ("★ 4.6 · 12 reseñas"), como una tarjeta más
                entre el saludo y los accesos rápidos. */}

            <div className="perfilnegocio-accesos">
              <button type="button" className="perfilnegocio-acceso" onClick={() => setPestana('negocio')}>
                <span className="perfilnegocio-acceso-icono" aria-hidden="true"><Store size={22} strokeWidth={1.8} /></span>
                <span className="perfilnegocio-acceso-texto">
                  <strong>Editar tu información</strong>
                  <span>Perfil, horarios, ubicación, fotos y productos</span>
                </span>
                <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="perfilnegocio-acceso-chevron" />
              </button>
              <button type="button" className="perfilnegocio-acceso" onClick={() => setPestana('actividades')}>
                <span className="perfilnegocio-acceso-icono" aria-hidden="true"><QrCode size={22} strokeWidth={1.8} /></span>
                <span className="perfilnegocio-acceso-texto">
                  <strong>Crear una actividad</strong>
                  <span>Publícala en Eventos y, si quieres, pide un sello</span>
                </span>
                <ChevronRight size={18} strokeWidth={2} aria-hidden="true" className="perfilnegocio-acceso-chevron" />
              </button>
            </div>
          </>
        )}

        {pestana === 'negocio' && (
          <>
            <div className="perfilnegocio-negocio-acciones">
              <button
                type="button"
                className="perfilnegocio-btn-secundario"
                onClick={editandoPerfil ? () => setEditandoPerfil(false) : abrirEdicionPerfil}
              >
                {editandoPerfil ? 'Cancelar' : 'Editar perfil'}
              </button>
            </div>

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
                  {OPCIONES_CATEGORIA_NEGOCIO.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`perfilnegocio-chip ${borradorPerfil.categoria === c ? 'activo' : ''}`}
                      onClick={() => setBorradorPerfil({ ...borradorPerfil, categoria: c })}
                      aria-pressed={borradorPerfil.categoria === c}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {borradorPerfil.categoria === OTRO_NEGOCIO && (
                  <CampoOtro
                    id="perfil-categoria-otro"
                    value={borradorPerfil.categoriaOtro || ''}
                    onChange={(texto) => setBorradorPerfil({ ...borradorPerfil, categoriaOtro: texto })}
                    placeholder="Ej. Panadería, Librería…"
                  />
                )}
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
                <button type="button" className="perfilnegocio-btn-primario" onClick={guardarPerfil} disabled={faltaCategoriaOtro}>
                  {faltaCategoriaOtro ? 'Falta: ¿cuál categoría?' : 'Guardar cambios'}
                </button>
              </div>
            )}

            <section className="perfilnegocio-card">
              <div className="perfilnegocio-seccion-header">
                <h2 className="perfilnegocio-seccion-titulo">Horarios</h2>
                <button
                  className="perfilnegocio-editar-chip"
                  onClick={() => (editandoHorarios ? setEditandoHorarios(false) : abrirEdicionHorarios())}
                  type="button"
                >
                  {editandoHorarios ? 'Cancelar' : 'Editar'}
                </button>
              </div>

              {editandoHorarios ? (
                <div className="perfilnegocio-horarios-form">
                  {horariosBorrador.map((h) => (
                    <div key={h.diaSemana} className="perfilnegocio-horario-dia">
                      <div className="perfilnegocio-horario-dia-header">
                        <span>{NOMBRES_DIA[h.diaSemana]}</span>
                        <label className="perfilnegocio-horario-cerrado">
                          <input
                            type="checkbox"
                            checked={h.cerrado}
                            onChange={(e) => actualizarDiaBorrador(h.diaSemana, { cerrado: e.target.checked })}
                          />
                          Cerrado
                        </label>
                      </div>
                      {!h.cerrado && (
                        <div className="perfilnegocio-horarios-fila">
                          <input
                            type="time"
                            value={h.horaApertura || ''}
                            onChange={(e) => actualizarDiaBorrador(h.diaSemana, { horaApertura: e.target.value })}
                          />
                          <span>a</span>
                          <input
                            type="time"
                            value={h.horaCierre || ''}
                            onChange={(e) => actualizarDiaBorrador(h.diaSemana, { horaCierre: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="perfilnegocio-btn-primario" onClick={guardarHorarios} type="button">
                    Guardar horarios
                  </button>
                </div>
              ) : (
                <ul className="perfilnegocio-horarios-lista">
                  {horarios.map((h) => (
                    <li key={h.diaSemana}>
                      <span>{NOMBRES_DIA[h.diaSemana]}</span>
                      <strong>{h.cerrado ? 'Cerrado' : `${h.horaApertura} – ${h.horaCierre}`}</strong>
                    </li>
                  ))}
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
                  <span className="perfilnegocio-ubicacion-check" aria-hidden="true"><Check size={18} strokeWidth={2.6} /></span>
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
                  {fotos.map((foto, i) => (
                    <div key={foto.id} className="perfilnegocio-foto">
                      <img src={foto.url} alt={`Foto ${i + 1} del negocio`} />
                      <button
                        type="button"
                        className="perfilnegocio-foto-quitar"
                        onClick={() => quitarFoto(foto.id)}
                        aria-label={`Quitar foto ${i + 1}`}
                      >
                        <X size={12} strokeWidth={2.6} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="perfilnegocio-empty">
                  <span className="perfilnegocio-empty-icono" aria-hidden="true"><Camera size={28} strokeWidth={1.8} /></span>
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
                        onClick={() => quitarProducto(p.id)}
                        aria-label={`Quitar ${p.nombre}`}
                        type="button"
                      >
                        <X size={12} strokeWidth={2.6} aria-hidden="true" />
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
          </>
        )}

        {/* GenerarQR dibuja dos bloques propios (Actividades y Cupones), cada uno con su marco */}
        {pestana === 'actividades' && (
          <GenerarQR
            embebido
            negocioId={negocio?.id}
            organizador={{ nombre: negocio?.nombre, logoUrl: negocio?.logoUrl }}
            actividades={actividades}
            actividadesQR={actividadesQR}
            onRecargar={onRecargarActividades}
            onCrearActividad={onCrearActividad}
            onReenviarSello={onReenviarSello}
            onEliminarActividad={onEliminarActividad}
          />
        )}

        {pestana === 'resenas' && (
          <section className="perfilnegocio-card perfilnegocio-empty">
            <span className="perfilnegocio-empty-icono" aria-hidden="true"><Star size={28} strokeWidth={1.8} /></span>
            <p>Las reseñas de tus clientes van a aparecer aquí pronto.</p>
          </section>
        )}

        {pestana === 'diseno' && (
          <section className="perfilnegocio-card perfilnegocio-empty">
            <span className="perfilnegocio-empty-icono" aria-hidden="true"><Palette size={28} strokeWidth={1.8} /></span>
            <p>Personaliza tu perfil próximamente.</p>
          </section>
        )}
      </div>

      <BottomNavNegocio activo={pestana} onCambiar={setPestana} />
    </div>
  );
}

export default PerfilNegocio;
