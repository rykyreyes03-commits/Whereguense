import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'android', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Sacar una propiedad con desestructuración para descartarla (`const { [id]: _quitada, ...resto } = obj`) es válido.
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // La regla nueva de react-hooks 7 marca todo `setState` síncrono dentro de un efecto. En esta app ese patrón es
      // el normal y está probado (reiniciar el estado cuando cambia el id, leer de Supabase al montar); reescribirlo
      // en ~20 sitios sin una prueba que lo cubra sería más riesgoso que el aviso. Se apaga a propósito.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
