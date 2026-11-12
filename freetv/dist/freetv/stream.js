// Free TV — stream module.
// Hands the channel's direct HLS URL to the player.
// Sandbox calls: getStream({link, type, provider, providerValue})

async function getStream(args) {
  var url = String((args && args.link) || '').trim();
  if (!/^https?:\/\//i.test(url)) return [];
  return [
    {
      link: url,
      type: 'hls',
      quality: 'Live',
      server: 'Free TV'
    }
  ];
}

// CommonJS exports for the unictoos sandbox (exact export names matter).
if (typeof module !== 'undefined' && module.exports) {
  module.exports.getStream = getStream;
}
