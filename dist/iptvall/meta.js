// IPTV All — meta module.
// Resolves a channel link (iptvall|<filter>|<index>) back to its details.
// Sandbox calls: getMeta({link, provider})

var BASE = 'https://iptv-org.github.io/iptv/';

var PLAYLISTS = {
  all: 'index.m3u'
};

var playlistCache = {};

function parseExtInf(line) {
  var info = { name: '', logo: '', group: '' };
  var attrRe = /([A-Za-z0-9_-]+)="([^"]*)"/g;
  var m, lastEnd = 0;
  while ((m = attrRe.exec(line)) !== null) {
    lastEnd = m.index + m[0].length;
    var k = m[1].toLowerCase();
    if (k === 'tvg-logo') info.logo = m[2];
    else if (k === 'group-title') info.group = m[2];
  }
  var rest = line.slice(lastEnd);
  var ci = rest.indexOf(',');
  info.name = (ci >= 0 ? rest.slice(ci + 1) : rest).trim();
  return info;
}

function parseM3U(text) {
  var channels = [];
  var lines = String(text || '').split('\n');
  var pending = null;
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    if (line.indexOf('#EXTINF') === 0) {
      pending = parseExtInf(line);
    } else if (pending && line.charAt(0) !== '#') {
      if (/^https?:\/\//i.test(line)) {
        channels.push({
          index: channels.length,
          name: pending.name || 'Untitled Channel',
          logo: pending.logo || '',
          group: pending.group || '',
          url: line
        });
      }
      pending = null;
    }
  }
  return channels;
}

async function loadPlaylist(filter) {
  var key = PLAYLISTS.hasOwnProperty(filter) ? filter : 'all';
  if (playlistCache[key]) return playlistCache[key];
  var res = await fetch(BASE + PLAYLISTS[key]);
  if (!res.ok) throw new Error('Playlist fetch failed: HTTP ' + res.status);
  var channels = parseM3U(await res.text());
  playlistCache[key] = channels;
  return channels;
}

async function getMeta(args) {
  var parts = String((args && args.link) || '').split('|');
  if (parts.length !== 3 || parts[0] !== 'iptvall') return {};
  var channels = await loadPlaylist(parts[1]);
  var ch = channels[parseInt(parts[2], 10)];
  if (!ch) return {};
  return {
    title: ch.name,
    image: ch.logo,
    synopsis: 'Live TV' + (ch.group ? ' · ' + ch.group : ''),
    type: 'tv',
    linkList: [
      {
        title: 'Live',
        directLinks: [
          { title: ch.name + ' (Live)', link: ch.url, type: 'tv' }
        ]
      }
    ]
  };
}

// CommonJS exports for the unictoos sandbox (exact export names matter).
if (typeof module !== 'undefined' && module.exports) {
  module.exports.getMeta = getMeta;
}
