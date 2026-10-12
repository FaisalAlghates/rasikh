/**
 * The one interface every model sits behind (CLAUDE.md §7: Gemini via Vertex AI by default, Claude optional).
 * Only the fake provider exists until a paid provider is chosen; switching is `AI_PROVIDER=vertex|claude` plus the
 * key in Secret Manager and one new class here: no flow changes.
 */
export interface ModelRequest {
  system: string;
  prompt: string;
}
export interface ModelReply {
  text: string;
}
export interface ModelProvider {
  readonly name: string;
  generate(req: ModelRequest): Promise<ModelReply>;
}

/**
 * Deterministic stand-in with no cost and no network. It "writes" by passing the prompt's FACTS section through,
 * so the product behaves end to end (and tests are stable) without a model. It never invents anything.
 */
export class FakeModelProvider implements ModelProvider {
  readonly name = 'fake';
  async generate(req: ModelRequest): Promise<ModelReply> {
    const marker = 'الحقائق:';
    const i = req.prompt.indexOf(marker);
    const facts = i >= 0 ? req.prompt.slice(i + marker.length).trim() : req.prompt.trim();
    return { text: facts };
  }
}

export class ProviderNotConfigured extends Error {
  constructor(name: string) {
    super(`provider_not_configured:${name}`);
  }
}

/** Chooses the provider from `AI_PROVIDER` (default `fake`). Real providers are added here when approved. */
export function providerFromEnv(
  env: Record<string, string | undefined> = process.env,
): ModelProvider {
  const name = env.AI_PROVIDER ?? 'fake';
  if (name === 'fake') return new FakeModelProvider();
  throw new ProviderNotConfigured(name);
}
