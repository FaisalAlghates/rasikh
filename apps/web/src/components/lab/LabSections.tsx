'use client';

import { Plus, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { HeroScene } from '@/components/HeroScene';
import {
  ArchImage,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  GlassPanel,
  IconButton,
  PropertyCard,
  Select,
  Sheet,
  ShurfaDivider,
  ShurfaLoader,
  Skeleton,
  StatTile,
  StatusDot,
  Tabs,
  Timeline,
  useToast,
} from '@/components/ui';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-small font-medium uppercase tracking-wide text-text-muted">{title}</h3>
      {children}
    </section>
  );
}

export function LabSections() {
  const t = useTranslations('lab');
  const toast = useToast();
  const [type, setType] = useState<string>();
  const uid = useId();

  return (
    <div className="flex flex-col gap-10">
      <Block title={t('buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t('primary')}</Button>
          <Button variant="quiet">{t('quiet')}</Button>
          <Button variant="ghost">{t('ghost')}</Button>
          <Button loading aria-label={t('loading')}>
            {t('loading')}
          </Button>
          <IconButton label={t('addUnit')}>
            <Plus size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </Block>

      <Block title={t('fields')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${uid}-unit`} label={t('fieldLabel')} hint={t('fieldHint')} />
          <Field id={`${uid}-err`} label={t('fieldLabel')} error={t('fieldError')} />
          <Select
            label={t('selectLabel')}
            placeholder={t('selectPlaceholder')}
            value={type}
            onValueChange={setType}
            options={[
              { value: 'studio', label: t('studio') },
              { value: 'apartment', label: t('apartment') },
              { value: 'villa', label: t('villa') },
            ]}
          />
        </div>
      </Block>

      <Block title={t('overlays')}>
        <div className="flex flex-wrap gap-3">
          <Dialog
            trigger={<Button variant="quiet">{t('openDialog')}</Button>}
            title={t('dialogTitle')}
            description={t('dialogBody')}
          >
            <Button>{t('confirm')}</Button>
          </Dialog>
          <Sheet
            trigger={<Button variant="quiet">{t('openSheet')}</Button>}
            title={t('sheetTitle')}
          >
            <Select
              label={t('selectLabel')}
              placeholder={t('selectPlaceholder')}
              options={[
                { value: 'studio', label: t('studio') },
                { value: 'apartment', label: t('apartment') },
              ]}
            />
          </Sheet>
          <Button variant="quiet" onClick={() => toast(t('toastMsg'), 'success')}>
            {t('showToast')}
          </Button>
        </div>
      </Block>

      <Block title={t('tabs')}>
        <Tabs
          label={t('tabsLabel')}
          items={[
            {
              value: 'a',
              label: t('tabA'),
              content: <p className="text-text-muted">{t('tabContent')}</p>,
            },
            {
              value: 'b',
              label: t('tabB'),
              content: <p className="text-text-muted">{t('tabContent')}</p>,
            },
          ]}
        />
      </Block>

      <Block title={t('cards')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label={t('statRent')} value="38,500" note={t('statNote')} />
          <PropertyCard
            title={t('propTitle')}
            place={t('propPlace')}
            meta={t('propMeta')}
            status="ok"
            statusLabel={t('statusOk')}
            image={<HeroScene className="absolute inset-0 h-full w-full" />}
          />
        </div>
        <div className="flex gap-6">
          <StatusDot status="ok" label={t('statusOk')} />
          <StatusDot status="late" label={t('statusLate')} />
        </div>
      </Block>

      <Block title={t('timeline')}>
        <Timeline
          label={t('timeline')}
          events={[
            { id: '1', date: '2026-01-05', title: t('dialogTitle'), detail: t('dialogBody') },
            { id: '2', date: '2026-06-18', title: t('statRent') },
          ]}
        />
      </Block>

      <Block title={t('empty')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            title={t('emptyTitle')}
            body={t('emptyBody')}
            action={<Button variant="quiet">{t('addUnit')}</Button>}
          />
          <Card className="flex flex-col gap-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16" />
            <ShurfaLoader label={t('loading')} />
          </Card>
        </div>
      </Block>

      <Block title={t('glass')}>
        <div className="relative isolate h-48 overflow-hidden rounded-lg">
          <HeroScene className="absolute inset-0 -z-10 h-full w-full" />
          <GlassPanel className="absolute inset-x-4 top-4 flex items-center gap-3 px-4 py-3">
            <Search size={18} aria-hidden="true" className="text-text-muted" />
            <span className="text-small text-text-muted">{t('glassSample')}</span>
          </GlassPanel>
        </div>
      </Block>

      <Block title={`${t('arch')} · ${t('shurfa')}`}>
        <div className="flex items-end gap-6">
          <div className="w-28">
            <ArchImage>
              <HeroScene className="absolute inset-0 h-full w-full" />
            </ArchImage>
          </div>
          <div className="flex-1">
            <ShurfaDivider />
          </div>
        </div>
      </Block>
    </div>
  );
}
