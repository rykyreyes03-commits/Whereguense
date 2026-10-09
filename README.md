# Wheregüense

**Wheregüense** es una plataforma de turismo cultural gamificado, con piloto en la Ruta Dariana (León, Nicaragua).
Proyecto del equipo **Cap'n Code** — Hackathon Nicaragua 2026, Categoría Avanzado.

Funciona como sitio web instalable (PWA) y como app Android (Capacitor), con el mismo código.

## Qué hace

Conecta a turistas con las experiencias culturales de León mediante un mapa interactivo, sellos
coleccionables (por geolocalización o por QR de un negocio), niveles y un avatar folclórico
(Cabezón o Gigantona). Los emprendedores locales tienen su propio panel para publicar su negocio,
sus actividades y sus cupones, y reciben reseñas de quienes los visitaron.

**Turista**
- Mapa con ruteo peatonal y modo "seguir mi ubicación"; landing pública con eventos y rutas.
- Pasaporte de sellos: por geolocalización (radio por sitio, por defecto 80 m) o por QR de un negocio.
- Niveles y rangos con piezas de avatar desbloqueables; guardados, ranking y eventos.
- Cupones: se obtienen escaneando el QR del cupón y se usan escaneando el QR de canje del negocio.
- Reseñas: puede reseñar un negocio solo si tiene un sello de ese negocio.
- Lo terminado desaparece: una actividad o un cupón vencido deja de ofrecerse (los favoritos se conservan como "Ya terminó").

**Emprendedor**
- Registro con aprobación de un administrador; perfil con logo, fotos, horarios y productos.
- Actividades (con o sin sello QR), cupones con QR, y reseñas con respuesta.
- Suscripción con vencimiento: un negocio vencido deja de verse en público (el dueño sigue entrando).

**Administrador**
- Aprueba o rechaza negocios y solicitudes de sello; modera reseñas; ve las solicitudes de demo que llegan desde la landing.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Interfaz | React 19, Vite 8, CSS plano por componente (tokens en `src/index.css`) |
| Mapa y rutas | Leaflet / react-leaflet, tiles CARTO Voyager, ruteo peatonal con OpenRouteService |
| QR | `jsqr` (leer con la cámara), `qrcode.react` (dibujar) |
| Iconos | `lucide-react` |
| Idiomas | `i18next` + `react-i18next` (español e inglés) |
| Backend | Supabase: PostgreSQL, Auth (correo y contraseña, Google, TOTP opcional), Storage, Row Level Security |
| App móvil | Capacitor 8 (Android), plugins SplashScreen y StatusBar |
| PWA | `vite-plugin-pwa` (Workbox) |

## Demo en vivo

| Dónde | URL | Estado |
| --- | --- | --- |
| GitHub Pages | https://rykyreyes03-commits.github.io/Whereguense/ | Activo |
| Azure (VM Ubuntu + Nginx) | http://68.221.114.205 | En preparación: Nginx y el build aún no están instalados en la VM |

Se puede navegar sin instalar nada: la landing es pública y cualquiera puede registrarse como turista.
No hay cuenta de demostración pública.

## Arquitectura

```
Navegador / app Android (React)
        │  supabase-js  (llave pública)
        ▼
Supabase ── Auth ── PostgreSQL (tablas + RLS + funciones SECURITY DEFINER) ── Storage
```

No hay servidor propio ni API REST: el frontend habla directo con Supabase y **toda la seguridad
vive en la base de datos** (ver "Modelo de seguridad"). La navegación es un único estado `pantalla`
en `src/App.jsx`, sin librería de rutas. Los datos se leen con hooks por dominio (`src/hooks`).

## Instalación y ejecución

Requisitos: Node.js 20.19 o superior (o 22.12+) y npm.

```bash
git clone https://github.com/rykyreyes03-commits/Whereguense.git
cd Whereguense
npm install
cp .env.example .env.local
# Abre .env.local y llena VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY
# (las otras dos son para el mapa y la ruta peatonal)
npm run dev                  # http://localhost:5173
```

Abre `http://localhost:5173` en el navegador. Si ves la landing, el servidor está bien; si la pantalla
queda en blanco o no deja registrarte, revisa las dos variables de Supabase y reinicia `npm run dev`
(Vite solo lee `.env.local` al arrancar).

### Ejemplo de uso: un turista escanea un QR y obtiene un sello

1. El turista se registra o entra y abre **Escanear** (la cámara pide permiso).
2. Apunta al QR que el negocio tiene en el local. `jsqr` lee el código y la app llama a
   `canjear_qr_sello(token)` en Supabase.
3. La base valida que el QR exista, que el negocio siga participando, que la actividad no haya
   terminado, que el turista no lo haya canjeado antes y que no se pase del límite de canjes.
4. Si todo está bien aparece **"¡Sello obtenido en …!"**, el sello entra al pasaporte;
   si no, se muestra el motivo (por ejemplo "Esta actividad ya terminó.").

Los sitios de la ruta se sellan de otra forma: por geolocalización, estando dentro del radio del sitio.

### Variables de entorno (`.env.local`, nunca se sube al repositorio)

| Variable | Para qué sirve |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Llave pública (publishable/anon) de Supabase |
| `VITE_CARTO_API_KEY` | Llave de CARTO para los tiles del mapa |
| `VITE_ORS_API_KEY` | Llave de OpenRouteService para calcular la ruta peatonal |

Las variables `VITE_*` se incrustan en el código que se envía al navegador: son llaves públicas.
Nunca pongas aquí la llave `service_role` de Supabase.

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila para producción en `dist/` |
| `npm run lint` | ESLint sobre todo el proyecto |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run build:pages` | Compila para GitHub Pages (base `/Whereguense/`) |
| `npm run deploy` | Publica `dist/` en la rama `gh-pages` (corre `build:pages` antes) |
| `npx cap sync android` | Copia `dist/` y los plugins al proyecto Android |

Despliegue web y Android: [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Estructura de carpetas

```
src/
  components/   # Un componente + su .css por pantalla o pieza de UI
  hooks/        # Datos por dominio (useNegocio, useSellos, useAdmin, useResenas, useAhora...)
  data/         # Catálogos estáticos (sitios de la Ruta Dariana, rutas, piezas de avatar)
  lib/          # Cliente de Supabase
  utils/        # Funciones puras (regla "lo terminado" en eventos.js, niveles, geolocalización...)
  assets/       # Imágenes e íconos
android/        # Proyecto Android generado por Capacitor
assets/         # Fuentes del ícono y el splash (capacitor-assets)
scripts/        # Utilidades de build (íconos adaptativos de Android)
docs/
  migrations/   # Esquema y reglas de la base, 001 a 041, en orden
  tests/        # Pruebas con rollback de la base y de la interfaz (ver docs/tests/README.md)
  diagramas.md  # ER, clases, casos de uso y flujos (vigente)
  diagrama-er-chen.svg   # ER en notación de Chen (entidades principales, 2FN)
  control-versiones.md, seguridad-roles.md
  documentacion/         # documentación completa y diagramas PNG
  diagrama_bd_v2.md, diagrama_bd_v3.md   # históricos
```

## Modelo de seguridad

La llave pública está en el navegador, así que cualquiera puede llamar a la API con ella. Por eso:

1. **RLS en todas las tablas.** Cada usuario lee y escribe solo lo suyo; lo público (sitios, eventos,
   negocios *visibles*) es de lectura abierta.
2. **Permisos por columna.** Las columnas sensibles (`negocio.estado`, vencimiento y nivel de
   suscripción, `qr_sello.token`, tokens de cupones) no son escribibles —ni a veces legibles— por
   `anon` ni `authenticated`. Un `REVOKE` a nivel de tabla también quita los permisos por columna,
   así que se revoca la tabla y se otorga lo mínimo columna a columna.
3. **Funciones `SECURITY DEFINER` para toda acción con reglas.** Corren con permisos del dueño de la
   función, no del llamador, así que **validan todo por dentro** (sesión, rol, dueño, vigencia) y
   fijan `set search_path`. Devuelven `{ exito, mensaje, ... }`. Ejemplos: `canjear_qr_sello`,
   `sellar_por_geolocalizacion`, `obtener_cupon`, `usar_cupon`, `guardar_resena`,
   `responder_resena`, `admin_aprobar_negocio`, `admin_aprobar_sello`.
4. **Funciones internas** (`fin_de_actividad`, `autor_visible`, `crear_actividad_qr`) solo las puede
   ejecutar `service_role`: no se pueden llamar desde la API.
5. **Roles.** `usuario.rol` es `turista`, `emprendedor`, `admin` o `auditor`. Las funciones `admin_*`
   verifican `rol = 'admin'`; un admin no puede aprobar el sello de su propio negocio.
   Detalle en [`docs/seguridad-roles.md`](docs/seguridad-roles.md).
6. **Autenticación.** Correo y contraseña o Google; el segundo factor TOTP (Supabase MFA) es opcional y
   se activa desde el Perfil.
7. **Reseñas (032).** La tabla `resena` no se lee ni se escribe directo (ni `anon` ni `authenticated`):
   se lee con `resenas_publicas` / `resumen_resenas` (que muestran el alias "Viajero" mientras el
   usuario no haya cambiado su nombre y nunca `usuario_id` ni el correo) y se escribe con
   `guardar_resena` / `responder_resena`.
8. **Candado de suscripción.** `negocio_visible()` decide si un negocio es público (activo y no vencido);
   fotos, horarios, productos, sellos y reseñas la usan.

Zona horaria: toda regla de "terminó" o "venció" usa **America/Managua (UTC-6, sin horario de verano)**,
tanto en la base (`fin_de_actividad`) como en el frontend (`src/utils/eventos.js`). Las dos
implementaciones se prueban con los mismos casos.

## Ejemplos con el cliente de Supabase

No hay API REST propia: cada operación es una llamada al cliente. Las acciones con reglas son RPC.

```js
// Leer: sellos del usuario (RLS limita a sus propias filas)
const { data } = await supabase
  .from('sello')
  .select('id, sitio_id, qr_sello_id, tipo, fecha_sello, qr_sello(nombre_actividad)')
  .eq('usuario_id', usuarioId)
  .order('fecha_sello');

// Canjear el QR de un negocio (valida token, vigencia, límite, distancia y duplicados en la base)
const { data } = await supabase.rpc('canjear_qr_sello', { p_token: token });
// → { exito: true, mensaje: '...' }  o  { exito: false, mensaje: 'Esta actividad ya terminó.' }

// Pedir un sello para una actividad: se inserta la actividad y un administrador lo aprueba.
// El QR lo crea admin_aprobar_sello; NO se inserta directo en qr_sello (esa tabla está cerrada).
await supabase.from('actividad_negocio').insert({ negocio_id, nombre, solicita_sello: true, /* ... */ });
await supabase.rpc('admin_aprobar_sello', { p_actividad_id });   // solo admin

// Reseñas: leer y escribir solo por funciones
const { data: lista } = await supabase.rpc('resenas_publicas', { p_negocio_id: 1 });
const { data: resumen } = await supabase.rpc('resumen_resenas', { p_negocio_id: 1 }); // promedio, total, uno..cinco
const { data: puede } = await supabase.rpc('puede_resenar', { p_negocio_id: 1 });     // true si tiene sello de ese negocio
await supabase.rpc('guardar_resena', { p_negocio_id: 1, p_calificacion: 5, p_comentario: 'Excelente atención.' });
```

## Android (Capacitor)

`appId com.capncode.whereguense`, `webDir: dist`. Requiere **JDK 21** (17 y 25 fallan). Resumen:
`npm run build` → `npx cap sync android` → `android\gradlew.bat -p android assembleDebug`.
Pasos completos, ícono/splash e instalación con adb en [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Pruebas

Las reglas de la base se prueban con scripts SQL que corren dentro de una transacción y terminan en
`ROLLBACK`, así que no dejan datos; la interfaz de reseñas se prueba en un navegador real contra un
Supabase simulado. Qué prueba cada archivo y cómo correrlo: [`docs/tests/README.md`](docs/tests/README.md).

## Diagramas

- [`docs/diagrama-er-chen.svg`](docs/diagrama-er-chen.svg): ER en notación de Chen de las entidades principales.
- [`docs/diagramas.md`](docs/diagramas.md): ER de las 31 tablas, clases, casos de uso y los flujos
  actividad → sello → canje, cupones, reseñas y "lo terminado desaparece".
- [`docs/control-versiones.md`](docs/control-versiones.md) y [`docs/seguridad-roles.md`](docs/seguridad-roles.md).

## Equipo

Cap'n Code — Hackathon Nicaragua 2026, Categoría Avanzado.
