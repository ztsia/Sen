# Third-party notices

Sen's own code and documents are licensed under the GNU Affero General Public License v3.0
(`LICENSE`). These parts were copied from others, and keep their own licences.

| What | Where | From | Licence |
|---|---|---|---|
| The `frontend-design` skill | `.claude/skills/frontend-design/` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 (`.claude/skills/frontend-design/LICENSE.txt`) |
| The `neon` and `neon-postgres` skills | `.claude/skills/neon/`, `.claude/skills/neon-postgres/` | [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills) | Apache-2.0 (`licenses/neondatabase-agent-skills-Apache-2.0.txt`) |
| The `supabase-postgres-best-practices` skill | `.claude/skills/supabase-postgres-best-practices/` | [supabase/agent-skills](https://github.com/supabase/agent-skills) | MIT (`licenses/supabase-agent-skills-MIT.txt`) |
| shadcn/ui's component documentation | `.claude/skills/uiux/docs/` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT (`licenses/shadcn-ui-MIT.txt`) |
| The `shadcn` skill | `.claude/skills/shadcn/` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT (`licenses/shadcn-ui-MIT.txt`) |
| shadcn/ui's components, customised in place | `apps/web/src/components/ui/` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT (`licenses/shadcn-ui-MIT.txt`) |
| The `vercel-react-best-practices` and `web-design-guidelines` skills | `.claude/skills/vercel-react-best-practices/`, `.claude/skills/web-design-guidelines/` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | MIT, as the repository's README states (it ships no licence file) |
| The `capacitor-*` skills | `.claude/skills/capacitor-app-development/`, `capacitor-plugins/`, `capacitor-plugin-development/`, `capacitor-react/`, `capacitor-push-notifications/`, `capacitor-app-creation/` | [capawesome-team/skills](https://github.com/capawesome-team/skills) | MIT (`licenses/capawesome-skills-MIT.txt`) |
| UX and shadcn rules, adapted | `.claude/skills/uiux/SKILL.md`, *Rules carried over from ui-ux-pro-max* | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT (`licenses/ui-ux-pro-max-skill-MIT.txt`) |
| The palette validator | `docs/ui/directions/validate_palette.js` | The `dataviz` skill on Claude | See below |
| Each phone brand's steps to keep an app running | `apps/shell/data/keep-running.json`, shown in Settings → Capture | [dontkillmyapp.com](https://dontkillmyapp.com)'s API, which asks for credit | Credited on the screen that shows them; fetched when the shell is built (`apps/shell/scripts/keep-running.mjs`) |
| Capacitor and its plugins | `apps/shell/android/` (from npm, copied by `cap sync`) | [ionic-team/capacitor](https://github.com/ionic-team/capacitor) | MIT |
| Fonts | `docs/ui/directions/assets/fonts/` | Google Fonts | SIL Open Font License 1.1, a copy in each family's folder |

`validate_palette.js` is copied unchanged from the `dataviz` skill, so the palette check runs from the
repo; its header says so. It's a development tool, never part of the app.
