import { useTranslations } from 'next-intl';
import { BrandMark } from '@/components/BrandMark';
import { Link } from '@/i18n/navigation';
import { FOOTER_GROUPS, ROUTES } from '@/lib/nav';
import { A11yTools } from './A11yTools';

/**
 * The one footer (DGA footer: grouped links, accessibility tools, legal text, brand).
 * Rendered as `contentinfo`; every link is keyboard reachable with a visible focus ring.
 */
export function SiteFooter({ className = '' }: { className?: string }) {
  const t = useTranslations('nav');
  const c = useTranslations('common');
  return (
    <footer className={`border-t border-border/20 bg-surface/60 ${className}`}>
      <div className="rk-container grid gap-10 py-12 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="flex max-w-sm flex-col gap-4">
          <Link
            href={ROUTES.home}
            className="flex items-center gap-3 self-start text-brand-text"
            aria-label={`${c('appName')} · ${t('home')}`}
          >
            <BrandMark size={28} />
            <span className="display-font text-h3 text-text">{c('appName')}</span>
          </Link>
          <p className="text-small text-text-muted">{t('footerAbout')}</p>
        </div>
        {FOOTER_GROUPS.map((g) => (
          <nav key={g.label} aria-labelledby={`ft-${g.label}`}>
            <h2 id={`ft-${g.label}`} className="mb-3 text-small font-semibold text-text">
              {t(g.label)}
            </h2>
            <ul className="flex flex-col gap-1">
              {g.items.map((k) => (
                <li key={k}>
                  <Link
                    href={ROUTES[k]}
                    className="inline-flex min-h-9 items-center text-small text-text-muted underline-offset-4 transition-colors duration-200 hover:text-text hover:underline"
                  >
                    {t(k)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="rk-container flex flex-col gap-4 border-t border-border/20 py-6 md:flex-row md:items-center md:justify-between">
        <p className="text-caption text-text-muted">
          {t('rights', { year: new Date().getFullYear() })}
        </p>
        <A11yTools />
      </div>
    </footer>
  );
}
