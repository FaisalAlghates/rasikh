import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ROUTES } from '@/lib/nav';

export interface Crumb {
  label: string;
  href?: string;
}

/** DGA breadcrumbs: home first, the current page last and not a link (aria-current="page"). */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations('nav');
  const all: Crumb[] = [{ label: t('home'), href: ROUTES.home }, ...items];
  return (
    <nav aria-label={t('breadcrumb')} className="py-4">
      <ol className="flex flex-wrap items-center gap-1 text-small text-text-muted">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {last || !c.href ? (
                <span aria-current={last ? 'page' : undefined} className={last ? 'text-text' : ''}>
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="underline-offset-4 hover:text-text hover:underline">
                  {c.label}
                </Link>
              )}
              {!last && (
                <ChevronLeft size={14} aria-hidden="true" className="opacity-60 ltr:rotate-180" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
