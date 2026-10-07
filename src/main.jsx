import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import './i18n'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Barra de estado navy con íconos blancos (solo en la app nativa, no en la web/PWA).
// En Android 15+ el color de fondo lo da android:windowBackground de AppTheme.NoActionBar
// (styles.xml): ahí setBackgroundColor/setOverlaysWebView ya no tienen efecto.
if (Capacitor.isNativePlatform()) {
  StatusBar.setBackgroundColor({ color: '#1E2A78' }).catch(() => {})
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
