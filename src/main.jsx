import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Register service worker on app load so it is installed and active
// before the user clicks "Enable" on the Alerts page.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then(() => console.log('[sw] Service worker registered'))
    .catch(err => console.error('[sw] Service worker registration error:', err));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
