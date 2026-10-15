'use client';

import * as RDialog from '@radix-ui/react-dialog';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { Link, useRouter } from '@/i18n/navigation';
import { ROUTES, SEARCHABLE, searchDocs, type SearchDoc } from '@/lib/nav';

/**
 * Site search in a dialog (DGA search behaviour: live suggestions while typing, a keyboard-reachable
 * clear button). Opens from the header or with "/". Enter opens the highlighted page, or the full
 * results page when nothing is highlighted.
 */
export function SearchDialog() {
  const t = useTranslations('nav');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const docs: SearchDoc[] = useMemo(
    () =>
      SEARCHABLE.map((k) => ({
        id: k,
        title: t(k),
        body: t(`desc.${k}`),
        href: ROUTES[k],
        section: '',
      })),
    [t],
  );
  const results = q.trim() ? searchDocs(docs, q, 8) : docs.slice(0, 6);

  // "/" opens search unless the person is typing somewhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '');
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setActive(-1), [q]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[active];
      if (r) go(r.href);
      else if (q.trim()) go(`${ROUTES.search}?q=${encodeURIComponent(q.trim())}`);
    }
  };

  return (
    <RDialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ('');
      }}
    >
      <RDialog.Trigger
        aria-label={t('searchOpen')}
        title={t('searchKey')}
        className="hairline inline-flex size-11 items-center justify-center rounded-md text-text transition-colors duration-200 hover:bg-surface"
      >
        <Search size={18} aria-hidden="true" />
      </RDialog.Trigger>
      <RDialog.Portal>
        <RDialog.Overlay className="drawer-overlay fixed inset-0 z-40 bg-night/60" />
        <RDialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            input.current?.focus();
          }}
          className="search-pop hairline fixed inset-x-4 top-[10vh] z-50 mx-auto max-w-xl overflow-hidden rounded-xl bg-surface text-text shadow-2xl"
        >
          <RDialog.Title className="sr-only">{t('search')}</RDialog.Title>
          <div className="flex items-center gap-2 border-b border-border/20 px-4">
            <Search size={18} aria-hidden="true" className="shrink-0 text-text-muted" />
            <input
              ref={input}
              type="search"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              aria-label={t('search')}
              placeholder={t('searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              className="min-h-14 w-full bg-transparent text-body text-text placeholder:text-text-muted [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ('');
                  input.current?.focus();
                }}
                aria-label={t('searchClear')}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-text-muted hover:text-text"
              >
                <X size={18} aria-hidden="true" />
              </button>
            )}
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-label={t('search')}
            className="max-h-[55vh] overflow-y-auto p-2"
          >
            {results.map((r, i) => (
              <li key={r.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link
                  href={r.href}
                  tabIndex={-1}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-lg px-3 py-2.5',
                    i === active ? 'bg-brand/10' : 'hover:bg-bg',
                  )}
                >
                  <span className="text-body font-semibold">{r.title}</span>
                  <span className="line-clamp-1 text-small text-text-muted">{r.body}</span>
                </Link>
              </li>
            ))}
          </ul>
          {q.trim() && results.length === 0 && (
            <p className="px-5 pb-4 text-small text-text-muted" role="status">
              {t('searchNone')}
            </p>
          )}
          {q.trim() && (
            <Link
              href={`${ROUTES.search}?q=${encodeURIComponent(q.trim())}`}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center justify-between border-t border-border/20 px-5 text-small font-semibold text-brand-text hover:bg-bg"
            >
              {t('searchAll')}
              <ArrowLeft size={16} aria-hidden="true" className="ltr:rotate-180" />
            </Link>
          )}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
