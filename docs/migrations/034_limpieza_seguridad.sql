-- docs/migrations/034_limpieza_seguridad.sql
--
-- Limpieza de seguridad. Cuatro cosas:
--
--  0. HALLAZGO CRÍTICO: nadie puede cambiarse el rol. Hasta hoy `usuario` daba UPDATE e INSERT por tabla completa a
--     authenticated y la política usuario_all_owner solo pedía id = auth.uid(): cualquier persona con sesión podía
--     ejecutar `update usuario set rol = 'admin' where id = auth.uid()` y pasar a ser administradora (aprobar negocios,
--     renovar suscripciones, moderar reseñas). Se probó con rollback en producción. Un trigger lo impide sin tocar permisos
--     ni el frontend (que inserta su fila con rol 'turista'); el rol de administrador se sigue asignando por SQL.
--  1. EXECUTE: las funciones que exigen sesión dejan de ser ejecutables por anon y PUBLIC. Se otorga EXECUTE a
--     authenticated y service_role de forma EXPLÍCITA (si solo se revocara PUBLIC, authenticated podía perderlo).
--     NO se tocan las que usan las políticas de lectura ni las públicas: negocio_visible, es_duenio_negocio,
--     actividades_negocio_publicas, resenas_publicas, resumen_resenas (ni etiquetas_validas, que usa una restricción CHECK).
--  2. Permisos de tablas: se quita TRUNCATE, TRIGGER y REFERENCES a anon y authenticated en todas las tablas de public
--     (ninguna pantalla los usa; TRUNCATE además se salta RLS), y DELETE de negocio a authenticated (nadie borra un negocio
--     desde la app; la política negocio_delete_duenio queda sin efecto). Las tablas nuevas tampoco los reciben por defecto.
--  3. distancia_metros con search_path fijo.
--  4. admin_aprobar_sello (031/033) con search_path vacío y tablas calificadas, como el resto de las funciones nuevas
--     (hallazgo menor de la revisión de código; mismo comportamiento).

begin;

-- -----------------------------------------------------------------------------
-- 0. El rol no se elige ni se cambia desde la API
-- -----------------------------------------------------------------------------
create or replace function public.usuario_proteger_rol()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- current_user es el rol de la API (authenticated/anon) solo cuando el cambio viene de un cliente; las funciones
  -- SECURITY DEFINER, el SQL editor y service_role no pasan por aquí.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.rol is distinct from 'turista' then
      raise exception 'No puedes elegir tu rol.' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.rol is distinct from old.rol then
      raise exception 'No puedes cambiar tu rol.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.usuario_proteger_rol() is
    'BEFORE INSERT/UPDATE en usuario: desde la API solo se crea con rol turista y el rol no se modifica (034).';

drop trigger if exists usuario_proteger_rol on public.usuario;
create trigger usuario_proteger_rol
    before insert or update on public.usuario
    for each row execute function public.usuario_proteger_rol();

-- -----------------------------------------------------------------------------
-- 1. EXECUTE solo para quien tiene sesión
-- -----------------------------------------------------------------------------
revoke execute on function public.canjear_qr_sello(text)                         from public, anon;
revoke execute on function public.mis_actividades_qr(integer)                    from public, anon;
revoke execute on function public.admin_aprobar_negocio(integer)                 from public, anon;
revoke execute on function public.admin_rechazar_negocio(integer, text)          from public, anon;
revoke execute on function public.admin_aprobar_sello(bigint)                    from public, anon;
revoke execute on function public.admin_rechazar_sello(bigint, text)             from public, anon;
revoke execute on function public.admin_borrar_resena(bigint)                    from public, anon;
revoke execute on function public.admin_renovar_suscripcion(integer, integer, text) from public, anon;
revoke execute on function public.admin_resenas()                                from public, anon;

grant execute on function public.canjear_qr_sello(text)                          to authenticated, service_role;
grant execute on function public.mis_actividades_qr(integer)                     to authenticated, service_role;
grant execute on function public.admin_aprobar_negocio(integer)                  to authenticated, service_role;
grant execute on function public.admin_rechazar_negocio(integer, text)           to authenticated, service_role;
grant execute on function public.admin_aprobar_sello(bigint)                     to authenticated, service_role;
grant execute on function public.admin_rechazar_sello(bigint, text)              to authenticated, service_role;
grant execute on function public.admin_borrar_resena(bigint)                     to authenticated, service_role;
grant execute on function public.admin_renovar_suscripcion(integer, integer, text) to authenticated, service_role;
grant execute on function public.admin_resenas()                                 to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Permisos de tablas
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate, trigger, references on public.%I from anon, authenticated', t.tablename);
  end loop;
end
$$;

alter default privileges for role postgres in schema public revoke truncate, trigger, references on tables from anon, authenticated;

revoke delete on public.negocio from authenticated;

-- -----------------------------------------------------------------------------
-- 3. distancia_metros: search_path fijo (solo usa funciones y operadores de pg_catalog)
-- -----------------------------------------------------------------------------
alter function public.distancia_metros(double precision, double precision, double precision, double precision)
    set search_path = '';

-- -----------------------------------------------------------------------------
-- 4. admin_aprobar_sello con search_path vacío (mismo cuerpo que la 033, con las tablas calificadas)
-- -----------------------------------------------------------------------------
create or replace function public.admin_aprobar_sello(p_actividad_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
DECLARE
  v_rol text;
  v_act public.actividad_negocio;
  v_qr_id integer;
BEGIN
  SELECT rol INTO v_rol FROM public.usuario WHERE id = auth.uid();
  IF v_rol IS DISTINCT FROM 'admin' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso de administrador.');
  END IF;

  SELECT * INTO v_act FROM public.actividad_negocio WHERE id = p_actividad_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Actividad no encontrada.');
  END IF;

  IF public.es_duenio_negocio(v_act.negocio_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'No puedes aprobar el sello de tu propio negocio.');
  END IF;

  IF NOT v_act.solicita_sello OR v_act.estado_sello <> 'pendiente' THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad no tiene una solicitud de sello pendiente.');
  END IF;

  IF v_act.fecha_fin IS NOT NULL
     AND public.fin_de_actividad(v_act.fecha_fin, v_act.hora_inicio, v_act.hora_fin) <= now() THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Esta actividad ya terminó.');
  END IF;

  INSERT INTO public.qr_sello (negocio_id, token, nombre_actividad, limite_canjes, fecha_expiracion)
  VALUES (v_act.negocio_id,
          upper(replace(gen_random_uuid()::text, '-', '')),
          v_act.nombre,
          v_act.limite_canjes,
          public.fin_de_actividad(v_act.fecha_fin, v_act.hora_inicio, v_act.hora_fin))
  RETURNING id INTO v_qr_id;

  UPDATE public.actividad_negocio
  SET estado_sello = 'aprobado', qr_sello_id = v_qr_id, motivo_rechazo_sello = NULL
  WHERE id = p_actividad_id;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Sello aprobado.', 'qr_sello_id', v_qr_id);
END;
$$;

commit;
