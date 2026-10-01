-- docs/migrations/012_base_candado_suscripcion.sql
--
-- Deja lista la base de datos del candado de suscripción, SIN activarlo todavía
-- (negocio_select_activo_o_duenio, negocio_visible() y el filtro del mapa siguen
-- mirando solo estado = 'activo'; eso se cambia en un paso posterior).
--
-- Regla nueva: la suscripción dura 6 meses desde la aprobación (antes: 1 año).
--
--   1. Backfill: los negocios activos aprobados antes de que la aprobación llenara
--      las columnas de suscripción quedaron con suscripcion_activa = false y
--      fecha_vencimiento_suscripcion = NULL. Se completan a partir de su
--      fecha_aprobacion REAL (no now()), para que queden como si se hubieran
--      aprobado con la regla actual.
--   2. admin_aprobar_negocio: now() + 1 año  ->  now() + 6 meses.
--   3. Documenta los permisos por columna de negocio que ya estaban activos en
--      producción sin estar versionados (ver sección 3).
--   4. Nueva admin_renovar_suscripcion(p_negocio_id, p_meses default 6), para
--      reactivar a mano a un negocio que ya pagó (p. ej. por WhatsApp).

begin;

-- -----------------------------------------------------------------------------
-- 1. Backfill de negocios activos sin datos de suscripción
-- -----------------------------------------------------------------------------
update public.negocio
set suscripcion_activa = true,
    fecha_vencimiento_suscripcion = fecha_aprobacion + interval '6 months'
where estado = 'activo'
  and fecha_aprobacion is not null
  and (suscripcion_activa = false or fecha_vencimiento_suscripcion is null);


-- -----------------------------------------------------------------------------
-- 2. Aprobación: la suscripción inicial pasa a 6 meses
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
      fecha_vencimiento_suscripcion = now() + interval '6 months',  -- <- antes: 1 year
      suscripcion_activa = true
  WHERE id = p_negocio_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Negocio no encontrado.');
  END IF;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Negocio aprobado.');
END;
$function$;

comment on function public.admin_aprobar_negocio(integer) is
    'Aprueba un negocio pendiente (estado=activo, activa suscripcion 6 meses). Solo rol=admin. Recuperada de produccion en 007; plazo cambiado de 1 anio a 6 meses en 012.';


-- -----------------------------------------------------------------------------
-- 3. Permisos por columna de negocio (documentación de lo que ya está en producción)
-- -----------------------------------------------------------------------------
-- La nota de 002 ("por ahora esto permite que el dueño cambie él mismo la
-- columna estado") ya NO es cierta en producción. Estado real, leído de
-- pg_class.relacl / pg_attribute.attacl al escribir esta migración:
--
--   - authenticated NO tiene UPDATE a nivel de tabla (relacl: authenticated=ardDxtm,
--     sin la "w"). Solo tiene UPDATE por columna sobre:
--       nombre_negocio, categoria, responsable, cedula_ruc, telefono,
--       latitud, longitud, descripcion, logo_url
--     Por eso el dueño, aunque negocio_update_duenio le deje editar su fila, NO
--     puede escribir estado, motivo_rechazo, fecha_aprobacion,
--     fecha_vencimiento_suscripcion ni suscripcion_activa: esas columnas solo
--     las cambian las funciones SECURITY DEFINER de admin.
--
--   Equivale a haber corrido (no se vuelve a ejecutar aquí; ya está aplicado):
--     revoke update on public.negocio from authenticated;
--     grant update (nombre_negocio, categoria, responsable, cedula_ruc, telefono,
--                   latitud, longitud, descripcion, logo_url)
--       on public.negocio to authenticated;
--
--   OJO, pendiente (no se toca en 012): el INSERT de authenticated sigue
--   abarcando TODAS las columnas, incluidas estado y las de suscripción, y
--   negocio_insert_duenio solo valida usuario_id.
--
-- Confirmación: si algún día se pierde la protección de UPDATE, esta migración
-- falla en vez de dejarlo pasar en silencio.
do $$
begin
  if has_column_privilege('authenticated', 'public.negocio', 'estado', 'UPDATE')
     or has_column_privilege('authenticated', 'public.negocio', 'suscripcion_activa', 'UPDATE')
     or has_column_privilege('authenticated', 'public.negocio', 'fecha_vencimiento_suscripcion', 'UPDATE') then
    raise exception 'authenticated puede hacer UPDATE de estado/suscripcion en negocio: falta la protección por columna';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Renovación manual de la suscripción (solo admin)
-- -----------------------------------------------------------------------------
create or replace function public.admin_renovar_suscripcion(p_negocio_id integer, p_meses integer default 6)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_rol text;
  v_vence timestamptz;
BEGIN
  SELECT rol INTO v_rol FROM usuario WHERE id = auth.uid();
  IF v_rol IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso de administrador.');
  END IF;

  IF p_meses IS NULL OR p_meses < 1 OR p_meses > 36 THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'La cantidad de meses debe estar entre 1 y 36.');
  END IF;

  -- Solo negocios ya aprobados: renovar no aprueba un pendiente ni revive un rechazado.
  UPDATE negocio
  SET fecha_vencimiento_suscripcion = now() + make_interval(months => p_meses),
      suscripcion_activa = true
  WHERE id = p_negocio_id
    AND estado = 'activo'
  RETURNING fecha_vencimiento_suscripcion INTO v_vence;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Negocio no encontrado o no está aprobado.');
  END IF;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Suscripción renovada.', 'vence', v_vence);
END;
$function$;

comment on function public.admin_renovar_suscripcion(integer, integer) is
    'Renueva la suscripcion de un negocio activo: vence = now() + p_meses (default 6, rango 1-36) y suscripcion_activa = true. Solo rol=admin. Para reactivar a mano tras un pago fuera de la app.';

revoke execute on function public.admin_renovar_suscripcion(integer, integer) from public, anon;
grant execute on function public.admin_renovar_suscripcion(integer, integer) to authenticated, service_role;

commit;
