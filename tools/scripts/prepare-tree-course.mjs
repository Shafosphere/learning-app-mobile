import fs from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import path from 'node:path';
import Papa from 'papaparse';

// Run from the project root: node tools/scripts/prepare-tree-course.mjs
// Wikimedia metadata, rather than the provisional CSV licenses, is authoritative.
const input = 'tools/drzewa_europy_50_zdjecia_licencje.csv';
const dataDir = 'tools/prebuild-data/pl/przyroda/drzewa';
const imageDir = 'assets/learning/flashcards/trees';
// These older Commons pages have no machine-readable Artist field.
// Authors were checked against each file page's description/wikitext.
const legacyAuthors = {
  'File:Populus tremula leaf.jpg': 'Kuba G',
  'File:Populus alba leaf.jpg': 'MPF',
  'File:Quercus suber aka cork oak.jpg': 'Martin Olsson',
};
const parsed = Papa.parse(await fs.readFile(input, 'utf8'), {
  header: true, delimiter: ';', skipEmptyLines: true,
});
if (parsed.errors.length || parsed.data.length !== 50) throw new Error('Expected 50 valid tree records');
const entries = parsed.data.flatMap((row, index) => ['drzewa', 'liscia'].map((kind, part) => ({
  row, kind, id: String(index * 2 + part + 1).padStart(4, '0'),
  title: decodeURIComponent(new URL(row[`zrodlo_${kind}_commons`]).pathname.split('/wiki/')[1]),
  stem: `${String(index + 1).padStart(2, '0')}_${row.nazwa_lacinska.replace(/[^a-zA-Z0-9]+/g, '_')}_${part ? 'leaf' : 'tree'}`,
})));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'MemicardTreeCourse/1.0 (educational image import)' } });
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) throw new Error(`HTTP ${response.status}: ${url}`);
    await pause(Math.min(60000, Number(response.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt));
  }
  throw new Error(`Failed after retries: ${url}`);
}
function plain(value = '') {
  return value.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
const pages = new Map();
for (let start = 0; start < entries.length; start += 25) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '800', titles: entries.slice(start, start + 25).map(e => e.title).join('|') });
  const data = await (await request(url)).json();
  if (!data.query) throw new Error(JSON.stringify(data));
  for (const page of data.query.pages) pages.set(page.title, page);
  for (const alias of [...(data.query.redirects || []), ...(data.query.normalized || [])].reverse()) pages.set(alias.from, pages.get(alias.to));
}
await fs.mkdir(dataDir, { recursive: true });
await fs.mkdir(imageDir, { recursive: true });
const cards = [], credits = [], files = {};
for (const entry of entries) {
  const info = pages.get(entry.title)?.imageinfo?.[0];
  if (!info) throw new Error(`Missing image: ${entry.title}`);
  const metadata = info.extmetadata;
  const author = plain(metadata.Artist?.value) || legacyAuthors[pages.get(entry.title).title];
  const license = plain(metadata.LicenseShortName?.value);
  let licenseUrl = metadata.LicenseUrl?.value || '';
  if (licenseUrl.startsWith('//')) licenseUrl = `https:${licenseUrl}`;
  if (!author || !license || (license !== 'Public domain' && !licenseUrl)) throw new Error(`Incomplete attribution: ${entry.title}`);
  let url = info.thumburl || info.url;
  // Commons returns the original for small images; use the thumbnail service
  // consistently, including unscaled sources, to avoid original-file throttling.
  const downloadUrl = new URL(url);
  if (downloadUrl.hostname === 'upload.wikimedia.org' && !downloadUrl.pathname.includes('/thumb/')) {
    const original = new URL(info.url);
    const relative = original.pathname.replace('/wikipedia/commons/', '');
    url = `https://thumb.wikimedia.org/wikipedia/commons/thumb/${relative}/960px-${relative.split('/').at(-1)}`;
  }
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) throw new Error(`Unsupported image: ${url}`);
  const filename = `${entry.stem}${extension}`;
  const target = `${imageDir}/${filename}`;
  try { await fs.access(target); } catch {
    const response = await request(url);
    if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Not an image: ${url}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(`${target}.tmp`, buffer);
    await fs.rename(`${target}.tmp`, target);
    await pause(500);
  }
  files[filename] = target;
  cards.push({ external_id: entry.id, front_image: filename, back_text: [entry.row.nazwa_potoczna, entry.row.nazwa_formalna_pl, entry.row.nazwa_lacinska].join('; ') });
  credits.push({ nr: entry.id, nazwa_polska: `${entry.row.nazwa_formalna_pl} (${entry.kind === 'drzewa' ? 'drzewo' : 'liść / igły'})`, nazwa_lacinska: entry.row.nazwa_lacinska,
    nazwa_pliku: filename, link_do_obrazu_i_strony_licencji: info.descriptionurl, licencja: license, autor_do_atrybucji: author,
    link_do_tekstu_licencji: licenseUrl, tytul_do_atrybucji: plain(metadata.ObjectName?.value) || entry.title.slice(5), opis_zmian: '' });
  console.log(`${entry.id}/0100 ${filename}`);
}
await fs.writeFile(`${dataDir}/drzewa.csv`, Papa.unparse(cards) + '\n');
const columns = Object.keys(credits[0]);
await fs.writeFile(`${dataDir}/attributions.tsv`, [columns.join('\t'), ...credits.map(row => columns.map(key => String(row[key]).replace(/[\t\r\n]+/g, ' ')).join('\t'))].join('\n') + '\n');
await fs.writeFile('Content/packs/images/trees.json', JSON.stringify({ id: 'images_trees', titleKey: 'contentDownload.trees', files }, null, 2) + '\n');
console.log('Prepared 100 cards, images and verified attributions.');
