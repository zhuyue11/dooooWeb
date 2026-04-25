import { Icon } from './Icon';
import { useToast } from '@/lib/contexts/toast-context';

const VARIANT_STYLES = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    iconName: 'check_circle' as const,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/60',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    iconName: 'error' as const,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/60',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    iconName: 'info' as const,
  },
};

export function Toast() {
  const { toast, dismissToast } = useToast();

  if (!toast) return null;

  const style = VARIANT_STYLES[toast.variant];

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-[90] flex justify-center">
      <div
        key={toast.id}
        data-testid="toast"
        className={`pointer-events-auto w-96 max-w-[calc(100vw-2rem)] animate-[slide-in-down_0.3s_ease-out] rounded-xl border shadow-lg ${style.bg} ${style.border}`}
      >
        <div className="flex items-center gap-3 p-3">
          <span className={style.icon}>
            <Icon name={style.iconName} size={20} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
            {toast.message}
          </p>
          <button
            onClick={dismissToast}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
