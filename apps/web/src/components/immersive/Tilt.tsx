'use client';

import { useRef, type HTMLAttributes, type PointerEvent } from 'react';
import { cn } from '@/components/ui/cn';

/**
 * 3D tilt with a moving highlight. Children marked `.depth-1` / `.depth-2` float above the card.
 * Disabled for touch and for reduced motion (CSS handles the latter).
 */
export function Tilt({
  max = 7,
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${((0.5 - y) * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${((x - 0.5) * max).toFixed(2)}deg`);
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    });
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={cn('tilt', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
