-- docs/migrations/040_usuario_datos_registro_rollback.sql
--
-- Deshace la migración 040: quita las políticas del bucket 'perfiles', las restricciones y las tres columnas nuevas
-- (fecha_nacimiento, telefono, genero). foto_perfil_url NO se borra (ya existía antes de la 040); solo pierde su restricción.
--
-- OJO: se pierden los datos guardados en esas tres columnas. El bucket 'perfiles' se vacía y se borra desde el panel de
-- Supabase (Storage) o con la API de Storage: Supabase no permite borrar buckets ni archivos con SQL directo.

alter table public.usuario
    drop constraint if exists usuario_foto_perfil_url_valida,
    drop constraint if exists usuario_genero_valido,
    drop constraint if exists usuario_telefono_valido,
    drop constraint if exists usuario_fecha_nacimiento_valida;

alter table public.usuario
    drop column if exists genero,
    drop column if exists telefono,
    drop column if exists fecha_nacimiento;

drop policy if exists perfiles_delete_propio on storage.objects;
drop policy if exists perfiles_update_propio on storage.objects;
drop policy if exists perfiles_insert_propio on storage.objects;
drop policy if exists perfiles_select_publico on storage.objects;
