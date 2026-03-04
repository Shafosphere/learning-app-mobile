const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const sourcePath = path.join(__dirname, '..', 'assets', 'data', 'json', 'words-grouped.json');
const outputDir = path.join(__dirname, '..', 'tools', 'prebuild-data');
const levels = process.argv.slice(2);
const targetLevels = levels.length ? levels.map((l) => l.toUpperCase()) : ['A1', 'A2'];

const raw = fs.readFileSync(sourcePath, 'utf8');
const grouped = JSON.parse(raw);

for (const level of targetLevels) {
  const rows = Array.isArray(grouped[level]) ? grouped[level] : [];
  const csvRows = rows.map((entry) => ({
    front_text: String(entry.word || '').trim(),
    back_text: String(entry.wordpl || '').trim(),
  }));
  const csv = Papa.unparse(csvRows, { columns: ['front_text', 'back_text'] });
  const outputPath = path.join(outputDir, `ENGtoPL_${level}.csv`);
  fs.writeFileSync(outputPath, csv);
  console.log(`Wrote ${csvRows.length.toString().padStart(4, ' ')} rows -> ${path.basename(outputPath)}`);
}
