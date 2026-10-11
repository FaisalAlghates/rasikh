import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/** Icon-only button. `label` is required: it becomes the accessible name. */
export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={cn(
        'hairline inline-flex size-11 items-center justify-center rounded-md text-text transition-colors duration-200 ease-rk hover:bg-surface disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}
