// Public Domain Movies — meta module.

async function getMeta(args) {
  var id = args.link;
  try {
    var res = await fetch('https://archive.org/metadata/' + encodeURIComponent(id));
    var data = await res.json();
    var meta = data.metadata || {};
    var title = meta.title || id;
    var desc = meta.description || 'A public domain film from Internet Archive.';
    if (Array.isArray(desc)) desc = desc.join('\n');
    // Strip HTML tags from description
    desc = String(desc).replace(/<[^>]*>/g, '').slice(0, 500);
    return {
      title: String(title),
      description: desc,
      image: 'https://archive.org/services/img/' + id,
      link: id,
    };
  } catch (e) {
    return {
      title: id,
      description: 'A public domain film from Internet Archive.',
      image: 'https://archive.org/services/img/' + id,
      link: id,
    };
  }
}
