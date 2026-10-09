-- docs/tests/038_niveles_rangos_sellos.sql
--
-- Pruebas de la migración 038 (rangos de sellos, niveles por puntos, accesorios del avatar). Todo corre en UNA transacción y
-- termina en ROLLBACK: no deja datos. Si una comprobación falla, aborta con "FALLA n: ..."; si todas pasan, aborta a propósito
-- con "OK: N comprobaciones (rollback)". Usuarios: el admin y dos turistas reales (solo se simula su JWT; los sellos de prueba
-- se insertan como postgres y desaparecen con el rollback).

do $t$
declare
    admin_id uuid := 'f9fa4efb-d727-42f9-9f63-1959d58a873f';
    tur_a    uuid := '46358b91-b045-4fbe-8193-f41805db2e58';
    tur_b    uuid := 'a7094b99-c19e-43a0-8546-0c45dadf9965';
    n        int := 0;
    r        record;
    c        bigint;
    cnt      int;
begin
    -- ---------- rango de cada sitio ----------
    n := n + 1;
    -- el enum conserva su orden de declaración: cobre < plata < oro
    if (select array_agg(e::text order by e) from unnest(enum_range(null::public.rango_sello)) e) is distinct from array['cobre','plata','oro'] then
        raise exception 'FALLA %: el enum rango_sello debe ser cobre, plata, oro', n;
    end if;
    n := n + 1;
    if (select column_default from information_schema.columns where table_schema='public' and table_name='sitio' and column_name='rango') not like '%cobre%' then
        raise exception 'FALLA %: el rango por defecto debe ser cobre', n;
    end if;
    n := n + 1;
    if (select array_agg(id order by id) from public.sitio where rango = 'oro') is distinct from array[1,2,3,4,5,7,9] then
        raise exception 'FALLA %: sitios oro inesperados', n;
    end if;
    n := n + 1;
    if (select array_agg(id order by id) from public.sitio where rango = 'plata') is distinct from array[6,8,10,11,46,47,49] then
        raise exception 'FALLA %: sitios plata inesperados', n;
    end if;
    n := n + 1;
    if (select count(*) from public.sitio where rango = 'cobre') <> 46 then
        raise exception 'FALLA %: debe haber 46 sitios cobre', n;
    end if;
    n := n + 1;
    if exists (select 1 from public.ruta_sitio rs join public.ruta ru on ru.id = rs.ruta_id
               where ru.nombre = 'Ruta Dariana' and rs.sitio_id not in (6, 8, 10) and (select rango from public.sitio where id = rs.sitio_id) <> 'oro') then
        raise exception 'FALLA %: todo sitio de la Ruta Dariana (salvo los plata nombrados) debe ser oro', n;
    end if;

    -- ---------- valor de cada rango ----------
    n := n + 1;
    if public.valor_sello('cobre') <> 1 or public.valor_sello('plata') <> 0.5 or public.valor_sello('oro') <> 2 then
        raise exception 'FALLA %: valores cobre 1, plata 0.5, oro 2', n;
    end if;

    -- ---------- fórmula de niveles (función pura) ----------
    -- puntos -> (nivel, puntos dentro del nivel, para subir, %)
    for r in select * from (values
        (0::numeric,    1, 0::numeric,   2,   0),
        (1,             1, 1,            2,  50),
        (1.5,           1, 1.5,          2,  75),
        (2,             2, 0,            4,   0),
        (2.5,           2, 0.5,          4,  12),
        (5.99,          2, 3.99,         4,  99),
        (6,             3, 0,            6,   0),
        (11.5,          3, 5.5,          6,  91),
        (12,            4, 0,            8,   0),
        (19.5,          4, 7.5,          8,  93),
        (20,            5, 0,           10,   0),
        (29.5,          5, 9.5,         10,  95),
        (30,            6, 0,           12,   0),
        (90,           10, 0,           20,   0),
        (380,          20, 0,           40,   0),
        (1560,         40, 0,           80,   0),
        (2450,         50, 0,          100,   0)
    ) v(p, nivel, actuales, sig, pct) loop
        n := n + 1;
        if (select (x.nivel_actual, x.puntos_actuales, x.puntos_para_siguiente, x.porcentaje) from public.nivel_por_puntos(r.p) x)
           is distinct from (r.nivel, r.actuales, r.sig, r.pct) then
            raise exception 'FALLA %: % puntos -> %, esperado %', n, r.p,
                (select (x.nivel_actual, x.puntos_actuales, x.puntos_para_siguiente, x.porcentaje)::text from public.nivel_por_puntos(r.p) x),
                (r.nivel, r.actuales, r.sig, r.pct)::text;
        end if;
    end loop;
    -- negativos y nulos no rompen
    n := n + 1;
    if (select nivel_actual from public.nivel_por_puntos(-5)) <> 1 or (select nivel_actual from public.nivel_por_puntos(null)) <> 1 then
        raise exception 'FALLA %: puntos negativos o nulos deben dar nivel 1', n;
    end if;
    -- el nivel nunca baja al subir puntos (de 0 a 600 en pasos de 0.5)
    n := n + 1;
    if exists (select 1 from generate_series(0, 1200) i(k),
                lateral public.nivel_por_puntos(k * 0.5) a,
                lateral public.nivel_por_puntos((k + 1) * 0.5) b
               where b.nivel_actual < a.nivel_actual or a.porcentaje not between 0 and 100 or a.puntos_actuales < 0
                  or a.puntos_actuales >= a.puntos_para_siguiente) then
        raise exception 'FALLA %: el nivel debe ser monótono y el avance siempre dentro del nivel', n;
    end if;

    -- ---------- calcular_nivel con sellos reales de prueba ----------
    select count(*) into cnt from public.sello where usuario_id = tur_a;
    n := n + 1; if cnt <> 0 then raise exception 'FALLA %: tur_a debe empezar sin sellos', n; end if;

    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if (r.nivel_actual, r.puntos_totales, r.porcentaje) is distinct from (1, 0::numeric, 0) then raise exception 'FALLA %: sin sellos debe ser nivel 1, 0 puntos', n; end if;

    insert into public.sello (usuario_id, sitio_id, tipo) values (tur_a, 12, 'geolocalizacion');   -- cobre: 1
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if (r.nivel_actual, r.puntos_totales, r.puntos_actuales, r.porcentaje) is distinct from (1, 1::numeric, 1::numeric, 50) then raise exception 'FALLA %: 1 cobre = 1 punto, nivel 1, 50 por ciento', n; end if;

    insert into public.sello (usuario_id, sitio_id, tipo) values (tur_a, 14, 'geolocalizacion');   -- cobre: 2
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if (r.nivel_actual, r.puntos_totales, r.puntos_actuales) is distinct from (2, 2::numeric, 0::numeric) then raise exception 'FALLA %: 2 cobres suben al nivel 2', n; end if;

    insert into public.sello (usuario_id, sitio_id, tipo) values (tur_a, 6, 'geolocalizacion');    -- plata: 2.5
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if (r.nivel_actual, r.puntos_totales, r.puntos_actuales, r.porcentaje) is distinct from (2, 2.5::numeric, 0.5::numeric, 12) then raise exception 'FALLA %: una plata suma 0.5', n; end if;

    insert into public.sello (usuario_id, sitio_id, tipo) values (tur_a, 1, 'geolocalizacion');    -- oro: 4.5
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if (r.nivel_actual, r.puntos_totales, r.puntos_actuales, r.porcentaje) is distinct from (2, 4.5::numeric, 2.5::numeric, 62) then raise exception 'FALLA %: un oro suma 2', n; end if;

    insert into public.sello (usuario_id, sitio_id, tipo) values (tur_a, 2, 'geolocalizacion');    -- oro: 6.5
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if (r.nivel_actual, r.puntos_totales, r.puntos_actuales, r.puntos_para_siguiente) is distinct from (3, 6.5::numeric, 0.5::numeric, 6) then raise exception 'FALLA %: 6.5 puntos = nivel 3 con 0.5/6', n; end if;

    insert into public.sello (usuario_id, qr_sello_id, tipo) values (tur_a, 2, 'qr');              -- QR de negocio: 7.5
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if r.puntos_totales <> 7.5 then raise exception 'FALLA %: el sello por QR de negocio vale 1 (total %)', n, r.puntos_totales; end if;

    -- todos los sitios: 7 oro (14) + 7 plata (3.5) + 46 cobre (46) + 1 QR (1) = 64.5 -> nivel 8 (56), 8.5/16
    insert into public.sello (usuario_id, sitio_id, tipo)
        select tur_a, s.id, 'geolocalizacion' from public.sitio s
        where s.id not in (select sitio_id from public.sello where usuario_id = tur_a and sitio_id is not null);
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if (r.nivel_actual, r.puntos_totales, r.puntos_actuales, r.puntos_para_siguiente, r.porcentaje) is distinct from (8, 64.5::numeric, 8.5::numeric, 16, 53) then raise exception 'FALLA %: todos los sellos = 64.5 puntos, nivel 8 (obtuvo %, %)', n, r.nivel_actual, r.puntos_totales; end if;

    -- ---------- control de acceso de calcular_nivel ----------
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    n := n + 1;
    begin
        perform * from public.calcular_nivel(tur_a);
        raise exception 'FALLA %: anon pudo ejecutar calcular_nivel', n;
    exception when insufficient_privilege then null; end;
    n := n + 1;
    begin
        perform * from public.nivel_por_puntos(10);
        raise exception 'FALLA %: anon pudo ejecutar nivel_por_puntos (es interna)', n;
    exception when insufficient_privilege then null; end;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', tur_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into c from public.calcular_nivel(tur_a);
    n := n + 1; if c <> 0 then raise exception 'FALLA %: un turista vio el nivel de otro', n; end if;
    select count(*) into c from public.calcular_nivel(tur_b);
    n := n + 1; if c <> 1 then raise exception 'FALLA %: un turista debe ver su propio nivel', n; end if;
    select count(*) into c from public.calcular_nivel(null);
    n := n + 1; if c <> 0 then raise exception 'FALLA %: usuario nulo debe dar vacío', n; end if;
    n := n + 1;
    begin
        perform * from public.nivel_por_puntos(10);
        raise exception 'FALLA %: authenticated pudo ejecutar nivel_por_puntos (es interna)', n;
    exception when insufficient_privilege then null; end;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select nivel_actual into cnt from public.calcular_nivel(tur_a);
    n := n + 1; if cnt is distinct from 8 then raise exception 'FALLA %: el admin debe ver el nivel de otro (vio %)', n, cnt; end if;
    reset role;

    -- ---------- accesorios ----------
    n := n + 1;
    if (select array_agg(nombre || ':' || nivel_requerido order by nivel_requerido) from public.accesorio_avatar)
       is distinct from array['Sombrero de Palma:5','Bufanda Dariana:10','Máscara del Güegüense:20','Corona de Maestro:30'] then
        raise exception 'FALLA %: accesorios sembrados', n;
    end if;

    -- tur_a está en nivel 8: solo el de nivel 5
    perform set_config('request.jwt.claims', json_build_object('sub', tur_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into c from public.accesorios_desbloqueados(tur_a);
    n := n + 1; if c <> 1 then raise exception 'FALLA %: en nivel 8 solo el accesorio del nivel 5 (vio %)', n, c; end if;
    select count(*) into c from public.accesorio_avatar;
    n := n + 1; if c <> 1 then raise exception 'FALLA %: la tabla debe mostrar solo accesorios de mi nivel o menor (vio %)', n, c; end if;
    select count(*) into c from public.accesorios_desbloqueados(tur_b);
    n := n + 1; if c <> 0 then raise exception 'FALLA %: no se pueden pedir los accesorios de otro usuario', n; end if;
    n := n + 1;
    begin
        insert into public.accesorio_avatar (nombre, nivel_requerido) values ('Truco', 1);
        raise exception 'FALLA %: authenticated pudo crear un accesorio', n;
    exception when insufficient_privilege then null; end;
    n := n + 1;
    begin
        update public.accesorio_avatar set nivel_requerido = 1;
        raise exception 'FALLA %: authenticated pudo bajar el nivel de un accesorio', n;
    exception when insufficient_privilege then null; end;
    -- ni siquiera puede cambiar el rango de un sitio (la RLS de sitio no deja escribir)
    update public.sitio set rango = 'oro' where id = 12;
    get diagnostics cnt = row_count;
    n := n + 1; if cnt <> 0 then raise exception 'FALLA %: authenticated pudo cambiar el rango de un sitio', n; end if;
    reset role;

    -- tur_b sin sellos (nivel 1): ningún accesorio
    perform set_config('request.jwt.claims', json_build_object('sub', tur_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into c from public.accesorio_avatar;
    n := n + 1; if c <> 0 then raise exception 'FALLA %: en nivel 1 no se ve ningún accesorio (vio %)', n, c; end if;
    reset role;

    -- anon no ve accesorios
    perform set_config('request.jwt.claims', '', true);
    set local role anon;
    n := n + 1;
    begin
        perform 1 from public.accesorio_avatar;
        raise exception 'FALLA %: anon pudo leer accesorio_avatar', n;
    exception when insufficient_privilege then null; end;
    reset role;

    -- el rango de un sitio se puede cambiar como postgres (mantenimiento) y se refleja en los puntos
    update public.sitio set rango = 'oro' where id = 12;
    select * into r from public.calcular_nivel(tur_a);
    n := n + 1; if r.puntos_totales <> 65.5 then raise exception 'FALLA %: subir un sitio de cobre a oro suma 1 punto más (total %)', n, r.puntos_totales; end if;

    raise exception 'OK: % comprobaciones (rollback)', n;
end
$t$;
