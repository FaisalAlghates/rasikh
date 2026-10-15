'use client';

import { Contrast } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { PREF, TEXT_STEPS, readPref, writePref } from '@/lib/prefs';

/** Footer accessibility tools (DGA footer): text size and a higher-contrast mode, remembered per device. */
export function A11yTools() {
  const t = useTranslations('nav');
  const glyph = useLocale() === 'ar' ? 'أ' : 'A';
  const [size, setSize] = useState(100);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    const s = parseFloat(readPref(PREF.text) ?? '');
    if (TEXT_STEPS.includes(s as (typeof TEXT_STEPS)[number])) setSize(s);
    setContrast(document.documentElement.dataset.contrast === 'more');
  }, []);

  const applySize = (s: number) => {
    setSize(s);
    document.documentElement.style.fontSize = s === 100 ? '' : `${s}%`;
    writePref(PREF.text, s === 100 ? null : String(s));
  };
  const step = (dir: 1 | -1) => {
    const i = TEXT_STEPS.indexOf(size as (typeof TEXT_STEPS)[number]);
    const next = TEXT_STEPS[Math.min(TEXT_STEPS.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))];
    if (next) applySize(next);
  };
  const toggleContrast = () => {
    const on = !contrast;
    setContrast(on);
    if (on) document.documentElement.dataset.contrast = 'more';
    else delete document.documentElement.dataset.contrast;
    writePref(PREF.contrast, on ? 'more' : null);
  };

  const btn =
    'hairline inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-small text-text transition-colors duration-200 hover:bg-bg disabled:opacity-40';
  return (
    <div role="group" aria-label={t('groupA11y')} className="flex flex-wrap items-center gap-2">
      <span className="text-caption text-text-muted">{t('groupA11y')}</span>
      <button
        type="button"
        className={btn}
        onClick={() => step(-1)}
        disabled={size === TEXT_STEPS[0]}
        aria-label={t('textSmaller')}
        title={t('textSmaller')}
      >
        <span aria-hidden="true">{glyph}-</span>
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => applySize(100)}
        aria-label={t('textReset')}
        title={t('textReset')}
        aria-pressed={size === 100}
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => step(1)}
        disabled={size === TEXT_STEPS[TEXT_STEPS.length - 1]}
        aria-label={t('textLarger')}
        title={t('textLarger')}
      >
        <span aria-hidden="true">{glyph}+</span>
      </button>
      <button
        type="button"
        className={cn(btn, contrast && 'bg-text text-bg hover:bg-text')}
        onClick={toggleContrast}
        aria-pressed={contrast}
      >
        <Contrast size={16} aria-hidden="true" />
        {t('contrast')}
      </button>
    </div>
  );
}
