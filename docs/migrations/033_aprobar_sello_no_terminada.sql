-- docs/migrations/033_aprobar_sello_no_terminada.sql
--
-- admin_aprobar_sello rechaza la solicitud de una actividad que ya terminó ("Esta actividad ya terminó."): aprobarla crearía
-- un QR que nace vencido (031: el QR de una actividad ya no se canjea al terminar). Rechazar sigue funcionando.
-- Una actividad sin fechas (antigua) no tiene fin, así que se aprueba como siempre. Es la misma función de 031 con un
-- chequeo nuevo justo después del de "solicitud pendiente".

begin;

create or replace function public.admin_aprobar_sello(p_actividad_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
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

  IF public.es_duenio_negocio(v_act.negocio_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No puedes aprobar el sello de tu propio negocio.');
  END IF;

  IF NOT v_act.solicita_sello OR v_act.estado_sello <> 'pendiente' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad no tiene una solicitud de sello pendiente.');
  END IF;

  -- (033) una actividad que ya terminó no recibe QR: nacería vencido
  IF v_act.fecha_fin IS NOT NULL
     AND public.fin_de_actividad(v_act.fecha_fin, v_act.hora_inicio, v_act.hora_fin) <= now() THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad ya terminó.');
  END IF;

  INSERT INTO qr_sello (negocio_id, token, nombre_actividad, limite_canjes, fecha_expiracion)
  VALUES (v_act.negocio_id,
          upper(replace(gen_random_uuid()::text, '-', '')),
          v_act.nombre,
          v_act.limite_canjes,
          public.fin_de_actividad(v_act.fecha_fin, v_act.hora_inicio, v_act.hora_fin))
  RETURNING id INTO v_qr_id;

  UPDATE actividad_negocio
  SET estado_sello = 'aprobado', qr_sello_id = v_qr_id, motivo_rechazo_sello = NULL
  WHERE id = p_actividad_id;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Sello aprobado.', 'qr_sello_id', v_qr_id);
END;
$$;

commit;
