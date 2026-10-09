-- =============================================================================
-- Wheregüense — Migración 008: endurecimiento de qr_sello
-- =============================================================================
-- Depende de: 001_schema_inicial.sql .. 007_estado_real_produccion.sql.
-- Motor: PostgreSQL 15 (Supabase). Proyecto: spybqychnydgvidwjrlh.
--
-- CONTEXTO
-- --------
-- La auditoría confirmó con una llamada real vía curl (anon key pública, sin
-- sesión) que qr_sello_select_visible (002) expone la columna `token` a
-- cualquier visitante para negocios activos. Con ese token, cualquiera con
-- una cuenta puede canjear el sello sin visitar el negocio. Además:
--   - el token se generaba en el cliente con Math.random() (~41 bits, no
--     criptográfico) en src/hooks/useNegocio.js.
--   - canjear_qr_sello tenía una condición de carrera entre el chequeo de
--     límite/duplicado y el INSERT en `sello`.
--
-- Esta migración SÍ cambia comportamiento (a diferencia de 007, que solo
-- documentaba). Es aditiva: no toca `negocio` (ya cerrado en 007) ni el
-- hallazgo de geolocalización (queda para 009). No regenera los tokens ya
-- existentes — esa decisión queda fuera de este alcance.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Cerrar la fuga: revocar SELECT de tabla completa, conceder solo
--    columnas seguras (sin token) a anon/authenticated.
-- -----------------------------------------------------------------------------
revoke select on public.qr_sello from anon, authenticated;

grant select (
    id, negocio_id, nombre_actividad, color,
    fecha_creacion, fecha_expiracion, limite_canjes
) on public.qr_sello to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Higiene: anon nunca debería tener INSERT/UPDATE/DELETE de tabla
--    completa por defecto (RLS ya lo bloqueaba en la práctica, pero no debe
--    quedar el grant de tabla ahí como superficie innecesaria).
-- -----------------------------------------------------------------------------
revoke insert, update, delete on public.qr_sello from anon;

-- -----------------------------------------------------------------------------
-- 3. RPC: el dueño lista sus propias actividades QR (incluye token,
--    porque el valor de retorno de una función no está sujeto a los
--    grants de columna de la tabla).
-- -----------------------------------------------------------------------------
create or replace function public.mis_actividades_qr(p_negocio_id integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_actividades jsonb;
BEGIN
  IF NOT public.es_duenio_negocio(p_negocio_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso sobre este negocio.', 'actividades', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(row_to_json(q) ORDER BY q.fecha_creacion DESC), '[]'::jsonb)
  INTO v_actividades
  FROM (
    SELECT id, token, nombre_actividad, color, fecha_creacion, fecha_expiracion, limite_canjes
    FROM qr_sello
    WHERE negocio_id = p_negocio_id
  ) q;

  RETURN jsonb_build_object('exito', true, 'actividades', v_actividades);
END;
$function$;

comment on function public.mis_actividades_qr(integer) is
    'Lista las actividades QR (incluido token) del negocio del propio dueño. 008.';

-- -----------------------------------------------------------------------------
-- 4. RPC: el dueño crea una actividad QR nueva; el token se genera
--    server-side con gen_random_uuid() (criptográficamente seguro), nunca
--    lo elige el cliente.
-- -----------------------------------------------------------------------------
create or replace function public.crear_actividad_qr(
    p_negocio_id integer,
    p_nombre_actividad text,
    p_color text default '#1119BC',
    p_limite_canjes integer default null,
    p_fecha_expiracion timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_token text;
  v_fila qr_sello;
BEGIN
  IF NOT public.es_duenio_negocio(p_negocio_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso sobre este negocio.');
  END IF;

  v_token := upper(replace(gen_random_uuid()::text, '-', ''));

  INSERT INTO qr_sello (negocio_id, token, nombre_actividad, color, limite_canjes, fecha_expiracion)
  VALUES (p_negocio_id, v_token, p_nombre_actividad, p_color, p_limite_canjes, p_fecha_expiracion)
  RETURNING * INTO v_fila;

  RETURN jsonb_build_object('exito', true, 'actividad', row_to_json(v_fila));
EXCEPTION
  WHEN check_violation THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Datos inválidos para la actividad (revisa color o límite de canjes).');
END;
$function$;

comment on function public.crear_actividad_qr(integer, text, text, integer, timestamptz) is
    'Crea una actividad QR para el negocio del propio dueño, con token generado server-side. 008.';

-- Solo authenticated: no hay ningún caso de uso legítimo de estas dos
-- funciones para un visitante anónimo (a diferencia de canjear_qr_sello,
-- que sí necesita rechazar anon *dentro* de la función).
grant execute on function public.mis_actividades_qr(integer) to authenticated;
grant execute on function public.crear_actividad_qr(integer, text, text, integer, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Cerrar la condición de carrera de canjear_qr_sello con un lock de fila
--    (serializa canjes concurrentes del MISMO token; cierra a la vez el
--    duplicado por usuario y el exceso de límite_canjes entre usuarios).
-- -----------------------------------------------------------------------------
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
  WHERE token = p_token
  FOR UPDATE;                              -- <- NUEVO: serializa canjes concurrentes de este QR

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
EXCEPTION
  WHEN unique_violation THEN               -- <- NUEVO: respaldo si algo insertara en paralelo
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Ya canjeaste el sello de ' || v_qr.nombre_actividad || '.');
END;
$function$;

-- -----------------------------------------------------------------------------
-- 6. Índice único de respaldo (defensa en profundidad, además del lock):
-- -----------------------------------------------------------------------------
create unique index if not exists sello_unico_qr_por_usuario
    on public.sello (usuario_id, qr_sello_id)
    where qr_sello_id is not null;

commit;


-- =============================================================================
-- Verificación (opcional, correr tras el commit)
-- =============================================================================
-- select column_name from information_schema.column_privileges
--   where table_name = 'qr_sello' and grantee in ('anon','authenticated')
--   and privilege_type = 'SELECT' order by 1;
-- -> debe devolver exactamente: color, fecha_creacion, fecha_expiracion,
--    id, limite_canjes, negocio_id, nombre_actividad (SIN token).
--
-- select routine_name from information_schema.routines
--   where routine_schema = 'public' order by routine_name;
-- -> debe incluir crear_actividad_qr y mis_actividades_qr además de las 5
--    de 007.
--
-- select indexname from pg_indexes where tablename = 'sello'
--   and indexname = 'sello_unico_qr_por_usuario';
-- -> debe existir.
-- =============================================================================
