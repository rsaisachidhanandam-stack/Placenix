// ============================================================
// PLACENIX — PUBLIC INSTITUTIONAL WEBSITE
// ============================================================

export async function loadLandingPage(root, Store) {
  root.innerHTML = `
  <style>
    .landing-wrapper { background: #09090b; color: #fff; font-family: 'Inter', sans-serif; }
    
    /* Global Navigation */
    .nav { 
      height: 72px; display: flex; align-items: center; justify-content: space-between; 
      padding: 0 80px; border-bottom: 1px solid rgba(255,255,255,0.05);
      position: sticky; top: 0; background: rgba(9,9,11,0.8); backdrop-filter: blur(12px); z-index: 100;
    }
    .logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; }
    .logo-icon { width: 32px; height: 32px; background: #7c3aed; border-radius: 8px; display: flex; items-center; justify-content: center; }
    
    .nav-links { display: flex; gap: 32px; font-size: 0.9rem; font-weight: 600; color: #a1a1aa; }
    .nav-links a:hover { color: #fff; }

    /* Executive Hero */
    .hero { padding: 120px 80px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); position: relative; overflow: hidden; }
    .hero-badge { 
      display: inline-flex; items-center; padding: 6px 12px; background: rgba(124,58,237,0.1); 
      border: 1px solid rgba(124,58,237,0.2); border-radius: 99px; color: #a78bfa; 
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;
    }
    .hero-title { font-size: 4rem; font-weight: 800; line-height: 1.05; letter-spacing: -0.04em; margin-bottom: 24px; }
    .hero-sub { font-size: 1.25rem; color: #a1a1aa; max-width: 720px; margin: 0 auto 48px; line-height: 1.6; }

    /* Enterprise CTA Group */
    .cta-group { display: flex; gap: 16px; justify-content: center; }
    .btn-main { 
      padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
      display: flex; items-center; gap: 8px;
    }
    .btn-primary-ent { background: #fff; color: #000; border: none; }
    .btn-primary-ent:hover { background: #e4e4e7; transform: translateY(-1px); }
    .btn-secondary-ent { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #fff; }
    .btn-secondary-ent:hover { background: rgba(255,255,255,0.05); }

    /* Trust Metrics */
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; padding: 60px 80px; background: #0c0c0e; }
    .metric-item { text-align: left; }
    .metric-value { font-size: 2.5rem; font-weight: 800; color: #fff; margin-bottom: 4px; letter-spacing: -0.02em; }
    .metric-label { font-size: 0.85rem; color: #71717a; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }

    /* Product Previews (Visual Evidence) */
    .preview-section { padding: 120px 80px; background: #09090b; }
    .preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }
    .preview-card { 
      background: #121214; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 32px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative;
    }
    .mock-header { display: flex; items-center; justify-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .mock-tag { font-size: 10px; padding: 4px 8px; background: rgba(124,58,237,0.2); color: #a78bfa; border-radius: 4px; font-weight: 800; }
    
    .feature-tag { color: #7c3aed; font-weight: 800; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; display: block; }
    .feature-title { font-size: 2.5rem; font-weight: 800; margin-bottom: 24px; letter-spacing: -0.02em; }
    .feature-desc { color: #a1a1aa; line-height: 1.7; font-size: 1.1rem; margin-bottom: 32px; }

    /* Institutional Pricing */
    .pricing { padding: 120px 80px; text-align: center; background: #0c0c0e; }
    .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 64px; }
    .plan-card { 
      padding: 48px; background: #121214; border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; 
      text-align: left; transition: all 0.3s;
    }
    .plan-card.featured { border-color: rgba(124,58,237,0.3); background: #18181b; box-shadow: 0 0 40px rgba(124,58,237,0.05); }
    .plan-name { font-size: 1rem; font-weight: 700; color: #a1a1aa; margin-bottom: 8px; }
    .plan-price { font-size: 3rem; font-weight: 800; margin-bottom: 16px; }
    .plan-price span { font-size: 1rem; color: #71717a; }
    
    .plan-features { margin-top: 32px; display: flex; flex-direction: column; gap: 16px; }
    .feature-item { display: flex; items-center; gap: 12px; font-size: 0.95rem; color: #d4d4d8; }
    .feature-icon { color: #10b981; }

    footer { padding: 80px; background: #09090b; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-between; items-center; }
  </style>

  <div class="landing-wrapper">
    <nav class="nav">
      <div class="logo">
        <div class="logo-icon">🎓</div>
        <span>Placenix</span>
      </div>
      <div class="nav-links">
        <a href="#features">Institutional Capabilities</a>
        <a href="#network">University Network</a>
        <a href="#licensing">Enterprise Licensing</a>
      </div>
      <div class="cta-group">
        <button class="btn-main btn-secondary-ent" onclick="location.hash='login'">Access Workspace</button>
        <button class="btn-main btn-primary-ent" onclick="location.hash='signup'">Register Institution</button>
      </div>
    </nav>

    <header class="hero">
      <div class="hero-badge">Institutional Placement Infrastructure</div>
      <h1 class="hero-title">AI Operating System for<br>University Placements.</h1>
      <p class="hero-sub">The global standard for student employability intelligence, automated recruitment workflows, and institutional placement infrastructure.</p>
      <div class="cta-group">
        <button class="btn-main btn-primary-ent" onclick="location.hash='signup'">Request Institutional Demo</button>
        <button class="btn-main btn-secondary-ent" onclick="location.hash='login'">Executive Workspace</button>
      </div>
    </header>

    <section class="metrics">
      <div class="metric-item">
        <div class="metric-value">200+</div>
        <div class="metric-label">Partner Institutions</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">1.2M</div>
        <div class="metric-label">Resumes Analyzed</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">99.8%</div>
        <div class="metric-label">SLA Uptime</div>
      </div>
      <div class="metric-item">
        <div class="metric-value">140+</div>
        <div class="metric-label">Global Recruiters</div>
      </div>
    </section>

    <section class="preview-section" id="features">
      <div class="preview-grid">
        <div>
          <span class="feature-tag">Intelligence Layer</span>
          <h2 class="feature-title">Real-time Employability Analytics.</h2>
          <p class="feature-desc">Deep-dive into institutional readiness metrics. Analyze department performance, skill distribution heatmaps, and automated student scoring with 0.1s latency.</p>
          <button class="btn-main btn-secondary-ent">Explore Intelligence Modules</button>
        </div>
        <div class="preview-card">
          <div class="mock-header">
            <div class="flex items-center gap-3">
              <div style="width:12px;height:12px;background:#ef4444;border-radius:50%;"></div>
              <div style="width:12px;height:12px;background:#f59e0b;border-radius:50%;"></div>
              <div style="width:12px;height:12px;background:#10b981;border-radius:50%;"></div>
            </div>
            <div class="mock-tag">LIVE TELEMETRY</div>
          </div>
          <div style="height:240px; background:linear-gradient(180deg, rgba(124,58,237,0.1) 0%, transparent 100%); border-radius:12px; border:1px dashed rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px;">
            <div style="font-size:32px; font-weight:800; color:white;">84.2</div>
            <div style="font-size:11px; color:#71717a; text-transform:uppercase; letter-spacing:0.2em;">Avg. Employability Score</div>
          </div>
        </div>
      </div>
    </section>

    <section class="pricing" id="licensing">
      <h2 style="font-size:3rem; font-weight:800; margin-bottom:16px;">Institutional Licensing.</h2>
      <p style="color:#a1a1aa; font-size:1.1rem;">Enterprise infrastructure designed for institutional scale.</p>
      
      <div class="pricing-grid">
        <div class="plan-card">
          <div class="plan-name">Starter Institution</div>
          <div class="plan-price">₹2.4L<span>/yr</span></div>
          <p style="font-size:0.9rem; color:#71717a;">Up to 500 students. Essential placement tracking.</p>
          <div class="plan-features">
            <div class="feature-item"><span class="feature-icon">✓</span> Placement Drive Ops</div>
            <div class="feature-item"><span class="feature-icon">✓</span> Basic Student CRM</div>
            <div class="feature-item"><span class="feature-icon">✓</span> Standard Support</div>
          </div>
          <button class="btn-main btn-secondary-ent" style="width:100%; margin-top:32px;">Initialize Plan</button>
        </div>
        
        <div class="plan-card featured">
          <div class="plan-name" style="color:#a78bfa;">Growth Campus</div>
          <div class="plan-price">₹7.2L<span>/yr</span></div>
          <p style="font-size:0.9rem; color:#71717a;">Up to 2,500 students. Full AI Intelligence suite.</p>
          <div class="plan-features">
            <div class="feature-item"><span class="feature-icon">✓</span> AI Resume Intelligence</div>
            <div class="feature-item"><span class="feature-icon">✓</span> Employability Engine</div>
            <div class="feature-item"><span class="feature-icon">✓</span> Priority Data Success</div>
          </div>
          <button class="btn-main btn-primary-ent" style="width:100%; margin-top:32px; background:#7c3aed; color:white;">Consult with Expert</button>
        </div>

        <div class="plan-card">
          <div class="plan-name">Enterprise University</div>
          <div class="plan-price">Custom</div>
          <p style="font-size:0.9rem; color:#71717a;">Unlimited nodes. Dedicated institutional support.</p>
          <div class="plan-features">
            <div class="feature-item"><span class="feature-icon">✓</span> Multi-campus Sovereignty</div>
            <div class="feature-item"><span class="feature-icon">✓</span> Full API Access</div>
            <div class="feature-item"><span class="feature-icon">✓</span> 99.99% Uptime Guarantee</div>
          </div>
          <button class="btn-main btn-secondary-ent" style="width:100%; margin-top:32px;">Contact Sales</button>
        </div>
      </div>
    </section>

    <footer>
      <div class="logo">🎓 Placenix</div>
      <div style="font-size:0.85rem; color:#71717a;">© 2026 Placenix Technologies Pvt Ltd. Institutional Operating System.</div>
      <div class="flex gap-4" style="font-size:0.85rem; color:#71717a;">
        <a>Legal</a>
        <a>Security</a>
        <a>Privacy</a>
      </div>
    </footer>
  </div>`;
}
