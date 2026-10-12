import { z } from 'zod';

// The shell's content security policy forbids eval (spec §17). Zod compiles faster parsers with
// `new Function` when it can, and finds out by trying it: a try that the policy reports as a
// violation even though zod catches it. Parsing the slow way costs nothing at this size. Imported
// first in main.tsx, so it runs before any schema is built.
z.config({ jitless: true });
