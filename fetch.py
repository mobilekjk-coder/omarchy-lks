#!/usr/bin/env python3
"""Download raw payloads for one ŁKS section/source pair.

Parsers live in Model.js. This script only fetches, so a new section is
another entry in SECTIONS plus a parser — not a new HTTP stack.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request

UA = "kjk.lks-omarchy/0.3 (personal Omarchy widget; +https://github.com/mobilekjk-coder/omarchy-lks)"
LIGA_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

# Per-section source catalogue. `auto` merges the club site with TheSportsDB,
# because the club API currently omits cup ties.
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
            "1liga": {
                "label": "1liga.org",
                "endpoints": {},
            },
            "thesportsdb": {
                "label": "TheSportsDB",
                "endpoints": {
                    "next": "https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=137112",
                    "last": "https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id=137112",
                    "table": "https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4661&s=2026-2027",
                },
                # Team next/last often skip the Polish Cup. These searches fill
                # that hole until the club API lists the tie.
                "event_searches": [
                    "GKS_Tychy_vs_LKS_Lodz",
                    "LKS_Lodz_vs_GKS_Tychy",
                ],
            },
        },
    }
}


def get_json(url: str) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        raw = resp.read().decode("utf-8", "replace")
    return json.loads(raw)


def fetch_event_searches(source: dict) -> dict:
    cup = {}
    for slug in source.get("event_searches") or []:
        cup[slug] = get_json("https://www.thesportsdb.com/api/v1/json/3/searchevents.php?e=" + slug)
    return cup


def _html_field(block: str, token: str) -> str:
    match = re.search(token + r'[^>]*>\s*([^<]+)', block)
    return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""


def parse_1liga_html(html: str) -> list:
    fixtures = []
    for block in html.split('class="single-match-wrapper"')[1:]:
        home = _html_field(block, "home-team-name")
        away = _html_field(block, "away-team-name")
        if not home or not away:
            continue
        date = _html_field(block, "round-date-info")
        time = _html_field(block, "hours-info")
        day = ""
        found = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", date)
        if found:
            day = found.group(3) + "-" + found.group(2) + "-" + found.group(1)
        clock = "17:00"
        found_time = re.search(r"(\d{1,2}):(\d{2})", time)
        if found_time:
            clock = found_time.group(1).zfill(2) + ":" + found_time.group(2)
        rnd = _html_field(block, "round-info")
        rnd_n = re.search(r"(\d+)", rnd)
        state = _html_field(block, "match-state").lower()
        status = "finished" if "zako" in state else "scheduled"
        fixtures.append({
            "home": home,
            "away": away,
            "round": rnd_n.group(1) if rnd_n else "",
            "date": day,
            "time": clock,
            "kickoff": (day + " " + clock + ":00") if day else "",
            "status": status,
            "homeScore": _html_field(block, "home-team-score"),
            "awayScore": _html_field(block, "away-team-score"),
        })
    return fixtures


def fetch_1liga() -> dict:
    req = urllib.request.Request(
        "https://www.1liga.org/lks",
        headers={"User-Agent": LIGA_UA, "Accept": "text/html", "Accept-Language": "pl-PL,pl;q=0.9"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        html = resp.read().decode("utf-8", "replace")
    return {"fixtures": parse_1liga_html(html)}


def fetch_source(section_id: str, source_id: str) -> dict:
    section = SECTIONS[section_id]
    source = section["sources"][source_id]
    if source_id == "1liga":
        return {
            "ok": True,
            "section": section_id,
            "source": source_id,
            "sourceLabel": source["label"],
            "payloads": {"liga": fetch_1liga()},
        }
    payloads = {}
    for name, url in source["endpoints"].items():
        payloads[name] = get_json(url)
    searches = fetch_event_searches(source)
    if searches:
        payloads["cup"] = searches
    return {
        "ok": True,
        "section": section_id,
        "source": source_id,
        "sourceLabel": source["label"],
        "payloads": payloads,
    }


def fetch_merged(section_id: str) -> dict:
    errors = []
    payloads = {}
    labels = []

    for source_id in SECTIONS[section_id]["sources"]:
        try:
            bundle = fetch_source(section_id, source_id)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            errors.append(source_id + ": " + str(exc))
            continue
        if not usable(bundle):
            errors.append(source_id + ": empty payload")
            continue
        for key, value in (bundle.get("payloads") or {}).items():
            if key == "cup":
                merged_cup = payloads.get("cup") or {}
                merged_cup.update(value or {})
                payloads["cup"] = merged_cup
            elif key not in payloads or payloads[key] in (None, {}, []):
                payloads[key] = value
        if bundle.get("sourceLabel") and bundle["sourceLabel"] not in labels:
            labels.append(bundle["sourceLabel"])

    if not payloads:
        raise RuntimeError("; ".join(errors) or "no source")

    return {
        "ok": True,
        "section": section_id,
        "source": "merged",
        "sourceLabel": " + ".join(labels) if labels else "merged",
        "payloads": payloads,
        "fallbackFrom": errors,
    }


def usable(bundle: dict) -> bool:
    payloads = bundle.get("payloads") or {}
    if bundle.get("source") in ("lkslodz", "merged"):
        matches = payloads.get("matches") or {}
        if isinstance(matches, dict) and matches.get("success") and matches.get("data"):
            return True
    if bundle.get("source") in ("thesportsdb", "merged"):
        return bool(payloads.get("next") or payloads.get("last") or payloads.get("table") or payloads.get("cup"))
    if bundle.get("source") in ("1liga", "merged"):
        liga = payloads.get("liga") or {}
        return bool(liga.get("fixtures"))
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

    try:
        if preference in ("", "auto", "merged"):
            bundle = fetch_merged(args.section)
        elif preference in sources:
            bundle = fetch_source(args.section, preference)
            if not usable(bundle):
                raise RuntimeError("empty payload")
        else:
            json.dump({"ok": False, "error": "unknown source: " + preference}, sys.stdout)
            return 1
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError, RuntimeError) as exc:
        json.dump({"ok": False, "section": args.section, "error": str(exc)}, sys.stdout)
        return 1

    json.dump(bundle, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
