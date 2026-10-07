-- docs/tests/037_sitio_galeria_resenas.sql
--
-- Pruebas de la migración 037 (bucket sitios, sitio_foto, resena_sitio). Todo corre en UNA transacción y termina en ROLLBACK:
-- no deja datos. Si una comprobación falla, el bloque aborta con "FALLA n: ..." ; si todas pasan, aborta a propósito con
-- "OK: N comprobaciones (rollback)" para que no quede nada. Se ejecuta tal cual (psql o execute_sql del panel).
-- Usuarios de la prueba: el admin y dos turistas reales (solo se simula su JWT; no se escribe en usuario).

do $t$
declare
    admin_id  uuid := 'f9fa4efb-d727-42f9-9f63-1959d58a873f';
    tur_a     uuid := '46358b91-b045-4fbe-8193-f41805db2e58';
    tur_b     uuid := 'a7094b99-c19e-43a0-8546-0c45dadf9965';
    n         int := 0;
    r         jsonb;
    c         bigint;
    rid       uuid;
    err       text;
    base      text := 'https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/sitios/';
begin
    -- ---------- bucket ----------
    n := n + 1;
    if not exists (select 1 from storage.buckets where id = 'sitios' and public and file_size_limit = 10485760
                   and allowed_mime_types = array['image/jpeg','image/png','image/webp']) then
        raise exception 'FALLA %: bucket sitios mal configurado', n;
    end if;

    -- ---------- sitio_foto: como service_role/postgres ----------
    insert into public.sitio_foto (sitio_id, url, orden, es_portada) values (1, base || '1/galeria/01_a.jpg', 0, true);
    insert into public.sitio_foto (sitio_id, url, orden, es_portada) values (1, base || '1/galeria/02_b.jpg', 1, false);
    n := n + 1;  -- insert válido pasa

    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden, es_portada) values (1, base || '1/galeria/03_c.jpg', 2, true);
        raise exception 'FALLA %: dos portadas en un sitio', n;
    exception when unique_violation then null; end;

    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (1, base || '1/galeria/04_d.jpg', 1);
        raise exception 'FALLA %: orden repetido', n;
    exception when unique_violation then null; end;

    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (1, base || '2/galeria/05_e.jpg', 5);
        raise exception 'FALLA %: url de la carpeta de OTRO sitio', n;
    exception when check_violation then null; end;

    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (1, 'https://evil.example.com/1/galeria/x.jpg', 6);
        raise exception 'FALLA %: url de otro host', n;
    exception when check_violation then null; end;

    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (1, base || '1/galeria/../x.jpg', 7);
        raise exception 'FALLA %: ruta con ..', n;
    exception when check_violation then null; end;

    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (999999, base || '999999/galeria/x.jpg', 0);
        raise exception 'FALLA %: sitio inexistente', n;
    exception when foreign_key_violation then null; end;

    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (1, base || '1/galeria/neg.jpg', -1);
        raise exception 'FALLA %: orden negativo', n;
    exception when check_violation then null; end;

    -- ---------- sitio_foto: permisos ----------
    set local role anon;
    select count(*) into c from public.sitio_foto;
    n := n + 1; if c <> 2 then raise exception 'FALLA %: anon debe leer la galería (vio %)', n, c; end if;
    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (1, base || '1/galeria/z.jpg', 9);
        raise exception 'FALLA %: anon pudo insertar foto', n;
    exception when insufficient_privilege then null; end;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', tur_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    n := n + 1;
    begin
        insert into public.sitio_foto (sitio_id, url, orden) values (1, base || '1/galeria/z.jpg', 9);
        raise exception 'FALLA %: authenticated pudo insertar foto', n;
    exception when insufficient_privilege then null; end;
    n := n + 1;
    begin
        update public.sitio_foto set orden = 50 where sitio_id = 1;
        raise exception 'FALLA %: authenticated pudo actualizar foto', n;
    exception when insufficient_privilege then null; end;
    n := n + 1;
    begin
        delete from public.sitio_foto;
        raise exception 'FALLA %: authenticated pudo borrar foto', n;
    exception when insufficient_privilege then null; end;
    reset role;

    -- ---------- resena_sitio: la tabla está cerrada ----------
    set local role anon;
    n := n + 1;
    begin
        perform 1 from public.resena_sitio;
        raise exception 'FALLA %: anon pudo leer resena_sitio directo', n;
    exception when insufficient_privilege then null; end;
    reset role;

    perform set_config('request.jwt.claims', json_build_object('sub', tur_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    n := n + 1;
    begin
        perform 1 from public.resena_sitio;
        raise exception 'FALLA %: authenticated pudo leer resena_sitio directo', n;
    exception when insufficient_privilege then null; end;
    n := n + 1;
    begin
        insert into public.resena_sitio (sitio_id, usuario_id, texto, estrellas) values (1, tur_a, 'insert directo no', 5);
        raise exception 'FALLA %: authenticated pudo insertar directo', n;
    exception when insufficient_privilege then null; end;

    -- ---------- guardar_resena_sitio ----------
    r := public.guardar_resena_sitio(1, 5, 'Hermosa catedral, vale la pena subir al techo.');
    n := n + 1; if (r->>'exito')::boolean is not true or (r->>'editada')::boolean then raise exception 'FALLA %: crear reseña: %', n, r; end if;
    rid := (r->>'id')::uuid;

    r := public.guardar_resena_sitio(1, 4, 'Cambié de opinión, está muy bien pero llena.');
    n := n + 1; if (r->>'exito')::boolean is not true or (r->>'editada')::boolean is not true then raise exception 'FALLA %: editar reseña: %', n, r; end if;

    r := public.guardar_resena_sitio(1, 0, 'estrellas en cero no valen');
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: 0 estrellas aceptado', n; end if;
    r := public.guardar_resena_sitio(1, 6, 'seis estrellas no valen');
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: 6 estrellas aceptado', n; end if;
    r := public.guardar_resena_sitio(1, 5, 'corto');
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: texto corto aceptado', n; end if;
    r := public.guardar_resena_sitio(1, 5, '         x         ');
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: texto de espacios aceptado', n; end if;
    r := public.guardar_resena_sitio(1, 5, repeat('a', 1001));
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: texto de 1001 aceptado', n; end if;
    r := public.guardar_resena_sitio(1, 5, repeat('a', 1000));
    n := n + 1; if (r->>'exito')::boolean is not true then raise exception 'FALLA %: texto de 1000 rechazado', n; end if;
    r := public.guardar_resena_sitio(999999, 5, 'sitio que no existe en la base');
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: sitio inexistente aceptado', n; end if;
    r := public.guardar_resena_sitio(null, 5, 'sitio nulo no se acepta');
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: sitio nulo aceptado', n; end if;
    reset role;

    select count(*) into c from public.resena_sitio where sitio_id = 1 and usuario_id = tur_a;
    n := n + 1; if c <> 1 then raise exception 'FALLA %: debe haber UNA reseña por persona y sitio (hay %)', n, c; end if;

    -- sin sesión
    set local role anon;
    n := n + 1;
    begin
        perform public.guardar_resena_sitio(1, 5, 'sin sesión no se puede');
        raise exception 'FALLA %: anon pudo ejecutar guardar_resena_sitio', n;
    exception when insufficient_privilege then null; end;
    reset role;

    -- sin sello: otro turista sin ningún sello puede reseñar
    perform set_config('request.jwt.claims', json_build_object('sub', tur_b, 'role', 'authenticated')::text, true);
    set local role authenticated;
    r := public.guardar_resena_sitio(1, 3, 'Segunda opinión de otra persona, sin sello.');
    n := n + 1; if (r->>'exito')::boolean is not true then raise exception 'FALLA %: turista sin sello no pudo reseñar: %', n, r; end if;
    reset role;

    -- ---------- lectura pública ----------
    perform set_config('request.jwt.claims', '', true);  -- anon real: sin sub
    set local role anon;
    select count(*) into c from public.resenas_sitio_publicas(1);
    n := n + 1; if c <> 2 then raise exception 'FALLA %: anon debe ver 2 reseñas (vio %)', n, c; end if;
    n := n + 1;
    if exists (select 1 from public.resenas_sitio_publicas(1) where es_mia) then raise exception 'FALLA %: es_mia con anon', n; end if;
    n := n + 1;
    if exists (select 1 from public.resenas_sitio_publicas(1) where autor not in ('Viajero') and autor like '%@%') then
        raise exception 'FALLA %: salió un correo como autor', n;
    end if;
    n := n + 1;
    if exists (select 1 from public.resenas_sitio_publicas(1) where autor = 'rykyreyes03+prueba6') then
        raise exception 'FALLA %: el alias por defecto debe ser Viajero', n;
    end if;
    n := n + 1;
    if (select total from public.resumen_resenas_sitio(1)) <> 2
       or (select promedio from public.resumen_resenas_sitio(1)) <> 4.0
       or (select cinco from public.resumen_resenas_sitio(1)) <> 1 then
        -- A terminó en 5 (la edición de 1000 caracteres) y B en 3 -> promedio 4.0
        raise exception 'FALLA %: resumen (esperado total 2, promedio 4.0, una de 5 estrellas)', n;
    end if;
    reset role;

    -- es_mia para el autor
    perform set_config('request.jwt.claims', json_build_object('sub', tur_a, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into c from public.resenas_sitio_publicas(1) where es_mia;
    n := n + 1; if c <> 1 then raise exception 'FALLA %: es_mia debe marcar solo la mía (marcó %)', n, c; end if;

    -- el turista A no puede borrar la reseña del B, ni con la función admin
    r := public.admin_borrar_resena_sitio(rid);
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: un turista borró como admin', n; end if;
    select count(*) into c from public.admin_resenas_sitio();
    n := n + 1; if c <> 0 then raise exception 'FALLA %: un turista vio admin_resenas_sitio', n; end if;

    -- el autor borra la suya
    r := public.eliminar_mi_resena_sitio(1);
    n := n + 1; if (r->>'exito')::boolean is not true then raise exception 'FALLA %: borrar la mía: %', n, r; end if;
    r := public.eliminar_mi_resena_sitio(1);
    n := n + 1; if (r->>'exito')::boolean then raise exception 'FALLA %: borrar dos veces', n; end if;
    reset role;

    -- ---------- admin ----------
    perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    set local role authenticated;
    select count(*) into c from public.admin_resenas_sitio();
    n := n + 1; if c <> 1 then raise exception 'FALLA %: el admin debe ver 1 reseña (vio %)', n, c; end if;
    select id into rid from public.admin_resenas_sitio() limit 1;
    r := public.admin_borrar_resena_sitio(rid);
    n := n + 1; if (r->>'exito')::boolean is not true then raise exception 'FALLA %: el admin no pudo borrar: %', n, r; end if;
    reset role;
    select count(*) into c from public.resena_sitio;
    n := n + 1; if c <> 0 then raise exception 'FALLA %: deben quedar 0 reseñas (quedan %)', n, c; end if;

    -- ---------- borrar un sitio borra sus fotos/reseñas (cascade): se comprueba la restricción ----------
    n := n + 1;
    if not exists (select 1 from pg_constraint where conrelid = 'public.sitio_foto'::regclass and contype = 'f' and confdeltype = 'c') then
        raise exception 'FALLA %: sitio_foto sin cascade', n;
    end if;

    raise exception 'OK: % comprobaciones (rollback)', n;
end
$t$;
