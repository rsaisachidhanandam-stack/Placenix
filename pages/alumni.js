export async function loadAlumniPage(root, Store) {
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
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-main); padding:6px 14px; border-radius:10px; display:flex; align-items:center; gap:10px; width:280px;">
            <span style="opacity:0.4;">🔍</span>
            <input type="text" placeholder="Search elite network..." id="alumni-search" 
                   style="background:none; border:none; color:#fff; font-size:12px; outline:none; width:100%; font-weight:500;">
          </div>
          <select id="alumni-filter" class="input-ent" style="width:160px; height:34px; font-size:11px; padding:0 10px;">
            <option value="">All Organizations</option>
            ${[...new Set(Store.alumni.map(a => a.company))].map(c => `<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Verified Mentorship Banner -->
      <div class="card-ent" style="padding:20px 24px; background: linear-gradient(90deg, rgba(139,92,246,0.05) 0%, rgba(16,185,129,0.02) 100%); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="font-size:15px; font-weight:800; color:#fff;">Verified Mentorship Gateway</h3>
          <p style="font-size:12px; color:var(--text-description); margin-top:2px;">${Store.alumni.filter(a => a.mentoring).length} industry professionals currently active in the mentorship registry.</p>
        </div>
        <div style="display:flex; -webkit-mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent); mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent); gap: -10px;">
           ${Store.alumni.slice(0, 5).map(a => `<div style="width:32px; height:32px; border-radius:50%; background:var(--brand-primary); border:2px solid #09090b; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; margin-left:-8px;">${a.avatar}</div>`).join('')}
        </div>
      </div>

      <!-- Alumni Registry Grid -->
      <div id="alumni-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px;">
        ${list.map(a => `
          <div class="card-ent alumni-card" style="padding:24px; display:flex; flex-direction:column; gap:20px; transition:all 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="width:48px; height:48px; background:var(--brand-primary); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:white; box-shadow: 0 4px 12px rgba(139,92,246,0.2);">${a.avatar}</div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                ${a.mentoring ? 
                  `<span style="background:rgba(16,185,129,0.1); color:var(--brand-secondary); padding:3px 10px; border-radius:100px; font-size:9px; font-weight:800;">ACTIVE MENTOR</span>` : 
                  `<span style="background:rgba(255,255,255,0.05); color:var(--text-muted); padding:3px 10px; border-radius:100px; font-size:9px; font-weight:800;">OFFLINE</span>`
                }
                <div style="font-size:10px; color:var(--text-description); font-weight:700;">Batch of ${a.batch}</div>
              </div>
            </div>

            <div>
              <h4 style="font-size:16px; font-weight:800; color:#fff; letter-spacing:-0.01em;">${a.name}</h4>
              <div style="font-size:12px; font-weight:600; color:var(--brand-primary); margin-top:2px;">${a.role} @ ${a.company}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:4px; display:flex; align-items:center; gap:6px;">
                <span>📍 ${a.location}</span>
              </div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${a.expertise.map(e => `<span style="font-size:10px; padding:3px 10px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:6px; color:var(--text-description); font-weight:600;">${e}</span>`).join('')}
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; padding:16px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px;">
              <div>
                <div style="font-size:13px; font-weight:800; color:#fff;">${a.sessions}</div>
                <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-top:2px;">Consultations</div>
              </div>
              <div style="border-left:1px solid var(--border-main); padding-left:12px;">
                <div style="font-size:13px; font-weight:800; color:var(--brand-secondary);">${a.rating} ★</div>
                <div style="font-size:9px; color:var(--text-muted); text-transform:uppercase; font-weight:700; margin-top:2px;">Global Rating</div>
              </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:auto;">
              <button class="btn-premium" style="flex:1; height:36px; font-size:11px; border-radius:10px;" 
                      onclick="window.requestMentor('${a.name}')" ${!a.mentoring ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                Initiate Consultation
              </button>
              <button class="btn-premium-ghost" style="width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px;"
                      onclick="window.open('https://linkedin.com', '_blank')">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      .alumni-card:hover { transform: translateY(-4px); border-color: var(--brand-primary); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
      .input-ent { background: rgba(255,255,255,0.03); border: 1px solid var(--border-main); color: #fff; border-radius: 8px; outline: none; transition: var(--t-fast); }
      .input-ent:focus { border-color: var(--brand-primary); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1); }
      .btn-premium {
        background: var(--brand-primary); color: #fff; border: none; font-weight: 700; cursor: pointer; transition: all 0.2s;
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
      }
      .btn-premium:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
      .btn-premium-ghost {
        background: rgba(255,255,255,0.03); color: var(--text-description); border: 1px solid var(--border-main);
        font-weight: 700; cursor: pointer; transition: all 0.2s;
      }
      .btn-premium-ghost:hover { background: rgba(255,255,255,0.05); color: #fff; border-color: var(--brand-primary); }
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
    grid.innerHTML = list.length ? list.map(a => `
      <!-- Recycled Card Template -->
      <div class="card-ent alumni-card" style="padding:24px; display:flex; flex-direction:column; gap:20px; transition:all 0.3s ease;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="width:48px; height:48px; background:var(--brand-primary); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:white;">${a.avatar}</div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
            ${a.mentoring ? `<span style="background:rgba(16,185,129,0.1); color:var(--brand-secondary); padding:3px 10px; border-radius:100px; font-size:9px; font-weight:800;">ACTIVE MENTOR</span>` : `<span style="background:rgba(255,255,255,0.05); color:var(--text-muted); padding:3px 10px; border-radius:100px; font-size:9px; font-weight:800;">OFFLINE</span>`}
            <div style="font-size:10px; color:var(--text-description); font-weight:700;">Batch of ${a.batch}</div>
          </div>
        </div>
        <div>
          <h4 style="font-size:16px; font-weight:800; color:#fff;">${a.name}</h4>
          <div style="font-size:12px; font-weight:600; color:var(--brand-primary); margin-top:2px;">${a.role} @ ${a.company}</div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${a.expertise.map(e => `<span style="font-size:10px; padding:3px 10px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:6px; color:var(--text-description); font-weight:600;">${e}</span>`).join('')}
        </div>
        <div style="display:flex; gap:10px; margin-top:auto;">
          <button class="btn-premium" style="flex:1; height:36px; font-size:11px; border-radius:10px;" onclick="window.requestMentor('${a.name}')" ${!a.mentoring ? 'disabled style="opacity:0.5;"' : ''}>Initiate Consultation</button>
          <button class="btn-premium-ghost" style="width:36px; height:36px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:10px;" onclick="window.open('https://linkedin.com', '_blank')">🔗</button>
        </div>
      </div>
    `).join('') : `<div style="grid-column: 1 / -1; padding:100px; text-align:center; color:var(--text-description);">No alumni nodes found in the current sector.</div>`;
  };

  window.requestMentor = (name) => {
    alert(`Consultation request submitted to ${name}. The mentor will review your professional metadata and respond via the secure communication node.`);
  };

  renderUI(Store.alumni);
}
