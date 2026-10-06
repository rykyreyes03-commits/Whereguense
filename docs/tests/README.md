# Pruebas

Dos clases de prueba. Ninguna deja datos: las de la base terminan en `ROLLBACK`, las de la interfaz usan un
Supabase simulado.

## Pruebas de la base (SQL con rollback)

Cada archivo `NNN_*.sql` prueba la migración del mismo número. Funcionan así:

- Se pegan **enteros en una sola llamada de SQL** (SQL Editor de Supabase, `execute_sql` del MCP o `psql`), porque
  usan funciones temporales (`pg_temp.como`, `pg_temp.corre`) que viven solo durante esa conexión.
- Simulan usuarios reales con `request.jwt.claims` + `set local role` (`anon` o `authenticated`), así que
  prueban los **permisos y las políticas de verdad**, no solo la lógica.
- Terminan **siempre** con `raise exception 'ROLLBACK DE PRUEBA…'`: no se guarda nada (ni los datos de prueba ni,
  en las pruebas que incluyen el cuerpo de la migración, la migración misma).
- El mensaje de ese error trae la primera línea **`RESULTADO: N de N comprobaciones correctas`** y una línea por
  caso. Cada caso se compara con su resultado esperado; los que no coinciden salen como `FALLA`. Un resultado sano
  dice "(todas)". Que la llamada "falle" con ese mensaje es lo normal.
- Los IDs de usuarios y negocios que aparecen (dueño de "papu", admin, turistas) son los del proyecto real; si
  corres las pruebas en otro proyecto, cámbialos por usuarios de ese proyecto.

| Archivo | Qué prueba |
| --- | --- |
| `030_detalle_editar_eliminar.sql` | `qr_sello` cerrado a INSERT/UPDATE directo; no se borra el QR de una actividad; editar y eliminar actividades y cupones (`eliminar_actividad`, `eliminar_cupon`, triggers de validación); permisos por rol. Incluye casos con datos reales. |
| `031_lo_terminado_desaparece.sql` | La regla de fin de actividad (`fin_de_actividad`) con reloj simulado en las fronteras (nocturnas, sin hora, un día); `actividades_negocio_publicas()` solo devuelve lo vigente; la batería de `canjear_qr_sello` (igual que antes salvo el caso nuevo "ya terminó"); el QR vence cuando termina la actividad. |
| `032_resenas.sql` | Reseñas (61 comprobaciones): `puede_resenar`; `guardar_resena` (sesión, 1–5 estrellas, comentario 10–2000, sello de ese negocio, no ser el dueño, negocio visible, crear y editar, una por persona); la tabla `resena` cerrada a SELECT/INSERT/UPDATE directo; alias "Viajero" y que no salgan `usuario_id` ni correo; orden; `resumen_resenas`; reseña con sello de una actividad **terminada** sigue válida; `responder_resena` (solo el dueño); negocio vencido no muestra reseñas; `admin_resenas` y `admin_borrar_resena`. |
| `033_aprobar_sello_no_terminada.sql` | `admin_aprobar_sello` rechaza una actividad terminada ("Esta actividad ya terminó."), sigue aprobando una vigente con `fecha_expiracion` = fin real, y rechazar una terminada sigue funcionando. |

Las pruebas 032 y 033 se escribieron **después** de aplicar las migraciones: se pueden correr en cualquier
momento. Las 030 y 031 incluyen el cuerpo de la migración, así que sirven antes y después de aplicarla.

Para comprobar que no se tocaron datos reales tras correr una prueba, compara una huella de las tablas antes y después:

```sql
select md5(string_agg(t::text, '|' order by id)) from public.actividad_negocio t;   -- repite con qr_sello, sello, resena...
```

## Pruebas del frontend

### `031_regla_front.mjs` — la regla "terminó" en JavaScript
Repite los casos A1–A8 de la prueba 031 de SQL sobre `src/utils/eventos.js` y debe dar lo mismo. Los dos archivos
deben cambiar juntos (la fuente de los resultados esperados es el SQL).

```bash
node docs/tests/031_regla_front.mjs
TZ=Asia/Tokyo node docs/tests/031_regla_front.mjs    # no debe depender de la zona del teléfono
```

### `resenas_front/` — interfaz de reseñas en un navegador real (106 comprobaciones)
Monta las pantallas reales (ficha pública, pestaña del emprendedor, panel admin, línea "★ 4.6 · 12 reseñas") sobre un
Supabase simulado (`supabaseMock.js`, que imita las funciones de la 032) y las maneja con Playwright a **360 y 412 px**.
Comprueba: resumen y orden, aviso "Escanea el sello…" solo a quien corresponde, estrellas con teclado (flechas, un solo
Tab), tamaño táctil de 44 px, validaciones y errores del servidor dentro del formulario, editar con lo anterior, foco
que vuelve al cerrar, responder/editar respuesta, barras por estrella, "Ya terminó" con Aprobar desactivado y Rechazar
activo en el panel admin, filtro por negocio y eliminar con confirmación, sin scroll horizontal, y el contraste (≥ 4.5:1)
de los colores de estrellas, errores y botón.

```bash
npm i --no-save playwright          # no modifica package.json
npx playwright install chromium     # o define CHROMIUM_PATH con un Chromium ya instalado
node docs/tests/resenas_front/prueba.mjs
```

Termina con `N de N comprobaciones correctas` y el código de salida 0. Guarda capturas
`capturas_resenas_*.png` en `~/Downloads` (cambia la carpeta con `CAPTURAS=ruta`).
