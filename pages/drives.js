// ============================================================
// PLACENIX — PLACEMENT OPPORTUNITIES REGISTRY (v2.4)
// ============================================================

export async function loadDrivesPage(root, Store, supabase) {
  root.innerHTML = `
  <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
    
    <!-- Header Node -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Recruitment Pipeline</div>
        <h1 class="h1-ent" style="font-size:32px;">Institutional Opportunities</h1>
        <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Automated drive management and recruitment pipeline telemetry.</p>
      </div>
      <div style="display:flex; gap:16px;">
        <button class="btn-premium-ghost" style="padding:12px 24px; border-radius:12px;">Filter Registry</button>
        <button class="btn-premium" style="padding:12px 24px; border-radius:12px; font-weight:700;" onclick="showCreateDriveModal()">Initialize New Drive</button>
      </div>
    </div>

    <!-- Executive Summary Grid -->
    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
      <div class="card-ent" style="padding:32px;">
        <div class="label-ent" style="margin-bottom:12px; font-size:10px;">TOTAL DRIVES</div>
        <div class="metric-ent" style="font-size:32px;">24</div>
      </div>
      <div class="card-ent" style="padding:32px;">
        <div class="label-ent" style="margin-bottom:12px; font-size:10px;">ACTIVE CANDIDATES</div>
        <div class="metric-ent" style="font-size:32px;">1,420</div>
      </div>
      <div class="card-ent" style="padding:32px;">
        <div class="label-ent" style="margin-bottom:12px; font-size:10px;">PLACEMENT RATE</div>
        <div class="metric-ent" style="font-size:32px; color:var(--brand-secondary);">82.4%</div>
      </div>
      <div class="card-ent" style="padding:32px;">
        <div class="label-ent" style="margin-bottom:12px; font-size:10px;">AVG PACKAGE</div>
        <div class="metric-ent" style="font-size:32px;">₹12.4 <span style="font-size:14px; opacity:0.5;">LPA</span></div>
      </div>
    </div>

    <!-- Opportunity Grid -->
    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 32px;" id="drive-cards-container"></div>

    <!-- Drive Initiation Modal -->
    <div id="drive-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); z-index:1000; align-items:center; justify-content:center; padding:40px;">
      <div class="card-ent" style="max-width:720px; width:100%; padding:48px; position:relative;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
          <h3 class="h2-ent" style="font-size:24px;">Initialize Opportunity Node</h3>
          <button style="background:none; border:none; color:var(--text-description); cursor:pointer; font-size:24px;" onclick="document.getElementById('drive-modal').style.display='none'">✕</button>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
          <div class="input-node"><label class="label-ent" style="color:#fff;">Organization Name</label><input class="input-ent" placeholder="e.g. Goldman Sachs"></div>
          <div class="input-node"><label class="label-ent" style="color:#fff;">Job Designation</label><input class="input-ent" placeholder="Quantitative Analyst"></div>
          <div class="input-node"><label class="label-ent" style="color:#fff;">Compensation (LPA)</label><input class="input-ent" placeholder="e.g. 24.5"></div>
          <div class="input-node"><label class="label-ent" style="color:#fff;">Commencement Date</label><input class="input-ent" type="date"></div>
          <div class="input-node"><label class="label-ent" style="color:#fff;">Minimum CGPA Criterion</label><input class="input-ent" type="number" step="0.1" placeholder="8.5"></div>
          <div class="input-node"><label class="label-ent" style="color:#fff;">Work Location</label><input class="input-ent" placeholder="Hybrid / Bangalore"></div>
        </div>
        <div class="input-node" style="margin-top:32px;">
          <label class="label-ent" style="color:#fff;">Scope of Responsibilities</label>
          <textarea class="input-ent" style="height:140px; padding:16px;"></textarea>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:20px; margin-top:48px;">
          <button class="btn-premium-ghost" style="padding:14px 32px;" onclick="document.getElementById('drive-modal').style.display='none'">Discard Registry</button>
          <button class="btn-premium" style="padding:14px 40px;" onclick="handleCreateDrive()">Commence Broadcast →</button>
        </div>
      </div>
    </div>
  </div>

  <style>
    .btn-premium {
      background: var(--brand-primary); color: #fff; border: none; border-radius: 12px;
      font-weight: 700; cursor: pointer; transition: all 0.3s;
      box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
    }
    .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.1); }
    .btn-premium:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    
    .opportunity-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .opportunity-card:hover {
      transform: translateY(-8px);
      border-color: var(--brand-primary);
      box-shadow: 0 12px 32px rgba(0,0,0,0.4);
    }
    
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(1); opacity: 0.5;
    }
  </style>
  `;

  const allDrives = [...Store.drives];

  function renderDrives(drives) {
    const container = document.getElementById('drive-cards-container');
    if (!container) return;
    
    if (!drives.length) {
      container.innerHTML = `<div style="grid-column: span 3; padding:100px; text-align:center; color:var(--text-description);">No active recruitment drives matching your criteria.</div>`;
      return;
    }

    container.innerHTML = drives.map(d => {
      const applied = Store.studentProfile.applications.some(a => a.drive === d.company);
      const isClosed = d.status === 'Closed';
      
      return `
      <div class="card-ent opportunity-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:32px;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
            <div style="width:56px; height:56px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:24px;">${d.logo}</div>
            <div style="background:${d.status === 'Open' ? 'rgba(16,185,129,0.1)' : d.status === 'Upcoming' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}; 
                        color:${d.status === 'Open' ? 'var(--brand-secondary)' : d.status === 'Upcoming' ? 'var(--warning)' : 'var(--brand-primary)'}; 
                        padding:6px 14px; border-radius:100px; font-size:10px; font-weight:800; letter-spacing:0.05em;">
              ${d.status.toUpperCase()}
            </div>
          </div>
          <h4 class="h2-ent" style="font-size:20px; margin-bottom:4px;">${d.company}</h4>
          <p style="font-size:14px; color:var(--text-description);">${d.role} · <span style="opacity:0.5;">${d.type}</span></p>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:32px 0;">
            <div style="padding:16px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:16px;">
              <div class="label-ent" style="font-size:9px; margin-bottom:6px;">CTC PACKAGE</div>
              <div style="font-size:14px; font-weight:800; color:#fff;">${d.package}</div>
            </div>
            <div style="padding:16px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:16px;">
              <div class="label-ent" style="font-size:9px; margin-bottom:6px;">EXPIRY NODE</div>
              <div style="font-size:14px; font-weight:800; color:#fff;">${d.deadline}</div>
            </div>
          </div>
          
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:32px;">
            ${d.skills.map(s => `<span style="font-size:11px; padding:6px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:8px; color:var(--text-description); font-weight:600;">${s}</span>`).join('')}
          </div>
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:24px; border-top:1px solid var(--border-subtle);">
          <div style="font-size:12px; color:var(--text-description); font-weight:600;">${d.applicants} Total Applicants</div>
          ${applied ? 
            `<div style="color:var(--brand-secondary); font-size:12px; font-weight:800; display:flex; align-items:center; gap:6px;">
               <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
               ENGAGED
             </div>` : 
            `<button class="btn-premium" style="padding:8px 20px; font-size:12px;" ${isClosed ? 'disabled' : ''} onclick="applyToDrive('${d.id}', this)">${isClosed ? 'Closed' : 'Apply Now'}</button>`
          }
        </div>
      </div>`;
    }).join('');
  }

  renderDrives(allDrives);

  window.applyToDrive = (id, btn) => {
    btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" style="margin-right:6px;"><polyline points="20 6 9 17 4 12"/></svg> ENGAGED';
    btn.style.background = 'rgba(16,185,129,0.1)';
    btn.style.color = 'var(--brand-secondary)';
    btn.style.boxShadow = 'none';
    btn.disabled = true;
    alert('Application initialized and committed to the drive registry.');
  };

  window.showCreateDriveModal = () => document.getElementById('drive-modal').style.display = 'flex';
  window.handleCreateDrive = () => {
    document.getElementById('drive-modal').style.display = 'none';
    alert('Drive registered and broadcasted to eligible candidates.');
  };
}
