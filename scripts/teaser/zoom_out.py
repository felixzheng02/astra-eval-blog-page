#!/usr/bin/env python3
"""Zoom out from one clip, to a 2x2 block of clips, to the full teaser grid.

Stages (A and B held HOLD seconds, C held FINAL_HOLD seconds, joined by eased zooms of ZOOM seconds):
  A. one clip fills the frame
  B. the 2x2 block around it, other cells dimmed
  C. the whole 12x9 grid, as in teaser-grid.mp4; the blog title and subtitle fade in at the top
     and the headline at the bottom, styled like the page

The grid underneath is teaser-grid.mp4 itself. The four block cells are redrawn
from full-resolution clips so the close-ups stay sharp. Each clip must already be
a 4:3, 24 fps file starting at the moment to show (see the ffmpeg prep below).

Usage: python3 zoom_out.py GRID.mp4 OUT.mp4 HERO.mp4 TOP_RIGHT.mp4 BOTTOM_LEFT.mp4 BOTTOM_RIGHT.mp4
Prep each clip with, e.g.:
  ffmpeg -ss 20.63 -i turn-on-lamp.mp4 -vf "fps=24,crop=960:720:160:0,
         eq=saturation=S:gamma=G,tpad=stop_mode=clone:stop_duration=10" -t 10 hero.mp4
The blog clips are brighter and more saturated than the grid tiles, so S and G are picked per clip
to bring mean HSV saturation to about 60 and value to about 170 (grid tiles: about 65 and 157).
"""
import subprocess, sys
import cv2
import numpy as np

W, H, FPS = 1920, 1080, 24
COLS, ROWS = 12, 9                 # must match compose_grid.py
CELL_W, CELL_H = W // COLS, H // ROWS
GAP, RADIUS = 4, 6                 # compose_grid.py values at 1920 wide
BLOCK_COL, BLOCK_ROW = 5, 3        # top-left cell of the 2x2 block (hero sits here)
HOLD, ZOOM = 2.0, 0.9
FINAL_HOLD = 3.5                   # last stage is longer so the text can be read
DIM = 0.3                          # brightness of cells outside the focus
TARGET_S, TARGET_V = 60, 170       # tone-match the block clips to the grid tiles (grid: S ~65, V ~157)

# Text over the full grid, styled like the page hero (_includes/teaser.njk, writeup.css).
TITLE = "Astra Beyond Tabletop: Into the Home"
SUBTITLE = "Evaluating Astra as a Zero-Shot Robot Policy for Mobile Manipulation with Hello Robot Stretch 4"
HEADLINE = "24 household tasks, zero-shot."
TEXT_IN, TEXT_FADE = 0.3, 0.9      # seconds after the grid settles; fade-in length
FONT_DIR = "/usr/share/fonts/opentype/inter/"


def ease(t):
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def views():
    """Camera (centre x, centre y, view height) in grid pixels for stages A, B, C."""
    x0, y0 = BLOCK_COL * CELL_W, BLOCK_ROW * CELL_H
    inner_w = CELL_W - GAP
    a = (x0 + CELL_W / 2, y0 + CELL_H / 2, 0.99 * inner_w * H / W)   # tile fills the frame (1% bleed hides the edge)
    b = (x0 + CELL_W, y0 + CELL_H, 2 * CELL_H + 3 * GAP)             # 2x2 block fits the height
    c = (W / 2, H / 2, H)                                             # whole grid
    return a, b, c


def camera(t):
    """Camera and focus weights at time t. Returns (cx, cy, h, block_dim, outside_dim)."""
    a, b, c = views()
    t1, t2, t3, t4 = HOLD, HOLD + ZOOM, 2 * HOLD + ZOOM, 2 * HOLD + 2 * ZOOM
    if t < t1:
        return (*a, DIM, DIM)
    if t < t2:
        return (*lerp_view(a, b, ease((t - t1) / ZOOM)), DIM + (1 - DIM) * ease((t - t1) / ZOOM), DIM)
    if t < t3:
        return (*b, 1.0, DIM)
    if t < t4:
        k = ease((t - t3) / ZOOM)
        return (*lerp_view(b, c, k), 1.0, DIM + (1 - DIM) * k)
    return (*c, 1.0, 1.0)


def lerp_view(v0, v1, k):
    """Zoom in log scale; move the centre in step with the zoom so the focus stays put on screen."""
    h = float(np.exp(np.log(v0[2]) + (np.log(v1[2]) - np.log(v0[2])) * k))
    f = (h - v0[2]) / (v1[2] - v0[2])
    return v0[0] + (v1[0] - v0[0]) * f, v0[1] + (v1[1] - v0[1]) * f, h


def draw_text_layers():
    """Return (shade, top, bottom) RGBA float layers. Shade is the page's gradients; top/bottom carry text."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont

    def font(weight, size):
        return ImageFont.truetype(FONT_DIR + f"Inter-{weight}.otf", size)

    def text_width(d, s, f, tracking=0):
        return sum(d.textlength(ch, font=f) for ch in s) + tracking * (len(s) - 1) if tracking else d.textlength(s, font=f)

    def draw_line(img, y, s, f, fill, tracking=0, shadow=None):
        d = ImageDraw.Draw(img)
        x = (W - text_width(d, s, f, tracking)) / 2
        if shadow:
            sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            ds = ImageDraw.Draw(sh)
            xx = x
            for ch in s if tracking else [s]:
                ds.text((xx, y + shadow[0]), ch, font=f, fill=(0, 0, 0, shadow[2]))
                xx += d.textlength(ch, font=f) + tracking
            img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(shadow[1])))
        for ch in s if tracking else [s]:
            d.text((x, y), ch, font=f, fill=fill)
            x += d.textlength(ch, font=f) + tracking

    # Page shade: radial vignette + darker bottom (writeup.css .teaser-grid-shade), plus a top band for the title.
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xs - W * 0.5) / (W * 0.5)) ** 2 + ((ys - H * 0.45) / (H * 0.55)) ** 2)
    radial = 0.05 + (0.45 - 0.05) * np.clip(r / 0.75, 0, 1)
    bottom = np.clip((ys / H - 0.40) / 0.60, 0, 1) * 0.88
    top = np.clip((0.30 - ys / H) / 0.30, 0, 1) * 0.70
    a = 1 - (1 - radial) * (1 - bottom) * (1 - top)
    shade = np.zeros((H, W, 4), np.float32)
    shade[..., :3] = (16, 13, 11)                    # rgb(11 13 16) in BGR
    shade[..., 3] = a

    scale = 1.3                                      # page sizes at a 1920 px viewport, enlarged for video
    big_f = font("ExtraBold", round(72 * scale))     # headline and title share this (.teaser-grid-headline)
    sub_f = font("Medium", 38)                       # .publication-subtitle weight 500; largest size that fits one line
    shadow = (2, 24 * scale / 2, 140)                # text-shadow: 0 2px 24px rgb(0 0 0 / 0.55)

    bottom_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    base = H - round(120 * scale)                    # .teaser-grid-text { bottom: 7.5rem }
    draw_line(bottom_img, base - round(big_f.size * 1.05), HEADLINE, big_f, (255, 255, 255, 255), shadow=shadow)

    top_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    title_y = round(64 * scale)
    draw_line(top_img, title_y, TITLE, big_f, (255, 255, 255, 255), shadow=shadow)
    draw_line(top_img, title_y + round(big_f.size * 1.05) + round(0.85 * 16 * scale), SUBTITLE, sub_f,
              (255, 255, 255, 230), shadow=(1, 12 * scale / 2, 150))

    def to_bgra(img):
        arr = np.asarray(img, np.float32) / 255.0
        return np.dstack([arr[..., 2] * 255, arr[..., 1] * 255, arr[..., 0] * 255, arr[..., 3]])

    return shade, to_bgra(top_img), to_bgra(bottom_img)


def blend(screen, layer, opacity, dy=0):
    if opacity <= 0:
        return screen
    if dy:
        layer = np.roll(layer, round(dy), axis=0)
    a = layer[..., 3:4] * opacity
    return screen * (1 - a) + layer[..., :3] * a


def text_progress(t):
    """0 → 1 over the fade, with the page's ease-out rise."""
    start = 2 * HOLD + 2 * ZOOM + TEXT_IN
    k = np.clip((t - start) / TEXT_FADE, 0, 1)
    return 1 - (1 - k) ** 3


def to_screen(cx, cy, h):
    s = H / h
    return s, np.float32([[s, 0, W / 2 - cx * s], [0, s, H / 2 - cy * s]])


def rounded_alpha(x0, y0, x1, y1, r):
    """Anti-aliased alpha of a rounded rectangle, in screen pixels, over the full frame (cropped to bbox)."""
    alpha = np.zeros((H, W), np.float32)
    bx0, by0 = max(int(np.floor(x0)) - 1, 0), max(int(np.floor(y0)) - 1, 0)
    bx1, by1 = min(int(np.ceil(x1)) + 1, W), min(int(np.ceil(y1)) + 1, H)
    if bx1 <= bx0 or by1 <= by0:
        return alpha
    ys, xs = np.mgrid[by0:by1, bx0:bx1].astype(np.float32) + 0.5
    cxr, cyr = (x0 + x1) / 2, (y0 + y1) / 2
    hx, hy = (x1 - x0) / 2 - r, (y1 - y0) / 2 - r
    dx, dy = np.maximum(np.abs(xs - cxr) - hx, 0), np.maximum(np.abs(ys - cyr) - hy, 0)
    d = np.sqrt(dx ** 2 + dy ** 2) - r
    alpha[by0:by1, bx0:bx1] = np.clip(0.5 - d, 0, 1)
    return alpha


def tone_for(path, frames=120):
    """Per-clip (saturation scale, V lookup table) that brings mean HSV S/V down to the targets.
    Brightness is lowered by an exposure-style scale rather than a gamma curve.
    Only darkens and desaturates; clips already at or below the targets are left alone."""
    cap, vs, ss = cv2.VideoCapture(path), [], []
    for n in range(frames):
        ok, f = cap.read()
        if not ok:
            break
        if n % 6 == 0:
            hsv = cv2.cvtColor(cv2.resize(f, (148, 108), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2HSV)
            ss.append(hsv[..., 1].ravel()); vs.append(hsv[..., 2].ravel())
    v = np.concatenate(vs).astype(np.float32) / 255
    sat = min(1.0, TARGET_S / float(np.concatenate(ss).mean()))
    k = min(1.0, TARGET_V / (float(v.mean()) * 255))   # exposure scale; keeps midtone contrast
    lut = np.clip(np.arange(256) * k + 0.5, 0, 255).astype(np.uint8)
    print(f"tone {path}: saturation x{sat:.2f}, exposure x{k:.2f}")
    return sat, lut


def apply_tone(frame, tone):
    sat, lut = tone
    if sat >= 0.999 and lut[128] == 128:
        return frame
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    hsv[..., 1] = (hsv[..., 1].astype(np.float32) * sat).astype(np.uint8)
    hsv[..., 2] = lut[hsv[..., 2]]
    return cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)


def place(frame, cell_x, cell_y, s, m):
    """Warp a full-resolution 4:3 clip frame onto its grid cell, in screen space."""
    fh, fw = frame.shape[:2]
    k = CELL_W * s / fw                              # screen px per clip px
    if k < 1:                                        # shrink first so small tiles do not shimmer
        frame = cv2.resize(frame, (max(1, round(fw * k)), max(1, round(fh * k))), interpolation=cv2.INTER_AREA)
        fh, fw = frame.shape[:2]
    a = np.float32([[CELL_W / fw, 0, cell_x], [0, CELL_H / fh, cell_y], [0, 0, 1]])
    full = np.vstack([m, [0, 0, 1]]) @ a
    return cv2.warpAffine(frame, full[:2], (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


def main(grid_path, out_path, clip_paths):
    grid = cv2.VideoCapture(grid_path)
    clips = [cv2.VideoCapture(p) for p in clip_paths]
    tones = [tone_for(p) for p in clip_paths]
    cells = [(BLOCK_COL, BLOCK_ROW), (BLOCK_COL + 1, BLOCK_ROW), (BLOCK_COL, BLOCK_ROW + 1), (BLOCK_COL + 1, BLOCK_ROW + 1)]
    total = round((2 * HOLD + 2 * ZOOM + FINAL_HOLD) * FPS)
    shade, top_text, bottom_text = draw_text_layers()
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                            "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", out_path],
                           stdin=subprocess.PIPE)
    weights = np.ones((H, W), np.float32)
    for n in range(total):
        t = n / FPS
        ok, base = grid.read()
        assert ok, "grid video too short"
        cx, cy, h, block_dim, out_dim = camera(t)
        s, m = to_screen(cx, cy, h)

        # Dim cells by focus, in grid space, then move everything to the screen.
        weights[:] = out_dim
        bx, by = BLOCK_COL * CELL_W, BLOCK_ROW * CELL_H
        weights[by:by + 2 * CELL_H, bx:bx + 2 * CELL_W] = block_dim
        weights[by:by + CELL_H, bx:bx + CELL_W] = 1.0
        screen = cv2.warpAffine(base, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
        wscreen = cv2.warpAffine(weights, m, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

        for i, ((c, r), cap) in enumerate(zip(cells, clips)):
            ok, frame = cap.read()
            assert ok, f"clip {clip_paths[i]} too short"
            frame = apply_tone(frame, tones[i])
            gx, gy = c * CELL_W, r * CELL_H
            g = GAP // 2
            x0, y0 = gx * s + m[0, 2], gy * s + m[1, 2]
            x1, y1 = (gx + CELL_W) * s + m[0, 2], (gy + CELL_H) * s + m[1, 2]
            if x1 < 0 or y1 < 0 or x0 > W or y0 > H:
                continue
            alpha = rounded_alpha(x0 + g * s, y0 + g * s, x1 - g * s, y1 - g * s, RADIUS * s)[..., None]
            tile = place(frame, gx, gy, s, m).astype(np.float32)
            screen = screen * (1 - alpha) + tile * alpha

        screen = screen * wscreen[..., None]
        k = text_progress(t)
        if k > 0:
            rise = (1 - k) * 14 * 1.3                # translateY(14px) → 0
            screen = blend(screen, shade, k)
            screen = blend(screen, top_text, k, -rise)
            screen = blend(screen, bottom_text, k, rise)
        out = np.clip(screen + 0.5, 0, 255).astype(np.uint8)
        enc.stdin.write(out.tobytes())
    enc.stdin.close()
    enc.wait()
    print(f"{out_path}: {total} frames, {total / FPS:.2f} s")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3:7])
