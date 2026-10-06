# Diagramas técnicos — Wheregüense

Vigente a la migración **033** (2026-10). Generado a partir del esquema real de Supabase (27 tablas
en `public`) y del código. GitHub dibuja los bloques `mermaid` directamente.

Los diagramas anteriores ([`diagrama_bd_v2.md`](diagrama_bd_v2.md), [`diagrama_bd_v3.md`](diagrama_bd_v3.md))
quedan como historia del diseño.

Contenido: 1. Entidad-Relación · 2. Clases · 3. Casos de uso · 4. Flujos (actividad → sello → canje,
cupón, reseña, "lo terminado desaparece").

---

## 1. Diagrama Entidad-Relación

`usuario.id` es también la clave de `auth.users` (Supabase Auth). Las columnas marcadas **(cerrada)**
no se pueden leer ni escribir directo desde la API: pasan por funciones `SECURITY DEFINER`.

```mermaid
erDiagram
    usuario ||--o{ negocio : "es dueño de"
    usuario ||--o{ sello : "obtiene"
    usuario ||--o{ guardado : "guarda"
    usuario ||--o{ ruta_guardada : "guarda"
    usuario ||--o{ cupon_obtenido : "obtiene"
    usuario ||--o{ resena : "escribe"
    usuario ||--o{ avatar_equipado : "equipa"
    usuario ||--o{ pieza_desbloqueada : "desbloquea"
    usuario ||--o{ usuario_hito : "alcanza"

    negocio ||--o{ negocio_foto : "tiene"
    negocio ||--o{ negocio_horario : "tiene"
    negocio ||--o{ producto : "ofrece"
    negocio ||--o{ actividad_negocio : "publica"
    negocio ||--o{ qr_sello : "emite"
    negocio ||--o{ cupon : "ofrece"
    negocio ||--o| negocio_token_canje : "tiene un token de canje"
    negocio ||--o{ resena : "recibe"
    negocio |o--o{ evento : "organiza"

    actividad_negocio |o--o| qr_sello : "solicita y recibe"
    actividad_negocio |o--o| evento : "se publica como"
    qr_sello ||--o{ sello : "se canjea en"
    sitio ||--o{ sello : "se sella en"
    sitio ||--o{ ruta_sitio : "forma parte de"
    ruta ||--o{ ruta_sitio : "incluye"
    ruta ||--o{ ruta_guardada : "es guardada"
    sitio }o--|| insignia : "otorga"
    sitio |o--o{ evento : "se relaciona con"

    cupon ||--o{ cupon_obtenido : "se obtiene como"

    categoria_avatar ||--o{ pieza_avatar : "agrupa"
    categoria_avatar ||--o{ avatar_equipado : "ranura"
    pieza_avatar |o--o{ avatar_equipado : "equipada en"
    pieza_avatar ||--o{ pieza_desbloqueada : "desbloqueada como"
    pieza_avatar ||--o{ hito_candidato : "ofrecida en"
    usuario_hito ||--o{ hito_candidato : "ofrece"

    usuario {
        uuid id PK "= auth.users.id"
        text nombre_usuario
        text email
        text rol "turista | admin | auditor"
        text pais
        text idioma_preferido
        text avatar_personaje "cabezon | gigantona"
        text foto_perfil_url
        timestamptz fecha_registro
        boolean onboarding_completado
    }

    negocio {
        int id PK
        uuid usuario_id FK "dueño"
        text nombre_negocio
        text categoria
        text responsable
        text cedula_ruc
        text telefono
        double latitud
        double longitud
        text descripcion
        text logo_url
        text estado "pendiente | activo | rechazado"
        text motivo_rechazo
        timestamptz fecha_envio
        timestamptz fecha_aprobacion
        timestamptz fecha_vencimiento_suscripcion
        boolean suscripcion_activa
        text nivel_suscripcion "basico | profesional"
        jsonb config_diseno
    }

    negocio_foto {
        int id PK
        int negocio_id FK
        text url
        text tipo
        smallint orden
    }

    negocio_horario {
        int negocio_id PK,FK
        smallint dia_semana PK
        time hora_apertura
        time hora_cierre
        boolean cerrado
    }

    producto {
        int id PK
        int negocio_id FK
        text nombre
        smallint orden
    }

    actividad_negocio {
        bigint id PK
        int negocio_id FK
        text nombre
        text descripcion
        text foto_url
        date fecha_inicio
        date fecha_fin
        time hora_inicio
        time hora_fin
        text categoria
        text categoria_otro
        text lugar
        text eslogan
        text detalles
        text_array etiquetas
        boolean solicita_sello
        text estado_sello "no_solicitado | pendiente | aprobado | rechazado"
        text justificacion_sello
        text motivo_rechazo_sello
        int limite_canjes
        int qr_sello_id FK
        int evento_id FK
        timestamptz fecha_creacion
    }

    qr_sello {
        int id PK
        int negocio_id FK
        text token "(cerrada)"
        text nombre_actividad
        text color
        timestamptz fecha_creacion
        timestamptz fecha_expiracion "= fin real de la actividad"
        int limite_canjes
    }

    sello {
        bigint id PK
        uuid usuario_id FK
        int sitio_id FK "si tipo = geolocalizacion"
        int qr_sello_id FK "si tipo = qr"
        text tipo "geolocalizacion | qr"
        timestamptz fecha_sello
    }

    cupon {
        bigint id PK
        int negocio_id FK
        text token "(cerrada)"
        text descripcion
        int descuento_porcentaje
        timestamptz fecha_expiracion
        int limite_total
        boolean activo
        timestamptz fecha_creacion
    }

    cupon_obtenido {
        bigint id PK
        bigint cupon_id FK
        uuid usuario_id FK
        text estado "obtenido | usado"
        timestamptz fecha_obtenido
        timestamptz fecha_uso
    }

    negocio_token_canje {
        int negocio_id PK,FK
        text token "(cerrada) QR de canje del negocio"
        timestamptz fecha_creacion
    }

    resena {
        bigint id PK
        int negocio_id FK
        uuid usuario_id FK "(cerrada)"
        smallint calificacion "1 a 5"
        text comentario "10 a 2000, obligatorio"
        timestamptz fecha
        text respuesta_emprendedor "hasta 2000"
        timestamptz fecha_respuesta
    }

    evento {
        int id PK
        int sitio_relacionado_id FK
        int negocio_organizador_id FK
        text nombre
        date fecha_inicio
        date fecha_fin
        time hora_inicio
        time hora_fin
        text ubicacion
        text descripcion
        text imagen_url
        text categoria
        text categoria_otro
        text eslogan
        text detalles
        text_array etiquetas
    }

    guardado {
        uuid usuario_id PK,FK
        text tipo PK "evento | sitio | negocio..."
        text referencia_id PK
        jsonb datos "copia para mostrarlo aunque termine"
        timestamptz fecha_guardado
    }

    sitio {
        int id PK
        int insignia_id FK
        text nombre
        text descripcion_corta
        text historia
        double latitud
        double longitud
        text imagen_url
        int radio_sello_metros
    }

    insignia {
        int id PK
        text clave
        text nombre
        text imagen_url
    }

    ruta {
        int id PK
        text nombre
        text ciudad
    }

    ruta_sitio {
        int ruta_id PK,FK
        int sitio_id PK,FK
        smallint orden
    }

    ruta_guardada {
        uuid usuario_id PK,FK
        int ruta_id PK,FK
        timestamptz fecha_guardado
    }

    nivel {
        smallint numero PK
        int sellos_necesarios
    }

    rango {
        int id PK
        text nombre
        int sellos_necesarios
        text beneficio
        text color
    }

    categoria_avatar {
        int id PK
        text clave
        text nombre
        boolean obligatoria
    }

    pieza_avatar {
        int id PK
        int categoria_id FK
        text clave
        text imagen_url
        boolean es_inicial
    }

    avatar_equipado {
        uuid usuario_id PK,FK
        int categoria_id PK,FK
        int pieza_id FK
    }

    pieza_desbloqueada {
        uuid usuario_id PK,FK
        int pieza_id PK,FK
        smallint nivel_hito
        timestamptz fecha_desbloqueo
    }

    usuario_hito {
        uuid usuario_id PK,FK
        smallint nivel_hito PK
        int pieza_elegida_id FK
        timestamptz fecha_generado
        timestamptz fecha_resuelto
    }

    hito_candidato {
        uuid usuario_id PK,FK
        smallint nivel_hito PK,FK
        int pieza_id PK,FK
    }
```

Notas de diseño:

- `sello` tiene exactamente uno de `sitio_id` o `qr_sello_id` según `tipo`. Un sello de QR es **la prueba**
  de haber visitado ese negocio: de ahí sale quién puede reseñar (`puede_resenar`).
- `actividad_negocio` y `evento` son dos cosas: la actividad es lo que el negocio gestiona; el evento es lo
  que ve el público (`crear_evento_desde_actividad`). `actividades_negocio_publicas()` solo devuelve lo no terminado.
- Una **reseña es del negocio, no de la actividad**: sigue visible aunque la actividad que dio el sello haya terminado.
- `cupon_obtenido.cupon_id` es `ON DELETE RESTRICT`: un cupón con canjes no se borra; se desactiva o vence.
- `negocio_token_canje` es una tabla aparte (no una columna de `negocio`) para que el token no se lea con el
  `select('*')` público de `negocio`.
- Funciones internas sin tabla propia: `fin_de_actividad` (la regla de "terminó"), `negocio_visible` (candado de
  suscripción), `es_duenio_negocio`, `autor_visible`.

---

## 2. Diagrama de clases

Capa de datos (hooks) y de dominio, tal como están en `src/`. Las "clases" son módulos de funciones.

```mermaid
classDiagram
    class SupabaseClient {
        +from(tabla)
        +rpc(funcion, args)
        +auth
        +storage
    }

    class useNegocio {
        +negocio
        +actividades
        +actividadesQR
        +cupones
        +guardarPerfil()
        +crearActividad()
        +editarActividad()
        +eliminarActividad()
        +reenviarSello()
    }
    class useSellos {
        +sellos
        +sellarPorGeolocalizacion()
        +canjearQR()
    }
    class useEventosPublicos {
        +eventos_vigentes
        +todos
    }
    class useResenas {
        +resumen
        +resenas
        +puedeResenar
        +guardar()
        +responder()
    }
    class useAdmin {
        +pendientes
        +solicitudesSello
        +resenas
        +aprobar()
        +aprobarSello()
        +rechazarSello()
        +borrarResena()
    }
    class useAhora {
        +ahora_cada_60s
    }
    class eventosUtil {
        +finDeEvento()
        +eventoTermino()
        +diaDeFin()
        +hoyManagua()
        +cuponVencido()
        +eventoDesdeGuardado()
    }

    class App {
        -pantalla
        +navegar()
    }
    class PerfilNegocio {
        +pestana_resumen
        +pestana_negocio
        +pestana_actividades
        +pestana_resenas
    }
    class PerfilNegocioPublico
    class SeccionResenas
    class PanelResenasNegocio
    class PanelAdmin
    class DetalleEvento
    class MisCupones
    class GenerarQR

    App --> PerfilNegocio
    App --> PanelAdmin
    App --> DetalleEvento
    App --> MisCupones
    PerfilNegocio --> GenerarQR
    PerfilNegocio --> PanelResenasNegocio
    PerfilNegocio --> PerfilNegocioPublico : vista previa
    DetalleEvento --> PerfilNegocioPublico
    PerfilNegocioPublico --> SeccionResenas

    SeccionResenas ..> useResenas
    PanelResenasNegocio ..> useResenas
    PanelAdmin ..> useAdmin
    PanelAdmin ..> useAhora
    PerfilNegocio ..> useNegocio
    MisCupones ..> useAhora
    DetalleEvento ..> eventosUtil
    useAhora ..> eventosUtil : instante actual
    useEventosPublicos ..> eventosUtil

    useNegocio ..> SupabaseClient
    useSellos ..> SupabaseClient
    useEventosPublicos ..> SupabaseClient
    useResenas ..> SupabaseClient
    useAdmin ..> SupabaseClient
```

---

## 3. Casos de uso

```mermaid
flowchart LR
    T([Turista])
    E([Emprendedor])
    A([Administrador])
    V([Visitante sin sesión])

    subgraph Turista
        direction TB
        t1[Ver mapa y rutas]
        t2[Sellar por geolocalización]
        t3[Canjear QR de un negocio]
        t4[Obtener y usar cupones]
        t5[Escribir y editar reseña]
        t6[Guardar eventos, sitios y rutas]
        t7[Personalizar avatar]
    end

    subgraph Emprendedor
        direction TB
        e1[Registrar negocio]
        e2[Editar perfil, horarios, fotos, productos]
        e3[Crear, editar y eliminar actividades]
        e4[Pedir un sello para una actividad]
        e5[Crear cupones y QR de canje]
        e6[Ver y responder reseñas]
    end

    subgraph Administrador
        direction TB
        a1[Aprobar o rechazar negocios]
        a2[Aprobar o rechazar solicitudes de sello]
        a3[Renovar suscripciones]
        a4[Eliminar reseñas]
    end

    subgraph Público
        direction TB
        v1[Ver landing, eventos y mapa]
        v2[Leer reseñas de un negocio visible]
    end

    V --> v1
    V --> v2
    T --> t1 & t2 & t3 & t4 & t5 & t6 & t7
    E --> e1 & e2 & e3 & e4 & e5 & e6
    A --> a1 & a2 & a3 & a4
    t5 -. "requiere sello del negocio" .-> t3
    e4 -. "lo aprueba" .-> a2
```

---

## 4. Flujos

### 4.1 Actividad → sello → canje

El dueño no crea el QR: lo crea el administrador al aprobar. Una actividad ya terminada no puede aprobarse (033).

```mermaid
sequenceDiagram
    actor D as Emprendedor
    participant DB as Supabase (RPC + RLS)
    actor Ad as Administrador
    actor T as Turista

    D->>DB: insert actividad_negocio (solicita_sello = true, justificación)
    Note over DB: el trigger fija estado_sello = pendiente
    Ad->>DB: admin_aprobar_sello(actividad)
    alt la actividad ya terminó
        DB-->>Ad: "Esta actividad ya terminó." (solo se puede rechazar)
    else vigente
        DB->>DB: crea qr_sello (token, límite, fecha_expiracion = fin real)
        DB-->>Ad: Sello aprobado
    end
    D->>DB: mis_actividades_qr(negocio) → token para dibujar el QR
    T->>DB: canjear_qr_sello(token)
    alt vencido, agotado, negocio no visible o ya canjeado
        DB-->>T: { exito: false, mensaje }
    else válido
        DB->>DB: insert sello (tipo = qr)
        DB-->>T: { exito: true }
    end
```

### 4.2 Cupón: obtener y canjear

```mermaid
sequenceDiagram
    actor D as Emprendedor
    actor T as Turista
    participant DB as Supabase

    D->>DB: crea cupón (descuento, vencimiento, límite)
    Note over DB: genera token del cupón y, la primera vez, token de canje del negocio
    T->>DB: obtener_cupon(token del cupón)
    DB-->>T: cupon_obtenido (estado = obtenido)
    Note over T: en el negocio, muestra su cupón
    T->>DB: iniciar_canje_cupon(token de canje del negocio)
    DB-->>T: cupones disponibles de ese negocio
    T->>DB: usar_cupon(cupon_obtenido, token de canje)
    alt vencido, inactivo, ya usado o negocio no visible
        DB-->>T: { exito: false, mensaje }
    else válido
        DB->>DB: estado = usado, fecha_uso = now()
        DB-->>T: { exito: true }
    end
```

### 4.3 Reseña

```mermaid
sequenceDiagram
    actor T as Turista
    actor D as Emprendedor
    actor Ad as Administrador
    participant DB as Supabase

    T->>DB: puede_resenar(negocio)
    Note over DB: true solo con sesión + sello de ESE negocio + no ser el dueño + negocio visible
    T->>DB: guardar_resena(negocio, 1 a 5, comentario 10-2000)
    DB-->>T: crea o edita (una por persona y negocio)
    Note over DB: la lectura pública (resenas_publicas) muestra el alias "Viajero", nunca usuario_id ni el correo
    D->>DB: responder_resena(id, respuesta 1-2000)
    DB-->>D: solo si es dueño de ese negocio
    Ad->>DB: admin_resenas() → todas, también de negocios vencidos
    Ad->>DB: admin_borrar_resena(id)
```

### 4.4 "Lo terminado desaparece"

Una sola regla, en la base y en el frontend (mismos casos de prueba):
una actividad termina en `fecha_fin + hora_fin` en **America/Managua (UTC-6)**; si `hora_fin < hora_inicio`
cruza la medianoche y termina al día siguiente; sin hora, termina a las 00:00 del día siguiente.

```mermaid
flowchart TD
    R["fin = fecha_fin + hora_fin (Managua)"] --> Q{"¿ahora ≥ fin?"}
    Q -- No --> V["Vigente: se muestra en Eventos, Inicio, ficha del negocio y se puede canjear"]
    Q -- Sí --> X["Terminada"]
    X --> X1["actividades_negocio_publicas() no la devuelve"]
    X --> X2["canjear_qr_sello: 'Esta actividad ya terminó.'"]
    X --> X3["admin_aprobar_sello: 'Esta actividad ya terminó.'; PanelAdmin: etiqueta 'Ya terminó', Aprobar desactivado"]
    X --> X4["Emprendedor: pasa a 'Finalizadas (N)'"]
    X --> X5["Favorito: abre el detalle guardado con 'Ya terminó', sin descripción ni perfil"]
    X --> X6["Reseñas: NO cambian (son del negocio)"]
    C["Cupón con fecha_expiracion < ahora"] --> C1["Turista: pasa a 'Vencidos y usados'"]
    C --> C2["Emprendedor: 'Vencidos (N)'"]
    H["useAhora: re-lee la hora cada 60 s y al volver a la app"] -.-> Q
```

### 4.5 Navegación (resumen)

```mermaid
flowchart TD
    L[Landing] --> Lg[Login: correo + código + TOTP]
    Lg --> O{¿Onboarding completo?}
    O -- No --> Ob[Onboarding / registro de negocio]
    O -- Sí --> R{Rol}
    R -- turista --> Tu[Inicio · Mapa · Eventos · Mis sellos · Cupones · Perfil]
    R -- dueño de negocio --> Em[Panel del negocio: Resumen · Negocio · Actividades · Reseñas]
    R -- admin --> Ad[Panel Admin: negocios · sellos · reseñas]
    Tu --> Dt[Detalle de evento / sitio / ruta]
    Dt --> Pn[Ficha pública del negocio + reseñas]
```
