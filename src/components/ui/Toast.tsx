import { Icon } from './Icon';
import { useToast } from '@/lib/contexts/toast-context';

const VARIANT_STYLES = {
  success: {
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    icon: 'text-primary',
    iconName: 'check_circle' as const,
  },
  error: {
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    icon: 'text-destructive',
    iconName: 'error' as const,
  },
  info: {
    bg: 'bg-info/10',
    border: 'border-info/30',
    icon: 'text-info',
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
        className={`pointer-events-auto w-96 max-w-[calc(100vw-2rem)] animate-[slide-in-down_0.3s_ease-out] rounded-(--radius-card) border shadow-(--shadow-elevated) ${style.bg} ${style.border}`}
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
