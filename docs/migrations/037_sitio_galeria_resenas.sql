-- docs/migrations/037_sitio_galeria_resenas.sql
--
-- Galería de fotos y reseñas de los sitios turísticos.
--
--  1. Bucket 'sitios': público (las URLs se abren sin sesión), 10 MB, solo jpg/png/webp. Sin políticas de escritura en
--     storage.objects: solo se sube con la service key (el script de carga). anon solo lee, por la URL pública.
--  2. sitio_foto (id serial, sitio_id -> sitio, url, orden, es_portada, creado_en). La url solo puede ser
--     https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/sitios/<sitio_id>/galeria/<archivo> y el trigger
--     exige que el <sitio_id> de la ruta sea el mismo de la fila. Una sola portada por sitio (índice único parcial) y un
--     solo orden por sitio. anon/authenticated solo leen; escribe únicamente service_role.
--  3. resena_sitio (id uuid, sitio_id -> sitio, usuario_id -> auth.users, texto 10-1000, estrellas 1-5, creado_en). A
--     diferencia de los negocios NO pide sello: basta tener sesión. Una reseña por persona y sitio (guardar la vuelve a
--     editar). La tabla se cierra a anon/authenticated (como resena, 032): se lee con resenas_sitio_publicas, que muestra el
--     alias "Viajero" (autor_visible) y nunca el usuario_id ni el correo; se escribe con guardar_resena_sitio. El admin
--     elimina con admin_borrar_resena_sitio; el autor también puede borrar la suya con eliminar_mi_resena_sitio.
--  Funciones: resenas_sitio_publicas, resumen_resenas_sitio, guardar_resena_sitio, eliminar_mi_resena_sitio,
--  admin_resenas_sitio, admin_borrar_resena_sitio.

begin;

-- -----------------------------------------------------------------------------
-- 1. Bucket
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sitios', 'sitios', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
   set public = true,
       file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- -----------------------------------------------------------------------------
-- 2. sitio_foto
-- -----------------------------------------------------------------------------
create table public.sitio_foto (
    id          serial primary key,
    sitio_id    integer     not null references public.sitio (id) on delete cascade,
    url         text        not null,
    orden       integer     not null default 0,
    es_portada  boolean     not null default false,
    creado_en   timestamptz not null default now(),
    constraint sitio_foto_orden_no_negativo check (orden >= 0),
    constraint sitio_foto_url_valida check (
        url ~ '^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/sitios/[0-9]+/galeria/[A-Za-z0-9][A-Za-z0-9._-]*$'
    ),
    constraint sitio_foto_orden_unico unique (sitio_id, orden)
);

create unique index sitio_foto_una_portada on public.sitio_foto (sitio_id) where es_portada;
create index sitio_foto_por_sitio on public.sitio_foto (sitio_id, orden);

comment on table public.sitio_foto is
    'Galería de un sitio turístico. Bucket público sitios, ruta <sitio_id>/galeria/<archivo>. Una portada por sitio. Solo la escribe service_role (037).';

create or replace function public.sitio_foto_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.url !~ ('^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/sitios/' || new.sitio_id::text || '/galeria/') then
        raise exception 'La foto debe estar en la carpeta de su sitio.' using errcode = '23514';
    end if;
    return new;
end;
$$;

revoke execute on function public.sitio_foto_validar() from public, anon, authenticated;

create trigger sitio_foto_validar
    before insert or update of url, sitio_id on public.sitio_foto
    for each row execute function public.sitio_foto_validar();

alter table public.sitio_foto enable row level security;

create policy sitio_foto_lectura_publica on public.sitio_foto
    for select to anon, authenticated using (true);

revoke all on public.sitio_foto from anon, authenticated;
grant select on public.sitio_foto to anon, authenticated;
grant all on public.sitio_foto to service_role;
grant usage, select on sequence public.sitio_foto_id_seq to service_role;

-- -----------------------------------------------------------------------------
-- 3. resena_sitio
-- -----------------------------------------------------------------------------
create table public.resena_sitio (
    id          uuid        primary key default gen_random_uuid(),
    sitio_id    integer     not null references public.sitio (id) on delete cascade,
    usuario_id  uuid        not null references auth.users (id) on delete cascade,
    texto       text        not null,
    estrellas   integer     not null,
    creado_en   timestamptz not null default now(),
    constraint resena_sitio_estrellas_validas check (estrellas between 1 and 5),
    constraint resena_sitio_texto_valido check (char_length(texto) between 10 and 1000),
    constraint resena_sitio_una_por_persona unique (sitio_id, usuario_id)
);

create index resena_sitio_por_sitio on public.resena_sitio (sitio_id, creado_en desc);

comment on table public.resena_sitio is
    'Reseñas de sitios turísticos. Cualquier usuario con sesión, una por sitio, sin sello. Solo por funciones SECURITY DEFINER (037).';

alter table public.resena_sitio enable row level security;
-- Sin políticas ni permisos de tabla para anon/authenticated: todo pasa por las funciones.
revoke all on public.resena_sitio from anon, authenticated;
grant all on public.resena_sitio to service_role;

create or replace function public.resenas_sitio_publicas(p_sitio_id integer)
returns table (
    id        uuid,
    autor     text,
    estrellas smallint,
    texto     text,
    fecha     timestamptz,
    es_mia    boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select r.id,
           public.autor_visible(r.usuario_id),
           r.estrellas::smallint,
           r.texto,
           r.creado_en,
           (auth.uid() is not null and r.usuario_id = auth.uid())
    from public.resena_sitio r
    where r.sitio_id = p_sitio_id
    order by r.creado_en desc, r.id desc;
$$;

comment on function public.resenas_sitio_publicas(integer) is
    'Reseñas de un sitio, más recientes primero, con el alias del autor (nunca usuario_id ni correo) y es_mia (037).';

revoke execute on function public.resenas_sitio_publicas(integer) from public;
grant execute on function public.resenas_sitio_publicas(integer) to anon, authenticated, service_role;

create or replace function public.resumen_resenas_sitio(p_sitio_id integer)
returns table (
    promedio numeric,
    total    bigint,
    uno      bigint,
    dos      bigint,
    tres     bigint,
    cuatro   bigint,
    cinco    bigint
)
language sql
stable
security definer
set search_path = ''
as $$
    select round(avg(r.estrellas)::numeric, 1),
           count(*),
           count(*) filter (where r.estrellas = 1),
           count(*) filter (where r.estrellas = 2),
           count(*) filter (where r.estrellas = 3),
           count(*) filter (where r.estrellas = 4),
           count(*) filter (where r.estrellas = 5)
    from public.resena_sitio r
    where r.sitio_id = p_sitio_id;
$$;

comment on function public.resumen_resenas_sitio(integer) is
    'Promedio (1 decimal, null sin reseñas), total y cuántas hay de cada calificación de un sitio (037).';

revoke execute on function public.resumen_resenas_sitio(integer) from public;
grant execute on function public.resumen_resenas_sitio(integer) to anon, authenticated, service_role;

create or replace function public.guardar_resena_sitio(p_sitio_id integer, p_estrellas integer, p_texto text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid   uuid := auth.uid();
    v_texto text := btrim(coalesce(p_texto, ''));
    v_id    uuid;
    v_nueva boolean;
begin
    if v_uid is null then
        return jsonb_build_object('exito', false, 'mensaje', 'Necesitas iniciar sesión.');
    end if;
    if p_estrellas is null or p_estrellas < 1 or p_estrellas > 5 then
        return jsonb_build_object('exito', false, 'mensaje', 'Elige de 1 a 5 estrellas.');
    end if;
    if char_length(v_texto) < 10 then
        return jsonb_build_object('exito', false, 'mensaje', 'Escribe un comentario de al menos 10 caracteres.');
    end if;
    if char_length(v_texto) > 1000 then
        return jsonb_build_object('exito', false, 'mensaje', 'El comentario puede tener hasta 1000 caracteres.');
    end if;
    if not exists (select 1 from public.sitio s where s.id = p_sitio_id) then
        return jsonb_build_object('exito', false, 'mensaje', 'Este sitio no existe.');
    end if;

    insert into public.resena_sitio (sitio_id, usuario_id, estrellas, texto)
    values (p_sitio_id, v_uid, p_estrellas, v_texto)
    on conflict (sitio_id, usuario_id)
    do update set estrellas = excluded.estrellas, texto = excluded.texto
    returning id, (xmax = 0) into v_id, v_nueva;

    return jsonb_build_object(
        'exito', true,
        'mensaje', case when v_nueva then 'Gracias por tu reseña.' else 'Tu reseña se actualizó.' end,
        'id', v_id,
        'editada', not v_nueva
    );
end;
$$;

comment on function public.guardar_resena_sitio(integer, integer, text) is
    'Crea o edita la reseña de quien llama: sesión, 1-5 estrellas, texto de 10 a 1000 y sitio existente. No pide sello (037).';

revoke execute on function public.guardar_resena_sitio(integer, integer, text) from public, anon;
grant execute on function public.guardar_resena_sitio(integer, integer, text) to authenticated, service_role;

create or replace function public.eliminar_mi_resena_sitio(p_sitio_id integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
    if auth.uid() is null then
        return jsonb_build_object('exito', false, 'mensaje', 'Necesitas iniciar sesión.');
    end if;
    delete from public.resena_sitio where sitio_id = p_sitio_id and usuario_id = auth.uid();
    if not found then
        return jsonb_build_object('exito', false, 'mensaje', 'No tienes una reseña en este sitio.');
    end if;
    return jsonb_build_object('exito', true, 'mensaje', 'Reseña eliminada.');
end;
$$;

comment on function public.eliminar_mi_resena_sitio(integer) is
    'El autor borra su propia reseña de un sitio (037).';

revoke execute on function public.eliminar_mi_resena_sitio(integer) from public, anon;
grant execute on function public.eliminar_mi_resena_sitio(integer) to authenticated, service_role;

create or replace function public.admin_resenas_sitio()
returns table (
    id        uuid,
    sitio_id  integer,
    sitio     text,
    autor     text,
    estrellas smallint,
    texto     text,
    fecha     timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select r.id, r.sitio_id, s.nombre, public.autor_visible(r.usuario_id),
           r.estrellas::smallint, r.texto, r.creado_en
    from public.resena_sitio r
    join public.sitio s on s.id = r.sitio_id
    where exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'admin')
    order by r.creado_en desc, r.id desc;
$$;

comment on function public.admin_resenas_sitio() is
    'Solo admin: todas las reseñas de sitios con el nombre del sitio. Para cualquier otro usuario devuelve vacío (037).';

revoke execute on function public.admin_resenas_sitio() from public, anon;
grant execute on function public.admin_resenas_sitio() to authenticated, service_role;

create or replace function public.admin_borrar_resena_sitio(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'admin') then
        return jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso para esto.');
    end if;
    delete from public.resena_sitio where id = p_id;
    if not found then
        return jsonb_build_object('exito', false, 'mensaje', 'La reseña ya no existe.');
    end if;
    return jsonb_build_object('exito', true, 'mensaje', 'Reseña eliminada.');
end;
$$;

comment on function public.admin_borrar_resena_sitio(uuid) is
    'Solo admin: elimina una reseña de sitio (037).';

revoke execute on function public.admin_borrar_resena_sitio(uuid) from public, anon;
grant execute on function public.admin_borrar_resena_sitio(uuid) to authenticated, service_role;

commit;
