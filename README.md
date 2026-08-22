# ŁKS and friends — Omarchy plugin

Bar widget for [ŁKS Łódź](https://lkslodz.pl/) and the friendly clubs: Lech Poznań, GKS Tychy, and Zawisza Bydgoszcz. Men's first football: next match, last result, upcoming fixtures, and the league table. Switch club and language from the panel header.

Plugin id: `kjk.lks`

## Install

Needs [Omarchy](https://omarchy.org/) with a running `omarchy-shell`, plus `python3` on `PATH` (already present on a normal Omarchy install).

```bash
omarchy plugin add https://github.com/mobilekjk-coder/omarchy-lks.git --enable
```

That clones the plugin into `~/.config/omarchy/plugins/kjk.lks/` and puts the widget on the center of the bar. Move it if you want:

```bash
omarchy bar move kjk.lks --after omarchy.weather
```

Left click opens the panel. Middle click refreshes. Right click sends a desktop notification for the next match.

Update later with:

```bash
omarchy plugin update kjk.lks
```

## Remove

```bash
omarchy plugin remove kjk.lks
```

That disables the widget and deletes the checkout. Cached fixtures in `~/.local/state/omarchy/kjk.lks/` are left behind; delete that directory if you want them gone too. The plugin does not rewrite other Omarchy config except its own bar-layout entry.

## Settings

Set these on the bar entry (Setup, or `omarchy bar set`):

| Key | Default | Meaning |
|---|---|---|
| `source` | `auto` | `auto`, `lkslodz`, or `thesportsdb` |
| `language` | `auto` | `auto` (desktop locale), `pl`, or `en` |
| `club` | `lks` | `lks`, `lech`, `tychy`, or `zawisza` |
| `section` | `football-men` | Only men's first football is implemented so far |
| `refreshMinutes` | `15` | How often to refetch fixtures (live scores poll faster when a match is on) |

```bash
omarchy bar set kjk.lks source thesportsdb
omarchy bar set kjk.lks language pl
omarchy bar set kjk.lks club lech
omarchy bar set kjk.lks refreshMinutes 10
```

Hover the word **Mezdim** in the panel to play [Hava Nagila](https://commons.wikimedia.org/wiki/File:Hava_nagila.ogg) in full (`mezdim.ogg`). Move the pointer away and it fades out. That recording is public domain (Abraham Zevi Idelsohn, 1915, via Wikimedia Commons).

The panel, bar label, and notifications follow that language. `auto` uses Polish when the desktop locale is Polish, otherwise English. Tap **PL** / **EN** in the panel header to switch. Tap **ŁKS · LECH · TYSCY · ZETKA** to switch club.

`auto` picks sources per club:

- ŁKS — [lkslodz.pl](https://lkslodz.pl/) + [1liga.org](https://www.1liga.org/lks) + [TheSportsDB](https://www.thesportsdb.com/)
- Lech — [lechpoznan.pl](https://www.lechpoznan.pl/terminarz/) + [ekstraklasa.org](https://ekstraklasa.org/kluby/lech-poznan/) + TheSportsDB
- GKS Tychy and Zawisza — [drugaliga.org](https://www.drugaliga.org/) + TheSportsDB
- ŁKS, Tychy, and Zawisza — [TVP Sport transmissions](https://sport.tvp.pl/transmisje) when a stream is listed
- Optional live scores — [API-Football](https://www.api-football.com/) when a free key is present

## Live scores

Fixture lists still come from the club sites. Live minutes and scores come from API-Football’s free plan (100 requests/day, no card).

1. Register at [dashboard.api-football.com](https://dashboard.api-football.com/register) (same account as [api-sports.io](https://api-sports.io/))
2. Copy the API key
3. Save it as one line:

```bash
mkdir -p ~/.local/state/omarchy/kjk.lks
printf '%s\n' 'YOUR_KEY' > ~/.local/state/omarchy/kjk.lks/api-football.key
```

You can also export `APIFOOTBALL_KEY` or `API_FOOTBALL_KEY`. Without a key the widget keeps working; it just will not update scores during a match. After saving the key, restart the shell (`omarchy restart shell`) or middle-click the bar widget.

The key is cached for team IDs and fixtures for three hours. While the selected club is actually playing, the widget polls about every 90 seconds so a 90-minute match stays inside the free daily limit.

## Data sources

Public JSON needs no key:

- [lkslodz.pl](https://lkslodz.pl/) — official `/wp-json/lks/v1/matches` and `/league-table`
- [ekstraklasa.org](https://ekstraklasa.org/) — Lech league calendar
- [drugaliga.org](https://www.drugaliga.org/) — GKS Tychy and Zawisza calendar and table
- [TheSportsDB](https://www.thesportsdb.com/) — documented free API (cups and Europe)
- [API-Football](https://www.api-football.com/) — optional live scores when `~/.local/state/omarchy/kjk.lks/api-football.key` is set

Kickoff times from Polish sites are treated as Europe/Warsaw, then shown in your desktop timezone. Results and tables come from those sites; this plugin is unofficial and not affiliated with the clubs.

Other club sections (volleyball, basketball, and so on) are not wired yet. The fetch layer is built so a new section is another source entry plus a parser.

## License

MIT. See [LICENSE](LICENSE).
