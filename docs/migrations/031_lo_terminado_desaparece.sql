-- docs/migrations/031_lo_terminado_desaparece.sql
--
-- Lo que terminó desaparece (actividades y sellos). REGLA ÚNICA: una actividad termina en fecha_fin + hora_fin,
-- hora de Managua (America/Managua, UTC-6 todo el año). Si hora_fin es menor que hora_inicio, termina el día
-- siguiente. Sin hora, termina al final del día (a las 00:00 del día siguiente). Está terminada cuando
-- "ahora" >= ese instante. El front tiene la misma regla en utils/eventos.js (finDeEvento / eventoTermino).
-- Un cupón sigue venciendo en su fecha_expiracion (ya era así en la base y en el front).
--
-- Decisiones que conviene tener a la vista:
--  * hora_fin igual a hora_inicio (p. ej. 10:00 a 10:00) NO cruza la medianoche: termina a esa hora de fecha_fin.
--  * En una actividad de varios días con hora_fin < hora_inicio (p. ej. del 10 al 12, de 7 PM a 2 AM), fecha_fin es
--    el último día en que EMPIEZA: termina el 13 a las 2 AM.
--  * El chequeo viejo de canjear_qr_sello (fecha_expiracion < CURRENT_DATE) se deja igual: para un QR suelto es el de
--    siempre; para el QR de una actividad, el chequeo nuevo manda (puede salir "ya expiró" o "ya terminó").
--  * QR aprobados antes de la 031 conservarían su expiración vieja (medianoche UTC de fecha_fin), pero hoy no hay
--    ninguno; aun así el chequeo nuevo los frena a la hora correcta mientras la actividad siga enlazada.
--
-- 1. fin_de_actividad(fecha_fin, hora_inicio, hora_fin): el instante en que termina. Es interna (la usan las
--    funciones SECURITY DEFINER); no se llama desde la API.
-- 2. actividades_negocio_publicas(): devuelve solo lo que no terminó.
-- 3. canjear_qr_sello(): un QR de actividad ya no se canjea cuando la actividad terminó ("Esta actividad ya
--    terminó."). El resto de la función queda igual (también el chequeo de fecha_expiracion de los QR sueltos).
--    NO recibe la hora por parámetro: usa now().
-- 4. admin_aprobar_sello() y la sincronización de actividad_negocio: el qr_sello.fecha_expiracion de una actividad
--    es su fin real (antes era la medianoche UTC de fecha_fin, es decir las 6 PM del día anterior en Managua).
--
-- No se borra ni se modifica ninguna fila: ni actividades ni QR existentes (hoy ninguna actividad tiene QR aprobado
-- y el QR suelto 2 vence en 2027).

begin;

-- -----------------------------------------------------------------------------
-- 1. El instante en que termina una actividad
-- -----------------------------------------------------------------------------
create or replace function public.fin_de_actividad(p_fecha_fin date, p_hora_inicio time, p_hora_fin time)
returns timestamptz
language sql
stable
set search_path = ''
as $$
    select case
        when p_fecha_fin is null then null
        else (
            (p_fecha_fin + coalesce(p_hora_fin, time '00:00'))
            + case
                when p_hora_fin is null then interval '1 day'                                          -- sin hora: al final del día
                when p_hora_inicio is not null and p_hora_fin < p_hora_inicio then interval '1 day'   -- nocturna: termina al día siguiente
                else interval '0'
              end
        ) at time zone 'America/Managua'
    end;
$$;

comment on function public.fin_de_actividad(date, time, time) is
    'Instante en que termina una actividad: fecha_fin + hora_fin en America/Managua; si hora_fin < hora_inicio, al día siguiente; sin hora, a las 00:00 del día siguiente (031).';

revoke execute on function public.fin_de_actividad(date, time, time) from public, anon, authenticated;
grant execute on function public.fin_de_actividad(date, time, time) to service_role;

-- -----------------------------------------------------------------------------
-- 2. Lectura pública: solo lo que no terminó
-- -----------------------------------------------------------------------------
create or replace function public.actividades_negocio_publicas()
returns table (
    id              bigint,
    negocio_id      integer,
    nombre          text,
    descripcion     text,
    foto_url        text,
    categoria       text,
    categoria_otro  text,
    lugar           text,
    fecha_inicio    date,
    fecha_fin       date,
    hora_inicio     time,
    hora_fin        time,
    eslogan         text,
    detalles        text,
    etiquetas       text[],
    solicita_sello  boolean,
    estado_sello    text,
    qr_sello_id     integer,
    evento_id       integer,
    fecha_creacion  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        a.id,
        a.negocio_id,
        a.nombre,
        a.descripcion,
        a.foto_url,
        a.categoria,
        a.categoria_otro,
        a.lugar,
        a.fecha_inicio,
        a.fecha_fin,
        a.hora_inicio,
        a.hora_fin,
        a.eslogan,
        a.detalles,
        a.etiquetas,
        a.solicita_sello,
        a.estado_sello,
        a.qr_sello_id,
        a.evento_id,
        a.fecha_creacion
    from public.actividad_negocio a
    where a.fecha_inicio is not null
      and a.fecha_fin is not null
      and public.fin_de_actividad(a.fecha_fin, a.hora_inicio, a.hora_fin) > now()
      and public.negocio_visible(a.negocio_id)
    order by a.fecha_inicio, a.id;
$$;

comment on function public.actividades_negocio_publicas() is
    'Lectura pública de actividad_negocio: solo con fechas, que no hayan terminado (fin_de_actividad > now()) y con el negocio visible; sin justificacion_sello, motivo_rechazo_sello ni limite_canjes (031).';

revoke execute on function public.actividades_negocio_publicas() from public;
grant execute on function public.actividades_negocio_publicas() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. canjear_qr_sello: un QR de actividad no se canjea cuando la actividad terminó
--    (idéntica a la de 017, con un chequeo nuevo justo después del de fecha_expiracion)
-- -----------------------------------------------------------------------------
create or replace function public.canjear_qr_sello(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
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

  -- (017) el negocio dueño del QR debe seguir participando (candado de 016)
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

  -- (031) el QR de una actividad deja de canjearse cuando la actividad termina (fecha_fin + hora_fin, hora de Managua)
  IF EXISTS (
    SELECT 1 FROM actividad_negocio a
    WHERE a.qr_sello_id = v_qr.id
      AND a.fecha_fin IS NOT NULL
      AND public.fin_de_actividad(a.fecha_fin, a.hora_inicio, a.hora_fin) <= now()
  ) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad ya terminó.');
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
$$;

-- -----------------------------------------------------------------------------
-- 4. El QR de una actividad expira cuando la actividad termina
-- -----------------------------------------------------------------------------
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

-- La sincronización de 030 también mantiene la expiración del QR si cambian las horas (las fechas no cambian con el sello aprobado).
create or replace function public.actividad_negocio_sincronizar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.nombre is distinct from old.nombre and new.qr_sello_id is not null then
    update public.qr_sello set nombre_actividad = new.nombre where id = new.qr_sello_id;
  end if;

  if new.qr_sello_id is not null and new.fecha_fin is not null
     and (new.fecha_fin is distinct from old.fecha_fin
          or new.hora_inicio is distinct from old.hora_inicio
          or new.hora_fin is distinct from old.hora_fin) then
    update public.qr_sello
    set fecha_expiracion = public.fin_de_actividad(new.fecha_fin, new.hora_inicio, new.hora_fin)
    where id = new.qr_sello_id;
  end if;

  if new.evento_id is not null and new.fecha_inicio is not null and new.fecha_fin is not null
     and (new.nombre is distinct from old.nombre
          or new.fecha_inicio is distinct from old.fecha_inicio
          or new.fecha_fin is distinct from old.fecha_fin
          or new.descripcion is distinct from old.descripcion) then
    update public.evento
    set nombre = new.nombre,
        fecha_inicio = new.fecha_inicio,
        fecha_fin = new.fecha_fin,
        descripcion = new.descripcion
    where id = new.evento_id and negocio_organizador_id = new.negocio_id;
  end if;

  return null;
end;
$$;

commit;
