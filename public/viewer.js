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
    showError('No comic specified; open /viewer.html?comic=<slug> or visit root to see a sample.');
    return;
  }
  try {
    const resp = await fetch(`/api/comics/${encodeURIComponent(comicSlug)}`);
    if (!resp.ok) {
      showError('Comic not found.');
      return;
    }
    const data = await resp.json();
    comicTitleStr = data.meta.title || comicSlug;
    titleEl.textContent = comicTitleStr;
    state.chapters = data.chapters;
    populateChapters(state.chapters);
    if (state.chapters.length) {
      // If a specific chapter slug is requested via ?chapter=slug, load it.
      // By default, open the latest chapter (last index).
      const chapterParam = params.get('chapter');
      let startIdx = state.chapters.length - 1;
      if (chapterParam) {
        const found = state.chapters.findIndex(c => c.slug === chapterParam);
        if (found >= 0) startIdx = found;
      }
      loadChapter(startIdx);
    } else viewerPages.innerHTML = '<p style="text-align:center;color:#6b7280;margin:20px 0">No chapters found for this comic.</p>';
  } catch (err) {
    console.error('Failed to fetch comic:', err);
    showError('Failed to fetch comic — is the server running?');
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
    const resp = await fetch(`/api/comics/${encodeURIComponent(comicSlug)}/chapters/${encodeURIComponent(chapter.slug)}`);
    if (!resp.ok) { showError('Chapter not found'); return; }
    const data = await resp.json();
    viewerPages.innerHTML = '';
    data.pages.forEach((p,i)=>{
      const img = document.createElement('img');
      img.src = p.url;
      img.loading = 'lazy';
      viewerPages.appendChild(img);
      // Auto-detect whether to fit: if the image is wider than the viewer, fit it to width; else display at native size
      const applyFit = () => {
        try {
          const containerWidth = viewerPages.clientWidth || window.innerWidth;
          if (img.naturalWidth && img.naturalWidth > containerWidth) img.style.maxWidth = '100%';
          else img.style.maxWidth = 'none';
        } catch(e) {}
      };
      img.addEventListener('load', () => applyFit());
      // In case the image is already cached and load won't fire
      setTimeout(() => applyFit(), 50);
    });
    // use chapter meta title if provided
  const chapterTitle = (data.meta && data.meta.title) ? data.meta.title : chapter.title;
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
    console.error('Failed to fetch chapter:', err);
    showError('Failed to load chapter — is the server running?');
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
