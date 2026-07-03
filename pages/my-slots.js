// ============================================================
// PLACENIX — MY INTERVIEW SLOTS COMPONENT (v1.0)
// ============================================================

export async function loadMySlotsPage(root, Store, supabase) {
  let user = Store.session?.user;
  if (!user) {
    root.innerHTML = `<div style="padding:100px; text-align:center; color:var(--text-description);">Institutional session expired. Please re-authenticate.</div>`;
    return;
  }

  // Safeguard: Sync latest student profile from Supabase db in background
  if (supabase && user.id) {
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(({ data: dbUser }) => {
        if (dbUser) {
          Store.session.user = { ...Store.session.user, ...dbUser };
          render();
        }
      })
      .catch(err => {
        console.error('Safeguard profile sync failed on My Slots page:', err);
      });
  }

  function render() {
    const studentName = Store.session.user.full_name || Store.session.user.name || '';
    const myAllocations = [];
    const seenAllocations = new Set();
    
    if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
      Store.slotAllocations.forEach(alloc => {
        if (alloc.allocations && Array.isArray(alloc.allocations)) {
          alloc.allocations.forEach(a => {
            const cleanA = (a.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            const cleanS = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
            let isNameMatch = cleanS && cleanA && (cleanA.includes(cleanS) || cleanS.includes(cleanA));
            
            // Fuzzy prefix matching
            if (!isNameMatch && cleanA && cleanS) {
              const minLen = Math.min(cleanA.length, cleanS.length);
              if (minLen >= 6 && cleanA.substring(0, 6) === cleanS.substring(0, 6)) {
                isNameMatch = true;
              }
            }
            
            if (String(a.studentId) === String(Store.session.user.id) || isNameMatch) {
              let companyKey = (alloc.company || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
              if (companyKey.startsWith('tcs')) {
                companyKey = 'tcs';
              } else if (companyKey.length > 5) {
                companyKey = companyKey.substring(0, 5);
              }
              const roundKey = `${companyKey}_${(alloc.roundName || '').toLowerCase().trim()}`;
              
              if (!seenAllocations.has(roundKey)) {
                seenAllocations.add(roundKey);
                
                // Format the Slot ID into Slot 1, Slot 2, etc.
                let slotLabel = 'N/A';
                if (a.slotId) {
                  const parts = a.slotId.split('_');
                  if (parts.length > 1) {
                    slotLabel = `Slot ${parts[1]}`;
                  } else {
                    slotLabel = a.slotId;
                  }
                }
                
                myAllocations.push({
                  company: alloc.company,
                  role: alloc.role,
                  roundName: alloc.roundName,
                  date: alloc.date,
                  venue: a.venue,
                  slotTime: a.slotTime,
                  slotNo: slotLabel,
                  attendance: a.attendance || 'pending'
                });
              }
            }
          });
        }
      });
    }

    root.innerHTML = `
      <div style="padding: 40px; max-width: 1200px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
        
        <!-- Page Title & Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid var(--border-subtle); padding-bottom:24px;">
          <div>
            <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Personal Scheduling Node</div>
            <h1 class="h1-ent" style="font-size:32px; color:#fff;">My Interview Slots</h1>
            <p style="color:var(--text-description); font-size:14px; margin-top:6px; line-height:1.5;">
              View and track your scheduled recruitment slots, venue details, and process dates released by training and placement officers.
            </p>
          </div>
          
          <div style="background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.15); padding:10px 18px; border-radius:12px; display:flex; align-items:center; gap:10px;">
            <svg width="16" height="16" fill="var(--brand-primary)" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            <span style="font-size:12.5px; font-weight:700; color:#fff;">Strict Data Isolation Active</span>
          </div>
        </div>

        <!-- Dynamic Slot Grid -->
        ${myAllocations.length === 0 ? `
          <div class="card-ent animate-fade-in-up" style="background: linear-gradient(135deg, rgba(255,255,255,0.01), rgba(255,255,255,0.02)); border: 1px dashed var(--border-main); padding: 80px 40px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; text-align:center; min-height:400px; border-radius:16px;">
            <div style="width:72px; height:72px; border-radius:50%; background:rgba(139,92,246,0.06); border:1px solid rgba(139,92,246,0.15); display:flex; align-items:center; justify-content:center; font-size:32px;">📅</div>
            <div>
              <h3 style="font-size:18px; font-weight:800; color:#fff; margin:0 0 10px 0;">No Active Schedules Found</h3>
              <p style="color:var(--text-description); font-size:14px; max-width:480px; margin:0; line-height:1.6;">
                You are not currently scheduled for any active interview rounds. Upcoming recruitment slots and venue assignments will appear here once published by the placement office.
              </p>
            </div>
          </div>
        ` : `
          <div style="display:grid; grid-template-columns: 1fr; gap: 24px;">
            ${myAllocations.map(alloc => `
              <div class="card-ent slot-item-card animate-fade-in-up" style="
                background: linear-gradient(135deg, rgba(139,92,246,0.08), rgba(34,211,238,0.04)); 
                border: 1.5px solid rgba(139,92,246,0.2); 
                padding: 32px; 
                display: flex; 
                flex-direction: column; 
                gap: 24px; 
                position: relative; 
                overflow: hidden;
                border-radius: 16px;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
              ">
                <!-- Large Decorative SVG Clock Background -->
                <div style="position: absolute; right: -30px; top: -30px; opacity: 0.03; width: 200px; height: 200px; color: #fff; pointer-events: none;">
                  <svg fill="currentColor" viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>

                <!-- Top Row: Round Info & Date -->
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:20px;">
                  <div>
                    ${alloc.attendance === 'completed' ? `
                      <span class="badge badge-success badge-dot" style="margin-bottom:8px; font-size:9.5px; background:rgba(59,130,246,0.12); border-color:rgba(59,130,246,0.25); color:#3b82f6; font-weight:800; padding:4px 10px; border-radius:6px; letter-spacing:0.05em;">
                        ✓ INTERVIEW COMPLETED
                      </span>
                    ` : alloc.attendance === 'present' ? `
                      <span class="badge badge-success badge-dot" style="margin-bottom:8px; font-size:9.5px; background:rgba(16,185,129,0.12); border-color:rgba(16,185,129,0.25); color:#10b981; font-weight:800; padding:4px 10px; border-radius:6px; letter-spacing:0.05em;">
                        🟢 PRESENT
                      </span>
                    ` : alloc.attendance === 'absent' ? `
                      <span class="badge badge-danger badge-dot" style="margin-bottom:8px; font-size:9.5px; background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.25); color:#ef4444; font-weight:800; padding:4px 10px; border-radius:6px; letter-spacing:0.05em;">
                        ❌ ABSENT
                      </span>
                    ` : `
                      <span class="badge badge-success badge-dot" style="margin-bottom:8px; font-size:9.5px; background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.25); color:#f59e0b; font-weight:800; padding:4px 10px; border-radius:6px; letter-spacing:0.05em;">
                        ⏳ ALLOCATED SLOT
                      </span>
                    `}
                    <h2 class="h2-ent" style="font-size:24px; color:#fff; margin:4px 0 0 0; font-weight:800;">${alloc.company}</h2>
                    <div style="color:var(--text-description); font-size:14px; margin-top:6px; font-weight:600;">Role: <span style="color:#fff;">${alloc.role}</span></div>
                  </div>
                  <div style="text-align:right;">
                    <div class="label-ent" style="color:var(--brand-primary); font-size:10px; margin-bottom:4px; font-weight:800; letter-spacing:0.05em;">DATE OF PROCESS</div>
                    <div style="font-weight:900; color:#fff; font-size:16px; background:var(--bg-elevated); border:1px solid var(--border-main); padding:6px 14px; border-radius:10px;">${alloc.date}</div>
                  </div>
                </div>

                <!-- Bottom Row: 4 Metric Blocks -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; align-items: center;">
                  
                  <!-- Slot Detail Item -->
                  <div style="display:flex; align-items:center; gap:14px; background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.03); padding:16px 20px; border-radius:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.2); display:flex; align-items:center; justify-content:center; font-size:18px;">🎯</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:4px; font-weight:800;">TARGET ROUND</div>
                      <div style="font-weight:800; color:#fff; font-size:14.5px;">${alloc.roundName}</div>
                    </div>
                  </div>

                  <!-- Venue Room Block -->
                  <div style="display:flex; align-items:center; gap:14px; background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.03); padding:16px 20px; border-radius:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(34,211,238,0.1); border:1px solid rgba(34,211,238,0.2); display:flex; align-items:center; justify-content:center; font-size:18px;">🏢</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:4px; font-weight:800;">VENUE ROOM</div>
                      <div style="font-weight:800; color:#fff; font-size:14.5px;">${alloc.venue}</div>
                    </div>
                  </div>

                  <!-- Slot Interval Block -->
                  <div style="display:flex; align-items:center; gap:14px; background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.03); padding:16px 20px; border-radius:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(139,92,246,0.1); border:1px solid rgba(139,92,246,0.2); display:flex; align-items:center; justify-content:center; font-size:18px;">🕒</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:4px; font-weight:800;">SLOT INTERVAL</div>
                      <div style="font-weight:800; color:#fff; font-size:14.5px;">${alloc.slotTime}</div>
                    </div>
                  </div>

                  <!-- Slot Number Block -->
                  <div style="display:flex; align-items:center; gap:14px; background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.03); padding:16px 20px; border-radius:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); display:flex; align-items:center; justify-content:center; font-size:18px;">⚡</div>
                    <div>
                      <div class="label-ent" style="font-size:9px; margin-bottom:4px; font-weight:800;">SLOT NUMBER</div>
                      <div style="font-weight:800; color:#fff; font-size:14.5px;">${alloc.slotNo}</div>
                    </div>
                  </div>

                </div>

              </div>
            `).join('')}
          </div>
        `}

      </div>

      <style>
        .slot-item-card:hover {
          transform: translateY(-2px);
          border-color: rgba(139,92,246,0.45) !important;
          box-shadow: 0 12px 28px rgba(139,92,246,0.12);
        }
      </style>
    `;
  }

  const onStoreUpdate = () => render();
  window.addEventListener('store-updated', onStoreUpdate);

  render();

  // Cleanup Event Listeners on unmount
  const observer = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      window.removeEventListener('store-updated', onStoreUpdate);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
