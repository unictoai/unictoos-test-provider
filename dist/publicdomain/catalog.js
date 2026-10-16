// Public Domain Movies — catalog module.

async function getCatalog(args) {
  return [
    { title: 'All Films', filter: '' },
    { title: 'Horror', filter: 'horror' },
    { title: 'Classics', filter: 'classics' },
  ];
}

// CommonJS exports for the unictoos sandbox
if (typeof module !== 'undefined' && module.exports) {
  module.exports.getCatalog = getCatalog;
}
