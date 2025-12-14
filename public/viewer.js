const params = new URLSearchParams(location.search);
const comicSlug = params.get('comic');
const titleEl = document.getElementById('comicTitle');
const chapterSelect = document.getElementById('chapterSelect');
const viewerPages = document.getElementById('viewerPages');
const prevChapterBtn = document.getElementById('prevChapter');
const nextChapterBtn = document.getElementById('nextChapter');
let state = { chapters: [], currentChapterIdx: 0 };
let comicTitleStr = '';

function showError(msg) {
  titleEl.textContent = msg;
  viewerPages.innerHTML = `<p style="text-align:center;color:#6b7280;margin:20px 0">${msg}</p>`;
}


async function loadComic() {
  if (!comicSlug) {
    showError('No comic specified; add ?comic=official-dew-comic-website to the URL.');
    return;
  }
  // Static mode: hardcode chapters for this repo
  const comicMetaUrl = `/comics/${comicSlug}/meta.json`;
  try {
    const resp = await fetch(comicMetaUrl);
    if (!resp.ok) throw new Error('Comic meta not found');
    const meta = await resp.json();
    comicTitleStr = meta.title || comicSlug;
    titleEl.textContent = comicTitleStr;
    // List chapters (hardcoded for now, or you can generate a chapters.json)
    const chapters = [
      { slug: 'chapter-1', title: 'Chapter 1 - "wake up"', pagesCount: 2 },
      { slug: 'chapter-2', title: 'Chapter 2 coming soon', pagesCount: 4 }
    ];
    state.chapters = chapters;
    populateChapters(state.chapters);
    if (state.chapters.length) {
      const chapterParam = params.get('chapter');
      let startIdx = state.chapters.length - 1;
      if (chapterParam) {
        const found = state.chapters.findIndex(c => c.slug === chapterParam);
        if (found >= 0) startIdx = found;
      }
      loadChapter(startIdx);
    } else {
      viewerPages.innerHTML = '<p style="text-align:center;color:#6b7280;margin:20px 0">No chapters found for this comic.</p>';
    }
  } catch (err) {
    console.error('Failed to load comic:', err);
    showError('Failed to load comic data.');
  }
}

function populateChapters(chapters){
  chapterSelect.innerHTML = '';
  for (let i = chapters.length - 1; i >= 0; i--) {
    const c = chapters[i];
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${c.title} — ${c.pagesCount} pages`;
    chapterSelect.appendChild(opt);
  }
}


async function loadChapter(idx) {
  const chapter = state.chapters[idx];
  if (!chapter) return;
  state.currentChapterIdx = idx;
  chapterSelect.value = idx;
  try {
    // Static: load meta.json for chapter
    const metaUrl = `/comics/${comicSlug}/chapters/${chapter.slug}/meta.json`;
    let chapterMeta = { title: chapter.title };
    try {
      const resp = await fetch(metaUrl);
      if (resp.ok) chapterMeta = await resp.json();
    } catch (e) {}
    // List images for each chapter (hardcoded for now)
    let pages = [];
    if (chapter.slug === 'chapter-1') {
      pages = [ '1.jpg', '3.jpg' ];
    } else if (chapter.slug === 'chapter-2') {
      pages = [ '1.jpg', '2.jpg', '3.png', '4.png' ];
    }
    viewerPages.innerHTML = '';
    pages.forEach((fname,i)=>{
      const img = document.createElement('img');
      img.src = `/comics/${comicSlug}/chapters/${chapter.slug}/${fname}`;
      img.loading = 'lazy';
      viewerPages.appendChild(img);
      // Auto-fit logic
      const applyFit = () => {
        try {
          const containerWidth = viewerPages.clientWidth || window.innerWidth;
          if (img.naturalWidth && img.naturalWidth > containerWidth) img.style.maxWidth = '100%';
          else img.style.maxWidth = 'none';
        } catch(e) {}
      };
      img.addEventListener('load', () => applyFit());
      setTimeout(() => applyFit(), 50);
    });
    const chapterTitle = chapterMeta.title || chapter.title;
    titleEl.textContent = `${comicTitleStr} — ${chapterTitle}`;

    // set data attributes on the global logo so clicks can navigate chapters
    try {
      const logoEl = document.querySelector('.site-logo');
      if (logoEl) {
        logoEl.dataset.comic = comicSlug;
        logoEl.dataset.current = String(idx);
        logoEl.dataset.chapter = chapter.slug;
        logoEl.dataset.chapters = JSON.stringify(state.chapters.map(c => c.slug));
      }
    } catch (e) {}

    // update address bar with current chapter (no navigation)
    try {
      const url = new URL(location);
      url.searchParams.set('comic', comicSlug);
      url.searchParams.set('chapter', chapter.slug);
      history.replaceState(null, '', url);
    } catch (_) {}

    // update prev/next chapter
    prevChapterBtn.disabled = idx === 0;
    nextChapterBtn.disabled = idx >= state.chapters.length - 1;
  } catch (err) {
    console.error('Failed to load chapter:', err);
    showError('Failed to load chapter.');
  }
}

chapterSelect.addEventListener('change', (e)=> loadChapter(parseInt(e.target.value)));
prevChapterBtn.addEventListener('click', ()=> loadChapter(state.currentChapterIdx - 1));
nextChapterBtn.addEventListener('click', ()=> loadChapter(state.currentChapterIdx + 1));

// Automatically reevaluate whether to fit images on window resize
window.addEventListener('resize', ()=>{
  document.querySelectorAll('#viewerPages img').forEach(img=>{
    try {
      const containerWidth = viewerPages.clientWidth || window.innerWidth;
      if (img.naturalWidth && img.naturalWidth > containerWidth) img.style.maxWidth = '100%';
      else img.style.maxWidth = 'none';
    } catch(e) {}
  });
});

// keyboard navigation
window.addEventListener('keydown', (e)=>{
  if (e.key === 'ArrowLeft') { if (state.currentChapterIdx > 0) loadChapter(state.currentChapterIdx - 1); }
  if (e.key === 'ArrowRight') { if (state.currentChapterIdx < state.chapters.length - 1) loadChapter(state.currentChapterIdx + 1); }
});

loadComic();
