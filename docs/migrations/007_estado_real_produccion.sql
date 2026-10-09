-- =============================================================================
-- Wheregüense — Migración 007: cierre de deuda técnica (estado REAL de producción)
-- =============================================================================
-- Depende de: 001_schema_inicial.sql .. 006_storage_negocios.sql aplicadas.
-- Motor: PostgreSQL 15 (Supabase). Proyecto: spybqychnydgvidwjrlh.
--
-- CONTEXTO
-- --------
-- Auditoría del 2026-09-14 detectó que producción tiene objetos que NUNCA se
-- versionaron como migración: se crearon a mano desde el SQL Editor del
-- dashboard de Supabase en algún momento entre 006 (2025-09-03) y hoy. El
-- repositorio local (rama feature/supabase-backend, 35 commits por delante de
-- main, aún sin fusionar) NO tiene ningún archivo que los declare.
--
-- Esta migración NO CAMBIA COMPORTAMIENTO. Es un volcado fiel de lo que ya
-- existe en producción, convertido a DDL idempotente, para que a partir de
-- aquí el historial de migraciones (001-007) sea la fuente de verdad real.
-- El hallazgo #2 de la auditoría (sello por geolocalización sin validación
-- server-side de distancia) NO se corrige aquí — se documenta como riesgo
-- pendiente al final del archivo. La corrección va en una migración 008
-- aparte, ya que sí cambia comportamiento.
--
-- Evidencia obtenida vía Management API de Supabase (POST
-- /v1/projects/{ref}/database/query) usando un personal access token de solo
-- lectura de esquema (no la service_role key; esa nunca se usó ni se pegó en
-- ningún archivo). Fecha de la captura: 2026-09-14.
-- =============================================================================


-- =============================================================================
-- EVIDENCIA CRUDA (comentarios — no ejecuta nada)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 2a. select routine_name, security_type from information_schema.routines
--     where routine_schema = 'public';
-- -----------------------------------------------------------------------------
--  routine_name           | security_type
-- -------------------------+---------------
--  admin_aprobar_negocio  | DEFINER    <- NO estaba en 001-006
--  admin_rechazar_negocio | DEFINER    <- NO estaba en 001-006
--  canjear_qr_sello       | DEFINER    <- NO estaba en 001-006 (qr_sello_id
--                                         quedó reservado sin conectar en 001)
--  es_duenio_negocio      | DEFINER    <- SÍ está en 002 (sin cambios)
--  negocio_visible        | DEFINER    <- SÍ está en 002 (sin cambios)
--
-- Total: 5 funciones en public. Ninguna función adicional a las 3 nuevas.
-- Ninguna función relacionada a distancia/geolocalización (ver 2f).

-- -----------------------------------------------------------------------------
-- 2b. pg_get_functiondef(oid) de las 5 funciones — ver DDL reproducido más
--     abajo (CREATE OR REPLACE FUNCTION ...), que es copia exacta del código
--     fuente devuelto por producción. es_duenio_negocio y negocio_visible se
--     omiten aquí (ya versionadas en 002, bit por bit idénticas a producción).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 2c. select * from pg_policies where tablename in ('sello','negocio','qr_sello');
-- -----------------------------------------------------------------------------
--  tablename | policyname                     | cmd    | roles
-- -----------+---------------------------------+--------+----------------------
--  negocio   | negocio_delete_duenio          | DELETE | {authenticated}        (= 002)
--  negocio   | negocio_insert_duenio          | INSERT | {authenticated}        (= 002)
--  negocio   | negocio_select_activo_o_duenio | SELECT | {anon,authenticated}   (= 002)
--  negocio   | negocio_select_admin           | SELECT | {public}               <- NUEVA, no está en 002
--  negocio   | negocio_select_auditor         | SELECT | {public}               <- NUEVA, no está en 002
--  negocio   | negocio_update_duenio          | UPDATE | {authenticated}        (= 002; el freno real
--                                                                                   está en los GRANT/REVOKE
--                                                                                   por columna, ver 2d)
--  qr_sello  | qr_sello_all_owner             | ALL    | {authenticated}        (= 002)
--  qr_sello  | qr_sello_select_visible        | SELECT | {anon,authenticated}   (= 002)
--  sello     | sello_all_owner                | ALL    | {authenticated}        (= 002, SIN CAMBIOS)
--
-- sello NO tiene ninguna política nueva ni distinta de 002: sigue siendo
-- "for all to authenticated using/with check (auth.uid() = usuario_id)".
-- No hay política ni función que valide distancia (confirma 2f).
--
-- Barrido adicional (no pedido explícitamente, hecho para descartar sorpresas
-- fuera de las 3 tablas mencionadas): pg_tables y pg_policies de TODO el
-- schema public devuelven exactamente las 21 tablas de 001 + `guardado` (005).
-- Cero tablas nuevas, cero triggers en ninguna tabla de public.

-- -----------------------------------------------------------------------------
-- 2d. select column_name, privilege_type from information_schema.column_privileges
--     where table_name = 'negocio' and grantee = 'authenticated';
-- -----------------------------------------------------------------------------
-- INSERT y SELECT: las 17 columnas de negocio (sin restricción, igual que el
-- grant de tabla completa que deja Supabase por defecto).
--
-- UPDATE: SOLO estas 9 columnas tienen grant para authenticated:
--   categoria, cedula_ruc, descripcion, latitud, logo_url, longitud,
--   nombre_negocio, responsable, telefono
--
-- Es decir, a authenticated se le revocó UPDATE de:
--   id, usuario_id, estado, motivo_rechazo, fecha_envio, fecha_aprobacion,
--   fecha_vencimiento_suscripcion, suscripcion_activa
--
-- Esto es justo el "cierre de hueco de auto-aprobación" del commit 7026957:
-- como negocio_update_duenio (política RLS, 2c) sigue permitiendo al dueño
-- hacer UPDATE de su fila, sin este REVOKE el dueño podría hacer
-- `update negocio set estado = 'activo' where id = mio` desde el cliente y
-- auto-aprobarse. El commit local solo cambia el frontend (deja de mostrar
-- ese control); el candado real vive en este GRANT/REVOKE que nunca se
-- versionó.

-- -----------------------------------------------------------------------------
-- 2e. select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'usuario'::regclass;
-- -----------------------------------------------------------------------------
--  usuario_rol_check: CHECK ((rol = ANY (ARRAY['turista','emprendedor','admin','auditor'])))
--
-- 001_schema_inicial.sql define el mismo constraint SIN 'auditor':
--   check (rol in ('turista', 'emprendedor', 'admin'))
-- => el rol 'auditor' se agregó a mano en producción, nunca se migró.
-- Dato adicional: hoy NINGÚN usuario tiene rol = 'auditor' (select rol,
-- count(*) from usuario group by rol -> admin: 1, turista: 6). El rol existe
-- en el constraint y tiene una política de lectura (negocio_select_auditor)
-- pero no se usa todavía. Tampoco hay usuarios con rol = 'emprendedor' pese a
-- existir negocios — no es objeto de esta auditoría, se deja anotado.

-- -----------------------------------------------------------------------------
-- 2f. ¿Existe trigger o función que valide distancia/geolocalización antes de
--     insertar en `sello`?
-- -----------------------------------------------------------------------------
-- select tgname from pg_trigger where tgrelid = 'sello'::regclass
--   and not tgisinternal;                              -> 0 filas
-- select proname from pg_proc ... where prosrc ilike '%distanc%'
--   or prosrc ilike '%geo%' or prosrc ilike '%st_dist%' -> 0 filas
--
-- CONFIRMADO: no existe ningún trigger en `sello` ni ninguna función en
-- ningún schema no catálogo que mencione distancia o geolocalización. El
-- INSERT en `sello` (tipo = 'geolocalizacion') se protege únicamente con:
--   - RLS: auth.uid() = usuario_id (cualquiera puede insertar sellos propios)
--   - UNIQUE (usuario_id, sitio_id) (no repetir el mismo sitio)
--   - CHECK sello_origen_valido (coherencia tipo/sitio_id/qr_sello_id)
-- Ninguna de las tres impide que un usuario autenticado, sin moverse de su
-- casa, inserte `sello` para cualquier sitio_id con
-- `supabase.from('sello').insert(...)` directo (src/hooks/useSellos.js,
-- función sellar()) simplemente conociendo el id del sitio. Este es el
-- hallazgo #2 de la auditoría. Ver nota de riesgo al final de este archivo.


-- =============================================================================
-- DDL REPRODUCIBLE — aplicado sobre 001-006 limpias, reproduce el estado real
-- =============================================================================
-- No agrega comportamiento nuevo respecto a lo que YA corre en producción.
-- Idempotente: CREATE OR REPLACE FUNCTION, DROP POLICY IF EXISTS + CREATE
-- POLICY, DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT, REVOKE antes de GRANT.

begin;

-- -----------------------------------------------------------------------------
-- 1. Rol 'auditor'
-- -----------------------------------------------------------------------------
alter table public.usuario
    drop constraint if exists usuario_rol_check;

alter table public.usuario
    add constraint usuario_rol_check
    check (rol = any (array['turista'::text, 'emprendedor'::text, 'admin'::text, 'auditor'::text]));

comment on constraint usuario_rol_check on public.usuario is
    'Incluye ''auditor'' desde 007 (agregado a mano en producción antes de esta migración; hoy sin usuarios asignados).';


-- -----------------------------------------------------------------------------
-- 2. Funciones RPC de administración de negocios y canje de QR
-- -----------------------------------------------------------------------------

create or replace function public.admin_aprobar_negocio(p_negocio_id integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_rol text;
BEGIN
  SELECT rol INTO v_rol FROM usuario WHERE id = auth.uid();
  IF v_rol IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso de administrador.');
  END IF;

  UPDATE negocio
  SET estado = 'activo',
      motivo_rechazo = NULL,
      fecha_aprobacion = now(),
      fecha_vencimiento_suscripcion = now() + interval '1 year',
      suscripcion_activa = true
  WHERE id = p_negocio_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Negocio no encontrado.');
  END IF;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Negocio aprobado.');
END;
$function$;

comment on function public.admin_aprobar_negocio(integer) is
    'Aprueba un negocio pendiente (estado=activo, activa suscripcion 1 anio). Solo rol=admin. Recuperada de produccion en 007; no versionada previamente.';

create or replace function public.admin_rechazar_negocio(p_negocio_id integer, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_rol text;
BEGIN
  SELECT rol INTO v_rol FROM usuario WHERE id = auth.uid();
  IF v_rol IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso de administrador.');
  END IF;

  UPDATE negocio
  SET estado = 'rechazado',
      motivo_rechazo = COALESCE(p_motivo, 'No especificado')
  WHERE id = p_negocio_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Negocio no encontrado.');
  END IF;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Negocio rechazado.');
END;
$function$;

comment on function public.admin_rechazar_negocio(integer, text) is
    'Rechaza un negocio pendiente con motivo. Solo rol=admin. Recuperada de produccion en 007; no versionada previamente.';

create or replace function public.canjear_qr_sello(p_token text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_qr RECORD;
  v_usuario_id uuid := auth.uid();
  v_ya_canjeado boolean;
  v_total_canjes integer;
  v_nuevo_id bigint;
BEGIN
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Necesitas iniciar sesión.');
  END IF;

  SELECT id, negocio_id, nombre_actividad, limite_canjes, fecha_expiracion
  INTO v_qr
  FROM qr_sello
  WHERE token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Código QR no válido.');
  END IF;

  IF v_qr.fecha_expiracion IS NOT NULL AND v_qr.fecha_expiracion < CURRENT_DATE THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad ya expiró.');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM sello WHERE usuario_id = v_usuario_id AND qr_sello_id = v_qr.id
  ) INTO v_ya_canjeado;

  IF v_ya_canjeado THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Ya canjeaste el sello de ' || v_qr.nombre_actividad || '.');
  END IF;

  IF v_qr.limite_canjes IS NOT NULL THEN
    SELECT count(*) INTO v_total_canjes FROM sello WHERE qr_sello_id = v_qr.id;
    IF v_total_canjes >= v_qr.limite_canjes THEN
      RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad ya alcanzó su límite de canjes.');
    END IF;
  END IF;

  INSERT INTO sello (usuario_id, qr_sello_id, tipo)
  VALUES (v_usuario_id, v_qr.id, 'qr')
  RETURNING id INTO v_nuevo_id;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', '¡Sello obtenido en ' || v_qr.nombre_actividad || '!',
    'sello_id', v_nuevo_id
  );
END;
$function$;

comment on function public.canjear_qr_sello(text) is
    'Canjea un QR de negocio por un sello tipo=qr (valida expiracion, duplicado y limite de canjes). Recuperada de produccion en 007; no versionada previamente. NO valida distancia/geolocalizacion (no aplica: el sello QR no es por geolocalizacion).';

-- Grants reales tal como están en producción (anon incluido: las funciones se
-- auto-protegen internamente con auth.uid() IS NULL / chequeo de rol, no
-- dependen de que el rol de conexión sea authenticated).
grant execute on function public.admin_aprobar_negocio(integer)      to anon, authenticated, service_role;
grant execute on function public.admin_rechazar_negocio(integer, text) to anon, authenticated, service_role;
grant execute on function public.canjear_qr_sello(text)              to anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- 3. Políticas RLS de lectura de `negocio` para admin y auditor
-- -----------------------------------------------------------------------------
drop policy if exists negocio_select_admin on public.negocio;
create policy negocio_select_admin on public.negocio
    for select to public
    using (exists (
        select 1 from public.usuario
        where usuario.id = auth.uid() and usuario.rol = 'admin'
    ));

drop policy if exists negocio_select_auditor on public.negocio;
create policy negocio_select_auditor on public.negocio
    for select to public
    using (exists (
        select 1 from public.usuario
        where usuario.id = auth.uid() and usuario.rol = 'auditor'
    ));

comment on policy negocio_select_admin on public.negocio is
    'Permite a rol=admin leer negocios en cualquier estado (incluye pendiente/rechazado). Recuperada de produccion en 007.';
comment on policy negocio_select_auditor on public.negocio is
    'Permite a rol=auditor leer negocios en cualquier estado. Recuperada de produccion en 007; sin usuarios con este rol a la fecha.';


-- -----------------------------------------------------------------------------
-- 4. Candado de auto-aprobación: REVOKE/GRANT por columna en `negocio`
-- -----------------------------------------------------------------------------
-- Sin esto, negocio_update_duenio (002) deja que el dueño haga UPDATE de
-- CUALQUIER columna de su fila, incluida `estado` -> auto-aprobación.
revoke update on public.negocio from authenticated;

grant update (
    nombre_negocio,
    categoria,
    responsable,
    cedula_ruc,
    telefono,
    latitud,
    longitud,
    descripcion,
    logo_url
) on public.negocio to authenticated;

commit;


-- =============================================================================
-- Verificación (opcional, correr tras el commit)
-- =============================================================================
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid = 'usuario'::regclass and conname = 'usuario_rol_check';
-- -> debe incluir 'auditor'.
--
-- select routine_name from information_schema.routines
--   where routine_schema = 'public' order by routine_name;
-- -> debe devolver exactamente: admin_aprobar_negocio, admin_rechazar_negocio,
--    canjear_qr_sello, es_duenio_negocio, negocio_visible.
--
-- select policyname from pg_policies where tablename = 'negocio' order by 1;
-- -> debe incluir negocio_select_admin y negocio_select_auditor además de
--    las 4 de 002.
--
-- select column_name from information_schema.column_privileges
--   where table_name = 'negocio' and grantee = 'authenticated'
--   and privilege_type = 'UPDATE' order by 1;
-- -> debe devolver exactamente 9 columnas: categoria, cedula_ruc, descripcion,
--    latitud, logo_url, longitud, nombre_negocio, responsable, telefono.
-- =============================================================================


-- =============================================================================
-- RIESGO PENDIENTE — NO corregido en esta migración (deliberado)
-- =============================================================================
-- Hallazgo #2 de la auditoría: `sello` tipo='geolocalizacion' se inserta
-- directo desde el cliente (src/hooks/useSellos.js, sellar()) sin ninguna
-- validación server-side de distancia contra sitio.latitud/longitud. RLS solo
-- exige que el usuario_id sea el propio. Un usuario autenticado puede sellar
-- cualquier sitio sin haber estado ahí, con una llamada REST directa
-- (bypaseando el chequeo de distancia que sí existe en el cliente, si existe).
--
-- Esto es una decisión de negocio con impacto en el sistema de niveles/rango/
-- insignias (todo se deriva de count(sello)), no un simple bug de UI. Requiere
-- decidir la tolerancia de distancia y probablemente mover el INSERT a una
-- función security definer tipo `sellar_por_geolocalizacion(p_sitio_id, p_lat,
-- p_lng)` que valide contra sitio con ST_DWithin o haversine antes de
-- insertar, y revocar el INSERT directo de `sello` para tipo='geolocalizacion'
-- vía columna/trigger. Queda para 008_validacion_distancia_sello.sql, junto
-- con el usuario del equipo, ya que cambia comportamiento visible (puede
-- rechazar sellos que hoy se aceptan).
-- =============================================================================
