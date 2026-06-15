import axios from 'axios';

// Na Vercel, as API routes ficam no mesmo domínio em /api
// Se VITE_API_URL não estiver definido, usa caminho relativo (funciona em produção e dev com proxy)
const baseURL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '') + '/api'
  : '/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bmfarm.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Só faz logout se o 401 vier de uma rota que requer autenticação
    // e não for uma rota de email temporário ou outras rotas auxiliares
    const url = err.config?.url || '';
    const isAuthRoute = !url.includes('/auth/register');
    if (err.response?.status === 401 && isAuthRoute) {
      localStorage.removeItem('bmfarm.token');
      localStorage.removeItem('bmfarm.user');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default api;