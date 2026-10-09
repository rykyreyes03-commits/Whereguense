# Funcionalidades

## 1. Sellos y pasaporte

### Cómo se obtiene un sello

| Tipo | Cómo | Reglas (todas se validan en la base) |
| --- | --- | --- |
| **Geolocalización** (`tipo = 'geolocalizacion'`) | El turista pulsa "sellar" en un sitio con el GPS activo. La app llama a `sellar_por_geolocalizacion(sitio, lat, lng)`. | Hay que estar dentro de `sitio.radio_sello_metros` (80 m por defecto; menos en el centro histórico donde los sitios están pegados). Un sello por usuario y sitio. Se necesita sesión. |
| **QR de un negocio** (`tipo = 'qr'`) | El turista escanea con la cámara el QR de una actividad (`jsqr`). La app llama a `canjear_qr_sello(token)`. | El negocio debe estar `activo` y con suscripción vigente; la actividad no puede haber terminado ni el QR haber expirado; un canje por usuario y QR; respeta el `limite_canjes`. |

Las actividades que ofrecen sello pasan por el administrador: el emprendedor solicita el sello con una
justificación y el administrador lo aprueba o lo rechaza (con motivo). Solo al aprobar nace el QR.

### Pasaporte por ciudad

La pestaña **Pasaporte** muestra una tarjeta por ciudad con su contador (por ejemplo "3 de 89 sellos"). **León**
abre sus sellos: pestañas *Todos* y *Mis sellos*, con la insignia, la fecha de obtención y el rango de cada sitio.
Las otras ciudades muestran "Próximamente". La parte superior trae el nivel, la barra de progreso y el rango del
viajero.

### Mi pasaporte (cuaderno visual)

La tarjeta **Mi pasaporte** (en la pantalla Pasaporte y en el Perfil) abre un cuaderno con anillas:

1. **Portada** azul marino con la W, "WhereGüense", "República de Nicaragua · 2026". Se abre con el primer toque.
2. **Datos del viajero** (1/2): foto circular (la real o el personaje elegido), nombre, país, número de pasaporte
   (`#` + los 6 primeros caracteres del id), fecha de nacimiento, teléfono, idioma, género, nivel actual, sellos
   obtenidos y ruta favorita (la ruta con más sellos). El lápiz abre **Editar información**.
3. **Sellos** (2/2): hasta 6 círculos con la insignia y la marca roja *SELLADO*, candado en los vacíos y "+N más".

**Editar información** reutiliza los campos del registro: nombre, país, idioma, fecha de nacimiento (opcional aquí),
teléfono, género y foto. Guarda en `usuario`; el idioma elegido se aplica al instante.

### Registro del turista (cuaderno)

Tras iniciar sesión por primera vez y elegir **Turista**: portada → elegir compañero (Cabezón o Gigantona) →
datos (obligatorios: usuario, país, idioma, fecha de nacimiento; opcionales: teléfono, género, foto) → "Bienvenido".
El personaje se guarda al final junto con `onboarding_completado`.

## 2. Niveles y rangos

### Rango de cada sitio (cobre / plata / oro)

Cada sitio tiene un `rango` (tipo `rango_sello`) que decide cuántos **puntos** vale su sello:

| Rango | Puntos | Qué sitios (60 en la base) |
| --- | --- | --- |
| **Cobre** | 1 | Todos los demás (46) |
| **Plata** | 0.5 | Museos y centros culturales, universidad y fortaleza (7) |
| **Oro** | 2 | Ruta Dariana, Catedral y Ruinas de León Viejo (7) |

Los sellos por **QR de negocio** valen como cobre (1 punto). Cambiar el rango de un sitio es un `UPDATE` de
`sitio.rango` con la service key.

### Nivel del usuario

`calcular_nivel(usuario)` suma los puntos de sus sellos. Para subir del nivel **N** al **N+1** hacen falta **2·N**
puntos; los puntos acumulados para llegar al nivel N son `N·(N−1)`:

| Nivel | 1 | 2 | 3 | 4 | 5 | 6 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Puntos acumulados | 0 | 2 | 6 | 12 | 20 | 30 | 90 |

La interfaz muestra el nivel, los puntos dentro del nivel, lo que falta para subir y un porcentaje
(`NivelProgreso`).

### Rango del viajero

Aparte del nivel, el encabezado del pasaporte muestra un título según la **cantidad** de sellos: *Principiante*
(menos de 5), *Explorador* (5 o más) y *Maestro Güegüense* (8 o más).

### Recompensas por nivel (avatar)

- Cada 5 niveles (5, 10, 15…) aparece "¡Subiste a nivel N! Elige tu accesorio nuevo" con **3 piezas al azar** del
  avatar (sombrero, traje o rostro para el Cabezón; rostro o vestido para la Gigantona). La elegida se guarda en
  `pieza_desbloqueada` y se puede equipar en **Avatar / Personalización**.
- `accesorio_avatar` define 4 accesorios por nivel (Sombrero de Palma 5, Bufanda Dariana 10, Máscara del Güegüense
  20, Corona de Maestro 30), que hoy solo se ven como lista en la Tienda (con candado según el nivel).

## 3. Reseñas

### De negocios

- Solo puede reseñar quien **tiene un sello de ese negocio** y no es el dueño (`puede_resenar`).
- Una reseña por usuario y negocio (guardar de nuevo la edita): calificación de 1 a 5 y comentario **obligatorio de
  10 a 2000** caracteres.
- Se muestran con el alias **"Viajero"** (si el usuario no personalizó su nombre o su nombre tiene `@`); nunca el
  correo ni el id.
- El dueño responde con `responder_resena` (se muestra como "Respuesta del negocio"). El administrador puede borrar
  cualquiera (`admin_borrar_resena`).
- El panel del emprendedor muestra el promedio, el desglose por estrellas y la lista.
- Las reseñas son del negocio: siguen visibles aunque la actividad que dio el sello ya haya terminado.

### De sitios turísticos

- **No** piden sello: basta tener sesión. Calificación de 1 a 5 y texto de 10 a 1000 caracteres, una por persona y sitio.
- Lectura con `resenas_sitio_publicas` (alias "Viajero") y resumen con `resumen_resenas_sitio`; el autor puede
  eliminar la suya (`eliminar_mi_resena_sitio`) y el administrador cualquiera (`admin_borrar_resena_sitio`).
- Se ven en la ficha del sitio (promedio, "N reseñas" y botón "Escribir reseña").

## 4. Diseño del negocio

La pestaña **Diseño** del panel del emprendedor personaliza la ficha pública del negocio, con **vista previa en vivo**.
Se guarda en `negocio.config_diseno` (JSON con esquema cerrado, validado por la base con `config_diseno_valido`):

| Opción | Valores |
| --- | --- |
| Paleta | `azul_marino`, `terracota`, `azul`, `verde`, `rojo`, `dorado`, `teal`, `magenta` |
| Letra | `clasica` (Bitter/Nunito), `elegante` (Playfair Display/Lora), `moderna` (Poppins) |
| Portada y logo | imágenes en el bucket `negocios`, solo en la carpeta del propio dueño |
| Descripción | hasta 300 caracteres |
| WhatsApp | solo dígitos, de 8 a 15 |
| Secciones visibles y su orden | `horarios`, `productos`, `fotos`, `actividades`, `resenas`, `ubicacion` |
| Distribución de productos | `cuadricula` o `lista` |

Hay **un solo plan** (`profesional`): ya no se limita nada por plan. El encabezado del panel permite
"Ver como te ven los turistas".

## 5. Galerías de fotos

- **Negocio** (`negocio_foto`): hasta **10** fotos, tipos exterior / interior / producto, JPG/PNG/WebP de hasta 10 MB.
  Se pueden **reordenar** (`ordenar_fotos_negocio`) y borrar. Rutas `negocios/<usuario_id>/fotos/…`.
- **Sitios turísticos** (`sitio_foto`): galería con una **portada** por sitio, carrusel con flechas y **lightbox**
  (ampliar, deslizar, cerrar con Escape). Las fotos las sube solo el administrador con
  `scripts/subir-fotos-sitios.mjs` y la `service_role`; los usuarios solo leen.
- **Foto de perfil:** el usuario la elige en el registro o al editar; se reduce a 256 px (JPEG) y se guarda en
  `perfiles/<uid>/perfil.jpg` (máx. 2 MB), con la URL en `usuario.foto_perfil_url`. También queda en el dispositivo.

## 6. Eventos, actividades, cupones y favoritos

- **Eventos:** agenda con filtros (Hoy, Esta semana, categorías) y buscador. Mezcla eventos cargados a mano
  (`evento`) con las actividades públicas de los negocios (`actividades_negocio_publicas`). **Lo terminado
  desaparece solo** (regla única `fin_de_actividad`: fecha y hora de fin en hora de Managua).
- **Actividades del negocio:** nombre, descripción (≥ 20), foto, categoría, lugar, fechas y horas, eslogan, detalles,
  etiquetas, y opcionalmente sello. Se pueden editar y eliminar.
- **Cupones:** el emprendedor crea cupones con descuento %, vencimiento y límite. El turista los obtiene escaneando
  el QR del cupón y los usa escaneando el **QR de canje** del negocio.
- **Guardados:** rutas, sitios, ubicaciones, negocios y eventos favoritos; los vencidos se conservan como "Ya terminó".
- **Mapa:** sitios y negocios con pines por tipo (círculo con ícono de tienda para negocios), búsqueda, ruta
  peatonal hacia un sitio y seguimiento de la ubicación.
- **Ranking** de viajeros y **landing pública** (sin sesión) con eventos y rutas.

## 7. Internacionalización (es / en)

- `i18next` con `src/locales/es.json` y `en.json`. Español por defecto; se detecta el idioma guardado en el
  dispositivo y, si no hay, el del navegador (`en-*` → inglés, cualquier otro → español).
- El idioma se cambia desde **Configuración → Cambiar idioma** y desde Editar información; con sesión se guarda en
  `usuario.idioma_preferido`.
- Las fechas y los nombres de categorías que se dibujan fuera de React usan `src/utils/idioma.js`, y el atributo
  `lang` de `<html>` sigue al idioma.
- **Pendiente:** los formularios del registro del turista, el login y el registro de negocio todavía tienen sus
  textos fijos en español.

## 8. Modo oscuro / claro

- **Configuración → Tema** (Claro / Oscuro). Se guarda en `localStorage` (`tema`); sin preferencia, la app es clara.
- El modo oscuro es la clase `dark` en `<html>`; los colores salen de variables en `src/tema.css`. Un script en
  `index.html` la aplica antes de dibujar para evitar el parpadeo.
- El cuaderno del registro y del pasaporte tienen su propio aspecto (objeto físico) y se ven igual en ambos temas.
