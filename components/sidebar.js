// ============================================================
// PLACENIX — EXECUTIVE NAVIGATION ARCHITECTURE (v2.3)
// ============================================================

const ICONS = {
  'dashboard': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  'user': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  'intelligence': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  'recruitment': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  'network': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  'support': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  'log-out': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  'clock': `<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 16 14"/></svg>`,
};

const SECTIONS = {
  student: [
    { label: 'OPERATIONAL', items: [
      { label: 'Intelligence Node', icon: 'dashboard', route: 'student-dashboard' },
      { label: 'Academic Profile', icon: 'user', route: 'student-details' },
    ]},
    { label: 'AI INTELLIGENCE', items: [
      { label: 'Resume Scan', icon: 'intelligence', route: 'resume-analysis' },
      { label: 'Employability Score', icon: 'intelligence', route: 'employability' },
      { label: 'AI Modules', icon: 'intelligence', route: 'ai-modules' },
      { label: 'React Studio & Lab', icon: 'intelligence', route: 'react-studio' },
    ]},
    { label: 'RECRUITMENT', items: [
      { label: 'Opportunity Hub', icon: 'recruitment', route: 'new-applications' },
      { label: 'My Interview Slots', icon: 'clock', route: 'my-slots' },
    ]},
    { label: 'ECOSYSTEM', items: [
      { label: 'Alumni Network', icon: 'network', route: 'alumni-connect' },
      { label: 'Communication Hub', icon: 'support', route: 'communication' },
      { label: 'Query Center', icon: 'support', route: 'queries' },
    ]}
  ],
  coordinator: [
    { label: 'OPERATIONAL', items: [
      { label: 'Dept. Dashboard', icon: 'dashboard', route: 'coordinator-dashboard' },
    ]},
    { label: 'STUDENTS', items: [
      { label: 'Students Overview', icon: 'user', route: 'dept-students' },
    ]},
    { label: 'AI INTELLIGENCE', items: [
      { label: 'Resume Analysis', icon: 'intelligence', route: 'dept-resume' },
      { label: 'Skill Analysis', icon: 'intelligence', route: 'dept-skills' },
      { label: 'React Studio & Lab', icon: 'intelligence', route: 'react-studio' },
    ]},
    { label: 'RECRUITMENT', items: [
      { label: 'New Job Applications', icon: 'recruitment', route: 'dept-new-jobs' },
      { label: 'Previous Applications', icon: 'recruitment', route: 'dept-prev-jobs' },
      { label: 'Slot & Lifecycle Monitor', icon: 'clock', route: 'my-slots' },
      { label: 'Attendance Tracker', icon: 'clock', route: 'attendance-tracker' },
    ]},
    { label: 'COMMUNICATION', items: [
      { label: 'Announcements', icon: 'support', route: 'dept-announcements' },
      { label: 'Queries', icon: 'support', route: 'dept-queries' },
      { label: 'Alumni Network', icon: 'network', route: 'alumni-connect' },
    ]}
  ],
  admin: [
    { label: 'OVERVIEW', items: [
      { label: 'Admin Dashboard', icon: 'dashboard', route: 'admin-dashboard' },
      { label: 'React Studio & Lab', icon: 'intelligence', route: 'react-studio' },
    ]},
    { label: 'INSTITUTIONAL SETUP', items: [
      { label: 'Departments & Sections', icon: 'network', route: 'admin-setup' },
    ]},
    { label: 'ACCESS CONTROL', items: [
      { label: 'Staff Authorization', icon: 'support', route: 'admin-staff' },
      { label: 'Role Assignment', icon: 'user', route: 'admin-roles' },
    ]},
    { label: 'OPERATIONAL LOGISTICS', items: [
      { label: 'Work Mapping', icon: 'dashboard', route: 'admin-mapping' },
    ]},
    { label: 'ECOSYSTEM', items: [
      { label: 'Alumni Network', icon: 'network', route: 'alumni-connect' },
    ]}
  ],
  faculty: [
    { label: 'OPERATIONAL', items: [
      { label: 'Mentoring Dashboard', icon: 'dashboard', route: 'faculty-dashboard' },
    ]},
    { label: 'STUDENTS', items: [
      { label: 'Students Overview', icon: 'user', route: 'fa-students' },
    ]},
    { label: 'AI INTELLIGENCE', items: [
      { label: 'Resume Analysis', icon: 'intelligence', route: 'fa-resume' },
      { label: 'Skill Analysis', icon: 'intelligence', route: 'fa-skills' },
      { label: 'React Studio & Lab', icon: 'intelligence', route: 'react-studio' },
    ]},
    { label: 'RECRUITMENT', items: [
      { label: 'New Job Application', icon: 'recruitment', route: 'fa-new-jobs' },
      { label: 'Previous Job Application', icon: 'recruitment', route: 'fa-prev-jobs' },
      { label: 'Slot & Lifecycle Monitor', icon: 'clock', route: 'my-slots' },
      { label: 'Attendance Tracker', icon: 'clock', route: 'attendance-tracker' },
    ]},
    { label: 'ECOSYSTEM', items: [
      { label: 'Alumni Network', icon: 'network', route: 'alumni-connect' },
    ]}
  ],
  tpo: [
    { label: 'TPO WORKSPACE', items: [
      { label: 'Dept. Placement Report', icon: 'dashboard', route: 'tpo-dashboard' },
      { label: 'Create Job Application', icon: 'recruitment', route: 'drives' },
      { label: 'Previous Job Application', icon: 'recruitment', route: 'kanban' },
      { label: 'Attendance Tracker', icon: 'clock', route: 'attendance-tracker' },
      { label: 'Slot Allocation', icon: 'intelligence', route: 'slot-allocation' },
      { label: 'React Studio & Lab', icon: 'intelligence', route: 'react-studio' },
      { label: 'Alumni Network', icon: 'network', route: 'alumni-connect' },
    ]}
  ],
  'saas-admin': [
    { label: 'PLATFORM MANAGEMENT', items: [
      { label: 'SaaS Platform Control', icon: 'dashboard', route: 'saas-admin' },
      { label: 'React Studio & Lab', icon: 'intelligence', route: 'react-studio' },
    ]},
    { label: 'ECOSYSTEM', items: [
      { label: 'Alumni Network', icon: 'network', route: 'alumni-connect' },
    ]}
  ]
};

export function renderSidebar(role, activeRoute, user) {
  const sections = role === 'department' ? SECTIONS.coordinator : (SECTIONS[role] || SECTIONS.student);
  const initials = (user?.full_name || 'U').split(' ').map(n=>n[0]).join('').toUpperCase();

  const navHTML = sections.map(section => `
    <div class="label-ent" style="margin: 32px 24px 12px; font-size:10px; opacity:0.5;">${section.label}</div>
    ${section.items.map(item => {
      const isActive = item.route === activeRoute;
      return `
        <a class="sidebar-item ${isActive ? 'active' : ''}" 
           data-route="${item.route}" 
           href="#${item.route}"
           style="display: flex; align-items: center; gap: 12px; padding: 10px 20px; margin: 2px 12px; border-radius: 10px; text-decoration: none; transition: var(--t-fast);">
          <span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex-shrink: 0; opacity: ${isActive ? '1' : '0.5'}; color: ${isActive ? 'var(--brand-primary)' : 'var(--text-description)'};">
            ${ICONS[item.icon] || ''}
          </span>
          <span style="font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: ${isActive ? '#fff' : 'var(--text-description)'};">
            ${item.label}
          </span>
        </a>`;
    }).join('')}
  `).join('');

  return `
    <div class="sidebar-header" style="padding: 32px 24px 24px;">
      <div class="flex items-center" style="display: flex; align-items: center; gap: 12px;">
        <div style="width:32px; height:32px; background:var(--brand-primary); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 8px 16px -4px rgba(0,200,255,0.4); flex-shrink:0;">🎓</div>
        <span class="h2-ent" style="font-size:20px; letter-spacing:-0.05em; font-weight:800; color:#fff;">Placenix</span>
      </div>
    </div>
    
    <div class="sidebar-scroll" style="flex:1; overflow-y:auto; padding-bottom:40px;">
      ${navHTML}
    </div>
    
    <div class="sidebar-footer" style="padding: 24px; border-top: 1px solid var(--border-subtle); background: rgba(0,0,0,0.2);">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4" style="min-width:0;">
          <div style="width:36px;height:36px;background:var(--bg-elevated);border:1px solid var(--border-main);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--brand-primary);">${initials}</div>
          <div style="overflow:hidden;">
            <div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;text-overflow:ellipsis;">${user?.full_name || 'Operational User'}</div>
            <div class="label-ent" style="font-size:9px;color:var(--text-muted);">${role} Workspace</div>
          </div>
        </div>
        <button id="logout-btn" class="sidebar-footer-btn" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:8px;border-radius:8px;">${ICONS['log-out']}</button>
      </div>
    </div>

    <style>
      .sidebar-footer-btn:hover { background: var(--bg-hover); color: #fff; }
    </style>
  `;
}

export function renderTopbar(user, route) {
  const routeName = route.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return `
    <div class="topbar glass-shell" style="
      height: 72px; border-bottom: 1px solid var(--border-subtle);
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 40px; position: sticky; top: 0; z-index: 100;
    ">
      <div class="flex items-center gap-4">
        <div class="label-ent" style="display:flex; align-items:center; gap:10px;">
          <span>Workspace</span>
          <span style="opacity:0.2;">/</span>
          <span style="color:#fff; font-weight:800;">${routeName}</span>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:40px;">
        <!-- Placenix Global Neural Search -->
        <div id="placenix-search-wrap" style="position:relative;">
          <div style="background:var(--bg-graphite); border:1.2px solid var(--border-main); padding:0 20px; height:44px; border-radius:14px; display:flex; align-items:center; gap:12px; width:360px; transition: var(--t-standard);" id="placenix-search-bar">
            <svg width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="placenix-search-input" type="text" placeholder="Search operational infrastructure..." style="background:none; border:none; color:#fff; font-size:14px; outline:none; width:100%; font-weight:500;">
            <div style="font-size:11px; color:var(--text-muted); border:1px solid var(--border-subtle); padding:3px 8px; border-radius:8px; font-weight:800; background:rgba(255,255,255,0.03); letter-spacing:0.05em;">⌘K</div>
          </div>
          <!-- Search Results Dropdown -->
          <div id="placenix-search-results" style="
            display:none; position:absolute; top:52px; left:0; right:0;
            background:#111113; border:1px solid var(--border-main); border-radius:14px;
            box-shadow:0 20px 60px rgba(0,0,0,.6); overflow:hidden; z-index:9999;
            max-height:380px; overflow-y:auto;
          "></div>
        </div>

        <div id="notif-wrapper" style="position:relative;">
          <div id="notif-bell-btn" role="button" aria-label="Notifications" style="position:relative; cursor:pointer; color:var(--text-muted); display:flex; align-items:center; justify-content:center; padding:8px; border-radius:10px; transition:all 0.2s;" onmouseover="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.color='var(--text-muted)'; this.style.background='transparent'">
             <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
             <span id="notif-badge" style="position:absolute; top:-2px; right:-2px; background:#00C8FF; color:#050810; font-size:10px; font-weight:900; min-width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #050810; box-shadow:0 0 10px #00C8FF; padding:0 3px;">0</span>
          </div>
        </div>
          <div style="width:40px; height:40px; background:rgba(0,200,255,0.12); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; color:var(--brand-primary); cursor:pointer; border:1px solid rgba(0,200,255,0.25);">
            ${(user?.full_name || 'U')[0]}
          </div>
      </div>
    </div>

    <style>
      .placenix-sr-item { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; transition:background .15s; text-decoration:none; color:inherit; }
      .placenix-sr-item:hover { background:rgba(255,255,255,.06); }
      .placenix-sr-divider { font-size:9px; font-weight:800; color:var(--text-muted); letter-spacing:.1em; text-transform:uppercase; padding:10px 16px 4px; }
      .placenix-sr-icon { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; }
    </style>
  `;
}

export function initTopbarEvents(Store) {
  const input   = document.getElementById('placenix-search-input');
  const results = document.getElementById('placenix-search-results');
  if (!input || !results) return;

  const ROUTES = [
    { label:'Student Dashboard',       route:'student-dashboard',   icon:'🎓', cat:'Navigation' },
    { label:'TPO Placement Dashboard', route:'tpo-dashboard',       icon:'🏢', cat:'Navigation' },
    { label:'Admin Command Dashboard', route:'admin-dashboard',     icon:'⚙️', cat:'Navigation' },
    { label:'Faculty Mentoring Dashboard', route:'faculty-dashboard', icon:'👨‍🏫', cat:'Navigation' },
    { label:'Department Dashboard',    route:'coordinator-dashboard', icon:'🏫', cat:'Navigation' },
    { label:'Recruitment Drives',      route:'drives',              icon:'💼', cat:'Recruitment' },
    { label:'Live Kanban Pipeline',    route:'kanban',              icon:'📋', cat:'Recruitment' },
    { label:'Analytics & Reporting',   route:'analytics',           icon:'📊', cat:'Intelligence' },
    { label:'Alumni Mentor Network',   route:'alumni-connect',      icon:'🤝', cat:'Ecosystem' },
    { label:'Virtual AI Interview Coach', route:'virtual-interview', icon:'🤖', cat:'AI Intelligence' },
    { label:'Resume Intelligence Scan',route:'resume-analysis',     icon:'📄', cat:'AI Intelligence' },
    { label:'Employability Predictor', route:'employability',       icon:'🧠', cat:'AI Intelligence' },
    { label:'Slot Allocation Hub',     route:'slot-allocation',     icon:'🕐', cat:'Logistics' },
    { label:'Attendance Tracker',      route:'attendance-tracker',  icon:'✅', cat:'Logistics' },
    { label:'Interview Experiences Repo', route:'interview-repo',   icon:'📂', cat:'Knowledge' },
    { label:'Communication Hub',       route:'communication',       icon:'💬', cat:'Operations' },
    { label:'AI Intelligence Modules', route:'ai-modules',          icon:'🧠', cat:'AI Intelligence' },
    { label:'My Interview Slots',      route:'my-slots',            icon:'🗓️', cat:'Recruitment' },
    { label:'SaaS Super Admin',        route:'saas-admin',          icon:'☁️', cat:'Platform Control' },
    { label:'Student Academic Profile',route:'profile',             icon:'👤', cat:'Academic' },
    { label:'Departments & Sections',  route:'admin-setup',         icon:'🏛️', cat:'Admin Setup' },
    { label:'Staff Authorization',     route:'admin-staff',         icon:'🛡️', cat:'Access Control' },
    { label:'Role Assignment Matrix',  route:'admin-roles',         icon:'👥', cat:'Access Control' },
    { label:'Operational Work Mapping',route:'admin-mapping',       icon:'🔗', cat:'Logistics' }
  ];

  function buildResults(q) {
    const qL = q.toLowerCase().trim();
    if (!qL) { results.style.display='none'; return; }

    let html = '';
    const currentStore = Store || window.__PlacenixStore;

    // 1. Route matches
    const routeMatches = ROUTES.filter(r => r.label.toLowerCase().includes(qL) || r.route.toLowerCase().includes(qL));
    if (routeMatches.length) {
      html += '<div class="placenix-sr-divider">Pages & Workspaces</div>';
      html += routeMatches.slice(0, 4).map(r =>
        '<a class="placenix-sr-item" href="#'+r.route+'" onclick="document.getElementById(\'placenix-search-results\').style.display=\'none\';document.getElementById(\'placenix-search-input\').value=\'\';">'+
        '<div class="placenix-sr-icon" style="background:rgba(124,58,237,.15);">'+r.icon+'</div>'+
        '<div><div style="font-size:13px;font-weight:700;color:#fff;">'+r.label+'</div>'+
        '<div style="font-size:11px;color:var(--text-muted);">'+r.cat+'</div></div></a>'
      ).join('');
    }

    // 2. Student matches
    if (currentStore && currentStore.students) {
      const studs = currentStore.students.filter(s => s && ((s.name||'').toLowerCase().includes(qL) || (s.dept||'').toLowerCase().includes(qL))).slice(0, 3);
      if (studs.length) {
        html += '<div class="placenix-sr-divider">Students</div>';
        html += studs.map(s =>
          '<a class="placenix-sr-item" href="#student-details" onclick="document.getElementById(\'placenix-search-results\').style.display=\'none\';document.getElementById(\'placenix-search-input\').value=\'\';">'+ 
          '<div class="placenix-sr-icon" style="background:rgba(34,211,238,.12);font-weight:900;color:var(--brand-cyan);">'+((s.name||'?')[0].toUpperCase())+'</div>'+
          '<div><div style="font-size:13px;font-weight:700;color:#fff;">'+s.name+'</div>'+
          '<div style="font-size:11px;color:var(--text-muted);">'+(s.dept||'CSE')+' · CGPA '+(s.cgpa||'8.0')+' · '+(s.status||'Active')+'</div></div></a>'
        ).join('');
      }
    }

    // 3. Drive / Company matches
    if (currentStore && currentStore.drives) {
      const drives = currentStore.drives.filter(d => d && ((d.company||'').toLowerCase().includes(qL) || (d.role||'').toLowerCase().includes(qL))).slice(0, 3);
      if (drives.length) {
        html += '<div class="placenix-sr-divider">Recruitment Drives</div>';
        html += drives.map(d =>
          '<a class="placenix-sr-item" href="#drives" onclick="document.getElementById(\'placenix-search-results\').style.display=\'none\';document.getElementById(\'placenix-search-input\').value=\'\';">'+ 
          '<div class="placenix-sr-icon" style="background:rgba(16,185,129,.12);">💼</div>'+
          '<div><div style="font-size:13px;font-weight:700;color:#fff;">'+d.company+'</div>'+
          '<div style="font-size:11px;color:var(--text-muted);">'+d.role+' · ₹'+(d.package||'N/A')+' · '+(d.status||'Active')+'</div></div></a>'
        ).join('');
      }
    }

    // 4. Alumni Mentors
    if (currentStore && currentStore.alumni) {
      const alumni = currentStore.alumni.filter(al => al && ((al.name||'').toLowerCase().includes(qL) || (al.company||'').toLowerCase().includes(qL))).slice(0, 3);
      if (alumni.length) {
        html += '<div class="placenix-sr-divider">Alumni Mentors</div>';
        html += alumni.map(al =>
          '<a class="placenix-sr-item" href="#alumni-connect" onclick="document.getElementById(\'placenix-search-results\').style.display=\'none\';document.getElementById(\'placenix-search-input\').value=\'\';">'+ 
          '<div class="placenix-sr-icon" style="background:rgba(245,158,11,.12); color:#FBBF24; font-weight:800;">'+(al.avatar || 'AL')+'</div>'+
          '<div><div style="font-size:13px;font-weight:700;color:#fff;">'+al.name+'</div>'+
          '<div style="font-size:11px;color:var(--text-muted);">'+al.role+' @ '+al.company+' · Batch '+al.batch+'</div></div></a>'
        ).join('');
      }
    }

    if (!html) {
      html = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px;">No results found for "'+q+'"</div>';
    }

    results.innerHTML = html;
    results.style.display = 'block';
  }

  input.oninput = (e) => buildResults(e.target.value);
  input.onfocus = (e) => { if (e.target.value) buildResults(e.target.value); };
  input.onkeydown = (e) => {
    if (e.key === 'Escape') {
      results.style.display = 'none';
      input.value = '';
    }
  };

  if (!window.__placenix_search_listeners_bound) {
    window.__placenix_search_listeners_bound = true;
    document.addEventListener('click', (e) => {
      if (!document.getElementById('placenix-search-wrap')?.contains(e.target)) {
        const r = document.getElementById('placenix-search-results');
        if (r) r.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const inp = document.getElementById('placenix-search-input');
        if (inp) {
          inp.focus();
          inp.select();
        }
      }
    });
  }
}
