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
          <label className="text-sm font-medium text-foreground">{label}</label>
        )}
        <input
          ref={ref}
          className={`h-(--btn-height-md) rounded-(--radius-input) border bg-input-bg px-(--spacing-input-x) py-(--spacing-input-y) text-sm text-foreground placeholder:text-muted-foreground transition-all duration-(--transition-duration) focus:outline-none focus:ring-(length:--focus-ring-width) focus:ring-primary/50 ${
            error ? 'border-destructive' : 'border-border'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
