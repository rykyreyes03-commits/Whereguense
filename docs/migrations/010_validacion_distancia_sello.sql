-- docs/migrations/010_validacion_distancia_sello.sql
--
-- Estado en producción al momento de escribir este archivo (verificado
-- 2026-09-22): la columna sitio.radio_sello_metros, la función
-- sellar_por_geolocalizacion() y la policy sello_select_owner YA fueron
-- aplicadas con una versión previa de esta misma migración (haversine
-- inline en vez de función separada, GRANT a anon+authenticated+
-- service_role en vez de solo authenticated, sin validación de rango de
-- lat/lng). Este archivo es la versión final acordada y reemplaza esa
-- primera pasada como fuente de verdad del repo. La policy
-- sello_select_owner (SELECT-only, reemplazando la ALL original
-- "sello_all_owner") se decidió mantener tal cual quedó aplicada, aunque
-- esta migración no la vuelve a tocar.
--
-- Pendiente de aplicar contra producción: el CREATE OR REPLACE de
-- sellar_por_geolocalizacion y los GRANT de este archivo difieren de lo
-- que ya corre en prod (ver arriba) — no se han vuelto a aplicar todavía.

begin;

-- Radio de validación por sitio (default 80m; reducido para el cluster
-- del centro histórico donde Parque Central, Casa de la Cultura y Museo
-- de la Revolución están a 17-78m entre sí)
alter table public.sitio
    add column if not exists radio_sello_metros integer not null default 80;

comment on column public.sitio.radio_sello_metros is
    'Radio en metros para validar sello por geolocalización. Default 80; reducido para sitios muy cercanos entre sí.';

update public.sitio set radio_sello_metros = 30 where id in (3, 4, 6);

-- Función auxiliar: misma fórmula haversine que src/utils/geo.js
create or replace function public.distancia_metros(
    lat1 double precision, lng1 double precision,
    lat2 double precision, lng2 double precision
)
returns double precision
language sql
immutable
as $function$
  select 6371000 * 2 * asin(sqrt(
    sin(radians(lat2 - lat1) / 2) ^ 2 +
    cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ^ 2
  ));
$function$;

comment on function public.distancia_metros(double precision, double precision, double precision, double precision) is
    'Distancia en metros entre dos coordenadas (haversine). Replica src/utils/geo.js. 010.';

-- Función principal: otorga sello por geolocalización, validando distancia
-- server-side contra el radio propio de cada sitio. Reemplaza el INSERT
-- directo del cliente (useSellos.js:51-59) que 007 ya había señalado como
-- pendiente de cerrar.
create or replace function public.sellar_por_geolocalizacion(
    p_sitio_id integer,
    p_lat double precision,
    p_lng double precision
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_usuario_id uuid := auth.uid();
  v_sitio RECORD;
  v_distancia double precision;
  v_nuevo_id bigint;
BEGIN
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Necesitas iniciar sesión.');
  END IF;

  IF p_lat IS NULL OR p_lng IS NULL
     OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No se pudo obtener tu ubicación.');
  END IF;

  SELECT id, nombre, latitud, longitud, radio_sello_metros INTO v_sitio
  FROM sitio WHERE id = p_sitio_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Sitio no válido.');
  END IF;

  v_distancia := public.distancia_metros(p_lat, p_lng, v_sitio.latitud, v_sitio.longitud);

  IF v_distancia > v_sitio.radio_sello_metros THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Necesitas estar más cerca de ' || v_sitio.nombre || ' para sellar.');
  END IF;

  INSERT INTO sello (usuario_id, sitio_id, tipo)
  VALUES (v_usuario_id, p_sitio_id, 'geolocalizacion')
  RETURNING id INTO v_nuevo_id;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', '¡Sello obtenido en ' || v_sitio.nombre || '!',
    'sello_id', v_nuevo_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Ya tienes el sello de ' || v_sitio.nombre || '.');
END;
$function$;

comment on function public.sellar_por_geolocalizacion(integer, double precision, double precision) is
    'Otorga sello por geolocalización validando distancia server-side contra el radio propio de cada sitio. 010.';

revoke execute on function public.sellar_por_geolocalizacion(integer, double precision, double precision) from public, anon;
revoke execute on function public.distancia_metros(double precision, double precision, double precision, double precision) from public, anon;

grant execute on function public.sellar_por_geolocalizacion(integer, double precision, double precision) to authenticated;
grant execute on function public.distancia_metros(double precision, double precision, double precision, double precision) to authenticated;

commit;
