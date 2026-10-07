-- docs/migrations/036_negocio_foto_galeria.sql
--
-- Galería de fotos del negocio (sección "Fotos" de la ficha y del editor de diseño).
--
-- IMPORTANTE: la tabla public.negocio_foto YA EXISTE (id integer, negocio_id integer -> negocio.id, url, tipo, orden smallint;
-- RLS: el dueño todo, lectura pública si negocio_visible) y el panel ya sube fotos desde "Mi negocio". Esta migración la
-- EXTIENDE; no crea otra tabla ni cambia los tipos de las llaves (negocio.id es integer, no uuid).
--
--  1. creado_en timestamptz not null default now().
--  2. url validada en la base: SOLO https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/<uuid>/fotos/<archivo>
--     (archivo = empieza con letra o número, luego letras, números, . _ -; ?t=<números> opcional). Una restricción CHECK fija la
--     forma y un trigger BEFORE INSERT exige además que la carpeta sea la del DUEÑO del negocio (no se puede apuntar a archivos de otro).
--  3. Máximo 10 fotos por negocio, aplicado por el mismo trigger (con candado por negocio, para que dos subidas a la vez no lo rebasen).
--  4. orden >= 0.
--  5. Permisos: antes anon y authenticated tenían INSERT/UPDATE/DELETE por tabla y solo la RLS los frenaba. Ahora anon solo
--     lee; authenticated lee, inserta, borra y actualiza ÚNICAMENTE la columna orden (la url no se puede cambiar: se borra y se sube otra).
--     La RLS no cambia: solo el dueño escribe; lectura pública si el negocio es visible.
--  6. ordenar_fotos_negocio(negocio_id, ids[]): reordena todas las fotos de una vez y de forma atómica. Corre con los permisos de
--     quien la llama (SECURITY INVOKER: la RLS y el permiso de columna siguen valiendo) y además comprueba sesión y que sea el dueño.
--
-- El tamaño (10 MB) y el tipo (jpg, png, webp) de los archivos ya los aplica el bucket 'negocios' desde la 035.

begin;

-- -----------------------------------------------------------------------------
-- 1, 2, 4. Columna y restricciones
-- -----------------------------------------------------------------------------
alter table public.negocio_foto
    add column creado_en timestamptz not null default now();

alter table public.negocio_foto
    add constraint negocio_foto_url_valida
    check (url ~ '^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/negocios/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/fotos/[A-Za-z0-9][A-Za-z0-9._-]*(\?t=[0-9]+)?$'),
    add constraint negocio_foto_orden_no_negativo
    check (orden >= 0);

-- -----------------------------------------------------------------------------
-- 2, 3. Trigger: carpeta del dueño y máximo 10
-- -----------------------------------------------------------------------------
create or replace function public.negocio_foto_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    dueno text;
begin
    select n.usuario_id::text into dueno from public.negocio n where n.id = new.negocio_id;
    if dueno is null
       or new.url !~ ('^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/negocios/' || dueno || '/fotos/') then
        raise exception 'La foto debe estar en la carpeta de tu negocio.' using errcode = '23514';
    end if;

    -- candado por negocio: dos inserciones simultáneas no pueden pasar de 10
    perform pg_advisory_xact_lock(hashtext('negocio_foto'), new.negocio_id);
    if (select count(*) from public.negocio_foto f where f.negocio_id = new.negocio_id) >= 10 then
        raise exception 'Un negocio puede tener hasta 10 fotos.' using errcode = '23514';
    end if;

    return new;
end;
$$;

revoke execute on function public.negocio_foto_validar() from public, anon, authenticated;

create trigger negocio_foto_validar
    before insert on public.negocio_foto
    for each row execute function public.negocio_foto_validar();

-- -----------------------------------------------------------------------------
-- 5. Permisos
-- -----------------------------------------------------------------------------
revoke all on public.negocio_foto from anon, authenticated;
grant select on public.negocio_foto to anon, authenticated;
grant insert, delete on public.negocio_foto to authenticated;
grant update (orden) on public.negocio_foto to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Reordenar
-- -----------------------------------------------------------------------------
create or replace function public.ordenar_fotos_negocio(p_negocio_id integer, p_ids integer[])
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
    actuales integer[];
begin
    if auth.uid() is null then
        return jsonb_build_object('exito', false, 'mensaje', 'Inicia sesión para continuar.');
    end if;
    if not public.es_duenio_negocio(p_negocio_id) then
        return jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso sobre este negocio.');
    end if;

    select coalesce(array_agg(f.id order by f.id), '{}') into actuales
    from public.negocio_foto f where f.negocio_id = p_negocio_id;

    -- la lista debe ser exactamente las fotos del negocio, sin repetidas ni de sobra
    if p_ids is null
       or (select coalesce(array_agg(x order by x), '{}') from unnest(p_ids) x) is distinct from actuales then
        return jsonb_build_object('exito', false, 'mensaje', 'La lista de fotos no coincide con las de tu negocio.');
    end if;

    update public.negocio_foto f
       set orden = o.pos - 1
      from unnest(p_ids) with ordinality as o(id, pos)
     where f.id = o.id and f.negocio_id = p_negocio_id;

    return jsonb_build_object('exito', true, 'mensaje', 'Orden guardado.');
end;
$$;

revoke execute on function public.ordenar_fotos_negocio(integer, integer[]) from public, anon;
grant execute on function public.ordenar_fotos_negocio(integer, integer[]) to authenticated, service_role;

comment on function public.ordenar_fotos_negocio(integer, integer[]) is
    'Reordena de una vez las fotos de un negocio (solo el dueño; la lista debe ser exactamente sus fotos). 036.';

commit;
