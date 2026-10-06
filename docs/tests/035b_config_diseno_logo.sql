-- docs/tests/035b_config_diseno_logo.sql
--
-- Prueba con ROLLBACK de la migración 035b (logo_url en config_diseno). Se pega entera en UNA sola llamada de SQL: ayudas
-- temporales, el cuerpo de la migración (sin begin/commit) y un bloque DO. Termina SIEMPRE con raise exception: no se guarda
-- nada. El mensaje trae "RESULTADO: N de N comprobaciones correctas" y una línea por comprobación.
-- Huellas de datos reales: docs/tests/035b_huellas_antes.txt / _despues.txt.

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

-- ----- cuerpo de la migración 035b -----
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
        elsif k = 'whatsapp' then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[0-9]{8,15}$' then return false; end if;
            end if;
        elsif k = 'secciones_visibles' then
            if jsonb_typeof(v) <> 'array' then return false; end if;
            n := jsonb_array_length(v);
            if n > 5 then return false; end if;
            if exists (
                select 1 from jsonb_array_elements(v) e
                where jsonb_typeof(e) <> 'string'
                   or not ((e #>> '{}') = any (array['horarios', 'productos', 'fotos', 'actividades', 'resenas']))
            ) then
                return false;
            end if;
            if (select count(distinct e #>> '{}') from jsonb_array_elements(v) e) <> n then
                return false;
            end if;
        else
            return false;   -- ninguna otra clave
        end if;
    end loop;

    return true;
end;
$$;

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

  -- logo_url válidos
  insert into pr values (1, 'logo propio .jpg', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/logo_2.jpg"}', base, u2)), 'OK');
  insert into pr values (2, 'logo propio .webp con ?t=', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/logo_2.webp?t=1791329876738"}', base, u2)), 'OK');
  insert into pr values (3, 'logo null', pg_temp.upd(u2, 2, '{"logo_url":null}'), 'OK');
  insert into pr values (4, 'el logo que ya tiene el negocio 2 (logo.jpeg?t=...) también pasa',
    pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/logo.jpeg?t=1791329876738"}', base, u2)), 'OK');
  insert into pr values (5, 'logo y portada juntos, con las demás claves', pg_temp.upd(u2, 2,
    format('{"paleta":"verde","letra":"moderna","logo_url":"%s%s/logo_2.png","portada_url":"%s%s/portada_2.jpg","whatsapp":"87074097","secciones_visibles":["fotos","horarios"],"layout_productos":"lista"}', base, u2, base, u2)), 'OK');

  -- logo_url inválidos
  insert into pr values (10, 'logo http', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/l.jpg"}', replace(base, 'https', 'http'), u2)), '[23514]');
  insert into pr values (11, 'logo de otro host', pg_temp.upd(u2, 2, format('{"logo_url":"https://evil.example.com/storage/v1/object/public/negocios/%s/l.jpg"}', u2)), '[23514]');
  insert into pr values (12, 'logo de otro bucket', pg_temp.upd(u2, 2, format('{"logo_url":"https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/otro/%s/l.jpg"}', u2)), '[23514]');
  insert into pr values (13, 'logo en la carpeta de otro usuario', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/l.jpg"}', base, u1)), '[23514]');
  insert into pr values (14, 'logo sin carpeta de usuario', pg_temp.upd(u2, 2, format('{"logo_url":"%sl.jpg"}', base)), '[23514]');
  insert into pr values (15, 'logo con ..', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/../%s/l.jpg"}', base, u2, u1)), '[23514]');
  insert into pr values (16, 'logo con parámetros extra', pg_temp.upd(u2, 2, format('{"logo_url":"%s%s/l.jpg?x=1&y=2"}', base, u2)), '[23514]');
  insert into pr values (17, 'logo es un número', pg_temp.upd(u2, 2, '{"logo_url":5}'), '[23514]');
  insert into pr values (18, 'logo es un arreglo', pg_temp.upd(u2, 2, '{"logo_url":["x"]}'), '[23514]');
  insert into pr values (19, 'logo texto libre', pg_temp.upd(u2, 2, '{"logo_url":"mi logo"}'), '[23514]');

  -- lo de la 035 sigue igual
  insert into pr values (30, 'portada propia sigue pasando', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/portada_2.jpg"}', base, u2)), 'OK');
  insert into pr values (31, 'portada de otro usuario sigue rechazada', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/p.jpg"}', base, u1)), '[23514]');
  insert into pr values (32, 'clave desconocida sigue rechazada', pg_temp.upd(u2, 2, '{"logo":"x"}'), '[23514]');
  insert into pr values (33, 'whatsapp de 7 dígitos sigue rechazado', pg_temp.upd(u2, 2, '{"whatsapp":"8707409"}'), '[23514]');
  insert into pr values (34, 'paleta fuera de la lista sigue rechazada', pg_temp.upd(u2, 2, '{"paleta":"rosa"}'), '[23514]');
  insert into pr values (35, 'secciones repetidas siguen rechazadas', pg_temp.upd(u2, 2, '{"secciones_visibles":["fotos","fotos"]}'), '[23514]');
  insert into pr values (36, '{} sigue válido', pg_temp.upd(u2, 2, '{}'), 'OK');

  -- quién escribe
  select config_diseno into cfg_antes from public.negocio where id = 2;
  insert into pr values (40, 'otra cuenta no puede poner logo en el negocio 2 (RLS: no cambia nada)',
    pg_temp.upd(otro, 2, format('{"logo_url":"%s%s/l.jpg"}', base, otro)) || ' | ' || (select (config_diseno = cfg_antes)::text from public.negocio where id = 2), 'OK | true');
  insert into pr values (41, 'el dueño del negocio 1 no puede poner logo en el negocio 2',
    pg_temp.upd(u1, 2, format('{"logo_url":"%s%s/l.jpg"}', base, u1)) || ' | ' || (select (config_diseno = cfg_antes)::text from public.negocio where id = 2), 'OK | true');
  insert into pr values (42, 'anon no puede escribir', pg_temp.upd(null, 2, format('{"logo_url":"%s%s/l.jpg"}', base, u2)), '[42501]');
  insert into pr values (43, 'permisos de la función: anon=false authenticated=true',
    has_function_privilege('anon', 'public.config_diseno_valido(jsonb,uuid)', 'execute')::text || '/' ||
    has_function_privilege('authenticated', 'public.config_diseno_valido(jsonb,uuid)', 'execute')::text, 'false/true');
  insert into pr values (44, 'la restricción CHECK de la 035 sigue en su sitio',
    (select count(*)::text from pg_constraint where conrelid = 'public.negocio'::regclass and conname = 'negocio_config_diseno_valido'), '1');

  for res in select format('%s %s -> %s', lpad(n::text, 2, '0'), nombre,
                   case when position(esperado in obtenido) = 1 then 'OK' else 'FALLA (obtuvo: ' || left(obtenido, 140) || ')' end)
             from pr order by n loop
    total := total + 1;
    if res like '%FALLA%' then fallas := fallas + 1; end if;
    r := r || res || E'\n';
  end loop;

  raise exception 'ROLLBACK DE PRUEBA%', E'\nRESULTADO: ' || (total - fallas) || ' de ' || total || ' comprobaciones correctas' || case when fallas > 0 then ' (' || fallas || ' FALLAN)' else ' (todas)' end || case when fallas > 0 then E'\n\n' || r else '' end;
end $test$;
