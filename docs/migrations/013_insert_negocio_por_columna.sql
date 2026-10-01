-- docs/migrations/013_insert_negocio_por_columna.sql
--
-- Cierra el hueco de registro antes de activar el candado de suscripción.
--
-- Hasta 012, authenticated tenía INSERT sobre TODAS las columnas de negocio y la
-- política negocio_insert_duenio solo valida usuario_id. Un usuario podía crear
-- su negocio ya con estado = 'activo', suscripcion_activa = true y un
-- vencimiento arbitrario, saltándose la aprobación del admin.
--
-- Mismo enfoque que ya protege el UPDATE (documentado en 012): se quita el INSERT
-- a nivel de tabla y se otorga INSERT solo por columna, sobre las mismas columnas
-- que authenticated ya puede editar más usuario_id (que la política obliga a que
-- sea auth.uid()).
--
-- Columnas que authenticated ya NO puede escribir al insertar (toman su default):
--   id                              -> identity
--   estado                          -> 'pendiente'
--   motivo_rechazo                  -> null
--   fecha_envio                     -> now()
--   fecha_aprobacion                -> null
--   fecha_vencimiento_suscripcion   -> null
--   suscripcion_activa              -> false
--
-- No rompe el registro: useNegocio.registrar() solo manda usuario_id,
-- nombre_negocio, categoria, responsable, cedula_ruc, latitud y longitud.
-- El .select() posterior sigue funcionando: el SELECT de authenticated no cambia.
--
-- Hacia adelante: no modifica filas existentes. No toca el UPDATE.

begin;

revoke insert on public.negocio from authenticated;

grant insert (usuario_id, nombre_negocio, categoria, responsable, cedula_ruc,
              telefono, latitud, longitud, descripcion, logo_url)
  on public.negocio to authenticated;

-- Confirmación: falla si quedara abierta alguna columna de confianza.
do $$
declare
  c text;
begin
  foreach c in array array['id', 'estado', 'motivo_rechazo', 'fecha_envio', 'fecha_aprobacion',
                           'fecha_vencimiento_suscripcion', 'suscripcion_activa'] loop
    if has_column_privilege('authenticated', 'public.negocio', c, 'INSERT') then
      raise exception 'authenticated todavía puede insertar negocio.%', c;
    end if;
  end loop;
end;
$$;

commit;
