import type { CSSProperties } from 'react';
import { cn } from './cn';

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" style={style} className={cn('skeleton h-4 w-full', className)} />;
}
