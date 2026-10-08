/** Where this build runs: a dev server, a preview (a branch on Vercel, or a build with SEN_ENV=preview), or production (any other build). */
export const SEN_ENV = __SEN_ENV__;

/** The dev panel, the gallery and anything made up appear only in development and previews (B01; modules.md rule 6). */
export const DEV_TOOLS = __SEN_ENV__ !== 'production';
