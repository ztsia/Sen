#!/usr/bin/env bash
# SessionStart hook (.claude/settings.json). Points a session at unread handoffs and, in the
# cloud, gets a fresh VM ready to run tests.
# It never fails the session: a broken step should surface when a command runs, not at startup.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 0

# The handoff comes first for every session, local or cloud (CLAUDE.md, Session rotation).
[ -f docs/handoff.md ] && echo "Read docs/handoff.md before anything else, and rewrite it before you end."

# Everything below is cloud only. A local machine manages its own installs.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

# A slice handed off mid-way lives on its unmerged branch, B<NN>/<brief> (CLAUDE.md, One brief, one
# branch). Name the newest one whose handoff differs from main's, as a safety net: the owner's
# message names the branch to continue from. Older claude/* branches are still checked.
if timeout 60 git fetch -q origin main '+refs/heads/B*:refs/remotes/origin/B*' \
    '+refs/heads/claude/*:refs/remotes/origin/claude/*' 2>/dev/null; then
  for ref in $(git for-each-ref --sort=-committerdate --format='%(refname:short)' \
      'refs/remotes/origin/B[0-9][0-9]/' refs/remotes/origin/claude/); do
    git merge-base --is-ancestor "$ref" origin/main 2>/dev/null && continue
    git diff --quiet origin/main..."$ref" -- docs/handoff.md 2>/dev/null && continue
    echo "A newer handoff is on $ref ($(git log -1 --format=%cr "$ref")). If you're continuing a slice, read it there."
    break
  done
fi

# Project dependencies, once the foundations slice has created a lockfile.
if [ -f pnpm-lock.yaml ] && [ ! -d node_modules ]; then
  pnpm install --frozen-lockfile >/tmp/session-pnpm.log 2>&1 \
    || echo "session-start: pnpm install failed, see /tmp/session-pnpm.log"
fi

# Gradle in a session: Maven Central rate-limits the VM, Google's mirror of it doesn't (docs/cloud.md §5).
# The Android SDK itself is a separate step, scripts/android-sdk.sh, for slices that build the shell.
mkdir -p "$HOME/.gradle/init.d" && cp scripts/gradle-maven-mirror.gradle "$HOME/.gradle/init.d/maven-mirror.gradle"

# The local database for SQL and RLS tests. The foundations slice adds scripts/local-db.sh;
# docs/cloud.md §5 records how a local Postgres runs in a session.
if [ -x scripts/local-db.sh ]; then
  scripts/local-db.sh start >/tmp/session-db.log 2>&1 \
    || echo "session-start: the local database did not start, see /tmp/session-db.log"
fi

exit 0
