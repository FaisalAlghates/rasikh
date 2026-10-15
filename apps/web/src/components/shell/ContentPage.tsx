import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from './Breadcrumbs';
import { PageFeedback } from './PageFeedback';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

/**
 * Template for every content page (DGA content page): header, breadcrumbs, one h1 with a lead,
 * the body, the "was this page helpful?" section, then the footer.
 */
export function ContentPage({
  title,
  lead,
  trail = [],
  children,
  feedback = true,
  wide = false,
}: {
  title: string;
  lead?: string;
  /** Crumbs between Home and this page. */
  trail?: Crumb[];
  children: ReactNode;
  feedback?: boolean;
  wide?: boolean;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="rk-container pb-20 outline-none">
        <Breadcrumbs items={[...trail, { label: title }]} />
        <div className={wide ? '' : 'max-w-[45rem]'}>
          <header className="mb-10 flex flex-col gap-4 pt-4">
            <h1 className="display-font text-h1 md:text-d2">{title}</h1>
            {lead && <p className="text-h3 font-normal text-text-muted">{lead}</p>}
          </header>
        </div>
        {children}
        {feedback && (
          <div className="max-w-[45rem]">
            <PageFeedback />
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
