'use client';

import { useEffect, useRef } from 'react';

/** A soft clay light that follows the pointer (fine pointers, no reduced motion). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      !matchMedia('(pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const el = ref.current;
    if (!el) return;
    let x = innerWidth / 2;
    let y = innerHeight / 2;
    let cx = x;
    let cy = y;
    let raf = 0;
    const loop = () => {
      cx += (x - cx) * 0.12;
      cy += (y - cy) * 0.12;
      el.style.transform = `translate3d(${cx - 260}px, ${cy - 260}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.opacity = '1';
    };
    addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} aria-hidden="true" className="cursor-glow" />;
}
