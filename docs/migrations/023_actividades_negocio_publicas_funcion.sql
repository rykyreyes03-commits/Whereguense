-- docs/migrations/023_actividades_negocio_publicas_funcion.sql
--
-- Reemplaza la vista actividad_negocio_publica (022) por la función
-- actividades_negocio_publicas(): mismas columnas (sin justificacion_sello ni
-- motivo_rechazo_sello) y mismo filtro (con fechas + negocio_visible).
--
-- Motivo: el linter de Supabase marca las vistas SECURITY DEFINER como ERROR
-- (security_definer_view). La función hace lo mismo y queda como WARN, igual que el
-- resto de las funciones SECURITY DEFINER del proyecto.
--
-- Permisos: a diferencia de las funciones de admin, esta es pública a propósito:
-- los visitantes sin sesión (anon) tienen que poder ver las actividades. Se revoca
-- el EXECUTE por defecto de PUBLIC y se otorga explícitamente a anon, authenticated
-- y service_role.
--
-- Una función SQL SECURITY DEFINER nunca se inlinea: los filtros que agregue el que
-- consulta (p. ej. ?negocio_id=eq.1 en la API REST) se aplican sobre el resultado ya
-- filtrado, igual que el security_barrier de la vista.
--
-- Uso desde el frontend: supabase.rpc('actividades_negocio_publicas').eq('negocio_id', id)
-- La tabla actividad_negocio sigue sin lectura pública (022): solo dueño y admin.

begin;

drop view public.actividad_negocio_publica;

create function public.actividades_negocio_publicas()
returns table (
    id              bigint,
    negocio_id      integer,
    nombre          text,
    descripcion     text,
    fecha_inicio    date,
    fecha_fin       date,
    solicita_sello  boolean,
    estado_sello    text,
    qr_sello_id     integer,
    evento_id       integer,
    fecha_creacion  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        a.id,
        a.negocio_id,
        a.nombre,
        a.descripcion,
        a.fecha_inicio,
        a.fecha_fin,
        a.solicita_sello,
        a.estado_sello,
        a.qr_sello_id,
        a.evento_id,
        a.fecha_creacion
    from public.actividad_negocio a
    where a.fecha_inicio is not null
      and a.fecha_fin is not null
      and public.negocio_visible(a.negocio_id)
    order by a.fecha_inicio, a.id;
$$;

comment on function public.actividades_negocio_publicas() is
    'Lectura pública de actividad_negocio: solo con fechas y negocio visible, sin justificacion_sello ni motivo_rechazo_sello. Reemplaza la vista de 022 (023).';

revoke execute on function public.actividades_negocio_publicas() from public;
grant execute on function public.actividades_negocio_publicas() to anon, authenticated, service_role;

commit;
