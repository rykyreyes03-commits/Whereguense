# API de Supabase

El cliente usa la llave pública (`VITE_SUPABASE_PUBLISHABLE_KEY`). Lo que cada persona puede hacer lo decide la
base: permisos de `EXECUTE` de cada función, RLS y permisos por columna. Las funciones devuelven `jsonb` con la
forma `{ exito: boolean, mensaje: text, … }` salvo donde se indica otra cosa.

Quién puede llamarlas: **anon** = cualquiera, sin sesión · **sesión** = usuario autenticado · **dueño** = dueño del
negocio (la función lo comprueba por dentro) · **admin** = la cuenta con `rol = 'admin'`.

Ejemplo de llamada:

```js
const { data, error } = await supabase.rpc('sellar_por_geolocalizacion', {
  p_sitio_id: 1, p_lat: 12.4350, p_lng: -86.8781,
});
// data → { exito: true, mensaje: '¡Sello obtenido en Catedral de León!', sello_id: 42 }
```

## 1. Funciones RPC

### Sellos y niveles

| Función | Quién | Parámetros | Devuelve |
| --- | --- | --- | --- |
| `sellar_por_geolocalizacion` | sesión | `p_sitio_id int, p_lat float, p_lng float` | `{exito, mensaje, sello_id}`. Valida coordenadas, que el sitio exista, la distancia (`radio_sello_metros`) y que no esté sellado ya. |
| `canjear_qr_sello` | sesión | `p_token text` | `{exito, mensaje, sello_id}`. Valida QR, negocio vigente, vencimiento, actividad no terminada, no repetido y límite de canjes. |
| `calcular_nivel` | sesión (uno mismo o admin) | `p_usuario_id uuid` | tabla `{nivel_actual, puntos_actuales, puntos_para_siguiente, porcentaje, puntos_totales}` |
| `accesorios_desbloqueados` | sesión (uno mismo o admin) | `p_usuario_id uuid` | tabla `{id, nombre, imagen_url, nivel_requerido}` |
| `valor_sello` | anon | `p_rango rango_sello` | `numeric` (1 / 0.5 / 2) |
| `distancia_metros` | sesión | `lat1, lng1, lat2, lng2` | `float` (haversine) |

### Eventos y actividades

| Función | Quién | Parámetros | Devuelve |
| --- | --- | --- | --- |
| `actividades_negocio_publicas` | anon | — | tabla de actividades **vigentes** de negocios visibles (sin justificación ni motivo de rechazo) |
| `mis_actividades_qr` | dueño | `p_negocio_id int` | `{exito, actividades:[…con token del QR…]}` |
| `sellos_entregados_por_actividad` | dueño | `p_negocio_id int` | tabla `{actividad_id, entregados}` |
| `crear_evento_desde_actividad` | dueño | `p_actividad_id bigint` | `jsonb` (idempotente: publica la actividad en Eventos) |
| `eliminar_actividad` | dueño | `p_id bigint` | `jsonb` (con la ruta de la foto para borrarla de Storage) |
| `crear_actividad_qr` | solo `service_role` | `p_negocio_id, p_nombre_actividad, p_color, p_limite_canjes, p_fecha_expiracion` | `jsonb`. Los QR de sello nuevos nacen solo por actividad + aprobación. |

### Cupones

| Función | Quién | Parámetros | Devuelve |
| --- | --- | --- | --- |
| `obtener_cupon` | sesión | `p_token text` | `{exito, cupon_obtenido_id, cupon{…}}` (límite, vencimiento, negocio vigente, uno por usuario) |
| `iniciar_canje_cupon` | sesión | `p_token_negocio text` | `{exito, negocio_id, nombre_negocio}` (valida el QR de canje) |
| `usar_cupon` | sesión | `p_cupon_obtenido_id bigint, p_token_negocio text` | `{exito, descripcion, descuento_porcentaje, nombre_negocio}` |
| `mis_cupones_obtenidos` | sesión | — | `jsonb` con los cupones del turista |
| `mis_cupones_negocio` / `mis_cupones_otorgados` | dueño | `p_negocio_id int` | `jsonb` con los cupones del negocio / los que ya se otorgaron |
| `eliminar_cupon` | dueño | `p_id bigint` | `jsonb` |
| `contar_obtenidos_cupon` | sesión | `p_cupon_id bigint` | `bigint` |

### Reseñas

| Función | Quién | Parámetros | Devuelve |
| --- | --- | --- | --- |
| `resenas_publicas` | anon | `p_negocio_id int` | tabla `{id, autor, calificacion, comentario, fecha, respuesta, fecha_respuesta, es_mia}` |
| `resumen_resenas` | anon | `p_negocio_id int` | tabla `{promedio, total, uno … cinco}` |
| `puede_resenar` | sesión | `p_negocio_id int` | `boolean` |
| `guardar_resena` | sesión | `p_negocio_id, p_calificacion, p_comentario` | `jsonb` (crea o edita; requiere sello del negocio) |
| `responder_resena` | dueño | `p_resena_id bigint, p_respuesta text` | `jsonb` |
| `resenas_sitio_publicas` | anon | `p_sitio_id int` | tabla `{id uuid, autor, estrellas, texto, fecha, es_mia}` |
| `resumen_resenas_sitio` | anon | `p_sitio_id int` | tabla `{promedio, total, uno … cinco}` |
| `guardar_resena_sitio` | sesión | `p_sitio_id, p_estrellas, p_texto` | `{exito, mensaje, editada}` |
| `eliminar_mi_resena_sitio` | sesión | `p_sitio_id int` | `jsonb` |

### Fotos

| Función | Quién | Parámetros | Devuelve |
| --- | --- | --- | --- |
| `ordenar_fotos_negocio` | dueño | `p_negocio_id int, p_ids int[]` | `jsonb` (reordena todo de una vez; corre con los permisos de quien llama) |

### Administración (solo `admin`)

| Función | Parámetros | Qué hace |
| --- | --- | --- |
| `admin_aprobar_negocio` | `p_negocio_id` | Pasa a `activo` y fija la suscripción a 6 meses |
| `admin_rechazar_negocio` | `p_negocio_id, p_motivo` | Pasa a `rechazado` con motivo |
| `admin_renovar_suscripcion` | `p_negocio_id, p_meses = 6, p_nivel` | Suma meses al vencimiento (`GREATEST(now(), vencimiento) + meses`) |
| `admin_aprobar_sello` | `p_actividad_id` | Crea el QR de la actividad; no aprueba actividades terminadas ni las de su propio negocio |
| `admin_rechazar_sello` | `p_actividad_id, p_motivo` | Rechaza una solicitud pendiente |
| `admin_resenas` / `admin_borrar_resena` | — / `p_resena_id` | Lista y borra reseñas de negocios |
| `admin_resenas_sitio` / `admin_borrar_resena_sitio` | — / `p_id uuid` | Lista y borra reseñas de sitios |

### Internas (sin `EXECUTE` para la API)

`autor_visible`, `fin_de_actividad`, `nivel_por_puntos`, `negocio_visible` y `es_duenio_negocio` (estas dos
sí las usan las políticas), `config_diseno_valido`, `etiquetas_validas` y las funciones de los triggers.

## 2. Políticas RLS (`public`)

| Tabla | Política | Operación | Quién |
| --- | --- | --- | --- |
| `usuario` | `usuario_all_owner` | todo | `authenticated`, solo su fila |
| `negocio` | `negocio_select_activo_o_duenio` | SELECT | anon + authenticated: negocio `activo` y vigente, o el dueño |
| `negocio` | `negocio_select_admin` / `negocio_select_auditor` | SELECT | admin / auditor |
| `negocio` | `negocio_insert_duenio`, `negocio_update_duenio`, `negocio_delete_duenio` | INSERT/UPDATE/DELETE | el dueño, y solo por columnas permitidas |
| `negocio_foto`, `negocio_horario`, `producto` | `*_select_visible` | SELECT | anon + authenticated si `negocio_visible` |
| `negocio_foto`, `negocio_horario`, `producto` | `*_all_owner` | todo | el dueño |
| `qr_sello` | `qr_sello_select_visible` / `qr_sello_all_owner` | SELECT / todo | público si visible (sin `token`) / dueño |
| `actividad_negocio` | `…_select_duenio`, `…_select_admin`, `…_insert_duenio`, `…_update_duenio` | SELECT/INSERT/UPDATE | dueño o admin (la lectura pública es por función) |
| `cupon` | `cupon_select_duenio`, `cupon_select_admin`, `cupon_insert_duenio`, `cupon_update_duenio` | SELECT/INSERT/UPDATE | dueño o admin |
| `cupon_obtenido` | `cupon_obtenido_select_propio` | SELECT | `authenticated`, solo los suyos |
| `resena` | `resena_select_visible`, `resena_insert_con_sello`, `resena_update_autor`, `resena_update_duenio` | varias | pero el acceso directo está **revocado**: se usa solo por funciones |
| `sello` | `sello_select_owner` | SELECT | solo los sellos propios (no hay INSERT directo) |
| `guardado`, `ruta_guardada`, `pieza_desbloqueada`, `avatar_equipado`, `usuario_hito`, `hito_candidato` | `*_all_owner` | todo | `authenticated`, solo lo propio |
| `sitio`, `insignia`, `ruta`, `ruta_sitio`, `evento`, `sitio_foto`, `nivel`, `rango`, `categoria_avatar`, `pieza_avatar` | `*_select_public` | SELECT | anon + authenticated |
| `accesorio_avatar` | `accesorio_avatar_hasta_mi_nivel` | SELECT | `authenticated`, los de su nivel o menor |
| `resena_sitio`, `negocio_token_canje` | — | — | sin políticas: cerradas a la API |

Además de las políticas, los **permisos por columna** impiden que el dueño toque `estado`, suscripción o plan, y
los **triggers** validan formato y límites (ver [BASE_DE_DATOS.md](BASE_DE_DATOS.md)).

## 3. Buckets de Storage

| Bucket | Público | Tamaño máx. | Tipos | Quién escribe | Ruta |
| --- | --- | --- | --- | --- | --- |
| `negocios` | sí (lectura) | 10 MB | jpeg, png, webp | `authenticated`, solo en su carpeta `<uid>/` | `<uid>/logo…`, `<uid>/portada…`, `<uid>/fotos/<negocio>_<marca>.<ext>`, `<uid>/actividades/…` |
| `sitios` | sí (lectura) | 10 MB | jpeg, png, webp | solo `service_role` (script) | `<sitio_id>/galeria/<archivo>` |
| `perfiles` | sí (lectura) | 2 MB | jpeg, png, webp | `authenticated`, solo en `<uid>/` | `<uid>/perfil.jpg` |

Políticas en `storage.objects`: `negocios_select_publico`, `negocios_insert_propio`, `negocios_update_propio`,
`negocios_delete_propio` y las cuatro equivalentes `perfiles_*`. El bucket `sitios` no tiene políticas de escritura.
Las URL públicas guardadas en las tablas se validan con CHECK y triggers (bucket y carpeta correctos).

## 4. Auth

- Proveedores: correo + contraseña y Google. Flujo **PKCE**; la sesión se recupera de la URL
  (`detectSessionInUrl`).
- **TOTP obligatorio** en el cliente: `mfa.enroll` / `mfa.challenge` / `mfa.verify`.
- `emailRedirectTo` y `redirectTo` apuntan a la página actual (`origin + pathname`); esas URL deben estar en
  *Authentication → URL Configuration → Redirect URLs*.
