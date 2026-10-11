import type { ReactNode } from 'react';
import { ArchImage } from './ArchImage';
import { Card, StatusDot, type Status } from './Card';

export function PropertyCard({
  title,
  place,
  meta,
  status,
  statusLabel,
  image,
}: {
  title: string;
  place: string;
  meta?: string;
  status?: Status;
  statusLabel?: string;
  image: ReactNode;
}) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="w-20 shrink-0">
        <ArchImage className="aspect-[3/4]">{image}</ArchImage>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="line-clamp-2 text-body font-medium text-text">{title}</h3>
        <p className="line-clamp-2 text-small text-text-muted">{place}</p>
        {meta && <p className="tabular text-caption text-text-muted">{meta}</p>}
        {status && statusLabel && <StatusDot status={status} label={statusLabel} />}
      </div>
    </Card>
  );
}
