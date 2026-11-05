import urllib.request
import zipfile
from pathlib import Path

ROOT = Path.home() / "NAZE-ASSET-VAULT"

SOURCES = [
    {
        "name": "sci_fi_background.zip",
        "folder": "VISUAL/BACKGROUND",
        "url": "https://opengameart.org/sites/default/files/sci_fi_bg_freebie_ask4asset.com_.zip"
    },
    {
        "name": "abstract_texture_512.zip",
        "folder": "VISUAL/TEXTURE",
        "url": "https://opengameart.org/sites/default/files/sbs_-_abstract_texture_pack_-_512x512.zip"
    }
]

def download(url, target):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        target.write_bytes(response.read())

def main():
    for item in SOURCES:
        folder = ROOT / item["folder"]
        folder.mkdir(parents=True, exist_ok=True)
        target = folder / item["name"]

        if target.exists():
            print("[SKIP]", item["name"])
            continue

        try:
            print("[DOWNLOAD]", item["name"])
            download(item["url"], target)

            if not zipfile.is_zipfile(target):
                target.unlink()
                raise ValueError("File bukan ZIP valid")

            with zipfile.ZipFile(target) as archive:
                archive.extractall(folder / target.stem)

            print("[OK]", item["name"])

        except Exception as error:
            print("[GAGAL]", item["name"], error)

    print("\nDOWNLOAD VISUAL SELESAI")

if __name__ == "__main__":
    main()
