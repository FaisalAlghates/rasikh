'use client';

import { deleteDoc, doc, limit, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { CheckCircle2, Mail, ShieldAlert, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { OfficeVerification } from './OfficeVerification';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { ShurfaLoader } from '@/components/ui/Shurfa';
import { Tabs } from '@/components/ui/Tabs';
import { cn } from '@/components/ui/cn';
import { Link, useRouter } from '@/i18n/navigation';
import { firebaseDb } from '@/lib/firebase';
import { ROUTES } from '@/lib/nav';
import { useCollectionAt, type Row } from '@/lib/ops/hooks';
import { useUser } from '@/lib/use-user';

interface Stamp {
  toDate(): Date;
}
interface MessageDoc {
  name: string;
  email: string;
  topic: string;
  message: string;
  locale: string;
  createdAt?: Stamp;
  status?: 'new' | 'handled';
}
interface FeedbackDoc {
  page: string;
  helpful: boolean;
  reasons: string[];
  comment: string;
  createdAt?: Stamp;
}

/**
 * The Rasikh team inbox: public contact messages and "was this page helpful?" answers. Only a platform
 * admin (a custom claim set with the Admin SDK) may open it; the Firestore rules enforce the same.
 */
export function AdminInbox() {
  const t = useTranslations('admin');
  const nav = useTranslations('nav');
  const c = useTranslations('common');
  const eng = useTranslations('eng');
  const router = useRouter();
  const user = useUser();
  const [allowed, setAllowed] = useState<boolean>();

  useEffect(() => {
    if (user === null) router.replace('/auth');
    if (!user) return;
    let on = true;
    void user.getIdTokenResult(true).then((r) => on && setAllowed(r.claims.platformAdmin === true));
    return () => {
      on = false;
    };
  }, [user, router]);

  const msgQ = useMemo(() => [orderBy('createdAt', 'desc'), limit(200)], []);
  const fbQ = useMemo(() => [orderBy('createdAt', 'desc'), limit(500)], []);
  const messages = useCollectionAt<MessageDoc>('siteMessages', msgQ, allowed === true);
  const feedback = useCollectionAt<FeedbackDoc>('siteFeedback', fbQ, allowed === true);

  const head = (
    <>
      <Breadcrumbs items={[{ label: t('title') }]} />
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="display-font text-h1">{t('title')}</h1>
        <p className="text-body text-text-muted">{t('lead')}</p>
      </header>
    </>
  );

  if (allowed === undefined) {
    return (
      <div className="flex justify-center py-24">
        <ShurfaLoader label={c('loading')} />
      </div>
    );
  }
  if (!allowed) {
    return (
      <>
        {head}
        <div
          data-testid="admin-no-access"
          className="hairline flex max-w-[45rem] items-start gap-4 rounded-xl bg-surface p-6"
        >
          <ShieldAlert size={24} aria-hidden="true" className="mt-1 shrink-0 text-warning" />
          <div className="flex flex-col gap-2">
            <h2 className="text-h3 font-semibold">{t('noAccess')}</h2>
            <p className="text-body text-text-muted">{t('noAccessBody')}</p>
            <Link href={ROUTES.home} className="text-brand-text underline underline-offset-4">
              {nav('home')}
            </Link>
          </div>
        </div>
      </>
    );
  }

  const fresh = messages.rows.filter((m) => (m.data.status ?? 'new') === 'new').length;
  return (
    <>
      {head}
      <Tabs
        label={t('title')}
        items={[
          {
            value: 'messages',
            label: `${t('tabMessages')} (${fresh})`,
            content: <Messages rows={messages.rows} loading={messages.loading} />,
          },
          {
            value: 'feedback',
            label: t('tabFeedback'),
            content: <Feedback rows={feedback.rows} loading={feedback.loading} />,
          },
          { value: 'offices', label: eng('admin.tab'), content: <OfficeVerification /> },
        ]}
      />
    </>
  );
}

function useDate() {
  const locale = useLocale();
  return useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      }),
    [locale],
  );
}

function Messages({ rows, loading }: { rows: Row<MessageDoc>[]; loading: boolean }) {
  const t = useTranslations('admin');
  const fmt = useDate();
  const [show, setShow] = useState<'new' | 'handled' | 'all'>('new');
  const [error, setError] = useState<string>();
  const [toDelete, setToDelete] = useState<string>();
  const status = (m: MessageDoc) => m.status ?? 'new';
  const visible = rows.filter((r) => show === 'all' || status(r.data) === show);
  const count = (s: 'new' | 'handled' | 'all') =>
    s === 'all' ? rows.length : rows.filter((r) => status(r.data) === s).length;

  const act = async (fn: () => Promise<void>) => {
    setError(undefined);
    try {
      await fn();
    } catch {
      setError(t('failed'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label={t('tabMessages')} className="flex flex-wrap gap-2">
        {(['new', 'handled', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={show === s}
            onClick={() => setShow(s)}
            className={cn(
              'hairline inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-small',
              show === s ? 'bg-brand text-on-brand' : 'text-text hover:bg-surface',
            )}
          >
            {t(`filter.${s}`)}
            <span className="tabular opacity-80">{count(s)}</span>
          </button>
        ))}
      </div>
      <p className="text-caption text-text-muted">{t('privacyNote')}</p>
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      {loading ? null : visible.length === 0 ? (
        <p className="text-body text-text-muted">{t('noMessages')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((r) => {
            const m = r.data;
            const done = status(m) === 'handled';
            return (
              <li
                key={r.id}
                data-testid="admin-message"
                className="hairline flex flex-col gap-3 rounded-xl bg-surface p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-body font-semibold">{m.name}</p>
                    <p className="text-small text-text-muted" dir="ltr">
                      {m.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-caption">
                    <span className="rounded-full bg-brand/15 px-2.5 py-1 font-semibold text-brand-text">
                      {t.has(`topics.${m.topic}`) ? t(`topics.${m.topic}`) : m.topic}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 font-semibold',
                        done ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning',
                      )}
                    >
                      {done ? t('status.handled') : t('status.new')}
                    </span>
                    {m.createdAt && (
                      <span className="tabular text-text-muted">
                        {fmt.format(m.createdAt.toDate())}
                      </span>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-body">{m.message}</p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="quiet">
                    <a
                      href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(t('replySubject'))}`}
                    >
                      <Mail size={16} aria-hidden="true" />
                      {t('reply')}
                    </a>
                  </Button>
                  {!done && (
                    <Button
                      variant="quiet"
                      onClick={() =>
                        void act(() =>
                          updateDoc(doc(firebaseDb(), 'siteMessages', r.id), {
                            status: 'handled',
                            handledAt: serverTimestamp(),
                          }),
                        )
                      }
                    >
                      <CheckCircle2 size={16} aria-hidden="true" />
                      {t('markHandled')}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setToDelete(r.id)}>
                    <Trash2 size={16} aria-hidden="true" />
                    {t('delete')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        trigger={<span hidden />}
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(undefined)}
        title={t('deleteTitle')}
        description={t('deleteBody')}
      >
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              const id = toDelete;
              setToDelete(undefined);
              if (id) void act(() => deleteDoc(doc(firebaseDb(), 'siteMessages', id)));
            }}
          >
            {t('deleteConfirm')}
          </Button>
          <Button variant="quiet" onClick={() => setToDelete(undefined)}>
            {t('cancel')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Feedback({ rows, loading }: { rows: Row<FeedbackDoc>[]; loading: boolean }) {
  const t = useTranslations('admin');
  const reason = useTranslations('nav.feedback.reason');
  const fmt = useDate();
  const pct = useMemo(() => new Intl.NumberFormat('en-US', { style: 'percent' }), []);

  const pages = useMemo(() => {
    const m = new Map<string, { yes: number; no: number; reasons: Map<string, number> }>();
    for (const { data: f } of rows) {
      const p = m.get(f.page) ?? { yes: 0, no: 0, reasons: new Map<string, number>() };
      if (f.helpful) p.yes++;
      else p.no++;
      for (const r of f.reasons ?? []) p.reasons.set(r, (p.reasons.get(r) ?? 0) + 1);
      m.set(f.page, p);
    }
    return [...m.entries()].sort((a, b) => b[1].yes + b[1].no - (a[1].yes + a[1].no));
  }, [rows]);
  const comments = rows.filter((r) => r.data.comment?.trim()).slice(0, 30);

  if (loading) return null;
  if (rows.length === 0) return <p className="text-body text-text-muted">{t('noFeedback')}</p>;
  return (
    <div className="flex flex-col gap-8">
      <div className="hairline overflow-x-auto rounded-xl bg-surface">
        <table className="w-full text-start text-small" data-testid="feedback-table">
          <thead>
            <tr className="border-b border-border/20 text-text-muted">
              <th scope="col" className="p-3 text-start font-semibold">
                {t('page')}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {t('responses')}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {t('helpful')}
              </th>
              <th scope="col" className="p-3 text-start font-semibold">
                {t('reasonsCol')}
              </th>
            </tr>
          </thead>
          <tbody>
            {pages.map(([page, p]) => {
              const top = [...p.reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
              return (
                <tr key={page} className="border-b border-border/10 last:border-0">
                  <td className="p-3" dir="ltr">
                    {page}
                  </td>
                  <td className="tabular p-3">{p.yes + p.no}</td>
                  <td className="tabular p-3">{pct.format(p.yes / (p.yes + p.no))}</td>
                  <td className="p-3 text-text-muted">
                    {top.map(([r, n]) => `${reason.has(r) ? reason(r) : r} (${n})`).join('، ')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {comments.length > 0 && (
        <section aria-labelledby="fb-comments" className="flex flex-col gap-3">
          <h2 id="fb-comments" className="text-h3 font-semibold">
            {t('recentComments')}
          </h2>
          <ul className="flex flex-col gap-2">
            {comments.map((r) => (
              <li key={r.id} className="hairline flex flex-col gap-1 rounded-lg bg-surface p-4">
                <p className="flex flex-wrap items-center gap-2 text-caption text-text-muted">
                  <span dir="ltr">{r.data.page}</span>·
                  <span>{r.data.helpful ? t('helpfulYes') : t('helpfulNo')}</span>
                  {r.data.createdAt && (
                    <>
                      ·<span className="tabular">{fmt.format(r.data.createdAt.toDate())}</span>
                    </>
                  )}
                </p>
                <p className="text-body">{r.data.comment}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
