import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Interceptar fetch globalmente para adicionar header do ngrok
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  return originalFetch.call(this, url, { ...options, headers });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
