import { useTranslations } from 'next-intl';
import { referenceFor } from '@/lib/eng/styleReferences';

/** A real photograph that stands for a design language, with its author and licence. */
export function StylePhoto({
  style,
  compact = false,
}: {
  style: string | undefined;
  compact?: boolean;
}) {
  const t = useTranslations('eng');
  const ref = referenceFor(style);
  if (!ref || !style) return null;
  return (
    <figure className="flex flex-col gap-1" data-testid="style-photo" data-style-photo={style}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ref.file}
        alt={t(`photoAlt.${style}`)}
        loading="lazy"
        className={`w-full rounded-lg object-cover ${compact ? 'h-32' : 'aspect-[16/9]'}`}
      />
      <figcaption className="text-caption text-text-muted">
        {t('realReference')} · {ref.artist} ·{' '}
        <a href={ref.licenseUrl} className="underline" rel="noreferrer">
          {ref.license}
        </a>{' '}
        ·{' '}
        <a href={ref.source} className="underline" rel="noreferrer">
          {t('photoSource')}
        </a>
      </figcaption>
    </figure>
  );
}
