import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/contexts/auth-context';
import logo from '@/assets/logo.svg';

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(email, password, name);
      navigate('/home');
    } catch {
      setError(t('auth.registerFailed', 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-[420px] flex-col gap-8 rounded-(--radius-card) bg-surface p-(--spacing-card) shadow-(--shadow-elevated)">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="doooo" className="h-14 w-14" />
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
            Create account
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="h-12 rounded-(--radius-input) border border-border bg-background px-(--spacing-input-x) text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-12 rounded-(--radius-input) border border-border bg-background px-(--spacing-input-x) text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
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
              minLength={8}
              className="h-12 rounded-(--radius-input) border border-border bg-background px-(--spacing-input-x) text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>

          {error && <p className="text-sm text-destructive" style={{ fontFamily: 'Inter, sans-serif' }}>{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-(--btn-height-lg) items-center justify-center rounded-(--radius-btn) bg-primary text-[15px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Sign up'
            )}
          </button>
        </form>

        <div className="flex justify-center gap-1">
          <span className="text-[13px] text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
            Already have an account?
          </span>
          <Link to="/login" className="text-[13px] font-semibold text-primary hover:underline" style={{ fontFamily: 'Inter, sans-serif' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
