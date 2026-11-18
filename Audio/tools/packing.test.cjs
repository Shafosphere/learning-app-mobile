const assert = require('node:assert/strict');
const { test } = require('node:test');
const { join, dirname } = require('node:path');
const { mkdirSync, writeFileSync, existsSync, readFileSync } = require('node:fs');
const { packRecordings } = require('./packing.cjs');
const { audioLanguageKey } = require('../language');
const { fixture } = require('./test-fixture.cjs');
const { buildCatalog, createAudioId, recipeKey, sha256, saveRecordingLibrary, saveJson, preparePacks } = require('./catalog.cjs');

test('normalization groups regional codes but rejects invalid languages', () => {
  for (const locale of ['en-US', 'en_GB', 'EN', 'en-Latn-US']) assert.equal(audioLanguageKey(locale), 'en');
  for (const locale of ['', null, '../en', 'en--US']) assert.throws(() => audioLanguageKey(locale), /Invalid audio language/);
});
test('a new language and two-sided audio need only source configuration; unused files stay out', () => {
  fixture(({ root, audioRoot, recipe, recordings, courses }) => {
    for (const [language, text] of [['de-DE', 'Wasser'], ['es-MX', 'agua'], ['it-IT', 'unused']]) {
      const other = { ...recipe, language, voice: `${language}-test` };
      const id = createAudioId({ ...other, text }), data = Buffer.from(`fake-mp3:${language}`), file = `library/${language}/${id}.mp3`;
      mkdirSync(dirname(join(audioRoot, file)), { recursive: true });
      writeFileSync(join(audioRoot, file), data);
      recordings[id] = { ...other, text, file, bytes: data.length, fileSha256: sha256(data) };
      if (language === 'de-DE') {
        courses.courses.spanish_pl.backLanguage = language;
        courses.courses.spanish_pl.backRecipe = recipeKey(other);
      }
      if (language === 'es-MX') courses.courses.mexican = { ...courses.courses.spanish_en, frontLanguage: language, frontRecipe: recipeKey(other) };
    }
    saveRecordingLibrary(audioRoot, recordings);
    saveJson(join(audioRoot, 'courses.json'), courses);
    writeFileSync(join(root, 'pl.csv'), 'external_id,front_text,back_text\n0001,agua,Wasser\n');
    const catalog = buildCatalog(root);
    assert.deepEqual(Object.keys(catalog.packs), ['audio_de', 'audio_es']);
    assert.deepEqual(catalog.courses.spanish_pl.requiredPacks, ['audio_de', 'audio_es']);
    assert.equal(Object.values(catalog.recordings).filter(r => r.language.startsWith('es')).length, 2);
    assert.equal(Object.values(catalog.recordings).some(r => r.language === 'it-IT'), false);
    assert.deepEqual(catalog.languages, { de: 'audio_de', es: 'audio_es' });
    const android = join(root, 'android'); mkdirSync(android);
    const old = join(android, 'audio_es_50'); mkdirSync(old); writeFileSync(join(old, '.audio-pack-owned'), 'Generated');
    const untouched = join(android, 'audio_custom'); mkdirSync(untouched); writeFileSync(join(untouched, 'user.txt'), 'keep');
    preparePacks(root, android, catalog);
    assert.equal(existsSync(old), false);
    assert.equal(readFileSync(join(untouched, 'user.txt'), 'utf8'), 'keep');
    preparePacks(root, android, catalog);
    assert.equal(existsSync(join(android, 'audio_de/build.gradle')), true);
  });
});
test('pack count guard accepts 100 languages and rejects 101 before staging', () => {
  const source = {};
  for (let i = 0; i < 101; i++) source[`id${i}`] = { language: `q${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + i % 26)}`, bytes: 1, fileSha256: 'test' };
  assert.equal(Object.keys(packRecordings(new Set(Object.keys(source).slice(0, 100)), source).packs).length, 100);
  assert.throws(() => packRecordings(new Set(Object.keys(source)), source), /at most 100/);
  assert.deepEqual(packRecordings(new Set(), source).packs, {});
});
