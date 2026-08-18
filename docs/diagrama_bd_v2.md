# Diagrama de base de datos — v2 (actualizado)

Este documento reemplaza a `diagrama_bd..jpeg` (versión anterior). Se generó comparando ese diagrama campo por campo contra el código real ya construido (`src/data/*.js`, `src/hooks/useSellos.js`, `src/utils/rango.js`, `src/components/Perfil.jsx`, `src/components/Tienda.jsx`) y contra el documento de especificaciones UX/UI, secciones 2 a 4.

GitHub renderiza el bloque `mermaid` de abajo automáticamente al ver este archivo en el repo — no hace falta exportar una imagen aparte.

## Decisiones tomadas al actualizarlo

- **Rango pasa a ser tabla configurable** (no un `if/else` en código como está hoy en `utils/rango.js`). Así se pueden ajustar los umbrales de nivel sin tocar código ni redesplegar. Cuando se conecte a Supabase, hay que migrar `obtenerRango()` para que haga una consulta a esta tabla en vez de tener los números fijos.
- **Se elimina la entidad `Pasaporte` como tabla separada.** En el diagrama viejo era una tabla intermedia entre Usuario y Sello, pero no aporta nada que no se pueda sacar directo de `sello.usuario_id` — es un concepto de pantalla ("Mis sellos"), no una entidad de datos distinta. Los sellos se guardan directo contra el usuario.
- **`Ruta` y `Sitio` se separan con una tabla puente** (`ruta_sitio`) en vez de que un sitio pertenezca a una sola ruta, porque el documento dice que el piloto es "escalable a más adelante" — así un sitio podría formar parte de más de una ruta en el futuro sin rediseñar.
- Se agregan las entidades que no existían en el diagrama viejo porque se construyeron después (`Ruta`, `Evento`, `Accesorio`, `Compra_Accesorio`) o porque corresponden a partes del documento de specs que aún no se han construido (`Negocio`, `QR_Sello`).
- **`Ranking` no es una tabla.** Se resuelve con una consulta (`COUNT` de sellos por usuario, filtrando por fecha si es "esta semana" o "este mes"), igual que ya lo hicimos con datos de ejemplo en `usuariosMock.js`.
- El estado de aprobación del emprendedor (pendiente/activo/rechazado) vive directo en `Negocio` en vez de una tabla aparte de "solicitudes", para no duplicar datos — se puede separar más adelante si el equipo necesita guardar historial de revisiones.
- `Usuario.id` debe coincidir con el `id` que genera Supabase Auth (uuid), para que el login con Google/correo quede ligado directo a la fila del usuario sin tabla intermedia.

## Diagrama

```mermaid
erDiagram
    USUARIO {
        uuid id PK
        string nombre_usuario
        string email
        string rol "turista | emprendedor | admin"
        string pais
        string idioma_preferido
        string avatar "cabezon | gigantona"
        timestamp fecha_registro
    }

    RANGO {
        int id PK
        string nombre
        int sellos_necesarios
        string beneficio
        string color
    }

    RUTA {
        int id PK
        string nombre
        string ciudad
    }

    SITIO {
        int id PK
        string nombre
        string descripcion_corta
        text historia
        float latitud
        float longitud
        string imagen
    }

    RUTA_SITIO {
        int ruta_id FK
        int sitio_id FK
        int orden
    }

    SELLO {
        int id PK
        uuid usuario_id FK
        int sitio_id FK "nullable si viene de un QR"
        int qr_sello_id FK "nullable si viene de un sitio"
        string tipo "geolocalizacion | qr"
        timestamp fecha_sello
    }

    NEGOCIO {
        int id PK
        uuid usuario_id FK
        string nombre_negocio
        string categoria
        string responsable
        string cedula_ruc
        string telefono
        float latitud
        float longitud
        text descripcion
        string fotos "array de urls, minimo 2"
        string estado "pendiente | activo | rechazado"
        text motivo_rechazo
        timestamp fecha_aprobacion
        timestamp fecha_vencimiento_suscripcion
        bool suscripcion_activa
    }

    QR_SELLO {
        int id PK
        int negocio_id FK
        string nombre_actividad
        timestamp fecha_expiracion
        int limite_canjes
        int canjes_actuales
    }

    EVENTO {
        int id PK
        string nombre
        date fecha_inicio
        date fecha_fin
        string ubicacion
        int sitio_relacionado_id FK
        int negocio_organizador_id FK
        text descripcion
    }

    ACCESORIO {
        int id PK
        string nombre
        string emoji_o_imagen
        string tipo "gratis | exclusivo"
        int nivel_requerido "solo si tipo=gratis"
        decimal precio "solo si tipo=exclusivo"
    }

    COMPRA_ACCESORIO {
        int id PK
        uuid usuario_id FK
        int accesorio_id FK
        timestamp fecha_compra
        string estado_pago "confirmado | pendiente | fallido"
        string referencia_pago
    }

    USUARIO ||--o{ SELLO : obtiene
    USUARIO ||--o{ COMPRA_ACCESORIO : compra
    USUARIO ||--o{ NEGOCIO : registra
    SITIO ||--o{ SELLO : origina
    SITIO ||--o{ RUTA_SITIO : pertenece
    RUTA ||--o{ RUTA_SITIO : contiene
    SITIO ||--o{ EVENTO : relaciona
    NEGOCIO ||--o{ EVENTO : organiza
    NEGOCIO ||--o{ QR_SELLO : genera
    QR_SELLO ||--o{ SELLO : origina
    ACCESORIO ||--o{ COMPRA_ACCESORIO : incluye
```

## Preguntas abiertas antes de crear las tablas en Supabase

Estas ya estaban en la sección 9 del documento de especificaciones, siguen sin resolverse y afectan directamente este esquema:

- ¿Stripe está disponible para cobros directos en Nicaragua? Define si `COMPRA_ACCESORIO.referencia_pago` apunta a Stripe o a otra pasarela.
- ¿Se auto-hospeda OSRM o se usa el servidor demo? No afecta tablas, pero sí si conviene guardar rutas calculadas en caché.
- ¿La curva de niveles (tabla `RANGO`) usa los umbrales sugeridos (2, 5, 8...) o el equipo prefiere otra progresión?
