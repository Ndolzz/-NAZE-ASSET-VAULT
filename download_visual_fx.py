import urllib.request
import zipfile
from pathlib import Path

ROOT = Path.home() / "NAZE-ASSET-VAULT" / "VISUAL"

SOURCES = [
    {
        "name": "scifi_ui.zip",
        "folder": "OVERLAY",
        "url": "https://opengameart.org/sites/default/files/SCIFI%20UI.zip",
        "source": "https://opengameart.org/content/scifi-ui",
        "license": "CC0",
        "credit": "Anton Revin (optional)"
    },
    {
        "name": "lens_flares.zip",
        "folder": "PARTICLES",
        "url": "https://opengameart.org/sites/default/files/flares_20100824.zip",
        "source": "https://opengameart.org/content/lens-flares-and-particles",
        "license": "CC0 / CC-BY 3.0; verify the license of individual assets",
        "credit": "hc"
    },
    {
        "name": "glitch_icons.zip",
        "folder": "ICONS",
        "url": "https://opengameart.org/sites/default/files/100-glitch-icons.zip",
        "source": "https://opengameart.org/content/100-glitch-icons",
        "license": "CC0",
        "credit": "rubberduck"
    }
]

IMAGE_EXT = {
    ".png", ".jpg", ".jpeg", ".webp", ".svg"
}

def download(url, target):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        target.write_bytes(response.read())

def extract(zip_path, output):
    count = 0

    with zipfile.ZipFile(zip_path) as archive:
        for item in archive.infolist():
            if item.is_dir():
                continue

            name = Path(item.filename)
            if name.suffix.lower() not in IMAGE_EXT:
                continue

            if name.is_absolute() or ".." in name.parts:
                continue

            filename = name.name
            if not filename:
                continue

            destination = output / filename

            if destination.exists():
                continue

            destination.write_bytes(archive.read(item))
            count += 1

    return count

def main():
    for item in SOURCES:
        folder = ROOT / item["folder"]
        folder.mkdir(parents=True, exist_ok=True)

        zip_path = folder / item["name"]
        output = folder / zip_path.stem

        print("\n==============================")
        print("ASSET:", item["name"])
        print("==============================")

        try:
            if not zip_path.exists():
                print("[DOWNLOAD]", item["name"])
                download(item["url"], zip_path)

            if not zipfile.is_zipfile(zip_path):
                zip_path.unlink(missing_ok=True)
                raise ValueError("Arsip ZIP tidak valid")

            output.mkdir(exist_ok=True)
            count = extract(zip_path, output)

            license_file = output / "SOURCE.txt"
            license_file.write_text(
                "Asset: " + item["name"] + "\n"
                "Source: " + item["source"] + "\n"
                "License: " + item["license"] + "\n"
                "Credit: " + item["credit"] + "\n",
                encoding="utf-8"
            )

            print("[OK] Diekstrak:", count, "gambar")

        except Exception as error:
            print("[GAGAL]", error)

    print("\nSEMUA PROSES SELESAI")

if __name__ == "__main__":
    main()
