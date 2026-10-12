'use client';

import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * One scroll engine for the whole site:
 *  - smooth (inertial) scrolling on fine pointers, off for reduced motion,
 *  - `[data-reveal]` / `[data-reveal-words]` get `.is-in` when they enter the viewport,
 *  - `[data-progress]` gets `--p` (0→1 while it crosses the viewport),
 *  - `[data-pin]` gets `--p` over its own scroll range plus `data-step` for pinned storytelling.
 */
export function ScrollEffects() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cleanups: Array<() => void> = [];

    const reveals = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-words]'),
    );
    if (reduce || !('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-in');
              io.unobserve(e.target);
            }
          }),
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      );
      reveals.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    if (!reduce) {
      const prog = Array.from(document.querySelectorAll<HTMLElement>('[data-progress]'));
      const pins = Array.from(document.querySelectorAll<HTMLElement>('[data-pin]'));
      let raf = 0;
      const update = () => {
        raf = 0;
        const vh = innerHeight;
        for (const el of prog) {
          const r = el.getBoundingClientRect();
          el.style.setProperty('--p', clamp((vh - r.top) / (vh + r.height)).toFixed(4));
        }
        for (const el of pins) {
          const r = el.getBoundingClientRect();
          const p = clamp(-r.top / Math.max(1, r.height - vh));
          const n = Number(el.dataset.steps ?? 1);
          el.style.setProperty('--p', p.toFixed(4));
          el.dataset.step = String(Math.min(n - 1, Math.floor(p * n)));
        }
      };
      const schedule = () => {
        if (!raf) raf = requestAnimationFrame(update);
      };
      addEventListener('scroll', schedule, { passive: true });
      addEventListener('resize', schedule);
      update();
      cleanups.push(() => {
        removeEventListener('scroll', schedule);
        removeEventListener('resize', schedule);
        cancelAnimationFrame(raf);
      });

      // Inertial scrolling for mouse/trackpad users only.
      if (matchMedia('(pointer: fine)').matches) {
        let stopped = false;
        let id = 0;
        void import('lenis').then(({ default: Lenis }) => {
          if (stopped) return;
          const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95 });
          const loop = (t: number) => {
            lenis.raf(t);
            id = requestAnimationFrame(loop);
          };
          id = requestAnimationFrame(loop);
          const onClick = (e: MouseEvent) => {
            const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
            const target = a && document.querySelector<HTMLElement>(a.getAttribute('href')!);
            if (target) {
              e.preventDefault();
              lenis.scrollTo(target, { offset: 0 });
            }
          };
          document.addEventListener('click', onClick);
          cleanups.push(() => {
            document.removeEventListener('click', onClick);
            lenis.destroy();
          });
        });
        cleanups.push(() => {
          stopped = true;
          cancelAnimationFrame(id);
        });
      }
    }

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
