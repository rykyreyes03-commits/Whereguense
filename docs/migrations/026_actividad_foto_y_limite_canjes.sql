-- docs/migrations/026_actividad_foto_y_limite_canjes.sql
--
-- Foto y límite de canjes en las actividades de negocio.
--
-- 1. actividad_negocio.foto_url (URL de la foto en el bucket 'negocios', como las fotos
--    del negocio) y actividad_negocio.limite_canjes (null = sin límite; entre 1 y 200).
--    foto_url debe ser https y de máximo 500 caracteres: se muestra a todos los turistas
--    y no se acepta javascript:, data: ni otros esquemas.
-- 2. El dueño puede escribir las dos columnas (insert/update), como el resto de los
--    datos de la actividad. Con el sello ya aprobado el límite no se puede cambiar:
--    el qr_sello ya se creó con el límite aprobado y quedarían distintos.
-- 3. admin_aprobar_sello (025) crea el qr_sello con el límite de la actividad (antes lo
--    creaba siempre sin límite). Sin límite en la actividad, el QR queda sin límite.
-- 4. actividades_negocio_publicas() (023) devuelve también foto_url (pública, igual que
--    nombre y descripción). El límite de canjes no se expone. Cambian las columnas que
--    devuelve, así que se borra y se vuelve a crear (create or replace no puede).

begin;

-- -----------------------------------------------------------------------------
-- 1. Columnas y restricciones
-- -----------------------------------------------------------------------------
alter table public.actividad_negocio
    add column foto_url       text,
    add column limite_canjes  integer;

alter table public.actividad_negocio
    add constraint actividad_foto_url_https
        check (foto_url is null or (foto_url ~ '^https://' and char_length(foto_url) <= 500)),
    add constraint actividad_limite_canjes_rango
        check (limite_canjes is null or limite_canjes between 1 and 200);

comment on column public.actividad_negocio.foto_url is
    'Foto de la actividad (URL pública en el bucket "negocios"). NULL = sin foto. 026.';
comment on column public.actividad_negocio.limite_canjes is
    'Canjes permitidos del sello de la actividad (1 a 200). NULL = sin límite. Se copia al qr_sello al aprobar. 026.';

-- -----------------------------------------------------------------------------
-- 2. Permisos del dueño (SELECT ya es de tabla completa para authenticated, 021)
-- -----------------------------------------------------------------------------
grant insert (foto_url, limite_canjes) on public.actividad_negocio to authenticated;
grant update (foto_url, limite_canjes) on public.actividad_negocio to authenticated;

-- Trigger de 021 + el límite no cambia con el sello aprobado.
create or replace function public.actividad_negocio_estado_sello()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Las funciones de admin / evento (SECURITY DEFINER) corren como postgres y pasan.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado_sello := case when new.solicita_sello then 'pendiente' else 'no_solicitado' end;
    new.qr_sello_id := null;
    new.motivo_rechazo_sello := null;
    new.evento_id := null;
    return new;
  end if;

  -- UPDATE: columnas de admin/evento siempre se conservan.
  new.estado_sello := old.estado_sello;
  new.qr_sello_id := old.qr_sello_id;
  new.motivo_rechazo_sello := old.motivo_rechazo_sello;
  new.evento_id := old.evento_id;

  if old.estado_sello = 'aprobado' then
    if new.solicita_sello is distinct from old.solicita_sello then
      raise exception 'Esta actividad ya tiene un sello aprobado.' using errcode = '42501';
    end if;
    if new.limite_canjes is distinct from old.limite_canjes then
      raise exception 'Esta actividad ya tiene un sello aprobado: el límite de canjes no se puede cambiar.' using errcode = '42501';
    end if;
  elsif new.solicita_sello and not old.solicita_sello then
    -- Pide sello por primera vez (o de nuevo tras retirarlo).
    new.estado_sello := 'pendiente';
    new.motivo_rechazo_sello := null;
  elsif not new.solicita_sello and old.solicita_sello then
    -- Retira la solicitud (pendiente o rechazada).
    new.estado_sello := 'no_solicitado';
    new.motivo_rechazo_sello := null;
  elsif new.solicita_sello and old.estado_sello = 'rechazado'
        and new.justificacion_sello is distinct from old.justificacion_sello then
    -- Re-solicita tras un rechazo, con una justificación nueva.
    new.estado_sello := 'pendiente';
    new.motivo_rechazo_sello := null;
  end if;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. admin_aprobar_sello: el QR hereda el límite de canjes (cuerpo de 025 + límite)
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

  -- El admin no aprueba el sello de su propio negocio (025).
  IF public.es_duenio_negocio(v_act.negocio_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No puedes aprobar el sello de tu propio negocio.');
  END IF;

  IF NOT v_act.solicita_sello OR v_act.estado_sello <> 'pendiente' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad no tiene una solicitud de sello pendiente.');
  END IF;

  -- Mismo token que crear_actividad_qr (008). Vence con la actividad, si tiene fechas.
  -- limite_canjes (026): el de la actividad; NULL = sin límite.
  INSERT INTO qr_sello (negocio_id, token, nombre_actividad, limite_canjes, fecha_expiracion)
  VALUES (v_act.negocio_id,
          upper(replace(gen_random_uuid()::text, '-', '')),
          v_act.nombre,
          v_act.limite_canjes,
          v_act.fecha_fin::timestamptz)
  RETURNING id INTO v_qr_id;

  UPDATE actividad_negocio
  SET estado_sello = 'aprobado', qr_sello_id = v_qr_id, motivo_rechazo_sello = NULL
  WHERE id = p_actividad_id;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Sello aprobado.', 'qr_sello_id', v_qr_id);
END;
$function$;

comment on function public.admin_aprobar_sello(bigint) is
    'Aprueba la solicitud de sello de una actividad pendiente: crea el qr_sello (con el límite de canjes de la actividad) y lo vincula. Solo rol=admin y nunca sobre su propio negocio (021, 025, 026).';

revoke execute on function public.admin_aprobar_sello(bigint) from public, anon;
grant execute on function public.admin_aprobar_sello(bigint) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. actividades_negocio_publicas(): + foto_url
-- -----------------------------------------------------------------------------
drop function public.actividades_negocio_publicas();

create function public.actividades_negocio_publicas()
returns table (
    id              bigint,
    negocio_id      integer,
    nombre          text,
    descripcion     text,
    foto_url        text,
    fecha_inicio    date,
    fecha_fin       date,
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
        a.fecha_inicio,
        a.fecha_fin,
        a.solicita_sello,
        a.estado_sello,
        a.qr_sello_id,
        a.evento_id,
        a.fecha_creacion
    from public.actividad_negocio a
    where a.fecha_inicio is not null
      and a.fecha_fin is not null
      and public.negocio_visible(a.negocio_id)
    order by a.fecha_inicio, a.id;
$$;

comment on function public.actividades_negocio_publicas() is
    'Lectura pública de actividad_negocio: solo con fechas y negocio visible, sin justificacion_sello, motivo_rechazo_sello ni limite_canjes. Incluye foto_url (023, 026).';

revoke execute on function public.actividades_negocio_publicas() from public;
grant execute on function public.actividades_negocio_publicas() to anon, authenticated, service_role;

commit;
