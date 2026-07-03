// ============================================================
// PLACENIX — AI INTELLIGENCE LABORATORY (v2.4)
// ============================================================

export async function loadAIPage(root, Store, supabase) {
  const user = Store.session?.user;
  
  root.innerHTML = `
  <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
    
    <!-- Operational Header -->
    <div style="display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Advanced Intelligence Node</div>
        <h1 class="h1-ent" style="font-size:32px;">Intelligence Laboratory</h1>
        <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Elite diagnostic and predictive models for career-critical outcomes.</p>
      </div>
      <div style="display:flex; gap:12px;">
        <span class="status-pill" style="background:rgba(124,58,237,0.1); color:var(--brand-primary); border-color:var(--brand-primary-light); font-size:10px; font-weight:800;">CORE ENGINE: 1.5 FLASH</span>
        <span class="status-pill" style="background:rgba(245,158,11,0.1); color:var(--warning); border-color:rgba(245,158,11,0.2); font-size:10px; font-weight:800;">LAB ACTIVE</span>
      </div>
    </div>

    <!-- Featured Intelligence Node -->
    <div class="card-ent" style="padding:48px; background:linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(14,165,233,0.05) 100%); border:1px solid rgba(139,92,246,0.2);">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="max-width:700px;">
          <h3 class="h2-ent" style="font-size:24px; margin-bottom:16px;">Predictive Placement Neural Engine</h3>
          <p style="font-size:15px; color:var(--text-description); line-height:1.7; margin-bottom:32px;">
            Our proprietary neural models process millions of institutional data points, student profiles, and historical recruitment telemetry to provide ultra-accurate placement probability matrices for global recruiters.
          </p>
          <div style="display:flex; gap:40px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:10px; height:100%; height:40px; background:var(--brand-primary); border-radius:100px;"></div>
              <div>
                <div class="metric-ent" style="font-size:20px;">91%</div>
                <div class="label-ent" style="font-size:9px;">PRECISION RATE</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:10px; height:100%; height:40px; background:var(--brand-secondary); border-radius:100px;"></div>
              <div>
                <div class="metric-ent" style="font-size:20px;">REAL-TIME</div>
                <div class="label-ent" style="font-size:9px;">TELEMETRY SCAN</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:10px; height:100%; height:40px; background:#10B981; border-radius:100px;"></div>
              <div>
                <div class="metric-ent" style="font-size:20px;">HOURLY</div>
                <div class="label-ent" style="font-size:9px;">MODEL TUNING</div>
              </div>
            </div>
          </div>
        </div>
        <div style="font-size:120px; opacity:0.1; position:absolute; right:48px; pointer-events:none;">🧠</div>
      </div>
    </div>

    <!-- Intelligence Modules Grid -->
    <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap: 32px;">
      ${[
        { icon:'🎤', name:'Mock Interview Simulator', status:'Operational', desc:'High-fidelity behavioral and technical simulation with adaptive questioning and real-time response auditing.', metrics:{Precision:'94%',Registry:'12K+',Latency:'<1s'}, action:'Launch Simulation' },
        { icon:'📝', name:'Resume Intelligence Engine', status:'Production', desc:'Generative ATS optimization model that tailors professional metadata for elite corporate job descriptions.', metrics:{'Score Boost':'+34%',Templates:'120+',Compute:'High'}, action:'Analyze Resume' },
        { icon:'🧭', name:'Strategic Career Architect', status:'Production', desc:'Predictive pathing model based on market demand telemetry and institutional historical outcomes.', metrics:{Precision:'89%',Paths:'240+',Data:'Active'}, action:'Architect Path' },
        { icon:'🔮', name:'Placement Probability Model', status:'Production', desc:'ML-powered probability engine for outcome predictions based on comprehensive profile telemetry.', metrics:{Precision:'91%',Variables:'150+',Tuning:'Live'}, action:'Predict Outcome' },
      ].map(m => `
        <div class="card-ent" style="display:flex; flex-direction:column; justify-content:space-between; padding:40px; transition: all 0.3s ease;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px;">
              <div style="width:56px; height:56px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:16px; display:flex; align-items:center; justify-content:center; font-size:28px;">${m.icon}</div>
              <div style="background:${m.status === 'Operational' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'}; 
                          color:${m.status === 'Operational' ? 'var(--warning)' : 'var(--brand-secondary)'}; 
                          padding:6px 14px; border-radius:100px; font-size:10px; font-weight:800; letter-spacing:0.05em;">
                ${m.status.toUpperCase()}
              </div>
            </div>
            <h4 class="h2-ent" style="font-size:20px; margin-bottom:12px;">${m.name}</h4>
            <p style="font-size:14px; color:var(--text-description); line-height:1.7; margin-bottom:32px;">${m.desc}</p>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px; padding:20px; background:rgba(0,0,0,0.2); border:1px solid var(--border-main); border-radius:16px; margin-bottom:32px;">
              ${Object.entries(m.metrics).map(([k,v]) => `
                <div style="text-align:center;">
                  <div style="font-size:14px; font-weight:800; color:var(--brand-primary);">${v}</div>
                  <div class="label-ent" style="font-size:9px; margin-top:4px;">${k.toUpperCase()}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <button class="btn-premium" style="width:100%; height:52px; font-size:14px;" onclick="launchModule('${m.name}')">${m.action} →</button>
        </div>
      `).join('')}
    </div>
  </div>
  `;

  window.launchModule = (n) => {
    if (n.includes('Resume')) window.location.hash = '#resume-analysis';
    else if (n.includes('Career')) window.location.hash = '#employability';
    else if (n.includes('Interview')) window.location.hash = '#virtual-interview';
    else alert(`Initializing ${n} environment. Transitioning to professional simulation room...`);
  };
}
