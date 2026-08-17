#!/usr/bin/env python3
"""Download raw payloads for one ŁKS section/source pair.

Parsers live in Model.js. This script only fetches, so a new section is
another entry in SECTIONS plus a parser — not a new HTTP stack.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request

UA = "kjk.lks-omarchy/0.1 (personal Omarchy widget; +https://lkslodz.pl)"

# Per-section source catalogue. `auto` tries `default_source` first, then
# the remaining sources in list order.
SECTIONS = {
    "football-men": {
        "default_source": "lkslodz",
        "sources": {
            "lkslodz": {
                "label": "lkslodz.pl",
                "endpoints": {
                    "matches": "https://lkslodz.pl/wp-json/lks/v1/matches",
                    "table": "https://lkslodz.pl/wp-json/lks/v1/league-table",
                },
            },
            "thesportsdb": {
                "label": "TheSportsDB",
                "endpoints": {
                    "next": "https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=137112",
                    "last": "https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=137112",
                    "table": "https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4661&s=2026-2027",
                },
            },
        },
    }
}


def get_json(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read().decode("utf-8", "replace")
    return json.loads(raw)


def fetch_source(section_id: str, source_id: str) -> dict:
    section = SECTIONS[section_id]
    source = section["sources"][source_id]
    payloads = {}
    for name, url in source["endpoints"].items():
        payloads[name] = get_json(url)
    return {
        "ok": True,
        "section": section_id,
        "source": source_id,
        "sourceLabel": source["label"],
        "payloads": payloads,
    }


def usable(bundle: dict) -> bool:
    payloads = bundle.get("payloads") or {}
    if bundle.get("source") == "lkslodz":
        matches = payloads.get("matches") or {}
        return bool(isinstance(matches, dict) and matches.get("success") and matches.get("data"))
    if bundle.get("source") == "thesportsdb":
        return bool(payloads.get("next") or payloads.get("last") or payloads.get("table"))
    return bool(payloads)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--section", default="football-men")
    parser.add_argument("--source", default="auto")
    args = parser.parse_args()

    if args.section not in SECTIONS:
        json.dump({"ok": False, "error": "unknown section: " + args.section}, sys.stdout)
        return 1

    sources = SECTIONS[args.section]["sources"]
    preference = (args.source or "auto").strip().lower()
    if preference in ("", "auto"):
        order = [SECTIONS[args.section]["default_source"]]
        order += [sid for sid in sources if sid not in order]
    elif preference in sources:
        order = [preference]
    else:
        json.dump({"ok": False, "error": "unknown source: " + preference}, sys.stdout)
        return 1

    errors = []
    for source_id in order:
        try:
            bundle = fetch_source(args.section, source_id)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            errors.append(source_id + ": " + str(exc))
            continue
        if not usable(bundle):
            errors.append(source_id + ": empty payload")
            continue
        if errors:
            bundle["fallbackFrom"] = errors
        json.dump(bundle, sys.stdout, ensure_ascii=False)
        return 0

    json.dump({"ok": False, "section": args.section, "error": "; ".join(errors) or "no source"}, sys.stdout)
    return 1


if __name__ == "__main__":
    sys.exit(main())
