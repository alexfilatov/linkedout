#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
project_root=$(pwd -P)
if [ ! -f "$project_root/dist/safari/manifest.json" ]; then
  echo 'Build the WebExtension first: npm run build' >&2
  exit 1
fi
if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  packager=safari-web-extension-packager
else
  packager=safari-web-extension-converter
fi
xcrun "$packager" "$project_root/dist/safari" \
  --project-location "$project_root/safari" \
  --app-name LinkedOut \
  --bundle-identifier com.linkedout.extension \
  --swift --macos-only --no-open --no-prompt
