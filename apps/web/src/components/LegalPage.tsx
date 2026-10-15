import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContentPage } from '@/components/shell/ContentPage';

export type LegalKind = 'privacy' | 'terms' | 'disclaimers';

/** A static legal page. Text lives in the `legal` messages; every page says it is a draft until a lawyer approves it. */
export async function LegalPage({ locale, kind }: { locale: string; kind: LegalKind }) {
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'legal' });
  const sections = t.raw(`${kind}.sections`) as Array<{ h: string; p: string; id?: string }>;
  return (
    <ContentPage title={t(`${kind}.title`)}>
      <div className="flex max-w-[45rem] flex-col gap-6">
        <p
          role="note"
          data-testid="legal-draft"
          className="hairline rounded-md bg-surface p-4 text-small text-warning"
        >
          {t('draftNotice')}
        </p>
        <p className="text-small text-text-muted">{t('updated')}</p>
        {sections.map((s) => (
          <section key={s.h} id={s.id} className="flex scroll-mt-24 flex-col gap-2">
            <h2 className="text-h3 font-semibold">{s.h}</h2>
            <p className="text-body leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
    </ContentPage>
  );
}
