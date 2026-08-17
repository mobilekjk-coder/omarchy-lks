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

var WEEKDAYS_PL = ["nd.", "pn.", "wt.", "śr.", "cz.", "pt.", "sb."]

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
  "lks lodz": TEAM_SHORT,
  "lks": TEAM_SHORT
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

function isLksName(value) {
  var compact = compactName(value)
  return compact === "lks" || compact === "lkslodz" || compact.indexOf("lkslodz") === 0
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

function isLksSide(side, name) {
  if (isLksName(name)) return true
  var slug = logoSlug(side && side.logo)
  return slug.indexOf("lks-lodz") !== -1 || slug === "lks_lodz"
}

function shortName(value) {
  if (isLksName(value)) return TEAM_SHORT
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
  if (/puchar|cup/.test(folded)) return "cup"
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
  var home = fields.home || ""
  var away = fields.away || ""
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

function parseLkslodzMatches(raw, nowMs) {
  var payload = raw && raw.data ? raw.data : raw
  if (!Array.isArray(payload)) return []
  var events = []
  for (var i = 0; i < payload.length; i++) {
    var row = payload[i] || {}
    var home = sideName(row.home)
    var away = sideName(row.away)
    var homeIsUs = isLksSide(row.home, home)
    var awayIsUs = isLksSide(row.away, away)
    if (homeIsUs) home = TEAM
    if (awayIsUs) away = TEAM
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

function parseLkslodzTable(raw) {
  var payload = raw && raw.data ? raw.data : raw
  if (!Array.isArray(payload)) return []
  var table = []
  for (var i = 0; i < payload.length; i++) {
    var row = payload[i] || {}
    var goals = String(row.goals || "").split(":")
    table.push({
      position: parseInt(row.position, 10) || (i + 1),
      name: row.name || "",
      played: parseInt(row.played, 10) || 0,
      wins: parseInt(row.wins, 10) || 0,
      draws: parseInt(row.draws, 10) || 0,
      losses: parseInt(row.losses, 10) || 0,
      goalsFor: parseInt(goals[0], 10) || 0,
      goalsAgainst: parseInt(goals[1], 10) || 0,
      points: parseInt(row.points, 10) || 0,
      status: row.status || "",
      isUs: isLksName(row.name)
    })
  }
  return table
}

function parseSportsDbEvent(row, sourceKey, nowMs) {
  if (!row) return null
  var home = row.strHomeTeam || ""
  var away = row.strAwayTeam || ""
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
    home: isLksName(home) ? TEAM : home,
    away: isLksName(away) ? TEAM : away,
    homeScore: homeScore,
    awayScore: awayScore,
    status: normalizeStatus(row.strStatus, homeScore, awayScore, kickoffMs, nowMs),
    venue: row.strVenue || "",
    isHome: String(row.idHomeTeam) === "137112" || isLksName(home)
  })
}

function parseSportsDbEvents(payloads, nowMs) {
  var events = []
  var next = payloads && payloads.next && payloads.next.events ? payloads.next.events : []
  var last = payloads && payloads.last && payloads.last.results ? payloads.last.results : []
  var i
  for (i = 0; i < next.length; i++) {
    var upcoming = parseSportsDbEvent(next[i], "next" + i, nowMs)
    if (upcoming) events.push(upcoming)
  }
  for (i = 0; i < last.length; i++) {
    var previous = parseSportsDbEvent(last[i], "last" + i, nowMs)
    if (previous) events.push(previous)
  }
  return dedupeEvents(events)
}

function parseSportsDbTable(raw) {
  var payload = raw && raw.table ? raw.table : raw
  if (!Array.isArray(payload)) return []
  var table = []
  for (var i = 0; i < payload.length; i++) {
    var row = payload[i] || {}
    table.push({
      position: parseInt(row.intRank, 10) || (i + 1),
      name: row.strTeam || "",
      played: parseInt(row.intPlayed, 10) || 0,
      wins: parseInt(row.intWin, 10) || 0,
      draws: parseInt(row.intDraw, 10) || 0,
      losses: parseInt(row.intLoss, 10) || 0,
      goalsFor: parseInt(row.intGoalsFor, 10) || 0,
      goalsAgainst: parseInt(row.intGoalsAgainst, 10) || 0,
      points: parseInt(row.intPoints, 10) || 0,
      status: row.strDescription || "",
      isUs: String(row.idTeam) === "137112" || isLksName(row.strTeam)
    })
  }
  return table
}

function parseBundle(bundle, nowMs) {
  var snapshot = emptySnapshot()
  if (!bundle || typeof bundle !== "object") {
    snapshot.error = "empty bundle"
    return snapshot
  }
  snapshot.section = bundle.section || SECTION_FOOTBALL_MEN
  snapshot.source = bundle.source || ""
  snapshot.sourceLabel = bundle.sourceLabel || bundle.source || ""
  snapshot.fetchedAt = nowMs
  if (bundle.ok === false) {
    snapshot.error = bundle.error || "fetch failed"
    return snapshot
  }
  var payloads = bundle.payloads || {}
  if (snapshot.source === "thesportsdb") {
    snapshot.events = parseSportsDbEvents(payloads, nowMs)
    snapshot.table = parseSportsDbTable(payloads.table)
  } else {
    snapshot.events = parseLkslodzMatches(payloads.matches, nowMs)
    snapshot.table = parseLkslodzTable(payloads.table)
  }
  snapshot.ok = snapshot.events.length > 0 || snapshot.table.length > 0
  if (!snapshot.ok) snapshot.error = bundle.error || "no events"
  return snapshot
}

function parseCache(raw, nowMs) {
  try {
    var data = JSON.parse(String(raw || ""))
    if (!data || typeof data !== "object") return emptySnapshot()
    if (data.events || data.table) {
      data.ok = !!(data.events && data.events.length) || !!(data.table && data.table.length)
      return data
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

function formatWhen(ms, nowMs) {
  if (!ms) return ""
  if (isSameDay(ms, nowMs)) return "dziś " + formatClock(ms)
  if (isSameDay(ms, addDays(startOfDay(nowMs), 1))) return "jutro " + formatClock(ms)
  if (ms - nowMs < 7 * 24 * 60 * 60 * 1000 && ms >= startOfDay(nowMs))
    return WEEKDAYS_PL[new Date(ms).getDay()] + " " + formatClock(ms)
  return formatDayMonth(ms)
}

function formatWhenLong(ms) {
  if (!ms) return ""
  var d = new Date(ms)
  var days = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"]
  return days[d.getDay()] + " " + formatDayMonth(ms) + " · " + formatClock(ms)
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

function barLabel(snapshot, nowMs, includeFriendlies) {
  var next = pickNext(snapshot && snapshot.events, nowMs, includeFriendlies)
  if (!next) return TEAM_SHORT
  if (next.status === "live") return scoreline(next) + " " + shortName(next.opponent)
  return "vs " + shortName(next.opponent) + " · " + formatWhen(next.kickoffMs, nowMs)
}

function barLabelVertical(snapshot, nowMs, includeFriendlies) {
  var next = pickNext(snapshot && snapshot.events, nowMs, includeFriendlies)
  if (!next) return TEAM_SHORT
  if (next.status === "live") return TEAM_SHORT + "\n" + scoreline(next)
  if (isSameDay(next.kickoffMs, nowMs)) return TEAM_SHORT + "\n" + formatClock(next.kickoffMs)
  return TEAM_SHORT + "\n" + formatDayMonth(next.kickoffMs)
}

function venueLine(event) {
  if (!event) return ""
  if (event.isHome) return "u siebie"
  return "wyjazd"
}

function competitionLine(event) {
  if (!event) return ""
  var bits = []
  if (event.competition) bits.push(event.competition)
  if (event.round) bits.push("kolejka " + event.round)
  bits.push(venueLine(event))
  return bits.join(" · ")
}

function standingLine(table) {
  var row = ourStanding(table)
  if (!row) return ""
  return row.position + ". miejsce · " + row.points + " pkt"
}

function notifySummary(event) {
  if (!event) return TEAM_SHORT
  if (event.status === "live" || event.status === "finished")
    return TEAM_SHORT + " " + scoreline(event) + " " + shortName(event.opponent)
  return TEAM_SHORT + " vs " + event.opponent
}

function notifyBody(event, table) {
  if (!event) return "Brak zaplanowanego meczu"
  var bits = [formatWhenLong(event.kickoffMs), competitionLine(event)]
  var tableText = standingLine(table)
  if (tableText) bits.push(tableText)
  return bits.join("\n")
}

function sourceCaption(snapshot) {
  if (!snapshot || !snapshot.sourceLabel) return ""
  return "Źródło: " + snapshot.sourceLabel
}

if (typeof module !== "undefined") {
  module.exports = {
    TEAM: TEAM,
    emptySnapshot: emptySnapshot,
    foldName: foldName,
    isLksName: isLksName,
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
    pickLast: pickLast,
    upcomingEvents: upcomingEvents,
    ourStanding: ourStanding,
    tableWindow: tableWindow,
    formatWhen: formatWhen,
    formatWhenLong: formatWhenLong,
    scoreline: scoreline,
    resultForUs: resultForUs,
    barLabel: barLabel,
    barLabelVertical: barLabelVertical,
    competitionLine: competitionLine,
    standingLine: standingLine,
    notifySummary: notifySummary,
    notifyBody: notifyBody,
    sourceCaption: sourceCaption
  }
}
