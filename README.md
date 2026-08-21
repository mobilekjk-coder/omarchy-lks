# ŁKS — Omarchy plugin

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
| `refreshMinutes` | `15` | How often to refetch |

```bash
omarchy bar set kjk.lks source thesportsdb
omarchy bar set kjk.lks language pl
omarchy bar set kjk.lks club lech
omarchy bar set kjk.lks refreshMinutes 10
```

Hover the word **Mezdim** in the panel to play [Hava Nagila](https://commons.wikimedia.org/wiki/File:Hava_nagila.ogg) in full (`mezdim.ogg`). Move the pointer away and it fades out. That recording is public domain (Abraham Zevi Idelsohn, 1915, via Wikimedia Commons).

The panel, bar label, and notifications follow that language. `auto` uses Polish when the desktop locale is Polish, otherwise English. Tap **PL** / **EN** in the panel header to switch. Tap **ŁKS · LECH · TYCHY · ZETKA** to switch club.

`auto` picks sources per club:

- ŁKS — [lkslodz.pl](https://lkslodz.pl/) + [1liga.org](https://www.1liga.org/lks) + [TheSportsDB](https://www.thesportsdb.com/)
- Lech — [ekstraklasa.org](https://ekstraklasa.org/kluby/lech-poznan/) + TheSportsDB (Europa / cup)
- GKS Tychy and Zawisza — [drugaliga.org](https://www.drugaliga.org/) + TheSportsDB

## Data sources

No API key. The widget only reads public JSON:

- [lkslodz.pl](https://lkslodz.pl/) — official `/wp-json/lks/v1/matches` and `/league-table`
- [ekstraklasa.org](https://ekstraklasa.org/) — Lech league calendar
- [drugaliga.org](https://www.drugaliga.org/) — GKS Tychy and Zawisza calendar and table
- [TheSportsDB](https://www.thesportsdb.com/) — documented free API (cups and Europe)

Kickoff times from Polish sites are treated as Europe/Warsaw, then shown in your desktop timezone. Results and tables come from those sites; this plugin is unofficial and not affiliated with the clubs.

Other club sections (volleyball, basketball, and so on) are not wired yet. The fetch layer is built so a new section is another source entry plus a parser.

## Related

A separate project, **Rycerze Wiosny Engine**, is the shared fixture repository this widget and future apps will pull from.

## License

MIT. See [LICENSE](LICENSE).
