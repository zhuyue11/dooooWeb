import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  variant: ToastVariant;
  id: number;
}

interface ToastContextValue {
  toast: ToastState | null;
  showToast: (message: string, variant?: ToastVariant) => void;
  dismissToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const idRef = useRef(0);

  const dismissToast = useCallback(() => {
    setToast(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const id = ++idRef.current;
      setToast({ message, variant, id });
      timerRef.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 3000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
