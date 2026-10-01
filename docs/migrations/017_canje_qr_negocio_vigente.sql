-- docs/migrations/017_canje_qr_negocio_vigente.sql
--
-- canjear_qr_sello() otorgaba el sello sin mirar el negocio dueño del QR: un
-- negocio ya oculto por el candado de suscripción (016) seguía entregando sellos
-- si alguien escaneaba un QR impreso de antes.
--
-- Cadena confirmada en producción: p_token -> qr_sello.token -> qr_sello.negocio_id
-- -> negocio.id.
--
-- Nueva validación, justo después de encontrar el QR: el negocio debe tener
--   estado = 'activo' AND fecha_vencimiento_suscripcion > now()
-- (mismo criterio que la rama pública de 016). Si no, se rechaza con
-- "Este negocio ya no está participando en la ruta."
--
-- El resto de la función es idéntico a la versión en producción (008):
-- lock FOR UPDATE del QR, expiración de la actividad, duplicado por usuario,
-- límite de canjes y captura de unique_violation.
--
-- NO se corrige aquí qr_sello.id = 1 ("dia de la mujer", negocio 1), que expira
-- el 32003-05-03: no hay forma de inferir con certeza la fecha pensada. Queda
-- para que la decida el equipo.

begin;

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
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Código QR no válido.');
  END IF;

  -- NUEVO (017): el negocio dueño del QR debe seguir participando (candado de 016)
  IF NOT EXISTS (
    SELECT 1 FROM negocio
    WHERE id = v_qr.negocio_id
      AND estado = 'activo'
      AND fecha_vencimiento_suscripcion > now()
  ) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Este negocio ya no está participando en la ruta.');
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
  WHEN unique_violation THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Ya canjeaste el sello de ' || v_qr.nombre_actividad || '.');
END;
$function$;

comment on function public.canjear_qr_sello(text) is
    'Canjea un QR de negocio por un sello tipo=qr. Valida sesion, que el negocio siga activo con suscripcion vigente (017), expiracion, duplicado y limite de canjes. No valida distancia (el sello QR no es por geolocalizacion).';

commit;
