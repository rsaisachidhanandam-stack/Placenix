export async function loadRepoPage(root, Store, supabase) {
  root.innerHTML = `
  <div class="page-header">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="page-title">Completed Batches Repository</h1>
        <p class="page-description">Institutional interview intelligence and historical recruitment telemetry.</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-secondary">Filter Repositories</button>
        <button class="btn btn-primary" onclick="showSubmitModal()">Commit Experience</button>
      </div>
    </div>
  </div>

  <div class="grid grid-cols-3" style="grid-template-columns: 2fr 1fr;">
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div class="grid grid-cols-2" id="intv-grid-container"></div>
    </div>

    <div style="display:flex; flex-direction:column; gap:24px;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">Institutional Topic Prevalence</h3></div>
        <div style="display:flex; flex-direction:column; gap:16px; margin-top:12px;">
          ${[['System Design Architecture', 92], ['Advanced Algorithms', 78], ['Behavioral Assessment', 74], ['Database Engineering', 68]].map(([t, v]) => `
            <div>
              <div class="flex justify-between items-center" style="margin-bottom:6px;">
                <span style="font-size:12px; font-weight:600; color:var(--text-description);">${t}</span>
                <span style="font-size:12px; font-weight:700; color:var(--text-main);">${v}%</span>
              </div>
              <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${v}%; background:var(--brand-primary); border-radius:2px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card" style="background:linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(34,211,238,0.03) 100%); border-color:rgba(124,58,237,0.1);">
        <div class="card-header">
          <h3 class="card-title">AI Pattern Intelligence</h3>
          <span class="status-pill status-success" style="font-size:9px;">Active</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top:12px;">
          <div style="font-size:12px; color:var(--text-description); line-height:1.6;">AI has audited 240+ institutional experiences:</div>
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="width:24px; height:24px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:10px;">📌</div>
            <div style="font-size:11px; color:var(--text-muted); line-height:1.4;"><strong style="color:var(--text-main);">Google:</strong> Focuses 70% on DSA and architectural scalability.</div>
          </div>
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div style="width:24px; height:24px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:10px;">📌</div>
            <div style="font-size:11px; color:var(--text-muted); line-height:1.4;"><strong style="color:var(--text-main);">Amazon:</strong> Leadership principles audited in 100% of cases.</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <div id="submit-modal" class="modal-overlay" style="display:none;">
    <div class="modal" style="max-width:640px;">
      <div class="modal-header">
        <h3 class="modal-title">Experience Commitment</h3>
        <button class="btn-ghost" onclick="document.getElementById('submit-modal').style.display='none'">✕</button>
      </div>
      <div class="grid grid-cols-2">
        <div class="input-group"><label class="label">Organization</label><input class="input" placeholder="e.g. Microsoft"></div>
        <div class="input-group"><label class="label">Designated Role</label><input class="input" placeholder="Software Engineer"></div>
      </div>
      <div class="input-group"><label class="label">Interview Assessment Rounds</label><input class="input" placeholder="e.g. Technical I, Architectural Review, HR"></div>
      <div class="grid grid-cols-2">
        <div class="input-group"><label class="label">Difficulty Index</label><select class="input"><option>Low</option><option>Medium</option><option>High</option></select></div>
        <div class="input-group"><label class="label">Outcome Status</label><select class="input"><option>Selected</option><option>Rejected</option></select></div>
      </div>
      <div class="input-group"><label class="label">Full Assessment Narrative</label><textarea class="input" style="height:120px; padding:12px;"></textarea></div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('submit-modal').style.display='none'">Discard</button>
        <button class="btn btn-primary" onclick="document.getElementById('submit-modal').style.display='none'; alert('Experience successfully committed to the institutional intelligence base.')">Commit Experience →</button>
      </div>
    </div>
  </div>
  `;

  const container = document.getElementById('intv-grid-container');
  container.innerHTML = Store.interviews.map(iv => {
    const diffStatus = iv.difficulty === 'Easy' ? 'status-success' : iv.difficulty === 'Hard' ? 'status-danger' : 'status-warning';
    return `
    <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <div class="flex justify-between items-start" style="margin-bottom:16px;">
          <h4 style="font-size:16px; font-weight:800; color:var(--text-main);">${iv.company}</h4>
          <span class="status-pill ${diffStatus}" style="font-size:9px;">${iv.difficulty} Complexity</span>
        </div>
        <div style="font-size:12px; font-weight:600; color:var(--brand-primary);">${iv.role} · ${iv.year}</div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Committed by ${iv.author}</div>
        
        <div class="flex gap-2" style="flex-wrap:wrap; margin:16px 0;">
          ${iv.rounds.map(r => `<span style="font-size:10px; padding:2px 8px; background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:4px; color:var(--text-description);">${r}</span>`).join('')}
        </div>
      </div>
      
      <div class="flex justify-between items-center" style="padding-top:16px; border-top:1px solid var(--border-subtle);">
        <div style="font-size:11px; color:var(--text-muted);">${iv.helpful} helpful audits</div>
        <button class="btn btn-ghost" style="font-size:11px; padding:4px 8px;">View Full Case Study →</button>
      </div>
    </div>`;
  }).join('');

  window.showSubmitModal = () => document.getElementById('submit-modal').style.display = 'flex';
}
