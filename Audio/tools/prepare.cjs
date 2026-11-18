const { join, resolve } = require('node:path');
const { readFileSync, writeFileSync } = require('node:fs');
const { parseArgs } = require('node:util');
const { buildCatalog, importPreview, writeOutputs, withBlock } = require('./catalog.cjs');
const projectRoot = resolve(__dirname, '../..');
const { values } = parseArgs({ options: { import: { type: 'string' }, android: { type: 'boolean' }, check: { type: 'boolean' } } });
if (values.check && (values.import || values.android)) throw new Error('--check cannot be combined with --import or --android');
if (values.import) importPreview(projectRoot, resolve(values.import));
const catalog = buildCatalog(projectRoot);
if (!values.check) writeOutputs(projectRoot, catalog);
if (values.android) {
  const androidRoot = join(projectRoot, 'android');
  const content = require('../../Content/tools/catalog.cjs');
  const combined = content.buildCatalog(projectRoot);
  content.writeOutputs(projectRoot, combined);
  content.preparePacks(projectRoot, androidRoot, combined);
  const blocks = content.gradleBlocks(combined);
  for (const [file, block] of [['settings.gradle', blocks.settings], ['app/build.gradle', blocks.app]]) {
    const path = join(androidRoot, file);
    writeFileSync(path, withBlock(readFileSync(path, 'utf8'), block));
  }
}
console.log(`Audio: ${Object.keys(catalog.recordings).length} MP3, ${Object.keys(catalog.courses).length} courses, ${Object.keys(catalog.packs).length} pack(s).`);
