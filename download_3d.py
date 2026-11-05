import urllib.request
import zipfile
from pathlib import Path

ROOT = Path.home() / "NAZE-ASSET-VAULT" / "VISUAL" / "3D"

SOURCES = [
    {
        "name": "low_poly_spaceship",
        "file": "spaceship.zip",
        "url": "https://opengameart.org/sites/default/files/spaceship.zip",
        "page": "https://opengameart.org/content/low-poly-spaceship-0",
        "author": "tbbk"
    },
    {
        "name": "scifi_environment",
        "file": "ultimate_modular_sci-fi_-_feb_2021.zip",
        "url": "https://opengameart.org/sites/default/files/ultimate_modular_sci-fi_-_feb_2021.zip",
        "page": "https://opengameart.org/content/lowpoly-modular-sci-fi-environments",
        "author": "quaternius"
    },
    {
        "name": "spaceship_components",
        "file": "lowpoly-spaceships-by-majadroid.zip",
        "url": "https://opengameart.org/sites/default/files/lowpoly-spaceships-by-majadroid.zip",
        "page": "https://opengameart.org/content/3d-lowpoly-spaceships-and-components",
        "author": "Majadroid"
    }
]

ALLOWED = {
    ".glb", ".gltf", ".obj", ".fbx",
    ".blend", ".mtl", ".png", ".jpg",
    ".jpeg", ".webp"
}

def download(url, target):
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        target.write_bytes(response.read())

def extract(zip_path, destination):
    count = 0

    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue

            path = Path(member.filename)

            if path.is_absolute() or ".." in path.parts:
                continue

            if path.suffix.lower() not in ALLOWED:
                continue

            output = destination / path.name

            if output.exists():
                continue

            output.write_bytes(archive.read(member))
            count += 1
            print("[EXTRACT]", path.name)

    return count

def main():
    ROOT.mkdir(parents=True, exist_ok=True)

    for item in SOURCES:
        print("\n==============================")
        print("ASSET:", item["name"])
        print("==============================")

        folder = ROOT / item["name"]
        folder.mkdir(parents=True, exist_ok=True)

        archive = folder / item["file"]

        try:
            if not archive.exists():
                print("[DOWNLOAD]", item["file"])
                download(item["url"], archive)
                print("[OK] Download selesai")
            else:
                print("[SKIP] ZIP sudah tersedia")

            if not zipfile.is_zipfile(archive):
                archive.unlink(missing_ok=True)
                raise ValueError("Arsip ZIP tidak valid")

            count = extract(archive, folder)

            (folder / "SOURCE.txt").write_text(
                f"Name: {item['name']}\n"
                f"Author: {item['author']}\n"
                f"License: CC0\n"
                f"Source: {item['page']}\n",
                encoding="utf-8"
            )

            print("[OK]", count, "file diekstrak")

        except Exception as error:
            print("[GAGAL]", str(error))

    print("\nDOWNLOAD 3D SELESAI")

if __name__ == "__main__":
    main()
