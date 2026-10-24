// `pnpm security`: the repo's security checks (B06). Runs all three, even when one fails, and exits
// non-zero if any did. High and critical findings fail; see the security skill's TypeScript note.
//   1. the dependency audit (high and critical)
//   2. the secret scan over the whole git history (gitleaks; CI installs the pinned release)
//   3. ESLint with the security rules (eslint-plugin-security, no-unsanitized, react/no-danger)
import { spawnSync } from 'node:child_process';

const GITLEAKS_VERSION = '8.30.1'; // keep in step with .github/workflows/ci.yml
const shell = process.platform === 'win32';

function run(cmd, args) {
  return spawnSync(cmd, args, { stdio: 'inherit', shell }).status;
}

const checks = [
  { name: 'dependency audit', run: () => run('pnpm', ['audit', '--audit-level', 'high']) },
  {
    name: 'secret scan (gitleaks, whole history)',
    run: () => {
      const probe = spawnSync('gitleaks', ['version'], { stdio: 'ignore', shell });
      if (probe.error || probe.status !== 0) {
        console.error(
          `gitleaks is not on PATH: install v${GITLEAKS_VERSION} from https://github.com/gitleaks/gitleaks/releases (or "brew install gitleaks").`,
        );
        return 1;
      }
      return run('gitleaks', ['git', '--redact', '--exit-code', '1']);
    },
  },
  { name: 'security lint rules (ESLint)', run: () => run('pnpm', ['lint']) },
];

const results = [];
for (const check of checks) {
  console.log(`\n== ${check.name} ==`);
  const code = check.run();
  results.push({ name: check.name, ok: code === 0 });
}

console.log('\n== pnpm security ==');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
