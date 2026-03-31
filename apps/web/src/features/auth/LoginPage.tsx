import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { LoginForm } from './components/LoginForm';
import type { LoginCredentials } from './types/auth.types';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (credentials: LoginCredentials) => {
    setError(null);
    setIsLoading(true);
    try {
      await login(credentials);
      navigate('/projects', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invalid username or password',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">BA Analytic</h1>
          <p className="text-muted-foreground mt-1">Sign in to continue</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
