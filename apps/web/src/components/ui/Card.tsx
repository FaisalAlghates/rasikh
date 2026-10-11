import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

/** Hairline card, no shadow. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('hairline rounded-lg bg-surface p-5', className)} />;
}

export function StatTile({
  label,
  value,
  note,
  className,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col gap-1', className)}>
      <span className="text-small text-text-muted">{label}</span>
      <span className="display-font tabular text-h1 text-text">{value}</span>
      {note && <span className="text-caption text-text-muted">{note}</span>}
    </Card>
  );
}

export type Status = 'ok' | 'warn' | 'late';
const statusColor: Record<Status, string> = {
  ok: 'text-success',
  warn: 'text-warning',
  late: 'text-danger',
};

export function StatusDot({ status, label }: { status: Status; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-caption', statusColor[status])}>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
