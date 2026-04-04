import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/lib/contexts/auth-context';
import logo from '@/assets/logo.svg';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
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
            Reset password
          </h1>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-sm text-muted-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
              {t('auth.resetEmailSent', 'Check your email for a reset link.')}
            </p>
            <Link to="/login" className="flex items-center gap-1 text-[13px] text-[#360EFF] hover:underline" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Icon name="arrow_back" size={14} />
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="h-12 rounded-lg border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#360EFF] focus:outline-none"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-12 items-center justify-center rounded-lg bg-[#360EFF] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <Link to="/login" className="flex items-center justify-center gap-1 text-[13px] text-muted-foreground hover:text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Icon name="arrow_back" size={14} />
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
