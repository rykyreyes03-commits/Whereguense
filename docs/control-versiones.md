# Control de versiones

El código vive en GitHub: <https://github.com/rykyreyes03-commits/Whereguense>. Se usa **Git** con commits
pequeños, un tema por commit y mensajes en formato **Conventional Commits** (`feat:`, `fix:`, `docs:`,
`build:`, `chore:`), por ejemplo `feat(landing): formulario de solicitud de demo`.

## Ramas

| Rama | Para qué sirve |
| --- | --- |
| `main` | Rama estable. Solo recibe cambios ya terminados, por Pull Request. |
| `feature/supabase-backend` | Rama de trabajo actual: la base de datos, el panel admin, la landing y los sprints del hackathon. |
| `gh-pages` | Generada por `npm run deploy`: contiene el sitio compilado que sirve GitHub Pages. No se edita a mano. |

También se usó `feature/emprendedor-registro-negocio`, que entró a `main` con los **Pull Requests #1 y #2**.
Un Pull Request permite revisar los cambios de una rama antes de unirlos a `main`.

## Historial reciente

Salida real de `git log --oneline -20`:

```text
bf1f2fd build(android): recompilar APK con cambios del sprint 2
444d7be feat(admin): sección de solicitudes de demo en PanelAdmin
d3ca7c9 feat(landing): formulario de solicitud de demo
06a54b5 feat(db): migración 041 tabla solicitud_demo
fe97968 feat(auth): 2FA pasa a ser opcional, accesible desde Perfil
e8f6f40 fix(auth): mensaje claro cuando cuenta es de Google
1ad2555 fix(auth): evitar factor duplicado en MfaEnrolamiento
1bade89 fix(layout): app cubre 100% del ancho en escritorio
1bf30c2 fix(inicio): corregir corte visual entre hero y contenido en escritorio
a14f38e chore(tests): quitar imports sin uso del arnes de diseno
3a81e6e fix(layout): cubrir pantalla completa en escritorio
c244554 fix(auth): corregir flujo de registro con correo
715dee2 fix(auth): arreglar renderizado de QR TOTP en movil
782edcb fix(mapa): radar mas lento y con desfase propio por sitio
db6e034 fix(mapa): radar celeste que no pasa del radio de sellado
9a7b150 fix(mapa): animar el radar con Leaflet (setRadius/setStyle) en vez de CSS
012f4ec feat(mapa): animacion radar en los circulos de geolocalizacion
3bdcf78 docs: diagramas ER basico, de clases y de normalizacion 2FN
77ddc45 docs: diagramas Mermaid y PNG del proyecto
f486f8e docs: documentacion completa del proyecto en docs/documentacion
```

(En total el repositorio tiene casi 200 commits.)

## Los tres comandos del día a día

| Comando | Qué hace |
| --- | --- |
| `git commit -m "mensaje"` | Guarda un punto en el historial: una foto de los cambios que ya agregaste con `git add`, con un mensaje que explica qué se hizo. |
| `git push` | Sube tus commits a GitHub, para que el equipo y el jurado los vean y queden respaldados. |
| `git pull` | Descarga los cambios nuevos del repositorio remoto y los une con tu copia local. |

Flujo típico:

```bash
git add src/components/Landing.jsx
git commit -m "feat(landing): formulario de solicitud de demo"
git push origin feature/supabase-backend
```
