'use client';

import * as RTabs from '@radix-ui/react-tabs';
import { useLocale } from 'next-intl';
import type { ReactNode } from 'react';
import { cn } from './cn';

export interface TabItem {
  value: string;
  label: string;
  content: ReactNode;
}

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  label,
}: {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  label: string;
}) {
  // Radix defaults to ltr; Arabic tabs must start on the right and arrow keys must follow reading order.
  const dir = useLocale() === 'ar' ? 'rtl' : 'ltr';
  return (
    <RTabs.Root
      dir={dir}
      {...(value === undefined ? { defaultValue: defaultValue ?? items[0]?.value } : { value })}
      onValueChange={onValueChange}
    >
      {/* Scrolls sideways on narrow screens without a visible scrollbar; edges fade to hint there is more. */}
      <RTabs.List
        aria-label={label}
        className={cn(
          'hairline flex gap-1 overflow-x-auto rounded-full p-1.5',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          '[mask-image:linear-gradient(to_left,transparent,black_24px,black_calc(100%-24px),transparent)]',
        )}
      >
        {items.map((i) => (
          <RTabs.Trigger
            key={i.value}
            value={i.value}
            className={cn(
              'min-h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-small text-text-muted transition-colors duration-200 ease-rk hover:text-text',
              'data-[state=active]:bg-brand data-[state=active]:text-on-brand data-[state=active]:font-semibold',
            )}
          >
            {i.label}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {items.map((i) => (
        <RTabs.Content key={i.value} value={i.value} className="pt-5">
          {i.content}
        </RTabs.Content>
      ))}
    </RTabs.Root>
  );
}
