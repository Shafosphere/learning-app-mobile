const { createHash } = require('node:crypto');

const normalizeText = (text) => text.trim().normalize('NFC');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function audioTexts(text, { mode = 'whole', side = 'front' } = {}) {
  if (!['whole', 'variants'].includes(mode)) throw new Error(`Invalid audio text mode: ${mode}`);
  if (!['front', 'back'].includes(side)) throw new Error(`Invalid audio side: ${side}`);
  return [...new Set((mode === 'whole' ? [text] : text.split(side === 'front' ? /[;\n]/ : /[;,\n]/))
    .map(normalizeText).filter(Boolean))];
}
function recipeOf({ language, voice, audioEncoding = 'MP3', audioConfig = {} }) {
  return { language, voice, audioEncoding,
    ...(Object.keys(audioConfig).length ? { audioConfig: Object.fromEntries(Object.entries(audioConfig).sort(([a], [b]) => a.localeCompare(b))) } : {}) };
}
// Keep the original synthesis identity, including property order.
const createAudioId = (record) => sha256(JSON.stringify({ text: normalizeText(record.text), ...recipeOf(record) }));
const recipeKey = (record) => `${record.voice.toLowerCase()}_${sha256(JSON.stringify(recipeOf(record))).slice(0, 8)}`;
module.exports = { normalizeText, audioTexts, sha256, recipeOf, recipeKey, createAudioId };
