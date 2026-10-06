-- docs/migrations/035b_config_diseno_logo.sql
--
-- config_diseno gana la clave logo_url (logo del negocio desde el editor de diseño). Misma validación que portada_url:
-- null, o https://spybqychnydgvidwjrlh.supabase.co/storage/v1/object/public/negocios/<usuario_id>/<archivo>[?t=<números>],
-- SOLO en la carpeta del propio dueño. Solo se redefine la función config_diseno_valido (la restricción CHECK de la 035
-- ya la llama; no cambia nada más: ni permisos, ni datos, ni el bucket). El logo "viejo" (columna negocio.logo_url, que usan
-- el mapa y los eventos) sigue igual y la ficha lo usa si el diseño no trae logo_url.

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

commit;
