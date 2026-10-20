#!/usr/bin/env python3
"""Stack the tiles from make_tiles.py into one looping grid video for the page hero.

Every tile is the same length, so the grid loops cleanly. Each tile starts at a
different point in its own loop, so the cuts don't all happen at once.
A still mask on top draws the dark gaps and rounded corners between tiles.

TASKS.csv (columns: clip,task) says which task each tile shows. Every task gets
about the same number of cells, and a task never appears twice in the same row
or column, or within two cells of itself. Clips missing from the csv count as
their own task.

Usage: python3 compose_grid.py TILE_DIR TASKS.csv OUT.mp4 [WIDTH]
Writes OUT.mp4 and a poster frame next to it (OUT.jpg). Needs ffmpeg and Pillow.
"""
import csv, glob, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw

COLS, ROWS = 12, 9           # 4:3 tiles in a 16:9 frame
GAP = 4                      # gap between tiles, in pixels at 1920 wide
RADIUS = 6                   # tile corner radius, in pixels at 1920 wide
LOOP_SECONDS, FPS = 15, 24   # must match make_tiles.py
BACKGROUND = (11, 13, 16)
SEED = 7                     # fixed, so re-running gives the same layout
MIN_TASK_DISTANCE = 3        # copies of a task are at least this many cells apart (and never share a row/column)


def make_mask(path, cell_w, cell_h, scale):
    """Opaque background everywhere except a rounded window over each tile."""
    gap, radius = max(2, round(GAP * scale)), max(2, round(RADIUS * scale))
    mask = Image.new("RGBA", (COLS * cell_w, ROWS * cell_h), BACKGROUND + (255,))
    draw = ImageDraw.Draw(mask)
    for r in range(ROWS):
        for c in range(COLS):
            x, y = c * cell_w + gap // 2, r * cell_h + gap // 2
            draw.rounded_rectangle([x, y, x + cell_w - gap - 1, y + cell_h - gap - 1],
                                   radius=radius, fill=(0, 0, 0, 0))
    mask.save(path)


def plan_cells(clips_by_task, rng):
    """Return one clip per cell, spreading each task evenly and keeping copies apart."""
    slots, tasks = COLS * ROWS, sorted(clips_by_task)
    # Equal share per task; leftover cells go to the tasks with the most distinct clips.
    count = {t: slots // len(tasks) for t in tasks}
    for t in sorted(tasks, key=lambda t: -len(clips_by_task[t]))[: slots - sum(count.values())]:
        count[t] += 1
    for attempt in range(5000):
        left = dict(count)
        where = {t: [] for t in tasks}
        grid = []
        for cell in range(slots):
            r, c = divmod(cell, COLS)
            ok = [t for t in tasks if left[t] and all(
                r != r2 and c != c2 and max(abs(r - r2), abs(c - c2)) >= MIN_TASK_DISTANCE
                for r2, c2 in where[t])]
            if not ok:
                break
            most = max(left[t] for t in ok)          # place the tasks with most copies left first
            t = rng.choice([t for t in ok if left[t] == most])
            left[t] -= 1
            where[t].append((r, c))
            grid.append(t)
        else:
            # Within a task, cycle through its clips so repeats use different footage.
            for t in tasks:
                rng.shuffle(clips_by_task[t])
            used = {t: 0 for t in tasks}
            order = []
            for t in grid:
                order.append(clips_by_task[t][used[t] % len(clips_by_task[t])])
                used[t] += 1
            return order
    sys.exit("could not place tasks; lower MIN_TASK_DISTANCE")


def main(tile_dir, tasks_csv, out, width=1920):
    tiles = sorted(t for t in glob.glob(os.path.join(tile_dir, "*.mp4")) if not t.endswith(".part.mp4"))
    with open(tasks_csv, newline="") as f:
        task_of = {row["clip"]: row["task"] for row in csv.DictReader(f)}
    clips_by_task = {}
    for path in tiles:
        name = os.path.splitext(os.path.basename(path))[0]
        clips_by_task.setdefault(task_of.get(name, name), []).append(path)
    rng = random.Random(SEED)
    order = plan_cells(clips_by_task, rng)
    slots = COLS * ROWS

    cell_w = width // COLS // 2 * 2
    cell_h = cell_w * 3 // 4 // 2 * 2
    mask_path = os.path.join(tempfile.mkdtemp(), "mask.png")
    make_mask(mask_path, cell_w, cell_h, width / 1920)

    cmd = ["ffmpeg", "-hide_banner", "-v", "error", "-y"]
    for path in order:
        offset = rng.uniform(0, LOOP_SECONDS)
        cmd += ["-stream_loop", "-1", "-ss", f"{offset:.2f}", "-i", path]
    cmd += ["-i", mask_path]

    parts = [f"[{i}:v]setpts=PTS-STARTPTS,scale={cell_w}:{cell_h}:flags=lanczos,setsar=1[t{i}]"
             for i in range(slots)]
    layout = "|".join(f"{(i % COLS) * cell_w}_{(i // COLS) * cell_h}" for i in range(slots))
    parts.append("".join(f"[t{i}]" for i in range(slots)) + f"xstack=inputs={slots}:layout={layout}[grid]")
    parts.append(f"[grid][{slots}:v]overlay=0:0,format=yuv420p[out]")

    cmd += ["-filter_complex", ";".join(parts), "-map", "[out]", "-t", str(LOOP_SECONDS),
            "-r", str(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", os.environ.get("CRF", "27"),
            "-g", str(FPS * 2), "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", out]
    subprocess.run(cmd, check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-frames:v", "1",
                    "-q:v", "4", os.path.splitext(out)[0] + ".jpg"], check=True)
    print(f"{out}: {len(tiles)} clips, {len(clips_by_task)} tasks, {len(set(order))} clips used in {slots} tiles, {COLS * cell_w}x{ROWS * cell_h}, "
          f"{os.path.getsize(out) / 1e6:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 1920)
