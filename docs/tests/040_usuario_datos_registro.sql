-- docs/tests/040_usuario_datos_registro.sql
--
-- Verificación de la migración 040 (usuario.fecha_nacimiento, telefono, genero, foto_perfil_url validada y bucket 'perfiles').
-- Todo ocurre dentro de un DO que termina con una excepción a propósito: no deja datos. Si algo falla, aborta con
-- "FALLA n: ..."; si todo pasa, aborta con "OK: N comprobaciones (rollback)".
-- Usa dos usuarios que ya existen (no crea ninguno) y los modifica solo dentro de la transacción.

do $t$
declare
    n int := 0;
    cnt int;
    yo uuid;
    otro uuid;
    base text := 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/perfiles/';
    r text;
    malos text[];
    m text;
begin
    select id into yo from public.usuario order by id limit 1;
    select id into otro from public.usuario where id <> yo order by id limit 1;

    -- 1. columnas
    n := n + 1;
    if (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'usuario' and is_nullable = 'YES'
          and ((column_name = 'fecha_nacimiento' and data_type = 'date')
            or (column_name in ('telefono', 'genero', 'foto_perfil_url') and data_type = 'text'))) <> 4 then
        raise exception 'FALLA %: faltan columnas (fecha_nacimiento date, telefono, genero, foto_perfil_url text, todas opcionales)', n;
    end if;

    -- 2. los usuarios que ya existían quedan sin datos nuevos
    n := n + 1;
    if (select count(*) from public.usuario where fecha_nacimiento is not null or telefono is not null or genero is not null) <> 0 then
        raise exception 'FALLA %: los usuarios existentes no deben tener datos nuevos', n;
    end if;

    -- 3. valores válidos
    update public.usuario set
        fecha_nacimiento = date '2000-05-10',
        telefono = '+505 8888 8888',
        genero = 'femenino',
        foto_perfil_url = base || yo::text || '/perfil.jpg?t=1728000000000'
      where id = yo;
    n := n + 1;
    if not exists (select 1 from public.usuario where id = yo and genero = 'femenino' and telefono = '+505 8888 8888' and fecha_nacimiento = date '2000-05-10') then
        raise exception 'FALLA %: no se guardaron los datos válidos', n;
    end if;
    foreach m in array array['masculino', 'prefiero_no_decir'] loop
        update public.usuario set genero = m where id = yo;
    end loop;
    update public.usuario set telefono = '+1 2025550123', foto_perfil_url = null, genero = null, fecha_nacimiento = current_date where id = yo;
    n := n + 1;

    -- 4. valores inválidos: cada uno debe chocar con su restricción (23514)
    malos := array[
        $q$fecha_nacimiento = current_date + 1$q$,
        $q$fecha_nacimiento = date '1899-12-31'$q$,
        $q$telefono = '88888888'$q$,
        $q$telefono = '+505 12'$q$,
        $q$telefono = '+505 88a88888'$q$,
        $q$telefono = '+50512 8888 8888'$q$,
        $q$genero = 'otro'$q$,
        $q$genero = 'Femenino'$q$,
        format($q$foto_perfil_url = %L$q$, base || otro::text || '/perfil.jpg'),
        format($q$foto_perfil_url = %L$q$, 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/' || yo::text || '/perfil.jpg'),
        format($q$foto_perfil_url = %L$q$, 'https://otro-sitio.com/storage/v1/object/public/perfiles/' || yo::text || '/perfil.jpg'),
        format($q$foto_perfil_url = %L$q$, base || yo::text || '/otra.png')
    ];
    foreach m in array malos loop
        n := n + 1;
        begin
            execute format('update public.usuario set %s where id = %L', m, yo);
            raise exception 'FALLA %: debía rechazarse: %', n, m;
        exception when check_violation then
            null;
        end;
    end loop;

    -- 5. cada quien solo toca su fila; anon no ve nada
    perform set_config('request.jwt.claims', json_build_object('sub', yo, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.usuario set telefono = '+505 7777 7777' where id = otro;
    get diagnostics cnt = row_count;
    n := n + 1;
    if cnt <> 0 then raise exception 'FALLA %: authenticated pudo cambiar los datos de otra persona', n; end if;
    update public.usuario set telefono = '+505 7777 7777', genero = 'masculino' where id = yo;
    get diagnostics cnt = row_count;
    n := n + 1;
    if cnt <> 1 then raise exception 'FALLA %: authenticated no pudo cambiar sus propios datos', n; end if;
    n := n + 1;
    if (select count(*) from public.usuario) <> 1 then raise exception 'FALLA %: authenticated debe ver solo su fila', n; end if;
    execute 'reset role';

    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    n := n + 1;
    if (select count(*) from public.usuario) <> 0 then raise exception 'FALLA %: anon no debe ver ningún usuario', n; end if;
    execute 'reset role';

    -- 6. bucket y políticas
    n := n + 1;
    if not exists (select 1 from storage.buckets where id = 'perfiles' and public and file_size_limit = 2097152
                   and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp'] and cardinality(allowed_mime_types) = 3) then
        raise exception 'FALLA %: el bucket perfiles debe ser público, 2 MB y solo jpeg, png y webp', n;
    end if;
    n := n + 1;
    if (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'perfiles\_%') <> 4 then
        raise exception 'FALLA %: deben existir 4 políticas de perfiles', n;
    end if;

    perform set_config('request.jwt.claims', json_build_object('sub', yo, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    insert into storage.objects (bucket_id, name, owner_id) values ('perfiles', yo::text || '/perfil.jpg', yo::text);
    n := n + 1;
    begin
        insert into storage.objects (bucket_id, name, owner_id) values ('perfiles', otro::text || '/perfil.jpg', yo::text);
        raise exception 'FALLA %: se pudo subir un archivo a la carpeta de otra persona', n;
    exception when insufficient_privilege then
        null;
    end;
    n := n + 1;
    if (select count(*) from storage.objects where bucket_id = 'perfiles') <> 1 then raise exception 'FALLA %: debe verse solo el archivo propio', n; end if;
    execute 'reset role';

    perform set_config('request.jwt.claims', '', true);
    execute 'set local role anon';
    n := n + 1;
    if (select count(*) from storage.objects where bucket_id = 'perfiles') <> 1 then raise exception 'FALLA %: anon debe poder leer (bucket público)', n; end if;
    begin
        insert into storage.objects (bucket_id, name) values ('perfiles', yo::text || '/anon.jpg');
        raise exception 'FALLA %: anon pudo subir', n;
    exception when insufficient_privilege then
        null;
    end;
    execute 'reset role';

    r := format('%s comprobaciones', n);
    raise exception 'OK: % (rollback)', r;
end
$t$;
