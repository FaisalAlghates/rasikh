'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { searchDocs, type SearchDoc } from '@/lib/nav';

/** DGA search page: live results while typing, a clear button, a result count, and suggestions. */
export function SearchPage({ docs }: { docs: SearchDoc[] }) {
  const t = useTranslations('pages.search');
  const [q, setQ] = useState('');
  const [ready, setReady] = useState(false);

  // read ?q= on load, then keep the address in step with the query (shareable results)
  useEffect(() => {
    setQ(new URLSearchParams(location.search).get('q') ?? '');
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(location.href);
    if (q.trim()) url.searchParams.set('q', q.trim());
    else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
  }, [q, ready]);

  const results = searchDocs(docs, q);
  const popular = t.raw('popularTerms') as string[];

  return (
    <div className="flex max-w-[45rem] flex-col gap-6">
      <form role="search" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-2">
        <label htmlFor="site-q" className="text-small font-semibold">
          {t('label')}
        </label>
        <div className="hairline flex items-center gap-2 rounded-md bg-surface px-3 focus-within:outline focus-within:outline-2 focus-within:outline-brand-text">
          <Search size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
          <input
            id="site-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('placeholder')}
            aria-describedby="site-q-count"
            className="min-h-12 w-full bg-transparent text-body outline-none placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label={t('clear')}
              className="inline-flex size-10 items-center justify-center rounded-md text-text-muted hover:text-text"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      <p id="site-q-count" role="status" className="text-small text-text-muted">
        {q.trim()
          ? results.length
            ? t('results', { count: results.length })
            : t('none', { q: q.trim() })
          : t('start')}
      </p>

      {!q.trim() && (
        <div className="flex flex-col gap-3">
          <h2 className="text-small font-semibold">{t('popular')}</h2>
          <ul className="flex flex-wrap gap-2">
            {popular.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  onClick={() => setQ(p)}
                  className="hairline inline-flex min-h-10 items-center rounded-full px-4 text-small hover:bg-surface"
                >
                  {p}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results.length > 0 && (
        <ol className="flex flex-col divide-y divide-border/20" data-testid="search-results">
          {results.map((r) => (
            <li key={r.id} className="py-4">
              <p className="text-caption text-text-muted">{r.section}</p>
              <Link
                href={r.href}
                className="text-h3 font-semibold text-brand-text underline-offset-4 hover:underline"
              >
                {r.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-body text-text-muted">{r.body}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
