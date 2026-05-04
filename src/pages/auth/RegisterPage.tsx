import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useAuth } from '@/lib/contexts/auth-context';
import logo from '@/assets/logo.svg';

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
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
      await register(email, password);
      navigate('/home');
    } catch {
      setError(t('auth.registerFailed', 'Registration failed. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-(--el-page-bg) overflow-hidden">
      <AuthBackground />
      <div className="relative z-10 flex w-[420px] flex-col gap-8 rounded-(--radius-card) bg-(--el-auth-card-bg) p-(--spacing-card) shadow-(--shadow-elevated)">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="doooo" className="h-14 w-14" />
          <h1 className="text-2xl font-bold text-(--el-auth-title)">
            {t('auth.createAccount')}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--el-auth-title)">{t('auth.emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@doooo.co"
              required
              className="h-12 rounded-(--radius-input) border border-(--el-auth-input-border) bg-(--el-auth-input-bg) px-(--spacing-input-x) text-sm text-(--el-auth-title) placeholder:text-(--el-auth-subtitle) focus:border-(--el-auth-input-focus) focus:outline-none"
             
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-(--el-auth-title)">{t('auth.passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="h-12 rounded-(--radius-input) border border-(--el-auth-input-border) bg-(--el-auth-input-bg) px-(--spacing-input-x) text-sm text-(--el-auth-title) placeholder:text-(--el-auth-subtitle) focus:border-(--el-auth-input-focus) focus:outline-none"
             
            />
          </div>

          {error && <p className="text-sm text-(--el-auth-error)">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-(--btn-height-lg) items-center justify-center rounded-(--radius-btn) bg-(--el-auth-submit-bg) text-[15px] font-semibold text-(--el-auth-submit-text) transition-opacity hover:opacity-90 disabled:opacity-50"
           
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              t('auth.signup')
            )}
          </button>
        </form>

        <div className="flex justify-center gap-1">
          <span className="text-[13px] text-(--el-auth-subtitle)">
            {t('auth.alreadyHaveAccount')}
          </span>
          <Link to="/login" className="text-[13px] font-semibold text-(--el-auth-link) hover:underline">
            {t('auth.signIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
