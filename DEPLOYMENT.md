# Despliegue — Wheregüense

## Arquitectura
- **Frontend:** React 19 + Vite, sitio estático (SPA) — se compila a archivos HTML/JS/CSS puros con `npm run build`, sin servidor Node propio.
- **Backend:** Supabase (Auth, PostgreSQL, Storage) — servicio externo ya alojado, no requiere infraestructura propia.
- El frontend estático puede alojarse en cualquier CDN/hosting estático (Vercel, Netlify, GitHub Pages, Cloudflare Pages).

## Variables de entorno requeridas
Ver `.env.example` en la raíz. Se deben configurar en el panel del proveedor de hosting (nunca committear valores reales):

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (anon/publishable) de Supabase |
| `VITE_CARTO_API_KEY` | Clave de CartoDB para los tiles del mapa |

## Build de producción
```bash
npm install
npm run build      # genera la carpeta dist/
npm run preview    # sirve dist/ localmente para probar antes de desplegar
```

## Pasos para desplegar (recomendado: Vercel)
1. Importar el repositorio de GitHub en Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build` — Output directory: `dist`.
4. Cargar las 3 variables de entorno de la tabla de arriba en Settings → Environment Variables.
5. Deploy.

Netlify es equivalente (build command y output directory idénticos, variables de entorno en Site settings → Environment variables).

## Configuración pendiente del lado de Supabase al desplegar
Antes de que el login por correo (OTP) funcione en el dominio de producción:
1. Supabase Dashboard → **Authentication → URL Configuration**.
2. Agregar la URL final de producción (ej. `https://whereguense.vercel.app`) tanto en **Site URL** como en **Redirect URLs**.
3. Sin este paso, los enlaces/redirecciones de auth seguirán apuntando a `localhost` y el login fallará en producción.

## Checklist antes de desplegar
- [ ] `npm run build` corre sin errores
- [ ] Las 3 variables de entorno cargadas en el proveedor de hosting
- [ ] URLs de producción agregadas en Supabase Auth
- [ ] MFA (TOTP) y Email provider siguen habilitados en Supabase (Authentication → Providers / Multi-Factor)
