import { cn } from './cn';

/** Thin shurfa (Najdi crenellation) divider. */
export function ShurfaDivider({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className={cn('block w-full text-brand-text opacity-60', className)}
      height="10"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="shurfa-pattern" width="16" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 10 8 0 16 10z" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="10" fill="url(#shurfa-pattern)" />
    </svg>
  );
}

/** Loading indicator: crenellation triangles rising in sequence. */
export function ShurfaLoader({ size = 'md', label }: { size?: 'sm' | 'md'; label?: string }) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shurfa-loader', size === 'sm' && 'scale-75')}
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
