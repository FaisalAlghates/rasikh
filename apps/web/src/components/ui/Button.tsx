import { Slot } from '@radix-ui/react-slot';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';
import { ShurfaLoader } from './Shurfa';

type Variant = 'primary' | 'quiet' | 'ghost';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-on-brand hover:brightness-110',
  quiet: 'hairline text-text hover:bg-surface',
  ghost: 'text-brand-text hover:bg-surface',
};
const sizes: Record<Size, string> = {
  md: 'min-h-11 px-5 text-body',
  lg: 'min-h-12 px-7 text-body',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  asChild,
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-200 ease-rk disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {asChild ? children : loading ? <ShurfaLoader size="sm" /> : children}
    </Comp>
  );
}
