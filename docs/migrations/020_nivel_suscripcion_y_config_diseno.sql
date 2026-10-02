-- docs/migrations/020_nivel_suscripcion_y_config_diseno.sql
--
-- Base de datos para niveles de suscripción y personalización del perfil del negocio.
-- Solo base de datos: ninguna pantalla usa todavía estas columnas.
--
--   1. negocio.nivel_suscripcion ('basico' | 'profesional', default 'profesional':
--      durante los 6 meses gratis el negocio prueba el nivel completo).
--      negocio.config_diseno (jsonb, objeto): paleta, tipografía, portada, orden de
--      secciones y, más adelante, las piezas de Profesional. Un solo campo flexible
--      para no migrar cada vez que se agregue una opción de diseño.
--   2. admin_renovar_suscripcion(p_negocio_id, p_meses, p_nivel default 'profesional').
--      Se BORRA la versión de 2 parámetros: si se dejara, CREATE OR REPLACE crearía
--      una segunda sobrecarga y admin_renovar_suscripcion(id) sería ambigua.
--   3. El dueño puede escribir config_diseno (GRANT UPDATE por columna); NO
--      nivel_suscripcion, que solo cambia la función de admin. Tampoco puede
--      insertarlas (013 no las incluye: toman su default).
--   4. Trigger negocio_validar_config_diseno: un negocio que no está en
--      'profesional' no puede AGREGAR ni MODIFICAR las claves de Profesional
--      (estilo_tarjetas, animaciones, set_iconos, secciones_visibles).
--      Sí puede conservarlas tal cual o quitarlas: si no, un negocio bajado de
--      Profesional a Básico no podría ni cambiar su paleta (su config seguiría
--      teniendo esas claves), y la propia bajada de nivel quedaría bloqueada.
--      Solo se evalúa cuando cambia config_diseno, y solo para usuarios de la app
--      (current_user = authenticated), mismo patrón que resena_validar_update (019).
--      Al mostrar el perfil, el frontend debe ignorar las claves de Profesional de
--      un negocio en Básico.

begin;

-- -----------------------------------------------------------------------------
-- 1. Columnas
-- -----------------------------------------------------------------------------
alter table public.negocio
    add column nivel_suscripcion text not null default 'profesional'
        constraint negocio_nivel_suscripcion_valido
        check (nivel_suscripcion in ('basico', 'profesional')),
    add column config_diseno jsonb not null default '{}'::jsonb
        constraint negocio_config_diseno_es_objeto
        check (jsonb_typeof(config_diseno) = 'object');

comment on column public.negocio.nivel_suscripcion is
    'basico | profesional. Solo lo cambian funciones de admin (020).';
comment on column public.negocio.config_diseno is
    'Personalización del perfil (paleta, tipografía, portada, orden de secciones, piezas de Profesional). Objeto JSON (020).';

-- -----------------------------------------------------------------------------
-- 2. Renovación con nivel
-- -----------------------------------------------------------------------------
drop function public.admin_renovar_suscripcion(integer, integer);

create function public.admin_renovar_suscripcion(
    p_negocio_id integer,
    p_meses integer default 6,
    p_nivel text default 'profesional'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_rol text;
  v_vence timestamptz;
BEGIN
  SELECT rol INTO v_rol FROM usuario WHERE id = auth.uid();
  IF v_rol IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso de administrador.');
  END IF;

  IF p_meses IS NULL OR p_meses < 1 OR p_meses > 36 THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'La cantidad de meses debe estar entre 1 y 36.');
  END IF;

  IF p_nivel IS NULL OR p_nivel NOT IN ('basico', 'profesional') THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'El nivel debe ser basico o profesional.');
  END IF;

  -- Solo negocios ya aprobados: renovar no aprueba un pendiente ni revive un rechazado.
  UPDATE negocio
  SET fecha_vencimiento_suscripcion = GREATEST(now(), fecha_vencimiento_suscripcion)
                                      + make_interval(months => p_meses),
      suscripcion_activa = true,
      nivel_suscripcion = p_nivel
  WHERE id = p_negocio_id
    AND estado = 'activo'
  RETURNING fecha_vencimiento_suscripcion INTO v_vence;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Negocio no encontrado o no está aprobado.');
  END IF;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Suscripción renovada.', 'vence', v_vence, 'nivel', p_nivel);
END;
$function$;

comment on function public.admin_renovar_suscripcion(integer, integer, text) is
    'Renueva la suscripcion de un negocio activo: vence = GREATEST(now(), vencimiento actual) + p_meses (default 6, rango 1-36), suscripcion_activa = true y nivel_suscripcion = p_nivel (default profesional). Solo rol=admin (014, nivel en 020).';

revoke execute on function public.admin_renovar_suscripcion(integer, integer, text) from public, anon;
grant execute on function public.admin_renovar_suscripcion(integer, integer, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Permiso por columna: el dueño puede escribir config_diseno (no el nivel)
-- -----------------------------------------------------------------------------
grant update (config_diseno) on public.negocio to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Trigger: claves de Profesional
-- -----------------------------------------------------------------------------
create or replace function public.negocio_validar_config_diseno()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  claves_pro constant text[] := array['estilo_tarjetas', 'animaciones', 'set_iconos', 'secciones_visibles'];
  pro_nuevo jsonb;
  pro_viejo jsonb;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if new.config_diseno is not distinct from old.config_diseno
     or new.nivel_suscripcion = 'profesional' then
    return new;
  end if;

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into pro_nuevo
  from jsonb_each(new.config_diseno) e where e.key = any (claves_pro);

  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into pro_viejo
  from jsonb_each(old.config_diseno) e where e.key = any (claves_pro);

  -- Permitido: conservar o quitar claves de Profesional. Prohibido: agregarlas o cambiarlas.
  if not (pro_nuevo <@ pro_viejo) then
    raise exception 'Esta función requiere el plan Profesional.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger negocio_validar_config_diseno
    before update on public.negocio
    for each row execute function public.negocio_validar_config_diseno();

commit;
