#!/usr/bin/env bash
# Regenerate macOS .icns, .iconset, and web favicons from the master app icon PNG.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${ROOT}/src/assets/icon_512x512@2x.png"
ICONSET="${ROOT}/src/assets/eventHorizon.iconset"
PUBLIC="${ROOT}/public"
ASSETS="${ROOT}/src/assets"

if [[ ! -f "$SOURCE" ]]; then
  echo "Missing source icon: $SOURCE" >&2
  exit 1
fi

mkdir -p "$ICONSET" "$PUBLIC"

write_icon() {
  local size="$1"
  local out="$2"
  sips -z "$size" "$size" "$SOURCE" --out "$out" >/dev/null
}

echo "Building macOS iconset…"
write_icon 16   "${ICONSET}/icon_16x16.png"
write_icon 32   "${ICONSET}/icon_16x16@2x.png"
write_icon 32   "${ICONSET}/icon_32x32.png"
write_icon 64   "${ICONSET}/icon_32x32@2x.png"
write_icon 128  "${ICONSET}/icon_128x128.png"
write_icon 256  "${ICONSET}/icon_128x128@2x.png"
write_icon 256  "${ICONSET}/icon_256x256.png"
write_icon 512  "${ICONSET}/icon_256x256@2x.png"
write_icon 512  "${ICONSET}/icon_512x512.png"
cp "$SOURCE" "${ICONSET}/icon_512x512@2x.png"

echo "Building eventHorizon.icns…"
iconutil -c icns "$ICONSET" -o "${ASSETS}/eventHorizon.icns"

echo "Building web / Electron PNG sizes…"
write_icon 16  "${PUBLIC}/favicon-16x16.png"
write_icon 32  "${PUBLIC}/favicon-32x32.png"
write_icon 48  "${PUBLIC}/favicon-48x48.png"
write_icon 180 "${PUBLIC}/apple-touch-icon.png"
write_icon 192 "${PUBLIC}/icon-192.png"
write_icon 256 "${ASSETS}/eventHorizon-256.png"
write_icon 512 "${PUBLIC}/icon-512.png"
cp "$SOURCE" "${ASSETS}/eventHorizon-1024.png"

echo "Done."
