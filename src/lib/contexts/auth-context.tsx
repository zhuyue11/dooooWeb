import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { STORAGE_KEYS } from '../config';
import * as api from '../api';
import type { User, UpdateProfileRequest } from '@/types/navigation';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, invitationCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (token) {
      api.getCurrentUser()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, invitationCode?: string) => {
    const res = await api.register(email, password, name, invitationCode);
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.data.token);
    setUser(res.data.user);
  }, []);

  const logoutFn = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await api.forgotPassword(email);
  }, []);

  const resetPasswordFn = useCallback(async (token: string, password: string) => {
    await api.resetPassword(token, password);
  }, []);

  const updateProfileFn = useCallback(async (data: UpdateProfileRequest) => {
    const updated = await api.updateProfile(data);
    setUser(updated);
  }, []);

  const changePasswordFn = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.changePassword(currentPassword, newPassword);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout: logoutFn,
        forgotPassword,
        resetPassword: resetPasswordFn,
        updateProfile: updateProfileFn,
        changePassword: changePasswordFn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
