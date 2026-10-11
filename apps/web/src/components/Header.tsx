'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

export function Header({ showTheme = true }: { showTheme?: boolean }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === 'ar' ? 'en' : 'ar';

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-3 text-brand-text">
        <BrandMark size={28} />
        <span className="display-font text-h3 text-text">{t('appName')}</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href={pathname}
          locale={other}
          lang={other}
          className="hairline inline-flex min-h-11 items-center rounded-md px-3 text-small text-text-muted transition-colors duration-200 hover:text-text"
        >
          {t('switchLanguage')}
        </Link>
        {showTheme && <ThemeToggle />}
      </div>
    </header>
  );
}
