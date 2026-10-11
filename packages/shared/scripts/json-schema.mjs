// Emits JSON Schema files from the zod schemas so the Flutter app can generate matching Dart models.
import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import * as s from '../dist/index.js';

mkdirSync(new URL('../dist/json-schema/', import.meta.url), { recursive: true });
const targets = {
  Organization: s.OrganizationSchema,
  Member: s.MemberSchema,
  CreateOrganizationInput: s.CreateOrganizationInputSchema,
  Claims: s.ClaimsSchema,
};
for (const [name, schema] of Object.entries(targets)) {
  writeFileSync(
    new URL(`../dist/json-schema/${name}.json`, import.meta.url),
    JSON.stringify(z.toJSONSchema(schema), null, 2),
  );
}
console.log('JSON Schema written:', Object.keys(targets).join(', '));
