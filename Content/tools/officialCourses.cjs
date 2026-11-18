const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Evaluate the metadata with asset imports stubbed: Node must never load native modules.
function officialCourses(root) {
  const source = fs.readFileSync(path.join(root, 'src/constants/officialPacks.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (name === './imageMaps') return { imageMaps: new Proxy({}, { get: () => ({}) }) };
    if (name === '@/src/utils/letterHints') return { DEFAULT_LETTER_HINT_SETTINGS: {} };
    throw new Error(`Unsupported official course metadata import: ${name}`);
  } });
  return exports.OFFICIAL_PACKS;
}
module.exports = { officialCourses };
