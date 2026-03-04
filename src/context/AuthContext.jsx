import { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [user,  setUser]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('authUser')); } catch { return null; }
  });

  const isAuthenticated = !!token;

  // On mount: if a token was restored from localStorage but user isn't cached,
  // fetch /auth/me to repopulate the user object.
  useEffect(() => {
    if (token && !user) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error('Failed to restore session.');
          return res.json();
        })
        .then((profile) => {
          setUser(profile);
          localStorage.setItem('authUser', JSON.stringify(profile));
        })
        .catch(() => {
          // Token is invalid — clear everything
          setToken(null);
          localStorage.removeItem('authToken');
          localStorage.removeItem('authUser');
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function login(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || body.message || 'Invalid credentials.');
    }
    const data = await res.json();
    const tok = data.access_token;

    // Fetch the full profile from /auth/me using the new token
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    const profile = meRes.ok ? await meRes.json() : null;

    setToken(tok);
    setUser(profile);
    localStorage.setItem('authToken', tok);
    if (profile) localStorage.setItem('authUser', JSON.stringify(profile));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
