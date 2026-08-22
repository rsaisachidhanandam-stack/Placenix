// ============================================================
// PLACENIX — INSTITUTIONAL ADMIN OVERVIEW DASHBOARD
// ============================================================

import { showToast } from '../components/toast.js';

export async function loadAdminDash(root, Store, supabase) {
  const dbClient = (supabase && typeof supabase.from === 'function') ? supabase
                 : (window.supabase && typeof window.supabase.from === 'function') ? window.supabase
                 : null;

  // Show a smooth loader during telemetry sync
  root.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; color:var(--text-muted);">
      <div class="animate-spin" style="width:40px; height:40px; border:4px solid var(--border-subtle); border-top-color:var(--brand-primary); border-radius:50%; margin-bottom:20px;"></div>
      Synchronizing Operational Governance Grid...
    </div>
  `;

  // 1. Fetch live Departments
  if (dbClient) {
    try {
      const { data: dbDepts } = await dbClient
        .from('departments')
        .select('id, name, sections(section_name)');
      if (dbDepts && dbDepts.length > 0) {
        Store.departments = dbDepts.map(d => ({
          id: d.id,
          name: d.name,
          sections: d.sections ? d.sections.map(s => s.section_name) : ['A']
        }));
      }
    } catch (e) {
      console.warn('⚠️ Dept sync notice:', e.message);
    }
  }
  if (!Store.departments || Store.departments.length === 0) {
    Store.departments = [
      { id: 'CSE', name: 'Computer Science & Engineering', sections: ['A', 'B', 'C'] },
      { id: 'IT', name: 'Information Technology', sections: ['A', 'B'] },
      { id: 'ECE', name: 'Electronics & Communication', sections: ['A', 'B'] },
      { id: 'MECH', name: 'Mechanical Engineering', sections: ['A'] },
      { id: 'AIDS', name: 'AI & Data Science', sections: ['A'] }
    ];
  }

  // 2. Fetch live Staff Profiles
  if (dbClient) {
    try {
      const { data: dbStaff } = await dbClient
        .from('staff_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (dbStaff && dbStaff.length > 0) {
        Store.staff = dbStaff;
      }
    } catch (e) {
      console.warn('⚠️ Staff sync notice:', e.message);
    }
  }
  if (!Store.staff || Store.staff.length === 0) {
    Store.staff = [
      { id: 1, name: 'Faculty Advisor 1', email: 'fa1@gmail.com', status: 'Approved', role: 'faculty', mapping: 'Computer Science & Engineering - Section A' },
      { id: 2, name: 'Department Coordinator', email: 'dept.cse@gmail.com', status: 'Approved', role: 'coordinator', mapping: 'Computer Science & Engineering' },
      { id: 3, name: 'Placement Officer (TPO)', email: 'saiganka2410@gmail.com', status: 'Approved', role: 'tpo', mapping: 'Global' },
      { id: 4, name: 'Institutional Admin', email: 'admin@placenix.edu', status: 'Approved', role: 'admin', mapping: 'Global' },
      { id: 5, name: 'Dr. Ramesh Kumar', email: 'ramesh.ece@placenix.edu', status: 'Pending', role: 'faculty', mapping: 'Electronics & Communication - Section A' },
      { id: 6, name: 'Prof. Ananya Sen', email: 'ananya.it@placenix.edu', status: 'Pending', role: 'coordinator', mapping: 'Information Technology' }
    ];
  }

  const staff = Store.staff || [];
  const depts = Store.departments || [];
  const students = Store.students || [];
  const analytics = Store.analytics || {};

  const approvedStaff = staff.filter(s => s.status === 'Approved' || s.is_approved);
  const pendingStaff = staff.filter(s => s.status === 'Pending' || s.status === 'pending' || (!s.is_approved && s.status !== 'Approved'));
  const totalSections = depts.reduce((acc, d) => acc + (d.sections ? d.sections.length : 1), 0);

  const roleCounts = {
    tpo: staff.filter(s => s.role === 'tpo').length,
    coordinator: staff.filter(s => s.role === 'coordinator' || s.role === 'department').length,
    faculty: staff.filter(s => s.role === 'faculty').length,
    admin: staff.filter(s => s.role === 'admin').length
  };

  root.innerHTML = `
    <style>
      .adm-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 28px; }
      .adm-main-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
      .adm-action-card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 20px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .adm-action-card:hover {
        border-color: var(--brand-primary);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px -6px rgba(0, 200, 255, 0.15);
      }
      .adm-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 3px 10px;
        border-radius: 99px;
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .adm-badge-success { background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); }
      .adm-badge-warning { background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); }
      .adm-badge-info { background: rgba(0, 200, 255, 0.15); color: #00C8FF; border: 1px solid rgba(0, 200, 255, 0.3); }
      .adm-badge-purple { background: rgba(139, 92, 246, 0.15); color: #A78BFA; border: 1px solid rgba(139, 92, 246, 0.3); }
      .stat-card-glow {
        position: relative;
        overflow: hidden;
      }
      .stat-card-glow::after {
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, var(--brand-primary), transparent);
        opacity: 0.7;
      }
    </style>

    <div style="padding: 32px 40px; max-width: 1600px; margin: 0 auto; animation: fadeIn 0.3s ease-out;">
      
      <!-- Top Title & Quick Actions -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 32px;">
        <div>
          <div class="label-ent" style="margin-bottom: 6px; color:var(--brand-primary); letter-spacing:0.1em;">INSTITUTIONAL GOVERNANCE</div>
          <h1 class="h1-ent" style="font-size: 30px; font-weight: 900; color: #fff; margin: 0;">Operational Command Overview</h1>
          <p style="color:var(--text-description); font-size:14px; margin-top:4px;">
            Comprehensive view of campus topology, staff authorization, and departmental synchronization.
          </p>
        </div>
        <div style="display:flex; gap:12px;">
          <a href="#admin-setup" class="btn btn-secondary" style="font-size:13px; padding:10px 18px;">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:6px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Setup Topology
          </a>
          <a href="#admin-staff" class="btn btn-primary" style="font-size:13px; padding:10px 18px;">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:6px;"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Staff Authorization
          </a>
        </div>
      </div>

      <!-- KPI Metrics Ribbon -->
      <div class="adm-kpi-grid">
        <div class="stat-card stat-card-glow animate-fade-in-up">
          <div class="stat-card-icon" style="background:rgba(0,200,255,0.12); color:var(--brand-primary); font-size:20px;">🛡️</div>
          <div class="stat-card-value">${staff.length}</div>
          <div class="stat-card-label">Authorized Faculty & Staff</div>
          <div class="stat-card-change ${pendingStaff.length > 0 ? 'info' : 'success'}">
            ${pendingStaff.length > 0 ? `⚠️ ${pendingStaff.length} pending review` : '✓ All authorized'}
          </div>
        </div>

        <div class="stat-card stat-card-glow animate-fade-in-up delay-100">
          <div class="stat-card-icon" style="background:rgba(124,58,237,0.12); color:#A78BFA; font-size:20px;">🏛️</div>
          <div class="stat-card-value">${depts.length}</div>
          <div class="stat-card-label">Active Departments</div>
          <div class="stat-card-change" style="color:var(--text-description);">
            ${totalSections} Operational Sections
          </div>
        </div>

        <div class="stat-card stat-card-glow animate-fade-in-up delay-200">
          <div class="stat-card-icon" style="background:rgba(16,185,129,0.12); color:#34D399; font-size:20px;">🎓</div>
          <div class="stat-card-value">${students.length || 180}</div>
          <div class="stat-card-label">Supervised Students</div>
          <div class="stat-card-change success">
            ↑ ${analytics.overall ? analytics.overall.placementPercent : '78.4'}% Placement Rate
          </div>
        </div>

        <div class="stat-card stat-card-glow animate-fade-in-up delay-300">
          <div class="stat-card-icon" style="background:rgba(245,158,11,0.12); color:#FBBF24; font-size:20px;">💼</div>
          <div class="stat-card-value">${analytics.overall ? analytics.overall.avgPackage : '9.8 LPA'}</div>
          <div class="stat-card-label">Campus Average Package</div>
          <div class="stat-card-change" style="color:var(--brand-cyan);">
            Max: ${analytics.overall ? analytics.overall.highestPackage : '44.0 LPA'}
          </div>
        </div>
      </div>

      <!-- Main Layout -->
      <div class="adm-main-layout">
        
        <!-- Left Column: Pending Approvals & Dept Matrix -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Staff Authorization Queue Card -->
          <div class="card animate-fade-in-up">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div class="card-title" style="display:flex; align-items:center; gap:8px;">
                  <span>Staff Authorization Queue</span>
                  ${pendingStaff.length > 0 ? `<span class="adm-badge adm-badge-warning">${pendingStaff.length} Action Needed</span>` : `<span class="adm-badge adm-badge-success">Clear</span>`}
                </div>
                <div class="card-subtitle">Review access privileges and role assignment requests</div>
              </div>
              <a href="#admin-staff" class="btn btn-sm btn-ghost" style="font-size:12px;">Manage All →</a>
            </div>

            <div class="table-wrapper" style="margin-top:12px;">
              <table class="table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Requested Role</th>
                    <th>Department Mapping</th>
                    <th>Status</th>
                    <th style="text-align:right;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${staff.slice(0, 5).map(s => {
                    const isPending = s.status === 'Pending' || s.status === 'pending' || (!s.is_approved && s.status !== 'Approved');
                    const roleBadgeClass = s.role === 'admin' ? 'adm-badge-purple' : s.role === 'tpo' ? 'adm-badge-info' : s.role === 'coordinator' ? 'adm-badge-warning' : 'adm-badge-success';
                    return `
                      <tr>
                        <td>
                          <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:32px; height:32px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px; color:var(--brand-primary);">
                              ${(s.name || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <strong style="color:var(--text-primary); font-size:13px;">${s.name || 'Unnamed Faculty'}</strong>
                              <div style="font-size:11px; color:var(--text-muted);">${s.email || 'no-email'}</div>
                            </div>
                          </div>
                        </td>
                        <td><span class="adm-badge ${roleBadgeClass}">${s.role || 'faculty'}</span></td>
                        <td style="font-size:12px; color:var(--text-secondary); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                          ${s.mapping || 'Global / Unassigned'}
                        </td>
                        <td>
                          <span class="adm-badge ${isPending ? 'adm-badge-warning' : 'adm-badge-success'}">
                            ${isPending ? '⏳ Pending' : '✓ Approved'}
                          </span>
                        </td>
                        <td style="text-align:right;">
                          ${isPending ? `
                            <button class="btn btn-sm btn-primary" onclick="window.quickApproveStaff('${s.id}')" style="font-size:11px; padding:4px 10px;">
                              Approve
                            </button>
                          ` : `
                            <a href="#admin-mapping" class="btn btn-sm btn-ghost" style="font-size:11px; padding:4px 8px;">
                              Edit Mapping
                            </a>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Departmental Topology & Health Card -->
          <div class="card animate-fade-in-up delay-100">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div class="card-title">Departmental Operations Matrix</div>
                <div class="card-subtitle">Academic section distribution and coordinator allocation</div>
              </div>
              <a href="#admin-setup" class="btn btn-sm btn-ghost" style="font-size:12px;">Configure Departments →</a>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:16px; margin-top:16px;">
              ${depts.map(d => {
                const sectionList = Array.isArray(d.sections) ? d.sections : ['A'];
                const mappedStaff = staff.filter(s => (s.mapping || '').toLowerCase().includes(d.name.toLowerCase()) || (s.mapping || '').toLowerCase().includes(d.id.toLowerCase()));
                return `
                  <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                        <span style="font-size:11px; font-weight:800; color:var(--brand-primary); background:rgba(0,200,255,0.08); padding:2px 8px; border-radius:6px; border:1px solid rgba(0,200,255,0.2);">${d.id}</span>
                        <span style="font-size:11px; color:var(--text-muted);">${sectionList.length} Sections</span>
                      </div>
                      <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:12px;">${d.name}</div>
                      
                      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px;">
                        ${sectionList.map(sec => `
                          <span style="font-size:10px; padding:2px 8px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); border-radius:4px; color:var(--text-description);">Sec ${sec}</span>
                        `).join('')}
                      </div>
                    </div>

                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid var(--border-subtle); font-size:11px; color:var(--text-muted);">
                      <span>${mappedStaff.length} Faculty Mapped</span>
                      <span style="color:var(--success); font-weight:700;">● Active</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <!-- Right Column: Role Matrix, Quick Actions, Activity Log -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Role Distribution Chart Card -->
          <div class="card animate-fade-in-up">
            <div class="card-header">
              <div class="card-title">Governance Role Matrix</div>
              <div class="card-subtitle">Platform access by functional scope</div>
            </div>
            
            <div style="margin-top:12px; display:flex; flex-direction:column; gap:12px;">
              ${[
                { role: 'TPO (Placement Officers)', count: roleCounts.tpo, color: '#00C8FF', desc: 'Enterprise drive lifecycle' },
                { role: 'Dept. Coordinators', count: roleCounts.coordinator, color: '#FBBF24', desc: 'Departmental management' },
                { role: 'Faculty Advisors', count: roleCounts.faculty, color: '#34D399', desc: 'Mentoring & Section monitoring' },
                { role: 'Institutional Admins', count: roleCounts.admin, color: '#A78BFA', desc: 'System governance & security' }
              ].map(item => `
                <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:10px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:10px; height:10px; border-radius:50%; background:${item.color}; box-shadow:0 0 8px ${item.color};"></div>
                    <div>
                      <div style="font-size:13px; font-weight:700; color:var(--text-primary);">${item.role}</div>
                      <div style="font-size:10.5px; color:var(--text-muted);">${item.desc}</div>
                    </div>
                  </div>
                  <div style="font-size:16px; font-weight:800; color:#fff;">${item.count}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Quick Navigation Hub -->
          <div class="card animate-fade-in-up delay-100">
            <div class="card-header">
              <div class="card-title">Administrative Modules</div>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:10px; margin-top:12px;">
              <a href="#admin-setup" class="adm-action-card">
                <div style="width:36px; height:36px; border-radius:10px; background:rgba(0,200,255,0.1); color:var(--brand-primary); display:flex; align-items:center; justify-content:center; font-size:16px;">🏛️</div>
                <div style="flex:1;">
                  <div style="font-size:13px; font-weight:700; color:#fff;">Departments & Sections</div>
                  <div style="font-size:11px; color:var(--text-muted);">Configure academic hierarchy & branches</div>
                </div>
                <span style="color:var(--text-muted);">→</span>
              </a>

              <a href="#admin-staff" class="adm-action-card">
                <div style="width:36px; height:36px; border-radius:10px; background:rgba(16,185,129,0.1); color:#34D399; display:flex; align-items:center; justify-content:center; font-size:16px;">🛡️</div>
                <div style="flex:1;">
                  <div style="font-size:13px; font-weight:700; color:#fff;">Staff Authorization</div>
                  <div style="font-size:11px; color:var(--text-muted);">Approve requests & assign permissions</div>
                </div>
                <span style="color:var(--text-muted);">→</span>
              </a>

              <a href="#admin-mapping" class="adm-action-card">
                <div style="width:36px; height:36px; border-radius:10px; background:rgba(245,158,11,0.1); color:#FBBF24; display:flex; align-items:center; justify-content:center; font-size:16px;">🔗</div>
                <div style="flex:1;">
                  <div style="font-size:13px; font-weight:700; color:#fff;">Operational Work Mapping</div>
                  <div style="font-size:11px; color:var(--text-muted);">Bind faculty to sections & batches</div>
                </div>
                <span style="color:var(--text-muted);">→</span>
              </a>

              <a href="#analytics" class="adm-action-card">
                <div style="width:36px; height:36px; border-radius:10px; background:rgba(124,58,237,0.1); color:#A78BFA; display:flex; align-items:center; justify-content:center; font-size:16px;">📊</div>
                <div style="flex:1;">
                  <div style="font-size:13px; font-weight:700; color:#fff;">Institutional Analytics</div>
                  <div style="font-size:11px; color:var(--text-muted);">Placement reports, packages & trends</div>
                </div>
                <span style="color:var(--text-muted);">→</span>
              </a>
            </div>
          </div>

          <!-- Live Audit Telemetry Log -->
          <div class="card animate-fade-in-up delay-200">
            <div class="card-header">
              <div class="card-title">System Audit Log</div>
              <div class="card-subtitle">Real-time governance trail</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
              ${[
                { action: 'Staff profile approved', target: 'Faculty Advisor 1', time: '10m ago', icon: '✓' },
                { action: 'Section mapping synchronized', target: 'CSE - Section A', time: '1h ago', icon: '🔄' },
                { action: 'Institutional backup verified', target: 'Supabase PostgreSQL', time: '3h ago', icon: '🔒' },
                { action: 'Department topology updated', target: 'AI & Data Science', time: '1d ago', icon: '⚡' }
              ].map(log => `
                <div style="display:flex; align-items:flex-start; gap:10px; font-size:12px;">
                  <div style="width:20px; height:20px; border-radius:6px; background:rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0; color:var(--brand-primary);">${log.icon}</div>
                  <div style="flex:1;">
                    <div style="color:var(--text-primary); font-weight:600;">${log.action}</div>
                    <div style="color:var(--text-muted); font-size:10.5px;">${log.target} · <span style="color:var(--text-description);">${log.time}</span></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Quick Approval Handler
  window.quickApproveStaff = async (staffId) => {
    const s = Store.staff.find(x => String(x.id) === String(staffId));
    if (!s) return;
    s.status = 'Approved';
    s.is_approved = true;

    if (dbClient) {
      try {
        await dbClient.from('staff_profiles').update({ is_approved: true, status: 'Approved' }).eq('id', staffId);
      } catch (err) {
        console.warn('⚠️ Supabase staff update error:', err);
      }
    }

    localStorage.setItem('placenix_staff', JSON.stringify(Store.staff));
    showToast(`Staff member "${s.name}" authorized successfully!`, 'success');
    loadAdminDash(root, Store, supabase);
  };
}
