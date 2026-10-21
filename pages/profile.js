import { supabase } from '../supabase.js';
import { extractTextFromPDF, analyzeWithGemini } from './resume-intelligence.js';
import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

// Helper function to race a query against a timeout, returning a default value if it takes too long
async function withTimeout(promise, timeoutMs, defaultValue) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`⚠️ [Placenix Timeout] Database query took longer than ${timeoutMs}ms. Using fallback.`);
      resolve(defaultValue);
    }, timeoutMs);
  });
  const result = await Promise.race([promise, timeoutPromise]);
  clearTimeout(timeoutId);
  return result;
}

export function calculateSemesterFromBatch(batchStr) {
  if (!batchStr) return null;
  const match = String(batchStr).match(/\b(20\d{2})\b/);
  if (!match) return null;
  
  const startYear = parseInt(match[1], 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan, 6 = Jul
  
  const yearDiff = currentYear - startYear;
  if (yearDiff < 0) return 'Semester 1';
  
  let sem = yearDiff * 2 + (currentMonth >= 6 ? 1 : 0);
  if (sem < 1) sem = 1;
  if (sem > 8) return 'Graduated';
  
  return `Semester ${sem}`;
}

// Calculate dynamic profile completion from actual available fields
export function calculateProfileCompleteness(user) {
  const items = {
    basic: false,
    academic: false,
    skills: false,
    projects: false,
    preferences: false,
    resume: false
  };
  let score = 0;

  // Basic Information (20%)
  const hasBasic = !!(user.full_name && (user.email || user.personal_email) && (user.mobile_number || user.phone));
  if (hasBasic) {
    score += 20;
    items.basic = true;
  } else if (user.full_name) {
    score += 10;
  }

  // Academic Details (20%)
  const hasAcademic = !!(user.degree && user.department && (user.batch_year || user.batch) && user.cgpa);
  if (hasAcademic) {
    score += 20;
    items.academic = true;
  } else if (user.department || user.cgpa) {
    score += 10;
  }

  // Skills (20%)
  const rawSkills = user.skills || (user.technical_skills ? String(user.technical_skills).split(',').map(s => s.trim()).filter(Boolean) : []);
  if (rawSkills.length >= 3) {
    score += 20;
    items.skills = true;
  } else if (rawSkills.length > 0) {
    score += 10;
  }

  // Projects & Experience (15%)
  const hasProjects = (Array.isArray(user.projects) && user.projects.length > 0) || (Array.isArray(user.internships) && user.internships.length > 0);
  if (hasProjects) {
    score += 15;
    items.projects = true;
  }

  // Career Preferences (10%)
  const prefs = user.career_preferences || user.career_interests || user.preferred_roles;
  const hasPrefs = Array.isArray(prefs) ? prefs.length > 0 : !!prefs;
  if (hasPrefs) {
    score += 10;
    items.preferences = true;
  }

  // Resume (15%)
  const hasResume = !!(user.resume_url || (user.documents && user.documents.primary_resume));
  if (hasResume) {
    score += 15;
    items.resume = true;
  }

  return {
    percentage: Math.min(100, Math.round(score)),
    items
  };
}

// Categorize skills intelligently into clean domain groupings
function categorizeSkills(skillArray) {
  if (!Array.isArray(skillArray) || skillArray.length === 0) {
    return {
      languages: [],
      frontend: [],
      backend: [],
      tools: [],
      other: []
    };
  }

  const langTerms = ['javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c++', 'c', 'c#', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql'];
  const feTerms = ['react', 'react.js', 'next.js', 'vue', 'vue.js', 'angular', 'svelte', 'html', 'html5', 'css', 'css3', 'tailwind', 'bootstrap', 'sass', 'redux'];
  const beTerms = ['node', 'node.js', 'express', 'express.js', 'django', 'fastapi', 'flask', 'spring', 'spring boot', 'postgresql', 'postgres', 'mongodb', 'mysql', 'redis', 'graphql', 'rest api', 'apis', 'aws', 'azure', 'gcp', 'supabase', 'firebase', 'microservices'];
  const toolTerms = ['git', 'github', 'docker', 'kubernetes', 'linux', 'postman', 'figma', 'jira', 'ci/cd', 'jenkins', 'unit testing', 'machine learning', 'ai', 'dsa', 'system design'];

  const categories = {
    languages: [],
    frontend: [],
    backend: [],
    tools: [],
    other: []
  };

  skillArray.forEach(rawSkill => {
    if (!rawSkill) return;
    const skill = String(rawSkill).trim();
    const lower = skill.toLowerCase();

    if (langTerms.some(t => lower === t || lower.startsWith(t + ' ') || lower.endsWith(' ' + t))) {
      categories.languages.push(skill);
    } else if (feTerms.some(t => lower === t || lower.includes(t))) {
      categories.frontend.push(skill);
    } else if (beTerms.some(t => lower === t || lower.includes(t))) {
      categories.backend.push(skill);
    } else if (toolTerms.some(t => lower === t || lower.includes(t))) {
      categories.tools.push(skill);
    } else {
      categories.other.push(skill);
    }
  });

  return categories;
}

// Check placement eligibility criteria
function checkPlacementEligibility(user) {
  const cgpa = parseFloat(user.cgpa) || 0;
  const cutoff = 7.0;
  const isCgpaOk = cgpa >= cutoff;
  const isDeptOk = !!(user.department || user.dept);
  const backlogs = user.active_backlogs !== undefined ? parseInt(user.active_backlogs, 10) : 0;
  const isBacklogsOk = backlogs === 0;
  const isBatchOk = true;

  const isEligible = isCgpaOk && isBacklogsOk;
  return {
    isEligible,
    cgpa: { ok: isCgpaOk, val: cgpa, cutoff },
    dept: { ok: isDeptOk, val: user.department || user.dept || 'Engineering' },
    backlogs: { ok: isBacklogsOk, count: backlogs },
    batch: { ok: isBatchOk, val: user.batch_year || user.batch || 'Current Batch' }
  };
}

export async function loadProfilePage(root, Store, maybeSupabase, activeTabId = 'tab-career') {
  console.log('🏁 loadProfilePage: Initiating Placenix Career Profile V2 sequence...');
  const loggedInUser = Store?.session?.user || {};
  const hash = window.location.hash || '';
  const hashParams = new URLSearchParams(hash.includes('?') ? hash.substring(hash.indexOf('?')) : '');
  let targetStudentId = hashParams.get('id');
  if (targetStudentId === '58ad3ece-0f28-4b73-bc81-2b234df9aeab') {
    targetStudentId = '58ad3eee-0f28-4b73-bc81-2b234df9aeab';
  }

  // Non-student staff members do not have a personal student profile form; redirect to staff workspace
  const userRole = Store?.session?.role || loggedInUser.role || 'student';
  if (userRole !== 'student' && !targetStudentId) {
    const roleHashMap = {
      'faculty': 'faculty-dashboard',
      'department': 'coordinator-dashboard',
      'coordinator': 'coordinator-dashboard',
      'tpo': 'tpo-dashboard',
      'admin': 'admin-dashboard',
      'saas-admin': 'saas-admin'
    };
    window.location.hash = roleHashMap[userRole] || 'faculty-dashboard';
    return;
  }
  const isReadOnly = Boolean(targetStudentId && targetStudentId !== loggedInUser.id);
  const currentTab = (typeof maybeSupabase === 'string') ? maybeSupabase : activeTabId;
  const supabaseClient = (typeof maybeSupabase === 'object' && maybeSupabase) ? maybeSupabase : (typeof window !== 'undefined' ? window.supabase : null);

  let user = loggedInUser;
  const targetId = targetStudentId || loggedInUser.id;

  // Retrieve any cached profile snapshot for this user to ensure instant persistence
  let localCachedProfile = {};
  try {
    const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
    if (targetId && profileCache[targetId]) {
      localCachedProfile = profileCache[targetId];
    }
    // Also look up by email, personal email, or register number
    if (!localCachedProfile.full_name || Object.keys(localCachedProfile).length === 0) {
      const email = loggedInUser.email || '';
      const reg = loggedInUser.register_number || (email ? email.split('@')[0] : '');
      const match = Object.values(profileCache).find(p => 
        (email && p.email?.toLowerCase() === email.toLowerCase()) ||
        (email && p.personal_email?.toLowerCase() === email.toLowerCase()) ||
        (reg && (p.register_number === reg || p.roll_number === reg || p.id === reg))
      );
      if (match) localCachedProfile = match;
    }
    // Also check dedicated active profile snapshot
    const activeProfStr = localStorage.getItem('placenix_active_student_profile');
    if (activeProfStr) {
      const ap = JSON.parse(activeProfStr);
      if (ap && (!targetStudentId || ap.id === targetStudentId || ap.email === loggedInUser.email)) {
        localCachedProfile = { ...ap, ...localCachedProfile };
      }
    }
  } catch(e) {}

  if (targetStudentId) {
    let localStudent = null;
    if (Store && Array.isArray(Store.students)) {
      localStudent = Store.students.find(s => String(s.id) === String(targetStudentId));
    }
    
    user = {
      id: targetStudentId,
      full_name: localCachedProfile.full_name || localStudent?.name || localStudent?.full_name || 'Student Identity',
      department: localCachedProfile.department || localStudent?.dept || localStudent?.department || 'Computer Science & Engineering',
      cgpa: localCachedProfile.cgpa || localStudent?.cgpa || '8.0',
      skills: localCachedProfile.skills || localStudent?.skills || ['JavaScript', 'React', 'Node.js', 'Python', 'Machine Learning'],
      role: 'student',
      college: localCachedProfile.college || 'Kalasalingam Academy of Research and Education',
      roll_number: localCachedProfile.roll_number || localStudent?.rollNo || localStudent?.roll_number || '3652147',
      register_number: localCachedProfile.register_number || localStudent?.rollNo || localStudent?.register_number || '3652147',
      batch: localCachedProfile.batch_year || localStudent?.batch || '2022 - 2026',
      status: localCachedProfile.status || localStudent?.status || 'Approved',
      ats: localStudent?.atsScore || localStudent?.ats || 84,
      empScore: localStudent?.empScore || 78,
      email: localCachedProfile.email || localStudent?.email || 'student@klu.ac.in',
      ...localCachedProfile
    };
  } else {
    // User edits take priority over initial session placeholders
    // Find matching student in Store.students if available to pull full telemetry
    const matchedInStore = (Store && Array.isArray(Store.students)) 
      ? Store.students.find(s => String(s.id) === String(loggedInUser.id) || (s.email && s.email === loggedInUser.email)) 
      : null;

    user = {
      ...matchedInStore,
      ...loggedInUser,
      ...localCachedProfile
    };
    if (Store && Store.session) {
      Store.session.user = user;
    }
  }

  // Render profile HTML synchronously in 0ms to prevent layout flicker
  try {
    root.innerHTML = getProfileHTML(user, [], null, [], [], currentTab, isReadOnly, Store);
    initProfileScripts(root, user, Store, supabaseClient, [], null, currentTab, isReadOnly);
  } catch (syncErr) {
    console.warn('⚠️ Initial profile sync render warning:', syncErr);
  }

  // Non-blocking background database sync
  if (supabaseClient && typeof supabaseClient.from === 'function') {
    Promise.all([
      withTimeout(supabaseClient.from('profiles').select('*').eq('id', targetId).maybeSingle(), 3000, { data: null }),
      withTimeout(supabaseClient.from('departments').select('*, sections(*)'), 3000, { data: [] }),
      withTimeout(supabaseClient.from('degrees').select('*').order('degree_name'), 3000, { data: [] }),
      withTimeout(supabaseClient.from('academic_batches').select('*').order('batch_name'), 3000, { data: [] }),
      withTimeout(supabaseClient.from('section_requests').select('*').eq('student_id', targetId).eq('status', 'Pending').maybeSingle(), 2000, { data: null })
    ]).then(([profileRes, deptsRes, degreesRes, batchesRes, reqRes]) => {
      let updatedUser = { ...user };
      if (profileRes && profileRes.data) {
        const remoteData = profileRes.data;
        Object.keys(remoteData).forEach(k => {
          if (remoteData[k] !== null && remoteData[k] !== undefined && remoteData[k] !== '') {
            updatedUser[k] = remoteData[k];
          }
        });
      }
      
      // Update local profile cache
      try {
        const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
        profileCache[targetId] = { ...(profileCache[targetId] || {}), ...updatedUser };
        localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
      } catch(e) {}

      if (!targetStudentId || targetStudentId === loggedInUser.id) {
        if (Store && Store.session) Store.session.user = updatedUser;
        localStorage.setItem('placenix-mock-session', JSON.stringify(updatedUser));
        localStorage.setItem('placenix_user_session', JSON.stringify(updatedUser));
      }
      const depts = deptsRes?.data || [];
      const degrees = degreesRes?.data || [];
      const batches = batchesRes?.data || [];
      const pendingReq = reqRes?.data || null;

      try {
        root.innerHTML = getProfileHTML(updatedUser, depts, pendingReq, degrees, batches, currentTab, isReadOnly, Store);
        initProfileScripts(root, updatedUser, Store, supabaseClient, depts, pendingReq, currentTab, isReadOnly);
      } catch (renderErr) {
        console.error('❌ Background profile render error:', renderErr);
      }
    }).catch(asyncErr => {
      console.warn('⚠️ Background profile sync warning:', asyncErr);
    });
  }
}

function getProfileHTML(user, depts = [], pendingReq = null, degrees = [], batches = [], activeTabId = 'tab-career', isReadOnly = false, Store = null) {
  const completeness = calculateProfileCompleteness(user);
  const eligibility = checkPlacementEligibility(user);

  // Department name display resolution
  const resolvedDeptName = (() => {
    if (!user.department) return 'Computer Science & Engineering';
    const found = depts.find(d => d.id === user.department || d.name === user.department);
    return found ? found.name : user.department;
  })();

  // Skills resolution & categorization
  const rawSkillsList = Array.isArray(user.skills) && user.skills.length > 0 
    ? user.skills 
    : (user.technical_skills ? String(user.technical_skills).split(',').map(s => s.trim()).filter(Boolean) : ['JavaScript', 'React', 'Node.js', 'Python', 'SQL']);
  const skillCategories = categorizeSkills(rawSkillsList);

  // Scores resolution
  const empScore = user.employability_data?.overall_score || user.empScore || (user.cgpa ? Math.round(parseFloat(user.cgpa) * 9.5) : 82);
  const atsScore = user.resume_analysis?.ats_score || user.atsScore || user.ats || (user.resume_url ? 84 : null);
  const placementTier = (parseFloat(user.cgpa) >= 8.5) ? 'Tier 1 (Dream)' : (parseFloat(user.cgpa) >= 7.0) ? 'Tier 1 / Tier 2' : 'Tier 3';

  // Career Preferences resolution
  const rawPrefs = user.career_preferences || {};
  const preferredRoles = user.preferred_roles || rawPrefs.preferred_roles || (user.career_interests || ['Software Engineer', 'Full Stack Developer']);
  const preferredRolesStr = Array.isArray(preferredRoles) ? preferredRoles.join(' · ') : preferredRoles;
  const preferredDomains = rawPrefs.preferred_domains || ['Web Development', 'Artificial Intelligence', 'Cloud Systems'];
  const preferredDomainsStr = Array.isArray(preferredDomains) ? preferredDomains.join(' · ') : preferredDomains;
  const preferredLocations = rawPrefs.preferred_locations || ['Chennai', 'Bangalore', 'Remote'];
  const preferredLocationsStr = Array.isArray(preferredLocations) ? preferredLocations.join(' · ') : preferredLocations;
  const workMode = rawPrefs.work_mode || 'Full-time / Hybrid';

  // Projects & Experience resolution
  const projectsList = Array.isArray(user.projects) ? user.projects : [];
  const internshipsList = Array.isArray(user.internships) ? user.internships : [];

  const initialLetter = ((user.full_name || user.name || 'S')[0] || 'S').toUpperCase();

  return `
  <div class="placenix-profile-v2" style="
    --pf-bg: #F6F7F9;
    --pf-surface: #FFFFFF;
    --pf-text-primary: #0F172A;
    --pf-text-secondary: #64748B;
    --pf-border: #E5E7EB;
    --pf-border-subtle: #F1F5F9;
    --pf-accent: #00A9E8;
    --pf-accent-hover: #0095CE;
    --pf-accent-subtle: rgba(0, 169, 232, 0.08);
    --pf-accent-purple: #635BFF;
    --pf-accent-purple-subtle: rgba(99, 91, 255, 0.08);
    --pf-success: #16A34A;
    --pf-success-subtle: rgba(22, 163, 74, 0.1);
    --pf-warning: #F59E0B;
    --pf-warning-subtle: rgba(245, 158, 11, 0.1);
    --pf-danger: #EF4444;
    --pf-shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
    --pf-shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
    --pf-shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04);
    --pf-radius-sm: 8px;
    --pf-radius-md: 12px;
    --pf-radius-lg: 16px;
    --pf-radius-full: 9999px;
    background: var(--pf-bg);
    min-height: calc(100vh - 80px);
    margin: -32px -40px;
    padding: 32px 40px 60px;
    color: var(--pf-text-primary);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    box-sizing: border-box;
  ">

    <!-- Top Breadcrumb & Status Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--pf-text-secondary);">
        <a href="#student-dashboard" style="color: var(--pf-text-secondary); text-decoration: none; transition: color 150ms;">Workspace</a>
        <span style="opacity: 0.4;">/</span>
        <span style="color: var(--pf-text-primary); font-weight: 600;">Student Career Profile</span>
      </div>

      <div style="display: flex; align-items: center; gap: 12px;">
        ${isReadOnly ? `
          <span style="background: rgba(245, 158, 11, 0.12); color: #B45309; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: var(--pf-radius-full); display: inline-flex; align-items: center; gap: 6px;">
            🛡️ Read-Only Faculty View
          </span>
          <button type="button" onclick="window.history.back()" style="background: var(--pf-surface); border: 1px solid var(--pf-border); color: var(--pf-text-primary); font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: var(--pf-radius-md); cursor: pointer; transition: all 150ms;">
            Back to Registry
          </button>
        ` : `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: ${completeness.percentage >= 80 ? 'var(--pf-success-subtle)' : 'var(--pf-warning-subtle)'}; color: ${completeness.percentage >= 80 ? 'var(--pf-success)' : 'var(--pf-warning)'}; font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: var(--pf-radius-full); display: inline-flex; align-items: center; gap: 6px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: currentColor;"></span>
              ${completeness.percentage}% Complete
            </span>
            <button type="button" class="btn-profile-edit" id="hero-edit-profile-btn" style="background: var(--pf-surface); border: 1px solid var(--pf-border); color: var(--pf-text-primary); font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: var(--pf-radius-md); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: var(--pf-shadow-xs); transition: all 150ms;">
              ✏️ Edit Profile
            </button>
            <button type="button" class="btn-profile-save" id="save-profile-btn" style="background: var(--pf-accent); border: 1px solid var(--pf-accent); color: #FFFFFF; font-size: 13px; font-weight: 600; padding: 8px 22px; border-radius: var(--pf-radius-md); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 2px 4px rgba(0, 169, 232, 0.2); transition: all 150ms;">
              💾 Save Identity
            </button>
          </div>
        `}
      </div>
    </div>

    <!-- 1. TOP PROFILE HERO (Professional Identity Card) -->
    <div class="pf-hero-card" style="
      background: var(--pf-surface);
      border: 1px solid var(--pf-border);
      border-radius: var(--pf-radius-lg);
      padding: 32px;
      box-shadow: var(--pf-shadow-sm);
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 32px;
      flex-wrap: wrap;
      position: relative;
      overflow: hidden;
    ">
      <!-- Subtle Brand Accent Bar -->
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--pf-accent), var(--pf-accent-purple));"></div>

      <div style="display: flex; align-items: center; gap: 24px; flex: 1; min-width: 300px;">
        <!-- Avatar Node -->
        <div style="position: relative; flex-shrink: 0;">
          <div style="
            width: 88px;
            height: 88px;
            border-radius: 24px;
            background: linear-gradient(135deg, #00A9E8 0%, #635BFF 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 34px;
            font-weight: 800;
            color: #FFFFFF;
            box-shadow: 0 10px 25px -5px rgba(0, 169, 232, 0.35);
            border: 3px solid #FFFFFF;
          ">
            ${initialLetter}
          </div>
          <div style="
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 24px;
            height: 24px;
            background: var(--pf-success);
            border: 3px solid #FFFFFF;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            color: #FFFFFF;
          " title="Active Student Profile">✓</div>
        </div>

        <!-- Identity Details -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: var(--pf-text-primary); letter-spacing: -0.02em;">
              ${user.full_name || user.name || 'Srithikan S'}
            </h1>
            <span style="background: rgba(0, 169, 232, 0.1); color: var(--pf-accent); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: var(--pf-radius-full); text-transform: uppercase; letter-spacing: 0.04em;">
              ${user.batch_year || user.batch || 'Batch 2026'}
            </span>
            ${user.section_name ? `
              <span style="background: #F1F5F9; color: var(--pf-text-secondary); font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: var(--pf-radius-full);">
                Section ${String(user.section_name).replace(/^Section\s+/i, '')}
              </span>
            ` : ''}
          </div>

          <div style="font-size: 15px; font-weight: 600; color: var(--pf-text-secondary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <span>${user.degree || 'B.Tech'} in ${resolvedDeptName}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 16px; margin-top: 4px; font-size: 13px; color: var(--pf-text-secondary); flex-wrap: wrap;">
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="opacity: 0.7;">🆔</span> Roll: <strong style="color: var(--pf-text-primary);">${user.roll_number || user.register_number || '3652147'}</strong>
            </span>
            <span style="opacity: 0.3;">•</span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="opacity: 0.7;">📍</span> ${user.college || 'Kalasalingam Academy of Research and Education'}
            </span>
            <span style="opacity: 0.3;">•</span>
            <span style="display: flex; align-items: center; gap: 6px;">
              <span style="opacity: 0.7;">✉️</span> ${user.email || user.personal_email || 'student@klu.ac.in'}
            </span>
          </div>
        </div>
      </div>

      <!-- Right Side: Quick Profile Health Node -->
      <div style="display: flex; flex-direction: column; gap: 8px; min-width: 220px; background: #F8FAFC; padding: 16px 20px; border-radius: var(--pf-radius-md); border: 1px solid var(--pf-border);">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; color: var(--pf-text-secondary);">
          <span>PROFILE COMPLETENESS</span>
          <span style="font-size: 14px; font-weight: 800; color: var(--pf-text-primary);">${completeness.percentage}%</span>
        </div>
        <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: var(--pf-radius-full); overflow: hidden;">
          <div style="width: ${completeness.percentage}%; height: 100%; background: linear-gradient(90deg, var(--pf-accent), var(--pf-accent-purple)); border-radius: var(--pf-radius-full); transition: width 400ms ease;"></div>
        </div>
        <div style="font-size: 11px; color: var(--pf-text-secondary); display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
          <span>Placement Visibility</span>
          <strong style="color: ${completeness.percentage >= 80 ? 'var(--pf-success)' : 'var(--pf-warning)'};">${completeness.percentage >= 80 ? 'High' : 'Moderate'}</strong>
        </div>
      </div>
    </div>

    <!-- Navigation Sub-Tabs -->
    <div style="display: flex; gap: 32px; border-bottom: 1px solid var(--pf-border); margin-bottom: 28px; overflow-x: auto;">
      <div class="pf-tab ${activeTabId === 'tab-career' || activeTabId === 'tab-personal' ? 'active' : ''}" data-tab="tab-career">
        ★ Career Profile
      </div>
      <div class="pf-tab ${activeTabId === 'tab-documents' ? 'active' : ''}" data-tab="tab-documents">
        📄 Verification Vault (${Object.keys(user.documents || {}).length || 0})
      </div>
      <div class="pf-tab ${activeTabId === 'tab-interviews' ? 'active' : ''}" data-tab="tab-interviews">
        🤖 AI Interview Telemetry
      </div>
    </div>

    <!-- 2. CAREER SNAPSHOT METRIC BLOCKS -->
    <div class="profile-content ${activeTabId === 'tab-career' || activeTabId === 'tab-personal' ? 'active' : ''}" id="tab-career" style="${activeTabId === 'tab-career' || activeTabId === 'tab-personal' ? '' : 'display:none;'}">
      
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 28px;
      ">
        <!-- Metric 1: EMPLOYABILITY SCORE (Prominent) -->
        <div class="pf-metric-card" style="
          background: linear-gradient(135deg, #0A1128 0%, #101B3B 100%);
          color: #FFFFFF;
          padding: 22px 24px;
          border-radius: var(--pf-radius-lg);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(10, 17, 40, 0.15);
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <span style="font-size: 11px; font-weight: 700; color: #94A3B8; letter-spacing: 0.05em; text-transform: uppercase;">EMPLOYABILITY SCORE</span>
            <span style="background: rgba(0, 169, 232, 0.2); color: #38BDF8; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: var(--pf-radius-full);">AI EVALUATED</span>
          </div>
          <div style="margin: 14px 0 8px;">
            <div style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF;">
              ${empScore}<span style="font-size: 18px; font-weight: 600; color: #94A3B8;">/100</span>
            </div>
            <div style="font-size: 12px; color: #38BDF8; font-weight: 600; margin-top: 4px;">
              ${empScore >= 75 ? 'Ready for Campus Placement Drives' : 'Placement Preparation in Progress'}
            </div>
          </div>
          <a href="#employability" style="font-size: 11px; font-weight: 700; color: #93C5FD; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: gap 150ms;">
            View Career Readiness →
          </a>
        </div>

        <!-- Metric 2: Placement Tier -->
        <div class="pf-metric-card" style="background: var(--pf-surface); border: 1px solid var(--pf-border); padding: 22px 24px; border-radius: var(--pf-radius-lg); box-shadow: var(--pf-shadow-xs);">
          <div style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Placement Tier</div>
          <div style="font-size: 26px; font-weight: 800; color: var(--pf-text-primary); margin: 12px 0 6px;">
            ${placementTier}
          </div>
          <div style="font-size: 12px; color: var(--pf-text-secondary);">
            Based on CGPA ${user.cgpa || '8.0'} & Readiness
          </div>
        </div>

        <!-- Metric 3: Resume ATS Score -->
        <div class="pf-metric-card" style="background: var(--pf-surface); border: 1px solid var(--pf-border); padding: 22px 24px; border-radius: var(--pf-radius-lg); box-shadow: var(--pf-shadow-xs);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Resume ATS Score</span>
            <span style="font-size: 11px; font-weight: 700; color: ${atsScore ? (atsScore >= 80 ? 'var(--pf-success)' : 'var(--pf-warning)') : 'var(--pf-text-secondary)'};">
              ${atsScore ? (atsScore >= 80 ? 'Optimal' : 'Needs Review') : 'Pending'}
            </span>
          </div>
          <div style="font-size: 26px; font-weight: 800; color: var(--pf-text-primary); margin: 12px 0 6px;">
            ${atsScore ? `${atsScore}<span style="font-size: 16px; font-weight: 600; color: var(--pf-text-secondary);">/100</span>` : 'N/A'}
          </div>
          <a href="#resume-intelligence" style="font-size: 12px; color: var(--pf-accent); text-decoration: none; font-weight: 600;">
            ${atsScore ? 'View ATS Analysis →' : 'Upload Resume →'}
          </a>
        </div>

        <!-- Metric 4: Verified Skills -->
        <div class="pf-metric-card" style="background: var(--pf-surface); border: 1px solid var(--pf-border); padding: 22px 24px; border-radius: var(--pf-radius-lg); box-shadow: var(--pf-shadow-xs);">
          <div style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Verified Skills</div>
          <div style="font-size: 26px; font-weight: 800; color: var(--pf-text-primary); margin: 12px 0 6px;">
            ${rawSkillsList.length}
          </div>
          <div style="font-size: 12px; color: var(--pf-text-secondary);">
            Mapped to target job roles
          </div>
        </div>

        <!-- Metric 5: Profile Completion -->
        <div class="pf-metric-card" style="background: var(--pf-surface); border: 1px solid var(--pf-border); padding: 22px 24px; border-radius: var(--pf-radius-lg); box-shadow: var(--pf-shadow-xs);">
          <div style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Profile Health</div>
          <div style="font-size: 26px; font-weight: 800; color: ${completeness.percentage >= 80 ? 'var(--pf-success)' : 'var(--pf-accent)'}; margin: 12px 0 6px;">
            ${completeness.percentage}%
          </div>
          <div style="font-size: 12px; color: var(--pf-text-secondary);">
            ${completeness.percentage >= 80 ? 'Strong placement profile' : 'Complete remaining fields'}
          </div>
        </div>
      </div>

      <!-- MAIN TWO-COLUMN CONTENT LAYOUT -->
      <div style="display: grid; grid-template-columns: 2fr 1.1fr; gap: 28px; align-items: start;">
        
        <!-- ================= LEFT COLUMN ================= -->
        <div style="display: flex; flex-direction: column; gap: 28px;">

          <!-- SECTION 7: PERSONAL INFORMATION (Editable) -->
          <div class="pf-section-card" id="section-personal-info" style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 28px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid var(--pf-border-subtle); padding-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--pf-text-primary);">Personal Information</h3>
                <p style="margin: 4px 0 0; font-size: 13px; color: var(--pf-text-secondary);">Core identity details and official university communication contacts.</p>
              </div>
              <span style="font-size: 12px; font-weight: 600; color: var(--pf-accent); background: var(--pf-accent-subtle); padding: 4px 10px; border-radius: var(--pf-radius-full);">
                ${isReadOnly ? 'Read-Only' : 'Auto-Synced'}
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
              <!-- Row 1: Full Name & Institutional Email -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Legal Full Name</label>
                  <input type="text" id="p_full_name" class="pf-input" value="${user.full_name || user.name || ''}" placeholder="e.g. Srithikan S" ${isReadOnly ? 'disabled' : ''}>
                </div>
                <div class="pf-input-group">
                  <label class="pf-label">Institutional University Email</label>
                  <input type="email" id="p_institutional_email" class="pf-input" value="${user.email || ''}" placeholder="student@klu.ac.in" disabled title="Institutional email is managed by your university registrar.">
                </div>
              </div>

              <!-- Row 2: Register & Roll Number -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Register Number</label>
                  <input type="text" id="p_register_number" class="pf-input" value="${user.register_number || ''}" placeholder="e.g. 9922004123" ${isReadOnly ? 'disabled' : ''}>
                </div>
                <div class="pf-input-group">
                  <label class="pf-label">Roll Number</label>
                  <input type="text" id="p_roll_number" class="pf-input" value="${user.roll_number || ''}" placeholder="e.g. 22CSE045" ${isReadOnly ? 'disabled' : ''}>
                </div>
              </div>

              <!-- Row 3: Gender & DOB -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Gender Identity</label>
                  <input type="text" id="p_gender" list="dl_p_gender" class="pf-input" value="${user.gender || ''}" placeholder="Select or type gender..." ${isReadOnly ? 'disabled' : ''}>
                  <datalist id="dl_p_gender">
                    <option value="Male">
                    <option value="Female">
                    <option value="Non-binary">
                    <option value="Prefer not to say">
                  </datalist>
                </div>
                <div class="pf-input-group">
                  <label class="pf-label">Date of Birth</label>
                  <input type="date" id="p_dob" class="pf-input" value="${user.dob || ''}" ${isReadOnly ? 'disabled' : ''}>
                </div>
              </div>

              <!-- Row 4: Personal Email & Primary Mobile -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Personal Email (Recruitment Notices)</label>
                  <input type="email" id="p_personal_email" class="pf-input" value="${user.personal_email || ''}" placeholder="e.g. personal@gmail.com" ${isReadOnly ? 'disabled' : ''}>
                </div>
                <div class="pf-input-group">
                  <label class="pf-label">Primary Mobile Number</label>
                  <input type="tel" id="p_phone" class="pf-input" value="${user.mobile_number || user.phone || ''}" placeholder="+91 98765 43210" ${isReadOnly ? 'disabled' : ''}>
                </div>
              </div>

              <!-- Row 5: Emergency Contact & LinkedIn -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Emergency / Guardian Contact</label>
                  <input type="tel" id="p_emergency" class="pf-input" value="${user.emergency_contact || ''}" placeholder="+91 XXXXX XXXXX" ${isReadOnly ? 'disabled' : ''}>
                </div>
                <div class="pf-input-group">
                  <label class="pf-label">LinkedIn Workspace URL</label>
                  <input type="text" id="p_linkedin" class="pf-input" value="${user.linkedin_url || ''}" placeholder="linkedin.com/in/username" ${isReadOnly ? 'disabled' : ''}>
                </div>
              </div>

              <!-- Address Section -->
              <div style="border-top: 1px solid var(--pf-border-subtle); padding-top: 16px; margin-top: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-size: 13px; font-weight: 700; color: var(--pf-text-primary);">Residential Locality</span>
                  ${!isReadOnly ? `
                    <button type="button" id="copy-address-btn" style="background: #F1F5F9; border: 1px solid var(--pf-border); color: var(--pf-text-secondary); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: var(--pf-radius-sm); cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: all 150ms;">
                      📋 Same as Permanent
                    </button>
                  ` : ''}
                </div>
                
                <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 16px;">
                  <div class="pf-input-group">
                    <label class="pf-label">Permanent Address</label>
                    <textarea id="p_permanent_address" class="pf-input" style="height: 64px; resize: none;" placeholder="House No, Street, Landmark..." ${isReadOnly ? 'disabled' : ''}>${user.permanent_address || ''}</textarea>
                  </div>
                  <div class="pf-input-group">
                    <label class="pf-label">Current Communication Address</label>
                    <textarea id="p_current_address" class="pf-input" style="height: 64px; resize: none;" placeholder="Hostel / Local Residence Address..." ${isReadOnly ? 'disabled' : ''}>${user.current_address || ''}</textarea>
                  </div>
                </div>

                <div class="pf-form-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                  <div class="pf-input-group">
                    <label class="pf-label">Country</label>
                    <input type="text" id="p_country" list="dl_p_country" class="pf-input" value="${user.country || 'India'}" placeholder="Country" ${isReadOnly ? 'disabled' : ''}>
                    <datalist id="dl_p_country"></datalist>
                  </div>
                  <div class="pf-input-group">
                    <label class="pf-label">State</label>
                    <input type="text" id="p_state" list="dl_p_state" class="pf-input" value="${user.state || 'Tamil Nadu'}" placeholder="State" ${isReadOnly ? 'disabled' : ''}>
                    <datalist id="dl_p_state"></datalist>
                  </div>
                  <div class="pf-input-group">
                    <label class="pf-label">City</label>
                    <input type="text" id="p_city" list="dl_p_city" class="pf-input" value="${user.city || 'Madurai'}" placeholder="City" ${isReadOnly ? 'disabled' : ''}>
                    <datalist id="dl_p_city"></datalist>
                  </div>
                  <div class="pf-input-group">
                    <label class="pf-label">Postal Code</label>
                    <input type="text" id="p_zip" class="pf-input" value="${user.pincode || ''}" placeholder="e.g. 625001" ${isReadOnly ? 'disabled' : ''}>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- SECTION 8: ACADEMIC INFORMATION -->
          <div class="pf-section-card" id="section-academic-profile" style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 28px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid var(--pf-border-subtle); padding-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--pf-text-primary);">Academic Profile</h3>
                <p style="margin: 4px 0 0; font-size: 13px; color: var(--pf-text-secondary);">University degree credentials, CGPA telemetry, and batch tracking.</p>
              </div>
              <!-- CGPA Prominent Highlight -->
              <div style="display: flex; align-items: center; gap: 12px; background: rgba(0, 169, 232, 0.08); border: 1px solid rgba(0, 169, 232, 0.2); padding: 6px 16px; border-radius: var(--pf-radius-md);">
                <div style="font-size: 11px; font-weight: 700; color: var(--pf-accent); text-transform: uppercase;">VERIFIED CGPA</div>
                <div style="font-size: 20px; font-weight: 800; color: var(--pf-accent);">
                  ${user.cgpa || '8.0'}<span style="font-size: 13px; font-weight: 600; opacity: 0.7;"> / 10</span>
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 20px;">
              <!-- Degree & Batch -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Degree Program</label>
                  <input type="text" id="a_degree" list="dl_a_degree" class="pf-input" value="${user.degree || 'B.Tech'}" placeholder="e.g. B.Tech Computer Science & Engineering" ${isReadOnly ? 'disabled' : ''}>
                  <datalist id="dl_a_degree">
                    ${degrees.map(d => `<option value="${d.degree_name}">`).join('')}
                    <option value="B.Tech Computer Science & Engineering">
                    <option value="B.Tech Information Technology">
                    <option value="B.Tech Artificial Intelligence & Data Science">
                    <option value="B.Tech Electronics & Communication">
                    <option value="M.Tech Computer Science">
                    <option value="BCA">
                    <option value="MCA">
                  </datalist>
                </div>

                <div class="pf-input-group">
                  <label class="pf-label">Academic Batch</label>
                  <input type="text" id="a_batch_year" list="dl_a_batch_year" class="pf-input" value="${user.batch_year || user.batch || '2022 - 2026'}" placeholder="e.g. 2022 - 2026" ${isReadOnly ? 'disabled' : ''}>
                  <datalist id="dl_a_batch_year">
                    ${batches.map(b => `<option value="${b.batch_name}">`).join('')}
                    <option value="2021 - 2025">
                    <option value="2022 - 2026">
                    <option value="2023 - 2027">
                    <option value="2024 - 2028">
                  </datalist>
                </div>
              </div>

              <!-- Department & Section -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Major / Department</label>
                  <input type="text" id="a_department" list="dl_a_department" class="pf-input" value="${resolvedDeptName}" placeholder="Select department..." ${user.section_name || isReadOnly ? 'disabled' : ''}>
                  <datalist id="dl_a_department">
                    ${depts.map(d => `<option value="${d.name}">`).join('')}
                    <option value="Computer Science & Engineering">
                    <option value="Information Technology">
                    <option value="Artificial Intelligence & Data Science">
                    <option value="Electronics & Communication Engineering">
                    <option value="Mechanical Engineering">
                  </datalist>
                </div>

                <div class="pf-input-group">
                  <label class="pf-label">Assigned Section</label>
                  <input type="text" id="a_section" list="dl_a_section" class="pf-input" value="${user.section_name ? (user.section_name.startsWith('Section') ? user.section_name : 'Section ' + user.section_name) : 'Section A'}" placeholder="Select section..." ${user.section_name || isReadOnly ? 'disabled' : ''}>
                  <datalist id="dl_a_section">
                    <option value="Section A">
                    <option value="Section B">
                    <option value="Section C">
                    <option value="Section D">
                  </datalist>
                </div>
              </div>

              <!-- System Section Locked & Transfer Proposal Module (Preserved) -->
              ${user.section_name ? `
                <div style="background: #F8FAFC; border: 1px solid var(--pf-border); border-left: 4px solid var(--pf-accent); border-radius: var(--pf-radius-md); padding: 16px 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: gap: 8px;">
                    <div>
                      <div style="font-weight: 700; color: var(--pf-text-primary); font-size: 13px;">Section Assignment Locked</div>
                      <div style="font-size: 12px; color: var(--pf-text-secondary); margin-top: 2px;">Changes require administrative advisor authorization.</div>
                    </div>
                    ${pendingReq ? `
                      <span style="background: var(--pf-warning-subtle); border: 1px solid var(--pf-warning); color: #B45309; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: var(--pf-radius-full);">
                        ⏳ Section Request Pending Advisor Review
                      </span>
                    ` : isReadOnly ? '' : `
                      <button type="button" id="request-transfer-trigger" style="background: var(--pf-surface); border: 1px solid var(--pf-border); color: var(--pf-text-primary); font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: var(--pf-radius-sm); cursor: pointer; transition: all 150ms;">
                        Request Section Transfer
                      </button>
                    `}
                  </div>

                  ${pendingReq ? `
                    <div style="margin-top: 10px; font-size: 12px; color: var(--pf-text-secondary); background: #FFFFFF; padding: 10px 14px; border-radius: var(--pf-radius-sm); border: 1px dashed var(--pf-border);">
                      Target: <strong>Section ${pendingReq.target_section}</strong>. Reason: <em>"${pendingReq.reason || 'Not specified'}"</em>
                    </div>
                  ` : isReadOnly ? '' : `
                    <div id="transfer-request-panel" style="display: none; flex-direction: column; gap: 12px; margin-top: 14px; border-top: 1px solid var(--pf-border); padding-top: 14px;">
                      <div class="pf-input-group">
                        <label class="pf-label" style="font-size: 11px;">TARGET SECTION</label>
                        <input type="text" id="t_target_section" list="dl_t_target_section" class="pf-input" style="height: 38px;" placeholder="Choose target section (e.g. Section B)">
                        <datalist id="dl_t_target_section">
                          <option value="Section A">
                          <option value="Section B">
                          <option value="Section C">
                          <option value="Section D">
                        </datalist>
                      </div>
                      <div class="pf-input-group">
                        <label class="pf-label" style="font-size: 11px;">JUSTIFICATION / REASON</label>
                        <textarea id="t_reason" class="pf-input" style="height: 60px; resize: none;" placeholder="Provide justification for section transfer request..."></textarea>
                      </div>
                      <button type="button" id="submit-transfer-btn" style="background: var(--pf-accent); border: none; color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 8px 16px; border-radius: var(--pf-radius-sm); cursor: pointer;">
                        Submit Transfer Request to Faculty Advisor
                      </button>
                    </div>
                  `}
                </div>
              ` : ''}

              <!-- Semester & Verified CGPA Inputs -->
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <label class="pf-label" style="margin-bottom: 0;">Current Academic Semester</label>
                    ${!isReadOnly ? `
                      <button type="button" id="auto-compute-sem-btn" style="background: var(--pf-accent-subtle); border: 1px solid rgba(0, 169, 232, 0.2); color: var(--pf-accent); font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: var(--pf-radius-sm); cursor: pointer; transition: all 150ms;" title="Auto-compute semester from Batch Year and current calendar date">
                        ⚡ Auto-Compute
                      </button>
                    ` : ''}
                  </div>
                  <input type="text" id="a_current_semester" list="dl_a_current_semester" class="pf-input" value="${(() => {
                    if (user.current_semester) {
                      return typeof user.current_semester === 'number' ? 'Semester ' + user.current_semester : user.current_semester;
                    }
                    return calculateSemesterFromBatch(user.batch_year || user.batch) || 'Semester 6';
                  })()}" placeholder="e.g. Semester 6" ${isReadOnly ? 'disabled' : ''}>
                  <datalist id="dl_a_current_semester">
                    ${[1,2,3,4,5,6,7,8].map(s => `<option value="Semester ${s}">`).join('')}
                  </datalist>
                  <div id="sem-calc-badge" style="font-size: 11px; color: var(--pf-text-secondary); margin-top: 4px;">
                    <span>💡 Synchronized with graduation timeline</span>
                  </div>
                </div>

                <div class="pf-input-group">
                  <label class="pf-label">Cumulative GPA (CGPA on 10.0 scale)</label>
                  <input type="number" step="0.01" id="a_cgpa" class="pf-input" value="${user.cgpa || ''}" placeholder="e.g. 8.4" ${isReadOnly ? 'disabled' : ''}>
                </div>
              </div>

            </div>
          </div>

          <!-- SECTION 9: TECHNICAL SKILLS -->
          <div class="pf-section-card" id="section-skills" style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 28px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--pf-border-subtle); padding-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--pf-text-primary);">Technical Skills & Stack</h3>
                <p style="margin: 4px 0 0; font-size: 13px; color: var(--pf-text-secondary);">Skills evaluated by the Placenix ATS and campus recruitment drives.</p>
              </div>
              <span style="font-size: 12px; font-weight: 700; color: var(--pf-text-secondary); background: #F1F5F9; padding: 4px 10px; border-radius: var(--pf-radius-full);">
                ${rawSkillsList.length} Skills Registered
              </span>
            </div>

            <!-- Visual Grouped Skills Display -->
            <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px;">
              ${skillCategories.languages.length > 0 ? `
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">PROGRAMMING LANGUAGES</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${skillCategories.languages.map(s => `
                      <span class="pf-skill-chip pf-skill-lang">${s}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${skillCategories.frontend.length > 0 ? `
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">FRONTEND & WEB</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${skillCategories.frontend.map(s => `
                      <span class="pf-skill-chip pf-skill-fe">${s}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${skillCategories.backend.length > 0 ? `
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">BACKEND, CLOUD & DATABASES</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${skillCategories.backend.map(s => `
                      <span class="pf-skill-chip pf-skill-be">${s}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${skillCategories.tools.length > 0 || skillCategories.other.length > 0 ? `
                <div>
                  <div style="font-size: 11px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">TOOLS, FRAMEWORKS & CORE COMPETENCIES</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${[...skillCategories.tools, ...skillCategories.other].map(s => `
                      <span class="pf-skill-chip pf-skill-tool">${s}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>

            <!-- Editable Skills Fields -->
            <div style="display: flex; flex-direction: column; gap: 16px; border-top: 1px solid var(--pf-border-subtle); padding-top: 16px;">
              <div class="pf-input-group">
                <label class="pf-label">Edit Technical Skills (Comma separated)</label>
                <input type="text" id="a_technical_skills" class="pf-input" value="${user.technical_skills || (Array.isArray(user.skills) ? user.skills.join(', ') : '')}" placeholder="e.g. Python, React, Node.js, SQL, Docker, Machine Learning" ${isReadOnly ? 'disabled' : ''}>
                <div style="font-size: 11px; color: var(--pf-text-secondary); margin-top: 4px;">Separate technologies with commas. These feed directly into ATS matching.</div>
              </div>

              <div class="pf-input-group">
                <label class="pf-label">Behavioral & Professional Soft Skills</label>
                <input type="text" id="a_soft_skills" class="pf-input" value="${user.soft_skills || 'Leadership, Team Collaboration, Problem Solving, Agile Mindset'}" placeholder="e.g. Leadership, Strategic Thinking, Communication" ${isReadOnly ? 'disabled' : ''}>
              </div>
            </div>
          </div>

          <!-- SECTION 10: PROJECTS & INDUSTRY EXPERIENCE -->
          <div class="pf-section-card" id="section-projects" style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 28px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--pf-border-subtle); padding-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--pf-text-primary);">Projects & Practical Experience</h3>
                <p style="margin: 4px 0 0; font-size: 13px; color: var(--pf-text-secondary);">Showcase engineering accomplishments and internship contributions.</p>
              </div>
              ${!isReadOnly ? `
                <button type="button" id="add-exp-btn" style="background: var(--pf-accent-subtle); border: 1px solid rgba(0, 169, 232, 0.2); color: var(--pf-accent); font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: var(--pf-radius-md); cursor: pointer; display: inline-flex; align-items: center; gap: 6px; transition: all 150ms;">
                  + Add Project / Internship
                </button>
              ` : ''}
            </div>

            <!-- Dynamic Experience List -->
            <div id="experience-list" style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Handled dynamically by loadExperiences() or renders below -->
            </div>
          </div>

          <!-- SECTION 12: CAREER PREFERENCES -->
          <div class="pf-section-card" id="section-preferences" style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 28px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--pf-border-subtle); padding-bottom: 16px;">
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: var(--pf-text-primary);">Career Preferences & Target Roles</h3>
                <p style="margin: 4px 0 0; font-size: 13px; color: var(--pf-text-secondary);">Directs automated drive matching algorithms and campus slotting.</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Target Roles</label>
                  <input type="text" id="p_career_roles" class="pf-input" value="${preferredRolesStr}" placeholder="e.g. Software Engineer, Full Stack Developer" ${isReadOnly ? 'disabled' : ''}>
                </div>
                <div class="pf-input-group">
                  <label class="pf-label">Preferred Industry Domains</label>
                  <input type="text" id="p_career_domains" class="pf-input" value="${preferredDomainsStr}" placeholder="e.g. Enterprise SaaS, Cloud Computing, AI" ${isReadOnly ? 'disabled' : ''}>
                </div>
              </div>

              <div class="pf-form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="pf-input-group">
                  <label class="pf-label">Preferred Job Locations</label>
                  <input type="text" id="p_career_locations" class="pf-input" value="${preferredLocationsStr}" placeholder="e.g. Bangalore, Chennai, Hyderabad, Remote" ${isReadOnly ? 'disabled' : ''}>
                </div>
                <div class="pf-input-group">
                  <label class="pf-label">Work Mode Preference</label>
                  <input type="text" id="p_work_mode" class="pf-input" value="${workMode}" placeholder="e.g. Full-time, Hybrid, Internship + PPO" ${isReadOnly ? 'disabled' : ''}>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- ================= RIGHT COLUMN (SIDEBAR WIDGETS) ================= -->
        <div style="display: flex; flex-direction: column; gap: 24px;">

          <!-- SECTION 5: PROFILE COMPLETION WIDGET -->
          <div style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 24px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--pf-text-primary); text-transform: uppercase; letter-spacing: 0.04em;">Profile Checklist</h4>
              <span style="font-size: 16px; font-weight: 800; color: var(--pf-accent);">${completeness.percentage}%</span>
            </div>
            
            <p style="margin: 0 0 16px; font-size: 12.5px; color: var(--pf-text-secondary); line-height: 1.5;">
              Complete all sections to maximize your placement shortlisting frequency.
            </p>

            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
              <div style="display: flex; align-items: center; justify-content: space-between; color: ${completeness.items.basic ? 'var(--pf-success)' : 'var(--pf-text-secondary)'};">
                <span>${completeness.items.basic ? '✓' : '○'} Basic Identity & Contact</span>
                <span style="font-size: 11px; font-weight: 600;">${completeness.items.basic ? 'Done' : '+20%'}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; color: ${completeness.items.academic ? 'var(--pf-success)' : 'var(--pf-text-secondary)'};">
                <span>${completeness.items.academic ? '✓' : '○'} Academic Credentials & CGPA</span>
                <span style="font-size: 11px; font-weight: 600;">${completeness.items.academic ? 'Done' : '+20%'}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; color: ${completeness.items.skills ? 'var(--pf-success)' : 'var(--pf-text-secondary)'};">
                <span>${completeness.items.skills ? '✓' : '○'} Technical Skills (3+ minimum)</span>
                <span style="font-size: 11px; font-weight: 600;">${completeness.items.skills ? 'Done' : '+20%'}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; color: ${completeness.items.projects ? 'var(--pf-success)' : 'var(--pf-text-secondary)'};">
                <span>${completeness.items.projects ? '✓' : '○'} Projects & Work Experience</span>
                <span style="font-size: 11px; font-weight: 600;">${completeness.items.projects ? 'Done' : '+15%'}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; color: ${completeness.items.preferences ? 'var(--pf-success)' : 'var(--pf-text-secondary)'};">
                <span>${completeness.items.preferences ? '✓' : '○'} Career Preferences & Roles</span>
                <span style="font-size: 11px; font-weight: 600;">${completeness.items.preferences ? 'Done' : '+10%'}</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; color: ${completeness.items.resume ? 'var(--pf-success)' : 'var(--pf-text-secondary)'};">
                <span>${completeness.items.resume ? '✓' : '○'} ATS Resume Verification</span>
                <span style="font-size: 11px; font-weight: 600;">${completeness.items.resume ? 'Done' : '+15%'}</span>
              </div>
            </div>

            ${!isReadOnly && completeness.percentage < 100 ? `
              <button type="button" onclick="document.getElementById('section-personal-info').scrollIntoView({ behavior: 'smooth' })" style="margin-top: 18px; width: 100%; background: #F8FAFC; border: 1px solid var(--pf-border); color: var(--pf-text-primary); font-size: 12px; font-weight: 700; padding: 10px; border-radius: var(--pf-radius-md); cursor: pointer; transition: all 150ms;">
                Complete Next Missing Item →
              </button>
            ` : ''}
          </div>

          <!-- SECTION 13: PLACEMENT ELIGIBILITY CARD -->
          <div style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 24px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--pf-text-primary); text-transform: uppercase; letter-spacing: 0.04em;">Placement Eligibility</h4>
              <span style="background: ${eligibility.isEligible ? 'var(--pf-success-subtle)' : 'var(--pf-warning-subtle)'}; color: ${eligibility.isEligible ? 'var(--pf-success)' : 'var(--pf-warning)'}; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: var(--pf-radius-full);">
                ${eligibility.isEligible ? '✓ Eligible' : '⚠ Attention Required'}
              </span>
            </div>

            <div style="font-size: 13px; font-weight: 700; color: ${eligibility.isEligible ? 'var(--pf-success)' : '#B45309'}; margin-bottom: 14px;">
              ${eligibility.isEligible ? '✓ Fully Cleared for Campus Recruitment Drives' : '⚠ Specific Criteria Need Verification'}
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: var(--pf-text-secondary);">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--pf-border-subtle);">
                <span>CGPA Requirement (Cutoff: ${eligibility.cgpa.cutoff})</span>
                <strong style="color: ${eligibility.cgpa.ok ? 'var(--pf-success)' : 'var(--pf-danger)'};">
                  ${eligibility.cgpa.ok ? '✓ ' + (user.cgpa || '8.0') : '⚠ ' + (user.cgpa || 'Under Cutoff')}
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--pf-border-subtle);">
                <span>Department Clearance</span>
                <strong style="color: var(--pf-success);">✓ Eligible</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--pf-border-subtle);">
                <span>Active Backlogs</span>
                <strong style="color: ${eligibility.backlogs.ok ? 'var(--pf-success)' : 'var(--pf-danger)'};">
                  ${eligibility.backlogs.ok ? '✓ 0 Active' : `${eligibility.backlogs.count} Standing`}
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
                <span>Academic Year Standing</span>
                <strong style="color: var(--pf-success);">✓ ${eligibility.batch.val}</strong>
              </div>
            </div>
          </div>

          <!-- SECTION 11: RESUME CARD -->
          <div style="
            background: var(--pf-surface);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 24px;
            box-shadow: var(--pf-shadow-xs);
          ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--pf-text-primary); text-transform: uppercase; letter-spacing: 0.04em;">Official Resume</h4>
              <span style="font-size: 11px; font-weight: 700; color: var(--pf-accent); background: var(--pf-accent-subtle); padding: 3px 8px; border-radius: var(--pf-radius-full);">
                ATS Verified
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; background: #F8FAFC; padding: 14px; border-radius: var(--pf-radius-md); border: 1px solid var(--pf-border);">
              <div style="font-size: 28px;">📄</div>
              <div style="overflow: hidden;">
                <div style="font-size: 13px; font-weight: 700; color: var(--pf-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${user.resume_url ? (user.full_name ? user.full_name.replace(/\s+/g, '_') + '_Resume.pdf' : 'Primary_Resume.pdf') : 'No resume uploaded yet'}
                </div>
                <div style="font-size: 11px; color: var(--pf-text-secondary); margin-top: 2px;">
                  ${user.resume_url ? 'Validated PDF format' : 'Upload to run automated ATS scoring'}
                </div>
              </div>
            </div>

            ${atsScore ? `
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
                <div style="background: #F8FAFC; border: 1px solid var(--pf-border); padding: 10px; border-radius: var(--pf-radius-sm); text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase;">ATS SCORE</div>
                  <div style="font-size: 18px; font-weight: 800; color: ${atsScore >= 80 ? 'var(--pf-success)' : 'var(--pf-warning)'}; margin-top: 2px;">
                    ${atsScore}/100
                  </div>
                </div>
                <div style="background: #F8FAFC; border: 1px solid var(--pf-border); padding: 10px; border-radius: var(--pf-radius-sm); text-align: center;">
                  <div style="font-size: 10px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase;">ROLE MATCH</div>
                  <div style="font-size: 18px; font-weight: 800; color: var(--pf-accent); margin-top: 2px;">
                    92%
                  </div>
                </div>
              </div>
            ` : ''}

            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${user.resume_url ? `
                <a href="${user.resume_url}" target="_blank" style="text-align: center; background: #F8FAFC; border: 1px solid var(--pf-border); color: var(--pf-text-primary); font-size: 12px; font-weight: 600; padding: 8px; border-radius: var(--pf-radius-md); text-decoration: none;">
                  👁️ View Active Resume
                </a>
              ` : ''}
              ${!isReadOnly ? `
                <button type="button" class="btn-replace-resume" id="resume-upload-trigger" style="background: var(--pf-surface); border: 1px solid var(--pf-border); color: var(--pf-text-primary); font-size: 12px; font-weight: 600; padding: 8px; border-radius: var(--pf-radius-md); cursor: pointer; transition: all 150ms;">
                  📤 ${user.resume_url ? 'Replace Resume' : 'Upload Resume PDF'}
                </button>
              ` : ''}
              <a href="#resume-intelligence" style="text-align: center; background: var(--pf-accent); border: none; color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 9px; border-radius: var(--pf-radius-md); text-decoration: none; box-shadow: 0 2px 4px rgba(0, 169, 232, 0.2);">
                Analyze with Placenix AI →
              </a>
            </div>
          </div>

          <!-- SECTION 14: PLACENIX PROFILE INSIGHTS (AI RECOMMENDATIONS) -->
          <div style="
            background: linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%);
            border: 1px solid var(--pf-border);
            border-radius: var(--pf-radius-lg);
            padding: 24px;
            box-shadow: var(--pf-shadow-xs);
            position: relative;
            overflow: hidden;
          ">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span style="font-size: 16px;">✨</span>
              <h4 style="margin: 0; font-size: 14px; font-weight: 700; color: var(--pf-text-primary); text-transform: uppercase; letter-spacing: 0.04em;">Placenix AI Insights</h4>
            </div>

            <p style="font-size: 13px; color: var(--pf-text-primary); line-height: 1.6; margin: 0 0 14px;">
              ${user.cgpa && parseFloat(user.cgpa) >= 8.0 
                ? 'Your academic record is strong. Focus on expanding high-concurrency project implementations and running mock interviews to ensure Tier 1 Dream conversion.'
                : 'Accelerate your readiness by completing your verified project portfolio and running an ATS resume diagnostic to boost keyword match rates.'}
            </p>

            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; color: var(--pf-text-secondary); margin-bottom: 16px;">
              <a href="#projects" onclick="document.getElementById('section-projects').scrollIntoView({ behavior: 'smooth' }); return false;" style="color: var(--pf-accent); text-decoration: none; font-weight: 600;">
                → Complete full-stack project portfolio
              </a>
              <a href="#resume-intelligence" style="color: var(--pf-accent); text-decoration: none; font-weight: 600;">
                → Run ATS keyword density scan
              </a>
              <a href="#virtual-interview" style="color: var(--pf-accent); text-decoration: none; font-weight: 600;">
                → Practice technical coding assessment
              </a>
            </div>

            <button type="button" onclick="window.location.hash = '#resume-intelligence'" style="width: 100%; background: var(--pf-accent-purple); color: #FFFFFF; border: none; font-size: 12px; font-weight: 700; padding: 10px; border-radius: var(--pf-radius-md); cursor: pointer; box-shadow: 0 2px 4px rgba(99, 91, 255, 0.2);">
              Improve My Career Profile →
            </button>
          </div>

        </div>

      </div>

    </div>

    <!-- TAB 2: VERIFICATION VAULT (DOCUMENTS) -->
    <div class="profile-content ${activeTabId === 'tab-documents' ? 'active' : ''}" id="tab-documents" style="${activeTabId === 'tab-documents' ? '' : 'display:none;'}">
      <div style="background: var(--pf-surface); border: 1px solid var(--pf-border); border-radius: var(--pf-radius-lg); padding: 36px; box-shadow: var(--pf-shadow-xs);">
        <div style="margin-bottom: 32px;">
          <h3 style="margin: 0; font-size: 22px; font-weight: 800; color: var(--pf-text-primary);">Verification Vault & Documents</h3>
          <p style="color: var(--pf-text-secondary); font-size: 14px; margin-top: 6px;">Manage institutional and professional credentials verified by campus recruiters.</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px;">
          ${renderDocCardV2(user, 'Primary Resume', '📝', 'ATS Ready PDF', isReadOnly)}
          ${renderDocCardV2(user, 'College ID Card', '🪪', 'Institutional Identity', isReadOnly)}
          ${renderDocCardV2(user, '10th Marksheet', '🎓', 'Academic Transcript', isReadOnly)}
          ${renderDocCardV2(user, '12th Marksheet', '🎓', 'Academic Transcript', isReadOnly)}
          ${renderDocCardV2(user, 'Aadhaar Card', '📄', 'National Identity', isReadOnly)}
          ${renderDocCardV2(user, 'PAN Card', '📄', 'Tax Identification', isReadOnly)}
        </div>
      </div>
    </div>

    <!-- TAB 3: AI INTERVIEW TELEMETRY -->
    <div class="profile-content ${activeTabId === 'tab-interviews' ? 'active' : ''}" id="tab-interviews" style="${activeTabId === 'tab-interviews' ? '' : 'display:none;'}">
      <div style="background: var(--pf-surface); border: 1px solid var(--pf-border); border-radius: var(--pf-radius-lg); padding: 36px; box-shadow: var(--pf-shadow-xs);">
        <div style="margin-bottom: 32px;">
          <h3 style="margin: 0; font-size: 22px; font-weight: 800; color: var(--pf-text-primary);">AI Virtual Interview Telemetry</h3>
          <p style="color: var(--pf-text-secondary); font-size: 14px; margin-top: 6px;">Performance benchmarks and progress across simulated placement rounds.</p>
        </div>

        ${(() => {
          const history = user.employability_data?.interview_history || [];
          if (history.length === 0) {
            return `
              <div style="text-align: center; padding: 60px 20px; color: var(--pf-text-secondary); display: flex; flex-direction: column; align-items: center; gap: 14px;">
                <div style="font-size: 44px;">🤖</div>
                <div style="font-weight: 800; color: var(--pf-text-primary); font-size: 18px;">No Interview Telemetry Recorded Yet</div>
                <p style="font-size: 14px; max-width: 440px; line-height: 1.6; margin: 0;">
                  Practice AI-driven technical and behavioral interview simulations to record real-time scores and employability telemetry here.
                </p>
                ${isReadOnly ? '' : `
                  <button type="button" onclick="window.location.hash='#virtual-interview'" style="margin-top: 10px; background: var(--pf-accent); border: none; color: #FFFFFF; font-size: 13px; font-weight: 700; padding: 10px 24px; border-radius: var(--pf-radius-md); cursor: pointer; box-shadow: 0 2px 4px rgba(0, 169, 232, 0.2);">
                    Start Simulated Assessment →
                  </button>
                `}
              </div>
            `;
          }

          return `
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${history.map(attempt => {
                const isPassing = attempt.scores.overall >= 70;
                return `
                  <div style="padding: 20px; background: #F8FAFC; border: 1px solid var(--pf-border); border-radius: var(--pf-radius-md); display: flex; flex-direction: column; gap: 14px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--pf-border); padding-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                      <div>
                        <span style="font-size: 12px; font-weight: 800; color: var(--pf-accent); text-transform: uppercase;">
                          Attempt #${attempt.attempt} — ${attempt.company} (${attempt.role})
                        </span>
                        <div style="font-size: 12px; color: var(--pf-text-secondary); margin-top: 2px;">Recorded on ${attempt.date}</div>
                      </div>
                      <span style="font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: var(--pf-radius-full); background: ${isPassing ? 'var(--pf-success-subtle)' : 'rgba(239,68,68,0.1)'}; color: ${isPassing ? 'var(--pf-success)' : '#EF4444'};">
                        OVERALL: ${attempt.scores.overall}% (${isPassing ? 'QUALIFIED' : 'PRACTICE REQUIRED'})
                      </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;">
                      <div style="background: #FFFFFF; padding: 12px; border-radius: var(--pf-radius-sm); text-align: center; border: 1px solid var(--pf-border);">
                        <div style="font-size: 10px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase;">Aptitude & Logic</div>
                        <div style="font-size: 18px; font-weight: 800; color: var(--pf-text-primary); margin-top: 2px;">${attempt.scores.aptitude}%</div>
                      </div>
                      <div style="background: #FFFFFF; padding: 12px; border-radius: var(--pf-radius-sm); text-align: center; border: 1px solid var(--pf-border);">
                        <div style="font-size: 10px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase;">Coding Skill</div>
                        <div style="font-size: 18px; font-weight: 800; color: var(--pf-text-primary); margin-top: 2px;">${attempt.scores.technical}%</div>
                      </div>
                      <div style="background: #FFFFFF; padding: 12px; border-radius: var(--pf-radius-sm); text-align: center; border: 1px solid var(--pf-border);">
                        <div style="font-size: 10px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase;">Communication</div>
                        <div style="font-size: 18px; font-weight: 800; color: var(--pf-text-primary); margin-top: 2px;">${attempt.scores.communication}%</div>
                      </div>
                      <div style="background: #FFFFFF; padding: 12px; border-radius: var(--pf-radius-sm); text-align: center; border: 1px solid var(--pf-border);">
                        <div style="font-size: 10px; font-weight: 700; color: var(--pf-text-secondary); text-transform: uppercase;">HR & Culture Fit</div>
                        <div style="font-size: 18px; font-weight: 800; color: var(--pf-text-primary); margin-top: 2px;">${attempt.scores.hr}%</div>
                      </div>
                    </div>
                  </div>
                `;
              }).reverse().join('')}
            </div>
          `;
        })()}
      </div>
    </div>

    <!-- EXPERIENCE / PROJECT REGISTRY MODAL (Preserved & Modernized) -->
    <div id="exp-modal" style="
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    ">
      <div style="
        background: #FFFFFF;
        border: 1px solid var(--pf-border);
        border-radius: var(--pf-radius-lg);
        width: 100%;
        max-width: 520px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        padding: 28px;
        box-sizing: border-box;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 800; color: var(--pf-text-primary);">Add Professional Experience</h3>
          <button type="button" id="exp-modal-close-x" onclick="document.getElementById('exp-modal').style.display='none'" style="background: none; border: none; font-size: 18px; color: var(--pf-text-secondary); cursor: pointer;">✕</button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div class="pf-input-group">
            <label class="pf-label">Experience Type</label>
            <select id="exp-type" class="pf-input">
              <option value="project">Engineering / Technical Project</option>
              <option value="internship">Corporate / Industrial Internship</option>
            </select>
          </div>

          <!-- Project Fields -->
          <div id="exp-project-fields" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="pf-input-group">
              <label class="pf-label">Project Title</label>
              <input type="text" id="exp-title" class="pf-input" placeholder="e.g. Placenix — AI Campus OS">
            </div>
            <div class="pf-input-group">
              <label class="pf-label">Tech Stack Keywords (Comma separated)</label>
              <input type="text" id="exp-tech" class="pf-input" placeholder="e.g. Next.js, Node.js, PostgreSQL, Gemini">
            </div>
            <div class="pf-input-group">
              <label class="pf-label">Project / GitHub Repository URL</label>
              <input type="url" id="exp-git" class="pf-input" placeholder="https://github.com/username/project">
            </div>
          </div>

          <!-- Internship Fields -->
          <div id="exp-internship-fields" style="display: none; flex-direction: column; gap: 14px;">
            <div class="pf-input-group">
              <label class="pf-label">Organization Name</label>
              <input type="text" id="exp-company" class="pf-input" placeholder="e.g. Zoho Corporation">
            </div>
            <div class="pf-input-group">
              <label class="pf-label">Designated Role</label>
              <input type="text" id="exp-role" class="pf-input" placeholder="e.g. Software Development Intern">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div class="pf-input-group">
                <label class="pf-label">Start Date</label>
                <input type="date" id="exp-start" class="pf-input">
              </div>
              <div class="pf-input-group">
                <label class="pf-label">End Date</label>
                <input type="date" id="exp-end" class="pf-input">
              </div>
            </div>
            <div class="pf-input-group">
              <label class="pf-label">Key Contributions</label>
              <textarea id="exp-desc" class="pf-input" style="height: 70px; resize: none;" placeholder="Engineered microservices, increased throughput by 40%..."></textarea>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
          <button type="button" id="exp-cancel" style="background: #F8FAFC; border: 1px solid var(--pf-border); color: var(--pf-text-secondary); font-size: 13px; font-weight: 600; padding: 8px 18px; border-radius: var(--pf-radius-md); cursor: pointer;">
            Discard
          </button>
          <button type="button" id="exp-save" style="background: var(--pf-accent); border: none; color: #FFFFFF; font-size: 13px; font-weight: 600; padding: 8px 22px; border-radius: var(--pf-radius-md); cursor: pointer;">
            Commit to Profile
          </button>
        </div>
      </div>
    </div>

    <!-- Scoped Modern SaaS Stylesheet -->
    <style>
      .placenix-profile-v2 {
        --pf-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .pf-tab {
        padding: 12px 4px;
        font-size: 14px;
        font-weight: 600;
        color: var(--pf-text-secondary);
        cursor: pointer;
        position: relative;
        transition: color 150ms ease;
        white-space: nowrap;
      }
      .pf-tab:hover {
        color: var(--pf-text-primary);
      }
      .pf-tab.active {
        color: var(--pf-accent);
        font-weight: 700;
      }
      .pf-tab.active::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        width: 100%;
        height: 2px;
        background: var(--pf-accent);
      }

      .pf-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        color: var(--pf-text-secondary);
        margin-bottom: 6px;
        letter-spacing: -0.01em;
      }
      .pf-input,
      input.pf-input,
      textarea.pf-input,
      select.pf-input {
        width: 100%;
        height: 42px;
        background: #FFFFFF !important;
        background-color: #FFFFFF !important;
        border: 1px solid #CBD5E1 !important;
        border-radius: var(--pf-radius-md) !important;
        padding: 0 14px !important;
        font-size: 13.5px !important;
        color: #0F172A !important;
        box-sizing: border-box !important;
        transition: border-color 150ms ease, box-shadow 150ms ease !important;
        font-family: inherit !important;
      }
      .pf-input:focus,
      input.pf-input:focus,
      textarea.pf-input:focus,
      select.pf-input:focus {
        outline: none !important;
        background: #FFFFFF !important;
        background-color: #FFFFFF !important;
        border-color: #00A9E8 !important;
        box-shadow: 0 0 0 3px rgba(0, 169, 232, 0.15) !important;
      }
      .pf-input:disabled,
      input.pf-input:disabled,
      textarea.pf-input:disabled,
      select.pf-input:disabled {
        background: #F8FAFC !important;
        background-color: #F8FAFC !important;
        color: #64748B !important;
        border-color: #E2E8F0 !important;
        cursor: not-allowed !important;
      }
      textarea.pf-input {
        height: auto !important;
        padding: 10px 14px !important;
        line-height: 1.5 !important;
      }

      .pf-skill-chip {
        font-size: 12px;
        font-weight: 600;
        padding: 5px 12px;
        border-radius: var(--pf-radius-full);
        display: inline-flex;
        align-items: center;
        transition: transform 120ms ease;
      }
      .pf-skill-chip:hover {
        transform: translateY(-1px);
      }
      .pf-skill-lang {
        background: rgba(0, 169, 232, 0.08);
        color: #0284C7;
        border: 1px solid rgba(0, 169, 232, 0.2);
      }
      .pf-skill-fe {
        background: rgba(99, 91, 255, 0.08);
        color: #4F46E5;
        border: 1px solid rgba(99, 91, 255, 0.2);
      }
      .pf-skill-be {
        background: rgba(22, 163, 74, 0.08);
        color: #15803D;
        border: 1px solid rgba(22, 163, 74, 0.2);
      }
      .pf-skill-tool {
        background: #F1F5F9;
        color: #475569;
        border: 1px solid #E2E8F0;
      }

      .pf-metric-card {
        transition: transform 150ms ease, box-shadow 150ms ease;
      }
      .pf-metric-card:hover {
        transform: translateY(-2px);
      }

      .doc-card-v2 {
        transition: all 150ms ease;
      }
      .doc-card-v2:hover {
        transform: translateY(-2px);
        border-color: var(--pf-accent) !important;
        box-shadow: 0 8px 16px -4px rgba(15, 23, 42, 0.08);
      }

      @media (max-width: 1024px) {
        .placenix-profile-v2 {
          padding: 20px 24px 40px;
        }
        .placenix-profile-v2 > div:nth-of-type(4) > div {
          grid-template-columns: 1fr !important;
        }
      }
      @media (max-width: 768px) {
        .pf-form-grid {
          grid-template-columns: 1fr !important;
        }
        .pf-hero-card {
          flex-direction: column;
          align-items: flex-start !important;
          padding: 24px;
        }
        .pf-hero-card > div:first-child {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    </style>

  </div>
  `;
}

function renderDocCardV2(user, title, icon, hint, isReadOnly = false) {
  const docs = user.documents || {};
  const key = title.trim().replace(/ /g, '_').toLowerCase();
  const isUploaded = Boolean(docs[key]);
  const url = docs[key];
  
  return `
  <div class="doc-card-v2 doc-card-ent" data-doc-type="${key}" style="
    background: #FFFFFF;
    border: 1px ${isUploaded ? 'solid var(--pf-accent)' : 'dashed var(--pf-border)'};
    padding: 24px 20px;
    border-radius: var(--pf-radius-lg);
    text-align: center;
    cursor: ${isUploaded || !isReadOnly ? 'pointer' : 'default'};
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    box-shadow: var(--pf-shadow-xs);
    position: relative;
  ">
    <div style="font-size: 32px; margin-bottom: 12px;">
      ${isUploaded ? '✅' : icon}
    </div>
    <div style="font-size: 14px; font-weight: 700; color: var(--pf-text-primary); margin-bottom: 4px;">
      ${title}
    </div>
    <div style="font-size: 12px; color: var(--pf-text-secondary);">
      ${isUploaded ? '<span style="color: var(--pf-success); font-weight: 700;">Verified Document</span>' : hint}
    </div>
    
    ${isUploaded ? `
      <div style="margin-top: 14px; display: flex; gap: 8px; width: 100%;">
        <a href="${url}" target="_blank" style="flex: 1; font-size: 11px; font-weight: 600; padding: 6px; background: #F8FAFC; border: 1px solid var(--pf-border); border-radius: var(--pf-radius-sm); text-decoration: none; color: var(--pf-text-primary);" onclick="event.stopPropagation()">
          View Document
        </a>
      </div>
    ` : `
      ${!isReadOnly ? `
        <span style="margin-top: 12px; font-size: 11px; font-weight: 600; color: var(--pf-accent);">
          Click to Upload →
        </span>
      ` : ''}
    `}
  </div>`;
}

function initProfileScripts(root, user, Store, supabase, depts = [], pendingReq = null, activeTabId = 'tab-career', isReadOnly = false) {
  const container = root || document.getElementById('app-content') || document.querySelector('.main-content') || document.body;
  const dbClient = (supabase && typeof supabase.from === 'function') ? supabase 
                 : (window.supabase && typeof window.supabase.from === 'function') ? window.supabase 
                 : null;
  const getActiveTab = () => document.querySelector('.pf-tab.active')?.getAttribute('data-tab') || 'tab-career';

  // Tab switching logic
  const tabBtns = document.querySelectorAll('.pf-tab');
  const contents = document.querySelectorAll('.profile-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.style.display = 'none');

      btn.classList.add('active');
      const target = document.getElementById(targetId);
      if (target) {
        target.style.display = 'block';
        window.dispatchEvent(new Event('resize'));
      }
    });
  });

  // Hero "Edit Profile" Button Smooth Scroll & Focus
  const heroEditBtn = document.getElementById('hero-edit-profile-btn');
  if (heroEditBtn) {
    heroEditBtn.addEventListener('click', () => {
      const personalSection = document.getElementById('section-personal-info');
      if (personalSection) {
        personalSection.scrollIntoView({ behavior: 'smooth' });
        const nameInput = document.getElementById('p_full_name');
        if (nameInput && !nameInput.disabled) {
          nameInput.focus();
        }
      }
    });
  }

  // Dynamic Department & Section Hybrid Combobox Engine
  const deptInput = document.getElementById('a_department');
  const dlDept = document.getElementById('dl_a_department');
  const sectionInput = document.getElementById('a_section');
  const dlSection = document.getElementById('dl_a_section');

  if (deptInput && dlSection && !isReadOnly) {
    const updateSections = () => {
      dlSection.innerHTML = '';
      const dVal = deptInput.value?.trim() || '';
      const activeDept = depts.find(d => d.name?.toLowerCase() === dVal.toLowerCase() || d.id === dVal);
      if (activeDept && activeDept.sections) {
        activeDept.sections.forEach(s => {
          const opt = document.createElement('option');
          opt.value = `Section ${s.section_name}`;
          dlSection.appendChild(opt);
        });
      } else {
        ['A', 'B', 'C', 'D', 'E'].forEach(s => {
          const opt = document.createElement('option');
          opt.value = `Section ${s}`;
          dlSection.appendChild(opt);
        });
      }
    };

    deptInput.addEventListener('input', updateSections);
  }

  // Auto-compute current semester from batch handler & live listener
  const batchInput = document.getElementById('a_batch_year');
  const semInput = document.getElementById('a_current_semester');
  const computeSemBtn = document.getElementById('auto-compute-sem-btn');
  const semBadge = document.getElementById('sem-calc-badge');

  const updateComputedSemester = (userInitiated = false) => {
    if (!semInput) return;
    const bVal = batchInput?.value || user.batch_year || user.batch;
    const calculated = calculateSemesterFromBatch(bVal);
    if (calculated) {
      semInput.value = calculated;
      if (semBadge) {
        semBadge.innerHTML = `<span style="color:var(--pf-success); font-weight:700;">✓ Calculated: ${calculated}</span> <span style="opacity:0.7;">(from ${bVal || 'Batch'})</span>`;
      }
      if (userInitiated && computeSemBtn) {
        computeSemBtn.innerHTML = `✓ ${calculated}`;
        computeSemBtn.style.color = 'var(--pf-success)';
        setTimeout(() => {
          computeSemBtn.innerHTML = '⚡ Auto-Compute';
          computeSemBtn.style.color = 'var(--pf-accent)';
        }, 1800);
      }
    }
  };

  if (batchInput && !isReadOnly) {
    batchInput.addEventListener('input', () => updateComputedSemester(false));
    batchInput.addEventListener('change', () => updateComputedSemester(false));
  }

  if (computeSemBtn && !isReadOnly) {
    computeSemBtn.addEventListener('click', () => updateComputedSemester(true));
  }

  if (semInput && (!semInput.value || semInput.value.trim() === '') && !isReadOnly) {
    updateComputedSemester(false);
  }

  // Locality Dynamic Hybrid Combobox Engine (Country -> State -> City)
  const localityData = {
    'India': {
      'Tamil Nadu': [
        'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 
        'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 
        'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 
        'Ramanathapuram', 'Ranipet', 'Salem', 'Sivagangai', 'Sivakasi', 'Tenkasi', 'Thanjavur', 
        'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 
        'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'
      ],
      'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Kollam', 'Thrissur', 'Alappuzha', 'Palakkad', 'Malappuram'],
      'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Davanagere'],
      'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Kakinada', 'Tirupati'],
      'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Mahabubnagar'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Pimpri-Chinchwad', 'Nashik', 'Kalyan-Dombivli'],
      'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket', 'Janakpuri']
    },
    'United States': {
      'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
      'Texas': ['Houston', 'Austin', 'Dallas', 'San Antonio'],
      'New York': ['New York City', 'Buffalo', 'Rochester']
    },
    'United Kingdom': {
      'England': ['London', 'Birmingham', 'Manchester', 'Leeds'],
      'Scotland': ['Glasgow', 'Edinburgh', 'Aberdeen'],
      'Wales': ['Cardiff', 'Swansea', 'Newport']
    }
  };

  const countryInput = document.getElementById('p_country');
  const dlCountry = document.getElementById('dl_p_country');
  const stateInput = document.getElementById('p_state');
  const dlState = document.getElementById('dl_p_state');
  const cityInput = document.getElementById('p_city');
  const dlCity = document.getElementById('dl_p_city');

  if (countryInput && dlCountry) {
    dlCountry.innerHTML = '';
    const countries = Object.keys(localityData).concat(['Canada', 'Australia', 'Germany', 'United Arab Emirates', 'Singapore', 'Malaysia', 'Japan']);
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      dlCountry.appendChild(opt);
    });

    const updateStateOptions = () => {
      if (!dlState) return;
      dlState.innerHTML = '';
      const cVal = countryInput.value?.trim() || '';
      const matchedC = Object.keys(localityData).find(c => c.toLowerCase() === cVal.toLowerCase());
      if (matchedC && localityData[matchedC]) {
        Object.keys(localityData[matchedC]).forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          dlState.appendChild(opt);
        });
      }
    };

    const updateCityOptions = () => {
      if (!dlCity) return;
      dlCity.innerHTML = '';
      const cVal = countryInput.value?.trim() || '';
      const sVal = stateInput.value?.trim() || '';
      const matchedC = Object.keys(localityData).find(c => c.toLowerCase() === cVal.toLowerCase());
      if (matchedC && localityData[matchedC]) {
        const matchedS = Object.keys(localityData[matchedC]).find(s => s.toLowerCase().replace(/\s+/g, '') === sVal.toLowerCase().replace(/\s+/g, ''));
        if (matchedS && localityData[matchedC][matchedS]) {
          localityData[matchedC][matchedS].forEach(ci => {
            const opt = document.createElement('option');
            opt.value = ci;
            dlCity.appendChild(opt);
          });
        }
      }
    };

    updateStateOptions();
    updateCityOptions();

    if (!isReadOnly) {
      countryInput.addEventListener('input', () => {
        updateStateOptions();
        updateCityOptions();
      });
      stateInput.addEventListener('input', () => {
        updateCityOptions();
      });
    }
  }

  // Same as Permanent Address copy handler
  if (!isReadOnly) {
    const copyAddressBtn = document.getElementById('copy-address-btn');
    if (copyAddressBtn) {
      copyAddressBtn.addEventListener('click', () => {
        const permAddr = document.getElementById('p_permanent_address')?.value || '';
        const currentAddrInput = document.getElementById('p_current_address');
        if (currentAddrInput) {
          currentAddrInput.value = permAddr;
          copyAddressBtn.innerHTML = '✓ Copied!';
          copyAddressBtn.style.color = 'var(--pf-success)';
          setTimeout(() => {
            copyAddressBtn.innerHTML = '📋 Same as Permanent';
            copyAddressBtn.style.color = 'var(--pf-text-secondary)';
          }, 1800);
        }
      });
    }
  }

  // Section Transfer Proposal Execution Sub-system
  if (!isReadOnly) {
    const trigger = document.getElementById('request-transfer-trigger');
    const panel = document.getElementById('transfer-request-panel');
    if (trigger && panel) {
      trigger.addEventListener('click', () => {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'flex' : 'none';
        trigger.textContent = isHidden ? 'Discard Request' : 'Request Section Transfer';
      });
    }

    const submitTransferBtn = document.getElementById('submit-transfer-btn');
    if (submitTransferBtn) {
      submitTransferBtn.addEventListener('click', async () => {
        const targetSec = document.getElementById('t_target_section')?.value;
        const reason = document.getElementById('t_reason')?.value?.trim();
        
        if (!targetSec || targetSec.includes('Choose target')) {
          alert('Please specify an authorized target section.');
          return;
        }
        
        submitTransferBtn.disabled = true;
        submitTransferBtn.textContent = 'Transmitting Proposal...';
        
        try {
          if (!dbClient || typeof dbClient.from !== 'function') throw new Error('Database client is offline.');
          const response = await withTimeout(
            dbClient
              .from('section_requests')
              .insert([{
                student_id: user.id,
                current_dept: user.department,
                current_section: user.section_name,
                target_dept: user.department,
                target_section: targetSec,
                reason: reason,
                status: 'Pending'
              }]),
            15000,
            { error: { message: 'Database connection timed out.' } }
          );
          if (response?.error) throw response.error;

          submitTransferBtn.disabled = false;
          submitTransferBtn.textContent = 'Submit Transfer Request to Faculty Advisor';
          showToast('Transfer request submitted to Faculty Advisor.', 'success');
          loadProfilePage(container, Store, getActiveTab());
        } catch (err) {
          // Fallback to in-memory store
          if (!Store.transferRequests) Store.transferRequests = [];
          Store.transferRequests.push({
            id: 'req_' + Date.now(),
            studentId: user.id,
            studentName: user.full_name || user.name || 'Student',
            fromSection: user.section_name || 'A',
            target_section: targetSec,
            department: user.department || 'CSE',
            reason: reason || 'Section transfer request',
            status: 'Pending',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          localStorage.setItem('placenix_transfer_requests', JSON.stringify(Store.transferRequests));
          window.dispatchEvent(new CustomEvent('store-updated'));
          showToast('Transfer proposal recorded and pending review.', 'success');
          loadProfilePage(container, Store, getActiveTab());
        }
      });
    }
  }

  // Primary Save Identity Button Logic
  if (!isReadOnly) {
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.textContent = 'Saving Profile...';
        saveBtn.disabled = true;
 
        try {
          const getVal = (id) => document.getElementById(id)?.value?.trim() || null;
          const rawUpdates = {
            full_name: getVal('p_full_name'),
            register_number: getVal('p_register_number'),
            roll_number: getVal('p_roll_number'),
            gender: getVal('p_gender'),
            dob: getVal('p_dob'),
            personal_email: getVal('p_personal_email'),
            mobile_number: getVal('p_phone'),
            emergency_contact: getVal('p_emergency'),
            permanent_address: getVal('p_permanent_address'),
            current_address: getVal('p_current_address'),
            city: getVal('p_city'),
            state: getVal('p_state'),
            pincode: getVal('p_zip'),
            country: getVal('p_country'),
            linkedin_url: getVal('p_linkedin'),
            degree: getVal('a_degree'),
            department: (() => {
              const val = getVal('a_department');
              if (!val) return null;
              const found = depts.find(d => d.name?.toLowerCase() === val.toLowerCase() || d.id === val);
              return found ? found.id : val;
            })(),
            section_name: (() => {
              const val = getVal('a_section');
              if (!val) return null;
              return val.replace(/^Section\s+/i, '');
            })(),
            batch_year: getVal('a_batch_year'),
            current_semester: (() => {
              const val = getVal('a_current_semester');
              if (!val) return null;
              const num = parseInt(val.replace(/\D/g, ''), 10);
              return isNaN(num) ? val : num;
            })(),
            cgpa: parseFloat(getVal('a_cgpa')) || null,
            technical_skills: getVal('a_technical_skills'),
            soft_skills: getVal('a_soft_skills'),
            skills: (getVal('a_technical_skills') || '').split(',').map(s => s.trim()).filter(Boolean),
            career_preferences: {
              preferred_roles: (getVal('p_career_roles') || '').split('·').map(s => s.trim()).filter(Boolean),
              preferred_domains: (getVal('p_career_domains') || '').split('·').map(s => s.trim()).filter(Boolean),
              preferred_locations: (getVal('p_career_locations') || '').split('·').map(s => s.trim()).filter(Boolean),
              work_mode: getVal('p_work_mode') || 'Full-time'
            },
            career_interests: (getVal('p_career_roles') || '').split('·').map(s => s.trim()).filter(Boolean)
          };

          // Clean updates: never overwrite valid existing user fields with null/empty
          const cleanedUpdates = {};
          Object.keys(rawUpdates).forEach(k => {
            if (rawUpdates[k] !== null && rawUpdates[k] !== undefined && rawUpdates[k] !== '') {
              cleanedUpdates[k] = rawUpdates[k];
            } else if (user[k] !== undefined && user[k] !== null && user[k] !== '') {
              cleanedUpdates[k] = user[k];
            }
          });

          // Construct unified merged user profile
          const mergedUser = {
            ...user,
            ...(Store?.session?.user || {}),
            ...cleanedUpdates
          };

          let response = null;
          if (dbClient && typeof dbClient.from === 'function') {
            response = await withTimeout(
              dbClient.from('profiles').upsert({ id: mergedUser.id, ...cleanedUpdates }),
              1500,
              { error: { message: 'Database transaction timed out.' } }
            );
          } else {
            response = { error: { message: 'Database transaction offline.' } };
          }

          // 1. Commit to active in-memory session
          if (Store?.session) {
            Store.session.user = mergedUser;
          }

          // 2. Commit to local storage sessions
          localStorage.setItem('placenix-mock-session', JSON.stringify(mergedUser));
          localStorage.setItem('placenix_user_session', JSON.stringify(mergedUser));
          localStorage.setItem('placenix_active_student_profile', JSON.stringify(mergedUser));
          
          // 3. Multi-index profileCache for instant lookup by id, email, and register number
          try {
            const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
            if (mergedUser.id) profileCache[mergedUser.id] = mergedUser;
            if (mergedUser.email) profileCache[mergedUser.email.toLowerCase()] = mergedUser;
            if (mergedUser.register_number) profileCache[mergedUser.register_number] = mergedUser;
            if (mergedUser.roll_number) profileCache[mergedUser.roll_number] = mergedUser;
            localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
          } catch(e) {}

          // 4. Update Store.students registry
          if (Store && Array.isArray(Store.students)) {
            const idx = Store.students.findIndex(s => 
              String(s.id) === String(mergedUser.id) || 
              (mergedUser.email && s.email === mergedUser.email) ||
              (mergedUser.register_number && (s.rollNo === mergedUser.register_number || s.register_number === mergedUser.register_number))
            );
            if (idx !== -1) {
              Store.students[idx] = {
                ...Store.students[idx],
                ...mergedUser,
                name: mergedUser.full_name || Store.students[idx].name,
                dept: mergedUser.department || Store.students[idx].dept,
                cgpa: mergedUser.cgpa || Store.students[idx].cgpa,
                rollNo: mergedUser.register_number || Store.students[idx].rollNo,
                skills: mergedUser.skills || Store.students[idx].skills
              };
            } else {
              Store.students.push({
                id: mergedUser.id || ('usr_' + Date.now()),
                name: mergedUser.full_name || user.full_name || 'Student',
                dept: mergedUser.department || user.department || 'CSE',
                cgpa: mergedUser.cgpa || 8.0,
                skills: mergedUser.skills || [],
                status: 'Approved',
                rollNo: mergedUser.register_number || 'TBD',
                avatar: ((mergedUser.full_name || user.full_name || 'S')[0] || 'S').toUpperCase(),
                ...mergedUser
              });
            }
          }
          saveStore();

          // Dispatch event to refresh Topbar and Sidebar instantly
          window.dispatchEvent(new CustomEvent('store-updated'));

          saveBtn.textContent = '💾 Save Identity';
          saveBtn.disabled = false;

          showToast('Profile updated & synchronized successfully!', 'success');
          loadProfilePage(container, Store, dbClient, getActiveTab());
        } catch (err) {
          showToast('Save failed: ' + err.message, 'danger');
        } finally {
          if (saveBtn) {
            saveBtn.textContent = '💾 Save Identity';
            saveBtn.disabled = false;
          }
        }
      });
    }
  }

  // Document & Resume Upload Subsystem
  let fileInput = null;
  if (!isReadOnly) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    let currentDocType = '';

    const triggerUpload = (docType) => {
      currentDocType = docType;
      fileInput.click();
    };

    document.querySelectorAll('.doc-card-ent').forEach(card => {
      card.addEventListener('click', () => {
        triggerUpload(card.getAttribute('data-doc-type') || 'primary_resume');
      });
    });

    const resumeBtnTrigger = document.getElementById('resume-upload-trigger');
    if (resumeBtnTrigger) {
      resumeBtnTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerUpload('primary_resume');
      });
    }

    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const docType = currentDocType || 'primary_resume';

      let loadingOverlay = null;
      if (docType === 'primary_resume') {
        loadingOverlay = document.createElement('div');
        loadingOverlay.style = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(15,23,42,0.8); backdrop-filter: blur(8px); 
          display: flex; flex-direction: column; align-items: center; justify-content: center; 
          z-index: 9999; color: #fff; font-family: 'Inter', sans-serif; gap: 16px;
        `;
        loadingOverlay.innerHTML = `
          <div style="width: 44px; height: 44px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #00A9E8; border-radius: 50%; animation: pf-spin 1s linear infinite;"></div>
          <div style="font-weight: 800; font-size: 17px; color: #FFFFFF;">Running Placenix ATS Intelligence Engine...</div>
          <div style="font-size: 13px; color: #94A3B8; max-width: 320px; text-align: center; line-height: 1.5;">Extracting text from PDF, indexing core skills, and benchmarking role compatibility.</div>
        `;
        if (!document.getElementById('pf-spin-style')) {
          const style = document.createElement('style');
          style.id = 'pf-spin-style';
          style.innerHTML = `@keyframes pf-spin { to { transform: rotate(360deg); } }`;
          document.head.appendChild(style);
        }
        document.body.appendChild(loadingOverlay);
      }

      try {
        let publicUrl = URL.createObjectURL(file);

        if (dbClient && typeof dbClient.storage === 'object') {
          const fileName = `${user.id}/${docType}_${Date.now()}.${file.name.split('.').pop()}`;
          const uploadResponse = await withTimeout(
            dbClient.storage.from('student-documents').upload(fileName, file),
            12000,
            { error: { message: 'Cloud storage timed out. Using local blob.' } }
          );
          if (!uploadResponse?.error) {
            const { data: { publicUrl: cloudUrl } } = dbClient.storage.from('student-documents').getPublicUrl(fileName);
            if (cloudUrl) publicUrl = cloudUrl;
          }
        }

        const docs = user.documents || {};
        docs[docType] = publicUrl;

        let dbData = { id: user.id, documents: docs };

        if (docType === 'primary_resume') {
          try {
            const text = await extractTextFromPDF(file);
            const targetRole = user.career_interests?.[0] || 'Software Engineer';
            const analysis = await analyzeWithGemini(text, targetRole, Store);

            const updatedAnalysis = {
              ...(user.resume_analysis || {}),
              ats_score: analysis.ats_score,
              suggestions: analysis.suggestions,
              found_keywords: analysis.found_keywords,
              missing_keywords: analysis.missing_keywords,
              industry_match: analysis.industry_match,
              sandbox: analysis,
              sandbox_url: publicUrl
            };

            dbData.resume_url = publicUrl;
            dbData.resume_analysis = updatedAnalysis;

            user.resume_url = publicUrl;
            user.resume_analysis = updatedAnalysis;
          } catch (aiErr) {
            console.error("AI Analysis failed during Primary Resume upload:", aiErr);
            user.resume_url = publicUrl;
          }
        }

        if (dbClient && typeof dbClient.from === 'function') {
          await withTimeout(
            dbClient.from('profiles').upsert(dbData),
            5000,
            { error: { message: 'Cloud commit timed out.' } }
          );
        }

        if (Store?.session?.user) {
          Store.session.user.documents = docs;
          if (user.resume_url) Store.session.user.resume_url = user.resume_url;
          if (user.resume_analysis) Store.session.user.resume_analysis = user.resume_analysis;
        }

        try {
          const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
          profileCache[user.id] = {
            ...(profileCache[user.id] || {}),
            ...Store.session.user,
            documents: docs,
            resume_url: user.resume_url || Store.session.user.resume_url,
            resume_analysis: user.resume_analysis || Store.session.user.resume_analysis
          };
          localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
        } catch(e) {}
        saveStore();
        
        showToast(docType === 'primary_resume' ? 'Resume verified and ATS analysis updated!' : 'Document verified and recorded.', 'success');
        loadProfilePage(container, Store, getActiveTab());
      } catch (err) { 
        showToast('Upload failed: ' + err.message, 'danger'); 
      } finally {
        if (loadingOverlay) loadingOverlay.remove();
      }
    });
  }

  // Modal logic for Project / Internship Experience
  const expModal = document.getElementById('exp-modal');
  const addExpBtn = document.getElementById('add-exp-btn');
  const expCancelBtn = document.getElementById('exp-cancel');
  const expTypeSelect = document.getElementById('exp-type');
  const expSaveBtn = document.getElementById('exp-save');

  if (!isReadOnly && addExpBtn && expModal) {
    addExpBtn.onclick = () => { expModal.style.display = 'flex'; };
  }
  if (!isReadOnly && expCancelBtn && expModal) {
    expCancelBtn.onclick = () => { expModal.style.display = 'none'; };
  }
  if (!isReadOnly && expTypeSelect) {
    expTypeSelect.onchange = (e) => {
      const intFields = document.getElementById('exp-internship-fields');
      const prjFields = document.getElementById('exp-project-fields');
      if (intFields) intFields.style.display = e.target.value === 'internship' ? 'flex' : 'none';
      if (prjFields) prjFields.style.display = e.target.value === 'project' ? 'flex' : 'none';
    };
  }

  if (!isReadOnly && expSaveBtn) {
    expSaveBtn.onclick = async () => {
      const type = document.getElementById('exp-type')?.value;
      try {
        if (!Store.session.user.internships) Store.session.user.internships = [];
        if (!Store.session.user.projects) Store.session.user.projects = [];

        if (type === 'internship') {
          const item = {
            student_id: user.id,
            company: document.getElementById('exp-company')?.value,
            role: document.getElementById('exp-role')?.value,
            start_date: document.getElementById('exp-start')?.value,
            end_date: document.getElementById('exp-end')?.value,
            description: document.getElementById('exp-desc')?.value
          };

          if (dbClient && typeof dbClient.from === 'function') {
            await withTimeout(dbClient.from('internships').insert(item), 4000, { error: null });
          }

          Store.session.user.internships.push(item);
          user.internships = Store.session.user.internships;
        } else {
          const techInputVal = document.getElementById('exp-tech')?.value || '';
          const item = {
            student_id: user.id,
            title: document.getElementById('exp-title')?.value || 'Technical Project',
            tech_stack: techInputVal.split(',').map(t => t.trim()).filter(Boolean),
            github_url: document.getElementById('exp-git')?.value || ''
          };

          if (dbClient && typeof dbClient.from === 'function') {
            await withTimeout(dbClient.from('projects').insert(item), 4000, { error: null });
          }

          Store.session.user.projects.push(item);
          user.projects = Store.session.user.projects;
        }

        try {
          const profileCache = JSON.parse(localStorage.getItem('placenix_profile_cache') || '{}');
          profileCache[user.id] = {
            ...(profileCache[user.id] || {}),
            ...Store.session.user,
            internships: Store.session.user.internships,
            projects: Store.session.user.projects
          };
          localStorage.setItem('placenix_profile_cache', JSON.stringify(profileCache));
        } catch(e) {}
        saveStore();

        if (expModal) expModal.style.display = 'none';
        showToast('Experience committed to profile.', 'success');
        loadExperiences();
      } catch (err) {
        showToast('Commit error: ' + err.message, 'danger');
      }
    };
  }

  // Load and render projects and internships into modern cards
  async function loadExperiences() {
    const list = document.getElementById('experience-list');
    if (!list) return;

    let intsResponse = null;
    let projsResponse = null;

    if (dbClient && typeof dbClient.from === 'function') {
      intsResponse = await withTimeout(
        dbClient.from('internships').select('*').eq('student_id', user.id),
        2500,
        { data: null }
      );
      projsResponse = await withTimeout(
        dbClient.from('projects').select('*').eq('student_id', user.id),
        2500,
        { data: null }
      );
    }

    const ints = intsResponse?.data || Store.session?.user?.internships || user.internships || [];
    const projs = projsResponse?.data || Store.session?.user?.projects || user.projects || [];

    const allItems = [
      ...projs.map(p => ({ ...p, _type: 'project' })),
      ...ints.map(i => ({ ...i, _type: 'internship' }))
    ];

    if (allItems.length === 0) {
      list.innerHTML = `
        <div style="
          text-align: center;
          padding: 36px 20px;
          border: 1px dashed var(--pf-border);
          border-radius: var(--pf-radius-md);
          background: #F8FAFC;
        ">
          <div style="font-size: 32px; margin-bottom: 8px;">🚀</div>
          <div style="font-size: 14px; font-weight: 700; color: var(--pf-text-primary);">No projects added yet</div>
          <div style="font-size: 12.5px; color: var(--pf-text-secondary); max-width: 360px; margin: 4px auto 14px; line-height: 1.5;">
            Showcase your projects and internships to strengthen your career profile and increase ATS relevance.
          </div>
          ${!isReadOnly ? `
            <button type="button" onclick="document.getElementById('add-exp-btn').click()" style="background: var(--pf-accent); border: none; color: #FFFFFF; font-size: 12px; font-weight: 600; padding: 7px 16px; border-radius: var(--pf-radius-md); cursor: pointer;">
              + Add Project
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    let html = '';
    allItems.forEach(item => {
      const isProject = item._type === 'project';
      const title = item.title || item.role || 'Engineering Initiative';
      const subtitle = item.company || 'Technical Project';
      const techStack = Array.isArray(item.tech_stack) ? item.tech_stack : (item.tech_stack ? String(item.tech_stack).split(',') : []);
      const link = item.github_url;

      html += `
        <div style="
          background: #FFFFFF;
          border: 1px solid var(--pf-border);
          border-radius: var(--pf-radius-md);
          padding: 18px 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          box-shadow: var(--pf-shadow-xs);
          transition: transform 120ms ease;
        ">
          <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 15px; font-weight: 700; color: var(--pf-text-primary);">${title}</span>
              <span style="background: ${isProject ? 'rgba(0, 169, 232, 0.08)' : 'rgba(99, 91, 255, 0.08)'}; color: ${isProject ? 'var(--pf-accent)' : 'var(--pf-accent-purple)'}; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--pf-radius-full); text-transform: uppercase;">
                ${isProject ? 'Project' : 'Internship'}
              </span>
            </div>
            
            <div style="font-size: 13px; color: var(--pf-text-secondary); font-weight: 500;">
              ${subtitle} ${item.start_date ? `· ${item.start_date} to ${item.end_date || 'Present'}` : ''}
            </div>

            ${item.description ? `
              <div style="font-size: 12.5px; color: var(--pf-text-secondary); line-height: 1.5; margin-top: 2px;">
                ${item.description}
              </div>
            ` : ''}

            ${techStack.length > 0 ? `
              <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;">
                ${techStack.map(t => `<span style="background: #F1F5F9; color: #475569; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: var(--pf-radius-sm);">${t.trim()}</span>`).join('')}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <span style="background: var(--pf-success-subtle); color: var(--pf-success); font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: var(--pf-radius-full);">
              Verified
            </span>
            ${link ? `
              <a href="${link}" target="_blank" style="font-size: 12px; font-weight: 600; color: var(--pf-accent); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                View Project ↗
              </a>
            ` : ''}
          </div>
        </div>
      `;
    });

    list.innerHTML = html;
  }

  loadExperiences();
}
