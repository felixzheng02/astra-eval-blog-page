#!/usr/bin/env bash
# Compress a video for this site. GitHub rejects files over 100MB; stay well under,
# ideally below ~10MB for a project page.
set -euo pipefail

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. Install it, then re-run." >&2
  exit 1
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 input.mp4 [output.mp4]" >&2
  echo "Writes media/videos/<basename>.mp4 by default." >&2
  exit 1
fi

input=$1
base=$(basename "${input%.*}")
output=${2:-"media/videos/${base}.mp4"}
mkdir -p "$(dirname "$output")"

ffmpeg -y -i "$input" \
  -vf "scale='min(1280,iw)':-2" \
  -c:v libx264 -preset slow -crf 28 \
  -an \
  -movflags +faststart \
  "$output"

echo "Wrote $output ($(du -h "$output" | cut -f1))"
echo "If this is still over ~10MB, raise CRF (e.g. 30) or lower the width."
