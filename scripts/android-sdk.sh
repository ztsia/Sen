#!/usr/bin/env bash
# Installs the Android SDK in a cloud session, so it can build the shell's APKs (docs/cloud.md §5).
# Not run at startup: it takes about two minutes and a gigabyte. Run it when a slice touches apps/shell.
#   bash scripts/android-sdk.sh
set -euo pipefail
SDK=/opt/android-sdk
TOOLS=commandlinetools-linux-13114758_latest.zip
if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK/cmdline-tools"
  tmp=$(mktemp -d)
  curl -sSLo "$tmp/$TOOLS" "https://dl.google.com/android/repository/$TOOLS"
  unzip -q "$tmp/$TOOLS" -d "$SDK/cmdline-tools"
  mv "$SDK/cmdline-tools/cmdline-tools" "$SDK/cmdline-tools/latest"
  rm -rf "$tmp"
fi
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
"$SDK/cmdline-tools/latest/bin/sdkmanager" platform-tools "platforms;android-36" "build-tools;36.0.0" >/dev/null
cd "$(dirname "$0")/.."
echo "sdk.dir=$SDK" > apps/shell/android/local.properties
echo "Android SDK ready in $SDK. Then: pnpm --filter @sen/shell sync && (cd apps/shell/android && ANDROID_HOME=$SDK gradle assembleDebug)"
