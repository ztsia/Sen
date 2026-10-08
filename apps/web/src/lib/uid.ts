import { useId } from 'react';

/** An id safe inside SVG's url(#…): React's ids carry characters a url() reference can't. */
export const useSvgId = (prefix: string) => prefix + useId().replace(/[^a-zA-Z0-9]/g, '');
