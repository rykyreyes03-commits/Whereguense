-- =============================================================================
-- Wheregüense — Migración 005: tabla genérica de guardados (favoritos)
-- =============================================================================
-- Depende de: 001_schema_inicial.sql (tabla usuario) + 002_rls_policies.sql.
-- Motor: PostgreSQL 15 (Supabase). Ejecutar como service_role / desde el
-- editor SQL de Supabase.
--
-- GUARDADO: favoritos del usuario para cualquier entidad — rutas, sitios,
-- negocios, eventos y ubicaciones personalizadas.
-- Reemplaza a `ruta_guardada` (001), que queda sin uso.
--
-- Idempotente hasta donde el DDL lo permite (drop policy if exists;
-- create index no lleva "if not exists" aquí para que falle ruidosamente
-- si ya existe).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- GUARDADO
-- -----------------------------------------------------------------------------
create table public.guardado (
    usuario_id      uuid        not null references public.usuario (id) on delete cascade,
    tipo            text        not null check (tipo in ('ruta', 'sitio', 'ubicacion', 'negocio', 'evento')),
    referencia_id   text        not null,
    datos           jsonb,
    fecha_guardado  timestamptz not null default now(),
    primary key (usuario_id, tipo, referencia_id)
);

comment on table public.guardado is
    'Favoritos del usuario: rutas, sitios, negocios, eventos y ubicaciones personalizadas guardadas.';
comment on column public.guardado.referencia_id is
    'Id de la entidad guardada como texto (int de ruta/sitio/negocio/evento, o id propio para "ubicacion").';
comment on column public.guardado.datos is
    'Payload opcional (p. ej. lat/lng y etiqueta para tipo = ubicacion).';

create index idx_guardado_usuario_tipo on public.guardado (usuario_id, tipo);


-- -----------------------------------------------------------------------------
-- RLS: solo el dueño ve y edita sus guardados
-- -----------------------------------------------------------------------------
alter table public.guardado enable row level security;

drop policy if exists guardado_all_owner on public.guardado;
create policy guardado_all_owner on public.guardado
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

commit;


-- =============================================================================
-- Verificación (opcional, correr tras el commit)
-- =============================================================================
-- Columnas:
-- select column_name, data_type, is_nullable
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'guardado'
-- order by ordinal_position;
--
-- RLS activa (rowsecurity = true) + políticas:
-- select c.relname, c.relrowsecurity as rls_activa, p.polname as politica
-- from pg_class c
-- left join pg_policy p on p.polrelid = c.oid
-- where c.relnamespace = 'public'::regnamespace and c.relname = 'guardado';
--
-- Esperado: rls_activa = true, politica = guardado_all_owner.
--
-- NOTA: ruta_guardada (001) queda huérfana. NO se elimina en esta migración
-- (aún no hay código que dependa de ninguna de las dos). Cuando el front
-- migre a `guardado`, una migración 006 puede hacer el drop.
-- =============================================================================
