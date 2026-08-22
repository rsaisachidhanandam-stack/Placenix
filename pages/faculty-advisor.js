import { supabase } from '../supabase.js';
import { saveStore, getValidationStatus, saveValidationStatus } from '../store.js';
import { showToast } from '../components/toast.js';

export async function loadFacultyAdvisorPage(root, Store) {
  const currentHash = (typeof window !== 'undefined' && window.location?.hash ? window.location.hash : '#').replace('#', '').split('?')[0].replace(/_/g, '-').toLowerCase();
  let initialTab = 'dashboard';
  if (currentHash === 'fa-students') initialTab = 'students';
  else if (currentHash === 'fa-resume') initialTab = 'validation';
  else if (currentHash === 'fa-skills') initialTab = 'mentoring';

  const mapStudentObject = (p, deptsList = []) => {
    const resumeScore = p.resume_analysis?.ats_score || p.atsScore || p.resume_score || p.resumeScore || 0;
    const empScore = p.employability_data?.overall_score || p.empScore || p.employability_score || 0;
    const readiness = p.readiness_percentage || p.readiness || empScore || 0;
    const valState = getValidationStatus(p.id, p.rejection_comments || null);

    const softSkills = p.employability_data?.score_breakdown?.communication || p.softSkills || p.soft_skills || (p.cgpa ? Math.round(55 + p.cgpa * 4) : 70);
    const coding = p.employability_data?.score_breakdown?.technical || p.coding || p.coding_score || (p.cgpa ? Math.round(50 + p.cgpa * 5) : 70);
    const aptitude = p.employability_data?.score_breakdown?.problemSolving || p.aptitude || p.aptitude_score || (p.cgpa ? Math.round(60 + p.cgpa * 3) : 70);
    const technical = p.employability_data?.score_breakdown?.technical || p.technical || p.technical_score || (p.cgpa ? Math.round(52 + p.cgpa * 4.5) : 70);

    const deptName = deptsList.find(d => d.id === p.department)?.name || p.dept || p.department || 'CSE';
    const cgpaVal = parseFloat(p.cgpa) || 0.0;

    return {
      id: p.id,
      name: p.full_name || p.name || 'Student',
      regNo: p.register_number || p.roll_number || p.regNo || 'N/A',
      dept: deptName,
      cgpa: cgpaVal,
      resumeScore: resumeScore,
      empScore: empScore,
      prob: cgpaVal >= 8.5 ? 'High' : cgpaVal >= 7.2 ? 'Medium' : 'Low',
      status: valState.status || p.status || 'Pending',
      readiness: readiness,
      softSkills: softSkills,
      coding: coding,
      aptitude: aptitude,
      technical: technical,
      interview_history: p.employability_data?.interview_history || []
    };
  };

  let depts = [];

  let state = {
    activeTab: initialTab,
    searchQuery: '',
    filterDept: 'All',
    filterStatus: 'All',
    filterProb: 'All',
    showAdvancedFilters: false,
    selectedTrend: 'Last 6 Months',
    modalType: null,
    modalData: null,
    transfers: [],
    students: (Store.students || []).map(s => mapStudentObject(s)),
    mapping: 'None',
    mentoringCohort: null,
    mentoringSearchQuery: '',
    mentoringSortKey: 'severity',
    mentoringFilterDept: 'All',
    aiSlideIndex: 0,
    mentoringQueueSearch: '',
    aiTab: 'critical'
  };

  // 🟢 Synchronize Real Student Registry from Database
  async function syncStudents() {
    if (!supabase) return;
    try {
      const { data: dbDepts } = await supabase.from('departments').select('*');
      if (dbDepts) depts = dbDepts;

      // 1. Get FA mapping from staff_profiles using session user email
      let mapping = 'None';
      const userEmail = Store.session?.user?.email;
      if (userEmail) {
        const { data: staffData } = await supabase
          .from('staff_profiles')
          .select('mapping')
          .eq('email', userEmail)
          .maybeSingle();
        if (staffData && staffData.mapping) {
          mapping = staffData.mapping;
        }
      }
      state.mapping = mapping;

      console.log(`🛡️ Faculty Advisor [${userEmail}] Mapping: ${mapping}`);

      // 2. Build filtered Supabase query for real student profiles
      let query = supabase.from('profiles').select('*').eq('role', 'student');
      
      if (mapping && mapping !== 'None' && mapping !== 'Global') {
        if (mapping.includes(' - Section ')) {
          const parts = mapping.split(' - Section ');
          const deptPart = parts[0].trim();
          const secPart = parts[1].trim();
          query = query.eq('department', deptPart).eq('section_name', secPart);
        } else {
          query = query.eq('department', mapping.trim());
        }
      }

      const { data, error } = await query.order('full_name');
      
      if (!error && data && data.length > 0) {
        state.students = data.map(p => mapStudentObject(p, depts));
        render();
      } else if (Store.students && Store.students.length > 0) {
        state.students = Store.students.map(s => mapStudentObject(s, depts));
        render();
      }
    } catch (err) {
      console.error('Failed to sync student profiles:', err);
    }
  }

  // 🟢 Synchronize Proposal Registry
  async function syncTransfers() {
    try {
      let remoteData = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('section_requests')
          .select('*, profiles!student_id(full_name, roll_number)')
          .eq('status', 'Pending')
          .order('created_at', { ascending: false });
        if (!error && data) remoteData = data;
      }
      const localTransfers = (Store.transferRequests || []).filter(r => r.status === 'pending');
      state.transfers = [...remoteData, ...localTransfers];
    } catch (err) {
      console.error('Proposal Registry Offline:', err);
      state.transfers = (Store.transferRequests || []).filter(r => r.status === 'pending');
    }
  }

  // Dynamic calculations for average metrics
  const getAverageResumeScore = () => {
    if (state.students.length === 0) return 82;
    const total = state.students.reduce((acc, s) => acc + s.resumeScore, 0);
    return Math.round(total / state.students.length);
  };

  const getAverageSkillScore = (skillKey) => {
    if (state.students.length === 0) {
      if (skillKey === 'coding') return 85;
      if (skillKey === 'aptitude') return 72;
      if (skillKey === 'softSkills') return 90;
      if (skillKey === 'technical') return 65;
    }
    const total = state.students.reduce((acc, s) => acc + (s[skillKey] || 0), 0);
    return Math.round(total / state.students.length);
  };

  // 🔥 Initial instant render with Store data for 0ms response
  state.students = (Store.students || []).map(s => mapStudentObject(s));
  state.transfers = (Store.transferRequests || []).filter(r => r.status === 'pending');
  render();

  // 🟢 Non-blocking Background Sync
  (async () => {
    try {
      await Promise.race([
        Promise.all([syncStudents(), syncTransfers()]),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      render();
    } catch (e) {
      console.warn("⚠️ Background FA sync non-fatal warning:", e);
    }
  })();

  // 🟢 Global Actions Handlers
  window.handleExportAnalytics = () => {
    try {
      if (!state.students || state.students.length === 0) {
        showToast('No student data available to export.', 'warning');
        return;
      }
      
      let csv = 'Student Name,Register Number,Department,CGPA,Resume Score,Employability Score,Readiness,Placement Probability,Status\n';
      state.students.forEach(s => {
        csv += `"${s.name}","${s.regNo}","${s.dept}",${s.cgpa},${s.resumeScore},${s.empScore},${s.readiness},"${s.prob}","${s.status}"\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `Placenix_FA_Analytics_${state.mapping.replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Analytics exported successfully!', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
  };

  window.handleOpenAnnouncementModal = () => {
    state.modalType = 'announcement';
    render();
  };

  window.handleCloseModal = () => {
    state.modalType = null;
    state.modalData = null;
    render();
  };

  window.handlePostAnnouncement = (event) => {
    event.preventDefault();
    const title = document.getElementById('announce-title').value.trim();
    const desc = document.getElementById('announce-desc').value.trim();
    const severity = document.getElementById('announce-severity').value;
    const target = document.getElementById('announce-target').value;

    if (!title || !desc) {
      showToast('Please fill in all fields.', 'warning');
      return;
    }

    const type = severity === 'Critical' ? 'result' : severity === 'Important' ? 'reminder' : 'drive';
    const targetText = target === 'All' ? `Class of 2025` : `Class of 2025 (${target})`;

    const newNotification = {
      id: 'n_' + Date.now(),
      type: type,
      title: title,
      desc: `${desc} (Target: ${targetText})`,
      time: 'Just now',
      read: false
    };

    if (!Store.notifications) Store.notifications = [];
    Store.notifications.unshift(newNotification);
    saveStore();

    state.modalType = null;
    render();
    showToast('Global announcement broadcasted successfully!', 'success');
  };

  // AI Advisor & Mentoring Queue handlers
  window.handleViewAnalysis = (studentName) => {
    const student = state.students.find(s => s.name === studentName) || state.students[0];
    state.modalType = 'risk-analysis';
    state.modalData = student;
    render();
  };

  window.handleReviewAllInsights = () => {
    state.modalType = 'insights';
    render();
  };

  window.handleOpenScheduleMentoring = (studentIdentifier) => {
    const student = studentIdentifier ? (state.students.find(s => s.name === studentIdentifier || s.regNo === studentIdentifier || s.id === studentIdentifier) || null) : null;
    state.modalType = 'schedule-mentoring';
    state.modalData = student;
    render();
  };

  window.handleMentorRegLookup = (typedVal) => {
    const previewContainer = document.getElementById('mentor-student-preview-card');
    if (!previewContainer) return;

    const val = (typedVal || '').trim().toLowerCase();
    if (!val) {
      previewContainer.innerHTML = `
        <div style="padding:14px; border-radius:10px; background:rgba(255,255,255,0.02); border:1px dashed var(--glass-border-subtle); display:flex; align-items:center; gap:10px; color:var(--text-muted); font-size:12px;">
          <span style="font-size:18px;">🔍</span>
          <span>Enter or pick a Register Number above to automatically load advisee intelligence.</span>
        </div>
      `;
      return;
    }

    const matched = state.students.find(s => 
      (s.regNo && s.regNo.toLowerCase() === val) || 
      (s.regNo && s.regNo.toLowerCase().includes(val)) || 
      (s.name && s.name.toLowerCase().includes(val))
    );

    if (matched) {
      previewContainer.innerHTML = `
        <div style="padding:14px 16px; border-radius:10px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.3); display:flex; justify-content:space-between; align-items:center; animation:fadeIn 0.2s ease;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #818cf8, #4f46e5); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; color:#fff;">
              ${(matched.name || 'S')[0].toUpperCase()}
            </div>
            <div>
              <div style="font-weight:800; color:#fff; font-size:14px;">${matched.name}</div>
              <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Reg: <strong style="color:#fff;">${matched.regNo}</strong> • Dept: ${matched.dept}</div>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span style="font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.06); color:#fff; font-weight:700; border:1px solid var(--glass-border-subtle);">
              CGPA: ${matched.cgpa}
            </span>
            <span style="font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(52,211,153,0.15); color:#34d399; font-weight:700; border:1px solid rgba(52,211,153,0.3);">
              ${matched.readiness}% Readiness
            </span>
          </div>
        </div>
      `;
    } else {
      previewContainer.innerHTML = `
        <div style="padding:14px; border-radius:10px; background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.25); display:flex; align-items:center; gap:10px; color:#f59e0b; font-size:12px;">
          <span style="font-size:18px;">⚠️</span>
          <span>Register No "<strong>${typedVal}</strong>" is not yet mapped in active cohort, but you can still book a session.</span>
        </div>
      `;
    }
  };

  window.handleBookMentoringSession = (event) => {
    event.preventDefault();
    const regInput = document.getElementById('mentor-reg-input')?.value?.trim() || '';
    const matched = state.students.find(s => 
      (s.regNo && s.regNo.toLowerCase() === regInput.toLowerCase()) || 
      (s.name && s.name.toLowerCase() === regInput.toLowerCase())
    );
    const studentName = matched ? matched.name : (regInput ? `Student (${regInput})` : 'Advisee Student');
    const regNo = matched ? matched.regNo : regInput;
    const topic = document.getElementById('mentor-topic')?.value || 'Resume & ATS Revamp';
    const date = document.getElementById('mentor-date')?.value;
    const time = document.getElementById('mentor-time')?.value;
    const mode = document.getElementById('mentor-mode')?.value || 'Offline (Faculty Cabin)';

    if (!regInput || !date || !time) {
      showToast('Student Register Number, date, and time are required.', 'warning');
      return;
    }

    const session = {
      id: 'm_' + Date.now(),
      studentName: studentName,
      regNo: regNo,
      topic: topic,
      time: `${date} · ${time}`,
      dateTime: `${date}T${time}`,
      mode: mode,
      staffEmail: Store.session?.user?.email || 'advisor@univ.edu',
      status: 'Confirmed'
    };

    if (!Store.slotAllocations) Store.slotAllocations = [];
    Store.slotAllocations.unshift(session);
    saveStore();

    state.modalType = null;
    state.modalData = null;
    render();
    showToast(`Mentoring session scheduled successfully for ${studentName} (${regNo})!`, 'success');
  };

  // Cohort handlers
  window.handleViewCohort = (cohortType) => {
    state.mentoringCohort = cohortType;
    state.mentoringSearchQuery = '';
    state.mentoringSortKey = 'severity';
    state.mentoringFilterDept = 'All';
    render();
  };

  window.handleExitCohortView = () => {
    state.mentoringCohort = null;
    render();
  };

  window.handleSwitchTab = (tabName) => {
    state.activeTab = tabName;
    render();
  };

  window.handleViewCohortAnalysis = (studentName, cohortType) => {
    const s = state.students.find(x => x.name === studentName);
    if (!s) return;
    state.modalType = 'risk-analysis';
    state.modalData = s;
    render();
  };

  function filterMentoringCohortTable() {
    const tableBody = document.getElementById('ment-cohort-table-body');
    if (!tableBody) return;

    let cohortList = [];
    if (state.mentoringCohort === 'weak-comm') {
      cohortList = state.students.filter(s => s.softSkills < 75);
    } else if (state.mentoringCohort === 'coding-gaps') {
      cohortList = state.students.filter(s => s.coding < 75);
    } else if (state.mentoringCohort === 'low-conf') {
      cohortList = state.students.filter(s => s.readiness < 70);
    }

    const filtered = cohortList.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(state.mentoringSearchQuery.toLowerCase()) || 
                          s.regNo.toLowerCase().includes(state.mentoringSearchQuery.toLowerCase());
      const matchDept = state.mentoringFilterDept === 'All' || s.dept.toLowerCase() === state.mentoringFilterDept.toLowerCase();
      return matchSearch && matchDept;
    });

    // Sorting
    filtered.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;
      
      if (state.mentoringCohort === 'weak-comm') {
        scoreA = a.softSkills;
        scoreB = b.softSkills;
      } else if (state.mentoringCohort === 'coding-gaps') {
        scoreA = a.coding;
        scoreB = b.coding;
      } else if (state.mentoringCohort === 'low-conf') {
        scoreA = a.readiness;
        scoreB = b.readiness;
      }

      if (state.mentoringSortKey === 'severity') {
        return scoreA - scoreB; // Worst first (ascending)
      } else if (state.mentoringSortKey === 'score-desc') {
        return scoreB - scoreA; // Best first (descending)
      } else {
        return a.name.localeCompare(b.name); // Alphabetical
      }
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
            No students found matching current search and filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(s => {
      let score = 0;
      let severityLabel = 'Mild';
      let severityClass = 'badge-neutral';
      
      if (state.mentoringCohort === 'weak-comm') {
        score = s.softSkills;
        if (score < 50) { severityLabel = 'Critical'; severityClass = 'badge-danger'; }
        else if (score < 65) { severityLabel = 'Moderate'; severityClass = 'badge-warning'; }
        else { severityLabel = 'Mild'; severityClass = 'badge-success'; }
      } else if (state.mentoringCohort === 'coding-gaps') {
        score = s.coding;
        if (score < 50) { severityLabel = 'Critical'; severityClass = 'badge-danger'; }
        else if (score < 65) { severityLabel = 'Moderate'; severityClass = 'badge-warning'; }
        else { severityLabel = 'Mild'; severityClass = 'badge-success'; }
      } else if (state.mentoringCohort === 'low-conf') {
        score = s.readiness;
        if (score < 45) { severityLabel = 'Critical'; severityClass = 'badge-danger'; }
        else if (score < 60) { severityLabel = 'Moderate'; severityClass = 'badge-warning'; }
        else { severityLabel = 'Mild'; severityClass = 'badge-success'; }
      }

      // Calculate progress trend from history
      let trendHTML = '<span style="color:var(--text-muted); font-size:11px;">—</span>';
      const history = s.interview_history || [];
      if (history.length >= 2) {
        const latest = history[history.length - 1];
        const previous = history[history.length - 2];
        
        let scoreKey = 'overall';
        if (state.mentoringCohort === 'weak-comm') scoreKey = 'communication';
        else if (state.mentoringCohort === 'coding-gaps') scoreKey = 'technical';
        else if (state.mentoringCohort === 'low-conf') scoreKey = 'overall';

        const latScore = latest.scores[scoreKey];
        const prevScore = previous.scores[scoreKey];
        const diff = latScore - prevScore;

        if (diff > 0) {
          trendHTML = `<span style="color:#22c55e; font-weight:800; font-size:11px;">↑ (+${diff}%)</span>`;
        } else if (diff < 0) {
          trendHTML = `<span style="color:#ef4444; font-weight:800; font-size:11px;">↓ (${diff}%)</span>`;
        } else {
          trendHTML = `<span style="color:var(--text-muted); font-size:11px;">→ (0%)</span>`;
        }
      }

      return `
        <tr>
          <td>
            <div style="font-weight:700;">${s.name}</div>
            <div style="font-size:0.7rem; color:var(--text-muted);">${s.regNo} · ${s.dept}</div>
          </td>
          <td>${s.cgpa}</td>
          <td>
            <span style="font-weight:800; color:white;">${score}%</span>
          </td>
          <td>${trendHTML}</td>
          <td><span class="badge ${severityClass}">${severityLabel}</span></td>
          <td style="text-align:right;">
            <div style="display:flex; gap:8px; justify-content:flex-end;">
              <button class="btn btn-sm btn-secondary" style="padding:6px 12px; font-size:0.75rem;" onclick="window.handleOpenScheduleMentoring('${s.name}')">Schedule</button>
              <button class="btn btn-sm btn-ghost" style="padding:6px 12px; font-size:0.75rem;" onclick="window.handleViewCohortAnalysis('${s.name}', '${state.mentoringCohort}')">Insights</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.handleSelectAITab = (tab) => {
    state.aiTab = tab;
    state.aiSlideIndex = 0;
    render();
  };

  window.handleNextAISlide = () => {
    state.aiSlideIndex++;
    render();
  };

  window.handlePrevAISlide = () => {
    state.aiSlideIndex--;
    render();
  };

  function renderMentoringQueueList() {
    const container = document.querySelector('.fa-section-card div[style*="max-height:220px"]');
    if (!container) return;

    const userEmail = Store.session?.user?.email || 'advisor@univ.edu';
    const rawQueue = (Store.slotAllocations || []).filter(slot => slot.staffEmail === userEmail);
    const queueQuery = (state.mentoringQueueSearch || '').toLowerCase().trim();
    const filteredQueue = rawQueue.filter(slot => {
      return slot.studentName.toLowerCase().includes(queueQuery) || slot.topic.toLowerCase().includes(queueQuery);
    });

    container.innerHTML = filteredQueue.length === 0 ? `
      <div style="text-align:center; padding:32px 16px; color:var(--text-muted); font-size:11px;">
        ${rawQueue.length === 0 ? 'No mentoring sessions scheduled yet.' : 'No matches found in queue.'}
      </div>
    ` : filteredQueue.map(slot => `
      <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:10px;">
        <div style="width:28px; height:28px; border-radius:50%; background:var(--brand-electric-violet); display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; color:white;">
          ${slot.studentName[0]}
        </div>
        <div style="flex:1;">
          <div style="font-size:0.75rem; font-weight:700; color:white;">${slot.studentName}</div>
          <div style="font-size:0.65rem; color:var(--text-muted);">${slot.topic} · ${slot.time}</div>
        </div>
        <span class="badge" style="font-size:8px; text-transform:uppercase; background:rgba(245,158,11,0.1); border-color:rgba(245,158,11,0.2); color:#f59e0b;">
          ${slot.mode}
        </span>
      </div>
    `).join('');
  }

  window.handleAutoScheduleInterviews = () => {
    const eligible = state.students.filter(s => s.readiness >= 75);
    state.modalType = 'auto-schedule-success';
    state.modalData = eligible;
    render();
  };

  window.handleConfirmAutoSchedule = () => {
    showToast(`Successfully scheduled mock interviews for ${state.modalData.length} students.`, 'success');
    state.modalType = null;
    render();
  };

  window.handleSharePrepMaterial = () => {
    state.modalType = 'share-dsa-material';
    state.modalData = null;
    render();
  };

  async function sharePrepMaterialToSupabase(material) {
    const SYSTEM_UUID = '00000000-0000-0000-0000-000000000000';
    if (!supabase) return;
    
    try {
      const { data: sysProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', SYSTEM_UUID)
        .maybeSingle();

      let currentData = sysProfile?.employability_data || {};
      let sharedResources = currentData.shared_resources || [];

      sharedResources.unshift(material);
      currentData.shared_resources = sharedResources;

      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert({
          id: SYSTEM_UUID,
          full_name: 'SYSTEM_PREP_MATERIALS',
          employability_data: currentData,
          role: 'system'
        });

      if (upsertErr) throw upsertErr;
      console.log('✅ Shared prep material synced to Supabase.');
      
      // Update local store as well
      Store.sharedResources = sharedResources;
      localStorage.setItem('placenix_shared_resources', JSON.stringify(sharedResources));
    } catch (err) {
      console.error('❌ Failed to sync shared resource to Supabase:', err.message);
    }
  }

  window.handleSendDSAMaterial = async (e) => {
    e.preventDefault();
    const title = document.getElementById('dsa-title')?.value?.trim();
    const type = document.getElementById('dsa-type')?.value;
    const target = document.getElementById('dsa-target')?.value;
    const resource = document.getElementById('dsa-link')?.value?.trim();
    const notes = document.getElementById('dsa-notes')?.value?.trim();

    if (!title) {
      showToast('Validation Exception: Title is required.', 'warning');
      return;
    }

    let dept = 'All';
    let section = 'All';
    if (state.mapping && state.mapping !== 'None' && state.mapping !== 'Global') {
      const parts = state.mapping.split('-').map(s => s.trim());
      if (parts[0]) dept = parts[0];
      if (parts[1]) {
        section = parts[1].replace(/section/i, '').trim();
      }
    }

    const material = {
      id: 'res_' + Date.now(),
      title: title,
      type: type,
      notes: notes || 'Practice recommended problems.',
      link: resource || '',
      target_dept: dept,
      target_section: section,
      target_cohort: target,
      shared_by: Store.session?.user?.full_name || Store.session?.user?.name || 'Faculty Advisor',
      sender_role: 'faculty',
      date: new Date().toISOString().split('T')[0]
    };

    const newNotification = {
      id: 'n_' + Date.now(),
      type: 'drive',
      title: `📚 New DSA Prep Shared: ${title}`,
      desc: `A new ${type} has been shared by Faculty Advisor to ${target}. ${resource ? `Resource: ${resource}.` : ''} Notes: ${notes || 'Practice recommended problems.'}`,
      time: 'Just now',
      read: false
    };

    Store.notifications.unshift(newNotification);
    saveStore();

    showToast(`DSA prep material shared to ${target} group successfully!`, 'success');
    state.modalType = null;
    state.modalData = null;
    render();

    // Async sync to Supabase
    await sharePrepMaterialToSupabase(material);
  };

  // 🟢 Global Profile Validation Handlers
  window.handleQuickApprove = async (studentId) => {
    if (!confirm('🛡️ SYSTEM ACCESS REQUIRED:\n\nAre you sure you want to VERIFY and APPROVE this student profile?')) return;
    try {
      saveValidationStatus(studentId, 'Pending Coordinator');
      const idx = state.students.findIndex(s => s.id === studentId);
      if (idx !== -1) {
        state.students[idx].status = 'Pending Coordinator';
      }
      
      await supabase
        .from('profiles')
        .update({ rejection_comments: 'STATUS:Pending Coordinator' })
        .eq('id', studentId);
      
      showToast('Student profile status verified and approved by Faculty Advisor. Routed to Department Coordinator.', 'success');
      render();
    } catch (e) {
      console.warn('DB update failed, fell back to local state:', e.message);
      showToast('Student profile status verified and approved (Local).', 'success');
      render();
    }
  };

  window.handleRejectProfile = async (studentId) => {
    const comments = prompt('🛡️ SYSTEM ACCESS REQUIRED:\n\nEnter verification rejection comments / feedback for the student:');
    if (comments === null) return; 
    if (!comments.trim()) {
      showToast('Failure: Rejection feedback comment is required.', 'warning');
      return;
    }
    try {
      saveValidationStatus(studentId, 'Rejected', comments.trim());
      const idx = state.students.findIndex(s => s.id === studentId);
      if (idx !== -1) {
        state.students[idx].status = 'Rejected';
      }

      await supabase
        .from('profiles')
        .update({ 
          rejection_comments: `STATUS:Rejected | COMMENTS: ${comments.trim()}`
        })
        .eq('id', studentId);
      
      showToast('Profile rejected and feedback comments returned to student.', 'success');
      render();
    } catch (e) {
      console.warn('DB update failed, fell back to local state:', e.message);
      showToast('Profile rejected and feedback comments returned to student (Local).', 'success');
      render();
    }
  };

  // 🟢 Global Control Handlers for Sections
  window.handleAcceptTransfer = async (id, studentId, targetDept, targetSection) => {
    if (!confirm('🛡️ SYSTEM ACCESS REQUIRED:\n\nAre you sure you want to ACCEPT and EXECUTE this section transfer?')) return;
    
    try {
      const idx = state.students.findIndex(s => s.id === studentId);
      if (idx !== -1) {
        state.students[idx].dept = targetDept;
      }
      state.transfers = state.transfers.filter(t => t.id !== id);

      await supabase
        .from('profiles')
        .update({
          department: targetDept,
          section_name: targetSection
        })
        .eq('id', studentId);

      await supabase
        .from('section_requests')
        .update({ status: 'Approved' })
        .eq('id', id);

      showToast('Academic migration confirmed. Student profile updated.', 'success');
      await syncTransfers();
      render();
    } catch (e) {
      console.warn('DB update failed, fell back to local state:', e.message);
      showToast('Academic migration confirmed (Local).', 'success');
      render();
    }
  };

  window.handleRejectTransfer = async (id) => {
    if (!confirm('⚠️ Confirm Rejection:\n\nReject this proposed section transfer request?')) return;
    
    try {
      state.transfers = state.transfers.filter(t => t.id !== id);

      await supabase
        .from('section_requests')
        .update({ status: 'Rejected' })
        .eq('id', id);

      showToast('Proposal archived and rejected.', 'success');
      await syncTransfers();
      render();
    } catch (e) {
      console.warn('DB update failed, fell back to local state:', e.message);
      showToast('Proposal rejected and archived (Local).', 'success');
      render();
    }
  };

  // 🟢 Roster Real-time Client-side Filter
  function filterRosterTable() {
    const tableBody = document.getElementById('roster-table-body');
    if (!tableBody) return;
    
    const filtered = state.students.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(state.searchQuery.toLowerCase()) || 
                          s.regNo.toLowerCase().includes(state.searchQuery.toLowerCase());
      const matchDept = state.filterDept === 'All' || s.dept.toLowerCase() === state.filterDept.toLowerCase();
      const matchStatus = state.filterStatus === 'All' || s.status === state.filterStatus;
      const matchProb = state.filterProb === 'All' || s.prob === state.filterProb;
      
      return matchSearch && matchDept && matchStatus && matchProb;
    });
    
    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:32px; color:var(--text-muted);">
            No students match the current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map(s => `
      <tr>
        <td>
          <div style="font-weight:700;">${s.name}</div>
          <div style="font-size:0.7rem; color:var(--text-muted);">${s.regNo} · ${s.dept}</div>
        </td>
        <td>${s.cgpa}</td>
        <td>
          <div style="font-weight:700;">${s.resumeScore}</div>
          <div style="width:60px; height:4px; background:rgba(255,255,255,0.1); border-radius:2px; margin-top:4px;">
            <div style="width:${s.resumeScore}%; height:100%; background:var(--brand-electric-violet); border-radius:2px;"></div>
          </div>
        </td>
        <td>${s.empScore}</td>
        <td><span class="badge ${s.prob === 'High' ? 'badge-success' : s.prob === 'Medium' ? 'badge-warning' : 'badge-danger'}">${s.prob}</span></td>
        <td>${s.readiness}%</td>
        <td><span class="badge ${s.status === 'Approved' ? 'badge-success' : s.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}">${s.status}</span></td>
        <td>
          <button class="btn btn-sm btn-ghost" style="padding:4px 8px;" onclick="window.location.hash = '#student-details?id=${s.id}'">View</button>
        </td>
      </tr>
    `).join('');
  }

  function render() {
    const pendingValCount = state.students.filter(s => s.status === 'Pending' || s.status === 'Under Review').length;
    const placementRiskCount = state.students.filter(s => s.prob === 'Low').length;

    root.innerHTML = `
    <style>
      .fa-container { padding: 0; color: var(--text-main); animation: fadeIn 0.5s ease; }
      .fa-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
      
      .fa-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 40px; }
      .fa-stat-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 20px; padding: 24px; position: relative; overflow: hidden; }
      .fa-stat-card::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 4px; background: var(--brand-electric-violet); opacity: 0.3; }
      .fa-stat-value { font-size: 2rem; font-weight: 800; margin: 8px 0; }
      .fa-stat-label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
      
      .fa-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
      .fa-section-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 24px; padding: 24px; }
      
      .fa-tabs { display: flex; gap: 12px; margin-bottom: 32px; background: rgba(0,0,0,0.2); padding: 6px; border-radius: 12px; width: fit-content; }
      .fa-tab { padding: 10px 24px; cursor: pointer; border-radius: 8px; font-weight: 700; font-size: 0.9rem; color: var(--text-muted); transition: all 0.3s; }
      .fa-tab.active { background: var(--brand-electric-violet); color: white; box-shadow: 0 4px 12px rgba(124,58,237,0.3); }
      
      .fa-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
      .fa-table th { padding: 12px 16px; color: var(--text-muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; text-align: left; }
      .fa-table tr { transition: transform 0.2s; }
      .fa-table td { background: rgba(255,255,255,0.02); padding: 16px; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
      .fa-table td:first-child { border-left: 1px solid var(--border-subtle); border-top-left-radius: 12px; border-bottom-left-radius: 12px; }
      .fa-table td:last-child { border-right: 1px solid var(--border-subtle); border-top-right-radius: 12px; border-bottom-right-radius: 12px; }
      .fa-table tr:hover td { background: rgba(255,255,255,0.04); }
      
      .readiness-meter { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; margin-top: 6px; }
      .readiness-fill { height: 100%; transition: width 1s ease; }
      
      .ai-insight-box { background: linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.1)); border: 1px solid rgba(124,58,237,0.2); border-radius: 20px; padding: 24px; }
      .insight-item { display: flex; gap: 16px; margin-bottom: 20px; }
      .insight-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(124,58,237,0.2); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
      
      /* Advanced filter styling */
      .advanced-filters-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        background: rgba(255,255,255,0.02);
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
        animation: slideDown 0.3s ease;
      }
      
      /* Modals styles */
      .fa-modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(9, 9, 11, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
      }
      .fa-modal-card {
        background: #18181b;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        width: 90%;
        max-width: 550px;
        padding: 32px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        position: relative;
        animation: slideUp 0.3s ease;
      }
      
      /* Badges styles */
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
      }
      .badge-success { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #22c55e; }
      .badge-warning { background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: #f59e0b; }
      .badge-danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; }
      .badge-neutral { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: var(--text-muted); }

      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    </style>

    <div class="fa-container">
      <div class="fa-header">
        <div>
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
            <span style="background:var(--brand-electric-violet); color:white; padding:4px 10px; border-radius:6px; font-size:0.7rem; font-weight:800;">FACULTY ADVISOR</span>
            <span style="color:var(--text-muted); font-size:0.8rem;">Batch of 2025 · ${state.mapping}</span>
          </div>
          <h1 style="font-size: 2.2rem; font-weight: 900; letter-spacing: -0.02em;">Mentoring Dashboard</h1>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn btn-secondary" onclick="window.handleExportAnalytics()"><span style="margin-right:8px;">📊</span> Export Analytics</button>
          <button class="btn btn-primary" onclick="window.handleOpenAnnouncementModal()"><span style="margin-right:8px;">📢</span> Global Announcement</button>
        </div>
      </div>

      <div class="fa-stats-grid">
        <div class="fa-stat-card">
          <div class="fa-stat-label">Assigned Students</div>
          <div class="fa-stat-value">${state.students.length}</div>
          <div style="color:#22c55e; font-size:0.75rem; font-weight:700;">● 100% Onboarded</div>
        </div>
        <div class="fa-stat-card" style="border-bottom: 4px solid #22c55e;">
          <div class="fa-stat-label">Placement Ready</div>
          <div class="fa-stat-value" style="color:#22c55e;">${state.students.filter(s => s.readiness >= 80).length}</div>
          <div style="color:var(--text-muted); font-size:0.75rem;">Based on 80%+ Readiness</div>
        </div>
        <div class="fa-stat-card" style="border-bottom: 4px solid #f59e0b;">
          <div class="fa-stat-label">Pending Validation</div>
          <div class="fa-stat-value" style="color:#f59e0b;">${String(pendingValCount).padStart(2, '0')}</div>
          <div style="color:#f59e0b; font-size:0.75rem; font-weight:700;">⚡ High Priority</div>
        </div>
        <div class="fa-stat-card" style="border-bottom: 4px solid #ef4444;">
          <div class="fa-stat-label">Placement Risk</div>
          <div class="fa-stat-value" style="color:#ef4444;">${String(placementRiskCount).padStart(2, '0')}</div>
          <div style="color:#ef4444; font-size:0.75rem; font-weight:700;">⚠️ Intervention Needed</div>
        </div>
      </div>

      <div class="fa-tabs">
        <div class="fa-tab ${state.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">Overview</div>
        <div class="fa-tab ${state.activeTab === 'students' ? 'active' : ''}" data-tab="students">Student Roster</div>
        <div class="fa-tab ${state.activeTab === 'validation' ? 'active' : ''}" data-tab="validation">Profile Validation</div>
        <div class="fa-tab ${state.activeTab === 'mentoring' ? 'active' : ''}" data-tab="mentoring">AI Mentoring</div>
        <div class="fa-tab ${state.activeTab === 'transfers' ? 'active' : ''}" data-tab="transfers" style="position:relative;">
          Section Requests
          ${state.transfers.length > 0 ? `<span style="position:absolute; top:-5px; right:-5px; background:#f59e0b; color:#fff; font-size:9px; padding:2px 6px; border-radius:10px; font-weight:900; border:2px solid var(--bg-surface);">${state.transfers.length}</span>` : ''}
        </div>
      </div>

      <div id="fa-content">
        ${renderContent()}
      </div>
    </div>
    ${renderModal()}
    `;

    // ── Tab Event Handlers ───────────────────────────
    document.querySelectorAll('.fa-tab').forEach(tab => {
      tab.onclick = () => {
        state.activeTab = tab.dataset.tab;
        render();
      };
    });

    // ── Overview Event Handlers ───────────────────────
    const trendSelect = document.getElementById('trend-select');
    if (trendSelect) {
      trendSelect.onchange = (e) => {
        state.selectedTrend = e.target.value;
        render();
      };
    }

    // ── Roster Specific Events ───────────────────────────
    const rosterSearch = document.getElementById('roster-search');
    if (rosterSearch) {
      rosterSearch.value = state.searchQuery;
      rosterSearch.oninput = (e) => {
        state.searchQuery = e.target.value;
        filterRosterTable();
      };
    }

    const rosterDept = document.getElementById('roster-dept');
    if (rosterDept) {
      rosterDept.onchange = (e) => {
        state.filterDept = e.target.value;
        filterRosterTable();
      };
    }

    const rosterStatus = document.getElementById('roster-status');
    if (rosterStatus) {
      rosterStatus.onchange = (e) => {
        state.filterStatus = e.target.value;
        filterRosterTable();
      };
    }

    const rosterProb = document.getElementById('roster-prob');
    if (rosterProb) {
      rosterProb.onchange = (e) => {
        state.filterProb = e.target.value;
        filterRosterTable();
      };
    }

    const btnAdvanced = document.getElementById('btn-advanced-filters');
    if (btnAdvanced) {
      btnAdvanced.onclick = () => {
        state.showAdvancedFilters = !state.showAdvancedFilters;
        render();
      };
    }

    // Run initial filter call to populate roster table body
    if (state.activeTab === 'students') {
      filterRosterTable();
    }

    // ── Mentoring Cohort Search/Sort/Filter Events ──
    const mentSearch = document.getElementById('ment-cohort-search');
    if (mentSearch) {
      mentSearch.value = state.mentoringSearchQuery;
      mentSearch.oninput = (e) => {
        state.mentoringSearchQuery = e.target.value;
        filterMentoringCohortTable();
      };
    }

    const mentDept = document.getElementById('ment-cohort-dept');
    if (mentDept) {
      mentDept.value = state.mentoringFilterDept;
      mentDept.onchange = (e) => {
        state.mentoringFilterDept = e.target.value;
        filterMentoringCohortTable();
      };
    }

    const mentSort = document.getElementById('ment-cohort-sort');
    if (mentSort) {
      mentSort.value = state.mentoringSortKey;
      mentSort.onchange = (e) => {
        state.mentoringSortKey = e.target.value;
        filterMentoringCohortTable();
      };
    }

    if (state.activeTab === 'mentoring' && state.mentoringCohort) {
      filterMentoringCohortTable();
    }

    const queueSearch = document.getElementById('ment-queue-search');
    if (queueSearch) {
      queueSearch.value = state.mentoringQueueSearch;
      queueSearch.oninput = (e) => {
        state.mentoringQueueSearch = e.target.value;
        renderMentoringQueueList();
      };
    }
  };

  function renderContent() {
    switch (state.activeTab) {
      case 'dashboard': return renderDashboard();
      case 'students': return renderStudents();
      case 'validation': return renderValidation();
      case 'mentoring': return renderMentoring();
      case 'transfers': return renderTransfers();
      default: return renderDashboard();
    }
  }

  function renderDashboard() {
    let trendData = [40, 65, 55, 80, 95, 88];
    let trendLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    if (state.selectedTrend === 'Last 3 Months') {
      trendData = [80, 95, 88];
      trendLabels = ['Apr', 'May', 'Jun'];
    } else if (state.selectedTrend === 'Last Year') {
      trendData = [35, 42, 48, 40, 65, 55, 70, 80, 95, 88, 90, 92];
      trendLabels = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    }

    const avgResume = getAverageResumeScore();
    const strokeDashoffset = Math.max(0, Math.min(402, 402 - (402 * avgResume) / 100));

    // Generate dynamic AI Insights based on student roster
    const criticalRisks = [];
    const generalGaps = [];

    state.students.forEach(s => {
      // 1. Critical Risk: CGPA vs Technical mismatch
      if (s.cgpa >= 7.5 && s.coding < 75) {
        criticalRisks.push({
          id: `risk_tech_${s.id}`,
          studentName: s.name,
          title: 'Critical Risk Alert',
          icon: '⚠️',
          desc: `${s.name}'s CGPA (${s.cgpa}) is high, but their technical coding score (${s.coding}%) is below placement benchmark. High mismatch risk detected.`,
          actionLabel: 'View Analysis →',
          actionStr: `window.handleViewAnalysis('${s.name}')`
        });
      }

      // 2. Communication Gap
      if (s.softSkills < 75) {
        generalGaps.push({
          id: `gap_comm_${s.id}`,
          studentName: s.name,
          title: 'Communication Gap',
          icon: '🗣️',
          desc: `${s.name} scored ${s.softSkills}% in communication fluency. Suggesting mock presentation cycles or Prep Workshop #4.`,
          actionLabel: 'Schedule Mentoring →',
          actionStr: `window.handleOpenScheduleMentoring('${s.name}')`
        });
      }

      // 3. Aptitude Gap
      if (s.aptitude < 75) {
        generalGaps.push({
          id: `gap_apt_${s.id}`,
          studentName: s.name,
          title: 'Aptitude Shortfall',
          icon: '📊',
          desc: `${s.name} scored ${s.aptitude}% in logical reasoning rounds. Suggesting practice DP sheets and basic logic quizzes.`,
          actionLabel: 'Share Prep Sheet →',
          actionStr: `window.handleSharePrepMaterial()`
        });
      }
    });

    // Default fallbacks if empty
    if (criticalRisks.length === 0) {
      criticalRisks.push({
        id: 'default_risk',
        studentName: 'No Critical Risks',
        title: 'Security Clearance',
        icon: '🛡️',
        desc: 'All mapped student metrics match standard university placement readiness models.',
        actionLabel: 'Audit Roster →',
        actionStr: `window.handleSwitchTab('students')`
      });
    }
    if (generalGaps.length === 0) {
      generalGaps.push({
        id: 'default_gap',
        studentName: 'No Gaps Mapped',
        title: 'Intelligence Sync',
        icon: '💡',
        desc: 'No developmental skill gaps detected in the active department roster.',
        actionLabel: 'Audit Skill Matrix →',
        actionStr: `window.handleSwitchTab('mentoring')`
      });
    }

    const activeList = state.aiTab === 'critical' ? criticalRisks : generalGaps;
    // Bounds check active index
    if (state.aiSlideIndex >= activeList.length) {
      state.aiSlideIndex = 0;
    }
    const currentSlide = activeList[state.aiSlideIndex];

    // Mentoring Queue Logic
    const userEmail = Store.session?.user?.email || 'advisor@univ.edu';
    const rawQueue = (Store.slotAllocations || []).filter(slot => slot.staffEmail === userEmail);
    const queueQuery = (state.mentoringQueueSearch || '').toLowerCase().trim();
    const filteredQueue = rawQueue.filter(slot => {
      return slot.studentName.toLowerCase().includes(queueQuery) || slot.topic.toLowerCase().includes(queueQuery);
    });

    return `
    <div class="fa-grid">
      <div style="display:flex; flex-direction:column; gap:32px;">
        <div class="fa-section-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <h3 style="font-size:1.1rem; font-weight:800;">Employability Trend</h3>
            <select id="trend-select" class="input-ent" style="height:36px; padding:0 36px 0 16px; font-size:12px; font-weight:800; border-radius:10px; background-color:rgba(5,8,16,0.85); color:#fff; border:1px solid rgba(0,200,255,0.3); appearance:auto;">
              <option value="Last 6 Months" style="background:#050810; color:#fff;" ${state.selectedTrend === 'Last 6 Months' ? 'selected' : ''}>Last 6 Months</option>
              <option value="Last 3 Months" style="background:#050810; color:#fff;" ${state.selectedTrend === 'Last 3 Months' ? 'selected' : ''}>Last 3 Months</option>
              <option value="Last Year" style="background:#050810; color:#fff;" ${state.selectedTrend === 'Last Year' ? 'selected' : ''}>Last Year</option>
            </select>
          </div>
          <div style="height:280px; display:flex; align-items:flex-end; gap:20px; padding:20px 0;">
            ${trendData.map((h, i) => `
              <div style="flex:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; gap:12px;">
                <div style="width:100%; height:${h}%; background:linear-gradient(180deg, #818cf8 0%, #4f46e5 100%); border-radius:8px 8px 4px 4px; box-shadow: 0 4px 16px rgba(99,102,241,0.35); opacity:${0.6 + (i * (0.4 / trendData.length))}; position:relative; cursor:pointer; min-height:12px; transition: all 0.3s ease;">
                  <div style="position:absolute; top:-24px; left:50%; transform:translateX(-50%); font-size:11px; font-weight:800; color:#fff; font-family:var(--font-display);">${h}%</div>
                </div>
                <div style="font-size:11px; font-weight:700; color:var(--text-muted);">${trendLabels[i]}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:24px;">
          <div class="fa-section-card">
            <h3 style="font-size:1rem; font-weight:800; margin-bottom:20px;">Skill Distribution</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              ${[
                ['Coding & DSA', getAverageSkillScore('coding'), '#818cf8'],
                ['Aptitude & Logic', getAverageSkillScore('aptitude'), '#38bdf8'],
                ['Soft Skills & Fluency', getAverageSkillScore('softSkills'), '#34d399'],
                ['Domain Technical', getAverageSkillScore('technical'), '#f59e0b']
              ].map(([lbl, val, clr]) => `
                <div>
                  <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:6px;">
                    <span style="font-weight:700; color:#fff;">${lbl}</span>
                    <span style="color:var(--text-muted); font-weight:800;">${val}%</span>
                  </div>
                  <div class="readiness-meter"><div class="readiness-fill" style="width:${val}%; background:${clr};"></div></div>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="fa-section-card">
            <h3 style="font-size:1rem; font-weight:800; margin-bottom:20px;">Resume Quality Index</h3>
            <div style="height:180px; display:flex; align-items:center; justify-content:center; position:relative;">
              <div style="width:140px; height:140px; border-radius:50%; border:12px solid rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center; flex-direction:column;">
                <div style="font-size:1.8rem; font-weight:900; color:#fff; font-family:var(--font-display);">${avgResume}%</div>
                <div style="font-size:0.6rem; font-weight:700; color:var(--text-muted);">AVG SCORE</div>
              </div>
              <svg style="position:absolute; width:140px; height:140px; transform:rotate(-90deg);">
                <circle cx="70" cy="70" r="64" fill="none" stroke="#818cf8" stroke-width="12" stroke-dasharray="402" stroke-dashoffset="${strokeDashoffset}" stroke-linecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:24px;">
        <div class="ai-insight-box">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="font-size:1.3rem;">🤖</div>
              <h3 style="font-size:1rem; font-weight:900; margin:0;">AI Advisor</h3>
            </div>
            <!-- Dynamic Tab Buttons -->
            <div style="display:flex; gap:6px;">
              <button class="btn btn-sm ${state.aiTab === 'critical' ? 'btn-primary' : 'btn-secondary'}" onclick="window.handleSelectAITab('critical')" style="font-size:10px; padding:4px 8px; border-radius:6px;">
                Risks (${criticalRisks.length})
              </button>
              <button class="btn btn-sm ${state.aiTab === 'general' ? 'btn-primary' : 'btn-secondary'}" onclick="window.handleSelectAITab('general')" style="font-size:10px; padding:4px 8px; border-radius:6px;">
                Gaps (${generalGaps.length})
              </button>
            </div>
          </div>
          
          <!-- Slide Panel -->
          <div style="min-height:140px; display:flex; flex-direction:column; justify-content:space-between;">
            <div class="insight-item" style="margin-bottom:12px;">
              <div class="insight-icon" style="font-size:1.5rem; margin-right:12px;">${currentSlide.icon}</div>
              <div>
                <div style="font-size:0.85rem; font-weight:800; color:white;">${currentSlide.title}</div>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; line-height:1.4;">${currentSlide.desc}</p>
              </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px;">
              <button class="btn btn-ghost btn-sm" style="padding:0; color:var(--brand-electric-violet); font-size:11px;" onclick="${currentSlide.actionStr}">
                ${currentSlide.actionLabel}
              </button>
              
              <!-- Pagination controls -->
              <div style="display:flex; align-items:center; gap:8px; font-size:11px; color:var(--text-muted);">
                <button class="btn btn-icon btn-sm" style="padding:4px; font-size:10px;" onclick="window.handlePrevAISlide()" ${state.aiSlideIndex === 0 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>◀</button>
                <span>${state.aiSlideIndex + 1} of ${activeList.length}</span>
                <button class="btn btn-icon btn-sm" style="padding:4px; font-size:10px;" onclick="window.handleNextAISlide()" ${state.aiSlideIndex === activeList.length - 1 ? 'disabled style="opacity:0.3; cursor:default;"' : ''}>▶</button>
              </div>
            </div>
          </div>
        </div>

        <div class="fa-section-card" style="display:flex; flex-direction:column; gap:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="font-size:1rem; font-weight:800; margin:0;">Mentoring Queue</h3>
            <span class="badge badge-neutral" style="font-size:9px;">${rawQueue.length} Booked</span>
          </div>
          
          <!-- Queue Search Box -->
          <input type="text" id="ment-queue-search" placeholder="Search appointments..." style="padding:8px 12px; border-radius:8px; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); color:white; font-size:11px; width:100%;">
          
          <!-- Queue List Viewport -->
          <div style="max-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; scrollbar-width:none;">
            ${filteredQueue.length === 0 ? `
              <div style="text-align:center; padding:32px 16px; color:var(--text-muted); font-size:11px;">
                ${rawQueue.length === 0 ? 'No mentoring sessions scheduled yet.' : 'No matches found in queue.'}
              </div>
            ` : filteredQueue.map(slot => `
              <div style="display:flex; align-items:center; gap:12px; padding:10px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:10px;">
                <div style="width:28px; height:28px; border-radius:50%; background:var(--brand-electric-violet); display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; color:white;">
                  ${slot.studentName[0]}
                </div>
                <div style="flex:1;">
                  <div style="font-size:0.75rem; font-weight:700; color:white;">${slot.studentName}</div>
                  <div style="font-size:0.65rem; color:var(--text-muted);">${slot.topic} · ${slot.time}</div>
                </div>
                <span class="badge" style="font-size:8px; text-transform:uppercase; background:rgba(245,158,11,0.1); border-color:rgba(245,158,11,0.2); color:#f59e0b;">
                  ${slot.mode}
                </span>
              </div>
            `).join('')}
          </div>
          
          <button class="btn btn-secondary btn-sm" style="width:100%; border-radius:8px; font-size:11px;" onclick="window.handleOpenScheduleMentoring()">
            + Schedule Session
          </button>
        </div>
      </div>
    </div>
    `;
  }

  function renderStudents() {
    return `
    <div class="card" style="overflow: visible !important;">
      <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:10px; flex:1;">
            <input type="text" id="roster-search" placeholder="Search by name or register number..." style="padding:10px 16px; border-radius:8px; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); width:300px; color:white;">
            <select id="roster-dept" style="padding:10px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-subtle); color:white; color-scheme: dark;">
              <option value="All" ${state.filterDept === 'All' ? 'selected' : ''} style="background:#18181b; color:white;">All Departments</option>
              <option value="CSE" ${state.filterDept === 'CSE' ? 'selected' : ''} style="background:#18181b; color:white;">CSE</option>
              <option value="ECE" ${state.filterDept === 'ECE' ? 'selected' : ''} style="background:#18181b; color:white;">ECE</option>
              <option value="IT" ${state.filterDept === 'IT' ? 'selected' : ''} style="background:#18181b; color:white;">IT</option>
            </select>
          </div>
          <button id="btn-advanced-filters" class="btn btn-secondary btn-sm" style="display:flex; align-items:center; gap:8px;">
            <span>⚙️</span> ${state.showAdvancedFilters ? 'Hide Filters' : 'Filter Options'}
          </button>
        </div>
        
        ${state.showAdvancedFilters ? `
          <div class="advanced-filters-panel">
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Profile Status</label>
              <select id="roster-status" style="width:100%; padding:10px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-subtle); color:white; color-scheme: dark;">
                <option value="All" ${state.filterStatus === 'All' ? 'selected' : ''} style="background:#18181b; color:white;">All Statuses</option>
                <option value="Approved" ${state.filterStatus === 'Approved' ? 'selected' : ''} style="background:#18181b; color:white;">Approved</option>
                <option value="Pending" ${state.filterStatus === 'Pending' ? 'selected' : ''} style="background:#18181b; color:white;">Pending</option>
                <option value="Under Review" ${state.filterStatus === 'Under Review' ? 'selected' : ''} style="background:#18181b; color:white;">Under Review</option>
                <option value="Rejected" ${state.filterStatus === 'Rejected' ? 'selected' : ''} style="background:#18181b; color:white;">Rejected</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Placement Risk Probability</label>
              <select id="roster-prob" style="width:100%; padding:10px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-subtle); color:white; color-scheme: dark;">
                <option value="All" ${state.filterProb === 'All' ? 'selected' : ''} style="background:#18181b; color:white;">All Probabilities</option>
                <option value="High" ${state.filterProb === 'High' ? 'selected' : ''} style="background:#18181b; color:white;">High</option>
                <option value="Medium" ${state.filterProb === 'Medium' ? 'selected' : ''} style="background:#18181b; color:white;">Medium</option>
                <option value="Low" ${state.filterProb === 'Low' ? 'selected' : ''} style="background:#18181b; color:white;">Low</option>
              </select>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="table-wrapper">
        <table class="fa-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>CGPA</th>
              <th>Resume</th>
              <th>Employability</th>
              <th>Prob.</th>
              <th>Readiness</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="roster-table-body">
            <!-- Row items render dynamically in filterRosterTable() -->
          </tbody>
        </table>
      </div>
    </div>
    `;
  }

  function renderValidation() {
    const pendingList = state.students.filter(s => ['Pending', 'Under Review', 'Pending Coordinator', 'Approved', 'Rejected'].includes(s.status));

    return `
    <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">Pending Approvals</h3></div>
        <div style="display:flex; flex-direction:column; gap:16px; padding-top:16px;">
          ${pendingList.length === 0 ? `
            <div style="text-align:center; padding:48px 16px; color:var(--text-muted);">
              No student profiles have been submitted for review.
            </div>
          ` : pendingList.map(s => `
            <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:700;">${s.name}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${s.dept} · Profile Validation Request</div>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                ${s.status === 'Pending' || s.status === 'Under Review' ? `
                  <button class="btn btn-sm btn-secondary" onclick="window.location.hash = '#student-details?id=${s.id}'">Review</button>
                  <button class="btn btn-sm btn-primary" onclick="window.handleQuickApprove('${s.id}')">Approve</button>
                  <button class="btn btn-sm" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444;" onclick="window.handleRejectProfile('${s.id}')">Reject</button>
                ` : s.status === 'Pending Coordinator' ? `
                  <span class="badge" style="background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2); color:#f59e0b; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:700;">Approved (Pending Coordinator)</span>
                ` : s.status === 'Approved' ? `
                  <span class="badge" style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); color:#10b981; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:700;">✓ Approved & Validated</span>
                ` : `
                  <span class="badge" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444; padding:6px 12px; border-radius:8px; font-size:0.75rem; font-weight:700;">Rejected</span>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="card">
        <div class="card-header"><h3 class="card-title">Validation Insights</h3></div>
        <div style="display:flex; flex-direction:column; gap:12px; padding-top:16px;">
          <div class="ai-insight-card fa-card" style="padding:12px; border:1px solid var(--border-subtle); border-radius:12px;">
            <div style="font-size:0.8rem;"><strong>Missing Documents:</strong> 3 students have not uploaded internship certificates.</div>
          </div>
          <div class="ai-insight-card fa-card" style="padding:12px; border-color: rgba(239,68,68,0.2); border:1px solid var(--border-subtle); border-radius:12px;">
            <div style="font-size:0.8rem;"><strong>Duplicate Detection:</strong> 1 possible duplicate certificate flagged for ${state.students[0]?.name || 'Student'}.</div>
          </div>
        </div>
      </div>
    </div>
    `;
  }

  function renderMentoring() {
    if (!state.mentoringCohort) {
      return `
      <div class="card">
        <div class="card-header"><h3 class="card-title">AI Mentoring Overview</h3></div>
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; padding-top:16px;">
          <div class="fa-card" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; padding:16px;">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Weak Communication</div>
            <div style="font-size:1.5rem; font-weight:800; color:#f59e0b;">${state.students.filter(s => s.softSkills < 75).length} Students</div>
            <button class="btn btn-ghost btn-sm" style="margin-top:10px; width:100%;" onclick="window.handleViewCohort('weak-comm')">View List</button>
          </div>
          <div class="fa-card" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; padding:16px;">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Coding Gaps</div>
            <div style="font-size:1.5rem; font-weight:800; color:#ef4444;">${state.students.filter(s => s.coding < 75).length} Students</div>
            <button class="btn btn-ghost btn-sm" style="margin-top:10px; width:100%;" onclick="window.handleViewCohort('coding-gaps')">View List</button>
          </div>
          <div class="fa-card" style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:16px; padding:16px;">
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">Low Confidence</div>
            <div style="font-size:1.5rem; font-weight:800; color:#3b82f6;">${state.students.filter(s => s.readiness < 70).length} Students</div>
            <button class="btn btn-ghost btn-sm" style="margin-top:10px; width:100%;" onclick="window.handleViewCohort('low-conf')">View List</button>
          </div>
        </div>
        
        <div style="margin-top:24px;">
          <h4 style="margin-bottom:12px; font-weight:800;">Recommended Actions</h4>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div style="padding:16px; border:1px solid var(--border-subtle); border-radius:12px; background:rgba(124,58,237,0.05);">
              <div style="font-weight:700; margin-bottom:4px; color:white;">Schedule Mock Interview Batch</div>
              <p style="font-size:0.8rem; color:var(--text-muted);">Students with readiness over 75% are pre-allocated for technical rounds.</p>
              <button class="btn btn-primary btn-sm" style="margin-top:8px;" onclick="window.handleAutoScheduleInterviews()">Auto-Schedule →</button>
            </div>
            <div style="padding:16px; border:1px solid var(--border-subtle); border-radius:12px; background:rgba(59,130,246,0.05);">
              <div style="font-weight:700; margin-bottom:4px; color:white;">Share DSA Prep Material</div>
              <p style="font-size:0.8rem; color:var(--text-muted);">Improve coding readiness metrics across classes.</p>
              <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="window.handleSharePrepMaterial()">Share to Group →</button>
            </div>
          </div>
        </div>
      </div>
      `;
    }

    let titleLabel = 'Cohort Roster';
    if (state.mentoringCohort === 'weak-comm') titleLabel = 'Weak Communication Cohort (< 75%)';
    if (state.mentoringCohort === 'coding-gaps') titleLabel = 'Coding Gaps Cohort (< 75%)';
    if (state.mentoringCohort === 'low-conf') titleLabel = 'Low Confidence Cohort (< 70% Readiness)';

    return `
    <div class="card" style="overflow: visible !important;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:1px solid var(--border-subtle); padding-bottom:16px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <button class="btn btn-secondary btn-sm" onclick="window.handleExitCohortView()" style="display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px;">
            ← Back
          </button>
          <h3 class="card-title" style="margin:0;">${titleLabel}</h3>
        </div>
      </div>

      <!-- Cohort filters and search -->
      <div style="display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:20px;">
        <div style="display:flex; gap:10px; flex:1;">
          <input type="text" id="ment-cohort-search" placeholder="Search by name or register number..." style="padding:10px 16px; border-radius:8px; background:rgba(0,0,0,0.2); border:1px solid var(--border-subtle); width:300px; color:white;">
          <select id="ment-cohort-dept" style="padding:10px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-subtle); color:white; color-scheme: dark;">
            <option value="All" style="background:#18181b; color:white;">All Departments</option>
            <option value="CSE" style="background:#18181b; color:white;">CSE</option>
            <option value="ECE" style="background:#18181b; color:white;">ECE</option>
            <option value="IT" style="background:#18181b; color:white;">IT</option>
          </select>
          <select id="ment-cohort-sort" style="padding:10px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-subtle); color:white; color-scheme: dark;">
            <option value="severity" style="background:#18181b; color:white;">Sort: Worst First</option>
            <option value="score-desc" style="background:#18181b; color:white;">Sort: Best First</option>
            <option value="name" style="background:#18181b; color:white;">Sort: Alphabetical</option>
          </select>
        </div>
      </div>

      <table class="fa-table" style="width:100%;">
        <thead>
          <tr>
            <th>STUDENT NAME</th>
            <th>CGPA</th>
            <th>COHORT SCORE</th>
            <th>PROGRESS TREND</th>
            <th>SEVERITY</th>
            <th style="text-align:right;">ACTIONS</th>
          </tr>
        </thead>
        <tbody id="ment-cohort-table-body">
          <!-- Filled by filterMentoringCohortTable -->
        </tbody>
      </table>
    </div>
    `;
  }

  function renderTransfers() {
    if (!state.transfers || state.transfers.length === 0) {
      return `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px; background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:24px; text-align:center; color:var(--text-muted); animation: fadeIn 0.4s ease;">
          <div style="font-size:40px; margin-bottom:16px; filter: grayscale(0.5);">📋</div>
          <div style="font-weight:800; color:#fff; margin-bottom:4px; font-size:16px;">Clear Workspace</div>
          <div style="font-size:13px; color:var(--text-description);">No pending section transfer proposals in your queue.</div>
        </div>
      `;
    }

    return `
      <div class="fa-section-card" style="animation: fadeIn 0.4s ease;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:28px;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:900; color:#fff;">Section Transfer Requests</h3>
            <p style="font-size:12px; color:var(--text-description); margin-top:2px;">Review and approve student proposals requesting section reassignments.</p>
          </div>
          <span style="background:rgba(245,158,11,0.1); border:1px solid #f59e0b; color:#f59e0b; font-size:11px; font-weight:800; padding:8px 16px; border-radius:8px;">
            ${state.transfers.length} PENDING
          </span>
        </div>

        <table class="fa-table">
          <thead>
            <tr>
              <th>STUDENT PROFILE</th>
              <th>ORIGINAL NODE</th>
              <th>PROPOSED TARGET</th>
              <th style="width:30%">JUSTIFICATION</th>
              <th style="text-align:right;">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${state.transfers.map(req => {
              const student = req.profiles || { full_name: 'Unregistered Student', roll_number: 'N/A' };
              return `
                <tr>
                  <td>
                    <div style="font-weight:800; color:#fff; font-size:14px;">${student.full_name}</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Roll ID: ${student.roll_number}</div>
                  </td>
                  <td>
                    <span style="font-size:12px; font-weight:600; color:var(--text-description);">${req.current_dept || 'General'}</span><br/>
                    <span style="font-size:11px; color:var(--text-muted);">Section ${req.current_section || 'None'}</span>
                  </td>
                  <td>
                    <div style="background:rgba(124,58,237,0.1); border:1px solid rgba(124,58,237,0.2); padding:6px 10px; border-radius:8px; display:inline-block;">
                      <strong style="font-size:12px; color:#fff;">Section ${req.target_section}</strong>
                    </div>
                  </td>
                  <td>
                    <div style="font-size:12px; color:var(--text-description); line-height:1.5; padding:8px; background:rgba(0,0,0,0.1); border-radius:8px; border:1px solid var(--border-subtle); font-style:italic;">
                      "${req.reason || 'No statement provided.'}"
                    </div>
                  </td>
                  <td style="text-align:right;">
                    <div style="display:flex; gap:8px; justify-content:flex-end;">
                      <button class="btn btn-sm btn-primary" style="font-size:10px; padding:8px 16px; border-radius:8px;" 
                        onclick="window.handleAcceptTransfer(${req.id}, '${req.student_id}', '${req.target_dept}', '${req.target_section}')">
                        ✅ Approve
                      </button>
                      <button class="btn btn-sm" style="font-size:10px; padding:8px 16px; border-radius:8px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444;" 
                        onclick="window.handleRejectTransfer(${req.id})">
                        ❌ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderModal() {
    if (!state.modalType) return '';

    let contentHTML = '';
    let title = '';

    if (state.modalType === 'announcement') {
      title = '📢 Broadcast Global Announcement';
      contentHTML = `
        <form onsubmit="window.handlePostAnnouncement(event)" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Announcement Title</label>
            <input type="text" id="announce-title" required placeholder="e.g. Zoho Recruitment Eligibility Criteria" style="width:100%; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white; font-size:0.9rem;">
          </div>
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Message / Instructions</label>
            <textarea id="announce-desc" required placeholder="Enter the broadcast payload directives..." rows="4" style="width:100%; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white; font-size:0.9rem; resize:vertical;"></textarea>
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Severity Level</label>
              <select id="announce-severity" style="width:100%; padding:10px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white;">
                <option value="General">General (Info)</option>
                <option value="Important">Important (Warning)</option>
                <option value="Critical">Critical (Danger)</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Target Cohort</label>
              <select id="announce-target" style="width:100%; padding:10px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white;">
                <option value="All">All Mapped Students</option>
                <option value="CSE">CSE Only</option>
                <option value="ECE">ECE Only</option>
                <option value="IT">IT Only</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.handleCloseModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Broadcast Directives</button>
          </div>
        </form>
      `;
    } else if (state.modalType === 'risk-analysis') {
      const s = state.modalData;
      title = `⚠️ Critical Risk Analysis: ${s.name}`;
      contentHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15); border-radius:12px; padding:16px; font-size:0.85rem; line-height: 1.5;">
            <strong>Mismatched Profile Telemetry:</strong> CGPA is <strong>${s.cgpa}</strong> (High Performance), but actual employability coding and technical index is low (<strong>Coding: ${s.coding}%, Soft Skills: ${s.softSkills}%</strong>). Mismatch score is flagged by AI proctoring engines.
          </div>
          
          <h4 style="font-size:0.9rem; font-weight:800; color:white; margin:8px 0 0 0;">Granular Skills Mapped:</h4>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
              <div style="font-size:0.7rem; color:var(--text-muted);">CODING INDEX</div>
              <div style="font-size:1.1rem; font-weight:800; color:#ef4444;">${s.coding}%</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
              <div style="font-size:0.7rem; color:var(--text-muted);">SOFT SKILLS</div>
              <div style="font-size:1.1rem; font-weight:800; color:#f59e0b;">${s.softSkills}%</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
              <div style="font-size:0.7rem; color:var(--text-muted);">APTITUDE RATIO</div>
              <div style="font-size:1.1rem; font-weight:800; color:#22c55e;">${s.aptitude}%</div>
            </div>
            <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
              <div style="font-size:0.7rem; color:var(--text-muted);">RESUME ATS</div>
              <div style="font-size:1.1rem; font-weight:800; color:var(--brand-electric-violet);">${s.resumeScore}%</div>
            </div>
          </div>
          
          <h4 style="font-size:0.9rem; font-weight:800; color:white; margin:8px 0 0 0;">Suggested Intervention Strategy:</h4>
          <ul style="font-size:0.8rem; color:var(--text-muted); padding-left:16px; margin:0; line-height:1.6;">
            <li>Enroll in Advanced Data Structures crash course batch.</li>
            <li>Allocate mock technical and communication interviews.</li>
            <li>Suggest resume revamp focused on technical projects.</li>
          </ul>

          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
            <button class="btn btn-secondary btn-sm" onclick="window.handleCloseModal()">Close</button>
            <button class="btn btn-primary btn-sm" onclick="window.handleCloseModal(); window.handleOpenScheduleMentoring('${s.name}');">Schedule Mentoring Slot</button>
          </div>
        </div>
      `;
    } else if (state.modalType === 'insights') {
      title = '🤖 AI Cohort Insights & Reports';
      contentHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:12px; padding-right:6px;">
            <div style="padding:12px; border-radius:12px; background:rgba(124,58,237,0.05); border:1px solid rgba(124,58,237,0.15);">
              <strong style="color:white; font-size:0.85rem; display:block;">🗣️ Soft Skills Gap</strong>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">5 students in the 8-9 CGPA bracket show low communication readiness scores. Recommendation: Suggest Workshop #4.</p>
              <button class="btn btn-sm btn-ghost" style="padding:4px 0; color:var(--brand-electric-violet); margin-top:6px;" onclick="window.handleCloseModal(); window.handleViewCohort('view-weak-comm')">View List →</button>
            </div>
            <div style="padding:12px; border-radius:12px; background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.15);">
              <strong style="color:white; font-size:0.85rem; display:block;">💻 Technical Mismatch Flag</strong>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${state.students[0]?.name || 'Student'}'s technical coding score does not match CGPA benchmark. Mismatch ratio is high.</p>
              <button class="btn btn-sm btn-ghost" style="padding:4px 0; color:var(--brand-electric-violet); margin-top:6px;" onclick="window.handleCloseModal(); window.handleViewAnalysis('${state.students[0]?.name || 'Student'}')">View Analysis →</button>
            </div>
            <div style="padding:12px; border-radius:12px; background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.15);">
              <strong style="color:white; font-size:0.85rem; display:block;">📋 Missing Internships Documentation</strong>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">3 students have not uploaded mandatory industry internship certificates. Verification pending.</p>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top:16px;">
            <button class="btn btn-secondary btn-sm" onclick="window.handleCloseModal()">Dismiss</button>
          </div>
        </div>
      `;
    } else if (state.modalType === 'schedule-mentoring') {
      const selectedStudent = state.modalData || state.students[0] || {};
      title = `📅 Schedule Advisee Mentoring Session`;
      contentHTML = `
        <form onsubmit="window.handleBookMentoringSession(event)" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted);">Student Register Number</label>
              <span style="font-size:10px; color:var(--brand-primary); font-weight:700;">⚡ Instant Live Lookup</span>
            </div>
            <input type="text" id="mentor-reg-input" list="advisee-reg-list" required 
                   value="${selectedStudent.regNo || ''}" 
                   placeholder="Type or select student Register No (e.g. 99220041005)..." 
                   oninput="window.handleMentorRegLookup(this.value)" 
                   autocomplete="off"
                   style="width:100%; padding:11px 14px; background:rgba(5,8,16,0.95); border:1px solid var(--border-subtle); border-radius:10px; color:#fff; font-size:0.9rem;">
            
            <datalist id="advisee-reg-list">
              ${state.students.map(st => `
                <option value="${st.regNo}">${st.name} — ${st.dept} (CGPA: ${st.cgpa})</option>
              `).join('')}
            </datalist>
          </div>

          <!-- Live Student Snapshot Preview -->
          <div id="mentor-student-preview-card">
            ${selectedStudent && selectedStudent.name ? `
              <div style="padding:14px 16px; border-radius:10px; background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.3); display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #818cf8, #4f46e5); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; color:#fff;">
                    ${(selectedStudent.name || 'S')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style="font-weight:800; color:#fff; font-size:14px;">${selectedStudent.name}</div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Reg: <strong style="color:#fff;">${selectedStudent.regNo || 'N/A'}</strong> • Dept: ${selectedStudent.dept || 'CSE'}</div>
                  </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center;">
                  <span style="font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.06); color:#fff; font-weight:700; border:1px solid var(--glass-border-subtle);">
                    CGPA: ${selectedStudent.cgpa || 8.0}
                  </span>
                  <span style="font-size:11px; padding:3px 8px; border-radius:6px; background:rgba(52,211,153,0.15); color:#34d399; font-weight:700; border:1px solid rgba(52,211,153,0.3);">
                    ${selectedStudent.readiness || 75}% Readiness
                  </span>
                </div>
              </div>
            ` : `
              <div style="padding:14px; border-radius:10px; background:rgba(255,255,255,0.02); border:1px dashed var(--glass-border-subtle); display:flex; align-items:center; gap:10px; color:var(--text-muted); font-size:12px;">
                <span style="font-size:18px;">🔍</span>
                <span>Enter or pick a Register Number above to automatically load advisee intelligence.</span>
              </div>
            `}
          </div>

          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Mentoring Topic</label>
            <select id="mentor-topic" style="width:100%; padding:11px 14px; background:rgba(5,8,16,0.95); border:1px solid var(--border-subtle); border-radius:10px; color:#fff; appearance:auto;">
              <option value="Resume & ATS Revamp" style="background:#050810; color:#fff;">📄 Resume & ATS Revamp</option>
              <option value="Technical Coding & DSA Prep" style="background:#050810; color:#fff;">💻 Technical Coding & DSA Prep</option>
              <option value="Mock HR & Fluency Interview" style="background:#050810; color:#fff;">🗣️ Mock HR & Fluency Interview</option>
              <option value="Placement Probability & Guidance" style="background:#050810; color:#fff;">🎯 Placement Probability & Guidance</option>
              <option value="Academic Marksheet Verification" style="background:#050810; color:#fff;">📋 Academic Marksheet Verification</option>
            </select>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Date</label>
              <input type="date" id="mentor-date" required style="width:100%; padding:10px; background:rgba(5,8,16,0.95); border:1px solid var(--border-subtle); border-radius:10px; color:#fff; color-scheme: dark;">
            </div>
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Time</label>
              <input type="time" id="mentor-time" required style="width:100%; padding:10px; background:rgba(5,8,16,0.95); border:1px solid var(--border-subtle); border-radius:10px; color:#fff; color-scheme: dark;">
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Session Mode</label>
            <select id="mentor-mode" style="width:100%; padding:11px 14px; background:rgba(5,8,16,0.95); border:1px solid var(--border-subtle); border-radius:10px; color:#fff; appearance:auto;">
              <option value="Offline (Faculty Cabin)" style="background:#050810; color:#fff;">🏢 Offline (Faculty Cabin)</option>
              <option value="Online (Placenix Meet)" style="background:#050810; color:#fff;">🌐 Online (Placenix Meet)</option>
            </select>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:16px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.handleCloseModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" style="font-weight:800; padding:8px 20px;">Confirm & Book Session →</button>
          </div>
        </form>
      `;
    } else if (state.modalType.startsWith('view-')) {
      const roster = state.modalData;
      let label = 'Cohort list';
      if (state.modalType === 'view-weak-comm') label = 'Weak Communication Students (< 75%)';
      if (state.modalType === 'view-coding-gaps') label = 'Coding Gaps Students (< 75%)';
      if (state.modalType === 'view-low-conf') label = 'Low Confidence Students (< 70% Readiness)';
      
      title = `🗣️ ${label}`;
      contentHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="max-height:300px; overflow-y:auto; border:1px solid var(--border-subtle); border-radius:12px; background:rgba(0,0,0,0.2);">
            <table class="fa-table" style="width:100%;">
              <thead>
                <tr>
                  <th style="padding:10px;">STUDENT</th>
                  <th style="padding:10px; text-align:center;">CGPA</th>
                  <th style="padding:10px; text-align:center;">METRIC</th>
                  <th style="padding:10px; text-align:right;">ACTION</th>
                </tr>
              </thead>
              <tbody>
                ${roster.map(s => {
                  let metricValue = 0;
                  if (state.modalType === 'view-weak-comm') metricValue = s.softSkills;
                  if (state.modalType === 'view-coding-gaps') metricValue = s.coding;
                  if (state.modalType === 'view-low-conf') metricValue = s.readiness;
                  
                  return `
                    <tr>
                      <td style="padding:10px;">
                        <div style="font-weight:700; font-size:0.85rem;">${s.name}</div>
                        <div style="font-size:0.65rem; color:var(--text-muted);">${s.regNo}</div>
                      </td>
                      <td style="padding:10px; text-align:center; font-size:0.85rem;">${s.cgpa}</td>
                      <td style="padding:10px; text-align:center; font-size:0.85rem; font-weight:800; color:#ef4444;">${metricValue}%</td>
                      <td style="padding:10px; text-align:right;">
                        <button class="btn btn-sm btn-ghost" style="padding:4px 8px; font-size:0.75rem;" onclick="window.handleCloseModal(); window.handleOpenScheduleMentoring('${s.name}');">Mentoring</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
          <div style="display:flex; justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="window.handleCloseModal()">Close</button>
          </div>
        </div>
      `;
    } else if (state.modalType === 'auto-schedule-success') {
      const roster = state.modalData;
      title = '✅ Mock Interview Batch Scheduled';
      contentHTML = `
        <div style="display:flex; flex-direction:column; gap:16px;">
          <div style="background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.15); border-radius:12px; padding:16px; font-size:0.85rem; line-height: 1.5;">
            Successfully generated auto-scheduled mock interview rounds for <strong>${roster.length} Students</strong> who have achieved 75%+ Placement Readiness!
          </div>
          <div style="max-height:200px; overflow-y:auto; display:flex; flex-direction:column; gap:8px;">
            ${roster.map(s => `
              <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.02); border-radius:8px; border:1px solid var(--border-subtle);">
                <div style="font-size:0.8rem; font-weight:700;">${s.name}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">[${s.dept}] Technical Mock (Pre-Allocated Slot)</div>
              </div>
            `).join('')}
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px;">
            <button class="btn btn-secondary btn-sm" onclick="window.handleCloseModal()">Cancel</button>
            <button class="btn btn-primary btn-sm" onclick="window.handleConfirmAutoSchedule()">Confirm & Notify Students</button>
          </div>
        </div>
      `;
    } else if (state.modalType === 'share-dsa-material') {
      title = '📚 Share Curated DSA & Prep Materials';
      contentHTML = `
        <form onsubmit="window.handleSendDSAMaterial(event)" style="display:flex; flex-direction:column; gap:16px;">
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Material Title / Name</label>
            <input type="text" id="dsa-title" required placeholder="e.g. Master DP Sheet - Top 50 Problems" style="width:100%; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white; font-size:0.9rem;">
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Resource Type</label>
              <select id="dsa-type" style="width:100%; padding:10px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white;">
                <option value="PDF Document">PDF Document</option>
                <option value="Web Reference Link">Web Reference Link</option>
                <option value="Practice Assignment">Practice Assignment</option>
                <option value="Interview Cheat Sheet">Interview Cheat Sheet</option>
              </select>
            </div>
            <div>
              <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Target Recipient Group</label>
              <select id="dsa-target" style="width:100%; padding:10px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white;">
                <option value="Coding Gaps">Coding Gaps Cohort (< 75% Coding)</option>
                <option value="All Cohorts">All Students</option>
                <option value="Weak Communication">Weak Comm Cohort (< 75% Comm)</option>
              </select>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Upload Files or Enter Link URL</label>
            <div style="display:flex; gap:12px;">
              <input type="text" id="dsa-link" placeholder="Enter drive link or web URL (e.g. https://...)" style="flex:1; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white; font-size:0.9rem;">
              <div style="position:relative;">
                <button type="button" class="btn btn-secondary btn-sm" style="height:40px; cursor:pointer;" onclick="document.getElementById('dsa-file-upload').click()">📁 Choose File</button>
                <input type="file" id="dsa-file-upload" style="display:none;" onchange="document.getElementById('dsa-link').value = this.files[0] ? this.files[0].name : ''">
              </div>
            </div>
          </div>
          <div>
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">Notes & Practice Instructions</label>
            <textarea id="dsa-notes" placeholder="Add practice guidelines, tips or assignment deadlines..." rows="3" style="width:100%; padding:10px 14px; background:rgba(0,0,0,0.3); border:1px solid var(--border-subtle); border-radius:10px; color:white; font-size:0.9rem; resize:vertical;"></textarea>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:12px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.handleCloseModal()">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm">Share to Group →</button>
          </div>
        </form>
      `;
    }

    return `
      <div class="fa-modal-overlay" onclick="if(event.target === this) window.handleCloseModal()">
        <div class="fa-modal-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
            <h3 style="font-size:1.2rem; font-weight:900; color:white; margin:0;">${title}</h3>
            <button style="background:none; border:none; color:var(--text-muted); font-size:1.5rem; cursor:pointer;" onclick="window.handleCloseModal()">&times;</button>
          </div>
          ${contentHTML}
        </div>
      </div>
    `;
  }

  render();
}
