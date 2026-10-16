import { describe, expect, it } from 'vitest';
import { KNOWLEDGE, answerFromKnowledge, designTips } from './knowledge.js';

describe('knowledge base', () => {
  it('has unique ids and both languages for every entry', () => {
    expect(new Set(KNOWLEDGE.map((e) => e.id)).size).toBe(KNOWLEDGE.length);
    for (const e of KNOWLEDGE) {
      expect(e.ar.length, e.id).toBeGreaterThan(20);
      expect(e.en.length, e.id).toBeGreaterThan(20);
      expect(e.words.length, e.id).toBeGreaterThan(0);
    }
  });

  it('answers a question from the matching guide entry', () => {
    expect(answerFromKnowledge('من المسؤول عن تسرب الماء؟')[0]?.id).toBe('maintenance-who');
    expect(answerFromKnowledge('هل راسخ يستلم التأمين؟')[0]?.id).toBe('deposit');
    expect(answerFromKnowledge('كيف الطقس اليوم')).toEqual([]);
  });

  it('picks style- and type-specific tips first and respects the limit', () => {
    const tips = designTips({ style: 'modern_najdi', type: 'villa' }, 4);
    expect(tips).toHaveLength(4);
    expect(tips.every((t) => t.kind === 'design')).toBe(true);
    expect(designTips({ style: 'salmani', type: 'apartments' }).map((t) => t.id)).toContain(
      'style-salmani',
    );
    // never shows a villa-only tip on an apartment building
    expect(designTips({ type: 'apartments' }, 20).map((t) => t.id)).not.toContain('majlis-entry');
  });
});
