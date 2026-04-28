import { type InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-(--el-input-label)">{label}</label>
        )}
        <input
          ref={ref}
          className={`h-(--btn-height-md) rounded-(--radius-input) border bg-(--el-input-bg) px-(--spacing-input-x) py-(--spacing-input-y) text-sm text-(--el-input-text) placeholder:text-(--el-input-placeholder) transition-all duration-(--transition-duration) focus:outline-none focus:ring-(length:--focus-ring-width) focus:ring-(--el-input-focus) ${
            error ? 'border-(--el-input-error-border)' : 'border-(--el-input-border)'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-(--el-input-error-text)">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
