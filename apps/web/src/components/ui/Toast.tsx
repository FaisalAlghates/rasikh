'use client';

import * as RToast from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'info' | 'success' | 'danger';
interface ToastItem {
  id: number;
  title: string;
  tone: Tone;
}

const Ctx = createContext<{ toast: (title: string, tone?: Tone) => void } | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useToast must be used inside <ToastProvider>');
  return c.toast;
}

const toneBar: Record<Tone, string> = {
  info: 'bg-brand',
  success: 'bg-success',
  danger: 'bg-danger',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations('common');
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((title: string, tone: Tone = 'info') => {
    setItems((cur) => [...cur, { id: Date.now() + Math.random(), title, tone }]);
  }, []);
  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      <RToast.Provider duration={4000} swipeDirection="down">
        {children}
        {items.map((i) => (
          <RToast.Root
            key={i.id}
            onOpenChange={(open) => !open && setItems((cur) => cur.filter((x) => x.id !== i.id))}
            className="hairline rise-in relative flex items-center gap-3 overflow-hidden rounded-md bg-surface py-3 ps-5 pe-3 text-text"
          >
            <span
              aria-hidden="true"
              className={cn('absolute inset-y-0 start-0 w-1', toneBar[i.tone])}
            />
            <RToast.Title className="flex-1 text-small">{i.title}</RToast.Title>
            <RToast.Close
              aria-label={t('dismiss')}
              className="inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:text-text"
            >
              <X size={16} aria-hidden="true" />
            </RToast.Close>
          </RToast.Root>
        ))}
        <RToast.Viewport className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-sm flex-col gap-2 outline-none" />
      </RToast.Provider>
    </Ctx.Provider>
  );
}
