document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.site-logo');
  if (!logo) return;
  let ticking = false;

  function checkVisibility() {
    const threshold = 160; // px from bottom
    const scrolledToBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - threshold);
    if (scrolledToBottom) {
      if (!logo.classList.contains('visible')) console.info('Logo: becoming visible (scrolledToBottom true)');
      logo.classList.add('visible');
    } else {
      if (logo.classList.contains('visible')) console.info('Logo: hiding (scrolledToBottom false)');
      logo.classList.remove('visible');
    }
    ticking = false;
  }

  function scheduleCheck() {
    if (!ticking) {
      window.requestAnimationFrame(checkVisibility);
      ticking = true;
    }
  }

  window.addEventListener('scroll', scheduleCheck, { passive: true });
  window.addEventListener('resize', scheduleCheck);

  // initial check
  scheduleCheck();
  // run a couple more checks after short delays to handle layout shifts
  setTimeout(scheduleCheck, 500);
  setTimeout(scheduleCheck, 1500);

  // Observe DOM changes in case content is loaded later (e.g., images), then re-check
  try {
    const mo = new MutationObserver(scheduleCheck);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  // Look for a custom logo in public/assets/custom-logo
  const logoFilenames = [
    'logo.svg', 'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg', 'logo.gif'
  ];

  async function findCustomLogo() {
    for (const fname of logoFilenames) {
      const url = `/assets/custom-logo/${fname}`;
      try {
        // Use HEAD first for efficiency
        const resp = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (resp.ok) return url;
      } catch (e) {
        try {
          const resp2 = await fetch(url, { method: 'GET', cache: 'no-store' });
          if (resp2.ok) return url;
        } catch (e2) {
          // continue to next
        }
      }
    }
    return null;
  }

  // attempt to preload potential custom logo images and use the first that loads successfully
  async function preloadFirstWorkingLogo() {
    // Prefer server-side listing
    try {
      const resp = await fetch('/api/custom-logo', { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data.files && data.files.length) {
          for (const f of data.files) {
            const url = f.url;
            try {
              await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('failed to load ' + url));
                img.src = url;
              });
              // success
              logo.setAttribute('src', url);
              logo.classList.remove('filter-white');
              console.info('Using custom logo (from API):', url);
              return true;
            } catch (e) {
              console.warn('Custom logo failed to load:', url, e.message);
              continue;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch /api/custom-logo', e.message);
    }

    // Fallback: try the standard candidate filenames in order
    for (const fname of logoFilenames) {
      const url = `/assets/custom-logo/${fname}`;
      try {
        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('failed to load ' + url));
          img.src = url;
        });
        logo.setAttribute('src', url);
        logo.classList.remove('filter-white');
        console.info('Using custom logo (fallback):', url);
        return true;
      } catch (e) {
        // try next
      }
    }

    return false;
  }

  (async () => {
    const ok = await preloadFirstWorkingLogo();
    if (!ok) {
      // If the default logo is a bitmap, apply filter to make it white for dark background
      try {
        const src = logo.getAttribute('src') || '';
        const lower = src.toLowerCase();
        if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif')) {
          logo.classList.add('filter-white');
        }
      } catch (e) { }
    }

    // clicking the logo should navigate to the next chapter when possible
    logo.addEventListener('click', async (e) => {
      // If viewer data exists on the logo, navigate to next chapter
      const comic = logo.dataset.comic;
      const chaptersJson = logo.dataset.chapters;
      const currentIdx = Number(logo.dataset.current || 0);
      if (comic && chaptersJson) {
        try {
          const chapters = JSON.parse(chaptersJson);
          let nextIdx = currentIdx + 1;
          if (nextIdx >= chapters.length) nextIdx = 0; // wrap to first
          const nextSlug = chapters[nextIdx];
          location.href = `/viewer.html?comic=${encodeURIComponent(comic)}&chapter=${encodeURIComponent(nextSlug)}`;
          return;
        } catch (e) { }
      }

      // Otherwise, go to first comic's first chapter
      try {
        const resp = await fetch('/api/comics', { cache: 'no-store' });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.comics && data.comics.length) {
          const slug = data.comics[0].slug;
          // fetch comic details to find first chapter
          const cresp = await fetch(`/api/comics/${encodeURIComponent(slug)}`, { cache: 'no-store' });
          if (!cresp.ok) return;
          const cdata = await cresp.json();
          if (cdata.chapters && cdata.chapters.length) {
            const first = cdata.chapters[0].slug;
            location.href = `/viewer.html?comic=${encodeURIComponent(slug)}&chapter=${encodeURIComponent(first)}`;
          } else {
            location.href = `/viewer.html?comic=${encodeURIComponent(slug)}`;
          }
        }
      } catch (e) {
        console.error('Failed to navigate via logo click', e);
      }
    });
  })();

});
