// ============================================================
// PLACENIX — AI RESUME INTELLIGENCE OPERATING SYSTEM (v2.4)
// ============================================================

import { saveStore } from '../store.js';

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

    root.innerHTML = `
    <div style="padding: 24px 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;">
      
      <!-- Breadcrumbs & Header (Condensed) -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:10px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.1em;">
            <span>Placenix</span>
            <span style="opacity:0.3;">/</span>
            <span style="color:var(--brand-primary);">Resume Intelligence</span>
          </div>
          <h1 class="h1-ent" style="font-size:24px;">Resume Intelligence</h1>
        </div>
        <div style="font-size:13px; color:var(--text-description); max-width:400px; text-align:right;">AI-powered optimization & role-match insights.</div>
      </div>

      <!-- Main Workspace Grid (Optimized for Responsive Views) -->
      <div class="resume-workspace-grid">
        
        <!-- LEFT COLUMN: Input & Score -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Upload Node -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 class="h2-ent" style="font-size:14px;">Upload Node</h3>
            </div>
            
            <input type="file" id="resume-file-input" accept=".pdf" style="display:none">
            <div id="dropzone" style="
              border: 1px dashed var(--glass-border-strong);
              border-radius: var(--radius-md);
              padding: 32px 16px;
              text-align: center;
              background: rgba(0, 0, 0, 0.2);
              transition: all var(--t-fast);
              cursor: pointer;
            " onclick="document.getElementById('resume-file-input').click()">
              ${isUploading ? `
                <div class="neural-spinner" style="width:24px; height:24px;"></div>
                <div style="margin-top:12px; font-weight:700; font-size:13px; color:#fff;">Analyzing...</div>
              ` : `
                <div style="font-size:24px; margin-bottom:12px; opacity:0.5;">📄</div>
                <button class="btn-premium-ghost" style="font-size:11px; padding:6px 16px; border-radius:100px; min-height:auto; height:32px;">Browse PDF</button>
              `}
            </div>
            <div style="margin-top:16px; display:flex; gap:12px; align-items:center;">
              <div style="flex:1; padding:8px 12px; background:var(--success-bg); border:1px solid var(--success-border); border-radius:10px; display:flex; align-items:center; gap:8px;">
                 <div style="width:6px; height:6px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 6px var(--brand-secondary);"></div>
                 <span style="font-size:11px; font-weight:700; color:var(--brand-secondary);">System Online</span>
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
          </div>

        </div>

        <!-- RIGHT COLUMN: Detailed Analytics -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Keyword Analysis -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
              <h3 class="h2-ent" style="font-size:15px;">Keyword Semantic Audit</h3>
              <div style="background:var(--brand-primary-light); color:var(--brand-primary); padding:3px 10px; border-radius:100px; font-size:9px; font-weight:800;">AI MATCHED</div>
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
          <div class="card-ent" style="padding:24px; display:flex; flex-direction:column; justify-content:space-between; min-height:220px;">
            <div>
              <h3 class="h2-ent" style="font-size:15px; margin-bottom:20px; font-family:var(--font-display);">Industry Alignment</h3>
              <div style="display:flex; flex-direction:column; gap:16px;">
                ${industries.length ? industries.map(([n, v]) => `
                  <div style="display:grid; grid-template-columns: 140px 1fr 40px; align-items:center; gap:16px;">
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
        if (Store.session?.user) {
          Store.session.user.resume_analysis = updatedAnalysis;
          Store.session.user.atsScore = 0;
        }
        
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

  // --- Dynamic Scan Handler (Isolates scans to sandbox key) ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    const isPdf = file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (!file || !isPdf) {
      console.warn("Invalid file format selected. Only PDF files are accepted:", file);
      alert("Invalid file format. Please select a valid PDF file.");
      return;
    }
    const targetRole = 'Software Engineer';
    const currentSandbox = user.resume_analysis?.sandbox || user.resume_analysis;
    renderUI(currentSandbox, true);

    try {
      // 1. Extract text and analyze via Gemini first (ensure immediate processing)
      let analysis;
      let text = "";
      try {
        text = await extractTextFromPDF(file);
        analysis = await analyzeWithGemini(text, targetRole, Store);
      } catch (innerErr) {
        console.warn("AI / PDF parsing failed. Using dynamic local scanner fallback:", innerErr);
        analysis = analyzeResumeLocally(text, targetRole);
      }

      // 2. Prepare the local updates first (guarantees UI responsiveness)
      const updatedAnalysis = {
        ...analysis,
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
      saveStore();

      // 3. Render the UI immediately with the new score (stops the "Analyzing..." spinner)
      renderUI(analysis, false);

      // 4. Perform Supabase Storage Upload & DB Profile Update asynchronously in background
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

            const dbAnalysis = {
              ...updatedAnalysis,
              sandbox_url: publicUrl || updatedAnalysis.sandbox_url
            };

            await supabase.from('profiles').update({ resume_analysis: dbAnalysis }).eq('id', user.id);
            
            // Sync background publicUrl back to local state
            user.resume_analysis.sandbox_url = dbAnalysis.sandbox_url;
            saveStore();
            console.log("Background resume upload and database sync successfully finished.");
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
  
  // Define standard keywords for Software Engineer role
  const allKeywords = [
    "React.js", "Node.js", "TypeScript", "System Architecture", "Cloud Infrastructure", 
    "REST APIs", "web development", "problem-solving", "analytical skills", "GraphQL", 
    "Docker Orchestration", "CI/CD Pipeline", "Algorithms", "Unit Testing", "Python", 
    "Java", "SQL", "Git", "Kubernetes", "AWS", "Data Structures", "Linux", "MongoDB",
    "PostgreSQL", "System Design", "Microservices", "Agile", "HTML5", "CSS3", "JavaScript"
  ];
  
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
  // Baseline is 50, each found keyword adds 2.5 points, capped at 97
  const ats_score = Math.min(97, Math.max(50, 50 + Math.round(found_keywords.length * 2.5)));
  
  // Calculate industry alignment percentages
  const isSaaSMatch = found_keywords.filter(k => ["React.js", "TypeScript", "Node.js", "GraphQL", "REST APIs", "JavaScript", "HTML5", "CSS3"].includes(k)).length;
  const isFinTechMatch = found_keywords.filter(k => ["SQL", "PostgreSQL", "Python", "Java", "Algorithms", "Data Structures"].includes(k)).length;
  const isCloudMatch = found_keywords.filter(k => ["AWS", "Docker Orchestration", "Kubernetes", "CI/CD Pipeline", "Cloud Infrastructure", "Linux"].includes(k)).length;
  
  const industry_match = {
    "Enterprise SaaS": Math.min(100, Math.max(35, 30 + isSaaSMatch * 10)),
    "FinTech": Math.min(100, Math.max(35, 30 + isFinTechMatch * 12)),
    "Cloud Native Infrastructure": Math.min(100, Math.max(35, 30 + isCloudMatch * 12))
  };

  // Generate dynamic suggestions based on missing keywords
  const suggestions = [];
  if (missing_keywords.includes("Docker Orchestration") || missing_keywords.includes("Kubernetes") || missing_keywords.includes("Cloud Infrastructure")) {
    suggestions.push({
      title: "Cloud Infrastructure Integration",
      description: "Incorporate container orchestration details (Docker, Kubernetes) to align with modern SaaS platforms.",
      icon: "🏗️"
    });
  }
  if (missing_keywords.includes("Unit Testing") || missing_keywords.includes("CI/CD Pipeline")) {
    suggestions.push({
      title: "Deployment & Quality Automation",
      description: "Highlight CI/CD workflows and unit testing frameworks to verify deployment maturity.",
      icon: "🧪"
    });
  }
  if (missing_keywords.includes("Algorithms") || missing_keywords.includes("Data Structures") || missing_keywords.includes("System Design")) {
    suggestions.push({
      title: "Core System Design depth",
      description: "Elaborate on database normalization, data structures, or load balancing in past projects.",
      icon: "🧠"
    });
  }
  
  // Default fallback suggestions if we have too few
  if (suggestions.length === 0) {
    suggestions.push({
      title: "Quantifiable Impact",
      description: "Enhance resume bullet points with numerical achievements (e.g. optimized performance by 25%).",
      icon: "📊"
    });
  }
  if (suggestions.length < 2) {
    suggestions.push({
      title: "ATS Formatting Check",
      description: "Verify that layout margins and section headers match standard structural parsing norms.",
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
    const prompt = `Analyze this resume for a ${targetRole} role. Be strict and critical for ATS. Return raw JSON with keys: "ats_score" (0-100), "found_keywords" (array of strings), "missing_keywords" (array of strings), "industry_match" (key-value object mapping exactly 3 industry names like "Enterprise SaaS", "FinTech", "HealthTech", etc. to their match percentage numbers 0-100), "suggestions" (array of objects with keys "title", "description", and "icon" where "icon" is a single representative emoji character like 📊, ⚠️, 💻, 📈, etc.).`;
    
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
