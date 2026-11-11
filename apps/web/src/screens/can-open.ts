import { DEV_TOOLS } from '@/lib/env';
import { screenById } from './registry';

/**
 * Whether a button may lead to a screen (B08): one that's built, anywhere; a skeleton one only in
 * previews, where the made-up data stands behind it. Production never offers a way into *Not built yet*.
 * Its own module, so the registry stays free of build-time constants (the e2e catalogue reads it in Node).
 */
export const canOpen = (id: string) => screenById.get(id)?.status === 'real' || DEV_TOOLS;
