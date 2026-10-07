-- docs/tests/036_negocio_foto_galeria.sql
--
-- Prueba con ROLLBACK de la migración 036 (galería de fotos del negocio). Se pega entera en UNA sola llamada de SQL: ayudas
-- temporales, el cuerpo de la migración (sin begin/commit) y un bloque DO. Termina SIEMPRE con raise exception: no se guarda nada.
-- El mensaje trae "RESULTADO: N de N comprobaciones correctas" (y, si algo falla, una línea por comprobación).
-- Se puede correr antes o después de aplicar la 036 (el cuerpo es idempotente solo si no está aplicada: después de aplicarla,
-- quitar la sección "cuerpo de la migración" y correr el resto).
-- Huellas de datos reales: docs/tests/036_huellas_antes.txt / _despues.txt.

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

-- ----- cuerpo de la migración 036 -----
alter table public.negocio_foto
    add column creado_en timestamptz not null default now();

alter table public.negocio_foto
    add constraint negocio_foto_url_valida
    check (url ~ '^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/negocios/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/fotos/[A-Za-z0-9][A-Za-z0-9._-]*(\?t=[0-9]+)?$'),
    add constraint negocio_foto_orden_no_negativo
    check (orden >= 0);

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

revoke all on public.negocio_foto from anon, authenticated;
grant select on public.negocio_foto to anon, authenticated;
grant insert, delete on public.negocio_foto to authenticated;
grant update (orden) on public.negocio_foto to authenticated;

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

-- ----- comprobaciones -----
do $test$
declare
  u2 uuid;      -- dueño del negocio 2 (activo, sin fotos)
  u1 uuid;      -- dueño del negocio 1 (activo, 1 foto real)
  u3 uuid;      -- dueño del negocio 3 (rechazado)
  otro uuid;    -- cuenta sin negocio
  base text := 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/';
  r text := '';
  fallas int := 0;
  total int := 0;
  res text;
  i int;
  ids int[];
  ids_inv int[];
  conteo_antes int;
begin
  select usuario_id into u2 from public.negocio where id = 2;
  select usuario_id into u1 from public.negocio where id = 1;
  select usuario_id into u3 from public.negocio where id = 3;
  select id into otro from public.usuario where id not in (select usuario_id from public.negocio) order by id limit 1;

  create function pg_temp.ins(u uuid, nid int, url text, ord int default 0) returns text language sql as
    $f$ select pg_temp.corre(u, format('insert into public.negocio_foto (negocio_id, url, orden) values (%s, %L, %s)', nid, url, ord)) $f$;

  create temp table pr(n int, nombre text, obtenido text, esperado text) on commit drop;

  -- ===== existente =====
  insert into pr values (1, 'la foto real del negocio 1 sigue igual (id 3, orden 2, png)',
    (select count(*)::text from public.negocio_foto where id = 3 and orden = 2 and tipo = 'exterior' and url like '%/fotos/1788493473714.png'), '1');
  insert into pr values (2, 'la columna creado_en existe y la foto vieja la recibió',
    (select count(*)::text from public.negocio_foto where id = 3 and creado_en is not null), '1');

  -- ===== inserts válidos (dueño del negocio 2) =====
  insert into pr values (10, 'foto propia .jpg con el patrón negocio_id_timestamp', pg_temp.ins(u2, 2, format('%s%s/fotos/2_1791329876738.jpg', base, u2)), 'OK');
  insert into pr values (11, 'foto propia con ?t=', pg_temp.ins(u2, 2, format('%s%s/fotos/2_1791329876739.webp?t=1791329876739', base, u2), 1), 'OK');
  insert into pr values (12, 'el tipo queda en exterior por defecto y creado_en se llena',
    (select count(*)::text from public.negocio_foto where negocio_id = 2 and tipo = 'exterior' and creado_en is not null), '2');

  -- ===== inválidos =====
  insert into pr values (20, 'foto de la carpeta de otro usuario', pg_temp.ins(u2, 2, format('%s%s/fotos/x.jpg', base, u1)), '[23514]');
  insert into pr values (21, 'foto con http', pg_temp.ins(u2, 2, format('%s%s/fotos/x.jpg', replace(base, 'https', 'http'), u2)), '[23514]');
  insert into pr values (22, 'foto de otro host', pg_temp.ins(u2, 2, format('https://evil.example.com/storage/v1/object/public/negocios/%s/fotos/x.jpg', u2)), '[23514]');
  insert into pr values (23, 'foto de otro bucket', pg_temp.ins(u2, 2, format('https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/otro/%s/fotos/x.jpg', u2)), '[23514]');
  insert into pr values (24, 'archivo fuera de la carpeta fotos (portada)', pg_temp.ins(u2, 2, format('%s%s/portada_2.jpg', base, u2)), '[23514]');
  insert into pr values (25, 'subcarpeta dentro de fotos', pg_temp.ins(u2, 2, format('%s%s/fotos/a/b.jpg', base, u2)), '[23514]');
  insert into pr values (26, 'con .. para saltar de carpeta', pg_temp.ins(u2, 2, format('%s%s/fotos/../../%s/fotos/x.jpg', base, u2, u1)), '[23514]');
  insert into pr values (27, 'con parámetros extra', pg_temp.ins(u2, 2, format('%s%s/fotos/x.jpg?a=1&b=2', base, u2)), '[23514]');
  insert into pr values (28, 'texto libre como url', pg_temp.ins(u2, 2, 'mi foto bonita'), '[23514]');
  insert into pr values (29, 'orden negativo', pg_temp.ins(u2, 2, format('%s%s/fotos/neg.jpg', base, u2), -1), '[23514]');
  insert into pr values (30, 'nombre de archivo que empieza con punto', pg_temp.ins(u2, 2, format('%s%s/fotos/.oculto', base, u2)), '[23514]');

  -- ===== quién escribe =====
  insert into pr values (40, 'otra cuenta intenta insertar en el negocio 2 con la carpeta del dueño: la RLS la frena',
    pg_temp.ins(otro, 2, format('%s%s/fotos/intruso.jpg', base, u2)), '[42501]');
  insert into pr values (41, 'otra cuenta intenta insertar con su propia carpeta: el trigger la frena', pg_temp.ins(otro, 2, format('%s%s/fotos/intruso.jpg', base, otro)), '[23514]');
  insert into pr values (42, 'el dueño del negocio 1 intenta insertar en el negocio 2', pg_temp.ins(u1, 2, format('%s%s/fotos/intruso.jpg', base, u1)), '[23514]');
  insert into pr values (43, 'anon no puede insertar', pg_temp.ins(null, 2, format('%s%s/fotos/x.jpg', base, u2)), '[42501]');
  insert into pr values (44, 'ninguna foto de más quedó guardada', (select count(*)::text from public.negocio_foto where negocio_id = 2), '2');

  -- ===== máximo 10 =====
  for i in 1..8 loop
    perform pg_temp.ins(u2, 2, format('%s%s/fotos/2_extra%s.jpg', base, u2, i), 2 + i);
  end loop;
  insert into pr values (50, 'el negocio 2 llegó a 10 fotos', (select count(*)::text from public.negocio_foto where negocio_id = 2), '10');
  insert into pr values (51, 'la foto 11 se rechaza', pg_temp.ins(u2, 2, format('%s%s/fotos/2_once.jpg', base, u2), 11), '[23514] Un negocio puede tener hasta 10 fotos.');
  insert into pr values (52, 'sigue en 10', (select count(*)::text from public.negocio_foto where negocio_id = 2), '10');
  insert into pr values (53, 'otro negocio (el 1) no se ve afectado por el límite del 2', pg_temp.ins(u1, 1, format('%s%s/fotos/1_nueva.jpg', base, u1), 5), 'OK');

  -- ===== borrar =====
  select count(*) into conteo_antes from public.negocio_foto where negocio_id = 2;
  insert into pr values (60, 'otra cuenta intenta borrar fotos del negocio 2: no borra nada (RLS)',
    pg_temp.corre(otro, 'delete from public.negocio_foto where negocio_id = 2') || ' | ' || (select (count(*) = conteo_antes)::text from public.negocio_foto where negocio_id = 2), 'OK | true');
  insert into pr values (61, 'el dueño del negocio 1 intenta borrar fotos del negocio 2: no borra nada',
    pg_temp.corre(u1, 'delete from public.negocio_foto where negocio_id = 2') || ' | ' || (select (count(*) = conteo_antes)::text from public.negocio_foto where negocio_id = 2), 'OK | true');
  insert into pr values (62, 'anon no puede borrar', pg_temp.corre(null, 'delete from public.negocio_foto where negocio_id = 2'), '[42501]');
  res := pg_temp.corre(u2, 'delete from public.negocio_foto where id = (select min(id) from public.negocio_foto where negocio_id = 2)');
  insert into pr values (63, 'el dueño borra una foto propia', res || ' | ' || (select count(*)::text from public.negocio_foto where negocio_id = 2), 'OK | 9');
  insert into pr values (64, 'tras borrar se puede subir otra (9 -> 10)', pg_temp.ins(u2, 2, format('%s%s/fotos/2_reemplazo.jpg', base, u2), 10), 'OK');

  -- ===== actualizar =====
  insert into pr values (70, 'el dueño no puede cambiar la url de una foto', pg_temp.corre(u2, format('update public.negocio_foto set url = %L where negocio_id = 2', base || u2 || '/fotos/otra.jpg')), '[42501]');
  insert into pr values (71, 'el dueño no puede cambiar el tipo', pg_temp.corre(u2, 'update public.negocio_foto set tipo = ''interior'' where negocio_id = 2'), '[42501]');
  insert into pr values (72, 'el dueño no puede mover una foto a otro negocio', pg_temp.corre(u2, 'update public.negocio_foto set negocio_id = 1 where negocio_id = 2'), '[42501]');
  insert into pr values (73, 'el dueño sí puede cambiar el orden', pg_temp.corre(u2, 'update public.negocio_foto set orden = orden where negocio_id = 2'), 'OK');
  insert into pr values (74, 'otra cuenta no puede cambiar el orden del negocio 2 (no afecta filas)',
    pg_temp.corre(otro, 'update public.negocio_foto set orden = 99 where negocio_id = 2') || ' | ' || (select count(*)::text from public.negocio_foto where negocio_id = 2 and orden = 99), 'OK | 0');
  insert into pr values (75, 'anon no puede actualizar', pg_temp.corre(null, 'update public.negocio_foto set orden = 99 where negocio_id = 2'), '[42501]');

  -- ===== lectura =====
  insert into pr values (80, 'anon lee las fotos de un negocio visible (la ficha pública): negocio 1', pg_temp.corre(null, 'select count(*)::text from public.negocio_foto where negocio_id = 1'), '2');
  insert into pr values (81, 'anon lee las del negocio 2', pg_temp.corre(null, 'select count(*)::text from public.negocio_foto where negocio_id = 2'), '10');
  insert into public.negocio_foto (negocio_id, url, orden) values (3, format('%s%s/fotos/3_rechazado.jpg', base, u3), 0);
  insert into pr values (82, 'anon NO lee las fotos de un negocio rechazado (RLS)', pg_temp.corre(null, 'select count(*)::text from public.negocio_foto where negocio_id = 3'), '0');
  insert into pr values (83, 'el dueño del negocio rechazado sí ve las suyas', pg_temp.corre(u3, 'select count(*)::text from public.negocio_foto where negocio_id = 3'), '1');
  insert into pr values (84, 'una cuenta cualquiera tampoco ve las del negocio rechazado', pg_temp.corre(otro, 'select count(*)::text from public.negocio_foto where negocio_id = 3'), '0');

  -- ===== ordenar_fotos_negocio =====
  select array_agg(id order by id) into ids from public.negocio_foto where negocio_id = 2;
  select array_agg(id order by id desc) into ids_inv from public.negocio_foto where negocio_id = 2;
  insert into pr values (90, 'el dueño invierte el orden: exito',
    pg_temp.corre(u2, format('select public.ordenar_fotos_negocio(2, %L::int[])->>''exito''', ids_inv)), 'true');
  insert into pr values (91, 'el orden quedó 0..9 siguiendo la lista (la primera de la lista tiene orden 0)',
    (select (min(orden) = 0 and max(orden) = 9 and (select orden from public.negocio_foto where id = ids_inv[1]) = 0 and (select orden from public.negocio_foto where id = ids_inv[10]) = 9)::text from public.negocio_foto where negocio_id = 2), 'true');
  insert into pr values (92, 'lista incompleta -> exito false', pg_temp.corre(u2, format('select public.ordenar_fotos_negocio(2, %L::int[])->>''exito''', ids[1:9])), 'false');
  insert into pr values (93, 'lista con repetidas -> exito false', pg_temp.corre(u2, format('select public.ordenar_fotos_negocio(2, %L::int[])->>''exito''', array_append(ids[1:9], ids[1]))), 'false');
  insert into pr values (94, 'lista con una foto de otro negocio -> exito false', pg_temp.corre(u2, format('select public.ordenar_fotos_negocio(2, %L::int[])->>''exito''', array_append(ids[1:9], 3))), 'false');
  insert into pr values (95, 'lista nula -> exito false', pg_temp.corre(u2, 'select public.ordenar_fotos_negocio(2, null)->>''exito'''), 'false');
  insert into pr values (96, 'otra cuenta -> sin permiso', pg_temp.corre(otro, format('select public.ordenar_fotos_negocio(2, %L::int[])->>''mensaje''', ids)), 'No tienes permiso sobre este negocio.');
  insert into pr values (97, 'el dueño del negocio 1 sobre el negocio 2 -> sin permiso', pg_temp.corre(u1, format('select public.ordenar_fotos_negocio(2, %L::int[])->>''mensaje''', ids)), 'No tienes permiso sobre este negocio.');
  insert into pr values (98, 'anon no puede ejecutarla', pg_temp.corre(null, format('select public.ordenar_fotos_negocio(2, %L::int[])::text', ids)), '[42501]');
  insert into pr values (99, 'tras los rechazos el orden no cambió (sigue invertido)',
    (select (orden = 0)::text from public.negocio_foto where id = ids_inv[1]), 'true');

  -- ===== permisos =====
  insert into pr values (100, 'anon: select=true insert=false update=false delete=false',
    has_table_privilege('anon', 'public.negocio_foto', 'select')::text || '/' || has_table_privilege('anon', 'public.negocio_foto', 'insert')::text || '/' ||
    has_table_privilege('anon', 'public.negocio_foto', 'update')::text || '/' || has_table_privilege('anon', 'public.negocio_foto', 'delete')::text, 'true/false/false/false');
  insert into pr values (101, 'authenticated: select=true insert=true delete=true update de tabla=false',
    has_table_privilege('authenticated', 'public.negocio_foto', 'select')::text || '/' || has_table_privilege('authenticated', 'public.negocio_foto', 'insert')::text || '/' ||
    has_table_privilege('authenticated', 'public.negocio_foto', 'delete')::text || '/' || has_table_privilege('authenticated', 'public.negocio_foto', 'update')::text, 'true/true/true/false');
  insert into pr values (102, 'authenticated solo actualiza la columna orden (orden=true url=false)',
    has_column_privilege('authenticated', 'public.negocio_foto', 'orden', 'update')::text || '/' || has_column_privilege('authenticated', 'public.negocio_foto', 'url', 'update')::text, 'true/false');
  insert into pr values (103, 'TRUNCATE/TRIGGER/REFERENCES siguen fuera para anon y authenticated',
    (has_table_privilege('anon', 'public.negocio_foto', 'truncate') or has_table_privilege('authenticated', 'public.negocio_foto', 'truncate')
     or has_table_privilege('anon', 'public.negocio_foto', 'trigger') or has_table_privilege('authenticated', 'public.negocio_foto', 'trigger')
     or has_table_privilege('anon', 'public.negocio_foto', 'references') or has_table_privilege('authenticated', 'public.negocio_foto', 'references'))::text, 'false');
  insert into pr values (104, 'la función del trigger no la ejecuta nadie de la API',
    (has_function_privilege('anon', 'public.negocio_foto_validar()', 'execute') or has_function_privilege('authenticated', 'public.negocio_foto_validar()', 'execute'))::text, 'false');
  insert into pr values (105, 'ordenar_fotos_negocio: anon=false authenticated=true',
    has_function_privilege('anon', 'public.ordenar_fotos_negocio(integer,integer[])', 'execute')::text || '/' || has_function_privilege('authenticated', 'public.ordenar_fotos_negocio(integer,integer[])', 'execute')::text, 'false/true');
  insert into pr values (106, 'la RLS sigue activa con sus dos políticas',
    (select relrowsecurity::text || '/' || (select count(*)::text from pg_policy where polrelid = 'public.negocio_foto'::regclass) from pg_class where oid = 'public.negocio_foto'::regclass), 'true/2');
  insert into pr values (107, 'borrar el negocio borra sus fotos (ON DELETE CASCADE sigue)',
    (select confdeltype::text from pg_constraint where conname = 'negocio_foto_negocio_id_fkey'), 'c');

  for res in select format('%s %s -> %s', lpad(n::text, 3, '0'), nombre,
                   case when position(esperado in obtenido) = 1 then 'OK' else 'FALLA (obtuvo: ' || left(obtenido, 160) || ')' end)
             from pr order by n loop
    total := total + 1;
    if res like '%FALLA%' then fallas := fallas + 1; end if;
    r := r || res || E'\n';
  end loop;

  raise exception 'ROLLBACK DE PRUEBA%', E'\nRESULTADO: ' || (total - fallas) || ' de ' || total || ' comprobaciones correctas' || case when fallas > 0 then ' (' || fallas || ' FALLAN)' else ' (todas)' end || case when fallas > 0 then E'\n\n' || r else '' end;
end $test$;
