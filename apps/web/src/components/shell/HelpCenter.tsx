'use client';

import { Plus, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { normalize } from '@/lib/nav';
import type { FaqCategory } from '@/lib/content';

/** Help centre with a live question filter (DGA help + FAQ templates). Questions are native disclosures. */
export function HelpCenter({ categories }: { categories: FaqCategory[] }) {
  const t = useTranslations('pages.help');
  const n = useTranslations('nav');
  const [q, setQ] = useState('');

  // open the question a search result linked to (#category-index)
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    const el = id ? document.getElementById(id) : null;
    if (el instanceof HTMLDetailsElement) {
      el.open = true;
      el.scrollIntoView({ block: 'center' });
      el.querySelector('summary')?.focus();
    }
  }, []);

  const filtered = useMemo(() => {
    const words = normalize(q).split(' ').filter(Boolean);
    if (!words.length) return categories;
    return categories
      .map((c) => ({
        ...c,
        items: c.items
          .map((it, i) => ({ ...it, i }))
          .filter((it) => {
            const text = normalize(`${it.q} ${it.a} ${c.title}`);
            return words.every((w) => text.includes(w));
          }),
      }))
      .filter((c) => c.items.length > 0);
  }, [q, categories]);
  const count = filtered.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label={t('topics')} className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 text-small font-semibold text-text-muted">{t('topics')}</h2>
        <ul className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible">
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <a
                href={`#${c.id}`}
                className="hairline inline-flex min-h-10 items-center rounded-full px-4 text-small text-text hover:bg-surface lg:w-full lg:rounded-md lg:border-transparent"
              >
                {c.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="faq-filter" className="text-small font-semibold">
            {t('filterLabel')}
          </label>
          <div className="hairline flex items-center gap-2 rounded-md bg-surface px-3 focus-within:outline focus-within:outline-2 focus-within:outline-brand-text">
            <Search size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
            <input
              id="faq-filter"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('filterPlaceholder')}
              aria-describedby="faq-count"
              className="min-h-12 w-full bg-transparent text-body outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                aria-label={n('searchClear')}
                className="inline-flex size-10 items-center justify-center rounded-md text-text-muted hover:text-text"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          <p id="faq-count" role="status" className="text-caption text-text-muted">
            {q ? t('matches', { count }) : ''}
          </p>
        </div>

        {filtered.length === 0 && <p className="text-body text-text-muted">{t('noMatch')}</p>}

        {filtered.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="scroll-mt-24">
            <h2 id={`${c.id}-h`} className="mb-3 text-h3 font-semibold">
              {c.title}
            </h2>
            <ul className="hairline divide-y divide-border/20 overflow-hidden rounded-xl bg-surface">
              {c.items.map((it, j) => {
                const idx = 'i' in it ? (it as { i: number }).i : j;
                return (
                  <li key={it.q}>
                    <details id={`${c.id}-${idx}`} className="faq group" open={!!q}>
                      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-5 py-3 text-body font-semibold hover:bg-bg/60">
                        {it.q}
                        <Plus
                          size={18}
                          aria-hidden="true"
                          className="faq-icon shrink-0 text-brand-text transition-transform duration-300 ease-rk"
                        />
                      </summary>
                      <p className="px-5 pb-5 text-body text-text-muted">{it.a}</p>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
