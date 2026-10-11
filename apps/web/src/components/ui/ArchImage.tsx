import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Najdi doorway arch mask. Pass an <img>/<Image> or any scene as children.
 * Used lightly: one per screen, on the main property image.
 */
export function ArchImage({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      className={cn('arch relative aspect-[3/4] w-full bg-surface', className)}
    >
      {children}
    </div>
  );
}
