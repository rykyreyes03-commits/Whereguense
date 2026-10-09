-- docs/migrations/040_usuario_datos_registro.sql
--
-- Datos nuevos del registro del turista (cuaderno de pasaporte): fecha de nacimiento, teléfono, género y foto de perfil.
--
--  1. public.usuario.fecha_nacimiento date, telefono text, genero text. Los tres son opcionales en la base (los usuarios que ya
--     existen no los tienen); la app los pide como obligatorios (fecha) u opcionales (teléfono, género).
--     La columna foto_perfil_url YA EXISTÍA: no se crea otra.
--  2. Validación en la base (CHECK, así no depende del frontend):
--       fecha_nacimiento  entre 1900-01-01 y hoy
--       telefono          "+<código de 1 a 4 dígitos> <número de 4 a 14 dígitos o espacios>", ej. "+505 8888 8888"
--       genero            masculino | femenino | prefiero_no_decir
--       foto_perfil_url   null, o https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/perfiles/<id del propio usuario>/perfil.jpg
--                         (?t=<números> opcional): solo el bucket 'perfiles' y SOLO la carpeta de la propia persona.
--  3. Bucket 'perfiles' (público para leer, como 'negocios' y 'sitios'): 2 MB por archivo y solo image/jpeg, image/png, image/webp.
--     Políticas: cualquiera lee; cada persona con sesión sube, cambia y borra SOLO dentro de su carpeta <uid>/.
--
-- Quién lee y quién escribe no cambia: la política usuario_all_owner (solo la propia fila) ya cubre las columnas nuevas, y el
-- trigger usuario_proteger_rol sigue impidiendo cambiar el rol. Las columnas nuevas no se exponen en ninguna función pública.
-- Deshacer: docs/migrations/040_usuario_datos_registro_rollback.sql

-- -----------------------------------------------------------------------------
-- 1 y 2. Columnas y restricciones
-- -----------------------------------------------------------------------------
alter table public.usuario
    add column fecha_nacimiento date,
    add column telefono text,
    add column genero text;

alter table public.usuario
    add constraint usuario_fecha_nacimiento_valida
    check (fecha_nacimiento is null or (fecha_nacimiento >= date '1900-01-01' and fecha_nacimiento <= current_date)),
    add constraint usuario_telefono_valido
    check (telefono is null or telefono ~ '^\+[0-9]{1,4} [0-9 ]{3,13}[0-9]$'),
    add constraint usuario_genero_valido
    check (genero is null or genero in ('masculino', 'femenino', 'prefiero_no_decir')),
    add constraint usuario_foto_perfil_url_valida
    check (foto_perfil_url is null
           or foto_perfil_url ~ ('^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/perfiles/' || id::text || '/perfil\.jpg(\?t=[0-9]+)?$'));

comment on column public.usuario.fecha_nacimiento is 'Fecha de nacimiento (040). Entre 1900-01-01 y hoy.';
comment on column public.usuario.telefono is 'Teléfono con código de país, ej. "+505 8888 8888" (040).';
comment on column public.usuario.genero is 'masculino | femenino | prefiero_no_decir (040).';

-- -----------------------------------------------------------------------------
-- 3. Bucket 'perfiles'
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perfiles', 'perfiles', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
    set public = true,
        file_size_limit = 2097152,
        allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy perfiles_select_publico on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'perfiles');

create policy perfiles_insert_propio on storage.objects
    for insert to authenticated
    with check (bucket_id = 'perfiles' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy perfiles_update_propio on storage.objects
    for update to authenticated
    using (bucket_id = 'perfiles' and (storage.foldername(name))[1] = (auth.uid())::text);

create policy perfiles_delete_propio on storage.objects
    for delete to authenticated
    using (bucket_id = 'perfiles' and (storage.foldername(name))[1] = (auth.uid())::text);
