const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');
const { buildCatalog, createAudioId, audioTexts, saveJson } = require('./catalog.cjs');
const { linkCourses } = require('./link-courses.cjs');
const { fixture } = require('./test-fixture.cjs');

test('matches complete text across course IDs and physical sides; missing forms stay unmapped', () => {
  fixture(({ root, audioRoot, recipe }) => {
    const { catalog, summary } = linkCourses(root);
    const water = createAudioId({ ...recipe, text: 'agua' });
    assert.equal(catalog.courses.spanish_pl.cards['0001'].front, water);
    assert.equal(catalog.courses.spanish_en.cards['0099'].front, water);
    assert.deepEqual(catalog.courses.spanish_back.cards['0007'], { back: water });
    assert.equal(catalog.courses.spanish_pl.cards['0002'].front, createAudioId({ ...recipe, text: 'hola, buenos días' }));
    assert.equal(catalog.courses.spanish_pl.cards['0003'], undefined);
    assert.equal(summary.find((item) => item.slug === 'spanish_pl').missing, 1);
    assert.equal(catalog.packs.audio_es_small.audioIds.length, 2);
    assert.ok(!existsSync(join(audioRoot, 'recordings.json')));
    assert.ok(existsSync(join(audioRoot, 'reports/spanish_pl.csv')));
    assert.ok(existsSync(join(root, 'docs/audio/content/reports/README.md')));
    assert.equal(existsSync(join(audioRoot, 'reports/README.md')), false);
    const first = readFileSync(join(root, 'Audio/runtime/generated/catalog.json'));
    linkCourses(root);
    assert.deepEqual(readFileSync(join(root, 'Audio/runtime/generated/catalog.json')), first);
  });
});
test('check and corrupt audio never modify source configuration or write outputs', () => {
  fixture(({ root, audioRoot, recordings }) => {
    const before = readFileSync(join(audioRoot, 'courses.json'));
    linkCourses(root, { check: true });
    assert.deepEqual(readFileSync(join(audioRoot, 'courses.json')), before);
    assert.equal(existsSync(join(root, 'Audio/runtime/generated/catalog.json')), false);
    writeFileSync(join(audioRoot, Object.values(recordings)[1].file), 'corrupt');
    assert.throws(() => linkCourses(root), /Invalid audio file/);
    assert.deepEqual(readFileSync(join(audioRoot, 'courses.json')), before);
    assert.equal(existsSync(join(audioRoot, 'reports')), false);
  });
});
test('partial variants share recordings, preserve commas and omit unavailable forms', () => {
  fixture(({ root, audioRoot, courses, recipe }) => {
    courses.courses.spanish_pl.frontAudioMode = 'variants';
    saveJson(join(audioRoot, 'courses.json'), courses);
    writeFileSync(join(root, 'pl.csv'), 'external_id,front_text,back_text\n0001,"agua; hola, buenos días; unavailable",forms\n0002,agua,water\n');
    const { catalog, summary } = linkCourses(root);
    assert.deepEqual(catalog.courses.spanish_pl.cards['0001'].front, ['agua', 'hola, buenos días'].map((text) => createAudioId({ ...recipe, text })));
    assert.equal(summary.find((item) => item.slug === 'spanish_pl').missing, 1);
    courses.courses.spanish_pl.frontAudioMode = 'whole';
    saveJson(join(audioRoot, 'courses.json'), courses);
    assert.equal(buildCatalog(root).courses.spanish_pl.cards['0001'], undefined);
  });
});
test('a course can require multiple packs and every recording has one owner', () => {
  fixture(({ root, audioRoot }) => {
    writeFileSync(join(root, 'pl.csv'), 'external_id,front_text,back_text\n0001,agua,woda\n');
    writeFileSync(join(root, 'back.csv'), 'external_id,front_text,back_text\n0001,woda,agua\n0002,phrase,"hola, buenos días"\n');
    const { catalog } = linkCourses(root);
    assert.deepEqual(catalog.courses.spanish_back.requiredPacks, ['audio_es_large', 'audio_es_small']);
    assert.equal(Object.keys(catalog.recordings).length, 2);
    assert.equal(existsSync(join(audioRoot, 'reports/spanish_back.csv')), true);
  });
});
test('front and back separators match the app; front commas remain part of a phrase', () => {
  assert.deepEqual(audioTexts('hello, hi; hey\nhey', { mode: 'variants' }), ['hello, hi', 'hey']);
  assert.deepEqual(audioTexts('hello, hi; hey', { mode: 'variants', side: 'back' }), ['hello', 'hi', 'hey']);
  assert.deepEqual(audioTexts('hello, hi', { mode: 'whole' }), ['hello, hi']);
  assert.throws(() => audioTexts('word', { mode: 'other' }), /Invalid audio text mode/);
});
