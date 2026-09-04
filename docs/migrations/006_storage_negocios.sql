-- =============================================================================
-- Wheregüense — Migración 006: logo_url en negocio + bucket de Storage
-- =============================================================================
-- Depende de: 001_schema_inicial.sql (tabla negocio) + 002_rls_policies.sql.
-- Motor: PostgreSQL 15 (Supabase). Ejecutar desde el SQL Editor de Supabase.
--
-- Agrega:
--   1. negocio.logo_url (text nullable) — URL pública del logo en Storage.
--   2. Bucket público 'negocios' para logos y fotos de negocio.
--   3. Políticas de storage.objects: lectura libre; escritura solo en la
--      carpeta propia del usuario (primer segmento del path = auth.uid()).
--
-- Convención de rutas dentro del bucket:  <auth.uid()>/logo.png
--                                         <auth.uid()>/foto-1.jpg  etc.
--
-- Idempotente: add column if not exists / on conflict do nothing /
-- drop policy if exists.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Columna logo_url
-- -----------------------------------------------------------------------------
alter table public.negocio add column if not exists logo_url text;

comment on column public.negocio.logo_url is
    'URL pública del logo en el bucket de Storage "negocios". NULL = sin logo.';

-- -----------------------------------------------------------------------------
-- 2. Bucket público 'negocios'
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('negocios', 'negocios', true)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Políticas sobre storage.objects para el bucket 'negocios'
--    (storage.objects ya tiene RLS habilitado por defecto en Supabase)
-- -----------------------------------------------------------------------------

-- LECTURA: pública (bucket público) — cualquiera puede ver logos/fotos.
drop policy if exists negocios_select_publico on storage.objects;
create policy negocios_select_publico on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'negocios');

-- ALTA: solo dentro de tu propia carpeta (<auth.uid()>/...).
drop policy if exists negocios_insert_propio on storage.objects;
create policy negocios_insert_propio on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'negocios'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- EDICIÓN: idem, solo tu carpeta.
drop policy if exists negocios_update_propio on storage.objects;
create policy negocios_update_propio on storage.objects
    for update to authenticated
    using (
        bucket_id = 'negocios'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- BORRADO: idem, solo tu carpeta.
drop policy if exists negocios_delete_propio on storage.objects;
create policy negocios_delete_propio on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'negocios'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

commit;


-- =============================================================================
-- Verificación (correr tras el commit, cada bloque por separado si querés)
-- =============================================================================
-- a) La columna:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'negocio' and column_name = 'logo_url';
-- -> esperado: logo_url | text | YES
--
-- b) El bucket:
-- select id, name, public from storage.buckets where id = 'negocios';
-- -> esperado: negocios | negocios | true
--
-- c) Las políticas del bucket:
-- select policyname, cmd, roles
-- from pg_policies
-- where schemaname = 'storage' and tablename = 'objects'
--   and policyname like 'negocios_%'
-- order by policyname;
-- -> esperado 4 filas:
--    negocios_delete_propio | DELETE | {authenticated}
--    negocios_insert_propio | INSERT | {authenticated}
--    negocios_select_publico| SELECT | {anon,authenticated}
--    negocios_update_propio | UPDATE | {authenticated}
-- =============================================================================
