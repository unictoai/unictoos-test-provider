# Free TV — Vega live provider for unictoos

Built by `generate_freetv_provider.py` from three free lists:
- Free-TV/IPTV master playlist (https://github.com/Free-TV/IPTV
  — free-only philosophy: only channels officially provided
  for free)
- iptv-org Pakistan country playlist
  (https://iptv-org.github.io/iptv/countries/pk.m3u)
- iptv-org India country playlist
  (https://iptv-org.github.io/iptv/countries/in.m3u)

## Install in unictoos

Addons tab → + (Zenda sheet) → paste this manifest URL:

  https://raw.githubusercontent.com/unictoai/unictoos-test-provider/main/freetv/manifest.json

It installs as a Vega provider named "Free TV" (value `freetv`,
type `live`), so its catalogs appear in the Live TV tab.

## Updating to a new version

The app caches the provider's modules at install time and has
no update path: installing over an existing Free TV throws
"Free TV is already installed." To get a new version, REMOVE
Free TV in the Addons tab first, then install it again from
the same manifest URL.

## What is inside

Channel data is embedded in the modules at build time — the app
has no M3U parser and the modules fetch nothing at runtime.
Every shipped URL answered HTTP 200 with an HLS playlist
(`#EXTM3U`) when probed from the build sandbox; http:// URLs
were upgraded to https:// where the https endpoint answered
(the app drops http:// streams). A URL that failed only with a
connection error (code 000) got one plain-GET retry, because
some small hosts refuse concurrent Range requests.

All non-Islamic religious channels (every faith) and all
non-Islamic Indian channels are REMOVED by the hand-reviewed
sets in removal_sets_v120.json (634 removed in this build).
Islamic religious channels are KEPT, even Indian ones
(Peace TV Bangla, Peace TV Urdu, Zainabia Channel, Huda TV,
Alabbassia TV, Madani Channel Urdu). Pakistan channels stay.

Catalogs (small first — the Live TV tab loads them in order):

- World News (`verified`): 5 channels
- News (`news`): 30 channels
- Pakistan (`pk`): 23 channels
- India (`in`): 2 channels
- United Kingdom (`uk`): 30 channels
- United States (`us`): 22 channels
- All Channels (`all`): 988 channels

## Honest limits

- Sandbox-verified only. Each URL was checked from the build
  sandbox, NOT from Pakistan. A channel may be geo-blocked or
  dead on a Pakistani IP — only a phone test confirms it.
- The Live TV bridge pages 20 channels at a time and stops at
  50 pages, so the "All Channels" catalog shows only its
  first 1,000 rows in the list. Search still scans the whole
  catalog, and every country catalog fits well under the cap.
- URLs rotate and die. Re-run the generator to refresh; the
  probe drops anything that stops answering.
- The seed "World News" list is official broadcaster HLS
  (Al Jazeera, France 24, DW, CBS News, Sky News Arabia) —
  checked from the sandbox, not from Pakistan. NDTV 24x7 and
  India Today were seeds in v1.0.0/v1.1.0 and were removed in
  v1.2.0 (both are Indian channels).
