'use client';

import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { PREF, writePref } from '@/lib/prefs';

/** A product section on the landing page: remembers the choice, then goes on to sign-in or onboarding. */
export function SectionCard({
  section,
  title,
  body,
  badge,
}: {
  section: string;
  title: string;
  body: string;
  badge: string;
}) {
  return (
    <Link
      href="/auth"
      onClick={() => writePref(PREF.section, section)}
      className="group flex h-full flex-col gap-3 p-7"
      data-section={section}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="depth-1 text-h2 font-semibold">{title}</span>
        <ArrowRight
          size={22}
          aria-hidden="true"
          className="depth-2 text-brand-text transition-transform duration-300 ease-rk rtl:rotate-180 rtl:group-hover:-translate-x-2 ltr:group-hover:translate-x-2"
        />
      </span>
      <span className="text-text/75">{body}</span>
      <span className="mt-auto w-fit rounded-full border border-brand px-3 py-1 text-caption text-brand-text">
        {badge}
      </span>
    </Link>
  );
}
