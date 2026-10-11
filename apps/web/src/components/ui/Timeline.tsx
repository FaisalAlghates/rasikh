import type { ReactNode } from 'react';

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  detail?: string;
  icon?: ReactNode;
}

/** Property Health Record: vertical timeline, one clay node per event. */
export function Timeline({ events, label }: { events: TimelineEvent[]; label: string }) {
  return (
    <ol aria-label={label} className="relative flex flex-col gap-8">
      <span aria-hidden="true" className="absolute inset-y-2 start-[7px] w-px bg-border/40" />
      {events.map((e) => (
        <li key={e.id} className="relative ps-9">
          <span
            aria-hidden="true"
            className="absolute start-0 top-1.5 size-[15px] rounded-full border-2 border-bg bg-brand"
          />
          <p className="tabular text-caption text-text-muted">{e.date}</p>
          <p className="text-body font-medium text-text">{e.title}</p>
          {e.detail && <p className="mt-0.5 text-small text-text-muted">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}
