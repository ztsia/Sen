declare const __SEN_ENV__: 'development' | 'preview' | 'production';

/** Where this build runs: a dev server, a preview (a branch, or a local build), or production. */
export const SEN_ENV = __SEN_ENV__;

/** The dev panel, the gallery and anything made up appear only in development and previews (B01; modules.md rule 6). */
export const DEV_TOOLS = SEN_ENV !== 'production';
