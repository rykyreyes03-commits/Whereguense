-- =============================================================================
-- Wheregüense — Migración 003: datos semilla
-- =============================================================================
-- Depende de: 001_schema_inicial.sql + 002_rls_policies.sql aplicadas.
-- Motor: PostgreSQL 15 (Supabase). Ejecutar con service_role / desde el editor
-- SQL de Supabase (las políticas RLS de escritura no aplican a service_role).
--
-- Fuente: valores hoy hardcodeados en el frontend:
--   src/utils/rango.js            -> nivel, rango
--   src/data/avatarPiezas.js      -> categoria_avatar, pieza_avatar
--   src/data/insignias.js         -> insignia
--   src/data/sitios.js            -> sitio (+ insignia_id vía campo "badge")
--   src/data/rutas.js             -> ruta, ruta_sitio
--   src/data/eventos.js           -> evento
--
-- Decisiones (aprobadas):
--   - sitio conserva los ids fijos 1..10 de sitios.js; setval al final.
--   - rango.beneficio = NULL (el código no define beneficios).
--   - sitio.imagen_url = NULL (sitios.js no tiene imagen).
--   - imagen_url de insignia / pieza_avatar = nombre de archivo actual como
--     placeholder (assets aún servidos por el frontend; Storage vendrá después).
--   - es_inicial = true solo en rostro_1, ropa_1, gigantona_1.
--   - Los 4 eventos se enlazan a sitio por nombre; negocio_organizador_id = NULL.
--
-- Idempotente: "on conflict do nothing" / "where not exists" en todas las tablas.
-- Las FKs se resuelven por clave/nombre natural, no por id a mano.
-- =============================================================================

begin;


-- -----------------------------------------------------------------------------
-- 1. nivel  (curva 1..40, umbrales Fibonacci de generarUmbrales() en rango.js)
--    umbrales = [0, 2, 3], luego u[i] = u[i-1] + u[i-2].
--    nivel.numero N  ->  sellos_necesarios = umbrales[N-1]  (= sellosParaNivel(N)).
-- -----------------------------------------------------------------------------
insert into public.nivel (numero, sellos_necesarios) values
    (1, 0),          (2, 2),          (3, 3),          (4, 5),
    (5, 8),          (6, 13),         (7, 21),         (8, 34),
    (9, 55),         (10, 89),        (11, 144),       (12, 233),
    (13, 377),       (14, 610),       (15, 987),       (16, 1597),
    (17, 2584),      (18, 4181),      (19, 6765),      (20, 10946),
    (21, 17711),     (22, 28657),     (23, 46368),     (24, 75025),
    (25, 121393),    (26, 196418),    (27, 317811),    (28, 514229),
    (29, 832040),    (30, 1346269),   (31, 2178309),   (32, 3524578),
    (33, 5702887),   (34, 9227465),   (35, 14930352),  (36, 24157817),
    (37, 39088169),  (38, 63245986),  (39, 102334155), (40, 165580141)
on conflict (numero) do nothing;


-- -----------------------------------------------------------------------------
-- 2. rango  (obtenerRango() en rango.js: >=8 Maestro, >=5 Explorador, resto Principiante)
--    beneficio = NULL: el código no lo define.
-- -----------------------------------------------------------------------------
insert into public.rango (nombre, sellos_necesarios, beneficio, color) values
    ('Principiante',       0, null, '#4caf50'),
    ('Explorador',         5, null, '#ff9800'),
    ('Maestro Güegüense',  8, null, '#d32f2f')
on conflict (nombre) do nothing;


-- -----------------------------------------------------------------------------
-- 3. categoria_avatar  (los 4 slots de avatarPiezas.js; sombrero arranca vacío)
-- -----------------------------------------------------------------------------
insert into public.categoria_avatar (clave, nombre, obligatoria) values
    ('rostro',    'Rostro',    true),
    ('ropa',      'Ropa',      true),
    ('sombrero',  'Sombrero',  false),
    ('gigantona', 'Gigantona', true)
on conflict (clave) do nothing;


-- -----------------------------------------------------------------------------
-- 4. insignia  (mapa INSIGNIAS de insignias.js; clave = slug, imagen_url = placeholder)
-- -----------------------------------------------------------------------------
insert into public.insignia (clave, nombre, imagen_url) values
    ('cathedral',   'Catedral',    'badges/cathedral_transparent.png'),
    ('territory',   'Territorio',  'badges/territory_transparent.png'),
    ('guitar',      'Guitarra',    'badges/guitar_transparent.png'),
    ('flower',      'Flor',        'badges/flower_transparent.png'),
    ('sun',         'Sol',         'badges/sun_transparent.png'),
    ('vessel',      'Vasija',      'badges/vessel_transparent.png'),
    ('ruben_dario', 'Rubén Darío', 'badges/ruben_dario_transparent.png'),
    ('book',        'Libro',       'badges/book_transparent.png'),
    ('crown',       'Corona',      'badges/crown_transparent.png'),
    ('footprints',  'Huellas',     'badges/footprints_transparent.png')
on conflict (clave) do nothing;


-- -----------------------------------------------------------------------------
-- 5. sitio  (sitios.js; ids fijos 1..10 preservados; insignia_id por "badge";
--            latitud/longitud desde position[0]/position[1]; imagen_url = NULL)
-- -----------------------------------------------------------------------------
insert into public.sitio (id, insignia_id, nombre, descripcion_corta, historia, latitud, longitud, imagen_url) values
    (1,  (select id from public.insignia where clave = 'cathedral'),
        'Catedral de León',
        'Joyero de la arquitectura colonial nicaragüense',
        'Construida entre 1747 y 1860, símbolo religioso de León.',
        12.4375, -86.8783, null),
    (2,  (select id from public.insignia where clave = 'territory'),
        'Ruinas de León Viejo',
        'Patrimonio de la Humanidad UNESCO',
        'Ciudad fundada en 1524, destruida por erupción del Momotombo.',
        12.4000, -86.9000, null),
    (3,  (select id from public.insignia where clave = 'guitar'),
        'Casa de la Cultura',
        'Centro de expresiones artísticas y culturales',
        'Espacio dedicado a la promoción de las artes en León.',
        12.4350, -86.8800, null),
    (4,  (select id from public.insignia where clave = 'flower'),
        'Parque Central de León',
        'Corazón histórico y social de la ciudad',
        'Punto de encuentro tradicional de leoneses desde la colonia.',
        12.4368, -86.8790, null),
    (5,  (select id from public.insignia where clave = 'sun'),
        'Iglesia de San Juan Bautista',
        'Una de las iglesias más antiguas de León',
        'Construida en el siglo XVII, ejemplo de arquitectura colonial.',
        12.4340, -86.8750, null),
    (6,  (select id from public.insignia where clave = 'vessel'),
        'Museo de la Revolución',
        'Espacio dedicado a la historia contemporánea',
        'Documenta la lucha revolucionaria nicaragüense.',
        12.4380, -86.8770, null),
    (7,  (select id from public.insignia where clave = 'ruben_dario'),
        'Teatro Municipal',
        'Centro de artes escénicas y culturales',
        'Importante escenario cultural de la ciudad.',
        12.4362, -86.8788, null),
    (8,  (select id from public.insignia where clave = 'book'),
        'Universidad Nacional de Nicaragua León',
        'Principal centro educativo de la región',
        'Fundada en 1812, una de las universidades más antiguas de Centroamérica.',
        12.4395, -86.8795, null),
    (9,  (select id from public.insignia where clave = 'crown'),
        'Iglesia de la Recolección',
        'Hermosa iglesia barroca',
        'Construida en el siglo XVIII, joya del barroco colonial.',
        12.4355, -86.8772, null),
    (10, (select id from public.insignia where clave = 'footprints'),
        'Fortaleza de la Inmaculada Concepción',
        'Sitio histórico de defensa colonial',
        'Fortaleza construida para defender la ciudad de piratas.',
        12.4328, -86.8745, null)
on conflict (id) do nothing;

-- Reajustar la secuencia identity de sitio: se insertaron ids explícitos 1..10,
-- así que el próximo id automático debe ser 11.
select setval(pg_get_serial_sequence('public.sitio', 'id'),
              (select max(id) from public.sitio));


-- -----------------------------------------------------------------------------
-- 6. pieza_avatar  (avatarPiezas.js: ROSTROS 5, ROPAS 7, SOMBREROS 6, GIGANTONA 5)
--    es_inicial = true solo en *_DEFECTO: rostro_1, ropa_1, gigantona_1.
-- -----------------------------------------------------------------------------
insert into public.pieza_avatar (categoria_id, clave, imagen_url, es_inicial)
select c.id, v.clave, v.imagen_url, v.es_inicial
from (values
    ('rostro',    'rostro_1',    'avatar/rostro_1.png',    true),
    ('rostro',    'rostro_2',    'avatar/rostro_2.png',    false),
    ('rostro',    'rostro_3',    'avatar/rostro_3.png',    false),
    ('rostro',    'rostro_4',    'avatar/rostro_4.png',    false),
    ('rostro',    'rostro_5',    'avatar/rostro_5.png',    false),
    ('ropa',      'ropa_1',      'avatar/ropa_1.png',      true),
    ('ropa',      'ropa_2',      'avatar/ropa_2.png',      false),
    ('ropa',      'ropa_3',      'avatar/ropa_3.png',      false),
    ('ropa',      'ropa_4',      'avatar/ropa_4.png',      false),
    ('ropa',      'ropa_5',      'avatar/ropa_5.png',      false),
    ('ropa',      'ropa_6',      'avatar/ropa_6.png',      false),
    ('ropa',      'ropa_7',      'avatar/ropa_7.png',      false),
    ('sombrero',  'sombrero_1',  'avatar/sombrero_1.png',  false),
    ('sombrero',  'sombrero_2',  'avatar/sombrero_2.png',  false),
    ('sombrero',  'sombrero_3',  'avatar/sombrero_3.png',  false),
    ('sombrero',  'sombrero_4',  'avatar/sombrero_4.png',  false),
    ('sombrero',  'sombrero_5',  'avatar/sombrero_5.png',  false),
    ('sombrero',  'sombrero_6',  'avatar/sombrero_6.png',  false),
    ('gigantona', 'gigantona_1', 'avatar/gigantona_1.png', true),
    ('gigantona', 'gigantona_2', 'avatar/gigantona_2.png', false),
    ('gigantona', 'gigantona_3', 'avatar/gigantona_3.png', false),
    ('gigantona', 'gigantona_4', 'avatar/gigantona_4.png', false),
    ('gigantona', 'gigantona_5', 'avatar/gigantona_5.png', false)
) as v(categoria_clave, clave, imagen_url, es_inicial)
join public.categoria_avatar c on c.clave = v.categoria_clave
on conflict (clave) do nothing;


-- -----------------------------------------------------------------------------
-- 7. ruta  (rutas.js: una sola ruta)
-- -----------------------------------------------------------------------------
insert into public.ruta (nombre, ciudad)
select 'Ruta Dariana', 'León, Nicaragua'
where not exists (
    select 1 from public.ruta where nombre = 'Ruta Dariana'
);


-- -----------------------------------------------------------------------------
-- 8. ruta_sitio  (rutas.js embebe el array completo de sitios en su orden natural
--    = orden de sitios.js = ids 1..10)
-- -----------------------------------------------------------------------------
insert into public.ruta_sitio (ruta_id, sitio_id, orden)
select r.id, s.id, o.orden
from public.ruta r
join (values
    ('Catedral de León',                       1),
    ('Ruinas de León Viejo',                   2),
    ('Casa de la Cultura',                     3),
    ('Parque Central de León',                 4),
    ('Iglesia de San Juan Bautista',           5),
    ('Museo de la Revolución',                 6),
    ('Teatro Municipal',                       7),
    ('Universidad Nacional de Nicaragua León', 8),
    ('Iglesia de la Recolección',              9),
    ('Fortaleza de la Inmaculada Concepción',  10)
) as o(sitio_nombre, orden) on true
join public.sitio s on s.nombre = o.sitio_nombre
where r.nombre = 'Ruta Dariana'
on conflict (ruta_id, sitio_id) do nothing;


-- -----------------------------------------------------------------------------
-- 9. evento  (eventos.js; sitio_relacionado_id por nombre; sin organizador)
-- -----------------------------------------------------------------------------
insert into public.evento
    (nombre, fecha_inicio, fecha_fin, ubicacion, descripcion, sitio_relacionado_id, negocio_organizador_id)
select
    v.nombre,
    v.fecha_inicio::date,
    v.fecha_fin::date,
    v.ubicacion,
    v.descripcion,
    (select s.id from public.sitio s where s.nombre = v.sitio_nombre),
    null
from (values
    ('Festival Dariano',
     '2026-08-14', '2026-08-20',
     'Parque Central de León',
     'Celebración cultural en honor a Rubén Darío con desfiles, poesía y música tradicional por las calles del centro histórico de León.',
     'Parque Central de León'),
    ('Feria del Libro Leonés',
     '2026-08-01', '2026-08-10',
     'Casa de la Cultura',
     'Exposición y venta de libros de autores nicaragüenses, con charlas y presentaciones diarias.',
     'Casa de la Cultura'),
    ('Noche de Museos',
     '2026-08-17', '2026-08-17',
     'Museo de la Revolución',
     'Entrada libre y recorridos guiados nocturnos por las salas del museo, con actividades para toda la familia.',
     'Museo de la Revolución'),
    ('Concierto Sinfónico en la Catedral',
     '2026-08-25', '2026-08-25',
     'Catedral de León',
     'Presentación de la Orquesta Sinfónica Nacional en el atrio de la Catedral de León, Patrimonio de la Humanidad.',
     'Catedral de León')
) as v(nombre, fecha_inicio, fecha_fin, ubicacion, descripcion, sitio_nombre)
where not exists (
    select 1 from public.evento e where e.nombre = v.nombre
);


commit;


-- =============================================================================
-- Verificación rápida (opcional: correr tras el commit para chequear conteos)
-- =============================================================================
-- select 'nivel'            as tabla, count(*) as filas from public.nivel
-- union all select 'rango',            count(*) from public.rango
-- union all select 'categoria_avatar', count(*) from public.categoria_avatar
-- union all select 'insignia',         count(*) from public.insignia
-- union all select 'sitio',            count(*) from public.sitio
-- union all select 'pieza_avatar',     count(*) from public.pieza_avatar
-- union all select 'ruta',             count(*) from public.ruta
-- union all select 'ruta_sitio',       count(*) from public.ruta_sitio
-- union all select 'evento',           count(*) from public.evento;
--
-- Esperado: nivel 40, rango 3, categoria_avatar 4, insignia 10, sitio 10,
--           pieza_avatar 23, ruta 1, ruta_sitio 10, evento 4.
--
-- Chequeo de integridad sitio <-> insignia (debe devolver 0 filas):
-- select s.nombre from public.sitio s left join public.insignia i on i.id = s.insignia_id
-- where i.id is null;
-- =============================================================================
