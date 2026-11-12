# Free TV — Vega live provider for unictoos

Built by `generate_freetv_provider.py` from the Free-TV/IPTV
master playlist (https://github.com/Free-TV/IPTV — free-only
philosophy: only channels officially provided for free).

## Install in unictoos

Addons tab → + (Zenda sheet) → paste this manifest URL:

  https://raw.githubusercontent.com/unictoai/unictoos-test-provider/main/freetv/manifest.json

It installs as a Vega provider named "Free TV" (value `freetv`,
type `live`), so its catalogs appear in the Live TV tab.

## What is inside

Channel data is embedded in the modules at build time — the app
has no M3U parser and the modules fetch nothing at runtime.
Every shipped URL answered HTTP 200 with an HLS playlist
(`#EXTM3U`) when probed from the build sandbox; http:// URLs
were upgraded to https:// where the https endpoint answered
(the app drops http:// streams).

Catalogs (small first — the Live TV tab loads them in order):

- World News (`verified`): 7 channels
- News (`news`): 31 channels
- India (`in`): 7 channels
- United Kingdom (`uk`): 30 channels
- United States (`us`): 22 channels
- All Channels (`all`): 985 channels

## Honest limits

- Sandbox-verified only. Each URL was checked from the build
  sandbox, NOT from Pakistan. A channel may be geo-blocked or
  dead on a Pakistani IP — only a phone test confirms it.
- Free-TV carries NO Pakistan channels (no Pakistan group, no
  per-country Pakistan file). The Pakistan list still comes
  from the existing IPTV provider (iptv-org).
- URLs rotate and die. Re-run the generator to refresh; the
  probe drops anything that stops answering.
- The seed "World News" list is official broadcaster HLS
  (Al Jazeera, France 24, DW, CBS News, Sky News Arabia,
  NDTV 24x7, India Today) — checked from the sandbox, not
  from Pakistan.
