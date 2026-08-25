// ============================================================
// PLACENIX — SERVER-SIDE RENDERING (SSR) & HYDRATION ENGINE
// Demonstrates:
// 1. Dynamic Server-Side HTML Rendering for Fast First Contentful Paint (FCP)
// 2. SEO Meta Tags & OpenGraph Graph Injection for Web Crawlers
// 3. Initial State Hydration Injection (window.__INITIAL_STATE__)
// 4. Semantic HTML Document Generation with Responsive Styling
// ============================================================

export const SsrEngine = {
  /**
   * Pre-renders the Recruitment Drives Catalog page on the server
   */
  renderDrivesPage: (drivesList, baseUrl = 'https://placenix.edu') => {
    const title = 'Campus Recruitment Drives 2026 | Placenix AI OS';
    const description = `Explore ${drivesList.length} active high-package placement opportunities from Google, Amazon, Zoho and more. Average package: 22.8 LPA.`;

    const drivesHtml = drivesList.map(drive => `
      <article class="ssr-card" id="drive-${drive.id}">
        <div class="ssr-card-header">
          <div>
            <span class="ssr-tier-badge">${drive.package_lpa >= 20 ? '🔥 Tier-1 Dream' : '⭐ Core Tech'}</span>
            <h2 class="ssr-company-title">${escapeHtml(drive.company)}</h2>
            <p class="ssr-role">${escapeHtml(drive.role)}</p>
          </div>
          <div class="ssr-package-badge">
            <span class="ssr-package-num">${drive.package_lpa}</span>
            <span class="ssr-package-unit">LPA</span>
          </div>
        </div>
        <div class="ssr-meta-grid">
          <div class="ssr-meta-item">
            <span class="ssr-meta-label">Min CGPA</span>
            <span class="ssr-meta-val">${drive.min_cgpa || '6.0'}</span>
          </div>
          <div class="ssr-meta-item">
            <span class="ssr-meta-label">Application Deadline</span>
            <span class="ssr-meta-val">${drive.deadline}</span>
          </div>
          <div class="ssr-meta-item">
            <span class="ssr-meta-label">Eligible Branches</span>
            <span class="ssr-meta-val">${(drive.eligible_depts || ['CSE', 'IT']).join(', ')}</span>
          </div>
        </div>
        <div class="ssr-footer">
          <span class="ssr-applicants-count">👥 ${drive.applicants || 0} candidates applied</span>
          <a href="/#drives" class="ssr-cta-btn">View Details & Apply &rarr;</a>
        </div>
      </article>
    `).join('');

    const initialState = {
      renderedAt: new Date().toISOString(),
      drivesCount: drivesList.length,
      drives: drivesList
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  
  <!-- Dynamic SEO & Crawler Meta Tags -->
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${baseUrl}/ssr/drives">

  <!-- OpenGraph / Social Cards -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${baseUrl}/ssr/drives">
  <meta property="og:site_name" content="Placenix Recruitment OS">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">

  <style>
    :root {
      --bg: #07090E;
      --card-bg: rgba(13, 20, 32, 0.85);
      --border: rgba(0, 200, 255, 0.18);
      --primary: #00C8FF;
      --accent: #6366F1;
      --text: #F8FAFC;
      --muted: #94A3B8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 40px 24px;
      min-height: 100vh;
    }
    .ssr-container {
      max-width: 1100px;
      margin: 0 auto;
    }
    .ssr-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .ssr-badge-pill {
      display: inline-block;
      background: rgba(0, 200, 255, 0.12);
      color: var(--primary);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      border: 1px solid rgba(0, 200, 255, 0.3);
    }
    h1 {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #FFFFFF 0%, var(--primary) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .ssr-subtitle {
      color: var(--muted);
      font-size: 16px;
      max-width: 600px;
      margin: 0 auto;
    }
    .ssr-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 24px;
    }
    .ssr-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .ssr-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
    }
    .ssr-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .ssr-tier-badge {
      font-size: 11px;
      font-weight: 700;
      color: #F59E0B;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ssr-company-title {
      font-size: 22px;
      font-weight: 700;
      margin-top: 2px;
    }
    .ssr-role {
      color: var(--muted);
      font-size: 14px;
    }
    .ssr-package-badge {
      background: linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(99, 102, 241, 0.2));
      border: 1px solid rgba(0, 200, 255, 0.3);
      padding: 8px 14px;
      border-radius: 12px;
      text-align: center;
    }
    .ssr-package-num {
      display: block;
      font-size: 22px;
      font-weight: 800;
      color: var(--primary);
      line-height: 1;
    }
    .ssr-package-unit {
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
    }
    .ssr-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: rgba(0, 0, 0, 0.3);
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 13px;
    }
    .ssr-meta-label {
      color: var(--muted);
      display: block;
      font-size: 11px;
      text-transform: uppercase;
    }
    .ssr-meta-val {
      font-weight: 600;
      color: #E2E8F0;
    }
    .ssr-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 14px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .ssr-applicants-count {
      font-size: 12px;
      color: var(--muted);
    }
    .ssr-cta-btn {
      background: var(--primary);
      color: #080A10;
      text-decoration: none;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      transition: opacity 0.2s ease;
    }
    .ssr-cta-btn:hover {
      opacity: 0.9;
    }
    .ssr-hydration-banner {
      margin-top: 40px;
      text-align: center;
      padding: 16px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      font-size: 13px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <div class="ssr-container">
    <header class="ssr-header">
      <div class="ssr-badge-pill">⚡ Server-Side Rendered (SSR) with Hydration</div>
      <h1>Active Campus Recruitment Drives</h1>
      <p class="ssr-subtitle">Pre-rendered on the server for instant page load, SEO indexability, and fast First Contentful Paint.</p>
    </header>

    <main class="ssr-grid">
      ${drivesHtml}
    </main>

    <footer class="ssr-hydration-banner">
      <span>🚀 Server Rendered at <strong>${initialState.renderedAt}</strong> &bull; Total Drives: <strong>${initialState.drivesCount}</strong> &bull; <a href="/#" style="color: var(--primary)">Launch Single Page App &rarr;</a></span>
    </footer>
  </div>

  <!-- Client-Side State Hydration Injection -->
  <script>
    window.__INITIAL_STATE__ = ${JSON.stringify(initialState)};
    console.log('[SSR Hydration] Initial state loaded successfully:', window.__INITIAL_STATE__);
  </script>
</body>
</html>`;
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
