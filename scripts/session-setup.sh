#!/usr/bin/env bash
# Sen's own SessionStart hook (.claude/settings.json): gets a fresh cloud VM ready to run tests. The
# workflow plugin's hook loads the rules, points at the handoff and names the newest slice branch.
# It never fails the session: a broken step should surface when a command runs, not at startup.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 0

# A local machine manages its own installs.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

if [ -f pnpm-lock.yaml ] && [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile >/tmp/session-pnpm.log 2>&1 \
    || echo "session-setup: pnpm install failed, see /tmp/session-pnpm.log"
fi

# Gradle in a session: Maven Central rate-limits the VM, Google's mirror of it doesn't (docs/cloud.md §5).
# The Android SDK itself is a separate step, scripts/android-sdk.sh, for slices that build the shell.
mkdir -p "$HOME/.gradle/init.d" && cp scripts/gradle-maven-mirror.gradle "$HOME/.gradle/init.d/maven-mirror.gradle"

# The local Postgres for SQL and RLS tests (docs/cloud.md §5), never Neon.
if [ -x scripts/local-db.sh ]; then
  scripts/local-db.sh start >/tmp/session-db.log 2>&1 \
    || echo "session-setup: the local database did not start, see /tmp/session-db.log"
fi

exit 0
