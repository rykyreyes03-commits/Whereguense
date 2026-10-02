-- docs/migrations/022_actividad_negocio_publica.sql
--
-- Lectura pública de actividades sin justificacion_sello ni motivo_rechazo_sello.
--
--   - Vista actividad_negocio_publica: mismas columnas que actividad_negocio menos
--     justificacion_sello y motivo_rechazo_sello, con el mismo filtro que tenía la
--     política pública: fecha_inicio y fecha_fin presentes + negocio_visible(negocio_id).
--   - La vista sola no alcanza: mientras la tabla tuviera la política pública, la API
--     seguiría dejando leer la justificación y el motivo directo de actividad_negocio.
--     Por eso se QUITA actividad_negocio_select_publica y se revoca a anon el SELECT
--     de la tabla. En la tabla quedan solo el dueño (actividad_negocio_select_duenio)
--     y el admin (actividad_negocio_select_admin), que sí ven todo.
--   - La vista corre con los permisos de su dueño (security_invoker = false) para
--     poder mostrar filas que el público ya no lee en la tabla; aplica el filtro ella
--     misma. No puede ser security_invoker con GRANT por columna: los permisos por
--     columna son por rol, y un turista logueado y el dueño son el mismo rol
--     (authenticated).
--   - security_barrier = true: el planificador no evalúa condiciones del que consulta
--     antes que el filtro de la vista (evita filtrar filas ocultas con funciones).
--
-- El frontend público (Eventos del turista, ficha del negocio) debe leer de
-- actividad_negocio_publica, nunca de actividad_negocio.

begin;

drop policy actividad_negocio_select_publica on public.actividad_negocio;
revoke select on public.actividad_negocio from anon;

create view public.actividad_negocio_publica
with (security_invoker = false, security_barrier = true)
as
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
  and public.negocio_visible(a.negocio_id);

comment on view public.actividad_negocio_publica is
    'Lectura pública de actividad_negocio: solo con fechas y negocio visible, sin justificacion_sello ni motivo_rechazo_sello (022). Corre con permisos del dueño a propósito.';

revoke all on public.actividad_negocio_publica from anon, authenticated;
grant select on public.actividad_negocio_publica to anon, authenticated;

commit;
