#!/usr/bin/env sh
# Hero video pipeline (optional dev tool; needs ffmpeg, e.g. `brew install ffmpeg`).
# Sources live in the gitignored _project-docs/sample-work/. Outputs:
#   video/<slug>.mp4            H.264, no audio track, 1280 px wide, fast-start (plays while loading)
#   _project-docs/sample-work/posters/<slug>.png   first clean frame, turned into AVIF/WebP/JPEG
#                                                  posters by tools/images.py
# The recordings have no speech, so no caption track is produced; the pages carry a text description.
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/_project-docs/sample-work"
OUT="$ROOT/video"
mkdir -p "$OUT" "$SRC/posters"

encode() { # encode <source file> <slug> <poster time in seconds> <crop w:h:x:y or "none">
  # The crop removes the remote-desktop window bars and the Windows taskbar around the CAD/CAM
  # window: they carry a remote-access ID and nothing a visitor needs. Measured on the source.
  crop="none"; [ "$4" != "none" ] && crop="crop=$4,"
  ffmpeg -hide_banner -loglevel error -y -i "$SRC/$1" -an \
    -vf "${crop#none}scale=1280:-2" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p \
    -movflags +faststart "$OUT/$2.mp4"
  ffmpeg -hide_banner -loglevel error -y -ss "$3" -i "$OUT/$2.mp4" -frames:v 1 "$SRC/posters/$2.png"
  printf '%s: %s KB\n' "$2" "$(du -k "$OUT/$2.mp4" | cut -f1)"
}

encode "CNC Programming 2.mp4" cnc-programming 2 1680:880:130:92
encode "Slabsmith3D.mov"       slab-layout-3d  1 none
