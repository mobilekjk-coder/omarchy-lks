// Normalized snapshot contract (any source, any later section):
//
// event: {
//   id, source, section, competition, competitionKind, round,
//   kickoffMs, home, away, homeScore, awayScore, status,
//   venue, isHome, opponent
// }
// status: scheduled | live | finished | postponed | cancelled
// competitionKind: league | cup | friendly
//
// standing: { position, name, played, wins, draws, losses,
//             goalsFor, goalsAgainst, points, status, isUs }

var TEAM = "ŁKS Łódź"
var TEAM_SHORT = "ŁKS"
var SECTION_FOOTBALL_MEN = "football-men"
var DEFAULT_CLUB = "lks"

var CLUB_ORDER = ["lks", "lech", "tychy", "zawisza"]
var CLUBS = {
  lks: {
    id: "lks",
    code: "ŁKS",
    name: "ŁKS Łódź",
    sportsdbId: "137112",
    leagueCode: "1L",
    needles: ["lkslodz"],
    exact: ["lks"],
    exclude: []
  },
  lech: {
    id: "lech",
    code: "LECH",
    name: "Lech Poznań",
    sportsdbId: "134010",
    leagueCode: "EKS",
    needles: ["lechpoznan"],
    exact: ["lech"],
    exclude: ["lechia"]
  },
  tychy: {
    id: "tychy",
    code: "TYCHY",
    name: "GKS Tychy",
    sportsdbId: "138917",
    leagueCode: "2L",
    needles: ["gkstychy", "tychy"],
    exact: [],
    exclude: []
  },
  zawisza: {
    id: "zawisza",
    code: "ZAW",
    name: "Zawisza Bydgoszcz",
    sportsdbId: "134612",
    leagueCode: "2L",
    needles: ["zawisza"],
    exact: [],
    exclude: []
  }
}

function clubById(id) {
  return CLUBS[String(id || "")] || CLUBS.lks
}

function resolveClubId(pref) {
  var id = String(pref || DEFAULT_CLUB).toLowerCase().replace(/^\s+|\s+$/g, "")
  return CLUBS[id] ? id : DEFAULT_CLUB
}

function clubIds() {
  return CLUB_ORDER.slice()
}

var STRINGS = {
  pl: {
    "nextMatch": "NASTĘPNY MECZ",
    "live": "NA ŻYWO",
    "liveShort": "na żywo",
    "noFixture": "Brak terminu",
    "lastResult": "OSTATNI WYNIK",
    "upcoming": "NADCHODZĄCE",
    "cup": "PUCHAR",
    "table": "TABELA",
    "home": "u siebie",
    "away": "wyjazd",
    "homeMark": "D",
    "awayMark": "W",
    "matchday": "kolejka",
    "round": "runda",
    "place": "miejsce",
    "pts": "pkt",
    "today": "dziś",
    "tomorrow": "jutro",
    "source": "Źródło",
    "loading": "Pobieranie terminów…",
    "noMatch": "Brak zaplanowanego meczu",
    "languageName": "Polski",
    "error.empty": "Pusta odpowiedź",
    "error.parse": "Nie udało się odczytać danych",
    "error.fetch": "Nie udało się pobrać danych",
    weekdaysShort: ["nd.", "pn.", "wt.", "śr.", "cz.", "pt.", "sb."],
    weekdaysLong: ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"]
  },
  en: {
    "nextMatch": "NEXT MATCH",
    "live": "LIVE",
    "liveShort": "live",
    "noFixture": "No fixture",
    "lastResult": "LAST RESULT",
    "upcoming": "UPCOMING",
    "cup": "CUP",
    "table": "TABLE",
    "home": "home",
    "away": "away",
    "homeMark": "H",
    "awayMark": "A",
    "matchday": "matchday",
    "round": "round",
    "place": "place",
    "pts": "pts",
    "today": "today",
    "tomorrow": "tomorrow",
    "source": "Source",
    "loading": "Loading fixtures…",
    "noMatch": "No upcoming match",
    "languageName": "English",
    "error.empty": "Empty response",
    "error.parse": "Could not parse data",
    "error.fetch": "Could not fetch data",
    weekdaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    weekdaysLong: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  }
}

function resolveLang(pref, localeName) {
  var chosen = String(pref || "auto").toLowerCase().replace(/^\s+|\s+$/g, "")
  if (chosen.indexOf("pl") === 0) return "pl"
  if (chosen.indexOf("en") === 0) return "en"
  var locale = String(localeName || "").toLowerCase()
  if (locale.indexOf("pl") === 0) return "pl"
  if (locale.indexOf("en") === 0) return "en"
  return "pl"
}

function pack(lang) {
  return STRINGS[lang] || STRINGS.pl
}

function t(lang, key) {
  var strings = pack(lang)
  if (strings[key] !== undefined) return strings[key]
  if (STRINGS.en[key] !== undefined) return STRINGS.en[key]
  return key
}

function otherLang(lang) {
  return lang === "en" ? "pl" : "en"
}

var SHORT_NAMES = {
  "bruk-bet termalica nieciecza": "Nieciecza",
  "termalica bb nieciecza": "Nieciecza",
  "pogon grodzisk mazowiecki": "Grodzisk",
  "podbeskidzie bielsko-biala": "Podbeskidzie",
  "ks lechia gdansk": "Lechia",
  "lechia gdansk": "Lechia",
  "mzks arka gdynia": "Arka",
  "arka gdynia": "Arka",
  "oks odra opole": "Odra",
  "odra opole": "Odra",
  "pogon siedlce": "Siedlce",
  "polonia warszawa": "Polonia Wwa",
  "polonia bytom": "Bytom",
  "puszcza niepolomice": "Puszcza",
  "miedz legnica": "Miedź",
  "stal rzeszow": "Rzeszów",
  "stal mielec": "Mielec",
  "ruch chorzow": "Ruch",
  "chrobry glogow": "Chrobry",
  "warta poznan": "Warta",
  "gornik leczna": "Łęczna",
  "gks tychy": "Tychy",
  "wieczysta krakow": "Wieczysta",
  "unia skierniewice": "Unia",
  "slask wroclaw": "Śląsk",
  "lks lodz": "ŁKS",
  "lks": "ŁKS",
  "lech poznan": "Lech",
  "legia warszawa": "Legia",
  "jagiellonia bialystok": "Jagiellonia",
  "rakow czestochowa": "Raków",
  "gornik zabrze": "Górnik",
  "radomiak radom": "Radomiak",
  "korona kielce": "Korona",
  "wisla krakow": "Wisła Kr",
  "wisla plock": "Płock",
  "zaglebie lubin": "Zagłębie",
  "gks katowice": "Katowice",
  "pogon szczecin": "Pogoń",
  "motor lublin": "Motor",
  "cracovia": "Cracovia",
  "widzew lodz": "Mezdim",
  "zawisza bydgoszcz": "Zawisza"
}

var LOGO_NAMES = {
  "lks-lodz": TEAM,
  "oks-odra-opole": "Odra Opole",
  "stal-mielec": "Stal Mielec",
  "mzks-arka-gdynia": "Arka Gdynia",
  "slask-wroclaw": "Śląsk Wrocław",
  "pogon-grodzisk-mazowiecki": "Pogoń Grodzisk Mazowiecki",
  "podbeskidzie-bielsko-biala": "Podbeskidzie Bielsko-Biała",
  "ks-lechia-gdansk": "Lechia Gdańsk",
  "pogon-siedlce": "Pogoń Siedlce",
  "polonia-warszawa": "Polonia Warszawa",
  "polonia-bytom": "Polonia Bytom",
  "puszcza-niepolomice": "Puszcza Niepołomice",
  "miedz-legnica": "Miedź Legnica",
  "stal-rzeszow": "Stal Rzeszów",
  "ruch-chorzow": "Ruch Chorzów",
  "chrobry-glogow": "Chrobry Głogów",
  "warta-poznan": "Warta Poznań",
  "gornik-leczna": "Górnik Łęczna",
  "gks-tychy": "GKS Tychy",
  "wieczysta-krakow": "Wieczysta Kraków",
  "unia-skierniewice": "Unia Skierniewice",
  "bruk-bet-termalica-nieciecza": "Bruk-Bet Termalica Nieciecza"
}

function emptySnapshot() {
  return {
    ok: false,
    club: DEFAULT_CLUB,
    section: SECTION_FOOTBALL_MEN,
    source: "",
    sourceLabel: "",
    fetchedAt: 0,
    events: [],
    table: [],
    error: ""
  }
}

function foldName(value) {
  var text = String(value || "").toLowerCase()
  var from = "ąćęłńóśźżáäéěíóôöúůüý"
  var to = "acelnoszzaaeeioouuuy"
  var out = ""
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i)
    var idx = from.indexOf(ch)
    out += idx >= 0 ? to.charAt(idx) : ch
  }
  return out.replace(/[^a-z0-9]+/g, " ").replace(/^\s+|\s+$/g, "")
}

function compactName(value) {
  return foldName(value).replace(/\s+/g, "")
}

function isWidzew(value) {
  return /widzew/.test(foldName(value))
}

function displayName(value) {
  if (isWidzew(value)) return "Mezdim"
  return String(value || "")
}

function isClubName(value, club) {
  club = club || CLUBS.lks
  var compact = compactName(value)
  if (!compact) return false
  var exclude = club.exclude || []
  for (var e = 0; e < exclude.length; e++) {
    if (compact.indexOf(exclude[e]) !== -1) return false
  }
  var exact = club.exact || []
  for (var i = 0; i < exact.length; i++) {
    if (compact === exact[i]) return true
  }
  var needles = club.needles || []
  for (var n = 0; n < needles.length; n++) {
    if (compact.indexOf(needles[n]) !== -1) return true
  }
  return false
}

function isLksName(value) {
  return isClubName(value, CLUBS.lks)
}

function isReserveName(value) {
  return /(^| )(ii|2|rezerwy|rezerwa)( |$)/.test(foldName(value))
}

function isClubFirstTeam(value, club) {
  return isClubName(value, club) && !isReserveName(value)
}

function isLksFirstTeam(value) {
  return isClubFirstTeam(value, CLUBS.lks)
}

function logoSlug(url) {
  var path = String(url || "").split("?")[0]
  var file = path.split("/").pop() || ""
  return file.replace(/\.[a-z0-9]+$/i, "").toLowerCase()
}

function nameFromLogo(url) {
  var slug = logoSlug(url)
  if (LOGO_NAMES[slug]) return LOGO_NAMES[slug]
  if (slug.indexOf("lks-lodz") !== -1 || slug === "lks_lodz") return TEAM
  if (!slug || slug === "logo") return ""
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, function(ch) { return ch.toUpperCase() })
}

function sideName(side) {
  if (!side || typeof side !== "object") return ""
  var named = String(side.name || "").replace(/^\s+|\s+$/g, "")
  if (named) return named
  return nameFromLogo(side.logo)
}

function isClubSide(side, name, club) {
  if (isClubName(name, club)) return true
  if (!club || club.id !== "lks") return false
  var slug = logoSlug(side && side.logo)
  return slug.indexOf("lks-lodz") !== -1 || slug === "lks_lodz"
}

function isLksSide(side, name) {
  return isClubSide(side, name, CLUBS.lks)
}

function shortName(value, club) {
  if (isWidzew(value) || foldName(value) === "mezdim") return "Mezdim"
  if (club && isClubName(value, club)) return club.code
  if (isLksName(value)) return "ŁKS"
  var folded = foldName(value)
  if (SHORT_NAMES[folded]) return SHORT_NAMES[folded]
  var text = String(value || "").replace(/^\s+|\s+$/g, "")
  if (text.length <= 16) return text
  var parts = text.split(/\s+/)
  return parts[parts.length - 1] || text
}

function parseScore(value) {
  if (value === null || value === undefined || value === "") return null
  var n = parseInt(String(value), 10)
  return isNaN(n) ? null : n
}

function lastWeekdayOfMonth(year, month, weekday) {
  var last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  var lastWd = new Date(Date.UTC(year, month - 1, last)).getUTCDay()
  return last - ((lastWd - weekday + 7) % 7)
}

// Club payloads are Warsaw wall-clock, with no offset. EU DST: last Sunday
// of March 02:00 CET through last Sunday of October 03:00 CEST.
function warsawOffsetMinutes(year, month, day, hour) {
  var start = lastWeekdayOfMonth(year, 3, 0)
  var end = lastWeekdayOfMonth(year, 10, 0)
  var n = year * 10000 + month * 100 + day
  var dstStart = year * 10000 + 300 + start
  var dstEnd = year * 10000 + 1000 + end
  if (n > dstStart && n < dstEnd) return 120
  if (n === dstStart) return hour >= 2 ? 120 : 60
  if (n === dstEnd) return hour >= 3 ? 60 : 120
  return 60
}

function parseLocalDateTime(value) {
  var text = String(value || "").trim()
  if (!text) return null
  var match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (match) {
    var year = parseInt(match[1], 10)
    var month = parseInt(match[2], 10)
    var day = parseInt(match[3], 10)
    var hour = parseInt(match[4], 10)
    var minute = parseInt(match[5], 10)
    var second = parseInt(match[6] || "0", 10)
    var offset = warsawOffsetMinutes(year, month, day, hour)
    return Date.UTC(year, month - 1, day, hour, minute, second) - offset * 60 * 1000
  }
  var parsed = new Date(text)
  return isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function parseUtcTimestamp(value) {
  var text = String(value || "").trim()
  if (!text) return null
  if (!/[zZ]$|[+-]\d{2}:\d{2}$/.test(text)) text += "Z"
  var parsed = new Date(text)
  return isNaN(parsed.getTime()) ? null : parsed.getTime()
}

function startOfDay(ms) {
  var d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function addDays(ms, days) {
  return ms + days * 24 * 60 * 60 * 1000
}

function competitionKind(name) {
  var folded = foldName(name)
  if (/friendly|sparing|towarzyski/.test(folded)) return "friendly"
  if (/champions|liga mistrz|europa league|liga europy|conference|liga konferencji/.test(folded))
    return "europe"
  if (/puchar|polish cup/.test(folded)) return "cup"
  return "league"
}

function normalizeStatus(raw, homeScore, awayScore, kickoffMs, nowMs) {
  var status = String(raw || "").toLowerCase()
  if (/postpon/.test(status)) return "postponed"
  if (/cancel/.test(status)) return "cancelled"
  if (status === "aet" || status === "pen" || /ended|finished|ft|aet|after extra/.test(status))
    return "finished"
  if (/live|1h|2h|ht|in play|halftime/.test(status)) return "live"
  var hasScore = homeScore !== null && awayScore !== null
  if (hasScore) return "finished"
  if (kickoffMs !== null && nowMs !== null) {
    var elapsed = nowMs - kickoffMs
    if (elapsed >= 0 && elapsed < 2.5 * 60 * 60 * 1000) return "live"
  }
  return "scheduled"
}

function eventRank(event) {
  var rank = 0
  if (event.home && event.away) rank += 2
  if (event.status === "finished") rank += 3
  if (event.status === "scheduled" || event.status === "live") rank += 1
  if (event.homeScore !== null) rank += 1
  return rank
}

function eventKey(event) {
  return [startOfDay(event.kickoffMs), foldName(event.home), foldName(event.away)].join("|")
}

function dedupeEvents(events) {
  var best = {}
  var order = []
  for (var i = 0; i < events.length; i++) {
    var event = events[i]
    if (!event || event.kickoffMs === null || !event.opponent) continue
    var key = eventKey(event)
    if (!best[key]) {
      best[key] = event
      order.push(key)
    } else if (eventRank(event) > eventRank(best[key])) {
      best[key] = event
    }
  }
  var out = []
  for (var j = 0; j < order.length; j++) out.push(best[order[j]])
  return out
}

function buildEvent(fields) {
  var home = displayName(fields.home || "")
  var away = displayName(fields.away || "")
  var isHome = !!fields.isHome
  var opponent = isHome ? away : home
  if (!opponent) return null
  return {
    id: fields.id,
    source: fields.source,
    section: fields.section || SECTION_FOOTBALL_MEN,
    competition: fields.competition || "",
    competitionKind: fields.competitionKind || competitionKind(fields.competition),
    round: fields.round || "",
    kickoffMs: fields.kickoffMs,
    home: home,
    away: away,
    homeScore: fields.homeScore,
    awayScore: fields.awayScore,
    status: fields.status,
    venue: fields.venue || "",
    isHome: isHome,
    opponent: opponent
  }
}

function parseLkslodzMatches(raw, nowMs, club) {
  club = club || CLUBS.lks
  var payload = raw && raw.data ? raw.data : raw
  if (!Array.isArray(payload)) return []
  var events = []
  for (var i = 0; i < payload.length; i++) {
    var row = payload[i] || {}
    var home = sideName(row.home)
    var away = sideName(row.away)
    var homeIsUs = isClubSide(row.home, home, club)
    var awayIsUs = isClubSide(row.away, away, club)
    if (homeIsUs) home = club.name
    if (awayIsUs) away = club.name
    var homeScore = parseScore(row.home && row.home.score)
    var awayScore = parseScore(row.away && row.away.score)
    var kickoffMs = parseLocalDateTime(row.date)
    var event = buildEvent({
      id: "lkslodz:" + String(row.id || i),
      source: "lkslodz",
      competition: row.league || "",
      round: String(row.round || ""),
      kickoffMs: kickoffMs,
      home: home,
      away: away,
      homeScore: homeScore,
      awayScore: awayScore,
      status: normalizeStatus(row.status, homeScore, awayScore, kickoffMs, nowMs),
      isHome: homeIsUs || (!awayIsUs && homeIsUs)
    })
    if (event) events.push(event)
  }
  return dedupeEvents(events)
}

function parseClubTable(raw, club) {
  club = club || CLUBS.lks
  var payload = raw && raw.data ? raw.data : raw
  if (!Array.isArray(payload)) return []
  var table = []
  for (var i = 0; i < payload.length; i++) {
    var row = payload[i] || {}
    var goals = String(row.goals || "").split(":")
    table.push({
      position: parseInt(row.position, 10) || (i + 1),
      name: displayName(row.name || ""),
      played: parseInt(row.played, 10) || 0,
      wins: parseInt(row.wins, 10) || 0,
      draws: parseInt(row.draws, 10) || 0,
      losses: parseInt(row.losses, 10) || 0,
      goalsFor: parseInt(goals[0], 10) || 0,
      goalsAgainst: parseInt(goals[1], 10) || 0,
      points: parseInt(row.points, 10) || 0,
      status: row.status || "",
      isUs: isClubName(row.name, club)
    })
  }
  return table
}

function parseLkslodzTable(raw) {
  return parseClubTable(raw, CLUBS.lks)
}

function collectSportsDbRows(payloads) {
  var rows = []
  if (!payloads) return rows
  if (payloads.next && payloads.next.events) rows = rows.concat(payloads.next.events)
  if (payloads.last && payloads.last.results) rows = rows.concat(payloads.last.results)
  if (payloads.last && payloads.last.events) rows = rows.concat(payloads.last.events)
  var cup = payloads.cup
  if (cup && typeof cup === "object") {
    for (var key in cup) {
      var block = cup[key]
      if (block && block.event) rows = rows.concat(block.event)
      if (block && block.events) rows = rows.concat(block.events)
    }
  }
  return rows
}

function parseSportsDbEvent(row, sourceKey, nowMs, club) {
  if (!row) return null
  club = club || CLUBS.lks
  var home = row.strHomeTeam || ""
  var away = row.strAwayTeam || ""
  var homeIsUs = String(row.idHomeTeam) === String(club.sportsdbId) || isClubFirstTeam(home, club)
  var awayIsUs = String(row.idAwayTeam) === String(club.sportsdbId) || isClubFirstTeam(away, club)
  if (!homeIsUs && !awayIsUs) return null
  var homeScore = parseScore(row.intHomeScore)
  var awayScore = parseScore(row.intAwayScore)
  var kickoffMs = parseUtcTimestamp(row.strTimestamp)
  if (kickoffMs === null) {
    var local = String(row.dateEventLocal || row.dateEvent || "") + "T" + String(row.strTimeLocal || row.strTime || "00:00:00")
    kickoffMs = parseLocalDateTime(local)
  }
  return buildEvent({
    id: "thesportsdb:" + String(row.idEvent || sourceKey),
    source: "thesportsdb",
    competition: row.strLeague || "",
    round: String(row.intRound || ""),
    kickoffMs: kickoffMs,
    home: homeIsUs ? club.name : home,
    away: awayIsUs ? club.name : away,
    homeScore: homeScore,
    awayScore: awayScore,
    status: normalizeStatus(row.strStatus, homeScore, awayScore, kickoffMs, nowMs),
    venue: row.strVenue || "",
    isHome: homeIsUs
  })
}

function parseSportsDbEvents(payloads, nowMs, club) {
  var rows = collectSportsDbRows(payloads)
  var events = []
  for (var i = 0; i < rows.length; i++) {
    var event = parseSportsDbEvent(rows[i], "tsdb" + i, nowMs, club)
    if (event) events.push(event)
  }
  return dedupeEvents(events)
}

function parseSportsDbTable(raw, club) {
  club = club || CLUBS.lks
  var payload = raw && raw.table ? raw.table : raw
  if (!Array.isArray(payload)) return []
  var table = []
  for (var i = 0; i < payload.length; i++) {
    var row = payload[i] || {}
    table.push({
      position: parseInt(row.intRank, 10) || (i + 1),
      name: displayName(row.strTeam || ""),
      played: parseInt(row.intPlayed, 10) || 0,
      wins: parseInt(row.intWin, 10) || 0,
      draws: parseInt(row.intDraw, 10) || 0,
      losses: parseInt(row.intLoss, 10) || 0,
      goalsFor: parseInt(row.intGoalsFor, 10) || 0,
      goalsAgainst: parseInt(row.intGoalsAgainst, 10) || 0,
      points: parseInt(row.intPoints, 10) || 0,
      status: row.strDescription || "",
      isUs: String(row.idTeam) === String(club.sportsdbId) || isClubName(row.strTeam, club)
    })
  }
  return table
}

function parseListedEvents(raw, club, nowMs, sourceId) {
  club = club || CLUBS.lks
  var list = raw && raw.fixtures ? raw.fixtures : raw
  if (!Array.isArray(list)) return []
  var events = []
  for (var i = 0; i < list.length; i++) {
    var row = list[i] || {}
    var home = row.home || ""
    var away = row.away || ""
    var homeIsUs = isClubFirstTeam(home, club)
    var awayIsUs = isClubFirstTeam(away, club)
    if (!homeIsUs && !awayIsUs) continue
    var kickoffMs = null
    if (row.kickoff && String(row.kickoff).indexOf("T") !== -1) kickoffMs = parseUtcTimestamp(row.kickoff)
    if (kickoffMs === null) kickoffMs = parseLocalDateTime(row.kickoff)
    var homeScore = parseScore(row.homeScore)
    var awayScore = parseScore(row.awayScore)
    var event = buildEvent({
      id: (sourceId || "listed") + ":" + String(row.kickoff || i) + ":" + compactName(home) + ":" + compactName(away),
      source: sourceId || "listed",
      competition: row.competition || "",
      round: String(row.round || ""),
      kickoffMs: kickoffMs,
      home: homeIsUs ? club.name : home,
      away: awayIsUs ? club.name : away,
      homeScore: homeScore,
      awayScore: awayScore,
      status: normalizeStatus(row.status, homeScore, awayScore, kickoffMs, nowMs),
      venue: row.venue || "",
      isHome: homeIsUs
    })
    if (event) events.push(event)
  }
  return dedupeEvents(events)
}

// Official kickoffs when a feed is stale. TheSportsDB still has the Tychy
// cup tie as 2 Sep 16:00 UTC; the host club and city published 3 Sep 17:30
// CEST at Stadion Miejski w Tychach.
var KICKOFF_CORRECTIONS = [
  {
    club: "lks",
    opponent: "gks tychy",
    competitionKind: "cup",
    notBefore: "2026-08-01",
    kickoff: "2026-09-03 17:30:00",
    venue: "Stadion Miejski w Tychach"
  }
]

function teamsLooselyMatch(a, b) {
  var fa = foldName(a)
  var fb = foldName(b)
  if (!fa || !fb) return false
  if (fa === fb) return true
  if ((isWidzew(a) || fa === "mezdim") && (isWidzew(b) || fb === "mezdim")) return true
  if (fa.indexOf(fb) === 0 || fb.indexOf(fa) === 0) return true
  return false
}

function parseLigaFixtures(raw, club) {
  club = club || CLUBS.lks
  var list = raw && raw.fixtures ? raw.fixtures : raw
  if (!Array.isArray(list)) return []
  var out = []
  for (var i = 0; i < list.length; i++) {
    var row = list[i] || {}
    var homeIsUs = isClubFirstTeam(row.home, club)
    var awayIsUs = isClubFirstTeam(row.away, club)
    if (!homeIsUs && !awayIsUs) continue
    out.push({
      home: homeIsUs ? club.name : row.home,
      away: awayIsUs ? club.name : row.away,
      opponent: homeIsUs ? row.away : row.home,
      isHome: homeIsUs,
      round: String(row.round || ""),
      kickoffMs: parseLocalDateTime(row.kickoff),
      status: row.status || "scheduled"
    })
  }
  return out
}

function applyLeagueSchedule(events, fixtures) {
  var list = events || []
  var liga = fixtures || []
  if (!liga.length) return list
  for (var i = 0; i < list.length; i++) {
    var event = list[i]
    if (!event || event.competitionKind !== "league") continue
    var hit = null
    for (var j = 0; j < liga.length; j++) {
      var row = liga[j]
      if (event.isHome !== row.isHome) continue
      if (!teamsLooselyMatch(event.opponent, row.opponent)) continue
      if (event.round && row.round && String(event.round) === String(row.round)) {
        hit = row
        break
      }
      if (!hit) hit = row
    }
    if (hit && hit.kickoffMs) event.kickoffMs = hit.kickoffMs
  }
  return list
}

function applyKickoffCorrections(events, clubId) {
  var list = events || []
  var wanted = clubId || DEFAULT_CLUB
  for (var i = 0; i < list.length; i++) {
    var event = list[i]
    if (!event || event.status === "finished") continue
    for (var j = 0; j < KICKOFF_CORRECTIONS.length; j++) {
      var fix = KICKOFF_CORRECTIONS[j]
      if (fix.club && fix.club !== wanted) continue
      if (fix.competitionKind && event.competitionKind !== fix.competitionKind) continue
      if (foldName(event.opponent) !== fix.opponent) continue
      if (fix.notBefore && event.kickoffMs && event.kickoffMs < parseLocalDateTime(fix.notBefore + " 00:00:00")) continue
      var nextKickoff = parseLocalDateTime(fix.kickoff)
      if (nextKickoff !== null) event.kickoffMs = nextKickoff
      if (fix.venue) event.venue = fix.venue
    }
  }
  return list
}

function parseBundle(bundle, nowMs) {
  var snapshot = emptySnapshot()
  if (!bundle || typeof bundle !== "object") {
    snapshot.error = "empty bundle"
    return snapshot
  }
  var club = clubById(bundle.club)
  snapshot.club = club.id
  snapshot.section = bundle.section || SECTION_FOOTBALL_MEN
  snapshot.source = bundle.source || ""
  snapshot.sourceLabel = bundle.sourceLabel || bundle.source || ""
  snapshot.fetchedAt = nowMs
  if (bundle.ok === false) {
    snapshot.error = bundle.error || "fetch failed"
    return snapshot
  }
  var payloads = bundle.payloads || {}
  var events = []
  if (payloads.matches) events = events.concat(parseLkslodzMatches(payloads.matches, nowMs, club))
  if (payloads.next || payloads.last || payloads.cup) events = events.concat(parseSportsDbEvents(payloads, nowMs, club))
  if (payloads.ekstraklasa) events = events.concat(parseListedEvents(payloads.ekstraklasa, club, nowMs, "ekstraklasa"))
  if (payloads.drugaliga) events = events.concat(parseListedEvents(payloads.drugaliga, club, nowMs, "drugaliga"))
  snapshot.events = dedupeEvents(events)
  snapshot.table = parseClubTable(payloads.table, club)
  if (!snapshot.table.length && payloads.drugaliga && payloads.drugaliga.table)
    snapshot.table = parseClubTable(payloads.drugaliga.table, club)
  if (!snapshot.table.length) snapshot.table = parseSportsDbTable(payloads.table, club)
  snapshot.events = applyLeagueSchedule(snapshot.events, parseLigaFixtures(payloads.liga, club))
  snapshot.events = applyKickoffCorrections(snapshot.events, club.id)
  snapshot.ok = snapshot.events.length > 0 || snapshot.table.length > 0
  if (!snapshot.ok) snapshot.error = bundle.error || "no events"
  return snapshot
}

function nickSnapshot(data) {
  var events = data.events || []
  for (var i = 0; i < events.length; i++) {
    var event = events[i]
    if (!event) continue
    event.home = displayName(event.home)
    event.away = displayName(event.away)
    event.opponent = event.isHome ? event.away : event.home
  }
  var table = data.table || []
  for (var j = 0; j < table.length; j++) {
    if (table[j]) table[j].name = displayName(table[j].name)
  }
  return data
}

function parseCache(raw, nowMs) {
  try {
    var data = JSON.parse(String(raw || ""))
    if (!data || typeof data !== "object") return emptySnapshot()
    if (data.events || data.table) {
      data.club = resolveClubId(data.club)
      data.events = applyKickoffCorrections(data.events || [], data.club)
      data.ok = !!(data.events && data.events.length) || !!(data.table && data.table.length)
      return nickSnapshot(data)
    }
    return parseBundle(data, nowMs || Date.now())
  } catch (e) {
    return emptySnapshot()
  }
}

function includeEvent(event, includeFriendlies) {
  if (!event) return false
  if (!includeFriendlies && event.competitionKind === "friendly") return false
  return true
}

function pickNext(events, nowMs, includeFriendlies) {
  var list = events || []
  var live = null
  var next = null
  for (var i = 0; i < list.length; i++) {
    var event = list[i]
    if (!includeEvent(event, includeFriendlies)) continue
    if (event.status === "cancelled" || event.status === "postponed") continue
    if (event.status === "live") {
      if (!live || event.kickoffMs < live.kickoffMs) live = event
      continue
    }
    if (event.status === "scheduled" && event.kickoffMs >= startOfDay(nowMs)) {
      if (!next || event.kickoffMs < next.kickoffMs) next = event
    }
  }
  return live || next
}

function pickNextCup(events, nowMs) {
  var list = events || []
  var live = null
  var next = null
  for (var i = 0; i < list.length; i++) {
    var event = list[i]
    if (!event || event.competitionKind !== "cup") continue
    if (event.status === "cancelled" || event.status === "postponed") continue
    if (event.status === "live") {
      if (!live || event.kickoffMs < live.kickoffMs) live = event
      continue
    }
    if (event.status === "scheduled" && event.kickoffMs >= startOfDay(nowMs)) {
      if (!next || event.kickoffMs < next.kickoffMs) next = event
    }
  }
  return live || next
}

function pickLast(events, nowMs, includeFriendlies) {
  var list = events || []
  var last = null
  for (var i = 0; i < list.length; i++) {
    var event = list[i]
    if (!includeEvent(event, includeFriendlies)) continue
    if (event.status !== "finished") continue
    if (event.kickoffMs > nowMs) continue
    if (!last || event.kickoffMs > last.kickoffMs) last = event
  }
  return last
}

function upcomingEvents(events, nowMs, includeFriendlies, limit) {
  var next = pickNext(events, nowMs, includeFriendlies)
  var list = events || []
  var out = []
  var seen = {}
  if (next) {
    out.push(next)
    seen[next.id] = true
  }
  var rest = []
  for (var i = 0; i < list.length; i++) {
    var event = list[i]
    if (!includeEvent(event, includeFriendlies)) continue
    if (event.status !== "scheduled") continue
    if (seen[event.id]) continue
    if (event.kickoffMs < startOfDay(nowMs)) continue
    rest.push(event)
  }
  rest.sort(function(a, b) { return a.kickoffMs - b.kickoffMs })
  for (var j = 0; j < rest.length && out.length < (limit || 5); j++) out.push(rest[j])
  return out
}

function ourStanding(table) {
  var list = table || []
  for (var i = 0; i < list.length; i++) if (list[i].isUs) return list[i]
  return null
}

function tableWindow(table, radius) {
  var list = table || []
  var idx = -1
  for (var i = 0; i < list.length; i++) if (list[i].isUs) idx = i
  if (idx < 0) return list.slice(0, Math.min(5, list.length))
  var span = radius === undefined ? 2 : radius
  var start = Math.max(0, idx - span)
  var end = Math.min(list.length, idx + span + 1)
  return list.slice(start, end)
}

function pad2(n) {
  return n < 10 ? "0" + n : String(n)
}

function formatClock(ms) {
  var d = new Date(ms)
  return pad2(d.getHours()) + ":" + pad2(d.getMinutes())
}

function formatDayMonth(ms) {
  var d = new Date(ms)
  return pad2(d.getDate()) + "." + pad2(d.getMonth() + 1)
}

function isSameDay(a, b) {
  var da = new Date(a)
  var db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

function formatWhen(ms, nowMs, lang) {
  if (!ms) return ""
  var strings = pack(lang)
  if (isSameDay(ms, nowMs)) return t(lang, "today") + " " + formatClock(ms)
  if (isSameDay(ms, nowMs + 24 * 60 * 60 * 1000)) return t(lang, "tomorrow") + " " + formatClock(ms)
  if (ms - nowMs < 7 * 24 * 60 * 60 * 1000 && ms >= startOfDay(nowMs))
    return strings.weekdaysShort[new Date(ms).getDay()] + " " + formatClock(ms)
  return formatDayMonth(ms)
}

function formatWhenLong(ms, lang) {
  if (!ms) return ""
  var d = new Date(ms)
  return pack(lang).weekdaysLong[d.getDay()] + " " + formatDayMonth(ms) + " · " + formatClock(ms)
}

function scoreline(event) {
  if (!event || event.homeScore === null || event.awayScore === null) return "–"
  return event.homeScore + "–" + event.awayScore
}

function resultForUs(event) {
  if (!event || event.homeScore === null || event.awayScore === null) return ""
  var us = event.isHome ? event.homeScore : event.awayScore
  var them = event.isHome ? event.awayScore : event.homeScore
  if (us > them) return "W"
  if (us < them) return "L"
  return "R"
}

function barLabel(snapshot, nowMs, includeFriendlies, lang, club) {
  club = club || clubById(snapshot && snapshot.club)
  var next = pickNext(snapshot && snapshot.events, nowMs, includeFriendlies)
  if (!next) return club.code
  if (next.status === "live") return scoreline(next) + " " + shortName(next.opponent, club)
  return "vs " + shortName(next.opponent, club) + " · " + formatWhen(next.kickoffMs, nowMs, lang)
}

function barLabelVertical(snapshot, nowMs, includeFriendlies, club) {
  club = club || clubById(snapshot && snapshot.club)
  var next = pickNext(snapshot && snapshot.events, nowMs, includeFriendlies)
  if (!next) return club.code
  if (next.status === "live") return club.code + "\n" + scoreline(next)
  if (isSameDay(next.kickoffMs, nowMs)) return club.code + "\n" + formatClock(next.kickoffMs)
  return club.code + "\n" + formatDayMonth(next.kickoffMs)
}

function venueLine(event, lang) {
  if (!event) return ""
  return event.isHome ? t(lang, "home") : t(lang, "away")
}

function venueMark(event, lang) {
  if (!event) return ""
  return event.isHome ? t(lang, "homeMark") : t(lang, "awayMark")
}

function displayCompetition(name, lang) {
  var folded = foldName(name)
  if (/puchar|polish cup/.test(folded)) return lang === "en" ? "Polish Cup" : "Puchar Polski"
  if (/europa league|liga europy/.test(folded)) return lang === "en" ? "Europa League" : "Liga Europy"
  if (/champions|liga mistrz/.test(folded)) return lang === "en" ? "Champions League" : "Liga Mistrzów"
  if (/conference|liga konferencji/.test(folded)) return lang === "en" ? "Conference League" : "Liga Konferencji"
  return name || ""
}

function upcomingCompetition(event, club) {
  if (!event) return ""
  var folded = foldName(event.competition)
  if (/champions|liga mistrz/.test(folded)) return "LM"
  if (/europa league|liga europy/.test(folded)) return "LE"
  if (/conference|liga konferencji/.test(folded)) return "LKE"
  if (event.competitionKind === "cup" || /puchar|polish cup/.test(folded)) return "PP"
  if (event.competitionKind === "europe") return "UEFA"
  return (club && club.leagueCode) || "1L"
}

function upcomingLine(event, lang, club) {
  if (!event) return ""
  var d = new Date(event.kickoffMs)
  var when = pad2(d.getDate()) + "." + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes())
  var comp = upcomingCompetition(event, club)
  var venue = venueMark(event, lang)
  return when + "   " + comp + "  " + venue + "  " + event.opponent
}

function displayRound(event, lang) {
  if (!event || !event.round) return ""
  if (event.competitionKind === "cup") {
    var n = parseInt(event.round, 10)
    if (n === 64) return lang === "pl" ? "1. runda" : "1st round"
    if (n === 32) return lang === "pl" ? "1/16 finału" : "round of 32"
    if (n === 16) return lang === "pl" ? "1/8 finału" : "round of 16"
    if (n === 8) return lang === "pl" ? "ćwierćfinał" : "quarter-final"
    if (n === 4) return lang === "pl" ? "półfinał" : "semi-final"
    if (n === 2) return lang === "pl" ? "finał" : "final"
    return t(lang, "round") + " " + event.round
  }
  return t(lang, "matchday") + " " + event.round
}

function competitionLine(event, lang) {
  if (!event) return ""
  var bits = []
  var competition = displayCompetition(event.competition, lang)
  if (competition) bits.push(competition)
  var round = displayRound(event, lang)
  if (round) bits.push(round)
  bits.push(venueLine(event, lang))
  return bits.join(" · ")
}

function ordinal(n, lang) {
  var num = parseInt(n, 10) || 0
  if (lang !== "en") return num + "."
  var v = num % 100
  if (v >= 11 && v <= 13) return num + "th"
  switch (num % 10) {
    case 1: return num + "st"
    case 2: return num + "nd"
    case 3: return num + "rd"
    default: return num + "th"
  }
}

function standingLine(table, lang) {
  var row = ourStanding(table)
  if (!row) return ""
  return ordinal(row.position, lang) + " " + t(lang, "place") + " · " + row.points + " " + t(lang, "pts")
}

function pointsLine(table, lang) {
  var row = ourStanding(table)
  if (!row) return ""
  return row.points + " " + t(lang, "pts")
}

function notifySummary(event, club) {
  var code = (club && club.code) || TEAM_SHORT
  if (!event) return code
  if (event.status === "live" || event.status === "finished")
    return code + " " + scoreline(event) + " " + shortName(event.opponent, club)
  return code + " vs " + event.opponent
}

function notifyBody(event, table, lang) {
  if (!event) return t(lang, "noMatch")
  var bits = [formatWhenLong(event.kickoffMs, lang), competitionLine(event, lang)]
  var tableText = standingLine(table, lang)
  if (tableText) bits.push(tableText)
  return bits.join("\n")
}

function sourceCaption(snapshot, lang) {
  if (!snapshot || !snapshot.sourceLabel) return ""
  return t(lang, "source") + ": " + snapshot.sourceLabel
}

if (typeof module !== "undefined") {
  module.exports = {
    TEAM: TEAM,
    CLUBS: CLUBS,
    clubById: clubById,
    resolveClubId: resolveClubId,
    clubIds: clubIds,
    emptySnapshot: emptySnapshot,
    foldName: foldName,
    displayName: displayName,
    isLksName: isLksName,
    isLksFirstTeam: isLksFirstTeam,
    sideName: sideName,
    shortName: shortName,
    parseScore: parseScore,
    parseLocalDateTime: parseLocalDateTime,
    parseUtcTimestamp: parseUtcTimestamp,
    competitionKind: competitionKind,
    normalizeStatus: normalizeStatus,
    parseLkslodzMatches: parseLkslodzMatches,
    parseLkslodzTable: parseLkslodzTable,
    parseSportsDbEvents: parseSportsDbEvents,
    parseSportsDbTable: parseSportsDbTable,
    parseBundle: parseBundle,
    parseCache: parseCache,
    pickNext: pickNext,
    pickNextCup: pickNextCup,
    pickLast: pickLast,
    upcomingEvents: upcomingEvents,
    ourStanding: ourStanding,
    tableWindow: tableWindow,
    resolveLang: resolveLang,
    t: t,
    otherLang: otherLang,
    formatWhen: formatWhen,
    formatWhenLong: formatWhenLong,
    scoreline: scoreline,
    resultForUs: resultForUs,
    barLabel: barLabel,
    barLabelVertical: barLabelVertical,
    venueMark: venueMark,
    upcomingCompetition: upcomingCompetition,
    upcomingLine: upcomingLine,
    competitionLine: competitionLine,
    ordinal: ordinal,
    standingLine: standingLine,
    pointsLine: pointsLine,
    notifySummary: notifySummary,
    notifyBody: notifyBody,
    sourceCaption: sourceCaption
  }
}
