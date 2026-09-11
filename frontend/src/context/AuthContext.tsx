import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role, AuthResponse } from '../types';
import { authService } from '../services/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, otp_code?: string) => Promise<AuthResponse>;
  register: (data: { name: string; email: string; password: string; student_id?: string; role?: string }) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('examshield_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async (): Promise<User | null> => {
    if (token) {
      try {
        const profile = await authService.getMe();
        setUser(profile);
        return profile;
      } catch (err) {
        console.error('Failed to restore authentication session:', err);
        logout();
      }
    }
    return null;
  };

  useEffect(() => {
    async function loadUser() {
      await refreshUser();
      setIsLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string, otp_code?: string): Promise<AuthResponse> => {
    const res = await authService.login(email, password, otp_code);
    if (res.access_token && res.user) {
      localStorage.setItem('examshield_token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (data: { name: string; email: string; password: string; student_id?: string; role?: string }): Promise<User> => {
    const newUser = await authService.register(data);
    await login(data.email, data.password);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('examshield_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
