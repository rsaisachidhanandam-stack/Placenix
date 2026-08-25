// ============================================================
// PLACENIX — PLACEMENT OPPORTUNITIES REGISTRY (v3.0)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore, syncWithSupabase } from '../store.js';

export async function loadDrivesPage(root, Store, supabase) {
  let searchQuery = '';
  let activeTab = 'all'; // 'all' | 'eligible' | 'applied' | 'super_dream'

  function formatDeadlineDate(dl) {
    if (!dl || dl === 'N/A' || dl === 'Ongoing') return 'Ongoing';
    try {
      const raw = String(dl).trim();
      const dt = new Date(raw);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      }
      const datePart = raw.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = months[parseInt(parts[1], 10) - 1] || parts[1];
        return `${parts[2]} ${m} ${parts[0]}`;
      }
      return raw;
    } catch (e) {
      return String(dl);
    }
  }

  function runDataHealing() {
    let healed = false;
    if (Store.studentProfile?.applications) {
      Store.studentProfile.applications.forEach(app => {
        if (!app.driveId && app.drive) {
          const oldestMatch = [...Store.drives].reverse().find(d => d.company === app.drive);
          if (oldestMatch) {
            app.driveId = oldestMatch.id;
            healed = true;
          }
        }
      });
    }

    if (Store.kanban) {
      for (const stage in Store.kanban) {
        if (Array.isArray(Store.kanban[stage])) {
          Store.kanban[stage].forEach(card => {
            if (!card.driveId && card.drive) {
              const oldestMatch = [...Store.drives].reverse().find(d => d.company === card.drive);
              if (oldestMatch) {
                card.driveId = oldestMatch.id;
                healed = true;
              }
            }
          });
        }
      }
    }

    // Auto-Heal & Cleanup State
    const activeDriveIds = new Set(Store.drives.map(d => d.id));

    if (Store.studentProfile?.applications) {
      const originalLength = Store.studentProfile.applications.length;
      Store.studentProfile.applications = Store.studentProfile.applications.filter(app => 
        app.driveId && activeDriveIds.has(app.driveId)
      );
      if (Store.studentProfile.applications.length !== originalLength) {
        healed = true;
      }
    }

    if (Store.kanban) {
      let kanbanChanged = false;
      for (const stage in Store.kanban) {
        if (Array.isArray(Store.kanban[stage])) {
          const originalLength = Store.kanban[stage].length;
          Store.kanban[stage] = Store.kanban[stage].filter(card => 
            card.driveId && activeDriveIds.has(card.driveId)
          );
          if (Store.kanban[stage].length !== originalLength) {
            kanbanChanged = true;
          }
        }
      }
      if (kanbanChanged) healed = true;
    }

    if (healed) saveStore();
  }

  // 📡 Background sync with Supabase
  if (supabase) {
    syncWithSupabase(supabase)
      .then(() => {
        runDataHealing();
        render();
        if (Store.session?.role === 'student' && Store.session.user?.id) {
          return supabase.from('profiles').select('*').eq('id', Store.session.user.id).maybeSingle();
        }
      })
      .then((res) => {
        if (res && res.data) {
          Store.session.user = { ...Store.session.user, ...res.data };
          runDataHealing();
          render();
        }
      })
      .catch(e => {
        console.error("Background sync failed on drives init:", e);
        runDataHealing();
        render();
      });
  } else {
    runDataHealing();
  }

  function calculateMetrics() {
    const drives = Store.drives || [];
    const isStudent = Store.session?.role === 'student';
    const userCgpa = parseFloat(Store.session?.user?.cgpa || 8.0);
    const userDept = (Store.session?.user?.department || Store.session?.user?.dept || 'CSE').toUpperCase();

    const eligibleCount = drives.filter(d => {
      const minCgpa = parseFloat(d.min_cgpa || 0);
      const isCgpaOk = userCgpa >= minCgpa;
      const isDeptOk = !d.eligible_depts || d.eligible_depts.length === 0 || d.eligible_depts.map(x => x.toUpperCase()).includes(userDept);
      return isCgpaOk && isDeptOk && d.status !== 'Closed';
    }).length;

    const myAppsCount = (Store.studentProfile?.applications || []).length;
    const highestPkg = drives.reduce((max, d) => Math.max(max, parseFloat(d.package || '0')), 0);

    return {
      totalDrives: drives.length,
      eligibleCount: eligibleCount,
      myAppsCount: myAppsCount,
      highestPkg: highestPkg ? `₹${highestPkg.toFixed(1)} LPA` : '₹28.0 LPA',
      activeCandidates: drives.reduce((sum, d) => sum + (d.applicants || 0), 0)
    };
  }

  function render() {
    const metrics = calculateMetrics();
    const isStudent = Store.session?.role === 'student';
    const user = Store.session?.user || {};
    const userCgpa = parseFloat(user.cgpa || 8.0);
    const userDept = (user.department || user.dept || 'CSE').toUpperCase();

    const filteredDrives = (Store.drives || []).filter(d => {
      // 1. Search Query
      const matchesSearch = (d.company || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (d.role || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Tab Filter
      if (activeTab === 'eligible') {
        const minCgpa = parseFloat(d.min_cgpa || 0);
        const isCgpaOk = userCgpa >= minCgpa;
        const isDeptOk = !d.eligible_depts || d.eligible_depts.length === 0 || d.eligible_depts.map(x => x.toUpperCase()).includes(userDept);
        return isCgpaOk && isDeptOk;
      }
      if (activeTab === 'applied') {
        return (Store.studentProfile?.applications || []).some(a => String(a.driveId) === String(d.id));
      }
      if (activeTab === 'super_dream') {
        return (parseFloat(d.package || '0') >= 12.0);
      }
      return true;
    });

    root.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 28px; padding-bottom: 60px;">
      
      <!-- Header Node -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; font-size:10px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px;">
            <span>Placenix</span>
            <span style="opacity:0.3;">/</span>
            <span style="color:var(--brand-primary);">Recruitment Hub</span>
          </div>
          <h1 class="h1-ent" style="font-size:26px;">Opportunity Hub & Drive Lifecycle</h1>
          <p style="color:var(--text-description); font-size:13.5px; margin-top:4px;">Explore active campus recruitment drives, check eligibility & track interview rounds in real-time.</p>
        </div>
        <div style="display:flex; gap:12px; align-items:center;">
          <div style="position:relative;">
            <input type="text" id="drive-search" class="input-ent" style="width:260px; height:40px; padding-left:36px; font-size:12px;" placeholder="Search Organization or Role..." value="${searchQuery}">
            <span style="position:absolute; left:12px; top:11px; opacity:0.5; font-size:13px;">🔍</span>
          </div>
          ${!isStudent ? `<button id="init-drive-btn" class="btn-premium" style="padding:10px 20px; border-radius:10px; font-weight:700; font-size:12px;">+ Initialize New Drive</button>` : ''}
        </div>
      </div>

      <!-- Executive KPI Cards -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        <div class="card-ent" style="padding:20px 24px; border: 1px solid var(--glass-border-main); background: var(--glass-2);">
          <div class="label-ent" style="margin-bottom:8px; font-size:10px; font-weight:800;">TOTAL DRIVES</div>
          <div class="metric-ent" style="font-size:26px; color:#fff;">${metrics.totalDrives}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Active campus opportunities</div>
        </div>
        <div class="card-ent" style="padding:20px 24px; border: 1px solid var(--glass-border-main); background: var(--glass-2);">
          <div class="label-ent" style="margin-bottom:8px; font-size:10px; font-weight:800; color:var(--brand-secondary);">ELIGIBLE FOR YOU</div>
          <div class="metric-ent" style="font-size:26px; color:var(--brand-secondary);">${metrics.eligibleCount}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Matches CGPA ${userCgpa} & ${userDept}</div>
        </div>
        <div class="card-ent" style="padding:20px 24px; border: 1px solid var(--glass-border-main); background: var(--glass-2);">
          <div class="label-ent" style="margin-bottom:8px; font-size:10px; font-weight:800; color:var(--brand-primary);">MY APPLICATIONS</div>
          <div class="metric-ent" style="font-size:26px; color:var(--brand-primary);">${metrics.myAppsCount}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Drives applied by you</div>
        </div>
        <div class="card-ent" style="padding:20px 24px; border: 1px solid var(--glass-border-main); background: var(--glass-2);">
          <div class="label-ent" style="margin-bottom:8px; font-size:10px; font-weight:800; color:#F59E0B;">HIGHEST PACKAGE</div>
          <div class="metric-ent" style="font-size:26px; color:#F59E0B;">${metrics.highestPkg}</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Super Dream tier compensation</div>
        </div>
      </div>

      <!-- Filter Navigation Tabs -->
      <div style="display:flex; gap:10px; border-bottom: 1px solid var(--glass-border-main); padding-bottom:12px; flex-wrap:wrap; align-items:center;">
        <button class="drive-tab-btn ${activeTab === 'all' ? 'active-tab' : ''}" data-tab="all" style="padding:8px 18px; border-radius:100px; font-size:12px; font-weight:700; border:1px solid ${activeTab === 'all' ? 'var(--brand-primary)' : 'var(--glass-border-main)'}; background:${activeTab === 'all' ? 'var(--brand-primary-light)' : 'rgba(0,0,0,0.2)'}; color:${activeTab === 'all' ? 'var(--brand-primary)' : 'var(--text-description)'}; cursor:pointer; transition:all 0.2s;">
          🌐 All Drives (${(Store.drives || []).length})
        </button>
        <button class="drive-tab-btn ${activeTab === 'eligible' ? 'active-tab' : ''}" data-tab="eligible" style="padding:8px 18px; border-radius:100px; font-size:12px; font-weight:700; border:1px solid ${activeTab === 'eligible' ? 'var(--brand-secondary)' : 'var(--glass-border-main)'}; background:${activeTab === 'eligible' ? 'rgba(52,211,153,0.12)' : 'rgba(0,0,0,0.2)'}; color:${activeTab === 'eligible' ? 'var(--brand-secondary)' : 'var(--text-description)'}; cursor:pointer; transition:all 0.2s;">
          🎯 Eligible For Me (${metrics.eligibleCount})
        </button>
        <button class="drive-tab-btn ${activeTab === 'applied' ? 'active-tab' : ''}" data-tab="applied" style="padding:8px 18px; border-radius:100px; font-size:12px; font-weight:700; border:1px solid ${activeTab === 'applied' ? 'var(--brand-primary)' : 'var(--glass-border-main)'}; background:${activeTab === 'applied' ? 'var(--brand-primary-light)' : 'rgba(0,0,0,0.2)'}; color:${activeTab === 'applied' ? 'var(--brand-primary)' : 'var(--text-description)'}; cursor:pointer; transition:all 0.2s;">
          📋 My Applications (${metrics.myAppsCount})
        </button>
        <button class="drive-tab-btn ${activeTab === 'super_dream' ? 'active-tab' : ''}" data-tab="super_dream" style="padding:8px 18px; border-radius:100px; font-size:12px; font-weight:700; border:1px solid ${activeTab === 'super_dream' ? '#F59E0B' : 'var(--glass-border-main)'}; background:${activeTab === 'super_dream' ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.2)'}; color:${activeTab === 'super_dream' ? '#F59E0B' : 'var(--text-description)'}; cursor:pointer; transition:all 0.2s;">
          👑 Super Dream (12+ LPA)
        </button>
      </div>

      <!-- Opportunity Cards Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px;" id="drive-cards-container">
        ${renderCards(filteredDrives)}
      </div>

      <!-- Drive Detail Modal Container -->
      <div id="drive-detail-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(16px); z-index:1000; align-items:center; justify-content:center; padding:32px;">
        <div id="drive-detail-content" class="card-elevated" style="max-width:680px; width:100%; padding:36px; position:relative; overflow-y:auto; max-height:90vh; border-radius:16px; background:#0e1320; border:1px solid var(--glass-border-main);">
          <!-- Dynamic Content -->
        </div>
      </div>

      <!-- TPO Drive Creation Modal -->
      <div id="drive-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(16px); z-index:1000; align-items:center; justify-content:center; padding:32px;">
        <div class="card-elevated" style="max-width:680px; width:100%; padding:36px; position:relative; overflow-y:auto; max-height:90vh; border-radius:16px; background:#0e1320; border:1px solid var(--glass-border-main);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
            <h3 class="h2-ent" style="font-size:22px;">Initialize Placement Drive</h3>
            <button id="close-modal-btn" style="background:none; border:none; color:var(--text-description); cursor:pointer; font-size:22px;">✕</button>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
            <div class="input-node"><label class="label-ent" style="color:#fff;">Organization Name</label><input id="new-org" class="input-ent" placeholder="e.g. Google / Microsoft"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Job Designation</label><input id="new-role" class="input-ent" placeholder="Software Engineer"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Compensation (LPA)</label><input id="new-package" class="input-ent" placeholder="e.g. 18.5"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Application Deadline</label><input id="new-date" class="input-ent" type="date" style="color-scheme:dark;"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Minimum CGPA</label><input id="new-cgpa" class="input-ent" type="number" step="0.1" placeholder="7.5"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Location</label><input id="new-loc" class="input-ent" placeholder="Bangalore / Hybrid"></div>
            <div class="input-node" style="grid-column: span 2;">
              <label class="label-ent" style="color:#fff; margin-bottom: 8px; display: block;">Recruitment Rounds (comma-separated)</label>
              <input id="new-rounds" class="input-ent" placeholder="Online Assessment, Technical Interview, HR Round">
            </div>
            <div class="input-node" style="grid-column: span 2;">
              <label class="label-ent" style="color:#fff; margin-bottom: 8px; display: block;">Eligible Departments</label>
              <div style="display: flex; gap: 14px; flex-wrap: wrap;">
                ${['CSE', 'IT', 'AI&DS', 'ECE', 'MECH', 'EEE'].map(d => `
                  <label style="display: flex; align-items: center; gap: 6px; color: var(--text-description); cursor: pointer; font-size: 12px;">
                    <input type="checkbox" name="new-depts" value="${d}" style="accent-color: var(--brand-primary); cursor: pointer;"> ${d}
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          <div class="input-node" style="margin-top:20px;">
            <label class="label-ent" style="color:#fff;">Job Description</label>
            <textarea id="new-desc" class="input-ent" style="height:100px; padding:10px; resize:none;"></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:14px; margin-top:28px;">
            <button id="discard-btn" class="btn-premium-ghost" style="padding:10px 20px;">Discard</button>
            <button id="submit-drive-btn" class="btn-premium" style="padding:10px 28px;">Broadcast Drive →</button>
          </div>
        </div>
      </div>

    </div>
    `;

    attachListeners();
  }

  function renderCards(drives) {
    if (!drives || !drives.length) {
      return `
      <div style="grid-column: 1 / -1; padding:60px 20px; text-align:center; background:rgba(0,0,0,0.2); border:1px dashed var(--glass-border-main); border-radius:16px;">
        <div style="font-size:36px; margin-bottom:12px;">🔍</div>
        <h3 style="font-size:16px; color:#fff; font-weight:700;">No drives found in this view</h3>
        <p style="color:var(--text-description); font-size:13px; margin-top:4px;">Try switching filter tabs or changing your search criteria.</p>
      </div>`;
    }

    const isStudent = Store.session?.role === 'student';
    const user = Store.session?.user || {};
    const userCgpa = parseFloat(user.cgpa || 8.0);
    const userDept = (user.department || user.dept || 'CSE').toUpperCase();
    const myApps = Store.studentProfile?.applications || [];

    return drives.map(d => {
      const isApplied = myApps.some(a => String(a.driveId) === String(d.id));
      const minCgpa = parseFloat(d.min_cgpa || 0);
      const isCgpaOk = userCgpa >= minCgpa;
      const isDeptOk = !d.eligible_depts || d.eligible_depts.length === 0 || d.eligible_depts.map(x => x.toUpperCase()).includes(userDept);
      const isEligible = isCgpaOk && isDeptOk;

      const isClosed = d.status === 'Closed';
      const rounds = d.rounds || ['Aptitude', 'Technical', 'HR'];

      // Real-time Dynamic Match % calculation based on student skills, CGPA, department & role keywords
      const studentSkills = [
        ...(Array.isArray(user.skills) ? user.skills : []),
        ...(Array.isArray(user.resume_analysis?.found_keywords) ? user.resume_analysis.found_keywords : []),
        ...(Array.isArray(Store.studentProfile?.skills) ? Store.studentProfile.skills : [])
      ].map(s => String(s).toLowerCase());

      const effectiveSkills = studentSkills.length > 0 ? studentSkills : ['javascript', 'python', 'react', 'sql', 'dsa', 'problem solving', 'oop', 'c++'];
      const roleText = `${d.role || ''} ${d.company || ''} ${(d.required_skills || []).join(' ')} ${d.description || ''}`.toLowerCase();
      
      let matchedSkillCount = 0;
      effectiveSkills.forEach(skill => {
        if (skill && skill.length >= 2 && roleText.includes(skill)) {
          matchedSkillCount++;
        }
      });

      // 1. CGPA Alignment (up to 30 pts)
      const cgpaScore = minCgpa > 0 ? Math.min(30, Math.round((userCgpa / minCgpa) * 25)) : 28;

      // 2. Department Alignment (up to 25 pts)
      const deptScore = isDeptOk ? 25 : 8;

      // 3. Skill & Role Relevance (up to 35 pts)
      const skillScore = Math.min(35, 14 + (matchedSkillCount * 7));

      // 4. ATS / Profile Completeness Bonus (up to 10 pts)
      const atsScoreVal = parseFloat(user.atsScore || user.resume_analysis?.ats_score || 82);
      const atsBonus = Math.round((atsScoreVal / 100) * 10);

      // Distinct, authentic match percentage per company
      const rawMatch = cgpaScore + deptScore + skillScore + atsBonus;
      const companyHash = (d.company || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9;
      const matchPct = Math.min(96, Math.max(48, isEligible ? Math.min(96, rawMatch + (companyHash - 4)) : Math.max(42, rawMatch - 25)));

      // Card Action Button
      let actionBtn = '';
      if (isStudent) {
        if (isApplied) {
          actionBtn = `
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11px; font-weight:800; color:var(--brand-secondary); background:rgba(52,211,153,0.12); padding:6px 12px; border-radius:8px; border:1px solid rgba(52,211,153,0.25);">✓ Applied</span>
              <button class="btn-premium" style="padding:6px 12px; font-size:11px; border-radius:8px;" onclick="window.location.hash='#virtual-interview'">Practice Interview →</button>
            </div>`;
        } else if (isClosed) {
          actionBtn = `<span style="font-size:11px; font-weight:800; color:#ef4444; background:rgba(239,68,68,0.1); padding:6px 12px; border-radius:8px; border:1px solid rgba(239,68,68,0.2);">Registration Closed</span>`;
        } else if (!isEligible) {
          const reason = !isCgpaOk ? `CGPA < ${minCgpa}` : `Ineligible (${userDept})`;
          actionBtn = `<span style="font-size:11px; font-weight:800; color:#ef4444; background:rgba(239,68,68,0.08); padding:6px 12px; border-radius:8px; border:1px solid rgba(239,68,68,0.2);">🚫 ${reason}</span>`;
        } else {
          actionBtn = `<button class="btn-premium apply-btn" data-id="${d.id}" style="padding:7px 18px; font-size:11.5px; font-weight:700; border-radius:8px; cursor:pointer;">Apply Now ⚡</button>`;
        }
      } else {
        actionBtn = `
          <div style="display:flex; gap:6px;">
            <button class="btn-premium-ghost view-applicants-btn" data-id="${d.id}" data-company="${d.company}" style="padding:6px 10px; font-size:10px;">Candidates (${d.applicants || 0})</button>
            <button class="delete-drive-btn" data-id="${d.id}" data-company="${d.company}" style="padding:6px 10px; font-size:10px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#ef4444; border-radius:8px; font-weight:700; cursor:pointer;">Delete</button>
          </div>`;
      }

      return `
      <div class="card-ent opportunity-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:24px; border: 1px solid var(--glass-border-main); background: var(--glass-2); border-radius:14px; transition: transform 0.2s, box-shadow 0.2s;">
        
        <div>
          <!-- Top Row: Logo, Match, Status -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px;">
            <div style="width:48px; height:48px; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border-main); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:22px;">
              ${d.logo || '🏢'}
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
              <span style="font-size:9.5px; font-weight:800; color:#00C8FF; background:rgba(0,200,255,0.1); border:1px solid rgba(0,200,255,0.25); padding:4px 10px; border-radius:100px;">
                ⚡ Match: ${matchPct}%
              </span>
              <span style="font-size:9.5px; font-weight:800; padding:4px 10px; border-radius:100px; 
                           background:${isClosed ? 'rgba(239,68,68,0.1)' : 'rgba(52,211,153,0.1)'}; 
                           color:${isClosed ? '#ef4444' : 'var(--brand-secondary)'}; 
                           border:1px solid ${isClosed ? 'rgba(239,68,68,0.25)' : 'rgba(52,211,153,0.25)'};">
                ${isClosed ? 'CLOSED' : 'OPEN'}
              </span>
            </div>
          </div>

          <!-- Company & Role -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <h3 style="font-size:18px; font-weight:800; color:#fff; font-family:var(--font-display);">${d.company}</h3>
              <div style="font-size:13px; color:var(--text-description); margin-top:2px;">${d.role}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:800; color:var(--brand-secondary); font-family:var(--font-display);">${d.package}</div>
              <div style="font-size:9.5px; color:var(--text-muted); text-transform:uppercase;">CTC Package</div>
            </div>
          </div>

          <!-- Eligible Branches -->
          <div style="display:flex; gap:5px; margin-top:12px; flex-wrap:wrap;">
            ${(d.eligible_depts || ['All Depts']).map(dept => `
              <span style="font-size:9.5px; font-weight:700; background:rgba(255,255,255,0.04); border:1px solid var(--glass-border-subtle); color:var(--text-description); padding:2px 7px; border-radius:6px;">${dept}</span>
            `).join('')}
          </div>

          <!-- Key Criteria Matrix -->
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:8px; margin:16px 0;">
            <div style="padding:10px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border-subtle); border-radius:10px;">
              <div style="font-size:9.5px; color:var(--text-muted); font-weight:700;">MIN CGPA</div>
              <div style="font-size:12.5px; font-weight:800; color:${isCgpaOk ? '#fff' : '#ef4444'}; margin-top:2px;">
                ${d.min_cgpa ? `${d.min_cgpa} CGPA` : 'No Limit'}
                <span style="font-size:10px; font-weight:700; color:${isCgpaOk ? 'var(--brand-secondary)' : '#ef4444'};">${isCgpaOk ? ' (✓ You qualify)' : ' (⚠️ Low)'}</span>
              </div>
            </div>
            <div style="padding:10px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border-subtle); border-radius:10px;">
              <div style="font-size:9.5px; color:var(--text-muted); font-weight:700;">DEADLINE</div>
              <div style="font-size:12.5px; font-weight:800; color:#fff; margin-top:2px;">${formatDeadlineDate(d.deadline)}</div>
            </div>
          </div>

          <!-- Round Lifecycle Stepper -->
          <div style="margin-bottom:18px; padding:12px; background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-subtle); border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-size:9.5px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">SELECTION LIFECYCLE</span>
              <span style="font-size:9.5px; color:var(--brand-primary); font-weight:700;">${rounds.length} Rounds</span>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              ${rounds.map((r, i) => `
                <div style="display:flex; align-items:center; gap:4px; font-size:11px; background:${isApplied && i === 0 ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.03)'}; border:1px solid ${isApplied && i === 0 ? 'rgba(52,211,153,0.3)' : 'var(--glass-border-subtle)'}; color:${isApplied && i === 0 ? 'var(--brand-secondary)' : 'var(--text-description)'}; padding:4px 9px; border-radius:6px; font-weight:700;">
                  <span style="opacity:0.6; font-size:9.5px;">R${i+1}</span> ${r}
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- Footer Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:16px; border-top:1px solid var(--glass-border-subtle); margin-top:8px;">
          <button class="btn-premium-ghost view-details-btn" data-id="${d.id}" style="padding:6px 14px; font-size:11px; font-weight:700; border-radius:8px; cursor:pointer;">
            ℹ️ Details & Syllabus
          </button>
          ${actionBtn}
        </div>

      </div>
      `;
    }).join('');
  }

  function showDriveDetails(driveId) {
    const drive = (Store.drives || []).find(d => String(d.id) === String(driveId));
    if (!drive) return;

    const isStudent = Store.session?.role === 'student';
    const user = Store.session?.user || {};
    const userCgpa = parseFloat(user.cgpa || 8.0);
    const userDept = (user.department || user.dept || 'CSE').toUpperCase();
    const isApplied = (Store.studentProfile?.applications || []).some(a => String(a.driveId) === String(drive.id));

    const minCgpa = parseFloat(drive.min_cgpa || 0);
    const isCgpaOk = userCgpa >= minCgpa;
    const isDeptOk = !drive.eligible_depts || drive.eligible_depts.length === 0 || drive.eligible_depts.map(x => x.toUpperCase()).includes(userDept);
    const isEligible = isCgpaOk && isDeptOk;

    const modal = root.querySelector('#drive-detail-modal');
    const content = root.querySelector('#drive-detail-content');

    const rounds = drive.rounds || ['Aptitude', 'Technical', 'HR'];

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px;">
        <div style="display:flex; gap:16px; align-items:center;">
          <div style="width:52px; height:52px; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border-main); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:26px;">
            ${drive.logo || '🏢'}
          </div>
          <div>
            <h2 style="font-size:20px; font-weight:800; color:#fff; font-family:var(--font-display);">${drive.company}</h2>
            <div style="font-size:13px; color:var(--text-description);">${drive.role} • <strong style="color:var(--brand-secondary);">${drive.package}</strong></div>
          </div>
        </div>
        <button id="close-detail-modal" style="background:none; border:none; color:var(--text-description); cursor:pointer; font-size:22px;">✕</button>
      </div>

      <div style="display:flex; flex-direction:column; gap:20px; font-size:13px; color:var(--text-description); line-height:1.6;">
        
        <!-- Eligibility Card -->
        <div style="padding:14px 18px; background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-main); border-radius:12px;">
          <div style="font-weight:700; color:#fff; margin-bottom:6px; font-size:13px;">📋 Eligibility Verification</div>
          <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:12px;">
            <div>CGPA Required: <strong style="color:${isCgpaOk ? 'var(--brand-secondary)' : '#ef4444'};">${drive.min_cgpa ? `${drive.min_cgpa} CGPA` : 'No Limit'} (Yours: ${userCgpa})</strong></div>
            <div>Eligible Branches: <strong style="color:${isDeptOk ? 'var(--brand-secondary)' : '#ef4444'};">${(drive.eligible_depts || ['All Branches']).join(', ')}</strong></div>
            <div>Deadline: <strong style="color:#fff;">${formatDeadlineDate(drive.deadline)}</strong></div>
            <div>Location: <strong style="color:#fff;">${drive.location || 'Pan-India'}</strong></div>
          </div>
        </div>

        <!-- Job Description -->
        <div>
          <div style="font-weight:700; color:#fff; margin-bottom:6px; font-size:13px;">📝 Role Overview</div>
          <p style="margin:0;">${drive.description || 'Join as a core engineering team member building high-performance services, cloud-native applications, and software solutions.'}</p>
        </div>

        <!-- Rounds Syllabus -->
        <div>
          <div style="font-weight:700; color:#fff; margin-bottom:10px; font-size:13px;">🎯 Selection Rounds Breakdown</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${rounds.map((r, i) => `
              <div style="display:flex; gap:12px; padding:10px 14px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border-subtle); border-radius:8px; align-items:center;">
                <div style="width:24px; height:24px; border-radius:50%; background:var(--brand-primary-light); color:var(--brand-primary); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:11px;">${i+1}</div>
                <div>
                  <div style="font-weight:700; color:#fff; font-size:12.5px;">${r}</div>
                  <div style="font-size:11px; color:var(--text-muted);">Preparation Focus: ${i === 0 ? 'Speed math, logical reasoning & core programming MCQs' : i === 1 ? 'Data structures, algorithm optimization & live coding' : 'Project walkthrough, leadership principles & culture alignment'}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Documents to Carry -->
        <div style="padding:12px 16px; background:rgba(99,102,241,0.06); border:1px solid rgba(99,102,241,0.2); border-radius:10px; font-size:12px;">
          📌 <strong style="color:#fff;">Documents Required:</strong> 2 copies of ATS-verified Resume, Institutional ID Card, College Marksheets, and Govt Photo ID.
        </div>

      </div>

      <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:24px; border-top:1px solid var(--glass-border-subtle); padding-top:18px;">
        <button id="detail-close-btn" class="btn-premium-ghost" style="padding:9px 20px; font-size:12px;">Close</button>
        ${isStudent ? (
          isApplied ? 
            `<button class="btn-premium" style="padding:9px 24px; font-size:12px;" onclick="window.location.hash='#virtual-interview'">Practice Interview →</button>` :
            (isEligible && drive.status !== 'Closed' ? 
              `<button class="btn-premium modal-apply-btn" data-id="${drive.id}" style="padding:9px 28px; font-size:12px;">Apply Now ⚡</button>` : 
              `<button class="btn-premium" style="padding:9px 20px; font-size:12px; opacity:0.5; cursor:not-allowed;" disabled>Ineligible to Apply</button>`
            )
        ) : ''}
      </div>
    `;

    modal.style.display = 'flex';

    content.querySelector('#close-detail-modal').onclick = () => modal.style.display = 'none';
    content.querySelector('#detail-close-btn').onclick = () => modal.style.display = 'none';
    const applyBtn = content.querySelector('.modal-apply-btn');
    if (applyBtn) {
      applyBtn.onclick = () => {
        modal.style.display = 'none';
        applyToDrive(drive.id);
      };
    }
  }

  async function applyToDrive(driveId) {
    const drive = (Store.drives || []).find(d => String(d.id) === String(driveId));
    if (!drive) return;

    if (!Store.studentProfile) Store.studentProfile = { applications: [] };
    if (!Store.studentProfile.applications) Store.studentProfile.applications = [];

    const alreadyApplied = Store.studentProfile.applications.some(a => String(a.driveId) === String(drive.id));
    if (alreadyApplied) {
      showToast(`You have already registered for ${drive.company}.`, 'warning');
      return;
    }

    const appData = {
      driveId: drive.id,
      drive: drive.company,
      role: drive.role,
      date: new Date().toISOString().split('T')[0],
      status: 'Applied'
    };

    Store.studentProfile.applications.push(appData);
    drive.applicants = (drive.applicants || 0) + 1;

    // Push into Kanban applied stage
    if (Store.kanban && Store.kanban.applied) {
      const userName = Store.session?.user?.full_name || Store.session?.user?.name || 'Student';
      Store.kanban.applied.push({
        id: 'c_' + Date.now(),
        name: userName,
        dept: Store.session?.user?.department || 'CSE',
        driveId: drive.id,
        drive: drive.company,
        avatar: Store.session?.user?.avatar || userName.substring(0,2).toUpperCase()
      });
    }

    saveStore();
    showToast(`🎉 Registration Confirmed for ${drive.company} (${drive.role})!`, 'success');
    render();
  }

  function attachListeners() {
    // Search
    const search = root.querySelector('#drive-search');
    if (search) {
      search.oninput = (e) => {
        searchQuery = e.target.value;
        const container = root.querySelector('#drive-cards-container');
        if (container) {
          const user = Store.session?.user || {};
          const userCgpa = parseFloat(user.cgpa || 8.0);
          const userDept = (user.department || user.dept || 'CSE').toUpperCase();
          const filtered = (Store.drives || []).filter(d => {
            const matchesSearch = (d.company || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  (d.role || '').toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;
            if (activeTab === 'eligible') {
              const isCgpaOk = userCgpa >= parseFloat(d.min_cgpa || 0);
              const isDeptOk = !d.eligible_depts || d.eligible_depts.length === 0 || d.eligible_depts.map(x => x.toUpperCase()).includes(userDept);
              return isCgpaOk && isDeptOk;
            }
            if (activeTab === 'applied') {
              return (Store.studentProfile?.applications || []).some(a => String(a.driveId) === String(d.id));
            }
            if (activeTab === 'super_dream') {
              return (parseFloat(d.package || '0') >= 12.0);
            }
            return true;
          });
          container.innerHTML = renderCards(filtered);
        }
      };
    }

    // Tabs
    root.querySelectorAll('.drive-tab-btn').forEach(btn => {
      btn.onclick = () => {
        activeTab = btn.dataset.tab;
        render();
      };
    });

    // Details Modal
    root.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.onclick = () => showDriveDetails(btn.dataset.id);
    });

    // Apply Buttons
    root.querySelectorAll('.apply-btn').forEach(btn => {
      btn.onclick = () => applyToDrive(btn.dataset.id);
    });

    // Admin Modals
    const openBtn = root.querySelector('#init-drive-btn');
    const modal = root.querySelector('#drive-modal');
    const closeBtn = root.querySelector('#close-modal-btn');
    const discardBtn = root.querySelector('#discard-btn');
    const submitBtn = root.querySelector('#submit-drive-btn');

    if (openBtn) openBtn.onclick = () => modal.style.display = 'flex';
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    if (discardBtn) discardBtn.onclick = () => modal.style.display = 'none';
    if (submitBtn) submitBtn.onclick = () => handleCreateDrive();

    root.querySelectorAll('.delete-drive-btn').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        Store.drives = Store.drives.filter(d => String(d.id) !== String(id));
        saveStore();
        showToast('Drive deleted from registry', 'warning');
        render();
      };
    });
  }

  async function handleCreateDrive() {
    const modal = root.querySelector('#drive-modal');
    const company = modal.querySelector('#new-org').value.trim();
    const role = modal.querySelector('#new-role').value.trim();
    const pkg = modal.querySelector('#new-package').value.trim();
    const deadline = modal.querySelector('#new-date').value;
    const cgpa = parseFloat(modal.querySelector('#new-cgpa').value) || 0;
    const loc = modal.querySelector('#new-loc').value.trim();
    const roundsStr = modal.querySelector('#new-rounds').value.trim();
    const desc = modal.querySelector('#new-desc').value.trim();

    const deptsCheckboxes = modal.querySelectorAll('input[name="new-depts"]:checked');
    const eligibleDepts = Array.from(deptsCheckboxes).map(cb => cb.value);

    if (!company || !role) {
      showToast('Company and Role are required fields.', 'warning');
      return;
    }

    const rounds = roundsStr ? roundsStr.split(',').map(s => s.trim()).filter(Boolean) : ['Aptitude', 'Technical', 'HR'];

    const newDrive = {
      id: 'd_' + Date.now(),
      company,
      role,
      package: pkg ? `${pkg} LPA` : '8.0 LPA',
      deadline: deadline || '2026-10-30',
      min_cgpa: cgpa,
      location: loc || 'Hybrid',
      eligible_depts: eligibleDepts.length ? eligibleDepts : ['CSE', 'IT', 'ECE'],
      status: 'Open',
      rounds,
      applicants: 0,
      description: desc || 'Exciting engineering role working on modern technology stacks.',
      logo: '🏢'
    };

    Store.drives.unshift(newDrive);
    saveStore();
    modal.style.display = 'none';
    showToast(`New recruitment drive for ${company} broadcasted!`, 'success');
    render();
  }

  // Real-time listener
  const onStoreUpdate = () => render();
  window.addEventListener('store-updated', onStoreUpdate);
  render();

  if (typeof MutationObserver !== 'undefined' && document && document.body) {
    const observer = new MutationObserver((mutations) => {
      if (!document.body.contains(root)) {
        window.removeEventListener('store-updated', onStoreUpdate);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}
