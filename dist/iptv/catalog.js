// IPTV — catalog module.
// Live TV channels from iptv-org's public free-to-air collection.
// The sandbox calls this export by the exact name `catalog`.

var PLAYLISTS = {
  all: 'index.m3u',
  pk: 'countries/pk.m3u',
  in: 'countries/in.m3u',
  uk: 'countries/uk.m3u',
  us: 'countries/us.m3u',
  'cat:news': 'categories/news.m3u',
  'cat:sports': 'categories/sports.m3u',
  'cat:movies': 'categories/movies.m3u',
  'cat:music': 'categories/music.m3u',
  'cat:kids': 'categories/kids.m3u',
  'cat:entertainment': 'categories/entertainment.m3u',
  'cat:documentary': 'categories/documentary.m3u'
};

async function catalog(args) {
  return [
    { title: 'All Channels', filter: 'all' },
    { title: 'Pakistan', filter: 'pk' },
    { title: 'India', filter: 'in' },
    { title: 'United Kingdom', filter: 'uk' },
    { title: 'United States', filter: 'us' },
    { title: 'News', filter: 'cat:news' },
    { title: 'Sports', filter: 'cat:sports' },
    { title: 'Movies', filter: 'cat:movies' },
    { title: 'Music', filter: 'cat:music' },
    { title: 'Kids', filter: 'cat:kids' },
    { title: 'Entertainment', filter: 'cat:entertainment' },
    { title: 'Documentary', filter: 'cat:documentary' }
  ];
}

// CommonJS exports for the unictoos sandbox (exact export names matter).
if (typeof module !== 'undefined' && module.exports) {
  module.exports.catalog = catalog;
  module.exports.getCatalog = catalog;
}
