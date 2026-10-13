import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext();
let profileRequest;

const fetchProfileOnce = () => {
  if (!profileRequest) {
    profileRequest = api.get('/auth/profile').finally(() => {
      profileRequest = null;
    });
  }
  return profileRequest;
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));
  const [authUnavailable, setAuthUnavailable] = useState(false);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const { data } = await fetchProfileOnce();
      setUser(data);
      setAuthUnavailable(false);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) {
        localStorage.removeItem('token');
        setUser(null);
        setAuthUnavailable(false);
      } else {
        // A network or server outage does not prove that the saved token is invalid.
        setAuthUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) return undefined;
    let active = true;
    Promise.resolve().then(() => {
      if (active) restoreSession();
    });
    return () => { active = false; };
  }, [restoreSession]);

  const retryProfile = useCallback(() => {
    setLoading(true);
    return restoreSession();
  }, [restoreSession]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setAuthUnavailable(false);
    return data;
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', userData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setAuthUnavailable(false);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setAuthUnavailable(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, authUnavailable, retryProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
