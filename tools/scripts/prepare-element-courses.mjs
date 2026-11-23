import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

// Run: node tools/scripts/prepare-element-courses.mjs
// The source basicCourse flag defines stage 1; stage 2 contains all 118 elements.
const root = fileURLToPath(new URL('../../', import.meta.url));
const source = await fs.readFile(path.join(root, 'tools/pierwiastki_118.csv'), 'utf8');
const { data, errors } = Papa.parse(source, { header: true, skipEmptyLines: true });
if (errors.length || data.length !== 118) throw new Error('Expected 118 valid element records');
const ids = new Set();
const symbols = new Set();
for (const row of data) {
  const number = Number(row.atomicNumber);
  if (!Number.isInteger(number) || number < 1 || number > 118 || ids.has(number)
    || !row.symbol?.trim() || symbols.has(row.symbol) || !row.namePl?.trim()
    || !['True', 'False'].includes(row.basicCourse)) {
    throw new Error(`Invalid or duplicate element: ${row.atomicNumber}`);
  }
  ids.add(number);
  symbols.add(row.symbol);
}
data.sort((a, b) => Number(a.atomicNumber) - Number(b.atomicNumber));
const destination = path.join(root, 'tools/prebuild-data/pl/przyroda/pierwiastki');
await fs.mkdir(destination, { recursive: true });
for (const [filename, basic] of [['podstawowe.csv', 'True'], ['pozostale.csv', null]]) {
  const cards = data.filter(row => basic === null || row.basicCourse === basic).map(row => ({
    external_id: row.atomicNumber.padStart(4, '0'),
    front_text: row.symbol,
    back_text: row.namePl,
  }));
  await fs.writeFile(path.join(destination, filename), Papa.unparse(cards) + '\n');
  console.log(`${filename}: ${cards.length} cards`);
}
