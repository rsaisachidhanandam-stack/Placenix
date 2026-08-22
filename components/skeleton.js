// ============================================================
// PLACENIX — THEMED HIGH-FIDELITY SKELETON LOADERS
// ============================================================

export function renderSkeleton(type = 'dashboard') {
  // Styles for pulsing animation and layout alignment
  const styles = `
    <style>
      .sk-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
        width: 100%;
        animation: sk-pulse 1.5s infinite ease-in-out;
      }
      .sk-pulse-element {
        background: linear-gradient(90deg, var(--glass-border-main) 25%, var(--glass-border-strong) 50%, var(--glass-border-main) 75%);
        background-size: 200% 100%;
        animation: sk-loading-glow 1.5s infinite;
        border-radius: 8px;
      }
      .sk-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }
      .sk-title {
        height: 32px;
        width: 250px;
      }
      .sk-subtitle {
        height: 16px;
        width: 180px;
        margin-top: 8px;
      }
      .sk-kpis {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        width: 100%;
      }
      .sk-kpi-card {
        height: 110px;
        border-radius: 14px;
      }
      .sk-body-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 20px;
        width: 100%;
      }
      @media (max-width: 768px) {
        .sk-body-grid {
          grid-template-columns: 1fr;
        }
      }
      .sk-main-card {
        height: 320px;
        border-radius: 14px;
      }
      .sk-side-card {
        height: 320px;
        border-radius: 14px;
      }
      .sk-list-item {
        height: 48px;
        margin-bottom: 12px;
        border-radius: 8px;
      }
      @keyframes sk-pulse {
        0%, 100% { opacity: 0.85; }
        50% { opacity: 0.6; }
      }
      @keyframes sk-loading-glow {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    </style>
  `;

  if (type === 'list' || type === 'table') {
    return `
      ${styles}
      <div class="sk-container">
        <div class="sk-header">
          <div>
            <div class="sk-pulse-element sk-title"></div>
            <div class="sk-pulse-element sk-subtitle"></div>
          </div>
          <div class="sk-pulse-element" style="height: 40px; width: 120px;"></div>
        </div>
        <div class="sk-pulse-element" style="height: 40px; width: 100%;"></div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${Array(6).fill(0).map(() => `<div class="sk-pulse-element sk-list-item"></div>`).join('')}
        </div>
      </div>
    `;
  }

  // Default: Dashboard skeleton
  return `
    ${styles}
    <div class="sk-container">
      <div class="sk-header">
        <div>
          <div class="sk-pulse-element sk-title"></div>
          <div class="sk-pulse-element sk-subtitle"></div>
        </div>
        <div class="sk-pulse-element" style="height: 40px; width: 100px;"></div>
      </div>
      <div class="sk-kpis">
        ${Array(4).fill(0).map(() => `<div class="sk-pulse-element sk-kpi-card"></div>`).join('')}
      </div>
      <div class="sk-body-grid">
        <div class="sk-pulse-element sk-main-card"></div>
        <div class="sk-pulse-element sk-side-card"></div>
      </div>
    </div>
  `;
}
