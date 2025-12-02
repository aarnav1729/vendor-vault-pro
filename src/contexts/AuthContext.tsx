import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ADMIN_EMAIL } from '@/types/vendor';
import { getUser } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('currentUserEmail');
    if (storedEmail) {
      getUser(storedEmail).then(u => {
        if (u && u.verified) {
          setUser(u);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const logout = () => {
    sessionStorage.removeItem('currentUserEmail');
    setUser(null);
  };

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
