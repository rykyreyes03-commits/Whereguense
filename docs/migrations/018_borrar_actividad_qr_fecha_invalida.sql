-- docs/migrations/018_borrar_actividad_qr_fecha_invalida.sql
--
-- Corrección de datos: borra la actividad QR "dia de la mujer" (qr_sello.id = 1,
-- negocio 1), creada el 2026-09-04 con fecha_expiracion = 32003-05-03, una fecha
-- imposible de interpretar con certeza. Decisión del equipo: eliminarla.
--
-- Comprobado justo antes de aplicar:
--   - 0 filas en sello con qr_sello_id = 1 (la única FK hacia qr_sello es
--     sello.sello_qr_sello_id_fkey, on delete restrict).
--   - Ningún evento asociado ("Actividad de sello: dia de la mujer").
--
-- Las mismas condiciones van dentro del DELETE: si algo cambió (p. ej. alguien la
-- canjeó), no borra nada y la migración falla en vez de borrar otra cosa.

begin;

do $$
declare
  v_borradas integer;
begin
  delete from public.qr_sello q
  where q.id = 1
    and q.negocio_id = 1
    and q.nombre_actividad = 'dia de la mujer'
    and extract(year from q.fecha_expiracion) = 32003
    and not exists (select 1 from public.sello s where s.qr_sello_id = q.id);

  get diagnostics v_borradas = row_count;
  if v_borradas <> 1 then
    raise exception 'Se esperaba borrar 1 actividad QR y se borraron %: no coincide lo verificado, no se aplica', v_borradas;
  end if;
end;
$$;

commit;
