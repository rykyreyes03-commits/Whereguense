-- docs/tests/034_limpieza_seguridad.sql
--
-- Prueba con ROLLBACK de la migración 034 (limpieza de seguridad). Se pega entera en una sola llamada de SQL:
-- 1) ayudas temporales, 2) la foto de lo que lee la LANDING como anon ANTES (tabla temporal), 3) el cuerpo de la migración,
-- 4) un bloque DO que compara la landing DESPUÉS con la de ANTES (debe ser idéntica) y prueba permisos y el cierre del
-- cambio de rol. Termina SIEMPRE con raise exception: no se guarda nada, ni la migración. El mensaje trae
-- "RESULTADO: N de N comprobaciones correctas". Se puede correr antes y después de aplicar la 034.
-- Las huellas de los datos reales: docs/tests/034_huellas_antes.txt (antes) y 034_huellas_despues.txt (después).

create function pg_temp.como(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
  if u is null then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
end $f$;

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

-- Lo que lee la landing sin sesión (tablas y funciones públicas)
create function pg_temp.landing() returns text language plpgsql as $f$
declare r text := ''; t text;
begin
  foreach t in array array['evento','sitio','ruta','ruta_sitio','insignia','nivel','rango','categoria_avatar','pieza_avatar','negocio','negocio_foto','negocio_horario','producto'] loop
    r := r || t || '=' || pg_temp.corre(null, 'select count(*)::text from public.' || t) || ' ';
  end loop;
  r := r || 'actividades=' || pg_temp.corre(null, 'select count(*)::text from public.actividades_negocio_publicas()') || ' ';
  r := r || 'resenas1=' || pg_temp.corre(null, 'select count(*)::text from public.resenas_publicas(1)') || ' ';
  r := r || 'resumen1=' || pg_temp.corre(null, 'select total::text from public.resumen_resenas(1)') || ' ';
  r := r || 'visible1=' || pg_temp.corre(null, 'select public.negocio_visible(1)::text') || ' ';
  r := r || 'duenio1=' || pg_temp.corre(null, 'select public.es_duenio_negocio(1)::text');
  return r;
end $f$;

create temp table antes as select pg_temp.landing() as v;

-- ----- cuerpo de la migración 034 -----

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



do $test$
declare
  r text := '';
  papu uuid := '278a66c1-ee5a-42f4-a72a-a16e0e6553aa';   -- dueño del negocio 1
  adm  uuid := 'f9fa4efb-d727-42f9-9f63-1959d58a873f';   -- admin
  tur  uuid := '264e1a69-9fbd-4062-86c5-37f93a5f742d';   -- turista (dueño del negocio 3)
  tur3 uuid := 'ba6d7948-2390-4f40-9bf8-2cb1f820d849';   -- turista
  despues text; n int; f text; sitio_id int;
  esperados text[]; esperado text; fallas int;
begin
  r := r || E'--- landing sin sesión: igual que antes ---';
  despues := pg_temp.landing();
  r := r || E'\nL1 la landing lee lo mismo que antes: ' || (despues = (select v from antes));
  r := r || E'\nL2 ninguna lectura de la landing falla: ' || (position('[' in despues) = 0);
  r := r || E'\n    ' || despues;

  r := r || E'\n\n--- sin sesión (anon) ya no pueden ejecutar ---';
  r := r || E'\nD1 canjear_qr_sello -> ' || pg_temp.corre(null, $q$select canjear_qr_sello('X')::text$q$);
  r := r || E'\nD2 mis_actividades_qr -> ' || pg_temp.corre(null, 'select count(*)::text from mis_actividades_qr(1)');
  r := r || E'\nD3 admin_aprobar_negocio -> ' || pg_temp.corre(null, 'select admin_aprobar_negocio(1)::text');
  r := r || E'\nD4 admin_rechazar_negocio -> ' || pg_temp.corre(null, $q$select admin_rechazar_negocio(1, 'm')::text$q$);
  r := r || E'\nD5 admin_aprobar_sello -> ' || pg_temp.corre(null, 'select admin_aprobar_sello(1)::text');
  r := r || E'\nD6 admin_rechazar_sello -> ' || pg_temp.corre(null, $q$select admin_rechazar_sello(1, 'm')::text$q$);
  r := r || E'\nD7 admin_borrar_resena -> ' || pg_temp.corre(null, 'select admin_borrar_resena(1)::text');
  r := r || E'\nD8 admin_renovar_suscripcion -> ' || pg_temp.corre(null, $q$select admin_renovar_suscripcion(1, 1, 'basico')::text$q$);
  r := r || E'\nD9 admin_resenas -> ' || pg_temp.corre(null, 'select count(*)::text from admin_resenas()');

  r := r || E'\n\n--- con sesión siguen funcionando ---';
  r := r || E'\nA1 canjear_qr_sello (turista, token inexistente) -> ' || left(pg_temp.corre(tur3, $q$select canjear_qr_sello('NO-EXISTE')::text$q$), 12);
  r := r || E'\nA2 mis_actividades_qr (dueño de su negocio) -> ' || (pg_temp.corre(papu, 'select count(*)::text from mis_actividades_qr(1)') !~ '^\[');
  r := r || E'\nA3 admin_aprobar_negocio (turista, sin permiso) -> ' || pg_temp.corre(tur3, 'select admin_aprobar_negocio(-1)::text');
  r := r || E'\nA4 admin_aprobar_negocio (admin, negocio inexistente) responde sin error de permiso -> ' || (pg_temp.corre(adm, 'select admin_aprobar_negocio(-1)::text') ~ '^\{');
  r := r || E'\nA5 admin_rechazar_negocio (admin, inexistente) -> ' || (pg_temp.corre(adm, $q$select admin_rechazar_negocio(-1, 'm')::text$q$) ~ '^\{');
  r := r || E'\nA6 admin_aprobar_sello (admin, inexistente) -> ' || pg_temp.corre(adm, 'select admin_aprobar_sello(-1)::text');
  r := r || E'\nA7 admin_rechazar_sello (admin, inexistente) responde sin error de permiso -> ' || (pg_temp.corre(adm, $q$select admin_rechazar_sello(-1, 'm')::text$q$) ~ '^\{');
  r := r || E'\nA8 admin_resenas (admin) -> ' || (pg_temp.corre(adm, 'select count(*)::text from admin_resenas()') !~ '^\[');
  r := r || E'\nA9 admin_borrar_resena (admin, inexistente) responde sin error de permiso -> ' || (pg_temp.corre(adm, 'select admin_borrar_resena(-1)::text') ~ '^\{');
  r := r || E'\nA10 admin_renovar_suscripcion (turista, sin permiso) responde sin error de permiso de función -> ' || (pg_temp.corre(tur3, $q$select admin_renovar_suscripcion(1, 1, 'basico')::text$q$) ~ '^\{');

  r := r || E'\n\n--- EXECUTE por rol ---';
  for f in select unnest(array['canjear_qr_sello(text)','mis_actividades_qr(integer)','admin_aprobar_negocio(integer)','admin_rechazar_negocio(integer,text)','admin_aprobar_sello(bigint)','admin_rechazar_sello(bigint,text)','admin_borrar_resena(bigint)','admin_renovar_suscripcion(integer,integer,text)','admin_resenas()']) loop
    r := r || E'\nE ' || f || ' anon=' || has_function_privilege('anon', 'public.' || f, 'execute') || ' authenticated=' || has_function_privilege('authenticated', 'public.' || f, 'execute') || ' public=' || exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = ('public.' || f)::regprocedure and a.grantee = 0);
  end loop;
  r := r || E'\nE2 siguen públicas (anon puede ejecutar): negocio_visible=' || has_function_privilege('anon', 'public.negocio_visible(integer)', 'execute')
        || ' es_duenio_negocio=' || has_function_privilege('anon', 'public.es_duenio_negocio(integer)', 'execute')
        || ' actividades_negocio_publicas=' || has_function_privilege('anon', 'public.actividades_negocio_publicas()', 'execute')
        || ' resenas_publicas=' || has_function_privilege('anon', 'public.resenas_publicas(integer)', 'execute')
        || ' resumen_resenas=' || has_function_privilege('anon', 'public.resumen_resenas(integer)', 'execute');

  r := r || E'\n\n--- permisos de tablas ---';
  select count(*) into n from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES');
  r := r || E'\nT1 permisos TRUNCATE/TRIGGER/REFERENCES que quedan para anon y authenticated: ' || n;
  r := r || E'\nT2 authenticated puede DELETE en negocio: ' || has_table_privilege('authenticated', 'public.negocio', 'delete');
  r := r || E'\nT3 dueño intenta borrar su negocio -> ' || pg_temp.corre(papu, 'delete from negocio where id = 1');
  r := r || E'\nT4 lo legítimo se conserva: guardado INSERT=' || has_table_privilege('authenticated', 'public.guardado', 'insert')
        || ' negocio UPDATE columna nombre_negocio=' || has_column_privilege('authenticated', 'public.negocio', 'nombre_negocio', 'update')
        || ' qr_sello DELETE=' || has_table_privilege('authenticated', 'public.qr_sello', 'delete');
  r := r || E'\nT5 anon sigue sin poder escribir negocio: ' || has_table_privilege('anon', 'public.negocio', 'insert');

  r := r || E'\n\n--- distancia_metros ---';
  r := r || E'\nM1 search_path fijo: ' || coalesce((select (p.proconfig::text like '%search_path=%')::text from pg_proc p where p.oid = 'public.distancia_metros(double precision,double precision,double precision,double precision)'::regprocedure), 'null');
  r := r || E'\nM2 el valor es el mismo: ' || round(public.distancia_metros(12.43, -86.88, 12.44, -86.88)::numeric, 0);
  select min(id) into sitio_id from public.sitio;
  r := r || E'\nM3 sellar_por_geolocalizacion lejos del sitio responde normal (usa distancia_metros) -> ' || (pg_temp.corre(tur3, format('select sellar_por_geolocalizacion(%s, 0.0, 0.0)::text', sitio_id)) ~ '"exito": false');

  r := r || E'\n\n--- el rol no se cambia desde la API (hallazgo crítico) ---';
  r := r || E'\nR1 turista intenta ponerse rol admin -> ' || pg_temp.corre(tur, 'update usuario set rol = ''admin'' where id = auth.uid()');
  select rol into f from usuario where id = tur;
  r := r || E'\nR2 su rol sigue siendo: ' || f;
  r := r || E'\nR3 turista cambia otro dato propio (pais) -> ' || pg_temp.corre(tur, 'update usuario set pais = ''Nicaragua'' where id = auth.uid()');
  r := r || E'\nR4 crear su fila con rol admin -> ' || pg_temp.corre(tur3, 'insert into usuario (id, email, nombre_usuario, rol) values (auth.uid(), ''x@x.com'', ''x'', ''admin'')');
  r := r || E'\nR5 crear su fila con rol turista pasa el trigger (falla solo por duplicado) -> ' || left(pg_temp.corre(tur3, 'insert into usuario (id, email, nombre_usuario, rol) values (auth.uid(), ''x@x.com'', ''x'', ''turista'')'), 7);
  r := r || E'\nR6 intentó ser admin y llamar a una función de admin -> ' || pg_temp.corre(tur, 'select admin_aprobar_negocio(1)::text');
  update usuario set rol = 'admin' where id = tur3;   -- como postgres (SQL editor / service_role): sí se puede
  r := r || E'\nR7 el rol sí se puede asignar por SQL (postgres) y entonces funciona: ' || (pg_temp.corre(tur3, 'select count(*)::text from admin_resenas()') !~ '^\[');

  esperados := array[
    'L1 la landing lee lo mismo que antes: true',
    'L2 ninguna lectura de la landing falla: true',
    'D1 canjear_qr_sello -> [42501] permission denied for function canjear_qr_sello',
    'D2 mis_actividades_qr -> [42501] permission denied for function mis_actividades_qr',
    'D3 admin_aprobar_negocio -> [42501] permission denied for function admin_aprobar_negocio',
    'D4 admin_rechazar_negocio -> [42501] permission denied for function admin_rechazar_negocio',
    'D5 admin_aprobar_sello -> [42501] permission denied for function admin_aprobar_sello',
    'D6 admin_rechazar_sello -> [42501] permission denied for function admin_rechazar_sello',
    'D7 admin_borrar_resena -> [42501] permission denied for function admin_borrar_resena',
    'D8 admin_renovar_suscripcion -> [42501] permission denied for function admin_renovar_suscripcion',
    'D9 admin_resenas -> [42501] permission denied for function admin_resenas',
    'A1 canjear_qr_sello (turista, token inexistente) -> {"exito": fa',
    'A2 mis_actividades_qr (dueño de su negocio) -> true',
    'A3 admin_aprobar_negocio (turista, sin permiso) -> {"exito": false, "mensaje": "No tienes permiso',
    'A4 admin_aprobar_negocio (admin, negocio inexistente) responde sin error de permiso -> true',
    'A5 admin_rechazar_negocio (admin, inexistente) -> true',
    'A6 admin_aprobar_sello (admin, inexistente) -> {"exito": false, "mensaje": "Actividad no encontrada."}',
    'A7 admin_rechazar_sello (admin, inexistente) responde sin error de permiso -> true',
    'A8 admin_resenas (admin) -> true',
    'A9 admin_borrar_resena (admin, inexistente) responde sin error de permiso -> true',
    'A10 admin_renovar_suscripcion (turista, sin permiso) responde sin error de permiso de función -> true',
    'E canjear_qr_sello(text) anon=false authenticated=true public=false',
    'E mis_actividades_qr(integer) anon=false authenticated=true public=false',
    'E admin_aprobar_negocio(integer) anon=false authenticated=true public=false',
    'E admin_rechazar_negocio(integer,text) anon=false authenticated=true public=false',
    'E admin_aprobar_sello(bigint) anon=false authenticated=true public=false',
    'E admin_rechazar_sello(bigint,text) anon=false authenticated=true public=false',
    'E admin_borrar_resena(bigint) anon=false authenticated=true public=false',
    'E admin_renovar_suscripcion(integer,integer,text) anon=false authenticated=true public=false',
    'E admin_resenas() anon=false authenticated=true public=false',
    'E2 siguen públicas (anon puede ejecutar): negocio_visible=true es_duenio_negocio=true actividades_negocio_publicas=true resenas_publicas=true resumen_resenas=true',
    'T1 permisos TRUNCATE/TRIGGER/REFERENCES que quedan para anon y authenticated: 0',
    'T2 authenticated puede DELETE en negocio: false',
    'T3 dueño intenta borrar su negocio -> [42501] permission denied for table negocio',
    'T4 lo legítimo se conserva: guardado INSERT=true negocio UPDATE columna nombre_negocio=true qr_sello DELETE=true',
    'T5 anon sigue sin poder escribir negocio: false',
    'M1 search_path fijo: true',
    'M2 el valor es el mismo: 1112',
    'M3 sellar_por_geolocalizacion lejos del sitio responde normal (usa distancia_metros) -> true',
    'R1 turista intenta ponerse rol admin -> [42501] No puedes cambiar tu rol.',
    'R2 su rol sigue siendo: turista',
    'R3 turista cambia otro dato propio (pais) -> OK',
    'R4 crear su fila con rol admin -> [42501] No puedes elegir tu rol.',
    'R5 crear su fila con rol turista pasa el trigger (falla solo por duplicado) -> [23505]',
    'R6 intentó ser admin y llamar a una función de admin -> {"exito": false, "mensaje": "No tienes permiso',
    'R7 el rol sí se puede asignar por SQL (postgres) y entonces funciona: true'
  ];
  fallas := 0;
  foreach esperado in array esperados loop
    if position(esperado in r) = 0 then
      fallas := fallas + 1;
      r := r || E'\nFALLA: no apareció «' || left(esperado, 170) || '»';
    end if;
  end loop;
  r := E'RESULTADO: ' || (array_length(esperados, 1) - fallas) || ' de ' || array_length(esperados, 1) || ' comprobaciones correctas' || case when fallas > 0 then ' (' || fallas || ' FALLAN)' else ' (todas)' end || E'\n\n' || r;
  raise exception 'ROLLBACK DE PRUEBA%', E'\n' || r;
end $test$;
