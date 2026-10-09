# Android (Capacitor 8)

La app de Android es **la misma web empaquetada** en un WebView: cada cambio del frontend exige compilar y
sincronizar de nuevo. Proyecto nativo en `android/`.

| Dato | Valor |
| --- | --- |
| `appId` | `com.capncode.whereguense` |
| `appName` | Wheregüense |
| `webDir` | `dist` |
| Capacitor | 8.x (`@capacitor/core`, `@capacitor/android`, `@capacitor/splash-screen`, `@capacitor/status-bar`) |
| Gradle | 8.14.3 |
| `minSdk` / `compileSdk` / `targetSdk` | 24 / 36 / 36 |
| `versionCode` / `versionName` | 1 / "1.0" (en `android/app/build.gradle`) |

## Requisitos

- **JDK 21 exacto.** Con JDK 17 falla `invalid source release: 21`; con JDK 25, `Unsupported class file major version 69`.
  Apunta `JAVA_HOME` al JDK 21 (en Windows, variable de **usuario**; p. ej.
  `%LOCALAPPDATA%\Programs\Java\jdk-21.0.12.1+1`) y **reinicia la terminal**. Comprueba con `java -version`.
- **Android SDK** (viene con Android Studio) y `adb` (`<SDK>\platform-tools`, normalmente fuera del `PATH`;
  en Windows: `%LOCALAPPDATA%\Android\Sdk\platform-tools`).
- **Node.js** 22 (o 20.19+) y las dependencias instaladas (`npm install`).
- `.env.local` con las 4 variables `VITE_` **antes** de compilar (se incrustan en el build).
- Para instalar en un teléfono: depuración por USB activada.

## Generar el APK debug

Desde la raíz del proyecto:

```bash
npm run build                       # 1. compila la web a dist/ (base './', la que usa Android)
npx cap sync android                # 2. copia dist/ al proyecto nativo y sincroniza plugins
android\gradlew.bat -p android assembleDebug     # 3. compila el APK (en Linux/macOS: ./android/gradlew -p android assembleDebug)
```

El APK queda en:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Instalarlo en un teléfono conectado:

```bash
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r android\app\build\outputs\apk\debug\app-debug.apk
```

(`-r` reinstala conservando los datos.) También se puede abrir `android/` en Android Studio
(`npx cap open android`) y ejecutar desde allí.

> **No uses `npm run build:pages` para Android:** ese modo fija la ruta `/Whereguense/` y la app no encontraría sus
> archivos dentro del WebView.

## Ícono y pantalla de carga

- Fuentes en `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`).
  El logo base es `src/assets/logo_icono.png`.
- Para regenerar:

  ```bash
  node scripts/generar-iconos-app.cjs
  npx capacitor-assets generate --android --iconBackgroundColor "#FFFFFF" --splashBackgroundColor "#1E2A78"
  node scripts/regenerar-iconos-adaptativos.cjs
  ```

  `@capacitor/assets` 3.0.5 genera las capas adaptativas con tamaño de ícono antiguo: **corre siempre después**
  `regenerar-iconos-adaptativos.cjs`. No uses el modo "logo".
- En Android 12+ el splash nativo solo muestra ícono y color (`#1E2A78`); la ilustración de la Gigantona y el Cabezón
  está en la pantalla de carga web (anillo `OrbitalRoute`).
- **Barra de estado:** con Android 15+ y `targetSdk 36`, `StatusBar.setBackgroundColor` no hace nada; el azul sale
  del `android:windowBackground` del tema `AppTheme.NoActionBar` (`@color/barra_estado`).

## APK de publicación (release)

El APK/AAB firmado necesita un *keystore* propio. `android/keystore.properties`, `*.jks`, `*.keystore`, `*.apk` y
`*.aab` están en `.gitignore`: **nunca los subas al repositorio**. Este proyecto hoy solo documenta el flujo debug.

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| `invalid source release: 21` | Se usa JDK 17. Instala JDK 21 y reinicia la terminal. |
| `Unsupported class file major version 69` | Se usa JDK 25. Usa JDK 21. |
| La app abre en blanco | Se compiló con `build:pages` o falta `npx cap sync android` tras el build. |
| El mapa sale vacío | Falta `VITE_CARTO_API_KEY` en `.env.local` al compilar. |
| Build de Gradle falla por un comentario XML | El XML no admite `--` dentro de comentarios. |
| `adb: command not found` | Llama a `adb.exe` con su ruta completa o añade `platform-tools` al `PATH`. |
| Captura de pantalla corrupta en PowerShell | No uses `adb exec-out screencap > archivo`; usa `adb shell screencap -p /sdcard/x.png` y `adb pull`. |
| Iniciar sesión con Google no vuelve a la app | Limitación conocida: Google abre el navegador y falta el enlace profundo de regreso. Usa correo y contraseña. |
