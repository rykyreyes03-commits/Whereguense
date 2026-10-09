-- docs/migrations/035c_config_diseno_ubicacion.sql
--
-- La lista de secciones posibles de la ficha (config_diseno.secciones_visibles) gana 'ubicacion' (sección "Cómo llegar":
-- mini-mapa con las coordenadas del negocio): horarios, productos, fotos, actividades, resenas, ubicacion. Máximo 6 elementos, sin repetidos.
-- Se aplica como migración nueva porque la 035b ya estaba aplicada; solo se redefine config_diseno_valido (la restricción CHECK de la 035
-- ya la llama) y se actualiza el default de la columna para que los negocios NUEVOS nazcan con las seis secciones. Los negocios que ya
-- guardaron un diseño conservan su lista (la ubicación les aparece como sección oculta en el editor); los que siguen en {} usan los
-- valores por defecto del frontend, que ya incluyen la ubicación. Las coordenadas (negocio.latitud / longitud) ya existen y las lee quien
-- puede ver el negocio, igual que el mapa: no cambian permisos ni datos.

begin;

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
        elsif k in ('portada_url', 'logo_url') then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' then return false; end if;
                if (v #>> '{}') !~ ('^https://spybqychnydgvidwjrlh\.supabase\.co/storage/v1/object/public/negocios/'
                                    || dueno::text || '/[A-Za-z0-9][A-Za-z0-9._-]*(\?t=[0-9]+)?$') then
                    return false;
                end if;
            end if;
        elsif k = 'descripcion' then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') > 300 then return false; end if;
            end if;
        elsif k = 'whatsapp' then
            if jsonb_typeof(v) <> 'null' then
                if jsonb_typeof(v) <> 'string' or (v #>> '{}') !~ '^[0-9]{8,15}$' then return false; end if;
            end if;
        elsif k = 'secciones_visibles' then
            if jsonb_typeof(v) <> 'array' then return false; end if;
            n := jsonb_array_length(v);
            if n > 6 then return false; end if;
            if exists (
                select 1 from jsonb_array_elements(v) e
                where jsonb_typeof(e) <> 'string'
                   or not ((e #>> '{}') = any (array['horarios', 'productos', 'fotos', 'actividades', 'resenas', 'ubicacion']))
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

alter table public.negocio alter column config_diseno set default
    '{"paleta":"azul_marino","letra":"clasica","layout_productos":"cuadricula","secciones_visibles":["horarios","productos","fotos","actividades","resenas","ubicacion"]}'::jsonb;

commit;
