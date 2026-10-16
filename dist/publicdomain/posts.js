// Public Domain Movies — posts module.
// Serves public domain films from Internet Archive (archive.org).
// All content here is public domain or Creative Commons licensed.

var API = 'https://archive.org/advancedsearch.php';

// Curated list of well-known public domain films on archive.org.
// Each entry: [identifier, title, year]
var FILMS = [
  ['night_of_the_living_dead', 'Night of the Living Dead', '1968'],
  ['plan_9_from_outer_space_1959', 'Plan 9 from Outer Space', '1959'],
  ['charade_1963', 'Charade', '1963'],
  ['d_o_a_1950', 'D.O.A.', '1950'],
  ['detour_1945', 'Detour', '1945'],
  ['house_on_haunted_hill', 'House on Haunted Hill', '1959'],
  ['the_last_man_on_earth_1964', 'The Last Man on Earth', '1964'],
  ['a_bucket_of_blood_1959', 'A Bucket of Blood', '1959'],
  ['the_terror_1963', 'The Terror', '1963'],
  ['carnival_of_souls_1962', 'Carnival of Souls', '1962'],
  ['suddenly_1954', 'Suddenly', '1954'],
  ['the_stranger_1946', 'The Stranger', '1946'],
];

function toPost(id, title, year) {
  return {
    id: id,
    title: title + ' (' + year + ')',
    link: id,
    image: 'https://archive.org/services/img/' + id,
    tag: 'PD',
  };
}

async function getPosts(args) {
  var page = args.page || 1;
  var perPage = 12;
  var start = (page - 1) * perPage;
  return FILMS.slice(start, start + perPage).map(function (f) {
    return toPost(f[0], f[1], f[2]);
  });
}

async function getSearchPosts(args) {
  var q = (args.searchQuery || '').toLowerCase().trim();
  if (!q) return [];
  return FILMS.filter(function (f) {
    return (f[1] + ' ' + f[2]).toLowerCase().indexOf(q) !== -1;
  }).map(function (f) {
    return toPost(f[0], f[1], f[2]);
  });
}

// CommonJS exports for the unictoos sandbox
if (typeof module !== 'undefined' && module.exports) {
  module.exports.getPosts = getPosts;
  module.exports.getSearchPosts = getSearchPosts;
}
