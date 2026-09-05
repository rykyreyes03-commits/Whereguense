-- =============================================================================
-- Wheregüense — Migración 004: señal de onboarding completado en usuario
-- =============================================================================
-- Depende de: 001_schema_inicial.sql (tabla usuario ya creada).
-- Motor: PostgreSQL 15 (Supabase).
--
-- Contexto: al conectar Supabase Auth (email OTP) necesitamos distinguir, tras
-- iniciar sesión, entre:
--   - usuario nuevo / que no terminó el flujo inicial  -> va a 'proposito'
--   - usuario que ya eligió danzante alguna vez         -> entra directo a 'inicio'
--
-- Hoy esa señal es localStorage.flujoInicialCompletado (por dispositivo).
-- Se mueve a la BD para que funcione entre dispositivos.
--
-- No se usa usuario.avatar_personaje para esto: tiene default 'cabezon', así que
-- no permite saber si el usuario realmente eligió. Una columna booleana explícita
-- es más clara y no mezcla conceptos (3NF).
--
-- Comportamiento esperado:
--   - Fila nueva de usuario            -> onboarding_completado = false (default).
--   - handleElegirDanzante en el front -> update ... set onboarding_completado = true.
--   - La ruta de emprendedor NO lo marca (igual que hoy no marca flujoInicialCompletado).
--
-- Idempotente: "add column if not exists".
-- =============================================================================

begin;

alter table public.usuario
    add column if not exists onboarding_completado boolean not null default false;

comment on column public.usuario.onboarding_completado is
    'true cuando el usuario terminó el flujo inicial (eligió danzante). Reemplaza localStorage.flujoInicialCompletado. La ruta de emprendedor no lo activa.';

commit;


-- =============================================================================
-- Verificación (opcional, correr tras el commit)
-- =============================================================================
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'usuario'
-- order by ordinal_position;
--
-- Esperado: fila nueva -> onboarding_completado | boolean | NO | false
-- =============================================================================
