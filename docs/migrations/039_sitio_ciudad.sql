-- docs/migrations/039_sitio_ciudad.sql
--
-- Ciudad de cada sitio (el pasaporte se organiza por ciudades: León, Managua, Granada, Masaya, Matagalpa, Estelí, Chinandega).
-- Todos los sitios actuales son de León. Solo ALTER TABLE y UPDATE: no cambia permisos ni políticas (sitio sigue siendo de lectura
-- pública y escritura solo para service_role/postgres, porque la RLS de sitio solo tiene la política de SELECT).
--
-- Sin CHECK a propósito: las ciudades nuevas se agregan con solo cargar sus sitios.

begin;

alter table public.sitio
    add column ciudad text not null default 'León';

update public.sitio set ciudad = 'León';

comment on column public.sitio.ciudad is
    'Ciudad del sitio, para agrupar el pasaporte por ciudades. Todos los sitios actuales son de León (039).';

commit;
