// ============================================================
// PLACENIX — SLOT ALLOCATION & SCHEDULING WORKSPACE (v1.0)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

export async function loadSlotAllocationPage(root, Store, supabase) {
  const fallbackDrives = [
    { id: 'drv_tcs_01', company: 'TCS', role: 'Developer', rounds: ['Aptitude', 'Technical', 'HR'], min_cgpa: 7.0, deadline: '2026-07-09' },
    { id: 'drv_inf_02', company: 'Infosys', role: 'System Engineer', rounds: ['Aptitude', 'Technical', 'HR'], min_cgpa: 6.5, deadline: '2026-07-15' }
  ];
  const drives = (Store.drives && Store.drives.length > 0) ? Store.drives : fallbackDrives;
  let selectedDriveId = localStorage.getItem('placenix_selected_slot_drive') || drives[0]?.id || '';
  let selectedDrive = drives.find(d => String(d.id || d.company) === String(selectedDriveId)) || drives[0];

  // Load state from local storage or defaults
  let selectedRoundIdx = 0;
  let noOfVenues = 2;
  let noOfSlots = 3;
  let duration = 60;
  let startTime = '09:00';
  let allocationDate = new Date().toISOString().split('T')[0];

  // Default venue configurations
  let venues = [
    { name: 'Seminar Hall A', capacity: 20 },
    { name: 'Computer Lab 3', capacity: 15 }
  ];

  let activeAllocation = null;

  let modifyVenuesState = [];

  function renderModifyVenueInputs() {
    const container = root.querySelector('#modify-venues-inputs-container');
    if (!container) return;

    container.innerHTML = modifyVenuesState.map((v, idx) => `
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:16px; align-items:center;">
        <input class="input modify-venue-name-input" data-index="${idx}" type="text" placeholder="e.g. Server Room A" value="${v.name}" style="height:36px; font-size:12.5px;">
        <input class="input modify-venue-capacity-input" data-index="${idx}" type="number" min="1" max="1000" placeholder="Cap" value="${v.capacity}" style="height:36px; font-size:12.5px; text-align:center;">
      </div>
    `).join('');

    // Attach local input listeners
    container.querySelectorAll('.modify-venue-name-input').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(e.target.dataset.index);
        modifyVenuesState[idx].name = e.target.value;
      };
    });

    container.querySelectorAll('.modify-venue-capacity-input').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(e.target.dataset.index);
        modifyVenuesState[idx].capacity = parseInt(e.target.value) || 0;
      };
    });
  }

  // Find previously saved allocation for this drive & round
  function loadSavedAllocation() {
    if (!selectedDrive) return;
    const roundName = getSelectedRoundName();
    const targetKey = String(selectedDrive.id || selectedDrive.company || '').toLowerCase().trim();
    const saved = (Store.slotAllocations || []).find(a => {
      if (!a) return false;
      const allocKey = String(a.driveId || a.company || '').toLowerCase().trim();
      return allocKey === targetKey && a.roundName === roundName;
    });
    if (saved) {
      activeAllocation = saved;
    } else {
      activeAllocation = null;
    }
  }

  function getSelectedRoundName() {
    if (!selectedDrive) return '';
    const rounds = selectedDrive.rounds || ['Aptitude', 'Technical', 'HR'];
    return rounds[selectedRoundIdx] || rounds[0] || 'Aptitude';
  }

  function getSelectedRoundStageId() {
    // Map round index to kanban stage ids (applied, shortlisted, aptitude, technical, hr, selected)
    const stageIds = ['aptitude', 'technical', 'hr'];
    if (selectedRoundIdx < stageIds.length) {
      return stageIds[selectedRoundIdx];
    }
    return `round_${selectedRoundIdx}`;
  }

  function getCandidatesForRound() {
    if (!selectedDrive) return [];
    const stageId = getSelectedRoundStageId();
    const driveCompanyLower = (selectedDrive.company || '').toLowerCase();

    const cardBelongsToDrive = (c) => {
      const matchId = String(c.driveId) === String(selectedDrive.id);
      const cardDriveLower = (c.drive || '').toLowerCase();
      const matchName = cardDriveLower.includes(driveCompanyLower) || driveCompanyLower.includes(cardDriveLower);
      return matchId || matchName;
    };

    // Gather cards in this kanban column that belong to this drive
    let candidates = (Store.kanban?.[stageId] || []).filter(cardBelongsToDrive);

    // If target stage is empty (common in first boot or before manual drag), pull from preceding stages
    if (candidates.length === 0) {
      if (selectedRoundIdx === 0) {
        // Round 0 (Aptitude): pull from shortlisted and applied stages
        const shortlisted = (Store.kanban?.['shortlisted'] || []).filter(cardBelongsToDrive);
        const applied = (Store.kanban?.['applied'] || []).filter(cardBelongsToDrive);
        const seenIds = new Set();
        
        shortlisted.forEach(c => {
          if (!seenIds.has(String(c.id))) {
            candidates.push(c);
            seenIds.add(String(c.id));
          }
        });
        
        applied.forEach(c => {
          if (!seenIds.has(String(c.id))) {
            candidates.push(c);
            seenIds.add(String(c.id));
          }
        });
      } else if (selectedRoundIdx === 1) {
        // Round 1 (Technical): pull from previous stage (aptitude)
        candidates = (Store.kanban?.['aptitude'] || []).filter(cardBelongsToDrive);
      } else if (selectedRoundIdx === 2) {
        // Round 2 (HR): pull from previous stage (technical)
        candidates = (Store.kanban?.['technical'] || []).filter(cardBelongsToDrive);
      }
    }

    return candidates;
  }

  // Time addition utility
  function addMinutesToTime(timeStr, mins) {
    let [hours, minutes] = timeStr.split(':').map(Number);
    const totalMins = hours * 60 + minutes + mins;
    let newHours = Math.floor(totalMins / 60) % 24;
    let newMins = totalMins % 60;
    
    const displayHours = String(newHours).padStart(2, '0');
    const displayMins = String(newMins).padStart(2, '0');
    
    return `${displayHours}:${displayMins}`;
  }

  function formatTimeAmPm(timeStr) {
    let [hours, minutes] = timeStr.split(':').map(Number);
    const modifier = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMins = String(minutes).padStart(2, '0');
    return `${displayHours}:${displayMins} ${modifier}`;
  }

  function render() {
    loadSavedAllocation();
    const rounds = selectedDrive?.rounds || ['Aptitude', 'Technical', 'HR'];
    const candidates = getCandidatesForRound();
    const totalCapacity = venues.reduce((acc, v) => acc + (parseInt(v.capacity) || 0), 0) * noOfSlots;

    root.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 32px;">
      
      <!-- Operational Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">TPO Logistics Hub</div>
          <h1 class="h1-ent" style="font-size:32px;">Seat & Slot Allocation</h1>
          <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Deploy candidates into structured venue streams and slot intervals.</p>
        </div>
        <div style="display:flex; gap:16px;">
          <select id="drive-select" class="input" style="width:280px; height:48px; font-size:13.5px; background-color:rgba(0,0,0,0.35); color:var(--text-main); border:1px solid var(--glass-border-main); border-radius: 12px; outline:none; color-scheme:dark;">
            ${drives.map(d => `<option value="${d.id}" ${String(d.id) === String(selectedDriveId) ? 'selected' : ''} style="background:#0d1525; color:#fff;">${d.company} — ${d.role}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Main Layout -->
      <div style="display:grid; grid-template-columns: ${activeAllocation ? '1fr' : '1fr 2fr'}; gap: 40px; align-items: start;">
        
        <!-- left Panel: Configurator (Hide if allocation exists to display matrix beautifully, with edit option) -->
        ${!activeAllocation ? `
        <div class="card-ent" style="padding: 32px; display:flex; flex-direction:column; gap:28px;">
          <div style="border-bottom: 1px solid var(--glass-border-subtle); padding-bottom: 16px;">
            <h3 style="font-family:var(--font-display); font-size:18px; font-weight:700; color:#fff; margin:0;">Configuration Nodes</h3>
            <p style="font-size:13px; color:var(--text-description); margin:4px 0 0 0;">Define resource parameters for scheduling.</p>
          </div>

          <!-- Select Round -->
          <div class="input-node">
            <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block;">Target Selection Round</label>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${rounds.map((r, idx) => `
                <button class="round-tab-btn btn ${selectedRoundIdx === idx ? 'btn-primary' : 'btn-secondary'}" data-index="${idx}" style="font-size:12px; padding:6px 14px; border-radius:8px; min-height:36px; height:36px;">
                  ${idx + 1}. ${r}
                </button>
              `).join('')}
            </div>
            <div style="margin-top:10px; font-size:13px; color:var(--text-description);">
              Candidates in stage: <strong style="color:var(--brand-secondary);">${candidates.length} students</strong>
            </div>
          </div>

          <!-- Parameters: Slots, Duration, Date, and Start Time -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="input-node">
              <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block;">Number of Slots</label>
              <input id="slots-count" class="input" type="number" min="1" max="12" value="${noOfSlots}">
            </div>
            <div class="input-node">
              <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block;">Duration (Minutes)</label>
              <input id="slot-duration" class="input" type="number" min="15" max="300" step="5" value="${duration}">
            </div>
            <div class="input-node">
              <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block;">Process Date</label>
              <input id="alloc-date" class="input" type="date" value="${allocationDate}" style="background-color:rgba(0,0,0,0.3); color:var(--text-main); border:1px solid var(--glass-border-main); width: 100%; color-scheme:dark;">
            </div>
            <div class="input-node">
              <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block;">Start Time</label>
              <input id="start-time" class="input" type="time" value="${startTime}" style="background-color:rgba(0,0,0,0.3); color:var(--text-main); border:1px solid var(--glass-border-main); width: 100%; color-scheme:dark;">
            </div>
          </div>


          <!-- Venues Configuration -->
          <div class="input-node">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <label class="label-ent" style="color:#fff; margin:0;">Operational Venues</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:12px; color:var(--text-description);">Count:</span>
                <input id="venues-count" class="input" type="number" min="1" max="6" value="${noOfVenues}" style="width:60px; height:32px; min-height:auto; padding:0 8px; text-align:center;">
              </div>
            </div>
            
            <div id="venues-inputs-container" style="display:flex; flex-direction:column; gap:12px;">
              <!-- Dynamic venue inputs will render here -->
            </div>
          </div>

          <!-- Metrics Panel -->
          <div style="background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-main); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:var(--text-description);">Eligible Candidates:</span>
              <strong style="color:#fff;">${candidates.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:13px;">
              <span style="color:var(--text-description);">Configured Capacity:</span>
              <strong style="color:${totalCapacity >= candidates.length ? 'var(--brand-secondary)' : 'var(--danger)'};">${totalCapacity} seats</strong>
            </div>
            ${totalCapacity < candidates.length ? `
              <div style="font-size:12px; color:var(--danger); font-weight:600; line-height:1.5; margin-top:4px;">
                ⚠️ Capacity Deficit! Increase slots, venues, or venue capacities to schedule all ${candidates.length} candidates.
              </div>
            ` : `
              <div style="font-size:12px; color:var(--brand-secondary); font-weight:600; line-height:1.5; margin-top:4px;">
                ✓ Allocation capacity is sufficient for all candidates.
              </div>
            `}
          </div>

          <!-- Generate Action Button -->
          <button id="generate-allocation-btn" class="btn-premium" style="width:100%; padding:14px; border-radius:var(--radius-sm); font-weight:800; font-size:13.5px;">
            ⚙ Generate Slot Allocation
          </button>
        </div>
        ` : ''}

        <!-- Right Panel: Grid visualizer or Saved Allocation matrix -->
        <div style="display:flex; flex-direction:column; gap:32px; ${activeAllocation ? 'grid-column: span 2;' : ''}">
          
          ${activeAllocation ? renderActiveAllocationMatrix() : `
          <!-- Placeholder Workspace -->
          <div class="card-ent" style="padding: 100px 40px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; min-height:500px; background:var(--glass-2);">
            <div style="font-size:64px;">📅</div>
            <h3 style="font-family:var(--font-display); font-size:22px; font-weight:800; color:#fff; margin:0;">Scheduling Node Dormant</h3>
            <p style="color:var(--text-description); font-size:14px; max-width:480px; margin:0; line-height:1.7;">
              No schedule exists for <strong style="color:#fff;">${selectedDrive?.company}</strong>'s <strong style="color:#fff;">${getSelectedRoundName()}</strong>. 
              Configure resources on the left and deploy the automated scheduling lifecycle.
            </p>
          </div>
          `}
        </div>

      </div>

    </div>
    `;

    attachListeners();
    if (!activeAllocation) {
      renderVenueInputs();
    }
  }

  // Generate input fields for venue names and capacities dynamically
  function renderVenueInputs() {
    const container = root.querySelector('#venues-inputs-container');
    if (!container) return;

    // Adjust venues array length based on noOfVenues
    if (venues.length < noOfVenues) {
      for (let i = venues.length; i < noOfVenues; i++) {
        venues.push({ name: `Venue Room ${i + 1}`, capacity: 20 });
      }
    } else if (venues.length > noOfVenues) {
      venues = venues.slice(0, noOfVenues);
    }

    container.innerHTML = venues.map((v, idx) => `
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:16px; align-items:center;">
        <input class="input venue-name-input" data-index="${idx}" type="text" placeholder="e.g. Server Room A" value="${v.name}" style="height:36px; font-size:12.5px;">
        <input class="input venue-capacity-input" data-index="${idx}" type="number" min="1" max="1000" placeholder="Cap" value="${v.capacity}" style="height:36px; font-size:12.5px; text-align:center;">
      </div>
    `).join('');

    // Attach listeners inside venue inputs to preserve state
    container.querySelectorAll('.venue-name-input').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(e.target.dataset.index);
        venues[idx].name = e.target.value;
        updateMetricsDisplay();
      };
    });

    container.querySelectorAll('.venue-capacity-input').forEach(input => {
      input.oninput = (e) => {
        const idx = parseInt(e.target.dataset.index);
        venues[idx].capacity = parseInt(e.target.value) || 0;
        updateMetricsDisplay();
      };
    });
  }

  function updateMetricsDisplay() {
    const totalCapacity = venues.reduce((acc, v) => acc + (parseInt(v.capacity) || 0), 0) * noOfSlots;
    const candidatesCount = getCandidatesForRound().length;
    
    // Quick DOM update to keep values reactive without full refresh
    const metricsBlock = root.querySelector('.card-ent div[style*="background:rgba(255,255,255,0.01)"]');
    if (metricsBlock) {
      metricsBlock.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12.5px;">
          <span style="color:var(--text-description);">Eligible Candidates:</span>
          <strong style="color:#fff;">${candidatesCount}</strong>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12.5px;">
          <span style="color:var(--text-description);">Configured Capacity:</span>
          <strong style="color:${totalCapacity >= candidatesCount ? 'var(--brand-secondary)' : '#ef4444'};">${totalCapacity} seats</strong>
        </div>
        ${totalCapacity < candidatesCount ? `
          <div style="font-size:11px; color:#ef4444; font-weight:600; line-height:1.4; margin-top:4px;">
            ⚠️ Capacity Deficit! Increase slots, venues, or venue capacities to schedule all ${candidatesCount} candidates.
          </div>
        ` : `
          <div style="font-size:11px; color:#10b981; font-weight:600; line-height:1.4; margin-top:4px;">
            ✓ Allocation capacity is sufficient for all candidates.
          </div>
        `}
      `;
    }
  }

  // Algorithm to auto-distribute candidates into slot-venue cells sequential manner
  function distributeCandidates() {
    const candidates = getCandidatesForRound();
    if (candidates.length === 0) {
      showToast("Cannot generate schedule: No candidates are currently in this round.", "warning");
      return;
    }

    const allocationId = 'sa_' + Date.now();
    const roundName = getSelectedRoundName();
    const roundStageId = getSelectedRoundStageId();
    
    const calculatedSlots = [];
    let currentSlotStart = startTime;

    for (let sIdx = 0; sIdx < noOfSlots; sIdx++) {
      const end = addMinutesToTime(currentSlotStart, duration);
      calculatedSlots.push({
        id: `slot_${sIdx + 1}`,
        timeLabel: `${formatTimeAmPm(currentSlotStart)} - ${formatTimeAmPm(end)}`,
        startTime: currentSlotStart,
        endTime: end
      });
      currentSlotStart = end;
    }

    const allocationsList = [];
    let candidateIndex = 0;

    // Distribute sequentially: Slot-wise, then Venue-wise
    for (let sIdx = 0; sIdx < noOfSlots; sIdx++) {
      const slotDef = calculatedSlots[sIdx];
      for (const venueDef of venues) {
        const capacity = parseInt(venueDef.capacity) || 0;
        for (let capIdx = 0; capIdx < capacity; capIdx++) {
          if (candidateIndex < candidates.length) {
            const cand = candidates[candidateIndex++];
            allocationsList.push({
              studentId: cand.id,
              studentName: cand.name,
              dept: cand.dept,
              avatar: cand.avatar || cand.name.substring(0, 2).toUpperCase(),
              venue: venueDef.name,
              slotId: slotDef.id,
              slotTime: slotDef.timeLabel
            });
          } else {
            break;
          }
        }
      }
    }

    const remainingCount = candidates.length - candidateIndex;

    const allocationNode = {
      id: allocationId,
      driveId: selectedDrive.id,
      company: selectedDrive.company,
      role: selectedDrive.role,
      roundIndex: selectedRoundIdx,
      roundName: roundName,
      roundStageId: roundStageId,
      date: allocationDate,
      duration: duration,
      startTime: startTime,
      venues: JSON.parse(JSON.stringify(venues)),
      slots: calculatedSlots,
      allocations: allocationsList,
      remainingCount: remainingCount,
      totalCandidates: candidates.length,
      notified: false,
      createdAt: new Date().toISOString()
    };

    // Remove any previous allocation for this drive & round
    Store.slotAllocations = (Store.slotAllocations || []).filter(a => 
      !(String(a.driveId) === String(selectedDrive.id) && a.roundName === roundName)
    );

    // Auto-dispatch notifications to all allocated students
    if (!Store.notifications) Store.notifications = [];
    allocationsList.forEach(a => {
      Store.notifications.unshift({
        id: 'n_slot_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'reminder',
        studentId: a.studentId,
        studentName: a.studentName,
        title: `📅 Slot Allocated: ${company} (${roundName})`,
        desc: `Your interview slot is confirmed: ${a.slotTime} at ${a.venue} on ${date}. Check your lifecycle schedule on My Slots page.`,
        message: `Your interview slot is confirmed: ${a.slotTime} at ${a.venue} on ${date}. Check your lifecycle schedule on My Slots page.`,
        date: new Date().toISOString().split('T')[0],
        time: 'Just now',
        unread: true,
        read: false
      });
    });

    Store.slotAllocations.push(allocationNode);
    saveStore();

    activeAllocation = allocationNode;
    showToast(`Successfully allocated ${allocationNode.allocations.length} students & dispatched system notifications!`, "success");
    render();
  }

  // Renders the visual schedule grid of active allocations
  function renderActiveAllocationMatrix() {
    if (!activeAllocation) return '';
    const alloc = activeAllocation;
    
    // Matrix Table Headers
    const venueCols = alloc.venues;
    const slotsRows = alloc.slots;

    // Build Search Bar State
    const searchVal = localStorage.getItem('placenix_slot_search') || '';

    // Filter allocations by search value
    const filteredAllocs = alloc.allocations.filter(a => 
      a.studentName.toLowerCase().includes(searchVal.toLowerCase()) || 
      a.dept.toLowerCase().includes(searchVal.toLowerCase()) || 
      a.venue.toLowerCase().includes(searchVal.toLowerCase())
    );

    // Dynamic grid building
    let rowsHtml = '';
    slotsRows.forEach(slot => {
      let cellsHtml = `
        <td style="padding:16px; border-bottom:1px solid var(--border-main); border-right:1px solid var(--border-subtle); vertical-align:middle; width:220px;">
          <div style="font-weight:700; color:#fff; font-size:13.5px;">${slot.timeLabel}</div>
          <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-top:2px;">Slot ${slot.id.split('_')[1]}</div>
        </td>
      `;

      venueCols.forEach(venue => {
        // Find students in this slot + venue
        const studentsCell = filteredAllocs.filter(a => a.slotId === slot.id && a.venue === venue.name);

        cellsHtml += `
          <td style="padding:16px; border-bottom:1px solid var(--glass-border-subtle); border-right:1px solid var(--glass-border-subtle); vertical-align:top; background:rgba(0,0,0,0.15);">
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${studentsCell.length === 0 ? `
                <div style="font-size:12px; color:var(--text-muted); padding:8px 0; text-align:center; font-style:italic;">No Candidates</div>
              ` : studentsCell.map(student => `
                <div class="slot-student-chip" data-id="${student.studentId}" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--glass-2); border:1px solid var(--glass-border-main); border-radius:10px; transition: all 0.15s ease;" onmouseover="this.style.borderColor='rgba(129, 140, 248, 0.4)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.borderColor='var(--glass-border-main)'; this.style.transform='none';">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg, #818cf8, #34d399); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; color:#fff;">
                      ${student.avatar}
                    </div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:13px; line-height:1.2;">${student.studentName}</div>
                      <div style="font-size:10px; color:var(--text-description); margin-top:2px;">${student.dept}</div>
                    </div>
                  </div>
                  <button class="swap-candidate-btn" data-id="${student.studentId}" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:12px; padding:4px;" title="Reallocate Seat">✕</button>
                </div>
              `).join('')}
            </div>
          </td>
        `;
      });

      rowsHtml += `<tr style="transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.005)'" onmouseout="this.style.background='transparent'">${cellsHtml}</tr>`;
    });

    return `
    <div class="card-ent animate-fade-in-up" style="padding:40px;">
      
      <!-- Timeline Header Control Block -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; border-bottom:1px solid var(--glass-border-main); padding-bottom:24px; flex-wrap:wrap; gap:20px;">
        <div>
          <h2 class="h2-ent" style="font-size:22px; color:#fff; display:flex; align-items:center; gap:10px; margin:0;">
            <span style="font-size:24px;">📅</span> Allocated Operational Matrix
          </h2>
          <p style="color:var(--text-description); font-size:13.5px; margin:6px 0 0 0;">
            Active schedule for <strong style="color:#fff;">${alloc.company}</strong> — <strong style="color:var(--brand-primary);">${alloc.roundName}</strong> (${alloc.date})${alloc.lastModifiedAt ? ` · <span style="color:var(--brand-cyan); font-weight:600; font-size:12px;">Last modified: ${new Date(alloc.lastModifiedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>` : ''}
          </p>
        </div>
        
        <!-- Action Row -->
        <div style="display:flex; gap:12px; align-items:center;">
          <input type="text" id="slot-matrix-search" class="input" placeholder="🔍 Search Candidate..." value="${searchVal}" style="width:220px; height:40px; font-size:13px; min-height:auto; border-radius:10px;">
          <button id="notify-students-btn" class="btn btn-primary" style="height:40px; min-height:auto; font-size:13px; font-weight:700; padding:0 18px; border-radius:10px;">
            📢 Notify Students
          </button>
          <button id="export-schedule-btn" class="btn btn-secondary" style="height:40px; min-height:auto; font-size:13px; font-weight:700; padding:0 18px; border-radius:10px; border-color:var(--glass-border-main); background:var(--glass-2);">
            📥 Export CSV
          </button>
          <button id="modify-schedule-btn" class="btn btn-secondary" style="height:40px; min-height:auto; font-size:13px; font-weight:700; padding:0 18px; border-radius:10px; border-color:var(--glass-border-main); background:var(--glass-2);">
            ✏️ Modify Slot
          </button>
          <button id="reset-schedule-btn" class="btn" style="height:40px; min-height:auto; font-size:13px; font-weight:700; padding:0 16px; border-radius:10px; background:var(--danger-bg); border:1px solid var(--danger-border); color:var(--danger);">
            Reset
          </button>
        </div>
      </div>

      <!-- Schedule Capacity Metrics -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom:32px;">
        <div style="background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-main); border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Total Eligible</div>
          <div style="font-size:22px; font-weight:800; color:#fff; font-family:var(--font-display);">${alloc.totalCandidates}</div>
        </div>
        <div style="background:var(--success-bg); border:1px solid var(--success-border); border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:var(--success); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Allocated Seats</div>
          <div style="font-size:22px; font-weight:800; color:var(--success); font-family:var(--font-display);">${alloc.allocations.length}</div>
        </div>
        <div style="background:${alloc.remainingCount > 0 ? 'var(--danger-bg)' : 'rgba(0,0,0,0.25)'}; border:1px solid ${alloc.remainingCount > 0 ? 'var(--danger-border)' : 'var(--glass-border-main)'}; border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:${alloc.remainingCount > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Remaining Count</div>
          <div style="font-size:22px; font-weight:800; color:${alloc.remainingCount > 0 ? 'var(--danger)' : '#fff'}; font-family:var(--font-display);">${alloc.remainingCount}</div>
        </div>
        <div style="background:var(--info-bg); border:1px solid var(--info-border); border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:var(--info); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Resource Venues</div>
          <div style="font-size:22px; font-weight:800; color:var(--info); font-family:var(--font-display);">${venueCols.length} Labs</div>
        </div>
      </div>

      <!-- Allocation Deficit Notice -->
      ${alloc.remainingCount > 0 ? `
        <div style="padding:16px 20px; background:var(--danger-bg); border:1px solid var(--danger-border); border-radius:12px; display:flex; align-items:center; gap:16px; margin-bottom:32px;">
          <span style="font-size:20px;">⚠️</span>
          <div style="font-size:13px; color:var(--danger); font-weight:600; line-height:1.5;">
            <strong>Capacity Deficit Detected:</strong> ${alloc.remainingCount} students could not be scheduled due to insufficient seat limits. 
            Click <strong style="text-decoration:underline; cursor:pointer;" id="deficit-reset-link">Reset</strong> to adjust venues or increase slots count.
          </div>
        </div>
      ` : ''}

      <!-- Grid Matrix Table -->
      <div class="table-wrapper">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:rgba(0,0,0,0.25); border-bottom:1px solid var(--glass-border-main);">
              <th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; border-right:1px solid var(--glass-border-subtle); width:220px;">Slot Timing</th>
              ${venueCols.map(v => `
                <th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; border-right:1px solid var(--glass-border-subtle);">
                  <div style="color:#fff; font-size:12px; font-weight:800;">${v.name}</div>
                  <div style="font-size:9.5px; color:var(--text-muted); font-weight:600; text-transform:uppercase; margin-top:2px;">Capacity: ${v.capacity} seats</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

    </div>

    <!-- Modify Slot Modal -->
    <div id="modify-slot-modal" class="modal-overlay" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(15px); z-index:1001; align-items:center; justify-content:center; padding:40px;">
      <div class="card-ent" style="max-width:620px; width:100%; padding:36px; position:relative; background:#0c0c0e; border:1px solid var(--border-main); border-radius:16px; display:flex; flex-direction:column; gap:24px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="font-size:20px; font-weight:800; color:#fff; display:flex; align-items:center; gap:8px;">✏️ Modify Slot Parameters</h3>
          <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:22px;" onclick="document.getElementById('modify-slot-modal').style.display='none'">✕</button>
        </div>
        
        <p style="color:var(--text-muted); font-size:13px; margin:0; line-height:1.5;">Update the schedule date, timings, or venue slots. Candidates will be re-assigned according to the new slots.</p>
        
        <!-- Parameters Grid -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div class="input-node">
            <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block; font-size:11px;">Process Date</label>
            <input id="modify-alloc-date" class="input" type="date" value="${alloc.date}" style="background-color:rgba(0,0,0,0.3); color:var(--text-main); border:1px solid var(--glass-border-main); width: 100%; color-scheme:dark; height:40px;">
          </div>
          <div class="input-node">
            <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block; font-size:11px;">Start Time</label>
            <input id="modify-start-time" class="input" type="time" value="${alloc.startTime || '09:00'}" style="background-color:rgba(0,0,0,0.3); color:var(--text-main); border:1px solid var(--glass-border-main); width: 100%; color-scheme:dark; height:40px;">
          </div>
          <div class="input-node">
            <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block; font-size:11px;">Number of Slots</label>
            <input id="modify-slots-count" class="input" type="number" min="1" max="12" value="${alloc.slots ? alloc.slots.length : 3}" style="height:40px;">
          </div>
          <div class="input-node">
            <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block; font-size:11px;">Slot Duration (Minutes)</label>
            <input id="modify-slot-duration" class="input" type="number" min="15" max="300" step="5" value="${alloc.duration || 60}" style="height:40px;">
          </div>
        </div>

        <!-- Venues Header -->
        <div class="input-node" style="margin-bottom: -10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <label class="label-ent" style="color:#fff; margin:0; font-size:11px;">Operational Venues</label>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:11px; color:var(--text-description);">Count:</span>
              <input id="modify-venues-count" class="input" type="number" min="1" max="6" value="${alloc.venues ? alloc.venues.length : 2}" style="width:60px; height:32px; min-height:auto; padding:0 8px; text-align:center;">
            </div>
          </div>
          <div id="modify-venues-inputs-container" style="display:flex; flex-direction:column; gap:12px; max-height: 150px; overflow-y: auto; padding-right: 4px;">
            <!-- Filled dynamically -->
          </div>
        </div>

        <!-- Notify Checkbox -->
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px; background:rgba(255,255,255,0.02); border:1px solid var(--glass-border-main); border-radius:8px;">
          <input type="checkbox" id="modify-notify-checkbox" checked style="accent-color:var(--brand-primary); cursor:pointer;">
          <div>
            <span style="font-size:12.5px; font-weight:700; color:#fff;">📢 Notify students of reschedule changes</span>
            <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Sends a reschedule reminder notification to all allocated candidates.</div>
          </div>
        </label>

        <!-- Action Row -->
        <div style="display:flex; justify-content:flex-end; gap:12px;">
          <button class="btn btn-secondary" onclick="document.getElementById('modify-slot-modal').style.display='none'" style="height:40px; padding:0 20px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer;">Cancel</button>
          <button id="modify-save-btn" class="btn btn-primary" style="height:40px; padding:0 24px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer;">💾 Save Changes</button>
        </div>
      </div>
    </div>
    `;
  }

  function handleNotifyStudents() {
    if (!activeAllocation) return;
    
    const alloc = activeAllocation;
    alloc.notified = true; // Mark schedule as published
    let notifyCount = 0;

    if (!Store.notifications) Store.notifications = [];

    alloc.allocations.forEach(a => {
      const notifObj = {
        id: 'notif_slot_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'slot_allocated',
        studentId: a.studentId,
        studentName: a.studentName,
        title: `📅 Interview Slot Confirmed: ${alloc.company}`,
        body: `${alloc.roundName} assigned at ${a.venue} during ${a.slotTime} on ${alloc.date}.`,
        message: `${alloc.roundName} assigned at ${a.venue} during ${a.slotTime} on ${alloc.date}.`,
        link: 'my-slots',
        createdAt: new Date().toISOString(),
        date: alloc.date || new Date().toISOString().split('T')[0],
        unread: true,
        read: false
      };

      Store.notifications.unshift(notifObj);
      if (window.NotificationService) {
        window.NotificationService.addNotification(notifObj);
      }
      notifyCount++;
    });

    saveStore();
    
    if (window.NotificationService) {
      window.NotificationService.refreshBadge();
    }

    if (window.Toast) {
      window.Toast.show(`📢 Broadcasted interview slot notifications to ${notifyCount} candidates! Topbar bell icon updated.`, "success");
    } else {
      alert(`📢 Broadcasted interview slot notifications to ${notifyCount} candidates!`);
    }
  }

  function exportScheduleCSV() {
    if (!activeAllocation) return;
    const alloc = activeAllocation;
    
    const headers = ['Student Name', 'Department', 'Venue', 'Slot Timing', 'Round Name', 'Company Name', 'Designation', 'Date'];
    const rows = alloc.allocations.map(a => [
      a.studentName,
      a.dept,
      a.venue,
      a.slotTime,
      alloc.roundName,
      alloc.company,
      alloc.role,
      alloc.date
    ]);

    // Include unallocated students
    if (alloc.remainingCount > 0) {
      const candidates = getCandidatesForRound();
      const allocatedIds = new Set(alloc.allocations.map(a => String(a.studentId)));
      const unallocated = candidates.filter(c => !allocatedIds.has(String(c.id)));
      
      unallocated.forEach(c => {
        rows.push([
          c.name,
          c.dept,
          'UNALLOCATED (Capacity Deficit)',
          '—',
          alloc.roundName,
          alloc.company,
          alloc.role,
          alloc.date
        ]);
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `placenix_schedule_${alloc.company.replace(/[^a-zA-Z0-9]/g, '_')}_${alloc.roundName.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Schedule successfully exported as CSV!", "success");
  }

  function handleRemoveCandidate(studentId) {
    if (!activeAllocation) return;
    if (!confirm("Are you sure you want to remove this student from the current slot allocation?\nThis does not remove them from the round, but opens up a seat in the matrix.")) {
      return;
    }

    const alloc = activeAllocation;
    const originalLength = alloc.allocations.length;
    alloc.allocations = alloc.allocations.filter(a => String(a.studentId) !== String(studentId));

    if (alloc.allocations.length < originalLength) {
      alloc.remainingCount = alloc.totalCandidates - alloc.allocations.length;
      saveStore();
      showToast("Candidate allocation seat released successfully.", "success");
      render();
    }
  }

  function attachListeners() {
    // Drive Dropdown Selection
    const driveSelect = root.querySelector('#drive-select');
    if (driveSelect) {
      driveSelect.onchange = (e) => {
        selectedDriveId = e.target.value;
        selectedDrive = drives.find(d => String(d.id) === String(selectedDriveId));
        selectedRoundIdx = 0; // reset round selection
        localStorage.removeItem('placenix_slot_search'); // reset search filter
        render();
      };
    }

    // Configurator Round Tab Buttons
    root.querySelectorAll('.round-tab-btn').forEach(btn => {
      btn.onclick = (e) => {
        selectedRoundIdx = parseInt(e.currentTarget.dataset.index);
        localStorage.removeItem('placenix_slot_search');
        render();
      };
    });

    // Inputs value mapping
    const slotsCountInput = root.querySelector('#slots-count');
    if (slotsCountInput) {
      slotsCountInput.onchange = (e) => {
        noOfSlots = parseInt(e.target.value) || 3;
        updateMetricsDisplay();
      };
    }

    const slotDurationInput = root.querySelector('#slot-duration');
    if (slotDurationInput) {
      slotDurationInput.onchange = (e) => {
        duration = parseInt(e.target.value) || 60;
        updateMetricsDisplay();
      };
    }

    const startTimeInput = root.querySelector('#start-time');
    if (startTimeInput) {
      startTimeInput.onchange = (e) => {
        startTime = e.target.value || '09:00';
      };
    }

    const dateInput = root.querySelector('#alloc-date');
    if (dateInput) {
      dateInput.onchange = (e) => {
        allocationDate = e.target.value;
      };
    }

    // Adjusting Venues Inputs dynamically
    const venuesCountInput = root.querySelector('#venues-count');
    if (venuesCountInput) {
      venuesCountInput.onchange = (e) => {
        noOfVenues = parseInt(e.target.value) || 2;
        renderVenueInputs();
        updateMetricsDisplay();
      };
    }

    // Generate Button Trigger
    const generateBtn = root.querySelector('#generate-allocation-btn');
    if (generateBtn) {
      generateBtn.onclick = () => {
        distributeCandidates();
      };
    }

    // Active Matrix Grid Controls
    const searchInput = root.querySelector('#slot-matrix-search');
    if (searchInput) {
      searchInput.oninput = (e) => {
        localStorage.setItem('placenix_slot_search', e.target.value);
        
        // Dynamic Matrix Re-render (avoid complete page reload to preserve focus)
        const container = root.querySelector('#page-root');
        const rightContainer = root.querySelector('div[style*="display:flex; flex-direction:column; gap:32px"]');
        if (rightContainer) {
          rightContainer.innerHTML = renderActiveAllocationMatrix();
          attachListeners(); // rebind events inside matrix
        }
      };
    }

    const notifyBtn = root.querySelector('#notify-students-btn');
    if (notifyBtn) {
      notifyBtn.onclick = () => handleNotifyStudents();
    }

    const exportBtn = root.querySelector('#export-schedule-btn');
    if (exportBtn) {
      exportBtn.onclick = () => exportScheduleCSV();
    }

    const resetBtn = root.querySelector('#reset-schedule-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm("Reset current allocation matrix?\nThis will permanently delete the current schedule and restore configuration controls.")) {
          // Remove active allocation from store
          const roundName = getSelectedRoundName();
          Store.slotAllocations = (Store.slotAllocations || []).filter(a => 
            !(String(a.driveId) === String(selectedDrive.id) && a.roundName === roundName)
          );
          saveStore();
          activeAllocation = null;
          render();
        }
      };
    }

    const deficitResetLink = root.querySelector('#deficit-reset-link');
    if (deficitResetLink) {
      deficitResetLink.onclick = () => {
        const resetBtn = root.querySelector('#reset-schedule-btn');
        if (resetBtn) resetBtn.click();
      };
    }

    // Delete single student chip trigger
    root.querySelectorAll('.swap-candidate-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const studId = e.currentTarget.dataset.id;
        handleRemoveCandidate(studId);
      };
    });

    // Modify schedule actions
    const modifyBtn = root.querySelector('#modify-schedule-btn');
    const modifyModal = root.querySelector('#modify-slot-modal');
    if (modifyBtn && modifyModal) {
      modifyBtn.onclick = () => {
        const alloc = activeAllocation;
        if (!alloc) return;
        
        modifyVenuesState = JSON.parse(JSON.stringify(alloc.venues || []));
        modifyModal.style.display = 'flex';
        renderModifyVenueInputs();
      };
    }

    const modifyVenuesCountInput = root.querySelector('#modify-venues-count');
    if (modifyVenuesCountInput) {
      modifyVenuesCountInput.onchange = (e) => {
        const newCount = parseInt(e.target.value) || 1;
        if (modifyVenuesState.length < newCount) {
          for (let i = modifyVenuesState.length; i < newCount; i++) {
            modifyVenuesState.push({ name: `Venue Room ${i + 1}`, capacity: 20 });
          }
        } else if (modifyVenuesState.length > newCount) {
          modifyVenuesState = modifyVenuesState.slice(0, newCount);
        }
        renderModifyVenueInputs();
      };
    }

    const modifySaveBtn = root.querySelector('#modify-save-btn');
    if (modifySaveBtn) {
      modifySaveBtn.onclick = () => {
        const alloc = activeAllocation;
        if (!alloc) return;

        const newDate = root.querySelector('#modify-alloc-date').value;
        const newStartTime = root.querySelector('#modify-start-time').value;
        const newSlotsCount = parseInt(root.querySelector('#modify-slots-count').value) || 1;
        const newDuration = parseInt(root.querySelector('#modify-slot-duration').value) || 60;
        const notifyChecked = root.querySelector('#modify-notify-checkbox').checked;

        if (modifyVenuesState.length === 0) {
          showToast("Please configure at least one venue.", "error");
          return;
        }

        const newSlots = [];
        let currentSlotStart = newStartTime;
        for (let sIdx = 0; sIdx < newSlotsCount; sIdx++) {
          const end = addMinutesToTime(currentSlotStart, newDuration);
          newSlots.push({
            id: `slot_${sIdx + 1}`,
            timeLabel: `${formatTimeAmPm(currentSlotStart)} - ${formatTimeAmPm(end)}`,
            startTime: currentSlotStart,
            endTime: end
          });
          currentSlotStart = end;
        }

        const candidates = getCandidatesForRound();
        if (candidates.length === 0) {
          showToast("No candidates found to allocate.", "error");
          return;
        }

        const newAllocationsList = [];
        let candidateIndex = 0;

        for (let sIdx = 0; sIdx < newSlotsCount; sIdx++) {
          const slotDef = newSlots[sIdx];
          for (const venueDef of modifyVenuesState) {
            const capacity = parseInt(venueDef.capacity) || 0;
            for (let capIdx = 0; capIdx < capacity; capIdx++) {
              if (candidateIndex < candidates.length) {
                const cand = candidates[candidateIndex++];
                newAllocationsList.push({
                  studentId: cand.id,
                  studentName: cand.name,
                  dept: cand.dept,
                  avatar: cand.avatar || cand.name.substring(0, 2).toUpperCase(),
                  venue: venueDef.name,
                  slotId: slotDef.id,
                  slotTime: slotDef.timeLabel
                });
              } else {
                break;
              }
            }
          }
        }

        const remainingCount = candidates.length - candidateIndex;

        alloc.date = newDate;
        alloc.startTime = newStartTime;
        alloc.duration = newDuration;
        alloc.venues = JSON.parse(JSON.stringify(modifyVenuesState));
        alloc.slots = newSlots;
        alloc.allocations = newAllocationsList;
        alloc.remainingCount = remainingCount;
        alloc.lastModifiedAt = new Date().toISOString();

        Store.slotAllocations = (Store.slotAllocations || []).filter(a => 
          !(String(a.driveId) === String(selectedDrive.id) && a.roundName === alloc.roundName)
        );
        Store.slotAllocations.push(alloc);
        saveStore();

        showToast("Slot allocation modified successfully!", "success");

        if (notifyChecked) {
          let notifyCount = 0;
          newAllocationsList.forEach(a => {
            Store.notifications.unshift({
              id: 'n_' + Date.now() + Math.random().toString(36).substr(2, 4),
              type: 'reminder',
              studentId: a.studentId,
              studentName: a.studentName,
              title: `🚨 Rescheduled: ${alloc.company} ${alloc.roundName}`,
              desc: `Your interview slot has been rescheduled. New slot: ${a.slotTime} at ${a.venue} on ${alloc.date}. Please check your updated schedule.`,
              message: `Your interview slot has been rescheduled. New slot: ${a.slotTime} at ${a.venue} on ${alloc.date}. Please check your updated schedule.`,
              date: new Date().toISOString().split('T')[0],
              time: 'Just now',
              unread: true,
              read: false
            });
            notifyCount++;
          });
          saveStore();
          showToast(`Notified ${notifyCount} students of scheduling changes!`, "info");
        }

        modifyModal.style.display = 'none';
        render();
      };
    }
  }

  // Initial render lifecycle mount
  render();
}
