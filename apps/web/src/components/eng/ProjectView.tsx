'use client';

import { VARIANTS, generatePlan, requiredDisciplines, type PlanRoom } from '@rasikh/shared';
import { addDoc, collection, serverTimestamp, where } from 'firebase/firestore';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { ShurfaLoader } from '@/components/ui/Shurfa';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { useRouter } from '@/i18n/navigation';
import { firebaseDb } from '@/lib/firebase';
import {
  planSha,
  rulePackPath,
  useDocAt,
  type ApprovalDoc,
  type EngineerDoc,
  type OfficeDoc,
  type ProjectDoc,
  type RulePackDoc,
  type SettingsRatesDoc,
  type VersionDoc,
} from '@/lib/eng/data';
import { useCollectionAt } from '@/lib/ops/hooks';
import { readClaims, useUser } from '@/lib/use-user';
import { BriefPanel } from './BriefPanel';
import { ConceptsPanel } from './ConceptsPanel';
import { HandOffPanel } from './HandOffPanel';
import { LibraryPanel } from './LibraryPanel';
import { DisciplinesPanel } from './DisciplinesPanel';
import { Model3D } from './Model3D';
import { PlanEditor } from './PlanEditor';
import {
  ApprovalsPanel,
  CommentsPanel,
  ConditionPanel,
  PermitPanel,
  QuotesPanel,
} from './ProjectPanels';
import { Sheets } from './Sheets';

/** One design project, for the office (every tab) or its client (brief, shared options, released set, comments). */
export function ProjectView({ pid }: { pid: string }) {
  const t = useTranslations('eng');
  const nav = useTranslations('nav');
  const router = useRouter();
  const user = useUser();
  const [roles, setRoles] = useState<string[] | undefined>(undefined);
  const project = useDocAt<ProjectDoc>(`designProjects/${pid}`, !!user);
  const officeId = project?.officeId;

  useEffect(() => {
    if (user === null) router.replace('/auth');
  }, [user, router]);
  useEffect(() => {
    if (!user || !officeId) return;
    void readClaims(user, true).then((c) => setRoles(c.orgs[officeId] ?? []));
  }, [user, officeId]);

  const officeMember = !!roles?.some((r) => r === 'office_lead' || r === 'engineer');
  const isLead = !!roles?.includes('office_lead');
  const isClient = !!user && project?.clientUid === user.uid;
  const office = useDocAt<OfficeDoc>(officeId ? `offices/${officeId}` : undefined);
  const me = useDocAt<EngineerDoc>(
    officeId && user ? `offices/${officeId}/engineers/${user.uid}` : undefined,
    officeMember,
  );
  const pack = useDocAt<RulePackDoc>(officeId ? rulePackPath(officeId) : undefined, officeMember);
  const rates = useDocAt<SettingsRatesDoc>(
    officeId ? `offices/${officeId}/settings/rates` : undefined,
    officeMember,
  );
  // clients may only list what the rules let them read: shared options and released sets
  const clientScope = useMemo(() => [where('status', 'in', ['shared', 'released'])], []);
  const none = useMemo(() => [], []);
  const versions = useCollectionAt<VersionDoc>(
    `designProjects/${pid}/versions`,
    officeMember ? none : clientScope,
    roles !== undefined && !!project,
  );

  const roomLabel = useCallback((r: PlanRoom) => t(`room.${r.type}`), [t]);
  const sorted = [...versions.rows].sort(
    (a, b) => (a.data.createdAt?.toMillis() ?? 0) - (b.data.createdAt?.toMillis() ?? 0),
  );
  const dev = [...sorted].reverse().find((v) => v.data.kind === 'development');
  const released = [...sorted].reverse().find((v) => v.data.status === 'released');
  const existing = sorted.find((v) => v.data.kind === 'existing');
  const overrides = pack?.rules ?? {};
  const working = officeMember ? dev : released;
  const relApprovals = useCollectionAt<ApprovalDoc>(
    released ? `designProjects/${pid}/versions/${released.id}/approvals` : undefined,
  );

  if (project === undefined || roles === undefined || !user) {
    return (
      <div className="flex justify-center py-24">
        <ShurfaLoader label={t('loading')} />
      </div>
    );
  }
  if (project === null || (!officeMember && !isClient)) {
    return <p className="py-16 text-body text-text-muted">{t('failed')}</p>;
  }

  const drawExisting = async () => {
    if (!project.zoning) return;
    const plan = generatePlan(project.plot, project.zoning, project.program, VARIANTS[0]!);
    await addDoc(collection(firebaseDb(), `designProjects/${pid}/versions`), {
      label: t('stateLegend.existing'),
      kind: 'existing',
      status: 'draft',
      plan,
      sha256: await planSha(plan),
      required: project.required ?? requiredDisciplines(project.kind),
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });
  };

  const items: TabItem[] = [
    {
      value: 'brief',
      label: t('tabs.brief'),
      content: <BriefPanel pid={pid} project={project} officeMember={officeMember} />,
    },
    {
      value: 'concepts',
      label: t('tabs.concepts'),
      content: (
        <ConceptsPanel
          pid={pid}
          project={project}
          versions={sorted}
          officeMember={officeMember}
          isClient={isClient}
          uid={user.uid}
          overrides={overrides}
          rates={rates?.rates}
          roomLabel={roomLabel}
          officeName={office?.name ?? ''}
        />
      ),
    },
  ];
  if (officeMember)
    items.push({
      value: 'plan',
      label: t('tabs.plan'),
      content: dev ? (
        <PlanEditor
          pid={pid}
          vid={dev.id}
          version={dev.data}
          project={project}
          canEdit={officeMember}
          overrides={overrides}
          existing={existing?.data.plan}
          roomLabel={roomLabel}
        />
      ) : (
        <p className="text-small text-text-muted">{t('noVersion')}</p>
      ),
    });
  if (working)
    items.push(
      {
        value: 'model3d',
        label: t('tabs.model3d'),
        content: <Model3D plan={working.data.plan} plot={project.plot} name={project.title} />,
      },
      {
        value: 'drawings',
        label: t('tabs.drawings'),
        content: (
          <Sheets
            plan={working.data.plan}
            plot={project.plot}
            program={project.program}
            officeName={office?.name ?? ''}
            projectTitle={project.title}
            versionLabel={working.data.label}
            sha256={working.data.sha256}
            released={working.data.status === 'released'}
            approvals={relApprovals.rows.map(
              (a) => `${t(`discipline.${a.data.discipline}`)}: ${a.data.name} (${a.data.sceNo})`,
            )}
            roomLabel={roomLabel}
          />
        ),
      },
    );
  if (officeMember && dev)
    items.push({
      value: 'disciplines',
      label: t('tabs.disciplines'),
      content: <DisciplinesPanel plan={dev.data.plan} rates={rates?.rates} roomLabel={roomLabel} />,
    });
  if (project.kind === 'renovation')
    items.push({
      value: 'condition',
      label: t('tabs.condition'),
      content: (
        <div className="flex flex-col gap-4">
          {officeMember && !existing && project.zoning && (
            <Button variant="quiet" onClick={() => void drawExisting()}>
              {t('stateLegend.existing')} +
            </Button>
          )}
          {officeMember && existing && (
            <PlanEditor
              pid={pid}
              vid={existing.id}
              version={existing.data}
              project={project}
              canEdit
              overrides={overrides}
              roomLabel={roomLabel}
            />
          )}
          <ConditionPanel pid={pid} existing={existing?.data.plan} canEdit={officeMember} />
        </div>
      ),
    });
  items.push({
    value: 'permit',
    label: t('tabs.permit'),
    content: <PermitPanel pid={pid} project={project} canEdit={officeMember} />,
  });
  if (working)
    items.push({
      value: 'approvals',
      label: t('tabs.approvals'),
      content: (
        <ApprovalsPanel
          pid={pid}
          vid={working.id}
          version={working.data}
          office={office}
          me={me}
          uid={user.uid}
          isLead={isLead}
          officeMember={officeMember}
        />
      ),
    });
  items.push(
    {
      value: 'comments',
      label: t('tabs.comments'),
      content: (
        <CommentsPanel
          pid={pid}
          uid={user.uid}
          name={user.displayName ?? user.email ?? ''}
          officeMember={officeMember}
        />
      ),
    },
    {
      value: 'quotes',
      label: t('tabs.quotes'),
      content: <QuotesPanel pid={pid} isLead={isLead} />,
    },
  );

  return (
    <div className="flex flex-col gap-4" data-testid="project-view">
      <Breadcrumbs
        items={[
          {
            label: officeMember ? nav('workspace') : nav('designProjects'),
            href: officeMember ? '/workspace' : '/design',
          },
          { label: project.title },
        ]}
      />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2 font-semibold">{project.title}</h1>
          <p className="text-small text-text-muted">
            {office?.name} · {t(`kind.${project.kind}`)} ·{' '}
            <span data-testid="project-status">{t(`status.${project.status}`)}</span>
          </p>
        </div>
        {project.status === 'released' ? (
          <p className="rounded-full bg-success/15 px-3 py-1 text-caption font-semibold text-success">
            {t('releasedBadge')}
          </p>
        ) : (
          <p className="rounded-full bg-warning/15 px-3 py-1 text-caption font-semibold text-warning">
            {t('watermark')}
          </p>
        )}
      </header>
      {isClient && project.status === 'released' && released && (
        <HandOffPanel
          pid={pid}
          project={project}
          officeName={office?.name ?? ''}
          version={released}
          user={user}
        />
      )}
      {project.status === 'released' && released && (isClient || isLead) && (
        <LibraryPanel
          pid={pid}
          project={project}
          version={released}
          officeName={office?.name ?? ''}
          isClient={isClient}
          isLead={isLead}
          uid={user.uid}
        />
      )}
      <Tabs label={project.title} items={items} />
    </div>
  );
}
