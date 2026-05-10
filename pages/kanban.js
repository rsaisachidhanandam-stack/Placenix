export async function loadKanbanPage(root, Store) {
  const cols = [
    { id:'applied',     label:'Applied',     color:'#64748B' },
    { id:'shortlisted', label:'Shortlisted',  color:'#3B82F6' },
    { id:'aptitude',    label:'Aptitude',     color:'#F59E0B' },
    { id:'technical',   label:'Technical',    color:'#8B5CF6' },
    { id:'hr',          label:'HR Round',     color:'#EC4899' },
    { id:'selected',    label:'Selected ✓',   color:'#10B981' },
  ];

  root.innerHTML = `
<style>
.kanban-board{display:flex;gap:14px;overflow-x:auto;padding-bottom:16px;min-height:600px;}
.kanban-col{flex:0 0 220px;display:flex;flex-direction:column;gap:8px;}
.kanban-col-header{padding:10px 12px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;font-size:.8rem;font-weight:700;border:1px solid;}
.kanban-col-body{flex:1;background:rgba(255,255,255,.02);border:1px solid var(--border-subtle);border-radius:12px;padding:10px;min-height:400px;display:flex;flex-direction:column;gap:8px;transition:background .2s;}
.kanban-col-body.drag-over{background:rgba(124,58,237,.08);border-color:rgba(124,58,237,.3);}
.kanban-card{background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:10px;padding:12px;cursor:grab;transition:all .2s;user-select:none;}
.kanban-card:hover{border-color:var(--border-medium);box-shadow:var(--shadow-md);}
.kanban-card.dragging{opacity:.4;transform:scale(0.96);}
.kanban-card-name{font-size:.85rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;}
.kanban-card-meta{font-size:.75rem;color:var(--text-muted);}
.kanban-avatar{width:28px;height:28px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:#fff;margin-bottom:8px;}
.pipeline-progress{display:flex;gap:0;margin-bottom:24px;overflow:hidden;border-radius:10px;}
.pp-step{flex:1;padding:10px 4px;text-align:center;font-size:.7rem;font-weight:700;position:relative;}
.pp-step::after{content:'›';position:absolute;right:-2px;top:50%;transform:translateY(-50%);font-size:1.1rem;color:rgba(255,255,255,.3);}
.pp-step:last-child::after{display:none;}
</style>

<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
  <div>
    <h1 class="page-title">Recruitment Pipeline</h1>
    <p class="page-subtitle">Drag and drop candidates across stages · TCS Digital Drive</p>
  </div>
  <div style="display:flex;gap:10px;">
    <select class="input" style="width:auto;font-size:.85rem;padding:8px 14px;">
      <option>TCS Digital — Software Engineer</option>
      <option>Infosys — Systems Engineer</option>
      <option>Zoho — MTS</option>
    </select>
    <button class="btn btn-secondary btn-sm">📊 Analytics</button>
  </div>
</div>

<!-- Pipeline progress bar -->
<div class="pipeline-progress animate-fade-in-up">
  ${cols.map((c,i) => {
    const count = (Store.kanban[c.id]||[]).length;
    const bg = i===5?'rgba(16,185,129,.2)':'rgba(255,255,255,.03)';
    const col = i===5?'var(--success)':'var(--text-muted)';
    return `<div class="pp-step" style="background:${bg};color:${col};">${c.label}<br><strong style="font-size:.9rem;color:${i===5?'var(--success)':'var(--text-primary)'};">${count}</strong></div>`;
  }).join('')}
</div>

<!-- Kanban board -->
<div class="kanban-board" id="kanban-board"></div>`;

  const board = document.getElementById('kanban-board');
  const state = JSON.parse(JSON.stringify(Store.kanban)); // clone

  function render() {
    board.innerHTML = cols.map(col => {
      const cards = state[col.id] || [];
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
    const cardIdx = state[dragSrc].findIndex(c => c.id === dragId);
    if (cardIdx === -1) return;
    const [card] = state[dragSrc].splice(cardIdx, 1);
    state[destCol].push(card);
    render();
  };

  render();
}
