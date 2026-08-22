// ============================================================
// PLACENIX — SAAS SUPER ADMIN PLATFORM (v2.0)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

export async function loadSaaSPage(root, Store) {
  if (!Store.institutions || !Array.isArray(Store.institutions) || Store.institutions.length === 0) {
    Store.institutions = [
      { id: 'inst_1', shortName: 'SRMIST', name: 'SRM Institute of Science and Technology', students: 12400, placed: 8900, plan: 'Enterprise', mrr: 480000, status: 'Active', location: 'Chennai, TN', adminEmail: 'admin@srmist.edu.in', joinedDate: '2023-01-15' },
      { id: 'inst_2', shortName: 'VIT',    name: 'Vellore Institute of Technology',          students: 15800, placed: 11200, plan: 'Enterprise', mrr: 580000, status: 'Active', location: 'Vellore, TN', adminEmail: 'admin@vit.ac.in', joinedDate: '2023-02-10' },
      { id: 'inst_3', shortName: 'PSG',    name: 'PSG College of Technology',                students: 5200,  placed: 3900,  plan: 'Pro',        mrr: 180000, status: 'Active', location: 'Coimbatore, TN', adminEmail: 'tpo@psgtech.edu', joinedDate: '2023-05-18' },
      { id: 'inst_4', shortName: 'CIT',    name: 'Coimbatore Institute of Technology',       students: 3800,  placed: 2700,  plan: 'Pro',        mrr: 140000, status: 'Active', location: 'Coimbatore, TN', adminEmail: 'admin@cit.edu.in', joinedDate: '2023-07-22' },
      { id: 'inst_5', shortName: 'KCTCE',  name: 'Kumaraguru College of Technology',         students: 2100,  placed: 1400,  plan: 'Starter',    mrr: 55000,  status: 'Active', location: 'Coimbatore, TN', adminEmail: 'placements@kct.ac.in', joinedDate: '2023-09-01' },
      { id: 'inst_6', shortName: 'BCET',   name: 'Bannari Amman Institute of Technology',    students: 1800,  placed: 980,   plan: 'Starter',    mrr: 40000,  status: 'Active', location: 'Sathyamangalam, TN', adminEmail: 'admin@bitsathy.ac.in', joinedDate: '2023-11-12' }
    ];
  }

  let searchQuery = '';
  let planFilter = 'ALL';
  let statusFilter = 'ALL';

  function render() {
    const insts = Store.institutions || [];
    const totalMRR = insts.reduce((s, i) => s + (parseFloat(i.mrr) || 0), 0);
    const totalStudents = insts.reduce((s, i) => s + (parseInt(i.students) || 0), 0);
    const totalPlaced = insts.reduce((s, i) => s + (parseInt(i.placed) || 0), 0);
    const avgPlacementRate = totalStudents > 0 ? ((totalPlaced / totalStudents) * 100).toFixed(1) : '74.2';

    const enterpriseCount = insts.filter(i => i.plan === 'Enterprise').length;
    const proCount = insts.filter(i => i.plan === 'Pro').length;
    const starterCount = insts.filter(i => i.plan === 'Starter').length;

    // Filtered list
    const filteredInsts = insts.filter(i => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || (i.name || '').toLowerCase().includes(q) || (i.shortName || '').toLowerCase().includes(q) || (i.location || '').toLowerCase().includes(q);
      const matchPlan = planFilter === 'ALL' || i.plan === planFilter;
      const matchStatus = statusFilter === 'ALL' || i.status === statusFilter;
      return matchQuery && matchPlan && matchStatus;
    });

    root.innerHTML = `
    <style>
      .saas-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
      .inst-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 20px; transition: all .3s; }
      .inst-card:hover { border-color: var(--border-glow); transform: translateY(-2px); }
      .plan-tag { padding: 3px 10px; border-radius: 99px; font-size: .72rem; font-weight: 700; display:inline-block; }
      .plan-Enterprise { background: rgba(124,58,237,.2); color: #C084FC; border: 1px solid rgba(124,58,237,0.3); }
      .plan-Pro { background: rgba(34,211,238,.12); color: #22D3EE; border: 1px solid rgba(34,211,238,0.3); }
      .plan-Starter { background: rgba(16,185,129,.1); color: #34D399; border: 1px solid rgba(16,185,129,0.3); }
      .modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(5, 8, 16, 0.85); backdrop-filter: blur(8px);
        z-index: 1000; display: flex; align-items: center; justify-content: center;
        padding: 20px;
      }
      .saas-modal {
        background: var(--bg-card); border: 1px solid var(--border-main);
        border-radius: var(--radius-xl); width: 100%; max-width: 640px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6); overflow: hidden;
      }
      .saas-modal-header {
        padding: 20px 24px; border-bottom: 1px solid var(--border-subtle);
        display: flex; justify-content: space-between; align-items: center;
      }
      .saas-modal-body { padding: 24px; max-height: 75vh; overflow-y: auto; }
      .saas-modal-footer {
        padding: 16px 24px; border-top: 1px solid var(--border-subtle);
        display: flex; justify-content: flex-end; gap: 12px;
      }
    </style>

    <div style="padding: 32px 40px; max-width: 1600px; margin: 0 auto; animation: fadeIn 0.3s ease-out;">
      
      <!-- Top Title & Quick Actions -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom: 28px;">
        <div>
          <div class="label-ent" style="margin-bottom: 6px; color:var(--brand-primary); letter-spacing:0.1em;">MULTI-TENANCY PLATFORM CONTROL</div>
          <h1 class="h1-ent" style="font-size: 30px; font-weight: 900; color: #fff; margin: 0;">SaaS Super Admin</h1>
          <p style="color:var(--text-description); font-size:14px; margin-top:4px;">
            Multi-university subscription management, MRR telemetry & tenant orchestration · Placenix Cloud
          </p>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-secondary" id="saas-export-btn" style="font-size:13px; padding:10px 18px;">
            📥 Export Billing CSV
          </button>
          <button class="btn btn-primary" id="saas-add-inst-btn" style="font-size:13px; padding:10px 18px;">
            + Add Institution
          </button>
        </div>
      </div>

      <!-- KPI Ribbon -->
      <div class="saas-kpi">
        <div class="stat-card animate-fade-in-up">
          <div class="stat-card-icon" style="background:rgba(124,58,237,.15); color:#A78BFA; font-size:20px;">🏫</div>
          <div class="stat-card-value">${insts.length}</div>
          <div class="stat-card-label">Active Institutions</div>
          <div class="stat-card-change up">↑ ${insts.filter(i=>i.status==='Active').length} Live Tenants</div>
        </div>

        <div class="stat-card animate-fade-in-up delay-100">
          <div class="stat-card-icon" style="background:rgba(34,211,238,.12); color:#22D3EE; font-size:20px;">👥</div>
          <div class="stat-card-value">${totalStudents.toLocaleString()}</div>
          <div class="stat-card-label">Total Managed Students</div>
          <div class="stat-card-change up">Across all campuses</div>
        </div>

        <div class="stat-card animate-fade-in-up delay-200">
          <div class="stat-card-icon" style="background:rgba(16,185,129,.12); color:#34D399; font-size:20px;">💰</div>
          <div class="stat-card-value">₹${Math.round(totalMRR / 100000)}.${Math.round((totalMRR % 100000)/10000)}L</div>
          <div class="stat-card-label">Monthly Recurring Revenue</div>
          <div class="stat-card-change success">ARR: ₹${((totalMRR * 12) / 10000000).toFixed(2)} Cr</div>
        </div>

        <div class="stat-card animate-fade-in-up delay-300">
          <div class="stat-card-icon" style="background:rgba(245,158,11,.12); color:#FBBF24; font-size:20px;">📈</div>
          <div class="stat-card-value">${avgPlacementRate}%</div>
          <div class="stat-card-label">Avg Placement Rate</div>
          <div class="stat-card-change up">Platform-wide performance</div>
        </div>
      </div>

      <!-- MRR Growth & Plan Distribution Charts -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div class="card animate-fade-in-up">
          <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div class="card-title">Revenue Trajectory (MRR in ₹)</div>
              <div class="card-subtitle">Trailing 12-month billing trajectory</div>
            </div>
            <span class="badge badge-success">+24.8% YoY</span>
          </div>
          <canvas id="mrr-chart" height="210"></canvas>
        </div>

        <div class="card animate-fade-in-up delay-100">
          <div class="card-header">
            <div class="card-title">Subscription Plan Mix</div>
            <div class="card-subtitle">Distribution across active institutions</div>
          </div>
          <canvas id="plan-chart" height="190"></canvas>
          <div style="margin-top:16px; display:flex; flex-direction:column; gap:8px;">
            ${[
              ['Enterprise (₹4.8L+)', enterpriseCount, '#7C3AED'],
              ['Pro Tier (₹1.4L - ₹2.0L)', proCount, '#22D3EE'],
              ['Starter Tier (₹40k - ₹60k)', starterCount, '#10B981']
            ].map(([p, n, c]) => `
              <div style="display:flex; justify-content:space-between; font-size:.8rem;">
                <span style="display:flex; align-items:center; gap:8px; color:var(--text-secondary);">
                  <span style="width:10px; height:10px; border-radius:2px; background:${c}; display:inline-block;"></span>${p}
                </span>
                <span style="font-weight:700; color:var(--text-primary);">${n} campuses</span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Institution Overview Table with Search & Filter Bar -->
      <div class="card animate-fade-in-up">
        <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div>
            <div class="card-title" style="display:flex; align-items:center; gap:10px;">
              <span>Institution Registry</span>
              <span class="badge badge-primary">${filteredInsts.length} shown</span>
            </div>
            <div class="card-subtitle">Manage university tenants, subscriptions and status</div>
          </div>

          <!-- Controls -->
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
            <div style="position:relative; min-width:220px;">
              <input type="text" id="saas-search-input" placeholder="Search by name, code, city..." value="${searchQuery}" 
                class="input" style="padding-left:34px; font-size:13px; height:38px;">
              <svg width="14" height="14" fill="none" stroke="var(--text-muted)" stroke-width="2" viewBox="0 0 24 24" 
                style="position:absolute; left:12px; top:12px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>

            <select id="saas-plan-filter" class="input" style="width:auto; height:38px; font-size:12.5px; padding:0 12px;">
              <option value="ALL" ${planFilter === 'ALL' ? 'selected' : ''}>All Plans</option>
              <option value="Enterprise" ${planFilter === 'Enterprise' ? 'selected' : ''}>Enterprise</option>
              <option value="Pro" ${planFilter === 'Pro' ? 'selected' : ''}>Pro</option>
              <option value="Starter" ${planFilter === 'Starter' ? 'selected' : ''}>Starter</option>
            </select>

            <select id="saas-status-filter" class="input" style="width:auto; height:38px; font-size:12.5px; padding:0 12px;">
              <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>All Status</option>
              <option value="Active" ${statusFilter === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Suspended" ${statusFilter === 'Suspended' ? 'selected' : ''}>Suspended</option>
              <option value="Trial" ${statusFilter === 'Trial' ? 'selected' : ''}>Trial</option>
            </select>
          </div>
        </div>

        <div class="table-wrapper" style="margin-top:12px;">
          <table class="table">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Location</th>
                <th>Students</th>
                <th>Placed</th>
                <th>Placement %</th>
                <th>Plan Tier</th>
                <th>Monthly MRR</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filteredInsts.length === 0 ? `
                <tr><td colspan="9" style="text-align:center; padding:36px; color:var(--text-muted);">No institutions match the current filters.</td></tr>
              ` : filteredInsts.map(i => {
                const pct = i.students ? Math.round((i.placed / i.students) * 100) : 0;
                const statusBadge = i.status === 'Active' ? 'badge-success' : i.status === 'Trial' ? 'badge-info' : 'badge-warning';
                return `
                  <tr>
                    <td>
                      <div>
                        <strong style="color:var(--text-primary); font-size:13.5px;">${i.shortName}</strong>
                        <div style="font-size:.78rem; color:var(--text-muted);">${i.name}</div>
                      </div>
                    </td>
                    <td style="font-size:12px; color:var(--text-secondary);">${i.location || 'India'}</td>
                    <td style="font-weight:600; color:var(--text-primary);">${(i.students || 0).toLocaleString()}</td>
                    <td style="font-weight:600; color:var(--text-primary);">${(i.placed || 0).toLocaleString()}</td>
                    <td>
                      <strong style="color:${pct >= 70 ? 'var(--success)' : pct >= 50 ? 'var(--brand-cyan)' : 'var(--text-muted)'};">
                        ${pct > 0 ? pct + '%' : '—'}
                      </strong>
                    </td>
                    <td><span class="plan-tag plan-${i.plan}">${i.plan}</span></td>
                    <td style="font-weight:700; color:#fff;">${i.mrr ? '₹' + Number(i.mrr).toLocaleString() : 'Free Trial'}</td>
                    <td><span class="badge ${statusBadge} badge-dot">${i.status}</span></td>
                    <td style="text-align:right;">
                      <div style="display:inline-flex; gap:6px;">
                        <button class="btn btn-sm btn-secondary" onclick="window.viewInstitutionDetails('${i.id}')" title="View Details" style="font-size:11px; padding:4px 10px;">
                          View
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.toggleInstitutionStatus('${i.id}')" title="Toggle Status (${i.status === 'Active' ? 'Suspend' : 'Activate'})" style="font-size:12px; padding:4px 8px;">
                          ${i.status === 'Active' ? '⏸️' : '▶️'}
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="window.deleteInstitutionPrompt('${i.id}')" title="Delete" style="font-size:12px; padding:4px 8px; color:#f87171;">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add Institution Modal -->
    <div id="add-inst-modal" class="modal-overlay" style="display:none;">
      <div class="saas-modal">
        <div class="saas-modal-header">
          <h3 style="font-size:16px; font-weight:800; color:#fff; margin:0;">Add New University Institution</h3>
          <button class="btn-ghost" onclick="document.getElementById('add-inst-modal').style.display='none'" style="font-size:16px; cursor:pointer;">✕</button>
        </div>
        <form id="add-inst-form" onsubmit="event.preventDefault(); window.submitNewInstitution();">
          <div class="saas-modal-body">
            <div style="display:grid; grid-template-columns:1fr 2fr; gap:14px; margin-bottom:14px;">
              <div class="input-group">
                <label class="label">Short Code *</label>
                <input class="input" id="inst-short-name" placeholder="e.g. IITM" required>
              </div>
              <div class="input-group">
                <label class="label">Full Institution Name *</label>
                <input class="input" id="inst-full-name" placeholder="e.g. Indian Institute of Technology Madras" required>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
              <div class="input-group">
                <label class="label">Campus Location</label>
                <input class="input" id="inst-location" placeholder="e.g. Chennai, Tamil Nadu">
              </div>
              <div class="input-group">
                <label class="label">Admin Contact Email *</label>
                <input class="input" id="inst-email" type="email" placeholder="admin@iitm.ac.in" required>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:14px;">
              <div class="input-group">
                <label class="label">Subscription Tier *</label>
                <select class="input" id="inst-plan">
                  <option value="Enterprise">Enterprise (₹4,80,000/mo)</option>
                  <option value="Pro" selected>Pro (₹1,80,000/mo)</option>
                  <option value="Starter">Starter (₹50,000/mo)</option>
                </select>
              </div>
              <div class="input-group">
                <label class="label">Monthly MRR (₹)</label>
                <input class="input" id="inst-mrr" type="number" value="180000">
              </div>
              <div class="input-group">
                <label class="label">Initial Status</label>
                <select class="input" id="inst-status">
                  <option value="Active">Active</option>
                  <option value="Trial">Free Trial</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
              <div class="input-group">
                <label class="label">Total Enrolled Students</label>
                <input class="input" id="inst-students" type="number" value="4500">
              </div>
              <div class="input-group">
                <label class="label">Current Placed Students</label>
                <input class="input" id="inst-placed" type="number" value="3100">
              </div>
            </div>
          </div>
          <div class="saas-modal-footer">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('add-inst-modal').style.display='none'">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Institution Record</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Institution Detail Modal -->
    <div id="inst-detail-modal" class="modal-overlay" style="display:none;">
      <div class="saas-modal">
        <div class="saas-modal-header">
          <h3 style="font-size:16px; font-weight:800; color:#fff; margin:0;" id="detail-modal-title">Institution Dossier</h3>
          <button class="btn-ghost" onclick="document.getElementById('inst-detail-modal').style.display='none'" style="font-size:16px; cursor:pointer;">✕</button>
        </div>
        <div class="saas-modal-body" id="detail-modal-body">
          <!-- Filled dynamically -->
        </div>
        <div class="saas-modal-footer">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('inst-detail-modal').style.display='none'">Close</button>
        </div>
      </div>
    </div>
    `;

    // Rebind chart instances
    setTimeout(() => {
      if (typeof Chart === 'undefined') return;

      const existingChart1 = Chart.getChart('mrr-chart');
      if (existingChart1) existingChart1.destroy();
      const existingChart2 = Chart.getChart('plan-chart');
      if (existingChart2) existingChart2.destroy();

      const mrrEl = document.getElementById('mrr-chart');
      if (mrrEl) {
        new Chart(mrrEl, {
          type: 'line',
          data: {
            labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
              label: 'MRR (₹)',
              data: [1200000, 1340000, 1420000, 1580000, 1690000, 1850000, 1920000, 2040000, 2180000, 2260000, 2380000, totalMRR || 2475000],
              borderColor: '#7C3AED',
              backgroundColor: 'rgba(124,58,237,.12)',
              fill: true,
              tension: 0.4,
              pointBackgroundColor: '#22D3EE',
              pointRadius: 4,
              borderWidth: 2.5
            }]
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                grid: { color: 'rgba(255,255,255,.05)' },
                ticks: { color: '#8B949E', callback: v => '₹' + Math.round(v / 100000) + 'L' }
              },
              x: { grid: { display: false }, ticks: { color: '#8B949E' } }
            }
          }
        });
      }

      const planEl = document.getElementById('plan-chart');
      if (planEl) {
        new Chart(planEl, {
          type: 'doughnut',
          data: {
            labels: ['Enterprise', 'Pro', 'Starter'],
            datasets: [{
              data: [enterpriseCount, proCount, starterCount],
              backgroundColor: ['#7C3AED', '#22D3EE', '#10B981'],
              borderWidth: 0,
              hoverOffset: 6
            }]
          },
          options: {
            responsive: true,
            cutout: '70%',
            plugins: { legend: { display: false } }
          }
        });
      }
    }, 50);

    // Event Listeners for Filters
    const searchInput = document.getElementById('saas-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        render();
        // Keep focus
        const nextInput = document.getElementById('saas-search-input');
        if (nextInput) {
          nextInput.focus();
          nextInput.selectionStart = nextInput.selectionEnd = nextInput.value.length;
        }
      });
    }

    const planSelect = document.getElementById('saas-plan-filter');
    if (planSelect) {
      planSelect.addEventListener('change', (e) => {
        planFilter = e.target.value;
        render();
      });
    }

    const statusSelect = document.getElementById('saas-status-filter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        render();
      });
    }

    const addBtn = document.getElementById('saas-add-inst-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        document.getElementById('add-inst-modal').style.display = 'flex';
      });
    }

    const exportBtn = document.getElementById('saas-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        exportSaaSReportCSV(Store.institutions);
      });
    }
  }

  // Submit New Institution
  window.submitNewInstitution = () => {
    const shortName = document.getElementById('inst-short-name').value.trim();
    const name = document.getElementById('inst-full-name').value.trim();
    const location = document.getElementById('inst-location').value.trim() || 'India';
    const adminEmail = document.getElementById('inst-email').value.trim();
    const plan = document.getElementById('inst-plan').value;
    const mrr = parseFloat(document.getElementById('inst-mrr').value) || 0;
    const status = document.getElementById('inst-status').value;
    const students = parseInt(document.getElementById('inst-students').value) || 0;
    const placed = parseInt(document.getElementById('inst-placed').value) || 0;

    if (!shortName || !name || !adminEmail) {
      showToast('Please provide short code, institution name, and admin email.', 'warning');
      return;
    }

    const newInst = {
      id: 'inst_' + Date.now(),
      shortName,
      name,
      location,
      adminEmail,
      plan,
      mrr,
      status,
      students,
      placed,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    Store.institutions.unshift(newInst);
    saveStore();
    document.getElementById('add-inst-modal').style.display = 'none';
    showToast(`Institution "${shortName}" added successfully!`, 'success');
    render();
  };

  // Toggle Institution Status
  window.toggleInstitutionStatus = (id) => {
    const inst = Store.institutions.find(i => i.id === id);
    if (!inst) return;
    inst.status = inst.status === 'Active' ? 'Suspended' : 'Active';
    saveStore();
    showToast(`${inst.shortName} status changed to ${inst.status}`, 'info');
    render();
  };

  // Delete Institution
  window.deleteInstitutionPrompt = (id) => {
    const inst = Store.institutions.find(i => i.id === id);
    if (!inst) return;
    if (confirm(`Are you sure you want to remove institution "${inst.shortName}" (${inst.name})?`)) {
      Store.institutions = Store.institutions.filter(i => i.id !== id);
      saveStore();
      showToast(`Institution ${inst.shortName} removed.`, 'warning');
      render();
    }
  };

  // View Institution Dossier
  window.viewInstitutionDetails = (id) => {
    const inst = Store.institutions.find(i => i.id === id);
    if (!inst) return;

    const body = document.getElementById('detail-modal-body');
    const pct = inst.students ? Math.round((inst.placed / inst.students) * 100) : 0;

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div>
          <h2 style="font-size:20px; font-weight:800; color:#fff; margin:0 0 4px;">${inst.shortName}</h2>
          <div style="font-size:13px; color:var(--text-secondary);">${inst.name}</div>
          <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">📍 ${inst.location || 'India'} · Joined ${inst.joinedDate || '2023'}</div>
        </div>
        <span class="plan-tag plan-${inst.plan}" style="font-size:12px; padding:4px 12px;">${inst.plan} Plan</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:20px;">
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:14px;">
          <div style="font-size:11px; color:var(--text-muted);">Enrolled Students</div>
          <div style="font-size:18px; font-weight:800; color:#fff; margin-top:2px;">${(inst.students||0).toLocaleString()}</div>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:14px;">
          <div style="font-size:11px; color:var(--text-muted);">Placed Students</div>
          <div style="font-size:18px; font-weight:800; color:#34D399; margin-top:2px;">${(inst.placed||0).toLocaleString()} (${pct}%)</div>
        </div>
        <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:14px;">
          <div style="font-size:11px; color:var(--text-muted);">Monthly Billing</div>
          <div style="font-size:18px; font-weight:800; color:#22D3EE; margin-top:2px;">₹${(inst.mrr||0).toLocaleString()}</div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:10px; padding:16px; margin-bottom:16px;">
        <div style="font-size:12px; font-weight:700; color:var(--text-primary); margin-bottom:8px;">Administrative Metadata</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
          <div><span style="color:var(--text-muted);">Contact Email:</span> <strong style="color:#fff;">${inst.adminEmail || 'admin@' + (inst.shortName||'').toLowerCase() + '.edu'}</strong></div>
          <div><span style="color:var(--text-muted);">Tenant Status:</span> <strong style="color:${inst.status==='Active'?'var(--success)':'var(--warning)'};">${inst.status}</strong></div>
          <div><span style="color:var(--text-muted);">Annual Contract (ARR):</span> <strong style="color:#fff;">₹${((inst.mrr*12)/100000).toFixed(1)}L</strong></div>
          <div><span style="color:var(--text-muted);">Security Tier:</span> <strong style="color:var(--brand-primary);">SOC2 Type II + Dedicated Tenant</strong></div>
        </div>
      </div>
    `;

    document.getElementById('inst-detail-modal').style.display = 'flex';
  };

  // Export CSV Helper
  function exportSaaSReportCSV(institutions) {
    const headers = ['ID', 'ShortCode', 'UniversityName', 'Location', 'Plan', 'MRR_INR', 'ARR_INR', 'Students', 'Placed', 'PlacementPct', 'Status', 'AdminEmail', 'JoinedDate'];
    const rows = institutions.map(i => {
      const pct = i.students ? Math.round((i.placed / i.students) * 100) : 0;
      return [
        `"${i.id}"`,
        `"${i.shortName}"`,
        `"${i.name}"`,
        `"${i.location || ''}"`,
        `"${i.plan}"`,
        i.mrr || 0,
        (i.mrr || 0) * 12,
        i.students || 0,
        i.placed || 0,
        `"${pct}%"`,
        `"${i.status}"`,
        `"${i.adminEmail || ''}"`,
        `"${i.joinedDate || ''}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Placenix_SaaS_Billing_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('SaaS Billing Report CSV generated successfully!', 'success');
  }

  // Initial render
  render();
}
