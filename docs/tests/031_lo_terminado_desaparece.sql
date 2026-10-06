-- docs/tests/031_lo_terminado_desaparece.sql
--
-- Prueba con ROLLBACK de la migración 031 (lo que terminó desaparece). Se pega entera en una sola llamada de SQL:
-- primero el cuerpo de la migración (idempotente: create or replace), luego las ayudas temporales y un bloque DO.
-- Termina SIEMPRE con raise exception, así que no se guarda nada, ni siquiera la migración.
-- El mensaje del error trae "RESULTADO: N de M comprobaciones correctas" (cada caso se compara con su resultado
-- esperado y los que no coinciden salen como FALLA) y una línea por caso.
--   A. fronteras de tiempo con RELOJ SIMULADO: pg_temp.termino(..., ahora) vive solo aquí; la función pública
--      fin_de_actividad no recibe la hora y canjear_qr_sello usa now().
--   B. actividades_negocio_publicas() solo devuelve lo que no terminó (incluye la actividad real 64).
--   C. batería de canjear_qr_sello (017, 021, 027, 030): todos los casos igual que antes de la 031, salvo C13 (nuevo).
--   D. el QR de una actividad expira cuando termina la actividad.
-- Los casos B5 a B7 y A4 usan datos reales de producción (actividades 31, 32 y 64, QR 2).


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


-- ---------------------------------------------------------------------------
-- Ayudas de la prueba (solo existen durante esta sesión: viven en pg_temp)
-- ---------------------------------------------------------------------------
create function pg_temp.como(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
  if u is null then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
end $f$;

-- Corre una sentencia como un usuario real (u = null: visitante). Devuelve el resultado o '[sqlstate] mensaje'.
create function pg_temp.corre(u uuid, q text) returns text language plpgsql as $f$
declare res text;
begin
  execute 'reset role';
  perform pg_temp.como(u);
  begin
    if q ~* '^\s*select' then execute q into res; else execute q; res := 'OK'; end if;
    execute 'reset role';
    return coalesce(res, 'OK');
  exception when others then
    execute 'reset role';
    return '[' || sqlstate || '] ' || sqlerrm;
  end;
end $f$;

-- RELOJ SIMULADO: "¿ya terminó a esta hora?". Vive solo aquí: la función pública no recibe la hora.
create function pg_temp.termino(p_fecha_fin date, p_hi time, p_hf time, p_ahora timestamptz) returns boolean language sql as $f$
  select public.fin_de_actividad(p_fecha_fin, p_hi, p_hf) <= p_ahora
$f$;

do $test$
declare
  r text := '';
  papu uuid := '278a66c1-ee5a-42f4-a72a-a16e0e6553aa';
  adm  uuid := 'f9fa4efb-d727-42f9-9f63-1959d58a873f';
  tur  uuid := '264e1a69-9fbd-4062-86c5-37f93a5f742d';
  tur2 uuid := 'a7094b99-c19e-43a0-8546-0c45dadf9965';
  tur3 uuid := 'ba6d7948-2390-4f40-9bf8-2cb1f820d849';
  tok_real text;
  t text; d_fin date; h_fin date; hh time; qr int; a_fin bigint; a_viva bigint; a_hoy bigint; a_nada bigint; a_sinh bigint; a_fut bigint; fin64 timestamptz;
  a64f date; a64i time; a64h time; ids_pub bigint[]; esperados text[]; esperado text; fallas int; n int;
  foto text := 'https://x/y.png';
begin
  -- ===================== A. FRONTERAS DE TIEMPO (reloj simulado) =====================
  r := r || E'--- A. fin_de_actividad con reloj simulado (Managua = UTC-6) ---';
  -- normal: 15:00 a 18:00 del 10/oct -> termina 2026-10-10 18:00 Managua = 2026-10-11 00:00 UTC
  r := r || E'\nA1 normal 15:00-18:00: 1 s antes=' || pg_temp.termino('2026-10-10', '15:00', '18:00', '2026-10-10 23:59:59+00') || ', justo=' || pg_temp.termino('2026-10-10', '15:00', '18:00', '2026-10-11 00:00:00+00') || ', 1 s después=' || pg_temp.termino('2026-10-10', '15:00', '18:00', '2026-10-11 00:00:01+00');
  -- nocturna: 19:00 a 02:00 con fecha_fin 18/oct -> termina 2026-10-19 02:00 Managua = 08:00 UTC
  r := r || E'\nA2 nocturna 7 PM a 2 AM: a las 9 PM (en curso)=' || pg_temp.termino('2026-10-18', '19:00', '02:00', '2026-10-19 03:00:00+00') || ', 1 s antes de las 2 AM=' || pg_temp.termino('2026-10-18', '19:00', '02:00', '2026-10-19 07:59:59+00') || ', a las 2 AM justo=' || pg_temp.termino('2026-10-18', '19:00', '02:00', '2026-10-19 08:00:00+00') || ', 1 s después=' || pg_temp.termino('2026-10-18', '19:00', '02:00', '2026-10-19 08:00:01+00');
  r := r || E'\nA2b nocturna: a las 12:30 AM del día siguiente (sigue)=' || pg_temp.termino('2026-10-18', '19:00', '02:00', '2026-10-19 06:30:00+00');
  -- sin hora: termina al final del día 10/oct (00:00 del 11 en Managua = 06:00 UTC)
  r := r || E'\nA3 sin hora: a las 11:59:59 PM=' || pg_temp.termino('2026-10-10', null, null, '2026-10-11 05:59:59+00') || ', a medianoche justo=' || pg_temp.termino('2026-10-10', null, null, '2026-10-11 06:00:00+00');
  -- la actividad real 64: 6/oct, 4:03 a 6:01 AM
  select fecha_fin, hora_inicio, hora_fin into a64f, a64i, a64h from actividad_negocio where id = 64;
  r := r || E'\nA4 actividad 64 real (' || a64f || ' ' || a64i || '-' || a64h || '): fin=' || (public.fin_de_actividad(a64f, a64i, a64h) at time zone 'America/Managua') || ' Managua | 6:00:59 AM=' || pg_temp.termino(a64f, a64i, a64h, '2026-10-06 12:00:59+00') || ', 6:01:00 AM=' || pg_temp.termino(a64f, a64i, a64h, '2026-10-06 12:01:00+00');
  r := r || E'\nA5 hora_fin igual a hora_inicio (10:00-10:00), sin cruce de día: 1 s antes=' || pg_temp.termino('2026-10-10', '10:00', '10:00', '2026-10-10 15:59:59+00') || ', justo=' || pg_temp.termino('2026-10-10', '10:00', '10:00', '2026-10-10 16:00:00+00');
  r := r || E'\nA6 varios días (10 al 12/oct, 9 AM a 5 PM): el 11/oct a las 6 PM (en curso)=' || pg_temp.termino('2026-10-12', '09:00', '17:00', '2026-10-12 00:00:00+00') || ', el 12/oct 4:59:59 PM=' || pg_temp.termino('2026-10-12', '09:00', '17:00', '2026-10-12 22:59:59+00') || ', 5:00 PM=' || pg_temp.termino('2026-10-12', '09:00', '17:00', '2026-10-12 23:00:00+00');
  r := r || E'\nA6b varios días nocturna (10 al 12/oct, 7 PM a 2 AM): el 12/oct a las 8 PM (en curso)=' || pg_temp.termino('2026-10-12', '19:00', '02:00', '2026-10-13 02:00:00+00') || ', el 13/oct 1:59:59 AM=' || pg_temp.termino('2026-10-12', '19:00', '02:00', '2026-10-13 07:59:59+00') || ', 2:00 AM=' || pg_temp.termino('2026-10-12', '19:00', '02:00', '2026-10-13 08:00:00+00');
  r := r || E'\nA7 sin fecha_fin: ' || coalesce(public.fin_de_actividad(null, null, null)::text, 'null');
  r := r || E'\nA8 enero 2027 (también UTC-6): 18:00 -> ' || (public.fin_de_actividad('2027-01-15', '10:00', '18:00') at time zone 'UTC');

  -- ===================== B. LECTURA PÚBLICA =====================
  r := r || E'\n\n--- B. actividades_negocio_publicas() solo devuelve lo que no terminó ---';
  h_fin := ((now() - interval '1 minute') at time zone 'America/Managua')::date;
  hh := ((now() - interval '1 minute') at time zone 'America/Managua')::time;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar)
    values (1, 'B terminó hace 1 min', 'Descripción de prueba suficientemente larga', foto, h_fin, h_fin, '00:00', hh, 'feria', 'Parque') returning id into a_fin;
  h_fin := ((now() + interval '1 hour') at time zone 'America/Managua')::date;
  hh := ((now() + interval '1 hour') at time zone 'America/Managua')::time;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar)
    values (1, 'B termina en 1 hora', 'Descripción de prueba suficientemente larga', foto, h_fin, h_fin, '00:00', hh, 'feria', 'Parque') returning id into a_viva;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar)
    values (1, 'B sin hora, termina hoy a medianoche', 'Descripción de prueba suficientemente larga', foto, (now() at time zone 'America/Managua')::date, (now() at time zone 'America/Managua')::date, '10:00', '11:00', 'feria', 'Parque') returning id into a_hoy;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar)
    values (1, 'B sin hora, terminó ayer', 'Descripción de prueba suficientemente larga', foto, ((now() at time zone 'America/Managua')::date - 1), ((now() at time zone 'America/Managua')::date - 1), '10:00', '11:00', 'feria', 'Parque') returning id into a_nada;
  -- Las actividades NUEVAS exigen hora (029); sin hora solo existen las antiguas (como la 32): se simula quitándosela como postgres.
  update actividad_negocio set hora_inicio = null, hora_fin = null where id in (a_hoy, a_nada);
  r := r || E'\nB1 terminó hace 1 minuto -> ' || case when exists (select 1 from actividades_negocio_publicas() p where p.id = a_fin) then 'aparece' else 'no aparece' end;
  r := r || E'\nB2 termina en 1 hora -> ' || case when exists (select 1 from actividades_negocio_publicas() p where p.id = a_viva) then 'aparece' else 'no aparece' end;
  r := r || E'\nB3 sin hora, termina hoy a medianoche -> ' || case when exists (select 1 from actividades_negocio_publicas() p where p.id = a_hoy) then 'aparece' else 'no aparece' end;
  r := r || E'\nB4 sin hora, terminó ayer -> ' || case when exists (select 1 from actividades_negocio_publicas() p where p.id = a_nada) then 'aparece' else 'no aparece' end;
  -- la 64 real (6/oct 6:01 AM) y la 31 (sin fechas) y la 32 (16 al 27/oct)
  fin64 := public.fin_de_actividad(a64f, a64i, a64h);
  r := r || E'\nB5 actividad 64 real -> ' || case when exists (select 1 from actividades_negocio_publicas() p where p.id = 64) then 'aparece' else 'no aparece' end || ' (ahora ' || (now() at time zone 'America/Managua') || ' Managua; termina ' || (public.fin_de_actividad(a64f, a64i, a64h) at time zone 'America/Managua') || ')';
  -- Datos de prueba (no filas reales): una actividad antigua SIN fechas y una futura dentro de 10 días.
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar)
    values (1, 'B antigua sin fechas', 'Descripción de prueba suficientemente larga', foto, current_date + 1, current_date + 1, '10:00', '11:00', 'feria', 'Parque') returning id into a_sinh;
  update actividad_negocio set fecha_inicio = null, fecha_fin = null, hora_inicio = null, hora_fin = null where id = a_sinh;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar)
    values (1, 'B futura en 10 días', 'Descripción de prueba suficientemente larga', foto, current_date + 10, current_date + 10, '10:00', '11:00', 'feria', 'Parque') returning id into a_fut;
  r := r || E'\nB6 actividad antigua sin fechas -> ' || case when exists (select 1 from actividades_negocio_publicas() p where p.id = a_sinh) then 'aparece' else 'no aparece' end;
  r := r || E'\nB7 actividad futura (dentro de 10 días) -> ' || case when exists (select 1 from actividades_negocio_publicas() p where p.id = a_fut) then 'aparece' else 'no aparece' end;
  r := r || E'\nB8 un visitante anónimo puede llamar a la función y ve ' || pg_temp.corre(null, 'select count(*)::text from actividades_negocio_publicas()') || ' actividades';
  r := r || E'\nB9 fin_de_actividad NO es llamable por la API (visitante) -> ' || pg_temp.corre(null, $q$select public.fin_de_actividad('2026-10-10', null, null)::text$q$);
  r := r || E'\nB10 ni por un usuario con sesión -> ' || pg_temp.corre(tur, $q$select public.fin_de_actividad('2026-10-10', null, null)::text$q$);

  -- ===================== D. APROBAR EL SELLO Y SU EXPIRACIÓN =====================
  r := r || E'\n\n--- D. el QR de una actividad expira cuando termina la actividad ---';
  t := pg_temp.corre(papu, format($q$insert into actividad_negocio (negocio_id,nombre,descripcion,foto_url,fecha_inicio,fecha_fin,hora_inicio,hora_fin,solicita_sello,justificacion_sello,limite_canjes,categoria,lugar)
        values (1,'D nocturna con sello','Descripción de prueba suficientemente larga','%s','2026-12-01','2026-12-01','19:00','02:00',true,'Para visitantes',10,'musica','Parque')$q$, foto));
  select id into a_sinh from actividad_negocio where nombre = 'D nocturna con sello';
  t := pg_temp.corre(adm, format('select admin_aprobar_sello(%s)::text', a_sinh));
  select qr_sello_id into qr from actividad_negocio where id = a_sinh;
  r := r || E'\nD1 aprobada una nocturna 19:00-02:00 del 1/dic: el QR expira (UTC) = ' || (select fecha_expiracion at time zone 'UTC' from qr_sello where id = qr) || ' (esperado 2026-12-02 08:00:00 = 2 AM de Managua del 2/dic)';
  t := pg_temp.corre(papu, format($q$update actividad_negocio set hora_fin = '03:00' where id = %s$q$, a_sinh));
  r := r || E'\nD2 el dueño cambia la hora de fin a 3 AM -> ' || t || ' | el QR expira (UTC) = ' || (select fecha_expiracion at time zone 'UTC' from qr_sello where id = qr) || ' (esperado 2026-12-02 09:00:00)';

  -- ===================== C. canjear_qr_sello (batería de regresión) =====================
  r := r || E'\n\n--- C. canjear_qr_sello: la batería de siempre (017, 021, 027, 030) ---';
  select token into tok_real from qr_sello where id = 2;
  r := r || E'\nC1 sin sesión (visitante) -> ' || pg_temp.corre(null, $q$select canjear_qr_sello('CUALQUIERA')::text$q$);
  r := r || E'\nC2 token que no existe -> ' || pg_temp.corre(tur, $q$select canjear_qr_sello('NOEXISTE')::text$q$);
  insert into qr_sello (negocio_id, token, nombre_actividad) values (3, 'TOK-NEG3', 'Sello de negocio fuera');
  r := r || E'\nC3 negocio que ya no participa -> ' || pg_temp.corre(tur, $q$select canjear_qr_sello('TOK-NEG3')::text$q$);
  delete from sello where qr_sello_id = 2;
  r := r || E'\nC4 QR suelto real (2027): primer canje -> ' || pg_temp.corre(tur3, format($q$select canjear_qr_sello('%s')::text$q$, tok_real));
  r := r || E'\nC5 mismo QR, mismo turista (doble canje) -> ' || pg_temp.corre(tur3, format($q$select canjear_qr_sello('%s')::text$q$, tok_real));
  r := r || E'\nC6 mismo QR, otro turista -> ' || pg_temp.corre(tur2, format($q$select canjear_qr_sello('%s')::text$q$, tok_real));
  insert into qr_sello (negocio_id, token, nombre_actividad, limite_canjes) values (1, 'TOK-LIMITE1', 'Sello con límite', 1);
  r := r || E'\nC7 límite 1: primer turista -> ' || pg_temp.corre(tur, $q$select canjear_qr_sello('TOK-LIMITE1')::text$q$);
  r := r || E'\nC8 límite 1: segundo turista -> ' || pg_temp.corre(tur2, $q$select canjear_qr_sello('TOK-LIMITE1')::text$q$);
  insert into qr_sello (negocio_id, token, nombre_actividad, fecha_expiracion) values (1, 'TOK-VIEJO', 'Sello vencido', now() - interval '2 days');
  insert into qr_sello (negocio_id, token, nombre_actividad, fecha_expiracion) values (1, 'TOK-HOYUTC', 'Sello de hoy', current_date::timestamptz);
  r := r || E'\nC9 QR suelto expirado hace 2 días -> ' || pg_temp.corre(tur, $q$select canjear_qr_sello('TOK-VIEJO')::text$q$);
  r := r || E'\nC10 QR suelto que expira a las 00:00 UTC de hoy -> ' || pg_temp.corre(tur, $q$select canjear_qr_sello('TOK-HOYUTC')::text$q$);
  h_fin := ((now() + interval '1 hour') at time zone 'America/Managua')::date;
  hh := ((now() + interval '1 hour') at time zone 'America/Managua')::time;
  insert into qr_sello (negocio_id, token, nombre_actividad, fecha_expiracion) values (1, 'TOK-ACTVIGENTE', 'Actividad vigente', now() + interval '1 hour') returning id into qr;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar, solicita_sello, justificacion_sello, estado_sello, qr_sello_id, limite_canjes)
  values (1, 'Actividad vigente', 'Descripción de prueba suficientemente larga', foto, h_fin, h_fin, '00:00', hh, 'feria', 'Parque', true, 'Para visitantes', 'aprobado', qr, 5);
  r := r || E'\nC11 actividad con sello, aún vigente -> ' || pg_temp.corre(tur, $q$select canjear_qr_sello('TOK-ACTVIGENTE')::text$q$);
  r := r || E'\nC12 actividad vigente, doble canje -> ' || pg_temp.corre(tur, $q$select canjear_qr_sello('TOK-ACTVIGENTE')::text$q$);
  h_fin := ((now() - interval '1 minute') at time zone 'America/Managua')::date;
  hh := ((now() - interval '1 minute') at time zone 'America/Managua')::time;
  insert into qr_sello (negocio_id, token, nombre_actividad, fecha_expiracion) values (1, 'TOK-ACTFIN', 'Actividad que ya terminó', now() - interval '1 minute') returning id into qr;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar, solicita_sello, justificacion_sello, estado_sello, qr_sello_id, limite_canjes)
  values (1, 'Actividad que ya terminó', 'Descripción de prueba suficientemente larga', foto, h_fin, h_fin, '00:00', hh, 'feria', 'Parque', true, 'Para visitantes', 'aprobado', qr, 5);
  r := r || E'\nC13 actividad que terminó hace 1 minuto (NUEVO: debe rechazar) -> ' || pg_temp.corre(tur2, $q$select canjear_qr_sello('TOK-ACTFIN')::text$q$);
  update negocio set fecha_vencimiento_suscripcion = now() - interval '1 day' where id = 1;
  r := r || E'\nC14 suscripción vencida (negocio 1), QR vigente -> ' || pg_temp.corre(tur2, $q$select canjear_qr_sello('TOK-ACTVIGENTE')::text$q$);

  -- ===================== VERIFICACIÓN AUTOMÁTICA =====================
  esperados := array[
    'A1 normal 15:00-18:00: 1 s antes=false, justo=true, 1 s después=true',
    'A2 nocturna 7 PM a 2 AM: a las 9 PM (en curso)=false, 1 s antes de las 2 AM=false, a las 2 AM justo=true, 1 s después=true',
    'A2b nocturna: a las 12:30 AM del día siguiente (sigue)=false',
    'A3 sin hora: a las 11:59:59 PM=false, a medianoche justo=true',
    '6:00:59 AM=false, 6:01:00 AM=true',
    'A5 hora_fin igual a hora_inicio (10:00-10:00), sin cruce de día: 1 s antes=false, justo=true',
    'el 12/oct 4:59:59 PM=false, 5:00 PM=true',
    'A7 sin fecha_fin: null',
    'A8 enero 2027 (también UTC-6): 18:00 -> 2027-01-16 00:00:00',
    'B1 terminó hace 1 minuto -> no aparece',
    'B2 termina en 1 hora -> aparece',
    'B3 sin hora, termina hoy a medianoche -> aparece',
    'B4 sin hora, terminó ayer -> no aparece',
    'B6 actividad antigua sin fechas -> no aparece',
    'B7 actividad futura (dentro de 10 días) -> aparece',
    case when now() >= fin64 then 'B5 actividad 64 real -> no aparece' else 'B5 actividad 64 real -> aparece' end,
    'A6 varios días (10 al 12/oct, 9 AM a 5 PM): el 11/oct a las 6 PM (en curso)=false',
    'A6b varios días nocturna (10 al 12/oct, 7 PM a 2 AM): el 12/oct a las 8 PM (en curso)=false, el 13/oct 1:59:59 AM=false, 2:00 AM=true',
    'B9 fin_de_actividad NO es llamable por la API (visitante) -> [42501] permission denied for function fin_de_actividad',
    'B10 ni por un usuario con sesión -> [42501] permission denied for function fin_de_actividad',
    'D1 aprobada una nocturna 19:00-02:00 del 1/dic: el QR expira (UTC) = 2026-12-02 08:00:00',
    'D2 el dueño cambia la hora de fin a 3 AM -> OK | el QR expira (UTC) = 2026-12-02 09:00:00',
    'C1 sin sesión (visitante) -> {"exito": false, "mensaje": "Necesitas iniciar sesión."}',
    'C2 token que no existe -> {"exito": false, "mensaje": "Código QR no válido."}',
    'C3 negocio que ya no participa -> {"exito": false, "mensaje": "Este negocio ya no está participando en la ruta."}',
    'C4 QR suelto real (2027): primer canje -> {"exito": true, "mensaje": "¡Sello obtenido en viva mesi!"',
    'C5 mismo QR, mismo turista (doble canje) -> {"exito": false, "mensaje": "Ya canjeaste el sello de viva mesi."}',
    'C6 mismo QR, otro turista -> {"exito": true, "mensaje": "¡Sello obtenido en viva mesi!"',
    'C7 límite 1: primer turista -> {"exito": true, "mensaje": "¡Sello obtenido en Sello con límite!"',
    'C8 límite 1: segundo turista -> {"exito": false, "mensaje": "Esta actividad ya alcanzó su límite de canjes."}',
    'C9 QR suelto expirado hace 2 días -> {"exito": false, "mensaje": "Esta actividad ya expiró."}',
    'C10 QR suelto que expira a las 00:00 UTC de hoy -> {"exito": true, "mensaje": "¡Sello obtenido en Sello de hoy!"',
    'C11 actividad con sello, aún vigente -> {"exito": true, "mensaje": "¡Sello obtenido en Actividad vigente!"',
    'C12 actividad vigente, doble canje -> {"exito": false, "mensaje": "Ya canjeaste el sello de Actividad vigente."}',
    'C13 actividad que terminó hace 1 minuto (NUEVO: debe rechazar) -> {"exito": false, "mensaje": "Esta actividad ya terminó."}',
    'C14 suscripción vencida (negocio 1), QR vigente -> {"exito": false, "mensaje": "Este negocio ya no está participando en la ruta."}'
  ];
  if r is null then
    raise exception 'FALLA: el resultado quedó NULL (alguna pieza dio NULL: p. ej. falta una fila real que la prueba usa)';
  end if;
  fallas := 0;
  foreach esperado in array esperados loop
    if position(esperado in r) = 0 then
      fallas := fallas + 1;
      r := r || E'\nFALLA: no apareció «' || left(esperado, 170) || '»';
    end if;
  end loop;
  r := E'RESULTADO: ' || (array_length(esperados, 1) - fallas) || ' de ' || array_length(esperados, 1) || ' comprobaciones correctas' || case when fallas > 0 then ' (' || fallas || ' FALLAN)' else ' (todas)' end || E'\n\n' || r;
  raise exception 'ROLLBACK DE PRUEBA%', E'\n' || r;
end $test$;
