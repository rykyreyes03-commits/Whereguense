-- docs/migrations/038_niveles_rangos_sellos.sql
--
-- Sistema de niveles por puntos y rangos de sellos (cobre, plata, oro) + accesorios del avatar por nivel.
--
-- Reglas (acordadas):
--  1. Cada SITIO tiene un rango: cobre (vale 1 punto), plata (0.5) u oro (2). Los sellos por QR de negocio valen 1 (cobre).
--  2. Para subir del nivel N al N+1 hacen falta N*2 puntos. Puntos acumulados para llegar al nivel N = N*(N-1)
--     (nivel 1: 0, nivel 2: 2, nivel 3: 6, nivel 4: 12, nivel 5: 20, ...). Los puntos se acumulan entre rangos.
--  3. Clasificación inicial de los 60 sitios:
--       ORO   : los de la Ruta Dariana (ruta_sitio) y Catedral (1) y Ruinas de León Viejo (2).
--       PLATA : museos nombrados (Museo de la Revolución 6, Casa Museo Rubén Darío 11, Centro Cultural y Museo Rigoberto López
--               Pérez 46, Museo de Leyendas 47, Centro de Arte Fundación Ortiz-Gurdián 49), Universidad Nacional de Nicaragua
--               León (8) y Fortaleza de la Inmaculada Concepción (10).
--       COBRE : todos los demás.
--     Los ids 6, 8 y 10 están en la Ruta Dariana Y en la lista de plata: gana lo más específico (plata). Cambiar un rango es un
--     UPDATE de sitio.rango (solo service_role/postgres; la RLS de sitio no deja escribir a nadie más).
--  4. accesorio_avatar (id, nombre, imagen_url, nivel_requerido): cada usuario ve los de su nivel o menor. Niveles de
--     desbloqueo: 5, 10, 20, 30, 40, 50... Se siembran los 4 accesorios gratis de siempre (Sombrero de Palma 5, Bufanda
--     Dariana 10, Máscara del Güegüense 20, Corona de Maestro 30); imagen_url queda vacía hasta que haya imágenes.
--
-- Funciones:
--   nivel_por_puntos(numeric)       interna y pura: nivel, puntos dentro del nivel, puntos para subir, porcentaje.
--   calcular_nivel(uuid)            suma los puntos de los sellos del usuario. Solo para uno mismo (o el admin).
--   accesorios_desbloqueados(uuid)  accesorios a los que el usuario tiene acceso. Mismo control.
--   valor_sello(rango_sello)        1 / 0.5 / 2.
-- La tabla `nivel` (umbrales por cantidad de sellos) queda sin uso; no se borra.

begin;

-- -----------------------------------------------------------------------------
-- 1. Rango de cada sitio
-- -----------------------------------------------------------------------------
create type public.rango_sello as enum ('cobre', 'plata', 'oro');

alter table public.sitio
    add column rango public.rango_sello not null default 'cobre';

comment on column public.sitio.rango is
    'Rango del sello del sitio: cobre vale 1 punto, plata 0.5, oro 2 (038).';

-- 3. Clasificación: oro = Ruta Dariana + Catedral + León Viejo; luego plata (gana en los ids que están en ambos)
update public.sitio
   set rango = 'oro'
 where id in (select rs.sitio_id from public.ruta_sitio rs join public.ruta r on r.id = rs.ruta_id where r.nombre = 'Ruta Dariana')
    or id in (1, 2);

update public.sitio
   set rango = 'plata'
 where id in (6, 8, 10, 11, 46, 47, 49);

create or replace function public.valor_sello(p_rango public.rango_sello)
returns numeric
language sql
immutable
set search_path = ''
as $$
    select case p_rango when 'oro' then 2::numeric when 'plata' then 0.5::numeric else 1::numeric end;
$$;

comment on function public.valor_sello(public.rango_sello) is
    'Puntos de un sello según su rango: cobre 1, plata 0.5, oro 2 (038).';

grant execute on function public.valor_sello(public.rango_sello) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. Niveles
-- -----------------------------------------------------------------------------
-- Interna y pura. Para llegar al nivel N hacen falta N*(N-1) puntos; de ahí a N+1, N*2 más.
create or replace function public.nivel_por_puntos(p_puntos numeric)
returns table (
    nivel_actual          integer,
    puntos_actuales       numeric,
    puntos_para_siguiente integer,
    porcentaje            integer,
    puntos_totales        numeric
)
language plpgsql
immutable
set search_path = ''
as $$
declare
    p numeric := greatest(coalesce(p_puntos, 0), 0);
    n integer := floor((1 + sqrt(1 + 4 * p)) / 2)::integer;
begin
    -- corrige cualquier redondeo de la raíz
    while (n + 1) * n <= p loop n := n + 1; end loop;
    while n > 1 and n * (n - 1) > p loop n := n - 1; end loop;

    nivel_actual := n;
    puntos_totales := p;
    puntos_actuales := p - n * (n - 1);
    puntos_para_siguiente := n * 2;
    porcentaje := least(100, greatest(0, floor(puntos_actuales / (n * 2) * 100)))::integer;
    return next;
end;
$$;

revoke execute on function public.nivel_por_puntos(numeric) from public, anon, authenticated;
grant execute on function public.nivel_por_puntos(numeric) to service_role;

comment on function public.nivel_por_puntos(numeric) is
    'Interna. Nivel, puntos dentro del nivel, puntos para subir (N*2) y porcentaje 0-100 de unos puntos totales (038).';

create or replace function public.calcular_nivel(p_usuario_id uuid)
returns table (
    nivel_actual          integer,
    puntos_actuales       numeric,
    puntos_para_siguiente integer,
    porcentaje            integer,
    puntos_totales        numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    total numeric;
begin
    if p_usuario_id is null then
        return;
    end if;
    -- Con sesión: solo el propio usuario o un admin. Sin sesión (service_role, mantenimiento) se permite.
    if auth.uid() is not null
       and p_usuario_id <> auth.uid()
       and not exists (select 1 from public.usuario u where u.id = auth.uid() and u.rol = 'admin') then
        return;
    end if;

    -- sello por QR de negocio (sitio_id nulo) vale 1; sello de sitio vale según el rango del sitio
    select coalesce(sum(case when s.sitio_id is null then 1::numeric else public.valor_sello(si.rango) end), 0)
      into total
      from public.sello s
      left join public.sitio si on si.id = s.sitio_id
     where s.usuario_id = p_usuario_id;

    return query select * from public.nivel_por_puntos(total);
end;
$$;

revoke execute on function public.calcular_nivel(uuid) from public, anon;
grant execute on function public.calcular_nivel(uuid) to authenticated, service_role;

comment on function public.calcular_nivel(uuid) is
    'Nivel de un usuario por los puntos de sus sellos (cobre 1, plata 0.5, oro 2; QR de negocio 1). Para subir de N a N+1: N*2 puntos. Solo el propio usuario o un admin (038).';

-- -----------------------------------------------------------------------------
-- 4. Accesorios del avatar
-- -----------------------------------------------------------------------------
create table public.accesorio_avatar (
    id              serial primary key,
    nombre          text    not null unique,
    imagen_url      text,
    nivel_requerido integer not null,
    constraint accesorio_avatar_nivel_valido check (nivel_requerido >= 1)
);

comment on table public.accesorio_avatar is
    'Accesorios del avatar que se desbloquean por nivel (5, 10, 20, 30, 40, 50...). Cada usuario ve los de su nivel o menor. Solo service_role escribe (038).';

insert into public.accesorio_avatar (nombre, nivel_requerido) values
    ('Sombrero de Palma', 5),
    ('Bufanda Dariana', 10),
    ('Máscara del Güegüense', 20),
    ('Corona de Maestro', 30);

alter table public.accesorio_avatar enable row level security;

create policy accesorio_avatar_hasta_mi_nivel on public.accesorio_avatar
    for select to authenticated
    using (nivel_requerido <= coalesce((select c.nivel_actual from public.calcular_nivel(auth.uid()) c), 1));

revoke all on public.accesorio_avatar from anon, authenticated;
grant select on public.accesorio_avatar to authenticated;
grant all on public.accesorio_avatar to service_role;
grant usage, select on sequence public.accesorio_avatar_id_seq to service_role;

create or replace function public.accesorios_desbloqueados(p_usuario_id uuid)
returns table (
    id              integer,
    nombre          text,
    imagen_url      text,
    nivel_requerido integer
)
language sql
stable
security definer
set search_path = ''
as $$
    -- calcular_nivel ya aplica el control de acceso (uno mismo o admin): si no devuelve fila, no hay accesorios
    select a.id, a.nombre, a.imagen_url, a.nivel_requerido
      from public.accesorio_avatar a
      join public.calcular_nivel(p_usuario_id) c on a.nivel_requerido <= c.nivel_actual
     order by a.nivel_requerido, a.id;
$$;

revoke execute on function public.accesorios_desbloqueados(uuid) from public, anon;
grant execute on function public.accesorios_desbloqueados(uuid) to authenticated, service_role;

comment on function public.accesorios_desbloqueados(uuid) is
    'Accesorios a los que el usuario tiene acceso por su nivel. Solo el propio usuario o un admin (038).';

commit;
