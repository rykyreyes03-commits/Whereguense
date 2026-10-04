-- docs/migrations/029_categoria_otro_y_obligatorios.sql
--
-- 1. "Otro" con texto: actividad_negocio y evento ganan categoria_otro (máximo 40 caracteres).
--    Es obligatorio y no vacío solo si categoria = 'otro'; en cualquier otro caso es NULL.
--    Las filas que ya tienen categoria = 'otro' (una de prueba: actividad 64) reciben el texto
--    'Otro', que es lo que la app mostraba hasta ahora; sin eso el CHECK no se podría validar.
-- 2. Datos obligatorios al CREAR una actividad: trigger BEFORE INSERT (no UPDATE, para no romper
--    el reenvío de sellos rechazados ni las filas viejas, que quedan como están). Exige nombre,
--    categoría (y su texto si es "otro", por el CHECK de arriba), descripción de al menos 20
--    caracteres, foto, fechas, horas y lugar; y, si pide sello, la justificación y el límite de
--    canjes. Opcionales: eslogan, detalles y etiquetas.
-- 3. actividades_negocio_publicas(): borrada y recreada con categoria_otro (cambian las columnas
--    que devuelve, como en 026 y 028). Sigue sin devolver justificacion_sello, motivo_rechazo_sello
--    ni limite_canjes.
--
-- negocio.categoria NO cambia: es texto libre (sin CHECK) y nada depende de sus valores. Al elegir
-- "Otro" en el registro o en el perfil, la app guarda el texto escrito en esa misma columna; el
-- límite de 40 caracteres de ese texto es solo de la interfaz.

begin;

-- -----------------------------------------------------------------------------
-- 1. categoria_otro
-- -----------------------------------------------------------------------------
alter table public.actividad_negocio add column categoria_otro text;
alter table public.evento            add column categoria_otro text;

-- Filas que ya dicen 'otro': conservan lo que se veía ("Otro").
update public.actividad_negocio set categoria_otro = 'Otro' where categoria = 'otro' and categoria_otro is null;
update public.evento            set categoria_otro = 'Otro' where categoria = 'otro' and categoria_otro is null;

alter table public.actividad_negocio
    add constraint actividad_categoria_otro_coherente
        check (
            (categoria is distinct from 'otro' and categoria_otro is null)
            or (categoria = 'otro'
                and categoria_otro is not null
                and char_length(btrim(categoria_otro)) >= 1
                and char_length(categoria_otro) <= 40)
        );

alter table public.evento
    add constraint evento_categoria_otro_coherente
        check (
            (categoria is distinct from 'otro' and categoria_otro is null)
            or (categoria = 'otro'
                and categoria_otro is not null
                and char_length(btrim(categoria_otro)) >= 1
                and char_length(categoria_otro) <= 40)
        );

comment on column public.actividad_negocio.categoria_otro is
    'Texto de "¿Cuál?" cuando categoria = ''otro'' (1 a 40 caracteres). NULL en cualquier otro caso (029).';
comment on column public.evento.categoria_otro is
    'Texto de "¿Cuál?" cuando categoria = ''otro'' (1 a 40 caracteres). NULL en cualquier otro caso (029).';

grant insert (categoria_otro) on public.actividad_negocio to authenticated;
grant update (categoria_otro) on public.actividad_negocio to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Obligatorios al crear una actividad
-- -----------------------------------------------------------------------------
create function public.actividad_negocio_exigir_obligatorios()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_faltan text[] := '{}';
begin
  if new.categoria is null then
    v_faltan := array_append(v_faltan, 'categoría');
  end if;
  if char_length(btrim(coalesce(new.descripcion, ''))) < 20 then
    v_faltan := array_append(v_faltan, 'descripción (mínimo 20 caracteres)');
  end if;
  if new.foto_url is null then
    v_faltan := array_append(v_faltan, 'foto');
  end if;
  if new.fecha_inicio is null or new.fecha_fin is null then
    v_faltan := array_append(v_faltan, 'fechas');
  end if;
  if new.hora_inicio is null or new.hora_fin is null then
    v_faltan := array_append(v_faltan, 'horas');
  end if;
  if char_length(btrim(coalesce(new.lugar, ''))) < 1 then
    v_faltan := array_append(v_faltan, 'lugar');
  end if;
  if new.solicita_sello then
    if char_length(btrim(coalesce(new.justificacion_sello, ''))) < 1 then
      v_faltan := array_append(v_faltan, 'justificación del sello');
    end if;
    if new.limite_canjes is null then
      v_faltan := array_append(v_faltan, 'límite de canjes del sello');
    end if;
  end if;

  if cardinality(v_faltan) > 0 then
    raise exception 'Faltan datos obligatorios de la actividad: %.', array_to_string(v_faltan, ', ')
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.actividad_negocio_exigir_obligatorios() is
    'BEFORE INSERT en actividad_negocio: exige los datos obligatorios de una actividad nueva. No corre en UPDATE (029).';

create trigger actividad_negocio_exigir_obligatorios
    before insert on public.actividad_negocio
    for each row execute function public.actividad_negocio_exigir_obligatorios();

-- -----------------------------------------------------------------------------
-- 3. actividades_negocio_publicas(): + categoria_otro
-- -----------------------------------------------------------------------------
drop function public.actividades_negocio_publicas();

create function public.actividades_negocio_publicas()
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
      and public.negocio_visible(a.negocio_id)
    order by a.fecha_inicio, a.id;
$$;

comment on function public.actividades_negocio_publicas() is
    'Lectura pública de actividad_negocio: solo con fechas y negocio visible, sin justificacion_sello, motivo_rechazo_sello ni limite_canjes. Incluye foto_url (026), los campos de 028 y categoria_otro (029).';

revoke execute on function public.actividades_negocio_publicas() from public;
grant execute on function public.actividades_negocio_publicas() to anon, authenticated, service_role;

commit;
