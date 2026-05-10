export async function loadAlumniPage(root, Store) {
  root.innerHTML = `
<style>
.alumni-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;}
.alumni-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;padding:24px;transition:all .3s;}
.alumni-card:hover{border-color:var(--border-glow);transform:translateY(-3px);box-shadow:var(--shadow-card-hover);}
.alumni-card-top{display:flex;gap:14px;align-items:flex-start;margin-bottom:16px;}
.alumni-avatar{width:52px;height:52px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1rem;color:#fff;flex-shrink:0;border:2px solid rgba(124,58,237,.4);}
.alumni-name{font-size:.95rem;font-weight:700;color:var(--text-primary);}
.alumni-role{font-size:.8rem;color:var(--text-secondary);}
.alumni-company{font-size:.78rem;color:var(--brand-cyan);font-weight:600;margin-top:2px;}
.alumni-expertise{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;}
.alumni-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:10px;background:rgba(255,255,255,.02);border-radius:8px;margin-bottom:14px;text-align:center;}
.alumni-stat-val{font-size:.9rem;font-weight:700;color:var(--text-primary);}
.alumni-stat-key{font-size:.65rem;color:var(--text-muted);}
.mentor-banner{background:linear-gradient(135deg,rgba(124,58,237,.12),rgba(34,211,238,.06));border:1px solid rgba(124,58,237,.2);border-radius:16px;padding:28px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center;}
.mentor-banner h3{font-family:var(--font-display);font-size:1.2rem;font-weight:700;}
.stars{color:#F59E0B;font-size:.8rem;}
</style>
<div class="page-header">
  <h1 class="page-title">Alumni Ecosystem</h1>
  <p class="page-subtitle">Connect with successful alumni for mentoring, referrals, and career guidance</p>
</div>

<div class="mentor-banner animate-fade-in-up">
  <div>
    <h3>🎓 Find Your Mentor</h3>
    <p style="color:var(--text-secondary);font-size:.875rem;margin-top:4px;">${Store.alumni.filter(a=>a.mentoring).length} alumni currently accepting mentoring requests · Avg response: 24h</p>
  </div>
  <div style="display:flex;gap:10px;">
    <div class="search-bar">
      <span class="search-icon"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
      <input type="text" placeholder="Search by name, company or skill…" id="alumni-search" oninput="searchAlumni(this.value)">
    </div>
    <select class="input" style="width:auto;font-size:.85rem;padding:8px 14px;" onchange="filterAlumni(this.value)">
      <option value="">All Companies</option>
      ${[...new Set(Store.alumni.map(a=>a.company))].map(c=>`<option>${c}</option>`).join('')}
    </select>
  </div>
</div>

<div class="alumni-grid" id="alumni-grid"></div>`;

  function renderAlumni(list) {
    document.getElementById('alumni-grid').innerHTML = list.map(a => `
      <div class="alumni-card animate-fade-in-up">
        <div class="alumni-card-top">
          <div class="alumni-avatar">${a.avatar}</div>
          <div style="flex:1;">
            <div class="alumni-name">${a.name}</div>
            <div class="alumni-role">${a.role}</div>
            <div class="alumni-company">@ ${a.company}</div>
            <div class="stars">${'★'.repeat(Math.floor(a.rating))} <span style="color:var(--text-muted);font-size:.75rem;">${a.rating} · Batch ${a.batch}</span></div>
          </div>
          ${a.mentoring ? '<span class="badge badge-success badge-dot" style="flex-shrink:0;">Mentoring</span>' : '<span class="badge badge-neutral" style="flex-shrink:0;">Closed</span>'}
        </div>
        <div class="alumni-expertise">
          ${a.expertise.map(e=>`<span class="chip">${e}</span>`).join('')}
        </div>
        <div class="alumni-stats">
          <div><div class="alumni-stat-val">${a.sessions}</div><div class="alumni-stat-key">Sessions</div></div>
          <div><div class="alumni-stat-val">${a.rating}</div><div class="alumni-stat-key">Rating</div></div>
          <div><div class="alumni-stat-val">${a.location.split(',')[0]}</div><div class="alumni-stat-key">Location</div></div>
        </div>
        <div style="display:flex;gap:8px;">
          ${a.mentoring
            ? `<button class="btn btn-primary btn-sm" style="flex:1;" onclick="requestMentor('${a.name}')">Request Mentoring →</button>`
            : `<button class="btn btn-secondary btn-sm" style="flex:1;" disabled>Not Available</button>`}
          <button class="btn btn-secondary btn-sm" onclick="alert('LinkedIn profile of ${a.name}')">🔗</button>
        </div>
      </div>`).join('');
  }

  renderAlumni(Store.alumni);

  window.searchAlumni = (q) => {
    const lq = q.toLowerCase();
    renderAlumni(Store.alumni.filter(a =>
      a.name.toLowerCase().includes(lq) || a.company.toLowerCase().includes(lq) ||
      a.expertise.some(e => e.toLowerCase().includes(lq))));
  };

  window.filterAlumni = (company) => {
    renderAlumni(company ? Store.alumni.filter(a => a.company === company) : Store.alumni);
  };

  window.requestMentor = (name) => {
    alert(`✅ Mentoring request sent to ${name}! They typically respond within 24 hours.`);
  };
}
