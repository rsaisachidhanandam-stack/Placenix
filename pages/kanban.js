 import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

export async function loadKanbanPage(root, Store) {
  const fallbackDrives = [
    { id: 'drv_tcs_01', company: 'TCS', role: 'Developer', rounds: ['Aptitude', 'Technical', 'HR'], min_cgpa: 7.0, deadline: '2026-07-09' },
    { id: 'drv_inf_02', company: 'Infosys', role: 'System Engineer', rounds: ['Aptitude', 'Technical', 'HR'], min_cgpa: 6.5, deadline: '2026-07-15' }
  ];
  const drives = (Store.drives && Store.drives.length > 0) ? Store.drives : fallbackDrives;
  let selectedDriveId = localStorage.getItem('placenix_selected_pipeline_drive') || (drives[0]?.id || '');
  let selectedDrive = drives.find(d => String(d.id || d.company) === String(selectedDriveId)) || drives[0];
  if (selectedDrive) {
    selectedDriveId = selectedDrive.id || selectedDrive.company;
  }

  // Dynamically build column schema based on the selected drive's rounds
  const driveRounds = selectedDrive?.rounds || ['Aptitude', 'Technical', 'HR'];
  const cols = [
    { id:'applied',     label:'Applied',     color:'#64748B' },
    { id:'shortlisted', label:'Shortlisted',  color:'#3B82F6' },
  ];

  driveRounds.forEach((roundName, i) => {
    const defaultIds = ['aptitude', 'technical', 'hr'];
    const id = defaultIds[i] || `round_${i}`;
    const colors = ['#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981'];
    const color = colors[i % colors.length];
    cols.push({ id, label: roundName, color });
  });

  cols.push({ id:'selected', label:'Selected ✓', color:'#10B981' });

  root.innerHTML = `
<style>
.kanban-board{display:flex;gap:14px;overflow-x:auto;padding-bottom:16px;min-height:600px;}
.kanban-col{flex:0 0 220px;display:flex;flex-direction:column;gap:8px;}
.kanban-col-header{padding:10px 12px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;font-size:.85rem;font-weight:700;border:1px solid;}
.kanban-col-body{flex:1;background:rgba(0,0,0,0.25);border:1px solid var(--glass-border-main);border-radius:12px;padding:10px;min-height:400px;display:flex;flex-direction:column;gap:8px;transition:background .2s;}
.kanban-col-body.drag-over{background:rgba(129,140,248,0.1);border-color:rgba(129,140,248,0.45);}
.kanban-card{background:var(--glass-2);border:1px solid var(--glass-border-main);border-radius:10px;padding:12px;cursor:grab;transition:all .2s;user-select:none;position:relative;}
.kanban-card::before {
  content: '';
  position: absolute;
  top: 0; left: 8%; right: 8%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  pointer-events: none;
}
.kanban-card:hover{border-color:rgba(129,140,248,0.3);box-shadow:var(--shadow-card-hover);transform:translateY(-1px);}
.kanban-card.dragging{opacity:.4;transform:scale(0.96);}
.kanban-card-name{font-size:.85rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;}
.kanban-card-meta{font-size:.75rem;color:var(--text-muted);}
.kanban-avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg, #818cf8, #34d399);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#fff;margin-bottom:8px;}
.pipeline-progress{display:flex;gap:1px;margin-bottom:24px;overflow:hidden;border-radius:10px;background:var(--glass-border-subtle);border:1px solid var(--glass-border-main);}
.pp-step{flex:1;padding:10px 4px;text-align:center;font-size:.75rem;font-weight:700;position:relative;}
.pp-step::after{content:'›';position:absolute;right:-2px;top:50%;transform:translateY(-50%);font-size:1.1rem;color:rgba(255,255,255,.3);}
.pp-step:last-child::after{display:none;}
</style>

<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
  <div>
    <h1 class="page-title">Recruitment Pipeline</h1>
    <p class="page-subtitle">Drag and drop candidates across stages · ${selectedDrive ? selectedDrive.company : 'No Drive'} Drive</p>
  </div>
  <div style="display:flex;gap:12px;align-items:center;">
    <select id="pipeline-drive-select" class="input" style="width:auto;font-size:.85rem;padding:8px 14px;background-color:var(--bg-input);color:var(--text-main);border:1px solid var(--border-subtle);border-radius:var(--radius-sm);">
      ${drives.map(d => `<option value="${d.id}" ${String(d.id) === String(selectedDriveId) ? 'selected' : ''}>${d.company} — ${d.role} (Deadline: ${d.deadline || 'N/A'})</option>`).join('')}
    </select>
    <button id="download-eligible-btn" class="btn btn-primary" style="display:inline-flex;align-items:center;gap:6px;height:40px;font-size:13px;padding:0 16px;">
      📥 Download Eligible Students
    </button>
  </div>
</div>

<!-- Pipeline progress bar -->
<div class="pipeline-progress animate-fade-in-up" id="pipeline-progress-container"></div>

<!-- Kanban board -->
<div class="kanban-board" id="kanban-board"></div>

<!-- Pipeline Candidate Tracker Container -->
<div id="pipeline-candidate-tracker-container" class="animate-fade-in-up" style="margin-top: 40px;"></div>`;

  const state = JSON.parse(JSON.stringify(Store.kanban || {})); // clone
  if (!state.applied) state.applied = [];
  if (!state.shortlisted || state.shortlisted.length === 0) {
    state.shortlisted = [
      { id: '101', name: 'srithikan s', dept: 'CSE', drive: 'TCS', driveId: 'drv_tcs_01', avatar: 'SS' }
    ];
  }
  if (!state.aptitude) state.aptitude = [];
  if (!state.technical) state.technical = [];
  if (!state.hr) state.hr = [];
  if (!state.selected) state.selected = [];

  function renderProgress() {
    const progressContainer = root.querySelector('#pipeline-progress-container');
    if (!progressContainer) return;

    progressContainer.innerHTML = cols.map((c, i) => {
      const count = (state[c.id] || []).filter(card => 
        String(card.driveId) === String(selectedDriveId) || 
        (!card.driveId && selectedDrive && card.drive === selectedDrive.company)
      ).length;

      const bg = i === cols.length - 1 ? 'rgba(16,185,129,.2)' : 'rgba(255,255,255,.03)';
      const col = i === cols.length - 1 ? 'var(--success)' : 'var(--text-muted)';
      return `<div class="pp-step" style="background:${bg};color:${col};">${c.label}<br><strong style="font-size:.9rem;color:${i === cols.length - 1 ? 'var(--success)' : 'var(--text-primary)'};">${count}</strong></div>`;
    }).join('');
  }

  function render() {
    const board = root.querySelector('#kanban-board');
    if (!board) return;
    board.innerHTML = cols.map(col => {
      // Filter cards for the currently selected drive
      const cards = (state[col.id] || []).filter(c => 
        String(c.driveId) === String(selectedDriveId) || 
        (!c.driveId && selectedDrive && c.drive === selectedDrive.company)
      );

      return `
      <div class="kanban-col">
        <div class="kanban-col-header" style="color:${col.color};background:${col.color}18;border-color:${col.color}30;">
          <span>${col.label}</span>
          <span style="background:${col.color}25;padding:2px 8px;border-radius:99px;">${cards.length}</span>
        </div>
        <div class="kanban-col-body" data-col="${col.id}" 
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="handleDrop(event,'${col.id}')">
          ${cards.map(card => `
            <div class="kanban-card" draggable="true" data-id="${card.id}" data-src="${col.id}"
              ondragstart="handleDragStart(event)"
              ondragend="this.classList.remove('dragging')">
              <div class="kanban-avatar">${card.avatar}</div>
              <div class="kanban-card-name">${card.name}</div>
              <div class="kanban-card-meta">${card.dept} · ${card.drive}</div>
            </div>`).join('')}
        </div>
      </div>`;
    }).join('');

    renderCandidateTracker();
  }

  let dragId = null, dragSrc = null;

  window.handleDragStart = (e) => {
    dragId  = e.target.getAttribute('data-id');
    dragSrc = e.target.getAttribute('data-src');
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  };

  window.handleDrop = (e, destCol) => {
    e.preventDefault();
    document.querySelectorAll('.kanban-col-body').forEach(el => el.classList.remove('drag-over'));
    if (!dragId || dragSrc === destCol) return;

    if (!state[destCol]) {
      state[destCol] = [];
    }
    if (!state[dragSrc]) {
      state[dragSrc] = [];
    }

    const cardIdx = state[dragSrc].findIndex(c => c.id === dragId);
    if (cardIdx === -1) return;
    const [card] = state[dragSrc].splice(cardIdx, 1);
    state[destCol].push(card);
    
    // Persist to Store
    Store.kanban = JSON.parse(JSON.stringify(state));
    
    // Update matching student's status in registry to maintain synchronization
    if (Store.students && Array.isArray(Store.students)) {
      const student = Store.students.find(s => String(s.id) === String(dragId));
      if (student) {
        let newStatus = 'Applied';
        if (destCol === 'selected') newStatus = 'Placed';
        else if (destCol === 'shortlisted') newStatus = 'Shortlisted';
        else {
          newStatus = destCol.charAt(0).toUpperCase() + destCol.slice(1);
        }
        student.status = newStatus;
      }
    }
    
    saveStore();
    
    renderProgress();
    render();
  };

  // ── Dropdown Change Listener ──
  const selectEl = root.querySelector('#pipeline-drive-select');
  if (selectEl) {
    selectEl.addEventListener('change', (e) => {
      localStorage.setItem('placenix_selected_pipeline_drive', e.target.value);
      loadKanbanPage(root, Store);
    });
  }

  // ── Download Eligible Students Action ──
  const downloadBtn = root.querySelector('#download-eligible-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      if (!selectedDrive) {
        showToast('No active recruitment drive selected.', 'warning');
        return;
      }

      const minCgpa = parseFloat(selectedDrive.min_cgpa) || 0;
      const allStudents = Store.students || [];

      // Filter eligible students
      const eligibleStudents = allStudents.filter(s => {
        const studentCgpa = parseFloat(s.cgpa) || 0;
        return studentCgpa >= minCgpa;
      });

      if (eligibleStudents.length === 0) {
        showToast(`No students currently meet the minimum criteria of ${minCgpa} CGPA.`, 'warning');
        return;
      }

      // Generate CSV
      const headers = ['Student Name', 'Department', 'CGPA', 'ATS Score', 'Employability Score', 'Placement Status', 'Eligible'];
      const rows = eligibleStudents.map(s => [
        s.name || 'Anonymous Student',
        s.dept || 'General',
        s.cgpa || '—',
        s.atsScore || '—',
        s.empScore || '—',
        s.status || 'Unplaced',
        'Yes'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `eligible_students_${selectedDrive.company.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedDrive.role.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Downloaded list of ${eligibleStudents.length} eligible students!`, 'success');
    });
  }

  function renderCandidateTracker() {
    const container = root.querySelector('#pipeline-candidate-tracker-container');
    if (!container) return;

    if (!selectedDrive) {
      container.innerHTML = '';
      return;
    }

    // Helper: query cards for a specific stage
    const getCardsForStage = (stageId) => {
      return (state[stageId] || []).filter(c => 
        String(c.driveId) === String(selectedDriveId) || 
        (!c.driveId && selectedDrive && c.drive === selectedDrive.company)
      );
    };

    // 1. Shortlisted Candidates (Shortlisted and all subsequent columns)
    const shortlistedCandidates = [];
    for (let i = 1; i < cols.length; i++) {
      shortlistedCandidates.push(...getCardsForStage(cols[i].id));
    }

    // Helper to generate list items HTML
    const getListHtml = (candidates, fallbackText) => {
      if (candidates.length === 0) {
        return `<div style="text-align:center; padding:32px 0; color:var(--text-description); font-size:11.5px; font-style:italic;">${fallbackText}</div>`;
      }
      return candidates.map(c => `
        <div class="pipeline-candidate-chip" style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:rgba(255,255,255,0.015); border:1px solid var(--border-subtle); border-radius:10px; margin-bottom: 8px; transition: all 0.15s ease;" onmouseover="this.style.borderColor='var(--brand-primary)'; this.style.transform='translateY(-1px)'; this.style.background='rgba(255,255,255,0.02)';" onmouseout="this.style.borderColor='var(--border-subtle)'; this.style.transform='none'; this.style.background='rgba(255,255,255,0.015)';">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:24px; height:24px; border-radius:50%; background:var(--gradient-brand, linear-gradient(135deg, #7c3aed, #22d3ee)); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:#fff; border: 1px solid rgba(255, 255, 255, 0.1);">
              ${c.avatar || c.name.substring(0,2).toUpperCase()}
            </div>
            <div>
              <div style="font-size:12px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:130px;">${c.name}</div>
              <div style="font-size:9.5px; color:var(--text-muted);">${c.dept}</div>
            </div>
          </div>
          <span style="font-size:9px; padding:3px 8px; border-radius:100px; font-weight:800; background:rgba(255,255,255,0.04); color:var(--text-muted); border: 1px solid var(--border-main); text-transform: uppercase; letter-spacing: 0.02em;">
            ${c.stage ? c.stage.toUpperCase() : 'STAGE'}
          </span>
        </div>
      `).join('');
    };

    // Build Shortlisted Column HTML
    const shortlistedListHtml = getListHtml(
      shortlistedCandidates.map(c => ({ ...c, stage: getStageLabel(c) })),
      'No candidates shortlisted.'
    );

    // Build Round Tracking Columns
    const roundColumnsHtml = driveRounds.map((roundName, i) => {
      const colIndex = 2 + i;
      const colId = cols[colIndex]?.id || `round_${i}`;
      
      // Appeared: currently in this round column
      const appeared = getCardsForStage(colId);
      
      // Cleared: progressed to any stage after this round column
      const cleared = [];
      for (let j = colIndex + 1; j < cols.length; j++) {
        cleared.push(...getCardsForStage(cols[j].id));
      }

      const appearedListHtml = getListHtml(
        appeared.map(c => ({ ...c, stage: roundName })),
        `No candidates in ${roundName}.`
      );

      const clearedListHtml = getListHtml(
        cleared.map(c => ({ ...c, stage: getStageLabel(c) })),
        `No candidates cleared yet.`
      );

      return `
      <!-- Column for Round ${i + 1}: ${roundName} -->
      <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:16px; height: 100%; min-height: 440px; align-self: stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:12px;">
          <span style="font-weight:700; font-size:13px; color:#fff; display:flex; align-items:center; gap:8px;">
            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#8B5CF6;"></span>
            Round ${i + 1}: ${roundName}
          </span>
        </div>
        
        <!-- Sub-section: Appeared -->
        <div style="flex: 1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:10px; color:var(--text-description); font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Appeared</span>
            <span style="font-size:10px; padding:2px 8px; border-radius:100px; background:rgba(245,158,11,0.1); color:#F59E0B; font-weight:700;">${appeared.length}</span>
          </div>
          <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
            ${appearedListHtml}
          </div>
        </div>
        
        <!-- Sub-section: Cleared -->
        <div style="margin-top:12px; border-top:1px dashed var(--border-subtle); padding-top:12px; flex: 1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:10px; color:var(--text-description); font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Cleared Round</span>
            <span style="font-size:10px; padding:2px 8px; border-radius:100px; background:rgba(16,185,129,0.1); color:#10B981; font-weight:700;">${cleared.length}</span>
          </div>
          <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
            ${clearedListHtml}
          </div>
        </div>
      </div>
      `;
    }).join('');

    container.innerHTML = `
    <div class="card-ent" style="padding: 32px; border: 1px solid var(--border-subtle); background: var(--bg-secondary);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 28px;">
        <div>
          <h3 class="h2-ent" style="font-size:20px; margin:0; color:#fff;">🎯 Recruitment Stage Intelligence</h3>
          <p style="color:var(--text-description); font-size:13px; margin:6px 0 0 0;">Real-time tracking of candidate progression for ${selectedDrive.company}</p>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:24px; align-items: stretch;">
        <!-- Column 1: Shortlisted Candidates -->
        <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px; padding:20px; display:flex; flex-direction:column; gap:16px; height: 100%; min-height: 440px; align-self: stretch;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:12px;">
            <span style="font-weight:700; font-size:13px; color:#fff; display:flex; align-items:center; gap:8px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#3B82F6;"></span>
              Shortlisted Candidates
            </span>
            <span style="font-size:11px; padding:2px 8px; border-radius:100px; background:rgba(59,130,246,0.1); color:#3B82F6; font-weight:700;">${shortlistedCandidates.length}</span>
          </div>
          <div style="flex:1; max-height:360px; overflow-y:auto; padding-right:4px;">
            ${shortlistedListHtml}
          </div>
        </div>
        
        <!-- Columns 2+: Dynamic Round Trackers -->
        ${roundColumnsHtml}
      </div>
    </div>
    `;
  }



  function getStageLabel(card) {
    if (!card) return 'Applied';
    for (const key of Object.keys(state)) {
      if (Array.isArray(state[key]) && state[key].find(c => c && String(c.id) === String(card.id))) {
        const colDef = cols.find(col => col.id === key);
        return colDef ? colDef.label : (key.charAt(0).toUpperCase() + key.slice(1));
      }
    }
    return 'Applied';
  }

  renderProgress();
  render();
}
