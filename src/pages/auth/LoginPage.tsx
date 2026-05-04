import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { useAuth } from '@/lib/contexts/auth-context';
import { CONFIG } from '@/lib/config';
import {
  initGoogleSignIn,
  clickHiddenGoogleButton,
  GOOGLE_BUTTON_CONTAINER_ID,
  type CredentialResponse,
} from '@/lib/google-identity';
import { BrandName } from '@/components/ui/BrandName';
import { Logo } from '@/components/ui/Logo';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { handleOAuthExchange } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const googleInitialized = useRef(false);

  // GIS callback — fires after the user completes Google sign-in in the popup
  const onGoogleCredential = useCallback(
    async (response: CredentialResponse) => {
      setError('');
      setGoogleLoading(true);
      try {
        await handleOAuthExchange('google', response.credential);
        navigate('/home');
      } catch {
        setError(t('auth.googleSignInFailed'));
      } finally {
        setGoogleLoading(false);
      }
    },
    [handleOAuthExchange, navigate, t],
  );

  // Initialize GIS on mount (renders a hidden Google button)
  useEffect(() => {
    if (googleInitialized.current || !CONFIG.GOOGLE_CLIENT_ID) return;
    googleInitialized.current = true;

    initGoogleSignIn(CONFIG.GOOGLE_CLIENT_ID, onGoogleCredential).catch(() => {
      // GIS script failed to load — button will just not work
    });
  }, [onGoogleCredential]);

  const handleGoogleClick = () => {
    setError('');
    clickHiddenGoogleButton();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-(--el-page-bg) overflow-hidden">
      <AuthBackground />
      {/* Login Card */}
      <div className="relative z-10 flex w-[420px] flex-col gap-8 rounded-(--radius-card) bg-(--el-auth-card-bg) p-(--spacing-card) shadow-(--shadow-elevated)">
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-4">
          <Logo size={56} />
          <h1 className="text-2xl font-bold text-(--el-auth-title)">
            <BrandName text={t('auth.welcomeToDoooo')} />
          </h1>
          <p className="text-sm text-(--el-auth-subtitle)">
            {t('auth.signInSubtitle')}
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={handleGoogleClick}
            disabled={googleLoading}
            className="flex h-(--btn-height-lg) items-center justify-center gap-2.5 rounded-(--radius-btn) border border-(--el-auth-google-border) bg-(--el-auth-google-bg) text-[15px] font-medium text-(--el-auth-google-text) transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
          </button>

          {/* Apple — inverted colors between light/dark */}
          <button className="flex h-(--btn-height-lg) items-center justify-center gap-2.5 rounded-(--radius-btn) bg-(--el-auth-apple-bg) text-[15px] font-medium text-(--el-auth-apple-text) transition-opacity hover:opacity-90">
            <svg className="h-5 w-5" style={{ fill: 'var(--el-auth-apple-text)' }} viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            {t('auth.continueWithApple')}
          </button>

          {/* Email */}
          <Link
            to="/login/email"
            className="flex h-(--btn-height-lg) items-center justify-center gap-2.5 rounded-(--radius-btn) bg-(--el-auth-submit-bg) text-[15px] font-semibold text-(--el-auth-submit-text) transition-opacity hover:opacity-90"
          >
            <Icon name="mail" size={20} color="var(--el-auth-submit-text)" />
            {t('auth.continueWithEmail')}
          </Link>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-center text-sm text-(--el-auth-error)">{error}</p>
        )}

        {/* Hidden Google button container — GIS renders its button here */}
        <div
          id={GOOGLE_BUTTON_CONTAINER_ID}
          style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        />
      </div>
    </div>
  );
}
