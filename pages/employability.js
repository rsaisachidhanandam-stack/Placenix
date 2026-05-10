export async function loadEmpPage(root, Store) {
  const GEMINI_API_KEY = 'AIzaSyDyMVkAkoAcCPqZDRl4iMfQxCvdPKJ0DvE'; // Do not expose in production
  const { supabase } = await import('../supabase.js');
  const user = Store.session?.user;

  if (!user) {
    root.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);">Please log in to use the Employability Engine.</div>';
    return;
  }

  // --- UI RENDER FUNCTION ---
  const renderUI = (data, isAnalyzing = false) => {
    // If no data and not analyzing, show empty state
    if (!data && !isAnalyzing) {
      root.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Employability Intelligence Engine</h1>
        <p class="page-subtitle">AI-powered 360° analysis of your career readiness</p>
      </div>
      <div class="card" style="text-align:center; padding: 48px;">
        <div style="font-size:3rem; margin-bottom:16px;">🧠</div>
        <h2>Generate Your Employability Report</h2>
        <p style="color:var(--text-secondary); margin-bottom: 24px; max-width: 500px; margin-left:auto; margin-right:auto;">
          Our AI will analyze your Resume ATS Score, Academic Details, and Profile to generate a comprehensive 360° view of your career readiness.
        </p>
        <button id="analyze-emp-btn" class="btn btn-primary" style="padding: 12px 24px;">Analyze My Employability</button>
      </div>`;
      
      document.getElementById('analyze-emp-btn')?.addEventListener('click', generateAnalysis);
      return;
    }

    // Loading State
    if (isAnalyzing) {
      root.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Employability Intelligence Engine</h1>
      </div>
      <div class="card" style="text-align:center; padding: 64px;">
        <div class="loader" style="width:48px;height:48px;border: 4px solid rgba(255,255,255,0.1); border-left-color: var(--brand-electric-violet); border-radius: 50%; animation: spin 1s linear infinite; margin:0 auto 24px;"></div>
        <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        <h2>Analyzing Profile Data with Gemini AI...</h2>
        <p style="color:var(--text-secondary);">Calculating your 360° readiness score and career fit.</p>
      </div>`;
      return;
    }

    // Dynamic Data Fallbacks
    const score = data?.overall_score || 0;
    const bandLabel = score >= 80 ? 'Exceptional · High Potential' : score >= 60 ? 'Good · On Track' : 'Needs Improvement';
    const bandColor = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
    const s = data?.score_breakdown || { technical: 0, communication: 0, problemSolving: 0, domainKnowledge: 0, collaboration: 0 };
    const careerFit = data?.career_fit || [];
    const recommendations = data?.recommendations || [];
    const interviewReadiness = data?.interview_readiness || 0;

    root.innerHTML = `
<style>
.emp-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;}
.score-band{display:flex;flex-direction:column;gap:6px;margin-bottom:8px;}
.band-bar{height:10px;border-radius:99px;background:rgba(255,255,255,.05);overflow:hidden;}
.band-fill{height:100%;border-radius:99px; transition: width 1s ease-out;}
.rec-card{display:flex;gap:14px;padding:14px;background:rgba(255,255,255,.02);border:1px solid var(--border-subtle);border-radius:10px;margin-bottom:10px;}
.rec-num{width:28px;height:28px;border-radius:50%;background:var(--gradient-brand);display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#fff;flex-shrink:0;}
@media(max-width:800px){.emp-grid{grid-template-columns:1fr;}}
</style>
<div class="page-header" style="display:flex; justify-content:space-between; align-items:center;">
  <div>
    <h1 class="page-title">Employability Intelligence Engine</h1>
    <p class="page-subtitle">AI-powered 360° analysis of your career readiness</p>
  </div>
  <button id="reanalyze-emp-btn" class="btn btn-secondary btn-sm">Refresh AI Score</button>
</div>

<div class="emp-grid">
  <!-- Overall score -->
  <div class="card" style="display:flex;flex-direction:column;align-items:center;padding:32px;">
    <div class="ai-badge" style="margin-bottom:16px;">🤖 AI Employability Score</div>
    <div style="position:relative;width:180px;height:180px;margin-bottom:16px;">
      <svg width="180" height="180" viewBox="0 0 180 180" style="transform:rotate(-90deg)">
        <circle cx="90" cy="90" r="75" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="14"/>
        <circle cx="90" cy="90" r="75" fill="none" stroke="url(#empGrad)" stroke-width="14" stroke-dasharray="471" stroke-dashoffset="${471 - (471 * score / 100)}" stroke-linecap="round" style="transition: stroke-dashoffset 1s ease-out;"/>
        <defs><linearGradient id="empGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#22D3EE"/></linearGradient></defs>
      </svg>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font-family:var(--font-display);font-size:2.5rem;font-weight:800;background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${score}</span>
        <span style="font-size:.75rem;color:var(--text-muted);">out of 100</span>
      </div>
    </div>
    <span class="badge badge-${bandColor}" style="font-size:.85rem;padding:6px 18px;">${bandLabel}</span>
    <p style="text-align:center;font-size:.8rem;color:var(--text-secondary);margin-top:14px;max-width:280px;">
      ${data?.score_summary || `Your profile indicates good readiness. Focus on AI recommendations to improve.`}
    </p>
  </div>

  <!-- Score breakdown -->
  <div class="card">
    <div class="card-header"><div class="card-title">Score Breakdown</div><span class="badge badge-violet">AI Analyzed</span></div>
    <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">
      ${[
        ['Technical Skills',       s.technical,      '#7C3AED','Coding fundamentals & tech stack'],
        ['Communication',          s.communication,  '#22D3EE','Verbal and written clarity'],
        ['Problem Solving',        s.problemSolving,  '#10B981','Logic & analytical thinking'],
        ['Domain Knowledge',       s.domainKnowledge,'#F59E0B','Industry-specific expertise'],
        ['Collaboration',          s.collaboration,  '#3B82F6','Teamwork & leadership potential'],
      ].map(([label, val, color, tip]) => `
        <div class="score-band">
          <div style="display:flex;justify-content:space-between;font-size:.82rem;">
            <span style="color:var(--text-secondary);">${label}</span>
            <span style="font-weight:700;color:${color};">${val}/100</span>
          </div>
          <div class="band-bar"><div class="band-fill" style="width:${val}%;background:${color};"></div></div>
          <div style="font-size:.72rem;color:var(--text-muted);">${tip}</div>
        </div>`).join('')}
    </div>
  </div>
</div>

<!-- Charts row -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-bottom:24px;">
  <div class="card">
    <div class="card-header"><div class="card-title">Estimated Skill Spread</div></div>
    <canvas id="coding-chart" height="180"></canvas>
    <div style="margin-top:12px; font-size:.78rem; color:var(--text-muted); text-align:center;">
      Based on resume & profile data
    </div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Interview Readiness</div></div>
    <canvas id="interview-chart" height="180"></canvas>
    <div style="text-align:center;margin-top:12px;">
      <div style="font-size:1.5rem;font-weight:800;font-family:var(--font-display);background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${interviewReadiness}%</div>
      <div style="font-size:.78rem;color:var(--text-muted);">Overall Readiness</div>
    </div>
  </div>
  <div class="card">
    <div class="card-header"><div class="card-title">Career Fit Prediction</div></div>
    ${careerFit.map(c => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:4px;">
          <span style="color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 140px;">${c.role}</span>
          <span style="font-weight:700;color:var(--text-primary);">${c.match_pct}%</span>
        </div>
        <div class="band-bar"><div class="band-fill" style="width:${c.match_pct}%;background:var(--gradient-brand);"></div></div>
      </div>`).join('')}
  </div>
</div>

<!-- AI Recommendations -->
<div class="card">
  <div class="card-header">
    <div><div class="card-title">AI Career Recommendations</div><div class="card-subtitle">Personalized action plan to boost your score</div></div>
    <span class="ai-badge">🤖 AI</span>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
    ${recommendations.map((r,i)=>`
      <div class="rec-card">
        <div class="rec-num">${i+1}</div>
        <div>
          <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${r.icon} ${r.title}</div>
          <div style="font-size:.78rem;color:var(--text-secondary);">${r.desc}</div>
        </div>
      </div>`).join('')}
  </div>
</div>`;

    document.getElementById('reanalyze-emp-btn')?.addEventListener('click', generateAnalysis);

    // Initialize Chart.js
    setTimeout(() => {
      if (typeof Chart === 'undefined') return;
      
      const skillChartData = data?.coding_chart || {
          labels: ['Frontend', 'Backend', 'Database', 'Cloud', 'Algorithms', 'System Design'],
          data: [60, 60, 60, 60, 60, 60]
      };

      new Chart(document.getElementById('coding-chart'), {
        type: 'bar',
        data: {
          labels: skillChartData.labels,
          datasets: [{ label: 'Proficiency', data: skillChartData.data, backgroundColor: 'rgba(124,58,237,0.6)', borderRadius: 6 }]
        },
        options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { max: 100, grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#64748B' } }, x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 10 } } } } }
      });

      const interviewData = data?.interview_chart || {
          labels: ['DSA','Behavioral','System Design','Communication','Domain'],
          data: [s.problemSolving, s.communication, s.technical, s.communication, s.domainKnowledge]
      };

      new Chart(document.getElementById('interview-chart'), {
        type: 'doughnut',
        data: {
          labels: interviewData.labels,
          datasets: [{ data: interviewData.data, backgroundColor: ['#7C3AED','#22D3EE','#F59E0B','#10B981','#3B82F6'], borderWidth: 0, hoverOffset: 4 }]
        },
        options: { responsive: true, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { color: '#64748B', font: { size: 10 }, boxWidth: 10 } } } }
      });
    }, 100);
  };

  // --- AI GENERATION FUNCTION ---
  const generateAnalysis = async () => {
    renderUI(null, true);
    
    try {
        // Aggregate Profile Data
        let aggregatedData = `
        Resume ATS Score: ${user.resume_analysis?.ats_score || 'Not analyzed'}
        Resume Found Keywords: ${user.resume_analysis?.found_keywords?.join(', ') || 'None'}
        Academic Details: ${JSON.stringify(user.academicDetails || {})}
        Experience/Internships: ${user.internships?.length || 0} items
        Projects: ${user.projects?.length || 0} items
        `;

        const prompt = `Analyze this student profile data and generate a 360 Employability Intelligence report.
        Be highly analytical and realistic. Don't give perfect 100s unless they have amazing experience.
        Return a raw JSON object with EXACTLY these keys:
        - "overall_score": A number from 0-100.
        - "score_summary": A 1-2 sentence summary explaining the score and what they need to focus on.
        - "score_breakdown": An object with exactly 5 keys mapping to 0-100 scores: "technical", "communication", "problemSolving", "domainKnowledge", "collaboration".
        - "interview_readiness": A number from 0-100 estimating their readiness to pass technical interviews.
        - "career_fit": An array of exactly 4 objects predicting career fit. Each object must have "role" (string) and "match_pct" (number 0-100).
        - "recommendations": An array of exactly 4 actionable recommendations. Each object must have "title", "desc" (1 sentence explanation), and "icon" (a single emoji).
        - "coding_chart": An object to power a bar chart with "labels" (array of 6 technical skill categories like 'React', 'Algorithms', 'Databases', etc.) and "data" (array of 6 corresponding estimated proficiency numbers 0-100).
        
        Profile Data:
        ${aggregatedData}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { response_mime_type: "application/json" }
            })
        });

        if (!response.ok) throw new Error(`Gemini API Error: ${response.statusText}`);
        const apiData = await response.json();
        
        const jsonText = apiData.candidates[0].content.parts[0].text;
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Gemini returned invalid format.");
        
        const generatedData = JSON.parse(jsonMatch[0]);

        // Save to Database
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ employability_data: generatedData })
            .eq('id', user.id);

        if (dbError) throw dbError;

        // Update Store and Re-render
        Store.session.user.employability_data = generatedData;
        renderUI(generatedData, false);

    } catch (error) {
        console.error(error);
        alert("Failed to generate employability report: " + error.message);
        renderUI(user.employability_data, false);
    }
  };

  // --- INITIAL LOAD ---
  if (user.employability_data) {
    renderUI(user.employability_data, false);
  } else {
    renderUI(null, false);
  }
}
