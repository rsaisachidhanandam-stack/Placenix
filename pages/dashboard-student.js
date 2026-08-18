// ============================================================
// PLACENIX — BALANCED INTELLIGENCE OPERATING SYSTEM (v2.4)
// ============================================================

export async function loadStudentDash(root, Store, supabase) {
  let user = Store.session?.user;
  if (!user) {
    root.innerHTML = `<div style="padding:100px; text-align:center; color:var(--text-description);">Institutional session expired. Please re-authenticate.</div>`;
    return;
  }

  // Sync latest student profile from Supabase db as a safeguard in the background
  const dbClient = (supabase && typeof supabase.from === 'function') ? supabase
                 : (window.supabase && typeof window.supabase.from === 'function') ? window.supabase
                 : null;

  if (dbClient && user.id) {
    dbClient.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data: dbUser }) => {
        if (dbUser) {
          const merged = { ...Store.session.user };
          Object.keys(dbUser).forEach(k => {
            if (dbUser[k] !== null && dbUser[k] !== undefined && dbUser[k] !== '') {
              merged[k] = dbUser[k];
            }
          });
          Store.session.user = merged;
          render();
        }
      })
      .catch(err => {
        console.error('Safeguard profile sync failed on student dash:', err);
      });
  }

  function render() {
    const studentName = Store.session.user.full_name || Store.session.user.name || '';
    const myAllocations = [];
    const seenAllocations = new Set();
    
    // Auto-heal/derive Store.studentProfile.applications from Kanban card
    const userName = Store.session.user.full_name || Store.session.user.name || '';
    const userId = Store.session.user.id;
    const myKanbanCards = [];
    if (Store.kanban) {
      Object.entries(Store.kanban).forEach(([stage, cards]) => {
        if (Array.isArray(cards)) {
          cards.forEach(card => {
            const cleanCardName = (card.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const cleanUserName = userName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const isNameMatch = cleanUserName && cleanCardName && (cleanCardName.includes(cleanUserName) || cleanUserName.includes(cleanCardName));
            if (String(card.id) === String(userId) || isNameMatch) {
              myKanbanCards.push({ ...card, stage });
            }
          });
        }
      });
    }
    
    // Always derive and synchronize applications from Kanban board stages
    if (Store.studentProfile) {
      const derivedApps = myKanbanCards.map(card => {
        const drive = Store.drives.find(d => String(d.id) === String(card.driveId) || d.company === card.drive);
        let status = 'Applied';
        if (card.stage === 'selected') status = 'Placed';
        else if (card.stage === 'shortlisted') status = 'Shortlisted';
        else if (card.stage === 'hr') status = 'HR Round';
        else if (card.stage === 'technical') status = 'Technical Round';
        else if (card.stage === 'aptitude') status = 'Aptitude Round';
        
        return {
          driveId: card.driveId || (drive ? drive.id : 'd1'),
          drive: card.drive || (drive ? drive.company : 'TCS'),
          role: drive ? drive.role : 'Developer',
          date: card.date || new Date().toISOString().split('T')[0],
          status: status
        };
      });

      const hashApp = app => `${app.driveId}_${app.status}`;
      const derivedHashes = derivedApps.map(hashApp).sort().join(',');
      const currentHashes = (Store.studentProfile.applications || []).map(hashApp).sort().join(',');
      
      if (derivedHashes !== currentHashes) {
        Store.studentProfile.applications = derivedApps;
        localStorage.setItem('placenix_student_apps', JSON.stringify(Store.studentProfile.applications));
      }
    }

    // Robust lookup using both ID and fuzzy name comparison
    const studentRec = Store.students.find(s => 
      String(s.id) === String(Store.session.user.id) || 
      (s.name && userName && s.name.toLowerCase().replace(/[^a-z0-9]/g, '').trim() === userName.toLowerCase().replace(/[^a-z0-9]/g, '').trim())
    ) || {};
    
    const empScore = Store.session.user.employability_data?.overall_score || studentRec.employability_data?.overall_score || studentRec.empScore || 70;
    const technicalSkill = Store.session.user.employability_data?.score_breakdown?.technical || studentRec.employability_data?.score_breakdown?.technical || Math.min(100, Math.round(empScore * 1.1)) || 75;
    const activeEngagementsCount = Store.studentProfile.applications.length || 0;
    const pendingReviewsCount = Store.studentProfile.applications.filter(a => a.status === 'Applied' || a.status === 'Shortlisted').length;
    
    if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if (alloc.allocations && Array.isArray(alloc.allocations)) {
          alloc.allocations.forEach(a => {
            const cleanA = (a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const cleanS = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            let isNameMatch = cleanS && cleanA && (cleanA.includes(cleanS) || cleanS.includes(cleanA));
            
            // Robust fuzzy check: if they share a prefix of at least 6 characters
            if (!isNameMatch && cleanA && cleanS) {
              const minLen = Math.min(cleanA.length, cleanS.length);
              if (minLen >= 6 && cleanA.substring(0, 6) === cleanS.substring(0, 6)) {
                isNameMatch = true;
              }
            }
            
            if (String(a.studentId) === String(Store.session.user.id) || isNameMatch) {
              // Normalize company name for robust de-duplication (e.g. "tcs" and "tcs digital" group together)
              let companyKey = (alloc.company || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              if (companyKey.startsWith('tcs')) {
                companyKey = 'tcs';
              } else if (companyKey.length > 5) {
                companyKey = companyKey.substring(0, 5);
              }
              const roundKey = `${companyKey}_${(alloc.roundName || '').toLowerCase().trim()}`;
              
              if (!seenAllocations.has(roundKey)) {
                seenAllocations.add(roundKey);
                myAllocations.push({
                  company: alloc.company,
                  role: alloc.role,
                  roundName: alloc.roundName,
                  date: alloc.date,
                  venue: a.venue,
                  slotTime: a.slotTime
                });
              }
            }
          });
        }
      });
    }

    // Filter shared resources for this student
    const studentDept = (Store.session?.user?.department || Store.session?.user?.dept || 'CSE').toUpperCase();
    const studentSection = (Store.session?.user?.section_name || 'A').toUpperCase();
    
    // Fallbacks or actual scores
    const softSkills = Store.session.user.employability_data?.communication || 80;
    const coding = Store.session.user.employability_data?.coding || Store.session.user.employability_data?.technical || 80;
    const readiness = Store.session.user.employability_data?.overall_score || 80;
    
    const myResources = (Store.sharedResources || []).filter(res => {
      // 1. Dept filter
      const matchDept = res.target_dept === 'All' || res.target_dept.toUpperCase() === studentDept;
      if (!matchDept) return false;

      // 2. Section filter
      const matchSection = res.target_section === 'All' || res.target_section.toUpperCase() === studentSection;
      if (!matchSection) return false;

      // 3. Cohort filter
      let matchCohort = false;
      if (res.target_cohort === 'All' || res.target_cohort === 'Entire Section' || res.target_cohort === 'All Cohorts') {
        matchCohort = true;
      } else if (res.target_cohort === 'Coding Gaps' && coding < 75) {
        matchCohort = true;
      } else if (res.target_cohort === 'Weak Communication' && softSkills < 75) {
        matchCohort = true;
      } else if (res.target_cohort === 'Low Confidence' && readiness < 70) {
        matchCohort = true;
      }

      return matchCohort;
    });

    root.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 32px;">
        
        <!-- Operational Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">${Store.session.user.institution || 'Placenix Institutional Node'}</div>
            <h1 class="h1-ent">Operational Intelligence</h1>
          </div>
          <div style="display:flex; gap:16px;">
            <div class="card-glass" style="padding:8px 16px; border-radius:10px; display:flex; align-items:center; gap:12px; font-size:13px; font-weight:700; border: 1px solid var(--glass-border-main);">
              <div style="width:8px; height:8px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 8px var(--brand-secondary);"></div>
              Node Active: ${Store.session.user.full_name || Store.session.user.name || 'Student'}
            </div>
          </div>
        </div>

        <!-- Metric Infrastructure -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
          <div class="card-ent" style="background: linear-gradient(145deg, var(--glass-2), rgba(129,140,248,0.06));">
            <div class="label-ent" style="margin-bottom: 16px;">Employability Node</div>
            <div class="metric-ent">${technicalSkill}</div>
            <div style="height:6px; background:rgba(255,255,255,0.05); border-radius:10px; overflow:hidden; margin-top:16px;">
              <div style="width:${technicalSkill}%; height:100%; background:linear-gradient(90deg, var(--brand-primary), #8B5CF6); box-shadow:0 0 12px var(--brand-primary);"></div>
            </div>
          </div>

          <div class="card-ent">
            <div class="label-ent" style="margin-bottom: 16px;">Active Engagements</div>
            <div class="metric-ent">${activeEngagementsCount}</div>
            <p style="font-size:13px; color:var(--text-description); margin-top:8px;">${pendingReviewsCount} Pending institutional reviews</p>
          </div>

          <div class="card-ent">
            <div class="label-ent" style="margin-bottom: 16px;">Market Readiness</div>
            <div class="metric-ent">${technicalSkill >= 80 ? 'Tier 1' : 'Tier 2'}</div>
            <p style="font-size:13px; color:var(--text-description); margin-top:8px;">Top 10% of Department Node</p>
          </div>

          <div class="card-ent">
            <div class="label-ent" style="margin-bottom: 16px;">Total Institutional Opportunities</div>
            <div class="metric-ent">${Store.drives.filter(d=>d.status==='Open').length}</div>
            <p style="font-size:13px; color:var(--text-description); margin-top:8px;">New drives this week: <span style="color:var(--brand-secondary); font-weight:700;">+${Store.drives.filter(d=>d.status==='Open').length > 3 ? '1' : '2'}</span></p>
          </div>
        </div>

        <!-- Primary Content Area -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 40px;">
          
          <div style="display:flex; flex-direction:column; gap:40px;">
            <!-- Scheduled Rounds Node -->
            ${myAllocations.length === 0 ? `
              <div class="card-ent animate-fade-in-up" style="background: var(--glass-1); border: 1px dashed var(--glass-border-strong); padding: 48px 32px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; text-align:center; position:relative; overflow:hidden;">
                <div style="width:56px; height:56px; border-radius:50%; background:rgba(129,140,248,0.12); border:1px solid rgba(129,140,248,0.25); display:flex; align-items:center; justify-content:center; font-size:24px; color:var(--brand-primary);">🕒</div>
                <div>
                  <h3 style="font-family:var(--font-display); font-size:17px; font-weight:700; color:#fff; margin:0 0 8px 0;">No Active Schedules Released</h3>
                  <p style="color:var(--text-description); font-size:13.5px; max-width:440px; margin:0; line-height:1.7;">
                    Your upcoming recruitment round slots and venue details will appear here in real-time once published by training and placement officers.
                  </p>
                </div>
              </div>
            ` : myAllocations.map(alloc => `
              <div class="card-ent card-dark clickable-slot-card animate-fade-in-up" onclick="window.location.hash='my-slots'" style="background: linear-gradient(135deg, rgba(129,140,248,0.12), rgba(52,211,153,0.04)); border: 1.5px solid rgba(129,140,248,0.25); padding:32px; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
                <!-- Decorative background elements -->
                <div style="position:absolute; right:-20px; top:-20px; font-size:96px; opacity:0.04; transform:rotate(15deg); font-weight:900; user-select:none;">📅</div>
                
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
                  <div>
                    <span class="badge badge-success badge-dot" style="margin-bottom:8px; font-size:10px; background:var(--success-bg); border-color:var(--success-border);">SCHEDULED ROUND</span>
                    <h2 class="h2-ent" style="font-size:22px; color:#fff; margin:0;">${alloc.company} — ${alloc.roundName}</h2>
                    <p style="color:var(--text-description); font-size:14px; margin:4px 0 0 0;">Designation: ${alloc.role}</p>
                  </div>
                  <div style="text-align:right;">
                    <div class="label-ent" style="color:var(--brand-secondary); font-size:10px; margin-bottom:4px;">Date of Process</div>
                    <div style="font-weight:800; color:#fff; font-size:16px; font-family:var(--font-display);">${alloc.date}</div>
                  </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:8px; padding-top:16px; border-top:1px dashed rgba(255,255,255,0.08);">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border-main); display:flex; align-items:center; justify-content:center; font-size:16px;">🏢</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:2px;">VENUE ROOM</div>
                      <div style="font-weight:700; color:#fff; font-size:14px;">${alloc.venue}</div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--glass-border-main); display:flex; align-items:center; justify-content:center; font-size:16px;">🕒</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:2px;">SLOT INTERVAL</div>
                      <div style="font-weight:700; color:#fff; font-size:14px;">${alloc.slotTime}</div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
 
            <!-- Shared Resources Panel -->
            ${myResources.length > 0 ? `
              <div class="card-ent card-dark animate-fade-in-up" style="padding:40px; background:linear-gradient(135deg, rgba(52,211,153,0.03) 0%, rgba(0,0,0,0) 100%); border:1px solid rgba(52,211,153,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                  <div>
                    <h2 class="h2-ent" style="font-size:19px; margin:0; display:flex; align-items:center; gap:8px;">📚 Prep Materials Shared by Advisors</h2>
                    <p style="color:var(--text-description); font-size:13.5px; margin-top:2px;">Curated prep resources assigned by your Faculty Advisor.</p>
                  </div>
                  <span class="status-pill status-success" style="font-size:11px; padding:4px 12px; border-radius:100px;">
                    ${myResources.length} Active
                  </span>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:16px;">
                  ${myResources.map(res => `
                    <div style="padding:20px; background:rgba(0,0,0,0.2); border:1px solid var(--glass-border-main); border-radius:12px; display:flex; flex-direction:column; gap:12px;">
                       <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                          <span style="font-size:11px; font-weight:800; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.05em; background:var(--brand-primary-light); padding:4px 8px; border-radius:4px;">
                            ${res.type}
                          </span>
                          <h4 style="font-size:15px; font-weight:700; color:#fff; margin:8px 0 2px 0; font-family:var(--font-display);">${res.title}</h4>
                          <div style="font-size:12px; color:var(--text-muted);">Assigned by ${res.shared_by} on ${res.date}</div>
                        </div>
                        ${res.link ? `
                          <a href="${res.link}" target="_blank" class="btn-premium" style="padding:8px 16px; font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; height:auto; min-height:auto;">
                            <span>🔗</span> Open Link
                          </a>
                        ` : ''}
                      </div>
                      <p style="font-size:13px; color:var(--text-description); line-height:1.6; margin:0; background:rgba(0,0,0,0.25); padding:10px 14px; border-radius:8px;">
                        <strong>Advisor Notes:</strong> ${res.notes}
                      </p>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
 
            <!-- Trajectory Panel -->
            <div class="card-ent card-dark" style="padding:48px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:48px;">
                <div>
                  <h2 class="h2-ent">Employability Neural Trend</h2>
                  <p style="color:var(--text-description); font-size:14px; margin-top:4px;">Diagnostic trajectory for comprehensive career readiness.</p>
                </div>
                <div class="data-card-subtle" style="padding:8px 16px; border-radius:8px; font-size:11px; font-weight:800; color:var(--text-muted); letter-spacing:0.05em;">LIVE TELEMETRY</div>
              </div>
              
              <div style="height:320px; width:100%; position:relative;">
                <svg width="100%" height="100%" viewBox="0 0 800 320" preserveAspectRatio="none" style="display:block;">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="var(--brand-primary)" stop-opacity="0.22"/>
                      <stop offset="100%" stop-color="var(--brand-primary)" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  
                  <!-- Grid telemetry references -->
                  <line x1="0" y1="64" x2="800" y2="64" stroke="var(--glass-border-main)" stroke-opacity="0.25" stroke-dasharray="4 8" />
                  <line x1="0" y1="128" x2="800" y2="128" stroke="var(--glass-border-main)" stroke-opacity="0.25" stroke-dasharray="4 8" />
                  <line x1="0" y1="192" x2="800" y2="192" stroke="var(--glass-border-main)" stroke-opacity="0.25" stroke-dasharray="4 8" />
                  <line x1="0" y1="256" x2="800" y2="256" stroke="var(--glass-border-main)" stroke-opacity="0.25" stroke-dasharray="4 8" />

                  <!-- Paths -->
                  <path d="M0,280 Q150,260 300,180 T600,120 T800,40 L800,320 L0,320 Z" fill="url(#chartGrad)"/>
                  <path d="M0,280 Q150,260 300,180 T600,120 T800,40" fill="none" stroke="var(--brand-primary)" stroke-width="3.5" stroke-linecap="round"/>
                  
                  <!-- Pulsating Node 1 -->
                  <circle cx="300" cy="180" r="10" fill="var(--brand-primary)" fill-opacity="0.3" class="pulse-ring-element" />
                  <circle cx="300" cy="180" r="4.5" fill="#fff" stroke="var(--brand-primary)" stroke-width="3.5"/>
                  
                  <!-- Pulsating Node 2 -->
                  <circle cx="800" cy="40" r="10" fill="var(--brand-primary)" fill-opacity="0.3" class="pulse-ring-element" />
                  <circle cx="800" cy="40" r="4.5" fill="#fff" stroke="var(--brand-primary)" stroke-width="3.5"/>
                </svg>
                <div class="data-card-subtle" style="position:absolute; bottom:40px; right:40px; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); padding:16px 24px; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.2);">
                  <div class="label-ent" style="color:var(--brand-primary); font-size:10px; margin-bottom:4px;">Current Prediction</div>
                  <div style="font-weight:800; color:#fff; font-size:15px; font-family:var(--font-display);">${technicalSkill >= 80 ? 'Tier 1' : 'Tier 2'} High Probability</div>
                </div>
              </div>
            </div>

            <!-- Action Node -->
            <div class="card-ent" style="padding:40px;">
              <h2 class="h2-ent" style="margin-bottom:32px;">Institutional Action Center</h2>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
                <div class="data-card-subtle" style="border-radius:16px; padding:32px; display:flex; flex-direction:column; justify-content:space-between; height:180px;">
                  <div>
                    <div style="font-family:var(--font-display); font-weight:700; font-size:16px; color:#fff; margin-bottom:8px;">TPO Opportunity Stream</div>
                    <div class="label-ent" style="font-size:10px;">Latest: ${Store.drives[0]?.company || 'Pending...'}</div>
                  </div>
                  <button class="btn-premium" onclick="window.location.hash='new-applications'">Commence Application</button>
                </div>
                <div class="data-card-subtle" style="border-radius:16px; padding:32px; display:flex; flex-direction:column; justify-content:space-between; height:180px;">
                  <div>
                    <div style="font-family:var(--font-display); font-weight:700; font-size:16px; color:#fff; margin-bottom:8px;">Meta University Network</div>
                    <div class="label-ent" style="font-size:10px;">Screening in Progress</div>
                  </div>
                  <button class="btn-premium-ghost" onclick="window.location.hash='my-slots'">Track Progression</button>
                </div>
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:40px;">
            <!-- Intelligence Feed -->
            <div class="card-ent" style="padding:40px;">
              <div class="label-ent" style="color:var(--brand-primary); margin-bottom:32px;">Operational Intelligence</div>
              <div style="display:flex; flex-direction:column; gap:32px;">
                <div style="position:relative; padding-left:24px; border-left:1px solid var(--glass-border-main);">
                  <div style="position:absolute; left:-6.5px; top:3px; width:13px; height:13px; border-radius:50%; background:var(--bg-card); border:3px solid var(--brand-primary); box-shadow:0 0 0 3px var(--brand-primary-light);"></div>
                  <div style="font-weight:700; color:var(--text-main); font-size:14px; margin-bottom:4px;">Node Sync Complete</div>
                  <p style="font-size:13px; color:var(--text-description); line-height:1.6;">Resume parsed for FinTech infrastructure alignment. Match: 88%.</p>
                  <div class="label-ent" style="font-size:10px; margin-top:8px;">2h 14m ago</div>
                </div>
                <div style="position:relative; padding-left:24px; border-left:1px solid var(--glass-border-main);">
                  <div style="position:absolute; left:-6.5px; top:3px; width:13px; height:13px; border-radius:50%; background:var(--bg-card); border:3px solid var(--text-muted); box-shadow:0 0 0 3px rgba(0, 0, 0, 0.02);"></div>
                  <div style="font-weight:700; color:var(--text-main); font-size:14px; margin-bottom:4px;">Skill Radar Update</div>
                  <p style="font-size:13px; color:var(--text-description); line-height:1.6;">Cloud Architecture certification verified by Dept. Node.</p>
                  <div class="label-ent" style="font-size:10px; margin-top:8px;">Yesterday</div>
                </div>
              </div>
            </div>

            <!-- Quick Governance -->
            <div class="card-ent" style="padding:40px;">
              <div class="label-ent" style="margin-bottom:24px;">Governance Links</div>
              <div style="display:flex; flex-direction:column; gap:12px;">
                <a href="#queries" class="gov-link">Institutional Query</a>
                <a href="#resume-analysis" class="gov-link">Execute Neural Scan</a>
                <a href="#skill-analysis" class="gov-link">Infrastructure Audit</a>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>
        .btn-premium {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #00C8FF 0%, #0088CC 100%); color: #050810; border: 1px solid rgba(255,255,255,0.3); padding: 12px 20px; 
          border-radius: var(--radius-sm); font-size: 13px; font-weight: 700; cursor: pointer; transition: all var(--t-fast);
          box-shadow: 0 4px 16px rgba(0, 200, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          min-height: 44px;
        }
        .btn-premium:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0, 200, 255, 0.4); background: linear-gradient(135deg, #33D4FF 0%, #00B4F0 100%); }

        .btn-premium-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 200, 255, 0.06); color: #00C8FF; border: 1px solid rgba(0, 200, 255, 0.2); 
          padding: 12px 20px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 700; cursor: pointer; transition: all var(--t-fast);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          min-height: 44px;
        }
        .btn-premium-ghost:hover { background: rgba(0, 200, 255, 0.15); color: #ffffff; border-color: rgba(0, 200, 255, 0.45); transform: translateY(-1.5px); }

        .gov-link {
          display: block; padding: 16px; background: var(--data-bg); border: 1px solid var(--glass-border-main);
          border-radius: var(--radius-md); color: var(--text-description); font-size: 14px; font-weight: 600; text-decoration: none; transition: all var(--t-fast);
        }
        .gov-link:hover { color: var(--text-main); border-color: var(--brand-primary); transform: translateX(4px); background: var(--data-bg-alt); }

        .clickable-slot-card {
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .clickable-slot-card:hover {
          transform: translateY(-3px);
          border-color: var(--brand-primary) !important;
          box-shadow: var(--shadow-card-hover);
        }
      </style>
    `;
  }

  const onStoreUpdate = () => render();
  window.addEventListener('store-updated', onStoreUpdate);

  render();

  // Cleanup
  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      window.removeEventListener('store-updated', onStoreUpdate);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
