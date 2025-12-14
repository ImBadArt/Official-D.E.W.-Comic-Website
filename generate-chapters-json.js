// This script scans the chapters folders and generates chapters.json automatically.
// Usage: Run with Node.js from your project root: node generate-chapters-json.js

const fs = require('fs');
const path = require('path');

const chaptersDir = path.join(__dirname, 'comics', 'official-dew-comic-website', 'chapters');
const outputJson = path.join(__dirname, 'comics', 'official-dew-comic-website', 'chapters.json');
const docsOutputJson = path.join(__dirname, 'docs', 'comics', 'official-dew-comic-website', 'chapters.json');

function isImage(filename) {
  return /\.(jpg|jpeg|png|gif)$/i.test(filename);
}

function getChapterMeta(chapterPath) {
  const metaPath = path.join(chapterPath, 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function main() {
  const chapters = [];
  const chapterFolders = fs.readdirSync(chaptersDir).filter(f => fs.statSync(path.join(chaptersDir, f)).isDirectory());
  chapterFolders.sort();
  for (const folder of chapterFolders) {
    const chapterPath = path.join(chaptersDir, folder);
    const files = fs.readdirSync(chapterPath);
    const images = files.filter(isImage).sort();
    const meta = getChapterMeta(chapterPath);
    chapters.push({
      slug: folder,
      title: meta.title || folder,
      pages: images
    });
  }
  fs.writeFileSync(outputJson, JSON.stringify(chapters, null, 2));
  // Also write to docs/ if it exists
  try {
    if (fs.existsSync(path.join(__dirname, 'docs'))) {
      fs.mkdirSync(path.dirname(docsOutputJson), { recursive: true });
      fs.writeFileSync(docsOutputJson, JSON.stringify(chapters, null, 2));
      console.log('Also wrote chapters.json to docs/comics/official-dew-comic-website/.');
    }
  } catch (e) {
    console.warn('Could not write to docs/ path:', e.message);
  }
  console.log('Generated chapters.json with', chapters.length, 'chapters.');
}

main();
