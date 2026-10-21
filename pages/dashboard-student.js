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
    const activeEngagementsCount = Store.studentProfile?.applications?.length || 0;
    const pendingReviewsCount = (Store.studentProfile?.applications || []).filter(a => a.status === 'Applied' || a.status === 'Shortlisted').length;
    
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

    const openDrivesCount = Store.drives.filter(d=>d.status==='Open').length;
    const shortName = studentName ? studentName.split(' ')[0] : 'Student';

    root.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 28px;">
        
        <!-- Professional Welcome Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle);">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; flex-wrap:wrap;">
              <span style="font-size:11.5px; font-weight:700; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.08em; background:rgba(0, 200, 255, 0.08); border:1px solid rgba(0, 200, 255, 0.25); padding:4px 12px; border-radius:100px; display:inline-flex; align-items:center; gap:6px;">
                <span>🎓</span> ${Store.session.user.institution || 'Campus Placement Workspace'}
              </span>
              <span style="font-size:12px; color:var(--text-muted);">•</span>
              <span style="font-size:12.5px; font-weight:600; color:var(--text-secondary);">
                ${studentDept} Department
              </span>
              <span style="font-size:12px; color:var(--text-muted);">•</span>
              <span style="font-size:12.5px; font-weight:600; color:var(--text-muted);">
                Batch of 2026
              </span>
            </div>
            <h1 class="h1-ent" style="font-size:28px; letter-spacing:-0.03em; margin:0 0 6px 0; color:#fff;">
              Welcome back, <span style="background:linear-gradient(135deg, #FFFFFF 30%, #00C8FF 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">${shortName}</span> 👋
            </h1>
            <p style="font-size:14px; color:var(--text-description); margin:0;">
              Your career readiness index, active placement pipeline, and real-time interview schedules.
            </p>
          </div>

          <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
            <div style="padding:8px 16px; border-radius:100px; display:flex; align-items:center; gap:10px; font-size:12.5px; font-weight:700; background:rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color:#10B981;">
              <span style="width:8px; height:8px; background:#10B981; border-radius:50%; box-shadow:0 0 10px #10B981;"></span>
              Placement Cycle Active
            </div>
            <a href="#new-applications" class="btn-premium" style="padding:10px 18px; border-radius:10px; text-decoration:none; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
              <span>💼</span> Browse Drives
            </a>
            <a href="#virtual-interview" class="btn-premium-ghost" style="padding:10px 18px; border-radius:10px; text-decoration:none; font-size:13px; font-weight:700; display:inline-flex; align-items:center; gap:8px;">
              <span>🤖</span> AI Mock Coach
            </a>
          </div>
        </div>

        <!-- 4 Refined KPI Metric Cards -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
          
          <!-- KPI 1: Employability Index -->
          <div class="card-ent" style="background: linear-gradient(145deg, rgba(13, 22, 42, 0.9), rgba(9, 14, 28, 0.96)); border: 1px solid rgba(0, 200, 255, 0.22); padding: 22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-description);">Employability Index</span>
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(0, 200, 255, 0.12); border:1px solid rgba(0, 200, 255, 0.25); display:flex; align-items:center; justify-content:center; font-size:16px;">🎯</div>
            </div>
            <div style="display:flex; align-items:baseline; gap:6px;">
              <div class="metric-ent" style="font-size:36px; line-height:1; font-weight:800; color:#fff;">${technicalSkill}</div>
              <span style="font-size:14px; font-weight:700; color:var(--text-muted);">/ 100</span>
              <span style="margin-left:auto; font-size:11px; font-weight:700; color:#10B981; background:rgba(16, 185, 129, 0.12); border:1px solid rgba(16, 185, 129, 0.25); padding:2px 8px; border-radius:100px;">▲ +4%</span>
            </div>
            <div style="height:6px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden; margin-top:14px;">
              <div style="width:${technicalSkill}%; height:100%; background:linear-gradient(90deg, #00C8FF, #8B5CF6); border-radius:10px; box-shadow:0 0 10px rgba(0,200,255,0.5);"></div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; font-size:12px; color:var(--text-description);">
              <span>Readiness Tier</span>
              <span style="color:#00C8FF; font-weight:700;">${technicalSkill >= 80 ? 'Tier 1 Dream' : 'Benchmark'}</span>
            </div>
          </div>

          <!-- KPI 2: Active Applications -->
          <div class="card-ent" style="background: linear-gradient(145deg, rgba(13, 20, 38, 0.9), rgba(9, 13, 26, 0.95)); border: 1px solid rgba(255, 255, 255, 0.08); padding: 22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-description);">Active Applications</span>
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(139, 92, 246, 0.12); border:1px solid rgba(139, 92, 246, 0.25); display:flex; align-items:center; justify-content:center; font-size:16px;">💼</div>
            </div>
            <div style="display:flex; align-items:baseline; gap:6px;">
              <div class="metric-ent" style="font-size:36px; line-height:1; font-weight:800; color:#fff;">${activeEngagementsCount}</div>
              <span style="font-size:13px; font-weight:600; color:var(--text-muted);">${activeEngagementsCount === 1 ? 'Drive Applied' : 'Drives Applied'}</span>
            </div>
            <div style="margin-top:14px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:12px; color:var(--text-description);">${pendingReviewsCount} Under Review</span>
              <a href="#new-applications" style="font-size:12px; font-weight:700; color:var(--brand-primary); text-decoration:none;">View All →</a>
            </div>
          </div>

          <!-- KPI 3: Campus Readiness Tier -->
          <div class="card-ent" style="background: linear-gradient(145deg, rgba(13, 20, 38, 0.9), rgba(9, 13, 26, 0.95)); border: 1px solid rgba(255, 255, 255, 0.08); padding: 22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-description);">Placement Tier</span>
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(16, 185, 129, 0.12); border:1px solid rgba(16, 185, 129, 0.25); display:flex; align-items:center; justify-content:center; font-size:16px;">🏆</div>
            </div>
            <div style="display:flex; align-items:baseline; gap:6px;">
              <div class="metric-ent" style="font-size:34px; line-height:1; font-weight:800; color:#10B981;">${technicalSkill >= 80 ? 'Tier 1' : 'Tier 2'}</div>
              <span style="font-size:11px; font-weight:700; color:#10B981; background:rgba(16, 185, 129, 0.12); border:1px solid rgba(16, 185, 129, 0.25); padding:2px 8px; border-radius:100px;">Dream Pool</span>
            </div>
            <div style="margin-top:14px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.08);">
              <p style="font-size:12px; color:var(--text-description); margin:0;">Top ${technicalSkill >= 85 ? '10%' : technicalSkill >= 75 ? '25%' : '40%'} of ${studentDept} Department</p>
            </div>
          </div>

          <!-- KPI 4: Open Drives Available -->
          <div class="card-ent" style="background: linear-gradient(145deg, rgba(13, 20, 38, 0.9), rgba(9, 13, 26, 0.95)); border: 1px solid rgba(255, 255, 255, 0.08); padding: 22px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-description);">Eligible Campus Drives</span>
              <div style="width:34px; height:34px; border-radius:10px; background:rgba(245, 158, 11, 0.12); border:1px solid rgba(245, 158, 11, 0.25); display:flex; align-items:center; justify-content:center; font-size:16px;">🏢</div>
            </div>
            <div style="display:flex; align-items:baseline; gap:6px;">
              <div class="metric-ent" style="font-size:36px; line-height:1; font-weight:800; color:#fff;">${openDrivesCount}</div>
              <span style="font-size:13px; font-weight:600; color:var(--text-muted);">Open Drives</span>
              <span style="margin-left:auto; font-size:11px; font-weight:700; color:#F59E0B; background:rgba(245, 158, 11, 0.12); border:1px solid rgba(245, 158, 11, 0.25); padding:2px 8px; border-radius:100px;">+2 New</span>
            </div>
            <div style="margin-top:14px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between;">
              <span style="font-size:12px; color:var(--text-description);">Upcoming Deadlines</span>
              <a href="#new-applications" style="font-size:12px; font-weight:700; color:var(--brand-primary); text-decoration:none;">Apply Now →</a>
            </div>
          </div>

        </div>

        <!-- Primary Content Area (2-Column Grid) -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 28px;">
          
          <!-- Left Column (Main Workflows) -->
          <div style="display:flex; flex-direction:column; gap:28px;">
            
            <!-- Interview Schedule / Upcoming Slots -->
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px;">
                <h3 style="font-family:var(--font-display); font-size:17px; font-weight:700; color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
                  <span>📅</span> Upcoming Interview Rounds & Schedules
                </h3>
                <a href="#my-slots" style="font-size:12.5px; font-weight:700; color:var(--brand-primary); text-decoration:none;">
                  View All Slots →
                </a>
              </div>

              ${myAllocations.length === 0 ? `
                <div class="card-ent animate-fade-in-up" style="padding: 36px 28px; text-align: center; border: 1px dashed rgba(255,255,255,0.12); background: rgba(13, 20, 36, 0.5);">
                  <div style="width:52px; height:52px; border-radius:14px; background:linear-gradient(135deg, rgba(0,200,255,0.12), rgba(139,92,246,0.12)); border:1px solid rgba(0,200,255,0.25); display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 14px;">
                    🕒
                  </div>
                  <h4 style="font-family:var(--font-display); font-size:16px; font-weight:700; color:#fff; margin:0 0 6px 0;">No Active Schedules Released</h4>
                  <p style="color:var(--text-description); font-size:13.5px; max-width:440px; margin:0 auto 18px; line-height:1.6;">
                    When training and placement officers publish shortlists or allocate interview slots for your applied companies, your reporting schedule and venue details will appear here in real time.
                  </p>
                  <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
                    <a href="#new-applications" class="btn-premium" style="padding:8px 16px; font-size:12.5px; text-decoration:none; border-radius:8px;">Explore Open Drives</a>
                    <a href="#virtual-interview" class="btn-premium-ghost" style="padding:8px 16px; font-size:12.5px; text-decoration:none; border-radius:8px;">Practice AI Mock Coach</a>
                  </div>
                </div>
              ` : myAllocations.map(alloc => `
                <div class="card-ent clickable-slot-card animate-fade-in-up" onclick="window.location.hash='my-slots'" style="background: linear-gradient(135deg, rgba(13, 22, 42, 0.9), rgba(9, 14, 28, 0.95)); border: 1px solid rgba(0, 200, 255, 0.25); padding:24px; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                    <div>
                      <span class="badge badge-success badge-dot" style="margin-bottom:8px; font-size:10px; background:rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color:#10B981;">SCHEDULED ROUND</span>
                      <h3 style="font-family:var(--font-display); font-size:19px; font-weight:700; color:#fff; margin:4px 0 2px 0;">${alloc.company} — ${alloc.roundName}</h3>
                      <p style="color:var(--text-description); font-size:13.5px; margin:0;">Role: <strong style="color:var(--text-secondary);">${alloc.role}</strong></p>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:10.5px; font-weight:700; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px;">Date of Process</div>
                      <div style="font-weight:800; color:#fff; font-size:15px; font-family:var(--font-display);">${alloc.date}</div>
                    </div>
                  </div>
                  
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; padding-top:14px; border-top:1px dashed rgba(255,255,255,0.08);">
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:34px; height:34px; border-radius:8px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; font-size:15px;">🏢</div>
                      <div>
                        <div style="font-size:9.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Venue / Hall</div>
                        <div style="font-weight:700; color:#fff; font-size:13.5px;">${alloc.venue}</div>
                      </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                      <div style="width:34px; height:34px; border-radius:8px; background:rgba(255,255,255,0.04); border:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:center; font-size:15px;">🕒</div>
                      <div>
                        <div style="font-size:9.5px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Slot Interval</div>
                        <div style="font-weight:700; color:#fff; font-size:13.5px;">${alloc.slotTime}</div>
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>

            <!-- Employability Growth Trajectory (Interactive Chart) -->
            <div class="card-ent" style="padding:28px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; flex-wrap:wrap; gap:12px;">
                <div>
                  <h3 style="font-family:var(--font-display); font-size:18px; font-weight:700; color:#fff; margin:0 0 4px 0;">Employability & Skill Trajectory</h3>
                  <p style="color:var(--text-description); font-size:13.5px; margin:0;">Continuous benchmarking across coding, system architecture, and technical interview assessments.</p>
                </div>
                <div style="display:flex; align-items:center; gap:6px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); padding:3px; border-radius:8px;">
                  <button class="filter-tab active" style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:700; border:none; background:rgba(0,200,255,0.15); color:var(--brand-primary); cursor:pointer;">All Time</button>
                  <button class="filter-tab" style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; border:none; background:transparent; color:var(--text-muted); cursor:pointer;">90 Days</button>
                  <button class="filter-tab" style="padding:4px 10px; border-radius:6px; font-size:11px; font-weight:600; border:none; background:transparent; color:var(--text-muted); cursor:pointer;">Sem 6</button>
                </div>
              </div>
              
              <div style="height:260px; width:100%; position:relative; margin-bottom:20px;">
                <svg width="100%" height="100%" viewBox="0 0 800 260" preserveAspectRatio="none" style="display:block;">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#00C8FF" stop-opacity="0.25"/>
                      <stop offset="100%" stop-color="#00C8FF" stop-opacity="0.0"/>
                    </linearGradient>
                  </defs>
                  
                  <!-- Grid telemetry references -->
                  <line x1="0" y1="50" x2="800" y2="50" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 6" />
                  <line x1="0" y1="110" x2="800" y2="110" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 6" />
                  <line x1="0" y1="170" x2="800" y2="170" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4 6" />

                  <!-- Text Labels inside SVG -->
                  <text x="10" y="45" fill="#64748B" font-size="10" font-weight="600">90% — Tier 1 Target</text>
                  <text x="10" y="105" fill="#64748B" font-size="10" font-weight="600">75% — Campus Benchmark</text>
                  <text x="10" y="165" fill="#64748B" font-size="10" font-weight="600">60% — Minimum Criteria</text>

                  <!-- Paths -->
                  <path d="M0,230 Q160,210 280,140 T540,95 T800,35 L800,260 L0,260 Z" fill="url(#chartGrad)"/>
                  <path d="M0,230 Q160,210 280,140 T540,95 T800,35" fill="none" stroke="#00C8FF" stroke-width="3" stroke-linecap="round"/>
                  
                  <!-- Milestone 1 -->
                  <circle cx="280" cy="140" r="8" fill="#00C8FF" fill-opacity="0.2" />
                  <circle cx="280" cy="140" r="4" fill="#fff" stroke="#00C8FF" stroke-width="2.5"/>

                  <!-- Milestone 2 -->
                  <circle cx="540" cy="95" r="8" fill="#00C8FF" fill-opacity="0.2" />
                  <circle cx="540" cy="95" r="4" fill="#fff" stroke="#00C8FF" stroke-width="2.5"/>
                  
                  <!-- Current Peak -->
                  <circle cx="796" cy="35" r="10" fill="#00C8FF" fill-opacity="0.3" class="pulse-ring-element" />
                  <circle cx="796" cy="35" r="4.5" fill="#fff" stroke="#00C8FF" stroke-width="3"/>
                </svg>

                <div style="position:absolute; top:20px; right:20px; background:rgba(10, 16, 30, 0.85); backdrop-filter:blur(8px); padding:10px 16px; border-radius:10px; border:1px solid rgba(0,200,255,0.25); box-shadow:0 4px 20px rgba(0,0,0,0.4);">
                  <div style="font-size:10px; font-weight:700; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:2px;">Target Readiness</div>
                  <div style="font-weight:800; color:#fff; font-size:13.5px; font-family:var(--font-display);">Tier 1 High Probability (${technicalSkill}%)</div>
                </div>
              </div>

              <!-- 4 Skill Breakdown Bars -->
              <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:14px; padding-top:16px; border-top:1px solid var(--border-subtle);">
                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px;">
                    <span style="font-weight:600; color:var(--text-secondary);">💻 Data Structures & Algorithms</span>
                    <span style="font-weight:700; color:#00C8FF;">86%</span>
                  </div>
                  <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;">
                    <div style="width:86%; height:100%; background:#00C8FF; border-radius:10px;"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px;">
                    <span style="font-weight:600; color:var(--text-secondary);">⚙️ Core CS (OS, DBMS, Networks)</span>
                    <span style="font-weight:700; color:#10B981;">88%</span>
                  </div>
                  <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;">
                    <div style="width:88%; height:100%; background:#10B981; border-radius:10px;"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px;">
                    <span style="font-weight:600; color:var(--text-secondary);">🏗️ System Design & Cloud Basics</span>
                    <span style="font-weight:700; color:#8B5CF6;">80%</span>
                  </div>
                  <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;">
                    <div style="width:80%; height:100%; background:#8B5CF6; border-radius:10px;"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:12px;">
                    <span style="font-weight:600; color:var(--text-secondary);">💬 Communication & Behavioral</span>
                    <span style="font-weight:700; color:#F59E0B;">82%</span>
                  </div>
                  <div style="height:5px; background:rgba(255,255,255,0.06); border-radius:10px; overflow:hidden;">
                    <div style="width:82%; height:100%; background:#F59E0B; border-radius:10px;"></div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Prep Materials Shared by Advisors -->
            ${myResources.length > 0 ? `
              <div class="card-ent animate-fade-in-up" style="padding:28px; background:linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(0,0,0,0) 100%); border:1px solid rgba(16,185,129,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                  <div>
                    <h3 style="font-family:var(--font-display); font-size:17px; font-weight:700; color:#fff; margin:0 0 2px 0; display:flex; align-items:center; gap:8px;">
                      <span>📚</span> Curated Prep Materials from Faculty Advisors
                    </h3>
                    <p style="color:var(--text-description); font-size:13px; margin:0;">Targeted technical guides and practice materials assigned for your section.</p>
                  </div>
                  <span class="status-pill status-success" style="font-size:11px; padding:3px 10px; border-radius:100px; background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3);">
                    ${myResources.length} Active
                  </span>
                </div>
                
                <div style="display:flex; flex-direction:column; gap:12px;">
                  ${myResources.map(res => `
                    <div style="padding:16px 20px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; display:flex; flex-direction:column; gap:10px;">
                      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                          <span style="font-size:10.5px; font-weight:700; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.06em; background:rgba(0,200,255,0.1); padding:2px 8px; border-radius:4px;">
                            ${res.type}
                          </span>
                          <h4 style="font-size:15px; font-weight:700; color:#fff; margin:6px 0 2px 0; font-family:var(--font-display);">${res.title}</h4>
                          <div style="font-size:12px; color:var(--text-muted);">Assigned by ${res.shared_by} on ${res.date}</div>
                        </div>
                        ${res.link ? `
                          <a href="${res.link}" target="_blank" class="btn-premium" style="padding:6px 14px; font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; min-height:36px;">
                            <span>🔗</span> Open
                          </a>
                        ` : ''}
                      </div>
                      ${res.notes ? `
                        <p style="font-size:12.5px; color:var(--text-description); line-height:1.5; margin:0; background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:6px;">
                          <strong>Advisor Notes:</strong> ${res.notes}
                        </p>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

          </div>

          <!-- Right Column (Live Feed & Fast Actions) -->
          <div style="display:flex; flex-direction:column; gap:28px;">
            
            <!-- Recent Placement Activity -->
            <div class="card-ent" style="padding:26px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="font-family:var(--font-display); font-size:16px; font-weight:700; color:#fff; margin:0; display:flex; align-items:center; gap:8px;">
                  <span>⚡</span> Placement Activity
                </h3>
                <span style="font-size:10.5px; font-weight:700; color:var(--brand-primary); text-transform:uppercase; letter-spacing:0.06em;">LIVE</span>
              </div>

              <div style="display:flex; flex-direction:column; gap:18px;">
                <div style="display:flex; gap:12px; align-items:flex-start;">
                  <div style="width:28px; height:28px; border-radius:8px; background:rgba(0,200,255,0.12); border:1px solid rgba(0,200,255,0.3); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">📄</div>
                  <div>
                    <div style="font-weight:700; color:#fff; font-size:13px; margin-bottom:2px;">Resume ATS Match Verified</div>
                    <p style="font-size:12px; color:var(--text-description); line-height:1.5; margin:0;">Resume scored 88% alignment for Cloud & Software Engineering roles.</p>
                    <div style="font-size:10.5px; color:var(--text-muted); margin-top:4px;">2 hours ago</div>
                  </div>
                </div>

                <div style="display:flex; gap:12px; align-items:flex-start;">
                  <div style="width:28px; height:28px; border-radius:8px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">🏆</div>
                  <div>
                    <div style="font-weight:700; color:#fff; font-size:13px; margin-bottom:2px;">Skill Benchmark Validated</div>
                    <p style="font-size:12px; color:var(--text-description); line-height:1.5; margin:0;">Cloud Architecture & DSA assessments certified in Top 10% band.</p>
                    <div style="font-size:10.5px; color:var(--text-muted); margin-top:4px;">Yesterday</div>
                  </div>
                </div>

                <div style="display:flex; gap:12px; align-items:flex-start;">
                  <div style="width:28px; height:28px; border-radius:8px; background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.3); display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0;">📢</div>
                  <div>
                    <div style="font-weight:700; color:#fff; font-size:13px; margin-bottom:2px;">New Campus Drive Added</div>
                    <p style="font-size:12px; color:var(--text-description); line-height:1.5; margin:0;">Google Cloud & AI role registration opened for CSE Batch 2026.</p>
                    <div style="font-size:10.5px; color:var(--text-muted); margin-top:4px;">3 days ago</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Career Acceleration Tools -->
            <div class="card-ent" style="padding:26px;">
              <div style="margin-bottom:18px;">
                <h3 style="font-family:var(--font-display); font-size:16px; font-weight:700; color:#fff; margin:0 0 4px 0;">Career Preparation Tools</h3>
                <p style="color:var(--text-description); font-size:12.5px; margin:0;">One-click shortcuts to key placement workflows.</p>
              </div>

              <div style="display:flex; flex-direction:column; gap:10px;">
                <a href="#resume-analysis" class="tool-shortcut">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:8px; background:rgba(0,200,255,0.1); display:flex; align-items:center; justify-content:center; font-size:16px;">📄</div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:13px;">Resume ATS Optimizer</div>
                      <div style="font-size:11.5px; color:var(--text-description);">Scan and improve ATS job keyword match</div>
                    </div>
                  </div>
                  <span style="color:var(--brand-primary); font-weight:700; font-size:14px;">→</span>
                </a>

                <a href="#virtual-interview" class="tool-shortcut">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:8px; background:rgba(139,92,246,0.1); display:flex; align-items:center; justify-content:center; font-size:16px;">🤖</div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:13px;">AI Virtual Interview Coach</div>
                      <div style="font-size:11.5px; color:var(--text-description);">Practice real-time speech & technical rounds</div>
                    </div>
                  </div>
                  <span style="color:var(--brand-primary); font-weight:700; font-size:14px;">→</span>
                </a>

                <a href="#new-applications" class="tool-shortcut">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:8px; background:rgba(16,185,129,0.1); display:flex; align-items:center; justify-content:center; font-size:16px;">💼</div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:13px;">Campus Placement Drives</div>
                      <div style="font-size:11.5px; color:var(--text-description);">View eligibility, CTC packages & deadlines</div>
                    </div>
                  </div>
                  <span style="color:var(--brand-primary); font-weight:700; font-size:14px;">→</span>
                </a>

                <a href="#alumni-connect" class="tool-shortcut">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:8px; background:rgba(245,158,11,0.1); display:flex; align-items:center; justify-content:center; font-size:16px;">🤝</div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:13px;">Alumni Mentor Network</div>
                      <div style="font-size:11.5px; color:var(--text-description);">Connect with seniors placed at top companies</div>
                    </div>
                  </div>
                  <span style="color:var(--brand-primary); font-weight:700; font-size:14px;">→</span>
                </a>

                <a href="#queries" class="tool-shortcut">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:34px; height:34px; border-radius:8px; background:rgba(59,130,246,0.1); display:flex; align-items:center; justify-content:center; font-size:16px;">💬</div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:13px;">TPO Placement Helpdesk</div>
                      <div style="font-size:11.5px; color:var(--text-description);">Submit questions to placement coordinators</div>
                    </div>
                  </div>
                  <span style="color:var(--brand-primary); font-weight:700; font-size:14px;">→</span>
                </a>
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
          background: linear-gradient(135deg, #00C8FF 0%, #0088CC 100%);
          color: #050810;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 10px 18px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--t-fast);
          box-shadow: 0 4px 16px rgba(0, 200, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.3);
          min-height: 40px;
        }
        .btn-premium:hover {
          transform: translateY(-1.5px);
          box-shadow: 0 8px 24px rgba(0, 200, 255, 0.4);
          background: linear-gradient(135deg, #33D4FF 0%, #00B4F0 100%);
        }

        .btn-premium-ghost {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 200, 255, 0.08);
          color: #00C8FF;
          border: 1px solid rgba(0, 200, 255, 0.25);
          padding: 10px 18px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--t-fast);
          min-height: 40px;
        }
        .btn-premium-ghost:hover {
          background: rgba(0, 200, 255, 0.16);
          color: #ffffff;
          border-color: rgba(0, 200, 255, 0.45);
          transform: translateY(-1.5px);
        }

        .tool-shortcut {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-subtle);
          border-radius: 10px;
          text-decoration: none;
          transition: all var(--t-fast);
        }
        .tool-shortcut:hover {
          background: rgba(0, 200, 255, 0.06);
          border-color: rgba(0, 200, 255, 0.3);
          transform: translateX(3px);
        }

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
