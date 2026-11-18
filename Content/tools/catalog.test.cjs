const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const JSZip = require('jszip');
const { buildImages, validateDependencies, preparePacks, writeOutputs, withBlock, gradleBlocks } = require('./catalog.cjs');
const { verifyImages } = require('./verify-aab.cjs');
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-'));
  fs.writeFileSync(path.join(root, 'bird.webp'), 'bird');
  fs.writeFileSync(path.join(root, 'leaf.webp'), 'leaf');
  try { return fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const birds = { id: 'images_birds', titleKey: 'birds', files: { stork: 'bird.webp' } };
const leaves = { id: 'images_leaves', titleKey: 'leaves', files: { oak: 'leaf.webp' } };
test('10 languages share one image pack; leaves add one, not ten', () => fixture(root => {
  const images = buildImages(root, [birds]);
  const courses = Array.from({ length: 10 }, (_, n) => ({ slug: `birds_${n}`, requiredImagePacks: ['images_birds'] }));
  validateDependencies(images.packs, courses);
  assert.equal(Object.keys(images.packs).length, 1);
  const expanded = buildImages(root, [birds, leaves]);
  validateDependencies(expanded.packs, courses.concat(courses.map(c => ({ ...c, slug: `leaves_${c.slug}`, requiredImagePacks: ['images_leaves'] }))));
  assert.equal(Object.keys(expanded.packs).length, 2);
  assert.throws(() => validateDependencies(images.packs, [{ slug: 'missing', requiredImagePacks: ['images_leaves'] }]), /Unknown/);
}));
test('rejects collisions, missing files, unsafe paths; image changes invalidate manifest', () => fixture(root => {
  assert.throws(() => buildImages(root, [birds, birds]), /duplicate/);
  assert.throws(() => buildImages(root, [{ ...birds, files: { '../bad': 'bird.webp' } }]), /Unsafe/);
  assert.throws(() => buildImages(root, [{ ...birds, files: { stork: 'missing.webp' } }]));
  const first = buildImages(root, [birds]);
  fs.writeFileSync(path.join(root, 'bird.webp'), 'different bird');
  assert.notEqual(buildImages(root, [birds]).packs.images_birds.manifestHash, first.packs.images_birds.manifestHash);
}));
test('stages image packs idempotently and preserves unowned modules', () => fixture(root => {
  const android = path.join(root, 'android'); fs.mkdirSync(android);
  fs.mkdirSync(path.join(android, 'custom')); fs.writeFileSync(path.join(android, 'custom/keep'), 'keep');
  const images = buildImages(root, [birds]);
  const catalog = { images, audioCatalog: { packs: {} } };
  preparePacks(root, android, catalog); preparePacks(root, android, catalog);
  assert.equal(fs.readFileSync(path.join(android, 'images_birds/src/main/assets/stork'), 'utf8'), 'bird');
  assert.equal(fs.readFileSync(path.join(android, 'custom/keep'), 'utf8'), 'keep');
  preparePacks(root, android, { ...catalog, images: { packs: {} } });
  assert.equal(fs.existsSync(path.join(android, 'images_birds')), false);
  const text = withBlock('original', gradleBlocks({ packs: { audio_en: {}, images_birds: {} } }).settings);
  assert.equal(withBlock(text, gradleBlocks({ packs: { audio_en: {}, images_birds: {} } }).settings), text);
}));
test('AAB verification rejects missing files, stale manifests and duplicate base images', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'content-aab-'));
  try {
    fs.writeFileSync(path.join(root, 'bird.webp'), 'bird');
    const images = buildImages(root, [birds]), catalog = { images };
    const zip = new JSZip();
    const pack = images.packs.images_birds;
    zip.file('images_birds/assets/content-manifests/images_birds.json', pack.manifest);
    await assert.rejects(verifyImages(zip, catalog), /missing/);
    zip.file('images_birds/assets/stork', 'bird');
    await verifyImages(zip, catalog);
    zip.file('base/res/drawable/bird.webp', 'bird');
    await assert.rejects(verifyImages(zip, catalog), /duplicated/);
    zip.remove('base/res/drawable/bird.webp');
    zip.file('images_birds/assets/content-manifests/images_birds.json', 'old');
    await assert.rejects(verifyImages(zip, catalog), /manifest/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('combined limit counts both audio and image packs', () => {
  const { validatePackCount } = require('./catalog.cjs');
  const packs = Object.fromEntries(Array.from({ length: 10 }, (_, n) => [`audio_${n}`, {}]).concat(Array.from({ length: 90 }, (_, n) => [`images_set_${n}`, {}])));
  validatePackCount(packs);
  assert.throws(() => validatePackCount({ ...packs, images_extra: {} }), /100 PAD packs/);
});
test('course image references validate dependencies and reject ambiguous identifiers', () => fixture(root => {
  const { imageReference } = require('./imageReferences.cjs');
  const packs = buildImages(root, [birds, leaves]).packs;
  const courses = [{ slug: 'birds_fr', requiredImagePacks: ['images_birds'] }];
  assert.equal(imageReference(packs, courses, 'birds_fr', 'stork'), 'asset://images_birds/stork');
  assert.equal(imageReference(packs, courses, 'birds_fr', 'asset://images_birds/stork'), 'asset://images_birds/stork');
  assert.throws(() => imageReference(packs, courses, 'birds_fr', 'oak'), /missing/);
  assert.throws(() => imageReference(packs, courses, 'birds_fr', 'asset://images_leaves/oak'), /Unknown/);
  assert.equal(imageReference(packs, courses, 'legacy', 'bundled.png'), 'bundled.png');
  packs.images_leaves.files.stork = packs.images_birds.files.stork;
  assert.throws(() => imageReference(packs, [{ slug: 'mixed', requiredImagePacks: ['images_birds', 'images_leaves'] }], 'mixed', 'stork'), /Ambiguous/);
}));
