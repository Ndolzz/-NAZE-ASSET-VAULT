import urllib.request
import zipfile
import io
from pathlib import Path

ROOT = Path.home() / "NAZE-ASSET-VAULT" / "AUDIO" / "MUSIC"

SOURCES = [
    {
        "name": "technological_messup.ogg",
        "folder": "TECHNO",
        "url": "https://opengameart.org/sites/default/files/tecnological_messup_v2.ogg",
        "type": "ogg"
    },
    {
        "name": "busy_cyberworld.ogg",
        "folder": "AMBIENT",
        "url": "https://opengameart.org/sites/default/files/busy_cyberworld.ogg",
        "type": "ogg"
    },
    {
        "name": "algate.zip",
        "folder": "TECHNO",
        "url": "https://opengameart.org/sites/default/files/algate.zip",
        "type": "zip"
    }
]

def fetch(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

def main():
    for item in SOURCES:
        folder = ROOT / item["folder"]
        folder.mkdir(parents=True, exist_ok=True)

        target = folder / item["name"]

        if item["type"] == "ogg" and target.exists():
            print("[SKIP]", item["name"])
            continue

        try:
            print("[DOWNLOAD]", item["name"])
            data = fetch(item["url"])

            if item["type"] == "ogg":
                if not data.startswith(b"OggS"):
                    raise ValueError("Bukan file OGG valid")

                target.write_bytes(data)
                print("[OK]", target.name, len(data), "bytes")

            elif item["type"] == "zip":
                if not data.startswith(b"PK"):
                    raise ValueError("Bukan ZIP valid")

                target.write_bytes(data)

                count = 0
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    for member in archive.infolist():
                        if member.is_dir():
                            continue

                        ext = Path(member.filename).suffix.lower()
                        if ext not in {".ogg", ".wav", ".mp3", ".flac"}:
                            continue

                        filename = Path(member.filename).name
                        output = folder / ("algate_" + filename)

                        if output.exists():
                            continue

                        output.write_bytes(archive.read(member))
                        count += 1

                print("[OK] Algate:", count, "audio diekstrak")

        except Exception as e:
            print("[GAGAL]", item["name"], str(e))

    print("\n=== DOWNLOAD SELESAI ===")

if __name__ == "__main__":
    main()
