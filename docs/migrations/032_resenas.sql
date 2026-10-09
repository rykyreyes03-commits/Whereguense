-- docs/migrations/032_resenas.sql
--
-- Reseñas completas: lectura pública sin exponer usuario_id, escritura solo por funciones que validan TODO por dentro.
--
-- Decisiones (acordadas):
--  1. Alias del autor: "Viajero" mientras el usuario no haya personalizado su nombre (usuario.nombre_usuario es igual a la parte
--     local de su correo, que es el valor por defecto con el que se crea la fila). Tampoco sale un nombre que contenga '@'.
--     Nunca se expone el correo ni el id del usuario.
--  2. resena deja de poder leerse o escribirse directo: se revoca SELECT a anon y authenticated, e INSERT/UPDATE a authenticated.
--     Hoy anon podía hacer select * y ver usuario_id (rastrear a una persona entre negocios). Todo pasa por estas funciones.
--     Como son SECURITY DEFINER no pasan por RLS ni por el trigger de la 019, así que revisan por dentro: sesión, sello de ESE
--     negocio, no ser el dueño, negocio visible, autor/dueño y el largo del comentario.
--  3. El comentario es obligatorio, de 10 a 2000 caracteres: trigger BEFORE INSERT (y lo revisa guardar_resena al editar).
--  4. Las reseñas son del negocio, no de la actividad: siguen visibles aunque la actividad que dio el sello ya haya terminado.
--
-- Funciones: resenas_publicas, resumen_resenas, puede_resenar, guardar_resena, responder_resena, admin_resenas
-- (admin_borrar_resena ya existía). autor_visible es interna.

begin;

-- -----------------------------------------------------------------------------
-- 1. Comentario obligatorio de 10 a 2000 caracteres
-- -----------------------------------------------------------------------------
create or replace function public.resena_exigir_comentario()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.comentario := btrim(coalesce(new.comentario, ''));
  if char_length(new.comentario) < 10 or char_length(new.comentario) > 2000 then
    raise exception 'El comentario debe tener entre 10 y 2000 caracteres.' using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.resena_exigir_comentario() is
    'BEFORE INSERT en resena: el comentario es obligatorio, de 10 a 2000 caracteres (032).';

drop trigger if exists resena_exigir_comentario on public.resena;
create trigger resena_exigir_comentario
    before insert on public.resena
    for each row execute function public.resena_exigir_comentario();

-- -----------------------------------------------------------------------------
-- 2. Alias visible del autor (interna)
-- -----------------------------------------------------------------------------
create or replace function public.autor_visible(p_usuario_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select case
        when u.nombre_usuario is null
          or btrim(u.nombre_usuario) = ''
          or position('@' in u.nombre_usuario) > 0
          or lower(btrim(u.nombre_usuario)) in (lower(split_part(u.email, '@', 1)), 'usuario')
        then 'Viajero'
        else btrim(u.nombre_usuario)
    end
    from public.usuario u
    where u.id = p_usuario_id;
$$;

comment on function public.autor_visible(uuid) is
    'Nombre que se muestra de un autor de reseña: su nombre_usuario si lo personalizó; "Viajero" si es el valor por defecto (derivado del correo) o contiene @ (032).';

revoke execute on function public.autor_visible(uuid) from public, anon, authenticated;
grant execute on function public.autor_visible(uuid) to service_role;

-- -----------------------------------------------------------------------------
-- 3. Lectura
-- -----------------------------------------------------------------------------
create or replace function public.resenas_publicas(p_negocio_id integer)
returns table (
    id                bigint,
    autor             text,
    calificacion      smallint,
    comentario        text,
    fecha             timestamptz,
    respuesta         text,
    fecha_respuesta   timestamptz,
    es_mia            boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select r.id,
           public.autor_visible(r.usuario_id),
           r.calificacion,
           r.comentario,
           r.fecha,
           r.respuesta_emprendedor,
           r.fecha_respuesta,
           (auth.uid() is not null and r.usuario_id = auth.uid())
    from public.resena r
    where r.negocio_id = p_negocio_id
      and public.negocio_visible(p_negocio_id)
    order by r.fecha desc, r.id desc;
$$;

comment on function public.resenas_publicas(integer) is
    'Reseñas de un negocio visible, más recientes primero, con el alias del autor (nunca usuario_id ni correo), la respuesta del negocio y es_mia (032).';

revoke execute on function public.resenas_publicas(integer) from public;
grant execute on function public.resenas_publicas(integer) to anon, authenticated, service_role;

create or replace function public.resumen_resenas(p_negocio_id integer)
returns table (
    promedio   numeric,
    total      bigint,
    uno        bigint,
    dos        bigint,
    tres       bigint,
    cuatro     bigint,
    cinco      bigint
)
language sql
stable
security definer
set search_path = ''
as $$
    select round(avg(r.calificacion)::numeric, 1),
           count(*),
           count(*) filter (where r.calificacion = 1),
           count(*) filter (where r.calificacion = 2),
           count(*) filter (where r.calificacion = 3),
           count(*) filter (where r.calificacion = 4),
           count(*) filter (where r.calificacion = 5)
    from public.resena r
    where r.negocio_id = p_negocio_id
      and public.negocio_visible(p_negocio_id);
$$;

comment on function public.resumen_resenas(integer) is
    'Promedio (1 decimal, null sin reseñas), total y cuántas hay de cada calificación de un negocio visible (032).';

revoke execute on function public.resumen_resenas(integer) from public;
grant execute on function public.resumen_resenas(integer) to anon, authenticated, service_role;

create or replace function public.puede_resenar(p_negocio_id integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select auth.uid() is not null
       and public.negocio_visible(p_negocio_id)
       and not public.es_duenio_negocio(p_negocio_id)
       and exists (
            select 1
            from public.sello s
            join public.qr_sello q on q.id = s.qr_sello_id
            where s.usuario_id = auth.uid()
              and q.negocio_id = p_negocio_id
       );
$$;

comment on function public.puede_resenar(integer) is
    'Verdadero solo con sesión, un sello de ESE negocio, sin ser su dueño y con el negocio visible (032).';

revoke execute on function public.puede_resenar(integer) from public, anon;
grant execute on function public.puede_resenar(integer) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. Escritura (revisan todo por dentro: SECURITY DEFINER no pasa por RLS)
-- -----------------------------------------------------------------------------
create or replace function public.guardar_resena(p_negocio_id integer, p_calificacion integer, p_comentario text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_comentario text := btrim(coalesce(p_comentario, ''));
  v_id bigint;
  v_nueva boolean;
begin
  if v_uid is null then
    return jsonb_build_object('exito', false, 'mensaje', 'Necesitas iniciar sesión.');
  end if;
  if p_calificacion is null or p_calificacion < 1 or p_calificacion > 5 then
    return jsonb_build_object('exito', false, 'mensaje', 'Elige de 1 a 5 estrellas.');
  end if;
  if char_length(v_comentario) < 10 then
    return jsonb_build_object('exito', false, 'mensaje', 'Escribe un comentario de al menos 10 caracteres.');
  end if;
  if char_length(v_comentario) > 2000 then
    return jsonb_build_object('exito', false, 'mensaje', 'El comentario puede tener hasta 2000 caracteres.');
  end if;
  if not public.negocio_visible(p_negocio_id) then
    return jsonb_build_object('exito', false, 'mensaje', 'Este negocio no está disponible.');
  end if;
  if public.es_duenio_negocio(p_negocio_id) then
    return jsonb_build_object('exito', false, 'mensaje', 'No puedes reseñar tu propio negocio.');
  end if;
  if not exists (
       select 1 from public.sello s join public.qr_sello q on q.id = s.qr_sello_id
       where s.usuario_id = v_uid and q.negocio_id = p_negocio_id
  ) then
    return jsonb_build_object('exito', false, 'mensaje', 'Escanea el sello de este negocio para poder dejar tu reseña.');
  end if;

  -- Una reseña por persona y negocio: si ya tenía, se edita (la respuesta del negocio se conserva).
  insert into public.resena (negocio_id, usuario_id, calificacion, comentario)
  values (p_negocio_id, v_uid, p_calificacion, v_comentario)
  on conflict (negocio_id, usuario_id)
  do update set calificacion = excluded.calificacion, comentario = excluded.comentario
  returning id, (xmax = 0) into v_id, v_nueva;

  return jsonb_build_object(
    'exito', true,
    'mensaje', case when v_nueva then 'Gracias por tu reseña.' else 'Tu reseña se actualizó.' end,
    'id', v_id,
    'editada', not v_nueva
  );
end;
$$;

comment on function public.guardar_resena(integer, integer, text) is
    'Crea o edita la reseña de quien llama: exige sesión, calificación 1-5, comentario de 10 a 2000, sello de ese negocio, no ser el dueño y negocio visible (032).';

revoke execute on function public.guardar_resena(integer, integer, text) from public, anon;
grant execute on function public.guardar_resena(integer, integer, text) to authenticated, service_role;

create or replace function public.responder_resena(p_resena_id bigint, p_respuesta text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resena public.resena;
  v_respuesta text := btrim(coalesce(p_respuesta, ''));
begin
  if auth.uid() is null then
    return jsonb_build_object('exito', false, 'mensaje', 'Necesitas iniciar sesión.');
  end if;

  select * into v_resena from public.resena where id = p_resena_id for update;
  -- Inexistente o de otro negocio: el mismo mensaje, para no revelar qué reseñas existen.
  if not found or not public.es_duenio_negocio(v_resena.negocio_id) then
    return jsonb_build_object('exito', false, 'mensaje', 'No tienes permiso sobre esta reseña.');
  end if;

  if char_length(v_respuesta) < 1 then
    return jsonb_build_object('exito', false, 'mensaje', 'Escribe tu respuesta.');
  end if;
  if char_length(v_respuesta) > 2000 then
    return jsonb_build_object('exito', false, 'mensaje', 'La respuesta puede tener hasta 2000 caracteres.');
  end if;

  update public.resena
  set respuesta_emprendedor = v_respuesta,
      fecha_respuesta = case when respuesta_emprendedor is distinct from v_respuesta then now() else fecha_respuesta end
  where id = v_resena.id;

  return jsonb_build_object('exito', true, 'mensaje', case when v_resena.respuesta_emprendedor is null then 'Respuesta publicada.' else 'Respuesta actualizada.' end);
end;
$$;

comment on function public.responder_resena(bigint, text) is
    'El dueño del negocio responde (o edita su respuesta a) una reseña: de 1 a 2000 caracteres (032).';

revoke execute on function public.responder_resena(bigint, text) from public, anon;
grant execute on function public.responder_resena(bigint, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 5. Moderación (solo admin): todas las reseñas, también de negocios vencidos
-- -----------------------------------------------------------------------------
create or replace function public.admin_resenas()
returns table (
    id                bigint,
    negocio_id        integer,
    negocio           text,
    autor             text,
    calificacion      smallint,
    comentario        text,
    fecha             timestamptz,
    respuesta         text,
    fecha_respuesta   timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
    select r.id,
           r.negocio_id,
           n.nombre_negocio,
           public.autor_visible(r.usuario_id),
           r.calificacion,
           r.comentario,
           r.fecha,
           r.respuesta_emprendedor,
           r.fecha_respuesta
    from public.resena r
    join public.negocio n on n.id = r.negocio_id
    where exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'admin')
    order by r.fecha desc, r.id desc;
$$;

comment on function public.admin_resenas() is
    'Solo admin: todas las reseñas con el nombre del negocio (también los vencidos) y el alias del autor. Para cualquier otro usuario devuelve vacío (032).';

revoke execute on function public.admin_resenas() from public, anon;
grant execute on function public.admin_resenas() to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 6. resena ya no se lee ni se escribe directo
-- -----------------------------------------------------------------------------
revoke select on public.resena from anon, authenticated;
revoke insert, update on public.resena from anon, authenticated;

commit;
