// ============================================================
// PLACENIX — NETWORK / OFFLINE MONITOR MODULE
// ============================================================

import { showToast } from './toast.js';

let isOffline = false;
let checkInterval = null;

async function checkRealOnlineStatus() {
  try {
    // Perform a cache-busted HEAD request to check actual connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    await fetch('/index.html?ping=' + Date.now(), { 
      method: 'HEAD', 
      cache: 'no-store',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (e) {
    return false;
  }
}

export function updateNetworkUI(online) {
  const existingBanner = document.getElementById('placenix-offline-banner');

  if (!online) {
    if (!isOffline) {
      isOffline = true;
      showToast('Network connection lost. Operating in offline mode.', 'danger', 4500);
    }

    if (!existingBanner) {
      const banner = document.createElement('div');
      banner.id = 'placenix-offline-banner';
      banner.className = 'offline-banner';
      banner.innerHTML = `
        <div class="offline-icon-container">
          <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.5M5 12.5a10.94 10.94 0 015.83-2.84M8.53 16.03a6 6 0 017 0M12 20h.01"/>
          </svg>
        </div>
        <span class="offline-banner-text">No internet connection — some features may be unavailable.</span>
      `;
      document.body.appendChild(banner);
      document.body.classList.add('offline-active');
    }
  } else {
    if (isOffline) {
      isOffline = false;
      showToast('Connection restored. Back online!', 'success', 3500);
    }

    if (existingBanner) {
      existingBanner.classList.add('slide-up');
      document.body.classList.remove('offline-active');
      setTimeout(() => {
        existingBanner.remove();
      }, 300);
    }
  }
}

export function initNetworkMonitor() {
  console.log('📡 Placenix: Calibrating Network Monitor...');

  // Set initial state
  const initialOnline = navigator.onLine;
  updateNetworkUI(initialOnline);

  // If initially online, verify with a real ping
  if (initialOnline) {
    checkRealOnlineStatus().then(realOnline => {
      updateNetworkUI(realOnline);
    });
  }

  // Event Listeners
  window.addEventListener('online', async () => {
    // Double check if connection is actually working
    const realOnline = await checkRealOnlineStatus();
    updateNetworkUI(realOnline);
  });

  window.addEventListener('offline', () => {
    updateNetworkUI(false);
  });

  // Periodic network verification
  checkInterval = setInterval(async () => {
    const realOnline = await checkRealOnlineStatus();
    // Only update if state changes
    if (realOnline !== !isOffline) {
      updateNetworkUI(realOnline);
    }
  }, 15000);
}
