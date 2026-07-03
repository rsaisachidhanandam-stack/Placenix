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
  if (supabase && user.id) {
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data: dbUser }) => {
        if (dbUser) {
          Store.session.user = { ...Store.session.user, ...dbUser };
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

    root.innerHTML = `
      <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
        
        <!-- Operational Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <div>
            <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">${Store.session.user.institution || 'Placenix Institutional Node'}</div>
            <h1 class="h1-ent">Operational Intelligence</h1>
          </div>
          <div style="display:flex; gap:16px;">
            <div style="background:var(--bg-card); border:1px solid var(--border-main); padding:8px 16px; border-radius:10px; display:flex; align-items:center; gap:12px; font-size:12px; font-weight:700;">
              <div style="width:8px; height:8px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 8px var(--brand-secondary);"></div>
              Node Active: ${Store.session.user.full_name || Store.session.user.name || 'Student'}
            </div>
          </div>
        </div>

        <!-- Metric Infrastructure -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
          <div class="card-ent" style="background: linear-gradient(145deg, var(--bg-card), rgba(139,92,246,0.05));">
            <div class="label-ent" style="margin-bottom: 16px;">Employability Node</div>
            <div class="metric-ent">${technicalSkill}</div>
            <div style="height:4px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden; margin-top:16px;">
              <div style="width:${technicalSkill}%; height:100%; background:var(--brand-primary); box-shadow:0 0 12px var(--brand-primary);"></div>
            </div>
          </div>

          <div class="card-ent">
            <div class="label-ent" style="margin-bottom: 16px;">Active Engagements</div>
            <div class="metric-ent">${activeEngagementsCount}</div>
            <p style="font-size:12px; color:var(--text-description); margin-top:8px;">${pendingReviewsCount} Pending institutional reviews</p>
          </div>

          <div class="card-ent">
            <div class="label-ent" style="margin-bottom: 16px;">Market Readiness</div>
            <div class="metric-ent">${technicalSkill >= 80 ? 'Tier 1' : 'Tier 2'}</div>
            <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Top 10% of Department Node</p>
          </div>

          <div class="card-ent">
            <div class="label-ent" style="margin-bottom: 16px;">Total Institutional Opportunities</div>
            <div class="metric-ent">${Store.drives.filter(d=>d.status==='Open').length}</div>
            <p style="font-size:12px; color:var(--text-description); margin-top:8px;">New drives this week: <span style="color:var(--brand-secondary);">+${Store.drives.filter(d=>d.status==='Open').length > 3 ? '1' : '2'}</span></p>
          </div>
        </div>

        <!-- Primary Content Area -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap: 40px;">
          
          <div style="display:flex; flex-direction:column; gap:40px;">
            <!-- Scheduled Rounds Node -->
            ${myAllocations.length === 0 ? `
              <div class="card-ent animate-fade-in-up" style="background: linear-gradient(135deg, rgba(255,255,255,0.01), rgba(255,255,255,0.02)); border: 1px dashed var(--border-main); padding: 48px 32px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; text-align:center; position:relative; overflow:hidden;">
                <div style="width:56px; height:56px; border-radius:50%; background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.2); display:flex; align-items:center; justify-content:center; font-size:24px; color:var(--brand-primary);">🕒</div>
                <div>
                  <h3 style="font-size:16px; font-weight:700; color:#fff; margin:0 0 8px 0;">No Active Schedules Released</h3>
                  <p style="color:var(--text-description); font-size:12.5px; max-width:440px; margin:0; line-height:1.6;">
                    Your upcoming recruitment round slots and venue details will appear here in real-time once published by training and placement officers.
                  </p>
                </div>
              </div>
            ` : myAllocations.map(alloc => `
              <div class="card-ent clickable-slot-card animate-fade-in-up" onclick="window.location.hash='my-slots'" style="background: linear-gradient(135deg, rgba(139,92,246,0.1), rgba(14,165,233,0.05)); border: 1.5px solid rgba(139,92,246,0.3); padding:32px; display:flex; flex-direction:column; gap:16px; position:relative; overflow:hidden;">
                <!-- Decorative background elements -->
                <div style="position:absolute; right:-20px; top:-20px; font-size:96px; opacity:0.04; transform:rotate(15deg); font-weight:900; user-select:none;">📅</div>
                
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">
                  <div>
                    <span class="badge badge-success badge-dot" style="margin-bottom:8px; font-size:9px; background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.3);">SCHEDULED ROUND</span>
                    <h2 class="h2-ent" style="font-size:22px; color:#fff; margin:0;">${alloc.company} — ${alloc.roundName}</h2>
                    <p style="color:var(--text-description); font-size:13.5px; margin:4px 0 0 0;">Designation: ${alloc.role}</p>
                  </div>
                  <div style="text-align:right;">
                    <div class="label-ent" style="color:var(--brand-secondary); font-size:9px; margin-bottom:4px;">Date of Process</div>
                    <div style="font-weight:800; color:#fff; font-size:15px;">${alloc.date}</div>
                  </div>
                </div>
                
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:8px; padding-top:16px; border-top:1px dashed rgba(255,255,255,0.08);">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-main); display:flex; align-items:center; justify-content:center; font-size:16px;">🏢</div>
                    <div>
                      <div class="label-ent" style="font-size:8px; margin-bottom:2px;">VENUE ROOM</div>
                      <div style="font-weight:700; color:#fff; font-size:13px;">${alloc.venue}</div>
                    </div>
                  </div>
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-main); display:flex; align-items:center; justify-content:center; font-size:16px;">🕒</div>
                    <div>
                      <div class="label-ent" style="font-size:8px; margin-bottom:2px;">SLOT INTERVAL</div>
                      <div style="font-weight:700; color:#fff; font-size:13px;">${alloc.slotTime}</div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}

            <!-- Trajectory Panel -->
            <div class="card-ent" style="padding:48px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:48px;">
                <div>
                  <h2 class="h2-ent">Employability Neural Trend</h2>
                  <p style="color:var(--text-description); font-size:14px; margin-top:4px;">Diagnostic trajectory for comprehensive career readiness.</p>
                </div>
                <div style="background:var(--bg-surface); border:1px solid var(--border-main); padding:8px 16px; border-radius:8px; font-size:11px; font-weight:800; color:var(--text-muted);">LIVE TELEMETRY</div>
              </div>
              
              <div style="height:320px; width:100%; position:relative;">
                <svg width="100%" height="100%" viewBox="0 0 800 320" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="var(--brand-primary)" stop-opacity="0.15"/>
                      <stop offset="100%" stop-color="var(--brand-primary)" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <path d="M0,280 Q150,260 300,180 T600,120 T800,40 L800,320 L0,320 Z" fill="url(#chartGrad)"/>
                  <path d="M0,280 Q150,260 300,180 T600,120 T800,40" fill="none" stroke="var(--brand-primary)" stroke-width="3" stroke-linecap="round"/>
                  <circle cx="300" cy="180" r="5" fill="#fff" stroke="var(--brand-primary)" stroke-width="3"/>
                  <circle cx="800" cy="40" r="5" fill="#fff" stroke="var(--brand-primary)" stroke-width="3"/>
                </svg>
                <div style="position:absolute; bottom:40px; right:40px; background:rgba(0,0,0,0.4); backdrop-filter:blur(10px); border:1px solid var(--brand-primary); padding:16px 24px; border-radius:12px;">
                  <div class="label-ent" style="color:var(--brand-primary); font-size:9px; margin-bottom:4px;">Current Prediction</div>
                  <div style="font-weight:800; color:#fff; font-size:14px;">${technicalSkill >= 80 ? 'Tier 1' : 'Tier 2'} High Probability</div>
                </div>
              </div>
            </div>

            <!-- Action Node -->
            <div class="card-ent" style="padding:40px;">
              <h2 class="h2-ent" style="margin-bottom:32px;">Institutional Action Center</h2>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
                <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:16px; padding:32px; display:flex; flex-direction:column; justify-content:space-between; height:180px;">
                  <div>
                    <div style="font-weight:700; font-size:15px; color:#fff; margin-bottom:8px;">TPO Opportunity Stream</div>
                    <div class="label-ent" style="font-size:9px;">Latest: ${Store.drives[0]?.company || 'Pending...'}</div>
                  </div>
                  <button class="btn-premium" onclick="window.location.hash='new-applications'">Commence Application</button>
                </div>
                <div style="background:var(--bg-surface); border:1px solid var(--border-main); border-radius:16px; padding:32px; display:flex; flex-direction:column; justify-content:space-between; height:180px;">
                  <div>
                    <div style="font-weight:700; font-size:15px; color:#fff; margin-bottom:8px;">Meta University Network</div>
                    <div class="label-ent" style="font-size:9px;">Screening in Progress</div>
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
                <div style="position:relative; padding-left:24px; border-left:1px solid var(--border-subtle);">
                  <div style="position:absolute; left:-4.5px; top:0; width:8px; height:8px; background:var(--brand-primary); border-radius:50%; box-shadow:0 0 10px var(--brand-primary);"></div>
                  <div style="font-weight:700; color:#fff; font-size:13px; margin-bottom:4px;">Node Sync Complete</div>
                  <p style="font-size:12px; color:var(--text-description); line-height:1.6;">Resume parsed for FinTech infrastructure alignment. Match: 88%.</p>
                  <div class="label-ent" style="font-size:9px; margin-top:8px;">2h 14m ago</div>
                </div>
                <div style="position:relative; padding-left:24px; border-left:1px solid var(--border-subtle);">
                  <div style="position:absolute; left:-4.5px; top:0; width:8px; height:8px; background:var(--text-muted); border-radius:50%;"></div>
                  <div style="font-weight:700; color:#fff; font-size:13px; margin-bottom:4px;">Skill Radar Update</div>
                  <p style="font-size:12px; color:var(--text-description); line-height:1.6;">Cloud Architecture certification verified by Dept. Node.</p>
                  <div class="label-ent" style="font-size:9px; margin-top:8px;">Yesterday</div>
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
          background: var(--brand-primary); color: #fff; border: none; padding: 12px 20px; 
          border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: var(--t-fast);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }
        .btn-premium:hover { filter: brightness(1.1); transform: translateY(-1px); }

        .btn-premium-ghost {
          background: rgba(255,255,255,0.02); color: var(--text-description); border: 1px solid var(--border-main); 
          padding: 12px 20px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: var(--t-fast);
        }
        .btn-premium-ghost:hover { background: var(--bg-hover); color: #fff; }

        .gov-link {
          display: block; padding: 16px; background: var(--bg-surface); border: 1px solid var(--border-main);
          border-radius: 12px; color: var(--text-description); font-size: 13px; font-weight: 600; text-decoration: none; transition: var(--t-fast);
        }
        .gov-link:hover { color: #fff; border-color: var(--brand-primary); transform: translateX(4px); background: var(--bg-hover); }

        .clickable-slot-card {
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .clickable-slot-card:hover {
          transform: translateY(-2px);
          border-color: rgba(139, 92, 246, 0.6) !important;
          box-shadow: 0 12px 28px rgba(139, 92, 246, 0.15);
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
