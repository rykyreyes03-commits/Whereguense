-- docs/migrations/016_candado_suscripcion.sql
--
-- Activa el candado de suscripción vencida: un negocio activo cuya
-- fecha_vencimiento_suscripcion ya pasó deja de ser visible para el turista
-- (anon y cualquier usuario que no sea el dueño).
--
-- Base preparada en 012 (columnas y backfill), 013 (insert por columna),
-- 014 (renovación acumulativa) y 015 (anon solo lectura).
--
-- La condición nueva va SOLO en la rama pública. La rama "es el dueño" queda
-- igual: el dueño sigue viendo su negocio completo aunque esté vencido (para
-- poder ver el aviso de renovación).
--
--   pública antes:   estado = 'activo'
--   pública ahora:   estado = 'activo' AND fecha_vencimiento_suscripcion > now()
--
-- Un negocio activo con fecha_vencimiento_suscripcion NULL también queda oculto
-- (NULL > now() no es verdadero). Hoy no hay ninguno: 012 completó los dos que
-- existían y admin_aprobar_negocio siempre pone la fecha.
--
-- Los admins/auditores no cambian: tienen sus propias políticas de SELECT
-- (negocio_select_admin / negocio_select_auditor).

begin;

-- 1. Fila de negocio
alter policy negocio_select_activo_o_duenio on public.negocio
    using (
        auth.uid() = usuario_id
        or (estado = 'activo' and fecha_vencimiento_suscripcion > now())
    );

-- 2. Tablas hijas (negocio_foto, negocio_horario, producto, qr_sello usan esta función)
create or replace function public.negocio_visible(p_negocio_id integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.negocio n
        where n.id = p_negocio_id
          and (
              n.usuario_id = auth.uid()
              or (n.estado = 'activo' and n.fecha_vencimiento_suscripcion > now())
          )
    );
$$;

comment on function public.negocio_visible(integer) is
    'true si auth.uid() es el dueño, o si el negocio está activo con suscripción vigente (016). Para lectura de tablas hijas.';

commit;
