#!/usr/bin/env python3
"""Turn every source video into one small, sped-up, looping tile for the teaser grid.

Each tile is LOOP_SECONDS long. A video is sped up so that (up to MAX_SPEED)
the whole thing fits in one loop; longer videos show their middle part.
Videos shorter than one loop play at normal speed and repeat.

Usage: python3 make_tiles.py OUT_DIR VIDEO [VIDEO ...]
Existing tiles in OUT_DIR are skipped, so the script can be re-run.
Set TIME_BUDGET=<seconds> to stop starting new tiles after that long.
"""
import json, os, subprocess, sys, time

LOOP_SECONDS = 15
FPS = 24
TILE_W, TILE_H = 320, 240      # 4:3, cropped from the centre
MAX_SPEED = 40                 # longer videos show their middle 40 x 15 s = 10 min
MIN_SECONDS = 8                # ignore clips too short to read as a task
KEYFRAME_SPEED = 10            # at or above this, decode only keyframes (~1/s on iPhones), 5x faster


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0",
                          "-show_entries", "stream=color_transfer:format=duration",
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    info = json.loads(out)
    hdr = info["streams"][0].get("color_transfer") in ("arib-std-b67", "smpte2084")
    return float(info["format"]["duration"]), hdr


def make_tile(src, dst):
    duration, hdr = probe(src)
    if duration < MIN_SECONDS:
        print(f"skip (too short, {duration:.1f}s): {src}", flush=True)
        return
    speed = min(max(duration / LOOP_SECONDS, 1.0), MAX_SPEED)
    window = min(duration, speed * LOOP_SECONDS)
    start = (duration - window) / 2

    cmd = ["ffmpeg", "-hide_banner", "-v", "error", "-y", "-skip_loop_filter", "all"]
    if speed >= KEYFRAME_SPEED:
        cmd += ["-skip_frame", "nokey"]
    if window < LOOP_SECONDS:
        cmd += ["-stream_loop", "-1"]
    cmd += ["-ss", f"{start:.2f}", "-i", src]

    matrix = "in_color_matrix=bt2020:" if hdr else ""   # iPhone HLG footage looks fine without tone mapping
    vf = (f"setpts=(PTS-STARTPTS)/{speed:.4f},fps={FPS},"
          f"scale={TILE_W}:{TILE_H}:force_original_aspect_ratio=increase:{matrix}out_color_matrix=bt709,"
          f"crop={TILE_W}:{TILE_H},eq=contrast=1.04:saturation=1.08,format=yuv420p")
    cmd += ["-t", str(LOOP_SECONDS), "-vf", vf, "-an",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-g", str(FPS),
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
            dst + ".part.mp4"]
    subprocess.run(cmd, check=True)
    os.replace(dst + ".part.mp4", dst)
    print(f"ok  {speed:5.1f}x  {os.path.basename(src)}", flush=True)


if __name__ == "__main__":
    out_dir, sources = sys.argv[1], sys.argv[2:]
    os.makedirs(out_dir, exist_ok=True)
    budget, t0 = float(os.environ.get("TIME_BUDGET", "inf")), time.time()
    for src in sources:
        if time.time() - t0 > budget:
            print("time budget used, re-run to continue", flush=True)
            break
        name = os.path.splitext(os.path.basename(src))[0].replace(" ", "_")
        dst = os.path.join(out_dir, name + ".mp4")
        if os.path.exists(dst):
            continue
        try:
            make_tile(src, dst)
        except subprocess.CalledProcessError as e:
            print(f"FAIL {src}: {e}", flush=True)
