export async function loadCommPage(root, Store, supabase) {
  root.innerHTML = `
  <div class="page-header">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="page-title">Institutional Communication</h1>
        <p class="page-description">Secure messaging node for placement alerts and institutional broadcasts.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary">Communication Preferences</button>
        <button class="btn btn-primary" onclick="showAnnModal()">Initialize Broadcast</button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-3" style="grid-template-columns: 1fr 2fr; gap:0; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; overflow:hidden; height:calc(100vh - 240px);">
    <!-- Sidebar: High Priority Telemetry -->
    <div style="border-right:1px solid var(--border-subtle); background:rgba(255,255,255,0.01); display:flex; flex-direction:column;">
      <div style="padding:20px; border-bottom:1px solid var(--border-subtle); font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; display:flex; justify-content:space-between; align-items:center;">
        Live Notifications
        <span class="status-pill status-danger" style="font-size:10px;">${Store.notifications.filter(n=>!n.read).length} New</span>
      </div>
      <div style="flex:1; overflow-y:auto;">
        ${Store.notifications.map(n => {
          const icons = { drive:'🎯', ai:'🤖', result:'✅', reminder:'⏰', alumni:'🎓' };
          return `
          <div style="padding:16px 20px; border-bottom:1px solid var(--border-subtle); cursor:pointer; background:${!n.read ? 'rgba(124,58,237,0.03)' : 'transparent'}; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='${!n.read ? 'rgba(124,58,237,0.03)' : 'transparent'}'">
            <div class="flex gap-3 items-start">
              <div style="width:32px; height:32px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;">${icons[n.type] || '📩'}</div>
              <div>
                <div style="font-size:13px; font-weight:700; color:${!n.read ? 'var(--text-main)' : 'var(--text-description)'};">${n.title}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:4px; line-height:1.4;">${n.desc}</div>
                <div style="font-size:10px; color:var(--text-muted); margin-top:8px;">${n.time}</div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Main: Strategic Broadcasts -->
    <div style="display:flex; flex-direction:column;">
      <div style="padding:20px; border-bottom:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:14px; font-weight:800; color:var(--text-main);">Strategic Broadcasts</div>
          <div style="font-size:11px; color:var(--text-muted);">Centralized placement office communications</div>
        </div>
        <div class="flex gap-2">
          <button class="status-pill status-success" style="font-size:10px; border:none; cursor:pointer;">All Signals</button>
          <button class="status-pill" style="font-size:10px; border:none; cursor:pointer; background:rgba(255,255,255,0.05); color:var(--text-muted);">Critical Only</button>
        </div>
      </div>

      <div style="flex:1; overflow-y:auto; padding:32px; display:flex; flex-direction:column; gap:20px;">
        ${[
          { pinned:true, status:'status-success', type:'New Drive', title:'ZOHO CORP — Application Workspace Open', body:'Zoho Corporation has initialized the recruitment cycle for Member Technical Staff (MTS). Compensation: 8-12 LPA. Eligibility: CSE, IT, ECE with CGPA ≥ 7.5. Deadline for commitment: June 25, 2025.', author:'TPO Office', time:'Today, 10:30 AM', target:'All Departments' },
          { pinned:false, status:'status-warning', type:'Institutional Event', title:'Strategic AI Resume Workshop', body:'An elite workshop focusing on ATS optimization and generative resume architecture will be conducted by industry specialists. Mandatory for final year candidates.', author:'Career Development Node', time:'Yesterday, 3:00 PM', target:'All Registered Students' },
          { pinned:false, status:'status-danger', type:'Critical Deadline', title:'Infosys Registration Expiry Notice', body:'Final notice: The application window for Infosys Systems Engineer roles expires at 23:59 on June 18, 2025. Failure to commit will result in disqualification from this cycle.', author:'Placement Coordination Node', time:'2 days ago', target:'CSE, IT, ECE' },
        ].map(a => `
          <div class="card" style="margin:0; border-color:${a.pinned ? 'var(--brand-primary)' : 'var(--border-subtle)'}; background:${a.pinned ? 'rgba(124,58,237,0.02)' : 'transparent'};">
            <div class="flex justify-between items-start" style="margin-bottom:12px;">
              <div>
                <span class="status-pill ${a.status}" style="font-size:9px; margin-bottom:8px;">${a.type}</span>
                <h4 style="font-size:15px; font-weight:800; color:var(--text-main);">${a.title}</h4>
              </div>
              ${a.pinned ? '<span style="font-size:14px;" title="Pinned Node">📌</span>' : ''}
            </div>
            <p style="font-size:13px; color:var(--text-description); line-height:1.6; margin-bottom:16px;">${a.body}</p>
            <div class="flex gap-4" style="padding-top:16px; border-top:1px solid var(--border-subtle); font-size:11px; color:var(--text-muted);">
              <span>👤 ${a.author}</span>
              <span>🕐 ${a.time}</span>
              <span>🏛️ ${a.target}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="padding:20px; border-top:1px solid var(--border-subtle); background:rgba(255,255,255,0.01);">
        <div class="flex gap-3">
          <input class="input" style="height:44px; border-radius:10px; font-size:13px;" placeholder="Transmit query to support node...">
          <button class="btn btn-primary" style="height:44px; padding:0 24px; border-radius:10px;" onclick="alert('Query transmitted to support registry.')">Transmit →</button>
        </div>
      </div>
    </div>
  </div>
  `;

  window.showAnnModal = () => alert('Broadcast initialization node is restricted to authorized personnel.');
}
