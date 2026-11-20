# Sunset Cover Studio

[![make.fun competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun rank](https://make.fun/badge/gta6-cover-art-01/xingxing717/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![make.fun reward](https://make.fun/badge/gta6-cover-art-01/xingxing717/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A GTA-style cover art maker for the [make.fun gta6-cover-art-01 bounty](https://make.fun/bounty/gta6-cover-art-01): turn your own photo and a caption into a multi-panel poster cover with a Vice City sunset / neon colour grade, and export it as a PNG in 1080×1080, 1080×1350 or 1920×1080.

## What it does

- **Any photo** — load photos from your machine (FileReader, never uploaded), or try the two built-in AI-generated sample portraits. Crop and position each photo by dragging inside its panel and scrolling to zoom.
- **Multi-panel poster look** — five layouts (Hero split, Triptych, Four squares, Duo, Single frame). Fill several panels with one photo or several.
- **Bold caption lettering** — big gradient caption in Anton with a synthwave sun behind it, plus a letterspaced subline. Both editable, caption size adjustable.
- **Colour grades** — Sunset, Neon night, Golden hour and Coast dusk, drawn over your photos as canvas overlays.
- **Fast and easy** — photo → cover → PNG in a few clicks, in the three common post sizes.

## Run it

Static files, no build step, no network. Serve `app/` with any static server and open `app/index.html` in desktop Chrome:

```sh
node serve.ts   # serves app/ at http://localhost:8080
```

## Originality

An original design. No Rockstar Games logo, wordmark, official artwork, character or font is used. Display type is Anton and Archivo Black, both under the SIL Open Font License (see `app/fonts/OFL.txt`). The sample photos are AI-generated fictional people.

## Layout

- `app/` — the web app (`index.html`, `style.css`, `src/cover.js` renderer, `src/main.js` editor UI, `fonts/`, `assets/` sample photos)
- `screenshots/` — screenshots of the app and covers it exported
- `main.ts` — entrypoint: copies `app/` and `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
