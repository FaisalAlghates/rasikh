'use client';

import { useRef, type ReactNode } from 'react';

/** Pulls its child a few pixels toward the pointer when it comes near. Pointer devices only. */
export function Magnetic({
  children,
  strength = 0.28,
}: {
  children: ReactNode;
  strength?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const move = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px)`;
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <span
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className="magnetic inline-block transition-transform duration-300 ease-rk"
    >
      {children}
    </span>
  );
}
