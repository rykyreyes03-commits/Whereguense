-- docs/tests/033_aprobar_sello_no_terminada.sql
-- Prueba con ROLLBACK de la migración 033 (ya aplicada): admin_aprobar_sello rechaza una actividad que ya terminó,
-- sigue aprobando una vigente (con fecha_expiracion = fin real) y rechazar_sello sigue funcionando en una terminada.
-- Se corre completa con execute_sql; termina en 'ROLLBACK DE PRUEBA' (primera línea: 'RESULTADO: N de N ...').

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

do $test$
declare
  r text := '';
  papu uuid := '278a66c1-ee5a-42f4-a72a-a16e0e6553aa';   -- dueño del negocio 1
  adm  uuid := 'f9fa4efb-d727-42f9-9f63-1959d58a873f';   -- admin (dueño del negocio 2)
  a_term bigint; a_term2 bigint; a_vig bigint; a_sinfecha bigint; exp timestamptz; n int;
  esperados text[]; esperado text; fallas int;
begin
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar, solicita_sello, justificacion_sello, estado_sello, limite_canjes)
    values (1, 'Terminada A', 'Descripción de prueba suficientemente larga', 'https://x/y.png', current_date - 3, current_date - 2, '10:00', '12:00', 'feria', 'Parque', true, 'Para visitantes', 'pendiente', 5) returning id into a_term;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar, solicita_sello, justificacion_sello, estado_sello, limite_canjes)
    values (1, 'Terminada B', 'Descripción de prueba suficientemente larga', 'https://x/y.png', current_date - 3, current_date - 2, '10:00', '12:00', 'feria', 'Parque', true, 'Para visitantes', 'pendiente', 5) returning id into a_term2;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar, solicita_sello, justificacion_sello, estado_sello, limite_canjes)
    values (1, 'Vigente', 'Descripción de prueba suficientemente larga', 'https://x/y.png', current_date + 1, current_date + 2, '10:00', '12:00', 'feria', 'Parque', true, 'Para visitantes', 'pendiente', 5) returning id into a_vig;

  r := r || E'--- admin_aprobar_sello ---';
  r := r || E'\nA1 actividad terminada -> ' || pg_temp.corre(adm, format('select admin_aprobar_sello(%s)::text', a_term));
  select count(*) into n from actividad_negocio where id = a_term and estado_sello = 'pendiente' and qr_sello_id is null;
  r := r || E'\nA2 la terminada sigue pendiente y sin QR: ' || n;
  r := r || E'\nA3 actividad vigente se aprueba -> ' || left(pg_temp.corre(adm, format('select admin_aprobar_sello(%s)::text', a_vig)), 62);
  select q.fecha_expiracion into exp from actividad_negocio a join qr_sello q on q.id = a.qr_sello_id where a.id = a_vig;
  r := r || E'\nA4 su QR vence en el fin real (fecha_fin + hora_fin, Managua): ' || (exp = fin_de_actividad(current_date + 2, '10:00'::time, '12:00'::time));
  r := r || E'\nA5 un dueño que no es admin -> ' || pg_temp.corre(papu, format('select admin_aprobar_sello(%s)::text', a_term));
  r := r || E'\nA6 una actividad que no existe -> ' || pg_temp.corre(adm, 'select admin_aprobar_sello(-1)::text');

  r := r || E'\n\n--- admin_rechazar_sello ---';
  r := r || E'\nR1 rechazar una terminada sigue funcionando -> ' || pg_temp.corre(adm, format($q$select admin_rechazar_sello(%s, 'Ya pasó la fecha')::text$q$, a_term2));
  select count(*) into n from actividad_negocio where id = a_term2 and estado_sello = 'rechazado' and motivo_rechazo_sello = 'Ya pasó la fecha';
  r := r || E'\nR2 queda rechazada con su motivo: ' || n;

  esperados := array[
    'A1 actividad terminada -> {"exito": false, "mensaje": "Esta actividad ya terminó."}',
    'A2 la terminada sigue pendiente y sin QR: 1',
    'A3 actividad vigente se aprueba -> {"exito": true, "mensaje": "Sello aprobado.", "qr_sello_id":',
    'A4 su QR vence en el fin real (fecha_fin + hora_fin, Managua): true',
    'A5 un dueño que no es admin -> {"exito": false, "mensaje": "No tienes permiso de administrador."}',
    'A6 una actividad que no existe -> {"exito": false, "mensaje": "Actividad no encontrada."}',
    'R1 rechazar una terminada sigue funcionando -> {"exito": true',
    'R2 queda rechazada con su motivo: 1'
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
