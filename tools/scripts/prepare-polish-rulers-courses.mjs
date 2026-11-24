import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Buffer } from 'node:buffer';
import Papa from 'papaparse';

const run = promisify(execFile);
// Run from any directory. --offline rebuilds from cached metadata and source thumbnails.
// --fetch-only downloads sources for review before producing course assets.
// Crop coordinates refer to the original Commons dimensions, not thumbnail pixels.
const root = fileURLToPath(new URL('../../', import.meta.url));
const dataDir = path.join(root, 'tools/scripts/data/polish-rulers');
const imageDir = path.join(root, 'assets/learning/flashcards/polish-rulers');
const outputDir = path.join(root, 'tools/prebuild-data/pl/historia/wladcy_polski');
const offline = process.argv.includes('--offline');
const fetchOnly = process.argv.includes('--fetch-only');
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJson = (file, value) => fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
const parsed = Papa.parse(await fs.readFile(path.join(root, 'tools/wladcy_polski.csv'), 'utf8'), { header: true, skipEmptyLines: true });
if (parsed.errors.length || parsed.data.length !== 48) throw new Error('Expected 48 valid rulers');
const rows = parsed.data.sort((a, b) => Number(a.kolejnosc_pierwszego_objecia_wladzy) - Number(b.kolejnosc_pierwszego_objecia_wladzy));
if (new Set(rows.map(row => row.id)).size !== 48 || rows.some(row => !/^[a-z0-9-]+$/.test(row.id) || !row.nazwa || !row.lata_panowania || !['True', 'False'].includes(row.fiszka_dat_panowania_bez_uwag))) {
  throw new Error('Invalid or duplicate ruler record');
}
const overrides = await json(path.join(dataDir, 'sources.json'));
const titleFor = row => overrides[row.id]?.title || decodeURIComponent(new URL(row.portret_strona).pathname.split('/wiki/')[1]);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function request(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { 'User-Agent': 'MemicardPolishRulers/1.0 (educational Commons import)' } });
      if (response.ok) return response;
      if (response.status !== 429 && response.status < 500) throw new Error(`HTTP ${response.status}: ${url}`);
      await pause(Math.min(30000, Number(response.headers.get('retry-after')) * 1000 || 2000 * 2 ** attempt));
    } catch (error) {
      if (String(error.message).startsWith('HTTP ') || attempt === 4) throw error;
      await pause(1000 * 2 ** attempt);
    }
  }
  throw new Error(`Failed after retries: ${url}`);
}
function plain(value = '') {
  return value.replace(/<[^>]*>/g, '').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
await fs.mkdir(path.join(imageDir, 'source'), { recursive: true });
const metadataPath = path.join(dataDir, 'commons-metadata.json');
let metadata;
if (offline) metadata = await json(metadataPath);
else {
  metadata = {};
  for (let start = 0; start < rows.length; start += 12) {
    const batch = rows.slice(start, start + 12);
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', redirects: '1', prop: 'imageinfo|revisions', iiprop: 'url|extmetadata|size|sha1|timestamp', rvprop: 'content', rvslots: 'main', titles: batch.map(titleFor).join('|') });
    const result = await (await request(url)).json();
    if (!result.query) throw new Error(JSON.stringify(result));
    const pages = new Map(result.query.pages.map(page => [page.title, page]));
    for (const alias of [...(result.query.redirects || []), ...(result.query.normalized || [])].reverse()) pages.set(alias.from, pages.get(alias.to));
    for (const row of batch) {
      const page = pages.get(titleFor(row));
      const info = page?.imageinfo?.[0];
      if (!info) { console.error(`Missing source: ${row.id}: ${titleFor(row)}`); continue; }
      metadata[row.id] = { requestedTitle: titleFor(row), title: page.title, ...info, wikitext: page.revisions?.[0]?.slots?.main?.content || '' };
    }
  }
  await writeJson(metadataPath, metadata);
}
for (const row of rows) {
  const info = metadata[row.id];
  if (!info) continue;
  if (info.requestedTitle !== titleFor(row)) throw new Error(`Stale metadata: ${row.id}`);
  const extension = path.extname(new URL(info.url).pathname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) throw new Error(`Unsupported source: ${info.url}`);
  info.localSource = `${row.id}_${info.sha1}${extension}`;
  const target = path.join(imageDir, 'source', info.localSource);
  try { await fs.access(target); } catch {
    if (offline) throw new Error(`Missing offline source: ${target}`);
    // Commons throttles original-file URLs. Use its supported 960px thumbnail
    // service, then cap final dimensions at the original size (no upscaling).
    const original = new URL(info.url);
    const relative = original.pathname.replace('/wikipedia/commons/', '');
    const response = await request(`https://thumb.wikimedia.org/wikipedia/commons/thumb/${relative}/960px-${relative.split('/').at(-1)}`);
    if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Not an image: ${info.url}`);
    await fs.writeFile(`${target}.tmp`, Buffer.from(await response.arrayBuffer()));
    await fs.rename(`${target}.tmp`, target);
    await pause(250);
  }
  console.log(`${row.id}: ${info.width}x${info.height}, ${plain(info.extmetadata.LicenseShortName?.value)}`);
}
if (!offline) await writeJson(metadataPath, metadata);
if (fetchOnly) process.exit(Object.keys(metadata).length === rows.length ? 0 : 1);
if (Object.keys(metadata).length !== rows.length) throw new Error('Resolve missing sources before generating courses');
const reviews = await json(path.join(dataDir, 'image-reviews.json'));
const portraits = [], portraitsDates = [], dates = [], credits = [], files = {};
for (const row of rows) {
  const info = metadata[row.id], review = reviews[row.id];
  if (!review?.checked || review.sourceTitle !== info.title || review.sourceSha1 !== info.sha1 || !review.author || !review.note) throw new Error(`Unreviewed source: ${row.id}`);
  const license = plain(info.extmetadata.LicenseShortName?.value);
  const licenseUrl = info.extmetadata.LicenseUrl?.value?.replace(/^\/\//, 'https://') || '';
  if (!['Public domain', 'CC0', 'CC BY 4.0', 'CC BY-SA 4.0', 'CC BY 3.0', 'CC BY-SA 3.0'].includes(license)
    || (license !== 'Public domain' && !licenseUrl)) throw new Error(`Unsupported or incomplete license: ${row.id}: ${license}`);
  const filename = `${row.id}.webp`;
  const output = path.join(imageDir, filename);
  const source = path.join(imageDir, 'source', info.localSource);
  const [downloadWidth, downloadHeight] = (await run('magick', ['identify', '-format', '%w %h', source])).stdout.split(' ').map(Number);
  const args = [source, '-auto-orient'];
  if (review.crop) {
    const { width, height, x, y } = review.crop;
    if (![width, height, x, y].every(Number.isInteger) || width <= 0 || height <= 0 || x < 0 || y < 0 || x + width > info.width || y + height > info.height) throw new Error(`Invalid crop: ${row.id}`);
    args.push('-crop', `${Math.round(width * downloadWidth / info.width)}x${Math.round(height * downloadHeight / info.height)}+${Math.round(x * downloadWidth / info.width)}+${Math.round(y * downloadHeight / info.height)}`, '+repage');
  }
  args.push('-resize', `${Math.min(800, review.crop?.width || info.width)}x${Math.min(800, review.crop?.height || info.height)}>`, '-strip', '-quality', '80', '-define', 'webp:method=6', `${output}.tmp.webp`);
  await run('magick', args);
  await fs.rename(`${output}.tmp.webp`, output);
  files[filename] = path.relative(root, output).split(path.sep).join('/');
  const answers = [...new Map([row.nazwa, ...row.aliasy.split(';')].map(name => name.trim()).filter(Boolean).map(name => [name.toLocaleLowerCase('pl'), name])).values()];
  const periods = row.lata_panowania.split(';').map(period => period.trim()).filter(Boolean);
  const explanation = periods.length > 1 ? `Pełne lata panowania: ${periods.join(' oraz ')}.` : '';
  const common = { external_id: row.id, back_text: answers.join('; '), flip: 'false', explanation };
  const image = `asset://images_polish_rulers/${filename}`;
  portraits.push({ ...common, front_image: image, front_text: '' });
  portraitsDates.push({ ...common, front_image: image, front_text: row.lata_panowania });
  if (row.fiszka_dat_panowania_bez_uwag === 'True') dates.push({ ...common, front_text: row.lata_panowania });
  const changes = { pl: `${review.crop ? 'Wykadrowano obraz. ' : ''}Zachowano proporcje, zmniejszono do maksymalnie 800 × 800 px bez powiększania i przekonwertowano do WebP (jakość 80).`, en: `${review.crop ? 'Cropped the image. ' : ''}Preserved aspect ratio, resized to at most 800 × 800 px without upscaling, and converted to WebP (quality 80).` };
  credits.push({ nr: row.id, nazwa_polska: row.nazwa, nazwa_lacinska: '', nazwa_pliku: filename, link_do_obrazu_i_strony_licencji: info.descriptionurl, licencja: license, autor_do_atrybucji: review.author, link_do_tekstu_licencji: licenseUrl, tytul_do_atrybucji: plain(info.extmetadata.ObjectName?.value) || info.title.slice(5), opis_zmian: changes.pl, opis_zmian_en: changes.en });
}
if (dates.length !== 29 || new Set(dates.map(card => card.front_text)).size !== dates.length) throw new Error('Expected 29 distinct date prompts');
await fs.mkdir(outputDir, { recursive: true });
for (const [name, cards] of [['portrety', portraits], ['portrety_daty', portraitsDates], ['daty', dates]]) await fs.writeFile(path.join(outputDir, `${name}.csv`), Papa.unparse(cards, { newline: '\n' }) + '\n');
const columns = Object.keys(credits[0]);
await fs.writeFile(path.join(outputDir, 'attributions.tsv'), [columns.join('\t'), ...credits.map(row => columns.map(key => String(row[key]).replace(/[\t\r\n]+/g, ' ')).join('\t'))].join('\n') + '\n');
await writeJson(path.join(root, 'Content/packs/images/polish-rulers.json'), { id: 'images_polish_rulers', titleKey: 'contentDownload.polishRulers', files });
console.log('Prepared 48 portrait cards, 48 portrait/date cards, 29 date cards, credits and one shared image pack.');
