// Free TV — catalog module.
// Live TV channels from the Free-TV/IPTV free-to-air collection,
// parsed and probe-checked at build time (see README.md).
// The sandbox calls this export by the exact name `catalog`.

var CATALOGS = [{"title":"World News","filter":"verified"},{"title":"News","filter":"news"},{"title":"India","filter":"in"},{"title":"United Kingdom","filter":"uk"},{"title":"United States","filter":"us"},{"title":"All Channels","filter":"all"}];

async function catalog(args) {
  return CATALOGS;
}

// CommonJS exports for the unictoos sandbox (exact export names matter).
if (typeof module !== 'undefined' && module.exports) {
  module.exports.catalog = catalog;
  module.exports.getCatalog = catalog;
}
