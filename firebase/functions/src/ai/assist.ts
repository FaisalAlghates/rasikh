import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import {
  InputSchemas,
  gatherAdHelper,
  gatherAssistant,
  gatherBuildingSummary,
  gatherCompare,
  gatherExplainLease,
  gatherTriage,
  textOf,
  type Citation,
  type FeatureCtx,
  type Gathered,
} from './features.js';
import { AI_LABEL, DISCLAIMERS, REFUSALS, classifyScope, type Disclaimer } from './guard.js';
import { logMetadata, reserve, unitsFor, type AiLimits, type AiLogEntry } from './limits.js';
import { FEATURES, type Feature, type Runtime } from './runtime.js';

export interface AssistDeps {
  db: Firestore;
  runtime: Runtime;
  now?: () => Date;
  limits?: AiLimits;
}

const Request = z.object({
  orgId: z.string().min(1),
  feature: z.enum(FEATURES),
  input: z.record(z.string(), z.unknown()).default({}),
});

export type AssistResult =
  | {
      ok: true;
      /** Always true: the client must mark this output as AI-made and never apply it without a tap. */
      ai: true;
      label: string;
      text: string;
      citations: Citation[];
      suggestion?: Record<string, unknown>;
      disclaimers: string[];
    }
  | { ok: false; refused: 'off_topic' | 'jailbreak' | 'empty' | 'too_long'; message: string };

const RIYADH_OFFSET_MS = 3 * 3600_000;

/**
 * The single entry for every AI feature. Order matters: sign-in and membership, input shape, scope classifier,
 * then the data the person is allowed to see, then rate/cost limits, and only then the model. Metadata is logged
 * for every outcome; the message and the answer never are.
 */
export async function aiAssist(
  deps: AssistDeps,
  uid: string | undefined,
  raw: unknown,
): Promise<AssistResult> {
  if (!uid) throw new HttpsError('unauthenticated', 'auth_required');
  const parsed = Request.safeParse(raw);
  if (!parsed.success) throw new HttpsError('invalid-argument', 'invalid_input');
  const { orgId, feature } = parsed.data;
  const provider = deps.runtime.provider.name;
  const log = (outcome: AiLogEntry['outcome'], inChars: number, outChars = 0) =>
    logMetadata(deps.db, orgId, { uid, feature, outcome, provider, inChars, outChars });

  const member = await deps.db.doc(`orgs/${orgId}/members/${uid}`).get();
  if (!member.exists) {
    await log('denied', 0);
    throw new HttpsError('permission-denied', 'not_allowed');
  }
  const roles = (member.data()?.roles ?? []) as string[];

  const inputParsed = InputSchemas[feature].safeParse(parsed.data.input);
  if (!inputParsed.success) {
    await log('refused_input', 0);
    throw new HttpsError('invalid-argument', 'invalid_input');
  }
  const input = inputParsed.data as Record<string, unknown>;
  const text = textOf(feature, input);
  const inChars = JSON.stringify(input).length;

  const scope = classifyScope(text);
  if (!scope.allowed) {
    await log(scope.reason === 'jailbreak' ? 'refused_jailbreak' : 'refused_off_topic', inChars);
    return { ok: false, refused: scope.reason, message: REFUSALS[scope.reason] };
  }

  const now = (deps.now ?? (() => new Date()))();
  const ctx: FeatureCtx = {
    db: deps.db,
    orgId,
    uid,
    roles,
    today: new Date(now.getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10),
  };
  let gathered: Gathered;
  try {
    gathered = await gather(feature, ctx, input);
  } catch (e) {
    if (e instanceof HttpsError && e.code === 'permission-denied') await log('denied', inChars);
    throw e;
  }

  const factsText = gathered.facts.join('\n');
  const reservation = await reserve(deps.db, {
    orgId,
    uid,
    now,
    estimatedUnits: unitsFor(factsText.length + inChars + 800),
    ...(deps.limits ? { limits: deps.limits } : {}),
  });
  if (!reservation.ok) {
    await log('limited', inChars);
    throw new HttpsError('resource-exhausted', reservation.reason);
  }

  let reply: string;
  try {
    const question = feature === 'assistant' ? String(input.question) : undefined;
    reply = (
      await deps.runtime.flows[feature]({ facts: factsText, ...(question ? { question } : {}) })
    ).text;
  } catch {
    await log('failed', inChars);
    throw new HttpsError('unavailable', 'ai_unavailable');
  }

  const disclaimers = scope.disclaimers.map((d: Disclaimer) => DISCLAIMERS[d]);
  await log('answered', inChars, reply.length);
  return {
    ok: true,
    ai: true,
    label: AI_LABEL,
    text: reply,
    citations: gathered.citations,
    ...(gathered.suggestion ? { suggestion: gathered.suggestion } : {}),
    disclaimers,
  };
}

function gather(
  feature: Feature,
  ctx: FeatureCtx,
  input: Record<string, unknown>,
): Promise<Gathered> {
  switch (feature) {
    case 'explainLease':
      return gatherExplainLease(ctx, input as { leaseId: string });
    case 'compareInspections':
      return gatherCompare(ctx, input as { inspectionId: string });
    case 'triageTicket':
      return gatherTriage(ctx, input as { title: string; description: string });
    case 'adHelper':
      return gatherAdHelper(ctx, input as Parameters<typeof gatherAdHelper>[1]);
    case 'buildingSummary':
      return gatherBuildingSummary(ctx, input as { buildingId: string });
    case 'assistant':
      return gatherAssistant(ctx, String(input.question ?? ''));
  }
}
