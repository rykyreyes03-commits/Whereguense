# Diagrama de arquitectura

Frontend (React / Vite / Capacitor), backend (Supabase: Auth, base de datos y Storage), servicios externos y
publicación (GitHub Pages y APK). Imagen: [`diagrama_arquitectura.png`](diagrama_arquitectura.png).

```mermaid
flowchart LR
  subgraph CLI["Dispositivos del usuario"]
    NAV["Navegador / PWA<br/>(Workbox, instalable)"]
    AND["App Android<br/>Capacitor 8 · WebView<br/>com.capncode.whereguense"]
  end

  subgraph FRONT["Frontend · un solo código"]
    REACT["React 19 + Vite 8<br/>App.jsx (navegación por estado)"]
    HOOKS["hooks/* (acceso a datos)<br/>utils/* · data/* catálogos"]
    I18N["i18next es/en · tema claro/oscuro"]
    MAPA["Leaflet / react-leaflet<br/>jsqr · qrcode.react"]
  end

  subgraph SUPA["Supabase (proyecto único · PostgreSQL 17)"]
    subgraph AUTH["Auth"]
      A1["Correo + contraseña"]
      A2["Google OAuth"]
      A3["TOTP obligatorio (2FA)"]
      A4["PKCE · sesión en la URL"]
    end
    subgraph DB["Base de datos"]
      D1[("30 tablas con RLS")]
      D2["Funciones RPC<br/>SECURITY DEFINER"]
      D3["Triggers y CHECK"]
    end
    subgraph ST["Storage (lectura pública)"]
      B1[("negocios · 10 MB")]
      B2[("sitios · 10 MB<br/>solo service_role escribe")]
      B3[("perfiles · 2 MB")]
    end
  end

  subgraph EXT["Servicios externos"]
    CARTO["CARTO<br/>teselas del mapa"]
    ORS["OpenRouteService<br/>ruta peatonal"]
    GOOGLE["Google Cloud<br/>credencial OAuth"]
  end

  subgraph PUB["Publicación"]
    GIT["Repositorio GitHub<br/>rama feature/supabase-backend"]
    GHP["GitHub Pages<br/>rama gh-pages<br/>/Whereguense/"]
    NET["Netlify (opcional)<br/>netlify.toml"]
    APK["APK debug<br/>Gradle 8.14 · JDK 21"]
  end

  NAV --> REACT
  AND --> REACT
  REACT --> HOOKS
  REACT --> I18N
  REACT --> MAPA
  HOOKS -->|"supabase-js<br/>llave pública"| D2
  HOOKS --> D1
  HOOKS --> A1
  HOOKS --> A2
  A2 -.-> GOOGLE
  A1 --> A3
  A2 --> A3
  A3 --> A4
  HOOKS -->|"upload / URL pública"| B1
  HOOKS --> B3
  HOOKS -->|"solo lectura"| B2
  D2 --> D1
  D3 --> D1
  MAPA --> CARTO
  MAPA --> ORS

  GIT -->|"npm run deploy<br/>(build:pages + gh-pages)"| GHP
  GIT -.->|"npm run build"| NET
  GIT -->|"npm run build<br/>npx cap sync android<br/>gradlew assembleDebug"| APK
  GHP --> NAV
  NET -.-> NAV
  APK --> AND
```
