// Public Domain Movies — catalog module.

async function getCatalog(args) {
  return [
    { title: 'All Films', filter: '' },
    { title: 'Horror', filter: 'horror' },
    { title: 'Classics', filter: 'classics' },
  ];
}
