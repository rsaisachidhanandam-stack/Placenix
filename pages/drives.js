// ============================================================
// PLACENIX — PLACEMENT OPPORTUNITIES REGISTRY (v2.5)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore, syncWithSupabase } from '../store.js';

export async function loadDrivesPage(root, Store, supabase) {
  let searchQuery = '';

  function runDataHealing() {
    // --- Legacy Data Migration ---
    // Migrate legacy student applications & Kanban cards missing 'driveId' to the oldest active drive matching their company name
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

    // --- Auto-Heal & Cleanup State ---
    const activeDriveIds = new Set(Store.drives.map(d => d.id));

    // 1. Clean up student profile applications for deleted drives
    if (Store.studentProfile?.applications) {
      const originalLength = Store.studentProfile.applications.length;
      Store.studentProfile.applications = Store.studentProfile.applications.filter(app => 
        app.driveId && activeDriveIds.has(app.driveId)
      );
      if (Store.studentProfile.applications.length !== originalLength) {
        healed = true;
      }
    }

    // 2. Clean up Kanban cards for deleted drives
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
      if (kanbanChanged) {
        healed = true;
      }
    }

    // 3. Auto-heal missing applications in Kanban (for logged-in student)
    if (Store.session?.role === 'student' && Store.kanban && Store.kanban.applied) {
      const userName = Store.session.user.full_name || Store.session.user.name || 'Student';
      Store.studentProfile.applications.forEach(app => {
        if (app.driveId) {
          const inKanban = Object.values(Store.kanban).flat().some(c => String(c.driveId) === String(app.driveId) && c.name === userName);
          if (!inKanban) {
            const driveObj = Store.drives.find(d => String(d.id) === String(app.driveId));
            if (driveObj) {
              Store.kanban.applied.push({
                id: 'c' + Date.now() + Math.floor(Math.random() * 1000),
                name: userName,
                dept: Store.session.user.department || 'General',
                driveId: driveObj.id,
                drive: driveObj.company,
                avatar: Store.session.user.avatar || userName.substring(0,2).toUpperCase()
              });
              healed = true;
            }
          }
        }
      });
    }

    if (healed) {
      saveStore();
    }
  }

  // 📡 Sync with Supabase on load in background (non-blocking)
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
        console.error("Background sync failed on drives page init", e);
        runDataHealing();
        render();
      });
  } else {
    runDataHealing();
  }

  function calculateMetrics() {
    const drives = Store.drives;
    const analytics = Store.analytics.overall; // Uses dynamic getter
    
    return {
      totalDrives: drives.length,
      activeCandidates: drives.reduce((sum, d) => sum + (d.applicants || 0), 0),
      placementRate: analytics.placementPercent,
      avgPackage: analytics.avgPackage.replace(' LPA', '')
    };
  }

  function render() {
    const metrics = calculateMetrics();
    const filteredDrives = Store.drives.filter(d => 
      d.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const isStudent = Store.session?.role === 'student';

    root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Header Node -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Recruitment Pipeline</div>
          <h1 class="h1-ent" style="font-size:32px;">Institutional Opportunities</h1>
          <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Automated drive management and recruitment pipeline telemetry.</p>
        </div>
        <div style="display:flex; gap:16px; align-items:center;">
          <div style="position:relative;">
            <input type="text" id="drive-search" class="input-ent" style="width:280px; height:44px; padding-left:40px; font-size:13px;" placeholder="Search Organization or Role..." value="${searchQuery}">
            <span style="position:absolute; left:14px; top:12px; opacity:0.5;">🔍</span>
          </div>
          ${!isStudent ? `<button id="init-drive-btn" class="btn-premium" style="padding:12px 24px; border-radius:12px; font-weight:700;">Initialize New Drive</button>` : ''}
        </div>
      </div>

      <!-- Executive Summary Grid -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
        <div class="card-ent" style="padding:32px;">
          <div class="label-ent" style="margin-bottom:12px; font-size:10px;">TOTAL DRIVES</div>
          <div class="metric-ent" style="font-size:32px;">${metrics.totalDrives}</div>
        </div>
        <div class="card-ent" style="padding:32px;">
          <div class="label-ent" style="margin-bottom:12px; font-size:10px;">ACTIVE CANDIDATES</div>
          <div class="metric-ent" style="font-size:32px;">${metrics.activeCandidates.toLocaleString()}</div>
        </div>
        <div class="card-ent" style="padding:32px;">
          <div class="label-ent" style="margin-bottom:12px; font-size:10px;">PLACEMENT RATE</div>
          <div class="metric-ent" style="font-size:32px; color:var(--brand-secondary);">${metrics.placementRate}%</div>
        </div>
        <div class="card-ent" style="padding:32px;">
          <div class="label-ent" style="margin-bottom:12px; font-size:10px;">AVG PACKAGE</div>
          <div class="metric-ent" style="font-size:32px;">₹${metrics.avgPackage} <span style="font-size:14px; opacity:0.5;">LPA</span></div>
        </div>
      </div>

      <!-- Opportunity Grid -->
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 32px;" id="drive-cards-container">
        ${renderCards(filteredDrives)}
      </div>

      <!-- Drive Initiation Modal -->
      <div id="drive-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); z-index:1000; align-items:center; justify-content:center; padding:40px;">
        <div class="card-ent" style="max-width:720px; width:100%; padding:48px; position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
            <h3 class="h2-ent" style="font-size:24px;">Initialize Opportunity Node</h3>
            <button id="close-modal-btn" style="background:none; border:none; color:var(--text-description); cursor:pointer; font-size:24px;">✕</button>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
            <div class="input-node"><label class="label-ent" style="color:#fff;">Organization Name</label><input id="new-org" class="input-ent" placeholder="e.g. Goldman Sachs"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Job Designation</label><input id="new-role" class="input-ent" placeholder="Quantitative Analyst"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Compensation (LPA)</label><input id="new-package" class="input-ent" placeholder="e.g. 24.5"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Commencement Date</label><input id="new-date" class="input-ent" type="date"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Minimum CGPA Criterion</label><input id="new-cgpa" class="input-ent" type="number" step="0.1" placeholder="8.5"></div>
            <div class="input-node"><label class="label-ent" style="color:#fff;">Work Location</label><input id="new-loc" class="input-ent" placeholder="Hybrid / Bangalore"></div>
            <div class="input-node" style="grid-column: span 2; display: flex; gap: 32px; flex-direction: row; align-items: flex-start;">
              <div style="width: 160px; flex-shrink: 0;">
                <label class="label-ent" style="color:#fff; white-space: nowrap; display: block; margin-bottom: 10px;">Number of Rounds</label>
                <input id="new-rounds-count" class="input-ent" type="number" min="1" max="10" placeholder="e.g. 3">
              </div>
              <div style="flex: 1;">
                <label class="label-ent" style="color:#fff; white-space: nowrap; display: block; margin-bottom: 10px;">Recruitment Rounds (comma-separated)</label>
                <input id="new-rounds" class="input-ent" placeholder="e.g. Aptitude, Technical, HR">
              </div>
            </div>
          </div>
          <div class="input-node" style="margin-top:32px;">
            <label class="label-ent" style="color:#fff;">Scope of Responsibilities</label>
            <textarea id="new-desc" class="input-ent" style="height:140px; padding:16px;"></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:20px; margin-top:48px;">
            <button id="discard-btn" class="btn-premium-ghost" style="padding:14px 32px;">Discard Registry</button>
            <button id="submit-drive-btn" class="btn-premium" style="padding:14px 40px;">Commence Broadcast →</button>
          </div>
        </div>
      </div>
    </div>
    `;

    attachListeners();
  }

  function getOrdinalSuffix(i) {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  }

  function renderCards(drives) {
    if (!drives.length) return `<div style="grid-column: span 3; padding:100px; text-align:center; color:var(--text-description);">No active recruitment drives matching your criteria.</div>`;

    const isStudent = Store.session?.role === 'student';
    const studentName = Store.session?.user?.full_name || Store.session?.user?.name || '';
    const studentId = Store.session?.user?.id || '';
    const myAllocations = [];
    const seenAllocations = new Set();
    
    if (isStudent && Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if (alloc.allocations && Array.isArray(alloc.allocations)) {
          alloc.allocations.forEach(a => {
            const cleanA = (a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const cleanS = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            let isNameMatch = cleanS && cleanA && (cleanA.includes(cleanS) || cleanS.includes(cleanA));
            
            // Robust fuzzy check: if they share a prefix of at least 6 characters
            if (!isNameMatch && cleanA && cleanS) {
              const minLen = Math.min(cleanA.length, cleanS.length);
              if (minLen >= 6 && cleanA.substring(0, 6) === cleanS.substring(0, 6)) {
                isNameMatch = true;
              }
            }
            
            if ((studentId && String(a.studentId) === String(studentId)) || isNameMatch) {
              const allocKey = `${alloc.company}_${alloc.roundName}_${alloc.date}_${a.slotTime}_${a.venue}`.toLowerCase();
              if (!seenAllocations.has(allocKey)) {
                seenAllocations.add(allocKey);
                myAllocations.push({
                  driveId: alloc.driveId,
                  company: alloc.company,
                  role: alloc.role,
                  roundName: alloc.roundName,
                  date: alloc.date,
                  venue: a.venue,
                  slotTime: a.slotTime
                });
              }
            }
          });
        }
      });
    }

    return drives.map(d => {
      const applied = Store.studentProfile.applications.some(a => String(a.driveId) === String(d.id));
      const isClosed = d.status === 'Closed';
      
      let actionNode = '';
      if (isStudent) {
        actionNode = applied ? 
          `<div style="color:var(--brand-secondary); font-size:12px; font-weight:800;">ENGAGED</div>` : 
          `<button class="btn-premium apply-btn" data-id="${d.id}" style="padding:8px 20px; font-size:12px;" ${isClosed ? 'disabled' : ''}>${isClosed ? 'Closed' : 'Apply Now'}</button>`;
      } else {
        actionNode = `
          <div style="display:flex; gap:10px;">
            <button class="btn-premium-ghost view-applicants-btn" data-id="${d.id}" data-company="${d.company}" style="padding:8px 16px; font-size:11px;">View Applicants</button>
            <button class="delete-drive-btn" data-id="${d.id}" data-company="${d.company}" style="padding:8px 16px; font-size:11px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.18); color:#ef4444; border-radius:100px; font-weight:700; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.15)'; this.style.borderColor='rgba(239,68,68,0.4)'" onmouseout="this.style.background='rgba(239,68,68,0.06)'; this.style.borderColor='rgba(239,68,68,0.18)'">Delete</button>
          </div>
        `;
      }

      const applicantCount = Object.values(Store.kanban).flat().filter(c => String(c.driveId) === String(d.id)).length;

      // Calculate sequence number for drives sharing the same company name
      const companyDrives = [...Store.drives]
        .filter(x => x.company === d.company)
        .sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : parseFloat(String(a.id).replace('d','')) || 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : parseFloat(String(b.id).replace('d','')) || 0;
          return timeA - timeB; // Oldest first
        });
      const seqIdx = companyDrives.findIndex(x => String(x.id) === String(d.id));
      const seqLabel = seqIdx !== -1 ? `${seqIdx + 1}${getOrdinalSuffix(seqIdx + 1)} Broadcast` : '';

      // Red highlight logic for CGPA (robust against 0.0 and undefined)
      const hasLowCgpa = isStudent && d.min_cgpa && 
        (Store.session?.user?.cgpa !== undefined && Store.session?.user?.cgpa !== null) && 
        (parseFloat(Store.session.user.cgpa) < parseFloat(d.min_cgpa));

      // Find allocations for this specific drive
      let driveAllocations = myAllocations.filter(alloc => 
        String(alloc.driveId) === String(d.id) || 
        (alloc.company && d.company && (alloc.company.toLowerCase().includes(d.company.toLowerCase()) || d.company.toLowerCase().includes(alloc.company.toLowerCase())))
      );

      // De-duplicate by round name to prevent duplicate slot cards under the same drive
      const seenRounds = new Set();
      driveAllocations = driveAllocations.filter(alloc => {
        const roundKey = (alloc.roundName || '').toLowerCase().trim();
        if (seenRounds.has(roundKey)) {
          return false;
        }
        seenRounds.add(roundKey);
        return true;
      });

      return `
      <div class="card-ent opportunity-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:32px; border: 1px solid var(--border-subtle);">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
            <div style="width:56px; height:56px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:24px;">${d.logo || '🏢'}</div>
            <div style="display:flex; gap:8px; align-items:center;">
              ${seqLabel ? `<div style="font-size:9px; font-weight:800; color:var(--text-description); background:rgba(255,255,255,0.03); border:1px solid var(--border-main); padding:6px 14px; border-radius:100px;">${seqLabel}</div>` : ''}
              <div style="font-size:9px; font-weight:800; color:var(--brand-primary); background:rgba(139,92,246,0.05); border:1px solid rgba(139,92,246,0.15); padding:6px 14px; border-radius:100px;">
                ${d.rounds ? d.rounds.length : 3} Rounds
              </div>
              <div style="background:${d.status === 'Open' ? 'rgba(16,185,129,0.1)' : d.status === 'Upcoming' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'}; 
                          color:${d.status === 'Open' ? 'var(--brand-secondary)' : d.status === 'Upcoming' ? 'var(--warning)' : 'var(--brand-primary)'}; 
                          padding:6px 14px; border-radius:100px; font-size:10px; font-weight:800; letter-spacing:0.05em;">
                ${d.status.toUpperCase()}
              </div>
            </div>
          </div>
          <h4 class="h2-ent" style="font-size:20px; margin-bottom:4px;">${d.company}</h4>
          <p style="font-size:14px; color:var(--text-description);">${d.role}</p>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin:24px 0;">
            <div style="padding:12px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px; text-align:center;">
              <div class="label-ent" style="font-size:8px; margin-bottom:4px;">CTC PACKAGE</div>
              <div style="font-size:12px; font-weight:800; color:#fff;">${d.package}</div>
            </div>
            <div style="padding:12px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px; text-align:center;">
              <div class="label-ent" style="font-size:8px; margin-bottom:4px;">DEADLINE</div>
              <div style="font-size:12px; font-weight:800; color:#fff;">${d.deadline}</div>
            </div>
            <div style="padding:12px; background:${hasLowCgpa ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.01)'}; border:1px solid ${hasLowCgpa ? 'rgba(239,68,68,0.2)' : 'var(--border-main)'}; border-radius:12px; text-align:center;">
              <div class="label-ent" style="font-size:8px; margin-bottom:4px;">MIN CGPA</div>
              <div style="font-size:12px; font-weight:800; color:${hasLowCgpa ? 'var(--brand-primary)' : '#fff'};">${d.min_cgpa ? d.min_cgpa + ' CGPA' : 'No Limit'}</div>
            </div>
          </div>
          
          <!-- Recruitment Process Sequence -->
          <div style="margin-bottom: 24px; padding: 16px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-main); border-radius: 12px;">
            <div class="label-ent" style="font-size:9px; margin-bottom:12px; color:var(--text-description); font-weight:700; letter-spacing:0.05em;">SELECTION PROCESS</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${(d.rounds || ['Aptitude', 'Technical', 'HR']).map((r, i) => `
                <span style="font-size:11px; padding:6px 12px; background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.18); border-radius:8px; color:var(--brand-primary); font-weight:700; display:inline-flex; align-items:center; gap:4px;">
                  <span style="opacity:0.6; font-size:10px;">${i+1}.</span> ${r}
                </span>
              `).join('')}
            </div>
          </div>

          ${driveAllocations.length > 0 ? `
            <!-- Scheduled Slots Info -->
            <div style="margin-bottom: 24px; padding: 16px; background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(139,92,246,0.04)); border: 1px solid rgba(16,185,129,0.25); border-radius: 12px; display:flex; flex-direction:column; gap:8px; position:relative; overflow:hidden;">
              <div style="font-size:10px; font-weight:800; color:var(--brand-secondary); display:flex; align-items:center; gap:6px;">
                <span style="width:6px; height:6px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 6px var(--brand-secondary);"></span>
                UPCOMING ROUND SCHEDULED
              </div>
              ${driveAllocations.map(alloc => `
                <div style="display:flex; flex-direction:column; gap:4px; margin-top:4px;">
                  <div style="font-weight:700; color:#fff; font-size:12.5px;">${alloc.company} — ${alloc.roundName}</div>
                  <div style="display:flex; align-items:center; gap:16px; font-size:11.5px; color:var(--text-description); margin-top:2px;">
                    <div style="display:flex; align-items:center; gap:4px;"><span>🕒</span> <strong>${alloc.slotTime}</strong></div>
                    <div style="display:flex; align-items:center; gap:4px;"><span>🏢</span> <strong>${alloc.venue}</strong></div>
                  </div>
                  <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Date: ${alloc.date}</div>
                </div>
              `).join('<div style="height:1px; background:rgba(255,255,255,0.05); margin:8px 0;"></div>')}
            </div>
          ` : ''}
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:24px; border-top:1px solid var(--border-subtle);">
          <div style="font-size:12px; color:var(--text-description); font-weight:600;">${applicantCount} Applicants</div>
          ${actionNode}
        </div>
      </div>`;
    }).join('') + `
    <!-- Applicants Modal -->
    <div id="applicants-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(15px); z-index:1001; align-items:center; justify-content:center; padding:40px;">
      <div class="card-ent" style="max-width:600px; width:100%; padding:48px; position:relative; background:#0c0c0e;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
          <h3 id="modal-company-title" class="h2-ent" style="font-size:24px;">Applied Candidates</h3>
          <button style="background:none; border:none; color:var(--text-description); cursor:pointer; font-size:24px;" onclick="this.closest('#applicants-modal').style.display='none'">✕</button>
        </div>
        <div id="applicants-list" style="max-height:400px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
          <!-- Applicants will be injected here -->
        </div>
      </div>
    </div>
    `;
  }

  // ── Event Logic ──────────────────────────────────────────
  function showApplicants(driveId, company) {
    const modal = root.querySelector('#applicants-modal');
    const list = modal.querySelector('#applicants-list');
    const title = modal.querySelector('#modal-company-title');
    
    title.innerText = `${company} — Candidate Registry`;
    
    // Aggregate from all kanban stages
    const allCandidates = Object.values(Store.kanban).flat().filter(c => String(c.driveId) === String(driveId));
    
    if (allCandidates.length === 0) {
      list.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-description);">No applications recorded in the pipeline for this organization.</div>`;
    } else {
      list.innerHTML = allCandidates.map(c => `
        <div style="padding:16px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="width:32px; height:32px; border-radius:50%; background:var(--gradient-brand); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff;">${c.avatar}</div>
            <div>
              <div style="font-weight:700; color:#fff; font-size:14px;">${c.name}</div>
              <div style="font-size:10px; color:var(--text-description);">${c.dept}</div>
            </div>
          </div>
          <div style="font-size:10px; font-weight:800; color:var(--brand-secondary); background:rgba(16,185,129,0.1); padding:4px 10px; border-radius:100px;">ACTIVE</div>
        </div>
      `).join('');
    }
    
    modal.style.display = 'flex';
  }

  async function handleDeleteDrive(driveId, company) {
    if (!confirm(`Are you absolutely sure you want to delete the recruitment drive for "${company}"?\n\nThis action cannot be undone and will permanently remove all pipeline analytics and student applicant records associated with it.`)) {
      return;
    }

    try {
      // 0. Track deleted drive locally to prevent reappearance on reload/sync
      const deletedDrives = JSON.parse(localStorage.getItem('placenix_deleted_drives') || '[]');
      if (!deletedDrives.includes(String(driveId))) {
        deletedDrives.push(String(driveId));
        localStorage.setItem('placenix_deleted_drives', JSON.stringify(deletedDrives));
      }

      // 📡 Sync with Supabase (Cloud Deletion)
      if (supabase) {
        console.log(`📡 Deleting drive "${company}" (ID: ${driveId}) from Supabase...`);
        let deleteQuery = supabase.from('drives').delete();

        // Check if it is a local offline/fallback ID (starts with 'd')
        if (typeof driveId === 'string' && driveId.startsWith('d')) {
          const driveObj = Store.drives.find(d => String(d.id) === String(driveId));
          if (driveObj) {
            deleteQuery = deleteQuery.eq('company', driveObj.company).eq('role', driveObj.role);
          } else {
            deleteQuery = deleteQuery.eq('company', company);
          }
        } else {
          deleteQuery = deleteQuery.eq('id', driveId);
        }

        const { error } = await deleteQuery;
        if (error) {
          console.error("❌ Failed to delete drive from Supabase:", error.message);
          showToast("Sync Warning: Failed to delete drive from cloud database.", "warning");
        } else {
          console.log("✅ Successfully deleted drive from Supabase.");
        }
      }

      // 1. Remove from drives list
      Store.drives = Store.drives.filter(d => String(d.id) !== String(driveId));

      // 2. Clean up student applications in profile
      if (Store.studentProfile && Store.studentProfile.applications) {
        Store.studentProfile.applications = Store.studentProfile.applications.filter(
          a => String(a.driveId) !== String(driveId)
        );
      }

      // 3. Clean up cards in TPO Kanban stages
      if (Store.kanban) {
        for (const stage of Object.keys(Store.kanban)) {
          Store.kanban[stage] = Store.kanban[stage].filter(
            c => String(c.driveId) !== String(driveId)
          );
        }
      }

      // 4. Save store (triggers storage event for real-time dashboard cross-tab sync)
      saveStore();
      
      showToast(`Successfully deleted the "${company}" drive and cleaned all associated pipeline data.`, "success");
      
      // 5. Re-render the active cards
      render();
    } catch (err) {
      console.error(err);
      showToast("An error occurred while deleting the drive.", "error");
    }
  }

  async function applyToDrive(id) {
    const drive = Store.drives.find(d => String(d.id) === String(id));
    if (!drive) return;

    // ── Eligibility Check ────────────────────────────────
    const minCgpa = parseFloat(drive.min_cgpa) || 0;
    if (minCgpa > 0) {
      let studentCgpa = Store.session.user.cgpa;
      
      // If not cached/synced, try fetching
      if (studentCgpa === undefined || studentCgpa === null) {
        if (supabase && Store.session.user?.id) {
          try {
            const { data: dbUser } = await supabase.from('profiles').select('cgpa').eq('id', Store.session.user.id).maybeSingle();
            if (dbUser) {
              studentCgpa = parseFloat(dbUser.cgpa) || 0;
              Store.session.user.cgpa = studentCgpa; // Cache it
            }
          } catch (e) {
            console.error("Supabase CGPA sync failed during application", e);
          }
        }
      }

      if (studentCgpa === undefined || studentCgpa === null) {
        studentCgpa = 0;
      }

      if (parseFloat(studentCgpa) < parseFloat(minCgpa)) {
        showToast("You are not eligible! Refer to the Academic Details in your Student Profile page to verify your CGPA.", "warning", 6000);
        return;
      }
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

    // ── Pipeline Propagation ────────────────────────────────
    // Push the student into the TPO's Kanban 'applied' stage
    if (Store.kanban && Store.kanban.applied) {
      const userName = Store.session.user.full_name || Store.session.user.name || 'Student';
      Store.kanban.applied.push({
        id: 'c' + Date.now(),
        name: userName,
        dept: Store.session.user.department || 'General',
        driveId: drive.id,
        drive: drive.company,
        avatar: Store.session.user.avatar || userName.substring(0,2).toUpperCase()
      });
    }

    saveStore();
    showToast(`Successfully applied to ${drive.company}`, 'success');
    render();
  }

  async function handleCreateDrive() {
    console.log('🚀 Initiating Drive Broadcast Sequence...');
    const modal = root.querySelector('#drive-modal');
    
    try {
      const roundsText = modal.querySelector('#new-rounds').value;
      let rounds = roundsText ? roundsText.split(',').map(r => r.trim()).filter(Boolean) : [];
      
      // Auto-populate based on count if user left the text field empty
      if (!rounds.length) {
        const count = parseInt(modal.querySelector('#new-rounds-count').value) || 3;
        const defaultNames = ['Aptitude', 'Technical', 'HR', 'Technical II', 'System Design', 'Behavioral', 'Management', 'Final Review'];
        for (let i = 0; i < count; i++) {
          rounds.push(defaultNames[i] || `Round ${i + 1}`);
        }
      }

      const data = {
        company: modal.querySelector('#new-org').value,
        role: modal.querySelector('#new-role').value,
        package: modal.querySelector('#new-package').value + ' LPA',
        deadline: modal.querySelector('#new-date').value,
        min_cgpa: parseFloat(modal.querySelector('#new-cgpa').value) || 0,
        location: modal.querySelector('#new-loc').value,
        description: modal.querySelector('#new-desc').value,
        rounds: rounds,
        status: 'Open',
        applicants: 0
      };

      if (!data.company || !data.role) {
        showToast('Company and Role are mandatory operational nodes.', 'warning');
        return;
      }

      // Supabase Persistence (Optional/Resilient)
      let insertedId = 'd' + Date.now();

      if (supabase) {
        console.log('📡 Syncing with Supabase...');
        const dbData = {
          company: data.company,
          role: data.role,
          package_lpa: parseFloat(data.package.replace(' LPA', '')) || 0.0,
          deadline: data.deadline,
          min_cgpa: parseFloat(data.min_cgpa) || 0.0,
          eligible_depts: [data.location || 'General'],
          required_skills: data.rounds || ['Aptitude', 'Technical', 'HR'],
          status: data.status || 'Open',
          description: data.description || ''
        };
        const { data: insertedRows, error } = await supabase.from('drives').insert([dbData]).select('*');
        if (error) {
          console.error('❌ Supabase Sync Failed:', error.message);
          showToast('Sync Warning: Local persistence only.', 'warning');
        } else if (insertedRows && insertedRows.length > 0) {
          insertedId = insertedRows[0].id;
        }
      }

      // Local Persistence
      Store.drives.unshift({ ...data, id: insertedId });
      saveStore();
      
      console.log('✅ Drive Broadcast Success.');
      modal.style.display = 'none';
      showToast('New recruitment drive broadcasted!', 'success');
      render();
    } catch (err) {
      console.error('🔥 Broadcast System Failure:', err);
      showToast('System Error: Check console for telemetry.', 'error');
    }
  }

  function attachListeners() {
    // Search
    const search = root.querySelector('#drive-search');
    if (search) {
      search.oninput = (e) => {
        searchQuery = e.target.value;
        const container = root.querySelector('#drive-cards-container');
        if (container) container.innerHTML = renderCards(Store.drives.filter(d => 
          d.company.toLowerCase().includes(searchQuery.toLowerCase()) || 
          d.role.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      };
    }

    // Modal Triggers
    const openBtn = root.querySelector('#init-drive-btn');
    root.querySelectorAll('.view-applicants-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const company = e.target.getAttribute('data-company');
        const driveId = e.target.getAttribute('data-id');
        showApplicants(driveId, company);
      });
    });
    
    root.querySelectorAll('.delete-drive-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const company = e.target.getAttribute('data-company');
        const driveId = e.target.getAttribute('data-id');
        handleDeleteDrive(driveId, company);
      });
    });
    const modal = root.querySelector('#drive-modal');
    const closeBtn = root.querySelector('#close-modal-btn');
    const discardBtn = root.querySelector('#discard-btn');
    const submitBtn = root.querySelector('#submit-drive-btn');

    if (openBtn) openBtn.onclick = () => {
      modal.style.display = 'flex';
      const countInput = root.querySelector('#new-rounds-count');
      if (countInput) countInput.value = '';
      const roundsInput = root.querySelector('#new-rounds');
      if (roundsInput) roundsInput.value = '';
    };
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    if (discardBtn) discardBtn.onclick = () => modal.style.display = 'none';
    if (submitBtn) submitBtn.onclick = () => handleCreateDrive();

    // Application Buttons (using delegation)
    const cardContainer = root.querySelector('#drive-cards-container');
    if (cardContainer) {
      cardContainer.onclick = (e) => {
        const btn = e.target.closest('.apply-btn');
        if (btn) applyToDrive(btn.dataset.id);
      };
    }
  }

  // ── Real-time Sync Listener ───────────────────────────────
  const onStoreUpdate = () => {
    console.log('🔔 Drives Page: Store update detected, re-rendering...');
    render();
  };
  window.addEventListener('store-updated', onStoreUpdate);

  render();

  // Cleanup listener on root removal (optional but good practice)
  const observer = new MutationObserver((mutations) => {
    if (!document.body.contains(root)) {
      window.removeEventListener('store-updated', onStoreUpdate);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
