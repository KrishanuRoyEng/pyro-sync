#!/usr/bin/env python3
"""PYRO-SYNC 30 s Commercial Teaser Video Generator.
Beat-synced, cinematic product advertisement for NASA Space Apps Challenge 2026.
Team GammaRads: Krishanu Roy, Alivia Bhuiya.
"""
import glob
import math
import os
import subprocess
import sys
import wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS, DUR = 1920, 1080, 30, 30.0
BPM = 120
BEAT = 60.0 / BPM       # 0.50 s
BAR = 4 * BEAT          # 2.00 s
SR = 44100

# Color Palette (Obsidian Dark Theme with Radiance Amber & Wildfire Crimson)
BG = (10, 12, 16)
PANEL_BG = (18, 21, 27)
PANEL_BORDER = (36, 42, 53)
AMBER = (245, 158, 11)
AMBER_BRIGHT = (251, 191, 36)
RED = (239, 68, 68)
CYAN = (6, 182, 212)
EMERALD = (16, 185, 129)
TEXT_WHITE = (248, 250, 252)
TEXT_MUTED = (148, 163, 184)
TEXT_SUBTLE = (100, 116, 139)

URL = "pyro-sync-tau.vercel.app"
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------------ Typography
_font_cache = {}

def get_font(name, size):
    key = (name, size)
    if key not in _font_cache:
        try:
            p = subprocess.check_output(["fc-match", "-f", "%{file}", name], stderr=subprocess.DEVNULL).decode().strip()
            _font_cache[key] = ImageFont.truetype(p, int(size))
        except Exception:
            try:
                _font_cache[key] = ImageFont.truetype("DejaVuSans-Bold.ttf", int(size))
            except Exception:
                _font_cache[key] = ImageFont.load_default()
    return _font_cache[key]

SANS = "DejaVu Sans:bold"
MONO = "JetBrainsMono Nerd Font:bold"

def eo(x):
    """Cubic ease-out animation curve."""
    x = max(0.0, min(1.0, float(x)))
    return 1.0 - (1.0 - x) ** 3

def mix_col(c1, c2, factor):
    f = max(0.0, min(1.0, float(factor)))
    return tuple(int(c1[i] + (c2[i] - c1[i]) * f) for i in range(3))

def hex_points(cx, cy, r):
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(0, 360, 60)]

# Pre-render geometric hex backdrop
def build_background():
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)
    r = 54
    dx = 1.5 * r
    dy = math.sqrt(3) * r
    cols = int(W / dx) + 3
    rows = int(H / dy) + 3
    for c in range(-1, cols):
        for row in range(-1, rows):
            offset_y = dy / 2 if (c % 2) else 0
            cx = c * dx
            cy = row * dy + offset_y
            draw.polygon(hex_points(cx, cy, r - 3), outline=(18, 22, 28), width=1)
    return img

BACKGROUND_FRAME = build_background()

# Animated cluster constellations
CONSTELLATION = []
for c in range(8):
    for r in range(7):
        cx = 1200 + c * 85
        cy = 240 + r * 98 + (c % 2) * 49
        dist = math.hypot(c - 3.5, r - 3.2) / 4.2
        CONSTELLATION.append((cx, cy, max(0.0, 1.0 - dist)))

# ------------------------------------------------------------------ Browser Mockup Window
def render_browser_window(screenshot, progress, x, y, ww, wh):
    """Renders a sleek desktop browser window containing the screenshot with subtle motion."""
    win = Image.new("RGBA", (ww + 20, wh + 55), (0, 0, 0, 0))
    d = ImageDraw.Draw(win)

    # Ambient backglow / shadow
    for i in range(4):
        alpha = int(25 - i * 5)
        d.rounded_rectangle([i, i, ww + 19 - i, wh + 54 - i], radius=14, outline=(245, 158, 11, alpha), width=2)

    # Window container background
    d.rounded_rectangle([6, 6, ww + 14, wh + 48], radius=12, fill=(18, 21, 27, 255), outline=PANEL_BORDER, width=2)

    # Window header bar
    d.rounded_rectangle([6, 6, ww + 14, 44], radius=10, fill=(24, 28, 36, 255))
    d.rectangle([6, 32, ww + 14, 44], fill=(24, 28, 36, 255))
    d.line([6, 44, ww + 14, 44], fill=PANEL_BORDER, width=1)

    # Traffic light dots
    d.ellipse([22, 20, 32, 30], fill=RED)
    d.ellipse([38, 20, 48, 30], fill=AMBER)
    d.ellipse([54, 20, 64, 30], fill=EMERALD)

    # URL Pill in header
    d.rounded_rectangle([ww // 2 - 170, 14, ww // 2 + 170, 36], radius=6, fill=(15, 18, 23, 255), outline=(42, 48, 62, 255))
    d.text((ww // 2, 25), "🔒 pyro-sync-tau.vercel.app", font=get_font(MONO, 12), fill=TEXT_MUTED, anchor="mm")

    # Ken Burns pan/zoom on screenshot
    iw, ih = screenshot.size
    scale = max(ww / iw, (wh - 2) / ih) * (1.0 + 0.05 * progress)
    crop_w = min(iw, ww / scale)
    crop_h = min(ih, (wh - 2) / scale)
    cx = iw / 2 + (progress - 0.5) * iw * 0.02
    cy = ih / 2
    left = max(0.0, min(float(iw - crop_w), cx - crop_w / 2.0))
    top = max(0.0, min(float(ih - crop_h), cy - crop_h / 2.0))
    right = min(float(iw), left + crop_w)
    bottom = min(float(ih), top + crop_h)
    box = (int(left), int(top), int(right), int(bottom))
    view = screenshot.resize((ww, wh - 2), Image.BICUBIC, box=box)

    # Paste screenshot inside window
    win.paste(view, (7, 45))
    return win

# ------------------------------------------------------------------ Audio Synthesizer (Fallback)
def synth_audio():
    """Generates a punchy, 120 BPM electronic track synced with all transitions."""
    n = int(DUR * SR)
    drums = np.zeros(n)
    bass_buf = np.zeros(n)
    arp_buf = np.zeros(n)
    pad_buf = np.zeros(n)
    duck = np.ones(n)

    def tt(d):
        return np.arange(int(d * SR)) / SR

    def mtof(m):
        return 440.0 * 2.0 ** ((m - 69) / 12.0)

    def put(buf, snd, t, gain=1.0):
        i = int(round(t * SR))
        if 0 <= i < n:
            j = min(n, i + len(snd))
            buf[i:j] += snd[:j - i] * gain

    rng = np.random.default_rng(42)
    noise = lambda d: np.diff(rng.standard_normal(int(d * SR) + 1))

    # Instruments
    t_k = tt(0.38)
    kick = np.sin(2 * np.pi * np.cumsum(50 + 130 * np.exp(-t_k * 28)) / SR) * np.exp(-t_k * 8.5)
    t_c = tt(0.24)
    clap = noise(0.24) * np.exp(-t_c * 24) * 0.75
    t_h = tt(0.06)
    hat = noise(0.06) * np.exp(-t_h * 85) * 0.45
    t_oh = tt(0.35)
    ohat = noise(0.35) * np.exp(-t_oh * 12) * 0.4

    def synth_bass(f):
        t = tt(0.42)
        wave = (np.sin(2 * np.pi * f * t) + 0.6 * np.sin(4 * np.pi * f * t) + 0.35 * np.sin(6 * np.pi * f * t))
        return wave * np.minimum(t / 0.005, 1) * np.exp(-t * 5.2)

    def synth_pluck(f):
        t = tt(0.38)
        ph = 2 * np.pi * f * t
        return sum(np.sin(k * ph) / k for k in range(1, 6)) * np.exp(-t * 9.5)

    def synth_pad(chord, d):
        t = tt(d)
        return sum(np.sin(2 * np.pi * mtof(m) * t) for m in chord) * np.minimum(t / 0.35, 1) * np.exp(-t * 0.8)

    roots = [33, 29, 36, 31]
    arps = [[69, 72, 76], [65, 69, 72], [72, 76, 79], [71, 74, 79]]
    pads = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]

    # Bar 0 (0 - 2s): Riser
    t_rise = tt(BAR)
    r = t_rise / BAR
    put(drums, noise(BAR) * (r ** 2) * 0.55 + np.sin(2 * np.pi * np.cumsum(180 + 1600 * (r ** 2)) / SR) * r * 0.25, 0.0)
    for tc in (1.5, 1.75, 1.875):
        put(drums, clap, tc, 0.85)

    # Bars 1 to 14 (2s to 30s)
    kicks_ts = []
    for b in range(1, 15):
        start = b * BAR
        if b < 14:
            for k in range(4):
                put(drums, kick, start + k * BEAT, 1.05)
                kicks_ts.append(start + k * BEAT)
        else:
            put(drums, kick, start, 1.1)
            kicks_ts.append(start)

        if b <= 13:
            offs = [1, 3] if b != 11 else [2, 2.5, 3, 3.25, 3.5, 3.75]
            for k in offs:
                put(drums, clap, start + k * BEAT, 0.95)
            for k in np.arange(0.5, 4.0, 0.5 if b < 8 else 0.25):
                put(drums, hat, start + k * BEAT, 1.0)
            if b >= 3:
                put(drums, ohat, start + 3.5 * BEAT, 1.0)

        c = b % 4
        if 2 <= b <= 13 and b != 11:
            for k in (0, 1, 1.5, 2.5, 3, 3.5):
                put(bass_buf, synth_bass(mtof(roots[c])), start + k * BEAT, 0.65)

        if 4 <= b <= 13:
            seq = [0, 1, 2, 1, 0, 1, 2, 2] * 2
            for i in range(16):
                oct_up = 12 if i % 4 == 3 else 0
                put(arp_buf, synth_pluck(mtof(arps[c][seq[i]] + oct_up)), start + i * BEAT / 4, 0.18)

        if 8 <= b <= 13:
            put(pad_buf, synth_pad(pads[c], BAR), start, 0.06)

    # Climax crash at 24s
    t_sub = tt(1.5)
    put(drums, np.sin(2 * np.pi * 50 * t_sub) * np.exp(-t_sub * 2.8) * 1.3, 24.0, 0.9)
    put(drums, noise(1.8) * np.exp(-tt(1.8) * 2.2), 24.0, 0.45)
    put(pad_buf, synth_pad(pads[0], 5.0), 24.0, 0.08)

    # Sidechain ducking
    for ts in kicks_ts:
        i = int(ts * SR)
        j = min(n, i + int(0.32 * SR))
        duck[i:j] *= (1.0 - 0.72 * np.exp(-np.arange(j - i) / SR * 10.0))

    L = drums + (bass_buf + arp_buf + pad_buf) * duck
    R = drums + (bass_buf + arp_buf + pad_buf) * duck
    st = np.stack([L, R], 1)
    st = np.tanh(1.2 * st / max(1e-9, np.abs(st).max()) * 1.3) / np.tanh(1.2)

    # Master smooth fade out
    fade_len = int(0.8 * SR)
    st[-fade_len:] *= np.linspace(1.0, 0.0, fade_len)[:, None]

    out_wav = os.path.join(OUT, "pyro-sync-music.wav")
    with wave.open(out_wav, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())
    return out_wav

# ------------------------------------------------------------------ Frame Drawing Engine
def draw_frame(t, shots):
    img = BACKGROUND_FRAME.copy()
    draw = ImageDraw.Draw(img)

    # Helper for shots cycling
    get_shot = lambda idx: shots[idx % len(shots)]

    # Beat pulse
    beat_frac = (t % BEAT) / BEAT
    is_downbeat = beat_frac < 0.25
    pulse = max(0.0, 1.0 - beat_frac * 3.0)

    # -------------------------------------------------------------
    # 0.0s – 2.0s: Scene 1 · The Title Riser
    # -------------------------------------------------------------
    if t < 2.0:
        p = t / 2.0
        # Animated constellation
        for cx, cy, v in CONSTELLATION:
            if v > 0:
                rad = int(32 * (0.6 + 0.4 * pulse))
                col = mix_col(PANEL_BG, AMBER, v * p)
                draw.polygon(hex_points(cx, cy, rad), fill=col, outline=PANEL_BORDER)

        q = eo(t / 0.4)
        draw.text((120, 360), "PYRO-SYNC", font=get_font(MONO, 115), fill=TEXT_WHITE)
        draw.line([120, 500, 120 + int(700 * q), 500], fill=AMBER, width=4)

        q2 = eo(max(0.0, (t - 0.5) / 0.5))
        if q2 > 0:
            draw.text((125, 530), "One Unified Climate Fire Record.", font=get_font(SANS, 42), fill=TEXT_WHITE)
            draw.text((125, 595), "Across Two Decades & Five NASA Satellites.", font=get_font(SANS, 34), fill=AMBER)

        q3 = eo(max(0.0, (t - 1.0) / 0.4))
        if q3 > 0:
            draw.text((125, 680), "26 YEARS OF NASA FIRMS TELEMETRY (2000–2026)", font=get_font(MONO, 20), fill=TEXT_MUTED)

    # -------------------------------------------------------------
    # 2.0s – 4.0s: Scene 2 · The 4.9x Paradox Hook
    # -------------------------------------------------------------
    elif t < 4.0:
        lt = t - 2.0
        q = eo(lt / 0.35)

        # Huge glowing 4.9x impact
        draw.text((120, 200), "4.9×", font=get_font(MONO, 280), fill=AMBER)
        draw.text((125, 540), "THE FALSE 2012 WILDFIRE SURGE", font=get_font(MONO, 32), fill=RED)

        q2 = eo(max(0.0, (lt - 0.5) / 0.4))
        if q2 > 0:
            draw.text((125, 610), "When NASA launched the 375m VIIRS sensor in 2012,", font=get_font(SANS, 42), fill=TEXT_WHITE)
            draw.text((125, 675), "raw active fire detections artificially quintupled.", font=get_font(SANS, 42), fill=TEXT_WHITE)

        q3 = eo(max(0.0, (lt - 1.0) / 0.4))
        if q3 > 0:
            draw.text((125, 765), "→ Not more fire energy. Geometric sub-pixel fragmentation.", font=get_font(MONO, 24), fill=TEXT_MUTED)

    # -------------------------------------------------------------
    # 4.0s – 8.0s: Scene 3 · Mathematical Harmonization
    # -------------------------------------------------------------
    elif t < 8.0:
        lt = t - 4.0
        p = lt / 4.0
        ww, wh = 1120, 630
        wx = 720
        wy = (H - wh) // 2

        win = render_browser_window(get_shot(0), p, wx, wy, ww, wh)
        img.paste(win, (wx - 10, wy - 30), win)

        q1 = eo(lt / 0.3)
        draw.text((110, 260), "● MATHEMATICAL FORMULATION", font=get_font(MONO, 18), fill=AMBER)
        draw.text((110, 310), "Harmonize It.", font=get_font(SANS, 82), fill=TEXT_WHITE)

        q2 = eo(max(0.0, (lt - 0.6) / 0.4))
        if q2 > 0:
            draw.text((110, 420), "4.9× → 1.08×", font=get_font(MONO, 58), fill=EMERALD)
            draw.text((110, 500), "Equal-Energy Sensor Invariance", font=get_font(SANS, 28), fill=TEXT_WHITE)
            draw.text((110, 545), "Within ±8% of Ground Physical Release", font=get_font(SANS, 22), fill=TEXT_MUTED)

        q3 = eo(max(0.0, (lt - 1.2) / 0.4))
        if q3 > 0:
            draw.rounded_rectangle([110, 620, 620, 680], radius=8, fill=PANEL_BG, outline=PANEL_BORDER)
            draw.text((130, 650), "Index = Σ FRP_cell / N_active", font=get_font(MONO, 22), fill=AMBER_BRIGHT, anchor="lm")
            draw.text((110, 720), "STRICTLY DETERMINISTIC · ZERO LLM HALLUCINATIONS", font=get_font(MONO, 16), fill=TEXT_SUBTLE)

    # -------------------------------------------------------------
    # 8.0s – 12.0s: Scene 4 · The 26-Year Burning Calendar Matrix
    # -------------------------------------------------------------
    elif t < 12.0:
        lt = t - 8.0
        p = lt / 4.0
        ww, wh = 1120, 630
        wx = 720
        wy = (H - wh) // 2

        win = render_browser_window(get_shot(1), p, wx, wy, ww, wh)
        img.paste(win, (wx - 10, wy - 30), win)

        draw.text((110, 260), "● CONTINUOUS TEMPORAL MATRIX", font=get_font(MONO, 18), fill=AMBER)
        draw.text((110, 310), "26 Years.", font=get_font(SANS, 80), fill=TEXT_WHITE)
        draw.text((110, 400), "One Calendar.", font=get_font(SANS, 74), fill=AMBER)

        q2 = eo(max(0.0, (lt - 0.6) / 0.4))
        if q2 > 0:
            draw.text((110, 510), "1,352 Calendar Weeks", font=get_font(MONO, 32), fill=TEXT_WHITE)
            draw.text((110, 560), "Seasonal multi-decadal baseline (μ_w, σ_w).", font=get_font(SANS, 24), fill=TEXT_MUTED)
            draw.text((110, 600), "Rolling Z-score anomaly standardization.", font=get_font(SANS, 24), fill=TEXT_MUTED)

        q3 = eo(max(0.0, (lt - 1.2) / 0.4))
        if q3 > 0:
            draw.rounded_rectangle([110, 660, 580, 720], radius=8, fill=PANEL_BG, outline=PANEL_BORDER)
            draw.text((130, 690), "Z ≥ +2.0σ  Extreme Ecological Breakout", font=get_font(MONO, 18), fill=RED, anchor="lm")

    # -------------------------------------------------------------
    # 12.0s – 16.0s: Scene 5 · Interactive H3 Hexagonal Map
    # -------------------------------------------------------------
    elif t < 16.0:
        lt = t - 12.0
        p = lt / 4.0
        ww, wh = 1120, 630
        wx = 720
        wy = (H - wh) // 2

        win = render_browser_window(get_shot(2), p, wx, wy, ww, wh)
        img.paste(win, (wx - 10, wy - 30), win)

        draw.text((110, 260), "● SPATIAL QUANTIZATION", font=get_font(MONO, 18), fill=AMBER)
        draw.text((110, 310), "Click a Week.", font=get_font(SANS, 80), fill=TEXT_WHITE)
        draw.text((110, 400), "See It Burn.", font=get_font(SANS, 74), fill=AMBER)

        q2 = eo(max(0.0, (lt - 0.6) / 0.4))
        if q2 > 0:
            draw.text((110, 510), "Uber H3 Resolution 7", font=get_font(MONO, 32), fill=CYAN)
            draw.text((110, 560), "Snaps point detections into discrete ~5.16 km² hexes.", font=get_font(SANS, 24), fill=TEXT_MUTED)
            draw.text((110, 600), "Groups by (hex, day, sat) to collapse split energy.", font=get_font(SANS, 24), fill=TEXT_MUTED)

        q3 = eo(max(0.0, (lt - 1.2) / 0.4))
        if q3 > 0:
            draw.rounded_rectangle([110, 660, 580, 720], radius=8, fill=PANEL_BG, outline=PANEL_BORDER)
            draw.text((130, 690), "2.0 MW Cell-Integrated Sensitivity Floor", font=get_font(MONO, 18), fill=AMBER, anchor="lm")

    # -------------------------------------------------------------
    # 16.0s – 20.0s: Scene 6 · Rapid Regional Tour (1 s per region)
    # -------------------------------------------------------------
    elif t < 20.0:
        reg_idx = int(t - 16.0)
        lt = (t - 16.0) % 1.0
        p = lt

        regions = [
            ("PUNJAB", "CROP RESIDUE BURNING", "🌾 AGRI-BURN REGIME", AMBER, 3),
            ("CALIFORNIA", "CAMP FIRE & WILDFIRES", "🔥 WILDFIRE-FRONT REGIME", RED, 4),
            ("AMAZON", "DEFORESTATION CLEARING", "🌴 TROPICAL CLEARING REGIME", CYAN, 5),
            ("WORLDWIDE", "57.7M NASA HOTSPOTS", "🌍 GLOBAL PLANETARY H3", EMERALD, 6),
        ]
        r_name, r_sub, r_badge, r_col, r_shot = regions[min(3, reg_idx)]

        ww, wh = 1120, 630
        wx = 720
        wy = (H - wh) // 2
        win = render_browser_window(get_shot(r_shot), p, wx, wy, ww, wh)
        img.paste(win, (wx - 10, wy - 30), win)

        draw.text((110, 290), f"0{reg_idx + 1} / 04 · BENCHMARK REGIONS", font=get_font(MONO, 18), fill=r_col)
        draw.text((110, 350), r_name, font=get_font(SANS, 84), fill=TEXT_WHITE)
        draw.text((110, 460), r_sub, font=get_font(SANS, 28), fill=TEXT_MUTED)

        draw.rounded_rectangle([110, 540, 560, 605], radius=8, fill=PANEL_BG, outline=r_col, width=2)
        draw.text((130, 572), r_badge, font=get_font(MONO, 22), fill=r_col, anchor="lm")

    # -------------------------------------------------------------
    # 20.0s – 24.0s: Scene 7 · Kinetic Feature Blitz
    # -------------------------------------------------------------
    elif t < 24.0:
        card_idx = int(t - 20.0)
        lt = (t - 20.0) % 1.0
        q = eo(lt / 0.25)

        features = [
            ("DETERMINISTIC FORMULATION", "No LLM hallucinations in the numeric path.", "01 / 04", AMBER),
            ("PHYSICAL REGIME TAGGING", "Contiguity & FRP intensity clustering.", "02 / 04", RED),
            ("LIVE 24H SATELLITE FEED", "NASA FIRMS NRT streaming with 15m caching.", "03 / 04", CYAN),
            ("ZERO CLAIMED FABRICATION", "Verified against NASA manifest acquisition records.", "04 / 04", EMERALD),
        ]
        f_title, f_desc, f_num, f_col = features[min(3, card_idx)]

        # Center stage kinetic presentation
        draw.text((W // 2, 330), f_num, font=get_font(MONO, 32), fill=f_col, anchor="mm")
        draw.text((W // 2, 430), f_title, font=get_font(SANS, 82), fill=TEXT_WHITE, anchor="mm")
        draw.text((W // 2, 530), f_desc, font=get_font(SANS, 34), fill=TEXT_MUTED, anchor="mm")

        # 4-stage animated progress dots
        bar_w = 600
        start_x = (W - bar_w) // 2
        for i in range(4):
            cx = start_x + i * (bar_w // 3)
            col = f_col if i <= card_idx else PANEL_BORDER
            draw.ellipse([cx - 10, 630, cx + 10, 650], fill=col)
            if i < 3:
                lcol = f_col if i < card_idx else PANEL_BORDER
                draw.line([cx + 10, 640, cx + (bar_w // 3) - 10, 640], fill=lcol, width=3)

    # -------------------------------------------------------------
    # 24.0s – 30.0s: Scene 8 · Grand Outro & Credits
    # -------------------------------------------------------------
    else:
        lt = t - 24.0
        q = eo(lt / 0.4)

        # Pulse constellation
        for cx, cy, v in CONSTELLATION:
            rad = int(36 * (0.8 + 0.2 * pulse))
            draw.polygon(hex_points(cx, cy, rad), fill=PANEL_BG, outline=PANEL_BORDER)

        draw.text((W // 2, 280), "PYRO-SYNC", font=get_font(MONO, 120), fill=TEXT_WHITE, anchor="mm")
        draw.text((W // 2, 380), "Decadal Satellite Wildfire Telemetry Harmonizer", font=get_font(SANS, 34), fill=AMBER, anchor="mm")

        q2 = eo(max(0.0, (lt - 1.0) / 0.4))
        if q2 > 0:
            # URL Box
            draw.rounded_rectangle([W // 2 - 340, 440, W // 2 + 340, 520], radius=10, fill=PANEL_BG, outline=AMBER, width=2)
            draw.text((W // 2, 480), f"🌐 {URL}", font=get_font(MONO, 32), fill=TEXT_WHITE, anchor="mm")

        q3 = eo(max(0.0, (lt - 2.0) / 0.4))
        if q3 > 0:
            draw.text((W // 2, 620), "Team GammaRads", font=get_font(SANS, 52), fill=TEXT_WHITE, anchor="mm")
            draw.text((W // 2, 690), "Krishanu Roy   ·   Alivia Bhuiya", font=get_font(SANS, 36), fill=AMBER_BRIGHT, anchor="mm")
            draw.text((W // 2, 780), "NASA SPACE APPS CHALLENGE 2026", font=get_font(MONO, 24), fill=TEXT_MUTED, anchor="mm")
            draw.text((W // 2, 830), "DATA SOURCE: NASA EARTHDATA / FIRMS (2000–2026)", font=get_font(MONO, 18), fill=TEXT_SUBTLE, anchor="mm")

    # -------------------------------------------------------------
    # Transition Wipes on Major Bar Drops (t = 2, 4, 8, 12, 16, 20, 24)
    # -------------------------------------------------------------
    for t_cut in (2.0, 4.0, 8.0, 12.0, 16.0, 20.0, 24.0):
        wipe_p = (t - t_cut) / 0.22
        if 0.0 <= wipe_p < 1.0:
            x_pos = int(-300 + (W + 300) * wipe_p)
            draw.rectangle([x_pos, 0, x_pos + 260, H], fill=AMBER)

    # Downbeat impact flash on t=0, t=2, t=24
    if t < 0.12 or (2.0 <= t < 2.18) or (24.0 <= t < 24.2):
        img = Image.blend(img, Image.new("RGB", (W, H), TEXT_WHITE), 0.35)

    # Final Smooth Fade-Out to Black at end (29.2s -> 30.0s)
    if t > (DUR - 0.8):
        fade = min(1.0, (t - (DUR - 0.8)) / 0.8)
        img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), fade)

    # Initial Smooth Fade-In from Black (0.0s -> 0.4s)
    if t < 0.4:
        fade_in = 1.0 - (t / 0.4)
        img = Image.blend(img, Image.new("RGB", (W, H), (0, 0, 0)), fade_in)

    # -------------------------------------------------------------
    # Bottom Telemetry Progress Bar & Beat Status
    # -------------------------------------------------------------
    progress_px = int(W * (t / DUR))
    draw.rectangle([0, H - 6, W, H], fill=(20, 24, 30))
    draw.rectangle([0, H - 6, progress_px, H], fill=AMBER)

    # Monospace timecode top right
    mins = int(t // 60)
    secs = int(t % 60)
    frames = int((t % 1) * 30)
    tc_str = f"{mins:02d}:{secs:02d}:{frames:02d} / 00:30:00"
    draw.text((W - 60, 45), tc_str, font=get_font(MONO, 18), fill=TEXT_SUBTLE, anchor="rm")

    # Beat indicator dot
    dot_col = AMBER if is_downbeat else PANEL_BORDER
    draw.ellipse([W - 45, 38, W - 31, 52], fill=dot_col)

    return img

# ------------------------------------------------------------------ Video Render Entrypoint
def render():
    shots_files = sorted(
        sum([glob.glob(os.path.join(HERE, "shots", f"*{ext}")) for ext in (".png", ".jpg", ".jpeg")], [])
    )
    if not shots_files:
        sys.exit("Error: No screenshots found in teaser/shots/.")

    print(f"Loaded {len(shots_files)} screenshots from teaser/shots/:")
    for f in shots_files:
        print("  -", os.path.basename(f))

    shots = [Image.open(f).convert("RGB") for f in shots_files]

    # Audio handling: check uploaded wav first, else synthesize
    audio_path = os.path.join(HERE, "pyro-sync-music.wav")
    if not os.path.exists(audio_path):
        print("Synthesizing original 120 BPM electronic soundtrack...")
        audio_path = synth_audio()
    else:
        print(f"Using audio track: {audio_path}")

    out_mp4 = os.path.join(OUT, "pyro-sync-teaser.mp4")
    total_frames = int(DUR * FPS)
    print(f"Rendering {total_frames} frames ({DUR}s at {FPS} FPS, 1080p)...")

    ffmpeg_cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-f", "rawvideo",
        "-pix_fmt", "rgb24",
        "-s", f"{W}x{H}",
        "-r", str(FPS),
        "-i", "-",
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "17",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "256k",
        "-t", str(DUR),
        "-movflags", "+faststart",
        out_mp4,
    ]

    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)

    for i in range(total_frames):
        t = i / FPS
        frame = draw_frame(t, shots)
        proc.stdin.write(frame.tobytes())
        if i % 90 == 0 or i == total_frames - 1:
            pct = (i / total_frames) * 100
            print(f"  Frame {i}/{total_frames} ({pct:.0f}%) · t = {t:.1f}s", flush=True)

    proc.stdin.close()
    proc.wait()

    if proc.returncode == 0:
        size_mb = os.path.getsize(out_mp4) / (1024 * 1024)
        print(f"\n✅ Video successfully rendered: {out_mp4} ({size_mb:.2f} MB)")
    else:
        print("❌ FFmpeg encoding failed.")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "music":
        print(synth_audio())
    else:
        render()
