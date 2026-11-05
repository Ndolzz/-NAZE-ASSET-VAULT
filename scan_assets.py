import os
import json
import hashlib
from pathlib import Path
from datetime import datetime

ROOT = Path.home() / "NAZE-ASSET-VAULT"
OUTPUT = ROOT / "CATALOG" / "assets.json"

SUPPORTED = {
    ".mp3", ".wav", ".ogg", ".m4a", ".flac",
    ".mp4", ".mov", ".webm",
    ".png", ".jpg", ".jpeg", ".webp", ".svg",
    ".ttf", ".otf",
    ".glb", ".gltf", ".obj", ".fbx"
}

def get_hash(path):
    h = hashlib.sha256()

    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)

    return h.hexdigest()

def scan():
    assets = []

    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue

        if path.suffix.lower() not in SUPPORTED:
            continue

        if "TEMP" in path.parts:
            continue

        try:
            stat = path.stat()

            assets.append({
                "name": path.name,
                "path": str(path),
                "category": path.relative_to(ROOT).parts[0],
                "subcategory": str(path.parent.relative_to(ROOT)),
                "extension": path.suffix.lower(),
                "size_bytes": stat.st_size,
                "sha256": get_hash(path),
                "tags": [],
                "description": "",
                "license": "UNKNOWN"
            })

        except (OSError, PermissionError) as e:
            print(f"Skip: {path.name}: {e}")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    data = {
        "vault": "NAZE ASSET VAULT",
        "generated_at": datetime.now().isoformat(),
        "total_assets": len(assets),
        "assets": assets
    }

    OUTPUT.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"Pemindaian selesai: {len(assets)} aset")
    print(f"Katalog: {OUTPUT}")

if __name__ == "__main__":
    scan()
