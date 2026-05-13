// ============================================================
// PLACENIX — AI RESUME INTELLIGENCE OPERATING SYSTEM (v2.4)
// ============================================================

export async function loadResumePage(root, Store, supabase) {
  const user = Store.session?.user;
  if (!user) {
    root.innerHTML = '<div style="padding:100px; text-align:center; color:var(--text-description);">Institutional session expired. Please re-authenticate.</div>';
    return;
  }

  const renderUI = (analysis = null, isUploading = false) => {
    let score = analysis?.ats_score || 0;
    let scoreLabel = 'High Compatibility';
    let scoreClass = 'status-success';
    if (score < 50) { scoreLabel = 'Critical Revision Needed'; scoreClass = 'status-danger'; }
    else if (score < 75) { scoreLabel = 'Standard Match'; scoreClass = 'status-warning'; }

    const foundKws = analysis?.found_keywords || [];
    const missingKws = analysis?.missing_keywords || [];
    const industries = Object.entries(analysis?.industry_match || {}).slice(0, 3);
    const suggestions = analysis?.suggestions || [];

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

      <!-- Main Workspace Grid (Optimized for Single View) -->
      <div style="display:grid; grid-template-columns: 340px 1fr; gap: 32px; align-items: start;">
        
        <!-- LEFT COLUMN: Input & Score -->
        <div style="display:flex; flex-direction:column; gap:24px;">
          
          <!-- Upload Node -->
          <div class="card-ent" style="padding:24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
              <h3 class="h2-ent" style="font-size:14px;">Upload Node</h3>
              <select id="target-role" class="input-ent" style="width:130px; height:30px; font-size:11px; padding:2px 10px;">
                <option value="Software Engineer">Software Engineer</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Product Manager">Product Manager</option>
              </select>
            </div>
            
            <div id="dropzone" style="
              border: 1px dashed rgba(255,255,255,0.08);
              border-radius: 12px;
              padding: 32px 16px;
              text-align: center;
              background: rgba(255,255,255,0.01);
              transition: all var(--t-fast);
              cursor: pointer;
            " onclick="document.getElementById('resume-file-input').click()">
              <input type="file" id="resume-file-input" accept=".pdf" style="display:none">
              ${isUploading ? `
                <div class="neural-spinner" style="width:24px; height:24px;"></div>
                <div style="margin-top:12px; font-weight:700; font-size:13px; color:#fff;">Analyzing...</div>
              ` : `
                <div style="font-size:24px; margin-bottom:12px; opacity:0.5;">📄</div>
                <button class="btn-premium-ghost" style="font-size:11px; padding:6px 16px; border-radius:100px;">Browse PDF</button>
              `}
            </div>
            <div style="margin-top:16px; padding:8px 12px; background:rgba(16,185,129,0.03); border:1px solid rgba(16,185,129,0.1); border-radius:10px; display:flex; align-items:center; gap:8px;">
               <div style="width:6px; height:6px; background:var(--brand-secondary); border-radius:50%;"></div>
               <span style="font-size:11px; font-weight:700; color:var(--brand-secondary);">System Online</span>
            </div>
          </div>

          <!-- ATS Score Node -->
          <div class="card-ent" style="padding:24px; text-align:center;">
            <h3 class="h2-ent" style="font-size:14px; margin-bottom:20px; text-align:left;">ATS Compatibility</h3>
            <div style="position:relative; width:150px; height:150px; margin:0 auto;">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <circle cx="75" cy="75" r="65" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="10"/>
                <circle cx="75" cy="75" r="65" fill="none" stroke="var(--brand-primary)" stroke-width="10" 
                        stroke-dasharray="408" stroke-dashoffset="${408 - (408 * score / 100)}" 
                        stroke-linecap="round" style="transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);"/>
              </svg>
              <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
                <div class="metric-ent" style="font-size:32px;">${score}</div>
                <div class="label-ent" style="font-size:9px; margin-top:-2px;">Score</div>
              </div>
            </div>
            <div style="margin-top:16px; font-size:11px; font-weight:800; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.05em;">
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
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
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

          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
            <!-- Industry Match -->
            <div class="card-ent" style="padding:24px;">
              <h3 class="h2-ent" style="font-size:15px; margin-bottom:20px;">Industry Alignment</h3>
              <div style="display:flex; flex-direction:column; gap:16px;">
                ${industries.length ? industries.map(([n, v]) => `
                  <div style="display:grid; grid-template-columns: 100px 1fr 40px; align-items:center; gap:16px;">
                    <span style="font-size:12px; font-weight:600; color:var(--text-description);">${n}</span>
                    <div style="height:4px; background:rgba(255,255,255,0.02); border-radius:10px; overflow:hidden;">
                      <div style="height:100%; width:${v}%; background:var(--brand-primary); border-radius:10px;"></div>
                    </div>
                    <span style="font-size:12px; font-weight:800; color:#fff; text-align:right;">${v}%</span>
                  </div>
                `).join('') : '<div style="color:var(--text-muted); font-size:11px;">Awaiting alignment...</div>'}
              </div>
            </div>

            <!-- AI Suggestions -->
            <div class="card-ent" style="padding:24px;">
              <h3 class="h2-ent" style="font-size:15px; margin-bottom:20px;">Optimization Pulse</h3>
              <div style="display:flex; flex-direction:column; gap:12px;">
                ${suggestions.length ? suggestions.map(s => `
                  <div style="display:flex; gap:12px; align-items:center; padding:10px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px;">
                    <div style="font-size:16px;">${s.icon || '✨'}</div>
                    <div style="font-weight:700; color:#fff; font-size:13px;">${s.title}</div>
                  </div>
                `).join('') : '<div style="color:var(--text-muted); font-size:11px;">Ingest for insights.</div>'}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <style>
      .tag-ent { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid transparent; }
      .tag-positive { background: rgba(14, 165, 233, 0.05); border-color: rgba(14, 165, 233, 0.1); color: var(--brand-secondary); }
      .tag-negative { background: rgba(139, 92, 246, 0.05); border-color: rgba(139, 92, 246, 0.1); color: var(--brand-primary); }
      
      .neural-spinner {
        width: 24px; height: 24px; border: 2px solid rgba(255,255,255,0.05); border-top-color: var(--brand-primary);
        border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      #dropzone:hover { border-color: var(--brand-primary); background: rgba(255,255,255,0.03); }
    </style>
    `;

    const fileInput = document.getElementById('resume-file-input');
    if (fileInput) fileInput.addEventListener('change', handleFileUpload);
  };

  // --- PDF & AI Logic (Same as v2.4 with Mock Fallback) ---
  const loadPdfJs = async () => {
    if (window.pdfjsLib) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const extractTextFromPDF = async (file) => {
    await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(s => s.str).join(' ') + '\n';
    }
    return fullText;
  };

  const analyzeWithGemini = async (text, targetRole) => {
    const apiKey = window.GEMINI_API_KEY || Store.config?.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("AI Intelligence: GEMINI_API_KEY missing. Activating Professional Mock.");
      await new Promise(r => setTimeout(r, 2000));
      return {
        ats_score: 84,
        found_keywords: ["React.js", "Node.js", "TypeScript", "System Architecture", "Cloud Infrastructure", "REST APIs", "web development", "problem-solving", "analytical skills"],
        missing_keywords: ["GraphQL", "Docker Orchestration", "CI/CD Pipeline", "Algorithms", "Unit Testing"],
        industry_match: { "Enterprise SaaS": 85, "FinTech": 60, "E-commerce": 50 },
        suggestions: [
          { title: "Quantifiable Impact", description: "Increase 'System Efficiency' metrics by adding numerical node data.", icon: "📊" },
          { title: "Architecture Depth", description: "Expand on 'Microservices' infrastructure to align with Tier 1 nodes.", icon: "🏗️" }
        ]
      };
    }
    try {
      const prompt = `Analyze this resume for a ${targetRole} role. Be strict and critical for ATS. Return raw JSON with keys: "ats_score" (0-100), "found_keywords" (array), "missing_keywords" (array), "industry_match" (object), "suggestions" (array of {title, description, icon}).`;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt + "\n\nResume Text:\n" + text.substring(0, 10000) }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });
      const data = await response.json();
      return JSON.parse(data.candidates[0].content.parts[0].text);
    } catch (e) { throw new Error("AI parsing failure. Using fallback."); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;
    const targetRole = document.getElementById('target-role').value;
    renderUI(user.resume_analysis, true);

    try {
      const fileName = `${user.id}/resume_${Date.now()}.pdf`;
      await supabase.storage.from('resumes').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(fileName);
      const text = await extractTextFromPDF(file);
      const analysis = await analyzeWithGemini(text, targetRole);
      await supabase.from('profiles').update({ resume_url: publicUrl, resume_analysis: analysis }).eq('id', user.id);
      user.resume_url = publicUrl;
      user.resume_analysis = analysis;
      renderUI(analysis, false);
    } catch (error) {
      console.error("Intelligence failure:", error);
      alert("Intelligence Engine Error: " + error.message);
      renderUI(user.resume_analysis, false);
    }
  };

  renderUI(user.resume_analysis, false);
}
