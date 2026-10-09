-- docs/migrations/028_campos_actividades_y_eventos.sql
--
-- Campos nuevos, todos opcionales, para el rediseño de actividades y eventos.
--
-- 1. actividad_negocio: categoria, lugar, hora_inicio/hora_fin (las dos o ninguna, sin exigir
--    orden para permitir eventos nocturnos), eslogan, detalles y etiquetas.
-- 2. evento (los cargados a mano): categoria, hora_inicio/hora_fin, eslogan, detalles y
--    etiquetas, con las mismas reglas. Sigue siendo de solo lectura pública (021).
-- 3. actividades_negocio_publicas(): devuelve las columnas nuevas. Cambian las columnas que
--    devuelve, así que se borra y se vuelve a crear (create or replace no puede, como en 026).
--    NO devuelve justificacion_sello, motivo_rechazo_sello ni limite_canjes.
-- 4. Sin backfill: las filas existentes quedan en NULL.
--
-- Validaciones: CHECK en cada columna. Las de etiquetas (máximo 6, cada una de 1 a 24
-- caracteres, sin duplicados) llevan una subconsulta por elemento, que un CHECK no admite
-- directamente: van en la función IMMUTABLE etiquetas_validas(). Sin duplicados = sin repetir
-- ignorando mayúsculas y espacios en los extremos ("Café" y "café " son la misma etiqueta).
--
-- Permisos como en 026: el dueño inserta y actualiza las columnas nuevas de actividad_negocio
-- (la lectura ya es de tabla completa para authenticated desde 021); anon no recibe nada.
-- evento no cambia de permisos: sigue siendo solo SELECT.

begin;

-- -----------------------------------------------------------------------------
-- 0. Validación de etiquetas
-- -----------------------------------------------------------------------------
create function public.etiquetas_validas(p_etiquetas text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
    select p_etiquetas is null or (
        -- una sola dimensión ('{}' no tiene dimensiones y vale)
        (cardinality(p_etiquetas) = 0 or array_ndims(p_etiquetas) = 1)
        and cardinality(p_etiquetas) <= 6
        -- ninguna nula, vacía ni de más de 24 caracteres
        and not exists (
            select 1 from unnest(p_etiquetas) as e
            where e is null or char_length(btrim(e)) < 1 or char_length(e) > 24
        )
        -- sin repetidas
        and (select count(distinct lower(btrim(e))) from unnest(p_etiquetas) as e)
            = cardinality(p_etiquetas)
    );
$$;

comment on function public.etiquetas_validas(text[]) is
    'true si el arreglo es NULL o tiene máximo 6 etiquetas de 1 a 24 caracteres, sin repetir (ignora mayúsculas y espacios en los extremos). Para los CHECK de actividad_negocio y evento (028).';

-- -----------------------------------------------------------------------------
-- 1. actividad_negocio
-- -----------------------------------------------------------------------------
alter table public.actividad_negocio
    add column categoria    text,
    add column lugar        text,
    add column hora_inicio  time,
    add column hora_fin     time,
    add column eslogan      text,
    add column detalles     text,
    add column etiquetas    text[];

alter table public.actividad_negocio
    add constraint actividad_categoria_valida
        check (categoria is null or categoria in
               ('gastronomia', 'cultura', 'folklore', 'musica', 'artesania', 'feria', 'taller', 'otro')),
    add constraint actividad_lugar_max
        check (lugar is null or char_length(lugar) <= 60),
    add constraint actividad_horas_ambas_o_ninguna
        check ((hora_inicio is null) = (hora_fin is null)),
    add constraint actividad_eslogan_max
        check (eslogan is null or char_length(eslogan) <= 80),
    add constraint actividad_detalles_max
        check (detalles is null or char_length(detalles) <= 1000),
    add constraint actividad_etiquetas_validas
        check (public.etiquetas_validas(etiquetas));

comment on column public.actividad_negocio.categoria is
    'gastronomia | cultura | folklore | musica | artesania | feria | taller | otro. NULL = sin categoría (028).';
comment on column public.actividad_negocio.lugar is
    'Lugar donde ocurre, hasta 60 caracteres (028).';
comment on column public.actividad_negocio.hora_inicio is
    'Hora de inicio. Va junto con hora_fin; no se exige orden (un evento nocturno termina "antes" de lo que empezó) (028).';
comment on column public.actividad_negocio.eslogan is
    'Frase corta, hasta 80 caracteres (028).';
comment on column public.actividad_negocio.detalles is
    'Detalles de la actividad, hasta 1000 caracteres (028).';
comment on column public.actividad_negocio.etiquetas is
    'Hasta 6 etiquetas de 1 a 24 caracteres, sin repetir (028).';

grant insert (categoria, lugar, hora_inicio, hora_fin, eslogan, detalles, etiquetas)
    on public.actividad_negocio to authenticated;
grant update (categoria, lugar, hora_inicio, hora_fin, eslogan, detalles, etiquetas)
    on public.actividad_negocio to authenticated;

-- -----------------------------------------------------------------------------
-- 2. evento (cargados a mano; solo lectura pública, sin cambios de permisos)
-- -----------------------------------------------------------------------------
alter table public.evento
    add column categoria    text,
    add column hora_inicio  time,
    add column hora_fin     time,
    add column eslogan      text,
    add column detalles     text,
    add column etiquetas    text[];

alter table public.evento
    add constraint evento_categoria_valida
        check (categoria is null or categoria in
               ('gastronomia', 'cultura', 'folklore', 'musica', 'artesania', 'feria', 'taller', 'otro')),
    add constraint evento_horas_ambas_o_ninguna
        check ((hora_inicio is null) = (hora_fin is null)),
    add constraint evento_eslogan_max
        check (eslogan is null or char_length(eslogan) <= 80),
    add constraint evento_detalles_max
        check (detalles is null or char_length(detalles) <= 1000),
    add constraint evento_etiquetas_validas
        check (public.etiquetas_validas(etiquetas));

comment on column public.evento.categoria is
    'gastronomia | cultura | folklore | musica | artesania | feria | taller | otro. NULL = sin categoría (028).';
comment on column public.evento.hora_inicio is
    'Hora de inicio. Va junto con hora_fin; no se exige orden (028).';
comment on column public.evento.eslogan is
    'Frase corta, hasta 80 caracteres (028).';
comment on column public.evento.detalles is
    'Detalles del evento, hasta 1000 caracteres (028).';
comment on column public.evento.etiquetas is
    'Hasta 6 etiquetas de 1 a 24 caracteres, sin repetir (028).';

-- -----------------------------------------------------------------------------
-- 3. actividades_negocio_publicas(): + columnas nuevas
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
    'Lectura pública de actividad_negocio: solo con fechas y negocio visible, sin justificacion_sello, motivo_rechazo_sello ni limite_canjes. Incluye foto_url (026) y los campos de 028.';

revoke execute on function public.actividades_negocio_publicas() from public;
grant execute on function public.actividades_negocio_publicas() to anon, authenticated, service_role;

commit;
