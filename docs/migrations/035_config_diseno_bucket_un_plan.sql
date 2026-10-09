-- docs/migrations/035_config_diseno_bucket_un_plan.sql
--
-- Diseño único de la ficha del negocio. Tres cosas:
--
--  1. UN SOLO PLAN: se elimina el trigger negocio_validar_config_diseno (020), que impedía a un negocio 'basico' tocar
--     las claves de Profesional. Los negocios en 'basico' (hoy ninguno) pasan a 'profesional' y la columna
--     nivel_suscripcion se queda con default 'profesional' (la restricción de valores y admin_renovar_suscripcion no se tocan).
--  2. negocio.config_diseno con esquema cerrado, validado EN LA BASE (CHECK con config_diseno_valido):
--       paleta              uno de: azul_marino, terracota, azul, verde, rojo, dorado, teal, magenta
--       letra               clasica | elegante | moderna
--       portada_url         null, o https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/<usuario_id>/<archivo>
--                           (solo ese bucket y SOLO la carpeta del propio dueño; archivo = empieza con letra o número, luego letras, números, . _ -; opcional ?t=<números>)
--       whatsapp            null, o texto de solo dígitos, 8 a 15
--       secciones_visibles  arreglo (sin repetidos) con valores de: horarios, productos, fotos, actividades, resenas; el orden del arreglo
--                           es el orden en la ficha y lo que no aparece está oculto
--       layout_productos    cuadricula | lista
--     Cualquier otra clave se rechaza. Todas son opcionales: los negocios existentes siguen con '{}' y el frontend aplica los
--     valores por defecto; los negocios NUEVOS nacen con los defaults (paleta azul_marino, letra clasica, cuadricula, 5 secciones).
--     Quién lee y quién escribe no cambia: el dueño actualiza SOLO su fila (política negocio_update_duenio + UPDATE de columna);
--     la ficha pública la lee cualquiera que pueda ver el negocio (política de SELECT: activo y vigente, o el dueño, o admin).
--  3. Bucket 'negocios': 10 MB por archivo y solo image/jpeg, image/png, image/webp, aplicado por el servidor de Storage.

begin;

-- -----------------------------------------------------------------------------
-- 1. Un solo plan
-- -----------------------------------------------------------------------------
drop trigger if exists negocio_validar_config_diseno on public.negocio;
drop function if exists public.negocio_validar_config_diseno();

update public.negocio set nivel_suscripcion = 'profesional' where nivel_suscripcion <> 'profesional';
alter table public.negocio alter column nivel_suscripcion set default 'profesional';

comment on column public.negocio.nivel_suscripcion is
    'Siempre profesional: hay un solo plan (035). Se conserva la columna; solo la cambian funciones de admin.';

-- -----------------------------------------------------------------------------
-- 2. config_diseno
-- -----------------------------------------------------------------------------
create or replace function public.config_diseno_valido(cfg jsonb, dueno uuid)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
    k text;
    v jsonb;
    n int;
begin
    if cfg is null or jsonb_typeof(cfg) <> 'object' then
        return false;
    end if;

    for k, v in select * from jsonb_each(cfg) loop
        if k = 'paleta' then
            if jsonb_typeof(v) <> 'string'
               or not ((v #>> '{}') = any (array['azul_marino', 'terracota', 'azul', 'verde', 'rojo', 'dorado', 'teal', 'magenta'])) then
                return false;
            end if;
        elsif k = 'letra' then
            if jsonb_typeof(v) <> 'string' or not ((v #>> '{}') = any (array['clasica', 'elegante', 'moderna'])) then
                return false;
            end if;
        elsif k = 'layout_productos' then
            if jsonb_typeof(v) <> 'string' or not ((v #>> '{}') = any (array['cuadricula', 'lista'])) then
                return false;
            end if;
        elsif k = 'portada_url' then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' then return false; end if;
                if (v #>> '{}') !~ ('^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/negocios/'
                                    || dueno::text || '/[A-Za-z0-9][A-Za-z0-9._-]*(\?t=[0-9]+)?$') then
                    return false;
                end if;
            end if;
        elsif k = 'whatsapp' then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[0-9]{8,15}$' then return false; end if;
            end if;
        elsif k = 'secciones_visibles' then
            if jsonb_typeof(v) <> 'array' then return false; end if;
            n := jsonb_array_length(v);
            if n > 5 then return false; end if;
            if exists (
                select 1 from jsonb_array_elements(v) e
                where jsonb_typeof(e) <> 'string'
                   or not ((e #>> '{}') = any (array['horarios', 'productos', 'fotos', 'actividades', 'resenas']))
            ) then
                return false;
            end if;
            if (select count(distinct e #>> '{}') from jsonb_array_elements(v) e) <> n then
                return false;
            end if;
        else
            return false;   -- ninguna otra clave
        end if;
    end loop;

    return true;
end;
$$;

-- La restricción CHECK se evalúa con los permisos de quien escribe: el dueño (authenticated) necesita EXECUTE.
-- Es pura (solo mira el JSON y el uuid que recibe), no toca tablas.
revoke execute on function public.config_diseno_valido(jsonb, uuid) from public, anon;
grant execute on function public.config_diseno_valido(jsonb, uuid) to authenticated, service_role;

comment on function public.config_diseno_valido(jsonb, uuid) is
    'Esquema cerrado de negocio.config_diseno (035). La usa la restricción CHECK negocio_config_diseno_valido.';

alter table public.negocio
    add constraint negocio_config_diseno_valido
    check (public.config_diseno_valido(config_diseno, usuario_id));

alter table public.negocio alter column config_diseno set default
    '{"paleta":"azul_marino","letra":"clasica","layout_productos":"cuadricula","secciones_visibles":["horarios","productos","fotos","actividades","resenas"]}'::jsonb;

-- -----------------------------------------------------------------------------
-- 3. Bucket 'negocios'
-- -----------------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'negocios';

commit;
