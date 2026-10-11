// The native surfaces of docs/screens.md, by id. Pure, so dev/journeys.ts and Playwright can name them.

export const SURFACE_IDS = [
  'prompt-category',
  'prompt-payback',
  'prompt-scan',
  'owe-reminder',
  'push-health',
  'push-jobs',
  'push-sen',
  'push-budget',
  'push-payday',
  'push-claim',
  'push-claim-day',
  'push-export',
  'shortcut-scan',
  'shortcut-manual',
  'share-receipt',
  'share-ask',
  'island-paid',
  'island-reading',
  'island-split',
  'island-paying',
  'island-payday',
  'island-ess',
  'island-sen',
] as const;
export type SurfaceId = (typeof SURFACE_IDS)[number];
