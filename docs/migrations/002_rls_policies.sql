-- =============================================================================
-- Wheregüense — Migración 002: Row Level Security (RLS) y políticas de acceso
-- =============================================================================
-- Depende de: 001_schema_inicial.sql (las 21 tablas ya creadas).
-- Motor: PostgreSQL 15 (Supabase).
--
-- ⚠️ IMPORTANTE: 001 NO habilitó RLS (lo dejó explícitamente para esta migración).
--    Hasta que se aplique 002, las 21 tablas están SIN protección para las claves
--    anon/authenticated. Aplicar 002 cuanto antes tras 001.
--
-- Convención de roles de Supabase:
--   - anon           -> visitante sin sesión
--   - authenticated  -> usuario con sesión (auth.uid() devuelve su uuid)
--   - service_role   -> ignora RLS por completo (seed, tareas de servidor, panel
--                       interno). No necesita políticas.
--
-- Modelo aplicado:
--   2. Catálogos            -> lectura pública, escritura solo service_role
--   5. evento               -> lectura pública, escritura solo service_role
--   3. Tablas "solo dueño"  -> el usuario ve/edita únicamente sus filas
--   4. negocio + hijas      -> dueño CRUD total; el resto (con sesión) solo LEE
--                              los negocios en estado 'activo'
--   6. rol 'admin'          -> NO implementado todavía (ver nota final).
--
-- Idempotente: cada política se hace "drop ... if exists" antes de crearse.
-- =============================================================================

begin;


-- -----------------------------------------------------------------------------
-- 0. Funciones auxiliares para las políticas de negocio
-- -----------------------------------------------------------------------------
-- Se usan dentro de las políticas de las tablas hijas (negocio_foto, etc.), que
-- guardan negocio_id pero no usuario_id. security definer + search_path fijo es
-- el patrón recomendado por Supabase para evitar recursión de RLS al consultar
-- otra tabla que también tiene RLS.

-- ¿El usuario con sesión es el dueño de ese negocio?
create or replace function public.es_duenio_negocio(p_negocio_id integer)
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
          and n.usuario_id = auth.uid()
    );
$$;

comment on function public.es_duenio_negocio(integer) is
    'true si auth.uid() es el usuario_id del negocio indicado. Para políticas de tablas hijas.';

-- ¿Ese negocio es visible para el usuario con sesión? (dueño, o negocio activo)
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
          and (n.usuario_id = auth.uid() or n.estado = 'activo')
    );
$$;

comment on function public.negocio_visible(integer) is
    'true si el negocio está activo o si auth.uid() es su dueño. Para lectura de tablas hijas.';

grant execute on function public.es_duenio_negocio(integer) to anon, authenticated;
grant execute on function public.negocio_visible(integer)   to anon, authenticated;


-- =============================================================================
-- 1. Habilitar RLS en las 21 tablas
-- =============================================================================
-- Idempotente: "enable row level security" no falla si ya estaba habilitado.
-- Con RLS habilitado y SIN políticas, una tabla queda en "deny all" para
-- anon/authenticated (service_role sigue pasando). Las políticas se definen abajo.

alter table public.usuario             enable row level security;
alter table public.nivel               enable row level security;
alter table public.rango               enable row level security;
alter table public.ruta                enable row level security;
alter table public.insignia            enable row level security;
alter table public.categoria_avatar    enable row level security;
alter table public.sitio               enable row level security;
alter table public.pieza_avatar        enable row level security;
alter table public.ruta_sitio          enable row level security;
alter table public.ruta_guardada       enable row level security;
alter table public.negocio             enable row level security;
alter table public.evento              enable row level security;
alter table public.pieza_desbloqueada  enable row level security;
alter table public.avatar_equipado     enable row level security;
alter table public.usuario_hito        enable row level security;
alter table public.qr_sello            enable row level security;
alter table public.negocio_foto        enable row level security;
alter table public.negocio_horario     enable row level security;
alter table public.producto            enable row level security;
alter table public.hito_candidato      enable row level security;
alter table public.sello               enable row level security;


-- =============================================================================
-- 2. Catálogos — LECTURA PÚBLICA (anon + authenticated), escritura solo service_role
-- =============================================================================
-- Datos de referencia globales: cualquiera puede leerlos aunque no tenga sesión
-- (necesarios para pintar el mapa, la lista de rutas y el creador de avatar
-- antes de iniciar sesión). No se crea ninguna política de INSERT/UPDATE/DELETE:
-- así solo service_role (seed 003, panel interno) puede modificarlos.

-- sitio: puntos culturales del mapa
drop policy if exists sitio_select_public on public.sitio;
create policy sitio_select_public on public.sitio
    for select to anon, authenticated
    using (true);

-- insignia: catálogo de insignias por sitio
drop policy if exists insignia_select_public on public.insignia;
create policy insignia_select_public on public.insignia
    for select to anon, authenticated
    using (true);

-- nivel: curva de niveles 1..40
drop policy if exists nivel_select_public on public.nivel;
create policy nivel_select_public on public.nivel
    for select to anon, authenticated
    using (true);

-- rango: los 3 escalones nombrados
drop policy if exists rango_select_public on public.rango;
create policy rango_select_public on public.rango
    for select to anon, authenticated
    using (true);

-- categoria_avatar: los 4 slots de personalización
drop policy if exists categoria_avatar_select_public on public.categoria_avatar;
create policy categoria_avatar_select_public on public.categoria_avatar
    for select to anon, authenticated
    using (true);

-- pieza_avatar: catálogo de piezas de avatar
drop policy if exists pieza_avatar_select_public on public.pieza_avatar;
create policy pieza_avatar_select_public on public.pieza_avatar
    for select to anon, authenticated
    using (true);

-- ruta: rutas turísticas
drop policy if exists ruta_select_public on public.ruta;
create policy ruta_select_public on public.ruta
    for select to anon, authenticated
    using (true);

-- ruta_sitio: composición de cada ruta
drop policy if exists ruta_sitio_select_public on public.ruta_sitio;
create policy ruta_sitio_select_public on public.ruta_sitio
    for select to anon, authenticated
    using (true);


-- =============================================================================
-- 5. evento — LECTURA PÚBLICA (son anuncios abiertos a todos)
-- =============================================================================
-- Mismo trato que un catálogo: lo ve cualquiera. La creación/edición de eventos
-- queda para service_role (o para el rol admin cuando se defina).
drop policy if exists evento_select_public on public.evento;
create policy evento_select_public on public.evento
    for select to anon, authenticated
    using (true);


-- =============================================================================
-- 3. Tablas "SOLO EL DUEÑO" — el usuario ve y edita únicamente sus propias filas
-- =============================================================================
-- Una única política "for all": using (SELECT/UPDATE/DELETE) y with check
-- (INSERT/UPDATE) comparan auth.uid() contra la columna de propiedad.
-- Requieren sesión (to authenticated); anon no ve ni escribe nada.

-- usuario: la columna de propiedad es "id" (= auth.users.id), no "usuario_id".
-- Permite al usuario leer y actualizar su propio perfil, y crear su fila tras el
-- alta si la app lo hace desde el cliente. No puede tocar filas de otros.
drop policy if exists usuario_all_owner on public.usuario;
create policy usuario_all_owner on public.usuario
    for all to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- sello: los sellos del usuario. Solo él los ve y solo él puede sellar para sí.
drop policy if exists sello_all_owner on public.sello;
create policy sello_all_owner on public.sello
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

-- ruta_guardada: rutas favoritas del usuario. Privadas.
drop policy if exists ruta_guardada_all_owner on public.ruta_guardada;
create policy ruta_guardada_all_owner on public.ruta_guardada
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

-- pieza_desbloqueada: qué piezas de avatar posee el usuario. Privado.
drop policy if exists pieza_desbloqueada_all_owner on public.pieza_desbloqueada;
create policy pieza_desbloqueada_all_owner on public.pieza_desbloqueada
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

-- avatar_equipado: qué lleva puesto el usuario por categoría. Privado.
drop policy if exists avatar_equipado_all_owner on public.avatar_equipado;
create policy avatar_equipado_all_owner on public.avatar_equipado
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

-- usuario_hito: los hitos de desbloqueo alcanzados y su resolución. Privado.
drop policy if exists usuario_hito_all_owner on public.usuario_hito;
create policy usuario_hito_all_owner on public.usuario_hito
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

-- hito_candidato: las 3 piezas candidatas ofrecidas en cada hito del usuario.
-- Privado. (Hoy la app las genera desde el cliente; si más adelante se mueve a
-- una función del servidor, esta política se puede endurecer a solo lectura.)
drop policy if exists hito_candidato_all_owner on public.hito_candidato;
create policy hito_candidato_all_owner on public.hito_candidato
    for all to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);


-- =============================================================================
-- 4. negocio — dueño CRUD total; el resto (con sesión) solo LEE los activos
-- =============================================================================

-- LECTURA: el dueño ve su negocio en cualquier estado; cualquiera (incluido el
-- visitante sin sesión) ve los negocios 'activo', igual que ve sitio/insignia/
-- ruta/evento, para el mapa y el perfil público del negocio.
-- Los 'pendiente' / 'rechazado' quedan ocultos a todos menos al dueño.
drop policy if exists negocio_select_activo_o_duenio on public.negocio;
create policy negocio_select_activo_o_duenio on public.negocio
    for select to anon, authenticated
    using (auth.uid() = usuario_id or estado = 'activo');

-- ALTA: un usuario solo puede registrar un negocio a su propio nombre.
drop policy if exists negocio_insert_duenio on public.negocio;
create policy negocio_insert_duenio on public.negocio
    for insert to authenticated
    with check (auth.uid() = usuario_id);

-- EDICIÓN: solo el dueño edita su negocio.
-- NOTA: por ahora esto permite que el dueño cambie él mismo la columna "estado"
-- (coherente con el flujo mock actual de "simular aprobar/rechazar"). Cuando
-- exista aprobación real por admin, habrá que impedir que el dueño escriba
-- "estado" (trigger o columna gestionada aparte). Ver nota final.
drop policy if exists negocio_update_duenio on public.negocio;
create policy negocio_update_duenio on public.negocio
    for update to authenticated
    using (auth.uid() = usuario_id)
    with check (auth.uid() = usuario_id);

-- BORRADO: solo el dueño elimina su negocio.
drop policy if exists negocio_delete_duenio on public.negocio;
create policy negocio_delete_duenio on public.negocio
    for delete to authenticated
    using (auth.uid() = usuario_id);


-- =============================================================================
-- 4 (cont.) — Tablas hijas de negocio: negocio_foto, negocio_horario, producto, qr_sello
-- =============================================================================
-- Dos políticas por tabla (se combinan con OR):
--   *_all_owner       -> el dueño del negocio hace CRUD completo.
--   *_select_visible  -> lectura si el negocio es visible (activo o propio),
--                        abierta también a anon (visitante sin sesión).
-- Resultado: leer si el negocio está activo o es tuyo; escribir solo si es tuyo.

-- --- negocio_foto ---
drop policy if exists negocio_foto_all_owner on public.negocio_foto;
create policy negocio_foto_all_owner on public.negocio_foto
    for all to authenticated
    using (public.es_duenio_negocio(negocio_id))
    with check (public.es_duenio_negocio(negocio_id));

drop policy if exists negocio_foto_select_visible on public.negocio_foto;
create policy negocio_foto_select_visible on public.negocio_foto
    for select to anon, authenticated
    using (public.negocio_visible(negocio_id));

-- --- negocio_horario ---
drop policy if exists negocio_horario_all_owner on public.negocio_horario;
create policy negocio_horario_all_owner on public.negocio_horario
    for all to authenticated
    using (public.es_duenio_negocio(negocio_id))
    with check (public.es_duenio_negocio(negocio_id));

drop policy if exists negocio_horario_select_visible on public.negocio_horario;
create policy negocio_horario_select_visible on public.negocio_horario
    for select to anon, authenticated
    using (public.negocio_visible(negocio_id));

-- --- producto ---
drop policy if exists producto_all_owner on public.producto;
create policy producto_all_owner on public.producto
    for all to authenticated
    using (public.es_duenio_negocio(negocio_id))
    with check (public.es_duenio_negocio(negocio_id));

drop policy if exists producto_select_visible on public.producto;
create policy producto_select_visible on public.producto
    for select to anon, authenticated
    using (public.negocio_visible(negocio_id));

-- --- qr_sello ---
-- NOTA: el flujo de escaneo de QR aún no está conectado. Cuando se implemente,
-- puede que convenga restringir más la lectura (el token es sensible) o exponerla
-- por una función server-side específica. Por ahora sigue la regla general.
drop policy if exists qr_sello_all_owner on public.qr_sello;
create policy qr_sello_all_owner on public.qr_sello
    for all to authenticated
    using (public.es_duenio_negocio(negocio_id))
    with check (public.es_duenio_negocio(negocio_id));

drop policy if exists qr_sello_select_visible on public.qr_sello;
create policy qr_sello_select_visible on public.qr_sello
    for select to anon, authenticated
    using (public.negocio_visible(negocio_id));


commit;


-- =============================================================================
-- Notas / preguntas abiertas
-- =============================================================================
-- ROL 'admin' (pendiente, decisión 6):
--   No se implementó ninguna política especial para rol = 'admin'. Cuando se
--   defina cómo funciona la autenticación real (email OTP) y quién aprueba
--   negocios, habrá que:
--     - Añadir a las políticas de negocio (y quizá evento / catálogos) una
--       condición del tipo:  or exists (select 1 from public.usuario u
--                                       where u.id = auth.uid() and u.rol = 'admin')
--       preferiblemente encapsulada en una función public.es_admin().
--     - Impedir que el dueño escriba negocio.estado directamente (hoy sí puede).
--     - Revisar si admin necesita ver negocios 'pendiente'/'rechazado' de todos.
--
-- LECTURA POR VISITANTES SIN SESIÓN (anon):
--   Los negocios 'activo' y sus fotos/horarios/productos/qr_sello son legibles
--   por anon (visitante sin sesión), igual que sitio/insignia/ruta/evento, para
--   soportar el flujo "iniciar como invitado". La escritura sigue exigiendo ser
--   el dueño (authenticated). Los estados 'pendiente'/'rechazado' siguen ocultos.
--
-- INSERCIÓN DEL PERFIL 'usuario':
--   La política usuario_all_owner permite crear la fila desde el cliente tras el
--   alta. Alternativa más robusta: un trigger AFTER INSERT en auth.users que
--   inserte el perfil (corre como definer y no depende de RLS). Decidir al
--   montar el alta real.
-- =============================================================================
