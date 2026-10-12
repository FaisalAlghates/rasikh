import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Header } from '@/components/Header';
import { Link } from '@/i18n/navigation';

export type LegalKind = 'privacy' | 'terms' | 'disclaimers';

/** A static legal page. Text lives in the `legal` messages; every page says it is a draft until a lawyer approves it. */
export async function LegalPage({ locale, kind }: { locale: string; kind: LegalKind }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  const sections = t.raw(`${kind}.sections`) as Array<{ h: string; p: string }>;
  return (
    <>
      <Header showTheme={false} />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 pb-24 pt-6" id="main">
        <h1 className="text-h2 font-semibold">{t(`${kind}.title`)}</h1>
        <p
          role="note"
          data-testid="legal-draft"
          className="hairline rounded-md bg-surface p-4 text-small text-warning"
        >
          {t('draftNotice')}
        </p>
        <p className="text-small text-text-muted">{t('updated')}</p>
        {sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-2">
            <h2 className="text-h3 font-semibold">{s.h}</h2>
            <p className="text-body leading-relaxed">{s.p}</p>
          </section>
        ))}
        <Link href="/" className="text-brand-text underline">
          {t('back')}
        </Link>
      </main>
    </>
  );
}
