-- docs/migrations/025_admin_confirmado_y_sin_autoaprobacion.sql
--
-- 1. Deja constancia en el historial de que la cuenta admin es rykyreyes03@gmail.com.
--    El rol se había puesto a mano (fuera de las migraciones): el UPDATE no debe
--    cambiar ninguna fila; si algún día la cuenta dejara de ser admin, lo restablece.
-- 2. Comprobación: la migración FALLA (y no se aplica) si no existe esa cuenta con
--    rol admin, o si existe alguna OTRA cuenta con rol admin.
-- 3. admin_aprobar_sello: el admin que llama no puede ser el dueño del negocio de la
--    actividad (esa cuenta es admin y también dueña del negocio 2).
--    Mensaje nuevo en el formato de las funciones de admin: la regla análoga de
--    reseñas (019, no reseñar el propio negocio) es una política RLS y no tiene
--    mensaje propio.
--    admin_rechazar_sello no se toca: rechazar el sello propio no da ninguna ventaja.

begin;

-- -----------------------------------------------------------------------------
-- 1. Constancia del rol admin
-- -----------------------------------------------------------------------------
update public.usuario
set rol = 'admin'
where id = 'f9fa4efb-d727-42f9-9f63-1959d58a873f'
  and email = 'rykyreyes03@gmail.com'
  and rol is distinct from 'admin';

-- -----------------------------------------------------------------------------
-- 2. Esa cuenta es admin y no hay otra
-- -----------------------------------------------------------------------------
do $$
declare
  v_otros text;
begin
  if not exists (
    select 1 from public.usuario
    where id = 'f9fa4efb-d727-42f9-9f63-1959d58a873f'
      and email = 'rykyreyes03@gmail.com'
      and rol = 'admin'
  ) then
    raise exception 'rykyreyes03@gmail.com no tiene rol admin: no se aplica';
  end if;

  select string_agg(coalesce(email, id::text), ', ') into v_otros
  from public.usuario
  where rol = 'admin'
    and id <> 'f9fa4efb-d727-42f9-9f63-1959d58a873f';

  if v_otros is not null then
    raise exception 'Hay otras cuentas con rol admin (%): no se aplica', v_otros;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. admin_aprobar_sello: sin autoaprobación (cuerpo de 021 + una validación)
-- -----------------------------------------------------------------------------
create or replace function public.admin_aprobar_sello(p_actividad_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_rol text;
  v_act actividad_negocio;
  v_qr_id integer;
BEGIN
  SELECT rol INTO v_rol FROM usuario WHERE id = auth.uid();
  IF v_rol IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso de administrador.');
  END IF;

  SELECT * INTO v_act FROM actividad_negocio WHERE id = p_actividad_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Actividad no encontrada.');
  END IF;

  -- NUEVO (025): el admin no aprueba el sello de su propio negocio.
  IF public.es_duenio_negocio(v_act.negocio_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No puedes aprobar el sello de tu propio negocio.');
  END IF;

  IF NOT v_act.solicita_sello OR v_act.estado_sello <> 'pendiente' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad no tiene una solicitud de sello pendiente.');
  END IF;

  -- Mismo token que crear_actividad_qr (008). Vence con la actividad, si tiene fechas.
  INSERT INTO qr_sello (negocio_id, token, nombre_actividad, fecha_expiracion)
  VALUES (v_act.negocio_id,
          upper(replace(gen_random_uuid()::text, '-', '')),
          v_act.nombre,
          v_act.fecha_fin::timestamptz)
  RETURNING id INTO v_qr_id;

  UPDATE actividad_negocio
  SET estado_sello = 'aprobado', qr_sello_id = v_qr_id, motivo_rechazo_sello = NULL
  WHERE id = p_actividad_id;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Sello aprobado.', 'qr_sello_id', v_qr_id);
END;
$function$;

comment on function public.admin_aprobar_sello(bigint) is
    'Aprueba la solicitud de sello de una actividad pendiente: crea el qr_sello y lo vincula. Solo rol=admin y nunca sobre su propio negocio (021, 025).';

-- create or replace conserva los permisos de 021; se reafirman por claridad.
revoke execute on function public.admin_aprobar_sello(bigint) from public, anon;
grant execute on function public.admin_aprobar_sello(bigint) to authenticated, service_role;

commit;
