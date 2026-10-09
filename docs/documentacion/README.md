# Wheregüense — Documentación

Plataforma de turismo cultural gamificado. Piloto en la **Ruta Dariana** (León, Nicaragua).
Proyecto del equipo **Cap'n Code** — Hackathon Nicaragua 2026.

> Esta carpeta describe el proyecto **tal como está hoy** (migraciones 001 a 040, Supabase en producción,
> rama `feature/supabase-backend`). Los archivos `README.md` y `DEPLOYMENT.md` de la raíz son anteriores y
> algunas partes (login por código, migraciones 001–033, Vercel) ya no reflejan el estado actual: en caso de duda,
> manda esta carpeta.

## Índice

| Archivo | Contenido |
| --- | --- |
| [README.md](README.md) | Visión general, cómo correr el proyecto, variables y deploy (este archivo) |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Diagrama, frontend, backend y flujo de datos |
| [BASE_DE_DATOS.md](BASE_DE_DATOS.md) | Tablas, relaciones, migraciones 001–040, funciones, triggers y seguridad (RLS) |
| [FUNCIONALIDADES.md](FUNCIONALIDADES.md) | Sellos, niveles y rangos, reseñas, diseño del negocio, galerías, idiomas y tema |
| [API_SUPABASE.md](API_SUPABASE.md) | Funciones RPC, políticas RLS y buckets de Storage |
| [ANDROID.md](ANDROID.md) | Cómo compilar el APK con Capacitor |
| [GUIA_USUARIO.md](GUIA_USUARIO.md) | Guías para turista, emprendedor y administrador |

## Qué es Wheregüense

Conecta a **turistas** con las experiencias culturales de León mediante un mapa interactivo, sellos
coleccionables (por geolocalización o por QR de un negocio), niveles y un avatar folclórico (Cabezón o
Gigantona). Los **emprendedores** locales tienen su propio panel para publicar su negocio, sus actividades y sus
cupones, y reciben reseñas de quienes los visitaron. Un **administrador** aprueba negocios y solicitudes de sello
y modera reseñas.

Funciona como sitio web instalable (PWA), como app Android (Capacitor) y se publica en GitHub Pages, todo con el
mismo código.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Interfaz | React 19, Vite 8, CSS plano por componente (tokens en `src/index.css` y `src/tema.css`) |
| Mapa y rutas | Leaflet / react-leaflet, teselas CARTO, ruteo peatonal con OpenRouteService |
| QR | `jsqr` (leer con la cámara) y `qrcode.react` (dibujar) |
| Idiomas | i18next + react-i18next + detector de idioma del navegador (es / en) |
| Backend | Supabase: PostgreSQL 17, Auth (correo y contraseña, Google, TOTP), Storage, Row Level Security |
| App móvil | Capacitor 8 (Android), plugins SplashScreen y StatusBar |
| PWA | `vite-plugin-pwa` (Workbox) |
| Publicación | GitHub Pages con `gh-pages`; `netlify.toml` listo para Netlify |

## Cómo correr el proyecto localmente

Requisitos: **Node.js 22** (o 20.19+) y npm.

```bash
git clone https://github.com/rykyreyes03-commits/Whereguense.git
cd Whereguense
git checkout feature/supabase-backend
npm install
cp .env.example .env.local      # y rellena los valores (ver más abajo)
npm run dev                     # http://localhost:5173
```

Otros comandos:

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compila a `dist/` (rutas relativas `./`, sirve para el navegador y para Android) |
| `npm run build:pages` | Compila para GitHub Pages (`base` = `/Whereguense/`) |
| `npm run preview` | Sirve `dist/` para probarlo |
| `npm run lint` | ESLint (debe terminar sin errores) |
| `npm run deploy` | Compila con `build:pages` y publica `dist/` en la rama `gh-pages` |

Las pruebas de la interfaz y de la base están en `docs/tests/` (ver `docs/tests/README.md`): las de la interfaz
usan Playwright con un Supabase simulado y las de la base son SQL que termina en `ROLLBACK`.

## Variables de entorno

Plantilla en `.env.example`. En local van en `.env.local` (ignorado por git). **Nunca** subas valores reales.

| Variable | Descripción |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Llave pública (publishable/anon) de Supabase |
| `VITE_CARTO_API_KEY` | Llave de CARTO para las teselas del mapa |
| `VITE_ORS_API_KEY` | Llave de OpenRouteService para la ruta peatonal |

Son llaves **públicas**: Vite las incrusta en el JavaScript que descarga el navegador. Se leen **al compilar**:
si las cambias, vuelve a compilar.

`SUPABASE_SERVICE_KEY` (en `.env.local`) **no** es una variable de la app: solo la usa el script
`scripts/subir-fotos-sitios.mjs` en la computadora de quien administra. No la pongas en ningún hosting.

## Deploy a GitHub Pages

1. En `vite.config.js`, el modo `pages` fija `base: '/Whereguense/'` (también el `start_url` y los íconos de la PWA).
   El resto de los modos usa `./`, que es lo que necesita Android.
2. Publica:

   ```bash
   npm run deploy
   ```

   `predeploy` corre `npm run build:pages` y `gh-pages -d dist -b gh-pages` sube `dist/` a la rama `gh-pages`.
   Si falla por la red (`fetch-pack`/`Connection was reset`), repite el comando: la rama solo cambia cuando
   aparece la palabra `Published`.
3. En GitHub: **Settings → Pages → Deploy from a branch → `gh-pages` / `(root)`**. El repositorio debe ser público
   (o tener un plan que permita Pages en privados).
4. Sitio publicado: `https://rykyreyes03-commits.github.io/Whereguense/`.

Tras publicar, configura Supabase (si no lo está): **Authentication → URL Configuration** con la URL del sitio en
**Site URL** y **Redirect URLs**. Sin esto, el regreso desde Google y los enlaces de confirmación del correo no
vuelven a la app. Para **Google**, además: activar el proveedor en *Authentication → Providers* con el Client ID y
Secret de Google Cloud, y añadir en Google la URL de callback de Supabase
(`https://<proyecto>.supabase.co/auth/v1/callback`).

Como es una PWA, tras una versión nueva el navegador puede mostrar la anterior hasta cerrar y reabrir la pestaña.

### Netlify (alternativa)

`netlify.toml` ya define `npm run build`, `dist` y la regla `/*` → `/index.html`. Carga las 4 variables `VITE_`
en el panel de Netlify. Incluye `SECRETS_SCAN_OMIT_KEYS` para que el escáner de secretos no cancele el
despliegue por las llaves públicas que van dentro del JavaScript.

## Estructura del repositorio

```
src/
  App.jsx            navegación por estado (no usa rutas de URL) y orquestación
  components/        pantallas y piezas de interfaz (un .jsx y un .css por componente)
  hooks/             acceso a datos (Supabase) por tema: sellos, negocio, eventos, reseñas, nivel…
  data/              catálogos estáticos: sitios, rutas, insignias, piezas del avatar
  utils/             lógica pura: rangos, diseño, fechas, idioma, pasaporte, fotos…
  lib/supabaseClient.js   cliente de Supabase (PKCE)
  locales/           es.json y en.json
  i18n.js, tema.js, tema.css
docs/
  migrations/        001 … 040 (SQL, en orden) y el rollback de la 040
  tests/             pruebas de la base (SQL) y de la interfaz (Playwright)
  documentacion/     esta documentación
android/             proyecto nativo de Capacitor
scripts/             íconos de la app, subida de fotos de sitios, limpieza de mapas
```
