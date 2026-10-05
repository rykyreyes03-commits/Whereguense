-- docs/migrations/030_detalle_editar_eliminar.sql
--
-- Detalle, editar y eliminar en actividades y cupones.
--
-- 1. qr_sello: el dueño pierde INSERT y UPDATE (conserva DELETE, que usa "Sellos anteriores" y que el
--    RESTRICT de sello.qr_sello_id protege). Hasta hoy la política "ALL" le dejaba crear un QR de sello sin
--    aprobación del admin o cambiarle el límite; los sellos solo nacen de admin_aprobar_sello. Todas las
--    funciones que escriben en qr_sello son SECURITY DEFINER (comprobado), así que no se rompe nada.
-- 2. eliminar_actividad(p_id): dueño. Rechaza si ya entregó sellos (consulta explícita, sin depender del
--    RESTRICT). Si no, borra la actividad, su qr_sello, su evento asociado y los favoritos EXACTOS
--    'actividad-<id>' (guardado.tipo = 'evento'). Devuelve foto_ruta para que el frontend la borre de Storage.
-- 3. sellos_entregados_por_actividad(p_negocio_id): el dueño no puede leer sello (RLS: solo el propio
--    usuario), y la pantalla necesita "Ya entregó N sellos".
-- 4. Editar actividad: trigger BEFORE UPDATE (solo escrituras directas del dueño, como los otros triggers de la
--    tabla) que exige los obligatorios de la 029 cuando cambian nombre, categoría, descripción, foto, fechas,
--    horas o lugar, y con sello aprobado rechaza cambiar las fechas (el límite ya lo bloquea
--    actividad_negocio_estado_sello). Trigger AFTER UPDATE SECURITY DEFINER que sincroniza
--    qr_sello.nombre_actividad y la copia en evento.
-- 5. Cupones: eliminar_cupon(p_id) (dueño, solo si nadie lo obtuvo) y trigger BEFORE UPDATE: el porcentaje se
--    bloquea si ya lo obtuvieron, el límite no baja de lo obtenido y el vencimiento solo se amplía.
--
-- Ajustes tras la revisión de código (en la base se aplicaron como una segunda migración, 030_ajustes_tras_revision,
-- con solo las piezas que cambian; este archivo ya trae el estado final): eliminar_actividad no devuelve la ruta de
-- una foto que otra actividad también usa, ignora ?parámetros de la URL y no culpa a los sellos de un error de clave
-- foránea que no es suyo; la foto vacía cuenta como falta; el vencimiento nuevo de un cupón debe ser futuro; y un
-- trigger BEFORE DELETE en qr_sello impide borrar a mano el QR de una actividad.

begin;

-- -----------------------------------------------------------------------------
-- 1. qr_sello: solo las funciones crean y cambian QR
-- -----------------------------------------------------------------------------
revoke insert, update on public.qr_sello from authenticated;
revoke insert, update on public.qr_sello from anon;

-- Con DELETE aún en manos del dueño, borrar a mano el QR de una actividad aprobada la dejaría 'aprobada' sin QR
-- (la clave foránea pone qr_sello_id en NULL). "Sellos anteriores" solo borra QR sin actividad; los de una
-- actividad se quitan al eliminar la actividad (eliminar_actividad corre como su dueño y no pasa por aquí).
create or replace function public.qr_sello_proteger_borrado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and exists (select 1 from public.actividad_negocio where qr_sello_id = old.id) then
    raise exception 'Este sello pertenece a una actividad: para quitarlo, elimina la actividad.' using errcode = '42501';
  end if;
  return old;
end;
$$;

comment on function public.qr_sello_proteger_borrado() is
    'BEFORE DELETE en qr_sello: el dueño no puede borrar a mano el QR de una actividad (030).';

drop trigger if exists qr_sello_proteger_borrado on public.qr_sello;
create trigger qr_sello_proteger_borrado
    before delete on public.qr_sello
    for each row execute function public.qr_sello_proteger_borrado();

-- -----------------------------------------------------------------------------
-- 2 y 3. Eliminar actividad y contar sellos entregados
-- -----------------------------------------------------------------------------
create or replace function public.sellos_entregados_por_actividad(p_negocio_id integer)
returns table (actividad_id bigint, entregados bigint)
language sql
stable
security definer
set search_path = ''
as $$
    select a.id, count(s.id)
    from public.actividad_negocio a
    left join public.sello s on s.qr_sello_id = a.qr_sello_id
    where a.negocio_id = p_negocio_id
      and public.es_duenio_negocio(p_negocio_id)
    group by a.id;
$$;

comment on function public.sellos_entregados_por_actividad(integer) is
    'Para el dueño: cuántos sellos entregó cada actividad de su negocio (0 si no tiene sello aprobado). Vacío para cualquier otro usuario (030).';

revoke execute on function public.sellos_entregados_por_actividad(integer) from public, anon;
grant execute on function public.sellos_entregados_por_actividad(integer) to authenticated, service_role;

create or replace function public.eliminar_actividad(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_act public.actividad_negocio;
  v_entregados bigint := 0;
  v_ruta text;
begin
  select * into v_act from public.actividad_negocio where id = p_id for update;
  -- Sin sesión, actividad ajena o inexistente: el mismo mensaje, para no revelar qué ids existen.
  if not found or auth.uid() is null or not public.es_duenio_negocio(v_act.negocio_id) then
    return jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso sobre esta actividad.');
  end if;

  if v_act.qr_sello_id is not null then
    select count(*) into v_entregados from public.sello where qr_sello_id = v_act.qr_sello_id;
    if v_entregados > 0 then
      return jsonb_build_object(
        'exito', false,
        'sellos_entregados', v_entregados,
        'mensaje', format('Ya entregó %s %s. Puedes editarla, pero no eliminarla.',
                          v_entregados, case when v_entregados = 1 then 'sello' else 'sellos' end));
    end if;
  end if;

  -- La foto vive en el bucket público "negocios": se devuelve su ruta para que el frontend la borre.
  v_ruta := nullif(substring(split_part(coalesce(v_act.foto_url, ''), '?', 1) from '/object/public/negocios/(.+)$'), '');
  -- Si otra actividad usa esa misma foto no se devuelve la ruta: borrarla dejaría a la otra sin imagen.
  if v_ruta is not null
     and exists (select 1 from public.actividad_negocio where foto_url = v_act.foto_url and id <> v_act.id) then
    v_ruta := null;
  end if;

  -- Favoritos de quienes la guardaron: solo las filas exactas 'actividad-<id>' de tipo evento.
  delete from public.guardado where tipo = 'evento' and referencia_id = 'actividad-' || v_act.id::text;

  delete from public.actividad_negocio where id = v_act.id;
  if v_act.qr_sello_id is not null then
    delete from public.qr_sello where id = v_act.qr_sello_id;
  end if;
  if v_act.evento_id is not null then
    delete from public.evento where id = v_act.evento_id and negocio_organizador_id = v_act.negocio_id;
  end if;

  return jsonb_build_object('exito', true, 'mensaje', 'Actividad eliminada.', 'foto_ruta', v_ruta);
exception
  when foreign_key_violation then
    -- Respaldo si alguien canjeó el sello justo ahora (el RESTRICT de sello.qr_sello_id manda). Se vuelve a
    -- contar para no culpar a los sellos de un error que no es de ellos.
    if v_act.qr_sello_id is not null and exists (select 1 from public.sello where qr_sello_id = v_act.qr_sello_id) then
      return jsonb_build_object('exito', false, 'mensaje', 'Ya entregó sellos. Puedes editarla, pero no eliminarla.');
    end if;
    return jsonb_build_object('exito', false, 'mensaje', 'No se pudo eliminar la actividad. Intenta de nuevo.');
end;
$$;

comment on function public.eliminar_actividad(bigint) is
    'Dueño: borra la actividad, su qr_sello, su evento y los favoritos exactos actividad-<id>. Rechaza si ya entregó sellos. Devuelve foto_ruta (030).';

revoke execute on function public.eliminar_actividad(bigint) from public, anon;
grant execute on function public.eliminar_actividad(bigint) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. Editar actividad
-- -----------------------------------------------------------------------------
create or replace function public.actividad_negocio_exigir_obligatorios_edicion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_faltan text[] := '{}';
begin
  -- Las funciones SECURITY DEFINER (admin_aprobar_sello, etc.) escriben como su dueño: no se validan aquí.
  if current_user <> 'authenticated' then
    return new;
  end if;

  if old.estado_sello = 'aprobado'
     and (new.fecha_inicio is distinct from old.fecha_inicio or new.fecha_fin is distinct from old.fecha_fin) then
    raise exception 'Esta actividad ya tiene un sello aprobado: las fechas no se pueden cambiar.' using errcode = '42501';
  end if;

  -- Si solo cambian eslogan, detalles, etiquetas o campos del sello, no se exige nada más:
  -- así el reenvío de un sello y las filas viejas incompletas siguen funcionando.
  if not (new.nombre is distinct from old.nombre
          or new.categoria is distinct from old.categoria
          or new.categoria_otro is distinct from old.categoria_otro
          or new.descripcion is distinct from old.descripcion
          or new.foto_url is distinct from old.foto_url
          or new.fecha_inicio is distinct from old.fecha_inicio
          or new.fecha_fin is distinct from old.fecha_fin
          or new.hora_inicio is distinct from old.hora_inicio
          or new.hora_fin is distinct from old.hora_fin
          or new.lugar is distinct from old.lugar) then
    return new;
  end if;

  if char_length(btrim(coalesce(new.nombre, ''))) < 1 then
    v_faltan := array_append(v_faltan, 'nombre');
  end if;
  if new.categoria is null then
    v_faltan := array_append(v_faltan, 'categoría');
  end if;
  if char_length(btrim(coalesce(new.descripcion, ''))) < 20 then
    v_faltan := array_append(v_faltan, 'descripción (mínimo 20 caracteres)');
  end if;
  if new.foto_url is null or btrim(new.foto_url) = '' then
    v_faltan := array_append(v_faltan, 'foto');
  end if;
  if new.fecha_inicio is null or new.fecha_fin is null then
    v_faltan := array_append(v_faltan, 'fechas');
  end if;
  if new.hora_inicio is null or new.hora_fin is null then
    v_faltan := array_append(v_faltan, 'horas');
  end if;
  if char_length(btrim(coalesce(new.lugar, ''))) < 1 then
    v_faltan := array_append(v_faltan, 'lugar');
  end if;
  if new.solicita_sello then
    if char_length(btrim(coalesce(new.justificacion_sello, ''))) < 1 then
      v_faltan := array_append(v_faltan, 'justificación del sello');
    end if;
    -- Con el sello aprobado el límite no se puede cambiar: "sin límite" (null) es un valor válido.
    if new.limite_canjes is null and old.estado_sello is distinct from 'aprobado' then
      v_faltan := array_append(v_faltan, 'límite de canjes del sello');
    end if;
  end if;

  if cardinality(v_faltan) > 0 then
    raise exception 'Faltan datos obligatorios de la actividad: %.', array_to_string(v_faltan, ', ')
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.actividad_negocio_exigir_obligatorios_edicion() is
    'BEFORE UPDATE en actividad_negocio: mismos obligatorios que la 029 cuando cambian los datos principales; con sello aprobado no deja cambiar las fechas (030).';

drop trigger if exists actividad_negocio_exigir_obligatorios_edicion on public.actividad_negocio;
create trigger actividad_negocio_exigir_obligatorios_edicion
    before update on public.actividad_negocio
    for each row execute function public.actividad_negocio_exigir_obligatorios_edicion();

create or replace function public.actividad_negocio_sincronizar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.nombre is distinct from old.nombre and new.qr_sello_id is not null then
    update public.qr_sello set nombre_actividad = new.nombre where id = new.qr_sello_id;
  end if;

  -- La fila de evento que creó crear_evento_desde_actividad no se muestra (la agenda lee la actividad),
  -- pero se mantiene al día para que no quede con datos viejos.
  if new.evento_id is not null and new.fecha_inicio is not null and new.fecha_fin is not null
     and (new.nombre is distinct from old.nombre
          or new.fecha_inicio is distinct from old.fecha_inicio
          or new.fecha_fin is distinct from old.fecha_fin
          or new.descripcion is distinct from old.descripcion) then
    update public.evento
    set nombre = new.nombre,
        fecha_inicio = new.fecha_inicio,
        fecha_fin = new.fecha_fin,
        descripcion = new.descripcion
    where id = new.evento_id and negocio_organizador_id = new.negocio_id;
  end if;

  return null;
end;
$$;

comment on function public.actividad_negocio_sincronizar() is
    'AFTER UPDATE en actividad_negocio (SECURITY DEFINER: el dueño no puede escribir qr_sello ni evento): copia nombre/fechas/descripcion al qr_sello y al evento asociados (030).';

revoke execute on function public.actividad_negocio_sincronizar() from public, anon, authenticated;

drop trigger if exists actividad_negocio_sincronizar on public.actividad_negocio;
create trigger actividad_negocio_sincronizar
    after update on public.actividad_negocio
    for each row execute function public.actividad_negocio_sincronizar();

-- -----------------------------------------------------------------------------
-- 5. Cupones: eliminar y editar con reglas
-- -----------------------------------------------------------------------------
create or replace function public.eliminar_cupon(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupon public.cupon;
  v_obtenidos bigint;
begin
  select * into v_cupon from public.cupon where id = p_id for update;
  if not found or auth.uid() is null or not public.es_duenio_negocio(v_cupon.negocio_id) then
    return jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso sobre este cupón.');
  end if;

  select count(*) into v_obtenidos from public.cupon_obtenido where cupon_id = v_cupon.id;
  if v_obtenidos > 0 then
    return jsonb_build_object(
      'exito', false,
      'obtenidos', v_obtenidos,
      'mensaje', format('Ya lo %s %s %s. Puedes desactivarlo, pero no eliminarlo.',
                        case when v_obtenidos = 1 then 'obtuvo' else 'obtuvieron' end,
                        v_obtenidos,
                        case when v_obtenidos = 1 then 'persona' else 'personas' end));
  end if;

  delete from public.cupon where id = v_cupon.id;
  return jsonb_build_object('exito', true, 'mensaje', 'Cupón eliminado.');
exception
  when foreign_key_violation then
    return jsonb_build_object('exito', false, 'mensaje', 'Ya lo obtuvieron. Puedes desactivarlo, pero no eliminarlo.');
end;
$$;

comment on function public.eliminar_cupon(bigint) is
    'Dueño: borra un cupón que nadie ha obtenido (030).';

revoke execute on function public.eliminar_cupon(bigint) from public, anon;
grant execute on function public.eliminar_cupon(bigint) to authenticated, service_role;

-- cupon_obtenido solo lo ve su turista (RLS): el trigger, que corre como el dueño, necesita este conteo aparte.
-- Cuenta únicamente si quien pregunta es dueño del negocio del cupón; para cualquier otro devuelve 0.
create or replace function public.contar_obtenidos_cupon(p_cupon_id bigint)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
    select count(*)
    from public.cupon_obtenido co
    join public.cupon c on c.id = co.cupon_id
    where co.cupon_id = p_cupon_id
      and public.es_duenio_negocio(c.negocio_id);
$$;

comment on function public.contar_obtenidos_cupon(bigint) is
    'Cuántas personas obtuvieron un cupón, solo para el dueño de su negocio (0 para los demás). La usa cupon_validar_edicion (030).';

revoke execute on function public.contar_obtenidos_cupon(bigint) from public, anon;
grant execute on function public.contar_obtenidos_cupon(bigint) to authenticated, service_role;

create or replace function public.cupon_validar_edicion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_obtenidos bigint;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  v_obtenidos := public.contar_obtenidos_cupon(old.id);

  if new.descuento_porcentaje is distinct from old.descuento_porcentaje and v_obtenidos > 0 then
    raise exception 'Ya lo % % %: el porcentaje de descuento no se puede cambiar.',
      case when v_obtenidos = 1 then 'obtuvo' else 'obtuvieron' end,
      v_obtenidos,
      case when v_obtenidos = 1 then 'persona' else 'personas' end
      using errcode = '42501';
  end if;

  if new.limite_total is distinct from old.limite_total and new.limite_total is not null
     and new.limite_total < v_obtenidos then
    raise exception 'El límite no puede ser menor a lo ya obtenido (%).', v_obtenidos using errcode = '23514';
  end if;

  if new.fecha_expiracion is distinct from old.fecha_expiracion then
    -- Solo se amplía: una fecha posterior, o quitar el vencimiento. Acortarlo, o ponerlo a un cupón que no vence, no.
    if new.fecha_expiracion is not null
       and (old.fecha_expiracion is null or new.fecha_expiracion < old.fecha_expiracion) then
      raise exception 'El vencimiento solo se puede ampliar, no acortar.' using errcode = '23514';
    end if;
    if new.fecha_expiracion is not null and new.fecha_expiracion <= now() then
      raise exception 'La nueva fecha de vencimiento debe ser futura.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.cupon_validar_edicion() is
    'BEFORE UPDATE en cupon (escrituras directas del dueño): porcentaje fijo si ya lo obtuvieron, límite no menor a lo obtenido, vencimiento solo se amplía (030).';

drop trigger if exists cupon_validar_edicion on public.cupon;
create trigger cupon_validar_edicion
    before update on public.cupon
    for each row execute function public.cupon_validar_edicion();

commit;
