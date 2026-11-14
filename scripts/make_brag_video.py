#!/usr/bin/env python3
"""
PYRO-SYNC Launch Video Producer (30-second horizontal MP4)
Integrates /brag specifications:
- Actual app screenshots
- Visual callouts and pointer annotations explaining components
- Crisp telemetry HUD and one-liner pitch statement
- Bundled brag soundtrack: ende.app "Happy Beats / Business Moves"
"""

import os
import sys
import subprocess
from PIL import Image, ImageDraw, ImageFont

FRAMES_DIR = "brag-output/rendered_frames"
OUTPUT_MP4 = "brag-output/brag.mp4"
OUTPUT_POSTER = "brag-output/brag.jpg"
MUSIC_TRACK = "/tmp/brag-repo/skills/brag/assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3"

WIDTH, HEIGHT = 1920, 1080
FPS = 30
TOTAL_SECONDS = 30
TOTAL_FRAMES = FPS * TOTAL_SECONDS

os.makedirs(FRAMES_DIR, exist_ok=True)

# Load base screenshots
raw_hero = Image.open("brag-output/frames/raw_hero.png").convert("RGBA").resize((WIDTH, HEIGHT))
raw_problem = Image.open("brag-output/frames/raw_problem.png").convert("RGBA").resize((WIDTH, HEIGHT))
raw_method = Image.open("brag-output/frames/raw_methodology.png").convert("RGBA").resize((WIDTH, HEIGHT))
raw_workbench = Image.open("brag-output/frames/raw_workbench.png").convert("RGBA").resize((WIDTH, HEIGHT))

# Try loading system fonts
try:
    font_title = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", 36)
    font_subtitle = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans.ttf", 22)
    font_callout = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", 20)
    font_mono = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSansMono.ttf", 18)
    font_hero = ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", 52)
except Exception:
    font_title = ImageFont.load_default()
    font_subtitle = font_title
    font_callout = font_title
    font_mono = font_title
    font_hero = font_title


def draw_hud(draw, title, subtitle, step_text=""):
    """Draws top and bottom telemetry overlay bars with 3D bezel aesthetics."""
    # Top HUD Bar
    draw.rectangle([0, 0, WIDTH, 80], fill=(13, 17, 24, 235))
    draw.line([0, 80, WIDTH, 80], fill=(56, 189, 248, 255), width=2)
    
    # Title badge
    draw.rectangle([30, 18, 220, 62], fill=(245, 158, 11, 255))
    draw.text((45, 26), "PYRO-SYNC", fill=(0, 0, 0), font=font_title)
    
    # Scene Title
    draw.text((245, 20), title, fill=(255, 255, 255), font=font_title)
    draw.text((248, 52), subtitle, fill=(148, 163, 184), font=font_subtitle)
    
    # Step indicator
    if step_text:
        draw.rectangle([WIDTH - 320, 22, WIDTH - 30, 58], fill=(30, 41, 59, 230), outline=(56, 189, 248))
        draw.text((WIDTH - 305, 28), step_text, fill=(56, 189, 248), font=font_callout)
        
    # Bottom HUD Bar
    draw.rectangle([0, HEIGHT - 60, WIDTH, HEIGHT], fill=(13, 17, 24, 235))
    draw.line([0, HEIGHT - 60, WIDTH, HEIGHT - 60], fill=(34, 43, 56, 255), width=2)
    draw.text((30, HEIGHT - 44), "NASA FIRMS ACTIVE FIRE HARMONIZATION · MODIS (TERRA/AQUA) & VIIRS (S-NPP/NOAA-20/NOAA-21)", fill=(148, 163, 184), font=font_mono)
    draw.text((WIDTH - 420, HEIGHT - 44), "CALIBRATED RECORD: 2000–2026", fill=(245, 158, 11), font=font_mono)


def draw_callout_box(draw, x, y, w, h, header, lines, color=(245, 158, 11)):
    """Draws a callout pointer box explaining a specific UI feature."""
    # Semi-transparent card
    draw.rectangle([x, y, x + w, y + h], fill=(17, 21, 31, 240), outline=color, width=2)
    draw.rectangle([x, y, x + w, y + 34], fill=color)
    draw.text((x + 12, y + 6), header, fill=(0, 0, 0), font=font_callout)
    
    cur_y = y + 44
    for line in lines:
        draw.text((x + 12, cur_y), line, fill=(241, 245, 249), font=font_subtitle)
        cur_y += 28


print("Generating video frames...")

# We will generate 6 key scenes, 5 seconds each (150 frames)
# Scene 1: 0 - 5s (Frames 0 - 149) -> Product Intro & Motivation
# Scene 2: 5 - 10s (Frames 150 - 299) -> The Sensor Disparity Paradox
# Scene 3: 10 - 15s (Frames 300 - 449) -> 4-Stage Harmonization Pipeline
# Scene 4: 15 - 20s (Frames 450 - 599) -> Interactive Workbench & Hex Map
# Scene 5: 20 - 25s (Frames 600 - 749) -> 26-Year Calendar Matrix & Anomaly Detection
# Scene 6: 25 - 30s (Frames 750 - 899) -> One-Liner Pitch Outro

for frame_idx in range(TOTAL_FRAMES):
    t = frame_idx / FPS  # current time in seconds
    
    if t < 5.0:
        # Scene 1: Intro Hero
        base = raw_hero.copy()
        draw = ImageDraw.Draw(base)
        draw_hud(draw, "THE PROBLEM & PLATFORM", "Decadal Wildfire Telemetry Across Sensor Generations", "STAGE 01 / 05")
        draw_callout_box(draw, 100, 360, 680, 170, "EXECUTIVE DISCOVERY", [
            "In 2012, raw fire counts surged 4.9x falsely.",
            "VIIRS 375m pixels fragmented 1km fires into 7+ dots.",
            "PYRO-SYNC restores mathematical multi-decadal continuity."
        ], color=(245, 158, 11))
        
    elif t < 10.0:
        # Scene 2: Sensor Disparity Paradox
        base = raw_problem.copy()
        draw = ImageDraw.Draw(base)
        draw_hud(draw, "THE SENSOR DISPARITY PARADOX", "Sub-Pixel Fire Fragmentation (1 MODIS Detection vs 7 VIIRS Detections)", "STAGE 02 / 05")
        draw_callout_box(draw, 1100, 240, 720, 180, "SUB-PIXEL GEOMETRY PARADOX", [
            "MODIS: 1,000m pixel integrates 10 MW into 1 hotspot.",
            "VIIRS: 375m pixels fragment identical fire into 7 detections.",
            "Total radiative energy is identical (10 MW)!"
        ], color=(239, 68, 68))
        draw_callout_box(draw, 1100, 460, 720, 160, "OVERPASS MULTIPLICATION", [
            "2000: 1 Terra pass/day -> 2024: 6 satellite passes/day.",
            "Sampling probability tripled across decades."
        ], color=(56, 189, 248))
        
    elif t < 15.0:
        # Scene 3: 4-Stage Harmonization Pipeline
        base = raw_method.copy()
        draw = ImageDraw.Draw(base)
        draw_hud(draw, "4-STAGE HARMONIZATION MATHEMATICS", "Spatial H3 Binning -> Cell Cutoff -> Overpass Effort Normalization", "STAGE 03 / 05")
        draw_callout_box(draw, 80, 300, 640, 220, "THE MATHEMATICAL ENGINE", [
            "1. H3 Hexagonal Binning (Res 7: ~5.16 km²)",
            "2. Cell-Level FRP Cutoff: FRP_cell >= 2.0 MW",
            "3. Overpass Effort Normalization: Index = FRP / N_sats",
            "4. Multi-Decadal Z-Score: Z = (Index - μ_w) / σ_w"
        ], color=(16, 185, 129))
        
    elif t < 20.0:
        # Scene 4: Interactive Workbench
        base = raw_workbench.copy()
        draw = ImageDraw.Draw(base)
        draw_hud(draw, "LIVE TELEMETRY WORKBENCH", "WebGL Hexagon Layer & Real-Time Parameter Tuning", "STAGE 04 / 05")
        draw_callout_box(draw, 60, 140, 520, 160, "INTERACTIVE H3 LAYER", [
            "Hardware-accelerated MapLibre + deck.gl",
            "Colored by Fire Radiative Power density (MW/km²)",
            "Click hex for localized calendar history"
        ], color=(56, 189, 248))
        draw_callout_box(draw, 1220, 140, 640, 180, "TELEMETRY INSPECTOR & CONTROLS", [
            "Resizable sidebar with zero-cutoff smart tooltips",
            "Tune VIIRS FRP cutoff slider (0.1 to 10 MW)",
            "Inspect verified satellite manifest lifetimes"
        ], color=(245, 158, 11))
        
    elif t < 25.0:
        # Scene 5: 26-Year Burning Activity Matrix
        base = raw_workbench.copy()
        draw = ImageDraw.Draw(base)
        draw_hud(draw, "26-YEAR BURNING MATRIX & ANOMALIES", "Continuous Weekly Record (2000–2026) with Multi-Decadal Z-Scores", "STAGE 05 / 05")
        draw_callout_box(draw, 80, 680, 640, 160, "BURNING ACTIVITY MATRIX", [
            "26 years × 52 calendar weeks (1,352 observations)",
            "Filters seasonal cycles to isolate true fire extremes",
            "Z >= 2.0σ threshold isolates catastrophic anomalies"
        ], color=(239, 68, 68))
        draw_callout_box(draw, 1150, 680, 680, 160, "EMPIRICAL CALIBRATION PROOF", [
            "8% Equal-Energy Calibration Test verified in CI/CD",
            "Raw count jump eliminated; thermal energy preserved",
            "Tested across Punjab, California, and Amazon"
        ], color=(16, 185, 129))
        
    else:
        # Scene 6: Pitch One-Liner Outro
        base = Image.new("RGBA", (WIDTH, HEIGHT), (10, 13, 20, 255))
        draw = ImageDraw.Draw(base)
        
        # Subtle glowing background grid lines
        for gx in range(0, WIDTH, 80):
            draw.line([gx, 0, gx, HEIGHT], fill=(22, 28, 38, 120), width=1)
        for gy in range(0, HEIGHT, 80):
            draw.line([0, gy, WIDTH, gy], fill=(22, 28, 38, 120), width=1)
            
        draw_hud(draw, "PROJECT LAUNCH SUMMARY", "NASA FIRMS Wildfire Records Harmonization", "LAUNCH READY")
        
        # Big Center Pitch Box
        box_w, box_h = 1300, 480
        bx = (WIDTH - box_w) // 2
        by = (HEIGHT - box_h) // 2
        draw.rectangle([bx, by, bx + box_w, by + box_h], fill=(17, 22, 32, 250), outline=(245, 158, 11), width=3)
        draw.rectangle([bx, by, bx + box_w, by + 60], fill=(245, 158, 11))
        draw.text((bx + 30, by + 12), "PYRO-SYNC · THE LAUNCH PITCH", fill=(0, 0, 0), font=font_title)
        
        draw.text((bx + 40, by + 100), "Real Science. Zero Sensor Artifacts. Continuous Wildfire Intelligence.", fill=(255, 255, 255), font=font_hero)
        
        bullets = [
            "✓ Harmonizes 26 years of NASA MODIS & VIIRS telemetry into one continuous record.",
            "✓ Mathematically corrects the 4.9x sensor fragmentation distortion with H3 hexagonal binning.",
            "✓ Live 24-hour global FIRMS NRT streaming alongside multi-decadal historical archive.",
            "✓ Built on Next.js 15, h3-js, MapLibre GL, and native DecompressionStream.",
            "✓ Open Source & Validated with automated 8% equal-energy calibration suite."
        ]
        
        cy = by + 190
        for b in bullets:
            draw.text((bx + 40, cy), b, fill=(203, 213, 225), font=font_subtitle)
            cy += 44
            
        draw.text((bx + 40, by + 420), "Explore Live: https://pyro-sync.vercel.app  ·  GitHub: https://github.com/KrishanuRoyEng/pyro-sync", fill=(56, 189, 248), font=font_callout)

    # Save frame
    frame_path = os.path.join(FRAMES_DIR, f"frame_{frame_idx:04d}.png")
    base.convert("RGB").save(frame_path)
    if frame_idx % 60 == 0 or frame_idx == TOTAL_FRAMES - 1:
        print(f"Rendered {frame_idx + 1}/{TOTAL_FRAMES} frames ({(frame_idx + 1) / TOTAL_FRAMES * 100:.1f}%)")

print("All 900 frames rendered successfully!")

# Extract poster frame (frame 150 / 5.0 seconds)
poster_frame = os.path.join(FRAMES_DIR, "frame_0150.png")
if os.path.exists(poster_frame):
    Image.open(poster_frame).save(OUTPUT_POSTER)
    print(f"Saved poster frame to {OUTPUT_POSTER}")

# Encode to MP4 with FFmpeg & audio track
print("Encoding video with FFmpeg...")
ffmpeg_cmd = [
    "ffmpeg", "-y",
    "-framerate", str(FPS),
    "-i", os.path.join(FRAMES_DIR, "frame_%04d.png"),
    "-i", MUSIC_TRACK,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-t", "30.0",
    "-filter_complex", "[1:a]afade=t=out:st=28.5:d=1.5[a]",
    "-map", "0:v",
    "-map", "[a]",
    "-shortest",
    OUTPUT_MP4
]

res = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("FFmpeg error:", res.stderr)
    sys.exit(1)

print(f"Launch video successfully created at {OUTPUT_MP4} ({os.path.getsize(OUTPUT_MP4) / 1024 / 1024:.2f} MB)")
