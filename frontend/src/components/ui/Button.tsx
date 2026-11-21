import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2Icon } from '../icons';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'quiet' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled = false,
      icon,
      iconRight,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`tf-button tf-button-${variant} tf-button-${size} ${loading ? 'tf-button-loading' : ''} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2Icon size={size === 'sm' ? 14 : 16} className="tf-button-spinner animate-spin" />
        ) : (
          icon && <span className="tf-button-icon-left">{icon}</span>
        )}
        {children && <span className="tf-button-text">{children}</span>}
        {!loading && iconRight && <span className="tf-button-icon-right">{iconRight}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';
