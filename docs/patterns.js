document.addEventListener('DOMContentLoaded', async () => {
  try {
    const resp = await fetch('/api/patterns', { cache: 'no-store' });
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.files && data.files.length) {
      const url = data.files[0].url; // pick first pattern
      document.documentElement.style.setProperty('--pattern-url', `url('${url}')`);
      // color matches the top blue; use a translucent variant
      document.documentElement.style.setProperty('--pattern-color', 'rgba(2,24,58,0.12)');
      document.documentElement.style.setProperty('--pattern-opacity', '0.18');
      document.body.classList.add('has-pattern');
    }
  } catch (e) {
    console.warn('Failed to load patterns', e);
  }
});
