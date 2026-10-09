-- docs/migrations/014_renovar_suscripcion_acumula.sql
--
-- admin_renovar_suscripcion (creada en 012) contaba siempre desde now(): quien
-- pagaba antes de vencer perdía los días que le quedaban.
--
-- Ahora: vence = GREATEST(now(), fecha_vencimiento_suscripcion) + p_meses
--   - Renueva antes de vencer -> se suma al vencimiento vigente.
--   - Ya venció               -> cuenta desde hoy.
--   - Sin vencimiento (NULL)  -> cuenta desde hoy (GREATEST ignora los NULL).
--
-- Resto igual que en 012: solo admin, solo negocios con estado = 'activo',
-- p_meses entre 1 y 36, mismos permisos de ejecución.

begin;

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
  SET fecha_vencimiento_suscripcion = GREATEST(now(), fecha_vencimiento_suscripcion)
                                      + make_interval(months => p_meses),  -- <- antes: now() + ...
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
    'Renueva la suscripcion de un negocio activo: vence = GREATEST(now(), vencimiento actual) + p_meses (default 6, rango 1-36), suscripcion_activa = true. Si renueva antes de vencer se suma al tiempo restante; si ya vencio, cuenta desde hoy. Solo rol=admin.';

commit;
