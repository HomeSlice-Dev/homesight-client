import { API_URL } from '../config';

export function apiFetch(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return fetch(`${API_URL}${path}`, { ...options, headers }).then((res) => {
    if (res.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
    return res;
  });
}
