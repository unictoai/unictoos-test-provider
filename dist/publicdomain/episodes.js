// Public Domain Movies — episodes module.
// Films have no episodes; return empty.
async function getEpisodes(args) {
  return [];
}

// CommonJS exports for the unictoos sandbox
if (typeof module !== 'undefined' && module.exports) {
  module.exports.getEpisodes = getEpisodes;
}
