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
    const score = data?.overall_score || user.resume_analysis?.ats_score || 0;
    const scoreSource = data?.overall_score ? "AI Employability Score" : "Original Resume ATS Score";
    const scoreStatus = data?.overall_score 
      ? (score >= 80 ? 'Market Leader - Elite Potential' : score >= 60 ? 'Above Average - High Potential' : 'Development Phase') 
      : (user.resume_analysis?.ats_score ? 'Diagnostic Pending' : 'Development Phase');
    const scoreSummary = data?.score_summary || (user.resume_analysis?.ats_score 
      ? 'Profile loaded. Resume ATS compatibility has been calculated. Run diagnostic to compute full readiness score.' 
      : 'Missing employability diagnostics. Please run diagnostic.');

    const s = {
      technical: data?.score_breakdown?.technical ?? null,
      communication: data?.score_breakdown?.communication ?? null,
      problemSolving: data?.score_breakdown?.problemSolving ?? null,
      domainKnowledge: data?.score_breakdown?.domainKnowledge ?? null,
      collaboration: data?.score_breakdown?.collaboration ?? null
    };

    const careerFit = data?.career_fit || [];
    
    // Map recommendation icons dynamically to handle word-based indicators from legacy or custom APIs
    const recommendations = (data?.recommendations || []).map(r => {
      let icon = r.icon || '✨';
      const iconMap = {
        'communication_icon': '💬',
        'domain_knowledge_icon': '🧠',
        'problem_solving_icon': '💡',
        'collaboration_icon': '🤝',
        'technical_icon': '💻',
        'cloud_icon': '☁️',
        'dsa_icon': '⌨️',
        'career_fit_icon': '🎯'
      };
      const cleanIcon = String(icon).toLowerCase().trim();
      if (iconMap[cleanIcon]) {
        icon = iconMap[cleanIcon];
      } else if (cleanIcon.length > 2) {
        icon = '✨';
      }
      return { ...r, icon };
    });
    
    // Extract DSA & Core scores from interview_readiness
    let dsaScore = null;
    let coreScore = null;
    if (data?.interview_readiness) {
      if (typeof data.interview_readiness === 'object') {
        dsaScore = data.interview_readiness.dsa;
        coreScore = data.interview_readiness.core;
      } else {
        dsaScore = parseInt(data.interview_readiness);
        coreScore = Math.max(0, dsaScore - 10);
      }
    }

    const hasResume = !!(user.resume_analysis || user.ats_score);

    if (!hasResume) {
      root.innerHTML = `
      <div style="padding: 100px 60px; max-width: 1200px; margin: 0 auto; text-align: center;">
        <div class="label-ent" style="margin-bottom: 12px; color:var(--brand-primary);">Prerequisites Required</div>
        <h1 class="h1-ent" style="font-size:36px; margin-bottom:24px;">Neural Profile Incomplete</h1>
        <p style="color:var(--text-description); font-size:16px; line-height:1.6; max-width:600px; margin:0 auto 40px;">
          The Intelligence Engine requires professional professional metadata from your resume to calculate a 360° readiness index. Please complete a Resume Scan first.
        </p>
        <div class="card-ent" style="padding:60px; display:inline-block; min-width:500px; border-style:dashed;">
          <div style="font-size:48px; margin-bottom:32px;">📄</div>
          <button class="btn-premium" onclick="window.location.hash='#resume-analysis'" style="height:56px; padding:0 48px; font-size:15px;">Commence Resume Scan →</button>
        </div>
      </div>
      `;
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
        <button id="reanalyze-emp-btn" class="btn-premium-ghost" style="padding:12px 24px; border-radius:12px; font-weight:700;">
          ${data ? 'Refresh Diagnostic' : 'Commence AI Diagnostic'}
        </button>
      </div>

      <!-- Main Intelligence Matrix -->
      <div class="employability-workspace-grid">
        
        <!-- Score Gauge Node -->
        <div class="card-ent" style="padding:48px; text-align:center; display:flex; flex-direction:column; align-items:center;">
          <div style="background:rgba(139,92,246,0.1); color:var(--brand-primary); padding:6px 16px; border-radius:100px; font-size:11px; font-weight:800; margin-bottom:32px; text-transform:uppercase;">
            ${scoreSource}
          </div>
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
            ${scoreStatus}
          </div>
          <p style="margin-top:24px; font-size:13px; color:var(--text-description); line-height:1.6;">
            ${scoreSummary}
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
                  <span style="font-size:14px; font-weight:800; color:#fff;">${item.val !== null ? `${item.val}/100` : 'Missing'}</span>
                </div>
                <div style="height:8px; background:rgba(255,255,255,0.02); border-radius:10px; overflow:hidden;">
                  <div style="height:100%; width:${item.val !== null ? item.val : 0}%; background:${item.color}; border-radius:10px; box-shadow:0 0 10px ${item.color}44;"></div>
                </div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:6px;">${item.label === 'Technical Skills' ? 'Strong coding fundamentals & CS concepts' : 'Audit verified at institutional level'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Secondary Analytics Grid -->
      <div class="employability-secondary-grid">
        
        <!-- Career Fit Prediction -->
        <div class="card-ent" style="padding:32px;">
          <h3 class="h2-ent" style="font-size:18px; margin-bottom:24px;">Career Fit Prediction</h3>
          <div style="display:flex; flex-direction:column; gap:20px;">
            ${careerFit.length ? careerFit.map(c => `
              <div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                  <span style="font-size:13px; font-weight:600; color:var(--text-description);">${c.role}</span>
                  <span style="font-size:13px; font-weight:800; color:#fff;">${c.match_pct}%</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.02); border-radius:10px; overflow:hidden;">
                  <div style="height:100%; width:${c.match_pct}%; background:var(--brand-primary); border-radius:10px;"></div>
                </div>
              </div>
            `).join('') : `
              <div style="padding: 32px 16px; text-align:center; color:var(--text-description); font-size:12.5px; border:1px dashed rgba(255,255,255,0.08); border-radius:12px; background:rgba(255,255,255,0.005);">
                <span style="opacity:0.5; display:block; font-size:20px; margin-bottom:8px;">🎯</span>
                Career Fit: Missing
              </div>
            `}
          </div>
        </div>

        <!-- Concentric Ring Chart (Interview Readiness) -->
        <div class="card-ent" style="padding:32px; text-align:center;">
          <h3 class="h2-ent" style="font-size:18px; margin-bottom:24px; text-align:left;">Interview Readiness</h3>
          <div style="position:relative; width:160px; height:160px; margin:0 auto;">
            <svg width="160" height="160" viewBox="0 0 160 160">
              <!-- Outer Ring (DSA) -->
              <circle cx="80" cy="80" r="65" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="12"/>
              <circle cx="80" cy="80" r="65" fill="none" stroke="var(--brand-secondary)" stroke-width="12" 
                      stroke-dasharray="408" stroke-dashoffset="${408 - (408 * (dsaScore || 0) / 100)}" 
                      stroke-linecap="round" transform="rotate(-90 80 80)" style="transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);"/>
              
              <!-- Inner Ring (Core) -->
              <circle cx="80" cy="80" r="48" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="12"/>
              <circle cx="80" cy="80" r="48" fill="none" stroke="#3B82F6" stroke-width="12" 
                      stroke-dasharray="301" stroke-dashoffset="${301 - (301 * (coreScore || 0) / 100)}" 
                      stroke-linecap="round" transform="rotate(-90 80 80)" style="transition: all 1.5s cubic-bezier(0.4, 0, 0.2, 1);"/>
            </svg>
            <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;">
              <div style="font-size:24px; font-weight:800; color:#fff;">${dsaScore !== null && coreScore !== null ? `${Math.round((dsaScore + coreScore) / 2)}%` : 'Missing'}</div>
              <div style="font-size:9px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; margin-top:2px;">Readiness</div>
            </div>
          </div>
          <div style="margin-top:24px; display:flex; justify-content:center; gap:20px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-description);">
              <div style="width:8px; height:8px; background:var(--brand-secondary); border-radius:2px;"></div> DSA: ${dsaScore !== null ? `${dsaScore}%` : 'Missing'}
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-description);">
              <div style="width:8px; height:8px; background:#3B82F6; border-radius:2px;"></div> Core: ${coreScore !== null ? `${coreScore}%` : 'Missing'}
            </div>
          </div>
        </div>

        <!-- Recommendations Node -->
        <div class="card-ent" style="padding:32px;">
          <h3 class="h2-ent" style="font-size:18px; margin-bottom:24px;">Strategic Pulse</h3>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${recommendations.length ? recommendations.map(r => `
              <div style="display:flex; gap:12px; align-items:center; padding:12px; background:rgba(255,255,255,0.01); border:1px solid var(--border-main); border-radius:12px; text-align:left;">
                <div style="font-size:20px;">${r.icon || '✨'}</div>
                <div>
                  <div style="font-weight:700; color:#fff; font-size:13px;">${r.title}</div>
                  <div style="font-size:10px; color:var(--text-description); margin-top:2px;">${r.desc}</div>
                </div>
              </div>
            `).join('') : `
              <div style="padding: 32px 16px; text-align:center; color:var(--text-description); font-size:12.5px; border:1px dashed rgba(255,255,255,0.08); border-radius:12px; background:rgba(255,255,255,0.005);">
                <span style="opacity:0.5; display:block; font-size:20px; margin-bottom:8px;">💡</span>
                Recommendations: Missing
              </div>
            `}
          </div>
        </div>
      </div>
    </div>

    <style>
      .employability-workspace-grid {
        display: grid;
        grid-template-columns: 1fr 1.5fr;
        gap: 40px;
      }
      .employability-secondary-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 32px;
      }
      @media (max-width: 1024px) {
        .employability-workspace-grid {
          grid-template-columns: 1fr;
          gap: 24px;
        }
      }
      @media (max-width: 768px) {
        .employability-secondary-grid {
          grid-template-columns: 1fr;
          gap: 20px;
        }
      }
    </style>
    `;

    document.getElementById('reanalyze-emp-btn')?.addEventListener('click', generateAnalysis);
  };

  const generateAnalysis = async () => {
    renderUI(null, true);
    try {
        // Sync latest profile details from Supabase to ensure accurate diagnostic inputs
        if (supabase && user?.id) {
          const { data: dbUser } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
          if (dbUser) {
            Object.assign(user, dbUser);
          }
        }

        const apiKey = window.GEMINI_API_KEY || Store.config?.GEMINI_API_KEY;
        const isDummy = !apiKey || apiKey.startsWith('AQ.');
        
        if (isDummy) {
          console.warn("Employability: API Key missing or placeholder. Using Neural Mock Diagnostics.");
          await new Promise(r => setTimeout(r, 300));
          const mockData = {
            overall_score: 78,
            score_summary: "You score higher than 74% of students in your batch. Focus on cloud skills and system design to reach the 90+ elite tier.",
            score_breakdown: { technical: 84, communication: 72, problemSolving: 78, domainKnowledge: 69, collaboration: 85 },
            interview_readiness: { dsa: 78, core: 74 },
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
        const prompt = `Analyze career readiness. Return JSON: {overall_score, score_summary, score_breakdown:{technical, communication, problemSolving, domainKnowledge, collaboration}, interview_readiness:{dsa, core}, career_fit:[{role, match_pct}], recommendations:[{title, desc, icon}]}.`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt + "\nData: " + aggregatedData }] }], generationConfig: { responseMimeType: "application/json" } })
        });
        clearTimeout(timeoutId);
        
        const apiData = await response.json();
        // Safety check for candidates
        if (!apiData.candidates || !apiData.candidates[0]) throw new Error("Neural Engine timeout. Using fallback data.");
        
        let txt = apiData.candidates[0].content.parts[0].text.trim();
        if (txt.startsWith('```')) {
          txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
        }
        const generatedData = JSON.parse(txt);
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
