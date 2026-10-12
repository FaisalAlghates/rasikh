'use client';

import * as RTabs from '@radix-ui/react-tabs';
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
  return (
    <RTabs.Root
      {...(value === undefined ? { defaultValue: defaultValue ?? items[0]?.value } : { value })}
      onValueChange={onValueChange}
    >
      <RTabs.List aria-label={label} className="hairline flex overflow-x-auto rounded-md p-1">
        {items.map((i) => (
          <RTabs.Trigger
            key={i.value}
            value={i.value}
            className={cn(
              'min-h-10 flex-1 whitespace-nowrap rounded-sm px-3 text-small text-text-muted transition-colors duration-200 ease-rk',
              'data-[state=active]:bg-surface data-[state=active]:text-text',
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
