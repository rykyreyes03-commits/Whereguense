-- docs/tests/035_config_diseno_bucket_un_plan.sql
--
-- Prueba con ROLLBACK de la migración 035. Se pega entera en UNA sola llamada de SQL: ayudas temporales, foto de lo que lee la
-- landing como anon ANTES, el cuerpo de la migración (idéntico a docs/migrations/035_*.sql, sin begin/commit) y un bloque DO
-- que prueba esquema, permisos, plan único y bucket. Termina SIEMPRE con raise exception: no se guarda nada, ni la migración.
-- El mensaje trae "RESULTADO: N de N comprobaciones correctas" y una línea por comprobación.
-- Se puede correr antes o después de aplicar la 035. Huellas de datos reales: docs/tests/035_huellas_antes.txt / _despues.txt.

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

create function pg_temp.landing() returns text language plpgsql as $f$
declare r text := ''; t text;
begin
  foreach t in array array['evento','sitio','ruta','ruta_sitio','insignia','nivel','rango','categoria_avatar','pieza_avatar','negocio','negocio_foto','negocio_horario','producto'] loop
    r := r || t || '=' || pg_temp.corre(null, 'select count(*)::text from public.' || t) || ' ';
  end loop;
  r := r || 'actividades=' || pg_temp.corre(null, 'select count(*)::text from public.actividades_negocio_publicas()') || ' ';
  r := r || 'resenas1=' || pg_temp.corre(null, 'select count(*)::text from public.resenas_publicas(1)') || ' ';
  r := r || 'cfg=' || pg_temp.corre(null, 'select count(config_diseno)::text from public.negocio');
  return r;
end $f$;

create temp table antes as select pg_temp.landing() as v;

-- ----- cuerpo de la migración 035 -----
-- -----------------------------------------------------------------------------
-- 1. Un solo plan
-- -----------------------------------------------------------------------------
drop trigger if exists negocio_validar_config_diseno on public.negocio;
drop function if exists public.negocio_validar_config_diseno();

update public.negocio set nivel_suscripcion = 'profesional' where nivel_suscripcion <> 'profesional';
alter table public.negocio alter column nivel_suscripcion set default 'profesional';

comment on column public.negocio.nivel_suscripcion is
    'Siempre profesional: hay un solo plan (035). Se conserva la columna; solo la cambian funciones de admin.';

-- -----------------------------------------------------------------------------
-- 2. config_diseno
-- -----------------------------------------------------------------------------
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
        elsif k = 'portada_url' then
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

-- La restricción CHECK se evalúa con los permisos de quien escribe: el dueño (authenticated) necesita EXECUTE.
-- Es pura (solo mira el JSON y el uuid que recibe), no toca tablas.
revoke execute on function public.config_diseno_valido(jsonb, uuid) from public, anon;
grant execute on function public.config_diseno_valido(jsonb, uuid) to authenticated, service_role;

comment on function public.config_diseno_valido(jsonb, uuid) is
    'Esquema cerrado de negocio.config_diseno (035). La usa la restricción CHECK negocio_config_diseno_valido.';

alter table public.negocio
    add constraint negocio_config_diseno_valido
    check (public.config_diseno_valido(config_diseno, usuario_id));

alter table public.negocio alter column config_diseno set default
    '{"paleta":"azul_marino","letra":"clasica","layout_productos":"cuadricula","secciones_visibles":["horarios","productos","fotos","actividades","resenas"]}'::jsonb;

-- -----------------------------------------------------------------------------
-- 3. Bucket 'negocios'
-- -----------------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'negocios';


-- ----- comprobaciones -----
do $test$
declare
  u2 uuid;      -- dueño del negocio 2 (activo)
  u1 uuid;      -- dueño del negocio 1 (activo)
  otro uuid;    -- una cuenta que no es dueña de ningún negocio
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

  -- ===== Plan único =====
  insert into pr values (1, 'el trigger negocio_validar_config_diseno ya no existe',
    (select count(*)::text from pg_trigger where tgrelid = 'public.negocio'::regclass and tgname = 'negocio_validar_config_diseno'), '0');
  insert into pr values (2, 'la función del trigger ya no existe',
    (select count(*)::text from pg_proc where proname = 'negocio_validar_config_diseno'), '0');
  insert into pr values (3, 'ningún negocio queda en basico',
    (select count(*)::text from public.negocio where nivel_suscripcion <> 'profesional'), '0');
  insert into pr values (4, 'el default de nivel_suscripcion es profesional',
    (select column_default from information_schema.columns where table_schema='public' and table_name='negocio' and column_name='nivel_suscripcion'), '''profesional''::text');

  -- ===== Bucket =====
  insert into pr values (5, 'bucket negocios: límite 10 MB',
    (select file_size_limit::text from storage.buckets where id = 'negocios'), '10485760');
  insert into pr values (6, 'bucket negocios: solo jpg, png, webp',
    (select array_to_string(array(select unnest(allowed_mime_types) order by 1), ',') from storage.buckets where id = 'negocios'), 'image/jpeg,image/png,image/webp');

  -- ===== Esquema: válidos (el dueño del negocio 2 guarda en su propia fila) =====
  insert into pr values (10, 'defaults completos',
    pg_temp.upd(u2, 2, '{"paleta":"azul_marino","letra":"clasica","layout_productos":"cuadricula","secciones_visibles":["horarios","productos","fotos","actividades","resenas"]}'), 'OK');
  insert into pr values (11, 'vacío {} sigue válido', pg_temp.upd(u2, 2, '{}'), 'OK');
  insert into pr values (12, 'paleta terracota', pg_temp.upd(u2, 2, '{"paleta":"terracota"}'), 'OK');
  insert into pr values (13, 'paleta magenta + letra elegante + lista', pg_temp.upd(u2, 2, '{"paleta":"magenta","letra":"elegante","layout_productos":"lista"}'), 'OK');
  insert into pr values (14, 'letra moderna', pg_temp.upd(u2, 2, '{"letra":"moderna"}'), 'OK');
  insert into pr values (15, 'portada propia', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/portada_2.jpg"}', base, u2)), 'OK');
  insert into pr values (16, 'portada propia con ?t=', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/portada_2.webp?t=1788493466057"}', base, u2)), 'OK');
  insert into pr values (17, 'portada null', pg_temp.upd(u2, 2, '{"portada_url":null}'), 'OK');
  insert into pr values (18, 'whatsapp de 8 dígitos', pg_temp.upd(u2, 2, '{"whatsapp":"87074097"}'), 'OK');
  insert into pr values (19, 'whatsapp de 15 dígitos', pg_temp.upd(u2, 2, '{"whatsapp":"505870740970000"}'), 'OK');
  insert into pr values (20, 'whatsapp null', pg_temp.upd(u2, 2, '{"whatsapp":null}'), 'OK');
  insert into pr values (21, 'secciones reordenadas y con menos', pg_temp.upd(u2, 2, '{"secciones_visibles":["resenas","horarios"]}'), 'OK');
  insert into pr values (22, 'secciones vacías (todo oculto)', pg_temp.upd(u2, 2, '{"secciones_visibles":[]}'), 'OK');

  -- ===== Esquema: inválidos (23514 = viola la restricción) =====
  insert into pr values (30, 'paleta fuera de la lista', pg_temp.upd(u2, 2, '{"paleta":"rosa"}'), '[23514]');
  insert into pr values (31, 'paleta como color libre', pg_temp.upd(u2, 2, '{"paleta":"#ff0000"}'), '[23514]');
  insert into pr values (32, 'paleta número', pg_temp.upd(u2, 2, '{"paleta":1}'), '[23514]');
  insert into pr values (33, 'letra fuera de la lista', pg_temp.upd(u2, 2, '{"letra":"comic"}'), '[23514]');
  insert into pr values (34, 'layout fuera de la lista', pg_temp.upd(u2, 2, '{"layout_productos":"grid"}'), '[23514]');
  insert into pr values (35, 'clave desconocida', pg_temp.upd(u2, 2, '{"color_libre":"x"}'), '[23514]');
  insert into pr values (36, 'clave de la 020 ya no existe (estilo_tarjetas)', pg_temp.upd(u2, 2, '{"estilo_tarjetas":"x"}'), '[23514]');
  insert into pr values (37, 'portada http (no https)', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/p.jpg"}', replace(base, 'https', 'http'), u2)), '[23514]');
  insert into pr values (38, 'portada de otro host', pg_temp.upd(u2, 2, format('{"portada_url":"https://evil.example.com/storage/v1/object/public/negocios/%s/p.jpg"}', u2)), '[23514]');
  insert into pr values (39, 'portada de otro bucket', pg_temp.upd(u2, 2, format('{"portada_url":"https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/otro/%s/p.jpg"}', u2)), '[23514]');
  insert into pr values (40, 'portada en la carpeta de otro usuario', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/p.jpg"}', base, u1)), '[23514]');
  insert into pr values (41, 'portada sin carpeta de usuario', pg_temp.upd(u2, 2, format('{"portada_url":"%sp.jpg"}', base)), '[23514]');
  insert into pr values (42, 'portada con .. para saltar de carpeta', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/../%s/p.jpg"}', base, u2, u1)), '[23514]');
  insert into pr values (43, 'portada con parámetros extra', pg_temp.upd(u2, 2, format('{"portada_url":"%s%s/p.jpg?x=1&y=2"}', base, u2)), '[23514]');
  insert into pr values (44, 'portada es un número', pg_temp.upd(u2, 2, '{"portada_url":5}'), '[23514]');
  insert into pr values (45, 'whatsapp de 7 dígitos', pg_temp.upd(u2, 2, '{"whatsapp":"8707409"}'), '[23514]');
  insert into pr values (46, 'whatsapp de 16 dígitos', pg_temp.upd(u2, 2, '{"whatsapp":"5058707409700000"}'), '[23514]');
  insert into pr values (47, 'whatsapp con +', pg_temp.upd(u2, 2, '{"whatsapp":"+50587074097"}'), '[23514]');
  insert into pr values (48, 'whatsapp con espacios', pg_temp.upd(u2, 2, '{"whatsapp":"8707 4097"}'), '[23514]');
  insert into pr values (49, 'whatsapp con letras', pg_temp.upd(u2, 2, '{"whatsapp":"8707409a"}'), '[23514]');
  insert into pr values (50, 'whatsapp como número', pg_temp.upd(u2, 2, '{"whatsapp":87074097}'), '[23514]');
  insert into pr values (51, 'secciones con valor desconocido', pg_temp.upd(u2, 2, '{"secciones_visibles":["horarios","tienda"]}'), '[23514]');
  insert into pr values (52, 'secciones repetidas', pg_temp.upd(u2, 2, '{"secciones_visibles":["horarios","horarios"]}'), '[23514]');
  insert into pr values (53, 'secciones: 6 elementos', pg_temp.upd(u2, 2, '{"secciones_visibles":["horarios","productos","fotos","actividades","resenas","horarios"]}'), '[23514]');
  insert into pr values (54, 'secciones no es arreglo', pg_temp.upd(u2, 2, '{"secciones_visibles":"horarios"}'), '[23514]');
  insert into pr values (55, 'secciones con elemento no texto', pg_temp.upd(u2, 2, '{"secciones_visibles":[1]}'), '[23514]');
  insert into pr values (56, 'config que no es objeto (arreglo)', pg_temp.upd(u2, 2, '[]'), '[23514]');

  -- ===== Quién lee y quién escribe =====
  select config_diseno into cfg_antes from public.negocio where id = 2;
  insert into pr values (60, 'otra cuenta intenta escribir el diseño del negocio 2: no cambia nada (RLS)',
    pg_temp.upd(otro, 2, '{"paleta":"rojo"}') || ' | ' || (select (config_diseno = cfg_antes)::text from public.negocio where id = 2), 'OK | true');
  insert into pr values (61, 'el dueño del negocio 1 intenta escribir el negocio 2: no cambia nada',
    pg_temp.upd(u1, 2, '{"paleta":"rojo"}') || ' | ' || (select (config_diseno = cfg_antes)::text from public.negocio where id = 2), 'OK | true');
  insert into pr values (62, 'anon no puede escribir', pg_temp.upd(null, 2, '{"paleta":"rojo"}'), '[42501]');
  insert into pr values (63, 'anon lee config_diseno de negocios visibles (la ficha pública)',
    pg_temp.corre(null, 'select count(config_diseno)::text from public.negocio where id in (1, 2)'), '2');
  insert into pr values (64, 'anon NO ve el negocio rechazado (RLS)',
    pg_temp.corre(null, 'select count(*)::text from public.negocio where id = 3'), '0');
  insert into pr values (65, 'el dueño no puede cambiar su nivel (sin permiso de columna)',
    pg_temp.corre(u2, 'update public.negocio set nivel_suscripcion = ''basico'' where id = 2'), '[42501]');
  insert into pr values (66, 'el dueño sigue pudiendo editar su perfil',
    pg_temp.corre(u2, 'update public.negocio set descripcion = descripcion where id = 2'), 'OK');

  -- ===== Un solo plan: un negocio en basico (puesto a mano) ya no está limitado =====
  update public.negocio set nivel_suscripcion = 'basico' where id = 2;
  insert into pr values (70, 'negocio en basico guarda paleta y secciones sin bloqueo',
    pg_temp.upd(u2, 2, '{"paleta":"verde","secciones_visibles":["fotos"]}'), 'OK');
  update public.negocio set nivel_suscripcion = 'profesional' where id = 2;

  -- ===== Defaults para negocios nuevos =====
  insert into pr values (81, 'default: paleta azul_marino, letra clasica, cuadricula, 5 secciones',
    (select (replace(column_default, ' ', '') ilike '%"paleta":"azul_marino"%' and replace(column_default, ' ', '') ilike '%"letra":"clasica"%'
             and replace(column_default, ' ', '') ilike '%"layout_productos":"cuadricula"%'
             and replace(column_default, ' ', '') ilike '%["horarios","productos","fotos","actividades","resenas"]%')::text
       from information_schema.columns where table_schema='public' and table_name='negocio' and column_name='config_diseno'), 'true');
  insert into pr values (82, 'el JSON por defecto pasa la validación',
    public.config_diseno_valido('{"paleta":"azul_marino","letra":"clasica","layout_productos":"cuadricula","secciones_visibles":["horarios","productos","fotos","actividades","resenas"]}'::jsonb, u2)::text, 'true');

  -- ===== La landing sigue igual =====
  insert into pr values (90, 'la landing (anon) lee lo mismo que antes',
    (pg_temp.landing() = (select v from antes))::text, 'true');
  insert into pr values (91, 'la función del CHECK: anon=false authenticated=true',
    has_function_privilege('anon', 'public.config_diseno_valido(jsonb,uuid)', 'execute')::text || '/' ||
    has_function_privilege('authenticated', 'public.config_diseno_valido(jsonb,uuid)', 'execute')::text, 'false/true');

  for res in select format('%s %s -> %s', lpad(n::text, 2, '0'), nombre,
                   case when position(esperado in obtenido) = 1 then 'OK' else 'FALLA (obtuvo: ' || left(obtenido, 140) || ')' end)
             from pr order by n loop
    total := total + 1;
    if res like '%FALLA%' then fallas := fallas + 1; end if;
    r := r || res || E'\n';
  end loop;

  raise exception 'ROLLBACK DE PRUEBA%', E'\nRESULTADO: ' || (total - fallas) || ' de ' || total || ' comprobaciones correctas' || case when fallas > 0 then ' (' || fallas || ' FALLAN)' else ' (todas)' end || E'\n\n' || r;
end $test$;
