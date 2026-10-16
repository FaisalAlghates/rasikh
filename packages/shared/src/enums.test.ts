import { describe, expect, it } from 'vitest';
import { PRODUCT_SECTIONS, SECTION_ROLES, SELF_SERVICE_ROLES } from './enums.js';

describe('product sections', () => {
  it('puts every self-service role in exactly one section', () => {
    for (const role of SELF_SERVICE_ROLES) {
      const homes = PRODUCT_SECTIONS.filter((s) => SECTION_ROLES[s].includes(role));
      expect(homes, role).toHaveLength(1);
    }
  });
});
