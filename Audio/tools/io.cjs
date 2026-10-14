const { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync } = require('node:fs');
const { resolve, relative, dirname } = require('node:path');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
function saveText(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return;
  writeFileSync(`${path}.tmp`, content);
  renameSync(`${path}.tmp`, path);
}
const saveJson = (path, value) => saveText(path, `${JSON.stringify(value, null, 2)}\n`);
const sorted = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));
function inside(root, path) {
  if (typeof path !== 'string' || path.includes('\\')) throw new Error(`Invalid audio path: ${path}`);
  const target = resolve(root, path), fromRoot = relative(resolve(root), target);
  if (!fromRoot || fromRoot === '..' || fromRoot.startsWith('../')) throw new Error(`Invalid audio path: ${path}`);
  return target;
}
module.exports = { readJson, saveText, saveJson, sorted, inside };
