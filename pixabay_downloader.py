import urllib.request
import urllib.parse
import json
import hashlib
import time
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path.home() / "NAZE-ASSET-VAULT"
CONFIG = ROOT / "CONFIG" / "pixabay.json"
CATALOG = ROOT / "CATALOG"
MANIFEST = CATALOG / "pixabay_manifest.json"
CACHE = CATALOG / "pixabay_cache"

TARGET = 50
MIN_HEIGHT = 720
CHUNK = 64 * 1024

CATEGORIES = {
    "1": ("INTRO", "technology"),
    "2": ("OUTRO", "abstract"),
    "3": ("TRANSITIONS", "glitch"),
    "4": ("STOCK/TECHNOLOGY", "technology"),
    "5": ("STOCK/AI", "artificial intelligence"),
    "6": ("STOCK/ABSTRACT", "abstract background")
}

LICENSE = "Pixabay Content License"

def read_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

def request_json(url):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        return json.loads(response.read().decode("utf-8"))

def get_api_key():
    config = read_json(CONFIG, {})
    key = config.get("api_key", "").strip()

    if not key or key == "MASUKKAN_API_KEY_PIXABAY":
        print("[ERROR] API key belum diatur.")
        print("Edit:", CONFIG)
        sys.exit(1)

    return key

def search_videos(key, query):
    CACHE.mkdir(parents=True, exist_ok=True)

    cache_name = hashlib.sha256(
        query.lower().encode()
    ).hexdigest() + ".json"

    cache_file = CACHE / cache_name

    # Cache hasil pencarian selama 24 jam.
    if cache_file.exists():
        age = time.time() - cache_file.stat().st_mtime
        if age < 86400:
            print("[CACHE] Menggunakan hasil pencarian tersimpan.")
            return read_json(cache_file, {})

    params = {
        "key": key,
        "q": query,
        "min_height": MIN_HEIGHT,
        "safesearch": "true",
        "video_type": "all",
        "order": "popular",
        "per_page": 20,
        "page": 1
    }

    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode(params)

    print("[SEARCH] Mencari:", query)
    data = request_json(url)

    write_json(cache_file, data)
    return data

def get_variants(hit):
    videos = hit.get("videos", {})
    variants = []

    # Prioritaskan medium agar ukuran unduhan tetap terkendali.
    for name in ("medium", "large", "small"):
        item = videos.get(name, {})
        url = item.get("url")
        height = int(item.get("height") or 0)
        width = int(item.get("width") or 0)

        if url and height >= MIN_HEIGHT:
            variants.append({
                "name": name,
                "url": url,
                "width": width,
                "height": height,
                "size": int(item.get("size") or 0)
            })

    return variants

def load_manifest():
    data = read_json(MANIFEST, [])
    return data if isinstance(data, list) else []

def sha256_file(path):
    digest = hashlib.sha256()

    with open(path, "rb") as file:
        while True:
            chunk = file.read(CHUNK)
            if not chunk:
                break
            digest.update(chunk)

    return digest.hexdigest()

def existing_hashes():
    hashes = set()
    video_root = ROOT / "VIDEO"

    for path in video_root.rglob("*.mp4"):
        try:
            hashes.add(sha256_file(path))
        except Exception:
            pass

    return hashes

def safe_name(value):
    value = re.sub(r"[^a-zA-Z0-9_-]+", "_", value)
    return value.strip("_")[:70] or "pixabay_video"

def download_video(url, target, expected_size=0):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT/1.0"}
    )

    start = time.time()
    downloaded = 0

    with urllib.request.urlopen(req, timeout=180) as response:
        total = int(response.headers.get("Content-Length") or expected_size or 0)

        with open(target, "wb") as output:
            while True:
                chunk = response.read(CHUNK)
                if not chunk:
                    break

                output.write(chunk)
                downloaded += len(chunk)

                elapsed = max(time.time() - start, 0.001)
                speed = downloaded / elapsed / 1024

                if total:
                    percent = downloaded / total * 100
                    eta = (total - downloaded) / max(speed * 1024, 1)

                    print(
                        f"\r{percent:6.2f}% | "
                        f"{downloaded / 1048576:.2f}/"
                        f"{total / 1048576:.2f} MB | "
                        f"{speed:.1f} KB/s | "
                        f"ETA {eta:.0f}s",
                        end="",
                        flush=True
                    )
                else:
                    print(
                        f"\r{downloaded / 1048576:.2f} MB | "
                        f"{speed:.1f} KB/s",
                        end="",
                        flush=True
                    )

    print()
    return downloaded

def update_catalog():
    scanner = ROOT / "scan_assets.py"

    if scanner.exists():
        print("[CATALOG] Memindai seluruh vault...")
        subprocess.run(
            [sys.executable, str(scanner)],
            check=False
        )

    catalog_file = CATALOG / "assets.json"
    assets = read_json(catalog_file, [])

    if not isinstance(assets, list):
        print("[WARNING] Format assets.json tidak dikenal.")
        return

    manifest = load_manifest()
    records = {
        str(Path(item["path"]).resolve()): item
        for item in manifest
        if item.get("path")
    }

    for asset in assets:
        path = asset.get("path", "")
        if not path:
            continue

        try:
            resolved = str(Path(path).resolve())
        except Exception:
            continue

        record = records.get(resolved)
        if record:
            asset["license"] = LICENSE
            asset["source"] = record["source"]
            asset["pixabay_id"] = record["pixabay_id"]
            asset["contributor"] = record["contributor"]

    write_json(catalog_file, assets)
    print("[CATALOG] Metadata lisensi diperbarui.")

def main():
    print("=" * 55)
    print("NAZE PIXABAY VIDEO DOWNLOADER")
    print("ARMv7 | Minimum 720p | Target 50")
    print("=" * 55)

    key = get_api_key()
    manifest = load_manifest()

    print("\nVideo tersimpan:", len(manifest), "/", TARGET)

    if len(manifest) >= TARGET:
        print("[SELESAI] Target sudah tercapai.")
        return

    print("\nPILIH KATEGORI")
    for number, (folder, query) in CATEGORIES.items():
        print(number + ".", folder, "|", query)

    choice = input("\nKategori (1-6): ").strip()

    if choice not in CATEGORIES:
        print("[ERROR] Pilihan tidak valid.")
        return

    folder_name, query = CATEGORIES[choice]
    destination = ROOT / "VIDEO" / folder_name
    destination.mkdir(parents=True, exist_ok=True)

    data = search_videos(key, query)
    hits = data.get("hits", [])

    known_ids = {
        str(item.get("pixabay_id"))
        for item in manifest
    }

    duplicates = existing_hashes()
    candidates = []

    for hit in hits:
        video_id = str(hit.get("id"))

        if video_id in known_ids:
            continue

        variants = get_variants(hit)

        if not variants:
            continue

        candidates.append((hit, variants))

    if not candidates:
        print("[INFO] Tidak ada video baru dengan resolusi minimal 720p.")
        return

    print("\nHASIL PENCARIAN")
    print("=" * 55)

    for index, (hit, variants) in enumerate(candidates, 1):
        best = variants[0]
        print(
            f"{index}. ID {hit.get('id')} | "
            f"{best['width']}x{best['height']} | "
            f"{hit.get('duration')} detik | "
            f"{hit.get('tags', '')[:65]}"
        )

    print("\nPilih nomor video untuk diunduh.")
    print("Masukkan 0 untuk batal.")

    selected = input("Pilihan: ").strip()

    if not selected.isdigit():
        print("[ERROR] Input tidak valid.")
        return

    index = int(selected)

    if index == 0:
        print("[BATAL]")
        return

    if index < 1 or index > len(candidates):
        print("[ERROR] Nomor tidak tersedia.")
        return

    hit, variants = candidates[index - 1]

    print("\nPILIH KUALITAS")
    for i, variant in enumerate(variants, 1):
        print(
            f"{i}. {variant['name']} "
            f"{variant['width']}x{variant['height']} "
            f"| {variant['size'] / 1048576:.2f} MB"
        )

    quality_choice = input("Kualitas: ").strip()

    if not quality_choice.isdigit():
        print("[ERROR] Pilihan tidak valid.")
        return

    quality_index = int(quality_choice)

    if quality_index < 1 or quality_index > len(variants):
        print("[ERROR] Kualitas tidak tersedia.")
        return

    variant = variants[quality_index - 1]

    title = safe_name(hit.get("tags", "pixabay_video").split(",")[0])
    video_id = str(hit.get("id"))
    filename = f"pixabay_{video_id}_{title}.mp4"
    target = destination / filename

    if target.exists():
        print("[SKIP] File sudah ada.")
        return

    print("\n[DOWNLOAD]", filename)
    print("Sumber:", hit.get("pageURL"))
    print("Kontributor:", hit.get("user"))
    print("Resolusi:", variant["width"], "x", variant["height"])

    confirm = input("Lanjutkan download? (y/n): ").strip().lower()

    if confirm != "y":
        print("[BATAL]")
        return

    try:
        size = download_video(
            variant["url"],
            target,
            variant["size"]
        )

        if not target.exists() or size == 0:
            target.unlink(missing_ok=True)
            raise ValueError("File kosong")

        digest = sha256_file(target)

        if digest in duplicates:
            target.unlink(missing_ok=True)
            print("[DUPLIKAT] File memiliki SHA-256 yang sama.")
            return

        record = {
            "name": filename,
            "path": str(target),
            "pixabay_id": video_id,
            "source": hit.get("pageURL"),
            "contributor": hit.get("user"),
            "license": LICENSE,
            "width": variant["width"],
            "height": variant["height"],
            "duration": hit.get("duration"),
            "size_bytes": size,
            "sha256": digest,
            "downloaded_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        manifest.append(record)
        write_json(MANIFEST, manifest)

        print("\n[OK] Video berhasil disimpan.")
        print("[OK] Metadata dan lisensi tercatat.")
        print("Total:", len(manifest), "/", TARGET)

        update_catalog()

    except Exception as error:
        target.unlink(missing_ok=True)
        print("\n[GAGAL]", error)

if __name__ == "__main__":
    main()
