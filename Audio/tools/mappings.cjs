const { readFileSync } = require('node:fs');
const Papa = require('papaparse');
const { inside, sorted } = require('./io.cjs');
const { audioTexts, createAudioId } = require('./identity.cjs');

function mapCourses(projectRoot, definitions, recipes, recordings) {
  if (definitions.schemaVersion !== 2 || !definitions.courses) throw new Error('Unsupported audio course version');
  const courses = {}, summary = [], usedAudioIds = new Set();
  for (const [slug, course] of Object.entries(sorted(definitions.courses))) {
    if (!/^[a-z0-9_]+$/.test(slug)) throw new Error(`Invalid course: ${slug}`);
    if (course.cards) throw new Error(`Generated cards must not be stored in source course: ${slug}`);
    const parsed = Papa.parse(readFileSync(inside(projectRoot, course.csv), 'utf8'), { header: true, skipEmptyLines: 'greedy' });
    if (parsed.errors.length || !['external_id', 'front_text', 'back_text'].every((key) => parsed.meta.fields?.includes(key))) throw new Error(`Invalid course CSV: ${slug}`);
    const cards = {}, rows = [], externalIds = new Set();
    let matched = 0, missing = 0;
    for (const row of parsed.data) {
      const id = row.external_id;
      if (!id || externalIds.has(id)) throw new Error(`Duplicate/missing externalId: ${slug}`);
      externalIds.add(id);
      const sides = {};
      for (const side of ['front', 'back']) {
        const recipeName = course[`${side}Recipe`];
        if (!recipeName) continue;
        const recipe = recipes[recipeName];
        if (!recipe || recipe.language !== course[`${side}Language`]) throw new Error(`Invalid course recipe: ${slug}/${side}`);
        const texts = audioTexts(row[`${side}_text`], { mode: course[`${side}AudioMode`] ?? 'whole', side });
        if (!texts.length) throw new Error(`Empty audio text: ${slug}/${id}/${side}`);
        const ids = [];
        for (const text of texts) {
          const audioId = createAudioId({ ...recipe, text });
          if (recordings[audioId]) { ids.push(audioId); usedAudioIds.add(audioId); matched++; } else missing++;
          rows.push({ externalId: id, side, text, audioId: recordings[audioId] ? audioId : '', pack: '' });
        }
        if (ids.length) sides[side] = ids.length === 1 ? ids[0] : ids;
      }
      if (Object.keys(sides).length) cards[id] = sides;
    }
    courses[slug] = { frontLanguage: course.frontLanguage, backLanguage: course.backLanguage, requiredPacks: [], cards };
    summary.push({ slug, totalCards: parsed.data.length, matched, missing, rows });
  }
  return { courses, summary, usedAudioIds };
}
module.exports = { mapCourses };
