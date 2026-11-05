import json
import urllib.request

queries = [
    "kenney digital audio",
    "kenney impact sounds",
    "kenney interface sounds"
]

for query in queries:
    print("\nMencari:", query)

    url = (
        "https://api.github.com/search/repositories?q="
        + urllib.parse.quote(query)
        + "&per_page=5"
    )

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "NAZE-ASSET-VAULT"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read())

        for repo in data.get("items", []):
            print(
                repo["full_name"],
                repo["html_url"]
            )

    except Exception as error:
        print("Gagal:", error)
