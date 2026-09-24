-- 009_correccion_coordenadas_sitio.sql
-- Corrige coordenadas de public.sitio para que coincidan con las de
-- src/data/sitios.js (fuente verificada en campo / Google Maps).
-- Ver docs/migrations/009... : detectado que 4 de los 10 sitios activos
-- (ids 1,2,4,5,6,7,9) tenían coordenadas desalineadas entre frontend y BD.

begin;

update public.sitio set latitud = 12.435035, longitud = -86.878133 where id = 1;
update public.sitio set latitud = 12.402978, longitud = -86.615905 where id = 2;
-- id 3 ya coincide, sin cambio
update public.sitio set latitud = 12.434634, longitud = -86.879385 where id = 4;
update public.sitio set latitud = 12.438,    longitud = -86.88     where id = 5;
update public.sitio set latitud = 12.434744, longitud = -86.879495 where id = 6;  -- NUEVO: coordenada real de Google Maps, no la de Parque Central
update public.sitio set latitud = 12.433721, longitud = -86.880561 where id = 7;
-- id 8 ya coincide, sin cambio
update public.sitio set latitud = 12.437558, longitud = -86.877    where id = 9;
-- id 10 ya coincide, sin cambio

commit;
