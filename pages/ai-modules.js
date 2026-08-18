// ============================================================
// PLACENIX — AI INTELLIGENCE LABORATORY (v2.5)
// ============================================================

export async function loadAIPage(root, Store, supabase) {
  const user = Store.session?.user;
  
  root.innerHTML = `
  <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
    
    <!-- Operational Header -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary); letter-spacing:0.12em;">Advanced Intelligence Node</div>
        <h1 class="h1-ent" style="font-size:32px;">Intelligence Laboratory</h1>
        <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Elite diagnostic and predictive models for career-critical outcomes.</p>
      </div>
      <div style="display:flex; gap:12px;">
        <span class="status-pill" style="background:rgba(0,200,255,0.1); color:var(--brand-primary); border-color:var(--brand-primary-light); font-size:10px; font-weight:800;">CORE ENGINE: 1.5 FLASH</span>
        <span class="status-pill" style="background:rgba(245,158,11,0.1); color:var(--brand-secondary); border-color:rgba(245,158,11,0.2); font-size:10px; font-weight:800;">LAB ACTIVE</span>
      </div>
    </div>

    <!-- Featured Intelligence Node -->
    <div class="card-ent" style="padding:44px; position:relative; overflow:hidden; background:linear-gradient(135deg, rgba(0,200,255,0.08) 0%, rgba(245,158,11,0.04) 100%); border:1px solid rgba(0,200,255,0.25); border-radius:24px;">
      <div style="position:absolute; top:0; left:10%; right:10%; height:1px; background:linear-gradient(90deg, transparent, rgba(0,200,255,0.4), transparent);"></div>
      <div style="display:flex; justify-content:space-between; align-items:center; position:relative; z-index:2;">
        <div style="max-width:720px;">
          <div style="display:inline-flex; align-items:center; gap:8px; padding:5px 14px; background:rgba(0,200,255,0.1); border:1px solid rgba(0,200,255,0.25); border-radius:99px; font-size:10px; font-weight:800; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:16px;">
            <span>⚡ Proprietary Neural Suite</span>
          </div>
          <h3 class="h2-ent" style="font-size:26px; margin-bottom:16px; letter-spacing:-0.03em;">Predictive Placement Neural Engine</h3>
          <p style="font-size:15px; color:var(--text-description); line-height:1.7; margin-bottom:32px;">
            Our proprietary neural models process millions of institutional data points, student profiles, and historical recruitment telemetry to provide ultra-accurate placement probability matrices for global recruiters.
          </p>
          <div style="display:flex; gap:28px;">
            <div style="display:flex; align-items:center; gap:14px; padding:12px 20px; background:rgba(5,8,16,0.65); border:1px solid rgba(0,200,255,0.15); border-radius:14px;">
              <div style="width:4px; height:36px; background:var(--brand-primary); border-radius:100px; box-shadow:0 0 10px rgba(0,200,255,0.5);"></div>
              <div>
                <div class="metric-ent" style="font-size:22px; color:#F0F6FF;">91%</div>
                <div class="label-ent" style="font-size:9px; color:var(--brand-primary);">PRECISION RATE</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:14px; padding:12px 20px; background:rgba(5,8,16,0.65); border:1px solid rgba(245,158,11,0.15); border-radius:14px;">
              <div style="width:4px; height:36px; background:var(--brand-secondary); border-radius:100px; box-shadow:0 0 10px rgba(245,158,11,0.5);"></div>
              <div>
                <div class="metric-ent" style="font-size:22px; color:#F0F6FF;">REAL-TIME</div>
                <div class="label-ent" style="font-size:9px; color:var(--brand-secondary);">TELEMETRY SCAN</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:14px; padding:12px 20px; background:rgba(5,8,16,0.65); border:1px solid rgba(16,185,129,0.15); border-radius:14px;">
              <div style="width:4px; height:36px; background:#10B981; border-radius:100px; box-shadow:0 0 10px rgba(16,185,129,0.5);"></div>
              <div>
                <div class="metric-ent" style="font-size:22px; color:#F0F6FF;">HOURLY</div>
                <div class="label-ent" style="font-size:9px; color:#10B981;">MODEL TUNING</div>
              </div>
            </div>
          </div>
        </div>
        <div style="font-size:120px; opacity:0.12; position:absolute; right:48px; pointer-events:none; filter:drop-shadow(0 0 20px var(--brand-primary));">🧠</div>
      </div>
    </div>

    <!-- Intelligence Modules Grid -->
    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 32px;">
      ${[
        { icon:'🎙️', name:'Mock Interview Simulator', tag:'FEATURED SIMULATOR', status:'Operational', desc:'High-fidelity behavioral and technical simulation with adaptive questioning and real-time response auditing.', metrics:{Precision:'94%',Registry:'12K+',Latency:'<1s'}, action:'Launch Simulation' },
        { icon:'📄', name:'Resume Intelligence Engine', tag:'ATS OPTIMIZER', status:'Production', desc:'Generative ATS optimization model that tailors professional metadata for elite corporate job descriptions.', metrics:{'Score Boost':'+34%',Templates:'120+',Compute:'High'}, action:'Analyze Resume' },
        { icon:'🧭', name:'Strategic Career Architect', tag:'PATHFINDER', status:'Production', desc:'Predictive pathing model based on market demand telemetry and institutional historical outcomes.', metrics:{Precision:'89%',Paths:'240+',Data:'Active'}, action:'Architect Path' },
        { icon:'🔮', name:'Placement Probability Model', tag:'PREDICTIVE AI', status:'Production', desc:'ML-powered probability engine for outcome predictions based on comprehensive profile telemetry.', metrics:{Precision:'91%',Variables:'150+',Tuning:'Live'}, action:'Predict Outcome' },
      ].map(m => `
        <div class="card-ent module-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:36px; border-radius:20px; background:var(--bg-card); border:1px solid rgba(0,200,255,0.12); position:relative; overflow:hidden; transition:all 0.3s ease;">
          <div style="position:absolute; top:0; left:12%; right:12%; height:1px; background:linear-gradient(90deg, transparent, rgba(0,200,255,0.25), transparent);"></div>
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px;">
              <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:52px; height:52px; background:rgba(0,200,255,0.08); border:1px solid rgba(0,200,255,0.2); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; box-shadow:0 4px 12px rgba(0,0,0,0.3);">${m.icon}</div>
                <div>
                  <div style="font-size:10px; font-weight:800; color:var(--brand-primary); letter-spacing:0.08em; text-transform:uppercase;">${m.tag}</div>
                  <h4 class="h2-ent" style="font-size:20px; margin-top:2px;">${m.name}</h4>
                </div>
              </div>
              <div style="background:${m.status === 'Operational' ? 'rgba(245,158,11,0.12)' : 'rgba(0,200,255,0.12)'}; 
                          color:${m.status === 'Operational' ? 'var(--brand-secondary)' : 'var(--brand-primary)'}; 
                          border:1px solid ${m.status === 'Operational' ? 'rgba(245,158,11,0.25)' : 'rgba(0,200,255,0.25)'};
                          padding:5px 14px; border-radius:100px; font-size:10px; font-weight:800; letter-spacing:0.06em;">
                ${m.status.toUpperCase()}
              </div>
            </div>
            
            <p style="font-size:14px; color:var(--text-description); line-height:1.7; margin-bottom:28px; min-height:48px;">${m.desc}</p>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:12px; padding:18px; background:rgba(5,8,16,0.65); border:1px solid rgba(0,200,255,0.1); border-radius:14px; margin-bottom:28px;">
              ${Object.entries(m.metrics).map(([k,v]) => `
                <div style="text-align:center;">
                  <div style="font-size:15px; font-weight:800; color:var(--brand-primary); font-family:var(--font-display);">${v}</div>
                  <div class="label-ent" style="font-size:9px; margin-top:3px; color:var(--text-muted);">${k.toUpperCase()}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <button class="btn-premium" style="width:100%; height:48px; font-size:14px; gap:10px;" onclick="launchModule('${m.name}')">
            <span>${m.action}</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </button>
        </div>
      `).join('')}
    </div>
  </div>

  <style>
    .module-card:hover {
      border-color: rgba(0, 200, 255, 0.35) !important;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 200, 255, 0.12) !important;
      transform: translateY(-4px);
    }
  </style>
  `;

  window.launchModule = (n) => {
    if (n.includes('Resume')) window.location.hash = '#resume-analysis';
    else if (n.includes('Career')) window.location.hash = '#employability';
    else if (n.includes('Interview')) window.location.hash = '#virtual-interview';
    else alert(`Initializing ${n} environment. Transitioning to professional simulation room...`);
  };
}
