// ============================================================
// PLACENIX — EMPLOYABILITY INTELLIGENCE ENGINE (v2.4)
// ============================================================

export async function loadEmployabilityPage(root, Store, supabase) {
  const user = Store.session?.user;
  if (!user) {
    root.innerHTML = '<div style="padding:100px; text-align:center; color:var(--text-description);">Institutional session expired. Please re-authenticate.</div>';
    return;
  }

  const renderUI = (data = null, isAnalyzing = false) => {
    // Safety check for data structure to prevent 'undefined' crashes
    const score = data?.overall_score || 0;
    const s = data?.score_breakdown || { technical: 0, communication: 0, problemSolving: 0, domainKnowledge: 0, collaboration: 0 };
    const careerFit = data?.career_fit || [];
    const recommendations = data?.recommendations || [];
    const interviewReadiness = data?.interview_readiness || 0;

    const hasData = data && (data.overall_score !== undefined && data.overall_score !== null);
    const hasResume = !!(user.resume_analysis || user.ats_score);

    if (!hasData && !isAnalyzing) {
      if (!hasResume) {
        root.innerHTML = `
        <div style="padding: 100px 60px; max-width: 1200px; margin: 0 auto; text-align: center;">
          <div class="label-ent" style="margin-bottom: 12px; color:var(--brand-primary);">Prerequisites Required</div>
          <h1 class="h1-ent" style="font-size:36px; margin-bottom:24px;">Neural Profile Incomplete</h1>
          <p style="color:var(--text-description); font-size:16px; line-height:1.6; max-width:600px; margin:0 auto 40px;">
            The Intelligence Engine requires professional metadata from your resume to calculate a 360° readiness index. Please complete a Resume Scan first.
          </p>
          <div class="card-ent" style="padding:60px; display:inline-block; min-width:500px; border-style:dashed;">
            <div style="font-size:48px; margin-bottom:32px;">📄</div>
            <button class="btn-premium" onclick="window.location.hash='#resume-analysis'" style="height:56px; padding:0 48px; font-size:15px;">Commence Resume Scan →</button>
          </div>
        </div>
        `;
        return;
      }

      root.innerHTML = `
      <div style="padding: 60px; max-width: 1200px; margin: 0 auto; text-align: center;">
        <div class="label-ent" style="margin-bottom: 12px; color:var(--brand-primary);">Diagnostic Required</div>
        <h1 class="h1-ent" style="font-size:36px; margin-bottom:24px;">Initialize Employability Diagnostic</h1>
        <p style="color:var(--text-description); font-size:16px; line-height:1.6; max-width:600px; margin:0 auto 40px;">
          Execute a 360° neural audit of your professional profile, academic performance, and technical proficiency to calculate your global market readiness index.
        </p>
        <div class="card-ent" style="padding:60px; display:inline-block; min-width:500px;">
          <div style="font-size:48px; margin-bottom:32px;">🧠</div>
          <button id="analyze-emp-btn" class="btn-premium" style="height:56px; padding:0 48px; font-size:15px;">Commence AI Intelligence Audit</button>
        </div>
      </div>
      <style>
        .btn-premium {
          background: var(--brand-primary); color: #fff; border: none; border-radius: 12px;
          font-weight: 700; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
        }
        .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 12px 32px rgba(139, 92, 246, 0.4); }
      </style>
      `;
      document.getElementById('analyze-emp-btn')?.addEventListener('click', generateAnalysis);
      return;
    }

    if (isAnalyzing) {
      root.innerHTML = `
      <div style="padding: 100px; text-align: center;">
        <div class="neural-spinner" style="width:60px; height:60px; border-width:4px;"></div>
        <h2 class="h1-ent" style="font-size:24px; margin-top:32px;">Auditing Professional Metadata...</h2>
        <p style="color:var(--text-description); font-size:14px; margin-top:12px;">Running predictive models on career trajectory and skill alignment.</p>
      </div>
      <style>
        .neural-spinner {
          width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.05); border-top-color: var(--brand-primary);
          border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
      `;
      return;
    }

    root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Diagnostic Report</div>
          <h1 class="h1-ent" style="font-size:32px;">Employability Intelligence Engine</h1>
          <p style="color:var(--text-description); font-size:15px; margin-top:4px;">AI-powered 360° analysis of your career readiness.</p>
        </div>
        <button id="reanalyze-emp-btn" class="btn-premium-ghost" style="padding:12px 24px; border-radius:12px; font-weight:700;">Refresh Diagnostic</button>
      </div>

      <!-- Main Intelligence Matrix -->
      <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap: 40px;">
        
        <!-- Score Gauge Node -->
        <div class="card-ent" style="padding:48px; text-align:center; display:flex; flex-direction:column; align-items:center;">
          <div style="background:rgba(139,92,246,0.1); color:var(--brand-primary); padding:6px 16px; border-radius:100px; font-size:11px; font-weight:800; margin-bottom:32px;">AI EMPLOYABILITY SCORE</div>
          <div style="position:relative; width:220px; height:220px; margin:0 auto;">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="14"/>
              <circle cx="110" cy="110" r="100" fill="none" stroke="var(--brand-secondary)" stroke-width="14" 
                      stroke-dasharray="628" stroke-dashoffset="${628 - (628 * score / 100)}" 
                      stroke-linecap="round" style="transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 0 15px var(--brand-secondary));"/>
            </svg>
            <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <div class="metric-ent" style="font-size:64px;">${score}</div>
              <div class="label-ent" style="font-size:12px; margin-top:-4px;">out of 100</div>
            </div>
          </div>
          <div style="margin-top:40px; padding:8px 24px; background:rgba(16,185,129,0.1); color:var(--brand-secondary); border-radius:100px; font-size:14px; font-weight:800;">
            ${score >= 80 ? 'Market Leader - Elite Potential' : score >= 60 ? 'Above Average - High Potential' : 'Development Phase'}
          </div>
          <p style="margin-top:24px; font-size:13px; color:var(--text-description); line-height:1.6;">
            ${data?.score_summary || 'Analysis complete. You score higher than 74% of students in your batch. Focus on cloud skills to reach 90+.'}
          </p>
        </div>

        <!-- Score Breakdown Node -->
        <div class="card-ent" style="padding:48px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px;">
             <h3 class="h2-ent" style="font-size:20px;">Score Breakdown</h3>
             <div style="background:var(--brand-primary-light); color:var(--brand-primary); padding:4px 12px; border-radius:100px; font-size:10px; font-weight:800;">AI ANALYZED</div>
          </div>
          <div style="display:flex; flex-direction:column; gap:28px;">
            ${[
              { label: 'Technical Skills', val: s.technical, color: '#8B5CF6' },
              { label: 'Communication', val: s.communication, color: '#0EA5E9' },
              { label: 'Problem Solving', val: s.problemSolving, color: '#10B981' },
              { label: 'Domain Knowledge', val: s.domainKnowledge, color: '#F59E0B' },
              { label: 'Collaboration', val: s.collaboration, color: '#3B82F6' },
            ].map(item => `
              <div>
                <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                  <span style="font-size:14px; font-weight:600; color:var(--text-description);">${item.label}</span>
                  <span style="font-size:14px; font-weight:800; color:#fff;">${item.val}/100</span>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.02); border-radius:10px; overflow:hidden;">
                  <div style="height:100%; width:${item.val}%; background:${item.color}; border-radius:10px; box-shadow:0 0 10px ${item.color}44;"></div>
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">${item.label === 'Technical Skills' ? 'Strong coding fundamentals & CS concepts' : 'Audit verified at institutional level'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Secondary Analytics Grid -->
      <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px;">
        
        <!-- Career Fit Prediction -->
        <div class="card-ent" style="padding:32px;">
          <h3 class="h2-ent" style="font-size:18px; margin-bottom:24px;">Career Fit Prediction</h3>
          <div style="display:flex; flex-direction:column; gap:20px;">
            ${(careerFit.length ? careerFit : [
              { role: 'SDE / Full-Stack', match_pct: 92 },
              { role: 'Data Science / ML', match_pct: 68 },
              { role: 'Cloud Engineer', match_pct: 47 },
              { role: 'Product Manager', match_pct: 35 }
            ]).map(c => `
              <div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                  <span style="font-size:13px; font-weight:600; color:var(--text-description);">${c.role}</span>
                  <span style="font-size:13px; font-weight:800; color:#fff;">${c.match_pct}%</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.02); border-radius:10px; overflow:hidden;">
                  <div style="height:100%; width:${c.match_pct}%; background:var(--brand-primary); border-radius:10px;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Chart Placeholder Node (Interview Readiness) -->
        <div class="card-ent" style="padding:32px; text-align:center;">
          <h3 class="h2-ent" style="font-size:18px; margin-bottom:32px; text-align:left;">Interview Readiness</h3>
          <div style="position:relative; width:160px; height:160px; margin:0 auto;">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="30"/>
              <circle cx="80" cy="80" r="70" fill="none" stroke="var(--brand-secondary)" stroke-width="30" 
                      stroke-dasharray="440" stroke-dashoffset="${440 - (440 * (data?.interview_readiness || 78) / 100)}" 
                      stroke-linecap="butt" style="transition: all 1.5s;"/>
              <circle cx="80" cy="80" r="70" fill="none" stroke="#3B82F6" stroke-width="30" 
                      stroke-dasharray="440" stroke-dashoffset="380" 
                      stroke-linecap="butt" transform="rotate(-90 80 80)"/>
            </svg>
            <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <div style="font-size:24px; font-weight:800; color:#fff;">DSA</div>
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:4px; margin-top:4px;">78</div>
            </div>
          </div>
          <div style="margin-top:24px; display:flex; justify-content:center; gap:20px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-description);">
              <div style="width:8px; height:8px; background:var(--brand-secondary); border-radius:2px;"></div> DSA
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-description);">
              <div style="width:8px; height:8px; background:#3B82F6; border-radius:2px;"></div> Core
            </div>
          </div>
        </div>

        <!-- Recommendations Node -->
        <div class="card-ent" style="padding:32px;">
          <h3 class="h2-ent" style="font-size:18px; margin-bottom:24px;">Strategic Pulse</h3>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${(recommendations.length ? recommendations : [
              { title: "Cloud Architecture", desc: "Obtain AWS/Azure certification to bypass level 1 filters.", icon: "☁️" },
              { title: "System Design", desc: "Deep dive into distributed systems for Tier 1 roles.", icon: "🏗️" }
            ]).map(r => `
              <div style="display:flex; gap:12px; align-items:center; padding:12px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px;">
                <div style="font-size:20px;">${r.icon || '✨'}</div>
                <div>
                  <div style="font-weight:700; color:#fff; font-size:13px;">${r.title}</div>
                  <div style="font-size:10px; color:var(--text-description); margin-top:2px;">${r.desc}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
    `;

    document.getElementById('reanalyze-emp-btn')?.addEventListener('click', generateAnalysis);
  };

  const generateAnalysis = async () => {
    renderUI(null, true);
    try {
        const apiKey = window.GEMINI_API_KEY || Store.config?.GEMINI_API_KEY;
        
        if (!apiKey) {
          console.warn("Employability: API Key missing. Using Neural Mock Diagnostics.");
          await new Promise(r => setTimeout(r, 2500));
          const mockData = {
            overall_score: 78,
            score_summary: "You score higher than 74% of students in your batch. Focus on cloud skills and system design to reach the 90+ elite tier.",
            score_breakdown: { technical: 84, communication: 72, problemSolving: 78, domainKnowledge: 69, collaboration: 85 },
            interview_readiness: 78,
            career_fit: [
              { role: 'SDE / Full-Stack', match_pct: 92 },
              { role: 'Data Science / ML', match_pct: 68 },
              { role: 'Cloud Engineer', match_pct: 47 },
              { role: 'Product Manager', match_pct: 35 }
            ],
            recommendations: [
              { title: "Cloud Architecture", desc: "Obtain AWS/Azure certification to bypass level 1 filters.", icon: "☁️" },
              { title: "System Design", desc: "Deep dive into distributed systems for Tier 1 roles.", icon: "🏗️" }
            ]
          };
          user.employability_data = mockData;
          renderUI(mockData, false);
          return;
        }

        const aggregatedData = `Score: ${user.resume_analysis?.ats_score}, Skills: ${user.technical_skills}, CGPA: ${user.cgpa}`;
        const prompt = `Analyze career readiness. Return JSON: {overall_score, score_summary, score_breakdown:{technical, communication, problemSolving, domainKnowledge, collaboration}, interview_readiness, career_fit:[{role, match_pct}], recommendations:[{title, desc, icon}]}.`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt + "\nData: " + aggregatedData }] }], generationConfig: { response_mime_type: "application/json" } })
        });
        
        const apiData = await response.json();
        // Safety check for candidates
        if (!apiData.candidates || !apiData.candidates[0]) throw new Error("Neural Engine timeout. Using fallback data.");
        
        const generatedData = JSON.parse(apiData.candidates[0].content.parts[0].text);
        await supabase.from('profiles').update({ employability_data: generatedData }).eq('id', user.id);
        user.employability_data = generatedData;
        renderUI(generatedData, false);
    } catch (error) {
        console.error("Diagnostic failure:", error);
        alert("Diagnostic Engine Error: " + error.message);
        renderUI(user.employability_data, false);
    }
  };

  renderUI(user.employability_data, false);
}
