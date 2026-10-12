import { genkit, z } from 'genkit';
import type { ModelProvider } from './provider.js';

/** Every feature is one Genkit flow with typed input and output; the model behind them is the provider interface. */
export const FEATURES = [
  'explainLease',
  'compareInspections',
  'triageTicket',
  'adHelper',
  'buildingSummary',
  'assistant',
] as const;
export type Feature = (typeof FEATURES)[number];

const PhraseIn = z.object({
  facts: z.string().max(8000),
  question: z.string().max(2000).optional(),
});
const PhraseOut = z.object({ text: z.string() });

/** What each flow tells the model: write only from the facts, in Arabic, never rule on law, value or money. */
const SYSTEM = (task: string) =>
  `أنت مساعد داخل منصة راسخ لإدارة العقار في السعودية. المهمة: ${task}. اكتب بالعربية الفصحى المبسطة وبإيجاز. ` +
  'استخدم الحقائق المعطاة فقط ولا تخترع أرقاماً أو بنوداً. لا تعطِ رأياً قانونياً ولا تقييماً رسمياً ولا نصيحة مالية. ' +
  'لا تقل إن شيئاً مطابق للنظام أو مخالف له.';

const TASKS: Record<Feature, string> = {
  explainLease: 'اشرح للمستخدم عقد الإيجار بكلمات بسيطة من الحقائق',
  compareInspections: 'لخّص الفروق بين فحص الاستلام وفحص التسليم من الحقائق',
  triageTicket: 'اقترح تصنيف طلب الصيانة وأولويته من الحقائق',
  adHelper: 'ساعد الوسيط في اكتمال بيانات الإعلان وصياغة وصف من الحقائق',
  buildingSummary: 'لخّص وضع العمارة المالي من الحقائق',
  assistant: 'أجب عن سؤال المستخدم عن عقاراته من الحقائق المتاحة له فقط',
};

/** Builds the Genkit instance for one provider. Created once per cold start, or per test. */
export function createRuntime(provider: ModelProvider) {
  const ai = genkit({});
  const model = ai.defineModel({ name: `rasikh/${provider.name}` }, async (request) => {
    const text = (role: string) =>
      request.messages
        .filter((m) => m.role === role)
        .flatMap((m) => m.content.map((c) => c.text ?? ''))
        .join('\n');
    const reply = await provider.generate({ system: text('system'), prompt: text('user') });
    return { message: { role: 'model', content: [{ text: reply.text }] }, finishReason: 'stop' };
  });

  const flows = Object.fromEntries(
    FEATURES.map((feature) => [
      feature,
      ai.defineFlow(
        { name: feature, inputSchema: PhraseIn, outputSchema: PhraseOut },
        async (input) => {
          const res = await ai.generate({
            model,
            system: SYSTEM(TASKS[feature]),
            prompt: `${input.question ? `السؤال: ${input.question}\n` : ''}الحقائق:\n${input.facts}`,
          });
          return { text: res.text };
        },
      ),
    ]),
  ) as unknown as Record<
    Feature,
    (input: z.infer<typeof PhraseIn>) => Promise<z.infer<typeof PhraseOut>>
  >;

  return { provider, flows };
}
export type Runtime = ReturnType<typeof createRuntime>;
