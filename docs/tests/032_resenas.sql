-- docs/tests/032_resenas.sql
-- Prueba con ROLLBACK de la migración 032 (ya aplicada): permisos, autor, comentario 10-2000, alias, resumen, respuesta,
-- moderación y reseña de un sello de actividad terminada. Se corre completa con execute_sql; termina en
-- 'ROLLBACK DE PRUEBA' con el resultado (primera línea 'RESULTADO: N de N comprobaciones correctas'). No deja datos.

-- ---------------------------------------------------------------------------
-- Ayudas de la prueba (solo existen durante esta sesión: viven en pg_temp)
-- ---------------------------------------------------------------------------
create function pg_temp.como(u uuid) returns void language plpgsql as $f$
begin
  perform set_config('request.jwt.claims', case when u is null then '' else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
  if u is null then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
end $f$;

-- Corre una sentencia como un usuario real (u = null: visitante). Devuelve el resultado o '[sqlstate] mensaje'.
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
  adm  uuid := 'f9fa4efb-d727-42f9-9f63-1959d58a873f';   -- admin; dueño del negocio 2; tiene un sello real del negocio 1
  tur  uuid := '264e1a69-9fbd-4062-86c5-37f93a5f742d';
  tur2 uuid := 'a7094b99-c19e-43a0-8546-0c45dadf9965';
  tur3 uuid := 'ba6d7948-2390-4f40-9bf8-2cb1f820d849';
  qr1 int; qr3 int; qr_fin int; resp_id bigint; fecha_r1 timestamptz; fecha_r2 timestamptz; t text; n int; claves text;
  esperados text[]; esperado text; fallas int;
begin
  -- Datos de prueba: sellos de los negocios 1 y 3 (el 3 no es visible: está rechazado)
  insert into qr_sello (negocio_id, token, nombre_actividad) values (1, 'TOK-RES-1', 'Sello para reseñas') returning id into qr1;
  insert into qr_sello (negocio_id, token, nombre_actividad) values (3, 'TOK-RES-3', 'Sello de negocio fuera') returning id into qr3;
  insert into sello (usuario_id, tipo, qr_sello_id) values (tur, 'qr', qr1), (tur2, 'qr', qr1), (tur2, 'qr', qr3);

  r := r || E'--- puede_resenar ---';
  r := r || E'\nP1 visitante -> ' || pg_temp.corre(null, 'select puede_resenar(1)::text');
  r := r || E'\nP2 turista SIN sello de ese negocio -> ' || pg_temp.corre(tur3, 'select puede_resenar(1)::text');
  r := r || E'\nP3 turista CON sello del negocio 1 -> ' || pg_temp.corre(tur, 'select puede_resenar(1)::text');
  r := r || E'\nP4 el dueño (papu) de su propio negocio -> ' || pg_temp.corre(papu, 'select puede_resenar(1)::text');
  r := r || E'\nP5 el admin (tiene sello real del negocio 1, no es su dueño) -> ' || pg_temp.corre(adm, 'select puede_resenar(1)::text');
  r := r || E'\nP6 negocio no visible (3), aunque tenga sello -> ' || pg_temp.corre(tur2, 'select puede_resenar(3)::text');
  r := r || E'\nP7 sello de OTRO negocio (tiene del 1, pregunta por el 2) -> ' || pg_temp.corre(tur, 'select puede_resenar(2)::text');

  r := r || E'\n\n--- guardar_resena: validaciones ---';
  r := r || E'\nG1 visitante -> ' || pg_temp.corre(null, $q$select guardar_resena(1, 5, 'Muy buena atención y buen café')::text$q$);
  r := r || E'\nG2 sin sello de ese negocio -> ' || pg_temp.corre(tur3, $q$select guardar_resena(1, 5, 'Muy buena atención y buen café')::text$q$);
  r := r || E'\nG3 calificación 0 -> ' || pg_temp.corre(tur, $q$select guardar_resena(1, 0, 'Muy buena atención y buen café')::text$q$);
  r := r || E'\nG3b calificación 6 -> ' || pg_temp.corre(tur, $q$select guardar_resena(1, 6, 'Muy buena atención y buen café')::text$q$);
  r := r || E'\nG3c sin calificación -> ' || pg_temp.corre(tur, $q$select guardar_resena(1, null, 'Muy buena atención y buen café')::text$q$);
  r := r || E'\nG4 comentario de 9 caracteres -> ' || pg_temp.corre(tur, $q$select guardar_resena(1, 5, '123456789')::text$q$);
  r := r || E'\nG4b comentario de 10 caracteres con espacios alrededor (cuentan 9) -> ' || pg_temp.corre(tur, $q$select guardar_resena(1, 5, '   123456789   ')::text$q$);
  r := r || E'\nG5 comentario de 2001 caracteres -> ' || pg_temp.corre(tur, $q$select guardar_resena(1, 5, repeat('a', 2001))::text$q$);
  r := r || E'\nG6 el dueño de su propio negocio -> ' || pg_temp.corre(papu, $q$select guardar_resena(1, 5, 'Mi propio negocio es el mejor')::text$q$);
  r := r || E'\nG7 negocio no visible -> ' || pg_temp.corre(tur2, $q$select guardar_resena(3, 5, 'Muy buena atención y buen café')::text$q$);
  r := r || E'\nG8 comentario de exactamente 10 -> ' || pg_temp.corre(tur2, $q$select guardar_resena(1, 4, '1234567890')::text$q$);

  r := r || E'\n\n--- guardar_resena: crear y editar ---';
  r := r || E'\nG9 turista (sello) crea su reseña de 5 estrellas -> ' || left(pg_temp.corre(tur, $q$select guardar_resena(1, 5, 'Muy buena atención y buen café')::text$q$), 70);
  r := r || E'\nG10 el mismo turista la edita a 3 estrellas -> ' || left(pg_temp.corre(tur, $q$select guardar_resena(1, 3, 'Cambié de opinión: estaba lleno y tardaron')::text$q$), 70);
  select count(*) into n from resena where usuario_id = tur and negocio_id = 1;
  r := r || E'\nG11 sigue habiendo UNA reseña de ese turista en ese negocio: ' || n;
  t := pg_temp.corre(adm, $q$select guardar_resena(1, 5, 'Probé el café de altura y me encantó')::text$q$);
  r := r || E'\nG12 el admin (no dueño, con sello) reseña el negocio 1 -> ' || left(t, 60);

  r := r || E'\n\n--- las tablas ya no se tocan directo ---';
  r := r || E'\nD1 visitante: select * from resena -> ' || pg_temp.corre(null, 'select count(*)::text from resena');
  r := r || E'\nD2 turista: select usuario_id from resena -> ' || pg_temp.corre(tur, 'select count(*)::text from resena');
  r := r || E'\nD3 turista: insert directo -> ' || pg_temp.corre(tur, $q$insert into resena (negocio_id, usuario_id, calificacion, comentario) values (1, '264e1a69-9fbd-4062-86c5-37f93a5f742d', 1, 'Intento directo')$q$);
  r := r || E'\nD4 turista: update directo de su reseña -> ' || pg_temp.corre(tur, 'update resena set calificacion = 1 where usuario_id = auth.uid()');
  r := r || E'\nD5 dueño: update directo de la respuesta -> ' || pg_temp.corre(papu, $q$update resena set respuesta_emprendedor = 'directo' where negocio_id = 1$q$);
  begin
    insert into resena (negocio_id, usuario_id, calificacion, comentario) values (2, tur3, 3, 'corto');
    r := r || E'\nD6 trigger: comentario de 5 caracteres insertado como postgres -> ACEPTADO (MAL)';
  exception when others then r := r || E'\nD6 trigger: comentario de 5 caracteres insertado como postgres -> [' || sqlstate || '] ' || sqlerrm; end;

  r := r || E'\n\n--- resenas_publicas: alias, es_mia, orden ---';
  update resena set fecha = now() - interval '1 day' where usuario_id = tur and negocio_id = 1;
  r := r || E'\nA1 visitante ve ' || pg_temp.corre(null, 'select count(*)::text from resenas_publicas(1)') || ' reseñas';
  r := r || E'\nA2 autores con el nombre por defecto -> ' || pg_temp.corre(null, $q$select string_agg(distinct autor, ',') from resenas_publicas(1)$q$);
  select string_agg(k, ',' order by k) into claves from (select distinct jsonb_object_keys(to_jsonb(p)) k from resenas_publicas(1) p) z;
  r := r || E'\nA3 columnas que salen (ni usuario_id ni correo): ' || claves;
  update usuario set nombre_usuario = 'Ana Viajera' where id = tur;
  r := r || E'\nA4 si el turista personalizó su nombre -> ' || pg_temp.corre(null, $q$select string_agg(autor, ',' order by id) from resenas_publicas(1) where calificacion = 3$q$);
  update usuario set nombre_usuario = 'contacto@correo.com' where id = tur2;
  r := r || E'\nA5 un nombre que contiene @ no se muestra -> ' || pg_temp.corre(null, $q$select string_agg(autor, ',' order by id) from resenas_publicas(1) where calificacion = 4$q$);
  update usuario set nombre_usuario = upper(split_part(email, '@', 1)) where id = tur2;
  r := r || E'\nA6 la parte local del correo en MAYÚSCULAS tampoco -> ' || pg_temp.corre(null, $q$select string_agg(autor, ',' order by id) from resenas_publicas(1) where calificacion = 4$q$);
  r := r || E'\nA7 orden: la más reciente primero (calificaciones) -> ' || pg_temp.corre(null, 'select string_agg(calificacion::text, '','' order by fecha desc, id desc) from resenas_publicas(1)');
  r := r || E'\nA8 es_mia: el turista ve ' || pg_temp.corre(tur, 'select count(*)::text from resenas_publicas(1) where es_mia') || ', el visitante ' || pg_temp.corre(null, 'select count(*)::text from resenas_publicas(1) where es_mia');

  r := r || E'\n\n--- resumen_resenas ---';
  r := r || E'\nS1 con 3, 4 y 5 estrellas -> ' || pg_temp.corre(null, $q$select (promedio::text || ' / ' || total || ' reseñas / ' || uno || ',' || dos || ',' || tres || ',' || cuatro || ',' || cinco) from resumen_resenas(1)$q$);
  -- tur3: su sello viene de una actividad que YA TERMINÓ (la reseña es del negocio, no de la actividad)
  insert into qr_sello (negocio_id, token, nombre_actividad, fecha_expiracion) values (1, 'TOK-ACT-TERMINADA', 'Actividad terminada', now() - interval '2 days') returning id into qr_fin;
  insert into actividad_negocio (negocio_id, nombre, descripcion, foto_url, fecha_inicio, fecha_fin, hora_inicio, hora_fin, categoria, lugar, solicita_sello, justificacion_sello, estado_sello, qr_sello_id, limite_canjes)
    values (1, 'Actividad terminada', 'Descripción de prueba suficientemente larga', 'https://x/y.png', current_date - 3, current_date - 2, '10:00', '12:00', 'feria', 'Parque', true, 'Para visitantes', 'aprobado', qr_fin, 5);
  insert into sello (usuario_id, tipo, qr_sello_id) values (tur3, 'qr', qr_fin);
  r := r || E'\nT1 tur3 con sello de una actividad terminada: puede reseñar -> ' || pg_temp.corre(tur3, 'select puede_resenar(1)::text');
  r := r || E'\nT2 y guarda su reseña -> ' || left(pg_temp.corre(tur3, $q$select guardar_resena(1, 5, 'Fui a la actividad y estuvo muy bien')::text$q$), 60);
  r := r || E'\nT3 la reseña sigue visible: ' || pg_temp.corre(null, $q$select count(*)::text from resenas_publicas(1) where calificacion = 5 and es_mia is false$q$) || ' de 5 estrellas visibles para el público';
  r := r || E'\nS2 con 3, 4, 5 y 5 -> ' || pg_temp.corre(null, $q$select (promedio::text || ' / ' || total) from resumen_resenas(1)$q$) || ' (4.25 redondea a 4.3)';
  r := r || E'\nS3 negocio sin reseñas (2) -> ' || pg_temp.corre(null, $q$select (coalesce(promedio::text, 'null') || ' / ' || total) from resumen_resenas(2)$q$);

  r := r || E'\n\n--- responder_resena ---';
  select id into resp_id from resena where usuario_id = tur and negocio_id = 1;
  r := r || E'\nR1 visitante -> ' || pg_temp.corre(null, format($q$select responder_resena(%s, 'Gracias por venir')::text$q$, resp_id));
  r := r || E'\nR2 el autor de la reseña intenta responderse -> ' || pg_temp.corre(tur, format($q$select responder_resena(%s, 'Gracias por venir')::text$q$, resp_id));
  r := r || E'\nR3 otro dueño (el admin, negocio 2) -> ' || pg_temp.corre(adm, format($q$select responder_resena(%s, 'Gracias por venir')::text$q$, resp_id));
  r := r || E'\nR4 reseña inexistente -> ' || pg_temp.corre(papu, $q$select responder_resena(-1, 'Gracias por venir')::text$q$);
  r := r || E'\nR5 respuesta vacía -> ' || pg_temp.corre(papu, format($q$select responder_resena(%s, '   ')::text$q$, resp_id));
  r := r || E'\nR6 respuesta de 2001 caracteres -> ' || pg_temp.corre(papu, format($q$select responder_resena(%s, repeat('a', 2001))::text$q$, resp_id));
  r := r || E'\nR7 el dueño responde -> ' || pg_temp.corre(papu, format($q$select responder_resena(%s, 'Gracias por venir, te esperamos pronto')::text$q$, resp_id));
  select fecha_respuesta into fecha_r1 from resena where id = resp_id;
  update resena set fecha_respuesta = fecha_respuesta - interval '1 hour' where id = resp_id;
  r := r || E'\nR8 el dueño edita su respuesta -> ' || pg_temp.corre(papu, format($q$select responder_resena(%s, 'Gracias por venir, nos vemos pronto')::text$q$, resp_id));
  select fecha_respuesta into fecha_r2 from resena where id = resp_id;
  r := r || E'\nR9 al editar, fecha_respuesta se actualiza: ' || (fecha_r2 > fecha_r1 - interval '1 hour');
  r := r || E'\nR10 la respuesta se ve en la lista pública: ' || pg_temp.corre(null, format($q$select (respuesta is not null and fecha_respuesta is not null)::text from resenas_publicas(1) where id = %s$q$, resp_id));
  r := r || E'\nR11 el turista edita su reseña y la respuesta se conserva -> ' || left(pg_temp.corre(tur, $q$select guardar_resena(1, 4, 'Volví y mejoró bastante la atención')::text$q$), 40) || ' | respuesta: ' || (select (respuesta_emprendedor is not null)::text from resena where id = resp_id);

  r := r || E'\n\n--- visibilidad: un negocio vencido no muestra reseñas, pero su dueño sí las ve ---';
  update negocio set fecha_vencimiento_suscripcion = now() - interval '1 day' where id = 1;
  r := r || E'\nV1 visitante (negocio vencido) -> ' || pg_temp.corre(null, 'select count(*)::text from resenas_publicas(1)') || ' reseñas, resumen total ' || pg_temp.corre(null, 'select total::text from resumen_resenas(1)');
  r := r || E'\nV2 el dueño sí las ve -> ' || pg_temp.corre(papu, 'select count(*)::text from resenas_publicas(1)');

  r := r || E'\n\n--- moderación (admin) ---';
  r := r || E'\nM1 admin_resenas como admin (incluye el negocio vencido) -> ' || pg_temp.corre(adm, 'select count(*)::text from admin_resenas()') || ' reseñas';
  r := r || E'\nM2 trae el nombre del negocio -> ' || pg_temp.corre(adm, $q$select string_agg(distinct negocio, ',') from admin_resenas()$q$);
  r := r || E'\nM3 un dueño (papu) -> ' || pg_temp.corre(papu, 'select count(*)::text from admin_resenas()') || ' filas';
  r := r || E'\nM4 un turista -> ' || pg_temp.corre(tur, 'select count(*)::text from admin_resenas()') || ' filas';
  r := r || E'\nM5 visitante -> ' || pg_temp.corre(null, 'select count(*)::text from admin_resenas()');
  r := r || E'\nM6 admin_borrar_resena como turista -> ' || pg_temp.corre(tur, format('select admin_borrar_resena(%s)::text', resp_id));
  r := r || E'\nM7 admin_borrar_resena como admin -> ' || pg_temp.corre(adm, format('select admin_borrar_resena(%s)::text', resp_id));
  select count(*) into n from resena where id = resp_id;
  r := r || E'\nM8 la reseña ya no existe: ' || n;

  esperados := array[
    'P1 visitante -> [42501] permission denied for function puede_resenar',
    'P2 turista SIN sello de ese negocio -> false',
    'P3 turista CON sello del negocio 1 -> true',
    'P4 el dueño (papu) de su propio negocio -> false',
    'P5 el admin (tiene sello real del negocio 1, no es su dueño) -> true',
    'P6 negocio no visible (3), aunque tenga sello -> false',
    'P7 sello de OTRO negocio (tiene del 1, pregunta por el 2) -> false',
    'G1 visitante -> [42501] permission denied for function guardar_resena',
    'G2 sin sello de ese negocio -> {"exito": false, "mensaje": "Escanea el sello de este negocio para poder dejar tu reseña."}',
    'G3 calificación 0 -> {"exito": false, "mensaje": "Elige de 1 a 5 estrellas."}',
    'G3b calificación 6 -> {"exito": false, "mensaje": "Elige de 1 a 5 estrellas."}',
    'G3c sin calificación -> {"exito": false, "mensaje": "Elige de 1 a 5 estrellas."}',
    'G4 comentario de 9 caracteres -> {"exito": false, "mensaje": "Escribe un comentario de al menos 10 caracteres."}',
    'G4b comentario de 10 caracteres con espacios alrededor (cuentan 9) -> {"exito": false, "mensaje": "Escribe un comentario de al menos 10 caracteres."}',
    'G5 comentario de 2001 caracteres -> {"exito": false, "mensaje": "El comentario puede tener hasta 2000 caracteres."}',
    'G6 el dueño de su propio negocio -> {"exito": false, "mensaje": "No puedes reseñar tu propio negocio."}',
    'G7 negocio no visible -> {"exito": false, "mensaje": "Este negocio no está disponible."}',
    'G8 comentario de exactamente 10 -> {"id":',
    'G9 turista (sello) crea su reseña de 5 estrellas -> {"id":',
    'G10 el mismo turista la edita a 3 estrellas -> {"id":',
    'G11 sigue habiendo UNA reseña de ese turista en ese negocio: 1',
    'D1 visitante: select * from resena -> [42501] permission denied for table resena',
    'D2 turista: select usuario_id from resena -> [42501] permission denied for table resena',
    'D3 turista: insert directo -> [42501] permission denied for table resena',
    'D4 turista: update directo de su reseña -> [42501] permission denied for table resena',
    'D5 dueño: update directo de la respuesta -> [42501] permission denied for table resena',
    'D6 trigger: comentario de 5 caracteres insertado como postgres -> [23514] El comentario debe tener entre 10 y 2000 caracteres.',
    'A1 visitante ve 3 reseñas',
    'A2 autores con el nombre por defecto -> Viajero',
    'A3 columnas que salen (ni usuario_id ni correo): autor,calificacion,comentario,es_mia,fecha,fecha_respuesta,id,respuesta',
    'A4 si el turista personalizó su nombre -> Ana Viajera',
    'A5 un nombre que contiene @ no se muestra -> Viajero',
    'A6 la parte local del correo en MAYÚSCULAS tampoco -> Viajero',
    'A7 orden: la más reciente primero (calificaciones) -> 5,4,3',
    'A8 es_mia: el turista ve 1, el visitante 0',
    'S1 con 3, 4 y 5 estrellas -> 4.0 / 3 reseñas / 0,0,1,1,1',
    'T1 tur3 con sello de una actividad terminada: puede reseñar -> true',
    'T3 la reseña sigue visible: 2 de 5 estrellas visibles para el público',
    'S2 con 3, 4, 5 y 5 -> 4.3 / 4 (4.25 redondea a 4.3)',
    'S3 negocio sin reseñas (2) -> null / 0',
    'R1 visitante -> [42501] permission denied for function responder_resena',
    'R2 el autor de la reseña intenta responderse -> {"exito": false, "mensaje": "No tienes permiso sobre esta reseña."}',
    'R3 otro dueño (el admin, negocio 2) -> {"exito": false, "mensaje": "No tienes permiso sobre esta reseña."}',
    'R4 reseña inexistente -> {"exito": false, "mensaje": "No tienes permiso sobre esta reseña."}',
    'R5 respuesta vacía -> {"exito": false, "mensaje": "Escribe tu respuesta."}',
    'R6 respuesta de 2001 caracteres -> {"exito": false, "mensaje": "La respuesta puede tener hasta 2000 caracteres."}',
    'R7 el dueño responde -> {"exito": true, "mensaje": "Respuesta publicada."}',
    'R8 el dueño edita su respuesta -> {"exito": true, "mensaje": "Respuesta actualizada."}',
    'R9 al editar, fecha_respuesta se actualiza: true',
    'R10 la respuesta se ve en la lista pública: true',
    '| respuesta: true',
    'V1 visitante (negocio vencido) -> 0 reseñas, resumen total 0',
    'V2 el dueño sí las ve -> 4',
    'M1 admin_resenas como admin (incluye el negocio vencido) -> 4 reseñas',
    'M2 trae el nombre del negocio -> papu',
    'M3 un dueño (papu) -> 0 filas',
    'M4 un turista -> 0 filas',
    'M5 visitante -> [42501] permission denied for function admin_resenas',
    'M6 admin_borrar_resena como turista -> {"exito": false, "mensaje": "No tienes permiso de administrador."}',
    'M7 admin_borrar_resena como admin -> {"exito": true, "mensaje": "Reseña eliminada."}',
    'M8 la reseña ya no existe: 0'
  ];
  if r is null then
    raise exception 'FALLA: el resultado quedó NULL (alguna pieza dio NULL)';
  end if;
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
