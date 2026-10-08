#!/bin/bash
# The cloud environment's setup script (docs/cloud.md §2). Paste its contents into the
# environment's "Setup script" field. This copy in the repo is the versioned source.
#
# It runs as root before Claude starts, and only when the environment has no cached snapshot.
# It must exit 0 and finish in about five minutes, or no snapshot is taken.
# Install machine-wide tools only; project dependencies belong to scripts/session-start.sh.

# Nothing machine-wide is needed yet. The app is a web app in a Capacitor shell (D42), so the old
# eas-cli install is gone. The foundations slice adds tools here, such as a local Postgres.

exit 0
