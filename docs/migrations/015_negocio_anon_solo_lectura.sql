-- docs/migrations/015_negocio_anon_solo_lectura.sql
--
-- Segunda capa de protección en negocio para visitantes sin sesión (anon).
--
-- anon tenía todos los permisos de tabla (relacl: anon=arwdDxtm). No podía
-- escribir de verdad porque ninguna política RLS de negocio le permite
-- INSERT/UPDATE/DELETE (insert -> "new row violates row-level security policy";
-- update/delete -> 0 filas afectadas). Esta migración quita el permiso de tabla
-- subyacente para no depender solo de RLS.
--
-- Se revoca también TRUNCATE: RLS no se aplica a TRUNCATE. Hoy no es alcanzable
-- por la API (PostgREST no lo expone), pero anon no tiene por qué tenerlo.
--
-- Se mantiene SELECT: el mapa de visitantes sin sesión lee los negocios activos
-- (la política negocio_select_activo_o_duenio sigue filtrando por estado).

begin;

revoke insert, update, delete, truncate on public.negocio from anon;

-- Confirmación
do $$
begin
  if has_table_privilege('anon', 'public.negocio', 'INSERT')
     or has_table_privilege('anon', 'public.negocio', 'UPDATE')
     or has_table_privilege('anon', 'public.negocio', 'DELETE')
     or has_table_privilege('anon', 'public.negocio', 'TRUNCATE') then
    raise exception 'anon todavía tiene permisos de escritura sobre negocio';
  end if;
  if not has_table_privilege('anon', 'public.negocio', 'SELECT') then
    raise exception 'anon perdió el SELECT sobre negocio: el mapa sin sesión dejaría de funcionar';
  end if;
end;
$$;

commit;
