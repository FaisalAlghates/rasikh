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
  label,
}: {
  items: TabItem[];
  defaultValue?: string;
  label: string;
}) {
  return (
    <RTabs.Root defaultValue={defaultValue ?? items[0]?.value}>
      <RTabs.List aria-label={label} className="hairline flex rounded-md p-1">
        {items.map((i) => (
          <RTabs.Trigger
            key={i.value}
            value={i.value}
            className={cn(
              'min-h-10 flex-1 rounded-sm px-3 text-small text-text-muted transition-colors duration-200 ease-rk',
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
