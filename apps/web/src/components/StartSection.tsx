'use client';

import { Button } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { PREF, writePref } from '@/lib/prefs';

/** Starts a section: remembers it on this device so onboarding opens on it after sign-in. */
export function StartSection({ section, label }: { section: string; label: string }) {
  return (
    <Button asChild size="lg">
      <Link href="/auth" onClick={() => writePref(PREF.section, section)} data-start={section}>
        {label}
      </Link>
    </Button>
  );
}
