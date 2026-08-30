import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

interface AuthContextType {
  token: string | null;
  adminName: string | null;
  adminEmail: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [adminName, setAdminName] = useState<string | null>(localStorage.getItem('admin_name'));
  const [adminEmail, setAdminEmail] = useState<string | null>(localStorage.getItem('admin_email'));
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!token;

  useEffect(() => {
    // Validate token on mount
    const validate = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        await apiFetch('/auth/me');
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };
    validate();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ access_token: string; admin_name: string; admin_email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('admin_name', data.admin_name);
    localStorage.setItem('admin_email', data.admin_email);
    setToken(data.access_token);
    setAdminName(data.admin_name);
    setAdminEmail(data.admin_email);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_email');
    setToken(null);
    setAdminName(null);
    setAdminEmail(null);
  };

  return (
    <AuthContext.Provider value={{ token, adminName, adminEmail, isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
