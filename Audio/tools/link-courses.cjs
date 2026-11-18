const { resolve } = require('node:path');
const { parseArgs } = require('node:util');
const { buildCatalog, writeOutputs } = require('./catalog.cjs');

// Recipes live in source configuration. Regenerate every course
// so new recordings cannot leave another course's catalog stale.
function linkCourses(projectRoot, { check = false } = {}) {
  const catalog = buildCatalog(projectRoot);
  if (!check) writeOutputs(projectRoot, catalog);
  return { summary: catalog.summary, catalog };
}
if (require.main === module) {
  try {
    const { values } = parseArgs({ options: { check: { type: 'boolean' } } });
    const { summary, catalog } = linkCourses(resolve(__dirname, '../..'), values);
    for (const item of summary) console.log(`${item.slug}: ${item.matched} przypisanych tekstów; ${item.missing} bez MP3.`);
    console.log(`Audio: ${Object.keys(catalog.recordings).length} MP3, ${Object.keys(catalog.packs).length} paczek. ${values.check ? 'Podgląd bez zapisu.' : 'Zapisano katalog i raporty.'}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { linkCourses };
