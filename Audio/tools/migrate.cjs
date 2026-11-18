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
    const { packGroup, ...sourceCourse } = course;
    courses[slug] = sourceCourse;
    for (const side of ['front', 'back']) {
      const ids = Object.values(cards).flatMap((sides) => sides[side] ? [sides[side]].flat() : []);
      if (!ids.length) continue;
      const keys = new Set(ids.map((id) => recipeKey(recordings[id])));
      if (keys.size !== 1) throw new Error(`Migration needs explicit recipe choice: ${slug}/${side}`);
      courses[slug][`${side}Recipe`] = [...keys][0];
    }
  }
  const newCourses = { schemaVersion: 2, courses };
  // Validate identities, every MP3 checksum and every regenerated mapping before changing sources.
  const catalog = buildCatalog(root, { recordings, recipes, courses: newCourses });
  for (const [slug, course] of Object.entries(definitions.courses)) assert.deepEqual(catalog.courses[slug].cards, course.cards, `Changed mapping: ${slug}`);
  assert.deepEqual(Object.keys(catalog.recordings).sort(), Object.keys(recordings).sort(), 'Migration must preserve all recordings');
  saveRecordingLibrary(directory, recordings);
  const reloaded = readRecordings(directory);
  for (const [id, record] of Object.entries(recordings)) assert.deepEqual(reloaded[id], { ...recipeOf(record), text: record.text, bytes: record.bytes, fileSha256: record.fileSha256, file: record.file });
  saveJson(join(directory, 'courses.json'), newCourses);
  writeOutputs(root, catalog);
  unlinkSync(join(directory, 'recordings.json'));
  console.log(`Migration verified: ${Object.keys(recordings).length} unchanged recordings, ${Object.keys(courses).length} unchanged course mappings, ${Object.keys(catalog.packs).length} packs.`);
  return catalog;
}
if (require.main === module) migrate(resolve(__dirname, '../..'));
module.exports = { migrate };
