const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { buildCatalog, writeOutputs, preparePacks, gradleBlocks, withBlock } = require('./catalog.cjs');
const root = path.resolve(__dirname, '../..');
const { values } = parseArgs({ options: { android: { type: 'boolean' }, check: { type: 'boolean' } } });
if (values.check && values.android) throw new Error('--check cannot be combined with --android');
const catalog = buildCatalog(root);
if (!values.check) writeOutputs(root, catalog);
if (values.android) {
  const android = path.join(root, 'android');
  preparePacks(root, android, catalog);
  const blocks = gradleBlocks(catalog);
  for (const [file, block] of [['settings.gradle', blocks.settings], ['app/build.gradle', blocks.app]]) {
    const target = path.join(android, file);
    fs.writeFileSync(target, withBlock(fs.readFileSync(target, 'utf8'), block));
  }
}
console.log(`Content: ${Object.keys(catalog.packs).length} packs (${Object.keys(catalog.images.packs).length} image sets).`);
