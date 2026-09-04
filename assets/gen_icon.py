#!/usr/bin/env python3
"""Generate the Word Cycle Highlight extension icon + README demo image.

Draws at a high internal resolution and downsamples for anti-aliasing, so the
icon stays crisp when VS Code renders it at 128px.

The palette below mirrors the extension defaults in extension.js:
    color1 = #FFD000 (yellow)
    color2 = #22C55E (green)
    color3 = #3B82F6 (blue)

Usage:
    python3 assets/gen_icon.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "images")
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
FONT_MONO_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
FONT_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Extension default palette
YELLOW = (255, 208, 0)
GREEN = (34, 197, 94)
BLUE = (59, 130, 246)
CYCLE = [YELLOW, GREEN, BLUE]

TEXT = (212, 220, 234)          # light editor text
DIM = (120, 133, 153)           # dimmed tokens
# Card gradient stops (editor-ish dark navy)
CARD_TOP = (36, 44, 58)
CARD_BOT = (17, 22, 32)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def vertical_gradient(size, top, bottom, bands=48):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    bh = h / bands
    for i in range(bands):
        color = lerp(top, bottom, i / (bands - 1))
        for y in range(int(i * bh), int((i + 1) * bh)):
            for x in range(w):
                px[x, y] = color
    return img


def rounded_card(base, box, radius, top, bottom):
    """Composites a vertically-graduated rounded-rect card onto base."""
    x0, y0, x1, y1 = box
    grad = vertical_gradient((x1 - x0, y1 - y0), top, bottom)
    mask = Image.new("L", grad.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], radius=radius, fill=255)
    base.paste(grad, (x0, y0), mask)
    return base


def rounded_box(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def draw_icon(size=1024):
    """size: internal render size; exported at 128/256."""
    SS = 4
    W = H = size
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # ---- Card ------------------------------------------------------------
    inset = int(W * 0.055)
    card = (inset, inset, W - inset, H - inset)
    radius = int(W * 0.19)
    rounded_card(img, card, radius, CARD_TOP, CARD_BOT)

    # 1px-ish light hairline around the card (soft edge on any theme)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle(
        card, radius=radius, outline=(255, 255, 255, 46), width=int(W * 0.008)
    )

    # ---- Code lines ------------------------------------------------------
    font = ImageFont.truetype(FONT_MONO_BOLD, int(W * 0.108))
    asc, desc = font.getmetrics()
    adv = font.getlength("m")
    line_h = asc + desc

    rows = [
        (0, "  alpha = 1"),   # index of token start = 2
        (1, "  beta  = 2"),
        (2, "  gamma = 3"),
    ]

    gap = int(line_h * 0.42)
    block_h = 3 * line_h + 2 * gap
    x0 = int(W * 0.155)
    # vertical center, nudged slightly up to compensate underline weight
    top = (H - block_h) // 2 - int(W * 0.008)

    pad = int(W * 0.012)
    tok_h_pad = int(W * 0.016)
    r = int(W * 0.020)
    underline_y_off = int(W * 0.012)
    underline_thick = max(3, int(W * 0.012))

    # text first, decorations on top, like real editor rendering
    for i, (_, line) in enumerate(rows):
        y = top + i * (line_h + gap)
        d.text((x0, y), line, font=font, fill=TEXT)

    for i, (tok_i, line) in enumerate(rows):
        color = CYCLE[i]
        y = top + i * (line_h + gap)
        baseline = y + asc
        ts = int(font.getlength(line[:tok_i]))
        tw = int(font.getlength(line[tok_i:tok_i + 5]))

        # translucent background marker, like the decoration backgroundColor
        hx0 = x0 + ts - pad
        hx1 = x0 + ts + tw + pad
        hy0 = baseline - asc + tok_h_pad
        hy1 = baseline + desc - tok_h_pad
        rounded_box(d, (hx0, hy0, hx1, hy1), r, color + (127,))

        # solid underline, like the decoration underline
        rounded_box(
            d,
            (x0 + ts - pad, baseline + underline_y_off,
             x0 + ts + tw + pad, baseline + underline_y_off + underline_thick),
            max(3, underline_thick // 2),
            color,
        )

    return img


def export_icon():
    big = draw_icon(1024)
    for out in ("icon.png",):
        for s in (256, 128):
            im = big.resize((s, s), Image.LANCZOS)
            path = os.path.join(IMG, f"icon{s}.png" if s == 128 else out)
            im.save(path)
    print("icon written:", os.path.join(IMG, "icon.png"))


# ---------------------------------------------------------------------------
# Demo image used in the README
# ---------------------------------------------------------------------------
def draw_demo():
    W, H = 1520, 640
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rounded_card(img, (0, 0, W - 1, H - 1), 36, CARD_TOP, CARD_BOT)
    d = ImageDraw.Draw(img)

    font = ImageFont.truetype(FONT_MONO, 46)
    small = ImageFont.truetype(FONT_MONO, 30)
    cap = ImageFont.truetype(FONT_SANS_BOLD, 52)
    asc, desc = font.getmetrics()
    line_h = asc + desc + 14
    x0, y0 = 90, 150
    bg_alpha = 168          # demo plaques: colored, with glyphs crisp on top
    underline = 5
    r = 12

    code = [
        (0, "const alpha = data[0];"),
        (1, "let   beta  = alpha + 1;"),
        (2, "const gamma = beta * 2;"),
        (3, "log(alpha); log(beta);"),
        (4, "log(gamma); return [alpha, beta, gamma];"),
    ]
    # which word gets which color; -1 = no highlight
    marks = [("alpha", 0), ("beta", 1), ("gamma", 2)]

    d.text((x0, 62), "Double-click a word to highlight every occurrence", font=cap, fill=(230, 236, 246, 255))
    d.text((x0, 125), "each new word cycles through the palette below", font=small, fill=DIM + (255,))

    for i, (_, line) in enumerate(code):
        x, y = x0, y0 + i * line_h
        # paint the highlight plaques + underlines first, then the glyphs on
        # top (mimics an editor decoration rendering behind the text)
        for word, ci in marks:
            off = line.find(word)
            if off == -1:
                continue
            color = CYCLE[ci]
            ts = font.getlength(line[:off])
            tw = font.getlength(word)
            d.rounded_rectangle(
                (x + ts - 14, y + asc - int(line_h * 0.28),
                 x + ts + tw + 14, y + asc + int(line_h * 0.16)),
                radius=r, fill=color + (bg_alpha,),
            )
            d.rounded_rectangle(
                (x + ts - 8, y + asc + int(line_h * 0.22),
                 x + ts + tw + 8, y + asc + int(line_h * 0.22) + underline),
                radius=3, fill=color,
            )
        d.text((x, y), line, font=font, fill=TEXT)

    # legend swatches
    sw_y = y0 + 5 * line_h + 46
    for ci, name in enumerate(("1st word", "2nd word", "3rd word")):
        color = CYCLE[ci]
        sx = x0 + ci * 250
        d.rounded_rectangle((sx, sw_y, sx + 56, sw_y + 56), radius=14, fill=color + (bg_alpha,))
        d.rounded_rectangle((sx, sw_y + 66, sx + 56, sw_y + 76), radius=4, fill=color)
        d.text((sx + 78, sw_y + 10), name, font=small, fill=(214, 222, 236, 255))

    path = os.path.join(IMG, "demo.png")
    img.save(path)
    print("demo written:", path)


if __name__ == "__main__":
    os.makedirs(IMG, exist_ok=True)
    export_icon()
    draw_demo()
