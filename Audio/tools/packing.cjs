const { sha256 } = require('./identity.cjs');
const { sorted } = require('./io.cjs');
const { audioLanguageKey } = require('../language');

function packRecordings(usedAudioIds, source) {
  const recordings = {}, packs = {}, languages = {}, byLanguage = new Map();
  for (const id of usedAudioIds) {
    const language = audioLanguageKey(source[id].language);
    if (!byLanguage.has(language)) byLanguage.set(language, []);
    byLanguage.get(language).push(id);
  }
  if (byLanguage.size > 100) throw new Error(`Google Play allows at most 100 asset packs; found ${byLanguage.size} audio languages`);
  for (const [language, ids] of [...byLanguage].sort(([a], [b]) => a.localeCompare(b))) {
    const name = `audio_${language}`, audioIds = ids.sort();
    const files = audioIds.map((id) => ({ audioId: id, bytes: source[id].bytes, fileSha256: source[id].fileSha256 }));
    const manifest = `${JSON.stringify({ schemaVersion: 2, packName: name, files })}\n`;
    packs[name] = { language, deliveryMode: 'on-demand', sourceBytes: files.reduce((sum, file) => sum + file.bytes, 0),
      audioIds, manifest, manifestHash: sha256(manifest) };
    languages[language] = name;
    for (const id of audioIds) recordings[id] = { text: source[id].text, language: source[id].language, packName: name, relativePath: `${id}.mp3` };
  }
  return { recordings: sorted(recordings), packs: sorted(packs), languages: sorted(languages) };
}
module.exports = { packRecordings };
