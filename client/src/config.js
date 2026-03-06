// Centralização da URL da API
// Usando proxy do Vite — todas as requisições /api são redirecionadas para o backend
export const API_URL = '';

// Fetch wrapper que adiciona header para bypassar aviso do ngrok
export function apiFetch(url, options = {}) {
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers || {})
  };
  return fetch(url, { ...options, headers });
}
