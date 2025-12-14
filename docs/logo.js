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
  // Only use the explicitly set logo, do not override with custom-logo logic
  // Remove custom logo logic to avoid overriding DEW LOGO white.png

  // No custom logo logic needed; use the logo as set in the HTML
  (async () => {

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
          location.href = `https://imbadart.github.io/Official-D.E.W.-Comic-Website/viewer.html?comic=${encodeURIComponent(comic)}&chapter=${encodeURIComponent(nextSlug)}`;
          return;
        } catch (e) { }
      }

      // Otherwise, go to first comic's first chapter
      try {
        const resp = await fetch('api/comics', { cache: 'no-store' });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.comics && data.comics.length) {
          const slug = data.comics[0].slug;
          // fetch comic details to find first chapter
          const cresp = await fetch(`api/comics/${encodeURIComponent(slug)}`, { cache: 'no-store' });
          if (!cresp.ok) return;
          const cdata = await cresp.json();
          if (cdata.chapters && cdata.chapters.length) {
            const first = cdata.chapters[0].slug;
            location.href = `https://imbadart.github.io/Official-D.E.W.-Comic-Website/viewer.html?comic=${encodeURIComponent(slug)}&chapter=${encodeURIComponent(first)}`;
          } else {
            location.href = `https://imbadart.github.io/Official-D.E.W.-Comic-Website/viewer.html?comic=${encodeURIComponent(slug)}`;
          }
        }
      } catch (e) {
        console.error('Failed to navigate via logo click', e);
      }
    });
  })();

});
