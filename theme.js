// ============================================================
// PLACENIX — THEME MANAGER (Dark/Light + Palette)
// Manages two independent axes:
//   1. data-theme   = "dark" | "light"
//   2. data-palette = "corporate" | "tech" | "premium" (optional)
//      When no palette is set, the original Emerald/Indigo theme applies.
// ============================================================

export function initTheme() {
  // ── Restore dark/light preference ──
  const saved = localStorage.getItem('placenix-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  // ── Restore palette preference ──
  const savedPalette = localStorage.getItem('placenix-palette') || '';
  if (savedPalette) {
    document.documentElement.setAttribute('data-palette', savedPalette);
  } else {
    document.documentElement.removeAttribute('data-palette');
  }

  // ── Listen for dark/light toggle clicks ──
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#theme-toggle-btn');
    if (btn) toggleTheme();
  });

  // ── Listen for palette switch clicks (delegated) ──
  document.addEventListener('click', (e) => {
    const swatch = e.target.closest('[data-palette-select]');
    if (swatch) {
      const name = swatch.getAttribute('data-palette-select');
      setPalette(name);
      // Update active state on all swatches
      document.querySelectorAll('[data-palette-select]').forEach(el => {
        el.classList.toggle('palette-swatch--active', el === swatch);
      });
    }
  });
}

export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('placenix-theme', next);

  // Update icon
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = next === 'dark'
      ? `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
      : `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
  }
}

/**
 * Set the active colour palette.
 * @param {"corporate"|"tech"|"premium"|"stormy"|null} name  Pass null to remove any palette (revert to default Emerald).
 */
export function setPalette(name) {
  if (name) {
    document.documentElement.setAttribute('data-palette', name);
    localStorage.setItem('placenix-palette', name);
  } else {
    document.documentElement.removeAttribute('data-palette');
    localStorage.removeItem('placenix-palette');
  }
}

/**
 * Get the currently active palette name (or null if using default).
 */
export function getActivePalette() {
  return document.documentElement.getAttribute('data-palette') || null;
}
