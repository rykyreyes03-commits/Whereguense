# Diagrama de seguridad

RLS por tabla, roles de Postgres (`anon`, `authenticated`, `service_role`), funciones `SECURITY DEFINER` y el trigger
`usuario_proteger_rol`. Imágenes: [`diagrama_seguridad.png`](diagrama_seguridad.png) y
[`diagrama_seguridad_2.png`](diagrama_seguridad_2.png).

## 1. Roles y RLS por tabla

```mermaid
flowchart LR
  subgraph ROLES["Roles de Postgres"]
    ANON(["anon<br/>sin sesión"])
    AUTH(["authenticated<br/>con sesión + 2FA"])
    SRV(["service_role<br/>solo scripts / Supabase"])
  end

  subgraph PUB["Lectura pública (SELECT)"]
    T1["sitio · insignia · ruta · ruta_sitio<br/>evento · sitio_foto<br/>categoria_avatar · pieza_avatar · nivel · rango"]
    T2["negocio · negocio_foto · negocio_horario<br/>producto · qr_sello (sin token)<br/>solo si el negocio está activo y vigente"]
  end

  subgraph PROP["Solo lo propio (auth.uid() = usuario_id)"]
    T3["usuario · guardado · ruta_guardada<br/>pieza_desbloqueada · avatar_equipado<br/>usuario_hito · hito_candidato (todo)"]
    T4["sello · cupon_obtenido (solo lectura)"]
    T5["accesorio_avatar<br/>solo los de su nivel o menor"]
  end

  subgraph DUE["Dueño del negocio"]
    T6["negocio: insert/update solo columnas seguras<br/>(nunca estado, suscripción ni plan)"]
    T7["negocio_foto · negocio_horario · producto<br/>qr_sello · actividad_negocio · cupon"]
  end

  subgraph CER["Cerradas a la API (sin acceso directo)"]
    T8["resena · resena_sitio<br/>negocio_token_canje<br/>tokens: qr_sello.token · cupon.token"]
  end

  subgraph SOLOSRV["Escritura solo con service_role"]
    T9["sitio · insignia · sitio_foto<br/>accesorio_avatar · bucket sitios"]
  end

  ADM(["Administrador<br/>rol = admin (una sola cuenta)"])

  ANON --> T1
  ANON --> T2
  AUTH --> T1
  AUTH --> T2
  AUTH --> T3
  AUTH --> T4
  AUTH --> T5
  AUTH --> T6
  AUTH --> T7
  AUTH -->|"solo por funciones"| T8
  ANON -.->|"solo lectura por funciones"| T8
  SRV --> T9
  SRV -->|"bypass de RLS"| T3
  ADM -->|"lee negocio y actividades<br/>vía funciones admin_*"| T6
  ADM --> T7
```

## 2. Funciones SECURITY DEFINER y trigger de rol

```mermaid
flowchart TD
  subgraph DEF["Funciones SECURITY DEFINER (corren con permisos del dueño de la función)"]
    F1["Turista: sellar_por_geolocalizacion · canjear_qr_sello<br/>calcular_nivel · obtener_cupon · usar_cupon<br/>guardar_resena · guardar_resena_sitio"]
    F2["Públicas (anon): resenas_publicas · resumen_resenas<br/>resenas_sitio_publicas · resumen_resenas_sitio<br/>actividades_negocio_publicas"]
    F3["Dueño: mis_actividades_qr · eliminar_actividad<br/>crear_evento_desde_actividad · responder_resena<br/>mis_cupones_negocio · eliminar_cupon"]
    F4["Admin: admin_aprobar_negocio · admin_rechazar_negocio<br/>admin_aprobar_sello · admin_rechazar_sello<br/>admin_renovar_suscripcion · admin_borrar_resena"]
    F5["Internas (sin EXECUTE para la API)<br/>autor_visible · fin_de_actividad · nivel_por_puntos"]
  end

  DEF --> CHK["Cada una revisa por dentro:<br/>sesión (auth.uid) · propiedad del recurso<br/>rol admin · reglas de negocio"]
  CHK -->|"search_path vacío"| OK["Acceso a tablas cerradas<br/>sin exponer tokens, usuario_id ni correos"]

  subgraph TRG["Trigger usuario_proteger_rol (BEFORE INSERT/UPDATE en usuario)"]
    X0{"¿current_user es<br/>anon o authenticated?"}
    X0 -->|"No (service_role / postgres)"| X5["Se permite todo<br/>(así se fijó el único admin)"]
    X0 -->|"Sí"| X1{"¿INSERT?"}
    X1 -->|"Sí"| X2{"¿rol distinto<br/>de turista?"}
    X2 -->|"Sí"| X3["Error 42501<br/>No puedes elegir tu rol."]
    X2 -->|"No"| X6["Fila creada como turista"]
    X1 -->|"No: UPDATE"| X4{"¿cambia el rol?"}
    X4 -->|"Sí"| X7["Error 42501<br/>No puedes cambiar tu rol."]
    X4 -->|"No"| X8["Actualización permitida"]
  end

  X3 -.-> NOTA["Evita que alguien se vuelva admin<br/>con un UPDATE sobre su propia fila"]
  X7 -.-> NOTA
```
