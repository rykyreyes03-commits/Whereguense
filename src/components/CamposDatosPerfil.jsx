import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { CODIGOS, GENEROS, IDIOMAS, PAISES, TIPOS_FOTO, hoy } from '../utils/datosRegistro';
import { redimensionarImagen } from '../utils/fotoPerfil';

// Los campos del registro con estilo de cuaderno (solo línea de abajo), compartidos por el registro y la edición desde el pasaporte.
// Necesita el estilo de OnboardingCuaderno.css y un contenedor con las variables --oc-* (.oc-vars o .oc-fondo).
//   valores: { nombre, pais, idioma, nacimiento, codigo, telefono, genero, foto }, errores: { campo: 'mensaje' }
//   onCambio(campo, valor). vistaPrevia: imagen que se ve en el marco de la foto cuando todavía no se eligió otra.
function CamposDatosPerfil({ valores, errores, onCambio, deshabilitado = false, prefijo = 'oc', nacimientoObligatorio = true, vistaPrevia = null, textoFotoNueva = 'Pegar una foto' }) {
  const archivoRef = useRef(null);
  const [errorFoto, setErrorFoto] = useState('');
  const id = (campo) => `${prefijo}-${campo}`;
  const paises = PAISES.includes(valores.pais) ? PAISES : [valores.pais, ...PAISES];
  const foto = valores.foto || vistaPrevia;

  const handleFoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!TIPOS_FOTO.includes(file.type)) {
      setErrorFoto('Usa una foto JPG, PNG o WebP.');
      return;
    }
    try {
      onCambio('foto', await redimensionarImagen(file));
      setErrorFoto('');
    } catch {
      setErrorFoto('No se pudo usar esa imagen. Prueba con otra.');
    }
  };

  return (
    <>
      <p className="oc-grupo">Obligatorios *</p>
      <div className={`oc-campo ${errores.nombre ? 'oc-campo--error' : ''}`}>
        <label htmlFor={id('usuario')}>Nombre de usuario <b>*</b></label>
        <input id={id('usuario')} className="oc-mano" type="text" placeholder="Cómo te verán otros viajeros" autoComplete="off" maxLength={40} value={valores.nombre} disabled={deshabilitado} onChange={(e) => onCambio('nombre', e.target.value)} />
        {errores.nombre && <span className="oc-msg">{errores.nombre}</span>}
      </div>
      <div className={`oc-campo ${errores.pais ? 'oc-campo--error' : ''}`}>
        <label htmlFor={id('pais')}>País de origen <b>*</b></label>
        <select id={id('pais')} className="oc-mano" value={valores.pais} disabled={deshabilitado} onChange={(e) => onCambio('pais', e.target.value)}>
          {paises.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="oc-campo">
        <span className="oc-etq">Idioma preferido <b>*</b></span>
        <div className="oc-opciones" role="radiogroup" aria-label="Idioma preferido">
          {IDIOMAS.map((i) => (
            <label key={i.valor}>
              <input type="radio" name={id('idioma')} value={i.valor} checked={valores.idioma === i.valor} disabled={deshabilitado} onChange={() => onCambio('idioma', i.valor)} />
              <span>{i.texto}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={`oc-campo ${errores.nacimiento ? 'oc-campo--error' : ''}`}>
        <label htmlFor={id('nacimiento')}>Fecha de nacimiento {nacimientoObligatorio && <b>*</b>}</label>
        <input id={id('nacimiento')} className="oc-mano" type="date" min="1900-01-01" max={hoy()} value={valores.nacimiento} disabled={deshabilitado} onChange={(e) => onCambio('nacimiento', e.target.value)} />
        {errores.nacimiento && <span className="oc-msg">{errores.nacimiento}</span>}
      </div>

      <p className="oc-grupo">Opcionales</p>
      <div className={`oc-campo ${errores.telefono ? 'oc-campo--error' : ''}`}>
        <label htmlFor={id('telefono')}>Teléfono</label>
        <div className="oc-tel">
          <select className="oc-mano oc-cod" aria-label="Código de país" value={valores.codigo} disabled={deshabilitado} onChange={(e) => onCambio('codigo', e.target.value)}>
            {CODIGOS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input id={id('telefono')} className="oc-mano" type="tel" inputMode="tel" placeholder="8888 8888" maxLength={20} value={valores.telefono} disabled={deshabilitado} onChange={(e) => onCambio('telefono', e.target.value)} />
        </div>
        {errores.telefono && <span className="oc-msg">{errores.telefono}</span>}
      </div>
      <div className="oc-campo">
        <span className="oc-etq">Género</span>
        <div className="oc-opciones" role="radiogroup" aria-label="Género">
          {GENEROS.map((g) => (
            <label key={g.valor}>
              <input type="radio" name={id('genero')} value={g.valor} checked={valores.genero === g.valor} disabled={deshabilitado} onChange={() => onCambio('genero', g.valor)} onClick={() => { if (valores.genero === g.valor) onCambio('genero', ''); }} />
              <span>{g.texto}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="oc-campo">
        <span className="oc-etq">Foto de perfil</span>
        <button type="button" className="oc-foto-pegar" disabled={deshabilitado} onClick={() => archivoRef.current?.click()}>
          <span className="oc-foto-marco">
            {foto ? <img src={foto} alt="Tu foto de perfil" /> : <Camera size={24} strokeWidth={1.9} aria-hidden="true" />}
          </span>
          <span><strong>{foto ? 'Cambiar foto' : textoFotoNueva}</strong><small>Toca para elegir una imagen</small></span>
        </button>
        <input ref={archivoRef} type="file" accept={TIPOS_FOTO.join(',')} hidden onChange={handleFoto} />
        {errorFoto && <span className="oc-msg">{errorFoto}</span>}
      </div>
    </>
  );
}

export default CamposDatosPerfil;
