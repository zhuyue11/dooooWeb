import { type ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-(--el-btn-primary-bg) text-(--el-btn-primary-text) hover:bg-(--el-btn-primary-hover)',
  secondary: 'bg-(--el-btn-secondary-bg) text-(--el-btn-secondary-text) hover:opacity-90',
  destructive: 'bg-(--el-btn-destructive-bg) text-(--el-btn-destructive-text) hover:opacity-90',
  ghost: 'text-(--el-btn-ghost-text) hover:bg-(--el-btn-ghost-hover)',
  outline: 'border border-(--el-btn-outline-border) text-(--el-btn-outline-text) hover:bg-(--el-btn-outline-hover)',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-(--btn-height-sm) px-(--spacing-btn-x) text-sm',
  md: 'h-(--btn-height-md) px-(--spacing-btn-x) text-sm',
  lg: 'h-(--btn-height-lg) px-(--spacing-btn-x) text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-(--radius-btn) font-medium transition-all duration-(--transition-duration) active:scale-(--active-scale) disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
