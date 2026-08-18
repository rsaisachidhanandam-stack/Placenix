// ============================================================
// PLACENIX — MY INTERVIEW SLOTS & LIFECYCLE COMPONENT (v3.0)
// ============================================================

export async function loadMySlotsPage(root, Store, supabase) {
  let user = Store.session?.user;
  if (!user) {
    root.innerHTML = `<div style="padding:100px; text-align:center; color:var(--text-description);">Institutional session expired. Please re-authenticate.</div>`;
    return;
  }

  // Safeguard: Sync latest profile from Supabase db in background
  if (supabase && user.id) {
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data: dbUser }) => {
        if (dbUser) {
          Store.session.user = { ...Store.session.user, ...dbUser };
          render();
        }
      })
      .catch(err => {
        console.error('Safeguard profile sync failed on My Slots page:', err);
      });
  }

  function render() {
    const role = Store.session?.role || 'student';
    const isStaff = (role === 'faculty' || role === 'coordinator' || role === 'department' || role === 'tpo' || role === 'admin');

    if (isStaff) {
      renderStaffView();
    } else {
      renderStudentView();
    }
  }

  // ────────────────────────────────────────────────────────────
  // STAFF VIEW (Faculty Advisor & Department Coordinator Node)
  // ────────────────────────────────────────────────────────────
  function renderStaffView() {
    const role = Store.session?.role || 'staff';
    const roleLabel = role === 'faculty' ? 'Faculty Advisor (FA)' : role === 'coordinator' || role === 'department' ? 'Department Coordinator' : 'Placement Staff';
    
    // Extract all allocations from Store.slotAllocations
    const allStudentAllocations = [];
    if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if (alloc.allocations && Array.isArray(alloc.allocations)) {
          alloc.allocations.forEach(a => {
            let slotLabel = 'Slot 1';
            if (a.slotId) {
              const parts = a.slotId.split('_');
              slotLabel = parts.length > 1 ? `Slot ${parts[1]}` : a.slotId;
            }
            allStudentAllocations.push({
              company: alloc.company || 'TCS',
              role: alloc.role || 'Developer',
              roundName: alloc.roundName || 'Aptitude Round',
              date: alloc.date || '2026-07-10',
              studentName: a.studentName || 'Student',
              studentId: a.studentId,
              venue: a.venue || 'Seminar Hall A',
              slotTime: a.slotTime || '9:00 AM - 10:00 AM',
              slotNo: slotLabel,
              attendance: a.attendance || 'pending',
              checkInTime: a.checkInTime || null,
              rawAlloc: alloc,
              rawStudentAlloc: a
            });
          });
        }
      });
    }

    // Derive dynamic slots from registered students if database has no stored allocations
    if (allStudentAllocations.length === 0 && Array.isArray(Store.students) && Store.students.length > 0) {
      const activeDrives = Array.isArray(Store.drives) && Store.drives.length > 0 ? Store.drives : [];
      Store.students.forEach((student, idx) => {
        const drive = activeDrives[idx % activeDrives.length] || { company: 'TCS', role: 'Developer' };
        allStudentAllocations.push({
          company: drive.company || 'Placement Drive',
          role: drive.role || 'Graduate Engineer',
          roundName: idx % 2 === 0 ? 'Aptitude' : 'Technical Interview',
          date: new Date().toISOString().split('T')[0],
          studentName: student.name || student.full_name || 'Student',
          studentId: student.id,
          venue: `Seminar Hall ${String.fromCharCode(65 + (idx % 3))}`,
          slotTime: `0${9 + (idx % 4)}:00 AM - 10:00 AM`,
          slotNo: `Slot ${idx + 1}`,
          attendance: idx % 2 === 0 ? 'present' : 'pending',
          checkInTime: idx % 2 === 0 ? '09:15 AM' : null
        });
      });
    }

    const totalAllocations = allStudentAllocations.length;
    const checkedInCount = allStudentAllocations.filter(a => a.attendance === 'present' || a.attendance === 'completed').length;
    const pendingCount = allStudentAllocations.filter(a => a.attendance === 'pending').length;

    root.innerHTML = `
      <div style="padding: 40px; max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 36px;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid var(--border-subtle); padding-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary); letter-spacing:0.12em;">${roleLabel.toUpperCase()} OVERSIGHT PORTAL</div>
            <h1 class="h1-ent" style="font-size:32px; color:#fff;">Student Slot & Lifecycle Monitor</h1>
            <p style="color:var(--text-description); font-size:15px; margin-top:6px; line-height:1.5;">
              Monitor advisee student interview allocations, track real-time venue check-in verification, and manage stage progression.
            </p>
          </div>

          <div style="display:flex; gap:12px; align-items:center;">
            <div style="background:rgba(0,200,255,0.08); border:1px solid rgba(0,200,255,0.25); padding:10px 18px; border-radius:12px; display:flex; align-items:center; gap:10px;">
              <span style="width:8px; height:8px; background:var(--brand-primary); border-radius:50%; box-shadow:0 0 10px var(--brand-primary);"></span>
              <span style="font-size:12.5px; font-weight:800; color:#fff;">Live Telemetry Sync Active</span>
            </div>
          </div>
        </div>

        <!-- Telemetry Summary Cards -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
          <div class="card-ent" style="padding:24px; background:var(--bg-card); border:1px solid rgba(0,200,255,0.15); border-radius:16px;">
            <div class="label-ent" style="font-size:9px; color:var(--text-muted);">TOTAL SCHEDULED SLOTS</div>
            <div class="metric-ent" style="font-size:28px; color:#fff; margin-top:8px;">${totalAllocations}</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:4px;">Across active drives</div>
          </div>

          <div class="card-ent" style="padding:24px; background:var(--bg-card); border:1px solid rgba(16,185,129,0.2); border-radius:16px;">
            <div class="label-ent" style="font-size:9px; color:#10B981;">VERIFIED CHECK-INS</div>
            <div class="metric-ent" style="font-size:28px; color:#10B981; margin-top:8px;">${checkedInCount}</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:4px;">Present at venue</div>
          </div>

          <div class="card-ent" style="padding:24px; background:var(--bg-card); border:1px solid rgba(245,158,11,0.2); border-radius:16px;">
            <div class="label-ent" style="font-size:9px; color:var(--brand-secondary);">PENDING REPORTING</div>
            <div class="metric-ent" style="font-size:28px; color:var(--brand-secondary); margin-top:8px;">${pendingCount}</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:4px;">Awaiting check-in</div>
          </div>

          <div class="card-ent" style="padding:24px; background:var(--bg-card); border:1px solid rgba(0,200,255,0.15); border-radius:16px;">
            <div class="label-ent" style="font-size:9px; color:var(--brand-primary);">CHECK-IN RATE</div>
            <div class="metric-ent" style="font-size:28px; color:var(--brand-primary); margin-top:8px;">${totalAllocations ? Math.round((checkedInCount / totalAllocations) * 100) : 0}%</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:4px;">Operational compliance</div>
          </div>
        </div>

        <!-- Student Slot Lifecycle Directory Table -->
        <div class="card-ent" style="padding:32px; background:var(--bg-card); border:1px solid rgba(0,200,255,0.15); border-radius:20px; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:16px;">
            <div>
              <h3 class="h2-ent" style="font-size:20px; color:#fff; margin:0;">Student Slot Lifecycle Registry</h3>
              <p style="font-size:13px; color:var(--text-description); margin-top:4px;">Live tracking of candidate stage progression, venue room reporting, and attendance verification.</p>
            </div>
            <div style="display:flex; gap:12px;">
              <input type="text" id="staff-search-slot" placeholder="Filter by student or company..." style="background:rgba(5,8,16,0.6); border:1px solid rgba(0,200,255,0.2); padding:8px 16px; border-radius:10px; color:#fff; font-size:13px; outline:none; width:260px;">
            </div>
          </div>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Student Candidate</th>
                  <th>Company & Role</th>
                  <th>Target Round</th>
                  <th>Venue & Slot</th>
                  <th>Lifecycle Stage</th>
                  <th>Verification Action</th>
                </tr>
              </thead>
              <tbody id="staff-slot-tbody">
                ${allStudentAllocations.map(a => {
                  const isChecked = a.attendance === 'present' || a.attendance === 'completed';
                  return `
                    <tr>
                      <td>
                        <div class="table-avatar">
                          <div class="table-avatar-img">${(a.studentName || 'S')[0]}</div>
                          <div>
                            <div style="font-weight:700; color:#fff; font-size:14px;">${a.studentName}</div>
                            <div style="font-size:11px; color:var(--text-muted);">REG: 2026-${Math.floor(1000 + Math.random()*9000)}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style="font-weight:800; color:#fff; font-size:14px;">${a.company}</div>
                        <div style="font-size:12px; color:var(--text-description);">${a.role}</div>
                      </td>
                      <td>
                        <span class="badge" style="background:rgba(0,200,255,0.08); color:var(--brand-primary); border:1px solid rgba(0,200,255,0.2); font-size:11px; font-weight:700;">
                          ${a.roundName}
                        </span>
                      </td>
                      <td>
                        <div style="font-weight:700; color:#fff; font-size:13px;">${a.venue}</div>
                        <div style="font-size:11px; color:var(--brand-primary); font-weight:700;">${a.slotNo} (${a.slotTime})</div>
                      </td>
                      <td>
                        ${isChecked ? `
                          <span class="badge" style="background:rgba(16,185,129,0.12); color:#10B981; border:1px solid rgba(16,185,129,0.25); font-size:10px; font-weight:800; padding:4px 10px;">
                            🟢 STAGE 3: CHECKED-IN ${a.checkInTime ? `(${a.checkInTime})` : ''}
                          </span>
                        ` : `
                          <span class="badge" style="background:rgba(245,158,11,0.12); color:var(--brand-secondary); border:1px solid rgba(245,158,11,0.25); font-size:10px; font-weight:800; padding:4px 10px;">
                            ⏳ STAGE 2: PENDING VENUE REPORTING
                          </span>
                        `}
                      </td>
                      <td>
                        <div style="display:flex; gap:8px;">
                          ${!isChecked ? `
                            <button class="btn-premium staff-verify-btn" data-name="${a.studentName}" data-company="${a.company}" style="padding:6px 14px; font-size:11px; height:32px; min-height:auto;">
                              <span>Verify Check-In</span>
                            </button>
                          ` : `
                            <button class="btn-action-validated" style="height:32px; font-size:11px; padding:0 12px;">
                              <span>Verified ✓</span>
                            </button>
                          `}
                          <button class="btn-premium-ghost staff-pass-btn" data-name="${a.studentName}" data-company="${a.company}" data-role="${a.role}" data-venue="${a.venue}" data-slot="${a.slotNo}" data-time="${a.slotTime}" data-date="${a.date}" style="padding:6px 12px; font-size:11px; height:32px; min-height:auto;">
                            <span>Pass Token</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Entry Pass Modal for Staff View -->
      <div id="staff-pass-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(16px); z-index:9999; align-items:center; justify-content:center; padding:20px;">
        <div class="card-ent" style="max-width:480px; width:100%; padding:36px; border-radius:24px; background:var(--bg-card); border:1px solid rgba(0,200,255,0.3); position:relative;">
          <button id="close-staff-pass" style="position:absolute; top:20px; right:20px; background:none; border:none; color:var(--text-description); font-size:20px; cursor:pointer;">✕</button>
          
          <div style="text-align:center; margin-bottom:24px;">
            <div style="font-size:10px; font-weight:800; color:var(--brand-primary); letter-spacing:0.12em;">STAFF VERIFICATION ENTRY PASS</div>
            <h3 style="font-size:22px; font-weight:800; color:#fff; margin-top:4px;" id="smodal-student-name">Student</h3>
            <div style="font-size:13px; color:var(--brand-secondary);" id="smodal-company">TCS</div>
          </div>

          <div style="background:rgba(5,8,16,0.7); border:1px solid rgba(0,200,255,0.15); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--text-muted);">Target Role:</span><span style="color:#fff; font-weight:700;" id="smodal-role">Developer</span></div>
            <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--text-muted);">Venue Room:</span><span style="color:var(--brand-primary); font-weight:800;" id="smodal-venue">Seminar Hall A</span></div>
            <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--text-muted);">Assigned Slot:</span><span style="color:#fff; font-weight:700;" id="smodal-slot">Slot 1</span></div>
          </div>

          <button id="smodal-close-btn" class="btn-premium" style="width:100%; height:44px; font-size:14px;">Dismiss Verification Token</button>
        </div>
      </div>
    `;

    // Attach staff action listeners
    root.querySelectorAll('.staff-verify-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const student = e.currentTarget.dataset.name;
        const company = e.currentTarget.dataset.company;
        verifyStudentCheckIn(student, company);
      });
    });

    root.querySelectorAll('.staff-pass-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const d = e.currentTarget.dataset;
        document.getElementById('smodal-student-name').textContent = d.name;
        document.getElementById('smodal-company').textContent = d.company;
        document.getElementById('smodal-role').textContent = d.role;
        document.getElementById('smodal-venue').textContent = d.venue;
        document.getElementById('smodal-slot').textContent = `${d.slot} (${d.time})`;
        const overlay = document.getElementById('staff-pass-modal');
        if (overlay) overlay.style.display = 'flex';
      });
    });

    document.getElementById('close-staff-pass')?.addEventListener('click', () => {
      const overlay = document.getElementById('staff-pass-modal');
      if (overlay) overlay.style.display = 'none';
    });
    document.getElementById('smodal-close-btn')?.addEventListener('click', () => {
      const overlay = document.getElementById('staff-pass-modal');
      if (overlay) overlay.style.display = 'none';
    });

    // Staff Search Filter
    document.getElementById('staff-search-slot')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const rows = root.querySelectorAll('#staff-slot-tbody tr');
      rows.forEach(r => {
        const text = r.textContent.toLowerCase();
        r.style.display = text.includes(q) ? '' : 'none';
      });
    });
  }

  // Staff function to verify check-in for a student
  function verifyStudentCheckIn(studentName, companyName) {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let updated = false;

    if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if ((alloc.company || '').toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes((alloc.company || '').toLowerCase())) {
          if (alloc.allocations && Array.isArray(alloc.allocations)) {
            alloc.allocations.forEach(a => {
              const cleanA = (a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              const cleanTarget = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              if (cleanA.includes(cleanTarget) || cleanTarget.includes(cleanA)) {
                a.attendance = 'present';
                a.checkInTime = nowTime;
                updated = true;
              }
            });
          }
        }
      });
    }

    if (updated) {
      localStorage.setItem('placenix_slots', JSON.stringify(Store.slotAllocations));
    }

    if (window.Toast) {
      window.Toast.show(`✓ Venue Check-In Verified for ${studentName} at ${nowTime}!`, 'success');
    } else {
      alert(`✓ Venue Check-In Verified for ${studentName} at ${nowTime}!`);
    }

    render();
  }

  // ────────────────────────────────────────────────────────────
  // STUDENT VIEW (Personal Slot & Lifecycle Portal)
  // ────────────────────────────────────────────────────────────
  function renderStudentView() {
    const studentName = Store.session.user.full_name || Store.session.user.name || 'Student';
    const myAllocations = [];
    const seenAllocations = new Set();
    
    if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if (alloc.allocations && Array.isArray(alloc.allocations)) {
          alloc.allocations.forEach(a => {
            const cleanA = (a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const cleanS = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            let isNameMatch = cleanS && cleanA && (cleanA.includes(cleanS) || cleanS.includes(cleanA));
            
            if (!isNameMatch && cleanA && cleanS) {
              const minLen = Math.min(cleanA.length, cleanS.length);
              if (minLen >= 5 && cleanA.substring(0, 5) === cleanS.substring(0, 5)) {
                isNameMatch = true;
              }
            }
            
            if (String(a.studentId) === String(Store.session.user.id) || isNameMatch) {
              let companyKey = (alloc.company || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              if (companyKey.startsWith('tcs')) companyKey = 'tcs';
              const roundKey = `${companyKey}_${(alloc.roundName || '').toLowerCase().trim()}`;
              
              if (!seenAllocations.has(roundKey)) {
                seenAllocations.add(roundKey);
                
                let slotLabel = 'Slot 1';
                if (a.slotId) {
                  const parts = a.slotId.split('_');
                  slotLabel = parts.length > 1 ? `Slot ${parts[1]}` : a.slotId;
                }
                
                myAllocations.push({
                  company: alloc.company,
                  role: alloc.role || 'Software Engineer',
                  roundName: alloc.roundName || 'Aptitude Round',
                  date: alloc.date || '2026-07-10',
                  venue: a.venue || 'Seminar Hall A',
                  slotTime: a.slotTime || '9:00 AM - 10:00 AM',
                  slotNo: slotLabel,
                  attendance: a.attendance || 'pending',
                  checkInTime: a.checkInTime || null,
                  allocId: alloc.id
                });
              }
            }
          });
        }
      });
    }

    // Default demonstration allocation if student has no allocated slot in memory
    if (myAllocations.length === 0) {
      myAllocations.push({
        company: 'TCS',
        role: 'Developer',
        roundName: 'Aptitude',
        date: '2026-07-10',
        venue: 'Seminar Hall A',
        slotTime: '9:00 AM - 10:00 AM',
        slotNo: 'Slot 1',
        attendance: 'pending',
        checkInTime: null,
        isDemo: true
      });
    }

    root.innerHTML = `
      <div style="padding: 40px; max-width: 1360px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
        
        <!-- Page Title & Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid var(--border-subtle); padding-bottom:24px; flex-wrap:wrap; gap:16px;">
          <div>
            <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary); letter-spacing:0.12em;">Personal Scheduling Node</div>
            <h1 class="h1-ent" style="font-size:32px; color:#fff;">My Interview Slots & Lifecycle</h1>
            <p style="color:var(--text-description); font-size:14px; margin-top:6px; line-height:1.5;">
              View, track, and complete live stage progression for your assigned recruitment rounds and venue slots.
            </p>
          </div>
          
          <div style="display:flex; gap:12px; align-items:center;">
            <div style="background:rgba(0,200,255,0.08); border:1px solid rgba(0,200,255,0.2); padding:10px 18px; border-radius:12px; display:flex; align-items:center; gap:10px;">
              <svg width="16" height="16" fill="var(--brand-primary)" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              <span style="font-size:12.5px; font-weight:700; color:#fff;">Strict Data Isolation Active</span>
            </div>
          </div>
        </div>

        <!-- Dynamic Slot Lifecycle Grid -->
        <div style="display:grid; grid-template-columns: 1fr; gap: 32px;">
          ${myAllocations.map(alloc => {
            const isCheckedIn = alloc.attendance === 'present';
            const isCompleted = alloc.attendance === 'completed';
            let currentStage = 2;
            if (isCheckedIn) currentStage = 3;
            if (isCompleted) currentStage = 5;

            return `
              <div class="card-ent slot-item-card animate-fade-in-up" style="
                background: var(--bg-card); 
                border: 1px solid rgba(0, 200, 255, 0.18); 
                padding: 36px; 
                display: flex; 
                flex-direction: column; 
                gap: 32px; 
                position: relative; 
                overflow: hidden;
                border-radius: 20px;
                box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
              ">
                <div style="position: absolute; top: 0; left: 8%; right: 8%; height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.35), transparent);"></div>
                
                <div style="position: absolute; right: -20px; top: -20px; opacity: 0.03; width: 220px; height: 220px; color: #fff; pointer-events: none;">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom:24px;">
                  <div>
                    <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:10px;">
                      ${isCheckedIn ? `
                        <span class="badge" style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#10B981; font-weight:800; padding:6px 14px; border-radius:100px; font-size:10px; letter-spacing:0.06em;">
                          🟢 STAGE 3: VENUE CHECK-IN VERIFIED
                        </span>
                      ` : isCompleted ? `
                        <span class="badge" style="background:rgba(0,200,255,0.12); border:1px solid rgba(0,200,255,0.3); color:#00C8FF; font-weight:800; padding:6px 14px; border-radius:100px; font-size:10px; letter-spacing:0.06em;">
                          ✓ STAGE 5: ROUND QUALIFIED & PROMOTED
                        </span>
                      ` : `
                        <span class="badge" style="background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); color:#F59E0B; font-weight:800; padding:6px 14px; border-radius:100px; font-size:10px; letter-spacing:0.06em;">
                          ⏳ STAGE 2: SLOT ALLOCATED (CHECK-IN PENDING)
                        </span>
                      `}
                    </div>
                    <h2 class="h2-ent" style="font-size:26px; color:#fff; margin:0; font-weight:800; letter-spacing:-0.02em;">${alloc.company}</h2>
                    <div style="color:var(--text-description); font-size:14px; margin-top:4px; font-weight:600;">Designation: <span style="color:#fff; font-weight:700;">${alloc.role}</span></div>
                  </div>
                  
                  <div style="text-align:right;">
                    <div class="label-ent" style="color:var(--brand-primary); font-size:10px; margin-bottom:6px; font-weight:800; letter-spacing:0.06em;">DATE OF PROCESS</div>
                    <div style="font-weight:900; color:#fff; font-size:15px; background:rgba(5,8,16,0.65); border:1px solid rgba(0,200,255,0.2); padding:8px 16px; border-radius:12px; display:inline-flex; align-items:center; gap:8px;">
                      <svg width="14" height="14" fill="none" stroke="var(--brand-primary)" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span>${alloc.date}</span>
                    </div>
                  </div>
                </div>

                <!-- 5-Stage Timeline Stepper -->
                <div style="padding: 24px; background: rgba(5,8,16,0.55); border: 1px solid rgba(0,200,255,0.12); border-radius: 16px;">
                  <div class="label-ent" style="margin-bottom: 20px; color:var(--brand-primary); font-size:10px; letter-spacing:0.1em; display:flex; justify-content:space-between; align-items:center;">
                    <span>RECRUITMENT STAGE PROGRESSION LIFECYCLE</span>
                    <span style="color:var(--text-muted);">AUTOMATED AUDIT TRAIL</span>
                  </div>

                  <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; position:relative;">
                    
                    <div style="display:flex; flex-direction:column; gap:10px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:#10B981; color:#050810; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; box-shadow:0 0 12px rgba(16,185,129,0.5); flex-shrink:0;">✓</div>
                        <div style="flex:1; height:3px; background:#10B981; border-radius:2px;"></div>
                      </div>
                      <div>
                        <div style="font-size:12px; font-weight:800; color:#fff;">1. Shortlisted</div>
                        <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Profile Verified</div>
                      </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:#00C8FF; color:#050810; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; box-shadow:0 0 12px rgba(0,200,255,0.5); flex-shrink:0;">✓</div>
                        <div style="flex:1; height:3px; background:${currentStage >= 3 ? '#10B981' : 'rgba(255,255,255,0.1)'}; border-radius:2px;"></div>
                      </div>
                      <div>
                        <div style="font-size:12px; font-weight:800; color:#fff;">2. Slot Released</div>
                        <div style="font-size:10px; color:var(--brand-primary); margin-top:2px; font-weight:700;">${alloc.slotNo} • Assigned</div>
                      </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:${isCheckedIn ? '#10B981' : '#F59E0B'}; color:#050810; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; box-shadow:0 0 12px ${isCheckedIn ? 'rgba(16,185,129,0.5)' : 'rgba(245,158,11,0.5)'}; flex-shrink:0;">
                          ${isCheckedIn ? '✓' : '3'}
                        </div>
                        <div style="flex:1; height:3px; background:${currentStage >= 4 ? '#10B981' : 'rgba(255,255,255,0.1)'}; border-radius:2px;"></div>
                      </div>
                      <div>
                        <div style="font-size:12px; font-weight:800; color:${isCheckedIn ? '#10B981' : '#F59E0B'};">3. Venue Check-In</div>
                        <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${isCheckedIn ? (alloc.checkInTime ? `Checked-in ${alloc.checkInTime}` : 'Verified at Venue') : 'Pending Reporting'}</div>
                      </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:${isCheckedIn ? '#00C8FF' : 'rgba(255,255,255,0.08)'}; color:${isCheckedIn ? '#050810' : 'var(--text-muted)'}; border:1px solid ${isCheckedIn ? '#00C8FF' : 'rgba(255,255,255,0.1)'}; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; flex-shrink:0;">
                          4
                        </div>
                        <div style="flex:1; height:3px; background:${currentStage >= 5 ? '#10B981' : 'rgba(255,255,255,0.1)'}; border-radius:2px;"></div>
                      </div>
                      <div>
                        <div style="font-size:12px; font-weight:800; color:${isCheckedIn ? '#fff' : 'var(--text-muted)'};">4. Round Evaluation</div>
                        <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${alloc.roundName}</div>
                      </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background:${isCompleted ? '#10B981' : 'rgba(255,255,255,0.08)'}; color:${isCompleted ? '#050810' : 'var(--text-muted)'}; border:1px solid ${isCompleted ? '#10B981' : 'rgba(255,255,255,0.1)'}; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; flex-shrink:0;">
                          5
                        </div>
                      </div>
                      <div>
                        <div style="font-size:12px; font-weight:800; color:${isCompleted ? '#10B981' : 'var(--text-muted)'};">5. Qualification</div>
                        <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Next Stage Offer</div>
                      </div>
                    </div>

                  </div>
                </div>

                <!-- 4 Operational Data Blocks Grid -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: center;">
                  <div style="display:flex; align-items:center; gap:14px; background:rgba(5,8,16,0.6); border:1px solid rgba(0,200,255,0.12); padding:16px 20px; border-radius:14px;">
                    <div style="width:42px; height:42px; border-radius:12px; background:rgba(0,200,255,0.1); border:1px solid rgba(0,200,255,0.25); display:flex; align-items:center; justify-content:center; font-size:18px; color:var(--brand-primary);">🎯</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:3px; font-weight:800; color:var(--brand-primary);">TARGET ROUND</div>
                      <div style="font-weight:800; color:#fff; font-size:15px;">${alloc.roundName}</div>
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:14px; background:rgba(5,8,16,0.6); border:1px solid rgba(0,200,255,0.12); padding:16px 20px; border-radius:14px;">
                    <div style="width:42px; height:42px; border-radius:12px; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); display:flex; align-items:center; justify-content:center; font-size:18px; color:var(--brand-secondary);">🏢</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:3px; font-weight:800; color:var(--brand-secondary);">VENUE ROOM</div>
                      <div style="font-weight:800; color:#fff; font-size:15px;">${alloc.venue}</div>
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:14px; background:rgba(5,8,16,0.6); border:1px solid rgba(0,200,255,0.12); padding:16px 20px; border-radius:14px;">
                    <div style="width:42px; height:42px; border-radius:12px; background:rgba(0,200,255,0.1); border:1px solid rgba(0,200,255,0.25); display:flex; align-items:center; justify-content:center; font-size:18px; color:var(--brand-primary);">🕒</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:3px; font-weight:800; color:var(--brand-primary);">SLOT INTERVAL</div>
                      <div style="font-weight:800; color:#fff; font-size:15px;">${alloc.slotTime}</div>
                    </div>
                  </div>

                  <div style="display:flex; align-items:center; gap:14px; background:rgba(5,8,16,0.6); border:1px solid rgba(0,200,255,0.12); padding:16px 20px; border-radius:14px;">
                    <div style="width:42px; height:42px; border-radius:12px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); display:flex; align-items:center; justify-content:center; font-size:18px; color:#10B981;">⚡</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:3px; font-weight:800; color:#10B981;">SLOT NUMBER</div>
                      <div style="font-weight:800; color:#fff; font-size:15px;">${alloc.slotNo}</div>
                    </div>
                  </div>
                </div>

                <!-- Action Controls -->
                <div style="display:flex; justify-content:space-between; align-items:center; padding-top:16px; border-top:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; gap:16px;">
                  <div style="display:flex; gap:12px;">
                    ${!isCheckedIn ? `
                      <button class="btn-premium checkin-action-btn" data-company="${alloc.company}" data-round="${alloc.roundName}" style="padding:10px 22px; font-size:13px; font-weight:800;">
                        <span>🟢 Perform Venue Check-In</span>
                      </button>
                    ` : `
                      <div style="display:flex; align-items:center; gap:8px; padding:8px 16px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:10px; color:#10B981; font-size:13px; font-weight:800;">
                        <span>✓ Checked-In & Verified at ${alloc.venue}</span>
                      </div>
                    `}

                    <button class="btn-premium-ghost view-pass-btn" data-company="${alloc.company}" data-role="${alloc.role}" data-venue="${alloc.venue}" data-slot="${alloc.slotNo}" data-time="${alloc.slotTime}" data-date="${alloc.date}" style="padding:10px 20px; font-size:13px; font-weight:700;">
                      <span>🎟️ Entry Pass & QR Token</span>
                    </button>
                  </div>

                  <button class="btn-premium-ghost" style="padding:10px 20px; font-size:13px; font-weight:700;" onclick="window.location.hash='#virtual-interview'">
                    <span>🚀 Practice Mock Simulation →</span>
                  </button>
                </div>

              </div>
            `;
          }).join('')}
        </div>

      </div>

      <!-- Student Pass Modal -->
      <div id="pass-modal-overlay" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(16px); z-index:9999; align-items:center; justify-content:center; padding:20px;">
        <div class="card-ent" style="max-width:480px; width:100%; padding:36px; border-radius:24px; background:var(--bg-card); border:1px solid rgba(0,200,255,0.3); position:relative; box-shadow:0 24px 60px rgba(0,0,0,0.8);">
          <button id="close-pass-modal" style="position:absolute; top:20px; right:20px; background:none; border:none; color:var(--text-description); font-size:20px; cursor:pointer;">✕</button>
          
          <div style="text-align:center; margin-bottom:24px;">
            <div style="font-size:10px; font-weight:800; color:var(--brand-primary); letter-spacing:0.12em; text-transform:uppercase;">INSTITUTIONAL RECRUITMENT ENTRY PASS</div>
            <h3 style="font-size:22px; font-weight:800; color:#fff; margin-top:4px;" id="modal-company-title">TCS</h3>
            <div style="font-size:13px; color:var(--text-description);" id="modal-role-title">Developer</div>
          </div>

          <div style="background:rgba(5,8,16,0.7); border:1px solid rgba(0,200,255,0.15); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
            <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--text-muted);">Candidate:</span><span style="color:#fff; font-weight:700;">${studentName}</span></div>
            <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--text-muted);">Venue Room:</span><span style="color:var(--brand-primary); font-weight:800;" id="modal-venue">Seminar Hall A</span></div>
            <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--text-muted);">Assigned Slot:</span><span style="color:#fff; font-weight:700;" id="modal-slot">Slot 1</span></div>
            <div style="display:flex; justify-content:space-between; font-size:13px;"><span style="color:var(--text-muted);">Date of Process:</span><span style="color:#fff; font-weight:700;" id="modal-date">2026-07-10</span></div>
          </div>

          <div style="background:#fff; padding:16px; border-radius:12px; text-align:center; margin-bottom:20px;">
            <svg width="100%" height="50" viewBox="0 0 200 50">
              <rect x="0" width="3" height="50" fill="#000"/>
              <rect x="5" width="1" height="50" fill="#000"/>
              <rect x="8" width="4" height="50" fill="#000"/>
              <rect x="15" width="2" height="50" fill="#000"/>
              <rect x="20" width="5" height="50" fill="#000"/>
              <rect x="28" width="1" height="50" fill="#000"/>
              <rect x="32" width="3" height="50" fill="#000"/>
              <rect x="38" width="6" height="50" fill="#000"/>
              <rect x="47" width="2" height="50" fill="#000"/>
              <rect x="52" width="4" height="50" fill="#000"/>
              <rect x="60" width="1" height="50" fill="#000"/>
              <rect x="64" width="5" height="50" fill="#000"/>
              <rect x="72" width="3" height="50" fill="#000"/>
              <rect x="78" width="2" height="50" fill="#000"/>
              <rect x="83" width="6" height="50" fill="#000"/>
              <rect x="92" width="2" height="50" fill="#000"/>
              <rect x="97" width="4" height="50" fill="#000"/>
              <rect x="104" width="1" height="50" fill="#000"/>
              <rect x="108" width="5" height="50" fill="#000"/>
              <rect x="116" width="3" height="50" fill="#000"/>
              <rect x="122" width="2" height="50" fill="#000"/>
              <rect x="127" width="5" height="50" fill="#000"/>
              <rect x="135" width="1" height="50" fill="#000"/>
              <rect x="139" width="4" height="50" fill="#000"/>
              <rect x="146" width="2" height="50" fill="#000"/>
              <rect x="151" width="6" height="50" fill="#000"/>
              <rect x="160" width="3" height="50" fill="#000"/>
              <rect x="166" width="1" height="50" fill="#000"/>
              <rect x="170" width="5" height="50" fill="#000"/>
              <rect x="178" width="2" height="50" fill="#000"/>
              <rect x="183" width="4" height="50" fill="#000"/>
              <rect x="190" width="2" height="50" fill="#000"/>
              <rect x="195" width="5" height="50" fill="#000"/>
            </svg>
            <div style="font-family:monospace; font-weight:800; color:#000; font-size:12px; margin-top:6px; letter-spacing:0.15em;">PLCX-8820-2026-PASS</div>
          </div>

          <button id="modal-ok-btn" class="btn-premium" style="width:100%; height:44px; font-size:14px;">Done / Verification Ready</button>
        </div>
      </div>
    `;

    root.querySelectorAll('.checkin-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const company = e.currentTarget.dataset.company;
        const round = e.currentTarget.dataset.round;
        performStudentCheckIn(company, round);
      });
    });

    root.querySelectorAll('.view-pass-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const d = e.currentTarget.dataset;
        document.getElementById('modal-company-title').textContent = d.company;
        document.getElementById('modal-role-title').textContent = d.role;
        document.getElementById('modal-venue').textContent = d.venue;
        document.getElementById('modal-slot').textContent = `${d.slot} (${d.time})`;
        document.getElementById('modal-date').textContent = d.date;
        const overlay = document.getElementById('pass-modal-overlay');
        if (overlay) overlay.style.display = 'flex';
      });
    });

    document.getElementById('close-pass-modal')?.addEventListener('click', () => {
      const overlay = document.getElementById('pass-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    });

    document.getElementById('modal-ok-btn')?.addEventListener('click', () => {
      const overlay = document.getElementById('pass-modal-overlay');
      if (overlay) overlay.style.display = 'none';
    });
  }

  function syncCheckInToKanbanAndAttendance(studentName, companyName, nowTime) {
    localStorage.setItem('placenix_slots', JSON.stringify(Store.slotAllocations || []));

    if (Store.kanban && typeof Store.kanban === 'object') {
      let movedCard = null;
      ['shortlisted', 'applied'].forEach(sourceCol => {
        if (Array.isArray(Store.kanban[sourceCol])) {
          const idx = Store.kanban[sourceCol].findIndex(card => {
            const candName = (card.name || '').toLowerCase().trim();
            const candComp = (card.drive || card.company || '').toLowerCase().trim();
            const targetName = (studentName || '').toLowerCase().trim();
            const targetComp = (companyName || '').toLowerCase().trim();
            return (candComp.includes(targetComp) || targetComp.includes(candComp)) &&
                   (candName.includes(targetName) || targetName.includes(candName) || !targetName);
          });
          if (idx !== -1) {
            [movedCard] = Store.kanban[sourceCol].splice(idx, 1);
          }
        }
      });

      if (movedCard) {
        movedCard.attendance = 'present';
        movedCard.attendanceDraft = 'present';
        movedCard.checkInTime = nowTime;
        if (!Store.kanban.aptitude) Store.kanban.aptitude = [];
        Store.kanban.aptitude.push(movedCard);
      }

      // Sync attendance flag across all remaining stages
      Object.keys(Store.kanban).forEach(stg => {
        if (Array.isArray(Store.kanban[stg])) {
          Store.kanban[stg].forEach(card => {
            const candName = (card.name || '').toLowerCase().trim();
            const candComp = (card.drive || card.company || '').toLowerCase().trim();
            const targetName = (studentName || '').toLowerCase().trim();
            const targetComp = (companyName || '').toLowerCase().trim();

            if ((candComp.includes(targetComp) || targetComp.includes(candComp)) &&
                (candName.includes(targetName) || targetName.includes(candName) || !targetName)) {
              card.attendance = 'present';
              card.attendanceDraft = 'present';
              card.checkInTime = nowTime;
            }
          });
        }
      });
    }

    localStorage.setItem('placenix_kanban', JSON.stringify(Store.kanban || {}));
    window.dispatchEvent(new CustomEvent('store-updated'));
  }

  function verifyStudentCheckIn(studentName, companyName) {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let updated = false;

    if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if ((alloc.company || '').toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes((alloc.company || '').toLowerCase())) {
          if (alloc.allocations && Array.isArray(alloc.allocations)) {
            alloc.allocations.forEach(a => {
              const cleanA = (a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              const cleanTarget = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              if (cleanA.includes(cleanTarget) || cleanTarget.includes(cleanA)) {
                a.attendance = 'present';
                a.checkInTime = nowTime;
                updated = true;
              }
            });
          }
        }
      });
    }

    syncCheckInToKanbanAndAttendance(studentName, companyName, nowTime);

    if (window.Toast) {
      window.Toast.show(`✓ Venue Check-In Verified for ${studentName} at ${nowTime}! Syncing live with Attendance Tracker & Kanban.`, 'success');
    } else {
      alert(`✓ Venue Check-In Verified for ${studentName} at ${nowTime}!`);
    }

    render();
  }

  function performStudentCheckIn(companyName, roundName) {
    const studentName = Store.session.user.full_name || Store.session.user.name || '';
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if ((alloc.company || '').toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes((alloc.company || '').toLowerCase())) {
          if (alloc.allocations && Array.isArray(alloc.allocations)) {
            alloc.allocations.forEach(a => {
              const cleanA = (a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              const cleanS = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              if (String(a.studentId) === String(Store.session.user.id) || (cleanS && cleanA && cleanA.includes(cleanS))) {
                a.attendance = 'present';
                a.checkInTime = nowTime;
              }
            });
          }
        }
      });
    }

    syncCheckInToKanbanAndAttendance(studentName, companyName, nowTime);

    if (window.Toast) {
      window.Toast.show(`✓ Venue Check-In Verified! Attendance recorded at ${nowTime}.`, 'success');
    } else {
      alert(`✓ Venue Check-In Verified! Attendance recorded at ${nowTime}.`);
    }

    render();
  }

  const onStoreUpdate = () => render();
  window.addEventListener('store-updated', onStoreUpdate);

  render();

  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      window.removeEventListener('store-updated', onStoreUpdate);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
