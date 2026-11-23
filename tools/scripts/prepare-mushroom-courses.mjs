import fs from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import Papa from 'papaparse';

// Run from the repository root. --offline reuses verified Commons metadata and images.
const dir = 'tools/prebuild-data/pl/przyroda/grzyby';
const generatorDataDir = 'tools/scripts/data/mushrooms';
const imageDir = 'assets/learning/flashcards/mushrooms';
const offline = process.argv.includes('--offline');
const parsed = Papa.parse(await fs.readFile('tools/kurs_1_rozpoznawanie_grzybow.csv', 'utf8'), { header: true, skipEmptyLines: true });
if (parsed.errors.length || parsed.data.length !== 50) throw new Error('Expected 50 valid mushroom records');
if (new Set(parsed.data.map(row => row.id)).size !== 50) throw new Error('Duplicate mushroom IDs');
const taxonomy = JSON.parse(await fs.readFile(`${generatorDataDir}/taxonomy.json`, 'utf8'));
const corrections = new Map(taxonomy.corrections.map(correction => [correction.id, correction.to]));
const rows = parsed.data.map(row => ({ ...row, name: corrections.get(row.id) || row.nazwa_polska }));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'MemicardMushroomCourses/1.0 (educational Commons import)' } });
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) throw new Error(`HTTP ${response.status}: ${url}`);
    await pause(Math.min(30000, Number(response.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt));
  }
  throw new Error(`Failed after retries: ${url}`);
}
function plain(value = '') {
  return value.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
await fs.mkdir(imageDir, { recursive: true });
const metadataPath = `${generatorDataDir}/commons-metadata.json`;
let metadata;
if (offline) metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
else {
  metadata = {};
  for (let start = 0; start < rows.length; start += 25) {
    const batch = rows.slice(start, start + 25);
    const titles = batch.map(row => decodeURIComponent(new URL(row.image_source).pathname.split('/wiki/')[1]));
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800', titles: titles.join('|') });
    const data = await (await request(url)).json();
    if (!data.query) throw new Error(JSON.stringify(data));
    const pages = new Map(data.query.pages.map(page => [page.title, page]));
    for (const alias of [...(data.query.redirects || []), ...(data.query.normalized || [])].reverse()) pages.set(alias.from, pages.get(alias.to));
    batch.forEach((row, i) => {
      const info = pages.get(titles[i])?.imageinfo?.[0];
      if (!info) throw new Error(`Missing image: ${titles[i]}`);
      const ext = info.extmetadata;
      metadata[row.id] = { source: row.image_source, url: info.thumburl || info.url, originalUrl: info.url, sourceUrl: info.descriptionurl,
        author: plain(ext.Artist?.value), license: plain(ext.LicenseShortName?.value), licenseUrl: ext.LicenseUrl?.value?.replace(/^\/\//, 'https://') || '', title: plain(ext.ObjectName?.value) || pages.get(titles[i]).title.slice(5) };
    });
  }
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
}
// Stage 1 follows the requested order; stage 2 retains all 50 species.
const basicIds = [29, 1, 3, 2, 28, 4, 5, 11, 8, 6, 12, 13, 18, 7, 17, 34, 16, 10, 20, 44]
  .map(id => `grzyb_${String(id).padStart(3, '0')}`);
const recognition = [], credits = [], files = {};
for (const row of rows) {
  const info = metadata[row.id];
  if (!info || info.source !== row.image_source || !info.author || !info.license || (info.license !== 'Public domain' && !info.licenseUrl)) throw new Error(`Incomplete attribution: ${row.id}`);
  const extension = path.extname(new URL(info.url).pathname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) throw new Error(`Unsupported image: ${row.id}`);
  const filename = `${row.id}_${row.nazwa_lacinska.replace(/[^a-zA-Z0-9]+/g, '_')}${extension}`;
  const target = `${imageDir}/${filename}`;
  try { await fs.access(target); } catch {
    if (offline) throw new Error(`Missing offline image: ${target}`);
    let url = info.url;
    if (new URL(url).hostname === 'upload.wikimedia.org' && !new URL(url).pathname.includes('/thumb/')) {
      const relative = new URL(info.originalUrl).pathname.replace('/wikipedia/commons/', '');
      url = `https://thumb.wikimedia.org/wikipedia/commons/thumb/${relative}/960px-${relative.split('/').at(-1)}`;
    }
    const response = await request(url);
    if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Not an image: ${url}`);
    await fs.writeFile(`${target}.tmp`, Buffer.from(await response.arrayBuffer()));
    await fs.rename(`${target}.tmp`, target);
    await pause(500);
  }
  files[filename] = target;
  // Corrected taxonomy replaces erroneous Polish names; never accept the other species' name.
  const names = corrections.has(row.id) ? [row.name, row.nazwa_lacinska] : [row.nazwa_potoczna, row.nazwa_polska, row.back_name, row.back_scientific_name, row.nazwa_lacinska];
  const answers = [...new Map(names.filter(Boolean).map(name => [name.toLocaleLowerCase('pl'), name])).values()];
  recognition.push({ external_id: row.id, front_image: filename, back_text: answers.join('; ') });
  credits.push({ nr: row.id, nazwa_polska: row.name, nazwa_lacinska: row.nazwa_lacinska, nazwa_pliku: filename, link_do_obrazu_i_strony_licencji: info.sourceUrl, licencja: info.license, autor_do_atrybucji: info.author, link_do_tekstu_licencji: info.licenseUrl, tytul_do_atrybucji: info.title, opis_zmian: '' });
  console.log(`${row.id}: ${filename}`);
}
await fs.writeFile(`${dir}/rozpoznawanie.csv`, Papa.unparse(recognition) + '\n');
const cardsById = new Map(recognition.map(card => [card.external_id, card]));
const basicCards = basicIds.map(id => {
  const card = cardsById.get(id);
  if (!card) throw new Error(`Missing basic mushroom: ${id}`);
  return card;
});
await fs.writeFile(`${dir}/podstawowe.csv`, Papa.unparse(basicCards) + '\n');
const columns = Object.keys(credits[0]);
await fs.writeFile(`${dir}/attributions.tsv`, [columns.join('\t'), ...credits.map(row => columns.map(key => String(row[key]).replace(/[\t\r\n]+/g, ' ')).join('\t'))].join('\n') + '\n');
const creditsById = new Map(credits.map(credit => [credit.nr, credit]));
await fs.writeFile(`${dir}/attributions-podstawowe.tsv`, [columns.join('\t'), ...basicIds.map(id => columns.map(key => String(creditsById.get(id)[key]).replace(/[\t\r\n]+/g, ' ')).join('\t'))].join('\n') + '\n');
await fs.writeFile('Content/packs/images/mushrooms.json', JSON.stringify({ id: 'images_mushrooms', titleKey: 'contentDownload.mushrooms', files }, null, 2) + '\n');
console.log('Prepared progressive mushroom courses (20 and 50 cards) and their shared image pack.');
