const { existsSync, readdirSync, readFileSync, copyFileSync, mkdirSync } = require('node:fs');
const { join, dirname, resolve } = require('node:path');
const { recipeOf, recipeKey, createAudioId, sha256 } = require('./identity.cjs');
const { readJson, saveJson, sorted, inside } = require('./io.cjs');

function readRecipes(root) {
  const path = join(root, 'recipes.json');
  if (!existsSync(path)) {
    if (existsSync(join(root, 'recordings.json')) || existsSync(join(root, 'recordings'))) throw new Error('Audio library requires migration; missing recipes.json');
    return {};
  }
  const data = readJson(path);
  if (data.schemaVersion !== 2 || !data.recipes || Array.isArray(data.recipes)) throw new Error('Invalid audio recipes');
  for (const [key, recipe] of Object.entries(data.recipes)) {
    if (!/^[a-z]{2,3}-[A-Z]{2}$/.test(recipe.language) || typeof recipe.voice !== 'string' || !/^[a-zA-Z0-9-]+$/.test(recipe.voice) || !recipe.voice.startsWith(`${recipe.language}-`)
      || recipe.audioEncoding !== 'MP3' || key !== recipeKey(recipe)) throw new Error(`Invalid audio recipe: ${key}`);
  }
  return data.recipes;
}
function readRecordings(root) {
  const recipes = readRecipes(root), recordings = {};
  const directory = join(root, 'recordings');
  if (!existsSync(directory)) return recordings;
  for (const key of readdirSync(directory).sort()) {
    if (!recipes[key]) throw new Error(`Unknown recording recipe: ${key}`);
    for (const name of readdirSync(join(directory, key)).sort()) {
      if (!/^[a-f0-9]\.json$/.test(name)) {
        if (name.endsWith('.tmp')) continue;
        throw new Error(`Invalid recording shard: ${name}`);
      }
      const shard = readJson(join(directory, key, name));
      if (shard.schemaVersion !== 2 || shard.recipe !== key || !shard.recordings || Array.isArray(shard.recordings)) throw new Error(`Invalid recording shard: ${name}`);
      for (const [id, record] of Object.entries(shard.recordings)) {
        if (!/^[a-f0-9]{64}$/.test(id) || id[0] !== name[0] || recordings[id]) throw new Error(`Invalid audio identity: ${id}`);
        if (typeof record.text !== 'string' || !Number.isSafeInteger(record.bytes) || record.bytes <= 0 || !/^[a-f0-9]{64}$/.test(record.fileSha256)
          || Object.keys(record).some((field) => !['text', 'bytes', 'fileSha256'].includes(field))) throw new Error(`Invalid recording metadata: ${id}`);
        const recipe = recipes[key];
        recordings[id] = { ...recipe, ...record, file: `library/${recipe.language}/${id}.mp3` };
        if (createAudioId(recordings[id]) !== id) throw new Error(`Invalid audio identity: ${id}`);
      }
    }
  }
  return recordings;
}
function saveRecording(root, id, record) {
  if (!/^[a-f0-9]{64}$/.test(id) || createAudioId(record) !== id) throw new Error(`Invalid audio identity: ${id}`);
  const key = recipeKey(record), recipes = readRecipes(root);
  if (!recipes[key]) saveJson(join(root, 'recipes.json'), { schemaVersion: 2, recipes: sorted({ ...recipes, [key]: recipeOf(record) }) });
  const path = join(root, 'recordings', key, `${id[0]}.json`);
  const shard = existsSync(path) ? readJson(path) : { schemaVersion: 2, recipe: key, recordings: {} };
  if (shard.schemaVersion !== 2 || shard.recipe !== key || !shard.recordings || Array.isArray(shard.recordings)) throw new Error(`Invalid recording shard: ${path}`);
  const value = { text: record.text, bytes: record.bytes, fileSha256: record.fileSha256 };
  if (shard.recordings[id] && JSON.stringify(shard.recordings[id]) !== JSON.stringify(value)) throw new Error(`Conflicting recording: ${id}`);
  shard.recordings[id] = value;
  saveJson(path, { ...shard, recordings: sorted(shard.recordings) });
}
function saveRecordingLibrary(root, recordings) {
  const recipes = {}, shards = {};
  for (const [id, record] of Object.entries(sorted(recordings))) {
    const key = recipeKey(record);
    recipes[key] = recipeOf(record);
    const shardKey = `${key}/${id[0]}`;
    const shard = shards[shardKey] ??= { schemaVersion: 2, recipe: key, recordings: {} };
    shard.recordings[id] = { text: record.text, bytes: record.bytes, fileSha256: record.fileSha256 };
  }
  saveJson(join(root, 'recipes.json'), { schemaVersion: 2, recipes: sorted(recipes) });
  for (const [key, shard] of Object.entries(sorted(shards))) saveJson(join(root, 'recordings', `${key}.json`), shard);
}
function validateRecordings(root, recordings) {
  for (const [id, record] of Object.entries(recordings)) {
    if (!/^[a-f0-9]{64}$/.test(id) || createAudioId(record) !== id) throw new Error(`Invalid audio identity: ${id}`);
    const data = readFileSync(inside(root, record.file));
    if (!data.length || data.length !== record.bytes || sha256(data) !== record.fileSha256) throw new Error(`Invalid audio file: ${id}`);
  }
}
function importPreview(projectRoot, manifestPath) {
  const manifest = readJson(manifestPath), root = join(projectRoot, 'Audio/content');
  const recordings = readRecordings(root);
  const planned = manifest.entries.map((entry) => {
    const record = { text: entry.text, ...recipeOf(manifest) };
    if (createAudioId(record) !== entry.audioId) throw new Error(`Invalid preview identity: ${entry.externalId}`);
    const source = inside(resolve(manifestPath, '..'), entry.file), data = readFileSync(source);
    if (!data.length || data.length !== entry.bytes) throw new Error(`Invalid preview file: ${entry.file}`);
    const file = `library/${record.language}/${entry.audioId}.mp3`, target = inside(root, file);
    if (existsSync(target) && !readFileSync(target).equals(data)) throw new Error(`Conflicting recording: ${entry.audioId}`);
    const value = { ...record, file, bytes: data.length, fileSha256: sha256(data) };
    if (recordings[entry.audioId] && recordings[entry.audioId].fileSha256 !== value.fileSha256) throw new Error(`Conflicting recording: ${entry.audioId}`);
    return { id: entry.audioId, value, source, target };
  });
  for (const { id, value, source, target } of planned) {
    mkdirSync(dirname(target), { recursive: true });
    if (!existsSync(target)) copyFileSync(source, target);
    saveRecording(root, id, value);
  }
  return manifest;
}
module.exports = { readRecipes, readRecordings, saveRecording, saveRecordingLibrary, validateRecordings, importPreview };
