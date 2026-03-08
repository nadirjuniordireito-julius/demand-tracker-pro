import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { getAuthToken, getStoredAuthToken, setAuthToken } from '@/services/api';
import type { Usuario, LoginRequest } from '@/types';

interface AuthContextType {
  user: Usuario | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Restaura token do sessionStorage no init (F5): garante sincronia com a memória do módulo api.
        const stored = getStoredAuthToken();
        if (stored) setAuthToken(stored);

        if (!getAuthToken()) {
          setUser(null);
          return;
        }
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (e) {
        // await authService.logout();
        console.error("Erro ao carregar usuário", e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const response = await authService.login(credentials);
    setUser(response.usuario);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!getAuthToken(), //isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
