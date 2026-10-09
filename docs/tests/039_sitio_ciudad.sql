-- docs/tests/039_sitio_ciudad.sql
--
-- Verificación de la migración 039 (sitio.ciudad). Solo lectura más un intento de escritura como anon dentro de un ROLLBACK:
-- no deja datos. Si algo falla, aborta con "FALLA n: ..."; si todo pasa, aborta a propósito con "OK: N comprobaciones (rollback)".

do $t$
declare
    n int := 0;
    cnt int;
    ins int;
begin
    n := n + 1;
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = 'sitio' and column_name = 'ciudad'
                     and data_type = 'text' and is_nullable = 'NO' and column_default like '%León%') then
        raise exception 'FALLA %: sitio.ciudad debe ser text not null con default León', n;
    end if;

    n := n + 1;
    if (select count(*) from public.sitio where ciudad <> 'León') <> 0 then
        raise exception 'FALLA %: todos los sitios actuales deben ser de León', n;
    end if;

    n := n + 1;
    if (select count(*) from public.sitio) <> (select count(*) from public.sitio where ciudad = 'León') then
        raise exception 'FALLA %: ningún sitio puede quedar sin ciudad', n;
    end if;

    -- un sitio nuevo sin ciudad queda en León (necesita una insignia propia: es 1 a 1)
    n := n + 1;
    insert into public.insignia (clave, nombre, imagen_url) values ('prueba_039', 'Prueba 039', 'x') returning id into ins;
    insert into public.sitio (id, insignia_id, nombre, descripcion_corta, historia, latitud, longitud)
        values (999999, ins, 'Sitio de prueba', 'x', 'x', 12.4, -86.9);
    if (select ciudad from public.sitio where id = 999999) <> 'León' then
        raise exception 'FALLA %: un sitio nuevo sin ciudad debe quedar en León', n;
    end if;

    -- anon lee la ciudad pero no la puede cambiar (la RLS de sitio solo tiene SELECT)
    set local role anon;
    n := n + 1;
    if (select count(distinct ciudad) from public.sitio) <> 1 then
        raise exception 'FALLA %: anon debe poder leer sitio.ciudad', n;
    end if;
    update public.sitio set ciudad = 'Managua' where id = 1;
    get diagnostics cnt = row_count;
    n := n + 1;
    if cnt <> 0 then
        raise exception 'FALLA %: anon pudo cambiar la ciudad de un sitio', n;
    end if;
    reset role;

    raise exception 'OK: % comprobaciones (rollback)', n;
end
$t$;
