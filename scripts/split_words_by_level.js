const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const sourcePath = path.join(__dirname, '..', 'assets', 'data', 'wordsENGtoPL.csv');
const outputDir = path.join(__dirname, '..', 'assets', 'data');

const raw = fs.readFileSync(sourcePath, 'utf8');
const parsed = Papa.parse(raw, { header: true, skipEmptyLines: true, trimHeaders: true });

if (parsed.errors.length) {
  console.error('Parse errors:', parsed.errors);
  process.exit(1);
}

const grouped = new Map(levels.map((level) => [level, []]));
const unknownLevels = new Map();

parsed.data.forEach((row) => {
  const level = String(row.cefr_level || '').toUpperCase().trim();
  if (grouped.has(level)) {
    grouped.get(level).push({
      front: row.word,
      back: row.wordpl,
    });
  } else if (level) {
    unknownLevels.set(level, (unknownLevels.get(level) || 0) + 1);
  }
});

grouped.forEach((rows, level) => {
  const csv = Papa.unparse(rows, { columns: ['front', 'back'] });
  const target = path.join(outputDir, `ENGtoPL_${level}.csv`);
  fs.writeFileSync(target, csv);
  console.log(`Wrote ${rows.length.toString().padStart(4, ' ')} rows -> ${path.basename(target)}`);
});

if (unknownLevels.size) {
  console.warn('Nieznane poziomy CEFR pominięte:');
  unknownLevels.forEach((count, level) => console.warn(`  ${level}: ${count}`));
}
