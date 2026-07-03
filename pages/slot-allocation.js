// ============================================================
// PLACENIX — SLOT ALLOCATION & SCHEDULING WORKSPACE (v1.0)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

export async function loadSlotAllocationPage(root, Store, supabase) {
  const drives = Store.drives || [];
  let selectedDriveId = drives[0]?.id || '';
  let selectedDrive = drives.find(d => String(d.id) === String(selectedDriveId)) || drives[0];

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

  // Find previously saved allocation for this drive & round
  function loadSavedAllocation() {
    if (!selectedDrive) return;
    const roundName = getSelectedRoundName();
    const saved = (Store.slotAllocations || []).find(a => 
      String(a.driveId) === String(selectedDrive.id) && a.roundName === roundName
    );
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
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Operational Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">TPO Logistics Hub</div>
          <h1 class="h1-ent" style="font-size:32px;">Seat & Slot Allocation</h1>
          <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Deploy candidates into structured venue streams and slot intervals.</p>
        </div>
        <div style="display:flex; gap:16px;">
          <select id="drive-select" class="input" style="width:280px; height:44px; font-size:13px; background-color:var(--bg-card); color:var(--text-main); border:1px solid var(--border-main);">
            ${drives.map(d => `<option value="${d.id}" ${String(d.id) === String(selectedDriveId) ? 'selected' : ''}>${d.company} — ${d.role}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Main Layout -->
      <div style="display:grid; grid-template-columns: ${activeAllocation ? '1fr' : '1fr 2fr'}; gap: 40px; align-items: start;">
        
        <!-- left Panel: Configurator (Hide if allocation exists to display matrix beautifully, with edit option) -->
        ${!activeAllocation ? `
        <div class="card-ent" style="padding: 32px; display:flex; flex-direction:column; gap:28px;">
          <div style="border-bottom: 1px solid var(--border-main); padding-bottom: 16px;">
            <h3 style="font-size:18px; font-weight:700; color:#fff; margin:0;">Configuration Nodes</h3>
            <p style="font-size:12px; color:var(--text-description); margin:4px 0 0 0;">Define resource parameters for scheduling.</p>
          </div>

          <!-- Select Round -->
          <div class="input-node">
            <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block;">Target Selection Round</label>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${rounds.map((r, idx) => `
                <button class="round-tab-btn btn ${selectedRoundIdx === idx ? 'btn-primary' : 'btn-secondary'}" data-index="${idx}" style="font-size:12px; padding:6px 14px; border-radius:8px;">
                  ${idx + 1}. ${r}
                </button>
              `).join('')}
            </div>
            <div style="margin-top:10px; font-size:12px; color:var(--text-description);">
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
              <input id="alloc-date" class="input" type="date" value="${allocationDate}" style="background-color:var(--bg-card); color:var(--text-main); border:1px solid var(--border-main); width: 100%;">
            </div>
            <div class="input-node">
              <label class="label-ent" style="color:#fff; margin-bottom:8px; display:block;">Start Time</label>
              <input id="start-time" class="input" type="time" value="${startTime}" style="background-color:var(--bg-card); color:var(--text-main); border:1px solid var(--border-main); width: 100%;">
            </div>
          </div>


          <!-- Venues Configuration -->
          <div class="input-node">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <label class="label-ent" style="color:#fff; margin:0;">Operational Venues</label>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:11px; color:var(--text-description);">Count:</span>
                <input id="venues-count" class="input" type="number" min="1" max="6" value="${noOfVenues}" style="width:60px; height:32px; padding:0 8px; text-align:center;">
              </div>
            </div>
            
            <div id="venues-inputs-container" style="display:flex; flex-direction:column; gap:12px;">
              <!-- Dynamic venue inputs will render here -->
            </div>
          </div>

          <!-- Metrics Panel -->
          <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; font-size:12.5px;">
              <span style="color:var(--text-description);">Eligible Candidates:</span>
              <strong style="color:#fff;">${candidates.length}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:12.5px;">
              <span style="color:var(--text-description);">Configured Capacity:</span>
              <strong style="color:${totalCapacity >= candidates.length ? 'var(--brand-secondary)' : '#ef4444'};">${totalCapacity} seats</strong>
            </div>
            ${totalCapacity < candidates.length ? `
              <div style="font-size:11px; color:#ef4444; font-weight:600; line-height:1.4; margin-top:4px;">
                ⚠️ Capacity Deficit! Increase slots, venues, or venue capacities to schedule all ${candidates.length} candidates.
              </div>
            ` : `
              <div style="font-size:11px; color:#10b981; font-weight:600; line-height:1.4; margin-top:4px;">
                ✓ Allocation capacity is sufficient for all candidates.
              </div>
            `}
          </div>

          <!-- Generate Action Button -->
          <button id="generate-allocation-btn" class="btn-premium" style="width:100%; padding:14px; border-radius:12px; font-weight:800; font-size:13.5px;">
            ⚙ Generate Slot Allocation
          </button>
        </div>
        ` : ''}

        <!-- Right Panel: Grid visualizer or Saved Allocation matrix -->
        <div style="display:flex; flex-direction:column; gap:32px; ${activeAllocation ? 'grid-column: span 2;' : ''}">
          
          ${activeAllocation ? renderActiveAllocationMatrix() : `
          <!-- Placeholder Workspace -->
          <div class="card-ent" style="padding: 100px 40px; text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; min-height:500px;">
            <div style="font-size:64px;">📅</div>
            <h3 style="font-size:22px; font-weight:800; color:#fff; margin:0;">Scheduling Node Dormant</h3>
            <p style="color:var(--text-description); font-size:14px; max-width:480px; margin:0; line-height:1.6;">
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

    Store.slotAllocations.push(allocationNode);
    saveStore();

    activeAllocation = allocationNode;
    showToast(`Successfully allocated ${allocationNode.allocations.length} students!`, "success");
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
          <td style="padding:16px; border-bottom:1px solid var(--border-main); border-right:1px solid var(--border-subtle); vertical-align:top; background:rgba(255,255,255,0.005);">
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${studentsCell.length === 0 ? `
                <div style="font-size:11.5px; color:var(--text-muted); padding:8px 0; text-align:center; font-style:italic;">No Candidates</div>
              ` : studentsCell.map(student => `
                <div class="slot-student-chip" data-id="${student.studentId}" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:10px; transition: all 0.15s ease;" onmouseover="this.style.borderColor='var(--brand-primary)'; this.style.transform='translateY(-1px)';" onmouseout="this.style.borderColor='var(--border-main)'; this.style.transform='none';">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div style="width:24px; height:24px; border-radius:50%; background:var(--gradient-brand, linear-gradient(135deg, #7c3aed, #22d3ee)); display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; color:#fff;">
                      ${student.avatar}
                    </div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:12.5px; line-height:1.2;">${student.studentName}</div>
                      <div style="font-size:9.5px; color:var(--text-description); margin-top:2px;">${student.dept}</div>
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
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; border-bottom:1px solid var(--border-main); padding-bottom:24px; flex-wrap:wrap; gap:20px;">
        <div>
          <h2 class="h2-ent" style="font-size:22px; color:#fff; display:flex; align-items:center; gap:10px; margin:0;">
            <span style="font-size:24px;">📅</span> Allocated Operational Matrix
          </h2>
          <p style="color:var(--text-description); font-size:13px; margin:6px 0 0 0;">
            Active schedule for <strong style="color:#fff;">${alloc.company}</strong> — <strong style="color:var(--brand-primary);">${alloc.roundName}</strong> (${alloc.date})
          </p>
        </div>
        
        <!-- Action Row -->
        <div style="display:flex; gap:12px; align-items:center;">
          <input type="text" id="slot-matrix-search" class="input" placeholder="🔍 Search Candidate..." value="${searchVal}" style="width:220px; height:40px; font-size:12.5px;">
          <button id="notify-students-btn" class="btn btn-primary" style="height:40px; font-size:12.5px; font-weight:700; padding:0 18px; border-radius:10px;">
            📢 Notify Students
          </button>
          <button id="export-schedule-btn" class="btn btn-secondary" style="height:40px; font-size:12.5px; font-weight:700; padding:0 18px; border-radius:10px; border-color:var(--border-main); background:rgba(255,255,255,0.02);">
            📥 Export CSV
          </button>
          <button id="reset-schedule-btn" class="btn" style="height:40px; font-size:12.5px; font-weight:700; padding:0 16px; border-radius:10px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.15); color:#ef4444;">
            Reset
          </button>
        </div>
      </div>

      <!-- Schedule Capacity Metrics -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom:32px;">
        <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:4px;">Total Eligible</div>
          <div style="font-size:22px; font-weight:800; color:#fff;">${alloc.totalCandidates}</div>
        </div>
        <div style="background:rgba(16,185,129,0.03); border:1px solid rgba(16,185,129,0.1); border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:#10B981; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Allocated Seats</div>
          <div style="font-size:22px; font-weight:800; color:#10B981;">${alloc.allocations.length}</div>
        </div>
        <div style="background:${alloc.remainingCount > 0 ? 'rgba(239,68,68,0.03)' : 'rgba(255,255,255,0.01)'}; border:1px solid ${alloc.remainingCount > 0 ? 'rgba(239,68,68,0.1)' : 'var(--border-main)'}; border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:${alloc.remainingCount > 0 ? '#ef4444' : 'var(--text-muted)'}; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Remaining Count</div>
          <div style="font-size:22px; font-weight:800; color:${alloc.remainingCount > 0 ? '#ef4444' : '#fff'};">${alloc.remainingCount}</div>
        </div>
        <div style="background:rgba(14,165,233,0.03); border:1px solid rgba(14,165,233,0.1); border-radius:12px; padding:16px; text-align:center;">
          <div style="font-size:10px; color:#0ea5e9; font-weight:700; text-transform:uppercase; margin-bottom:4px;">Resource Venues</div>
          <div style="font-size:22px; font-weight:800; color:#0ea5e9;">${venueCols.length} Labs</div>
        </div>
      </div>

      <!-- Allocation Deficit Notice -->
      ${alloc.remainingCount > 0 ? `
        <div style="padding:16px 20px; background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.15); border-radius:12px; display:flex; align-items:center; gap:16px; margin-bottom:32px;">
          <span style="font-size:20px;">⚠️</span>
          <div style="font-size:12.5px; color:#ef4444; font-weight:600; line-height:1.5;">
            <strong>Capacity Deficit Detected:</strong> ${alloc.remainingCount} students could not be scheduled due to insufficient seat limits. 
            Click <strong style="text-decoration:underline; cursor:pointer;" id="deficit-reset-link">Reset</strong> to adjust venues or increase slots count.
          </div>
        </div>
      ` : ''}

      <!-- Grid Matrix Table -->
      <div style="background:rgba(0,0,0,0.15); border:1px solid var(--border-main); border-radius:14px; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-main);">
              <th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; border-right:1px solid var(--border-subtle); width:220px;">Slot Timing</th>
              ${venueCols.map(v => `
                <th style="padding:14px 16px; font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; border-right:1px solid var(--border-subtle);">
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
    `;
  }

  function handleNotifyStudents() {
    if (!activeAllocation) return;
    
    // Broadcast notifications into Store.notifications for simulated real-time system alerts
    const alloc = activeAllocation;
    alloc.notified = true; // Mark schedule as published
    let notifyCount = 0;

    alloc.allocations.forEach(a => {
      // Find candidate details to trigger alert logic
      Store.notifications.unshift({
        id: 'n_' + Date.now() + Math.random().toString(36).substr(2, 4),
        type: 'schedule',
        studentId: a.studentId,
        studentName: a.studentName,
        title: `🗓 Scheduled for ${alloc.company} ${alloc.roundName}`,
        message: `Your recruitment round is scheduled at ${a.venue} during ${a.slotTime} on ${alloc.date}. Please be present 10 minutes prior.`,
        date: new Date().toISOString().split('T')[0],
        unread: true
      });
      notifyCount++;
    });

    saveStore();
    showToast(`Successfully broadcasted schedule notifications to ${notifyCount} students!`, "success");
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
  }

  // Initial render lifecycle mount
  render();
}
