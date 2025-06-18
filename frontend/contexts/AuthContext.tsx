import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import { api } from '../lib/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'owner' | 'trainer';
  email_verified_at: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: 'owner' | 'trainer') => Promise<void>;
  requestTrainerRelationship: (trainerId: string, requestMessage?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser && storedUser !== 'undefined') {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Set up api token for subsequent requests
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch (error) {
        // Clear invalid data from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.error('Invalid stored user data:', error);
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors specifically
        if (data.errors && typeof data.errors === 'object') {
          const errorMessages = Object.values(data.errors).flat().join(' ');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Login failed');
      }

      setToken(data.data.token);
      setUser(data.data.user);
      
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Set up api token for subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
      
      toast.success('Prihlásenie úspešné!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba pri prihlasovaní');
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, role: 'owner' | 'trainer') => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, password_confirmation: password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors specifically
        if (data.errors && typeof data.errors === 'object') {
          const errorMessages = Object.values(data.errors).flat().join(' ');
          throw new Error(errorMessages);
        }
        throw new Error(data.message || 'Registration failed');
      }

      setToken(data.data.token);
      setUser(data.data.user);
      
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      
      // Set up api token for subsequent requests
      api.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`;
      
      toast.success('Registrácia úspešná!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chyba pri registrácii');
      throw error;
    }
  };

  const requestTrainerRelationship = async (trainerId: string, requestMessage?: string) => {
    try {
      await api.post('/trainer-clients/request-trainer', {
        trainer_id: trainerId,
        request_message: requestMessage || ''
      });
      
      toast.success('Žiadosť o trénera bola odoslaná!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Nepodarilo sa odoslať žiadosť o trénera';
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear api token
    delete api.defaults.headers.common['Authorization'];
    
    toast.info('Odhlásený');
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, requestTrainerRelationship, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 