// ============================================================
// PLACENIX — AI RESUME INTELLIGENCE OPERATING SYSTEM (v3.0)
// ============================================================

import { saveStore } from '../store.js';

// All available target roles for the Role Selector
const ROLE_OPTIONS = [
  { value: 'Software Engineer', label: 'Software Engineer' },
  { value: 'Frontend Developer', label: 'Frontend Developer' },
  { value: 'Backend Developer', label: 'Backend Developer' },
  { value: 'Full Stack Developer', label: 'Full Stack Developer' },
  { value: 'Data Analyst', label: 'Data Analyst' },
  { value: 'Data Scientist', label: 'Data Scientist' },
  { value: 'Machine Learning Engineer', label: 'Machine Learning Engineer' },
  { value: 'DevOps Engineer', label: 'DevOps Engineer' },
  { value: 'Product Manager', label: 'Product Manager' },
  { value: 'Business Analyst', label: 'Business Analyst' },
  { value: 'Mechanical Engineer', label: 'Mechanical Engineer' },
  { value: 'Civil Engineer', label: 'Civil Engineer' },
  { value: 'Electrical Engineer', label: 'Electrical Engineer' },
  { value: 'Embedded Systems Engineer', label: 'Embedded Systems Engineer' },
  { value: 'Cloud Architect', label: 'Cloud Architect' },
  { value: 'Cybersecurity Analyst', label: 'Cybersecurity Analyst' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Network Engineer', label: 'Network Engineer' },
];

// Role-specific keyword sets for local fallback analysis
const ROLE_KEYWORDS = {
  'Software Engineer': ['React.js','Node.js','TypeScript','System Architecture','Cloud Infrastructure','REST APIs','web development','problem-solving','analytical skills','GraphQL','Docker Orchestration','CI/CD Pipeline','Algorithms','Unit Testing','Python','Java','SQL','Git','Kubernetes','AWS','Data Structures','Linux','MongoDB','PostgreSQL','System Design','Microservices','Agile','HTML5','CSS3','JavaScript'],
  'Frontend Developer': ['React.js','Vue.js','Angular','TypeScript','JavaScript','HTML5','CSS3','Responsive Design','Webpack','Vite','REST APIs','GraphQL','Redux','Unit Testing','Figma','Performance Optimization','Accessibility','Git','Tailwind CSS','SASS','Next.js','Web Vitals','Cross-browser Compatibility'],
  'Backend Developer': ['Node.js','Python','Java','Spring Boot','Express.js','REST APIs','GraphQL','PostgreSQL','MongoDB','Redis','Docker','Kubernetes','CI/CD','Microservices','System Design','SQL','AWS','Authentication','API Design','Unit Testing','Linux','Message Queues','Database Optimization'],
  'Full Stack Developer': ['React.js','Node.js','TypeScript','JavaScript','Python','REST APIs','GraphQL','PostgreSQL','MongoDB','Docker','AWS','CI/CD','HTML5','CSS3','Next.js','Express.js','Git','System Design','Agile','Unit Testing','Redis','Linux'],
  'Data Analyst': ['Python','SQL','Pandas','NumPy','Tableau','Power BI','Excel','Data Visualization','Statistical Analysis','Machine Learning','R','Data Cleaning','ETL','Google Analytics','A/B Testing','Business Intelligence','Data Modeling','Jupyter Notebook','Matplotlib','Seaborn'],
  'Data Scientist': ['Python','Machine Learning','Deep Learning','TensorFlow','PyTorch','Scikit-learn','SQL','Pandas','NumPy','Statistical Modeling','NLP','Computer Vision','Data Pipeline','Feature Engineering','Jupyter Notebook','MLflow','A/B Testing','Data Visualization','Big Data','Spark','R','Model Deployment'],
  'Machine Learning Engineer': ['Python','TensorFlow','PyTorch','Scikit-learn','Deep Learning','NLP','Computer Vision','Model Deployment','MLflow','Docker','Kubernetes','AWS','Data Pipeline','Feature Engineering','REST APIs','CI/CD','SQL','Distributed Computing','Model Optimization','A/B Testing'],
  'DevOps Engineer': ['Docker','Kubernetes','CI/CD','Jenkins','GitHub Actions','AWS','Azure','GCP','Terraform','Ansible','Linux','Bash Scripting','Monitoring','Prometheus','Grafana','Infrastructure as Code','Helm','Git','Microservices','Security','Networking','Load Balancing'],
  'Product Manager': ['Product Roadmap','User Research','Agile','Scrum','Stakeholder Management','A/B Testing','Data Analytics','SQL','Figma','OKRs','KPIs','Market Research','Competitive Analysis','Product Strategy','Sprint Planning','User Stories','Business Requirements','Go-to-market','Communication'],
  'Business Analyst': ['Business Requirements','Process Analysis','SQL','Excel','Stakeholder Management','Use Cases','UML','BPMN','Data Analysis','Power BI','Tableau','Requirement Elicitation','Agile','Scrum','Communication','Documentation','Gap Analysis','Risk Analysis','Market Research'],
  'Mechanical Engineer': ['CAD','SolidWorks','AutoCAD','ANSYS','FEA','CFD','Manufacturing','Thermodynamics','Fluid Mechanics','Materials Science','GD&T','CATIA','Product Design','Prototyping','CNC Machining','Quality Control','Lean Manufacturing','Six Sigma','Project Management'],
  'Civil Engineer': ['AutoCAD','Structural Analysis','STAAD Pro','ETABS','Revit','Primavera','Construction Management','Concrete Design','Steel Design','Surveying','Project Management','Geotechnical Engineering','Transportation','Hydraulics','Environmental Engineering','GIS','Building Codes'],
  'Electrical Engineer': ['Circuit Design','MATLAB','Simulink','PLC','SCADA','Power Systems','Embedded Systems','PCB Design','Control Systems','Signal Processing','AutoCAD Electrical','VLSI','Microcontrollers','Arduino','Raspberry Pi','Power Electronics','Instrumentation','IoT'],
  'Embedded Systems Engineer': ['C','C++','Embedded C','Microcontrollers','Arduino','Raspberry Pi','RTOS','ARM','Assembly','UART','SPI','I2C','CAN Bus','PCB Design','Firmware Development','IoT','FPGA','Debugging','Git'],
  'Cloud Architect': ['AWS','Azure','GCP','Terraform','Kubernetes','Docker','Microservices','Infrastructure as Code','Networking','Security','High Availability','Disaster Recovery','Cost Optimization','DevOps','Serverless','Load Balancing','CI/CD','Monitoring','Compliance','Python','Linux'],
  'Cybersecurity Analyst': ['Penetration Testing','SIEM','Firewalls','IDS/IPS','Network Security','Vulnerability Assessment','Incident Response','OWASP','Python','Bash','Kali Linux','Wireshark','Security Auditing','Cryptography','Zero Trust','Compliance','Risk Management','Malware Analysis','SOC'],
  'UI/UX Designer': ['Figma','Adobe XD','Sketch','Wireframing','Prototyping','User Research','Usability Testing','User Journeys','Information Architecture','Accessibility','Design Systems','HTML5','CSS3','Typography','Color Theory','Interaction Design','A/B Testing','Mobile Design','Responsive Design'],
  'Network Engineer': ['Cisco','Routing','Switching','TCP/IP','BGP','OSPF','MPLS','Firewalls','VPN','DNS','DHCP','Network Security','Wireshark','Linux','Python','Network Monitoring','Load Balancing','SD-WAN','Troubleshooting','CCNA','Network Design'],
};

// ── Resume Score History Helpers ─────────────────────────────
function loadResumeHistory(userId) {
  try {
    const cache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    return cache[userId]?.resumeHistory || [];
  } catch(e) { return []; }
}

function saveResumeHistory(userId, entry, Store) {
  try {
    const cache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    const userCache = cache[userId] || {};
    const history = userCache.resumeHistory || [];
    history.unshift(entry);
    // Keep max 8 scans to prevent bloat
    if (history.length > 8) history.pop();
    userCache.resumeHistory = history;
    cache[userId] = userCache;
    localStorage.setItem('placenix_profile_cache', JSON.stringify(cache));
    if (Store?.session?.user) Store.session.user.resumeHistory = history;
    saveStore();
  } catch(e) {}
}

function deleteResumeHistoryItem(userId, index, Store) {
  try {
    const cache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    const userCache = cache[userId] || {};
    const history = userCache.resumeHistory || [];
    if (index >= 0 && index < history.length) {
      history.splice(index, 1);
    }
    userCache.resumeHistory = history;
    cache[userId] = userCache;
    localStorage.setItem('placenix_profile_cache', JSON.stringify(cache));
    if (Store?.session?.user) Store.session.user.resumeHistory = history;
    saveStore();
  } catch(e) {}
}

function clearAllResumeHistory(userId, Store) {
  try {
    const cache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    const userCache = cache[userId] || {};
    userCache.resumeHistory = [];
    cache[userId] = userCache;
    localStorage.setItem('placenix_profile_cache', JSON.stringify(cache));
    if (Store?.session?.user) Store.session.user.resumeHistory = [];
    saveStore();
  } catch(e) {}
}

// ── Job Drive Match Computation ───────────────────────────────
function computeDriveMatches(foundKeywords, drives) {
  if (!drives || !drives.length || !foundKeywords.length) return [];
  const normalizedFound = foundKeywords.map(k => k.toLowerCase().trim());
  return drives
    .filter(d => d.status !== 'Closed')
    .map(drive => {
      const driveText = [
        ...(drive.rounds || []),
        ...(drive.skills || []),
        drive.role || '', drive.company || '', drive.description || ''
      ].join(' ').toLowerCase();
      const matchCount = normalizedFound.filter(kw => driveText.includes(kw.toLowerCase())).length;
      const score = Math.min(100, Math.round((matchCount / Math.max(normalizedFound.length, 1)) * 100));
      return { ...drive, matchScore: score };
    })
    .filter(d => d.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 4);
}

// ── Downloadable PDF Report via window.print() ───────────────
function triggerReportDownload(analysis, user, targetRole) {
  const score = analysis?.ats_score || 0;
  const foundKws = analysis?.found_keywords || [];
  const missingKws = analysis?.missing_keywords || [];
  const suggestions = analysis?.suggestions || [];
  const date = new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) { alert('Please allow popups to download the report.'); return; }
  printWin.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Placenix Resume Intelligence Report</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1a1a2e;padding:40px}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #6366f1;padding-bottom:20px;margin-bottom:28px}.brand{font-size:22px;font-weight:900;color:#6366f1}.meta{text-align:right;font-size:12px;color:#666;line-height:1.6}.score-section{display:flex;align-items:center;gap:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;padding:28px 36px;color:#fff;margin-bottom:28px}.score-circle{width:100px;height:100px;border-radius:50%;border:6px solid rgba(255,255,255,0.4);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}.score-num{font-size:40px;font-weight:900;line-height:1}.score-label{font-size:10px;font-weight:700;opacity:0.8;margin-top:2px}.score-info h2{font-size:22px;font-weight:800;margin-bottom:6px}.score-info p{opacity:0.85;font-size:13px;line-height:1.5}.section{margin-bottom:24px}.section-title{font-size:14px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:.08em;border-left:3px solid #6366f1;padding-left:10px;margin-bottom:14px}.kw-grid{display:flex;flex-wrap:wrap;gap:6px}.kw-found{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700}.kw-missing{background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700}.suggestion{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:8px;display:flex;gap:14px;align-items:flex-start}.sug-icon{font-size:20px;flex-shrink:0}.sug-title{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:3px}.sug-desc{font-size:11.5px;color:#64748b;line-height:1.5}.footer{border-top:1px solid #e2e8f0;padding-top:14px;margin-top:28px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8}@media print{body{padding:20px}}</style></head><body><div class="header"><div class="brand">Placenix</div><div class="meta"><div><strong>Resume Intelligence Report</strong></div><div>Target Role: ${targetRole}</div><div>Generated: ${date}</div></div></div><div class="score-section"><div class="score-circle"><div class="score-num">${score}</div><div class="score-label">ATS Score</div></div><div class="score-info"><h2>${user?.full_name || user?.email || 'Student'}</h2><p>${score>=75?'✅ High ATS Compatibility — Strong match for target role.':score>=50?'⚠️ Standard Match — Some gaps identified. Review suggestions below.':'❌ Critical Revision Needed — Significant keyword and structure gaps found.'}</p></div></div><div class="section"><div class="section-title">✅ Detected Keywords (${foundKws.length})</div><div class="kw-grid">${foundKws.map(k=>`<span class="kw-found">${k}</span>`).join('')||'<span style="color:#94a3b8;font-size:12px;">None detected</span>'}</div></div><div class="section"><div class="section-title">✗ Missing Keywords (${missingKws.length})</div><div class="kw-grid">${missingKws.map(k=>`<span class="kw-missing">${k}</span>`).join('')||'<span style="color:#94a3b8;font-size:12px;">No critical gaps</span>'}</div></div><div class="section"><div class="section-title">🧠 Optimization Suggestions</div>${suggestions.map(s=>`<div class="suggestion"><div class="sug-icon">${s.icon||'✨'}</div><div><div class="sug-title">${s.title}</div>${s.description?`<div class="sug-desc">${s.description}</div>`:''}</div></div>`).join('')||'<div style="color:#94a3b8;font-size:12px;">No suggestions.</div>'}</div><div class="footer"><span>Placenix — AI-Powered Placement Intelligence Platform</span><span>Confidential — For student use only</span></div><script>window.onload=()=>{window.print();}<\/script></body></html>`);
  printWin.document.close();
}

export async function loadResumePage(root, Store, supabase) {
  const user = Store.session?.user;
  if (!user) {
    root.innerHTML = '<div style="padding:100px; text-align:center; color:var(--text-description);">Institutional session expired. Please re-authenticate.</div>';
    return;
  }

  // Intercept console logs for the Diagnostic Console
  if (!window.diagnosticLogs) {
    window.diagnosticLogs = [];
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;
    
    console.log = (...args) => {
      origLog(...args);
      window.diagnosticLogs.push({ type: 'log', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
      window.dispatchEvent(new CustomEvent('diagnostic-log'));
    };
    console.warn = (...args) => {
      origWarn(...args);
      window.diagnosticLogs.push({ type: 'warn', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
      window.dispatchEvent(new CustomEvent('diagnostic-log'));
    };
    console.error = (...args) => {
      origError(...args);
      window.diagnosticLogs.push({ type: 'error', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
      window.dispatchEvent(new CustomEvent('diagnostic-log'));
    };
  }

  // Preemptively load pdf.js script in the background
  loadPdfJs().catch(err => console.warn("Failed to pre-load pdf.js:", err));

  // Rehydrate cached extracted resume text if available
  try {
    const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    if (user.id && profileCache[user.id]) {
      if (profileCache[user.id].cachedResumeText && !user.cachedResumeText) {
        user.cachedResumeText = profileCache[user.id].cachedResumeText;
        user.cachedResumeFileName = profileCache[user.id].cachedResumeFileName || 'Resume.pdf';
      }
    }
  } catch(e){}

  // State: selected role (defaults to user's career interest or stored preference)
  let selectedRole = user.resumeTargetRole 
    || user.career_interests?.[0] 
    || 'Software Engineer';

  // Core Runner: analyzes existing or provided resume text against targetRole
  const runAnalysis = async (text, targetRole) => {
    renderUI(user.resume_analysis?.sandbox || user.resume_analysis, true);
    try {
      let analysis;
      try {
        analysis = await analyzeWithGemini(text, targetRole, Store);
      } catch (innerErr) {
        console.warn("AI / PDF parsing failed. Using dynamic local scanner fallback:", innerErr);
        analysis = analyzeResumeLocally(text, targetRole);
      }

      const updatedAnalysis = {
        ...analysis,
        targetRole,
        sandbox: analysis,
        sandbox_url: user.resume_analysis?.sandbox_url || null
      };

      user.resume_analysis = updatedAnalysis;
      user.atsScore = analysis.ats_score;
      if (Store.session?.user) {
        Store.session.user.resume_analysis = updatedAnalysis;
        Store.session.user.atsScore = analysis.ats_score;
      }
      
      if (Store.students && Array.isArray(Store.students)) {
        const studentIdx = Store.students.findIndex(s => String(s.id) === String(user.id));
        if (studentIdx !== -1) {
          Store.students[studentIdx].resume_analysis = updatedAnalysis;
          Store.students[studentIdx].atsScore = analysis.ats_score;
        }
      }

      // Record in Score History Timeline (Feature 2)
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      saveResumeHistory(user.id, {
        date: dateStr,
        score: analysis.ats_score,
        role: targetRole
      }, Store);

      try {
        const cache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
        cache[user.id] = {
          ...(cache[user.id] || {}),
          ...user,
          cachedResumeText: text,
          cachedResumeFileName: user.cachedResumeFileName || 'Resume.pdf'
        };
        localStorage.setItem('placenix_profile_cache', JSON.stringify(cache));
      } catch(e){}

      saveStore();
      renderUI(analysis, false);
    } catch (error) {
      console.error("Intelligence failure:", error);
      alert("Intelligence Engine Error: " + error.message);
      renderUI(user.resume_analysis?.sandbox || user.resume_analysis, false);
    }
  };

  const renderUI = (analysis = null, isUploading = false) => {
    const formatLabel = (str) => {
      let formatted = str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      // Professional acronym formatting
      formatted = formatted.replace(/Saas\b/gi, 'SaaS');
      formatted = formatted.replace(/Fintech\b/gi, 'FinTech');
      formatted = formatted.replace(/Healthtech\b/gi, 'HealthTech');
      formatted = formatted.replace(/Ats\b/gi, 'ATS');
      formatted = formatted.replace(/Swe\b/gi, 'SWE');
      return formatted;
    };

    let score = analysis?.ats_score || 0;
    let scoreLabel = 'Awaiting Ingestion';
    let scoreClass = 'status-warning';
    if (analysis) {
      if (score < 50) { scoreLabel = 'Critical Revision Needed'; scoreClass = 'status-danger'; }
      else if (score < 75) { scoreLabel = 'Standard Match'; scoreClass = 'status-warning'; }
      else { scoreLabel = 'High Compatibility'; scoreClass = 'status-success'; }
    }

    const foundKws = analysis?.found_keywords || [];
    const missingKws = analysis?.missing_keywords || [];
    
    // Clean and validate industry alignment data to prevent long text from breaking layout
    const rawIndustryMatch = analysis?.industry_match || {};
    const cleanIndustryMatch = {};
    let industryAnalysisText = '';

    Object.entries(rawIndustryMatch).forEach(([key, val]) => {
      const numVal = parseInt(val);
      if (key.toLowerCase() === 'analysis' || key.toLowerCase() === 'summary' || isNaN(numVal)) {
        if (typeof val === 'string' && val.length > 15) {
          industryAnalysisText = val;
        }
      } else {
        cleanIndustryMatch[key] = Math.min(100, Math.max(0, numVal));
      }
    });

    // Provide default fallbacks if no numeric match percentages were parsed
    if (Object.keys(cleanIndustryMatch).length === 0) {
      const scoreBase = analysis?.ats_score || 70;
      cleanIndustryMatch['Enterprise SaaS'] = scoreBase;
      cleanIndustryMatch['FinTech'] = Math.max(10, scoreBase - 15);
      cleanIndustryMatch['E-commerce'] = Math.max(10, scoreBase - 25);
    }
    const industries = Object.entries(cleanIndustryMatch).slice(0, 3);

    // Clean and validate suggestions icons (mapping text icon names to emojis)
    const suggestions = (analysis?.suggestions || []).map(s => {
      let icon = s.icon || '✨';
      const iconMap = {
        'alert-circle': '⚠️',
        'alert-triangle': '⚠️',
        'code': '💻',
        'terminal': '⌨️',
        'trending-up': '📈',
        'trending-down': '📉',
        'bar-chart': '📊',
        'bar-chart-2': '📊',
        'file-text': '📄',
        'file': '📄',
        'settings': '⚙️',
        'tool': '🛠️',
        'briefcase': '💼',
        'cpu': '🧠',
        'activity': '⚡',
        'check-circle': '✅'
      };
      const cleanIcon = String(icon).toLowerCase().trim();
      if (iconMap[cleanIcon]) {
        icon = iconMap[cleanIcon];
      } else if (cleanIcon.length > 2) {
        icon = '✨';
      }
      return { ...s, icon };
    });

    // Score History and Drive Matches
    const resumeHistory = loadResumeHistory(user.id);
    const driveMatches = foundKws.length > 0 ? computeDriveMatches(foundKws, Store.drives || []) : [];

    root.innerHTML = `
    <div style="padding: 24px 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
      
      <!-- Breadcrumbs & Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:10px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.1em;">
            <span>Placenix</span>
            <span style="opacity:0.3;">/</span>
            <span style="color:var(--brand-primary);">Resume Intelligence</span>
          </div>
          <h1 class="h1-ent" style="font-size:24px;">Resume Intelligence</h1>
        </div>
        <div style="display:flex; gap:12px; align-items:center;">
          ${analysis ? `
            <button type="button" id="download-report-btn" style="
              display:flex; align-items:center; gap:8px; padding:8px 18px;
              background:linear-gradient(135deg,var(--brand-primary),var(--brand-secondary));
              color:#fff; border:none; border-radius:10px; font-size:12px;
              font-weight:700; cursor:pointer; transition:all 0.2s;
              box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
            ">📄 Download Report Card</button>
          ` : ''}
          <div style="font-size:13px; color:var(--text-description);">AI-powered optimization & role-match insights.</div>
        </div>
      </div>

      <!-- Main Workspace Grid -->
      <div class="resume-workspace-grid">
        
        <!-- LEFT COLUMN: Inputs & Metrics -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Role Selector Card (Feature 1) -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <h3 class="h2-ent" style="font-size:14px;">🎯 Target Career Role</h3>
              <span style="font-size:10px; color:var(--brand-primary); font-weight:700; background:rgba(99,102,241,0.1); padding:2px 8px; border-radius:12px;">DYNAMIC ATS</span>
            </div>
            <select id="role-selector" style="
              width:100%; padding:10px 14px; border-radius:10px;
              background:var(--glass-2); border:1px solid var(--glass-border-main);
              color:var(--text-main); font-size:13px; font-weight:600;
              cursor:pointer; appearance:none;
              background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22><path fill=%22%23888%22 d=%22M7 10l5 5 5-5z%22/></svg>');
              background-repeat:no-repeat; background-position:right 12px center;
              padding-right:36px;
            ">
              ${ROLE_OPTIONS.map(r => `<option value="${r.value}" ${r.value === selectedRole ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
            <div style="margin-top:10px; font-size:11px; color:var(--text-muted); line-height:1.4;">
              ${user.cachedResumeText ? '⚡ Switch role anytime — your uploaded resume will re-analyze automatically in 1 second!' : 'Select target role before scanning. Keywords, suggestions & drive match will align accordingly.'}
            </div>
          </div>

          <!-- Upload Node -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 class="h2-ent" style="font-size:14px;">Upload Node</h3>
              ${user.cachedResumeText ? '<span style="font-size:10px; color:var(--brand-secondary); font-weight:700;">ACTIVE</span>' : ''}
            </div>
            
            <input type="file" id="resume-file-input" accept=".pdf" style="display:none">
            <div id="dropzone" style="
              border: 1px dashed var(--glass-border-strong);
              border-radius: var(--radius-md);
              padding: 24px 16px;
              text-align: center;
              background: rgba(0, 0, 0, 0.2);
              transition: all var(--t-fast);
              cursor: pointer;
            " onclick="document.getElementById('resume-file-input').click()">
              ${isUploading ? `
                <div class="neural-spinner" style="width:24px; height:24px;"></div>
                <div style="margin-top:12px; font-weight:700; font-size:13px; color:#fff;">Analyzing for <span style="color:var(--brand-primary);">${selectedRole}</span>...</div>
              ` : user.cachedResumeText ? `
                <div style="font-size:26px; margin-bottom:6px; opacity:0.9;">📄</div>
                <div style="font-size:13px; font-weight:700; color:var(--text-main); margin-bottom:2px;">${user.cachedResumeFileName || 'Resume.pdf'}</div>
                <div style="font-size:10.5px; color:var(--brand-secondary); font-weight:700; margin-bottom:10px;">✓ Loaded in Workspace (Ready for all roles)</div>
                <button class="btn-premium-ghost" style="font-size:10.5px; padding:4px 14px; border-radius:100px; min-height:auto; height:28px;">Replace PDF</button>
              ` : `
                <div style="font-size:24px; margin-bottom:12px; opacity:0.5;">📄</div>
                <button class="btn-premium-ghost" style="font-size:11px; padding:6px 16px; border-radius:100px; min-height:auto; height:32px;">Browse PDF</button>
              `}
            </div>
            <div style="margin-top:16px; display:flex; gap:12px; align-items:center;">
              <div style="flex:1; padding:8px 12px; background:var(--success-bg); border:1px solid var(--success-border); border-radius:10px; display:flex; align-items:center; gap:8px;">
                 <div style="width:6px; height:6px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 6px var(--brand-secondary);"></div>
                 <span style="font-size:11px; font-weight:700; color:var(--brand-secondary);">${user.cachedResumeText ? 'Resume Loaded' : 'Scanner Ready'}</span>
              </div>
              <button type="button" id="refresh-scan-btn" class="btn-premium-ghost" style="height:32px; min-height:auto; padding:0 12px; font-size:11px; border-radius:10px; display:flex; align-items:center; gap:6px; background:var(--glass-2); border:1px solid var(--glass-border-main); color:var(--text-main); cursor:pointer;">
                 <span>🔄 Reset</span>
              </button>
            </div>
          </div>

          <!-- ATS Score Node -->
          <div class="card-ent" style="padding:24px; text-align:center;">
            <h3 class="h2-ent" style="font-size:14px; margin-bottom:20px; text-align:left;">ATS Compatibility</h3>
            <div style="position:relative; width:150px; height:150px; margin:0 auto;">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="65" fill="none" stroke="var(--border-main)" stroke-width="10"/>
                <circle cx="75" cy="75" r="65" fill="none" stroke="var(--brand-primary)" stroke-width="10" 
                        stroke-dasharray="408" stroke-dashoffset="${408 - (408 * score / 100)}" 
                        stroke-linecap="round" style="transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);"/>
              </svg>
              <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div class="metric-ent" style="font-size:36px; color:var(--brand-primary); font-weight:850;">${score}</div>
                <div class="label-ent" style="font-size:10.5px; margin-top:-2px; font-weight:800;">Score</div>
              </div>
            </div>
            <div class="label-ent" style="margin-top:18px; font-size:12px; font-weight:800; color:var(--brand-primary); letter-spacing:0.08em;">
              ${scoreLabel}
            </div>
            ${analysis ? `
              <div style="margin-top:8px; font-size:11px; color:var(--text-muted);">
                Target: <span style="color:var(--brand-primary); font-weight:700;">${selectedRole}</span>
              </div>
            ` : ''}
          </div>

          <!-- Score History Timeline Card (Feature 2) -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 class="h2-ent" style="font-size:14px;">📈 Score History</h3>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:10px; color:var(--text-muted); font-weight:600;">${resumeHistory.length} Scans</span>
                ${resumeHistory.length > 0 ? `
                  <button type="button" id="clear-all-history-btn" title="Clear all score history" style="
                    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
                    color: #ef4444; font-size: 10px; font-weight: 700; padding: 2px 8px;
                    border-radius: 6px; cursor: pointer; transition: all 0.2s;
                  ">🗑️ Clear</button>
                ` : ''}
              </div>
            </div>
            ${resumeHistory.length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto; padding-right:4px;">
                ${resumeHistory.map((h, idx) => `
                  <div style="display:grid; grid-template-columns:1fr 70px 32px 24px; align-items:center; gap:8px; padding:8px 10px; background:rgba(0,0,0,0.15); border-radius:8px; border:1px solid var(--glass-border-subtle);">
                    <div style="overflow:hidden;">
                      <div style="font-size:11.5px; font-weight:700; color:var(--text-main); line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${h.role || 'General'}">${h.role || 'General'}</div>
                      <div style="font-size:9.5px; color:var(--text-muted); margin-top:2px;">${h.date || ''}</div>
                    </div>
                    <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;">
                      <div style="height:100%; width:${h.score}%; background:${h.score >= 75 ? 'var(--brand-secondary)' : h.score >= 50 ? '#f59e0b' : '#ef4444'}; border-radius:10px;"></div>
                    </div>
                    <div style="font-size:13px; font-weight:800; color:${h.score >= 75 ? 'var(--brand-secondary)' : h.score >= 50 ? '#f59e0b' : '#ef4444'}; text-align:right; font-family:var(--font-display);">${h.score}</div>
                    <button type="button" class="delete-history-btn" data-index="${idx}" title="Delete this scan" style="
                      background:transparent; border:none; color:var(--text-muted); cursor:pointer;
                      font-size:14px; line-height:1; padding:2px; text-align:center; transition:color 0.2s;
                    " onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--text-muted)'">✕</button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="color:var(--text-muted); font-size:12px; text-align:center; padding:12px 0;">
                No scan history yet. Upload your first resume to start tracking progress.
              </div>
            `}
          </div>

        </div>

        <!-- RIGHT COLUMN: Detailed Analytics -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Keyword Analysis -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <h3 class="h2-ent" style="font-size:15px;">Keyword Semantic Audit</h3>
              <div style="background:var(--brand-primary-light); color:var(--brand-primary); padding:3px 10px; border-radius:100px; font-size:9px; font-weight:800;">FOR ${selectedRole.toUpperCase()}</div>
            </div>
            
            <div class="keywords-subgrid">
              <div>
                <div class="label-ent" style="color:var(--brand-secondary); margin-bottom:12px; font-size:10px;">✓ Detected (${foundKws.length})</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                  ${foundKws.length ? foundKws.map(k => `<span class="tag-ent tag-positive">${k}</span>`).join('') : '<span style="color:var(--text-muted); font-size:12px;">Awaiting scan...</span>'}
                </div>
              </div>
              <div>
                <div class="label-ent" style="color:var(--brand-primary); margin-bottom:12px; font-size:10px;">✗ Missing (${missingKws.length})</div>
                <div style="display:flex; flex-wrap:wrap; gap:6px;">
                  ${missingKws.length ? missingKws.map(k => `<span class="tag-ent tag-negative">${k}</span>`).join('') : '<span style="color:var(--text-muted); font-size:12px;">No critical gaps.</span>'}
                </div>
              </div>
            </div>
          </div>

          <!-- Industry Match -->
          <div class="card-ent" style="padding:24px; display:flex; flex-direction:column; justify-content:space-between; min-height:200px;">
            <div>
              <h3 class="h2-ent" style="font-size:15px; margin-bottom:20px; font-family:var(--font-display);">Industry Alignment</h3>
              <div style="display:flex; flex-direction:column; gap:16px;">
                ${industries.length ? industries.map(([n, v]) => `
                  <div style="display:grid; grid-template-columns: 160px 1fr 40px; align-items:center; gap:16px;">
                    <span style="font-size:12px; font-weight:600; color:var(--text-description); text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${formatLabel(n)}">${formatLabel(n)}</span>
                    <div style="height:6px; background:rgba(0,0,0,0.25); border-radius:10px; overflow:hidden;">
                      <div style="height:100%; width:${v}%; background:linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius:10px;"></div>
                    </div>
                    <span style="font-size:12px; font-weight:800; color:#fff; text-align:right; font-family:var(--font-display);">${v}%</span>
                  </div>
                `).join('') : '<div style="color:var(--text-muted); font-size:12px;">Awaiting alignment...</div>'}
              </div>
            </div>
            ${industryAnalysisText ? `
              <div style="margin-top:20px; padding:12px 16px; background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-subtle); border-radius:10px; font-size:12px; line-height:1.6; color:var(--text-description); word-break:break-word; text-align:left;">
                <strong style="color:#fff;">AI Analysis:</strong> ${industryAnalysisText}
              </div>
            ` : ''}
          </div>

          <!-- Job Drive Match Insights (Feature 3) -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 class="h2-ent" style="font-size:15px;">🎯 Campus Drive Alignment</h3>
              ${driveMatches.length > 0 ? `<div style="background:rgba(52,211,153,0.1); color:var(--brand-secondary); padding:3px 10px; border-radius:100px; font-size:9px; font-weight:800; border:1px solid rgba(52,211,153,0.2);">${driveMatches.length} ELIGIBLE DRIVES</div>` : ''}
            </div>
            ${driveMatches.length > 0 ? `
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${driveMatches.map(d => `
                  <div style="display:grid; grid-template-columns:1fr auto; align-items:center; gap:16px; padding:12px 16px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border-subtle); border-radius:12px;">
                    <div>
                      <div style="font-size:13px; font-weight:700; color:#fff; margin-bottom:3px;">${d.company} — <span style="color:var(--brand-primary);">${d.role}</span></div>
                      <div style="display:flex; gap:8px; align-items:center; font-size:11px; color:var(--text-muted);">
                        <span>💼 ${d.package || 'N/A'}</span>
                        <span style="opacity:0.3;">•</span>
                        <span>📅 Deadline: ${(() => {
                          if (!d.deadline || d.deadline === 'N/A' || d.deadline === 'Open') return 'Ongoing';
                          try {
                            const dt = new Date(String(d.deadline).trim());
                            if (!isNaN(dt.getTime())) return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
                            return String(d.deadline).split('T')[0];
                          } catch(e) { return d.deadline; }
                        })()}</span>
                      </div>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:18px; font-weight:900; color:${d.matchScore >= 60 ? 'var(--brand-secondary)' : d.matchScore >= 40 ? '#f59e0b' : '#ef4444'}; font-family:var(--font-display);">${d.matchScore}%</div>
                      <div style="font-size:9px; color:var(--text-muted); font-weight:700;">MATCH</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="color:var(--text-muted); font-size:12px; text-align:center; padding:16px 0;">
                ${analysis ? 'No active campus drives matched your detected keywords yet.' : 'Upload a resume to cross-reference your skills with active campus placement drives.'}
              </div>
            `}
          </div>

          <!-- AI Suggestions -->
          <div class="card-ent" style="padding:24px;">
            <h3 class="h2-ent" style="font-size:15px; margin-bottom:20px; font-family:var(--font-display);">Optimization Pulse</h3>
            <div style="display:flex; flex-direction:column; gap:12px;">
              ${suggestions.length ? suggestions.map(s => `
                <div style="display:flex; gap:16px; align-items:flex-start; padding:16px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border-subtle); border-radius:12px; transition: all var(--t-fast);">
                  <div style="font-size:20px; line-height:1.2; padding-top:2px; flex-shrink:0;">${s.icon || '✨'}</div>
                  <div style="display:flex; flex-direction:column; gap:6px; text-align:left;">
                    <div style="font-weight:700; color:#fff; font-size:13.5px; line-height:1.4; font-family:var(--font-display);">${s.title}</div>
                    ${s.description ? `<div style="font-size:12px; color:var(--text-description); line-height:1.6;">${s.description}</div>` : ''}
                  </div>
                </div>
              `).join('') : '<div style="color:var(--text-muted); font-size:12px;">Ingest for insights.</div>'}
            </div>
          </div>

        </div>
      </div>

      <!-- Diagnostic Console (Collapsible) -->
      <div style="margin-top:24px; background:rgba(0,0,0,0.3); border:1px solid var(--glass-border-main); border-radius:12px; overflow:hidden;">
        <div style="padding:12px 16px; background:var(--glass-1); display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="const c = document.getElementById('debug-console-body'); c.style.display = c.style.display === 'none' ? 'block' : 'none';">
          <span style="font-size:12px; font-weight:700; color:#a1a1aa; display:flex; align-items:center; gap:8px;">🛠️ Diagnostic Console</span>
          <span style="font-size:11px; color:#71717a;">Click to Expand/Collapse</span>
        </div>
        <div id="debug-console-body" style="display:none; padding:16px; font-family:monospace; font-size:11px; max-height:200px; overflow-y:auto; border-top:1px solid var(--glass-border-subtle); background:#020205; line-height:1.5;">
          ${(window.diagnosticLogs || []).map(l => {
            let color = '#cbd5e1';
            if (l.type === 'warn') color = '#fbbf24';
            if (l.type === 'error') color = '#ef4444';
            return `<div style="color:${color}; margin-bottom:4px;">[${l.type.toUpperCase()}] ${l.text}</div>`;
          }).join('') || '<div style="color:#71717a;">No logs recorded yet. Upload a file to test.</div>'}
        </div>
      </div>
    </div>

    <style>
      .tag-ent { 
        padding: 4px 10.5px; 
        border-radius: 6px; 
        font-size: 11px; 
        font-weight: 800; 
        border: 1px solid transparent;
        letter-spacing: 0.02em;
      }
      .tag-positive { 
        background: rgba(4, 120, 87, 0.05); 
        border-color: rgba(4, 120, 87, 0.12); 
        color: #047857; 
      }
      [data-theme="dark"] .tag-positive { 
        background: rgba(52, 211, 153, 0.08); 
        border-color: rgba(52, 211, 153, 0.18); 
        color: #34D399; 
      }
      .tag-negative { 
        background: rgba(185, 28, 28, 0.05); 
        border-color: rgba(185, 28, 28, 0.12); 
        color: #B91C1C; 
      }
      [data-theme="dark"] .tag-negative { 
        background: rgba(239, 68, 68, 0.08); 
        border-color: rgba(239, 68, 68, 0.18); 
        color: #F87171; 
      }
      
      .neural-spinner {
        width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.05); border-top-color: var(--brand-primary);
        border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      #dropzone:hover { border-color: rgba(129, 140, 248, 0.4); background: rgba(129, 140, 248, 0.03); }

      /* Responsive Layout Classes */
      .resume-workspace-grid {
        display: grid;
        grid-template-columns: 340px 1fr;
        gap: 32px;
        align-items: start;
      }
      .keywords-subgrid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 32px;
      }
      .analytics-subgrid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
      }

      @media (max-width: 1024px) {
        .resume-workspace-grid {
          grid-template-columns: 1fr;
          gap: 24px;
        }
      }
      @media (max-width: 768px) {
        .analytics-subgrid {
          grid-template-columns: 1fr;
          gap: 16px;
        }
      }
      @media (max-width: 640px) {
        .keywords-subgrid {
          grid-template-columns: 1fr;
          gap: 20px;
        }
      }
    </style>
    `;

    // Role Selector change event (Feature 1 - Instant Auto Re-Scan with loaded resume)
    const roleSelector = root.querySelector('#role-selector');
    if (roleSelector) {
      roleSelector.addEventListener('change', async (e) => {
        selectedRole = e.target.value;
        user.resumeTargetRole = selectedRole;
        if (Store.session?.user) {
          Store.session.user.resumeTargetRole = selectedRole;
        }
        saveStore();

        // If resume text is already loaded in memory, auto re-analyze instantly!
        if (user.cachedResumeText) {
          await runAnalysis(user.cachedResumeText, selectedRole);
        } else {
          renderUI(analysis, false);
        }
      });
    }

    // Download Report Button (Feature 4)
    const downloadBtn = root.querySelector('#download-report-btn');
    if (downloadBtn && analysis) {
      downloadBtn.addEventListener('click', () => {
        triggerReportDownload(analysis, user, selectedRole);
      });
    }

    // Clear All History Button
    const clearHistoryBtn = root.querySelector('#clear-all-history-btn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearAllResumeHistory(user.id, Store);
        renderUI(analysis, false);
      });
    }

    // Individual Scan Item Delete Buttons
    const deleteItemBtns = root.querySelectorAll('.delete-history-btn');
    deleteItemBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) {
          deleteResumeHistoryItem(user.id, idx, Store);
          renderUI(analysis, false);
        }
      });
    });

    const fileInput = root.querySelector('#resume-file-input');
    if (fileInput) fileInput.addEventListener('change', handleFileUpload);

    const refreshBtn = root.querySelector('#refresh-scan-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // Reset locally
        const updatedAnalysis = {
          ats_score: 0,
          found_keywords: [],
          missing_keywords: [],
          suggestions: [],
          industry_match: {},
          sandbox: null,
          sandbox_url: null
        };
        user.resume_analysis = updatedAnalysis;
        user.atsScore = 0;
        user.cachedResumeText = null;
        user.cachedResumeFileName = null;
        if (Store.session?.user) {
          Store.session.user.resume_analysis = updatedAnalysis;
          Store.session.user.atsScore = 0;
          Store.session.user.cachedResumeText = null;
          Store.session.user.cachedResumeFileName = null;
        }

        try {
          const cache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
          if (cache[user.id]) {
            delete cache[user.id].cachedResumeText;
            delete cache[user.id].cachedResumeFileName;
            localStorage.setItem('placenix_profile_cache', JSON.stringify(cache));
          }
        } catch(e){}
        
        if (Store.students && Array.isArray(Store.students)) {
          const studentIdx = Store.students.findIndex(s => String(s.id) === String(user.id));
          if (studentIdx !== -1) {
            Store.students[studentIdx].resume_analysis = updatedAnalysis;
            Store.students[studentIdx].atsScore = 0;
          }
        }
        saveStore();

        // Update Supabase profiles DB if available (non-fatal)
        if (supabase) {
          try {
            await supabase.from('profiles').update({ resume_analysis: updatedAnalysis }).eq('id', user.id);
          } catch (dbErr) {
            console.warn("Supabase Reset Profile Database Failure (non-fatal):", dbErr);
          }
        }

        renderUI(null, false);
      });
    }

    // Modern HTML5 Drag & Drop Support
    const dropzone = root.querySelector('#dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--brand-primary)';
        dropzone.style.background = 'rgba(124,58,237,0.03)';
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'rgba(255,255,255,0.08)';
        dropzone.style.background = 'rgba(255,255,255,0.01)';
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'rgba(255,255,255,0.08)';
        dropzone.style.background = 'rgba(255,255,255,0.01)';
        
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const fakeEvent = { target: { files: files } };
          handleFileUpload(fakeEvent);
        }
      });
    }

    // Auto-update Diagnostic Console logs
    const updateConsole = () => {
      const consoleBody = root.querySelector('#debug-console-body');
      if (consoleBody) {
        consoleBody.innerHTML = (window.diagnosticLogs || []).map(l => {
          let color = '#cbd5e1';
          if (l.type === 'warn') color = '#fbbf24';
          if (l.type === 'error') color = '#ef4444';
          return `<div style="color:${color}; margin-bottom:4px;">[${l.type.toUpperCase()}] ${l.text}</div>`;
        }).join('') || '<div style="color:#71717a;">No logs recorded yet. Upload a file to test.</div>';
        consoleBody.scrollTop = consoleBody.scrollHeight;
      }
    };
    window.addEventListener('diagnostic-log', updateConsole);
  };

  // --- Dynamic Scan Handler (PDF Extraction & Run) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (!file || !isPdf) {
      console.warn("Invalid file format selected. Only PDF files are accepted:", file);
      alert("Invalid file format. Please select a valid PDF file.");
      return;
    }

    const targetRole = selectedRole || 'Software Engineer';
    renderUI(user.resume_analysis?.sandbox || user.resume_analysis, true);

    try {
      // Extract text from PDF once and cache it in profile & session
      const text = await extractTextFromPDF(file);
      user.cachedResumeText = text;
      user.cachedResumeFileName = file.name;
      if (Store.session?.user) {
        Store.session.user.cachedResumeText = text;
        Store.session.user.cachedResumeFileName = file.name;
      }

      await runAnalysis(text, targetRole);

      // Perform Supabase Storage Upload & DB Profile Update asynchronously in background
      if (supabase) {
        (async () => {
          try {
            let publicUrl = null;
            const fileName = `${user.id}/resume_${Date.now()}.pdf`;
            const uploadRes = await supabase.storage.from('resumes').upload(fileName, file);
            if (!uploadRes.error) {
              const { data } = supabase.storage.from('resumes').getPublicUrl(fileName);
              publicUrl = data?.publicUrl;
            } else {
              console.warn("Supabase Storage Upload Failure (non-fatal background):", uploadRes.error.message);
            }

            if (publicUrl) {
              user.resume_analysis.sandbox_url = publicUrl;
              await supabase.from('profiles').update({ resume_analysis: user.resume_analysis }).eq('id', user.id);
              saveStore();
            }
          } catch (bgErr) {
            console.warn("Background resume upload/sync failed:", bgErr);
          }
        })();
      }
    } catch (error) {
      console.error("Intelligence failure:", error);
      alert("Intelligence Engine Error: " + error.message);
      renderUI(user.resume_analysis?.sandbox || user.resume_analysis, false);
    }
  };

  const sandboxAnalysis = user.resume_analysis?.sandbox || user.resume_analysis;
  renderUI(sandboxAnalysis, false);
}

// ── Module-Level Exportable AI Helpers ───────────────────────────

export async function loadPdfJs() {
  if (window.pdfjsLib) return;

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  try {
    // Load main pdf.js library
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js');
    // Load the worker script as a standard script tag (populates fake worker handler on window.pdfjsLib)
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js');
    
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      console.log("pdf.js and worker script loaded successfully.");
    }
  } catch (err) {
    console.error("Failed to load pdf.js scripts:", err);
  }
}

export const extractTextFromPDF = async (file) => {
  await loadPdfJs();
  if (!window.pdfjsLib) {
    throw new Error("PDF parser library could not be loaded.");
  }
  const arrayBuffer = await file.arrayBuffer();
  const typedArray = new Uint8Array(arrayBuffer);
  
  // Wrap the loading task promise in a timeout to prevent infinite hangs
  const parsingPromise = (async () => {
    const loadingTask = window.pdfjsLib.getDocument({ data: typedArray });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(s => s.str || '').join(' ') + '\n';
    }
    return fullText;
  })();
  
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("PDF parsing timed out.")), 3000)
  );
  
  return Promise.race([parsingPromise, timeoutPromise]);
};

export function analyzeResumeLocally(text, targetRole = 'Software Engineer') {
  const cleanText = (text || '').toLowerCase();
  
  // Define keywords based on selected target role (Feature 1 + Bug fix)
  const allKeywords = ROLE_KEYWORDS[targetRole] || ROLE_KEYWORDS['Software Engineer'];
  
  const found_keywords = [];
  const missing_keywords = [];
  
  allKeywords.forEach(kw => {
    // Normalizing keyword for search
    const cleanKw = kw.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchRegex = new RegExp('\\b' + kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
    
    if (cleanText.includes(cleanKw) || searchRegex.test(cleanText)) {
      found_keywords.push(kw);
    } else {
      missing_keywords.push(kw);
    }
  });

  // Calculate dynamic ATS score
  // Baseline is 50, each found keyword adds proportional points, capped at 97
  const scoreMultiplier = 47 / Math.max(allKeywords.length, 1);
  const ats_score = Math.min(97, Math.max(50, 50 + Math.round(found_keywords.length * scoreMultiplier)));
  
  // Dynamic industry alignment percentages based on category
  const roleCategories = {
    dev: ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer'],
    data: ['Data Analyst', 'Data Scientist', 'Machine Learning Engineer'],
    devops: ['DevOps Engineer', 'Cloud Architect'],
    security: ['Cybersecurity Analyst', 'Network Engineer'],
    design: ['UI/UX Designer', 'Product Manager'],
    hardware: ['Mechanical Engineer', 'Civil Engineer', 'Electrical Engineer', 'Embedded Systems Engineer']
  };

  let industry_match = {};
  if (roleCategories.dev.includes(targetRole)) {
    const saas = found_keywords.filter(k => ["React.js", "TypeScript", "Node.js", "GraphQL", "REST APIs", "JavaScript", "HTML5", "CSS3"].includes(k)).length;
    const fintech = found_keywords.filter(k => ["SQL", "PostgreSQL", "Python", "Java", "Algorithms", "Data Structures"].includes(k)).length;
    const cloud = found_keywords.filter(k => ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux"].includes(k)).length;
    industry_match = {
      "Enterprise SaaS": Math.min(100, Math.max(35, 30 + saas * 10)),
      "FinTech": Math.min(100, Math.max(35, 30 + fintech * 12)),
      "Cloud Native Platforms": Math.min(100, Math.max(35, 30 + cloud * 12))
    };
  } else if (roleCategories.data.includes(targetRole)) {
    const ai = found_keywords.filter(k => ["Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "NLP"].includes(k)).length;
    const bi = found_keywords.filter(k => ["Tableau", "Power BI", "SQL", "Excel", "Data Visualization"].includes(k)).length;
    industry_match = {
      "AI & Data Intelligence": Math.min(100, Math.max(35, 30 + ai * 14)),
      "Business Intelligence": Math.min(100, Math.max(35, 30 + bi * 14)),
      "Enterprise Analytics": ats_score
    };
  } else if (roleCategories.devops.includes(targetRole)) {
    const cloud = found_keywords.filter(k => ["AWS", "Azure", "GCP", "Kubernetes", "Terraform", "Docker"].includes(k)).length;
    industry_match = {
      "Cloud Infrastructure": Math.min(100, Math.max(35, 30 + cloud * 14)),
      "DevOps Automation": ats_score,
      "Enterprise SaaS": Math.max(35, ats_score - 10)
    };
  } else if (roleCategories.hardware.includes(targetRole)) {
    const cad = found_keywords.filter(k => ["CAD", "SolidWorks", "AutoCAD", "ANSYS", "CATIA", "Revit", "MATLAB"].includes(k)).length;
    industry_match = {
      "Manufacturing & R&D": Math.min(100, Math.max(35, 30 + cad * 14)),
      "Core Engineering": ats_score,
      "Infrastructure & IoT": Math.max(35, ats_score - 8)
    };
  } else {
    industry_match = {
      "Enterprise Consulting": ats_score,
      "Product Startups": Math.max(35, ats_score - 5),
      "Digital Platforms": Math.max(35, ats_score - 10)
    };
  }

  // Generate dynamic suggestions based on missing keywords and role
  const suggestions = [];
  if (missing_keywords.length > 0) {
    suggestions.push({
      title: `Incorporate Missing ${targetRole} Skills`,
      description: `Target high-impact skills: ${missing_keywords.slice(0, 4).join(', ')}. Add them in project descriptions.`,
      icon: "🔑"
    });
  }
  if (ats_score < 75) {
    suggestions.push({
      title: "Quantifiable Impact Metrics",
      description: "Enhance bullet points with numerical achievements (e.g., 'Optimized query latency by 35%').",
      icon: "📊"
    });
  }
  if (missing_keywords.some(k => ["Docker Orchestration", "Docker", "Kubernetes", "AWS", "Cloud Infrastructure"].includes(k))) {
    suggestions.push({
      title: "Cloud & Container Alignment",
      description: "Highlight containerization (Docker) or cloud deployments to match enterprise job descriptions.",
      icon: "🏗️"
    });
  }
  if (suggestions.length < 3) {
    suggestions.push({
      title: "ATS Layout & Section Integrity",
      description: "Verify that section titles (Experience, Skills, Projects, Education) follow standard header conventions.",
      icon: "📄"
    });
  }

  return {
    ats_score,
    found_keywords,
    missing_keywords,
    industry_match,
    suggestions: suggestions.slice(0, 3)
  };
}

export const analyzeWithGemini = async (text, targetRole, Store) => {
  const isDummy = !(window.__ENV__ && window.__ENV__.HAS_REAL_GEMINI_KEY);

  if (isDummy) {
    console.warn("AI Intelligence: GEMINI_API_KEY missing or placeholder. Activating Dynamic Local Scanner.");
    await new Promise(r => setTimeout(r, 1500));
    return analyzeResumeLocally(text, targetRole);
  }
  try {
    const prompt = `Analyze this resume for a ${targetRole} role. Be strict and critical for ATS. Return raw JSON with keys: "ats_score" (0-100), "found_keywords" (array of strings), "missing_keywords" (array of strings), "industry_match" (key-value object mapping exactly 3 industry names to match percentage numbers 0-100), "suggestions" (array of objects with keys "title", "description", and "icon" where "icon" is a single representative emoji character like 📊, ⚠️, 💻, 📈, 🔑, etc.).`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`/api/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt + "\n\nResume Text:\n" + text.substring(0, 10000) }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    if (!data.candidates || !data.candidates[0]) throw new Error("AI did not return any candidates.");
    let txt = data.candidates[0].content.parts[0].text.trim();
    if (txt.startsWith('```')) {
      txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }
    return JSON.parse(txt);
  } catch (e) { 
    console.error("Gemini AI parsing failure detail:", e);
    return analyzeResumeLocally(text, targetRole);
  }
};
