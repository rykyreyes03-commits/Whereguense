# Diagrama de clases (UML)

Las entidades de la base como clases UML: atributos y operaciones (las operaciones son las funciones RPC de Supabase
que actúan sobre cada entidad). Es el equivalente "orientado a objetos" del modelo ER; la base real de Wheregüense es
relacional (PostgreSQL). Imagen: [`diagrama_clases.png`](diagrama_clases.png).

```mermaid
classDiagram
  class Usuario {
    +uuid id
    +string nombre_usuario
    +string email
    +string rol
    +string pais
    +string idioma_preferido
    +string avatar_personaje
    +string foto_perfil_url
    +date fecha_nacimiento
    +string telefono
    +string genero
    +bool onboarding_completado
    +calcular_nivel() Nivel
    +accesorios_desbloqueados() Accesorio[]
  }
  class Negocio {
    +int id
    +string nombre_negocio
    +string categoria
    +float latitud
    +float longitud
    +string estado
    +timestamp fecha_vencimiento_suscripcion
    +json config_diseno
    +ordenar_fotos_negocio(ids)
    +responder_resena(id, texto)
    +mis_actividades_qr() QrSello[]
  }
  class Actividad {
    +bigint id
    +string nombre
    +date fecha_inicio
    +date fecha_fin
    +string estado_sello
    +int limite_canjes
    +crear_evento_desde_actividad()
    +eliminar_actividad()
  }
  class QrSello {
    +int id
    +string token
    +string nombre_actividad
    +timestamp fecha_expiracion
    +int limite_canjes
  }
  class Evento {
    +int id
    +string nombre
    +date fecha_inicio
    +date fecha_fin
    +string categoria
  }
  class Cupon {
    +bigint id
    +int descuento_porcentaje
    +timestamp fecha_expiracion
    +int limite_total
    +obtener_cupon(token)
    +usar_cupon(id, token_negocio)
    +eliminar_cupon()
  }
  class Resena {
    +bigint id
    +int calificacion
    +string comentario
    +string respuesta_emprendedor
    +guardar_resena(negocio, nota, texto)
    +puede_resenar(negocio) bool
  }
  class Sitio {
    +int id
    +string nombre
    +float latitud
    +float longitud
    +int radio_sello_metros
    +RangoSello rango
    +string ciudad
  }
  class Sello {
    +bigint id
    +string tipo
    +timestamp fecha_sello
    +sellar_por_geolocalizacion(sitio, lat, lng)
    +canjear_qr_sello(token)
  }
  class RangoSello {
    <<enumeration>>
    cobre
    plata
    oro
    +valor_sello() numeric
  }
  class ResenaSitio {
    +uuid id
    +int estrellas
    +string texto
    +guardar_resena_sitio(sitio, estrellas, texto)
    +eliminar_mi_resena_sitio(sitio)
  }
  class Ruta {
    +int id
    +string nombre
    +string ciudad
  }
  class Insignia {
    +int id
    +string clave
    +string imagen_url
  }
  class PiezaAvatar {
    +int id
    +string clave
    +string imagen_url
    +bool es_inicial
  }
  class CategoriaAvatar {
    +int id
    +string clave
  }
  class Accesorio {
    +int id
    +string nombre
    +int nivel_requerido
  }
  class Nivel {
    +int nivel_actual
    +numeric puntos_totales
    +int puntos_para_siguiente
    +int porcentaje
  }

  Usuario "1" --> "0..1" Negocio : es dueño de
  Negocio "1" *-- "0..*" Actividad : publica
  Negocio "1" *-- "0..*" QrSello : genera
  Negocio "1" *-- "0..*" Cupon : ofrece
  Negocio "1" o-- "0..*" Resena : recibe
  Usuario "1" --> "0..*" Resena : escribe
  Actividad "0..*" --> "0..1" QrSello : otorga sello
  Actividad "0..*" --> "0..1" Evento : se publica como
  Usuario "1" --> "0..*" Sello : obtiene
  Sello "0..*" --> "0..1" Sitio : por geolocalización
  Sello "0..*" --> "0..1" QrSello : por QR
  Sitio "1" --> "1" Insignia : tiene
  Sitio "1" --> "1" RangoSello : clasificado
  Sitio "1" o-- "0..*" ResenaSitio : recibe
  Usuario "1" --> "0..*" ResenaSitio : escribe
  Ruta "0..*" o-- "1..*" Sitio : incluye
  CategoriaAvatar "1" o-- "0..*" PiezaAvatar : agrupa
  Usuario "0..*" --> "0..*" PiezaAvatar : desbloquea y equipa
  Usuario ..> Nivel : calcula
  Usuario ..> Accesorio : desbloquea por nivel
  Cupon "1" --> "0..*" Usuario : lo obtienen
```
