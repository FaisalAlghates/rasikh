import type { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

const base =
  'inline-flex min-h-11 items-center justify-center rounded-md px-5 text-body font-medium transition-colors duration-200 disabled:opacity-50';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' }) {
  const styles =
    variant === 'primary'
      ? 'bg-brand text-on-brand hover:brightness-110'
      : 'hairline text-text hover:bg-surface';
  return <button {...props} className={`${base} ${styles} ${className}`} />;
}

export function Field({
  label,
  hint,
  error,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  id: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-small text-text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...props}
        className="hairline min-h-11 rounded-md bg-surface px-4 text-body text-text placeholder:text-text-muted"
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-caption text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
