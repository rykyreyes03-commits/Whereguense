-- docs/migrations/041_solicitud_demo.sql
--
-- Solicitudes de demo: el formulario "Solicita una demo" de la Landing pública (sin cuenta) las crea; solo el administrador las lee
-- y las marca desde el Panel Admin.
--
--  1. public.solicitud_demo (id uuid, nombre, correo, organizacion, mensaje, created_at, leida, atendida) con CHECK de largos y
--     un índice por created_at DESC (lo más reciente primero).
--  2. Escribir: SOLO por crear_solicitud_demo(), SECURITY DEFINER, que valida antes de insertar. anon y authenticated NO tienen
--     INSERT directo en la tabla (si lo tuvieran, cualquiera se saltaría la validación y el límite de envíos). La función
--     la pueden ejecutar anon y authenticated.
--       - nombre: obligatorio, hasta 100 caracteres.  correo: formato nombre@dominio.ext, hasta 200.
--       - organizacion (opcional) hasta 150.  mensaje (opcional) hasta 1000.
--       - Freno contra abuso: el mismo correo no puede enviar otra solicitud en 5 minutos, y no se aceptan más de 30 solicitudes
--         en total en 10 minutos.
--       - Devuelve void; ante un dato inválido lanza una excepción con un mensaje claro en español (errcode 22023).
--  3. Leer y marcar: SOLO el administrador (usuario.rol = 'admin', la misma regla de cupon y actividad_negocio). authenticated
--     tiene SELECT y UPDATE únicamente de las columnas leida y atendida; las políticas exigen ser administrador.
--     (No existe una columna usuario.is_admin: el rol vive en usuario.rol.)
--  4. Deshacer: el bloque comentado del final.

-- -----------------------------------------------------------------------------
-- 1. Tabla
-- -----------------------------------------------------------------------------
create table public.solicitud_demo (
    id           uuid        primary key default gen_random_uuid(),
    nombre       text        not null,
    correo       text        not null,
    organizacion text,
    mensaje      text,
    created_at   timestamptz not null default now(),
    leida        boolean     not null default false,
    atendida     boolean     not null default false,
    constraint solicitud_demo_nombre_valido       check (char_length(btrim(nombre)) between 1 and 100),
    constraint solicitud_demo_correo_valido       check (char_length(correo) <= 200 and correo ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
    constraint solicitud_demo_organizacion_valida check (organizacion is null or char_length(organizacion) <= 150),
    constraint solicitud_demo_mensaje_valido      check (mensaje is null or char_length(mensaje) <= 1000)
);

comment on table public.solicitud_demo is
    'Solicitudes de demo del formulario de la Landing. Se crean solo con crear_solicitud_demo(); las lee y marca el administrador (041).';

create index solicitud_demo_created_at_desc on public.solicitud_demo (created_at desc);

-- -----------------------------------------------------------------------------
-- 2. RLS y permisos
-- -----------------------------------------------------------------------------
alter table public.solicitud_demo enable row level security;

revoke all on public.solicitud_demo from public, anon, authenticated;
grant select on public.solicitud_demo to authenticated;
grant update (leida, atendida) on public.solicitud_demo to authenticated;
grant all on public.solicitud_demo to service_role;

create policy solicitud_demo_select_admin on public.solicitud_demo
    for select to authenticated
    using (exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'admin'));

create policy solicitud_demo_update_admin on public.solicitud_demo
    for update to authenticated
    using (exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'admin'))
    with check (exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'admin'));

-- -----------------------------------------------------------------------------
-- 3. Función que valida y guarda
-- -----------------------------------------------------------------------------
create or replace function public.crear_solicitud_demo(
    p_nombre text,
    p_correo text,
    p_organizacion text default null,
    p_mensaje text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_nombre text := btrim(coalesce(p_nombre, ''));
    v_correo text := btrim(coalesce(p_correo, ''));
    v_organizacion text := nullif(btrim(coalesce(p_organizacion, '')), '');
    v_mensaje text := nullif(btrim(coalesce(p_mensaje, '')), '');
begin
    if v_nombre = '' then
        raise exception 'Escribe tu nombre.' using errcode = '22023';
    end if;
    if char_length(v_nombre) > 100 then
        raise exception 'El nombre puede tener hasta 100 caracteres.' using errcode = '22023';
    end if;
    if v_correo = '' then
        raise exception 'Escribe tu correo.' using errcode = '22023';
    end if;
    if char_length(v_correo) > 200 then
        raise exception 'El correo puede tener hasta 200 caracteres.' using errcode = '22023';
    end if;
    if v_correo !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
        raise exception 'Escribe un correo válido, por ejemplo nombre@correo.com.' using errcode = '22023';
    end if;
    if v_organizacion is not null and char_length(v_organizacion) > 150 then
        raise exception 'La organización puede tener hasta 150 caracteres.' using errcode = '22023';
    end if;
    if v_mensaje is not null and char_length(v_mensaje) > 1000 then
        raise exception 'El mensaje puede tener hasta 1000 caracteres.' using errcode = '22023';
    end if;

    -- Freno contra abuso (la función la puede llamar cualquiera, incluso sin cuenta)
    if exists (select 1 from public.solicitud_demo
               where lower(correo) = lower(v_correo) and created_at > now() - interval '5 minutes') then
        raise exception 'Ya recibimos tu solicitud. Te contactaremos pronto.' using errcode = '22023';
    end if;
    if (select count(*) from public.solicitud_demo where created_at > now() - interval '10 minutes') >= 30 then
        raise exception 'Estamos recibiendo muchas solicitudes. Intenta de nuevo en unos minutos.' using errcode = '22023';
    end if;

    insert into public.solicitud_demo (nombre, correo, organizacion, mensaje)
    values (v_nombre, v_correo, v_organizacion, v_mensaje);
end;
$$;

comment on function public.crear_solicitud_demo(text, text, text, text) is
    'Valida y guarda una solicitud de demo del formulario de la Landing (la puede llamar cualquiera). Lanza una excepción clara si algo está mal (041).';

revoke execute on function public.crear_solicitud_demo(text, text, text, text) from public;
grant execute on function public.crear_solicitud_demo(text, text, text, text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Deshacer esta migración (copiar y ejecutar a mano; borra también las solicitudes guardadas):
--
--   drop function if exists public.crear_solicitud_demo(text, text, text, text);
--   drop table if exists public.solicitud_demo;
-- -----------------------------------------------------------------------------
