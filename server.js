const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

const COMICS_DIR = path.join(__dirname, 'comics');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(COMICS_DIR)) fs.mkdirSync(COMICS_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Redirect root to the viewer (default to official-dew-comic-website if present)
app.get('/', (req, res) => {
  // default to a known sample slug if available
  const sampleSlug = 'official-dew-comic-website';
  return res.redirect(`/viewer.html?comic=${encodeURIComponent(sampleSlug)}`);
});
app.use('/', express.static(PUBLIC_DIR));
app.use('/comics', express.static(COMICS_DIR));

function readDirSafe(dir) {
  try { return fs.readdirSync(dir); } catch (e) { return []; }
}

// List comics
app.get('/api/comics', (req, res) => {
  const comics = readDirSafe(COMICS_DIR).filter(name => {
    return fs.statSync(path.join(COMICS_DIR, name)).isDirectory();
  }).map(slug => {
    const comicDir = path.join(COMICS_DIR, slug);
    const metaPath = path.join(comicDir, 'meta.json');
    let meta = { slug, title: slug, description: '' };
    if (fs.existsSync(metaPath)) {
      try { meta = Object.assign(meta, JSON.parse(fs.readFileSync(metaPath)) ); } catch(e) { }
    }
    // Find a cover image (cover.png/jpg or first image of first chapter)
    let cover = '/icons/placeholder-cover.png';
    const coverFile = ['cover.png','cover.jpg','cover.jpeg','cover.svg'].find(f => fs.existsSync(path.join(comicDir, f)));
    if (coverFile) cover = `/comics/${slug}/${coverFile}`;
    else {
      const chaptersDir = path.join(comicDir, 'chapters');
      const chapters = readDirSafe(chaptersDir).filter(name => fs.statSync(path.join(chaptersDir, name)).isDirectory());
      if (chapters.length) {
        const files = readDirSafe(path.join(chaptersDir, chapters[0])).filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));
        if (files.length) cover = `/comics/${slug}/chapters/${chapters[0]}/${files[0]}`;
      }
    }
    return { slug, title: meta.title || slug, description: meta.description || '', cover };
  });
  res.json({ comics });
});

// Get comic details and chapters
app.get('/api/comics/:slug', (req, res) => {
  const slug = req.params.slug;
  const comicDir = path.join(COMICS_DIR, slug);
  if (!fs.existsSync(comicDir)) return res.status(404).json({ error: 'Comic not found' });
  const metaPath = path.join(comicDir, 'meta.json');
  let meta = { slug, title: slug, description: '' };
  if (fs.existsSync(metaPath)) {
    try { meta = Object.assign(meta, JSON.parse(fs.readFileSync(metaPath)) ); } catch(e) { }
  }
  const chaptersDir = path.join(comicDir, 'chapters');
  const chapterDirs = readDirSafe(chaptersDir).filter(name => fs.statSync(path.join(chaptersDir, name)).isDirectory());
  // Sort chapter dirs by numeric or lexicographic
  chapterDirs.sort((a,b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const chapters = chapterDirs.map(name => {
    const chapterPath = path.join(chaptersDir, name);
    const pages = readDirSafe(chapterPath).filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));
    pages.sort((a,b)=> a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    const chapterMetaPath = path.join(chapterPath, 'meta.json');
    let chapterMeta = { title: name };
    if (fs.existsSync(chapterMetaPath)) {
      try { chapterMeta = Object.assign(chapterMeta, JSON.parse(fs.readFileSync(chapterMetaPath)) ); } catch(e) {}
    }
    return { slug: name, title: chapterMeta.title || name, pagesCount: pages.length };
  });
  res.json({ meta, chapters });
});

// List pages in a chapter
app.get('/api/comics/:slug/chapters/:chapterSlug', (req, res) => {
  const { slug, chapterSlug } = req.params;
  const chapterPath = path.join(COMICS_DIR, slug, 'chapters', chapterSlug);
  if (!fs.existsSync(chapterPath)) return res.status(404).json({ error: 'Chapter not found' });
  const chapterMetaPath = path.join(chapterPath, 'meta.json');
  let chapterMeta = { title: chapterSlug };
  if (fs.existsSync(chapterMetaPath)) {
    try { chapterMeta = Object.assign(chapterMeta, JSON.parse(fs.readFileSync(chapterMetaPath)) ); } catch(e) {}
  }
  // Only expose public chapter fields (title)
  const publicChapterMeta = { title: chapterMeta.title || chapterSlug };
  const pages = readDirSafe(chapterPath)
    .filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f))
    .sort((a,b)=> a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    .map(f => ({ filename: f, url: `/comics/${slug}/chapters/${chapterSlug}/${f}` }));
  res.json({ slug, chapterSlug, meta: publicChapterMeta, pages });
});

// Provide a small placeholder image in public/icons
app.get('/icons/placeholder-cover.png', (req,res)=>{
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><rect width='100%' height='100%' fill='#f3f4f6'/><text x='50%' y='50%' fill='#9ca3af' font-size='28' font-family='Arial' dominant-baseline='middle' text-anchor='middle'>Placeholder Cover</text></svg>`;
  res.set('Content-Type','image/svg+xml');
  res.send(svg);
});

// List files in the custom logo folder so the frontend can pick any filename
app.get('/api/custom-logo', (req, res) => {
  const logoDir = path.join(PUBLIC_DIR, 'assets', 'custom-logo');
  if (!fs.existsSync(logoDir)) return res.json({ files: [] });
  const files = fs.readdirSync(logoDir).filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));
  files.sort();
  const list = files.map(f => ({ filename: f, url: `/assets/custom-logo/${encodeURIComponent(f)}` }));
  res.json({ files: list });
});

// List files in the patterns folder so the frontend can pick any filename
app.get('/api/patterns', (req, res) => {
  const patternDir = path.join(PUBLIC_DIR, 'assets', 'patterns');
  if (!fs.existsSync(patternDir)) return res.json({ files: [] });
  const files = fs.readdirSync(patternDir).filter(f => /\.(png|jpe?g|gif|webp|svg)$/i.test(f));
  files.sort();
  const list = files.map(f => ({ filename: f, url: `/assets/patterns/${encodeURIComponent(f)}` }));
  res.json({ files: list });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Comics server running at http://localhost:${PORT}`));
