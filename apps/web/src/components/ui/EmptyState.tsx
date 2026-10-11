import type { ReactNode } from 'react';
import { ShurfaDivider } from './Shurfa';

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="hairline flex flex-col items-center gap-4 rounded-lg px-6 py-12 text-center">
      <div className="w-24">
        <ShurfaDivider />
      </div>
      <h3 className="text-h3 font-semibold text-text">{title}</h3>
      {body && <p className="max-w-sm text-small text-text-muted">{body}</p>}
      {action}
    </div>
  );
}
