'use client';

import * as RDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from './cn';

interface Props {
  trigger: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function Close() {
  const t = useTranslations('common');
  return (
    <RDialog.Close
      aria-label={t('close')}
      className="absolute end-3 top-3 inline-flex size-10 items-center justify-center rounded-md text-text-muted hover:text-text"
    >
      <X size={18} aria-hidden="true" />
    </RDialog.Close>
  );
}

const overlay = 'fixed inset-0 z-40 bg-night/60';

export function Dialog({ trigger, title, description, children, open, onOpenChange }: Props) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className={overlay} />
        <RDialog.Content className="hairline fixed start-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-y-1/2 rounded-lg bg-surface p-6 text-text rtl:translate-x-1/2 ltr:-translate-x-1/2">
          <RDialog.Title className="text-h3 font-semibold pe-10">{title}</RDialog.Title>
          {description ? (
            <RDialog.Description className="mt-2 text-small text-text-muted">
              {description}
            </RDialog.Description>
          ) : (
            <RDialog.Description className="sr-only">{title}</RDialog.Description>
          )}
          <div className="mt-5">{children}</div>
          <Close />
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

/** Bottom sheet on phones, side sheet from the end edge on wide screens. */
export function Sheet({ trigger, title, description, children, open, onOpenChange }: Props) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className={overlay} />
        <RDialog.Content
          className={cn(
            'hairline fixed z-50 bg-surface p-6 text-text',
            'inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-xl',
            'md:inset-y-0 md:end-0 md:start-auto md:bottom-auto md:max-h-none md:w-96 md:rounded-none md:rounded-s-xl',
          )}
        >
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-text-muted/40 md:hidden"
            aria-hidden="true"
          />
          <RDialog.Title className="text-h3 font-semibold pe-10">{title}</RDialog.Title>
          {description ? (
            <RDialog.Description className="mt-2 text-small text-text-muted">
              {description}
            </RDialog.Description>
          ) : (
            <RDialog.Description className="sr-only">{title}</RDialog.Description>
          )}
          <div className="mt-5">{children}</div>
          <Close />
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
