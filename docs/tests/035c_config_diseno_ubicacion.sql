-- docs/tests/035c_config_diseno_ubicacion.sql
--
-- Prueba con ROLLBACK de la migración 035c ('ubicacion' en secciones_visibles). Se pega entera en UNA sola llamada de SQL: ayudas
-- temporales, el cuerpo de la migración (sin begin/commit) y un bloque DO. Termina SIEMPRE con raise exception: no se guarda nada.
-- El mensaje trae "RESULTADO: N de N comprobaciones correctas". Se puede correr antes o después de aplicar la 035c (el cuerpo es idempotente).
-- Huellas de datos reales: docs/tests/035c_huellas_antes.txt / _despues.txt.

create function pg_temp.como(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
  if u is null then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
end $f$;

create function pg_temp.corre(u uuid, q text) returns text language plpgsql as $f$
declare res text;
begin
  execute 'reset role';
  perform pg_temp.como(u);
  begin
    if q ~* '^\s*select' then execute q into res; else execute q; res := 'OK'; end if;
    execute 'reset role';
    return coalesce(res, 'OK');
  exception when others then
    execute 'reset role';
    return '[' || sqlstate || '] ' || sqlerrm;
  end;
end $f$;

-- ----- cuerpo de la migración 035c -----
create or replace function public.config_diseno_valido(cfg jsonb, dueno uuid)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
    k text;
    v jsonb;
    n int;
begin
    if cfg is null or jsonb_typeof(cfg) <> 'object' then
        return false;
    end if;

    for k, v in select * from jsonb_each(cfg) loop
        if k = 'paleta' then
            if jsonb_typeof(v) <> 'string'
               or not ((v #>> '{}') = any (array['azul_marino', 'terracota', 'azul', 'verde', 'rojo', 'dorado', 'teal', 'magenta'])) then
                return false;
            end if;
        elsif k = 'letra' then
            if jsonb_typeof(v) <> 'string' or not ((v #>> '{}') = any (array['clasica', 'elegante', 'moderna'])) then
                return false;
            end if;
        elsif k = 'layout_productos' then
            if jsonb_typeof(v) <> 'string' or not ((v #>> '{}') = any (array['cuadricula', 'lista'])) then
                return false;
            end if;
        elsif k in ('portada_url', 'logo_url') then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' then return false; end if;
                if (v #>> '{}') !~ ('^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/negocios/'
                                    || dueno::text || '/[A-Za-z0-9][A-Za-z0-9._-]*(\?t=[0-9]+)?$') then
                    return false;
                end if;
            end if;
        elsif k = 'descripcion' then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') > 300 then return false; end if;
            end if;
        elsif k = 'whatsapp' then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[0-9]{8,15}$' then return false; end if;
            end if;
        elsif k = 'secciones_visibles' then
            if jsonb_typeof(v) <> 'array' then return false; end if;
            n := jsonb_array_length(v);
            if n > 6 then return false; end if;
            if exists (
                select 1 from jsonb_array_elements(v) e
                where jsonb_typeof(e) <> 'string'
                   or not ((e #>> '{}') = any (array['horarios', 'productos', 'fotos', 'actividades', 'resenas', 'ubicacion']))
            ) then
                return false;
            end if;
            if (select count(distinct e #>> '{}') from jsonb_array_elements(v) e) <> n then
                return false;
            end if;
        else
            return false;
        end if;
    end loop;

    return true;
end;
$$;

alter table public.negocio alter column config_diseno set default
    '{"paleta":"azul_marino","letra":"clasica","layout_productos":"cuadricula","secciones_visibles":["horarios","productos","fotos","actividades","resenas","ubicacion"]}'::jsonb;

-- ----- comprobaciones -----
do $test$
declare
  u2 uuid;
  u1 uuid;
  otro uuid;
  base text := 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/';
  r text := '';
  fallas int := 0;
  total int := 0;
  res text;
  cfg_antes jsonb;
begin
  select usuario_id into u2 from public.negocio where id = 2;
  select usuario_id into u1 from public.negocio where id = 1;
  select id into otro from public.usuario where id not in (select usuario_id from public.negocio) order by id limit 1;

  create function pg_temp.upd(u uuid, nid int, cfg text) returns text language sql as
    $f$ select pg_temp.corre(u, format('update public.negocio set config_diseno = %L::jsonb where id = %s', cfg, nid)) $f$;

  create temp table pr(n int, nombre text, obtenido text, esperado text) on commit drop;

  -- ===== ubicacion en secciones_visibles =====
  insert into pr values (1, 'solo ubicacion', pg_temp.upd(u2, 2, '{"secciones_visibles":["ubicacion"]}'), 'OK');
  insert into pr values (2, 'las seis secciones, con la ubicacion al final', pg_temp.upd(u2, 2, '{"secciones_visibles":["horarios","productos","fotos","actividades","resenas","ubicacion"]}'), 'OK');
  insert into pr values (3, 'las seis en otro orden (ubicacion primero)', pg_temp.upd(u2, 2, '{"secciones_visibles":["ubicacion","resenas","actividades","fotos","productos","horarios"]}'), 'OK');
  insert into pr values (4, 'la lista de cinco de antes sigue valiendo', pg_temp.upd(u2, 2, '{"secciones_visibles":["horarios","productos","fotos","actividades","resenas"]}'), 'OK');
  insert into pr values (5, 'lista vacía (todo oculto)', pg_temp.upd(u2, 2, '{"secciones_visibles":[]}'), 'OK');
  insert into pr values (6, 'siete elementos se rechazan', pg_temp.upd(u2, 2, '{"secciones_visibles":["horarios","productos","fotos","actividades","resenas","ubicacion","horarios"]}'), '[23514]');
  insert into pr values (7, 'ubicacion repetida se rechaza', pg_temp.upd(u2, 2, '{"secciones_visibles":["ubicacion","ubicacion"]}'), '[23514]');
  insert into pr values (8, 'sección desconocida (mapa) se rechaza', pg_temp.upd(u2, 2, '{"secciones_visibles":["mapa"]}'), '[23514]');
  insert into pr values (9, 'sección con mayúscula (Ubicacion) se rechaza', pg_temp.upd(u2, 2, '{"secciones_visibles":["Ubicacion"]}'), '[23514]');
  insert into pr values (10, 'sección con tilde (ubicación) se rechaza', pg_temp.upd(u2, 2, '{"secciones_visibles":["ubicación"]}'), '[23514]');
  insert into pr values (11, 'elemento que no es texto se rechaza', pg_temp.upd(u2, 2, '{"secciones_visibles":[1]}'), '[23514]');
  insert into pr values (12, 'no es un arreglo se rechaza', pg_temp.upd(u2, 2, '{"secciones_visibles":"ubicacion"}'), '[23514]');

  -- ===== defaults =====
  insert into pr values (20, 'el default de la columna incluye las seis secciones',
    (select (replace(column_default, ' ', '') ilike '%["horarios","productos","fotos","actividades","resenas","ubicacion"]%')::text
       from information_schema.columns where table_schema='public' and table_name='negocio' and column_name='config_diseno'), 'true');
  insert into pr values (21, 'el JSON por defecto pasa la validación',
    public.config_diseno_valido('{"paleta":"azul_marino","letra":"clasica","layout_productos":"cuadricula","secciones_visibles":["horarios","productos","fotos","actividades","resenas","ubicacion"]}'::jsonb, u2)::text, 'true');

  -- ===== el resto de la 035/035b no se movió =====
  insert into pr values (30, 'logo propio pasa', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/logo_2.png"}', base, u2)), 'OK');
  insert into pr values (31, 'logo de otro usuario se rechaza', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/l.png"}', base, u1)), '[23514]');
  insert into pr values (32, 'portada propia pasa', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/portada_2.jpg"}', base, u2)), 'OK');
  insert into pr values (33, 'descripcion de 300 pasa', pg_temp.upd(u2, 2, jsonb_build_object('descripcion', repeat('a', 300))::text), 'OK');
  insert into pr values (34, 'descripcion de 301 se rechaza', pg_temp.upd(u2, 2, jsonb_build_object('descripcion', repeat('a', 301))::text), '[23514]');
  insert into pr values (35, 'whatsapp de 7 dígitos se rechaza', pg_temp.upd(u2, 2, '{"whatsapp":"8707409"}'), '[23514]');
  insert into pr values (36, 'paleta fuera de la lista se rechaza', pg_temp.upd(u2, 2, '{"paleta":"rosa"}'), '[23514]');
  insert into pr values (37, 'clave desconocida se rechaza', pg_temp.upd(u2, 2, '{"mapa":"x"}'), '[23514]');
  insert into pr values (38, 'todas las claves juntas (nueve) con las seis secciones', pg_temp.upd(u2, 2,
    format('{"paleta":"rojo","letra":"elegante","logo_url":"%s%s/logo_2.png","portada_url":null,"descripcion":"Hola","whatsapp":"87074097","secciones_visibles":["horarios","productos","fotos","actividades","resenas","ubicacion"],"layout_productos":"cuadricula"}', base, u2)), 'OK');
  insert into pr values (39, '{} sigue válido', pg_temp.upd(u2, 2, '{}'), 'OK');

  -- ===== quién escribe y quién lee =====
  select config_diseno into cfg_antes from public.negocio where id = 2;
  insert into pr values (40, 'otra cuenta no puede cambiar las secciones del negocio 2 (RLS: no cambia nada)',
    pg_temp.upd(otro, 2, '{"secciones_visibles":["ubicacion"]}') || ' | ' || (select (config_diseno = cfg_antes)::text from public.negocio where id = 2), 'OK | true');
  insert into pr values (41, 'el dueño del negocio 1 no puede cambiar el negocio 2',
    pg_temp.upd(u1, 2, '{"secciones_visibles":["ubicacion"]}') || ' | ' || (select (config_diseno = cfg_antes)::text from public.negocio where id = 2), 'OK | true');
  insert into pr values (42, 'anon no puede escribir', pg_temp.upd(null, 2, '{"secciones_visibles":["ubicacion"]}'), '[42501]');
  insert into pr values (43, 'anon lee las coordenadas de un negocio visible (la ficha pública): negocio 2',
    pg_temp.corre(null, 'select (latitud is not null and longitud is not null)::text from public.negocio where id = 2'), 'true');
  insert into pr values (44, 'anon NO ve las coordenadas de un negocio rechazado',
    pg_temp.corre(null, 'select count(*)::text from public.negocio where id = 3'), '0');
  insert into pr values (45, 'los datos de coordenadas no cambiaron (lat/lon del negocio 2)',
    (select (latitud::text = '12.4355375908998' and longitud::text = '-86.8805694580078')::text from public.negocio where id = 2), 'true');
  insert into pr values (46, 'la función sigue sin ser ejecutable por anon (authenticated sí)',
    has_function_privilege('anon', 'public.config_diseno_valido(jsonb,uuid)', 'execute')::text || '/' || has_function_privilege('authenticated', 'public.config_diseno_valido(jsonb,uuid)', 'execute')::text, 'false/true');
  insert into pr values (47, 'la restricción CHECK sigue en su sitio',
    (select count(*)::text from pg_constraint where conrelid = 'public.negocio'::regclass and conname = 'negocio_config_diseno_valido'), '1');

  for res in select format('%s %s -> %s', lpad(n::text, 2, '0'), nombre,
                   case when position(esperado in obtenido) = 1 then 'OK' else 'FALLA (obtuvo: ' || left(obtenido, 160) || ')' end)
             from pr order by n loop
    total := total + 1;
    if res like '%FALLA%' then fallas := fallas + 1; end if;
    r := r || res || E'\n';
  end loop;

  raise exception 'ROLLBACK DE PRUEBA%', E'\nRESULTADO: ' || (total - fallas) || ' de ' || total || ' comprobaciones correctas' || case when fallas > 0 then ' (' || fallas || ' FALLAN)' else ' (todas)' end || case when fallas > 0 then E'\n\n' || r else '' end;
end $test$;
