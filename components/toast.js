// ============================================================
// PLACENIX — TOAST NOTIFICATION SYSTEM
// ============================================================

let toastContainer;

export function initToast() {
  toastContainer = document.getElementById('toast-container');
}

export function showToast(message, type = 'info', duration = 3500) {
  if (!toastContainer) toastContainer = document.getElementById('toast-container');

  const icons = {
    success: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    danger:  `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };
  const colors = { success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="color:${colors[type]};flex-shrink:0;">${icons[type]}</span>
    <span style="font-size:var(--text-sm);color:var(--text-primary);flex:1;">${message}</span>
    <button onclick="this.closest('.toast').remove()" style="color:var(--text-muted);flex-shrink:0;">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>`;

  toastContainer?.appendChild(toast);
  setTimeout(() => toast.style.animation = 'slideUp 0.3s ease reverse', duration - 300);
  setTimeout(() => toast.remove(), duration);
}
