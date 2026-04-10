import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refreshToken');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/refresh`,
            { token: refresh }
          );
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          err.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(err.config);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1').replace('/api/v1', '');

export const getImageUrl = (path: string | undefined) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};

export default api;
