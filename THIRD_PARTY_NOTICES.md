# Third-party notices

Sen's own code and documents are licensed under the GNU Affero General Public License v3.0
(`LICENSE`). These parts were copied from others, and keep their own licences.

| What | Where | From | Licence |
|---|---|---|---|
| The `frontend-design` skill | `.claude/skills/frontend-design/` | [anthropics/skills](https://github.com/anthropics/skills) | Apache-2.0 (`.claude/skills/frontend-design/LICENSE.txt`) |
| The `neon` and `neon-postgres` skills | `.claude/skills/neon/`, `.claude/skills/neon-postgres/` | [neondatabase/agent-skills](https://github.com/neondatabase/agent-skills) | Apache-2.0 (`licenses/neondatabase-agent-skills-Apache-2.0.txt`) |
| The `supabase-postgres-best-practices` skill | `.claude/skills/supabase-postgres-best-practices/` | [supabase/agent-skills](https://github.com/supabase/agent-skills) | MIT (`licenses/supabase-agent-skills-MIT.txt`) |
| shadcn/ui's component documentation | `.claude/skills/uiux/docs/` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) | MIT (`licenses/shadcn-ui-MIT.txt`) |
| UX and shadcn rules, adapted | `.claude/skills/uiux/SKILL.md`, *Rules carried over from ui-ux-pro-max* | [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | MIT (`licenses/ui-ux-pro-max-skill-MIT.txt`) |
| The palette validator | `docs/ui/directions/validate_palette.js` | The `dataviz` skill on Claude | See below |
| Fonts | `docs/ui/directions/assets/fonts/` | Google Fonts | SIL Open Font License 1.1, a copy in each family's folder |

`validate_palette.js` is copied unchanged from the `dataviz` skill, so the palette check runs from the
repo; its header says so. It's a development tool, never part of the app.
