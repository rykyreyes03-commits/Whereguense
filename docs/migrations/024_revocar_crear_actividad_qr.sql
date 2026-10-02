-- docs/migrations/024_revocar_crear_actividad_qr.sql
--
-- Cierra el hueco que quedó pendiente en 021: crear_actividad_qr crea un qr_sello
-- escaneable al instante, sin la aprobación del admin. El frontend ya no la usa
-- (GenerarQR ahora inserta en actividad_negocio y pide el sello; el admin lo aprueba
-- con admin_aprobar_sello, que crea el qr_sello por su cuenta).
--
-- OJO: no alcanza con revocar a authenticated. La función tenía EXECUTE para PUBLIC
-- (el default de Postgres, nunca se revocó en 008) y authenticated lo hereda de
-- PUBLIC. Se revoca a PUBLIC, anon y authenticated; quedan postgres y service_role.
--
-- No se borra la función: los qr_sello que ya creó siguen funcionando igual
-- (canjear_qr_sello no depende de ella).

begin;

revoke execute on function public.crear_actividad_qr(integer, text, text, integer, timestamptz)
    from public, anon, authenticated;

grant execute on function public.crear_actividad_qr(integer, text, text, integer, timestamptz)
    to service_role;

comment on function public.crear_actividad_qr(integer, text, text, integer, timestamptz) is
    'Obsoleta desde 024: ya no se puede llamar desde la app (sin EXECUTE para anon/authenticated). Los sellos se piden con actividad_negocio y los aprueba admin_aprobar_sello.';

commit;
