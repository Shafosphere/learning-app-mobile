const { sha256 } = require('./identity.cjs');
const { sorted } = require('./io.cjs');

function packRecordings(definitions, groupIds, source) {
  if (definitions.schemaVersion !== 2 || !definitions.families) throw new Error('Unsupported audio packing version');
  const recordings = {}, packs = {}, configured = new Set();
  function assign(name, ids) {
    if (!/^[a-z][a-z0-9_]*$/.test(name) || packs[name]) throw new Error(`Invalid pack: ${name}`);
    const audioIds = [...ids].filter((id) => !recordings[id]).sort();
    if (!audioIds.length) return;
    const files = audioIds.map((id) => ({ audioId: id, bytes: source[id].bytes, fileSha256: source[id].fileSha256 }));
    const manifest = `${JSON.stringify({ schemaVersion: 2, packName: name, files })}\n`;
    packs[name] = { deliveryMode: 'on-demand', sourceBytes: files.reduce((sum, file) => sum + file.bytes, 0),
      audioIds, manifest, manifestHash: sha256(manifest) };
    for (const id of audioIds) recordings[id] = { text: source[id].text, language: source[id].language, packName: name, relativePath: `${id}.mp3` };
  }
  for (const [family, policy] of Object.entries(sorted(definitions.families))) {
    if (!/^[a-z][a-z0-9_]*$/.test(family) || !Array.isArray(policy.groups) || !policy.groups.length) throw new Error(`Invalid pack family: ${family}`);
    for (const group of policy.groups) {
      if (configured.has(group) || !groupIds[group]) throw new Error(`Invalid/duplicate pack group: ${group}`);
      configured.add(group);
      if ([...groupIds[group]].some((id) => recordings[id])) throw new Error(`Audio belongs to multiple pack families: ${group}`);
    }
    const sharedGroups = policy.sharedGroups ?? [];
    if (new Set(sharedGroups).size !== sharedGroups.length || sharedGroups.some((group) => !policy.groups.includes(group))) throw new Error(`Invalid shared groups: ${family}`);
    const occurrences = new Map();
    for (const group of sharedGroups) for (const id of groupIds[group]) occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
    assign(`audio_${family}_shared`, [...occurrences].filter(([, count]) => count >= 2).map(([id]) => id));
    for (const group of policy.groups) assign(`audio_${group}`, groupIds[group]);
  }
  for (const group of Object.keys(groupIds)) if (!configured.has(group)) throw new Error(`Unconfigured pack group: ${group}`);
  return { recordings: sorted(recordings), packs: sorted(packs) };
}
module.exports = { packRecordings };
