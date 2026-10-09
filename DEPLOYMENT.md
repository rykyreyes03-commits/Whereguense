# Despliegue — Wheregüense

Dos destinos con el mismo código: **web** (sitio estático) y **Android** (APK con Capacitor).
El backend es Supabase, un servicio ya alojado: no hay servidor propio que desplegar.

## 1. Variables de entorno

Plantilla en `.env.example`. En local van en `.env.local`; en el hosting, en el panel del proveedor.
**Nunca** subas valores reales al repositorio.

| Variable | Descripción |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Llave pública (publishable/anon) de Supabase |
| `VITE_CARTO_API_KEY` | Llave de CARTO para los tiles del mapa |
| `VITE_ORS_API_KEY` | Llave de OpenRouteService para la ruta peatonal |

Son llaves **públicas**: Vite las incrusta en el código que descarga el navegador. Jamás uses la
`service_role` de Supabase aquí. Se leen al compilar: si las cambias, vuelve a compilar.

## 2. Base de datos (Supabase)

El esquema está en `docs/migrations/001…033`, en orden. Cada archivo ya se aplicó en el proyecto de
producción (`apply_migration` del panel/CLI de Supabase, sin `begin/commit` propios).
Para un proyecto nuevo, aplica los archivos en orden numérico. Antes de cada migración nueva, corre su
prueba con rollback de `docs/tests/` (ver [`docs/tests/README.md`](docs/tests/README.md)).

Supabase → **Authentication**: deja habilitados el proveedor de correo (OTP) y **Multi-Factor (TOTP)**.

## 3. Web

```bash
npm install
npm run lint       # debe terminar sin errores
npm run build      # genera dist/
npm run preview    # prueba dist/ localmente
```

Es una SPA estática y también una PWA (`vite-plugin-pwa`): sirve `dist/` desde cualquier hosting
estático (Vercel, Netlify, Cloudflare Pages, GitHub Pages).

**Vercel (recomendado):** importa el repositorio → preset **Vite** → build `npm run build`, output `dist` →
carga las 4 variables en *Settings → Environment Variables* → Deploy. Netlify es equivalente.

**Supabase tras publicar:** *Authentication → URL Configuration* → agrega la URL de producción en
**Site URL** y **Redirect URLs** (p. ej. `https://whereguense.vercel.app`). Sin esto, los enlaces del
login siguen apuntando a `localhost` y el acceso falla en producción.

Como es una PWA, tras publicar una versión nueva el navegador puede servir la anterior hasta que se
cierre y reabra la pestaña (el service worker actualiza en segundo plano).

## 4. Android (Capacitor 8)

`appId: com.capncode.whereguense`, `webDir: dist`. La app es la misma web empaquetada: cada cambio
del frontend exige compilar y sincronizar de nuevo.

### Requisitos
- **JDK 21 exacto.** Con JDK 17 falla `invalid source release: 21`; con JDK 25, `Unsupported class file major version 69`.
  Apunta `JAVA_HOME` al JDK 21 (en Windows: variable de usuario) y **reinicia la terminal**.
- Android SDK (viene con Android Studio) y `adb` (`<SDK>\platform-tools`, normalmente fuera del PATH).
- Node.js y `npm install` hechos.

### APK de depuración (instalable directo)

```bash
npm run build
npx cap sync android
android\gradlew.bat -p android assembleDebug        # Windows  (macOS/Linux: ./android/gradlew -p android assembleDebug)
# → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

El APK no se sube al repositorio (está fuera de control de versiones): se comparte por otro medio.

### APK de lanzamiento (firmado)

Una app de lanzamiento necesita una **llave de firma que solo tú debes tener**. Pasos:

1. Crea el keystore (una vez; guárdalo fuera del repositorio y haz copia de seguridad: si lo pierdes no
   podrás actualizar la app en Play Store):
   ```bash
   keytool -genkeypair -v -keystore whereguense-release.jks -alias whereguense -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Crea `android/keystore.properties` (ya ignorado por git; no lo subas):
   ```
   storeFile=C:\\ruta\\segura\\whereguense-release.jks
   storePassword=...
   keyAlias=whereguense
   keyPassword=...
   ```
3. En `android/app/build.gradle` agrega un `signingConfigs.release` que lea ese archivo y úsalo en
   `buildTypes.release`.
4. Compila: `android\gradlew.bat -p android assembleRelease` (APK) o `bundleRelease` (AAB para Play Store).

### Ícono y splash
Las fuentes están en `assets/`. Regenerar:
```bash
npx capacitor-assets generate --android
node scripts/regenerar-iconos-adaptativos.cjs     # SIEMPRE después: corrige un bug de @capacitor/assets 3.0.5
```
En Android 12+ el splash nativo solo muestra ícono y color; la imagen completa es la pantalla de carga web.

### Notas
- La barra de estado azul sale de `android:windowBackground` del tema `AppTheme.NoActionBar` (en targetSdk 36
  `StatusBar.setBackgroundColor` no tiene efecto).
- XML no admite `--` dentro de comentarios: rompe el build.
- En PowerShell, `adb exec-out screencap > archivo` corrompe el PNG: usa `adb shell screencap -p /sdcard/x.png` y `adb pull`.

## 5. Lista de verificación antes de publicar
- [ ] `npm run lint` y `npm run build` sin errores
- [ ] Las 4 variables de entorno cargadas en el hosting
- [ ] URL de producción en Supabase (Site URL y Redirect URLs)
- [ ] Correo (OTP) y MFA (TOTP) habilitados en Supabase
- [ ] Migraciones 001–033 aplicadas y pruebas de `docs/tests/` en verde
- [ ] Prueba en un dispositivo real: login, escanear un QR, sellar, obtener y usar un cupón, escribir una reseña
