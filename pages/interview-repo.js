export async function loadInterviewPage(root, Store) {
  root.innerHTML = `
<style>
.intv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px;}
.intv-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;padding:22px;transition:all .3s;}
.intv-card:hover{border-color:var(--border-glow);transform:translateY(-2px);box-shadow:var(--shadow-card-hover);}
.intv-company{font-size:1rem;font-weight:800;color:var(--text-primary);margin-bottom:2px;}
.intv-role{font-size:.8rem;color:var(--text-secondary);}
.intv-rounds{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0;}
.intv-round{padding:3px 10px;background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.2);border-radius:99px;font-size:.72rem;font-weight:600;color:var(--brand-violet-light);}
.intv-meta-row{display:flex;gap:12px;flex-wrap:wrap;font-size:.78rem;color:var(--text-muted);margin-bottom:12px;}
.diff-easy{color:var(--success);}
.diff-medium{color:var(--warning);}
.diff-hard{color:var(--danger);}
</style>
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
  <div>
    <h1 class="page-title">Interview Experience Repository</h1>
    <p class="page-subtitle">AI-curated real interview experiences from placed students</p>
  </div>
  <button class="btn btn-primary" onclick="showSubmitModal()">+ Share Experience</button>
</div>

<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:24px;">
  ${['All','Easy','Medium','Hard'].map((d,i)=>`<button class="chip ${i===0?'selected':''}">${d}</button>`).join('')}
  ${['Google','Amazon','TCS','Infosys','Microsoft'].map(c=>`<button class="chip">${c}</button>`).join('')}
</div>

<div style="display:grid;grid-template-columns:3fr 1fr;gap:20px;">
  <div class="intv-grid" id="intv-grid"></div>
  <div>
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header"><div class="card-title">Top Asked Topics</div></div>
      ${[['Arrays & Strings',92],['Dynamic Programming',78],['System Design',74],['Trees & Graphs',68],['Leadership Principles',61],['OS/DBMS Concepts',54]].map(([t,v])=>`
        <div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:3px;"><span style="color:var(--text-secondary);">${t}</span><span style="font-weight:700;color:var(--text-primary);">${v}%</span></div>
          <div style="height:5px;background:rgba(255,255,255,.05);border-radius:99px;overflow:hidden;"><div style="width:${v}%;height:100%;background:var(--gradient-brand);border-radius:99px;"></div></div>
        </div>`).join('')}
    </div>
    <div class="ai-widget">
      <div class="ai-widget-header"><span class="ai-badge">🤖 AI</span><span class="ai-widget-title">Pattern Insights</span></div>
      <div class="ai-widget-body">
        <p style="margin-bottom:10px;">AI has analyzed 240+ interview experiences. Key findings:</p>
        <ul style="display:flex;flex-direction:column;gap:8px;padding-left:0;list-style:none;">
          <li style="font-size:.8rem;">📌 <strong>Google</strong> focuses 70% on DSA + 30% on System Design</li>
          <li style="font-size:.8rem;">📌 <strong>Amazon</strong> asks LP questions in every round</li>
          <li style="font-size:.8rem;">📌 <strong>TCS Digital</strong> always includes SQL & Java OOP</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<div id="submit-modal" style="display:none;" class="modal-overlay" onclick="if(event.target===this)this.style.display='none'">
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-header">
      <h2 class="modal-title">Share Interview Experience</h2>
      <button onclick="document.getElementById('submit-modal').style.display='none'" class="btn-icon">✕</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="input-group"><label class="input-label">Company</label><input class="input" placeholder="e.g. Google"></div>
        <div class="input-group"><label class="input-label">Role</label><input class="input" placeholder="SDE I"></div>
      </div>
      <div class="input-group"><label class="input-label">Rounds (comma separated)</label><input class="input" placeholder="Online Assessment, Technical 1, HR"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="input-group"><label class="input-label">Difficulty</label><select class="input"><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
        <div class="input-group"><label class="input-label">Result</label><select class="input"><option>Selected</option><option>Rejected</option><option>In Progress</option></select></div>
      </div>
      <div class="input-group"><label class="input-label">Experience Details</label><textarea class="input" rows="4" placeholder="Describe each round, questions asked, topics covered…" style="resize:vertical;"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="document.getElementById('submit-modal').style.display='none'">Cancel</button>
      <button class="btn btn-primary" onclick="document.getElementById('submit-modal').style.display='none';alert('Experience shared! AI will analyze and publish it shortly.')">Submit Experience →</button>
    </div>
  </div>
</div>`;

  document.getElementById('intv-grid').innerHTML = Store.interviews.map(iv => {
    const diffClass = iv.difficulty === 'Easy' ? 'diff-easy' : iv.difficulty === 'Hard' ? 'diff-hard' : 'diff-medium';
    return `
    <div class="intv-card">
      <div class="intv-company">${iv.company}</div>
      <div class="intv-role">${iv.role} · ${iv.year}</div>
      <div class="intv-meta-row">
        <span class="${diffClass}">● ${iv.difficulty}</span>
        <span class="${iv.result==='Selected'?'badge-success':''}" style="color:${iv.result==='Selected'?'var(--success)':'var(--text-muted)'};">✓ ${iv.result}</span>
        <span>by ${iv.author}</span>
      </div>
      <div class="intv-rounds">${iv.rounds.map(r=>`<span class="intv-round">${r}</span>`).join('')}</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;">${iv.tags.map(t=>`<span class="chip">${t}</span>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:.78rem;color:var(--text-muted);">👍 ${iv.helpful} found this helpful</span>
        <button class="btn btn-sm btn-secondary">Read Full →</button>
      </div>
    </div>`;
  }).join('');

  window.showSubmitModal = () => {
    document.getElementById('submit-modal').style.display = 'flex';
  };
}
