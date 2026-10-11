'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { THEME_KEY } from '@/lib/theme-script';
import { IconButton } from './ui/IconButton';

type Mode = 'light' | 'dark';

function current(): Mode {
  const set = document.documentElement.dataset.theme as Mode | undefined;
  if (set) return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** User override for the page theme. Stored per-device; the app works without storage. */
export function ThemeToggle() {
  const t = useTranslations('common');
  const [mode, setMode] = useState<Mode>('dark');

  useEffect(() => setMode(current()), []);

  const toggle = () => {
    const next: Mode = mode === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: keep the in-memory choice */
    }
    setMode(next);
  };

  return (
    <IconButton label={t('themeToggle')} onClick={toggle}>
      {mode === 'dark' ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </IconButton>
  );
}
