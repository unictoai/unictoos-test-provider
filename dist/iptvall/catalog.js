// IPTV All — catalog module.
// The full iptv-org free-to-air list (index.m3u) as one unfiltered list — every channel, no country/category split.
// The sandbox calls this export by the exact name `catalog`.

var PLAYLISTS = {
  all: 'index.m3u'
};

async function catalog(args) {
  return [
    { title: 'All Channels', filter: 'all' }
  ];
}

// CommonJS exports for the unictoos sandbox (exact export names matter).
if (typeof module !== 'undefined' && module.exports) {
  module.exports.catalog = catalog;
  module.exports.getCatalog = catalog;
}
