// ============================================================
// PLACENIX — CENTRALIZED INTELLIGENCE STORE (v2.6)
// ============================================================



const Store = {
  // ── Current session ───────────────────────────────────────
  session: {
    role: 'guest',
    user: null
  },

  // ── Core Data Node (Dynamic) ───────────────────────────────
  students: [], // Now empty by default, loaded from Persistence
  drives: [],   // Now empty by default, loaded from Persistence
  alumni: [],   // Now empty by default, loaded from Persistence
  interviews: [], // Now empty by default, loaded from Persistence

  // ── Dynamic Intelligence Engine ───────────────────────────
  get analytics() {
    const s = this.students || [];
    const d = this.drives || [];
    
    // 1. Placement Telemetry
    const placedStudents = s.filter(x => x.placed || x.status === 'Placed');
    const placedCount = placedStudents.length;
    const placementPercent = s.length ? ((placedCount / s.length) * 100).toFixed(1) : '0.0';
    
    // 2. Package Telemetry
    const studentPackages = placedStudents.map(x => parseFloat(x.package) || 0).filter(p => p > 0);
    const drivePackages = d.map(x => parseFloat(x.package) || 0).filter(p => p > 0);
    const allPackages = [...studentPackages, ...drivePackages];
    
    const avgPkgVal = allPackages.length ? (allPackages.reduce((a,b)=>a+b,0)/allPackages.length).toFixed(1) : '0.0';
    const maxPkgVal = allPackages.length ? Math.max(...allPackages).toFixed(1) : '0.0';
    
    // 3. Recruitment Pipeline
    const totalApplicants = d.reduce((s, x) => s + (x.applicants || 0), 0);
    const drivesCompleted = d.filter(x => x.status === 'Closed').length;

    return {
      overall: {
        totalStudents: s.length || 0,
        placed: placedCount,
        placementPercent,
        avgPackage: `${avgPkgVal} LPA`,
        highestPackage: `${maxPkgVal} LPA`,
        activeRecruiters: new Set(d.map(x => x.company)).size,
        drivesCompleted: drivesCompleted,
        offersPending: s.filter(x => x.status === 'Shortlisted').length,
        activeCandidates: totalApplicants
      },
      byDept: Array.from(new Set(s.map(x => x.dept))).map(dept => ({
        dept,
        total: s.filter(x => x.dept === dept).length,
        placed: s.filter(x => x.dept === dept && (x.placed || x.status === 'Placed')).length
      })),
      monthlyPlacements: (() => {
        const counts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Jul, Aug, Sep, Oct, Nov, Dec, Jan, Feb, Mar, Apr, May, Jun
        placedStudents.forEach((st, idx) => {
          let mIdx = (idx * 2 + 3) % 12; // Deterministic fallback spread
          if (st.placedDate) {
            const date = new Date(st.placedDate);
            if (!isNaN(date.getTime())) {
              const month = date.getMonth(); // 0-11
              mIdx = (month - 6 + 12) % 12; // Map Jul (6) to 0, Jan (0) to 6
            }
          }
          counts[mIdx]++;
        });
        return counts;
      })()
    };
  },

  // ── Session Assets ────────────────────────────────────────
  studentProfile: {
    applications: [],
    skills: { technical: 0, communication: 0, problemSolving: 0, domainKnowledge: 0, collaboration: 0 }
  },

  notifications: [],
  sharedResources: [],
  queries: [],
  slotAllocations: [],

  // ── Kanban / Pipeline State ──────────────────────────────
  kanban: {
    applied: [],
    shortlisted: [],
    aptitude: [],
    technical: [],
    hr: [],
    selected: []
  }
};

export function healData() {
  // 1. Dynamically self-heal and de-duplicate student registry
  if (Store.students && Array.isArray(Store.students)) {
    const seenIds = new Set();
    const seenNames = new Set();
    const uniqueStudents = [];
    let studentChanged = false;

    Store.students.forEach(student => {
      if (!student) return;
      
      // Clean and normalize name
      const lowerName = (student.name || '').toLowerCase().trim();
      const mockNames = ['arjun ram', 'neha sharma', 'karthik p', 'priya patel', 'vijay kumar', 'aditya sen', 'meera nair', 'rahul sharma', 'sanjana patel', 'vikram singh'];
      if (mockNames.includes(lowerName) || String(student.id).startsWith('mock_')) {
        studentChanged = true;
        return;
      }



      const idStr = String(student.id || '');
      const normalizedName = (student.name || '').toLowerCase().trim();

      // De-duplicate by both ID and Name to ensure high data integrity
      if (!seenIds.has(idStr) && !seenNames.has(normalizedName)) {
        seenIds.add(idStr);
        seenNames.add(normalizedName);
        if (!student.dept) student.dept = 'CSE';
        if (!student.status) student.status = 'Applied';
        uniqueStudents.push(student);
      } else {
        studentChanged = true;
      }
    });

    if (studentChanged) {
      Store.students = uniqueStudents;
      localStorage.setItem('placenix_students', JSON.stringify(Store.students));
    }
  }

  // 2. Also dynamically self-heal active session details & auto-calculate semester
  if (Store.session && Store.session.user) {
    const u = Store.session.user;
    const sessionName = (u.full_name || u.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (sessionName === 'srithikas' || sessionName === 'srithikans') {
      if (u.full_name !== 'srithikan s') u.full_name = 'srithikan s';
      if (u.name !== 'srithikan s') u.name = 'srithikan s';
    }
    if (!u.current_semester && u.batch_year) {
      const match = String(u.batch_year).match(/\b(20\d{2})\b/);
      if (match) {
        const startY = parseInt(match[1], 10);
        const now = new Date();
        const yDiff = now.getFullYear() - startY;
        let sem = yDiff * 2 + (now.getMonth() >= 6 ? 1 : 0);
        if (sem >= 1 && sem <= 8) {
          u.current_semester = sem;
        }
      }
    }
  }

  // 3. De-duplicate and heal Kanban stages (Ensure at most 1 card per student per drive, keeping only the most advanced stage)
  if (Store.kanban) {
    let kanbanChanged = false;
    const stages = ['selected', 'hr', 'technical', 'aptitude', 'shortlisted', 'applied'];
    const seenKeys = new Set();
    const tempStages = {};

    // Initialize temporary stage arrays
    stages.forEach(stg => {
      tempStages[stg] = [];
    });

    // Traverse from the most advanced stage (selected) to the earliest (applied)
    stages.forEach(stg => {
      if (Array.isArray(Store.kanban[stg])) {
        Store.kanban[stg].forEach(card => {
          if (!card) return;

          // Prune mock candidates
          const lowerName = (card.name || '').toLowerCase().trim();
          const mockNames = ['arjun ram', 'neha sharma', 'karthik p', 'priya patel', 'vijay kumar', 'aditya sen', 'meera nair', 'rahul sharma', 'sanjana patel', 'vikram singh'];
          if (mockNames.includes(lowerName) || String(card.id).startsWith('mock_')) {
            kanbanChanged = true;
            return;
          }



          const studentKey = (card.name || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
          const driveKey = String(card.driveId || card.drive || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
          const key = `${studentKey}_${driveKey}`;

          // Keep candidate card only in the most advanced stage they have reached for this drive
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            tempStages[stg].push(card);
          } else {
            kanbanChanged = true;
          }
        });
      }
    });

    // Write back and save if changed
    if (kanbanChanged) {
      stages.forEach(stg => {
        Store.kanban[stg] = tempStages[stg];
      });
      localStorage.setItem('placenix_kanban', JSON.stringify(Store.kanban));
    }
  }

  // 4. De-duplicate and prune duplicate/orphaned slot allocations in local storage & inner allocations
  if (Store.slotAllocations && Array.isArray(Store.slotAllocations)) {
    const seen = new Set();
    const uniqueAllocations = [];
    let slotsChanged = false;

    const activeDriveIds = Store.drives ? new Set(Store.drives.map(d => String(d.id))) : new Set();
    const activeCompanies = Store.drives ? new Set(Store.drives.map(d => (d.company || '').toLowerCase().trim())) : new Set();

    // Traverse from newest to oldest to keep the most recent configuration
    for (let i = Store.slotAllocations.length - 1; i >= 0; i--) {
      const alloc = Store.slotAllocations[i];
      if (!alloc) continue;

      // Prune slots belonging to deleted/non-existent drives
      if (Store.drives) {
        if (alloc.driveId) {
          if (!activeDriveIds.has(String(alloc.driveId))) {
            slotsChanged = true;
            continue;
          }
        } else {
          const compKey = (alloc.company || '').toLowerCase().trim();
          if (!activeCompanies.has(compKey)) {
            slotsChanged = true;
            continue;
          }
        }
      }
      
      let companyKey = (alloc.company || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
      if (companyKey.startsWith('tcs')) {
        companyKey = 'tcs';
      } else if (companyKey.length > 5) {
        companyKey = companyKey.substring(0, 5);
      }
      
      const key = `${companyKey}_${(alloc.roundName || '').toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);

        // Also de-duplicate the inner allocations list inside this slot allocation
        if (Array.isArray(alloc.allocations)) {
          const seenInnerIds = new Set();
          const uniqueInner = [];
          alloc.allocations.forEach(a => {
            if (!a) return;
            const lowerName = (a.studentName || '').toLowerCase().trim();
            const mockNames = ['arjun ram', 'neha sharma', 'karthik p', 'priya patel', 'vijay kumar', 'aditya sen', 'meera nair', 'rahul sharma', 'sanjana patel', 'vikram singh'];
            if (mockNames.includes(lowerName) || String(a.studentId).startsWith('mock_')) {
              slotsChanged = true;
              return;
            }
            const innerKey = lowerName.replace(/[^a-z0-9]/g, '');
            if (!seenInnerIds.has(innerKey)) {
              seenInnerIds.add(innerKey);
              uniqueInner.push(a);
            } else {
              slotsChanged = true;
            }
          });
          if (alloc.allocations.length !== uniqueInner.length) {
            alloc.allocations = uniqueInner;
            alloc.remainingCount = alloc.totalCandidates - alloc.allocations.length;
            slotsChanged = true;
          }
        }

        uniqueAllocations.unshift(alloc);
      } else {
        slotsChanged = true;
      }
    }

    if (slotsChanged || uniqueAllocations.length !== Store.slotAllocations.length) {
      Store.slotAllocations = uniqueAllocations;
      localStorage.setItem('placenix_slots', JSON.stringify(Store.slotAllocations));
    }
  }

  // 5. Force-heal fallback drives to keep them open for visual default
  if (Store.drives && Array.isArray(Store.drives)) {
    let fallbackChanged = false;

    Store.drives.forEach(d => {
      if (d.id === 'd1' && (d.deadline !== '2028-06-15' || d.status !== 'Open')) {
        d.deadline = '2028-06-15';
        d.status = 'Open';
        fallbackChanged = true;
      }
      if (d.id === 'd2' && (d.deadline !== '2028-06-18' || d.status !== 'Open')) {
        d.deadline = '2028-06-18';
        d.status = 'Open';
        fallbackChanged = true;
      }
    });
    if (fallbackChanged) {
      localStorage.setItem('placenix_drives', JSON.stringify(Store.drives));
    }
  }

  // 6. Clean up active session user's institution
  if (Store.session && Store.session.user) {
    const user = Store.session.user;
    if (user.institution === 'undefined' || user.institution === 'null' || !user.institution) {
      user.institution = user.college || 'Placenix Institutional Node';
    }
  }

  // 7. Cascade deletion: filter out applications for drives that no longer exist
  if (Store.studentProfile && Array.isArray(Store.studentProfile.applications) && Store.drives) {
    const activeDrives = Store.drives;
    const filteredApps = Store.studentProfile.applications.filter(app => 
      activeDrives.some(d => String(d.id) === String(app.driveId) || d.company === app.drive)
    );
    if (filteredApps.length !== Store.studentProfile.applications.length) {
      Store.studentProfile.applications = filteredApps;
      localStorage.setItem('placenix_student_apps', JSON.stringify(Store.studentProfile.applications));
    }
  }
}

// ── Supabase & Persistence Layer ────────────────────────────
export async function syncWithSupabase(supabase) {
  if (!supabase) return;
  
  try {
    const withTimeout = (promise, ms) => Promise.race([
      promise,
      new Promise(resolve => setTimeout(() => resolve({ data: null, error: 'Timeout' }), ms))
    ]);

    // 1. Sync Recruitment Pipeline
    const { data: drives, error: dErr } = await withTimeout(supabase.from('drives').select('*').order('created_at', { ascending: false }), 2000);
    if (!dErr && drives) {
      const mappedDrives = drives
        .filter(rd => {
          if (!rd.company || !rd.role) return false;
          if (rd.is_test === true) return false;
          if ((rd.company || '').toLowerCase().includes('test')) return false;
          return true;
        })
        .map(rd => ({
          id: rd.id,
          company: rd.company,
          role: rd.role,
          package: rd.package_lpa ? rd.package_lpa + ' LPA' : 'N/A',
          deadline: rd.deadline || 'N/A',
          min_cgpa: rd.min_cgpa || 0,
          location: Array.isArray(rd.eligible_depts) ? (rd.eligible_depts[0] || 'General') : (rd.eligible_depts || 'General'),
          eligible_depts: Array.isArray(rd.eligible_depts) ? rd.eligible_depts.slice(1) : [],
          description: rd.description || '',
          rounds: Array.isArray(rd.required_skills) ? rd.required_skills : ['Aptitude', 'Technical', 'HR'],
          status: rd.status || 'Open',
          applicants: rd.applicants || 0,
          logo: rd.company ? rd.company.substring(0, 1).toUpperCase() : '🏢'
        }));
      const deletedDrives = JSON.parse(localStorage.getItem('placenix_deleted_drives') || '[]');
      
      // Preserve local-only drives that haven't been synced to Supabase (their ID starts with 'd')
      const localOnlyDrives = (Store.drives || []).filter(d => typeof d.id === 'string' && d.id.startsWith('d'));
      
      Store.drives = [...localOnlyDrives, ...mappedDrives].filter(d => !deletedDrives.includes(String(d.id)));
      localStorage.setItem('placenix_drives', JSON.stringify(Store.drives));
      console.log('📡 Sync: Recruitment data synchronized.');
    }

    // 2. Sync Student Registry
    const { data: profiles, error: sErr } = await withTimeout(supabase.from('profiles').select('*').eq('role', 'student'), 2000);
    if (!sErr && profiles && profiles.length > 0) {
      Store.students = profiles.map(p => {
        const nameVal = p.full_name || 'Unnamed Student';
        const initials = nameVal.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const existingStudent = Store.students.find(s => String(s.id) === String(p.id)) || {};
        return {
          id: p.id,
          avatar: p.avatar_url || initials || 'ST',
          name: nameVal,
          dept: p.department || 'CSE',
          cgpa: parseFloat(p.cgpa) || 8.0,
          atsScore: p.resume_analysis?.ats_score || 75,
          empScore: p.employability_data?.overall_score || existingStudent.empScore || 70,
          employability_data: p.employability_data || existingStudent.employability_data || null,
          resume_analysis: p.resume_analysis || existingStudent.resume_analysis || null,
          status: existingStudent.status || 'Applied',
          company: existingStudent.company || null,
          placedDate: p.placed_date || p.updated_at || null
        };
      });
      console.log('📡 Sync: Student registry synchronized.');
    }

    // 3. Sync Shared Resources
    const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';
    try {
      const { data: sysProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', SYSTEM_UUID)
        .maybeSingle();

      if (sysProfile) {
        Store.sharedResources = sysProfile.employability_data?.shared_resources || [];
        localStorage.setItem('placenix_shared_resources', JSON.stringify(Store.sharedResources));
        console.log('📡 Sync: Shared resources synchronized.');
      }
    } catch (err) {
      console.warn('⚠️ Sync failure on Shared Resources container:', err.message);
    }

    healData();
    saveStore(); // Persist merged state
  } catch (e) {
    console.warn('⚠️ Sync Error:', e.message);
  }
}

export function saveStore() {
  if (Store.session && Store.session.user) {
    localStorage.setItem('placenix-mock-session', JSON.stringify(Store.session.user));
    localStorage.setItem('placenix_user_session', JSON.stringify(Store.session.user));
  }
  localStorage.setItem('placenix_drives', JSON.stringify(Store.drives));
  localStorage.setItem('placenix_student_apps', JSON.stringify(Store.studentProfile.applications));
  localStorage.setItem('placenix_kanban', JSON.stringify(Store.kanban));
  localStorage.setItem('placenix_students', JSON.stringify(Store.students));
  localStorage.setItem('placenix_alumni', JSON.stringify(Store.alumni));
  localStorage.setItem('placenix_interviews', JSON.stringify(Store.interviews));
  localStorage.setItem('placenix_slots', JSON.stringify(Store.slotAllocations || []));
  localStorage.setItem('placenix_notifications', JSON.stringify(Store.notifications || []));
  localStorage.setItem('placenix_queries', JSON.stringify(Store.queries || []));
  localStorage.setItem('placenix_shared_resources', JSON.stringify(Store.sharedResources || []));
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('store-updated'));
}

// ── Initialize Persistence & Real-time Sync ────────────────
export function loadStoreFromLocalStorage() {
    const sessStr = localStorage.getItem('placenix-mock-session') || localStorage.getItem('placenix_user_session');
    if (sessStr) {
      try {
        const u = JSON.parse(sessStr);
        if (u) {
          Store.session.user = { ...(Store.session.user || {}), ...u };
          if (u.role) Store.session.role = u.role;
        }
      } catch(e){}
    }

    const d = localStorage.getItem('placenix_drives');
    const s = localStorage.getItem('placenix_student_apps');
    const k = localStorage.getItem('placenix_kanban');
    const st = localStorage.getItem('placenix_students');
    const al = localStorage.getItem('placenix_alumni');
    const it = localStorage.getItem('placenix_interviews');
    const sl = localStorage.getItem('placenix_slots');
    const n = localStorage.getItem('placenix_notifications');
    const q = localStorage.getItem('placenix_queries');
    
    const deletedDrives = JSON.parse(localStorage.getItem('placenix_deleted_drives') || '[]');
    if (d) {
      try {
        Store.drives = JSON.parse(d).filter(drive => !deletedDrives.includes(String(drive.id)));
      } catch(e){}
    }
    if (s) {
      try {
        const apps = JSON.parse(s);
        if (Array.isArray(apps)) {
          Store.studentProfile.applications = apps.filter(app => 
            Store.drives.some(dr => String(dr.id) === String(app.driveId) || dr.company === app.drive)
          );
        }
      } catch(e){}
    }
    if (k) try { Store.kanban = JSON.parse(k); } catch(e){}
    if (st) try { Store.students = JSON.parse(st); } catch(e){}
    if (al) try { Store.alumni = JSON.parse(al); } catch(e){}
    if (it) try { Store.interviews = JSON.parse(it); } catch(e){}
    if (sl) try { Store.slotAllocations = JSON.parse(sl); } catch(e){}
    if (n) try { Store.notifications = JSON.parse(n); } catch(e){}
    if (q) try { Store.queries = JSON.parse(q); } catch(e){}
    const sr = localStorage.getItem('placenix_shared_resources');
    if (sr) try { Store.sharedResources = JSON.parse(sr); } catch(e){}
    
    // Fallback to minimal examples if registry is completely empty (First Boot)
    if (!Store.drives || Store.drives.length === 0) {
      Store.drives = [];
    }

    // Auto-close drives past their deadline
    if (Store.drives && Array.isArray(Store.drives)) {
      const todayStr = new Date().toISOString().split('T')[0];
      let drivesChanged = false;
      Store.drives.forEach(drive => {
        if (drive.deadline && drive.deadline < todayStr && drive.status !== 'Closed') {
          drive.status = 'Closed';
          drivesChanged = true;
          console.log(`⏰ Drive Auto-Closed: ${drive.company} — ${drive.role} (Deadline was ${drive.deadline})`);
        }
      });
      if (drivesChanged) {
        setTimeout(() => {
          localStorage.setItem('placenix_drives', JSON.stringify(Store.drives));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('store-updated'));
        }, 0);
      }
    }

    // Auto-generate notifications for upcoming deadlines
    if (Store.drives && Array.isArray(Store.drives) && Store.session?.role === 'student') {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const studentDept = Store.session?.user?.department || Store.session?.user?.dept || 'CSE';
      let notificationsChanged = false;
      if (!Store.notifications) Store.notifications = [];

      Store.drives.forEach(drive => {
        if (drive.status === 'Open' && drive.deadline && drive.deadline !== 'N/A') {
          const hasDeptRestriction = Array.isArray(drive.eligible_depts) && drive.eligible_depts.length > 0;
          const isDeptEligible = !hasDeptRestriction || drive.eligible_depts.includes(studentDept.toUpperCase());
          if (!isDeptEligible) return;

          // Check if already applied
          const applied = Store.studentProfile?.applications?.some(a => String(a.driveId) === String(drive.id));
          if (applied) return;

          const deadlineDate = new Date(drive.deadline);
          deadlineDate.setHours(0,0,0,0);
          const timeDiff = deadlineDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

          if (daysRemaining >= 0 && daysRemaining <= 3) {
            const notifId = `deadline_${drive.id}_${daysRemaining}`;
            // Check if already created
            const exists = Store.notifications.some(notif => notif.id === notifId);
            if (!exists) {
              let text = '';
              let urgency = 'warning';
              if (daysRemaining === 0) {
                text = `⏰ LAST CHANCE: Application window for ${drive.company} (${drive.role}) closes TODAY!`;
                urgency = 'error';
              } else if (daysRemaining === 1) {
                text = `⚠️ URGENT: Application window for ${drive.company} (${drive.role}) closes tomorrow.`;
              } else {
                text = `📅 ATTENTION: Application window for ${drive.company} (${drive.role}) closes in ${daysRemaining} days.`;
              }
              
              Store.notifications.unshift({
                id: notifId,
                title: 'Upcoming Deadline Alert',
                message: text,
                timestamp: new Date().toISOString(),
                type: urgency,
                read: false
              });
              notificationsChanged = true;
            }
          }
        }
      });

      if (notificationsChanged) {
        setTimeout(() => {
          localStorage.setItem('placenix_notifications', JSON.stringify(Store.notifications));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('store-updated'));
        }, 0);
      }
    }

    // Auto-generate notifications for newly shared prep materials
    if (Store.sharedResources && Array.isArray(Store.sharedResources) && Store.session?.role === 'student') {
      const studentDept = (Store.session?.user?.department || Store.session?.user?.dept || 'CSE').toUpperCase();
      const studentSection = (Store.session?.user?.section_name || 'A').toUpperCase();
      
      const empData = Store.session.user.employability_data || {};
      const softSkills = empData.communication || 80;
      const coding = empData.coding || empData.technical || 80;
      const readiness = empData.overall_score || 80;
      
      let notificationsChanged = false;
      if (!Store.notifications) Store.notifications = [];

      Store.sharedResources.forEach(res => {
        // 1. Dept filter
        const matchDept = res.target_dept === 'All' || res.target_dept.toUpperCase() === studentDept;
        if (!matchDept) return;

        // 2. Section filter
        const matchSection = res.target_section === 'All' || res.target_section.toUpperCase() === studentSection;
        if (!matchSection) return;

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

        if (matchCohort) {
          const notifId = `shared_res_${res.id}`;
          const exists = Store.notifications.some(notif => notif.id === notifId);
          if (!exists) {
            Store.notifications.unshift({
              id: notifId,
              title: `📚 Prep Material Shared: ${res.title}`,
              desc: `Your Faculty Advisor (${res.shared_by}) shared a resource: "${res.notes || 'Practice recommended problems.'}" ${res.link ? `Link: ${res.link}` : ''}`,
              time: 'Just now',
              type: 'ai',
              read: false
            });
            notificationsChanged = true;
          }
        }
      });

      if (notificationsChanged) {
        setTimeout(() => {
          localStorage.setItem('placenix_notifications', JSON.stringify(Store.notifications));
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new CustomEvent('store-updated'));
        }, 0);
      }
    }

    // Revert students to only the 2 default institutional records and clear all previously seeded 'std_' mock records
    if (!Store.students || Store.students.length === 0) {
      Store.students = [
        { 
          id: '58ad3eee-0f28-4b73-bc81-2b234df9aeab', 
          avatar: 'SR', 
          name: 'srithikan s', 
          dept: 'CSE', 
          cgpa: 7.0, 
          atsScore: 84, 
          empScore: 42, 
          status: 'Shortlisted', 
          company: 'TCS',
          employability_data: {
            overall_score: 42,
            score_breakdown: {
              technical: 55,
              collaboration: 30,
              communication: 45,
              problemSolving: 40,
              domainKnowledge: 50
            }
          },
          resume_analysis: {
            ats_score: 84,
            suggestions: [
              { icon: "📊", title: "Quantifiable Impact", description: "Increase 'System Efficiency' metrics by adding numerical node data." },
              { icon: "🏗️", title: "Architecture Depth", description: "Expand on 'Microservices' infrastructure to align with Tier 1 nodes." }
            ],
            found_keywords: ["React.js", "Node.js", "TypeScript", "System Architecture", "Cloud Infrastructure", "REST APIs", "web development", "problem-solving", "analytical skills"],
            missing_keywords: ["GraphQL", "Docker Orchestration", "CI/CD Pipeline", "Algorithms", "Unit Testing"],
            industry_match: { "FinTech": 60, "E-commerce": 50, "Enterprise SaaS": 85 }
          }
        },
        { 
          id: '2a0afaaf-1bac-42f8-82f1-da60ad34771a', 
          avatar: 'SR', 
          name: 'Sai R', 
          dept: 'CSE', 
          cgpa: 8.0, 
          atsScore: 80, 
          empScore: 75, 
          status: 'Applied', 
          company: 'TCS',
          employability_data: {
            overall_score: 75,
            score_breakdown: {
              technical: 80,
              collaboration: 75,
              communication: 72,
              problemSolving: 78,
              domainKnowledge: 70
            }
          },
          resume_analysis: {
            ats_score: 80,
            suggestions: [
              { icon: "📄", title: "Professional Layout", description: "Optimize margins and font hierarchy for modern parsing rules." }
            ],
            found_keywords: ["Python", "Java", "SQL", "Algorithms", "Data Structures"],
            missing_keywords: ["AWS", "Docker", "System Design"],
            industry_match: { "FinTech": 75, "E-commerce": 70, "Enterprise SaaS": 80 }
          }
        }
      ];
      localStorage.setItem('placenix_students', JSON.stringify(Store.students));
    } else {
      // Clean up any previously seeded mock students starting with 'std_' from both registry and kanban
      const filtered = Store.students.filter(s => s && !String(s.id).startsWith('std_'));
      if (filtered.length !== Store.students.length) {
        Store.students = filtered;
        localStorage.setItem('placenix_students', JSON.stringify(Store.students));
      }
    }
    
    if (Store.kanban) {
      let kanbanChanged = false;
      const stages = ['applied', 'shortlisted', 'aptitude', 'technical', 'hr', 'selected'];
      stages.forEach(stg => {
        if (Array.isArray(Store.kanban[stg])) {
          const filtered = Store.kanban[stg].filter(c => c && !String(c.id).startsWith('std_'));
          if (filtered.length !== Store.kanban[stg].length) {
            Store.kanban[stg] = filtered;
            kanbanChanged = true;
          }
        }
      });
      if (kanbanChanged) {
        localStorage.setItem('placenix_kanban', JSON.stringify(Store.kanban));
      }
    }

    if (!Store.alumni || Store.alumni.length === 0) {
      Store.alumni = [
        { avatar: 'AR', mentoring: true, batch: 2021, name: 'Arjun Roy', role: 'Staff SDE', company: 'Google', location: 'Bangalore, India', expertise: ['System Design', 'Scalability', 'Go'], sessions: 48, rating: 4.9 },
        { avatar: 'SM', mentoring: true, batch: 2022, name: 'Sneha Mishra', role: 'Product Manager', company: 'Microsoft', location: 'Hyderabad, India', expertise: ['Product Strategy', 'UI/UX', 'Agile'], sessions: 32, rating: 4.8 },
        { avatar: 'KD', mentoring: false, batch: 2020, name: 'Kunal Deshmukh', role: 'Lead Data Scientist', company: 'NVIDIA', location: 'Pune, India', expertise: ['Machine Learning', 'CUDA', 'Python'], sessions: 15, rating: 4.7 },
        { avatar: 'PP', mentoring: true, batch: 2023, name: 'Priya Patel', role: 'Frontend Architect', company: 'Zoho', location: 'Chennai, India', expertise: ['React', 'Web Performance', 'CSS'], sessions: 54, rating: 4.9 },
        { avatar: 'VS', mentoring: true, batch: 2021, name: 'Vikram Singh', role: 'Security Analyst', company: 'Goldman Sachs', location: 'Mumbai, India', expertise: ['Cybersecurity', 'FinTech', 'Cryptography'], sessions: 27, rating: 4.8 }
      ];
    }

    if (!Store.interviews || Store.interviews.length === 0) {
      Store.interviews = [
        { company: 'Google', difficulty: 'Hard', role: 'Software Engineer', year: '2023', author: 'Rahul Sharma (CSE)', rounds: ['Online Assessment', 'Technical Coding I', 'System Design Architect'], helpful: 24 },
        { company: 'Amazon', difficulty: 'Medium', role: 'SDE-1', year: '2023', author: 'Aditya Sen (IT)', rounds: ['DSA & Algorithms', 'System Performance', 'Bar Raiser (Leadership)'], helpful: 18 },
        { company: 'Zoho', difficulty: 'Easy', role: 'Product Developer', year: '2022', author: 'Meera Nair (ECE)', rounds: ['Aptitude & Logical', 'Basic Coding', 'Technical Interview'], helpful: 14 }
      ];
    }

    if (!localStorage.getItem('placenix_notifications_cleared_v2')) {
      localStorage.removeItem('placenix_notifications');
      Store.notifications = [];
      localStorage.setItem('placenix_notifications_cleared_v2', 'true');
    }

    if (!Store.notifications) {
      Store.notifications = [];
    }

    if (!Store.queries || Store.queries.length === 0) {
      Store.queries = [
        { id: 'q1', studentName: 'srithikan s', rollNo: '1111111', title: 'Request for Resume Review Assistance', body: 'I have uploaded my primary resume. Could you please review if the keyword alignment is ATS-ready?', date: '2026-05-28', status: 'Pending', response: '' },
        { id: 'q2', studentName: 'Sai R', rollNo: '3652148', title: 'Infosys Operational Drive Query', body: 'The Infosys drive details mention a minimum CGPA of 7.0, but the portal does not let me register. Please verify.', date: '2026-05-27', status: 'Pending', response: '' }
      ];
    }

    // Auto-seed Kanban board from student registry if empty or under-populated
    if (Store.kanban) {
      let kanbanChanged = false;
      const stages = ['applied', 'shortlisted', 'aptitude', 'technical', 'hr', 'selected'];
      stages.forEach(stg => {
        if (!Array.isArray(Store.kanban[stg])) {
          Store.kanban[stg] = [];
          kanbanChanged = true;
        }
      });

      const existingCardIds = new Set();
      stages.forEach(stg => {
        Store.kanban[stg].forEach(c => existingCardIds.add(String(c.id)));
      });

      // 1. Seed default students from registry
      if (Store.students && Array.isArray(Store.students)) {
        Store.students.forEach(student => {
          if (student.company && !existingCardIds.has(String(student.id))) {
            const drive = Store.drives.find(d => 
              d.company.toLowerCase().includes(student.company.toLowerCase()) ||
              student.company.toLowerCase().includes(d.company.toLowerCase())
            );
            
            if (drive) {
              let stage = 'applied';
              if (student.status === 'Shortlisted') stage = 'shortlisted';
              else if (student.status === 'Placed') stage = 'selected';
              else if (student.status === 'Applied') stage = 'applied';

              Store.kanban[stage].push({
                id: student.id,
                name: student.name,
                dept: student.dept,
                driveId: drive.id,
                drive: drive.company,
                avatar: student.avatar || student.name.substring(0, 2).toUpperCase(),
                attendance: 'pending'
              });
              existingCardIds.add(String(student.id));
              kanbanChanged = true;
            }
          }
        });
      }

      // 2. Mock seeding disabled to prioritize only real institutional candidate records.
      // (The placement officer can still allocate seats sequentially for real applicants).

      if (kanbanChanged) {
        localStorage.setItem('placenix_kanban', JSON.stringify(Store.kanban));
      }

      healData();
    }
  }

// IIFE to run initial load and listen for storage changes
(function init() {
  loadStoreFromLocalStorage();
  window.addEventListener('storage', (e) => {
    if (e.key === 'placenix_drives' || e.key === 'placenix_student_apps' || e.key === 'placenix_students' || e.key === 'placenix_alumni' || e.key === 'placenix_interviews' || e.key === 'placenix_slots' || e.key === 'placenix_notifications' || e.key === 'placenix_queries') {
      console.log('🔄 Store: Cross-tab data sync detected.');
      loadStoreFromLocalStorage();
      // Notify active pages to re-render
      window.dispatchEvent(new CustomEvent('store-updated'));
    }
  });
})();


// ── Validation Helpers ──────────────────────────────────────────
export function getValidationStatus(studentId, dbComments) {
  // 1. Check local storage overrides first
  const localStatuses = JSON.parse(localStorage.getItem('placenix_validation_statuses') || '{}');
  if (localStatuses[studentId]) {
    return localStatuses[studentId];
  }

  // 2. Parse from database rejection_comments
  if (dbComments) {
    if (dbComments.startsWith('STATUS:')) {
      const parts = dbComments.split('|');
      const status = parts[0].replace('STATUS:', '').trim();
      let comments = '';
      if (parts[1]) {
        comments = parts[1].replace('COMMENTS:', '').replace('Comments:', '').trim();
      }
      return { status, comments };
    } else {
      return { status: 'Rejected', comments: dbComments };
    }
  }

  // 3. Default
  return { status: 'Approved', comments: '' };
}

export function saveValidationStatus(studentId, status, comments = '') {
  const localStatuses = JSON.parse(localStorage.getItem('placenix_validation_statuses') || '{}');
  localStatuses[studentId] = { status, comments };
  localStorage.setItem('placenix_validation_statuses', JSON.stringify(localStatuses));
  
  if (Store && Store.students) {
    const idx = Store.students.findIndex(s => s.id === studentId);
    if (idx !== -1) {
      Store.students[idx].status = status;
    }
  }
}

export default Store;

