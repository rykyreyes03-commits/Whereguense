-- docs/tests/041_solicitud_demo.sql
--
-- Verificación de la migración 041 (solicitud_demo y crear_solicitud_demo). Todo ocurre dentro de un DO que termina con una
-- excepción a propósito: no deja datos. Si algo falla, aborta con "FALLA n: ..."; si todo pasa, aborta con
-- "OK: N comprobaciones (rollback)". Usa la cuenta admin real (rol = 'admin') y un usuario turista que ya existen.

do $t$
declare
    n int := 0;
    cnt int;
    admin_id uuid;
    turista_id uuid;
    id1 uuid;
    largo text;
begin
    select id into admin_id from public.usuario where rol = 'admin' limit 1;
    select id into turista_id from public.usuario where rol = 'turista' limit 1;

    -- 0. la tabla nace vacía y con RLS
    n := n + 1;
    if not (select relrowsecurity from pg_class where oid = 'public.solicitud_demo'::regclass) then
        raise exception 'FALLA %: solicitud_demo debe tener RLS', n;
    end if;
    delete from public.solicitud_demo;

    -- 1. un visitante SIN cuenta (anon) envía una solicitud válida
    execute 'set local role anon';
    perform set_config('request.jwt.claims', '', true);
    perform public.crear_solicitud_demo('  Ana Pérez  ', 'ana@correo.com', 'Hotel La Ceiba', 'Quiero ver cómo funciona.');
    execute 'reset role';
    n := n + 1;
    select count(*) into cnt from public.solicitud_demo
     where nombre = 'Ana Pérez' and correo = 'ana@correo.com' and organizacion = 'Hotel La Ceiba' and not leida and not atendida and created_at is not null;
    if cnt <> 1 then raise exception 'FALLA %: la solicitud válida no se guardó bien (se recortan los espacios, leida y atendida en false)', n; end if;

    -- 2. opcionales vacíos -> null
    execute 'set local role anon';
    perform public.crear_solicitud_demo('Luis', 'luis@correo.com', '   ', '');
    execute 'reset role';
    n := n + 1;
    if (select count(*) from public.solicitud_demo where correo = 'luis@correo.com' and organizacion is null and mensaje is null) <> 1 then
        raise exception 'FALLA %: organización y mensaje vacíos deben guardarse como null', n;
    end if;

    -- 3. datos inválidos: cada uno debe lanzar su mensaje claro (errcode 22023)
    declare
        casos text[][] := array[
            array['', 'a@b.com', 'Escribe tu nombre.'],
            array['   ', 'a@b.com', 'Escribe tu nombre.'],
            array['Nombre', '', 'Escribe tu correo.'],
            array['Nombre', 'sin-arroba.com', 'Escribe un correo válido, por ejemplo nombre@correo.com.'],
            array['Nombre', 'a@b', 'Escribe un correo válido, por ejemplo nombre@correo.com.'],
            array['Nombre', 'a b@c.com', 'Escribe un correo válido, por ejemplo nombre@correo.com.'],
            array['Nombre', '@correo.com', 'Escribe un correo válido, por ejemplo nombre@correo.com.']
        ];
        i int;
        msg text;
    begin
        execute 'set local role anon';
        for i in 1 .. array_length(casos, 1) loop
            n := n + 1;
            begin
                perform public.crear_solicitud_demo(casos[i][1], casos[i][2]);
                raise exception 'FALLA %: debía rechazar nombre "%" y correo "%"', n, casos[i][1], casos[i][2];
            exception when sqlstate '22023' then
                get stacked diagnostics msg = message_text;
                if msg <> casos[i][3] then raise exception 'FALLA %: mensaje distinto para "%" / "%": %', n, casos[i][1], casos[i][2], msg; end if;
            end;
        end loop;
        execute 'reset role';
    end;

    -- 4. límites de largo
    execute 'set local role anon';
    n := n + 1;
    begin
        perform public.crear_solicitud_demo(repeat('x', 101), 'largo1@correo.com');
        raise exception 'FALLA %: un nombre de 101 caracteres debía rechazarse', n;
    exception when sqlstate '22023' then null; end;
    n := n + 1;
    begin
        perform public.crear_solicitud_demo('Nombre', repeat('x', 195) || '@a.com');
        raise exception 'FALLA %: un correo de más de 200 caracteres debía rechazarse', n;
    exception when sqlstate '22023' then null; end;
    n := n + 1;
    begin
        perform public.crear_solicitud_demo('Nombre', 'largo2@correo.com', repeat('x', 151));
        raise exception 'FALLA %: una organización de 151 caracteres debía rechazarse', n;
    exception when sqlstate '22023' then null; end;
    n := n + 1;
    begin
        perform public.crear_solicitud_demo('Nombre', 'largo3@correo.com', null, repeat('x', 1001));
        raise exception 'FALLA %: un mensaje de 1001 caracteres debía rechazarse', n;
    exception when sqlstate '22023' then null; end;
    n := n + 1;
    perform public.crear_solicitud_demo(repeat('x', 100), 'limite@correo.com', repeat('y', 150), repeat('z', 1000));   -- justo en el límite: sí
    execute 'reset role';

    -- 5. el mismo correo no puede enviar otra solicitud en 5 minutos (ni con otras mayúsculas)
    execute 'set local role anon';
    n := n + 1;
    begin
        perform public.crear_solicitud_demo('Ana otra vez', 'ANA@correo.com');
        raise exception 'FALLA %: el mismo correo dos veces seguidas debía rechazarse', n;
    exception when sqlstate '22023' then null; end;
    execute 'reset role';
    update public.solicitud_demo set created_at = now() - interval '6 minutes' where correo = 'ana@correo.com';
    execute 'set local role anon';
    n := n + 1;
    perform public.crear_solicitud_demo('Ana otra vez', 'ana@correo.com');   -- pasados 5 minutos, sí
    execute 'reset role';

    -- 6. tope general: 30 solicitudes en 10 minutos
    insert into public.solicitud_demo (nombre, correo)
        select 'Relleno ' || g, 'relleno' || g || '@correo.com' from generate_series(1, 30) g;
    execute 'set local role anon';
    n := n + 1;
    begin
        perform public.crear_solicitud_demo('Una más', 'unamas@correo.com');
        raise exception 'FALLA %: con 30 solicitudes en 10 minutos debía frenarse', n;
    exception when sqlstate '22023' then null; end;
    execute 'reset role';
    delete from public.solicitud_demo where correo like 'relleno%';

    -- 7. anon NO puede leer ni escribir directo en la tabla
    execute 'set local role anon';
    n := n + 1;
    begin
        perform count(*) from public.solicitud_demo;
        raise exception 'FALLA %: anon no debe poder ni consultar la tabla', n;
    exception when insufficient_privilege then null; end;
    n := n + 1;
    begin
        insert into public.solicitud_demo (nombre, correo) values ('Directo', 'directo@correo.com');
        raise exception 'FALLA %: anon no debe poder insertar directo (se saltaría la validación)', n;
    exception when insufficient_privilege then null; end;
    execute 'reset role';

    -- 8. un usuario con cuenta que NO es admin: la función funciona, pero no ve nada ni puede marcar
    perform set_config('request.jwt.claims', json_build_object('sub', turista_id, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.crear_solicitud_demo('Turista', 'turista@correo.com');
    n := n + 1;
    select count(*) into cnt from public.solicitud_demo;
    if cnt <> 0 then raise exception 'FALLA %: un turista no debe ver solicitudes (ve %)', n, cnt; end if;
    n := n + 1;
    update public.solicitud_demo set leida = true;
    get diagnostics cnt = row_count;
    if cnt <> 0 then raise exception 'FALLA %: un turista no debe poder marcar solicitudes', n; end if;
    execute 'reset role';

    -- 9. el admin ve todo, lo más reciente primero, y puede marcar leída/atendida pero no cambiar el contenido
    perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    n := n + 1;
    select count(*) into cnt from public.solicitud_demo;
    if cnt < 5 then raise exception 'FALLA %: el admin debe ver las solicitudes (ve %)', n, cnt; end if;
    n := n + 1;
    select id into id1 from public.solicitud_demo order by created_at desc limit 1;
    update public.solicitud_demo set leida = true where id = id1;
    get diagnostics cnt = row_count;
    if cnt <> 1 then raise exception 'FALLA %: el admin debe poder marcar una solicitud como leída', n; end if;
    n := n + 1;
    update public.solicitud_demo set atendida = true where id = id1;
    get diagnostics cnt = row_count;
    if cnt <> 1 then raise exception 'FALLA %: el admin debe poder marcar atendida', n; end if;
    n := n + 1;
    begin
        update public.solicitud_demo set nombre = 'Cambiado' where id = id1;
        raise exception 'FALLA %: ni el admin debe poder cambiar el contenido de una solicitud', n;
    exception when insufficient_privilege then null; end;
    n := n + 1;
    begin
        delete from public.solicitud_demo where id = id1;
        raise exception 'FALLA %: el admin no debe poder borrar por la API', n;
    exception when insufficient_privilege then null; end;
    execute 'reset role';

    -- 10. el índice por created_at DESC existe
    n := n + 1;
    if not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'solicitud_demo' and indexdef ilike '%created_at DESC%') then
        raise exception 'FALLA %: falta el índice por created_at DESC', n;
    end if;

    raise exception 'OK: % comprobaciones (rollback)', n;
end
$t$;
