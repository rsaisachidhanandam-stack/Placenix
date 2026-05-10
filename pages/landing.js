export function loadLandingPage(root) {
  root.innerHTML = getLandingHTML();
  initLanding();
}

function getLandingHTML() {
  return `
<style>
.landing-nav{position:fixed;top:0;left:0;right:0;z-index:var(--z-topbar);padding:16px 32px;display:flex;align-items:center;justify-content:space-between;background:rgba(5,7,26,0.8);backdrop-filter:blur(20px);border-bottom:1px solid var(--border-subtle);}
.landing-logo{display:flex;align-items:center;gap:10px;text-decoration:none;}
.landing-logo-icon{width:36px;height:36px;background:var(--gradient-brand);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:var(--shadow-glow-violet);}
.landing-logo-text{font-family:var(--font-display);font-size:1.25rem;font-weight:800;background:var(--gradient-text);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.nav-links{display:flex;align-items:center;gap:8px;}
.nav-links a{padding:8px 16px;color:var(--text-secondary);font-size:.875rem;font-weight:500;text-decoration:none;border-radius:8px;transition:all .2s;}
.nav-links a:hover{color:var(--text-primary);background:var(--bg-card-hover);}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;padding:120px 32px 80px;}
.hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 60% 30%,rgba(124,58,237,.25) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 20% 80%,rgba(34,211,238,.15) 0%,transparent 70%);animation:hero-bg-pulse 6s ease-in-out infinite;}
.hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);background-size:60px 60px;}
.hero-inner{max-width:900px;text-align:center;position:relative;z-index:1;}
.hero-badge{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.3);border-radius:99px;font-size:.75rem;font-weight:700;color:var(--brand-violet-light);text-transform:uppercase;letter-spacing:.08em;margin-bottom:24px;animation:fadeInUp .5s ease both;}
.hero-title{font-family:var(--font-display);font-size:clamp(2.5rem,6vw,4.5rem);font-weight:800;line-height:1.1;margin-bottom:24px;animation:fadeInUp .5s ease .1s both;}
.hero-title span{background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hero-sub{font-size:1.125rem;color:var(--text-secondary);max-width:600px;margin:0 auto 40px;line-height:1.7;animation:fadeInUp .5s ease .2s both;}
.hero-cta{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;animation:fadeInUp .5s ease .3s both;}
.hero-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;max-width:800px;margin:80px auto 0;animation:fadeInUp .5s ease .5s both;}
.hstat{text-align:center;padding:24px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;backdrop-filter:blur(10px);}
.hstat-val{font-family:var(--font-display);font-size:2rem;font-weight:800;background:var(--gradient-text);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.hstat-lbl{font-size:.8rem;color:var(--text-muted);margin-top:4px;}
.features{padding:100px 32px;max-width:1200px;margin:0 auto;}
.section-header{text-align:center;margin-bottom:60px;}
.section-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 14px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.25);border-radius:99px;font-size:.75rem;font-weight:700;color:var(--brand-cyan);text-transform:uppercase;letter-spacing:.08em;margin-bottom:16px;}
.section-title{font-family:var(--font-display);font-size:clamp(1.75rem,4vw,2.75rem);font-weight:800;margin-bottom:16px;}
.section-title span{background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.section-sub{color:var(--text-secondary);font-size:1rem;max-width:560px;margin:0 auto;}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.feat-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;padding:28px;transition:all .3s;}
.feat-card:hover{border-color:var(--border-glow);transform:translateY(-4px);box-shadow:0 8px 40px rgba(0,0,0,.3),0 0 20px rgba(124,58,237,.1);}
.feat-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;margin-bottom:16px;}
.feat-title{font-size:1rem;font-weight:700;margin-bottom:8px;color:var(--text-primary);}
.feat-desc{font-size:.875rem;color:var(--text-secondary);line-height:1.65;}
.stats-section{padding:80px 32px;background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(34,211,238,.03));border-top:1px solid var(--border-subtle);border-bottom:1px solid var(--border-subtle);}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:32px;max-width:1000px;margin:0 auto;text-align:center;}
.big-stat-val{font-family:var(--font-display);font-size:3rem;font-weight:800;background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;}
.big-stat-lbl{color:var(--text-secondary);font-size:.9rem;margin-top:8px;}
.pricing{padding:100px 32px;max-width:1100px;margin:0 auto;}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.plan-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:20px;padding:32px;transition:all .3s;position:relative;}
.plan-card.popular{border-color:rgba(124,58,237,.5);background:linear-gradient(135deg,rgba(124,58,237,.1),rgba(34,211,238,.05));}
.popular-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--gradient-brand);color:#fff;font-size:.7rem;font-weight:700;padding:4px 16px;border-radius:99px;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;}
.plan-name{font-size:.875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:12px;}
.plan-price{font-family:var(--font-display);font-size:2.5rem;font-weight:800;color:var(--text-primary);line-height:1;margin-bottom:4px;}
.plan-price span{font-size:1rem;font-weight:400;color:var(--text-muted);}
.plan-desc{font-size:.85rem;color:var(--text-muted);margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--border-subtle);}
.plan-features li{font-size:.875rem;color:var(--text-secondary);padding:6px 0;display:flex;gap:10px;align-items:flex-start;}
.plan-features li::before{content:"✓";color:var(--success);font-weight:700;flex-shrink:0;}
.plan-cta{margin-top:24px;}
.testimonials{padding:100px 32px;max-width:1100px;margin:0 auto;}
.testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
.testi-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px;padding:24px;transition:all .3s;}
.testi-card:hover{border-color:var(--border-medium);transform:translateY(-2px);}
.testi-stars{color:#F59E0B;font-size:1rem;margin-bottom:12px;}
.testi-quote{font-size:.9rem;color:var(--text-secondary);line-height:1.7;margin-bottom:20px;}
.testi-author{display:flex;align-items:center;gap:12px;}
.testi-avatar{width:40px;height:40px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;color:#fff;}
.testi-name{font-size:.875rem;font-weight:600;color:var(--text-primary);}
.testi-role{font-size:.75rem;color:var(--text-muted);}
.cta-section{padding:100px 32px;text-align:center;position:relative;overflow:hidden;}
.cta-section::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 50%,rgba(124,58,237,.2) 0%,transparent 70%);}
.cta-inner{max-width:700px;margin:0 auto;position:relative;z-index:1;}
.cta-title{font-family:var(--font-display);font-size:clamp(2rem,5vw,3.5rem);font-weight:800;margin-bottom:20px;}
.cta-sub{color:var(--text-secondary);font-size:1.05rem;margin-bottom:40px;line-height:1.7;}
.landing-footer{padding:40px 32px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;}
.footer-copy{font-size:.85rem;color:var(--text-muted);}
.footer-links{display:flex;gap:20px;}
.footer-links a{font-size:.85rem;color:var(--text-muted);text-decoration:none;transition:color .2s;}
.footer-links a:hover{color:var(--text-primary);}
.universities{padding:60px 32px;max-width:1100px;margin:0 auto;text-align:center;}
.uni-logos{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;margin-top:32px;}
.uni-logo-chip{padding:10px 20px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:10px;font-size:.8rem;font-weight:600;color:var(--text-secondary);transition:all .2s;}
.uni-logo-chip:hover{border-color:var(--border-glow);color:var(--brand-violet-light);}
@media(max-width:900px){.features-grid,.pricing-grid,.testimonials-grid{grid-template-columns:1fr;}
.hero-stats,.stats-grid{grid-template-columns:repeat(2,1fr);}
.nav-links .hide-mob{display:none;}}
@media(max-width:600px){.hero-stats,.stats-grid{grid-template-columns:1fr;}.landing-footer{flex-direction:column;text-align:center;}}
</style>

<!-- NAV -->
<nav class="landing-nav">
  <a href="#" class="landing-logo">
    <div class="landing-logo-icon">🎓</div>
    <span class="landing-logo-text">Placenix</span>
  </a>
  <div class="nav-links">
    <a href="#features" class="hide-mob">Features</a>
    <a href="#pricing" class="hide-mob">Pricing</a>
    <a href="#testimonials" class="hide-mob">Testimonials</a>
    <a href="#login" data-route="login" onclick="navigate(this)" style="padding:9px 20px;background:var(--bg-card-hover);border:1px solid var(--border-medium);border-radius:8px;color:var(--text-primary);margin-left:4px;">Log in</a>
    <a href="#signup" data-route="signup" onclick="navigate(this)" style="padding:9px 20px;background:var(--gradient-brand);border-radius:8px;color:#fff;font-weight:600;box-shadow:0 4px 16px rgba(124,58,237,.4);">Get Started →</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-grid"></div>
  <div class="hero-inner">
    <div class="hero-badge">🤖 AI-Powered · Enterprise-Grade · Built for Universities</div>
    <h1 class="hero-title">
      The <span>Operating System</span><br>for Campus Placements
    </h1>
    <p class="hero-sub">Placenix unifies student employability intelligence, AI-driven resume analysis, placement drive management, and recruiter engagement into one powerful SaaS platform.</p>
    <div class="hero-cta">
      <a href="#signup" onclick="navigate(this)" class="btn btn-primary btn-xl" style="text-decoration:none;">Explore Dashboard →</a>
      <a href="#signup" onclick="navigate(this)" class="btn btn-secondary btn-xl" style="text-decoration:none;">View Placement Drives</a>
    </div>
    <div class="hero-stats" id="hero-stats">
      <div class="hstat"><div class="hstat-val" data-count="1247">0</div><div class="hstat-lbl">Students Tracked</div></div>
      <div class="hstat"><div class="hstat-val" data-count="843">0</div><div class="hstat-lbl">Placed This Year</div></div>
      <div class="hstat"><div class="hstat-val" data-count="48">0</div><div class="hstat-lbl">Active Recruiters</div></div>
      <div class="hstat"><div class="hstat-val" data-count="32">0</div><div class="hstat-lbl">Placement Drives</div></div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="features" id="features">
  <div class="section-header">
    <div class="section-badge">✦ Platform Features</div>
    <h2 class="section-title">Everything your TPO needs.<br><span>Intelligently connected.</span></h2>
    <p class="section-sub">12 powerful modules working together to transform how universities manage placements and employability.</p>
  </div>
  <div class="features-grid" id="features-grid"></div>
</section>

<!-- STATS -->
<section class="stats-section">
  <div class="section-header" style="margin-bottom:48px;">
    <h2 class="section-title">Trusted by <span>leading institutions</span></h2>
  </div>
  <div class="stats-grid">
    <div><div class="big-stat-val" data-count="200">0</div><div class="big-stat-lbl">Universities Onboarded</div></div>
    <div><div class="big-stat-val" data-count="94">0</div><div class="big-stat-lbl">Avg. Placement % Improvement</div></div>
    <div><div class="big-stat-val" data-count="50000">0</div><div class="big-stat-lbl">Resumes Analyzed by AI</div></div>
    <div><div class="big-stat-val" data-count="99">0</div><div class="big-stat-lbl">% Uptime SLA</div></div>
  </div>
</section>

<!-- UNIVERSITIES -->
<section class="universities">
  <div class="section-badge" style="margin-bottom:16px;">🏫 Trusted By</div>
  <h3 style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;margin-bottom:8px;">India's Top Engineering Institutions</h3>
  <p style="color:var(--text-muted);font-size:.875rem;">Join 200+ colleges already transforming their placement ecosystem</p>
  <div class="uni-logos">
    ${['SVCE Chennai','PSG Tech','Anna University','VIT Vellore','SRM University','BITS Pilani','NIT Trichy','Amrita','Coimbatore IT','Bannari Amman'].map(n=>`<div class="uni-logo-chip">${n}</div>`).join('')}
  </div>
</section>

<!-- TESTIMONIALS -->
<section class="testimonials" id="testimonials">
  <div class="section-header">
    <div class="section-badge">💬 Testimonials</div>
    <h2 class="section-title">Loved by <span>TPOs & Students</span></h2>
  </div>
  <div class="testimonials-grid" id="testimonials-grid"></div>
</section>

<!-- PRICING -->
<section class="pricing" id="pricing">
  <div class="section-header">
    <div class="section-badge">💳 Pricing</div>
    <h2 class="section-title">Simple, <span>transparent pricing</span></h2>
    <p class="section-sub">Scale as your institution grows. No hidden fees.</p>
  </div>
  <div class="pricing-grid" id="pricing-grid"></div>
</section>

<!-- CTA -->
<section class="cta-section">
  <div class="cta-inner">
    <h2 class="cta-title">Ready to <span style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">Transform</span><br>Your Placement Cell?</h2>
    <p class="cta-sub">Join 200+ universities using Placenix to place more students, faster — with the power of AI.</p>
    <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
      <a href="#signup" onclick="navigate(this)" class="btn btn-primary btn-xl" style="text-decoration:none;">Start Free Trial →</a>
      <a href="#signup" onclick="navigate(this)" class="btn btn-secondary btn-xl" style="text-decoration:none;">View Analytics Demo</a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="landing-footer">
  <div class="landing-logo" style="text-decoration:none;display:flex;align-items:center;gap:10px;">
    <div class="landing-logo-icon" style="width:28px;height:28px;font-size:14px;">🎓</div>
    <span class="landing-logo-text" style="font-size:1rem;">Placenix</span>
  </div>
  <p class="footer-copy">© 2025 Placenix Technologies Pvt. Ltd. · AI-Powered Employability OS</p>
  <div class="footer-links">
    <a href="#">Privacy</a>
    <a href="#">Terms</a>
    <a href="#">Contact</a>
    <a href="#">Docs</a>
  </div>
</footer>`;
}

function navigate(el) {
  const route = el.getAttribute('href').replace('#','');
  if(route) window.location.hash = route;
}

const FEATURES = [
  { icon:'🤖', color:'rgba(124,58,237,.15)', title:'AI Resume Intelligence', desc:'Parse, score, and optimize resumes with ATS compatibility checks, keyword gap analysis, and role-suitability scoring.' },
  { icon:'📊', color:'rgba(34,211,238,.1)', title:'Employability Engine', desc:'360° employability score combining technical skills, communication, coding performance, and domain readiness.' },
  { icon:'🎯', color:'rgba(16,185,129,.1)', title:'Placement Drive Management', desc:'Create drives, define eligibility, track applicants, and manage the full recruitment pipeline from one dashboard.' },
  { icon:'🔀', color:'rgba(245,158,11,.1)', title:'Kanban Recruitment Pipeline', desc:'Visual drag-and-drop pipeline: Applied → Shortlisted → Aptitude → Technical → HR → Selected.' },
  { icon:'📈', color:'rgba(59,130,246,.1)', title:'Enterprise Analytics', desc:'Real-time placement stats, package distributions, department heatmaps, and recruiter engagement dashboards.' },
  { icon:'🎓', color:'rgba(239,68,68,.1)', title:'Alumni Ecosystem', desc:'LinkedIn-style alumni network with mentoring, referrals, career guidance, and networking features.' },
  { icon:'💬', color:'rgba(124,58,237,.12)', title:'Interview Repository', desc:'AI-curated interview experiences, question banks, and difficulty analysis from thousands of real placements.' },
  { icon:'🔔', color:'rgba(34,211,238,.12)', title:'Smart Communication', desc:'Automated placement alerts, email workflows, announcements, and multi-channel notifications.' },
  { icon:'🏢', color:'rgba(16,185,129,.12)', title:'Multi-University SaaS', desc:'Manage multiple institutions from one super-admin panel with white-label and custom branding support.' },
];

const TESTIMONIALS = [
  { stars:5, quote:'"Placenix reduced our manual placement tracking effort by 80%. The AI resume scorer alone helped 40 more students get shortlisted this year."', name:'Dr. Kavitha Rajan', role:'TPO · PSG College of Technology', initials:'KR' },
  { stars:5, quote:'"The employability dashboard gives students a real mirror of where they stand. Our placement percentage jumped from 61% to 84% in one year."', name:'Prof. Suresh Babu', role:'Placement Coordinator · SVCE', initials:'SB' },
  { stars:5, quote:'"Finally a platform that thinks like a recruiter. The Kanban pipeline and analytics saved us weeks of Excel work every month."', name:'Nalini Krishnamurthy', role:'University Admin · Anna University', initials:'NK' },
];

const PLANS = [
  { name:'Starter', price:'₹24,000', period:'/year', desc:'Perfect for smaller colleges just getting started with digital placements.', features:['Up to 500 students','Basic analytics dashboard','Placement drive management','Email notifications','Resume upload & storage','Standard support'] },
  { name:'Professional', price:'₹72,000', period:'/year', popular:true, desc:'Ideal for mid-size institutions wanting AI-powered placement intelligence.', features:['Up to 2,000 students','AI Resume Intelligence','Employability Engine','Kanban pipeline','Alumni ecosystem','Advanced analytics & exports','Priority support'] },
  { name:'Enterprise', price:'Custom', period:'pricing', desc:'For large universities and multi-campus institutions needing full power.', features:['Unlimited students','Full AI module suite','Multi-university admin','White-label branding','API integrations','Dedicated success manager','99.9% SLA uptime'] },
];

function initLanding() {
  // Render features
  const fg = document.getElementById('features-grid');
  if (fg) fg.innerHTML = FEATURES.map(f => `
    <div class="feat-card animate-fade-in-up">
      <div class="feat-icon" style="background:${f.color};">${f.icon}</div>
      <div class="feat-title">${f.title}</div>
      <p class="feat-desc">${f.desc}</p>
    </div>`).join('');

  // Render testimonials
  const tg = document.getElementById('testimonials-grid');
  if (tg) tg.innerHTML = TESTIMONIALS.map(t => `
    <div class="testi-card">
      <div class="testi-stars">${'★'.repeat(t.stars)}</div>
      <p class="testi-quote">${t.quote}</p>
      <div class="testi-author">
        <div class="testi-avatar">${t.initials}</div>
        <div><div class="testi-name">${t.name}</div><div class="testi-role">${t.role}</div></div>
      </div>
    </div>`).join('');

  // Render pricing
  const pg = document.getElementById('pricing-grid');
  if (pg) pg.innerHTML = PLANS.map(p => `
    <div class="plan-card ${p.popular?'popular':''}">
      ${p.popular?'<div class="popular-badge">Most Popular</div>':''}
      <div class="plan-name">${p.name}</div>
      <div class="plan-price">${p.price}<span>${p.period}</span></div>
      <p class="plan-desc">${p.desc}</p>
      <ul class="plan-features">${p.features.map(f=>`<li>${f}</li>`).join('')}</ul>
      <div class="plan-cta">
        <a href="#signup" onclick="window.location.hash='signup'" class="btn ${p.popular?'btn-primary':'btn-secondary'}" style="width:100%;justify-content:center;text-decoration:none;">
          ${p.name==='Enterprise'?'Contact Sales':'Get Started →'}
        </a>
      </div>
    </div>`).join('');

  // Animated counters
  const counters = document.querySelectorAll('[data-count]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(el => observer.observe(el));
}

function animateCount(el) {
  const target = parseInt(el.getAttribute('data-count'));
  const dur = 2000;
  const step = 16;
  const steps = dur / step;
  let current = 0;
  const increment = target / steps;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { el.textContent = target.toLocaleString(); clearInterval(timer); }
    else el.textContent = Math.floor(current).toLocaleString();
  }, step);
}
