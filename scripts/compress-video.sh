#!/usr/bin/env bash
# Compress a video for this site. GitHub rejects files over 100MB; stay well under,
# ideally below ~10MB for a project page.
#
# Always pin the output frame rate. Sped-up clips often keep a 1/60000 mp4
# timebase, so ffmpeg's r_frame_rate is 60000/1 even when avg_frame_rate is
# ~480. Encoding without -r then writes tens of thousands of duplicate frames
# and the "compressed" file is larger than the source.
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

max_fps=30
avg_fps=$(ffprobe -v error -select_streams v:0 \
  -show_entries stream=avg_frame_rate -of csv=p=0 "$input")
fps=$(awk -F'/' -v cap="$max_fps" '{
  if (NF == 2 && $2 + 0 > 0) v = $1 / $2;
  else v = $1 + 0;
  if (v <= 0) v = cap;
  if (v > cap) v = cap;
  print v;
}' <<<"$avg_fps")

ffmpeg -y -nostdin -i "$input" \
  -vf "fps=${fps},scale='min(1280,iw)':-2" \
  -r "$fps" \
  -fps_mode cfr \
  -c:v libx264 -preset slow -crf 28 \
  -pix_fmt yuv420p \
  -an \
  -movflags +faststart \
  "$output"

in_h=$(du -h "$input" | cut -f1)
out_h=$(du -h "$output" | cut -f1)
echo "Wrote $output (${out_h}; input was ${in_h}, ${fps} fps)"
echo "If this is still over ~10MB, raise CRF (e.g. 30) or lower the width."
