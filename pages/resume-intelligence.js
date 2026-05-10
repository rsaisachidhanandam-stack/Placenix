export async function loadResumePage(root, Store) {
  const GEMINI_API_KEY = 'AIzaSyDyMVkAkoAcCPqZDRl4iMfQxCvdPKJ0DvE'; // Do not expose in production
  
  // Import Supabase
  const { supabase } = await import('../supabase.js');
  const user = Store.session?.user;

  if (!user) {
    root.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">Please log in to use Resume Intelligence.</div>';
    return;
  }

  // Initial Render (Loading State or Empty State)
  const renderUI = (analysis = null, isUploading = false) => {
    let score = analysis?.ats_score || 0;
    let scoreLabel = 'Good · Above Average';
    let scoreColor = 'success';
    if (score < 50) { scoreLabel = 'Needs Improvement'; scoreColor = 'danger'; }
    else if (score < 75) { scoreLabel = 'Average'; scoreColor = 'warning'; }

    let foundKws = analysis?.found_keywords || ['React', 'Node.js', 'SQL'];
    let missingKws = analysis?.missing_keywords || ['AWS', 'Docker', 'System Design'];
    let industryMatches = analysis?.industry_match || { 'IT/Software Products': 85, 'Service Companies': 70 };
    let suggestions = analysis?.suggestions || [
      { title: 'Add a Professional Summary', description: 'Your resume lacks a 2-3 line summary.', icon: '📝', color: 'rgba(245,158,11,.15)' }
    ];

    // Format industry matches into array for rendering
    const industries = Object.entries(industryMatches).slice(0, 5);

    root.innerHTML = `
<style>
.resume-grid{display:grid;grid-template-columns:1fr 1.4fr;gap:24px;}
.upload-zone{border:2px dashed var(--border-glow);border-radius:16px;padding:48px 32px;text-align:center;background:rgba(124,58,237,.04);cursor:pointer;transition:all .3s;position:relative;overflow:hidden;}
.upload-zone:hover{background:rgba(124,58,237,.08);border-color:var(--brand-electric-violet);}
.upload-zone.loading{opacity:0.7;pointer-events:none;}
.upload-icon{font-size:48px;margin-bottom:16px;}
.upload-title{font-size:1.1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px;}
.upload-sub{font-size:.875rem;color:var(--text-muted);}
.ats-score-wrap{text-align:center;padding:24px 0;}
.ats-arc-wrap{position:relative;width:160px;height:160px;margin:0 auto 16px;}
.ats-arc-wrap svg{transform:rotate(-90deg);}
.ats-arc-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ats-arc-val{font-family:var(--font-display);font-size:2.2rem;font-weight:800;}
.ats-arc-lbl{font-size:.7rem;color:var(--text-muted);}
.kw-chip{display:inline-flex;padding:4px 10px;border-radius:99px;font-size:.75rem;font-weight:600;margin:3px;border:1px solid;}
.kw-found{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3);color:var(--success);}
.kw-missing{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.25);color:var(--danger);}
.suggestion-item{display:flex;gap:12px;padding:12px;background:rgba(255,255,255,.02);border:1px solid var(--border-subtle);border-radius:10px;margin-bottom:8px;}
.sug-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.sug-title{font-size:.85rem;font-weight:600;color:var(--text-primary);margin-bottom:3px;}
.sug-desc{font-size:.78rem;color:var(--text-secondary);}
.industry-card{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:10px;margin-bottom:8px;}
.industry-name{font-size:.875rem;font-weight:600;color:var(--text-primary);}
.industry-bar-wrap{display:flex;align-items:center;gap:10px;flex:1;margin:0 16px;}
.industry-bar{flex:1;height:6px;background:rgba(255,255,255,.05);border-radius:99px;overflow:hidden;}
.industry-fill{height:100%;border-radius:99px;background:var(--gradient-brand); transition: width 1s ease-out;}
.industry-pct{font-size:.8rem;font-weight:700;color:var(--text-primary);}
.loader { border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--brand-electric-violet); border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; display: inline-block; vertical-align: middle; margin-right: 8px;}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@media(max-width:900px){.resume-grid{grid-template-columns:1fr;}}
</style>
<div class="page-header">
  <h1 class="page-title">Resume Intelligence</h1>
  <p class="page-subtitle">AI-powered resume analysis, ATS optimization, and role-match insights</p>
</div>

<div class="resume-grid">
  <!-- Left panel -->
  <div style="display:flex;flex-direction:column;gap:20px;">
    <div class="card">
      <div class="card-header">
        <div class="card-title">Upload Your Resume</div>
        <div style="display:flex; gap:10px; align-items:center;">
            <select id="target-role" style="background:var(--bg-input); border:1px solid var(--border-subtle); color:var(--text-primary); padding:6px 12px; border-radius:8px; font-size:0.85rem;">
                <option value="Software Engineer">Software Engineer</option>
                <option value="Data Scientist">Data Scientist</option>
                <option value="Product Manager">Product Manager</option>
            </select>
            <span class="ai-badge">🤖 AI</span>
        </div>
      </div>
      <div class="upload-zone ${isUploading ? 'loading' : ''}" id="upload-zone" onclick="!this.classList.contains('loading') && document.getElementById('resume-file-input').click()">
        <input type="file" id="resume-file-input" accept=".pdf" style="display:none">
        <div class="upload-icon">${isUploading ? '<div class="loader" style="width:40px;height:40px;border-width:4px;"></div>' : '📄'}</div>
        <div class="upload-title" id="upload-title">${isUploading ? 'Analyzing Resume with AI...' : 'Drop your resume here'}</div>
        <div class="upload-sub" id="upload-sub">${isUploading ? 'Extracting text and comparing to industry JDs' : 'Supports PDF only · Max 5MB'}</div>
        <div style="margin-top:16px; display:${isUploading ? 'none' : 'block'};"><span class="btn btn-secondary btn-sm">Browse File</span></div>
      </div>
      <div id="file-status" style="display:${analysis ? 'block' : 'none'};margin-top:16px;padding:12px;background:var(--success-bg);border:1px solid var(--success-border);border-radius:10px;font-size:.85rem;color:var(--success);">
        ✓ Last analyzed successfully
      </div>
    </div>

    <div class="card" style="opacity: ${analysis ? '1' : '0.5'}; transition: opacity 0.3s;">
      <div class="card-header"><div class="card-title">ATS Compatibility Score</div></div>
      <div class="ats-score-wrap">
        <div class="ats-arc-wrap">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="12"/>
            <circle cx="80" cy="80" r="66" fill="none" stroke="url(#atsGrad)" stroke-width="12" stroke-dasharray="415" stroke-dashoffset="${415 - (415 * score / 100)}" stroke-linecap="round" style="transition: stroke-dashoffset 1s ease-out;"/>
            <defs><linearGradient id="atsGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#22D3EE"/></linearGradient></defs>
          </svg>
          <div class="ats-arc-center">
            <span class="ats-arc-val" style="background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${score}</span>
            <span class="ats-arc-lbl">ATS Score</span>
          </div>
        </div>
        <div class="badge badge-${scoreColor}" style="font-size:.85rem;padding:6px 14px;">${scoreLabel}</div>
        <p style="font-size:.8rem;color:var(--text-secondary);margin-top:12px;">Your resume passes ${score}% of ATS filters. Target: 90+ for top-tier companies.</p>
      </div>
    </div>
  </div>

  <!-- Right panel -->
  <div style="display:flex;flex-direction:column;gap:20px; opacity: ${analysis ? '1' : '0.5'}; transition: opacity 0.3s;">
    <div class="card">
      <div class="card-header"><div class="card-title">Keyword Analysis</div><span class="badge badge-violet">AI Matched</span></div>
      <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:12px;">Based on current market JDs</p>
      <div style="margin-bottom:14px;">
        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--success);margin-bottom:8px;">✓ Found Keywords (${foundKws.length})</div>
        <div>${foundKws.map(k=>`<span class="kw-chip kw-found">${k}</span>`).join('')}</div>
      </div>
      <div>
        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--danger);margin-bottom:8px;">✗ Missing Keywords (${missingKws.length})</div>
        <div>${missingKws.map(k=>`<span class="kw-chip kw-missing">${k}</span>`).join('')}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Industry Match</div><div class="card-subtitle">Role suitability by sector</div></div>
      ${industries.map(([n,v])=>`
        <div class="industry-card">
          <div class="industry-name" style="width:170px;flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${n}</div>
          <div class="industry-bar-wrap"><div class="industry-bar"><div class="industry-fill" style="width:${analysis ? v : 0}%"></div></div></div>
          <div class="industry-pct">${v}%</div>
        </div>`).join('')}
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">AI Improvement Suggestions</div><span class="ai-badge">🤖 AI</span></div>
      ${suggestions.map(s => `
        <div class="suggestion-item">
          <div class="sug-icon" style="background:${s.color || 'rgba(124,58,237,.15)'};">${s.icon || '💡'}</div>
          <div><div class="sug-title">${s.title}</div><div class="sug-desc">${s.description}</div></div>
        </div>`).join('')}
    </div>
  </div>
</div>`;

    // Attach event listener after rendering
    const fileInput = document.getElementById('resume-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
  };

  // --- Dynamic Script Loading for PDF.js ---
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

  // --- PDF Text Extraction ---
  const extractTextFromPDF = async (file) => {
    await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    try {
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(s => s.str).join(' ') + '\n';
        }
    } finally {
        if (pdf && typeof pdf.destroy === 'function') {
            pdf.destroy(); // Prevent memory leaks and worker freezing on subsequent uploads
        }
    }
    return fullText;
  };

  // --- Gemini API Call ---
  const analyzeWithGemini = async (text, targetRole) => {
    const prompt = `Analyze this resume for a ${targetRole} role. Be strict and critical, as this is for an ATS (Applicant Tracking System).
Return a raw JSON object (without markdown formatting or code blocks) with EXACTLY these keys:
- "ats_score": A number from 0-100 indicating how well it matches typical ${targetRole} job descriptions. Be realistic, don't just give 100.
- "found_keywords": Array of important technical and soft skill keywords found in the text. Maximum 10.
- "missing_keywords": Array of important keywords typically expected for a ${targetRole} but missing from this resume. Maximum 10.
- "industry_match": An object mapping industry names (e.g., "IT/Software", "Finance", "Healthcare") to a match percentage number (0-100). Provide exactly 3 industries.
- "suggestions": Array of objects, each with "title", "description", "icon" (a single emoji relevant to the suggestion), and "color" (a rgba color string like "rgba(124,58,237,.15)" for the icon background). Provide exactly 3 actionable suggestions to improve the resume.

Resume Text:
${text.substring(0, 15000)}`; // Limit text length to avoid token limits

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errData)}`);
        }
        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error("Unexpected Gemini response:", data);
            throw new Error("Gemini API returned an unexpected or blocked response.");
        }

        const jsonText = data.candidates[0].content.parts[0].text;
        
        // Extract JSON strictly between { and } in case Gemini adds conversational text
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
             console.error("No JSON found in response:", jsonText);
             throw new Error("Gemini returned invalid format.");
        }
        
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error("Gemini Parsing Error:", error);
        throw new Error("Failed to analyze resume: " + error.message);
    }
  };

  // --- Main File Upload Handler ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
        if (e.target) e.target.value = '';
        return;
    }
    
    if (file.type !== 'application/pdf') {
        alert("Please upload a PDF file.");
        if (e.target) e.target.value = '';
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("File is too large! Please upload a PDF under 5MB.");
        if (e.target) e.target.value = '';
        return;
    }

    const targetRole = document.getElementById('target-role').value;

    // Update UI to Loading State surgically (do not wipe DOM)
    const uploadZone = document.getElementById('upload-zone');
    const uploadIcon = uploadZone.querySelector('.upload-icon');
    const uploadTitle = document.getElementById('upload-title');
    const uploadSub = document.getElementById('upload-sub');
    
    uploadZone.classList.add('loading');
    uploadIcon.innerHTML = '<div class="loader" style="width:40px;height:40px;border-width:4px;"></div>';
    uploadTitle.textContent = 'Uploading to secure storage...';
    uploadSub.textContent = 'Please wait';

    await new Promise(r => setTimeout(r, 100)); // Force DOM paint

    try {
        // 1. Upload to Supabase Storage with a Timeout safeguard
        const fileName = `${user.id}/resume_${Date.now()}.pdf`;
        
        const uploadPromise = supabase.storage.from('resumes').upload(fileName, file, { upsert: true });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Supabase upload timed out after 15 seconds.")), 15000));
        
        const { data: uploadData, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise]);
        
        if (uploadError) {
             console.error("Supabase Storage Error:", uploadError);
             throw new Error("Failed to upload file to storage. " + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage.from('resumes').getPublicUrl(fileName);
        const fileUrl = publicUrlData.publicUrl;

        // 2. Extract Text
        uploadTitle.textContent = 'Extracting text from PDF...';
        uploadSub.textContent = 'Parsing document contents';
        await new Promise(r => setTimeout(r, 100)); // Force DOM paint
        
        const extractedText = await extractTextFromPDF(file);

        if (!extractedText || extractedText.trim().length < 50) {
            throw new Error("Could not extract enough text from the PDF. Is it an image-based PDF?");
        }

        // 3. Analyze with Gemini
        uploadTitle.textContent = 'Analyzing with Gemini AI...';
        uploadSub.textContent = `Matching against ${targetRole} criteria`;
        await new Promise(r => setTimeout(r, 100)); // Force DOM paint
        
        const analysisResult = await analyzeWithGemini(extractedText, targetRole);

        // 4. Save to Profiles Table
        uploadTitle.textContent = 'Saving results...';
        uploadSub.textContent = 'Almost done';
        await new Promise(r => setTimeout(r, 100)); // Force DOM paint
        
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ 
                resume_url: fileUrl,
                resume_analysis: analysisResult
            })
            .eq('id', user.id);

        if (dbError) throw dbError;

        // Update Store
        Store.session.user.resume_url = fileUrl;
        Store.session.user.resume_analysis = analysisResult;

        // 5. Re-render UI with results
        renderUI(analysisResult, false);

    } catch (error) {
        console.error(error);
        alert(error.message);
        // Re-render empty or previous state on error
        renderUI(Store.session.user.resume_analysis, false);
    }
  };

  // --- Initial Page Load ---
  // If we already have analysis data in the user profile, show it immediately
  const savedAnalysis = user.resume_analysis;
  renderUI(savedAnalysis, false);
}
