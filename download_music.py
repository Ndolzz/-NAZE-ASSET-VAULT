import urllib.request
from pathlib import Path
import hashlib

ROOT = Path.home() / "NAZE-ASSET-VAULT" / "AUDIO" / "MUSIC"

BASE = "https://raw.githubusercontent.com/jarlah/dungeon-haskell/master/assets"

TRACKS = [
    {
        "name": "boss.ogg",
        "folder": "CINEMATIC",
        "source": f"{BASE}/music/boss.ogg",
        "description": "Epic Boss Battle - Juhani Junkala"
    },
    {
        "name": "theme.ogg",
        "folder": "DARK",
        "source": f"{BASE}/music/theme.ogg",
        "description": "Spooky Dungeon - Memoraphile"
    }
]

LICENSE_URL = (
    "https://raw.githubusercontent.com/"
    "jarlah/dungeon-haskell/master/assets/CREDITS.md"
)

def download(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()

def main():
    total = 0

    for track in TRACKS:
        folder = ROOT / track["folder"]
        folder.mkdir(parents=True, exist_ok=True)

        target = folder / track["name"]

        if target.exists() and target.stat().st_size > 1000:
            print("[SKIP]", track["name"])
            continue

        try:
            data = download(track["source"])

            if not data.startswith(b"OggS"):
                raise ValueError("File bukan audio OGG valid")

            target.write_bytes(data)

            digest = hashlib.sha256(data).hexdigest()

            print("[OK]", track["name"], len(data), "bytes")
            print("SHA256:", digest)
            total += 1

        except Exception as e:
            print("[GAGAL]", track["name"], e)

    try:
        license_text = download(LICENSE_URL)
        (ROOT / "SOURCE_LICENSES.md").write_bytes(license_text)
        print("[OK] Lisensi sumber disimpan")
    except Exception as e:
        print("[GAGAL] Lisensi:", e)

    print("\nSelesai:", total, "file baru")
    print("Lokasi:", ROOT)

if __name__ == "__main__":
    main()
