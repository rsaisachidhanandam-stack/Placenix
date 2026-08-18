export async function loadCommPage(root, Store, supabase) {
  const route = window.location.hash.replace('#', '').replace('/', '').split('?')[0].toLowerCase();
  const studentName = Store.session.user.full_name || Store.session.user.name || 'srithikan s';

  window.handlePostQuery = (e) => {
    e.preventDefault();
    const title = document.getElementById('query-title')?.value?.trim();
    const body = document.getElementById('query-body')?.value?.trim();

    if (!title || !body) {
      showToast('Validation Exception: Title and Body are required.', 'warning');
      return;
    }

    const newQuery = {
      id: 'q_' + Date.now(),
      studentName: studentName,
      rollNo: Store.session.user.roll_number || Store.session.user.register_number || '1111111',
      title: title,
      body: body,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      response: ''
    };

    Store.queries.unshift(newQuery);
    saveStore();
    showToast('Query ticket transmitted to support registry successfully!', 'success');
    render();
  };

  const render = () => {
    if (route === 'queries') {
      const myQueries = (Store.queries || []).filter(q => {
        const cleanQ = (q.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const cleanS = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        return cleanQ && cleanS && (cleanQ.includes(cleanS) || cleanS.includes(cleanQ));
      });

      root.innerHTML = `
      <div class="page-header">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="page-title">Support & Query Center</h1>
            <p class="page-description">Submit queries to placement coordinators and track ticket resolution status.</p>
          </div>
        </div>
      </div>

      <div class="grid" style="display:grid; grid-template-columns: 1fr 1.8fr; gap:24px; margin-top:24px;">
        <!-- Left Column: Submit Ticket Form -->
        <div class="card" style="margin:0; height:fit-content; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; padding:24px;">
          <h3 style="font-size:18px; font-weight:800; color:white; margin-bottom:6px;">Submit Support Ticket</h3>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:20px;">Provide clear details so coordinators can assist you promptly.</p>
          
          <form id="query-submit-form" onsubmit="window.handlePostQuery(event)" style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Query Topic / Title</label>
              <input type="text" id="query-title" required placeholder="e.g. Inconsistent CGPA on portal" style="width:100%; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white; font-size:0.9rem;">
            </div>
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Detailed Description</label>
              <textarea id="query-body" required placeholder="Describe the issue or assistance needed..." rows="5" style="width:100%; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white; font-size:0.9rem; resize:vertical;"></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="height:44px; font-size:0.85rem; font-weight:800; border-radius:10px;">Transmit Query Ticket →</button>
          </form>
        </div>

        <!-- Right Column: Ticket Registry -->
        <div class="card" style="margin:0; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; padding:24px; min-height:480px; display:flex; flex-direction:column; gap:16px;">
          <div style="border-bottom:1px solid var(--border-subtle); padding-bottom:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:18px; font-weight:800; color:white;">Your Ticket Registry</h3>
            <span class="status-pill status-success" style="font-size:11px;">${myQueries.length} Tickets</span>
          </div>

          <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:16px; max-height:500px;">
            ${myQueries.length === 0 ? `
              <div style="text-align:center; padding:80px 16px; color:var(--text-muted); display:flex; flex-direction:column; align-items:center; gap:12px;">
                <div style="font-size:32px;">🎟️</div>
                <div style="font-weight:700; color:white;">No queries submitted yet</div>
                <p style="font-size:12.5px; max-width:320px; line-height:1.5;">You haven't submitted any support tickets. Use the form on the left to transmit a query.</p>
              </div>
            ` : myQueries.map(q => `
              <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:12px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                  <div>
                    <div style="font-weight:800; color:white; font-size:14.5px;">${q.title}</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Submitted on ${q.date}</div>
                  </div>
                  <span class="status-pill ${q.status === 'Resolved' ? 'status-success' : 'status-warning'}" style="font-size:9.5px; padding:4px 10px; border-radius:6px; font-weight:800;">
                    ${q.status.toUpperCase()}
                  </span>
                </div>
                <p style="font-size:12.5px; color:var(--text-description); line-height:1.6; margin-bottom:12px;">${q.body}</p>
                
                ${q.status === 'Resolved' ? `
                  <div style="background:rgba(124,58,237,0.05); border:1px solid rgba(124,58,237,0.15); border-radius:8px; padding:12px; margin-top:8px;">
                    <div style="font-size:10.5px; font-weight:800; color:var(--brand-primary); margin-bottom:4px;">👤 RESOLUTION DIRECTIVE:</div>
                    <p style="font-size:12px; color:white; line-height:1.5; margin:0;">${q.response}</p>
                  </div>
                ` : `
                  <div style="font-size:11px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                    <span>⏳</span> Waiting for placement coordinator response...
                  </div>
                `}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      `;
    } else {
      // Communication Hub view
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

      <div class="grid grid-cols-3" style="grid-template-columns: 1fr 2fr; gap:0; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; overflow:hidden; min-height:calc(100vh - 220px); height:auto;">
        <!-- Sidebar: Live Notifications -->
        <div style="border-right:1px solid var(--border-subtle); background:rgba(255,255,255,0.01); display:flex; flex-direction:column;">
          <div style="padding:20px; border-bottom:1px solid var(--border-subtle); font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; display:flex; justify-content:space-between; align-items:center;">
            Live Notifications
            <span class="status-pill status-danger" style="font-size:10px;">${Store.notifications.filter(n=>!n.read).length} New</span>
          </div>
          <div style="flex:1; overflow-y:auto;">
            ${Store.notifications.length === 0 ? `
              <div style="padding:48px 16px; text-align:center; color:var(--text-muted); font-size:12px;">
                No active notifications found in this cycle.
              </div>
            ` : Store.notifications.map(n => {
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
            ${Store.notifications.length === 0 ? `
              <div style="text-align:center; padding:48px 16px; color:var(--text-muted);">
                No strategic broadcasts published in this cycle.
              </div>
            ` : Store.notifications.map((n, idx) => {
              const typeLabels = { drive: 'New Drive', ai: 'AI Intelligence', result: 'Result Update', reminder: 'Critical Deadline', alumni: 'Alumni Network' };
              const statusClasses = { drive: 'status-success', ai: 'status-warning', result: 'status-success', reminder: 'status-danger', alumni: 'status-warning' };
              const authors = { drive: 'TPO Office', ai: 'AI Mentoring Node', result: 'Placement Coordination Node', reminder: 'Placement Coordination Node', alumni: 'Alumni Connect' };
              
              const label = typeLabels[n.type] || 'General Broadcast';
              const statusClass = statusClasses[n.type] || 'status-warning';
              const author = authors[n.type] || 'Placement Coordination Node';
              const pinned = idx === 0;
              
              return `
                <div class="card" style="margin:0; border-color:${pinned ? 'var(--brand-primary)' : 'var(--border-subtle)'}; background:${pinned ? 'rgba(124,58,237,0.02)' : 'transparent'};">
                  <div class="flex justify-between items-start" style="margin-bottom:12px;">
                    <div>
                      <span class="status-pill ${statusClass}" style="font-size:9px; margin-bottom:8px;">${label}</span>
                      <h4 style="font-size:15px; font-weight:800; color:var(--text-main);">${n.title}</h4>
                    </div>
                    ${pinned ? '<span style="font-size:14px;" title="Pinned Node">📌</span>' : ''}
                  </div>
                  <p style="font-size:13px; color:var(--text-description); line-height:1.6; margin-bottom:16px;">${n.desc}</p>
                  <div class="flex gap-4" style="padding-top:16px; border-top:1px solid var(--border-subtle); font-size:11px; color:var(--text-muted);">
                    <span>👤 ${author}</span>
                    <span>🕐 ${n.time}</span>
                    <span>🏛️ All Mapped Cohorts</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="padding:20px; border-top:1px solid var(--border-subtle); background:rgba(255,255,255,0.01);">
            <div style="font-size:12px; color:var(--text-description); text-align:center;">
              Need help? Go to the <a href="#queries" style="color:var(--brand-primary); font-weight:800; text-decoration:none;">Query Center</a> to submit support tickets.
            </div>
          </div>
        </div>
      </div>
      `;
    }
  };

  window.showAnnModal = () => alert('Broadcast initialization node is restricted to authorized personnel.');

  render();
}
