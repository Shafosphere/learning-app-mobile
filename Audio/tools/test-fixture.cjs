const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, dirname } = require('node:path');
const { createAudioId, recipeKey, sha256, saveRecordingLibrary, saveJson } = require('./catalog.cjs');

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'audio-v2-')), audioRoot = join(root, 'Audio/content');
  const recipe = { language: 'es-ES', voice: 'es-ES-Chirp3-HD-Aoede', audioEncoding: 'MP3' }, recordings = {};
  try {
    for (const text of ['agua', 'hola, buenos días']) {
      const id = createAudioId({ ...recipe, text }), data = Buffer.from(`fake-mp3:${text}`), file = `library/es-ES/${id}.mp3`;
      mkdirSync(dirname(join(audioRoot, file)), { recursive: true });
      writeFileSync(join(audioRoot, file), data);
      recordings[id] = { ...recipe, text, file, bytes: data.length, fileSha256: sha256(data) };
    }
    saveRecordingLibrary(audioRoot, recordings);
    const course = { csv: 'pl.csv', frontLanguage: 'es-ES', backLanguage: 'pl-PL', frontRecipe: recipeKey(recipe) };
    const courses = { schemaVersion: 2, courses: {
      spanish_pl: course,
      spanish_en: { ...course, csv: 'en.csv', backLanguage: 'en-US' },
      spanish_back: { csv: 'back.csv', frontLanguage: 'pl-PL', backLanguage: 'es-ES', backRecipe: recipeKey(recipe) },
    } };
    saveJson(join(audioRoot, 'courses.json'), courses);
    writeFileSync(join(root, 'pl.csv'), 'external_id,front_text,back_text\n0001,agua,woda\n0002,"hola, buenos días",dzień dobry\n0003,missing,brak\n');
    writeFileSync(join(root, 'en.csv'), 'external_id,front_text,back_text\n0099,agua,water\n0100,agua,water\n');
    writeFileSync(join(root, 'back.csv'), 'external_id,front_text,back_text\n0007,woda,agua\n');
    return run({ root, audioRoot, recordings, recipe, courses });
  } finally { rmSync(root, { recursive: true, force: true }); }
}
module.exports = { fixture };
