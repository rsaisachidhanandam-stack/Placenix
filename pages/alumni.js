export async function loadAlumniPage(root, Store) {
  const role = Store.session?.role || 'student';

  const renderCard = (a) => {
    return `
      <div class="card-ent alumni-card" style="padding:24px; display:flex; flex-direction:column; gap:20px; transition:all 0.3s ease; border: 1px solid var(--border-main); background: var(--bg-card);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="width:48px; height:48px; background:linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover)); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:#ffffff !important; box-shadow: 0 4px 12px var(--brand-primary-glow);">${a.avatar}</div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            ${a.mentoring ? 
              `<span style="background:var(--brand-primary-light); border:1px solid var(--brand-primary-glow); color:var(--brand-primary); padding:4px 10px; border-radius:100px; font-size:9.5px; font-weight:800;">ACTIVE MENTOR</span>` : 
              `<span style="background:var(--data-bg); border:1px solid var(--border-subtle); color:var(--text-muted); padding:4px 10px; border-radius:100px; font-size:9.5px; font-weight:800;">OFFLINE</span>`
            }
            ${a.pushed ? 
              `<span style="background:var(--brand-primary-light); border:1px solid var(--brand-primary-glow); color:var(--brand-primary); padding:4px 10px; border-radius:100px; font-size:9.5px; font-weight:800; display:flex; align-items:center; gap:4px;">📢 RECOMMENDED</span>` : ''
            }
            <div style="font-size:11px; color:var(--text-description); font-weight:700; margin-top:2px;">Batch of ${a.batch}</div>
          </div>
        </div>

        <div>
          <h4 style="font-size:17px; font-weight:800; color:var(--text-main); letter-spacing:-0.01em; font-family:var(--font-display);">${a.name}</h4>
          <div style="font-size:13px; font-weight:600; color:var(--brand-primary); margin-top:2px;">${a.role} @ ${a.company}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:4px; display:flex; align-items:center; gap:6px;">
            <span>📍 ${a.location}</span>
          </div>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${a.expertise.map(e => `<span style="font-size:10px; padding:3px 10px; background:var(--data-bg); border:1px solid var(--border-subtle); border-radius:6px; color:var(--text-description); font-weight:600;">${e}</span>`).join('')}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; padding:16px; background:var(--data-bg-alt); border:1px solid var(--border-subtle); border-radius:12px;">
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--text-main); font-family:var(--font-display);">${a.sessions}</div>
            <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-top:2px;">Consultations</div>
          </div>
          <div style="border-left:1px solid var(--border-subtle); padding-left:12px;">
            <div style="font-size:14px; font-weight:800; color:var(--brand-primary); font-family:var(--font-display);">${a.rating} ★</div>
            <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-top:2px;">Global Rating</div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:10px; margin-top:auto;">
          <div style="display:flex; gap:10px; width:100%;">
            <button class="btn-premium" style="flex:1; height:36px; font-size:11px; border-radius:10px;" 
                    onclick="window.requestMentor('${a.name}')" ${!a.mentoring ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
              Initiate Consultation
            </button>
            <button class="btn-premium-ghost" style="width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px;"
                    onclick="window.open('https://linkedin.com', '_blank')">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </button>
          </div>
          ${role !== 'student' ? `
            <button class="btn-premium-push" style="height:36px; font-size:11px; border-radius:10px; width:100%; font-weight:700; cursor:pointer;" 
                    onclick="window.pushAlumni('${a.name}')" ${a.pushed ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
              ${a.pushed ? '📢 Broadcasted to Students' : '📢 Push to Students'}
            </button>
          ` : ''}
        </div>
      </div>
    `;
  };

  const renderUI = (list) => {
    root.innerHTML = `
    <div style="padding: 24px 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
      
      <!-- Operational Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:10px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.1em;">
            <span>Placenix</span>
            <span style="opacity:0.3;">/</span>
            <span style="color:var(--brand-primary);">Alumni Ecosystem</span>
          </div>
          <h1 class="h1-ent" style="font-size:24px;">Institutional Alumni Network</h1>
        </div>
        <div style="display:flex; gap:12px;">
          <div style="background:var(--bg-input); border:1px solid var(--border-main); padding:6px 14px; border-radius:10px; display:flex; align-items:center; gap:10px; width:280px;">
            <span style="opacity:0.4;">🔍</span>
            <input type="text" placeholder="Search elite network..." id="alumni-search" 
                   style="background:none; border:none; color:var(--text-main); font-size:12px; outline:none; width:100%; font-weight:500;">
          </div>
          <select id="alumni-filter" class="input-ent" style="width:160px; height:34px; font-size:11px; padding:0 10px;">
            <option value="">All Organizations</option>
            ${[...new Set(Store.alumni.map(a => a.company))].map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Verified Mentorship Banner -->
      <div class="card-ent" style="padding:20px 24px; background: var(--brand-primary-light); border:1px solid var(--brand-primary-glow); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="font-size:15px; font-weight:800; color:var(--text-main);">Verified Mentorship Gateway</h3>
          <p style="font-size:12px; color:var(--text-description); margin-top:2px;">${Store.alumni.filter(a => a.mentoring).length} industry professionals currently active in the mentorship registry.</p>
        </div>
        <div style="display:flex; -webkit-mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent); mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent); gap: -10px;">
           ${Store.alumni.slice(0, 5).map(a => `<div style="width:32px; height:32px; border-radius:50%; background:var(--brand-primary); border:2px solid var(--bg-card); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff !important; margin-left:-8px;">${a.avatar}</div>`).join('')}
        </div>
      </div>

      <!-- Alumni Registry Grid -->
      <div id="alumni-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px;">
        ${list.map(renderCard).join('')}
      </div>
    </div>

    <style>
      .alumni-card:hover { transform: translateY(-4px); border-color: var(--brand-primary-glow); box-shadow: var(--shadow-card-hover); }
      .input-ent { background: var(--bg-input); border: 1px solid var(--border-main); color: var(--text-main); border-radius: 8px; outline: none; transition: var(--t-fast); }
      .input-ent:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 3px var(--brand-primary-glow); }
      .btn-premium {
        background: var(--btn-primary-gradient, var(--brand-primary)); color: #ffffff !important; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s;
        box-shadow: var(--btn-primary-shadow, 0 4px 12px var(--brand-primary-glow));
      }
      .btn-premium:hover:not(:disabled) { background: var(--btn-primary-gradient-h, var(--brand-primary-hover)); transform: translateY(-1px); box-shadow: var(--btn-primary-shadow-h); }
      .btn-premium-ghost {
        background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-main);
        font-weight: 700; cursor: pointer; transition: all 0.2s;
      }
      .btn-premium-ghost:hover { background: var(--bg-hover); color: var(--brand-primary); border-color: var(--brand-primary-glow); }
      .btn-premium-push {
        background: var(--brand-primary-light);
        color: var(--brand-primary) !important;
        border: 1px dashed var(--brand-primary);
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .btn-premium-push:hover:not(:disabled) {
        background: var(--brand-primary-glow);
        border-style: solid;
        box-shadow: 0 4px 12px var(--brand-primary-glow);
      }
    </style>
    `;

    // Re-attach listeners
    document.getElementById('alumni-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = Store.alumni.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.company.toLowerCase().includes(q) || 
        a.expertise.some(ex => ex.toLowerCase().includes(q))
      );
      updateGrid(filtered);
    });

    document.getElementById('alumni-filter')?.addEventListener('change', (e) => {
      const company = e.target.value;
      const filtered = company ? Store.alumni.filter(a => a.company === company) : Store.alumni;
      updateGrid(filtered);
    });
  };

  const updateGrid = (list) => {
    const grid = document.getElementById('alumni-grid');
    if (!grid) return;
    grid.innerHTML = list.length ? list.map(renderCard).join('') : `<div style="grid-column: 1 / -1; padding:100px; text-align:center; color:var(--text-description);">No alumni nodes found in the current sector.</div>`;
  };

  window.requestMentor = (name) => {
    alert(`Consultation request submitted to ${name}. The mentor will review your professional metadata and respond via the secure communication node.`);
  };

  window.pushAlumni = (name) => {
    const alum = Store.alumni.find(a => a.name === name);
    if (!alum) return;

    alum.pushed = true;

    // Add student notification
    if (!Store.notifications) Store.notifications = [];
    
    const roleLabel = Store.session?.role === 'tpo' ? 'Training & Placement Officer' : 
                      Store.session?.role === 'admin' ? 'Institutional Admin' : 
                      Store.session?.role === 'department' ? 'Department Coordinator' : 
                      Store.session?.role === 'coordinator' ? 'Department Coordinator' : 
                      Store.session?.role === 'faculty' ? 'Faculty Advisor' : 'Placements Office';
    
    Store.notifications.unshift({
      id: 'n_push_' + Date.now(),
      type: 'alumni',
      title: `Alumni Recommended: ${alum.name}`,
      desc: `${alum.name} (${alum.role} @ ${alum.company}) has been recommended as a mentor by the ${roleLabel}.`,
      time: 'Just now',
      read: false
    });

    // Save Store
    localStorage.setItem('placenix_alumni', JSON.stringify(Store.alumni));
    localStorage.setItem('placenix_notifications', JSON.stringify(Store.notifications));

    // Dispatch update
    window.dispatchEvent(new CustomEvent('store-updated'));

    alert(`Alumni metadata for ${alum.name} has been broadcasted to all student workspaces.`);
  };

  const onStoreUpdate = () => {
    const searchVal = document.getElementById('alumni-search')?.value.toLowerCase() || '';
    const filterVal = document.getElementById('alumni-filter')?.value || '';
    const filtered = Store.alumni.filter(a => {
      const matchesSearch = !searchVal || 
        a.name.toLowerCase().includes(searchVal) || 
        a.company.toLowerCase().includes(searchVal) || 
        a.expertise.some(ex => ex.toLowerCase().includes(searchVal));
      const matchesFilter = !filterVal || a.company === filterVal;
      return matchesSearch && matchesFilter;
    });
    updateGrid(filtered);
  };
  window.addEventListener('store-updated', onStoreUpdate);

  renderUI(Store.alumni);

  // Cleanup observer
  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      window.removeEventListener('store-updated', onStoreUpdate);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
