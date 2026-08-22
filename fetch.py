#!/usr/bin/env python3
"""Download raw payloads for one club/section/source.

Parsers live in Model.js. This script only fetches.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

UA = "kjk.lks-omarchy/0.3 (personal Omarchy widget; +https://github.com/mobilekjk-coder/omarchy-lks)"
BROWSER_UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
)

SEASON = "2026-2027"

CLUBS = {
    "lks": {
        "id": "lks",
        "name": "ŁKS Łódź",
        "sportsdb_id": "137112",
        "league_id": "4661",
        "sources": {
            "lkslodz": {
                "label": "lkslodz.pl",
                "endpoints": {
                    "matches": "https://lkslodz.pl/wp-json/lks/v1/matches",
                    "table": "https://lkslodz.pl/wp-json/lks/v1/league-table",
                },
            },
            "1liga": {"label": "1liga.org", "kind": "1liga", "url": "https://www.1liga.org/lks"},
            "thesportsdb": {
                "label": "TheSportsDB",
                "event_searches": ["GKS_Tychy_vs_LKS_Lodz", "LKS_Lodz_vs_GKS_Tychy"],
            },
            "tvp": {"label": "sport.tvp.pl", "kind": "tvp"},
        },
    },
    "lech": {
        "id": "lech",
        "name": "Lech Poznań",
        "sportsdb_id": "134010",
        "league_id": "4422",
        "sources": {
            "lechpoznan": {
                "label": "lechpoznan.pl",
                "kind": "lechpoznan",
                "url": "https://www.lechpoznan.pl/terminarz/",
            },
            "ekstraklasa": {
                "label": "ekstraklasa.org",
                "kind": "ekstraklasa",
                "url": "https://ekstraklasa.org/kluby/lech-poznan/",
            },
            "thesportsdb": {
                "label": "TheSportsDB",
                "event_searches": [
                    "Thun_vs_Lech_Poznan",
                    "Lech_Poznan_vs_Thun",
                    "FC_Thun_vs_Lech_Poznan",
                ],
            },
        },
    },
    "tychy": {
        "id": "tychy",
        "name": "GKS Tychy",
        "sportsdb_id": "138917",
        "league_id": "5709",
        "sources": {
            "drugaliga": {
                "label": "drugaliga.org",
                "kind": "drugaliga",
                "url": "https://www.drugaliga.org/gks-tychy",
                "table_url": "https://www.drugaliga.org/tabela-2026/27",
            },
            "thesportsdb": {"label": "TheSportsDB"},
            "tvp": {"label": "sport.tvp.pl", "kind": "tvp"},
        },
    },
    "zawisza": {
        "id": "zawisza",
        "name": "Zawisza Bydgoszcz",
        "sportsdb_id": "134612",
        "league_id": "5709",
        "sources": {
            "drugaliga": {
                "label": "drugaliga.org",
                "kind": "drugaliga",
                "url": "https://www.drugaliga.org/zawisza-bydgoszcz",
                "table_url": "https://www.drugaliga.org/tabela-2026/27",
            },
            "thesportsdb": {"label": "TheSportsDB"},
            "tvp": {"label": "sport.tvp.pl", "kind": "tvp"},
        },
    },
}


def get_json(url: str) -> object:
    last_error = None
    for attempt in range(3):
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8", "replace")
            return json.loads(raw)
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code != 429 or attempt == 2:
                raise
            time.sleep(1.2 * (attempt + 1))
    raise last_error


def get_html(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": BROWSER_UA, "Accept": "text/html", "Accept-Language": "pl-PL,pl;q=0.9"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read().decode("utf-8", "replace")


def sportsdb_urls(club: dict) -> dict:
    team = club["sportsdb_id"]
    league = club["league_id"]
    return {
        "next": f"https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id={team}",
        "last": f"https://www.thesportsdb.com/api/v1/json/3/eventslast.php?id={team}",
        "table": f"https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l={league}&s={SEASON}",
    }


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


def fetch_1liga(url: str) -> dict:
    return {"fixtures": parse_1liga_html(get_html(url))}


def parse_ekstraklasa_html(html: str) -> list:
    pat = re.compile(
        r'matchDatetime\\":\\"([^\\]+)\\",\\"date\\":\\"([^\\]+)\\",\\"time\\":\\"([^\\]*)\\",'
        r'\\"venue\\":\\"([^\\]*)\\",\\"isAway\\":(true|false),\\"homeTeam\\":\{\\"name\\":\\"([^\\]+)\\"'
        r'.*?\\"awayTeam\\":\{\\"name\\":\\"([^\\]+)\\".*?\\"homeScore\\":(null|\d+),\\"awayScore\\":(null|\d+)',
        re.S,
    )
    now = datetime.now(timezone.utc)
    fixtures = []
    for dt, date, time, venue, is_away, home, away, hs, aus in pat.findall(html):
        try:
            kickoff = datetime.fromisoformat(dt)
        except ValueError:
            kickoff = None
        future = kickoff is not None and kickoff > now
        home_score = None if hs == "null" or (future and hs == "0" and aus == "0") else hs
        away_score = None if aus == "null" or (future and hs == "0" and aus == "0") else aus
        status = "scheduled" if future or home_score is None else "finished"
        fixtures.append({
            "home": home,
            "away": away,
            "round": "",
            "kickoff": kickoff.isoformat() if kickoff else "",
            "venue": venue.replace("\\u0026", "&"),
            "status": status,
            "homeScore": home_score,
            "awayScore": away_score,
            "isAway": is_away == "true",
            "competition": "Ekstraklasa",
        })
    return fixtures


def fetch_ekstraklasa(url: str) -> dict:
    return {"fixtures": parse_ekstraklasa_html(get_html(url))}


def parse_lechpoznan_html(html: str) -> list:
    chunk = html
    start = html.find("nextMatches-Slider")
    if start >= 0:
        chunk = html[start:start + 40000]
    fixtures = []
    for block in re.split(r"<li\b", chunk)[1:]:
        title_m = re.search(r'data-title="([^"]*)"', block)
        if not title_m:
            continue
        body = block
        title = re.sub(r"<[^>]+>", " ", title_m.group(1))
        title = re.sub(r"\s+", " ", title).strip()
        date_m = re.search(r"(\d{2})\.(\d{2})\.(\d{4})(?:\s+\S+\s+(\d{1,2}):(\d{2}))?", title)
        if not date_m:
            continue
        day = date_m.group(3) + "-" + date_m.group(2) + "-" + date_m.group(1)
        clock = "20:00"
        if date_m.group(4):
            clock = date_m.group(4).zfill(2) + ":" + date_m.group(5)
        competition = title[: date_m.start()].strip() or "Liga Europy"
        home_m = re.search(r'class="Left"[\s\S]*?<u>([^<]+)</u>', body)
        away_m = re.search(r'class="Right"[\s\S]*?<u>([^<]+)</u>', body)
        if not home_m or not away_m:
            continue
        fixtures.append({
            "home": home_m.group(1).strip(),
            "away": away_m.group(1).strip(),
            "round": "",
            "kickoff": day + " " + clock + ":00",
            "status": "scheduled",
            "competition": competition,
        })
    return fixtures


def fetch_lechpoznan(url: str) -> dict:
    return {"fixtures": parse_lechpoznan_html(get_html(url))}


def parse_drugaliga_fixtures(html: str) -> list:
    fixtures = []
    for block in html.split("timetable-item-date")[1:]:
        date_m = re.search(r"<span>\s*([^<]+?)\s*</span>", block)
        teams = re.findall(r'class="d-none d-sm-block">([^<]+)', block)
        if len(teams) < 2:
            teams = re.findall(r'class="d-sm-none[^"]*">([^<]+)', block)
        if not date_m or len(teams) < 2:
            continue
        stamp = re.sub(r"\s+", " ", date_m.group(1)).strip()
        found = re.search(r"(\d{2})\.(\d{2})\.(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?", stamp)
        if not found:
            continue
        day = found.group(3) + "-" + found.group(2) + "-" + found.group(1)
        clock = "17:00"
        if found.group(4):
            clock = found.group(4).zfill(2) + ":" + found.group(5)
        result_m = re.search(r'class="result-wrapper[^"]*"[^>]*>\s*([^<]+)', block)
        result = re.sub(r"\s+", " ", result_m.group(1)).strip() if result_m else "vs"
        score = re.search(r"(\d+)\s*[:\-]\s*(\d+)", result)
        home_score = score.group(1) if score else None
        away_score = score.group(2) if score else None
        fixtures.append({
            "home": teams[0].strip(),
            "away": teams[1].strip(),
            "round": "",
            "kickoff": day + " " + clock + ":00",
            "status": "finished" if score else "scheduled",
            "homeScore": home_score,
            "awayScore": away_score,
            "competition": "II liga",
        })
    return fixtures


def _cell_text(cell: str) -> str:
    text = re.sub(r"<[^>]+>", " ", cell)
    return re.sub(r"\s+", " ", text).strip()


def parse_drugaliga_table(html: str) -> list:
    table = []
    for row in re.finditer(r"<tr[^>]*>([\s\S]*?)</tr>", html):
        body = row.group(1)
        name_m = re.search(r'class="whole-name[^"]*">([^<]+)', body)
        if not name_m:
            continue
        cells = [_cell_text(c) for c in re.findall(r"<td[^>]*>([\s\S]*?)</td>", body)]
        if len(cells) < 8:
            continue
        goals = re.sub(r"\s+", "", cells[4])
        table.append({
            "position": int(cells[0] or 0),
            "name": name_m.group(1).strip(),
            "played": int(cells[2] or 0),
            "points": int(cells[3] or 0),
            "wins": int(cells[5] or 0),
            "draws": int(cells[6] or 0),
            "losses": int(cells[7] or 0),
            "goals": goals,
        })
    return table


def fetch_drugaliga(source: dict) -> dict:
    fixtures = parse_drugaliga_fixtures(get_html(source["url"]))
    table = []
    table_url = source.get("table_url")
    if table_url:
        try:
            table = parse_drugaliga_table(get_html(table_url))
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
            table = []
    return {"fixtures": fixtures, "table": table}


def fetch_tvp() -> dict:
    data = get_json("https://sport.tvp.pl/api/sport/www/transmission?device=www")
    items = ((data or {}).get("data") or {}).get("items") or []
    out = []
    for it in items:
        title = str(it.get("title") or "")
        video = it.get("video") if isinstance(it.get("video"), dict) else {}
        news = it.get("news") if isinstance(it.get("news"), dict) else {}
        url = str(video.get("url") or news.get("url") or "")
        if not url:
            continue
        if "magazyn" in title.lower() or "styl życia" in title.lower() or "styl zycia" in title.lower():
            continue
        out.append({
            "title": title,
            "url": url,
            "broadcastStart": it.get("broadcast_start"),
            "isLive": bool(it.get("is_live")),
        })
    return {"items": out}


def fetch_thesportsdb(club: dict, source: dict) -> dict:
    payloads = {}
    for name, url in sportsdb_urls(club).items():
        payloads[name] = get_json(url)
    searches = fetch_event_searches(source)
    if searches:
        payloads["cup"] = searches
    return payloads


def fetch_source(club_id: str, section_id: str, source_id: str) -> dict:
    club = CLUBS[club_id]
    source = club["sources"][source_id]
    kind = source.get("kind") or source_id
    if kind == "1liga":
        payloads = {"liga": fetch_1liga(source["url"])}
    elif kind == "ekstraklasa":
        payloads = {"ekstraklasa": fetch_ekstraklasa(source["url"])}
    elif kind == "lechpoznan":
        payloads = {"lechpoznan": fetch_lechpoznan(source["url"])}
    elif kind == "drugaliga":
        payloads = {"drugaliga": fetch_drugaliga(source)}
    elif kind == "tvp":
        payloads = {"tvp": fetch_tvp()}
    elif source_id == "thesportsdb":
        payloads = fetch_thesportsdb(club, source)
    else:
        payloads = {}
        for name, url in (source.get("endpoints") or {}).items():
            payloads[name] = get_json(url)
        searches = fetch_event_searches(source)
        if searches:
            payloads["cup"] = searches
    return {
        "ok": True,
        "club": club_id,
        "section": section_id,
        "source": source_id,
        "sourceLabel": source["label"],
        "payloads": payloads,
    }


def fetch_merged(club_id: str, section_id: str) -> dict:
    errors = []
    payloads = {}
    labels = []

    for source_id in CLUBS[club_id]["sources"]:
        try:
            bundle = fetch_source(club_id, section_id, source_id)
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
        "club": club_id,
        "section": section_id,
        "source": "merged",
        "sourceLabel": " + ".join(labels) if labels else "merged",
        "payloads": payloads,
        "fallbackFrom": errors,
    }


def usable(bundle: dict) -> bool:
    payloads = bundle.get("payloads") or {}
    source = bundle.get("source")
    if source in ("lkslodz", "merged"):
        matches = payloads.get("matches") or {}
        if isinstance(matches, dict) and matches.get("success") and matches.get("data"):
            return True
    if source in ("thesportsdb", "merged"):
        if payloads.get("next") or payloads.get("last") or payloads.get("table") or payloads.get("cup"):
            return True
    if source in ("1liga", "merged"):
        liga = payloads.get("liga") or {}
        if liga.get("fixtures"):
            return True
    if source in ("ekstraklasa", "merged"):
        eks = payloads.get("ekstraklasa") or {}
        if eks.get("fixtures"):
            return True
    if source in ("lechpoznan", "merged"):
        club_site = payloads.get("lechpoznan") or {}
        if club_site.get("fixtures"):
            return True
    if source in ("tvp", "merged"):
        tvp = payloads.get("tvp") or {}
        if tvp.get("items"):
            return True
    if source in ("drugaliga", "merged"):
        liga2 = payloads.get("drugaliga") or {}
        if liga2.get("fixtures") or liga2.get("table"):
            return True
    return bool(payloads)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--club", default="lks")
    parser.add_argument("--section", default="football-men")
    parser.add_argument("--source", default="auto")
    args = parser.parse_args()

    club_id = (args.club or "lks").strip().lower()
    if club_id not in CLUBS:
        json.dump({"ok": False, "error": "unknown club: " + club_id}, sys.stdout)
        return 1
    if args.section != "football-men":
        json.dump({"ok": False, "error": "unknown section: " + args.section}, sys.stdout)
        return 1

    sources = CLUBS[club_id]["sources"]
    preference = (args.source or "auto").strip().lower()

    try:
        if preference in ("", "auto", "merged"):
            bundle = fetch_merged(club_id, args.section)
        elif preference in sources:
            bundle = fetch_source(club_id, args.section, preference)
            if not usable(bundle):
                raise RuntimeError("empty payload")
        else:
            json.dump({"ok": False, "error": "unknown source: " + preference, "club": club_id}, sys.stdout)
            return 1
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError, RuntimeError) as exc:
        json.dump({"ok": False, "club": club_id, "section": args.section, "error": str(exc)}, sys.stdout)
        return 1

    json.dump(bundle, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
