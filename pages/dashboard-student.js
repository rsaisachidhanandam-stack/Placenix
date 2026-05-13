// ============================================================
// PLACENIX — BALANCED INTELLIGENCE OPERATING SYSTEM (v2.4)
// ============================================================

export async function loadStudentDash(root, Store, supabase) {
  const user = Store.session?.user;
  if (!user) {
    root.innerHTML = `<div style="padding:100px; text-align:center; color:var(--text-description);">Institutional session expired. Please re-authenticate.</div>`;
    return;
  }

  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Operational Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Institutional Workspace</div>
          <h1 class="h1-ent">Operational Intelligence</h1>
        </div>
        <div style="display:flex; gap:16px;">
          <div style="background:var(--bg-card); border:1px solid var(--border-main); padding:8px 16px; border-radius:10px; display:flex; align-items:center; gap:12px; font-size:12px; font-weight:700;">
            <div style="width:8px; height:8px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 8px var(--brand-secondary);"></div>
            System Operational
          </div>
        </div>
      </div>

      <!-- Metric Infrastructure -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
        <div class="card-ent" style="background: linear-gradient(145deg, var(--bg-card), rgba(139,92,246,0.05));">
          <div class="label-ent" style="margin-bottom: 16px;">Employability Node</div>
          <div class="metric-ent">84.2</div>
          <div style="height:4px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden; margin-top:16px;">
            <div style="width:84.2%; height:100%; background:var(--brand-primary); box-shadow:0 0 12px var(--brand-primary);"></div>
          </div>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Active Engagements</div>
          <div class="metric-ent">12</div>
          <p style="font-size:12px; color:var(--text-description); margin-top:8px;">4 Pending institutional reviews</p>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Market Readiness</div>
          <div class="metric-ent">Tier 1</div>
          <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Top 5% of Department Node</p>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Pipeline Velocity</div>
          <div class="metric-ent">08</div>
          <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Current conversion: <span style="color:var(--brand-secondary);">37.5%</span></p>
        </div>
      </div>

      <!-- Primary Content Area -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 40px;">
        
        <div style="display:flex; flex-direction:column; gap:40px;">
          <!-- Trajectory Panel -->
          <div class="card-ent" style="padding:48px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:48px;">
              <div>
                <h2 class="h2-ent">Employability Neural Trend</h2>
                <p style="color:var(--text-description); font-size:14px; margin-top:4px;">Diagnostic trajectory for comprehensive career readiness.</p>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border-main); padding:8px 16px; border-radius:8px; font-size:11px; font-weight:800; color:var(--text-muted);">LIVE TELEMETRY</div>
            </div>
            
            <div style="height:320px; width:100%; position:relative;">
              <svg width="100%" height="100%" viewBox="0 0 800 320" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--brand-primary)" stop-opacity="0.15"/>
                    <stop offset="100%" stop-color="var(--brand-primary)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,280 Q150,260 300,180 T600,120 T800,40 L800,320 L0,320 Z" fill="url(#chartGrad)"/>
                <path d="M0,280 Q150,260 300,180 T600,120 T800,40" fill="none" stroke="var(--brand-primary)" stroke-width="3" stroke-linecap="round"/>
                <circle cx="300" cy="180" r="5" fill="#fff" stroke="var(--brand-primary)" stroke-width="3"/>
                <circle cx="800" cy="40" r="5" fill="#fff" stroke="var(--brand-primary)" stroke-width="3"/>
              </svg>
              <div style="position:absolute; bottom:40px; right:40px; background:rgba(0,0,0,0.4); backdrop-filter:blur(10px); border:1px solid var(--brand-primary); padding:16px 24px; border-radius:12px;">
                <div class="label-ent" style="color:var(--brand-primary); font-size:9px; margin-bottom:4px;">Current Prediction</div>
                <div style="font-weight:800; color:#fff; font-size:14px;">Tier 1 High Probability</div>
              </div>
            </div>
          </div>

          <!-- Action Node -->
          <div class="card-ent" style="padding:40px;">
            <h2 class="h2-ent" style="margin-bottom:32px;">Institutional Action Center</h2>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
              <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:16px; padding:32px; display:flex; flex-direction:column; justify-content:space-between; height:180px;">
                <div>
                  <div style="font-weight:700; font-size:15px; color:#fff; margin-bottom:8px;">Google Institutional Node</div>
                  <div class="label-ent" style="font-size:9px;">SDE-1 • Closes in 14h</div>
                </div>
                <button class="btn-premium" onclick="window.location.hash='new-applications'">Commence Application</button>
              </div>
              <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:16px; padding:32px; display:flex; flex-direction:column; justify-content:space-between; height:180px;">
                <div>
                  <div style="font-weight:700; font-size:15px; color:#fff; margin-bottom:8px;">Meta University Network</div>
                  <div class="label-ent" style="font-size:9px;">Screening in Progress</div>
                </div>
                <button class="btn-premium-ghost">Track Progression</button>
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:40px;">
          <!-- Intelligence Feed -->
          <div class="card-ent" style="padding:40px;">
            <div class="label-ent" style="color:var(--brand-primary); margin-bottom:32px;">Operational Intelligence</div>
            <div style="display:flex; flex-direction:column; gap:32px;">
              <div style="position:relative; padding-left:24px; border-left:1px solid var(--border-subtle);">
                <div style="position:absolute; left:-4.5px; top:0; width:8px; height:8px; background:var(--brand-primary); border-radius:50%; box-shadow:0 0 10px var(--brand-primary);"></div>
                <div style="font-weight:700; color:#fff; font-size:13px; margin-bottom:4px;">Node Sync Complete</div>
                <p style="font-size:12px; color:var(--text-description); line-height:1.6;">Resume parsed for FinTech infrastructure alignment. Match: 88%.</p>
                <div class="label-ent" style="font-size:9px; margin-top:8px;">2h 14m ago</div>
              </div>
              <div style="position:relative; padding-left:24px; border-left:1px solid var(--border-subtle);">
                <div style="position:absolute; left:-4.5px; top:0; width:8px; height:8px; background:var(--text-muted); border-radius:50%;"></div>
                <div style="font-weight:700; color:#fff; font-size:13px; margin-bottom:4px;">Skill Radar Update</div>
                <p style="font-size:12px; color:var(--text-description); line-height:1.6;">Cloud Architecture certification verified by Dept. Node.</p>
                <div class="label-ent" style="font-size:9px; margin-top:8px;">Yesterday</div>
              </div>
            </div>
          </div>

          <!-- Quick Governance -->
          <div class="card-ent" style="padding:40px;">
            <div class="label-ent" style="margin-bottom:24px;">Governance Links</div>
            <div style="display:flex; flex-direction:column; gap:12px;">
              <a href="#queries" class="gov-link">Institutional Query</a>
              <a href="#resume-analysis" class="gov-link">Execute Neural Scan</a>
              <a href="#skill-analysis" class="gov-link">Infrastructure Audit</a>
            </div>
          </div>
        </div>

      </div>
    </div>

    <style>
      .btn-premium {
        background: var(--brand-primary); color: #fff; border: none; padding: 12px 20px; 
        border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: var(--t-fast);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
      }
      .btn-premium:hover { filter: brightness(1.1); transform: translateY(-1px); }

      .btn-premium-ghost {
        background: rgba(255,255,255,0.02); color: var(--text-description); border: 1px solid var(--border-main); 
        padding: 12px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: var(--t-fast);
      }
      .btn-premium-ghost:hover { background: var(--bg-hover); color: #fff; }

      .gov-link {
        display: block; padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-main);
        border-radius: 12px; color: var(--text-description); font-size: 13px; font-weight: 600; text-decoration: none; transition: var(--t-fast);
      }
      .gov-link:hover { color: #fff; border-color: var(--brand-primary); transform: translateX(4px); background: var(--bg-hover); }
    </style>
  `;
}
