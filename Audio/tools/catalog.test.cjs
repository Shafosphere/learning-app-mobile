const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const { buildCatalog, createAudioId, readRecordings, sha256, runtimeCatalog, writeOutputs, withBlock, gradleBlocks, preparePacks } = require('./catalog.cjs');
const { fixture } = require('./test-fixture.cjs');
const project = resolve(__dirname, '../..');
const catalog = buildCatalog(project);
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, canonical(entry)])) : value;

test('v1 migration preserves every recording and all 16 course mappings', () => {
  const mappings = Object.fromEntries(Object.entries(catalog.courses).filter(([slug]) => !slug.startsWith('eng_to_pl_')).map(([slug, course]) => [slug, course.cards]));
  assert.equal(sha256(JSON.stringify(canonical(mappings))), '6bb430dcc66e0aebeb741775b5b8d2a1cace1549277151f918a56d88353e9450');
  const originalRecordings = Object.fromEntries(Object.entries(readRecordings(join(project, 'Audio/content'))).filter(([, record]) => record.language !== 'en-US'));
  assert.equal(sha256(JSON.stringify(canonical(originalRecordings))), '00decafe586e5e5c6d4e38bb11c4e8a6f135251205cd86e5308746f832f4c3b6');
  assert.equal(Object.values(catalog.recordings).filter((record) => record.language !== 'en-US').length, 10436);
  assert.equal(Object.keys(catalog.packs).filter((name) => !name.startsWith('audio_en_')).length, 11);
  const members = Object.values(catalog.packs).flatMap((pack) => pack.audioIds);
  assert.equal(new Set(members).size, members.length);
});
test('course dependencies cover every recording with the planned source sizes', () => {
  const bytes = (slug) => catalog.courses[slug].requiredPacks.reduce((sum, name) => sum + catalog.packs[name].sourceBytes, 0);
  for (const [slug, size] of [['fr_to_pl_first_50', 519264], ['fr_to_pl_first_150', 977952], ['fr_to_pl_first_332', 1564704],
    ['french_a1', 5224320], ['french_a2', 7518720], ['french_b1', 15429120], ['french_b2', 20710944], ['es_to_pl_first_50', 223392]]) assert.equal(bytes(slug), size);
  for (const language of ['es', 'fr']) for (const count of language === 'es' ? [50, 150, 327] : [50, 150, 332]) {
    assert.deepEqual(catalog.courses[`${language}_to_pl_first_${count}`].cards, catalog.courses[`${language}_to_en_first_${count}`].cards);
  }
  for (const [name, pack] of Object.entries(catalog.packs)) {
    assert.equal(sha256(pack.manifest), pack.manifestHash);
    assert.equal(JSON.parse(pack.manifest).packName, name);
    assert.equal(JSON.parse(pack.manifest).files.length, pack.audioIds.length);
  }
});
test('runtime indexes round trip every mapping; generated output is deterministic and below 3 MB', () => {
  const runtime = runtimeCatalog(catalog);
  for (const [slug, course] of Object.entries(runtime.courses)) for (const [externalId, sides] of Object.entries(course.cards)) {
    for (const [side, ids] of Object.entries(sides)) {
      const resolved = Array.isArray(ids) ? ids.map((index) => runtime.recordings[index].audioId) : runtime.recordings[ids].audioId;
      assert.deepEqual(resolved, catalog.courses[slug].cards[externalId][side]);
    }
  }
  assert.ok(Buffer.byteLength(JSON.stringify(runtime)) < 3000000);
  const root = mkdtempSync(join(tmpdir(), 'audio-outputs-'));
  try {
    writeOutputs(root, catalog);
    const first = readFileSync(join(root, 'Audio/runtime/generated/catalog.json'));
    writeOutputs(root, buildCatalog(project));
    assert.deepEqual(readFileSync(join(root, 'Audio/runtime/generated/catalog.json')), first);
    assert.deepEqual(first, readFileSync(join(project, 'Audio/runtime/generated/catalog.json')));
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('English courses reuse recordings and report missing B1 data without claiming complete coverage', () => {
  for (const [slug, count] of [['eng_to_pl_first_50', 50], ['eng_to_pl_first_100', 100], ['eng_to_pl_first_250', 250], ['eng_to_pl_first_500', 500],
    ['eng_to_pl_a1', 1267], ['eng_to_pl_a2', 1230], ['eng_to_pl_b2', 1736]]) {
    const summary = catalog.summary.find((entry) => entry.slug === slug);
    assert.equal(summary.totalCards, count);
    assert.equal(summary.missing, 0);
    assert.equal(Object.keys(catalog.courses[slug].cards).length, count);
  }
  assert.equal(catalog.courses.eng_to_pl_a1.cards['0092'].front, catalog.courses.eng_to_pl_first_50.cards['0092'].front);
  const b1 = catalog.summary.find((entry) => entry.slug === 'eng_to_pl_b1');
  assert.equal(b1.totalCards, 2020);
  assert.equal(b1.matched + b1.missing, 2020);
  assert.equal(Object.keys(catalog.courses.eng_to_pl_b1.cards).length, b1.matched);
  assert.ok(b1.matched >= 28);
});
test('identity includes voice/configuration and preserves NFC', () => {
  const recipe = { text: 'agua', language: 'es-ES', voice: 'es-ES-Chirp3-HD-Aoede' };
  assert.equal(createAudioId(recipe), createAudioId({ ...recipe, externalId: 'other' }));
  assert.notEqual(createAudioId(recipe), createAudioId({ ...recipe, voice: 'es-ES-Chirp3-HD-Charon' }));
  assert.notEqual(createAudioId(recipe), createAudioId({ ...recipe, audioConfig: { speakingRate: 0.8 } }));
  assert.equal(createAudioId({ ...recipe, text: ' azúcar ' }), createAudioId({ ...recipe, text: 'azu\u0301car' }));
});
test('corrupt recordings and duplicate pack policies fail validation', () => {
  fixture(({ root, audioRoot, recordings }) => {
    writeFileSync(join(audioRoot, Object.values(recordings)[0].file), 'invalid');
    assert.throws(() => buildCatalog(root), /Invalid audio file/);
  });
  fixture(({ root, audioRoot }) => {
    writeFileSync(join(audioRoot, 'packs.json'), JSON.stringify({ schemaVersion: 2, families: { es: { groups: ['es_small', 'es_small'] } } }));
    assert.throws(() => buildCatalog(root), /duplicate pack group/);
  });
});
test('check rejects mutating options before executing them', () => {
  for (const option of [['--android'], ['--import', '/missing/manifest.json']]) {
    const result = spawnSync(process.execPath, [join(project, 'Audio/tools/prepare.cjs'), '--check', ...option], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /--check cannot be combined/);
  }
});
test('Gradle registration preserves signing and is idempotent', () => {
  const block = gradleBlocks(catalog).app, original = 'android { signingConfigs { release { /* user configuration */ } } }\n';
  const once = withBlock(original, block);
  assert.equal(withBlock(once, block), once);
  assert.ok(once.startsWith(original));
  assert.equal((once.match(/audio_es_50/g) || []).length, 1);
});
test('staged packs namespace manifests so bundletool cannot collide asset paths', () => {
  fixture(({ root }) => {
    writeFileSync(join(root, 'pl.csv'), 'external_id,front_text,back_text\n0001,agua,woda\n');
    writeFileSync(join(root, 'back.csv'), 'external_id,front_text,back_text\n0002,phrase,"hola, buenos días"\n');
    const android = join(root, 'android'); mkdirSync(android);
    const generated = buildCatalog(root);
    preparePacks(root, android, generated);
    for (const [name, pack] of Object.entries(generated.packs)) {
      assert.equal(readFileSync(join(android, name, 'src/main/assets/audio-manifests', `${name}.json`), 'utf8'), pack.manifest);
    }
    assert.equal(Object.keys(generated.packs).length, 2);
    // The second preparation owns these directories and is safe to repeat.
    preparePacks(root, android, generated);
  });
});
