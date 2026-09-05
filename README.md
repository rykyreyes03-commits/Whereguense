# Wheregüense

Plataforma web de turismo cultural gamificado, piloto en la Ruta Dariana (León, Nicaragua).
Proyecto del equipo **Cap'n Code** — Hackathon Nicaragua 2026, Categoría Avanzado.

## Descripción

Wheregüense conecta a turistas con las experiencias culturales, históricas y turísticas de
León mediante un mapa interactivo, un sistema de sellos coleccionables (por geolocalización
o por QR de negocios locales), niveles y personalización de avatar folclórico (Cabezón o
Gigantona). Los emprendedores locales tienen su propia interfaz para registrar su negocio,
aparecer en el mapa, y generar actividades de sellado por QR.

## Tecnologías usadas

**Frontend**
- React 19 + Vite
- Leaflet + Leaflet Routing Machine (mapa interactivo y ruteo peatonal)
- CartoDB Voyager (tiles del mapa)
- CSS plano por componente (sin frameworks de estilos)
- `jsqr` (lectura de códigos QR vía cámara)

**Backend**
- Supabase: PostgreSQL, Auth (OTP por correo), Storage, Row Level Security (RLS)
- 1 función RPC en base de datos (`canjear_qr_sello`) para validar y registrar canjes de QR
  con lógica que no puede resolverse de forma segura desde el cliente

**Ruteo peatonal**
- OSRM (`routing.openstreetmap.de/routed-foot`)

## Arquitectura

La navegación de toda la aplicación (excepto el detalle interno que se explica abajo) es
mediante un único estado `pantalla` (string) en `src/App.jsx`, sin librería de rutas —
cada pantalla es un componente que se renderiza condicionalmente según su valor.

No hay un backend propio (API REST): el frontend habla directo con Supabase usando su
cliente JS (`src/lib/supabaseClient.js`), con la seguridad delegada a políticas de RLS por
tabla en vez de un servidor intermedio.

## Instalación y ejecución

```bash
git clone https://github.com/rykyreyes03-commits/Whereguense.git
cd Whereguense
npm install
```

Crea un archivo `.env.local` en la raíz del proyecto con estas 3 variables:

| Variable | Descripción |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Llave pública (anon) de Supabase |
| `VITE_CARTO_API_KEY` | Llave de API para los tiles de CartoDB Voyager |

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador.

### Scripts disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compila la app para producción (carpeta `dist/`) |
| `npm run lint` | Corre ESLint sobre todo el proyecto |
| `npm run preview` | Sirve localmente el build de producción, para probarlo antes de desplegar |

## Ejemplo de uso del cliente de Supabase

Al no haber una API REST propia, cada "endpoint" es una llamada directa al cliente de
Supabase. Ejemplos reales usados en el proyecto:

```js
// Leer: sellos del usuario logueado
const { data, error } = await supabase
  .from('sello')
  .select('id, sitio_id, qr_sello_id, tipo, fecha_sello, qr_sello(nombre_actividad)')
  .eq('usuario_id', usuarioId)
  .order('fecha_sello');

// Escribir: crear una actividad de sello QR
const { data, error } = await supabase
  .from('qr_sello')
  .insert({ negocio_id, token, nombre_actividad, color, limite_canjes, fecha_expiracion })
  .select()
  .single();

// Función de base de datos (RPC): canjear un QR escaneado
const { data, error } = await supabase.rpc('canjear_qr_sello', { p_token: token });
```

## Estructura del proyecto

```
src/
  components/  # Un componente + su .css por pantalla/pieza de UI
  hooks/       # Lógica de datos por dominio (useNegocio, useSellos, useAvatarPersonalizado...)
  data/        # Catálogos estáticos (sitios de la Ruta Dariana, rutas, eventos, piezas de avatar)
  lib/         # Cliente de Supabase
  utils/       # Funciones puras (cálculo de nivel/rango, geolocalización, mapeo de personaje)
  assets/      # Imágenes e íconos
docs/
  diagramas.md # Diagrama ER (3FN), de clases, de casos de uso y de actividades
```

## Funcionalidades principales

**Turista**
- Mapa interactivo con ruteo peatonal real y modo "seguir mi ubicación"
- Pasaporte digital con sellos por geolocalización (automático, radio de 80m) y por QR de negocio
- Niveles y rangos según cantidad de sellos, con desbloqueo de piezas de avatar (aleatorio o a elección)
- Personalización de avatar (Cabezón / Gigantona), con vitrina de prendas nuevas ("Tienda", aún no
  habilitada para compra — ver Roadmap)
- Guardados (sitios, negocios), ranking, eventos
- Landing pública (antes de iniciar sesión) con página de Eventos conectada a Supabase y mapa de
  la Ruta Dariana

**Emprendedor**
- Registro de negocio con aprobación manual (bloqueado 5 días o hasta que un administrador lo
  apruebe — *ver nota de Roles y seguridad*)
- Perfil de negocio: descripción, teléfono, logo, fotos, horarios, catálogo de productos
- Actividades de sellado por QR con límite de canjes y fecha de expiración configurables
- Carrusel de bienvenida (una sola vez, tras completar el registro)

## Roles y seguridad — estado actual

Hoy la tabla `usuario` distingue el campo `rol` (`turista` por defecto), y cada negocio tiene un
`usuario_id` dueño. El acceso a los datos está protegido por políticas de RLS en cada tabla de
Supabase (cada usuario solo puede leer/escribir sus propias filas; los datos públicos como sitios,
negocios aprobados y eventos son visibles para cualquiera).

**Pendiente** (ver Roadmap): un panel de administrador real con rol `admin` para aprobar/rechazar
negocios desde la interfaz (hoy la aprobación es manual vía Supabase directamente), un tercer rol
`auditor` de solo lectura, y autenticación de 2 factores.

## Diagramas de base de datos y UML

Ver [`docs/diagramas.md`](docs/diagramas.md): diagrama Entidad-Relación (3FN), diagrama de clases,
diagrama de casos de uso, y diagrama de actividades — todos generados a partir del esquema real de
Supabase (21 tablas) y del flujo de navegación real de la aplicación.

## Roadmap / próximos entregables

- Panel de administrador (aprobación de negocios, roles admin/auditor)
- Autenticación de 2 factores
- Manejo explícito de expiración de sesión
- Habilitar compra real en la sección "Tienda" del avatar
- Traductor de voz para el emprendedor
- Despliegue en producción

## Equipo

Cap'n Code — Hackathon Nicaragua 2026, Categoría Avanzado.
