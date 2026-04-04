import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/lib/contexts/auth-context';
import logo from '@/assets/logo.svg';

export function EmailLoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/home');
    } catch {
      setError(t('auth.loginFailed', 'Invalid email or password'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-[420px] flex-col gap-8 rounded-2xl bg-surface p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="doooo" className="h-14 w-14" />
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
            Sign in with Email
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="h-12 rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#360EFF] focus:outline-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="h-12 rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#360EFF] focus:outline-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 items-center justify-center rounded-lg bg-[#360EFF] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2">
          <Link to="/forgot-password" className="text-[13px] text-[#360EFF] hover:underline" style={{ fontFamily: 'Inter, sans-serif' }}>
            Forgot password?
          </Link>
          <div className="flex gap-1">
            <span className="text-[13px] text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
              Don't have an account?
            </span>
            <Link to="/register" className="text-[13px] font-semibold text-[#360EFF] hover:underline" style={{ fontFamily: 'Inter, sans-serif' }}>
              Sign up
            </Link>
          </div>
          <Link to="/login" className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Icon name="arrow_back" size={14} />
            Back to login options
          </Link>
        </div>
      </div>
    </div>
  );
}
