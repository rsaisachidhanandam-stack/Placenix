export async function loadDrivesPage(root, Store) {
  root.innerHTML = `
<style>
.drives-filters{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;}
.drive-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;}
.drive-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;padding:24px;transition:all .3s;cursor:pointer;}
.drive-card:hover{border-color:var(--border-glow);transform:translateY(-3px);box-shadow:var(--shadow-card-hover);}
.drive-card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}
.drive-company-logo{width:48px;height:48px;border-radius:12px;background:var(--bg-card-hover);border:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.drive-company-name{font-size:1rem;font-weight:700;color:var(--text-primary);}
.drive-role{font-size:.8rem;color:var(--text-secondary);}
.drive-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:14px 0;padding:14px;background:rgba(255,255,255,.02);border-radius:10px;}
.meta-item{display:flex;flex-direction:column;gap:2px;}
.meta-val{font-size:.8rem;font-weight:600;color:var(--text-primary);}
.meta-key{font-size:.7rem;color:var(--text-muted);}
.drive-skills{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;}
.drive-card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-subtle);}
.applicant-count{font-size:.8rem;color:var(--text-muted);}
</style>

<div class="page-header">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h1 class="page-title">Placement Drives</h1>
      <p class="page-subtitle">Discover and apply to top campus recruitment drives</p>
    </div>
    <button class="btn btn-primary" onclick="showCreateDriveModal()">+ Create Drive</button>
  </div>
</div>

<div class="drives-filters">
  ${['All','Open','Closed','Upcoming'].map((s,i)=>`<button class="chip ${i===0?'selected':''}" onclick="filterDrives('${s}',this)">${s}</button>`).join('')}
  ${['CSE','IT','ECE','EEE','MECH'].map(d=>`<button class="chip" onclick="filterDrives('${d}',this)">${d}</button>`).join('')}
  <div style="margin-left:auto;" class="search-bar" style="min-width:200px;">
    <span class="search-icon"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
    <input type="text" placeholder="Search drives…" id="drive-search" oninput="searchDrives(this.value)">
  </div>
</div>

<div class="drive-cards" id="drive-cards"></div>

<div id="drive-modal" style="display:none;" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
  <div class="modal" style="max-width:680px;" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h2 class="modal-title">Create Placement Drive</h2>
      <button onclick="document.getElementById('drive-modal').style.display='none'" class="btn-icon">
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
      <div class="input-group"><label class="input-label">Company Name</label><input class="input" placeholder="e.g. Google"></div>
      <div class="input-group"><label class="input-label">Job Role</label><input class="input" placeholder="Software Engineer"></div>
      <div class="input-group"><label class="input-label">Package (LPA)</label><input class="input" placeholder="e.g. 12-18"></div>
      <div class="input-group"><label class="input-label">Location</label><input class="input" placeholder="Bangalore, Remote"></div>
      <div class="input-group"><label class="input-label">Application Deadline</label><input class="input" type="date"></div>
      <div class="input-group"><label class="input-label">Min. CGPA</label><input class="input" type="number" step="0.1" placeholder="7.0"></div>
      <div class="input-group col-span-2" style="grid-column:span 2;"><label class="input-label">Eligible Departments</label><input class="input" placeholder="CSE, IT, ECE"></div>
      <div class="input-group" style="grid-column:span 2;"><label class="input-label">Job Description</label><textarea class="input" rows="3" placeholder="Describe the role, responsibilities, and requirements…" style="resize:vertical;"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('drive-modal').style.display='none'">Cancel</button>
      <button class="btn btn-primary" onclick="handleCreateDrive()">Create Drive →</button>
    </div>
  </div>
</div>`;

  let allDrives = [...Store.drives];

  function renderDrives(drives) {
    const container = document.getElementById('drive-cards');
    if (!container) return;
    if (!drives.length) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">No drives found</div><div class="empty-state-body">Try adjusting your filters</div></div>`;
      return;
    }
    container.innerHTML = drives.map(d => {
      const statusColor = d.status === 'Open' ? 'success' : d.status === 'Upcoming' ? 'info' : 'neutral';
      const applied = Store.studentProfile.applications.some(a => a.drive === d.company);
      return `
      <div class="drive-card animate-fade-in-up">
        <div class="drive-card-header">
          <div style="display:flex;gap:14px;align-items:center;">
            <div class="drive-company-logo">${d.logo}</div>
            <div><div class="drive-company-name">${d.company}</div><div class="drive-role">${d.role} · ${d.type}</div></div>
          </div>
          <span class="badge badge-${statusColor} badge-dot">${d.status}</span>
        </div>
        <div class="drive-meta">
          <div class="meta-item"><span class="meta-val">${d.package}</span><span class="meta-key">Package</span></div>
          <div class="meta-item"><span class="meta-val">${d.deadline}</span><span class="meta-key">Deadline</span></div>
          <div class="meta-item"><span class="meta-val">${d.minCgpa}+</span><span class="meta-key">Min CGPA</span></div>
          <div class="meta-item"><span class="meta-val">${d.eligible.join(', ')}</span><span class="meta-key">Departments</span></div>
        </div>
        <div class="drive-skills">
          ${d.skills.map(s=>`<span class="chip">${s}</span>`).join('')}
        </div>
        <div class="drive-card-footer">
          <span class="applicant-count">👥 ${d.applicants} applicants · ${d.shortlisted} shortlisted</span>
          ${d.status === 'Open'
            ? applied
              ? `<span class="badge badge-success">Applied ✓</span>`
              : `<button class="btn btn-primary btn-sm" onclick="applyToDrive('${d.id}',this)">Apply Now →</button>`
            : `<span class="badge badge-neutral">${d.status}</span>`}
        </div>
      </div>`;
    }).join('');
  }

  renderDrives(allDrives);

  window.filterDrives = (val, btn) => {
    document.querySelectorAll('.drives-filters .chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    if (val === 'All') renderDrives(allDrives);
    else if (['Open','Closed','Upcoming'].includes(val)) renderDrives(allDrives.filter(d => d.status === val));
    else renderDrives(allDrives.filter(d => d.eligible.includes(val)));
  };

  window.searchDrives = (q) => {
    const lq = q.toLowerCase();
    renderDrives(allDrives.filter(d => d.company.toLowerCase().includes(lq) || d.role.toLowerCase().includes(lq)));
  };

  window.applyToDrive = (id, btn) => {
    btn.textContent = 'Applied ✓';
    btn.className = 'badge badge-success';
    btn.disabled = true;
  };

  window.showCreateDriveModal = () => {
    document.getElementById('drive-modal').style.display = 'flex';
  };

  window.handleCreateDrive = () => {
    document.getElementById('drive-modal').style.display = 'none';
    alert('Drive created successfully!');
  };
}
