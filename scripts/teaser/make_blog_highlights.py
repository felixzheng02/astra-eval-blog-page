#!/usr/bin/env python3
"""Render the task grid, trimmed case study, chart reveal, and end card.

Run from any directory: python3 scripts/teaser/make_blog_highlights.py
Requires ffmpeg/ffprobe, OpenCV, NumPy, and Pillow. Sources remain unchanged.
"""

import argparse
from contextlib import ExitStack
import json
import math
from pathlib import Path
import subprocess

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
W, H, FPS = 1920, 1080, 30
INTRO_SECONDS, CHART_SECONDS, END_SECONDS = 5, 5, 3
FULLSCREEN_SECONDS = 3
# Keep the approved source starting point as the chart section gets shorter.
CASE_SOURCE_TAIL_SECONDS = 13
SHRINK_SECONDS = 0.8
NAMES = ("find-phone", "clean-spilled-water", "close-dishwasher", "load-mug")
OPENING_LABELS = (
    "find a phone in the living room",
    "wipe the table",
    "close a dishwasher",
    "load a mug in dishwasher",
)
CHART_TITLE = "More reasoning didn’t guarantee better results."
END_TEXT = "Check the full blog for more video and analysis!"


def probe(path):
    data = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-select_streams", "v:0", "-show_streams",
        "-show_format", "-of", "json", str(path),
    ]))
    stream = data["streams"][0]
    return float(stream.get("duration", data["format"]["duration"])), stream


class Frames:
    """Decode timestamp-based frames, including unusually high source rates."""

    def __init__(self, path, size, count, start=0):
        self.width, self.height = size
        _, stream = probe(path)
        matrix = "bt2020" if stream.get("color_space") == "bt2020nc" else "bt709"
        # Decode the source's YUV matrix correctly into RGB. Match the existing
        # blog clips' displayed exposure; do not apply an extra creative grade.
        vf = (f"setpts=PTS-STARTPTS,fps={FPS}:start_time=0,"
              f"scale={self.width}:{self.height}:flags=lanczos:in_color_matrix={matrix},"
              "setsar=1,format=bgr24,tpad=stop_mode=clone:stop_duration=0.1")
        self.process = subprocess.Popen([
            "ffmpeg", "-v", "error", "-threads", "2", "-ss", f"{start:.9f}",
            "-i", str(path), "-an", "-vf", vf, "-frames:v", str(count),
            "-threads", "2", "-f", "rawvideo", "-pix_fmt", "bgr24", "pipe:1",
        ], stdout=subprocess.PIPE)

    def read(self):
        count = self.width * self.height * 3
        raw = self.process.stdout.read(count)
        if len(raw) != count:
            raise RuntimeError(f"Decoder ended early: {len(raw)} of {count} bytes")
        return np.frombuffer(raw, np.uint8).reshape(self.height, self.width, 3)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *_):
        self.process.stdout.close()
        if exc_type:
            self.process.terminate()
        code = self.process.wait()
        if code and not exc_type:
            raise RuntimeError(f"ffmpeg decoder exited with {code}")


def ease(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def title_font(size):
    candidates = [
        "/usr/share/fonts/truetype/lato/Lato-Semibold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    font_path = next((p for p in candidates if Path(p).exists()), None)
    if font_path is None:
        raise RuntimeError("Install Lato or DejaVu Sans to render the titles")
    return ImageFont.truetype(font_path, size)


def opening_labels():
    """Prepare readable caption panels for the four opening quadrants."""
    font = title_font(40)
    layers = []
    for index, text in enumerate(OPENING_LABELS):
        bounds = font.getbbox(text)
        width, height = math.ceil(font.getlength(text)) + 48, bounds[3] - bounds[1] + 32
        panel = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(panel)
        draw.rounded_rectangle((0, 0, width - 1, height - 1), radius=12,
                               fill=(0, 0, 0, 180))
        draw.text((24, 16 - bounds[1]), text, font=font, fill="white")
        pixels = np.asarray(panel, dtype=np.float32)
        x = (index % 2) * 960 + (960 - width) // 2
        y = (index // 2) * 540 + 32
        layers.append((x, y, pixels[..., 2::-1], pixels[..., 3:4] / 255))
    return layers


def analysis_background(chart_path):
    screen = Image.new("RGB", (W, H), "white")
    chart = Image.open(chart_path).convert("RGB")
    width = 1160
    height = round(chart.height * width / chart.width)
    chart = chart.resize((width, height), Image.Resampling.LANCZOS)
    screen.paste(chart, (728, (H - height) // 2))
    draw = ImageDraw.Draw(screen)
    draw.text((W // 2, 92), CHART_TITLE, font=title_font(60),
              fill="#263547", anchor="mm")
    return np.asarray(screen)[..., ::-1].copy()


def end_card():
    card = Image.new("RGB", (W, H), "black")
    draw = ImageDraw.Draw(card)
    font = title_font(76)
    lines = ("Check the full blog for", "more video and analysis!")
    assert " ".join(lines) == END_TEXT
    for line, y in zip(lines, (480, 585)):
        draw.text((W // 2, y), line, font=font, fill="white", anchor="mm")
    return np.asarray(card)[..., ::-1].copy()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--chart", type=Path, default=ROOT / "media/images/ablation-reasoning.png")
    parser.add_argument("--output", type=Path, default=ROOT / "media/videos/blog-highlights.mp4")
    parser.add_argument("--skip-intro", action="store_true", help="Omit the four-video grid")
    parser.add_argument("--keep-full-case", action="store_true",
                        help="Keep the entire case study, shrinking after three seconds")
    args = parser.parse_args()
    paths = [] if args.skip_intro else [ROOT / "media/videos" / f"{name}.mp4" for name in NAMES]
    durations = [probe(path)[0] for path in paths]
    if durations and min(durations) < INTRO_SECONDS:
        raise ValueError("Every opening clip must be at least five seconds long")
    case_path = ROOT / "media/videos/case-study.mp4"
    duration, _ = probe(case_path)
    case_start = 0 if args.keep_full_case else max(0, duration - CASE_SOURCE_TAIL_SECONDS)
    case_duration = duration - case_start
    if not args.keep_full_case:
        case_duration = min(case_duration, FULLSCREEN_SECONDS + CHART_SECONDS)
    case_count = math.ceil(case_duration * FPS)
    intro_count = 0 if args.skip_intro else INTRO_SECONDS * FPS
    end_count = END_SECONDS * FPS
    shrink_start = FULLSCREEN_SECONDS * FPS
    labels = opening_labels() if paths else []
    chart = analysis_background(args.chart)
    card = end_card()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    partial = args.output.with_name(args.output.stem + ".part.mp4")
    encoder = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
        "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0", "-an",
        "-vf", "scale=out_color_matrix=bt709,format=yuv420p",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-threads", "4",
        "-profile:v", "high", "-level:v", "4.1", "-g", str(FPS * 2),
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
        "-movflags", "+faststart", str(partial),
    ], stdin=subprocess.PIPE)

    def write(frame):
        encoder.stdin.write(frame.tobytes())

    try:
        if paths:
            print("Rendering synchronized five-second grid...", flush=True)
        with ExitStack() as stack:
            sources = [stack.enter_context(Frames(path, (960, 540), intro_count,
                                                 duration - INTRO_SECONDS))
                       for path, duration in zip(paths, durations)]
            for _ in range(intro_count):
                tiles = [source.read() for source in sources]
                frame = np.concatenate((np.concatenate(tiles[:2], axis=1),
                                        np.concatenate(tiles[2:], axis=1)), axis=0)
                # Thin dividers make the four simultaneous clips easy to parse.
                frame[H // 2 - 2:H // 2 + 2] = 0
                frame[:, W // 2 - 2:W // 2 + 2] = 0
                for x, y, color, alpha in labels:
                    height, width = color.shape[:2]
                    region = frame[y:y + height, x:x + width]
                    region[:] = np.rint(region * (1 - alpha) + color * alpha).astype(np.uint8)
                write(frame)

        print(f"Rendering case study from {case_start:.3f}s; shrinking after three seconds...", flush=True)
        with Frames(case_path, (1280, 720), case_count, start=case_start) as source:
            for n in range(case_count):
                video = source.read()
                if n < shrink_start:
                    frame = cv2.resize(video, (W, H), interpolation=cv2.INTER_CUBIC)
                else:
                    elapsed = (n - shrink_start) / FPS
                    progress = ease(elapsed / SHRINK_SECONDS)
                    width = round(W + (640 - W) * progress)
                    height = round(H + (360 - H) * progress)
                    x, y = round(48 * progress), round(360 * progress)
                    # Fade the original chart in as the moving video clears it.
                    opacity = ease((elapsed - 0.35) / 0.45)
                    frame = (chart.copy() if opacity >= 1 else
                             cv2.addWeighted(chart, opacity,
                                             np.full_like(chart, 255), 1 - opacity, 0))
                    scaled = cv2.resize(video, (width, height),
                                        interpolation=cv2.INTER_AREA if width < 1280 else cv2.INTER_CUBIC)
                    frame[y:y + height, x:x + width] = scaled
                write(frame)
                if n % (FPS * 5) == 0:
                    print(f"  Case study: {n / FPS:.0f} / {case_count / FPS:.1f} seconds", flush=True)

        print("Rendering closing message...", flush=True)
        for n in range(end_count):
            fade = ease(n / (FPS * 0.3))
            write(card if fade >= 1 else np.rint(card * fade).astype(np.uint8))
        encoder.stdin.close()
        if encoder.wait() != 0:
            raise RuntimeError("Video encoding failed")
    except BaseException:
        encoder.stdin.close()
        encoder.terminate()
        encoder.wait()
        raise

    partial.replace(args.output)
    metadata = {
        "output": str(args.output.relative_to(ROOT)) if args.output.is_relative_to(ROOT) else str(args.output),
        "resolution": [W, H], "fps": FPS,
        "frames": intro_count + case_count + end_count,
        "duration_seconds": (intro_count + case_count + end_count) / FPS,
        "opening": [{"source": path.name, "start_seconds": duration - INTRO_SECONDS,
                     "end_seconds": duration, "quadrant": quadrant, "description": description}
                    for path, duration, quadrant, description in zip(paths, durations,
                        ("top-left", "top-right", "bottom-left", "bottom-right"), OPENING_LABELS)],
        "case_study_source_start_seconds": case_start,
        "case_study_source_end_seconds": case_start + case_duration,
        "case_study_start_seconds": intro_count / FPS,
        "chart_reveal_start_seconds": (intro_count + shrink_start) / FPS,
        "chart_reveal_duration_seconds": SHRINK_SECONDS,
        "chart_section_duration_seconds": (case_count - shrink_start) / FPS,
        "chart_title": CHART_TITLE,
        "end_card_start_seconds": (intro_count + case_count) / FPS,
        "end_card_duration_seconds": END_SECONDS,
        "end_card_text": END_TEXT,
        "audio": "None; all supplied video sources are silent",
    }
    args.output.with_suffix(".json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"Saved {args.output}: {metadata['duration_seconds']:.2f}s, "
          f"{args.output.stat().st_size / 1e6:.1f} MB", flush=True)


if __name__ == "__main__":
    main()
