import json
import urllib.request
import urllib.parse
from pathlib import Path

ROOT = Path.home() / "NAZE-ASSET-VAULT" / "AUDIO" / "SFX"

REPOS = [
    {
        "name": "DIGITAL",
        "repo": "Boyquotes/kenney-digital-audio-for-godot",
        "branch": "main",
    },
    {
        "name": "IMPACT",
        "repo": "Boyquotes/kenney-impact-sounds-for-godot",
        "branch": "main",
    },
    {
        "name": "INTERFACE",
        "repo": "Calinou/kenney-interface-sounds",
        "branch": "master",
    },
]

AUDIO_EXTENSIONS = {".ogg", ".wav", ".mp3", ".flac"}

def get(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )

    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()

def download_repo(item):
    name = item["name"]
    repo = item["repo"]
    branch = item["branch"]

    folder = ROOT / name
    folder.mkdir(parents=True, exist_ok=True)

    print(f"\n=== {name} ===")

    api = (
        f"https://api.github.com/repos/{repo}"
        f"/git/trees/{branch}?recursive=1"
    )

    data = json.loads(get(api))
    files = data.get("tree", [])

    audio_files = [
        f for f in files
        if f["type"] == "blob"
        and Path(f["path"]).suffix.lower() in AUDIO_EXTENSIONS
        and f["path"].startswith("addons/")
    ]

    print(f"Ditemukan: {len(audio_files)} file audio")

    success = 0
    skipped = 0
    failed = 0

    for index, file in enumerate(audio_files, 1):
        path = file["path"]
        filename = Path(path).name
        target = folder / filename

        if target.exists() and target.stat().st_size > 0:
            skipped += 1
            continue

        encoded_path = urllib.parse.quote(path, safe="/")
        raw_url = (
            f"https://raw.githubusercontent.com/"
            f"{repo}/{branch}/{encoded_path}"
        )

        try:
            content = get(raw_url)

            if not content:
                raise ValueError("File kosong")

            target.write_bytes(content)
            success += 1

            print(
                f"[{index}/{len(audio_files)}] "
                f"OK {filename}"
            )

        except Exception as error:
            failed += 1
            print(f"[GAGAL] {filename}: {error}")

    # Simpan lisensi dari repositori
    license_names = ["LICENSE", "LICENSE.txt"]

    for license_name in license_names:
        license_url = (
            f"https://raw.githubusercontent.com/"
            f"{repo}/{branch}/{license_name}"
        )

        try:
            content = get(license_url)
            (folder / "LICENSE.txt").write_bytes(content)
            break
        except Exception:
            continue

    (folder / "SOURCE.txt").write_text(
        f"Repository: https://github.com/{repo}\n"
        f"Branch: {branch}\n"
        "License: CC0 1.0 Universal\n",
        encoding="utf-8"
    )

    print(
        f"Hasil {name}: "
        f"{success} baru, {skipped} dilewati, "
        f"{failed} gagal"
    )

def main():
    ROOT.mkdir(parents=True, exist_ok=True)

    for item in REPOS:
        try:
            download_repo(item)
        except Exception as error:
            print(f"\nERROR {item['name']}: {error}")

    print("\n=== SELESAI ===")
    print(f"Lokasi: {ROOT}")

if __name__ == "__main__":
    main()




