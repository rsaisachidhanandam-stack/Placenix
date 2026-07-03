// ============================================================
// PLACENIX — DEPARTMENTAL INTELLIGENCE HUB (v2.4)
// ============================================================

import { supabase } from '../supabase.js';
import { showToast } from '../components/toast.js';
import { saveStore, syncWithSupabase, getValidationStatus, saveValidationStatus } from '../store.js';

// ── Main Dashboard ──────────────────────────────────────────
export async function loadDeptDash(root, Store, supabase) {
  if (supabase) {
    await syncWithSupabase(supabase);
  }
  const analytics = Store.analytics?.overall || {};
  
  // Find all active slot allocations that have been notified
  const activeAllocations = (Store.slotAllocations || []).filter(a => a.notified === true);
  
  let selectedAllocId = localStorage.getItem('placenix_dept_selected_alloc_id') || activeAllocations[0]?.id || '';
  // If not found in list, fall back to first one
  let activeAlloc = activeAllocations.find(a => String(a.id) === String(selectedAllocId));
  if (!activeAlloc && activeAllocations.length > 0) {
    activeAlloc = activeAllocations[0];
    selectedAllocId = activeAlloc.id;
  }
  
  let selectedSlotId = localStorage.getItem('placenix_dept_selected_slot_id') || activeAlloc?.slots?.[0]?.id || '';
  if (activeAlloc && !activeAlloc.slots.find(s => s.id === selectedSlotId)) {
    selectedSlotId = activeAlloc.slots[0]?.id || '';
  }

  // Sync student attendance statuses with Store.kanban to show real states
  function syncAttendanceWithKanban() {
    activeAllocations.forEach(alloc => {
      if (alloc && alloc.allocations) {
        alloc.allocations.forEach(student => {
          let foundAttendance = 'pending';
          for (const stage of Object.keys(Store.kanban)) {
            if (Array.isArray(Store.kanban[stage])) {
              const card = Store.kanban[stage].find(c => String(c.id) === String(student.studentId));
              if (card && card.attendance) {
                foundAttendance = card.attendance;
                break;
              }
            }
          }
          student.attendance = student.attendance || foundAttendance;
        });
      }
    });
  }

  function render() {
    syncAttendanceWithKanban();
    
    activeAlloc = activeAllocations.find(a => String(a.id) === String(selectedAllocId));
    const slots = activeAlloc ? activeAlloc.slots : [];
    const activeSlot = slots.find(s => s.id === selectedSlotId) || slots[0];
    
    // Slotted students for current selected slot hour
    const slottedStudents = activeAlloc && activeSlot ? activeAlloc.allocations.filter(student => student.slotId === activeSlot.id) : [];

    root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Operational Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Departmental Node</div>
          <h1 class="h1-ent">Departmental Intelligence Hub</h1>
          <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Institutional oversight and recruitment telemetry for the ${Store.session.user.department} department.</p>
        </div>
        <div style="display:flex; gap:16px;">
          <div style="background:var(--bg-card); border:1px solid var(--border-main); padding:8px 16px; border-radius:10px; display:flex; align-items:center; gap:12px; font-size:12px; font-weight:700;">
            <div style="width:8px; height:8px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 8px var(--brand-secondary);"></div>
            ${Store.session.user.institution} Node Online
          </div>
        </div>
      </div>

      <!-- Metric Infrastructure -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
        <div class="card-ent" style="background: linear-gradient(145deg, var(--bg-card), rgba(139,92,246,0.05));">
          <div class="label-ent" style="margin-bottom: 16px;">Total Students</div>
          <div class="metric-ent">${analytics.totalStudents || 0}</div>
          <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Operational capacity reached</p>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Placement Rate</div>
          <div class="metric-ent">${analytics.placementPercent || 0}%</div>
          <div style="height:4px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden; margin-top:16px;">
            <div style="width:${analytics.placementPercent || 0}%; height:100%; background:var(--brand-secondary); box-shadow:0 0 12px var(--brand-secondary);"></div>
          </div>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Average ATS Node</div>
          <div class="metric-ent">84.2</div>
          <p style="font-size:12px; color:var(--text-description); margin-top:8px;">+4.2% improvement vs last batch</p>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Pending Validations</div>
          <div class="metric-ent">18</div>
          <p style="font-size:12px; color:var(--brand-primary); font-weight:700; margin-top:8px;">Urgent: 4 high-priority nodes</p>
        </div>
      </div>

      <!-- Content Grid -->
      <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap: 40px;">
        
        <!-- Left: Quick Navigation Matrix -->
        <div style="display:flex; flex-direction:column; gap:32px;">
          <h2 class="h2-ent" style="font-size:20px;">Operational Control Center</h2>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
            <div class="card-ent nav-card" onclick="location.hash='dept-students'">
              <div style="font-size:24px; margin-bottom:16px;">👥</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">Students Overview</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Validate and manage the departmental student registry.</p>
            </div>
            <div class="card-ent nav-card" onclick="location.hash='dept-resume'">
              <div style="font-size:24px; margin-bottom:16px;">📄</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">Resume Analytics</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Global oversight of student ATS performance.</p>
            </div>
            <div class="card-ent nav-card" onclick="location.hash='dept-new-jobs'">
              <div style="font-size:24px; margin-bottom:16px;">💼</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">New Job Applications</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Monitor active recruitment pipelines.</p>
            </div>
            <div class="card-ent nav-card" onclick="location.hash='dept-queries'">
              <div style="font-size:24px; margin-bottom:16px;">💬</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">Query Resolution</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Handle institutional student support tickets.</p>
            </div>
          </div>
        </div>

        <!-- Right: Recent Intelligence Feed -->
        <div class="card-ent" style="padding:40px;">
          <h2 class="h2-ent" style="font-size:20px; margin-bottom:32px;">Intelligence Pulse</h2>
          <div style="display:flex; flex-direction:column; gap:24px;">
            <div style="padding-left:16px; border-left:2px solid var(--brand-primary);">
              <div style="font-weight:700; color:#fff; font-size:14px;">Anniversary Drive Sync</div>
              <p style="font-size:12px; color:var(--text-description); margin-top:4px;">12 students shortlisted for Google SDE role.</p>
              <div class="label-ent" style="font-size:9px; margin-top:8px;">2h ago</div>
            </div>
            <div style="padding-left:16px; border-left:2px solid var(--border-subtle);">
              <div style="font-weight:700; color:#fff; font-size:14px;">Resume Pulse Update</div>
              <p style="font-size:12px; color:var(--text-description); margin-top:4px;">34 students updated their professional metadata.</p>
              <div class="label-ent" style="font-size:9px; margin-top:8px;">4h ago</div>
            </div>
            <div style="padding-left:16px; border-left:2px solid var(--border-subtle);">
              <div style="font-weight:700; color:#fff; font-size:14px;">Query Node: Urgent</div>
              <p style="font-size:12px; color:var(--text-description); margin-top:4px;">Request for interview scheduling assistance.</p>
              <div class="label-ent" style="font-size:9px; margin-top:8px;">Yesterday</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIVE SLOT ATTENDANCE HUB -->
      <div class="card-ent animate-fade-in-up" style="padding: 40px; border-color: var(--brand-primary); background: linear-gradient(145deg, var(--bg-card), rgba(139,92,246,0.02)); border-radius: 28px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; border-bottom:1px solid var(--border-main); padding-bottom:24px; flex-wrap:wrap; gap:20px;">
          <div>
            <h2 class="h2-ent" style="font-size:22px; color:#fff; display:flex; align-items:center; gap:10px; margin:0;">
              <span style="font-size:24px;">📊</span> Active Slot Attendance Hub
            </h2>
            <p style="color:var(--text-description); font-size:13px; margin:6px 0 0 0;">
              Verify ongoing candidate check-ins hour-by-hour and upload report to TPO.
            </p>
          </div>
          
          <!-- Allocation Dropdown -->
          <div style="display:flex; gap:16px;">
            ${activeAllocations.length === 0 ? '' : `
              <select id="active-alloc-select" class="input" style="width:280px; height:44px; font-size:13px; background-color:var(--bg-card); color:var(--text-main); border:1px solid var(--border-main); border-radius:10px; outline:none;">
                ${activeAllocations.map(a => `<option value="${a.id}" ${String(a.id) === String(selectedAllocId) ? 'selected' : ''}>${a.company} — ${a.roundName} (${a.date})</option>`).join('')}
              </select>
            `}
          </div>
        </div>

        ${activeAllocations.length === 0 ? `
          <div style="padding: 60px 40px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background: rgba(255,255,255,0.01); border: 1px dashed var(--border-subtle); border-radius: 20px;">
            <div style="font-size:44px;">⏳</div>
            <h3 style="font-size:18px; font-weight:800; color:#fff; margin:0;">No Active Schedules Released</h3>
            <p style="color:var(--text-description); font-size:13px; max-width:400px; margin:0; line-height:1.5;">
              There are currently no active slot allocations released by the TPO. When a slot is created and notified by TPO, it will show up here immediately for live attendance check-ins.
            </p>
          </div>
        ` : `
          <!-- Slot Hour Navigation Row -->
          <div style="margin-bottom: 32px;">
            <h4 class="label-ent" style="font-size:10.5px; margin-bottom:14px; color:var(--text-muted); letter-spacing:0.12em; font-weight:800;">SELECT ACTIVE HOUR SLOT</h4>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${slots.map(s => `
                <button class="slot-hour-pill-btn btn ${activeSlot && s.id === activeSlot.id ? 'active' : 'btn-secondary'}" data-slot-id="${s.id}" style="font-size:12px; padding:8px 16px; border-radius:10px; font-weight:700;">
                  ${s.timeLabel}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Student Attendance Sheet Table -->
          <div style="background:rgba(0,0,0,0.15); border:1px solid var(--border-main); border-radius:14px; overflow:hidden; margin-bottom: 32px;">
            <table style="width:100%; border-collapse:collapse; text-align:left;">
              <thead>
                <tr style="background:rgba(255,255,255,0.025); border-bottom:1px solid var(--border-main);">
                  <th style="padding:16px 20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Candidate Profile</th>
                  <th style="padding:16px 20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Assigned Venue</th>
                  <th style="padding:16px 20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; text-align:center; width: 140px;">Current Status</th>
                  <th style="padding:16px 20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; text-align:right;">Verify Live Check-In</th>
                </tr>
              </thead>
              <tbody>
                ${slottedStudents.length === 0 ? `
                  <tr>
                    <td colspan="4" style="text-align:center; padding:32px 0; color:var(--text-description); font-size:13px; font-style:italic;">
                      No candidates scheduled for this slot hour.
                    </td>
                  </tr>
                ` : slottedStudents.map(student => {
                  let badge = '';
                  if (student.attendance === 'completed') {
                    badge = `<span style="font-size:10px; font-weight:900; background:rgba(59,130,246,0.12); color:#3b82f6; padding:4px 10px; border-radius:100px; border:1px solid rgba(59,130,246,0.2);">🔵 COMPLETED</span>`;
                  } else if (student.attendance === 'present') {
                    badge = `<span style="font-size:10px; font-weight:900; background:rgba(16,185,129,0.12); color:#10B981; padding:4px 10px; border-radius:100px; border:1px solid rgba(16,185,129,0.2);">🟢 PRESENT</span>`;
                  } else if (student.attendance === 'absent') {
                    badge = `<span style="font-size:10px; font-weight:900; background:rgba(239,68,68,0.12); color:#EF4444; padding:4px 10px; border-radius:100px; border:1px solid rgba(239,68,68,0.2);">🔴 ABSENT</span>`;
                  } else {
                    badge = `<span style="font-size:10px; font-weight:900; background:rgba(100,116,139,0.12); color:var(--text-description); padding:4px 10px; border-radius:100px; border:1px solid rgba(100,116,139,0.2);">⏳ PENDING</span>`;
                  }

                  return `
                    <tr class="table-row-ent" style="border-bottom:1px solid var(--border-main);">
                      <td style="padding:16px 20px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                          <div style="width:32px; height:32px; border-radius:50%; background:var(--gradient-brand, linear-gradient(135deg, #7c3aed, #22d3ee)); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff;">
                            ${student.avatar || student.studentName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style="font-weight:700; color:#fff; font-size:13.5px;">${student.studentName}</div>
                            <div style="font-size:10.5px; color:var(--text-muted);">${student.dept}</div>
                          </div>
                        </div>
                      </td>
                      <td style="padding:16px 20px;">
                        <div style="font-weight:600; color:#fff; font-size:13px;">📍 ${student.venue}</div>
                      </td>
                      <td style="padding:16px 20px; text-align:center;">
                        ${badge}
                      </td>
                      <td style="padding:16px 20px; text-align:right;">
                        <div style="display:flex; gap:6px; justify-content:flex-end;">
                          <button class="attendance-toggle-btn complete-btn ${student.attendance === 'completed' ? 'complete-active' : ''}" data-student-id="${student.studentId}" data-status="completed">Complete</button>
                          <button class="attendance-toggle-btn present-btn ${student.attendance === 'present' ? 'present-active' : ''}" data-student-id="${student.studentId}" data-status="present">Present</button>
                          <button class="attendance-toggle-btn absent-btn ${student.attendance === 'absent' ? 'absent-active' : ''}" data-student-id="${student.studentId}" data-status="absent">Absent</button>
                          <button class="attendance-toggle-btn pending-btn ${!student.attendance || student.attendance === 'pending' ? 'pending-active' : ''}" data-student-id="${student.studentId}" data-status="pending">Clear</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Upload Verification Row -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div style="font-size:12.5px; color:var(--text-description);">
              Active Hour Summary: <strong style="color:#fff;">${slottedStudents.length} candidates scheduled</strong> • 
              <span style="color:#3B82F6; font-weight:700;">${slottedStudents.filter(s => s.attendance === 'completed').length} Completed</span> • 
              <span style="color:#10B981; font-weight:700;">${slottedStudents.filter(s => s.attendance === 'present').length} Present</span> • 
              <span style="color:#EF4444; font-weight:700;">${slottedStudents.filter(s => s.attendance === 'absent').length} Absent</span>
            </div>
            <button id="upload-attendance-tpo-btn" class="btn-premium" style="height:48px; font-size:13.5px; font-weight:800; padding:0 24px; border-radius:12px; letter-spacing:0.02em; cursor:pointer;">
              📤 Upload Verified Attendance to TPO
            </button>
          </div>
        `}
      </div>

    </div>

    <style>
      .nav-card { cursor: pointer; transition: all 0.3s ease; }
      .nav-card:hover { border-color: var(--brand-primary); transform: translateY(-4px); background: rgba(139,92,246,0.02); }
      .table-row-ent:hover { background: rgba(255,255,255,0.01); }
      .btn-validate { 
        padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; 
        cursor: pointer; transition: var(--t-fast); border: 1px solid var(--border-main);
        background: transparent; color: var(--text-description);
      }
      .btn-validate.active { background: rgba(16,185,129,0.1); border-color: var(--brand-secondary); color: var(--brand-secondary); }
      
      .slot-hour-pill-btn {
        transition: all 0.2s ease;
        border: 1px solid var(--border-main);
        color: var(--text-description);
        background: rgba(255,255,255,0.01);
        cursor: pointer;
      }
      .slot-hour-pill-btn:hover {
        border-color: var(--brand-primary);
        color: #fff;
      }
      .slot-hour-pill-btn.active {
        background: var(--brand-primary) !important;
        color: #fff !important;
        border-color: var(--brand-primary) !important;
        box-shadow: 0 0 12px rgba(139,92,246,0.3);
      }
      .attendance-toggle-btn {
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 800;
        cursor: pointer;
        border: 1px solid var(--border-main);
        background: transparent;
        color: var(--text-description);
        transition: all 0.2s ease;
      }
      .attendance-toggle-btn:hover {
        border-color: var(--border-medium);
        color: #fff;
      }
      .attendance-toggle-btn.complete-active {
        background: rgba(59,130,246,0.12) !important;
        border-color: #3b82f6 !important;
        color: #3b82f6 !important;
      }
      .attendance-toggle-btn.present-active {
        background: rgba(16,185,129,0.12) !important;
        border-color: var(--brand-secondary) !important;
        color: var(--brand-secondary) !important;
      }
      .attendance-toggle-btn.absent-active {
        background: rgba(239,68,68,0.12) !important;
        border-color: #ef4444 !important;
        color: #ef4444 !important;
      }
      .attendance-toggle-btn.pending-active {
        background: rgba(100,116,139,0.12) !important;
        border-color: #64748b !important;
        color: #64748b !important;
      }
    </style>
    `;

    attachListeners();
  }

  function handleMarkAttendance(studentId, status) {
    if (!activeAlloc) return;
    const student = activeAlloc.allocations.find(s => String(s.studentId) === String(studentId));
    if (student) {
      student.attendance = status;
      saveStore(); // Save draft state
      render();
    }
  }

  function handleUploadAttendanceToTPO() {
    if (!activeAlloc) return;
    
    const slots = activeAlloc.slots || [];
    const activeSlot = slots.find(s => s.id === selectedSlotId) || slots[0];
    const slottedStudents = activeAlloc.allocations.filter(student => student.slotId === (activeSlot ? activeSlot.id : ''));
    
    if (slottedStudents.length === 0) {
      showToast("No candidates scheduled to submit for this slot hour.", "warning");
      return;
    }

    let updatedCount = 0;
    slottedStudents.forEach(student => {
      const targetStatus = student.attendance || 'pending';
      // Map to central Store.kanban cards
      for (const stage of Object.keys(Store.kanban)) {
        if (Array.isArray(Store.kanban[stage])) {
          const card = Store.kanban[stage].find(c => String(c.id) === String(student.studentId));
          if (card) {
            card.attendance = targetStatus;
            updatedCount++;
          }
        }
      }
    });

    // Post a system notification to inform TPO of the uploaded report
    Store.notifications.unshift({
      id: 'n_' + Date.now() + Math.random().toString(36).substr(2, 4),
      type: 'attendance',
      title: `📊 Coordinator Attendance Uploaded`,
      message: `Dept. Coordinator uploaded verified attendance for ${activeAlloc.company} (${activeAlloc.roundName}) for the slot hour ${activeSlot ? activeSlot.timeLabel : ''}.`,
      date: new Date().toISOString().split('T')[0],
      unread: true
    });

    saveStore(); // Persist and trigger storage synchronization event
    showToast(`Successfully verified & uploaded attendance for ${updatedCount} students to TPO!`, "success");
    render();
  }

  function attachListeners() {
    // 1. Dropdown allocation change
    const allocSelect = root.querySelector('#active-alloc-select');
    if (allocSelect) {
      allocSelect.onchange = (e) => {
        selectedAllocId = e.target.value;
        localStorage.setItem('placenix_dept_selected_alloc_id', selectedAllocId);
        // Auto select first slot of new selection
        const nextAlloc = activeAllocations.find(a => String(a.id) === String(selectedAllocId));
        selectedSlotId = nextAlloc?.slots?.[0]?.id || '';
        localStorage.setItem('placenix_dept_selected_slot_id', selectedSlotId);
        render();
      };
    }

    // 2. Slot pill button toggles
    root.querySelectorAll('.slot-hour-pill-btn').forEach(btn => {
      btn.onclick = (e) => {
        selectedSlotId = e.currentTarget.dataset.slotId;
        localStorage.setItem('placenix_dept_selected_slot_id', selectedSlotId);
        render();
      };
    });

    // 3. Mark Attendance toggle buttons
    root.querySelectorAll('.attendance-toggle-btn').forEach(btn => {
      btn.onclick = (e) => {
        const studId = e.currentTarget.dataset.studentId;
        const status = e.currentTarget.dataset.status;
        handleMarkAttendance(studId, status);
      };
    });

    // 4. Upload verified report to TPO
    const uploadTpoBtn = root.querySelector('#upload-attendance-tpo-btn');
    if (uploadTpoBtn) {
      uploadTpoBtn.onclick = () => {
        handleUploadAttendanceToTPO();
      };
    }
  }

  render();
}

export async function loadDeptStudents(root, Store) {
  // Bind global validation handler
  window.handleDeptValidateStudent = async (studentId) => {
    if (!confirm('🛡️ SYSTEM ACCESS REQUIRED:\n\nAre you sure you want to VERIFY and VALIDATE this student profile?')) return;
    
    try {
      saveValidationStatus(studentId, 'Approved');
      
      if (supabase) {
        await supabase
          .from('profiles')
          .update({ rejection_comments: 'STATUS:Approved' })
          .eq('id', studentId);
      }
      
      showToast('Student profile has been successfully validated.', 'success');
      
      // Re-render
      await loadDeptStudents(root, Store);
    } catch (err) {
      console.error('Validation failed:', err);
      showToast('Validation failed.', 'warning');
    }
  };

  const students = await getFilteredStudents(Store);
  root.innerHTML = `
    <style>
      .student-name-hover:hover {
        color: var(--brand-primary) !important;
      }
    </style>
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto;">
      <div style="margin-bottom: 32px;">
        <h1 class="h1-ent" style="font-size:28px;">Students Overview</h1>
        <p style="color:var(--text-description); font-size:14px;">Institutional registry and profile validation matrix.</p>
      </div>

      <div class="card-ent" style="padding:0; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-main);">
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Student Profile</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Dept / Batch</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Performance Index</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Status Node</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${students.length === 0 ? `
              <tr>
                <td colspan="5" style="padding: 64px 40px; text-align: center; background: rgba(255,255,255,0.003);">
                  <div style="font-size: 48px; margin-bottom: 20px; filter: drop-shadow(0 0 12px rgba(139,92,246,0.2));">⚠️</div>
                  <h3 style="font-weight: 800; color: #fff; font-size: 18px; margin-bottom: 10px;">No Students Mapped to Your Workspace</h3>
                  <p style="color: var(--text-description); font-size: 14px; max-width: 520px; margin: 0 auto 28px auto; line-height: 1.6;">
                     Your coordinator account (<strong>${Store.session?.user?.full_name || Store.session?.user?.name || 'Sai Ganka R'}</strong>) is currently not mapped to any Department or Section in the database.
                  </p>
                  <div style="display: flex; gap: 16px; justify-content: center; align-items: center;">
                    <a href="#admin-setup" class="btn-premium" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 40px; font-size: 12px; border-radius: 10px; padding: 0 24px;">
                      ⚙️ Map Node in Admin Panel
                    </a>
                  </div>
                </td>
              </tr>
            ` : students.map(s => `
              <tr class="table-row-ent" style="border-bottom:1px solid var(--border-main);">
                <td style="padding:20px;">
                  <a href="#student-details?id=${s.id}" style="text-decoration:none; display:flex; align-items:center; gap:12px; color:inherit;">
                    <div style="width:36px; height:36px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:var(--brand-primary);">${s.avatar}</div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:14px; transition:color var(--t-fast);" class="student-name-hover">${s.name}</div>
                      <div style="font-size:11px; color:var(--text-muted);">Roll: ${s.rollNo || 'N/A'}</div>
                    </div>
                  </a>
                </td>
                <td style="padding:20px;">
                  <div style="font-weight:600; color:#fff; font-size:13px;">${s.dept}</div>
                  <div style="font-size:11px; color:var(--text-muted);">Batch ${s.batch}</div>
                </td>
                <td style="padding:20px;">
                  <div style="display:flex; gap:12px;">
                    <div><span class="label-ent" style="font-size:9px; display:block;">CGPA</span><span style="font-weight:700; color:#fff;">${s.cgpa}</span></div>
                    <div style="border-left:1px solid var(--border-subtle); padding-left:12px;"><span class="label-ent" style="font-size:9px; display:block;">ATS</span><span style="font-weight:700; color:var(--brand-primary);">${s.atsScore}</span></div>
                  </div>
                </td>
                <td style="padding:20px;">
                  <span class="status-pill ${s.status === 'Approved' ? 'status-success' : s.status === 'Rejected' ? 'status-danger' : 'status-warning'}" style="font-size:10px;">${s.status}</span>
                </td>
                <td style="padding:20px; text-align:right;">
                  <div style="display:inline-flex; align-items:center; gap:12px;">
                    <a href="#student-details?id=${s.id}" class="btn-premium-ghost" style="text-decoration:none; display:inline-flex; align-items:center; height:36px; font-size:11px; border-radius:10px; padding:0 16px;">🔍 View Profile</a>
                    ${s.status === 'Approved' ? `
                      <button class="btn-validate active" disabled style="cursor: not-allowed; opacity: 0.8;">✓ Validated</button>
                    ` : s.status === 'Pending Coordinator' ? `
                      <button class="btn-validate" style="background: var(--brand-secondary); border-color: var(--brand-secondary); color: white;" onclick="window.handleDeptValidateStudent('${s.id}')">Validate Profile</button>
                    ` : s.status === 'Rejected' ? `
                      <button class="btn-validate" style="background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444;" disabled>Rejected</button>
                    ` : `
                      <button class="btn-validate" style="opacity: 0.6; cursor: not-allowed;" disabled title="Pending Faculty Advisor approval">Pending FA</button>
                    `}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── (b) Student Resume Analysis ───────────────────────────
export async function loadDeptResume(root, Store) {
  const students = await getFilteredStudents(Store);

  const getStudentResumeAnalysis = (s) => {
    if (s.resume_analysis && Object.keys(s.resume_analysis).length > 0) {
      return s.resume_analysis;
    }
    const seed = s.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const atsScore = s.atsScore || Math.round(65 + (seed % 25));
    return {
      ats_score: atsScore,
      suggestions: [
        {
          icon: "alert-circle",
          title: "Quantifiable Impact",
          description: "Increase metric metrics by adding numerical data points."
        },
        {
          icon: "briefcase",
          title: "Architecture Depth",
          description: "Expand on the tech stack details to align with target role."
        }
      ],
      found_keywords: (s.skills || []).slice(0, 5),
      missing_keywords: ["GraphQL", "Docker Orchestration", "CI/CD Pipeline"],
      industry_match: {
        "Enterprise SaaS": atsScore,
        "FinTech": Math.max(10, atsScore - 15),
        "E-commerce": Math.max(10, atsScore - 25)
      }
    };
  };

  const renderAuditModal = (student) => {
    const analysis = getStudentResumeAnalysis(student);
    const modal = document.createElement('div');
    modal.className = 'custom-modal-overlay';
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.85); backdrop-filter: blur(16px); 
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    `;
    
    const getEmojiIcon = (icon) => {
      const iconMap = {
        'alert-circle': '⚠️',
        'alert-triangle': '⚠️',
        'code': '💻',
        'terminal': '⌨️',
        'trending-up': '📈',
        'trending-down': '📉',
        'bar-chart': '📊',
        'bar-chart-2': '📊',
        'file-text': '📄',
        'file': '📄',
        'settings': '⚙️',
        'tool': '🛠️',
        'briefcase': '💼',
        'cpu': '🧠',
        'activity': '⚡',
        'check-circle': '✅'
      };
      const cleanIcon = String(icon || '✨').toLowerCase().trim();
      return iconMap[cleanIcon] || icon || '✨';
    };

    modal.innerHTML = `
      <div class="card-ent" style="width: 860px; max-height: 90vh; overflow-y: auto; padding: 48px; position: relative; border-color: var(--brand-primary); border-radius:32px;">
        <button id="close-modal" style="position:absolute; top:32px; right:32px; background:rgba(255,255,255,0.05); border:1px solid var(--border-main); color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;">✕</button>
        
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:40px;">
          <div style="display:flex; gap:24px; align-items:center;">
            <div style="width:72px; height:72px; background:var(--brand-primary); border-radius:20px; display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:950; color:#fff; box-shadow: 0 10px 30px -10px var(--brand-primary);">${student.avatar}</div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <h2 style="font-size:30px; font-weight:950; color:#fff; letter-spacing:-0.04em; margin:0; line-height:1.1;">${student.name}</h2>
              <p style="color:var(--text-description); font-size:15px; margin:0; font-weight:600; opacity:0.8;">${student.dept} <span style="color:var(--border-main); margin:0 8px;">|</span> Batch of ${student.batch}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:40px; font-weight:950; color:var(--brand-secondary); line-height:1;">${analysis.ats_score}</div>
            <div class="label-ent" style="font-size:11px; margin-top:8px;">Institutional ATS Index</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:28px; margin-bottom:40px;">
          <div class="card-ent" style="background:rgba(255,255,255,0.015); border-color:var(--border-subtle); border-radius:24px; padding:28px;">
            <h3 class="label-ent" style="font-size:11px; margin-bottom:20px; color:var(--brand-primary);">Keyword Telemetry</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div style="display:flex; justify-content:space-between; font-size:13.5px;">
                <span style="color:var(--text-description);">Keywords Found</span>
                <span style="color:var(--brand-secondary); font-weight:800;">${analysis.found_keywords?.length || 0} Match(es)</span>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; max-height: 80px; overflow-y: auto; padding-right: 4px;">
                ${(analysis.found_keywords || []).map(kw => '<span style="font-size:10px; padding:3px 8px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:6px; color:#10b981; font-weight:600;">' + kw + '</span>').join('')}
              </div>
              <div style="display:flex; justify-content:space-between; font-size:13.5px; margin-top:4px;">
                <span style="color:var(--text-description);">Missing Core Keywords</span>
                <span style="color:#ef4444; font-weight:800;">${analysis.missing_keywords?.length || 0} Missing</span>
              </div>
              <div style="display:flex; flex-wrap:wrap; gap:6px; max-height: 80px; overflow-y: auto; padding-right: 4px;">
                ${(analysis.missing_keywords || []).map(kw => '<span style="font-size:10px; padding:3px 8px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:6px; color:#ef4444; font-weight:600;">' + kw + '</span>').join('')}
              </div>
            </div>
          </div>
          <div class="card-ent" style="background:rgba(255,255,255,0.015); border-color:var(--border-subtle); border-radius:24px; padding:28px;">
            <h3 class="label-ent" style="font-size:11px; margin-bottom:20px; color:var(--brand-primary);">Industry Alignment Match</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${Object.entries(analysis.industry_match || {}).slice(0, 3).map(([ind, val]) => '<div style="display:flex; flex-direction:column; gap:6px;"><div style="display:flex; justify-content:space-between; font-size:13px; font-weight:700;"><span style="color:var(--text-description);">' + ind + '</span><span style="color:var(--brand-secondary);">' + val + '%</span></div><div style="height:6px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden;"><div style="width:' + val + '%; height:100%; background:linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius:10px;"></div></div></div>').join('')}
            </div>
          </div>
        </div>

        <div>
          <h3 class="label-ent" style="font-size:11px; margin-bottom:20px; color:var(--brand-primary);">AI Suggestions & Action Directives</h3>
          <div style="display:flex; flex-direction:column; gap:14px;">
            ${(analysis.suggestions || []).map(s => '<div style="display:flex; align-items:start; gap:16px; padding:18px 20px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:16px;"><div style="font-size:22px; line-height:1; padding-top:2px;">' + getEmojiIcon(s.icon) + '</div><div style="display:flex; flex-direction:column; gap:4px;"><div style="font-size:14.5px; font-weight:800; color:#fff;">' + s.title + '</div><div style="font-size:12.5px; color:var(--text-description); line-height:1.5;">' + s.description + '</div></div></div>').join('')}
          </div>
        </div>
        <div style="display:flex; justify-content:center; margin-top:36px;">
          <a href="#student-details?id=${student.id}" class="btn-premium" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; height:44px; padding:0 24px; border-radius:12px; font-weight:700;" onclick="this.closest('.custom-modal-overlay')?.remove();">🔍 View Full Academic Profile</a>
        </div>
      </div>
    `;
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    document.body.appendChild(modal);
  };

  root.innerHTML = `
    <div style="padding: 24px 40px; max-width: 1680px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
      
      <!-- Premium Institutional Header -->
      <div style="margin-bottom: 48px; position: relative; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle);">
        <h1 class="h1-ent" style="font-size:36px; letter-spacing:-0.03em;">Global Resume Intelligence</h1>
        <p style="color:var(--text-description); font-size:16px; margin-top:8px;">Department-wide ATS performance telemetry and professional alignment analysis.</p>
        <div style="position:absolute; bottom:-1px; left:0; width:160px; height:4px; background:linear-gradient(90deg, var(--brand-secondary), transparent); border-radius:10px;"></div>
      </div>

      <div id="resume-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 32px;">
        ${students.length === 0 ? `
          <div class="card-ent" style="grid-column: 1 / -1; padding: 64px 40px; text-align: center; background: rgba(255,255,255,0.003); border: 1.5px dashed var(--border-main); border-radius: 28px;">
            <div style="font-size: 48px; margin-bottom: 20px; filter: drop-shadow(0 0 12px rgba(139,92,246,0.2));">⚠️</div>
            <h3 style="font-weight: 800; color: #fff; font-size: 18px; margin-bottom: 10px;">No Students Mapped to Your Workspace</h3>
            <p style="color: var(--text-description); font-size: 14px; max-width: 520px; margin: 0 auto 28px auto; line-height: 1.6;">
              Your coordinator account (<strong>${Store.session?.user?.full_name || Store.session?.user?.name || 'Sai Ganka R'}</strong>) is currently not mapped to any Department or Section in the database.
            </p>
            <div style="display: flex; gap: 16px; justify-content: center; align-items: center;">
              <a href="#admin-setup" class="btn-premium" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; height: 40px; font-size: 12px; border-radius: 10px; padding: 0 24px;">
                ⚙️ Map Node in Admin Panel
              </a>
            </div>
          </div>
        ` : students.map((s, idx) => `
          <div class="card-ent" style="padding:32px; display:flex; flex-direction:column; gap:28px; border-radius:28px; background:rgba(255,255,255,0.01);">
            <div style="display:flex; justify-content:space-between; align-items:start;">
              <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:56px; height:56px; background:var(--brand-primary); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; color:#fff;">${s.avatar}</div>
                <div>
                  <div style="font-weight:800; color:#fff; font-size:18px; letter-spacing:-0.02em;">${s.name}</div>
                  <div style="font-size:13px; color:var(--text-muted); font-weight:600; margin-top:2px;">${s.dept} • Class of ${s.batch}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:32px; font-weight:950; color:${s.atsScore >= 80 ? 'var(--brand-secondary)' : s.atsScore >= 60 ? 'var(--brand-primary)' : '#ef4444'}; line-height:1;">${s.atsScore}</div>
                <div class="label-ent" style="font-size:10px; margin-top:4px;">ATS SCORE</div>
              </div>
            </div>

            <div style="height:8px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden;">
              <div style="width:${s.atsScore}%; height:100%; background:linear-gradient(90deg, ${s.atsScore >= 80 ? 'var(--brand-secondary)' : 'var(--brand-primary)'}, transparent);"></div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${(s.skills || []).slice(0, 4).map(skill => `<span style="font-size:11px; padding:6px 14px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:10px; color:var(--text-description); font-weight:700;">${skill}</span>`).join('')}
              ${s.skills && s.skills.length > 4 ? `<span style="font-size:11px; padding:6px 14px; color:var(--text-muted); font-weight:600;">+${s.skills.length - 4} More</span>` : ''}
            </div>

            <button class="btn-premium audit-btn" data-idx="${idx}" style="width:100%; height:48px; font-size:13px; border-radius:14px; font-weight:800; letter-spacing:0.02em;">Deep Audit Details</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  root.querySelectorAll('.audit-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-idx');
      renderAuditModal(students[idx]);
    };
  });
}

// ── (c) Skill Analysis Report ─────────────────────────────
export async function loadDeptSkills(root, Store) {
  const students = await getFilteredStudents(Store);
  
  const getStudentSkills = (s) => {
    const breakdown = s.employability_data?.score_breakdown || {};
    const seed = s.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const technical = breakdown.technical || s.empScore || Math.round(75 + (seed % 15));
    const communication = breakdown.communication || Math.round(70 + ((seed * 3) % 20));
    const problemSolving = breakdown.problemSolving || Math.round(72 + ((seed * 7) % 18));
    const domainKnowledge = breakdown.domainKnowledge || Math.round(68 + ((seed * 11) % 22));
    const collaboration = breakdown.collaboration || Math.round(78 + ((seed * 13) % 15));
    
    return {
      technical,
      communication,
      problemSolving,
      domainKnowledge,
      collaboration
    };
  };

  const averages = {
    technical: 0,
    communication: 0,
    problemSolving: 0,
    domainKnowledge: 0,
    collaboration: 0
  };

  if (students.length > 0) {
    students.forEach(s => {
      const sk = getStudentSkills(s);
      averages.technical += sk.technical;
      averages.communication += sk.communication;
      averages.problemSolving += sk.problemSolving;
      averages.domainKnowledge += sk.domainKnowledge;
      averages.collaboration += sk.collaboration;
    });
    averages.technical = Math.round(averages.technical / students.length);
    averages.communication = Math.round(averages.communication / students.length);
    averages.problemSolving = Math.round(averages.problemSolving / students.length);
    averages.domainKnowledge = Math.round(averages.domainKnowledge / students.length);
    averages.collaboration = Math.round(averages.collaboration / students.length);
  } else {
    averages.technical = 85;
    averages.communication = 78;
    averages.problemSolving = 80;
    averages.domainKnowledge = 76;
    averages.collaboration = 82;
  }

  const skillKeys = ['technical', 'communication', 'problemSolving', 'domainKnowledge', 'collaboration'];
  const skillLabels = ['Technical', 'Communication', 'Problem Solving', 'Domain Knowledge', 'Collaboration'];

  const aggregateHTML = skillLabels.map((skill, idx) => {
    const key = skillKeys[idx];
    const score = averages[key];
    return `
      <div class="card-ent" style="text-align:center; padding:40px 24px; background:rgba(255,255,255,0.015); border:1.2px solid var(--border-main); border-radius:24px; position:relative; overflow:hidden;">
        <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:radial-gradient(circle at top right, rgba(139,92,246,0.08), transparent); pointer-events:none;"></div>
        <div style="font-size:40px; font-weight:950; color:#fff; line-height:1; letter-spacing:-0.03em;">
          ${score}<span style="font-size:16px; color:var(--text-muted); font-weight:700; margin-left:2px;">/100</span>
        </div>
        <div style="font-size:12px; font-weight:900; color:var(--brand-secondary); margin-top:14px; text-transform:uppercase; letter-spacing:0.06em;">${skill}</div>
        <div style="width:60px; height:3px; background:var(--brand-primary); margin:20px auto 0; border-radius:10px; opacity:0.4;"></div>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <style>
      .student-name-hover:hover {
        color: var(--brand-primary) !important;
      }
    </style>
    <div style="padding: 24px 40px; max-width: 1680px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
      
      <!-- Premium Institutional Header -->
      <div style="margin-bottom: 40px; position: relative; padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle);">
        <h1 class="h1-ent" style="font-size:36px; letter-spacing:-0.03em;">Departmental Skill Matrix</h1>
        <p style="color:var(--text-description); font-size:16px; margin-top:6px;">Institutional skill breakdown and multi-dimensional proficiency reports.</p>
        <div style="position:absolute; bottom:-1px; left:0; width:160px; height:4px; background:linear-gradient(90deg, var(--brand-primary), transparent); border-radius:10px;"></div>
      </div>

      <!-- Enhanced Aggregate Intelligence -->
      <div style="margin-bottom: 48px;">
        <h3 class="label-ent" style="font-size:11px; margin-bottom:20px; color:var(--brand-primary); letter-spacing:0.12em;">AGGREGATE PROFICIENCY TELEMETRY</h3>
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:20px;">
          ${aggregateHTML}
        </div>
      </div>

      <!-- Precision Telemetry Table -->
      <div style="margin-top: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 class="label-ent" style="font-size:11px; color:var(--text-muted); letter-spacing:0.12em;">STUDENT-LEVEL PROFICIENCY MATRIX</h3>
          <div style="display:flex; gap:16px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-description);">
              <span style="width:10px; height:10px; border-radius:50%; background:var(--brand-primary); box-shadow:0 0 8px var(--brand-primary);"></span> High Growth
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-description);">
              <span style="width:10px; height:10px; border-radius:50%; background:var(--brand-secondary); box-shadow:0 0 8px var(--brand-secondary);"></span> Elite
            </div>
          </div>
        </div>

        <div class="card-ent" style="padding:0; overflow:hidden; border-color:var(--border-subtle); border-radius:24px;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:rgba(255,255,255,0.025); border-bottom:1px solid var(--border-main);">
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; width:300px;">Student Node</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase;">Technical Mastery</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:center;">Comm.</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:center;">Problem Solving</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:center;">Domain</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${students.length === 0 ? `
                <tr>
                  <td colspan="6" style="padding: 64px 40px; text-align: center; background: rgba(255,255,255,0.003);">
                    <div style="font-size: 48px; margin-bottom: 20px; filter: drop-shadow(0 0 12px rgba(139,92,246,0.2));">⚠️</div>
                    <h3 style="font-weight: 800; color: #fff; font-size: 18px; margin-bottom: 10px;">No Students Mapped to Your Workspace</h3>
                    <p style="color: var(--text-description); font-size: 14px; max-width: 520px; margin: 0 auto 28px auto; line-height: 1.6;">
                      Your account is currently not mapped to any Department or Section in the database.
                    </p>
                  </td>
                </tr>
              ` : students.map(s => {
                const sk = getStudentSkills(s);
                const isElite = sk.technical > 85;
                return `
                  <tr class="table-row-ent" style="border-bottom:1px solid var(--border-main); transition:all 0.2s;">
                    <td style="padding:18px 24px;">
                      <a href="#student-details?id=${s.id}" style="text-decoration:none; display:flex; align-items:center; gap:16px; color:inherit;">
                        <div style="width:36px; height:36px; background:var(--bg-elevated); border:1.2px solid var(--border-main); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:900; color:var(--brand-primary);">${s.avatar}</div>
                        <div style="font-weight:800; color:#fff; font-size:15px; letter-spacing:-0.02em; transition:color var(--t-fast);" class="student-name-hover">${s.name}</div>
                      </a>
                    </td>
                    <td style="padding:18px 24px;">
                      <div style="display:flex; align-items:center; gap:20px;">
                        <div style="flex:1; height:8px; background:rgba(255,255,255,0.04); border-radius:10px; overflow:hidden; max-width:200px;">
                          <div style="width:${sk.technical}%; height:100%; background:linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius:10px;"></div>
                        </div>
                        <span style="font-size:14px; font-weight:900; color:#fff; min-width:56px;">
                          ${sk.technical}<span style="font-size:11px; color:var(--text-muted); font-weight:700;">/100</span>
                        </span>
                      </div>
                    </td>
                    <td style="padding:18px 24px; text-align:center; font-weight:800; color:var(--text-description); font-size:14px;">
                      ${sk.communication}<span style="font-size:11px; color:var(--text-muted); font-weight:600;">/100</span>
                    </td>
                    <td style="padding:18px 24px; text-align:center; font-weight:800; color:var(--text-description); font-size:14px;">
                      ${sk.problemSolving}<span style="font-size:11px; color:var(--text-muted); font-weight:600;">/100</span>
                    </td>
                    <td style="padding:18px 24px; text-align:center; font-weight:800; color:var(--text-description); font-size:14px;">
                      ${sk.domainKnowledge}<span style="font-size:11px; color:var(--text-muted); font-weight:600;">/100</span>
                    </td>
                    <td style="padding:18px 24px; text-align:right;">
                      <span class="status-pill ${isElite ? 'status-success' : 'status-primary'}" style="font-size:12px; padding:10px 20px; border-radius:12px; font-weight:900; letter-spacing:0.05em; display:inline-block; min-width:120px; text-align:center;">
                        ${isElite ? 'ELITE' : 'HIGH GROWTH'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .table-row-ent:hover { background: rgba(255,255,255,0.015) !important; }
    </style>
  `;
}

// ── (d) New Job Applications ──────────────────────────────
export async function loadDeptNewJobs(root, Store, supabase) {
  console.log('📡 FA/Dept New Jobs: Calibrating operational views...');
  if (supabase) {
    try {
      await syncWithSupabase(supabase);
      console.log('📡 FA/Dept New Jobs: Supabase sync completed.');
    } catch (err) {
      console.warn('⚠️ FA/Dept New Jobs: Supabase sync deferred. Using local state cache.', err);
    }
  }

  const drives = Store.drives || [];
  const students = await getFilteredStudents(Store);
  const openDrives = drives.filter(d => d.status === 'Open');

  console.log(`📡 FA/Dept New Jobs: Rendering ${openDrives.length} active pipelines. Total students available: ${students.length}`);

  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
      <div style="margin-bottom: 40px;">
        <h1 class="h1-ent" style="font-size:28px;">Active Recruitment Pipelines</h1>
        <p style="color:var(--text-description); font-size:14px;">Real-time monitoring of live campus drives and student engagement telemetry.</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:32px;">
        ${openDrives.length === 0 ? `
          <div class="card-ent" style="padding:64px 32px; text-align:center; border: 1.5px dashed var(--border-main); border-radius:24px; background:rgba(255,255,255,0.005); backdrop-filter:blur(8px);">
            <div style="font-size:64px; margin-bottom:24px; filter: drop-shadow(0 0 16px rgba(139,92,246,0.15));">💼</div>
            <h3 style="font-size:20px; font-weight:800; color:#fff; margin-bottom:10px;">No Active Recruitment Pipelines</h3>
            <p style="color:var(--text-description); font-size:14px; max-width:480px; margin:0 auto; line-height:1.6;">There are no live recruitment drives broadcasted by the TPO at the moment. When a placement drive is initialized, it will instantly register here.</p>
          </div>
        ` : openDrives.map(d => {
          const driveApplicants = d.applicants || 0;
          return `
            <div class="card-ent" style="padding:32px; border-radius:24px; border:1px solid var(--border-main); background:rgba(255,255,255,0.015);">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:32px;">
                <div style="display:flex; gap:20px; align-items:center;">
                  <div style="width:64px; height:64px; font-size:40px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:16px; display:flex; align-items:center; justify-content:center; box-shadow: 0 8px 32px rgba(0,0,0,0.2);">${d.logo || '🏢'}</div>
                  <div>
                    <h3 style="font-size:20px; font-weight:800; color:#fff;">${d.company || 'Unnamed Company'} — ${d.role || 'General SDE'}</h3>
                    <div style="display:flex; flex-wrap:wrap; gap:16px; margin-top:6px;">
                      <span style="font-size:12px; color:var(--text-muted); font-weight:600; display:flex; align-items:center; gap:4px;">💰 ${d.package || 'N/A'}</span>
                      <span style="font-size:12px; color:var(--text-muted); font-weight:600; display:flex; align-items:center; gap:4px;">📅 Deadline: ${d.deadline || 'N/A'}</span>
                      <span style="font-size:12px; color:var(--brand-secondary); font-weight:800; display:flex; align-items:center; gap:4px;">📍 ${d.location || 'General'}</span>
                    </div>
                  </div>
                </div>
                <div style="text-align:right; background:rgba(139,92,246,0.03); border:1px solid rgba(139,92,246,0.1); padding:10px 20px; border-radius:14px;">
                  <div style="font-size:24px; font-weight:800; color:#fff;">${driveApplicants}</div>
                  <div class="label-ent" style="font-size:9px; color:var(--brand-primary); letter-spacing:0.05em; font-weight:800;">ACTIVE APPLICANTS</div>
                </div>
              </div>

              <div style="border-top:1px solid var(--border-main); padding-top:24px;">
                <h4 class="label-ent" style="font-size:10px; margin-bottom:16px; letter-spacing:0.08em;">OPERATIONAL APPLICANT REGISTRY</h4>
                <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
                  ${students.length === 0 ? `
                    <span style="color:var(--text-muted); font-size:12px; font-style:italic;">No students currently indexed in departmental registry.</span>
                  ` : students.slice(0, 5).map(s => `
                    <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); padding:8px 14px; border-radius:12px; display:flex; align-items:center; gap:10px; transition:all 0.2s;">
                      <div style="width:24px; height:24px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:var(--brand-primary);">${s.avatar || 'ST'}</div>
                      <div style="font-size:12px; font-weight:600; color:#fff;">${s.name || 'Student'}</div>
                      <span class="status-pill status-success" style="font-size:8px; padding:2px 6px; border-radius:6px;">Applied</span>
                    </div>
                  `).join('')}
                  ${driveApplicants > 5 ? `
                    <div style="background:rgba(139,92,246,0.05); border:1px dashed var(--brand-primary); padding:8px 14px; border-radius:12px; font-size:12px; font-weight:700; color:var(--brand-primary); cursor:pointer; transition:all 0.3s;" onmouseover="this.style.background='rgba(139,92,246,0.1)'" onmouseout="this.style.background='rgba(139,92,246,0.05)'">
                      +${driveApplicants - 5} others
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>
  `;
}

// ── (e) Previous Job Application ─────────────────────────
export async function loadDeptPrevJobs(root, Store, supabase) {
  console.log('📡 FA/Dept Previous Jobs: Calibrating analytical views...');
  if (supabase) {
    try {
      await syncWithSupabase(supabase);
    } catch (err) {
      console.warn('⚠️ FA/Dept Previous Jobs: Supabase sync deferred.', err);
    }
  }

  const drives = Store.drives || [];
  const concludedDrives = drives.filter(d => d.status !== 'Open');

  console.log(`📡 FA/Dept Previous Jobs: Rendering ${concludedDrives.length} completed cycles.`);

  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
      <div style="margin-bottom: 40px;">
        <h1 class="h1-ent" style="font-size:28px;">Placement Historical Analytics</h1>
        <p style="color:var(--text-description); font-size:14px;">Review of completed recruitment cycles and departmental outcome reports.</p>
      </div>

      ${concludedDrives.length === 0 ? `
        <div class="card-ent" style="padding:64px 32px; text-align:center; border: 1.5px dashed var(--border-main); border-radius:24px; background:rgba(255,255,255,0.005); backdrop-filter:blur(8px);">
          <div style="font-size:64px; margin-bottom:24px; filter: drop-shadow(0 0 16px rgba(139,92,246,0.15));">📊</div>
          <h3 style="font-size:20px; font-weight:800; color:#fff; margin-bottom:10px;">No Concluded Placement Cycles</h3>
          <p style="color:var(--text-description); font-size:14px; max-width:480px; margin:0 auto; line-height:1.6;">There are no completed or historical recruitment drives recorded in the data stream yet.</p>
        </div>
      ` : `
        <div class="card-ent" style="padding:0; overflow:hidden; border-radius:24px; border:1px solid var(--border-main);">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-main);">
                <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Company Node</th>
                <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Role Sector</th>
                <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Funnel Analytics</th>
                <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${concludedDrives.map(d => `
                <tr class="table-row-ent" style="border-bottom:1px solid var(--border-main); transition:all 0.2s;">
                  <td style="padding:20px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                      <div style="width:40px; height:40px; background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:24px;">${d.logo || '🏢'}</div>
                      <div style="font-weight:700; color:#fff; font-size:14px;">${d.company || 'Unnamed Company'}</div>
                    </div>
                  </td>
                  <td style="padding:20px; color:var(--text-description); font-size:13px; font-weight:600;">${d.role || 'General'}</td>
                  <td style="padding:20px;">
                    <div style="font-size:12px; color:#fff; font-weight:700;">${d.applicants || 0} Applicants</div>
                    <div style="font-size:11px; color:var(--brand-secondary); font-weight:600;">${Math.floor((d.applicants || 0) * 0.2)} Institutional Placements</div>
                  </td>
                  <td style="padding:20px;">
                    <span class="status-pill status-muted" style="font-size:10px; padding:4px 10px; border-radius:8px;">Cycle Concluded</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .table-row-ent:hover { background: rgba(255,255,255,0.015) !important; }
    </style>
  `;
}

// ── (f) Announcements ────────────────────────────────────
// ── (f) Announcements ────────────────────────────────────
export async function loadDeptAnnouncements(root, Store) {
  // Bind global retract handler
  window.handleRetractAnnouncement = (id) => {
    if (!confirm('🛡️ SYSTEM ACCESS REQUIRED:\n\nAre you sure you want to retract and delete this broadcast directive?')) return;
    Store.notifications = Store.notifications.filter(n => n.id !== id);
    saveStore();
    render();
    showToast('Broadcast directive successfully retracted.', 'success');
  };

  // Bind global broadcast submission
  window.handleCommenceBroadcast = () => {
    const titleInput = document.getElementById('composer-title');
    const descInput = document.getElementById('composer-desc');
    const severitySelect = document.getElementById('composer-severity');
    const targetSelect = document.getElementById('composer-target');
    const mediaInput = document.getElementById('composer-media');

    const title = titleInput?.value?.trim();
    const desc = descInput?.value?.trim();
    const severity = severitySelect?.value || 'General';
    const target = targetSelect?.value || 'All';
    const mediaAttached = mediaInput?.value ? mediaInput.value.split('\\').pop() : null;

    if (!title || !desc) {
      showToast('Validation Exception: Title and Message Payload are required.', 'warning');
      return;
    }

    const type = severity === 'Critical' ? 'result' : severity === 'Important' ? 'reminder' : 'drive';

    const newNotification = {
      id: 'n_' + Date.now(),
      type: type,
      title: title,
      desc: `${desc}${mediaAttached ? ` [Attachment: ${mediaAttached}]` : ''} (Target: Class of ${target})`,
      time: 'Just now',
      read: false
    };

    Store.notifications.unshift(newNotification);
    saveStore();

    // Clear composer fields
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (mediaInput) mediaInput.value = '';

    render();
    showToast('Directives broadcasted successfully to all target nodes.', 'success');
  };

  const render = () => {
    root.innerHTML = `
      <div style="padding: 24px 40px; max-width: 1680px; margin: 0 auto; display:grid; grid-template-columns: 440px 1fr; gap:64px; animation: fadeIn 0.4s ease-out;">
        
        <!-- Left Column: Command Center -->
        <div>
          <div style="margin-bottom: 48px; position: relative; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle);">
            <h1 class="h1-ent" style="font-size:36px; letter-spacing:-0.03em;">Announcements</h1>
            <p style="color:var(--text-description); font-size:16px; margin-top:8px;">Broadcast institutional directives.</p>
            <div style="position:absolute; bottom:-1px; left:0; width:120px; height:4px; background:linear-gradient(90deg, #ef4444, transparent); border-radius:10px;"></div>
          </div>

          <div class="card-ent" style="padding:40px; background:rgba(255,255,255,0.015); border-radius:28px; border:1.2px solid var(--border-main);">
            <h3 class="label-ent" style="font-size:11px; margin-bottom:32px; color:var(--brand-primary); letter-spacing:0.12em;">NEURAL BROADCAST COMPOSER</h3>
            <div style="display:flex; flex-direction:column; gap:24px;">
              <div>
                <label class="label-ent" style="font-size:10px; margin-bottom:12px; display:block;">BROADCAST TITLE</label>
                <input type="text" id="composer-title" placeholder="e.g. TCS Operational Drive Sync" class="input-ent" style="width:100%; height:52px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:0 18px; border-radius:14px; font-size:14px; font-weight:600;">
              </div>
              
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div>
                  <label class="label-ent" style="font-size:10px; margin-bottom:12px; display:block;">SEVERITY LEVEL</label>
                  <select id="composer-severity" class="input-ent" style="width:100%; height:52px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:0 12px; border-radius:14px; font-size:13px; font-weight:600; appearance:auto;">
                    <option value="General">General Signal</option>
                    <option value="Important">Important Action</option>
                    <option value="Critical">Critical / Urgent</option>
                  </select>
                </div>
                <div>
                  <label class="label-ent" style="font-size:10px; margin-bottom:12px; display:block;">DISTRIBUTION TARGET</label>
                  <select id="composer-target" class="input-ent" style="width:100%; height:52px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:0 12px; border-radius:14px; font-size:13px; font-weight:600; appearance:auto;">
                    <option value="All">All Years (Global)</option>
                    <option value="2025">Batch of 2025</option>
                    <option value="2026">Batch of 2026</option>
                    <option value="2027">Batch of 2027</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="label-ent" style="font-size:10px; margin-bottom:12px; display:block;">ATTACH DIRECTIVE MEDIA (OPTIONAL)</label>
                <input type="file" id="composer-media" class="input-ent" style="width:100%; height:52px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:12px; border-radius:14px; font-size:12px;">
              </div>

              <div>
                <label class="label-ent" style="font-size:10px; margin-bottom:12px; display:block;">MESSAGE PAYLOAD</label>
                <textarea id="composer-desc" placeholder="Specify the operational directive details..." style="width:100%; height:140px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:18px; border-radius:14px; font-size:14px; line-height:1.6; resize:none; font-weight:500;"></textarea>
              </div>
              
              <button class="btn-premium" onclick="window.handleCommenceBroadcast()" style="width:100%; height:56px; margin-top:8px; font-size:14px; font-weight:900; letter-spacing:0.02em; border-radius:16px; cursor:pointer;">Commence Broadcast</button>
            </div>
          </div>
        </div>

        <!-- Right Column: Live Broadcast Feed -->
        <div style="display:flex; flex-direction:column; gap:32px; padding-top:100px;">
          <h3 class="label-ent" style="font-size:11px; margin-bottom:8px; color:var(--text-muted); letter-spacing:0.12em;">LIVE BROADCAST FEED</h3>
          ${Store.notifications.length === 0 ? `
            <div style="padding: 60px 40px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background: rgba(255,255,255,0.01); border: 1px dashed var(--border-subtle); border-radius: 20px;">
              <div style="font-size:44px;">📢</div>
              <h3 style="font-size:18px; font-weight:800; color:#fff; margin:0;">No Broadcast Directives Active</h3>
              <p style="color:var(--text-description); font-size:13px; max-width:400px; margin:0; line-height:1.5;">
                There are currently no active placement broadcasts in your cohort feed. Create a new directive on the left to initialize the broadcast.
              </p>
            </div>
          ` : Store.notifications.map(n => `
            <div class="card-ent" style="padding:40px; border-left:6px solid ${n.type === 'result' ? '#ef4444' : n.type === 'reminder' ? '#f59e0b' : 'var(--brand-primary)'}; border-radius:24px; transition: transform 0.2s;">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:24px;">
                <h3 style="font-size:22px; font-weight:950; color:#fff; letter-spacing:-0.02em; margin:0;">${n.title}</h3>
                <span class="status-pill ${n.type === 'result' ? 'status-danger' : n.type === 'reminder' ? 'status-warning' : 'status-success'}" style="font-size:10px; padding:6px 14px; font-weight:900;">
                  ${n.type === 'result' ? 'URGENT' : n.type === 'reminder' ? 'IMPORTANT' : 'GENERAL'}
                </span>
              </div>
              <p style="color:var(--text-description); font-size:15px; line-height:1.7; font-weight:500; margin:0 0 24px 0;">${n.desc}</p>
              <div style="display:flex; justify-content:space-between; align-items:center; padding-top:24px; border-top:1px solid var(--border-subtle);">
                <div class="label-ent" style="font-size:10px; color:var(--text-muted); font-weight:700;">PUBLISHED: ${n.time}</div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-sm" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444; font-size:11px; padding:6px 14px; border-radius:8px;" onclick="window.handleRetractAnnouncement('${n.id}')">
                    Retract Broadcast
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  render();
}

// ── (g) Queries ──────────────────────────────────────────
export async function loadDeptQueries(root, Store) {
  let activeSubTab = 'open'; // open or resolved

  // Bind global resolve handler
  window.handleResolveQuery = (id) => {
    const query = Store.queries.find(q => q.id === id);
    if (!query) return;

    const responseText = document.getElementById(`resolution-input-${id}`)?.value?.trim();
    if (!responseText) {
      showToast('Validation Exception: Resolution directive text is required.', 'warning');
      return;
    }

    query.status = 'Resolved';
    query.response = responseText;
    saveStore();
    render();
    showToast('Query resolution directive submitted successfully.', 'success');
  };

  const render = () => {
    const openQueries = (Store.queries || []).filter(q => q.status !== 'Resolved');
    const resolvedQueries = (Store.queries || []).filter(q => q.status === 'Resolved');
    const currentList = activeSubTab === 'open' ? openQueries : resolvedQueries;

    root.innerHTML = `
      <style>
        .query-tab {
          padding: 10px 20px; font-size: 13px; font-weight: 700; color: var(--text-muted);
          cursor: pointer; border-radius: 8px; transition: all 0.2s; border: 1px solid transparent;
        }
        .query-tab.active {
          background: rgba(124, 58, 237, 0.1); color: var(--brand-secondary); border: 1px solid rgba(124, 58, 237, 0.2);
        }
        .query-card {
          background: rgba(255,255,255,0.015); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 32px; transition: all 0.2s;
        }
        .query-card:hover {
          border-color: var(--border-medium);
          background: rgba(255,255,255,0.025);
        }
      </style>
      
      <div style="padding: 40px; max-width: 1560px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
        <div style="margin-bottom: 40px; display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:20px;">
          <div>
            <h1 class="h1-ent" style="font-size:28px;">Institutional Help Desk</h1>
            <p style="color:var(--text-description); font-size:14px; margin-top:6px;">Student support resolution node and communication hub.</p>
          </div>
          <div style="display:flex; gap:12px; background:rgba(0,0,0,0.2); padding:6px; border-radius:12px; width:fit-content;">
            <div class="query-tab ${activeSubTab === 'open' ? 'active' : ''}" id="tab-queries-open">Open Queries (${openQueries.length})</div>
            <div class="query-tab ${activeSubTab === 'resolved' ? 'active' : ''}" id="tab-queries-resolved">Resolved (${resolvedQueries.length})</div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:24px;">
          ${currentList.length === 0 ? `
            <div style="padding: 64px 32px; text-align:center; border: 1.5px dashed var(--border-main); border-radius:24px; background:rgba(255,255,255,0.005); backdrop-filter:blur(8px);">
              <div style="font-size:48px; margin-bottom:16px;">✉️</div>
              <h3 style="font-size:18px; font-weight:800; color:#fff; margin-bottom:8px;">No Queries Found</h3>
              <p style="color:var(--text-description); font-size:13px; max-width:400px; margin:0 auto; line-height:1.5;">There are no help desk tickets in this workspace category.</p>
            </div>
          ` : currentList.map(q => `
            <div class="query-card">
              <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:20px; flex-wrap:wrap; gap:16px;">
                <div style="display:flex; gap:16px; align-items:center;">
                  <div style="width:44px; height:44px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:900; color:var(--brand-primary);">
                    ${(q.studentName || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 style="font-size:17px; font-weight:800; color:#fff; margin:0;">${q.title}</h4>
                    <div style="display:flex; gap:12px; margin-top:6px; font-size:12px; color:var(--text-muted); font-weight:600;">
                      <span>Student: <strong>${q.studentName}</strong> (Roll: ${q.rollNo})</span>
                      <span>•</span>
                      <span>Submitted: ${q.date}</span>
                    </div>
                  </div>
                </div>
                <span class="status-pill ${q.status === 'Resolved' ? 'status-success' : 'status-warning'}" style="font-size:10px; padding:6px 14px; font-weight:900;">
                  ${q.status === 'Resolved' ? 'RESOLVED' : 'AWAITING ACTION'}
                </span>
              </div>
              
              <div style="background:rgba(0,0,0,0.15); border:1px solid var(--border-subtle); padding:20px; border-radius:12px; font-size:14px; color:var(--text-description); line-height:1.6; margin-bottom:24px; font-style:italic;">
                "${q.body}"
              </div>

              ${q.status === 'Resolved' ? `
                <div style="background:rgba(16,185,129,0.03); border:1px solid rgba(16,185,129,0.1); padding:20px; border-radius:12px; font-size:14px; color:#10B981; line-height:1.6;">
                  <strong style="display:block; font-size:11px; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em; color:rgba(16,185,129,0.8);">Resolution Directive:</strong>
                  "${q.response}"
                </div>
              ` : `
                <div style="display:flex; flex-direction:column; gap:12px;">
                  <label class="label-ent" style="font-size:9.5px; font-weight:800; color:var(--brand-primary); letter-spacing:0.05em;">DRAFT RESOLUTION DIRECTIVE</label>
                  <div style="display:flex; gap:16px; flex-wrap:wrap;">
                    <input type="text" id="resolution-input-${q.id}" placeholder="Specify support details or action directives..." class="input-ent" style="flex:1; min-width:280px; height:48px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:0 16px; border-radius:10px; font-size:13.5px;">
                    <button class="btn-premium" onclick="window.handleResolveQuery('${q.id}')" style="height:48px; padding:0 24px; font-size:13px; font-weight:900; border-radius:10px; cursor:pointer;">
                      Resolve Ticket
                    </button>
                  </div>
                </div>
              `}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Bind tab clicks
    document.getElementById('tab-queries-open').onclick = () => {
      activeSubTab = 'open';
      render();
    };
    document.getElementById('tab-queries-resolved').onclick = () => {
      activeSubTab = 'resolved';
      render();
    };
  };

  render();
}

// ── Filtered Students Helper Engine for Advisor/Coordinator Mappings ──────────────────
async function getFilteredStudents(Store) {
  try {
    let mapping = 'None';
    let role = Store.session?.role || 'guest';
    const userEmail = Store.session?.user?.email;
    
    if (userEmail && ['faculty', 'coordinator', 'department'].includes(role)) {
      const { data: staffData } = await supabase
        .from('staff_profiles')
        .select('mapping')
        .eq('email', userEmail)
        .maybeSingle();
      if (staffData && staffData.mapping) {
        mapping = staffData.mapping;
      }
    } else {
      return Store.students || [];
    }

    console.log(`🛡️ [Dept Dashboard Sync] Filtering students for role ${role} with mapping ${mapping}`);

    if (mapping === 'Global') {
      return Store.students || [];
    }

    if (!mapping || mapping === 'None') {
      return (Store.students || []).map(s => {
        const valState = getValidationStatus(s.id, null);
        return {
          ...s,
          rollNo: s.rollNo || s.regNo || 'N/A',
          batch: s.batch || '2025',
          status: valState.status,
          placed: valState.status === 'Approved'
        };
      });
    }

    let query = supabase.from('profiles').select('*').eq('role', 'student');
    
    if (mapping.includes(' - Section ')) {
      const parts = mapping.split(' - Section ');
      const deptPart = parts[0].trim();
      const secPart = parts[1].trim();
      query = query.eq('department', deptPart).eq('section_name', secPart);
    } else {
      query = query.eq('department', mapping.trim());
    }

    const { data: profiles, error } = await query.order('full_name');
    if (error || !profiles) {
      console.warn('⚠️ getFilteredStudents query failed, falling back to basic mapping filter on Store.');
      const deptCode = mapping.split(' - ')[0].trim();
      return (Store.students || []).filter(s => s.dept === deptCode).map(s => {
        const valState = getValidationStatus(s.id, null);
        return {
          ...s,
          rollNo: s.rollNo || s.regNo || 'N/A',
          batch: s.batch || '2025',
          status: valState.status,
          placed: valState.status === 'Approved'
        };
      });
    }

    const { data: dbDepts } = await supabase.from('departments').select('*');
    const depts = dbDepts || [];

    return profiles.map(p => {
      const nameVal = p.full_name || 'Unnamed Student';
      const initials = nameVal.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const valState = getValidationStatus(p.id, p.rejection_comments);
      return {
        id: p.id,
        avatar: p.avatar_url || initials || 'ST',
        name: nameVal,
        rollNo: p.register_number || p.roll_number || 'N/A',
        dept: depts.find(d => d.id === p.department)?.name || p.department || 'CSE',
        batch: p.batch_year || '2025',
        cgpa: parseFloat(p.cgpa) || 8.0,
        atsScore: p.resume_analysis?.ats_score || p.resume_score || 75,
        empScore: p.employability_data?.overall_score || p.employability_score || 70,
        status: valState.status,
        placed: valState.status === 'Approved',
        skills: p.skills || (p.technical_skills ? p.technical_skills.split(',').map(s => s.trim()) : []),
        employability_data: p.employability_data || null,
        resume_analysis: p.resume_analysis || null
      };
    });

  } catch (err) {
    console.error('Failed to get filtered students:', err);
    return Store.students || [];
  }
}
