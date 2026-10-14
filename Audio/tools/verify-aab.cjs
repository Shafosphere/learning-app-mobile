const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createHash } = require('node:crypto');
const JSZip = require('jszip');
const { buildCatalog, readRecordings } = require('./catalog.cjs');

async function verify() {
  const root = resolve(__dirname, '../..');
  const catalog = buildCatalog(root);
  const source = readRecordings(resolve(root, 'Audio/content'));
  const aab = resolve(process.argv[2] || 'android/app/build/outputs/bundle/release/app-release.aab');
  const zip = await JSZip.loadAsync(readFileSync(aab));
  const expectedPaths = new Set();
  const audioChecksums = new Set();
  for (const [name, pack] of Object.entries(catalog.packs)) {
    const manifest = zip.file(`${name}/assets/audio-manifests/${name}.json`);
    if (!manifest || await manifest.async('string') !== pack.manifest) throw new Error(`Incorrect AAB pack manifest: ${name}`);
  }
  for (const [id, record] of Object.entries(catalog.recordings)) {
    const path = `${record.packName}/assets/${record.relativePath}`;
    expectedPaths.add(path);
    const file = zip.file(path);
    if (!file) throw new Error(`Missing AAB recording: ${path}`);
    const checksum = createHash('sha256').update(await file.async('nodebuffer')).digest('hex');
    if (checksum !== source[id].fileSha256) throw new Error(`Incorrect AAB recording: ${path}`);
    audioChecksums.add(checksum);
  }
  for (const [path, file] of Object.entries(zip.files)) {
    if (file.dir || !path.endsWith('.mp3') || expectedPaths.has(path)) continue;
    const checksum = createHash('sha256').update(await file.async('nodebuffer')).digest('hex');
    if (audioChecksums.has(checksum)) throw new Error(`Duplicated Google recording in AAB: ${path}`);
    if (Object.keys(catalog.packs).some((pack) => path.startsWith(`${pack}/assets/`)))
      throw new Error(`Unexpected audio in pack: ${path}`);
  }
  console.log(`AAB verified: ${expectedPaths.size} Google MP3 files, no duplicate copies in base/other modules. ${aab}`);
}
verify().catch((error) => { console.error(error.message); process.exitCode = 1; });
