#!/data/data/com.termux/files/usr/bin/bash

set -o pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1

OUT="$ROOT/EXPORT/DARK_WEB_NAZE.mp4"
LOG="$ROOT/RENDER/LOGS/render.log"

FONT="../../FONTS/DISPLAY/rajdhani/Rajdhani-Regular.ttf"
FOOTAGE="../../VIDEO/INTRO/pixabay_215500_artificial_intelligence.mp4"
LOGO="../../VISUAL/LOGO/NAZE_LOGO.png"
VOICE="AUDIO/VOICE/narration.mp3"
MUSIC="../../AUDIO/MUSIC/TECHNO/technological_messup.ogg"

IMPACT="../../AUDIO/SFX/IMPACT/impact_metal_heavy_000.ogg"
SWITCH="../../AUDIO/SFX/INTERFACE/switch_001.wav"
GLITCH="../../AUDIO/SFX/INTERFACE/glitch_001.wav"
DIGITAL="../../AUDIO/SFX/DIGITAL/phase_jump_1.ogg"

mkdir -p EXPORT RENDER/LOGS

echo "=================================="
echo "        NAZE VIDEO RENDER"
echo "=================================="

echo "[1/4] Memeriksa aset..."

FILES=(
    "$FONT"
    "$FOOTAGE"
    "$LOGO"
    "$VOICE"
    "$MUSIC"
    "$IMPACT"
    "$SWITCH"
    "$GLITCH"
    "$DIGITAL"
    "VISUAL/TEXT/scene_01.txt"
    "VISUAL/TEXT/scene_02.txt"
    "VISUAL/TEXT/scene_03.txt"
    "VISUAL/TEXT/scene_04.txt"
    "VISUAL/TEXT/scene_05.txt"
)

for f in "${FILES[@]}"; do
    if [ ! -f "$f" ]; then
        echo "ERROR: Aset tidak ditemukan: $f"
        exit 1
    fi
    echo "OK: $f"
done
echo "[2/4] Menyiapkan komposisi..."

FILTER="
color=c=0x050505:s=720x1280:r=30:d=39[base];

[0:v]
scale=720:1280:force_original_aspect_ratio=increase,
crop=720:1280,
setsar=1,
eq=brightness=-0.08:saturation=0.75
[foot];

[base][foot]
overlay=0:0:eof_action=pass:enable='between(t,5,12)'
[v1];

[v1]
drawtext=fontfile='$FONT':textfile='VISUAL/TEXT/scene_01.txt':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=500:borderw=2:bordercolor=black@0.8:shadowcolor=black@0.8:shadowx=2:shadowy=2:enable='between(t,0,5)'
[v2];

[v2]
drawtext=fontfile='$FONT':textfile='VISUAL/TEXT/scene_02.txt':fontcolor=0x00FF88:fontsize=82:x=(w-text_w)/2:y=550:borderw=2:bordercolor=black@0.8:shadowcolor=black@0.8:shadowx=3:shadowy=3:enable='between(t,5,12)'
[v3];

[v3]
drawtext=fontfile='$FONT':textfile='VISUAL/TEXT/scene_03.txt':fontcolor=0x00D9FF:fontsize=42:line_spacing=22:x=(w-text_w)/2:y=440:borderw=2:bordercolor=black@0.8:shadowcolor=black@0.8:shadowx=2:shadowy=2:enable='between(t,12,21)'
[v4];

[v4]
drawtext=fontfile='$FONT':textfile='VISUAL/TEXT/scene_04.txt':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=500:borderw=2:bordercolor=black@0.8:shadowcolor=black@0.8:shadowx=2:shadowy=2:enable='between(t,21,30)'
[v5];

[1:v]
scale=340:340:force_original_aspect_ratio=decrease,
format=rgba
[logo];

[v5][logo]
overlay=(W-w)/2:370:eof_action=pass:enable='between(t,30,39)'
[v6];

[v6]
drawtext=fontfile='$FONT':text='NAZE':fontcolor=0x00FF88:fontsize=40:x=(w-text_w)/2:y=760:enable='between(t,30,39)'
[v7];

[v7]
drawtext=fontfile='$FONT':text='EXPLORE BEYOND THE SCREEN':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=820:enable='between(t,30,39)'
[vout];

[2:a]
aresample=48000,
volume=1.0
[voice];

[3:a]
atrim=0:39,
asetpts=PTS-STARTPTS,
volume=0.20,
afade=t=out:st=36:d=3
[music];

[4:a]
aresample=48000,
volume=0.38,
adelay=delays=200:all=1
[impact];

[5:a]
aresample=48000,
volume=0.22,
adelay=delays=4500:all=1
[switch];

[6:a]
aresample=48000,
volume=0.28,
adelay=delays=12200:all=1
[glitch];

[7:a]
aresample=48000,
volume=0.25,
adelay=delays=21200:all=1
[digital];

[voice][music][impact][switch][glitch][digital]
amix=inputs=6:duration=longest:normalize=0,
alimiter=limit=0.95
[aout]
"

echo "[3/4] Memulai render..."
echo "Resolusi : 720x1280"
echo "FPS      : 30"
echo "Durasi   : 39 detik"
echo "Output   : $OUT"
echo ""

ffmpeg -hide_banner -y \
    -i "$FOOTAGE" \
    -loop 1 -framerate 30 -i "$LOGO" \
    -i "$VOICE" \
    -stream_loop -1 -i "$MUSIC" \
    -i "$IMPACT" \
    -i "$SWITCH" \
    -i "$GLITCH" \
    -i "$DIGITAL" \
    -filter_complex "$FILTER" \
    -map "[vout]" \
    -map "[aout]" \
    -t 39 \
    -r 30 \
    -c:v libx264 \
    -preset ultrafast \
    -crf 25 \
    -threads 2 \
    -pix_fmt yuv420p \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -metadata title="DARK WEB | NAZE" \
    -metadata artist="NAZE" \
    -stats \
    "$OUT" 2>&1 | tee "$LOG"

STATUS=${PIPESTATUS[0]}

echo ""

if [ "$STATUS" -eq 0 ]; then
    echo "[4/4] RENDER BERHASIL"
    echo "File: $OUT"
    echo ""
    ls -lh "$OUT"
    ffprobe -v error \
        -show_entries format=duration,size \
        -of default=noprint_wrappers=1 \
        "$OUT"
else
    echo "RENDER GAGAL. Periksa log:"
    echo "$LOG"
    exit "$STATUS"
fi
