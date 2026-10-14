const assert = require('node:assert/strict');
const { unlinkSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { readJson, saveJson } = require('./io.cjs');
const { recipeKey, recipeOf, buildCatalog, saveRecordingLibrary, readRecordings, writeOutputs } = require('./catalog.cjs');

function migrate(root) {
  const directory = join(root, 'Audio/content'), definitions = readJson(join(directory, 'courses.json'));
  if (definitions.schemaVersion === 2) return buildCatalog(root);
  const legacy = readJson(join(directory, 'recordings.json'));
  if (legacy.schemaVersion !== 1 || definitions.schemaVersion !== 1) throw new Error('Unsupported audio migration version');
  const recordings = legacy.recordings, recipes = {}, courses = {};
  for (const record of Object.values(recordings)) recipes[recipeKey(record)] = recipeOf(record);
  for (const [slug, { cards, ...course }] of Object.entries(definitions.courses)) {
    const family = slug.startsWith('es_') ? 'es' : 'fr';
    const group = slug.startsWith('french_') ? `fr_${slug.slice(7)}` : `${family}_${slug.split('_').at(-1)}`;
    courses[slug] = { ...course, packGroup: group };
    for (const side of ['front', 'back']) {
      const ids = Object.values(cards).flatMap((sides) => sides[side] ? [sides[side]].flat() : []);
      if (!ids.length) continue;
      const keys = new Set(ids.map((id) => recipeKey(recordings[id])));
      if (keys.size !== 1) throw new Error(`Migration needs explicit recipe choice: ${slug}/${side}`);
      courses[slug][`${side}Recipe`] = [...keys][0];
    }
  }
  const newCourses = { schemaVersion: 2, courses };
  const packs = { schemaVersion: 2, families: {
    es: { groups: ['es_50', 'es_150', 'es_327'] },
    fr: { groups: ['fr_50', 'fr_150', 'fr_332', 'fr_a1', 'fr_a2', 'fr_b1', 'fr_b2'], sharedGroups: ['fr_a1', 'fr_a2', 'fr_b1', 'fr_b2'] },
  } };
  // Validate identities, every MP3 checksum and every regenerated mapping before changing sources.
  const catalog = buildCatalog(root, { recordings, recipes, courses: newCourses, packs });
  for (const [slug, course] of Object.entries(definitions.courses)) assert.deepEqual(catalog.courses[slug].cards, course.cards, `Changed mapping: ${slug}`);
  assert.deepEqual(Object.keys(catalog.recordings).sort(), Object.keys(recordings).sort(), 'Migration must preserve all recordings');
  saveRecordingLibrary(directory, recordings);
  const reloaded = readRecordings(directory);
  for (const [id, record] of Object.entries(recordings)) assert.deepEqual(reloaded[id], { ...recipeOf(record), text: record.text, bytes: record.bytes, fileSha256: record.fileSha256, file: record.file });
  saveJson(join(directory, 'courses.json'), newCourses);
  saveJson(join(directory, 'packs.json'), packs);
  writeOutputs(root, catalog);
  unlinkSync(join(directory, 'recordings.json'));
  console.log(`Migration verified: ${Object.keys(recordings).length} unchanged recordings, ${Object.keys(courses).length} unchanged course mappings, ${Object.keys(catalog.packs).length} packs.`);
  return catalog;
}
if (require.main === module) migrate(resolve(__dirname, '../..'));
module.exports = { migrate };
