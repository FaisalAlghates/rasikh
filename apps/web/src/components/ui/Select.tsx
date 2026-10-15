'use client';

import * as RSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from './cn';

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder,
  label,
  className,
}: {
  options: SelectOption[];
  value?: string;
  onValueChange?: (v: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  const dir = useLocale() === 'ar' ? 'rtl' : 'ltr';
  return (
    <RSelect.Root dir={dir} value={value} onValueChange={onValueChange}>
      <RSelect.Trigger
        aria-label={label}
        className={cn(
          'hairline inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-md bg-surface px-4 text-body text-text data-[placeholder]:text-text-muted',
          className,
        )}
      >
        <RSelect.Value placeholder={placeholder} />
        <RSelect.Icon>
          <ChevronDown size={18} aria-hidden="true" />
        </RSelect.Icon>
      </RSelect.Trigger>
      <RSelect.Portal>
        <RSelect.Content
          position="popper"
          sideOffset={6}
          className="hairline z-50 min-w-[var(--radix-select-trigger-width)] rounded-md bg-surface p-1 text-text"
        >
          <RSelect.Viewport>
            {options.map((o) => (
              <RSelect.Item
                key={o.value}
                value={o.value}
                className="flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-sm px-3 text-body outline-none data-[highlighted]:bg-bg"
              >
                <RSelect.ItemText>{o.label}</RSelect.ItemText>
                <RSelect.ItemIndicator>
                  <Check size={16} aria-hidden="true" className="text-brand-text" />
                </RSelect.ItemIndicator>
              </RSelect.Item>
            ))}
          </RSelect.Viewport>
        </RSelect.Content>
      </RSelect.Portal>
    </RSelect.Root>
  );
}
