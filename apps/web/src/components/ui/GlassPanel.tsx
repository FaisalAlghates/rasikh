import type { HTMLAttributes } from 'react';
import { cn } from './cn';

/**
 * Glass material: ONLY for controls floating over a map or image
 * (search bar, filter sheet, peek card, mobile dock). One glass layer per screen.
 * Falls back to a solid surface when blur is unsupported or reduced transparency is on.
 */
export function GlassPanel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('glass rounded-lg', className)} />;
}
