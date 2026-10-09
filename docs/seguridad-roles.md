# Seguridad y roles

La llave pública de Supabase viaja en el navegador, así que **la seguridad vive en la base de datos**, no
en el frontend: lo que la interfaz oculta, la base lo vuelve a comprobar.

## Roles

El rol está en la columna `usuario.rol`, con una restricción `CHECK`: `turista`, `emprendedor`, `admin` o
`auditor`. (No existe una columna `is_admin`: ser administrador es tener `rol = 'admin'`.)

| Rol | Qué puede hacer |
| --- | --- |
| **Admin** (`rol = 'admin'`) | Aprueba o rechaza negocios y solicitudes de sello, modera (borra) reseñas, renueva suscripciones y ve y marca las solicitudes de demo. No puede aprobar el sello de su propio negocio. |
| **Emprendedor** | Registra su negocio (queda pendiente hasta que un admin lo aprueba), lo gestiona (logo, fotos, horarios, productos), crea actividades y cupones y responde las reseñas que recibe. Solo ve y edita lo que es suyo. |
| **Turista** | Explora los sitios y rutas, escanea QR, acumula sellos, obtiene y usa cupones y escribe reseñas de los negocios donde tiene un sello. |
| **Auditor** | Rol de solo lectura previsto en la base. |

El emprendedor no se elige al registrarse: se es emprendedor al ser dueño de un `negocio` (`negocio.usuario_id`)
aprobado. Las funciones `admin_*` comprueban `rol = 'admin'` por dentro, así que llamarlas con la llave pública no sirve de nada.

## Buenas prácticas aplicadas

- **RLS en todas las tablas.** Las 31 tablas de `public` tienen Row Level Security activo (verificado
  en la base): cada usuario lee y escribe solo lo suyo; lo público es de lectura abierta.
- **Permisos por columna.** Las columnas sensibles (estado y suscripción del negocio, `qr_sello.token`,
  tokens de cupones) no se pueden escribir —ni a veces leer— desde la API.
- **Funciones `SECURITY DEFINER` para operaciones críticas** (`canjear_qr_sello`, `sellar_por_geolocalizacion`,
  `obtener_cupon`, `usar_cupon`, `guardar_resena`, `admin_aprobar_negocio`, `crear_solicitud_demo`...).
  Validan sesión, rol y dueño por dentro y fijan `search_path`. Las internas solo las ejecuta `service_role`.
- **Variables de entorno.** Las llaves salen de `.env.local` (`VITE_*`); en el código no hay credenciales.
  La llave `service_role` nunca se usa en el frontend.
- **`.gitignore` protege `.env.local`** (ignora `.env` y `.env.*`, excepto la plantilla `.env.example`, que no tiene valores).
- **Validación doble: frontend y backend.** El formulario valida antes de enviar, y la base valida otra vez
  (restricciones `CHECK` de largo y formato, y las funciones). Un cliente alterado no se salta las reglas.
- **Límite de envíos en solicitudes de demo.** `crear_solicitud_demo` rechaza el mismo correo repetido dentro
  de 5 minutos y frena a 30 solicitudes en 10 minutos. La tabla no admite `INSERT` directo desde la API y solo el admin puede leerla.
- **QR con control de uso.**
  - *Expiración:* el QR de una actividad deja de canjearse al pasar su `fecha_expiracion` o cuando la actividad
    termina (hora de Managua), y si el negocio pierde su suscripción.
  - *Uso único:* un turista solo puede canjear un QR una vez (restricción única en `sello`), y cada QR puede tener un límite total de canjes.
  - *GPS:* los sellos de los sitios exigen estar dentro del radio del sitio (`radio_sello_metros`, 80 m por defecto),
    que valida `sellar_por_geolocalizacion` en la base. El canje del QR de un negocio no usa GPS.
- **Autenticación.** Correo y contraseña o Google, con segundo factor TOTP opcional desde el Perfil.

Las pruebas de estas reglas están en `docs/tests/` (SQL con rollback, por ejemplo `041_solicitud_demo.sql`).
