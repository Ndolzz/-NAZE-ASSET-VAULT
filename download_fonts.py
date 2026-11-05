import os
import json
import urllib.request
import urllib.error
import time

BASE = os.path.expanduser("~/NAZE-ASSET-VAULT/FONTS/GOOGLE")
API = "https://api.github.com/repos/google/fonts/contents/ofl/"

groups = {
"DISPLAY": """bebasneue anton oswald russoone bungee righteous blackopsone
archivoblack alfaslabone teko cinzel bevan patuaone paytoneone
leaguespartan abrilfatface fjallaone staatliches lilitaone passionone""",
"TECHNO": """orbitron audiowide exo exo2 rajdhani oxanium chakrapetch
sharetech sharetechmono spacegrotesk michroma quantico electrolize
iceland syncopate""",
"SANS": """roboto opensans lato montserrat poppins nunito worksans
dmsans manrope outfit inter rubik barlow assistant urbanist
plusjakartasans figtree mulish karla quicksand""",
"CONDENSED": """robotocondensed barlowcondensed archivenarrow oswald teko
sairacondensed pathwaygothicone yanonekaffeesatz encodesanscondensed
benchnine fjallaone bigshouldersdisplay leaguegothic economica abel""",
"EDITORIAL": """playfairdisplay cormorantgaramond lora merriweather
librebaskerville dmserifdisplay bodonimoda crimsonpro alegreya prata""",
"MONOSPACE": """jetbrainsmono firacode sourcecodepro ibmplexmono inconsolata
spacemono ubuntumono robotomono anonymouspro cousine""",
"DECORATIVE": """amaticsc caveat permanentmarker pacifico dancingscript
satisfy sacramento lobster fredoka comfortaa"""
}

fonts = []
seen = set()

for category, names in groups.items():
    for name in names.split():
        if name not in seen:
            fonts.append((category, name))
            seen.add(name)

def request(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "NAZE-Font-Downloader",
            "Accept": "application/vnd.github+json"
        }
    )
    with urllib.request.urlopen(req, timeout=45) as response:
        return response.read()

success = 0
failed = []
limit = 45
processed = 0

print("NAZE FONT DOWNLOADER")
print("Total target:", len(fonts))
print("Batas proses per sesi:", limit)
print("=" * 40)

for category, family in fonts:
    folder = os.path.join(BASE, category)
    os.makedirs(folder, exist_ok=True)

    output = os.path.join(folder, family + ".ttf")

    if os.path.exists(output) and os.path.getsize(output) > 10000:
        print("[EXISTS]", family)
        success += 1
        continue

    if processed >= limit:
        print("\nBatas sesi tercapai. Jalankan ulang script untuk melanjutkan.")
        break

    processed += 1
    print(f"\n[{processed}/{limit}] Mencari {family}...", flush=True)

    try:
        data = json.loads(request(API + family))

        candidates = [
            item for item in data
            if item["name"].lower().endswith(".ttf")
        ]

        if not candidates:
            raise Exception("Tidak ditemukan file TTF")

        candidates.sort(
            key=lambda x: (
                "[" not in x["name"],
                "italic" in x["name"].lower()
            )
        )

        selected = candidates[0]
        font_data = request(selected["download_url"])

        if not (
            font_data.startswith(b"\x00\x01\x00\x00")
            or font_data.startswith(b"OTTO")
        ):
            raise Exception("Format font tidak valid")

        with open(output, "wb") as f:
            f.write(font_data)

        success += 1
        print("[OK]", family, len(font_data) // 1024, "KB")

    except urllib.error.HTTPError as e:
        failed.append(family)
        print("[HTTP ERROR]", family, e.code)

        if e.code == 403:
            print("GitHub API membatasi permintaan. Hentikan sesi.")
            break

    except Exception as e:
        failed.append(family)
        print("[FAILED]", family, str(e))

print("\n========== RINGKASAN ==========")
print("Berhasil/tersedia:", success)
print("Gagal:", len(failed))
print("Gagal:", ", ".join(failed))
print("Folder:", BASE)
