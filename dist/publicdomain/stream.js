// Public Domain Movies — stream module.
// Resolves a direct MP4 URL from archive.org metadata.

async function getStream(args) {
  var id = args.link;
  try {
    var res = await fetch('https://archive.org/metadata/' + encodeURIComponent(id));
    var data = await res.json();
    var files = data.files || [];
    // Find the best MP4 file
    var mp4 = null;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (f.name && /\.mp4$/i.test(f.name) && f.size) {
        if (!mp4 || parseInt(f.size, 10) > parseInt(mp4.size, 10)) {
          mp4 = f;
        }
      }
    }
    if (!mp4) {
      // Fall back to any video file
      for (var j = 0; j < files.length; j++) {
        var g = files[j];
        if (g.name && /\.(ogv|webm|mkv)$/i.test(g.name)) {
          mp4 = g;
          break;
        }
      }
    }
    if (!mp4) return [];
    var url = 'https://archive.org/download/' + encodeURIComponent(id) + '/' + encodeURIComponent(mp4.name);
    return [
      {
        server: 'Internet Archive',
        link: url,
        type: 'direct',
        quality: 'auto',
      },
    ];
  } catch (e) {
    return [];
  }
}
