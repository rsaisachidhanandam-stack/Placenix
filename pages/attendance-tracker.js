// ============================================================
// PLACENIX — DRIVE ATTENDANCE TRACKER WORKSPACE (v2.4)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

export async function loadAttendanceTrackerPage(root, Store) {
  const drives = Store.drives || [];
  let selectedDriveId = localStorage.getItem('placenix_selected_attendance_drive') || (drives[0]?.id || '');
  let selectedDrive = drives.find(d => String(d.id) === String(selectedDriveId)) || drives[0];
  if (selectedDrive) {
    selectedDriveId = selectedDrive.id;
  }

  const role = Store.session?.role || 'guest';
  // Check if role is Department Coordinator
  const isCoordinator = (role === 'department' || role === 'coordinator');

  // Dynamically query all stages (columns) from Kanban to support custom round IDs
  const stages = Object.keys(Store.kanban || {});

  function getCardsForSelectedDrive() {
    if (!selectedDrive) return [];
    
    const allCandidates = [];
    stages.forEach(stg => {
      const list = Store.kanban?.[stg] || [];
      list.forEach(c => {
        if (String(c.driveId) === String(selectedDriveId) || (c.drive && c.drive.toLowerCase().includes(selectedDrive.company.toLowerCase()))) {
          const colName = stg.charAt(0).toUpperCase() + stg.slice(1);
          allCandidates.push({ ...c, currentStage: colName, rawStage: stg });
        }
      });
    });

    // Deduplicate candidates by id
    const uniqueCandidates = [];
    const seenIds = new Set();
    for (const c of allCandidates) {
      if (!seenIds.has(c.id)) {
        seenIds.add(c.id);
        
        // Initialize attendanceDraft if undefined
        if (c.attendanceDraft === undefined) {
          c.attendanceDraft = c.attendance || 'pending';
        }
        
        uniqueCandidates.push(c);
      }
    }
    return uniqueCandidates;
  }

  function toggleAttendance(studentId, status) {
    let changed = false;
    stages.forEach(stg => {
      if (Store.kanban && Array.isArray(Store.kanban[stg])) {
        Store.kanban[stg].forEach(card => {
          if (String(card.id) === String(studentId)) {
            card.attendanceDraft = status;
            changed = true;
          }
        });
      }
    });

    if (changed) {
      saveStore();
      showToast(`Updated attendance status successfully.`, "success");
      render();
    }
  }

  function processUploadedAttendance(csvContent) {
    if (!selectedDrive) return;
    const uniqueCandidates = getCardsForSelectedDrive();

    if (uniqueCandidates.length === 0) {
      showToast("No active candidate pipeline registered for this drive.", "warning");
      return;
    }

    const lines = csvContent.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      showToast("Uploaded file is empty.", "warning");
      return;
    }

    let presentCount = 0;
    let absentCount = 0;
    let ignoredCount = 0;

    let isFirstLine = true;
    lines.forEach(line => {
      const parts = line.split(/[,\t;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length === 0) return;

      if (isFirstLine && (parts[0].toLowerCase().includes('candidate id') || parts[0].toLowerCase().includes('name') || parts[0].toLowerCase().includes('candidate'))) {
        isFirstLine = false;
        return; // Skip header
      }
      isFirstLine = false;

      const nameOrId = parts[0].toLowerCase();
      if (!nameOrId) return;

      let status = 'present'; // Default to present
      // Look for status in any column, starting from the end
      for (let j = parts.length - 1; j >= 1; j--) {
        const rawStatus = parts[j].toLowerCase();
        if (rawStatus === 'a' || rawStatus.includes('absent') || rawStatus === 'abs' || rawStatus === 'no' || rawStatus === '0' || rawStatus === 'did not attend' || rawStatus === 'not attended') {
          status = 'absent';
          break;
        } else if (rawStatus === 'p' || rawStatus.includes('present') || rawStatus === 'pres' || rawStatus === 'yes' || rawStatus === '1' || rawStatus === 'attended') {
          status = 'present';
          break;
        }
      }

      // Fuzzy matching: try exact ID match first, then name from the first or second column
      const matchedCand = uniqueCandidates.find(c => 
        String(c.id).toLowerCase() === nameOrId ||
        c.name.toLowerCase().includes(nameOrId) || 
        nameOrId.includes(c.name.toLowerCase()) ||
        (parts[1] && (c.name.toLowerCase().includes(parts[1].toLowerCase()) || parts[1].toLowerCase().includes(c.name.toLowerCase())))
      );

      if (matchedCand) {
        stages.forEach(stg => {
          if (Store.kanban && Array.isArray(Store.kanban[stg])) {
            Store.kanban[stg].forEach(card => {
              if (String(card.id) === String(matchedCand.id)) {
                card.attendanceDraft = status;
              }
            });
          }
        });

        if (status === 'present') presentCount++;
        else absentCount++;
      } else {
        ignoredCount++;
      }
    });

    // Automatically synchronize/push parsed spreadsheet metrics to TPO immediately!
    stages.forEach(stg => {
      if (Store.kanban && Array.isArray(Store.kanban[stg])) {
        Store.kanban[stg].forEach(card => {
          if (String(card.driveId) === String(selectedDriveId) || (card.drive && card.drive.toLowerCase().includes(selectedDrive.company.toLowerCase()))) {
            card.attendance = card.attendanceDraft || 'pending';
          }
        });
      }
    });

    if (!Store.attendancePushTimes) {
      Store.attendancePushTimes = {};
    }
    Store.attendancePushTimes[selectedDriveId] = new Date().toISOString();

    saveStore();
    showToast(`Analyzed Report: Automatically pushed ${presentCount} present and ${absentCount} absent records to TPO!`, "success", 7000);
    render();
  }

  function pushAttendanceToTPO() {
    if (!selectedDrive) return;
    const uniqueCandidates = getCardsForSelectedDrive();

    if (uniqueCandidates.length === 0) {
      showToast("No candidates registered in this drive's pipeline to sync.", "warning");
      return;
    }

    stages.forEach(stg => {
      if (Store.kanban && Array.isArray(Store.kanban[stg])) {
        Store.kanban[stg].forEach(card => {
          if (String(card.driveId) === String(selectedDriveId) || (card.drive && card.drive.toLowerCase().includes(selectedDrive.company.toLowerCase()))) {
            card.attendance = card.attendanceDraft || 'pending';
          }
        });
      }
    });

    if (!Store.attendancePushTimes) {
      Store.attendancePushTimes = {};
    }
    Store.attendancePushTimes[selectedDriveId] = new Date().toISOString();
    
    saveStore();
    showToast(`Successfully pushed attendance records for ${selectedDrive.company} to TPO!`, "success", 5000);
    render();
  }

  function downloadExcelReport() {
    if (!selectedDrive) return;
    const candidates = getCardsForSelectedDrive();
    
    if (candidates.length === 0) {
      showToast("No candidates found to export.", "warning");
      return;
    }

    const headers = ['Candidate ID', 'Name', 'Department', 'Current Round', 'Attendance Status'];
    const rows = candidates.map(c => {
      const status = isCoordinator ? (c.attendanceDraft || 'pending') : (c.attendance || 'pending');
      return [
        c.id,
        `"${c.name}"`,
        `"${c.dept || ''}"`,
        `"${c.currentStage || ''}"`,
        status
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedDrive.company.replace(/\s+/g, '_')}_Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Report downloaded successfully.", "success");
  }

  function render() {
    const candidates = getCardsForSelectedDrive();

    // Calculate metrics depending on the role
    const totalScheduled = candidates.length;
    const attended = candidates.filter(c => {
      const val = isCoordinator ? c.attendanceDraft : c.attendance;
      return val === 'present';
    }).length;
    const absent = candidates.filter(c => {
      const val = isCoordinator ? c.attendanceDraft : c.attendance;
      return val === 'absent';
    }).length;
    const pending = totalScheduled - attended - absent;

    let syncStatusHtml = '';
    const lastPush = Store.attendancePushTimes?.[selectedDriveId];
    if (lastPush) {
      const pushDate = new Date(lastPush);
      const timeStr = pushDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = pushDate.toLocaleDateString();
      syncStatusHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.2); border-radius:30px; padding:6px 16px; font-size:12px; color:#10b981; font-weight:600;">
          <span class="pulse-dot" style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block;"></span>
          ✓ Attendance Pushed by Dept Coordinator (${dateStr} @ ${timeStr})
        </div>`;
    } else {
      syncStatusHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.2); border-radius:30px; padding:6px 16px; font-size:12px; color:#f59e0b; font-weight:600;">
          <span style="width:8px; height:8px; border-radius:50%; background:#f59e0b; display:inline-block;"></span>
          Awaiting Dept Coordinator Attendance Sync
        </div>`;
    }

    let candidatesListHtml = '';
    if (candidates.length === 0) {
      candidatesListHtml = `
        <tr>
          <td colspan="${isCoordinator ? 4 : 3}" style="text-align:center; padding:48px 0; color:var(--text-description); font-size:13.5px; font-style:italic;">
            No candidates registered or applied in this drive's recruitment pipeline.
          </td>
        </tr>`;
    } else {
      candidatesListHtml = candidates.map(c => {
        const currentVal = isCoordinator ? (c.attendanceDraft || 'pending') : (c.attendance || 'pending');
        
        let statusBadge = '';
        if (currentVal === 'present') {
          statusBadge = `<span class="badge badge-success badge-dot" title="Present">P</span>`;
        } else if (currentVal === 'absent') {
          statusBadge = `<span class="badge badge-danger badge-dot" title="Absent">A</span>`;
        } else {
          statusBadge = `<span class="badge badge-warning badge-dot">Pending</span>`;
        }

        let actionsHtml = '';
        if (isCoordinator) {
          if (currentVal === 'present') {
            actionsHtml = `
              <td style="padding:14px 16px; text-align:right; vertical-align:middle;">
                <div style="display:inline-flex; gap:12px; align-items:center; justify-content:flex-end; box-sizing:border-box;">
                  <span title="Present" style="padding:0 12px; font-size:11.5px; height:28px; border-radius:6px; font-weight:800; background:#10b981; color:#fff; display:inline-flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 2px 6px rgba(16,185,129,0.3); border: 1px solid #10b981; box-sizing:border-box;">✓ P</span>
                  <button class="btn checkin-btn" data-id="${c.id}" data-status="pending" style="padding:0 12px; font-size:11.5px; height:28px; border-radius:6px; cursor:pointer; font-weight:700; border:1px solid rgba(239,68,68,0.25); background:rgba(239,68,68,0.04); color:#ef4444; transition:all 0.2s; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(239,68,68,0.1)'; this.style.borderColor='#ef4444';" onmouseout="this.style.background='rgba(239,68,68,0.04)'; this.style.borderColor='rgba(239,68,68,0.25)';">Remove Attendance</button>
                </div>
              </td>`;
          } else if (currentVal === 'absent') {
            actionsHtml = `
              <td style="padding:14px 16px; text-align:right; vertical-align:middle;">
                <div style="display:inline-flex; gap:12px; align-items:center; justify-content:flex-end; box-sizing:border-box;">
                  <span title="Absent" style="padding:0 12px; font-size:11.5px; height:28px; border-radius:6px; font-weight:800; background:#ef4444; color:#fff; display:inline-flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 2px 6px rgba(239,68,68,0.3); border: 1px solid #ef4444; box-sizing:border-box;">✕ A</span>
                  <button class="btn checkin-btn" data-id="${c.id}" data-status="pending" style="padding:0 12px; font-size:11.5px; height:28px; border-radius:6px; cursor:pointer; font-weight:700; border:1px solid rgba(239,68,68,0.25); background:rgba(239,68,68,0.04); color:#ef4444; transition:all 0.2s; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(239,68,68,0.1)'; this.style.borderColor='#ef4444';" onmouseout="this.style.background='rgba(239,68,68,0.04)'; this.style.borderColor='rgba(239,68,68,0.25)';">Remove Attendance</button>
                </div>
              </td>`;
          } else {
            // Pending state
            actionsHtml = `
              <td style="padding:14px 16px; text-align:right; vertical-align:middle;">
                <div style="display:inline-flex; gap:8px; justify-content:flex-end; box-sizing:border-box;">
                  <button class="btn checkin-btn" data-id="${c.id}" data-status="present" title="Mark Present" style="padding:0 12px; font-size:11.5px; height:28px; border-radius:6px; cursor:pointer; font-weight:700; border:1px solid rgba(16,185,129,0.25); background:rgba(16,185,129,0.03); color:#10b981; transition:all 0.2s; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(16,185,129,0.1)'; this.style.borderColor='#10b981';" onmouseout="this.style.background='rgba(16,185,129,0.03)'; this.style.borderColor='rgba(16,185,129,0.25)';">✓ P</button>
                  <button class="btn checkin-btn" data-id="${c.id}" data-status="absent" title="Mark Absent" style="padding:0 12px; font-size:11.5px; height:28px; border-radius:6px; cursor:pointer; font-weight:700; border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.02); color:#ef4444; transition:all 0.2s; box-sizing:border-box; display:inline-flex; align-items:center; justify-content:center;" onmouseover="this.style.background='rgba(239,68,68,0.08)'; this.style.borderColor='#ef4444';" onmouseout="this.style.background='rgba(239,68,68,0.02)'; this.style.borderColor='rgba(239,68,68,0.2)';">✕ A</button>
                </div>
              </td>`;
          }
        }

        return `
          <tr style="border-bottom:1px solid var(--border-subtle); transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.01)'" onmouseout="this.style.background='transparent'">
            <td style="padding:14px 16px; vertical-align:middle;">
              <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:30px; height:30px; border-radius:50%; background:var(--gradient-brand, linear-gradient(135deg, #7c3aed, #22d3ee)); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; border: 1px solid rgba(255, 255, 255, 0.1);">
                  ${c.avatar || c.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style="font-weight:700; color:#fff; font-size:13.5px;">${c.name}</div>
                  <div style="font-size:10px; color:var(--text-description);">${c.dept}</div>
                </div>
              </div>
            </td>
            <td style="padding:14px 16px; font-size:13px; color:#fff; font-weight:600; vertical-align:middle;">
              ${c.currentStage}
            </td>
            <td style="padding:14px 16px; vertical-align:middle;">
              ${statusBadge}
            </td>
            ${actionsHtml}
          </tr>`;
      }).join('');
    }

    // Top action controls based on role
    const actionsAreaHtml = isCoordinator ? `
      <select id="attendance-drive-select" class="input" style="width:280px; height:44px; font-size:13px; background-color:var(--bg-card); color:var(--text-main); border:1px solid var(--border-main); border-radius:8px;">
        ${drives.map(d => `<option value="${d.id}" ${String(d.id) === String(selectedDriveId) ? 'selected' : ''}>${d.company} — ${d.role}</option>`).join('')}
      </select>
      <input type="file" id="attendance-upload-input" accept=".csv,.txt" style="display:none;" />
      <button id="upload-attendance-btn" class="btn btn-secondary" style="height:44px; display:inline-flex; align-items:center; gap:6px; font-weight:700; border-color:var(--border-subtle); background:rgba(255,255,255,0.01);">
        📤 Upload Report
      </button>
      <button id="export-attendance-btn" class="btn btn-secondary" style="height:44px; display:inline-flex; align-items:center; gap:6px; font-weight:700; border-color:var(--border-subtle); background:rgba(255,255,255,0.01);">
        📥 Export Report
      </button>
      <button id="push-tpo-btn" class="btn btn-primary" style="height:44px; display:inline-flex; align-items:center; gap:6px; font-weight:700;">
        🚀 Push Attendance to TPO
      </button>` : `
      <select id="attendance-drive-select" class="input" style="width:280px; height:44px; font-size:13px; background-color:var(--bg-card); color:var(--text-main); border:1px solid var(--border-main); border-radius:8px;">
        ${drives.map(d => `<option value="${d.id}" ${String(d.id) === String(selectedDriveId) ? 'selected' : ''}>${d.company} — ${d.role}</option>`).join('')}
      </select>`;

    root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Page Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary); font-weight: 700; display:flex; align-items:center; gap:12px;">
            <span>${role.toUpperCase()} Workspace</span>
            ${!isCoordinator ? syncStatusHtml : `<span style="background:rgba(124,58,237,0.1); border:1px solid rgba(124,58,237,0.2); border-radius:20px; padding:3px 10px; font-size:11px; color:var(--brand-primary); font-weight:700;">Draft Mode</span>`}
          </div>
          <h1 class="h1-ent" style="font-size:32px;">Drive Attendance Tracker</h1>
          <p style="color:var(--text-description); font-size:15px; margin-top:4px;">
            ${isCoordinator ? 'Mark present/absent candidates, upload coordinator reports, and push records to TPO.' : 'Monitor live check-in telemetry and track student attendance records pushed by department coordinators.'}
          </p>
        </div>
        <div style="display:flex; gap:16px; align-items:center;">
          ${actionsAreaHtml}
        </div>
      </div>

      <!-- Telemetry row -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px; margin-bottom:12px;">
        <div class="attendance-stat-card" style="background:rgba(255,255,255,0.015); border:1px solid var(--border-subtle); border-left: 4px solid #7c3aed; border-radius:12px; padding:20px 24px; display:flex; flex-direction:column; gap:8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.025)'" onmouseout="this.style.background='rgba(255,255,255,0.015)'">
          <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Have to Attend</div>
          <div style="font-size:32px; font-weight:800; color:#fff; font-family:'Space Grotesk', sans-serif;">${totalScheduled}</div>
        </div>
        
        <div class="attendance-stat-card" style="background:rgba(16,185,129,0.02); border:1px solid rgba(16,185,129,0.1); border-left: 4px solid #10b981; border-radius:12px; padding:20px 24px; display:flex; flex-direction:column; gap:8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(16,185,129,0.04)'" onmouseout="this.style.background='rgba(16,185,129,0.02)'">
          <div style="font-size:10px; color:#10b981; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Attended (Present)</div>
          <div style="font-size:32px; font-weight:800; color:#10b981; font-family:'Space Grotesk', sans-serif;">${attended}</div>
        </div>
        
        <div class="attendance-stat-card" style="background:rgba(239,68,68,0.02); border:1px solid rgba(239,68,68,0.1); border-left: 4px solid #ef4444; border-radius:12px; padding:20px 24px; display:flex; flex-direction:column; gap:8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(239,68,68,0.04)'" onmouseout="this.style.background='rgba(239,68,68,0.02)'">
          <div style="font-size:10px; color:#ef4444; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Did Not Attend</div>
          <div style="font-size:32px; font-weight:800; color:#ef4444; font-family:'Space Grotesk', sans-serif;">${absent}</div>
        </div>
        
        <div class="attendance-stat-card" style="background:rgba(245,158,11,0.02); border:1px solid rgba(245,158,11,0.1); border-left: 4px solid #f59e0b; border-radius:12px; padding:20px 24px; display:flex; flex-direction:column; gap:8px; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(245,158,11,0.04)'" onmouseout="this.style.background='rgba(245,158,11,0.02)'">
          <div style="font-size:10px; color:#f59e0b; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Pending Status</div>
          <div style="font-size:32px; font-weight:800; color:#f59e0b; font-family:'Space Grotesk', sans-serif;">${pending}</div>
        </div>
      </div>

      <!-- Attendance Table card -->
      <div class="card-ent" style="padding: 32px; border: 1px solid var(--border-subtle); background: var(--bg-secondary);">
        <div style="background:rgba(0,0,0,0.15); border:1px solid var(--border-main); border-radius:12px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-main);">
                <th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-description); text-transform:uppercase; width:40%; vertical-align:middle;">Candidate Details</th>
                <th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-description); text-transform:uppercase; width:20%; vertical-align:middle;">Current Round</th>
                <th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-description); text-transform:uppercase; width:20%; vertical-align:middle;">Attendance Status</th>
                ${isCoordinator ? `<th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-description); text-transform:uppercase; width:20%; text-align:right; vertical-align:middle;">Actions</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${candidatesListHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <style>
      .pulse-dot {
        animation: pulse-green 2s infinite;
      }
      @keyframes pulse-green {
        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
      }
    </style>
    `;

    attachListeners();
  }

  function attachListeners() {
    // Dropdown selection
    const driveSelect = root.querySelector('#attendance-drive-select');
    if (driveSelect) {
      driveSelect.onchange = (e) => {
        selectedDriveId = e.target.value;
        localStorage.setItem('placenix_selected_attendance_drive', selectedDriveId);
        selectedDrive = drives.find(d => String(d.id) === String(selectedDriveId));
        render();
      };
    }

    if (isCoordinator) {
      // CSV upload triggers
      const fileInput = root.querySelector('#attendance-upload-input');
      const uploadBtn = root.querySelector('#upload-attendance-btn');
      if (fileInput && uploadBtn) {
        uploadBtn.onclick = () => {
          fileInput.value = '';
          fileInput.click();
        };

        fileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (evt) => {
            processUploadedAttendance(evt.target.result);
          };
          reader.readAsText(file);
        };
      }

      // Manual check-in actions
      root.querySelectorAll('.checkin-btn').forEach(btn => {
        btn.onclick = (e) => {
          const studId = e.currentTarget.dataset.id;
          const status = e.currentTarget.dataset.status;
          toggleAttendance(studId, status);
        };
      });

      // Push to TPO trigger
      const pushBtn = root.querySelector('#push-tpo-btn');
      if (pushBtn) {
        pushBtn.onclick = () => {
          pushAttendanceToTPO();
        };
      }

      // Export report trigger
      const exportBtn = root.querySelector('#export-attendance-btn');
      if (exportBtn) {
        exportBtn.onclick = () => {
          downloadExcelReport();
        };
      }
    }
  }

  render();
}
