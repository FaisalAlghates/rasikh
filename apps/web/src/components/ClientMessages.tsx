import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';

/**
 * Sends only the listed message namespaces to the browser, so each route ships the
 * strings it needs instead of the whole catalogue (keeps the landing page light).
 * A nested provider replaces the outer messages, so list `nav` too wherever the shared header renders.
 */
export async function ClientMessages({
  namespaces,
  children,
}: {
  namespaces: string[];
  children: ReactNode;
}) {
  const all = (await getMessages()) as Record<string, unknown>;
  const picked = Object.fromEntries(namespaces.filter((n) => n in all).map((n) => [n, all[n]]));
  return <NextIntlClientProvider messages={picked}>{children}</NextIntlClientProvider>;
}
