#!/usr/bin/env bash
# Blur rectangular regions of a video between given times.
#
# Each region is:  x,y,w,h  start  end
#   x,y   top-left of the box, in pixels of the *input* video
#   w,h   box size in pixels
#   start,end  seconds (also MM:SS or HH:MM:SS)
#
# Example:
#   scripts/blur-video.sh media/videos/clip.mp4 \
#     820,140,180,220 2.4 7.1 \
#     90,400,100,100 0 3.5
#
# Draw boxes instead of blurring (to check placement):
#   scripts/blur-video.sh media/videos/clip.mp4 --mark 820,140,180,220 2.4 7.1
set -euo pipefail

usage() {
  cat <<EOF
Usage: $0 [options] input.mp4 [output.mp4] x,y,w,h start end [x,y,w,h start end ...]

Options:
  --mark           Draw rectangles instead of blurring (for lining up boxes)
  --strength N     Blur radius (default: 20). Clamped per box (chroma too).
  -o, --output P   Output path (default: <input-dir>/<name>-blurred.mp4)
  -h, --help       Show this help

Times are seconds, or MM:SS / HH:MM:SS. Coordinates are pixels from the
top-left of the input. Re-encodes with the same fps cap and H.264 settings
as compress-video.sh (no extra scale).
EOF
}

if ! command -v ffmpeg >/dev/null 2>&1 || ! command -v ffprobe >/dev/null 2>&1; then
  echo "ffmpeg and ffprobe are required. Install them, then re-run." >&2
  exit 1
fi

mark=0
strength=20
output=""
positional=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      usage
      exit 0
      ;;
    --mark)
      mark=1
      shift
      ;;
    --strength)
      strength=$2
      shift 2
      ;;
    -o|--output)
      output=$2
      shift 2
      ;;
    --)
      shift
      positional+=("$@")
      break
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      positional+=("$1")
      shift
      ;;
  esac
done

if [[ ${#positional[@]} -lt 1 ]]; then
  usage >&2
  exit 1
fi

input=${positional[0]}
rest=("${positional[@]:1}")

box_re='^[0-9]+([.][0-9]+)?,[0-9]+([.][0-9]+)?,[0-9]+([.][0-9]+)?,[0-9]+([.][0-9]+)?$'
if [[ ${#rest[@]} -gt 0 && ! ${rest[0]} =~ $box_re ]]; then
  output=${output:-${rest[0]}}
  rest=("${rest[@]:1}")
fi

if [[ ${#rest[@]} -lt 3 || $(( ${#rest[@]} % 3 )) -ne 0 ]]; then
  echo "Each region needs x,y,w,h start end." >&2
  usage >&2
  exit 1
fi

if [[ ! -f $input ]]; then
  echo "Input not found: $input" >&2
  exit 1
fi

if [[ -z $output ]]; then
  base=$(basename "${input%.*}")
  dir=$(dirname "$input")
  suffix=blurred
  if [[ $mark -eq 1 ]]; then
    suffix=marked
  fi
  output="${dir}/${base}-${suffix}.mp4"
fi

parse_time() {
  local t=$1
  if [[ $t =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    printf '%s' "$t"
  elif [[ $t =~ ^([0-9]+):([0-9]{1,2}):([0-9]{1,2}([.][0-9]+)?)$ ]]; then
    awk -v h="${BASH_REMATCH[1]}" -v m="${BASH_REMATCH[2]}" -v s="${BASH_REMATCH[3]}" \
      'BEGIN { printf "%.4f", h*3600 + m*60 + s }'
  elif [[ $t =~ ^([0-9]+):([0-9]{1,2}([.][0-9]+)?)$ ]]; then
    awk -v m="${BASH_REMATCH[1]}" -v s="${BASH_REMATCH[2]}" \
      'BEGIN { printf "%.4f", m*60 + s }'
  else
    echo "Bad time (use seconds or HH:MM:SS): $t" >&2
    exit 1
  fi
}

even_clamp() {
  awk -v n="$1" -v lo="$2" -v hi="$3" 'BEGIN {
    v = int(n + 0);
    if (v < lo) v = lo;
    if (v > hi) v = hi;
    if (v % 2) v -= 1;
    if (v < lo) v = lo;
    if (v % 2) v += 1;
    print v + 0;
  }'
}

IFS=, read -r vw vh < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "$input")

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

regions=()
n=0
i=0
while [[ $i -lt ${#rest[@]} ]]; do
  box=${rest[$i]}
  start=$(parse_time "${rest[$((i + 1))]}")
  end=$(parse_time "${rest[$((i + 2))]}")
  i=$((i + 3))
  if [[ ! $box =~ $box_re ]]; then
    echo "Bad box (want x,y,w,h): $box" >&2
    exit 1
  fi
  IFS=, read -r raw_x raw_y raw_w raw_h <<<"$box"
  x=$(even_clamp "$raw_x" 0 $((vw - 2)))
  y=$(even_clamp "$raw_y" 0 $((vh - 2)))
  w=$(even_clamp "$raw_w" 2 $((vw - x)))
  h=$(even_clamp "$raw_h" 2 $((vh - y)))
  if awk -v s="$start" -v e="$end" 'BEGIN { exit !(e > s) }'; then
    :
  else
    echo "end must be after start (got $start .. $end)" >&2
    exit 1
  fi
  regions+=("$x:$y:$w:$h:$start:$end")
  n=$((n + 1))
done

filters=()
if [[ $mark -eq 1 ]]; then
  chain="[0:v]"
  for idx in "${!regions[@]}"; do
    IFS=: read -r x y w h start end <<<"${regions[$idx]}"
    chain+="drawbox=x=${x}:y=${y}:w=${w}:h=${h}:color=red@0.45:t=3:enable='between(t,${start},${end})',"
  done
  chain=${chain%,}
  filters+=("${chain}[vout]")
else
  split_n=$((n + 1))
  split="[0:v]split=${split_n}[base]"
  for ((idx = 0; idx < n; idx++)); do
    split+="[c${idx}]"
  done
  filters+=("$split")
  prev="[base]"
  for idx in "${!regions[@]}"; do
    IFS=: read -r x y w h start end <<<"${regions[$idx]}"
    read -r luma_r chroma_r < <(awk -v s="$strength" -v w="$w" -v h="$h" 'BEGIN {
      side = (w < h ? w : h);
      ml = int(side / 2) - 1;
      mc = int(side / 4) - 1;
      if (ml < 1) ml = 1;
      if (mc < 0) mc = 0;
      lr = int(s); cr = int(s);
      if (lr > ml) lr = ml;
      if (cr > mc) cr = mc;
      if (lr < 1) lr = 1;
      print lr, cr;
    }')
    filters+=("[c${idx}]crop=${w}:${h}:${x}:${y},boxblur=${luma_r}:2:${chroma_r}:2[b${idx}]")
    if [[ $idx -eq $((n - 1)) ]]; then
      out="[vout]"
    else
      out="[o${idx}]"
    fi
    filters+=("${prev}[b${idx}]overlay=${x}:${y}:enable='between(t,${start},${end})'${out}")
    prev=$out
  done
fi

filter_complex=$(IFS=';'; echo "${filters[*]}")

mkdir -p "$(dirname "$output")"
encode_out=$(mktemp --suffix=.mp4)
trap 'rm -f "$encode_out"' EXIT

preset=slow
if [[ $mark -eq 1 ]]; then
  preset=veryfast
fi

ffmpeg -y -nostdin -i "$input" \
  -filter_complex "$filter_complex" \
  -map "[vout]" \
  -r "$fps" \
  -fps_mode cfr \
  -c:v libx264 -preset "$preset" -crf 28 \
  -pix_fmt yuv420p \
  -an \
  -movflags +faststart \
  "$encode_out"

mv "$encode_out" "$output"
trap - EXIT

in_h=$(du -h "$input" | cut -f1)
out_h=$(du -h "$output" | cut -f1)
echo "Wrote $output (${out_h}; input was ${in_h}, ${n} region(s), ${fps} fps)"
