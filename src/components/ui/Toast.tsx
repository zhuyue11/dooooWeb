import { Icon } from './Icon';
import { useToast } from '@/lib/contexts/toast-context';

const VARIANT_STYLES = {
  success: {
    bg: 'bg-(--el-toast-success-bg)',
    border: 'border-(--el-toast-success-border)',
    icon: 'text-(--el-toast-success-icon)',
    iconName: 'check_circle' as const,
  },
  error: {
    bg: 'bg-(--el-toast-error-bg)',
    border: 'border-(--el-toast-error-border)',
    icon: 'text-(--el-toast-error-icon)',
    iconName: 'error' as const,
  },
  info: {
    bg: 'bg-(--el-toast-info-bg)',
    border: 'border-(--el-toast-info-border)',
    icon: 'text-(--el-toast-info-icon)',
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
          <p className="min-w-0 flex-1 text-sm font-medium text-(--el-toast-text)">
            {toast.message}
          </p>
          <button
            onClick={dismissToast}
            className="shrink-0 rounded p-0.5 text-(--el-toast-close) hover:text-(--el-toast-text)"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
