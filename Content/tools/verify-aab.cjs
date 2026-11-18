const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const JSZip = require('jszip');
const { buildCatalog } = require('./catalog.cjs');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function verifyImages(zip, catalog) {
  const expected = new Map(), checksums = new Set();
  for (const [name, pack] of Object.entries(catalog.images.packs)) {
    const manifest = zip.file(`${name}/assets/content-manifests/${name}.json`);
    if (!manifest || await manifest.async('string') !== pack.manifest) throw new Error(`Incorrect image manifest: ${name}`);
    for (const file of Object.values(pack.files)) {
      const target = `${name}/assets/${file.relativePath}`;
      expected.set(target, file.fileSha256);
      checksums.add(file.fileSha256);
      const entry = zip.file(target);
      if (!entry || hash(await entry.async('nodebuffer')) !== file.fileSha256) throw new Error(`Incorrect/missing image: ${target}`);
    }
  }
  const actualPacks = new Set(Object.keys(zip.files).map(p => p.split('/')[0]).filter(p => p.startsWith('images_')));
  if (actualPacks.size !== Object.keys(catalog.images.packs).length || [...actualPacks].some(p => !catalog.images.packs[p])) throw new Error('Unexpected image packs');
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir || expected.has(name)) continue;
    const packName = name.split('/')[0];
    if (catalog.images.packs[packName] && name.startsWith(`${packName}/assets/`) && name !== `${packName}/assets/content-manifests/${packName}.json`) throw new Error(`Unexpected asset in image pack: ${name}`);
    if (/\.(webp|png|jpe?g|svg)$/i.test(name) && checksums.has(hash(await entry.async('nodebuffer')))) throw new Error(`Image duplicated outside its pack: ${name}`);
  }
}
async function main() {
  const root = path.resolve(__dirname, '../..');
  const aab = path.resolve(process.argv[2] || 'android/app/build/outputs/bundle/release/app-release.aab');
  execFileSync(process.execPath, [path.join(root, 'Audio/tools/verify-aab.cjs'), aab], { stdio: 'inherit' });
  await verifyImages(await JSZip.loadAsync(fs.readFileSync(aab)), buildCatalog(root));
  console.log('Content AAB verified: image manifests, files, checksums and no duplicates.');
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyImages };
