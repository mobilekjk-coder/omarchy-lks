# ŁKS — Omarchy plugin

Bar widget for [ŁKS Łódź](https://lkslodz.pl/). The first version tracks the men's first football team: next match, last result, upcoming fixtures, and the I liga table.

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
| `section` | `football-men` | Only men's first football is implemented so far |
| `refreshMinutes` | `15` | How often to refetch |

```bash
omarchy bar set kjk.lks source thesportsdb
omarchy bar set kjk.lks refreshMinutes 10
```

`auto` asks the official club API first and falls back to TheSportsDB if that fails.

## Data sources

No API key. The widget only reads public JSON:

- [lkslodz.pl](https://lkslodz.pl/) — official `/wp-json/lks/v1/matches` and `/league-table`
- [TheSportsDB](https://www.thesportsdb.com/) — documented free API, team id `137112`

Kickoff times from the club site are treated as Europe/Warsaw, then shown in your desktop timezone. Results and tables come from those sites; this plugin is unofficial and not affiliated with ŁKS Łódź.

Other club sections (volleyball, basketball, and so on) are not wired yet. The fetch layer is built so a new section is another source entry plus a parser.

## License

MIT. See [LICENSE](LICENSE).
