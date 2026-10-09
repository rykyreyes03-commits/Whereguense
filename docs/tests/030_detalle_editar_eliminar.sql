-- docs/tests/030_detalle_editar_eliminar.sql
--
-- Prueba con ROLLBACK de la migración 030 (detalle, editar y eliminar). Se pega entera en una sola llamada
-- de SQL: primero el cuerpo de la migración (idempotente: create or replace / drop trigger if exists), luego
-- dos ayudas temporales y un bloque DO que prueba cada regla con usuarios reales (papu = dueño, admin, dos
-- turistas y visitante). Termina SIEMPRE con raise exception, así que no se guarda nada, ni siquiera la
-- migración. El mensaje del error trae "RESULTADO: N de M comprobaciones correctas" (cada caso impreso se
-- compara con su resultado esperado y los que no coinciden salen como FALLA) y una línea por caso.
-- Se puede correr antes y después de aplicar la 030. Los casos E12 a E14, U18 y U19 usan datos reales de producción.


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


-- ---------------------------------------------------------------------------
-- Ayudas de la prueba (solo existen durante esta sesión: viven en pg_temp)
-- ---------------------------------------------------------------------------
create function pg_temp.como(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
  if u is null then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
end $f$;

-- Corre una sentencia como un usuario real (u = null: visitante). Devuelve el resultado o '[sqlstate] mensaje'.
-- Un UPDATE/DELETE que RLS deja en 0 filas devuelve 'OK': por eso los casos "otro usuario" también leen el dato después.
create function pg_temp.corre(u uuid, q text) returns text language plpgsql as $f$
declare res text;
begin
  execute 'reset role';
  perform pg_temp.como(u);
  begin
    if q ~* '^\s*select' then execute q into res; else execute q; res := 'OK'; end if;
    execute 'reset role';
    return coalesce(res, 'OK');
  exception when others then
    execute 'reset role';
    return '[' || sqlstate || '] ' || sqlerrm;
  end;
end $f$;

do $test$
declare
  r text := '';
  papu uuid := '278a66c1-ee5a-42f4-a72a-a16e0e6553aa';   -- dueño del negocio 1 "papu"
  adm  uuid := 'f9fa4efb-d727-42f9-9f63-1959d58a873f';   -- admin, dueño del negocio 2
  tur  uuid := '264e1a69-9fbd-4062-86c5-37f93a5f742d';   -- turista
  tur2 uuid := 'a7094b99-c19e-43a0-8546-0c45dadf9965';   -- turista
  a1 bigint; a2 bigint; a3 bigint; a4 bigint; qr1 int; qr3 int; qr_libre int; ev3 int;
  t text; n int; n2 int; otros_antes int; otros_despues int; c1 bigint; c2 bigint; c3 bigint; tok text;
  v31 bigint := 31; dueno31 uuid;
  esperados text[]; esperado text; fallas int;
  foto text := 'https://x.supabase.co/storage/v1/object/public/negocios/278a66c1/actividades/1.png';
begin
  -- NOTA: E12 a E14 usan datos reales de producción (actividad 32 del negocio 2, evento 12 y el favorito
  -- actividad-32); U18 y U19 usan la actividad vieja 31. En otra base esos casos aparecerán como FALLA.

  -- Datos de prueba: papu crea sus actividades por los mismos triggers que usa la app.
  t := pg_temp.corre(papu, format($q$insert into actividad_negocio (negocio_id,nombre,descripcion,foto_url,fecha_inicio,fecha_fin,solicita_sello,justificacion_sello,limite_canjes,categoria,lugar,hora_inicio,hora_fin)
        values (1,'T1 con sello','Descripción de prueba suficientemente larga','%s',current_date+1,current_date+2,true,'Para visitantes',10,'cultura','Parque','19:00','22:00')$q$, foto));
  t := pg_temp.corre(papu, format($q$insert into actividad_negocio (negocio_id,nombre,descripcion,foto_url,fecha_inicio,fecha_fin,categoria,lugar,hora_inicio,hora_fin)
        values (1,'T2 sin sello','Descripción de prueba suficientemente larga','%s',current_date+1,current_date+2,'feria','Plaza','10:00','12:00')$q$, foto));
  select id into a1 from actividad_negocio where nombre = 'T1 con sello';
  select id into a2 from actividad_negocio where nombre = 'T2 sin sello';
  t := pg_temp.corre(adm, format('select admin_aprobar_sello(%s)::text', a1));
  select qr_sello_id into qr1 from actividad_negocio where id = a1;
  t := pg_temp.corre(papu, format('select crear_evento_desde_actividad(%s)::text', a1));
  t := pg_temp.corre(papu, format('select crear_evento_desde_actividad(%s)::text', a2));
  -- Favoritos: los exactos de a1 y a2, y otros que NO deben tocarse (parecidos y de otro tipo).
  insert into guardado (usuario_id, tipo, referencia_id, datos) values
    (tur,  'evento', 'actividad-' || a2, '{}'),
    (tur2, 'evento', 'actividad-' || a2, '{}'),
    (tur,  'evento', 'actividad-' || a1, '{}'),
    (tur,  'evento', 'actividad-' || a2 || '0', '{}'),
    (tur,  'evento', 'actividad-9999', '{}'),
    (tur,  'negocio', 'actividad-' || a2, '{}'),
    (tur,  'negocio', '1', '{}');
  select count(*) into otros_antes from guardado where not (tipo = 'evento' and referencia_id in ('actividad-' || a2, 'actividad-' || a1, 'actividad-32'));

  r := r || E'--- eliminar_actividad ---';
  r := r || E'\nE1 visitante anónimo -> ' || pg_temp.corre(null, format('select eliminar_actividad(%s)::text', a1));
  r := r || E'\nE2 admin (dueño de OTRO negocio) -> ' || pg_temp.corre(adm, format('select eliminar_actividad(%s)::text', a1));
  r := r || E'\nE3 turista -> ' || pg_temp.corre(tur, format('select eliminar_actividad(%s)::text', a1));
  r := r || E'\nE4 id inexistente -> ' || pg_temp.corre(papu, 'select eliminar_actividad(-1)::text');
  insert into sello (usuario_id, tipo, qr_sello_id) values (tur, 'qr', qr1);
  r := r || E'\nE5 con 1 sello entregado -> ' || pg_temp.corre(papu, format('select eliminar_actividad(%s)::text', a1));
  insert into sello (usuario_id, tipo, qr_sello_id) values (tur2, 'qr', qr1);
  r := r || E'\nE6 con 2 sellos entregados -> ' || pg_temp.corre(papu, format('select eliminar_actividad(%s)::text', a1));
  select count(*) into n from actividad_negocio where id = a1;
  select count(*) into n2 from qr_sello where id = qr1;
  r := r || E'\nE7 tras los rechazos siguen: actividad=' || n || ', qr=' || n2;
  delete from sello where qr_sello_id = qr1;
  select evento_id into n from actividad_negocio where id = a1;
  t := pg_temp.corre(papu, format('select eliminar_actividad(%s)::text', a1));
  r := r || E'\nE8 sin sellos: papu elimina T1 (T2 usa la misma foto: no se devuelve su ruta) -> ' || t;
  select count(*) into n2 from actividad_negocio where id = a1;
  r := r || E'\nE9 después: actividad=' || n2 || ', qr=' || (select count(*) from qr_sello where id = qr1) || ', evento copia=' || (select count(*) from evento where id = n) || ', favorito actividad-' || a1 || '=' || (select count(*) from guardado where referencia_id = 'actividad-' || a1 and tipo = 'evento');
  t := pg_temp.corre(papu, format('select eliminar_actividad(%s)::text', a2));
  r := r || E'\nE10 papu elimina T2 (la última con esa foto: sí se devuelve la ruta) -> ' || t;
  r := r || E'\nE11 favoritos de T2: ' || (select count(*) from guardado where tipo = 'evento' and referencia_id = 'actividad-' || a2) || ' (esperado 0) | parecido actividad-' || a2 || '0: ' || (select count(*) from guardado where referencia_id = 'actividad-' || a2 || '0' and tipo = 'evento') || ' (1) | actividad-9999: ' || (select count(*) from guardado where referencia_id = 'actividad-9999') || ' (1) | tipo negocio con el mismo texto: ' || (select count(*) from guardado where tipo = 'negocio' and referencia_id = 'actividad-' || a2) || ' (1)';
  r := r || E'\nE12 favorito real actividad-32 antes: ' || (select count(*) from guardado where tipo = 'evento' and referencia_id = 'actividad-32') || ' fila | evento_id de la 32=' || coalesce((select evento_id::text from actividad_negocio where id = 32), 'no existe');
  t := pg_temp.corre(adm, 'select eliminar_actividad(32)::text');
  r := r || E'\nE13 admin (dueño del negocio 2) elimina la actividad real 32 -> ' || t;
  r := r || E'\nE14 después: favorito actividad-32=' || (select count(*) from guardado where referencia_id = 'actividad-32' and tipo = 'evento') || ', actividad 32=' || (select count(*) from actividad_negocio where id = 32) || ', evento 12=' || (select count(*) from evento where id = 12) || ', reales 31 y 64 siguen=' || (select count(*) from actividad_negocio where id in (31, 64)) || ' de 2';
  select count(*) into otros_despues from guardado where not (tipo = 'evento' and referencia_id in ('actividad-' || a2, 'actividad-' || a1, 'actividad-32'));
  r := r || E'\nE15 el resto de guardados no se tocó: antes=' || otros_antes || ', después=' || otros_despues;

  r := r || E'\n\n--- editar actividad ---';
  t := pg_temp.corre(papu, format($q$insert into actividad_negocio (negocio_id,nombre,descripcion,foto_url,fecha_inicio,fecha_fin,solicita_sello,justificacion_sello,limite_canjes,categoria,lugar,hora_inicio,hora_fin)
        values (1,'T3 aprobada','Descripción de prueba suficientemente larga','%s',current_date+3,current_date+4,true,'Para visitantes',5,'musica','Parque','19:00','22:00')$q$, foto));
  select id into a3 from actividad_negocio where nombre = 'T3 aprobada';
  t := pg_temp.corre(adm, format('select admin_aprobar_sello(%s)::text', a3));
  t := pg_temp.corre(papu, format('select crear_evento_desde_actividad(%s)::text', a3));
  select qr_sello_id, evento_id into qr3, ev3 from actividad_negocio where id = a3;
  r := r || E'\nU1 cambiar el nombre (sello aprobado) -> ' || pg_temp.corre(papu, format($q$update actividad_negocio set nombre = 'T3 renombrada' where id = %s$q$, a3));
  r := r || E'\nU2 nombre sincronizado: actividad=' || (select nombre from actividad_negocio where id = a3) || ' | qr_sello=' || (select nombre_actividad from qr_sello where id = qr3) || ' | evento copia=' || (select nombre from evento where id = ev3);
  r := r || E'\nU3 cambiar fecha_fin con sello aprobado -> ' || pg_temp.corre(papu, format('update actividad_negocio set fecha_fin = fecha_fin + 1 where id = %s', a3));
  r := r || E'\nU4 cambiar fecha_inicio con sello aprobado -> ' || pg_temp.corre(papu, format('update actividad_negocio set fecha_inicio = fecha_inicio + 1 where id = %s', a3));
  r := r || E'\nU5 cambiar el límite con sello aprobado -> ' || pg_temp.corre(papu, format('update actividad_negocio set limite_canjes = 99 where id = %s', a3));
  r := r || E'\nU6 descripción de 19 caracteres -> ' || pg_temp.corre(papu, format($q$update actividad_negocio set descripcion = repeat('d', 19) where id = %s$q$, a3));
  r := r || E'\nU7 lugar en blanco -> ' || pg_temp.corre(papu, format($q$update actividad_negocio set lugar = '  ' where id = %s$q$, a3));
  r := r || E'\nU8 quitar la foto -> ' || pg_temp.corre(papu, format('update actividad_negocio set foto_url = null where id = %s', a3));
  r := r || E'\nU9 quitar horas -> ' || pg_temp.corre(papu, format('update actividad_negocio set hora_inicio = null, hora_fin = null where id = %s', a3));
  r := r || E'\nU10 cambiar foto, lugar y categoría (válido) -> ' || pg_temp.corre(papu, format($q$update actividad_negocio set foto_url = 'https://x.supabase.co/storage/v1/object/public/negocios/278a66c1/actividades/2.png', lugar = 'Otro parque', categoria = 'otro', categoria_otro = 'Danza' where id = %s$q$, a3));
  r := r || E'\nU11 solo eslogan y detalles -> ' || pg_temp.corre(papu, format($q$update actividad_negocio set eslogan = 'Nuevo', detalles = 'Más detalles' where id = %s$q$, a3));
  update actividad_negocio set limite_canjes = null where id = a3;   -- dato antiguo: sello aprobado sin límite (se escribe como postgres)
  r := r || E'\nU11b sello aprobado SIN límite: el dueño edita el lugar -> ' || pg_temp.corre(papu, format($q$update actividad_negocio set lugar = 'Lugar 2' where id = %s$q$, a3));
  r := r || E'\nU12 escribir estado_sello a mano -> ' || pg_temp.corre(papu, format($q$update actividad_negocio set estado_sello = 'aprobado' where id = %s$q$, a3));
  t := pg_temp.corre(adm, format($q$update actividad_negocio set nombre = 'hackeada' where id = %s$q$, a3));
  r := r || E'\nU13 otro usuario (admin) edita la de papu -> ' || t || ' | nombre sigue: ' || (select nombre from actividad_negocio where id = a3);
  r := r || E'\nU14 visitante edita -> ' || pg_temp.corre(null, format($q$update actividad_negocio set nombre = 'x' where id = %s$q$, a3));
  t := pg_temp.corre(tur, format($q$update actividad_negocio set nombre = 'x' where id = %s$q$, a3));
  r := r || E'\nU15 turista edita -> ' || t || ' | nombre sigue: ' || (select nombre from actividad_negocio where id = a3);

  t := pg_temp.corre(papu, format($q$insert into actividad_negocio (negocio_id,nombre,descripcion,foto_url,fecha_inicio,fecha_fin,solicita_sello,justificacion_sello,limite_canjes,categoria,lugar,hora_inicio,hora_fin)
        values (1,'T4 rechazada','Descripción de prueba suficientemente larga','%s',current_date+3,current_date+4,true,'v1',5,'taller','Sala','09:00','11:00')$q$, foto));
  select id into a4 from actividad_negocio where nombre = 'T4 rechazada';
  t := pg_temp.corre(adm, format($q$select admin_rechazar_sello(%s, 'Falta detalle')::text$q$, a4));
  select estado_sello into t from actividad_negocio where id = a4;
  r := r || E'\nU16 T4 tras el rechazo: estado=' || t;
  t := pg_temp.corre(papu, format($q$update actividad_negocio set justificacion_sello = 'v2 con más detalle' where id = %s$q$, a4));
  r := r || E'\nU17 reenvío del sello rechazado (solo cambia la justificación) -> ' || t || ' | estado: ' || (select estado_sello from actividad_negocio where id = a4);

  select n.usuario_id into dueno31 from actividad_negocio a join negocio n on n.id = a.negocio_id where a.id = v31;
  r := r || E'\nU18 fila vieja 31 solo eslogan -> ' || pg_temp.corre(dueno31, format($q$update actividad_negocio set eslogan = 'x' where id = %s$q$, v31));
  r := r || E'\nU19 fila vieja 31 cambiar el nombre -> ' || pg_temp.corre(dueno31, format($q$update actividad_negocio set nombre = nombre || '!' where id = %s$q$, v31));

  r := r || E'\n\n--- qr_sello: el dueño ya no crea ni cambia QR ---';
  r := r || E'\nQ1 papu inserta un qr_sello directo -> ' || pg_temp.corre(papu, $q$insert into qr_sello (negocio_id, token, nombre_actividad) values (1, 'TOKENPRUEBA', 'Falso')$q$);
  r := r || E'\nQ2 papu cambia el límite de un qr_sello -> ' || pg_temp.corre(papu, format('update qr_sello set limite_canjes = 999 where id = %s', qr3));
  insert into qr_sello (negocio_id, token, nombre_actividad) values (1, 'TOKENLIBRE0000000000000000000000', 'Sello viejo sin canjes') returning id into qr_libre;
  t := pg_temp.corre(papu, format('delete from qr_sello where id = %s', qr_libre));
  r := r || E'\nQ3 papu borra un sello anterior sin canjes (conserva DELETE) -> ' || t || ' | queda: ' || (select count(*) from qr_sello where id = qr_libre);
  t := pg_temp.corre(papu, 'delete from qr_sello where id = 2');
  r := r || E'\nQ4 papu borra su qr real 2 (ya tiene un sello entregado) -> ' || t || ' | existe: ' || (select count(*) from qr_sello where id = 2) || ' | es de papu: ' || (select count(*) from qr_sello where id = 2 and negocio_id = 1);
  t := pg_temp.corre(papu, format('delete from qr_sello where id = %s', qr3));
  r := r || E'\nQ4b papu borra a mano el QR de su actividad T3 -> ' || t || ' | existe: ' || (select count(*) from qr_sello where id = qr3);
  insert into sello (usuario_id, tipo, qr_sello_id) values (tur, 'qr', qr3), (tur2, 'qr', qr3);
  r := r || E'\nQ5 sellos_entregados_por_actividad de T3 con 2 sellos -> entregados=' || pg_temp.corre(papu, format('select entregados::text from sellos_entregados_por_actividad(1) where actividad_id = %s', a3));
  r := r || E'\nQ6 admin (otro dueño) ve ' || pg_temp.corre(adm, 'select count(*)::text from sellos_entregados_por_actividad(1)') || ' filas | visitante -> ' || pg_temp.corre(null, 'select count(*)::text from sellos_entregados_por_actividad(1)');

  r := r || E'\n\n--- cupones ---';
  t := pg_temp.corre(papu, $q$insert into cupon (negocio_id, descripcion, descuento_porcentaje, limite_total) values (1, 'C1 prueba', 20, 5)$q$);
  t := pg_temp.corre(papu, $q$insert into cupon (negocio_id, descripcion, descuento_porcentaje, fecha_expiracion) values (1, 'C2 prueba', 10, now() + interval '10 days')$q$);
  select id, token into c1, tok from cupon where descripcion = 'C1 prueba';
  select id into c2 from cupon where descripcion = 'C2 prueba';
  r := r || E'\nK1 nadie lo obtuvo: cambiar el porcentaje 20 -> 30 -> ' || pg_temp.corre(papu, format('update cupon set descuento_porcentaje = 30 where id = %s', c1));
  r := r || E'\nK2 turista obtiene el cupón -> ' || left(pg_temp.corre(tur, format($q$select obtener_cupon('%s')::text$q$, tok)), 90);
  r := r || E'\nK3 con 1 obtenido: cambiar el porcentaje -> ' || pg_temp.corre(papu, format('update cupon set descuento_porcentaje = 40 where id = %s', c1));
  r := r || E'\nK4 con 1 obtenido: cambiar descripción y desactivar -> ' || pg_temp.corre(papu, format($q$update cupon set descripcion = 'C1 editado', activo = false where id = %s$q$, c1));
  r := r || E'\nK5 reactivar -> ' || pg_temp.corre(papu, format('update cupon set activo = true where id = %s', c1));
  t := pg_temp.corre(tur2, format($q$select obtener_cupon('%s')::text$q$, tok));
  r := r || E'\nK6 con 2 obtenidos: límite 1 (menor) -> ' || pg_temp.corre(papu, format('update cupon set limite_total = 1 where id = %s', c1));
  r := r || E'\nK7 límite 2 (igual a lo obtenido) -> ' || pg_temp.corre(papu, format('update cupon set limite_total = 2 where id = %s', c1));
  r := r || E'\nK8 quitar el límite (null) -> ' || pg_temp.corre(papu, format('update cupon set limite_total = null where id = %s', c1));
  r := r || E'\nK9 vencimiento: acortar 10 días -> 5 días -> ' || pg_temp.corre(papu, format($q$update cupon set fecha_expiracion = now() + interval '5 days' where id = %s$q$, c2));
  r := r || E'\nK10 ampliar a 20 días -> ' || pg_temp.corre(papu, format($q$update cupon set fecha_expiracion = now() + interval '20 days' where id = %s$q$, c2));
  r := r || E'\nK11 quitar el vencimiento (se amplía a "no vence") -> ' || pg_temp.corre(papu, format('update cupon set fecha_expiracion = null where id = %s', c2));
  r := r || E'\nK12 ponerle vencimiento a un cupón que no vence -> ' || pg_temp.corre(papu, format($q$update cupon set fecha_expiracion = now() + interval '30 days' where id = %s$q$, c2));
  insert into cupon (negocio_id, descripcion, descuento_porcentaje, fecha_expiracion) values (1, 'C3 vencido', 10, now() - interval '2 days') returning id into c3;
  r := r || E'\nK12b cupón vencido: "ampliar" a otra fecha que sigue siendo pasada -> ' || pg_temp.corre(papu, format($q$update cupon set fecha_expiracion = now() - interval '1 day' where id = %s$q$, c3));
  r := r || E'\nK12c cupón vencido: ampliar a una fecha futura -> ' || pg_temp.corre(papu, format($q$update cupon set fecha_expiracion = now() + interval '7 days' where id = %s$q$, c3));
  t := pg_temp.corre(adm, format($q$update cupon set descripcion = 'hack' where id = %s$q$, c1));
  r := r || E'\nK13 otro usuario (admin) edita el cupón de papu -> ' || t || ' | descripción sigue: ' || (select descripcion from cupon where id = c1);
  r := r || E'\nK14 visitante edita -> ' || pg_temp.corre(null, format($q$update cupon set descripcion = 'hack' where id = %s$q$, c1));
  r := r || E'\nK15 contar_obtenidos_cupon: dueño ve ' || pg_temp.corre(papu, format('select contar_obtenidos_cupon(%s)::text', c1)) || ' | admin (otro) ve ' || pg_temp.corre(adm, format('select contar_obtenidos_cupon(%s)::text', c1)) || ' | visitante -> ' || pg_temp.corre(null, format('select contar_obtenidos_cupon(%s)::text', c1));
  r := r || E'\nK16 eliminar_cupon: visitante -> ' || pg_temp.corre(null, format('select eliminar_cupon(%s)::text', c1));
  r := r || E'\nK17 eliminar_cupon: turista -> ' || pg_temp.corre(tur, format('select eliminar_cupon(%s)::text', c1));
  r := r || E'\nK18 eliminar_cupon: admin (otro negocio) -> ' || pg_temp.corre(adm, format('select eliminar_cupon(%s)::text', c1));
  t := pg_temp.corre(papu, format('select eliminar_cupon(%s)::text', c1));
  r := r || E'\nK19 eliminar_cupon: papu, ya obtenido por 2 -> ' || t || ' | sigue: ' || (select count(*) from cupon where id = c1);
  t := pg_temp.corre(papu, format('select eliminar_cupon(%s)::text', c2));
  r := r || E'\nK20 eliminar_cupon: papu, nadie lo obtuvo -> ' || t || ' | queda: ' || (select count(*) from cupon where id = c2);
  r := r || E'\nK21 id inexistente -> ' || pg_temp.corre(papu, 'select eliminar_cupon(-1)::text');

  -- ===================== VERIFICACIÓN AUTOMÁTICA =====================
  -- Cada caso impreso arriba debe contener su resultado esperado; si falta alguno, la corrida lo marca FALLA.
  esperados := array[
    'E1 visitante anónimo -> [42501]',
    'E2 admin (dueño de OTRO negocio) -> {"exito": false, "mensaje": "No tienes permiso sobre esta actividad."}',
    'E3 turista -> {"exito": false, "mensaje": "No tienes permiso sobre esta actividad."}',
    'E4 id inexistente -> {"exito": false, "mensaje": "No tienes permiso sobre esta actividad."}',
    'E5 con 1 sello entregado -> {"exito": false, "mensaje": "Ya entregó 1 sello. Puedes editarla, pero no eliminarla.", "sellos_entregados": 1}',
    'E6 con 2 sellos entregados -> {"exito": false, "mensaje": "Ya entregó 2 sellos. Puedes editarla, pero no eliminarla.", "sellos_entregados": 2}',
    'E7 tras los rechazos siguen: actividad=1, qr=1',
    '-> {"exito": true, "mensaje": "Actividad eliminada.", "foto_ruta": null}',
    format('E9 después: actividad=0, qr=0, evento copia=0, favorito actividad-%s=0', a1),
    'la última con esa foto: sí se devuelve la ruta) -> {"exito": true, "mensaje": "Actividad eliminada.", "foto_ruta": "278a66c1/actividades/1.png"}',
    format('E11 favoritos de T2: 0 (esperado 0) | parecido actividad-%s0: 1 (1) | actividad-9999: 1 (1) | tipo negocio con el mismo texto: 1 (1)', a2),
    'E14 después: favorito actividad-32=0, actividad 32=0, evento 12=0, reales 31 y 64 siguen=2 de 2',
    format('E15 el resto de guardados no se tocó: antes=%s, después=%s', otros_antes, otros_antes),
    'U1 cambiar el nombre (sello aprobado) -> OK',
    'U2 nombre sincronizado: actividad=T3 renombrada | qr_sello=T3 renombrada | evento copia=T3 renombrada',
    'U3 cambiar fecha_fin con sello aprobado -> [42501] Esta actividad ya tiene un sello aprobado: las fechas no se pueden cambiar.',
    'U4 cambiar fecha_inicio con sello aprobado -> [42501] Esta actividad ya tiene un sello aprobado: las fechas no se pueden cambiar.',
    'U5 cambiar el límite con sello aprobado -> [42501] Esta actividad ya tiene un sello aprobado: el límite de canjes no se puede cambiar.',
    'U6 descripción de 19 caracteres -> [23514] Faltan datos obligatorios de la actividad: descripción (mínimo 20 caracteres).',
    'U7 lugar en blanco -> [23514] Faltan datos obligatorios de la actividad: lugar.',
    'U8 quitar la foto -> [23514] Faltan datos obligatorios de la actividad: foto.',
    'U9 quitar horas -> [23514] Faltan datos obligatorios de la actividad: horas.',
    'U10 cambiar foto, lugar y categoría (válido) -> OK',
    'U11 solo eslogan y detalles -> OK',
    'U11b sello aprobado SIN límite: el dueño edita el lugar -> OK',
    'U12 escribir estado_sello a mano -> [42501] permission denied for table actividad_negocio',
    'U13 otro usuario (admin) edita la de papu -> OK | nombre sigue: T3 renombrada',
    'U14 visitante edita -> [42501] permission denied for table actividad_negocio',
    'U15 turista edita -> OK | nombre sigue: T3 renombrada',
    'U16 T4 tras el rechazo: estado=rechazado',
    'U17 reenvío del sello rechazado (solo cambia la justificación) -> OK | estado: pendiente',
    'U18 fila vieja 31 solo eslogan -> OK',
    'U19 fila vieja 31 cambiar el nombre -> [23514] Faltan datos obligatorios de la actividad: categoría, descripción (mínimo 20 caracteres), fechas, horas, lugar.',
    'Q1 papu inserta un qr_sello directo -> [42501] permission denied for table qr_sello',
    'Q2 papu cambia el límite de un qr_sello -> [42501] permission denied for table qr_sello',
    'Q3 papu borra un sello anterior sin canjes (conserva DELETE) -> OK | queda: 0',
    'Q4 papu borra su qr real 2 (ya tiene un sello entregado) -> [23503]',
    'Q4b papu borra a mano el QR de su actividad T3 -> [42501] Este sello pertenece a una actividad: para quitarlo, elimina la actividad. | existe: 1',
    'Q5 sellos_entregados_por_actividad de T3 con 2 sellos -> entregados=2',
    'Q6 admin (otro dueño) ve 0 filas | visitante -> [42501]',
    'K1 nadie lo obtuvo: cambiar el porcentaje 20 -> 30 -> OK',
    'K3 con 1 obtenido: cambiar el porcentaje -> [42501] Ya lo obtuvo 1 persona: el porcentaje de descuento no se puede cambiar.',
    'K4 con 1 obtenido: cambiar descripción y desactivar -> OK',
    'K6 con 2 obtenidos: límite 1 (menor) -> [23514] El límite no puede ser menor a lo ya obtenido (2).',
    'K7 límite 2 (igual a lo obtenido) -> OK',
    'K8 quitar el límite (null) -> OK',
    'K9 vencimiento: acortar 10 días -> 5 días -> [23514] El vencimiento solo se puede ampliar, no acortar.',
    'K10 ampliar a 20 días -> OK',
    'K11 quitar el vencimiento (se amplía a "no vence") -> OK',
    'K12 ponerle vencimiento a un cupón que no vence -> [23514] El vencimiento solo se puede ampliar, no acortar.',
    'K12b cupón vencido: "ampliar" a otra fecha que sigue siendo pasada -> [23514] La nueva fecha de vencimiento debe ser futura.',
    'K12c cupón vencido: ampliar a una fecha futura -> OK',
    'K13 otro usuario (admin) edita el cupón de papu -> OK | descripción sigue: C1 editado',
    'K14 visitante edita -> [42501] permission denied for table cupon',
    'K15 contar_obtenidos_cupon: dueño ve 2 | admin (otro) ve 0 | visitante -> [42501]',
    'K16 eliminar_cupon: visitante -> [42501] permission denied for function eliminar_cupon',
    'K17 eliminar_cupon: turista -> {"exito": false, "mensaje": "No tienes permiso sobre este cupón."}',
    'K18 eliminar_cupon: admin (otro negocio) -> {"exito": false, "mensaje": "No tienes permiso sobre este cupón."}',
    'K19 eliminar_cupon: papu, ya obtenido por 2 -> {"exito": false, "mensaje": "Ya lo obtuvieron 2 personas. Puedes desactivarlo, pero no eliminarlo.", "obtenidos": 2} | sigue: 1',
    'K20 eliminar_cupon: papu, nadie lo obtuvo -> {"exito": true, "mensaje": "Cupón eliminado."} | queda: 0',
    'K21 id inexistente -> {"exito": false, "mensaje": "No tienes permiso sobre este cupón."}'
  ];
  fallas := 0;
  foreach esperado in array esperados loop
    if position(esperado in r) = 0 then
      fallas := fallas + 1;
      r := r || E'\nFALLA: no apareció «' || left(esperado, 160) || '»';
    end if;
  end loop;
  r := E'RESULTADO: ' || (array_length(esperados, 1) - fallas) || ' de ' || array_length(esperados, 1) || ' comprobaciones correctas' || case when fallas > 0 then ' (' || fallas || ' FALLAN)' else ' (todas)' end || E'\n\n' || r;
  raise exception 'ROLLBACK DE PRUEBA%', E'\n' || r;
end $test$;
