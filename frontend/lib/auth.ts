import api from './api';

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

/**
 * Decodes a JWT token without an external library.
 */
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const getSession = (): UserSession | null => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('accessToken');
  if (!token) return null;
  
  const decoded = parseJwt(token);
  if (!decoded || decoded.exp * 1000 < Date.now()) {
    return null;
  }
  
  return {
    id: decoded.userId,
    email: decoded.email,
    displayName: decoded.displayName || decoded.email.split('@')[0],
    role: decoded.role,
  };
};

export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
};
