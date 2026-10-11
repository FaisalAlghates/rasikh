'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { BrandMark } from './BrandMark';

export function Header() {
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
      <Link
        href={pathname}
        locale={other}
        className="hairline rounded-md px-3 py-1.5 text-small text-text-muted transition-colors duration-200 hover:text-text"
      >
        {t('switchLanguage')}
      </Link>
    </header>
  );
}
