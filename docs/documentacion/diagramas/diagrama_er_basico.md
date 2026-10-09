# Modelo ER básico (base de datos relacional)

Modelo entidad-relación simplificado: las entidades del negocio con su clave y sus atributos principales, y las
relaciones con su cardinalidad. El detalle de las 30 tablas está en [`diagrama_base_de_datos.md`](diagrama_base_de_datos.md).
Imagen: [`diagrama_er_basico.png`](diagrama_er_basico.png).

```mermaid
erDiagram
  USUARIO {
    uuid id PK
    text nombre_usuario
    text email
    text rol
    text pais
    text avatar_personaje
  }
  NEGOCIO {
    int id PK
    uuid usuario_id FK
    text nombre_negocio
    text categoria
    text estado
    timestamptz fecha_vencimiento_suscripcion
  }
  ACTIVIDAD_NEGOCIO {
    bigint id PK
    int negocio_id FK
    text nombre
    date fecha_inicio
    date fecha_fin
    text estado_sello
  }
  QR_SELLO {
    int id PK
    int negocio_id FK
    text nombre_actividad
    int limite_canjes
  }
  EVENTO {
    int id PK
    text nombre
    date fecha_inicio
    date fecha_fin
  }
  CUPON {
    bigint id PK
    int negocio_id FK
    int descuento_porcentaje
    bool activo
  }
  RESENA {
    bigint id PK
    int negocio_id FK
    uuid usuario_id FK
    smallint calificacion
    text comentario
  }
  SITIO {
    int id PK
    text nombre
    float latitud
    float longitud
    rango_sello rango
    text ciudad
  }
  RUTA {
    int id PK
    text nombre
    text ciudad
  }
  SELLO {
    bigint id PK
    uuid usuario_id FK
    int sitio_id FK
    int qr_sello_id FK
    text tipo
    timestamptz fecha_sello
  }
  RESENA_SITIO {
    uuid id PK
    int sitio_id FK
    uuid usuario_id FK
    int estrellas
    text texto
  }
  PIEZA_AVATAR {
    int id PK
    text clave
    int categoria_id FK
  }
  CATEGORIA_AVATAR {
    int id PK
    text clave
  }
  INSIGNIA {
    int id PK
    text nombre
    text imagen_url
  }

  USUARIO ||--o| NEGOCIO : "es dueño de"
  NEGOCIO ||--o{ ACTIVIDAD_NEGOCIO : publica
  NEGOCIO ||--o{ QR_SELLO : genera
  NEGOCIO ||--o{ CUPON : ofrece
  NEGOCIO ||--o{ RESENA : recibe
  USUARIO ||--o{ RESENA : escribe
  ACTIVIDAD_NEGOCIO }o--o| QR_SELLO : "otorga sello"
  ACTIVIDAD_NEGOCIO }o--o| EVENTO : "se publica como"
  USUARIO ||--o{ SELLO : obtiene
  SITIO ||--o{ SELLO : "se sella en"
  QR_SELLO ||--o{ SELLO : "se canjea en"
  SITIO ||--|| INSIGNIA : "tiene"
  SITIO ||--o{ RESENA_SITIO : recibe
  USUARIO ||--o{ RESENA_SITIO : escribe
  RUTA }o--o{ SITIO : "incluye (ruta_sitio)"
  CATEGORIA_AVATAR ||--o{ PIEZA_AVATAR : agrupa
  USUARIO }o--o{ PIEZA_AVATAR : "desbloquea (pieza_desbloqueada)"
```

Las relaciones muchos a muchos (`RUTA`–`SITIO` y `USUARIO`–`PIEZA_AVATAR`) se resuelven en el modelo relacional con
las tablas intermedias `ruta_sitio` y `pieza_desbloqueada`, ambas con clave primaria compuesta.
