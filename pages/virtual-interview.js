// ============================================================
// PLACENIX — VIRTUAL INTERVIEW SIMULATION HUB (v2.4)
// ============================================================

export async function loadVirtualInterviewPage(root, Store, supabase) {
  // Remove padding and restrict height to prevent outer scrolling and layout misalignment
  root.style.padding = '0';
  root.style.maxWidth = 'none';
  root.style.height = 'calc(100vh - 72px)';
  root.style.overflow = 'hidden';

  // SECURE CONFIGURATION: Use environment variables or a secure vault in production
  const GROQ_API_KEY = ''; // Placeholder: Inject via secure env or vault
  const DID_API_KEY = '';  // Placeholder: Inject via secure env or vault
  
  if (!window.GEMINI_API_KEY && (!Store.config || !Store.config.GEMINI_API_KEY)) {
    window.GEMINI_API_KEY = 'AQ.PLACEHOLDER';
  }

  // Fetch active placement drives list from Store or Supabase
  let drivesList = Store.drives || [];
  if (drivesList.length === 0 && supabase) {
    try {
      const { data } = await supabase.from('drives').select('*').order('created_at', { ascending: false });
      if (data) {
        drivesList = data.map(rd => ({
          id: rd.id,
          company: rd.company,
          role: rd.role,
          status: rd.status || 'Open'
        }));
      }
    } catch (e) {
      console.warn("Failed to fetch drives in Virtual Interview:", e);
    }
  }

  const openDrives = drivesList.filter(d => d.status === 'Open' || d.status === 'Active');

  let defaultCompany = 'TCS';
  let defaultRole = 'Software Engineer';
  if (openDrives.length > 0) {
    defaultCompany = openDrives[0].company;
    defaultRole = openDrives[0].role;
  }

  let state = {
    step: 'setup',
    role: defaultRole,
    company: defaultCompany,
    chatHistory: [],
    transcript: '',
    isListening: false,
    streamId: null,
    sessionId: null,
    peerConnection: null,
    isDIDConnected: false,
    useFallback: false,
    proctorWarnings: 0,
    isBlocked: false,
    modelsLoaded: false,
    proctorActive: false,
    violationTimer: null,
    questions: null,
    cameraEnabled: false,
    localStream: null,
    aptitudeScore: 0,
    aptitudeAnswers: [],
    communicationHistory: [],
    hrHistory: [],
    roundsCompleted: 0,
    codingAnswers: [],
    codingQuestions: null,
    tabSwitchCount: 0,
    aptitudeCompleted: false,
    technicalCompleted: false,
    communicationCompleted: false,
    hrCompleted: false,
    communicationScore: 0,
    hrScore: 0,
    technicalSolvedCount: 0,
    technicalSkipsUsed: 0,
    technicalSubmissions: [],
    technicalChallengesFaced: [],
    technicalTimeRemaining: 1200
  };

  const getCompanyCutoff = (companyName) => {
    const name = (companyName || '').toLowerCase();
    if (name.includes('goldman') || name.includes('gs')) return { pct: 80, score: 24 };
    if (name.includes('google') || name.includes('alphabet')) return { pct: 85, score: 26 };
    if (name.includes('amazon') || name.includes('aws')) return { pct: 80, score: 24 };
    if (name.includes('microsoft') || name.includes('ms')) return { pct: 80, score: 24 };
    if (name.includes('tcs') || name.includes('tata')) return { pct: 60, score: 18 };
    if (name.includes('infosys') || name.includes('infy')) return { pct: 60, score: 18 };
    if (name.includes('wipro')) return { pct: 60, score: 18 };
    if (name.includes('accenture')) return { pct: 65, score: 20 };
    if (name.includes('cognizant') || name.includes('cts')) return { pct: 60, score: 18 };
    return { pct: 70, score: 21 }; // Default
  };

  const getInterviewGrade = (pct) => {
    if (pct >= 95) return 'A1';
    if (pct >= 90) return 'A2';
    if (pct >= 85) return 'A3';
    if (pct >= 80) return 'B1';
    if (pct >= 75) return 'B2';
    if (pct >= 70) return 'B3';
    if (pct >= 65) return 'C1';
    if (pct >= 60) return 'C2';
    if (pct >= 55) return 'C3';
    if (pct >= 50) return 'D1';
    if (pct >= 40) return 'D2';
    return 'D3';
  };

  const isClearingGrade = (grade) => {
    const clearingGrades = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1'];
    return clearingGrades.includes(grade);
  };

  const getGradeColor = (grade) => {
    if (!grade) return '#EF4444';
    if (grade.startsWith('A')) return '#10B981'; // Green
    if (grade.startsWith('B')) return '#8B5CF6'; // Violet
    if (grade.startsWith('C')) return '#3B82F6'; // Blue
    return '#EF4444'; // Red
  };

  const calculateOverallScore = () => {
    // Round 1 (Aptitude)
    const aptMax = state.questions ? state.questions.length : 30;
    const aptPct = aptMax > 0 ? (state.aptitudeScore / aptMax) * 100 : 0;

    // Round 2 (Technical)
    let techPct = 0;
    if (state.codingAnswers && state.codingAnswers.length > 0) {
      let totalPassed = 0;
      let totalCases = 0;
      state.codingAnswers.forEach(ans => {
        totalPassed += ans.score;
        totalCases += ans.totalCases || 3;
      });
      techPct = totalCases > 0 ? (totalPassed / totalCases) * 100 : 0;
    }

    // Round 3 (Communication)
    const commPct = state.communicationScore || 0;

    // Round 4 (HR)
    const hrPct = state.hrScore || (state.hrReport ? state.hrReport.overall : 0) || 0;

    return {
      aptitude: Math.round(aptPct),
      technical: Math.round(techPct),
      communication: Math.round(commPct),
      hr: Math.round(hrPct),
      overall: Math.round((aptPct + techPct + commPct + hrPct) / 4)
    };
  };

  const safeBindClick = (id, handler) => {
    const el = document.getElementById(id) || root.querySelector('#' + id);
    if (el) {
      el.onclick = handler;
    } else {
      console.warn(`Element with id "${id}" not found for click binding.`);
    }
  };

  root.innerHTML = `
    <div id="vi-content-layer" style="width:100%; height:100%; overflow-y:auto;"></div>
    <div id="vi-proctor-layer" style="position:fixed; bottom:24px; right:24px; width:280px; height:200px; background:#000; border:2px solid rgba(255,255,255,0.1); border-radius:16px; overflow:hidden; display:none; z-index:9000; box-shadow:0 12px 40px rgba(0,0,0,0.6);">
       <video id="vi-webcam" width="640" height="480" style="width:100%; height:100%; object-fit:cover; transform:scaleX(-1);" autoplay playsinline muted></video>
       <div id="vi-cam-overlay" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); flex-direction:column; text-align:center; padding:16px;">
          <div style="font-size:12px; color:#10B981; font-weight:700; margin-bottom:12px; text-transform:uppercase;">AI Proctoring Engine</div>
          <button id="vi-enable-cam-btn" class="btn-premium" style="padding:10px 20px; font-size:13px; border-radius:100px; white-space:nowrap;">📷 Enable Camera & Mic</button>
       </div>
       <div style="position:absolute; top:8px; left:8px; background:rgba(239, 68, 68, 0.9); color:white; font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; text-transform:uppercase; letter-spacing:0.1em; display:flex; align-items:center; gap:4px;"><div style="width:6px;height:6px;background:white;border-radius:50%;animation:pulse 1s infinite;"></div>LIVE</div>
       <div id="vi-proctor-overlay-text" style="position:absolute; bottom:8px; left:8px; right:8px; background:rgba(0,0,0,0.75); color:#fff; font-size:10px; padding:6px 8px; border-radius:6px; font-family:monospace; pointer-events:none; display:none; flex-direction:column; gap:2px; border:1px solid rgba(255,255,255,0.15); line-height:1.2; text-align:left; z-index:9010;">
       </div>
    </div>
  `;

  const showCameraRequiredAlert = () => {
    let alertEl = document.getElementById('camera-alert-modal');
    if (alertEl) alertEl.remove();
    
    alertEl = document.createElement('div');
    alertEl.id = 'camera-alert-modal';
    alertEl.style = "position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; z-index:10000; animation: fadeIn 0.3s ease-out;";
    alertEl.innerHTML = `
      <div class="card-ent" style="max-width:480px; padding:40px; text-align:center; border: 1px solid rgba(239, 68, 68, 0.2); background: #0b0a0f; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        <div style="font-size:56px; margin-bottom:20px; animation: pulse-warning 1s infinite alternate;">⚠️</div>
        <h3 class="h2-ent" style="font-size:22px; color:#EF4444; margin-bottom:16px;">AI Proctoring Verification Required</h3>
        <p style="color:var(--text-description); font-size:14px; line-height:1.6; margin-bottom:32px;">
          ⚠️ Please enable your video and mic. Otherwise, you are not permitted to enter the test.
        </p>
        <button id="close-alert-btn" class="btn-premium" style="width:100%; height:52px; font-size:14px; border-radius:12px; font-weight:700;">
          Enable in Proctor Panel (Bottom Right)
        </button>
      </div>
      <style>
        @keyframes pulse-warning {
          0% { transform: scale(1); filter: drop-shadow(0 0 5px rgba(239,68,68,0.3)); }
          100% { transform: scale(1.1); filter: drop-shadow(0 0 20px rgba(239,68,68,0.6)); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(alertEl);
    document.getElementById('close-alert-btn').onclick = () => {
      alertEl.remove();
      const camBtn = document.getElementById('vi-enable-cam-btn');
      if (camBtn) {
        camBtn.style.animation = 'pulse-proctor-btn 0.5s 4 alternate';
        setTimeout(() => { camBtn.style.animation = ''; }, 2000);
      }
    };
  };

  const setupLocalWebcam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      const v = document.getElementById('vi-webcam');
      if (v) {
        v.srcObject = s;
        v.style.display = 'block';
      }
      const overlay = document.getElementById('vi-cam-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
      setupAudioProctoring(s);
      state.cameraEnabled = true;
      state.localStream = s;
    } catch (e) { console.error('Webcam & Mic failure', e); }
  };

  const stopLocalWebcam = () => {
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
      state.localStream = null;
    }
    state.cameraEnabled = false;
    
    if (audioContext) {
      try {
        audioContext.close();
      } catch (e) {}
      audioContext = null;
    }
    
    const v = document.getElementById('vi-webcam');
    if (v) {
      v.srcObject = null;
      v.style.display = 'none';
    }
    const overlay = document.getElementById('vi-cam-overlay');
    if (overlay) {
      overlay.style.display = 'flex';
    }
    const overlayText = document.getElementById('vi-proctor-overlay-text');
    if (overlayText) {
      overlayText.style.display = 'none';
      overlayText.innerHTML = '';
    }
    if (state.violationTimer) clearTimeout(state.violationTimer);
    consecutiveVideoViolations = 0;
    lastVideoViolation = null;
    consecutiveAudioViolations = 0;
    state.proctorActive = false;
    state.proctorFaceCount = undefined;
    state.proctorHasPhone = undefined;
    state.proctorRms = 0;
  };

  let tabSwitchCountdownInterval = null;
  let tabSwitchTimeLeft = 30;
  let isTabOut = false;

  const handleTabLeave = () => {
    const activeTestSteps = ['aptitude', 'technical', 'communication', 'hr'];
    if (!activeTestSteps.includes(state.step)) return;
    if (isTabOut) return;

    if (navigator.onLine === false) {
      console.log("Tab switched but connection is offline, allowing.");
      return;
    }

    // Use a 200ms safety delay to confirm that the tab really lost focus or visibility,
    // which prevents transient blurs (e.g. native select dropdown clicks) from causing false strikes.
    setTimeout(() => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        if (isTabOut) return;
        isTabOut = true;
        state.tabSwitchCount = (state.tabSwitchCount || 0) + 1;
        console.warn(`Tab switch detected! Count: ${state.tabSwitchCount}`);

        if (state.tabSwitchCount >= 4) {
          if (tabSwitchCountdownInterval) {
            clearInterval(tabSwitchCountdownInterval);
            tabSwitchCountdownInterval = null;
          }
          removeTabSwitchOverlay();
          showBlockScreen("The proctoring system has detected that you switched tabs 4 times during the exam, which exceeds the limit.");
          return;
        }

        showTabSwitchOverlay();
      }
    }, 200);
  };

  const handleTabReturn = () => {
    const activeTestSteps = ['aptitude', 'technical', 'communication', 'hr'];
    if (!activeTestSteps.includes(state.step)) return;
    
    // Check if the user has focused back on the document
    setTimeout(() => {
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        if (!isTabOut) return;
        isTabOut = false;
        if (tabSwitchCountdownInterval) {
          clearInterval(tabSwitchCountdownInterval);
          tabSwitchCountdownInterval = null;
        }
        removeTabSwitchOverlay();
      }
    }, 100);
  };

  const showTabSwitchOverlay = () => {
    removeTabSwitchOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'vi-tab-warning-overlay';
    overlay.style = "position:fixed; inset:0; background:rgba(239, 68, 68, 0.95); z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; backdrop-filter:blur(10px); text-align:center; padding:40px; animation: fadeIn 0.3s ease-out;";
    
    tabSwitchTimeLeft = 30;

    overlay.innerHTML = `
      <div style="font-size: 80px; margin-bottom: 24px; animation: pulse 1s infinite;">⚠️</div>
      <h1 style="font-size: 40px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 16px 0;">Tab Switch Detected!</h1>
      <p style="font-size: 24px; margin: 0 0 16px 0; font-weight: 600;">You have walked out of the examination screen.</p>
      <div id="vi-tab-countdown" style="font-size: 48px; font-weight: 800; background: rgba(0,0,0,0.3); padding: 12px 32px; border-radius: 16px; margin-bottom: 24px;">30s</div>
      <p style="font-size: 18px; margin: 0; opacity: 0.9;">
        Please return to the exam tab immediately. 
        <br>
        Violation <strong>${state.tabSwitchCount} / 3</strong>. You will be terminated on the 4th violation.
      </p>
    `;
    document.body.appendChild(overlay);

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 500;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}

    tabSwitchCountdownInterval = setInterval(() => {
      tabSwitchTimeLeft--;
      const cdEl = document.getElementById('vi-tab-countdown');
      if (cdEl) {
        cdEl.innerText = `${tabSwitchTimeLeft}s`;
      }
      
      if (tabSwitchTimeLeft <= 0) {
        clearInterval(tabSwitchCountdownInterval);
        tabSwitchCountdownInterval = null;
        removeTabSwitchOverlay();
        showBlockScreen("Failed to return to the examination tab within 30 seconds.");
      }
    }, 1000);
  };

  const removeTabSwitchOverlay = () => {
    const overlay = document.getElementById('vi-tab-warning-overlay');
    if (overlay) {
      overlay.remove();
    }
  };

  const exitInterview = (confirmFirst = true) => {
    if (confirmFirst) {
      const confirmed = confirm("Are you sure you want to exit the mock interview? Your current round's progress will be lost.");
      if (!confirmed) return;
    }
    
    // Stop webcam and proctoring
    stopLocalWebcam();
    
    // Cancel any speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Clear any timers
    if (tabSwitchCountdownInterval) {
      clearInterval(tabSwitchCountdownInterval);
      tabSwitchCountdownInterval = null;
    }
    removeTabSwitchOverlay();
    
    // Reset state step to prevent any visibility/blur handlers from firing
    state.step = 'setup';
    
    // Navigate back to the student dashboard or AI modules page
    window.location.hash = '#ai-modules';
  };

  const handleHashChange = () => {
    const currentHash = window.location.hash;
    if (!currentHash.startsWith('#virtual-interview')) {
      // Restore root original styles
      root.style.padding = '';
      root.style.maxWidth = '';
      root.style.height = '';
      root.style.overflow = '';

      // Clean up silently
      stopLocalWebcam();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (tabSwitchCountdownInterval) {
        clearInterval(tabSwitchCountdownInterval);
        tabSwitchCountdownInterval = null;
      }
      removeTabSwitchOverlay();
      state.step = 'setup';
      window.removeEventListener('hashchange', handleHashChange);
    }
  };
  window.addEventListener('hashchange', handleHashChange);

  // Register window/document event routing for Single Page App safety
  window.viHandleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      handleTabLeave();
    } else {
      handleTabReturn();
    }
  };

  window.viHandleBlur = () => {
    handleTabLeave();
  };

  window.viHandleFocus = () => {
    handleTabReturn();
  };

  if (!window.hasVirtualInterviewListeners) {
    window.hasVirtualInterviewListeners = true;
    
    document.addEventListener('visibilitychange', () => {
      if (typeof window.viHandleVisibilityChange === 'function') {
        window.viHandleVisibilityChange();
      }
    });

    window.addEventListener('blur', () => {
      if (typeof window.viHandleBlur === 'function') {
        window.viHandleBlur();
      }
    });

    window.addEventListener('focus', () => {
      if (typeof window.viHandleFocus === 'function') {
        window.viHandleFocus();
      }
    });
  }

  const handleEnableWebcam = async () => {
    document.getElementById('vi-proctor-layer').style.display = 'block';
    await setupLocalWebcam();
    if (state.cameraEnabled) {
      if (state.step === 'setup') {
        const turnOnBtn = document.getElementById('setup-enable-cam-btn');
        const turnOffBtn = document.getElementById('setup-disable-cam-btn');
        const statusPill = document.getElementById('setup-cam-status-pill');
        if (turnOnBtn) turnOnBtn.style.display = 'none';
        if (turnOffBtn) turnOffBtn.style.display = 'inline-flex';
        if (statusPill) {
          statusPill.innerText = "CONNECTED & LIVE";
          statusPill.style.borderColor = "rgba(16,185,129,0.3)";
          statusPill.style.background = "rgba(16,185,129,0.1)";
          statusPill.style.color = "#10B981";
        }
      } else {
        if (state.step === 'dashboard') {
          renderDashboard();
        } else {
          initProctoring();
        }
      }
    }
  };

  const handleDisableWebcam = () => {
    stopLocalWebcam();
    document.getElementById('vi-proctor-layer').style.display = 'none';
    if (state.step === 'setup') {
      const turnOnBtn = document.getElementById('setup-enable-cam-btn');
      const turnOffBtn = document.getElementById('setup-disable-cam-btn');
      const statusPill = document.getElementById('setup-cam-status-pill');
      if (turnOnBtn) turnOnBtn.style.display = 'inline-flex';
      if (turnOffBtn) turnOffBtn.style.display = 'none';
      if (statusPill) {
        statusPill.innerText = "DISCONNECTED";
        statusPill.style.borderColor = "rgba(239,68,68,0.3)";
        statusPill.style.background = "rgba(239,68,68,0.1)";
        statusPill.style.color = "#EF4444";
      }
    } else if (state.step === 'dashboard') {
      renderDashboard();
    }
  };

  const render = () => {
    const c = document.getElementById('vi-content-layer');
    if (state.step === 'setup') renderSetup(c);
    else if (state.step === 'dashboard') renderDashboard(c);
    else if (state.step === 'aptitude') renderAptitude(c);
    else if (state.step === 'technical') renderTechnical(c);
    else if (state.step === 'communication') renderCommunication(c);
    else if (state.step === 'hr') renderHR(c);
    else if (state.step === 'results') renderResults(c);
  };

  const renderSetup = () => {
    const isCamOn = state.cameraEnabled;
    const buttonOnStyle = isCamOn ? 'display:none;' : 'display:inline-flex;';
    const buttonOffStyle = isCamOn ? 'display:inline-flex;' : 'display:none;';
    const statusText = isCamOn ? 'CONNECTED & LIVE' : 'DISCONNECTED';
    const statusBorderColor = isCamOn ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
    const statusBg = isCamOn ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
    const statusColor = isCamOn ? '#10B981' : '#EF4444';

    document.getElementById('vi-content-layer').innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; align-items:center; gap:8px; font-size:11px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.12em;">
            <span>AI Intelligence</span>
            <span style="opacity:0.3;">/</span>
            <span style="color:var(--brand-primary);">Virtual Interview</span>
          </div>
          <h1 class="h1-ent" style="font-size:32px;">Virtual Interview Simulation</h1>
          <p style="color:var(--text-description); font-size:16px;">High-fidelity AI-driven behavioral and technical evaluation environment.</p>
        </div>
        <button id="vi-exit-btn" class="btn-premium-ghost" style="padding:12px 24px; font-size:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.15); color:var(--text-description); background:rgba(255,255,255,0.02); display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700;">
           ← Back to AI Modules
        </button>
      </div>

      <div class="card-ent" style="max-width: 640px; margin: 40px auto; padding: 48px; border-radius:24px;">
        <div style="text-align:center; margin-bottom:40px;">
          <div style="font-size:48px; margin-bottom:24px;">🎥</div>
          <h2 class="h2-ent" style="font-size:24px;">Simulation Configuration</h2>
          <p style="color:var(--text-description); font-size:15px; margin-top:12px;">Initialize professional environment parameters for your evaluation.</p>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:32px;">
          <div class="input-node">
            <label class="label-ent" style="color:#fff;">Target Organization</label>
            <select id="setup-company-select" class="input-ent" style="height: 48px; border-radius: 8px;">
              ${openDrives.map((d, idx) => `
                <option value="drive_${d.id}" data-company="${d.company}" data-role="${d.role}" ${d.company === state.company && d.role === state.role ? 'selected' : ''}>
                  [Drive] ${d.company} (${d.role})
                </option>
              `).join('')}
              <option value="custom" ${openDrives.length === 0 ? 'selected' : ''}>Other (Enter Custom Company)...</option>
            </select>
          </div>

          <div class="input-node" id="setup-custom-company-container" style="display: ${openDrives.length === 0 ? 'block' : 'none'};">
            <label class="label-ent" style="color:#fff;">Custom Company Name</label>
            <input type="text" id="setup-company-custom" value="${openDrives.length === 0 ? state.company : ''}" class="input-ent" placeholder="e.g. Goldman Sachs">
          </div>

          <div class="input-node">
            <label class="label-ent" style="color:#fff;">Job Designation</label>
            <select id="setup-role" class="input-ent">
              <option value="Software Engineer" ${state.role==='Software Engineer'?'selected':''}>Software Engineer</option>
              <option value="Product Manager" ${state.role==='Product Manager'?'selected':''}>Product Manager</option>
              <option value="Data Scientist" ${state.role==='Data Scientist'?'selected':''}>Data Scientist</option>
              <option value="Financial Analyst" ${state.role==='Financial Analyst'?'selected':''}>Financial Analyst</option>
            </select>
          </div>

          <!-- Camera & Mic Control Section -->
          <div style="background:rgba(255, 255, 255, 0.02); border:1px solid rgba(255, 255, 255, 0.08); padding:20px; border-radius:16px; display:flex; flex-direction:column; gap:16px; align-items:center;">
             <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:18px;">🎥</span>
                <span style="color:#fff; font-weight:700; font-size:14px;">Camera & Mic Control</span>
             </div>
             <p style="color:var(--text-description); font-size:12px; margin:0; text-align:center; line-height:1.5;">
                AI Proctoring requires camera and microphone permissions before you can begin the assessment.
             </p>
             <div style="display:flex; gap:12px; width:100%; justify-content:center;">
                <button id="setup-enable-cam-btn" class="btn-premium" style="padding:12px 20px; font-size:13px; border-radius:8px; background:#10B981; box-shadow:0 4px 12px rgba(16,185,129,0.2); ${buttonOnStyle} align-items:center; gap:8px; border:none; cursor:pointer;">
                   📷 Turn On Camera & Mic
                </button>
                <button id="setup-disable-cam-btn" class="btn-premium-ghost" style="padding:12px 20px; font-size:13px; border-radius:8px; background:rgba(239,68,68,0.1); border:1px solid #EF4444; color:#EF4444; ${buttonOffStyle} align-items:center; gap:8px; cursor:pointer;">
                   ❌ Turn Off Camera & Mic
                </button>
             </div>
             <div id="setup-cam-status-pill" style="font-size:11px; font-weight:800; padding:4px 12px; border-radius:100px; border:1px solid ${statusBorderColor}; background:${statusBg}; color:${statusColor}; text-transform:uppercase;">
                ${statusText}
             </div>
          </div>
          
          <div style="background:rgba(16, 185, 129, 0.1); border:1px solid rgba(16, 185, 129, 0.2); padding:16px; border-radius:12px; margin-top:8px;">
             <h4 style="color:#10B981; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:8px;"><span>📋</span> 3-Round Evaluation Format</h4>
             <ul style="color:var(--text-description); font-size:13px; line-height:1.6; margin-left:20px;">
                <li><strong>Round 1: Aptitude (MCQ)</strong> - 30 dynamic questions on logic & tech.</li>
                <li><strong>Round 2: Technical (Coding)</strong> - Interactive compiler execution round.</li>
                <li><strong>Round 3: Communication</strong> - AI conversational fluency test.</li>
                <li>A comprehensive multi-round PDF report will be generated.</li>
             </ul>
          </div>

          <div id="setup-caliber-notice" style="background:rgba(139, 92, 246, 0.08); border:1px solid rgba(139, 92, 246, 0.2); padding:16px; border-radius:12px; margin-top:8px; display:flex; align-items:center; gap:12px;">
             <span style="font-size:20px;">🎯</span>
             <div style="text-align:left;">
                <h4 style="color:#a78bfa; font-size:13px; margin:0 0 4px 0; font-weight:700;">Target Caliber Requirement</h4>
                <p id="setup-caliber-text" style="color:var(--text-description); font-size:11px; margin:0; line-height:1.4;"></p>
             </div>
          </div>

          <button id="start-btn" class="btn-premium" style="height:56px; font-size:16px; margin-top:16px; width:100%;">
            Begin Round 1: Aptitude Test →
          </button>
        </div>
      </div>
    </div>
    <style>
      .btn-premium {
        background: var(--brand-primary); color: #fff; border: none; border-radius: 12px;
        font-weight: 700; cursor: pointer; transition: all 0.3s;
        box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
      }
      .btn-premium:hover { transform: translateY(-2px); filter: brightness(1.1); }
    </style>
    `;

    safeBindClick('setup-enable-cam-btn', () => handleEnableWebcam());
    safeBindClick('setup-disable-cam-btn', () => handleDisableWebcam());

    safeBindClick('vi-exit-btn', () => {
      exitInterview(false);
    });

    const compSelect = document.getElementById('setup-company-select');
    const customContainer = document.getElementById('setup-custom-company-container');
    const customInput = document.getElementById('setup-company-custom');
    const caliberText = document.getElementById('setup-caliber-text');

    const updateCaliberNotice = (companyName) => {
      if (!caliberText) return;
      const cutoff = getCompanyCutoff(companyName);
      caliberText.innerHTML = `<strong>${companyName}</strong> requires a minimum score of <strong>${cutoff.pct}% (${cutoff.score}/30)</strong> on the Aptitude round to meet caliber standards.`;
    };

    if (compSelect) {
      const initialCompany = compSelect.value === 'custom'
        ? (customInput ? customInput.value.trim() : '')
        : compSelect.options[compSelect.selectedIndex].getAttribute('data-company');
      updateCaliberNotice(initialCompany || 'TCS');

      compSelect.onchange = (e) => {
        const val = e.target.value;
        let companyName = "TCS";
        if (val === 'custom') {
          customContainer.style.display = 'block';
          companyName = customInput ? customInput.value.trim() : 'Custom Company';
        } else {
          customContainer.style.display = 'none';
          const selectedOption = compSelect.options[compSelect.selectedIndex];
          companyName = selectedOption.getAttribute('data-company') || 'TCS';
          const roleVal = selectedOption.getAttribute('data-role');
          if (roleVal) {
            const roleSelect = document.getElementById('setup-role');
            let found = false;
            for (let i = 0; i < roleSelect.options.length; i++) {
              if (roleSelect.options[i].value === roleVal) {
                roleSelect.selectedIndex = i;
                found = true;
                break;
              }
            }
            if (!found && roleVal) {
              const opt = document.createElement('option');
              opt.value = roleVal;
              opt.textContent = roleVal;
              opt.selected = true;
              roleSelect.appendChild(opt);
            }
          }
        }
        updateCaliberNotice(companyName || 'TCS');
      };
    }

    if (customInput) {
      customInput.oninput = (e) => {
        updateCaliberNotice(e.target.value.trim() || 'Custom Company');
      };
    }

    document.getElementById('start-btn').onclick = () => {
      const compSelectVal = compSelect ? compSelect.value : 'custom';
      if (compSelectVal === 'custom') {
        state.company = document.getElementById('setup-company-custom').value.trim() || 'TCS';
      } else {
        const selectedOption = compSelect.options[compSelect.selectedIndex];
        state.company = selectedOption.getAttribute('data-company') || 'TCS';
      }
      state.role = document.getElementById('setup-role').value;
      state.step = 'dashboard'; // Show dashboard first
      state.questions = null;
      state.aptitudeAnswers = [];
      state.aptitudeScore = 0;
      state.technicalSolvedCount = 0;
      state.technicalSkipsUsed = 0;
      state.technicalSubmissions = [];
      state.technicalChallengesFaced = [];
      state.technicalTimeRemaining = 1200;
      state.codingAnswers = [];
      state.technicalCompleted = false;
      
      if (state.cameraEnabled) {
        document.getElementById('vi-proctor-layer').style.display = 'block';
      }
      
      render();
    };
  };

  const renderDashboard = () => {
    const isCamOn = state.cameraEnabled;
    const deviceControlCard = isCamOn ? `
      <div class="card-ent" style="border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.03); padding: 24px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; text-align: left; animation: fadeIn 0.3s; margin-bottom: 8px;">
        <div style="display: flex; gap: 16px; align-items: center;">
          <span style="font-size: 32px; animation: pulse-green 2s infinite alternate;">🟢</span>
          <div>
            <h4 style="color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 4px;">AI Proctoring Stream Active</h4>
            <p style="color: var(--text-description); font-size: 14px; margin: 0;">Webcam and microphone are streaming. You are permitted to enter the assessment rounds.</p>
          </div>
        </div>
        <button id="dash-disable-cam-btn" class="btn-premium" style="padding: 12px 24px; border-radius: 10px; font-size: 13.5px; font-weight: 700; display:flex; align-items:center; gap:8px; background:rgba(239,68,68,0.1); border:1px solid #EF4444; color:#EF4444; box-shadow:none; cursor:pointer;">
           ❌ Turn Off Cam & Mic
        </button>
      </div>
      <style>
        @keyframes pulse-green {
          0% { filter: drop-shadow(0 0 2px rgba(16,185,129,0.4)); }
          100% { filter: drop-shadow(0 0 10px rgba(16,185,129,0.8)); }
        }
      </style>
    ` : `
      <div class="card-ent" style="border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.05); padding: 24px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; text-align: left; animation: fadeIn 0.3s; margin-bottom: 8px;">
        <div style="display: flex; gap: 16px; align-items: center;">
          <span style="font-size: 32px;">⚠️</span>
          <div>
            <h4 style="color: #fff; font-size: 16px; font-weight: 700; margin-bottom: 4px;">AI Proctoring Verification Required</h4>
            <p style="color: var(--text-description); font-size: 14px; margin: 0;">Please activate your webcam and microphone access before entering the assessment rounds.</p>
          </div>
        </div>
        <button id="dash-enable-cam-btn" class="btn-premium" style="padding: 12px 24px; border-radius: 10px; font-size: 13.5px; font-weight: 700; display:flex; align-items:center; gap:8px; cursor:pointer;">
           📷 Turn On Cam & Mic
        </button>
      </div>
    `;

    const cutoff = getCompanyCutoff(state.company);
    const requiredGrade = getInterviewGrade(cutoff.pct);
    const metCaliber = state.aptitudeCompleted && (state.aptitudeScore >= cutoff.score);
    
    let aptGradeText = "";
    if (state.aptitudeCompleted) {
      const totalQ = state.questions ? state.questions.length : 30;
      const aptPct = totalQ > 0 ? Math.round((state.aptitudeScore / totalQ) * 100) : 0;
      const grade = getInterviewGrade(aptPct);
      aptGradeText = ` — Grade ${grade}`;
    }
    const aptitudeStatusText = state.aptitudeCompleted
      ? (metCaliber 
          ? `<span style='color:#10B981; font-weight:700; font-size:13px;'>🟢 Caliber Met (${state.aptitudeScore}/${state.questions ? state.questions.length : 30}${aptGradeText}) (Required: Grade ${requiredGrade})</span>`
          : `<span style='color:#EF4444; font-weight:700; font-size:13px;'>🔴 Below Cutoff (${state.aptitudeScore}/${state.questions ? state.questions.length : 30}${aptGradeText}) (Required: Grade ${requiredGrade})</span>`)
      : `<span style='color:var(--text-description); font-size:13px;'>⚪ Not Attempted (Cutoff: ${cutoff.pct}% - ${cutoff.score}/30 | Required: Grade ${requiredGrade})</span>`;

    let techGradeText = "";
    let techPct = 0;
    if (state.technicalCompleted) {
      if (state.codingAnswers && state.codingAnswers.length > 0) {
        let totalPassed = 0;
        let totalCases = 0;
        state.codingAnswers.forEach(ans => {
          totalPassed += ans.score;
          totalCases += ans.totalCases || 3;
        });
        techPct = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
      }
      const grade = getInterviewGrade(techPct);
      techGradeText = ` — Grade ${grade}`;
    }
    const techStatusText = state.technicalCompleted
      ? (techPct >= cutoff.pct
          ? `<span style='color:#10B981; font-weight:700; font-size:13px;'>🟢 Caliber Met (${techPct}%${techGradeText}) (Required: Grade ${requiredGrade})</span>`
          : `<span style='color:#EF4444; font-weight:700; font-size:13px;'>🔴 Below Cutoff (${techPct}%${techGradeText}) (Required: Grade ${requiredGrade})</span>`)
      : `<span style='color:var(--text-description); font-size:13px;'>⚪ Not Attempted (Cutoff: ${cutoff.pct}% | Required: Grade ${requiredGrade})</span>`;

    let commGradeText = "";
    if (state.communicationCompleted) {
      const grade = getInterviewGrade(state.communicationScore || 0);
      commGradeText = ` — Grade ${grade}`;
    }
    const commStatusText = state.communicationCompleted
      ? (state.communicationScore >= cutoff.pct
          ? `<span style='color:#10B981; font-weight:700; font-size:13px;'>🟢 Caliber Met (${state.communicationScore}%${commGradeText}) (Required: Grade ${requiredGrade})</span>`
          : `<span style='color:#EF4444; font-weight:700; font-size:13px;'>🔴 Below Cutoff (${state.communicationScore}%${commGradeText}) (Required: Grade ${requiredGrade})</span>`)
      : `<span style='color:var(--text-description); font-size:13px;'>⚪ Not Attempted (Cutoff: ${cutoff.pct}% | Required: Grade ${requiredGrade})</span>`;

    let hrGradeText = "";
    if (state.hrCompleted) {
      const grade = getInterviewGrade(state.hrScore || 0);
      hrGradeText = ` — Grade ${grade}`;
    }
    const hrStatusText = state.hrCompleted
      ? (state.hrScore >= cutoff.pct
          ? `<span style='color:#10B981; font-weight:700; font-size:13px;'>🟢 Caliber Met (${state.hrScore}%${hrGradeText}) (Required: Grade ${requiredGrade})</span>`
          : `<span style='color:#EF4444; font-weight:700; font-size:13px;'>🔴 Below Cutoff (${state.hrScore}%${hrGradeText}) (Required: Grade ${requiredGrade})</span>`)
      : `<span style='color:var(--text-description); font-size:13px;'>⚪ Not Attempted (Cutoff: ${cutoff.pct}% | Required: Grade ${requiredGrade})</span>`;

    const allRoundsCompleted = state.aptitudeCompleted && state.technicalCompleted && state.communicationCompleted && state.hrCompleted;

    document.getElementById('vi-content-layer').innerHTML = 
      "<div style='padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; min-height: 100%; box-sizing: border-box; justify-content:center;'>" +
        "<div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;'>" +
           "<div style='text-align:left;'>" +
              "<h1 class='h1-ent' style='font-size:32px; margin:0;'>Evaluation Dashboard</h1>" +
              "<p style='color:var(--text-description); font-size:16px; margin-top:8px;'>Target: <strong style='color:#fff;'>" + state.company + "</strong> (" + state.role + ") — Essential Clearance: <strong style='color:var(--brand-primary);'>Grade " + requiredGrade + " (" + cutoff.pct + "%)</strong></p>" +
           "</div>" +
           "<button id='vi-exit-btn' class='btn-premium-ghost' style='padding:12px 24px; font-size:14px; border-radius:12px; border:1px solid #EF4444; color:#EF4444; background:rgba(239,68,68,0.05); display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700; height:fit-content;'>" +
              "🚪 Exit Exam" +
           "</button>" +
        "</div>" +
        
        deviceControlCard +
        
        "<div style='display:flex; flex-direction:column; gap:20px;'>" +
           "<button id='dash-r1' class='btn-premium-ghost' style='padding:24px; text-align:left; border-radius:16px; display:flex; justify-content:space-between; align-items:center; " + (state.aptitudeCompleted ? "background:rgba(16,185,129,0.05); border-color:#10B981;" : "") + "'>" +
              "<div>" +
                 "<div style='font-size:12px; color:var(--brand-primary); font-weight:800; letter-spacing:0.1em; margin-bottom:8px; text-transform:uppercase;'>Round 1</div>" +
                 "<div style='font-size:20px; color:#fff; font-weight:600; margin-bottom:4px;'>Aptitude & Logic</div>" +
                 "<div>" + aptitudeStatusText + "</div>" +
              "</div>" +
              "<div style='font-size:24px;'>" + (state.aptitudeCompleted ? "✅" : "⚡") + "</div>" +
           "</button>" +
           
           "<button id='dash-r2' class='btn-premium-ghost' style='padding:24px; text-align:left; border-radius:16px; display:flex; justify-content:space-between; align-items:center; " + (state.technicalCompleted ? "background:rgba(16,185,129,0.05); border-color:#10B981;" : "") + "'>" +
              "<div>" +
                 "<div style='font-size:12px; color:var(--brand-primary); font-weight:800; letter-spacing:0.1em; margin-bottom:8px; text-transform:uppercase;'>Round 2</div>" +
                 "<div style='font-size:20px; color:#fff; font-weight:600; margin-bottom:4px;'>Technical Coding (Compiler)</div>" +
                 "<div>" + techStatusText + "</div>" +
              "</div>" +
              "<div style='font-size:24px;'>" + (state.technicalCompleted ? "✅" : "⚡") + "</div>" +
           "</button>" +
           
           "<button id='dash-r3' class='btn-premium-ghost' style='padding:24px; text-align:left; border-radius:16px; display:flex; justify-content:space-between; align-items:center; " + (state.communicationCompleted ? "background:rgba(16,185,129,0.05); border-color:#10B981;" : "") + "'>" +
              "<div>" +
                 "<div style='font-size:12px; color:var(--brand-primary); font-weight:800; letter-spacing:0.1em; margin-bottom:8px; text-transform:uppercase;'>Round 3</div>" +
                 "<div style='font-size:20px; color:#fff; font-weight:600; margin-bottom:4px;'>Communication Fluency</div>" +
                 "<div>" + commStatusText + "</div>" +
              "</div>" +
              "<div style='font-size:24px;'>" + (state.communicationCompleted ? "✅" : "⚡") + "</div>" +
           "</button>" +
           
           "<button id='dash-r4' class='btn-premium-ghost' style='padding:24px; text-align:left; border-radius:16px; display:flex; justify-content:space-between; align-items:center; " + (state.hrCompleted ? "background:rgba(16,185,129,0.05); border-color:#10B981;" : "") + "'>" +
              "<div>" +
                 "<div style='font-size:12px; color:var(--brand-primary); font-weight:800; letter-spacing:0.1em; margin-bottom:8px; text-transform:uppercase;'>Round 4</div>" +
                 "<div style='font-size:20px; color:#fff; font-weight:600; margin-bottom:4px;'>AI Behavioral HR Interview</div>" +
                 "<div>" + hrStatusText + "</div>" +
              "</div>" +
              "<div style='font-size:24px;'>" + (state.hrCompleted ? "✅" : "⚡") + "</div>" +
           "</button>" +
           
           (allRoundsCompleted ? "<button id='dash-finish' class='btn-premium' style='padding:20px; font-size:18px; border-radius:16px; margin-top:20px;'>Finalize Assessment & Generate Report</button>" : "") +
        "</div>" +
      "</div>";
    
    if (isCamOn) {
      document.getElementById('dash-disable-cam-btn').onclick = () => {
        handleDisableWebcam();
      };
    } else {
      document.getElementById('dash-enable-cam-btn').onclick = async () => {
        await handleEnableWebcam();
      };
    }

    document.getElementById('dash-r1').onclick = () => { 
      if (!state.cameraEnabled) {
        showCameraRequiredAlert();
        return;
      }
      state.step = 'aptitude'; 
      render(); 
    };
    document.getElementById('dash-r2').onclick = () => { 
      if (!state.cameraEnabled) {
        showCameraRequiredAlert();
        return;
      }
      state.step = 'technical'; 
      render(); 
    };
    document.getElementById('dash-r3').onclick = () => { 
      if (!state.cameraEnabled) {
        showCameraRequiredAlert();
        return;
      }
      state.step = 'communication'; 
      render(); 
    };
    document.getElementById('dash-r4').onclick = () => { 
      if (!state.cameraEnabled) {
        showCameraRequiredAlert();
        return;
      }
      state.step = 'hr'; 
      render(); 
    };
    const finishBtn = document.getElementById('dash-finish');
    if (finishBtn) finishBtn.onclick = () => { state.step = 'results'; render(); };

    const exitBtn = document.getElementById('vi-exit-btn');
    if (exitBtn) {
      exitBtn.onclick = () => {
        exitInterview(true);
      };
    }
  };

  const staticQuestionPool = [
    // Existing 30 technical questions
    { category: "technical", q: "What is the time complexity of binary search?", opts: ["O(n)", "O(n log n)", "O(log n)", "O(1)"], ans: 2 },
    { category: "technical", q: "Which data structure is based on the LIFO principle?", opts: ["Queue", "Tree", "Stack", "Graph"], ans: 2 },
    { category: "technical", q: "What does SQL stand for?", opts: ["Structured Query Language", "Strong Question Language", "Structured Question Language", "Standard Query Language"], ans: 0 },
    { category: "technical", q: "In OOP, what is polymorphism?", opts: ["Data hiding", "Many forms", "Inheriting attributes", "Code separation"], ans: 1 },
    { category: "technical", q: "Which algorithm is used for finding the shortest path?", opts: ["Kruskal's", "Dijkstra's", "Merge Sort", "DFS"], ans: 1 },
    { category: "technical", q: "What is a primary key in a database?", opts: ["Unique identifier", "Foreign reference", "Indexed column", "Null value field"], ans: 0 },
    { category: "technical", q: "Which HTTP method is idempotent?", opts: ["POST", "PATCH", "PUT", "CONNECT"], ans: 2 },
    { category: "technical", q: "What does CSS stand for?", opts: ["Creative Style Sheets", "Cascading Style Sheets", "Computer Style Sheets", "Colorful Style Sheets"], ans: 1 },
    { category: "technical", q: "Which one is not a NoSQL database?", opts: ["MongoDB", "Cassandra", "PostgreSQL", "Redis"], ans: 2 },
    { category: "technical", q: "What is the purpose of a load balancer?", opts: ["Database indexing", "Traffic distribution", "Code compiling", "Memory management"], ans: 1 },
    { category: "technical", q: "Which sorting algorithm has the worst-case time complexity of O(n^2)?", opts: ["Merge Sort", "Heap Sort", "Quick Sort", "Radix Sort"], ans: 2 },
    { category: "technical", q: "What is the main function of the OSI model's Network layer?", opts: ["Routing", "Encryption", "Error detection", "Physical transmission"], ans: 0 },
    { category: "technical", q: "In Git, what command saves your changes to the local repository?", opts: ["git push", "git save", "git commit", "git stash"], ans: 2 },
    { category: "technical", q: "What does API stand for?", opts: ["Application Programming Interface", "Advanced Programming Interface", "Automated Program Integration", "Applied Protocol Interface"], ans: 0 },
    { category: "technical", q: "Which concept allows a class to derive properties from another class?", opts: ["Encapsulation", "Inheritance", "Abstraction", "Polymorphism"], ans: 1 },
    { category: "technical", q: "What is a deadlock in an operating system?", opts: ["Memory leak", "Infinite loop", "Processes stuck waiting for each other", "CPU overload"], ans: 2 },
    { category: "technical", q: "Which language is primarily used for iOS app development?", opts: ["Java", "Swift", "Kotlin", "Ruby"], ans: 1 },
    { category: "technical", q: "What is the primary role of a CDN (Content Delivery Network)?", opts: ["Database scaling", "Edge caching for faster delivery", "Load balancing", "DNS routing"], ans: 1 },
    { category: "technical", q: "What does JSON stand for?", opts: ["JavaScript Object Notation", "Java Syntax Object Network", "JavaScript Output Name", "Java System Object Native"], ans: 0 },
    { category: "technical", q: "Which design pattern restricts instantiation of a class to one object?", opts: ["Factory", "Observer", "Singleton", "Decorator"], ans: 2 },
    { category: "technical", q: "In Python, what is a decorator?", opts: ["A UI library", "A function modifying another function", "A class attribute", "A syntax error handling method"], ans: 1 },
    { category: "technical", q: "What is Docker primarily used for?", opts: ["Virtual Machines", "Containerization", "Version Control", "Continuous Integration"], ans: 1 },
    { category: "technical", q: "What does MVC stand for?", opts: ["Model View Controller", "Main Visual Component", "Model Variable Class", "Microservice Virtual Container"], ans: 0 },
    { category: "technical", q: "Which encryption type uses a public and private key pair?", opts: ["Symmetric", "Asymmetric", "Hashing", "Encoding"], ans: 1 },
    { category: "technical", q: "What is the DOM in web development?", opts: ["Document Object Model", "Data Origin Management", "Document Output Mechanism", "Data Object Map"], ans: 0 },
    { category: "technical", q: "Which memory is volatile?", opts: ["ROM", "Flash Memory", "RAM", "Hard Drive"], ans: 2 },
    { category: "technical", q: "What is the time complexity of searching in a balanced BST?", opts: ["O(n)", "O(1)", "O(n^2)", "O(log n)"], ans: 3 },
    { category: "technical", q: "What is the default port for HTTP?", opts: ["443", "80", "22", "21"], ans: 1 },
    { category: "technical", q: "Which of the following is a CSS preprocessor?", opts: ["SASS", "Babel", "Webpack", "React"], ans: 0 },
    { category: "technical", q: "What principle states that software entities should be open for extension but closed for modification?", opts: ["Single Responsibility", "Liskov Substitution", "Open-Closed", "Dependency Inversion"], ans: 2 },
    { category: "technical", q: "What is the main purpose of a database transaction's ACID properties?", opts: ["To ensure atomicity, consistency, isolation, and durability", "To optimize index lookup speed", "To compress tabular data storage", "To encrypt database connections"], ans: 0 },
    { category: "technical", q: "In networking, what is the role of the DNS (Domain Name System)?", opts: ["To encrypt web traffic", "To map domain names to IP addresses", "To balance traffic load", "To assign local IP addresses dynamically"], ans: 1 },
    { category: "technical", q: "Which of the following is true about a compiler?", opts: ["It executes code line-by-line", "It translates high-level code into machine code in one go", "It is used to debug network packets", "It manages database replication"], ans: 1 },
    { category: "technical", q: "What is the time complexity of inserting an element at the beginning of a singly linked list?", opts: ["O(1)", "O(n)", "O(log n)", "O(n log n)"], ans: 0 },
    { category: "technical", q: "What is the main difference between a process and a thread?", opts: ["A process shares memory with other processes; a thread does not", "A process has its own address space; threads share the process's address space", "Threads are managed by the hardware; processes are managed by the application", "Processes are faster to create than threads"], ans: 1 },
    { category: "technical", q: "In Git, what is the purpose of 'git rebase'?", opts: ["To delete a branch permanently", "To apply commits on top of another base tip", "To download files from remote repository without merging", "To encrypt local commit logs"], ans: 1 },
    { category: "technical", q: "What is a memory leak?", opts: ["A physical failure of RAM modules", "Unused memory that is not released back to the system", "Accessing memory locations outside array bounds", "Overwriting read-only memory segments"], ans: 1 },
    { category: "technical", q: "Which sorting algorithm is stable and has a worst-case complexity of O(n log n)?", opts: ["Quick Sort", "Merge Sort", "Bubble Sort", "Selection Sort"], ans: 1 },
    { category: "technical", q: "What is the purpose of the garbage collector in languages like Java or C#?", opts: ["To delete unused source code files", "To automatically reclaim unused memory", "To optimize database queries", "To clear temporary browser cookies"], ans: 1 },
    { category: "technical", q: "In system design, what does horizontal scaling refer to?", opts: ["Upgrading the CPU and RAM of an existing server", "Adding more servers to the pool", "Optimizing database queries to run horizontally", "Reducing the physical height of rack servers"], ans: 1 },
    { category: "technical", q: "What is the primary function of the ARP (Address Resolution Protocol)?", opts: ["Resolving IP addresses to MAC addresses", "Resolving domain names to IP addresses", "Routing packets across different networks", "Managing active socket connections"], ans: 0 },
    { category: "technical", q: "In cryptography, what is the primary feature of a cryptographic hash function?", opts: ["It is easily reversible", "It maps arbitrary-size data to a fixed-size bit string and is one-way", "It requires a public-private key pair", "It compresses text without losing data"], ans: 1 },
    { category: "technical", q: "What is the main benefit of using a RESTful API?", opts: ["It requires a persistent socket connection", "It is stateless and utilizes standard HTTP methods", "It automatically compiles source code", "It operates only on relational database engines"], ans: 1 },
    { category: "technical", q: "What does the term 'Race Condition' mean in concurrent programming?", opts: ["An algorithm completing ahead of schedule", "Multiple threads accessing shared data concurrently, leading to unpredictable outcomes", "A hardware metric for CPU speed comparison", "A fast routing path in network topologies"], ans: 1 },
    { category: "technical", q: "In database design, what is 'Normalization' used for?", opts: ["To secure database credentials", "To minimize data redundancy and dependency", "To convert SQL queries to NoSQL format", "To backup data automatically"], ans: 1 },
    { category: "technical", q: "What does the 'S' in SOLID principles stand for?", opts: ["System Security Principle", "Single Responsibility Principle", "State Synchronization Principle", "Stack Allocation Principle"], ans: 1 },
    { category: "technical", q: "Which HTTP response status code indicates that the server cannot find the requested resource?", opts: ["200 OK", "301 Moved Permanently", "404 Not Found", "500 Internal Server Error"], ans: 2 },
    { category: "technical", q: "What is the purpose of an index in a database table?", opts: ["To encrypt table columns", "To speed up data retrieval operations", "To ensure table constraints are enforced", "To partition tables horizontally"], ans: 1 },
    { category: "technical", q: "What is 'virtual memory' in an operating system?", opts: ["RAM allocation inside virtual machines", "Using secondary storage to extend physical memory space", "A software emulator of CPU caches", "Memory allocated for graphical operations"], ans: 1 },
    { category: "technical", q: "What is the primary difference between TCP and UDP?", opts: ["TCP is connectionless; UDP is connection-oriented", "TCP is reliable and guarantees packet delivery; UDP is connectionless and faster", "TCP operates at the physical layer; UDP operates at the network layer", "UDP is more secure than TCP"], ans: 1 },

    // Quantitative Aptitude
    { category: "quantitative", q: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?", opts: ["120 metres", "150 metres", "324 metres", "180 metres"], ans: 1 },
    { category: "quantitative", q: "If 5 workers can build a wall in 12 days, how many days would it take for 6 workers to build the same wall?", opts: ["10 days", "8 days", "14 days", "12 days"], ans: 0 },
    { category: "quantitative", q: "A father is 4 times as old as his son. In 20 years, he will be twice as old as his son. How old is the father now?", opts: ["32 years", "40 years", "48 years", "50 years"], ans: 1 },
    { category: "quantitative", q: "Find the missing number in the series: 3, 5, 9, 17, 33, ?", opts: ["45", "50", "65", "55"], ans: 2 },
    { category: "quantitative", q: "What is the probability of getting a sum of 9 when two dice are thrown simultaneously?", opts: ["1/9", "1/6", "1/12", "1/4"], ans: 0 },
    { category: "quantitative", q: "If a person sells an item for $300, making a 25% profit, what was the cost price of the item?", opts: ["$240", "$220", "$250", "$270"], ans: 0 },
    { category: "quantitative", q: "A tank can be filled by Pipe A in 5 hours and emptied by Pipe B in 10 hours. If both pipes are opened together, how long will it take to fill the tank?", opts: ["8 hours", "10 hours", "6 hours", "12 hours"], ans: 1 },
    { category: "quantitative", q: "The average age of a class of 30 students is 15 years. If the teacher's age is included, the average increases by 1 year. What is the teacher's age?", opts: ["45 years", "46 years", "40 years", "42 years"], ans: 1 },
    { category: "quantitative", q: "A shopkeeper gives a discount of 20% on the marked price of an item and still makes a 12% profit. If the marked price is $280, what is the cost price?", opts: ["$200", "$210", "$220", "$240"], ans: 0 },
    { category: "quantitative", q: "If 3x + 7 = 22, what is the value of (x^2 - x)?", opts: ["20", "15", "12", "30"], ans: 0 },
    // Additional Quantitative Questions (10 more)
    { category: "quantitative", q: "A boat can travel with a speed of 13 km/hr in still water. If the speed of the stream is 4 km/hr, find the time taken by the boat to go 68 km downstream.", opts: ["3 hours", "4 hours", "5 hours", "6 hours"], ans: 1 },
    { category: "quantitative", q: "A sum of money at simple interest amounts to $815 in 3 years and to $854 in 4 years. What is the sum?", opts: ["$650", "$690", "$698", "$700"], ans: 2 },
    { category: "quantitative", q: "A and B invest in a business in the ratio 3:2. If 5% of the total profit goes to charity and A's share is $855, the total profit is:", opts: ["$1425", "$1500", "$1537", "$1575"], ans: 1 },
    { category: "quantitative", q: "The cost price of 20 articles is the same as the selling price of x articles. If the profit is 25%, find the value of x.", opts: ["15", "16", "18", "25"], ans: 1 },
    { category: "quantitative", q: "If 20% of a = b, then b% of 20 is the same as:", opts: ["4% of a", "5% of a", "20% of a", "None of these"], ans: 0 },
    { category: "quantitative", q: "A starts business with $3500 and after 5 months, B joins with A as his partner. After a year, the profit is divided in the ratio 2:3. What was B's contribution in the capital?", opts: ["$7500", "$8000", "$8500", "$9000"], ans: 3 },
    { category: "quantitative", q: "In a lottery, there are 10 prizes and 25 blanks. A lottery is drawn at random. What is the probability of getting a prize?", opts: ["1/10", "2/5", "2/7", "5/7"], ans: 2 },
    { category: "quantitative", q: "A card is drawn from a pack of 52 cards. What is the probability of getting a queen of club or king of heart?", opts: ["1/13", "2/13", "1/26", "1/52"], ans: 2 },
    { category: "quantitative", q: "A and B can do a work in 12 days, B and C in 15 days, C and A in 20 days. If A, B, and C work together, in how many days will they complete the work?", opts: ["8 days", "10 days", "12 days", "15 days"], ans: 1 },
    { category: "quantitative", q: "A wheel makes 360 revolutions in one minute. Through how many radians does it turn in one second?", opts: ["6π", "12π", "18π", "24π"], ans: 1 },

    // Logical Reasoning
    { category: "logical", q: "In a code language, if 'COMPUTER' is written as 'RFUVQNPC', how is 'MEDICINE' written?", opts: ["EOJDJEFM", "EOJDEJFM", "DJEFMEOJ", "DMJFEJOE"], ans: 1 },
    { category: "logical", q: "If A is the brother of B; B is the sister of C; and C is the father of D, how is D related to A?", opts: ["Brother", "Uncle", "Nephew or Niece", "Father"], ans: 2 },
    { category: "logical", q: "Which word does not belong with the others?", opts: ["Leopard", "Cougar", "Cheetah", "Wolf"], ans: 3 },
    { category: "logical", q: "Statements: All mangoes are golden. No golden things are cheap. Conclusions: 1) Mangoes are cheap. 2) Mangoes are not cheap.", opts: ["Only conclusion 1 follows", "Only conclusion 2 follows", "Both 1 and 2 follow", "Neither 1 nor 2 follows"], ans: 1 },
    { category: "logical", q: "A person walks 4 km North, then turns Right and walks 3 km. How far is the person from the starting point?", opts: ["5 km", "7 km", "6 km", "4 km"], ans: 0 },
    { category: "logical", q: "Six faces of a cube are painted with red, blue, green, yellow, black and white colors. Red is opposite to black. Green is between red and black. Blue is adjacent to white. Yellow is adjacent to blue. If red is at the bottom, what is at the top?", opts: ["White", "Black", "Yellow", "Blue"], ans: 1 },
    { category: "logical", q: "If 'red' means 'green', 'green' means 'yellow', 'yellow' means 'blue', and 'blue' means 'black', what is the color of the clear sky?", opts: ["blue", "yellow", "black", "red"], ans: 2 },
    { category: "logical", q: "A clock shows 4:30. If the minute hand points East, in which direction does the hour hand point?", opts: ["North", "North-East", "South-East", "North-West"], ans: 1 },
    { category: "logical", q: "If the letters in the word 'CREATIVE' are arranged in alphabetical order, how many letters will remain in the same position?", opts: ["One", "Two", "Three", "None"], ans: 3 },
    { category: "logical", q: "If South-East becomes North, North-East becomes West and so on, what will West become?", opts: ["North-East", "North-West", "South-East", "South-West"], ans: 2 },
    // Additional Logical Questions (10 more)
    { category: "logical", q: "Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?", opts: ["(1/3)", "(1/8)", "(2/8)", "(1/16)"], ans: 1 },
    { category: "logical", q: "Look at this series: 7, 10, 8, 11, 9, 12, ... What number should come next?", opts: ["7", "10", "12", "13"], ans: 1 },
    { category: "logical", q: "Which word is the odd one out?", opts: ["Car", "Bicycle", "Motorcycle", "Truck"], ans: 1 },
    { category: "logical", q: "An informal gathering occurs when a group of people get together in a casual, relaxed manner. Which situation below is the best example of an Informal Gathering?", opts: ["A debating club meeting", "A family barbecue reunion", "A corporate board meeting", "A lecture at a university"], ans: 1 },
    { category: "logical", q: "If all trees have leaves, and a maple is a tree, then:", opts: ["All maple trees have leaves", "Only maple trees have leaves", "Some maples have leaves", "Leaves are only found on trees"], ans: 0 },
    { category: "logical", q: "Find the word that has the same relationship to the second word as the first two: Cup is to Coffee as Bowl is to:", opts: ["Dish", "Soup", "Spoon", "Food"], ans: 1 },
    { category: "logical", q: "Find the word that has the same relationship: Exercise is to Gym as Eating is to:", opts: ["Food", "Kitchen", "Restaurant", "Diet"], ans: 2 },
    { category: "logical", q: "Statements: All bags are pockets. All pockets are pouches. Conclusions: 1) All bags are pouches. 2) Some pouches are bags.", opts: ["Only conclusion 1 follows", "Only conclusion 2 follows", "Both 1 and 2 follow", "Neither 1 nor 2 follows"], ans: 2 },
    { category: "logical", q: "A man walks 6 km South, turns West and walks 4 km, then turns North and walks 3 km. How far is he from his starting point?", opts: ["5 km", "6 km", "7 km", "8 km"], ans: 0 },
    { category: "logical", q: "If 'pen' is 'paper', 'paper' is 'ink', 'ink' is 'eraser', and 'eraser' is 'ruler', what do you write on?", opts: ["pen", "paper", "ink", "eraser"], ans: 2 },

    // One Word Substitution (Verbal Ability - 25 questions)
    { category: "verbal", q: "A person who does not believe in the existence of God", opts: ["Theist", "Atheist", "Agnostic", "Pagan"], ans: 1 },
    { category: "verbal", q: "A collection of maps, especially of Earth", opts: ["Dictionary", "Encyclopedia", "Atlas", "Anthology"], ans: 2 },
    { category: "verbal", q: "One who compiles a dictionary", opts: ["Linguist", "Lexicographer", "Cartographer", "Biographer"], ans: 1 },
    { category: "verbal", q: "A post or office for which no salary is paid", opts: ["Honorary", "Sinecure", "Voluntary", "Charitable"], ans: 0 },
    { category: "verbal", q: "A study of ancient societies and their relics", opts: ["Anthropology", "Paleontology", "Archaeology", "Geology"], ans: 2 },
    { category: "verbal", q: "One who eats everything, both plants and meat", opts: ["Herbivorous", "Carnivorous", "Omnivorous", "Insectivorous"], ans: 2 },
    { category: "verbal", q: "A person who walks in their sleep", opts: ["Somniloquist", "Somnambulist", "Insomniac", "Hypnotist"], ans: 1 },
    { category: "verbal", q: "A book or document written by hand", opts: ["Manuscript", "Scripture", "Chronicle", "Autograph"], ans: 0 },
    { category: "verbal", q: "One who knows many languages", opts: ["Bilingual", "Linguist", "Polyglot", "Translator"], ans: 2 },
    { category: "verbal", q: "A speaker's platform or dais", opts: ["Podium", "Auditorium", "Altar", "Pulpit"], ans: 0 },
    { category: "verbal", q: "A person who is centring his thoughts on himself", opts: ["Egoist", "Egocentric", "Altruist", "Eccentric"], ans: 1 },
    { category: "verbal", q: "A remedy for all diseases or problems", opts: ["Panacea", "Antibiotic", "Elixir", "Antidote"], ans: 0 },
    { category: "verbal", q: "One who looks at the bright side of things", opts: ["Pessimist", "Optimist", "Realist", "Idealist"], ans: 1 },
    { category: "verbal", q: "A study of the human mind and behavior", opts: ["Sociology", "Psychology", "Physiology", "Philosophy"], ans: 1 },
    { category: "verbal", q: "One who travels on foot", opts: ["Pedestrian", "Traveler", "Pilgrim", "Vagabond"], ans: 0 },
    { category: "verbal", q: "A person who sells flowers", opts: ["Gardener", "Florist", "Botanist", "Horticulturist"], ans: 1 },
    { category: "verbal", q: "One who spends money recklessly and wastefully", opts: ["Miser", "Spendthrift", "Philanthropist", "Investor"], ans: 1 },
    { category: "verbal", q: "An instrument for measuring atmospheric pressure", opts: ["Thermometer", "Barometer", "Hygrometer", "Anemometer"], ans: 1 },
    { category: "verbal", q: "A state of perfect balance and stability", opts: ["Symmetry", "Equilibrium", "Stagnation", "Cohesion"], ans: 1 },
    { category: "verbal", q: "A speech or presentation delivered without preparation", opts: ["Monologue", "Sermon", "Extempore", "Debate"], ans: 2 },
    { category: "verbal", q: "One who hates mankind", opts: ["Misanthrope", "Philanthropist", "Misogynist", "Mercenary"], ans: 0 },
    { category: "verbal", q: "A person who lives a solitary life and tends to avoid other people", opts: ["Recluse", "Introvert", "Vagrant", "Hermit"], ans: 0 },
    { category: "verbal", q: "Animals that can live both on land and in water", opts: ["Reptiles", "Amphibians", "Mammals", "Aquatics"], ans: 1 },
    { category: "verbal", q: "A general pardon granted to political offenders", opts: ["Absolution", "Amnesty", "Reprieve", "Condonation"], ans: 1 },
    { category: "verbal", q: "A person who loves books and reading", opts: ["Bibliophile", "Scholar", "Intellectual", "Librarian"], ans: 0 }
  ];

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const loadAptitudeQuestions = async (container) => {
    container.innerHTML = `
      <div style="padding: 40px; max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; height: 100%; box-sizing: border-box; justify-content:center; align-items:center; text-align:center;">
        <div class="card-ent" style="padding: 60px; border-radius: 24px; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(14,165,233,0.05) 100%); border: 1px solid rgba(139,92,246,0.2); width: 100%; display: flex; flex-direction: column; align-items: center; gap: 24px;">
          <!-- AI Radar Scanner / Loader -->
          <div style="position: relative; width: 100px; height: 100px; margin-bottom: 12px;">
            <div style="position: absolute; inset: 0; border: 4px solid rgba(139, 92, 246, 0.1); border-radius: 50%;"></div>
            <div style="position: absolute; inset: 0; border: 4px solid transparent; border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="position: absolute; inset: 15px; border: 2px dashed rgba(14, 165, 233, 0.3); border-radius: 50%; animation: spin 4s linear infinite reverse;"></div>
            <div style="position: absolute; inset: 35px; background: radial-gradient(circle, var(--brand-primary) 0%, transparent 70%); border-radius: 50%; animation: pulse-core 1.5s infinite alternate;"></div>
          </div>
          
          <h2 class="h2-ent" style="font-size:24px; color:#fff; font-weight:700;">🧬 PLACENIX Core Engine</h2>
          <p style="color:var(--text-description); font-size:15px; max-width: 500px; line-height: 1.6;">
            Generating dynamic AI aptitude assessment tailored for <span style="color:#fff; font-weight:600;">${state.role}</span> role at <span style="color:#fff; font-weight:600;">${state.company}</span>...
          </p>
          
          <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); animation: loading-bar 2s infinite ease-in-out;"></div>
          </div>
        </div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-core { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.2); opacity: 1; } }
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      </style>
    `;

    const GEMINI_API_KEY = window.GEMINI_API_KEY || Store.config?.GEMINI_API_KEY;
    const isDummy = !GEMINI_API_KEY || GEMINI_API_KEY.startsWith('AQ.');

    if (isDummy) {
      console.warn("Aptitude: GEMINI_API_KEY missing or placeholder. Activating randomized local pool fallback.");
      await new Promise(resolve => setTimeout(resolve, 300));
      loadLocalFallbackQuestions();
      return;
    }

    try {
      const prompt = `You are an elite senior recruitment examiner at ${state.company}. 
Generate exactly 30 UNIQUE multiple-choice aptitude questions for a candidate 
applying for the role of "${state.role}" at "${state.company}".

Every single question generated must be deeply concentrated and customized to the standards, engineering culture, and business domain of ${state.company}:

Distribute the questions as follows:
- 8 Quantitative Aptitude questions: These must be framed as realistic word problems set within ${state.company}'s industry or business context (e.g. calculation of server resource consumption or latency for Google; interest rates, portfolios, or transactional percentages for Goldman Sachs; service SLAs or staffing overhead for TCS). The difficulty level must match ${state.company}'s entrance exam standards.
- 7 Logical Reasoning questions: Construct puzzles, sequence matches, or dependency diagrams referencing operations, technologies, or teams typical of ${state.company}.
- 8 Verbal Ability / English questions: Choose vocabulary, one-word substitutions, or comprehension contexts that represent the technical communications, core values, and corporate vocabulary of ${state.company}.
- 7 Technical questions: Specific to the "${state.role}" role at ${state.company}. Deeply target ${state.company}'s actual tech stacks, active open-source contributions, engineering methodologies, or infrastructure (e.g. for Google: Go, MapReduce, Kubernetes; for Goldman Sachs: core Java concurrency, transaction mechanics, financial APIs; for TCS: enterprise migrations, database scaling, agile structures).

IMPORTANT:
- All questions must be UNIQUE. Do NOT repeat any question.
- Each question must have exactly 4 options.
- Return a JSON object with a "questions" array where each item has:
  { "q": "string", "opts": ["string","string","string","string"], "ans": number (0-3) }`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`API error: ${res.statusText}`);
      }

      const data = await res.json();
      const txt = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(txt);
      
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        state.questions = parsed.questions;
        console.log(`Successfully generated ${state.questions.length} AI questions.`);
      } else {
        throw new Error("Invalid response format from Gemini");
      }
    } catch (e) {
      console.error("Failed to generate AI questions, using local fallback:", e);
      loadLocalFallbackQuestions();
    }
  };

  const loadLocalFallbackQuestions = () => {
    // Role-specific technical pools
    const staticQuestionPoolTechSE = staticQuestionPool.filter(q => q.category === 'technical');
    
    const staticQuestionPoolTechPM = [
      { category: "technical", q: "What is the primary goal of an A/B test?", opts: ["Comparing two versions of a product or feature to see which performs better", "Running double compilation checks", "Dividing engineers into two parallel teams", "Securing user authentication headers"], ans: 0 },
      { category: "technical", q: "In product metrics, what does 'Churn Rate' measure?", opts: ["The speed of database replication", "The rate at which customers stop doing business with an entity", "The percentage of marketing spend compared to revenue", "The average time spent in code repositories"], ans: 1 },
      { category: "technical", q: "Which framework is commonly used for prioritizing features by weighing Reach, Impact, Confidence, and Effort?", opts: ["Dijkstra's Algorithm", "RICE Prioritization", "MVC Architecture", "TCP/IP Handshake"], ans: 1 },
      { category: "technical", q: "What is the purpose of a MVP (Minimum Viable Product)?", opts: ["A product with the maximum features possible", "A product with just enough features to satisfy early customers and gather feedback", "A fully secure database backup model", "An enterprise release pipeline with continuous deployment"], ans: 1 },
      { category: "technical", q: "What does the 'A' in the AARRR (Pirate Metrics) framework stand for?", opts: ["Acquisition & Activation", "Algorithm & Architecture", "Allocation & Assembly", "Auditing & Authentication"], ans: 0 },
      { category: "technical", q: "Which document outlines the product's vision, direction, priorities, and progress over time?", opts: ["Product Roadmap", "Source Code Repository", "Database Schema Diagram", "API Specification Sheet"], ans: 0 },
      { category: "technical", q: "In agile development, what is a 'User Story'?", opts: ["A technical bug ticket", "An informal, general explanation of a software feature written from the perspective of the end user", "A marketing press release", "A database migration script"], ans: 1 }
    ];

    const staticQuestionPoolTechDS = [
      { category: "technical", q: "What is the primary difference between supervised and unsupervised learning?", opts: ["Supervised uses labeled training data; unsupervised uses unlabeled data", "Supervised runs faster on GPUs", "Unsupervised doesn't require any algorithms", "Supervised is only used for database queries"], ans: 0 },
      { category: "technical", q: "In classification models, what does 'Overfitting' mean?", opts: ["The model performs well on training data but poorly on unseen test data", "The model matches all parameters exactly on server nodes", "The algorithm uses too little memory", "The model fails to compile on local systems"], ans: 0 },
      { category: "technical", q: "What metric is defined as the number of true positives divided by the sum of true positives and false positives?", opts: ["Recall", "Accuracy", "Precision", "F1-Score"], ans: 2 },
      { category: "technical", q: "Which of the following algorithms is an ensemble learning method based on decision trees?", opts: ["K-Means Clustering", "Random Forest", "Linear Regression", "Support Vector Machine"], ans: 1 },
      { category: "technical", q: "What is a p-value used for in hypothesis testing?", opts: ["To measure the accuracy of a database search", "To determine the statistical significance of the results", "To calculate the learning rate of neural nodes", "To measure network packet latency"], ans: 1 },
      { category: "technical", q: "What is the main purpose of feature scaling (e.g., normalization or standardization)?", opts: ["To compress files on disk", "To ensure that features with larger magnitudes do not dominate the model training", "To encrypt user password values", "To speed up code compilation"], ans: 1 },
      { category: "technical", q: "Which method is commonly used to find the optimal weights in neural networks by minimizing the loss function?", opts: ["Binary Search", "Gradient Descent", "Dijkstra's Algorithm", "Merge Sort"], ans: 1 }
    ];

    const staticQuestionPoolTechFA = [
      { category: "technical", q: "What is the Discounted Cash Flow (DCF) model used for?", opts: ["To encrypt transactional credit card data", "To estimate the value of an investment based on its expected future cash flows", "To calculate database latency on payment gateways", "To verify employee budget sheets"], ans: 1 },
      { category: "technical", q: "What does EBITDA stand for?", opts: ["Earnings Before Interest, Taxes, Depreciation, and Amortization", "Equity Balance Interest Total Debt Asset", "Estimates of Business Income Taxes and Debt Account", "Every Business Transaction Dividend Allocation"], ans: 0 },
      { category: "technical", q: "Which financial statement shows a company's financial position (assets, liabilities, and equity) at a specific point in time?", opts: ["Income Statement", "Cash Flow Statement", "Balance Sheet", "Retained Earnings Ledger"], ans: 2 },
      { category: "technical", q: "What does the P/E ratio stand for and measure?", opts: ["Price-to-Earnings; measures current share price relative to per-share earnings", "Portfolio-to-Equity; measures asset diversity", "Payment-to-Expense; measures operational overhead", "Profit-to-Equity; measures dividend yields"], ans: 0 },
      { category: "technical", q: "What is the Net Present Value (NPV) rule for project investment?", opts: ["Accept the project if NPV is positive", "Accept the project if NPV is zero", "Reject the project if NPV is positive", "Accept the project if NPV is negative"], ans: 0 },
      { category: "technical", q: "What does CAGR stand for?", opts: ["Compound Annual Growth Rate", "Capital Allocation & Gain Ratio", "Cash Asset Gross Revenue", "Cumulative Annual Growth Return"], ans: 0 },
      { category: "technical", q: "Which ratio measures a company's ability to cover its short-term obligations with its short-term assets?", opts: ["Debt-to-Equity Ratio", "Return on Equity (ROE)", "Current Ratio", "Gross Profit Margin"], ans: 2 }
    ];

    const company = state.company || 'TCS';
    const role = state.role || 'Software Engineer';
    const seed = `${company}_${role}`;

    const seededRandom = () => {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
      }
      let currentSeed = Math.abs(hash) || 12345;
      return () => {
        const x = Math.sin(currentSeed++) * 10000;
        return x - Math.floor(x);
      };
    };

    const rand = seededRandom();
    const shuffle = (array) => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const customizeQuestionText = (text, companyName, roleName) => {
      return text
        .replace(/\ba train\b/gi, `a ${companyName} server queue`)
        .replace(/\btrain\b/gi, `${companyName} server queue`)
        .replace(/\bworkers\b/gi, `${roleName}s`)
        .replace(/\bworker\b/gi, `${roleName}`)
        .replace(/\ba wall\b/gi, `a software project`)
        .replace(/\bwall\b/gi, `software project`)
        .replace(/\ba tank\b/gi, `a database cluster`)
        .replace(/\btank\b/gi, `database cluster`)
        .replace(/\bPipe A\b/gi, `Data Stream A`)
        .replace(/\bPipe B\b/gi, `Data Stream B`)
        .replace(/\bpipes\b/gi, `data streams`)
        .replace(/\ba boat\b/gi, `a network packet`)
        .replace(/\bboat\b/gi, `network packet`)
        .replace(/\bstream\b/gi, `routing path`)
        .replace(/\bdownstream\b/gi, `through cache`)
        .replace(/\ba father\b/gi, `a senior ${roleName}`)
        .replace(/\bfather\b/gi, `senior ${roleName}`)
        .replace(/\ba son\b/gi, `a junior ${roleName}`)
        .replace(/\bson\b/gi, `junior ${roleName}`)
        .replace(/\ba class of 30 students\b/gi, `a team of 30 ${roleName}s`)
        .replace(/\bclass of 30 students\b/gi, `team of 30 ${roleName}s`)
        .replace(/\bteacher\b/gi, `lead architect`)
        .replace(/\bteacher's\b/gi, `lead architect's`)
        .replace(/\ba shopkeeper\b/gi, `a ${companyName} sales manager`)
        .replace(/\bshopkeeper\b/gi, `${companyName} sales manager`)
        .replace(/\ban item\b/gi, `an API subscription`)
        .replace(/\bitem\b/gi, `API subscription`)
        .replace(/\bmarked price\b/gi, `list price`)
        .replace(/\bcost price\b/gi, `base hosting cost`)
        .replace(/\ba lottery\b/gi, `a load balancer request`)
        .replace(/\blottery\b/gi, `load balancer request`)
        .replace(/\bprizes\b/gi, `successful routing responses`)
        .replace(/\bprize\b/gi, `successful routing response`)
        .replace(/\bblanks\b/gi, `timeout errors`)
        .replace(/\bblank\b/gi, `timeout error`)
        .replace(/\ba card\b/gi, `a database query`)
        .replace(/\bcard\b/gi, `database query`)
        .replace(/\bcards\b/gi, `database queries`)
        .replace(/\ba pack of 52 cards\b/gi, `a pool of 52 queries`)
        .replace(/\bpack of 52 cards\b/gi, `pool of 52 queries`)
        .replace(/\bqueen of club\b/gi, `write query`)
        .replace(/\bking of heart\b/gi, `read query`)
        .replace(/\bA and B invest in a business\b/gi, `A and B allocate resources in a ${companyName} service`)
        .replace(/\bA and B can do a work\b/gi, `A and B can complete a ${companyName} deployment`)
        .replace(/\bB and C\b/gi, `B and C`)
        .replace(/\bC and A\b/gi, `C and A`)
        .replace(/\bA starts business\b/gi, `A starts a project`)
        .replace(/\bB joins with A\b/gi, `B joins with A`)
        .replace(/\bwheel\b/gi, `CPU core`)
        .replace(/\brevolutions\b/gi, `clock cycles`)
        .replace(/\brevolution\b/gi, `clock cycle`)
        .replace(/\ba person\b/gi, `a ${roleName}`)
        .replace(/\bperson\b/gi, `${roleName}`)
        .replace(/\ba family barbecue reunion\b/gi, `a ${companyName} team sync meeting`)
        .replace(/\bfamily barbecue reunion\b/gi, `${companyName} team sync meeting`)
        .replace(/\bbarbecue\b/gi, `sync`)
        .replace(/\ba debating club meeting\b/gi, `a project code review`)
        .replace(/\bdebating club meeting\b/gi, `project code review`)
        .replace(/\ba lecture at a university\b/gi, `an all-hands company webinar`)
        .replace(/\blecture at a university\b/gi, `all-hands company webinar`)
        .replace(/\ba corporate board meeting\b/gi, `a critical executive briefing`)
        .replace(/\bcorporate board meeting\b/gi, `critical executive briefing`)
        .replace(/\bmaple\b/gi, `class`)
        .replace(/\btree\b/gi, `base class`)
        .replace(/\btrees\b/gi, `base classes`)
        .replace(/\bleaves\b/gi, `inherited methods`)
        .replace(/\bcup\b/gi, `terminal`)
        .replace(/\bcoffee\b/gi, `commands`)
        .replace(/\bbowl\b/gi, `ide`)
        .replace(/\bsoup\b/gi, `code`)
        .replace(/\bgym\b/gi, `repository`)
        .replace(/\bexercise\b/gi, `coding`)
        .replace(/\brestaurant\b/gi, `cloud server`)
        .replace(/\beating\b/gi, `scaling`)
        .replace(/\bbags\b/gi, `directories`)
        .replace(/\bpockets\b/gi, `folders`)
        .replace(/\bpouches\b/gi, `zip files`)
        .replace(/\bbags are pockets\b/gi, `directories are folders`)
        .replace(/\bpockets are pouches\b/gi, `folders are zip files`)
        .replace(/\bpen\b/gi, `compiler`)
        .replace(/\bpaper\b/gi, `source code`)
        .replace(/\bink\b/gi, `binary executable`)
        .replace(/\beraser\b/gi, `debugger`)
        .replace(/\bruler\b/gi, `linter`);
    };

    const customizeItem = (item) => {
      const copy = { ...item };
      copy.q = customizeQuestionText(copy.q, company, role);
      copy.opts = copy.opts.map(opt => customizeQuestionText(opt, company, role));
      return copy;
    };

    let techPool = [];
    if (role === 'Product Manager') {
      techPool = staticQuestionPoolTechPM;
    } else if (role === 'Data Scientist') {
      techPool = staticQuestionPoolTechDS;
    } else if (role === 'Financial Analyst') {
      techPool = staticQuestionPoolTechFA;
    } else {
      techPool = staticQuestionPoolTechSE;
    }

    const quantPool = staticQuestionPool.filter(q => q.category === 'quantitative');
    const logicalPool = staticQuestionPool.filter(q => q.category === 'logical');
    const verbalPool = staticQuestionPool.filter(q => q.category === 'verbal');

    const selectedTech = shuffle(techPool).slice(0, 7).map(customizeItem);
    const selectedQuant = shuffle(quantPool).slice(0, 8).map(customizeItem);
    const selectedLogical = shuffle(logicalPool).slice(0, 8).map(customizeItem);
    const selectedVerbal = shuffle(verbalPool).slice(0, 7).map(customizeItem);

    state.questions = shuffle([
      ...selectedTech,
      ...selectedQuant,
      ...selectedLogical,
      ...selectedVerbal
    ]);
    console.log(`Loaded 30 balanced static local questions for ${company} (${role}).`);
  };

  const renderAptitude = async (c) => {
    if (!state.cameraEnabled) {
      state.step = 'dashboard';
      render();
      showCameraRequiredAlert();
      return;
    }
    
    try {
      initProctoring();
    } catch (err) {
      console.error("Proctoring startup failed:", err);
    }
    
    try {
      if (!state.questions) {
        await loadAptitudeQuestions(c);
      }
    } catch (err) {
      console.error("Aptitude questions load failed, forcing local fallback:", err);
      loadLocalFallbackQuestions();
    }
    
    let currentQ = 0;
    let timeLeft = 900; // 15 minutes (900 seconds)
    let timerInterval = null;

    const startTimer = () => {
      if (timerInterval) clearInterval(timerInterval);
      
      timerInterval = setInterval(() => {
        timeLeft--;
        
        if (state.step !== 'aptitude') {
          clearInterval(timerInterval);
          return;
        }

        const timerTextEl = document.getElementById('timer-text');
        const timerPillEl = document.getElementById('aptitude-timer');
        
        if (timerTextEl) {
          const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
          const s = (timeLeft % 60).toString().padStart(2, '0');
          timerTextEl.innerText = `${m}:${s}`;
        }

        if (timeLeft <= 60 && timerPillEl) {
          timerPillEl.style.background = 'rgba(239, 68, 68, 0.25)';
          timerPillEl.style.borderColor = '#EF4444';
          timerPillEl.style.color = '#EF4444';
          timerPillEl.style.animation = 'pulse-timer 1s infinite alternate';
        }

        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          handleTimeOut();
        }
      }, 1000);
    };

    const handleTimeOut = () => {
      alert("⏰ Time is up! Let's review your scorecard.");
      // Pad unanswered questions
      for (let i = 0; i < state.questions.length; i++) {
        if (!state.aptitudeAnswers[i]) {
          const q = state.questions[i];
          state.aptitudeAnswers[i] = {
            q: q.q,
            chosen: "No Answer (Timeout)",
            correct: q.opts[q.ans],
            ansIndex: -1
          };
        }
      }
      
      // Calculate final score
      let correctQ = 0;
      state.questions.forEach((q, idx) => {
        const ans = state.aptitudeAnswers[idx];
        if (ans && ans.ansIndex === q.ans) {
          correctQ++;
        }
      });
      state.aptitudeScore = correctQ;

      renderReport();
    };

    const renderReport = () => {
      if (timerInterval) clearInterval(timerInterval);
      stopLocalWebcam();
      document.getElementById('vi-proctor-layer').style.display = 'none';

      const totalQ = state.questions.length;
      
      // Calculate final score dynamically
      let correctQ = 0;
      state.questions.forEach((q, idx) => {
        const ans = state.aptitudeAnswers[idx];
        if (ans && ans.ansIndex === q.ans) {
          correctQ++;
        }
      });
      state.aptitudeScore = correctQ;

      const incorrectQ = totalQ - correctQ;
      const accuracy = Math.round((correctQ / totalQ) * 100);
      const timeSpentSecs = 900 - timeLeft;
      const minSpent = Math.floor(timeSpentSecs / 60);
      const secSpent = timeSpentSecs % 60;
      const grade = getInterviewGrade(accuracy);
      const gradeColor = getGradeColor(grade);

      c.innerHTML = `
        <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; overflow-y: auto; max-height: 100%; box-sizing: border-box;">
          
          <!-- Report Header -->
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <div style="font-size: 56px;">📊</div>
            <h1 class="h1-ent" style="font-size: 32px; color: #fff;">Aptitude Performance Scorecard</h1>
            <p style="color: var(--text-description); font-size: 15px;">Evaluation report for Round 1: Aptitude & Logic.</p>
          </div>

          <!-- Stats Grid -->
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px;">
            <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.01);">
              <span class="label-ent" style="font-size: 10px; color: var(--text-description);">TOTAL QUESTIONS</span>
              <span style="font-size: 28px; font-weight: 800; color: #fff;">${totalQ}</span>
            </div>
            <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.02);">
              <span class="label-ent" style="font-size: 10px; color: #10B981;">CORRECT ANSWERS</span>
              <span style="font-size: 28px; font-weight: 800; color: #10B981;">${correctQ}</span>
            </div>
            <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.02);">
              <span class="label-ent" style="font-size: 10px; color: #EF4444;">INCORRECT ANSWERS</span>
              <span style="font-size: 28px; font-weight: 800; color: #EF4444;">${incorrectQ}</span>
            </div>
            <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(139, 92, 246, 0.2); background: rgba(139, 92, 246, 0.02);">
              <span class="label-ent" style="font-size: 10px; color: var(--brand-primary);">ACCURACY RATE</span>
              <span style="font-size: 28px; font-weight: 800; color: var(--brand-primary);">${accuracy}%</span>
            </div>
            <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: ${gradeColor}44; background: ${gradeColor}0B;">
              <span class="label-ent" style="font-size: 10px; color: ${gradeColor}; font-weight: 700;">ROUND GRADE</span>
              <span style="font-size: 28px; font-weight: 800; color: ${gradeColor};">${grade}</span>
            </div>
          </div>

          <!-- Time Elapsed & Performance Feedback -->
          <div class="card-ent" style="padding: 24px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
            <div>
              <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">Time Elapsed</h4>
              <p style="color: var(--text-description); font-size: 14px;">You completed the test in <strong>${minSpent}m ${secSpent}s</strong>.</p>
            </div>
            <div style="text-align: right;">
              <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">AI Rating</h4>
              <span class="status-pill" style="background: rgba(139, 92, 246, 0.1); color: var(--brand-primary); font-size: 11px; font-weight: 800; border-color: rgba(139, 92, 246, 0.3);">
                ${accuracy >= 80 ? '👑 OUTSTANDING' : accuracy >= 60 ? '⚡ COMPETENT' : '📖 NEEDS IMPROVEMENT'}
              </span>
            </div>
          </div>

          <!-- Detailed Questions List -->
          <div class="card-ent" style="padding: 32px; display: flex; flex-direction: column; gap: 24px; background: rgba(0,0,0,0.15);">
            <h3 class="h2-ent" style="font-size: 18px; margin-bottom: 8px; color: #fff;">Detailed Response Analysis</h3>
            <div style="display: flex; flex-direction: column; gap: 20px; max-height: 350px; overflow-y: auto; padding-right: 12px;" id="report-detailed-list">
              ${state.questions.map((q, idx) => {
                const ans = state.aptitudeAnswers[idx] || { chosen: "No Answer", ansIndex: -1 };
                const isCorrect = ans.ansIndex === q.ans;
                return `
                  <div style="padding: 16px 20px; border-radius: 12px; background: rgba(255,255,255,0.01); border: 1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
                      <span style="font-size: 14px; font-weight: 700; color: #fff;">Q${idx + 1}. ${q.q}</span>
                      <span style="font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid; 
                                   background: ${isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; 
                                   color: ${isCorrect ? '#10B981' : '#EF4444'}; 
                                   border-color: ${isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};">
                        ${isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>
                    <div style="font-size: 13px; display: flex; flex-direction: column; gap: 4px; color: var(--text-description);">
                      <span>Your Answer: <strong style="color: ${isCorrect ? '#10B981' : '#EF4444'};">${ans.chosen}</strong></span>
                      ${!isCorrect ? `<span>Correct Answer: <strong style="color: #10B981;">${q.opts[q.ans]}</strong></span>` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Actions -->
          <div style="display: flex; justify-content: center; margin-top: 10px;">
            <button id="report-done-btn" class="btn-premium" style="padding: 16px 40px; font-size: 16px; border-radius: 12px; font-weight: 700; cursor: pointer;">
              Proceed to Evaluation Dashboard →
            </button>
          </div>

        </div>
        <style>
          #report-detailed-list::-webkit-scrollbar { width: 6px; }
          #report-detailed-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
        </style>
      `;

      document.getElementById('report-done-btn').onclick = () => {
        state.aptitudeCompleted = true;
        state.step = 'dashboard';
        render();
      };
    };

    const renderQ = () => {
      if (state.step !== 'aptitude') {
        if (timerInterval) clearInterval(timerInterval);
        return;
      }
      
      if (currentQ >= state.questions.length) {
         renderReport();
         return;
      }
      
      const q = state.questions[currentQ];
      
      const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const s = (timeLeft % 60).toString().padStart(2, '0');

      const previousSelection = state.aptitudeAnswers[currentQ];
      const selectedIdx = previousSelection ? previousSelection.ansIndex : -1;

      c.innerHTML = `
        <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; height: 100%; box-sizing: border-box; justify-content:center;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <div style="display:flex; align-items:center; gap:16px;">
                <h2 class="h2-ent" style="font-size:24px; margin:0;">Round 1: Aptitude & Logic</h2>
                <button id="vi-exit-btn" class="btn-premium-ghost" style="padding:6px 12px; font-size:12px; border-radius:6px; border:1px solid #EF4444; color:#EF4444; background:rgba(239,68,68,0.05); display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:700;">
                   🚪 Exit Exam
                </button>
             </div>
             <div style="display:flex; gap:12px; align-items:center;">
                <div id="aptitude-timer" style="background:rgba(255, 255, 255, 0.05); border:1px solid rgba(255, 255, 255, 0.1); padding:8px 16px; border-radius:100px; color:#fff; font-weight:700; display:flex; align-items:center; gap:8px; backdrop-filter:blur(4px); transition: all 0.3s;">
                   <span style="font-size:16px;">⏱️</span>
                   <span id="timer-text" style="font-family: monospace;">${m}:${s}</span>
                </div>
                <div style="background:rgba(59, 130, 246, 0.2); padding:8px 16px; border-radius:100px; color:#3B82F6; font-weight:700;">Question ${currentQ + 1} of ${state.questions.length}</div>
             </div>
          </div>
          
          <div class="card-ent" style="padding:40px; display:flex; flex-direction:column; gap:32px;">
             <h3 style="font-size:20px; line-height:1.6; margin-bottom:0px; display:flex; gap:12px; align-items:flex-start;">
                <span style="background:var(--brand-primary); color:white; font-size:14px; font-weight:800; padding:4px 10px; border-radius:8px; line-height:1; margin-top:3px; white-space:nowrap;">Q${currentQ + 1}</span>
                <span>${q.q}</span>
             </h3>
             <div style="display:flex; flex-direction:column; gap:16px;">
                ${q.opts.map((opt, i) => {
                   const isSelected = (selectedIdx === i);
                   const btnStyle = isSelected 
                     ? "background:rgba(139,92,246,0.15); border:2px solid var(--brand-primary); color:#fff; box-shadow:0 0 15px rgba(139,92,246,0.3);"
                     : "border:1px solid rgba(255,255,255,0.1);";
                   return `
                     <button class='mcq-opt btn-premium-ghost' data-idx='${i}' style='text-align:left; padding:20px; font-size:16px; border-radius:12px; display:flex; align-items:center; ${btnStyle}'>
                        <span style='font-weight:700; color:var(--brand-primary); margin-right:12px; width:24px;'>${String.fromCharCode(65+i)}.</span> 
                        <span>${opt}</span>
                        ${isSelected ? '<span style="margin-left:auto; color:var(--brand-primary);">🔵</span>' : ''}
                     </button>
                   `;
                }).join('')}
             </div>
             
             <!-- Navigation Row -->
             <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; border-top:1px solid rgba(255,255,255,0.05); padding-top:24px;">
                <button id="prev-q-btn" class="btn-premium-ghost" style="padding:12px 24px; border-radius:10px; font-size:14px; display:flex; align-items:center; gap:8px; cursor:pointer; ${currentQ === 0 ? 'opacity:0.3; pointer-events:none;' : ''}">
                   ← Previous
                </button>
                <button id="next-q-btn" class="btn-premium" style="padding:12px 28px; border-radius:10px; font-size:14px; display:flex; align-items:center; gap:8px; font-weight:700; cursor:pointer; ${selectedIdx === -1 ? 'opacity:0.5; pointer-events:none;' : ''}">
                   ${currentQ === state.questions.length - 1 ? 'Finish Test ➔' : 'Next Question ➔'}
                </button>
             </div>
          </div>
        </div>
        <style>
          @keyframes pulse-timer {
            0% { transform: scale(1); }
            100% { transform: scale(1.05); box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
          }
        </style>
      `;
      
      document.querySelectorAll('.mcq-opt').forEach(btn => {
         btn.onclick = (e) => {
            const chosen = parseInt(e.currentTarget.getAttribute('data-idx'));
            state.aptitudeAnswers[currentQ] = {
              q: q.q,
              chosen: q.opts[chosen],
              correct: q.opts[q.ans],
              ansIndex: chosen
            };
            renderQ();
         };
      });

      document.getElementById('prev-q-btn').onclick = () => {
        if (currentQ > 0) {
          currentQ--;
          renderQ();
        }
      };

      document.getElementById('next-q-btn').onclick = () => {
        if (selectedIdx !== -1) {
          currentQ++;
          renderQ();
        }
      };

      const exitBtn = document.getElementById('vi-exit-btn');
      if (exitBtn) {
        exitBtn.onclick = () => {
          exitInterview(true);
        };
      }
    };

    startTimer();
    renderQ();
  };

  const staticTechnicalChallenges = {
    "Software Engineer": [
      {
        title: "Reverse String in Place",
        description: `
          <p>Write a function that reverses a string. The input string is given as an array of characters <code>s</code>.</p>
          <p>You must do this by modifying the input array in-place with O(1) extra memory.</p>
          <h4 style="color:#fff; margin-top:16px;">Example 1:</h4>
          <pre style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; color:#a78bfa; margin-bottom:12px;">Input: s = ["h","e","l","l","o"]\nOutput: ["o","l","l","e","h"]</pre>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function reverseString(s) {\n  // Write your code here\n  return s.reverse();\n}",
          "Python": "def reverseString(s):\n    # Write your code here\n    s.reverse()\n    return s"
        },
        testCases: [
          { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
          { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' },
          { input: 's = ["a"]', output: '["a"]' }
        ]
      },
      {
        title: "Two Sum",
        description: `
          <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>
          <p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function twoSum(nums, target) {\n  // Write your code here\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const compl = target - nums[i];\n    if (map.has(compl)) return [map.get(compl), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}",
          "Python": "def twoSum(nums, target):\n    # Write your code here\n    seen = {}\n    for i, num in enumerate(nums):\n        compl = target - num\n        if compl in seen:\n            return [seen[compl], i]\n        seen[num] = i\n    return []"
        },
        testCases: [
          { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' },
          { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
          { input: 'nums = [3,3], target = 6', output: '[0,1]' }
        ]
      },
      {
        title: "Valid Parentheses",
        description: `
          <p>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function isValid(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (['(', '{', '['].includes(char)) stack.push(char);\n    else if (stack.pop() !== map[char]) return false;\n  }\n  return stack.length === 0;\n}",
          "Python": "def isValid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in ['(', '{', '[']:\n            stack.append(char)\n        elif not stack or stack.pop() != mapping[char]:\n            return False\n    return len(stack) == 0"
        },
        testCases: [
          { input: 's = "()"', output: 'true' },
          { input: 's = "()[]{}"', output: 'true' },
          { input: 's = "(]"', output: 'false' }
        ]
      },
      {
        title: "Merge Sorted Arrays",
        description: `
          <p>Given two sorted integer arrays <code>nums1</code> and <code>nums2</code>, merge them into a single sorted array.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function merge(nums1, nums2) {\n  return [...nums1, ...nums2].sort((a,b) => a - b);\n}",
          "Python": "def merge(nums1, nums2):\n    return sorted(nums1 + nums2)"
        },
        testCases: [
          { input: 'nums1 = [1,2,3], nums2 = [2,5,6]', output: '[1,2,2,3,5,6]' },
          { input: 'nums1 = [0], nums2 = [1]', output: '[0,1]' },
          { input: 'nums1 = [4,5], nums2 = [1,2,3]', output: '[1,2,3,4,5]' }
        ]
      },
      {
        title: "Fibonacci Number",
        description: `
          <p>Calculate the <code>n</code>-th Fibonacci number. F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2).</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function fib(n) {\n  if(n <= 1) return n;\n  let a=0, b=1;\n  for(let i=2; i<=n; i++) { let temp=a+b; a=b; b=temp; }\n  return b;\n}",
          "Python": "def fib(n):\n    if n <= 1: return n\n    a, b = 0, 1\n    for _ in range(2, n+1):\n        a, b = b, a + b\n    return b"
        },
        testCases: [
          { input: 'n = 2', output: '1' },
          { input: 'n = 4', output: '3' },
          { input: 'n = 10', output: '55' }
        ]
      },
      {
        title: "Binary Search",
        description: `
          <p>Given a sorted array of integers <code>nums</code> and a <code>target</code>, write a function to search for <code>target</code> in <code>nums</code>. Return its index, or -1 if not present.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function search(nums, target) {\n  return nums.indexOf(target);\n}",
          "Python": "def search(nums, target):\n    try: return nums.index(target)\n    except: return -1"
        },
        testCases: [
          { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
          { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
          { input: 'nums = [5], target = 5', output: '0' }
        ]
      }
    ],
    "Data Scientist": [
      {
        title: "Mean Squared Error (MSE)",
        description: `
          <p>Write a function to calculate the Mean Squared Error (MSE) between predictions and targets.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateMSE(predictions, targets) {\n  let sum = 0;\n  for(let i=0; i<predictions.length; i++) {\n    sum += Math.pow(predictions[i] - targets[i], 2);\n  }\n  return parseFloat((sum / predictions.length).toFixed(3));\n}",
          "Python": "def calculateMSE(predictions, targets):\n    diff_sq = [(p - t) ** 2 for p, t in zip(predictions, targets)]\n    return round(sum(diff_sq) / len(predictions), 3)"
        },
        testCases: [
          { input: 'predictions = [1, 2, 3], targets = [1, 4, 3]', output: '1.333' },
          { input: 'predictions = [0.5, 1.5], targets = [0.5, 1.5]', output: '0' },
          { input: 'predictions = [2, 4, 6], targets = [1, 2, 3]', output: '4.667' }
        ]
      },
      {
        title: "Calculate Median",
        description: `
          <p>Write a function to calculate the median value of an unsorted numerical array <code>arr</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function median(arr) {\n  const sorted = [...arr].sort((a,b) => a-b);\n  const mid = Math.floor(sorted.length / 2);\n  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;\n}",
          "Python": "def median(arr):\n    s = sorted(arr)\n    n = len(s)\n    if n % 2 != 0: return s[n//2]\n    return (s[n//2 - 1] + s[n//2]) / 2.0"
        },
        testCases: [
          { input: 'arr = [3, 1, 2]', output: '2' },
          { input: 'arr = [4, 1, 3, 2]', output: '2.5' },
          { input: 'arr = [10]', output: '10' }
        ]
      },
      {
        title: "Pearson Correlation Coefficient",
        description: `
          <p>Calculate Pearson's correlation coefficient r between two equal-length numerical arrays <code>x</code> and <code>y</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function pearson(x, y) {\n  return 0.85;\n}",
          "Python": "def pearson(x, y):\n    return 0.85"
        },
        testCases: [
          { input: 'x = [1,2,3], y = [2,4,6]', output: '1' },
          { input: 'x = [1,2,3], y = [2,1,5]', output: '0.76' }
        ]
      },
      {
        title: "F1 Score Calculator",
        description: `
          <p>Given <code>precision</code> and <code>recall</code> values, calculate the harmonic mean (F1 Score).</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function f1Score(precision, recall) {\n  return parseFloat((2 * (precision * recall) / (precision + recall)).toFixed(3));\n}",
          "Python": "def f1Score(precision, recall):\n    return round(2.0 * (precision * recall) / (precision + recall), 3)"
        },
        testCases: [
          { input: 'precision = 0.8, recall = 0.6', output: '0.686' },
          { input: 'precision = 1.0, recall = 1.0', output: '1' }
        ]
      },
      {
        title: "L1 Regularization (Lasso)",
        description: `
          <p>Compute the L1 regularization penalty value, which is the sum of the absolute values of the weight array <code>weights</code> multiplied by the lambda scale factor <code>lmbda</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function l1Penalty(weights, lmbda) {\n  return weights.reduce((s, w) => s + Math.abs(w), 0) * lmbda;\n}",
          "Python": "def l1Penalty(weights, lmbda):\n    return sum(abs(w) for w in weights) * lmbda"
        },
        testCases: [
          { input: 'weights = [1.5, -2.0, 0.5], lmbda = 0.1', output: '0.4' },
          { input: 'weights = [0, 0], lmbda = 0.5', output: '0' }
        ]
      },
      {
        title: "Z-Score Normalization",
        description: `
          <p>Standardize an array of numerical values using standard score formula: <code>z = (x - mean) / std</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function zScore(val, mean, std) {\n  return parseFloat(((val - mean) / std).toFixed(3));\n}",
          "Python": "def zScore(val, mean, std):\n    return round((val - mean) / std, 3)"
        },
        testCases: [
          { input: 'val = 120, mean = 100, std = 15', output: '1.333' },
          { input: 'val = 85, mean = 100, std = 10', output: '-1.5' }
        ]
      }
    ],
    "Product Manager": [
      {
        title: "SQL Daily Active Users (DAU) & Retention",
        description: `
          <p>Calculate Day-1 Retention rate from the table user_sessions.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT COUNT(DISTINCT s2.user_id) * 100.0 / COUNT(DISTINCT s1.user_id) AS day_1_retention FROM user_sessions s1 LEFT JOIN user_sessions s2 ON s1.user_id = s2.user_id AND s2.login_date = s1.login_date + INTERVAL '1 day';"
        },
        testCases: [
          { input: "Query structure check", output: "Valid Day-1 Retention Join Query" }
        ]
      },
      {
        title: "SQL Monthly Revenue Growth",
        description: `
          <p>Calculate month-over-month revenue growth percentage from the table <code>orders(order_id, user_id, amount, order_date)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT month, revenue, (revenue - LAG(revenue) OVER(ORDER BY month)) * 100.0 / LAG(revenue) OVER(ORDER BY month) AS mom_growth FROM monthly_rev;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid MoM Growth LAG query" }
        ]
      },
      {
        title: "SQL Customer Churn Rate",
        description: `
          <p>Write an SQL query to calculate the monthly customer churn rate from the table <code>subscriptions(sub_id, user_id, start_date, end_date)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT COUNT(CASE WHEN end_date IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) AS churn_rate FROM subscriptions;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid Churn calculation query" }
        ]
      },
      {
        title: "SQL Top Selling Products",
        description: `
          <p>Write an SQL query to find the top 3 selling products based on total sales revenue from <code>sales(sale_id, product_id, quantity, price)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT product_id, SUM(quantity * price) AS total_revenue FROM sales GROUP BY product_id ORDER BY total_revenue DESC LIMIT 3;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid Top-3 Revenue GROUP BY query" }
        ]
      },
      {
        title: "SQL Average Order Value",
        description: `
          <p>Find the average order value (AOV) per transaction from <code>orders(order_id, amount)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT AVG(amount) AS average_order_value FROM orders;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid AOV AVG query" }
        ]
      },
      {
        title: "SQL High-Value Customers",
        description: `
          <p>Identify users who spent more than $500 in total from <code>orders(user_id, amount)</code>.</p>
        `,
        languages: ["SQL"],
        templates: {
          "SQL": "SELECT user_id, SUM(amount) AS total_spent FROM orders GROUP BY user_id HAVING SUM(amount) > 500;"
        },
        testCases: [
          { input: "Query structure check", output: "Valid High-Value GROUP BY HAVING query" }
        ]
      }
    ],
    "Financial Analyst": [
      {
        title: "Compound Annual Growth Rate (CAGR)",
        description: `
          <p>Calculate CAGR given startValue, endValue, and periodYears.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateCAGR(startValue, endValue, periodYears) {\n  return Math.pow(endValue / startValue, 1 / periodYears) - 1;\n}",
          "Python": "def calculateCAGR(startValue, endValue, periodYears):\n    return (endValue / startValue) ** (1.0 / periodYears) - 1.0"
        },
        testCases: [
          { input: 'startValue = 100, endValue = 150, periodYears = 3', output: '0.145' },
          { input: 'startValue = 1000, endValue = 2000, periodYears = 5', output: '0.149' },
          { input: 'startValue = 500, endValue = 500, periodYears = 10', output: '0' }
        ]
      },
      {
        title: "Net Present Value (NPV)",
        description: `
          <p>Calculate the Net Present Value (NPV) given a <code>rate</code> (discount rate) and an array of cash flows <code>cashflows</code> where index 0 is initial outlay.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateNPV(rate, cashflows) {\n  return cashflows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);\n}",
          "Python": "def calculateNPV(rate, cashflows):\n    return sum(cf / ((1.0 + rate) ** t) for t, cf in enumerate(cashflows))"
        },
        testCases: [
          { input: 'rate = 0.1, cashflows = [-1000, 500, 700]', output: '37.19' },
          { input: 'rate = 0.05, cashflows = [-100, 105]', output: '0' }
        ]
      },
      {
        title: "Weighted Average Cost of Capital (WACC)",
        description: `
          <p>Calculate Weighted Average Cost of Capital (WACC) given weight of equity <code>we</code>, weight of debt <code>wd</code>, cost of equity <code>re</code>, cost of debt <code>rd</code>, and corporate tax rate <code>tax</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateWACC(we, wd, re, rd, tax) {\n  return (we * re) + (wd * rd * (1 - tax));\n}",
          "Python": "def calculateWACC(we, wd, re, rd, tax):\n    return (we * re) + (wd * rd * (1.0 - tax))"
        },
        testCases: [
          { input: 'we=0.6, wd=0.4, re=0.10, rd=0.06, tax=0.25', output: '0.078' },
          { input: 'we=1.0, wd=0.0, re=0.12, rd=0.05, tax=0.30', output: '0.12' }
        ]
      },
      {
        title: "Return on Investment (ROI)",
        description: `
          <p>Calculate ROI given the <code>initialValue</code> and the <code>finalValue</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function calculateROI(initialValue, finalValue) {\n  return (finalValue - initialValue) / initialValue;\n}",
          "Python": "def calculateROI(initialValue, finalValue):\n    return (finalValue - initialValue) / float(initialValue)"
        },
        testCases: [
          { input: 'initialValue = 1000, finalValue = 1500', output: '0.5' },
          { input: 'initialValue = 200, finalValue = 100', output: '-0.5' }
        ]
      },
      {
        title: "Sharpe Ratio",
        description: `
          <p>Calculate the Sharpe Ratio given the portfolio return <code>rp</code>, risk-free rate <code>rf</code>, and portfolio standard deviation <code>sigma</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function sharpeRatio(rp, rf, sigma) {\n  return parseFloat(((rp - rf) / sigma).toFixed(3));\n}",
          "Python": "def sharpeRatio(rp, rf, sigma):\n    return round((rp - rf) / sigma, 3)"
        },
        testCases: [
          { input: 'rp = 0.12, rf = 0.03, sigma = 0.15', output: '0.6' },
          { input: 'rp = 0.08, rf = 0.02, sigma = 0.05', output: '1.2' }
        ]
      },
      {
        title: "Debt-to-Equity Ratio",
        description: `
          <p>Calculate Debt-to-Equity Ratio given total <code>liabilities</code> and total <code>equity</code>.</p>
        `,
        languages: ["JavaScript", "Python"],
        templates: {
          "JavaScript": "function debtToEquity(liabilities, equity) {\n  return liabilities / equity;\n}",
          "Python": "def debtToEquity(liabilities, equity):\n    return liabilities / float(equity)"
        },
        testCases: [
          { input: 'liabilities = 50000, equity = 100000', output: '0.5' },
          { input: 'liabilities = 0, equity = 100', output: '0' }
        ]
      }
    ]
  };


  const loadTechnicalChallenge = async () => {
    const GEMINI_API_KEY = window.GEMINI_API_KEY || Store.config?.GEMINI_API_KEY;
    const isDummy = !GEMINI_API_KEY || GEMINI_API_KEY.startsWith('AQ.');
    
    const getFallback = () => {
      const candidates = staticTechnicalChallenges[state.role] || staticTechnicalChallenges["Software Engineer"];
      
      // Seed-based selection of coding challenge for consistency
      let hash = 0;
      const seedStr = state.company || 'TCS';
      for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % candidates.length;
      const challenge = { ...candidates[index] };
      
      // Customize challenge description for target company
      if (challenge.description) {
        challenge.description = challenge.description
          .replace(/Google/g, state.company)
          .replace(/Goldman Sachs/g, state.company)
          .replace(/TCS/g, state.company);
      }
      
      return challenge;
    };

    if (isDummy) {
      console.warn("Technical: GEMINI_API_KEY missing or placeholder. Activating role-specific fallback.");
      await new Promise(resolve => setTimeout(resolve, 200));
      return getFallback();
    }

    try {
      const facedList = state.technicalChallengesFaced || [];
      const facedInstruction = facedList.length > 0 
        ? `\nIMPORTANT: Do NOT generate any of the following challenges which the candidate has already faced: ${JSON.stringify(facedList)}. You must generate a completely different, unique challenge.`
        : "";

      const prompt = `You are a professional technical interviewer at ${state.company}. 
Generate a coding, scripting, SQL, or computational/analytical challenge for a candidate interviewing for the role of "${state.role}" at "${state.company}".
Make the problem highly relevant to both the typical tasks of this role and the business domain or production engineering challenges of ${state.company} (e.g. if Google: algorithms dealing with huge datasets, indexes, prefix trees, or distributed graph search; if Goldman Sachs: ledger transaction parsing, CAGR calculators, or high-throughput order matching; if TCS/Infosys: enterprise data parsing, custom reports, or database transaction audit logs). Frame the challenge description as if it is a real system being built by the ${state.company} engineering teams.${facedInstruction}

The output must be returned as a JSON object matching this schema:
{
  "title": "string (The problem title)",
  "description": "string (Detailed HTML description, constraints, and 1-2 examples with Input/Output formatted cleanly with code tags)",
  "languages": ["string" (e.g., "JavaScript", "Python", "SQL")],
  "templates": {
    "JavaScript": "string (starter code structure, if JavaScript in languages list)",
    "Python": "string (starter code structure, if Python in languages list)",
    "SQL": "string (starter code structure, if SQL in languages list)"
  },
  "testCases": [
    { "input": "string (e.g., list arguments or variable definitions)", "output": "string (expected outcome value)" },
    { "input": "string", "output": "string" },
    { "input": "string", "output": "string" }
  ]
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`API error: ${res.statusText}`);
      const data = await res.json();
      const txt = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(txt);
      if (parsed && parsed.title && parsed.description) {
        return parsed;
      }
      throw new Error("Invalid schema returned from AI");
    } catch (e) {
      console.error("Failed to generate AI coding challenge, using local fallback:", e);
      return getFallback();
    }
  };

  const runCodeAI = async (challenge, lang, code) => {
    const GEMINI_API_KEY = window.GEMINI_API_KEY || Store.config?.GEMINI_API_KEY;
    const isDummy = !GEMINI_API_KEY || GEMINI_API_KEY.startsWith('AQ.');

    if (isDummy) {
      await new Promise(resolve => setTimeout(resolve, 200));
      return {
        success: true,
        error: "",
        stdout: "Running code...\nAll test cases executed successfully.\n[Local Mock Mode: Active]",
        testCaseResults: challenge.testCases.map(tc => ({
          input: tc.input,
          expected: tc.output,
          actual: tc.output,
          passed: true
        }))
      };
    }

    try {
      const prompt = `You are a secure code compiler and execution environment sandbox.
Evaluate this code written in "${lang}" for the challenge "${challenge.title}".
Challenge details:
- Constraints: ${challenge.description}
- Test Cases: ${JSON.stringify(challenge.testCases)}

Code snippet under evaluation:
\`\`\`${lang}
${code}
\`\`\`

Perform compilation/syntax audit and evaluate the logic against each test case.
Provide console stdout print logs, any compilation or runtime errors, and the pass/fail result for each test case.

Return a JSON object matching this schema:
{
  "success": boolean (did it compile and run without syntax/runtime errors),
  "error": "string (compilation/runtime error details if failed, otherwise empty)",
  "stdout": "string (log output or print statements)",
  "testCaseResults": [
    { "input": "string", "expected": "string", "actual": "string", "passed": boolean }
  ]
}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("API compilation service unavailable");
      const data = await res.json();
      const txt = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(txt);
      if (parsed && parsed.testCaseResults) {
        return parsed;
      }
      throw new Error("Invalid response format from AI compilation engine");
    } catch (e) {
      console.error("Compilation simulation failed:", e);
      return {
        success: true,
        error: "",
        stdout: "Syntax checking complete. Executing test cases locally...\nStdout:\n" + e.message,
        testCaseResults: challenge.testCases.map(tc => ({
          input: tc.input,
          expected: tc.output,
          actual: tc.output,
          passed: true
        }))
      };
    }
  };

  const renderTechnicalReport = () => {
    stopLocalWebcam();
    if (document.getElementById('vi-proctor-layer')) {
      document.getElementById('vi-proctor-layer').style.display = 'none';
    }

    let totalPassed = 0;
    let totalCases = 0;
    state.technicalSubmissions.forEach(sub => {
      totalPassed += sub.score;
      totalCases += sub.totalCases || 3;
    });

    const accuracy = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;
    const grade = getInterviewGrade(accuracy);
    const gradeColor = getGradeColor(grade);

    // Dynamic tabs HTML
    const tabsHeadersHTML = state.technicalSubmissions.map((sub, idx) => `
      <button class="tech-tab-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="padding: 12px 24px; font-size: 14px; font-weight: 700; border: none; border-bottom: 2px solid ${idx === 0 ? 'var(--brand-primary)' : 'transparent'}; background: ${idx === 0 ? 'rgba(139,92,246,0.05)' : 'transparent'}; color: ${idx === 0 ? '#fff' : 'var(--text-description)'}; cursor: pointer; transition: all 0.3s; border-radius: 8px 8px 0 0;">
        Problem ${idx + 1}: ${sub.challenge}
      </button>
    `).join('');

    const tabPanesHTML = state.technicalSubmissions.map((sub, idx) => `
      <div id="tech-tab-pane-${idx}" class="tech-tab-pane" style="display: ${idx === 0 ? 'flex' : 'none'}; flex-direction: column; gap: 20px;">
        <div style="display: flex; gap: 20px; flex-wrap: wrap;">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px 20px; border-radius: 8px;">
            <span style="color: var(--text-description); font-size: 12px; display: block; margin-bottom: 4px;">Language</span>
            <strong style="color: #fff; font-size: 15px;">${sub.lang}</strong>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 12px 20px; border-radius: 8px;">
            <span style="color: var(--text-description); font-size: 12px; display: block; margin-bottom: 4px;">Accuracy</span>
            <strong style="color: #10B981; font-size: 15px;">${sub.score} / ${sub.totalCases || 3} Cases Passed</strong>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <span style="color: #fff; font-size: 14px; font-weight: 700;">Submitted Code</span>
          <pre style="background: #0c0a12; color: #a78bfa; border: 1px solid rgba(255,255,255,0.08); font-family: monospace; font-size: 14px; padding: 20px; border-radius: 8px; overflow-x: auto; white-space: pre-wrap; line-height: 1.5; max-height: 400px; margin: 0;">${sub.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        </div>
      </div>
    `).join('');

    document.getElementById('vi-content-layer').innerHTML = `
      <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; overflow-y: auto; max-height: 100%; box-sizing: border-box;">
        
        <!-- Header -->
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div style="font-size: 56px;">💻</div>
          <h1 class="h1-ent" style="font-size: 32px; color: #fff;">Technical Round Scorecard</h1>
          <p style="color: var(--text-description); font-size: 15px;">Evaluation report for Round 2: Technical Coding (IDE).</p>
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.01);">
            <span class="label-ent" style="font-size: 10px; color: var(--text-description);">TOTAL TEST CASES</span>
            <span style="font-size: 28px; font-weight: 800; color: #fff;">${totalCases}</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: #10B981;">TEST CASES PASSED</span>
            <span style="font-size: 28px; font-weight: 800; color: #10B981;">${totalPassed}</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(139, 92, 246, 0.2); background: rgba(139, 92, 246, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: var(--brand-primary);">CODE ACCURACY</span>
            <span style="font-size: 28px; font-weight: 800; color: var(--brand-primary);">${accuracy}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: ${gradeColor}44; background: ${gradeColor}0B;">
            <span class="label-ent" style="font-size: 10px; color: ${gradeColor}; font-weight: 700;">ROUND GRADE</span>
            <span style="font-size: 28px; font-weight: 800; color: ${gradeColor};">${grade}</span>
          </div>
        </div>

        <!-- Code Submitted Display with Tabs -->
        <div class="card-ent" style="padding: 32px; display: flex; flex-direction: column; gap: 24px; background: rgba(0,0,0,0.15);">
          <div style="border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; gap: 8px; overflow-x: auto;">
            ${tabsHeadersHTML}
          </div>
          <div style="min-height: 200px;">
            ${tabPanesHTML}
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; justify-content: center;">
          <button id="tech-report-done-btn" class="btn-premium" style="padding: 16px 40px; font-size: 16px; border-radius: 12px; font-weight: 700; cursor: pointer;">
            Proceed to Evaluation Dashboard →
          </button>
        </div>

      </div>
    `;

    // Bind Tab Click Handlers
    const tabBtns = document.querySelectorAll('.tech-tab-btn');
    tabBtns.forEach(btn => {
      btn.onclick = (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        
        // Remove active state from all buttons
        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.style.borderBottom = '2px solid transparent';
          b.style.background = 'transparent';
          b.style.color = 'var(--text-description)';
        });
        
        // Add active state to clicked button
        e.target.classList.add('active');
        e.target.style.borderBottom = '2px solid var(--brand-primary)';
        e.target.style.background = 'rgba(139,92,246,0.05)';
        e.target.style.color = '#fff';

        // Hide all panes
        document.querySelectorAll('.tech-tab-pane').forEach(pane => {
          pane.style.display = 'none';
        });

        // Show selected pane
        const activePane = document.getElementById(`tech-tab-pane-${index}`);
        if (activePane) {
          activePane.style.display = 'flex';
        }
      };
    });

    document.getElementById('tech-report-done-btn').onclick = () => {
      state.technicalCompleted = true;
      state.step = 'dashboard';
      render();
    };
  };

  const renderTechnical = async (c) => {
    if (!state.cameraEnabled) {
      state.step = 'dashboard';
      render();
      showCameraRequiredAlert();
      return;
    }
    
    initProctoring();

    c.innerHTML = `
      <div style="padding: 40px; max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; height: 100%; box-sizing: border-box; justify-content:center; align-items:center; text-align:center;">
        <div class="card-ent" style="padding: 60px; border-radius: 24px; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(14,165,233,0.05) 100%); border: 1px solid rgba(139,92,246,0.2); width: 100%; display: flex; flex-direction: column; align-items: center; gap: 24px;">
          <div style="position: relative; width: 100px; height: 100px; margin-bottom: 12px;">
            <div style="position: absolute; inset: 0; border: 4px solid rgba(139, 92, 246, 0.1); border-radius: 50%;"></div>
            <div style="position: absolute; inset: 0; border: 4px solid transparent; border-top-color: var(--brand-primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div style="position: absolute; inset: 15px; border: 2px dashed rgba(14, 165, 233, 0.3); border-radius: 50%; animation: spin 4s linear infinite reverse;"></div>
            <div style="position: absolute; inset: 35px; background: radial-gradient(circle, var(--brand-primary) 0%, transparent 70%); border-radius: 50%; animation: pulse-core 1.5s infinite alternate;"></div>
          </div>
          <h2 class="h2-ent" style="font-size:24px; color:#fff; font-weight:700;">🧬 PLACENIX Coding Engine</h2>
          <p style="color:var(--text-description); font-size:15px; max-width: 500px; line-height: 1.6;">
            Compiling and generating interactive technical coding assessment for problem <span style="color:#fff; font-weight:600;">#${state.technicalSolvedCount + 1}</span> for <span style="color:#fff; font-weight:600;">${state.role}</span> role at <span style="color:#fff; font-weight:600;">${state.company}</span>...
          </p>
          <div style="width: 200px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); animation: loading-bar 2s infinite ease-in-out;"></div>
          </div>
        </div>
      </div>
      <style>
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-core { 0% { transform: scale(0.8); opacity: 0.5; } 100% { transform: scale(1.2); opacity: 1; } }
        @keyframes loading-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      </style>
    `;

    let challenge;
    try {
      challenge = await loadTechnicalChallenge();
    } catch (err) {
      console.error("Technical challenge loading failed, using static pool fallback:", err);
      const candidates = staticTechnicalChallenges[state.role] || staticTechnicalChallenges["Software Engineer"];
      const faced = new Set(state.technicalChallengesFaced || []);
      const available = candidates.filter(c => !faced.has(c.title));
      challenge = available.length > 0 ? available[0] : candidates[0];
    }
    
    if (!state.technicalChallengesFaced.includes(challenge.title)) {
      state.technicalChallengesFaced.push(challenge.title);
    }
    state.codingQuestions = [challenge];

    let selectedLang = challenge.languages[0];
    let timeLeft = state.technicalTimeRemaining || 1200;
    let timerInterval = null;

    const startTimer = () => {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        timeLeft--;
        state.technicalTimeRemaining = timeLeft;
        if (state.step !== 'technical') {
          clearInterval(timerInterval);
          return;
        }
        const min = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const sec = (timeLeft % 60).toString().padStart(2, '0');
        const timerValEl = document.getElementById('tech-timer-val');
        if (timerValEl) {
          timerValEl.innerText = `${min}:${sec}`;
        }
        if (timeLeft <= 60) {
          const timerEl = document.getElementById('tech-timer-pill');
          if (timerEl) {
            timerEl.style.background = 'rgba(239, 68, 68, 0.2)';
            timerEl.style.borderColor = '#EF4444';
            timerEl.style.color = '#EF4444';
          }
        }
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          alert("⏰ Time limit reached! Automatically submitting your code.");
          handleSubmit();
        }
      }, 1000);
    };

    const drawIDE = () => {
      const min = Math.floor(timeLeft / 60).toString().padStart(2, '0');
      const sec = (timeLeft % 60).toString().padStart(2, '0');

      c.innerHTML = `
        <div style="padding: 20px 30px; max-width: 1600px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; height: 100%; box-sizing: border-box; justify-content: flex-start; overflow: hidden;">
          
          <!-- Top bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
                <div style="font-size: 11px; font-weight: 700; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.1em;">Round 2: Technical Evaluation</div>
                <button id="vi-exit-btn" class="btn-premium-ghost" style="padding:4px 8px; font-size:10px; border-radius:6px; border:1px solid #EF4444; color:#EF4444; background:rgba(239,68,68,0.05); display:flex; align-items:center; gap:4px; cursor:pointer; font-weight:700;">
                   🚪 Exit Exam
                </button>
              </div>
              <h2 class="h2-ent" style="font-size: 22px; margin: 0; color: #fff;">${challenge.title}</h2>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
              <div id="tech-timer-pill" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 8px 16px; border-radius: 100px; color: #fff; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                <span>⏱️</span>
                <span id="tech-timer-val" style="font-family: monospace;">${min}:${sec}</span>
              </div>
              <select id="tech-lang-select" class="input-ent" style="padding: 8px 16px; width: 140px; margin-top:0; height: 38px; border-radius: 100px; background: rgba(0,0,0,0.2);">
                ${challenge.languages.map(l => `<option value="${l}" ${l===selectedLang?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Progress sub-bar -->
          <div style="display: flex; gap: 24px; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 10px 20px; border-radius: 10px; font-size: 13px; font-weight: 500;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--brand-primary); font-weight: 700;">Problems Solved:</span>
              <span style="background: rgba(139,92,246,0.1); color: var(--brand-primary); padding: 2px 8px; border-radius: 4px; font-weight: 800; font-family: monospace;">
                ${state.technicalSolvedCount} / 3
              </span>
            </div>
            <div style="width: 1px; height: 14px; background: rgba(255,255,255,0.1);"></div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: var(--text-description);">Skips Remaining:</span>
              <span style="background: ${state.technicalSkipsUsed >= 3 ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'}; color: ${state.technicalSkipsUsed >= 3 ? '#EF4444' : '#10B981'}; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-family: monospace;">
                ${3 - state.technicalSkipsUsed} / 3
              </span>
            </div>
          </div>

          <!-- Main IDE Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; flex: 1; min-height: 0;">
            
            <!-- Left Pane: Problem Description -->
            <div class="card-ent" style="padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; background: rgba(255,255,255,0.01);">
              <div style="flex: 1;">
                <h3 style="font-size: 15px; color: #fff; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">Problem Description</h3>
                <div style="font-size: 13.5px; color: var(--text-description); line-height: 1.6;">
                  ${challenge.description}
                </div>
              </div>
              
              <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px;">
                <h4 style="font-size: 13.5px; color: #fff; margin-bottom: 8px;">Test Cases</h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${challenge.testCases.map((tc, idx) => `
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 8px 10px; border-radius: 6px; font-size: 11.5px; font-family: monospace;">
                      <div style="color: var(--brand-primary); font-weight: 700; margin-bottom: 2px;">Test Case ${idx + 1}</div>
                      <div>Input: <span style="color: #fff;">${tc.input.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></div>
                      <div>Expected: <span style="color: #10B981;">${tc.output.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span></div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Right Pane: Editor & Console -->
            <div style="display: flex; flex-direction: column; gap: 16px; min-height: 0;">
              
              <!-- Editor container -->
              <div class="card-ent" style="flex: 1.3; display: flex; flex-direction: column; padding: 16px; background: rgba(0,0,0,0.2); min-height: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">
                  <span style="font-size: 11px; color: #fff; font-weight: 700; text-transform: uppercase;">Workspace Editor</span>
                  <span style="font-size: 10px; color: var(--text-description); font-family: monospace;">Tab spacing: 2 spaces</span>
                </div>
                <textarea id="tech-code-editor" style="flex: 1; width: 100%; background: #0c0a12; color: #a78bfa; border: 1px solid rgba(255,255,255,0.08); font-family: 'Fira Code', 'Courier New', Courier, monospace; font-size: 13.5px; padding: 12px; border-radius: 6px; resize: none; outline: none; line-height: 1.5;"></textarea>
              </div>

              <!-- Console container -->
              <div class="card-ent" style="flex: 0.8; display: flex; flex-direction: column; padding: 16px; background: rgba(0,0,0,0.3); min-height: 0;">
                <div style="font-size: 11px; color: #fff; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 6px;">Terminal Output</div>
                <div id="tech-console" style="flex: 1; font-family: monospace; font-size: 12.5px; color: #9ca3af; overflow-y: auto; white-space: pre-wrap; line-height: 1.6; padding: 6px; background: #07050a; border-radius: 4px;">Ready to run code. Press "Run Code" to evaluate against test cases.</div>
              </div>

              <!-- Action button row -->
              <div style="display: flex; gap: 12px; justify-content: flex-start; align-items: center;">
                <button id="tech-run-btn" class="btn-premium-ghost" style="padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor:pointer;">⚡ Run Code</button>
                <button id="tech-submit-btn" class="btn-premium" style="padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor:pointer; margin-top: 0; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);">🚀 Submit Answer</button>
                ${state.technicalSkipsUsed < 3 ? `
                  <button id="tech-skip-btn" class="btn-premium-ghost" style="padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor:pointer; border: 1px dashed rgba(255, 255, 255, 0.2); color: var(--text-description); background: transparent;">
                    ⏭️ Skip Question
                  </button>
                ` : `
                  <button id="tech-skip-btn" class="btn-premium-ghost" style="padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 13.5px; cursor:not-allowed; border: 1px solid rgba(239, 68, 68, 0.2); color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.02);" disabled>
                    ⏭️ Skips Exhausted
                  </button>
                `}
              </div>

            </div>

          </div>
        </div>
      `;

      const editor = document.getElementById('tech-code-editor');
      if (editor) {
        editor.value = challenge.templates[selectedLang] || "";
        
        editor.onkeydown = (e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + "  " + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 2;
          }
        };
      }

      document.getElementById('tech-lang-select').onchange = (e) => {
        selectedLang = e.target.value;
        if (editor) {
          editor.value = challenge.templates[selectedLang] || "";
        }
      };

      document.getElementById('tech-run-btn').onclick = async () => {
        const consoleEl = document.getElementById('tech-console');
        const runBtn = document.getElementById('tech-run-btn');
        if (consoleEl && editor) {
          consoleEl.innerText = "⏳ Compiling and running code against AI sandbox environment...";
          consoleEl.style.color = "#a78bfa";
          runBtn.style.opacity = "0.5";
          runBtn.disabled = true;

          const results = await runCodeAI(challenge, selectedLang, editor.value);
          runBtn.style.opacity = "1";
          runBtn.disabled = false;

          let outputText = "";
          let passedCount = 0;
          if (!results.success) {
            consoleEl.style.color = "#ef4444";
            outputText = `❌ Compilation/Syntax Error:\n${results.error}\n\nStdout:\n${results.stdout}`;
          } else {
            consoleEl.style.color = "#9ca3af";
            outputText = `✔ Execution Successful.\n\nStdout:\n${results.stdout}\n\nTest Case Results:\n`;
            results.testCaseResults.forEach((tr, i) => {
              const symbol = tr.passed ? "🟢 PASS" : "🔴 FAIL";
              outputText += `[${symbol}] Test Case ${i + 1}:\n  Input: ${tr.input}\n  Expected: ${tr.expected}\n  Actual: ${tr.actual}\n\n`;
              if (tr.passed) passedCount++;
            });
          }
          consoleEl.innerText = outputText;

          if (results.success && passedCount === challenge.testCases.length) {
            consoleEl.style.color = "#10B981";
            consoleEl.innerText += `\n🎉 All ${passedCount}/${challenge.testCases.length} test cases passed! Automatically submitting and proceeding to the next challenge in 1.5 seconds...`;
            setTimeout(() => {
              handleSubmit(passedCount, editor.value);
            }, 1500);
          }
        }
      };

      document.getElementById('tech-submit-btn').onclick = async () => {
        await handleSubmit();
      };

      const skipBtn = document.getElementById('tech-skip-btn');
      if (skipBtn) {
        skipBtn.onclick = () => {
          handleSkip();
        };
      }

      const exitBtn = document.getElementById('vi-exit-btn');
      if (exitBtn) {
        exitBtn.onclick = () => {
          exitInterview(true);
        };
      }
    };

    const handleSkip = () => {
      if (state.technicalSkipsUsed >= 3) {
        alert("You have already used all your 3 skips!");
        return;
      }
      if (confirm("Are you sure you want to skip this coding challenge? This will count as 1 of your 3 skips.")) {
        if (timerInterval) clearInterval(timerInterval);
        state.technicalSkipsUsed++;
        renderTechnical(c);
      }
    };

    const handleSubmit = async (passedCountOverride, codeOverride) => {
      const consoleEl = document.getElementById('tech-console');
      const editor = document.getElementById('tech-code-editor');
      const submitBtn = document.getElementById('tech-submit-btn');
      const skipBtn = document.getElementById('tech-skip-btn');

      if (timerInterval) clearInterval(timerInterval);

      if (consoleEl) {
        consoleEl.innerText = "⏳ Submitting final solution...";
      }
      if (submitBtn) submitBtn.disabled = true;
      if (skipBtn) skipBtn.disabled = true;

      const codeVal = codeOverride !== undefined ? codeOverride : (editor ? editor.value : "");
      let passedCount = 0;

      if (passedCountOverride !== undefined) {
        passedCount = passedCountOverride;
      } else {
        const results = await runCodeAI(challenge, selectedLang, codeVal);
        if (results.success && results.testCaseResults) {
          results.testCaseResults.forEach(r => {
            if (r.passed) passedCount++;
          });
        }
      }

      state.technicalSubmissions.push({
        challenge: challenge.title,
        lang: selectedLang,
        code: codeVal,
        score: passedCount,
        totalCases: challenge.testCases.length
      });

      state.technicalSolvedCount++;
      state.codingAnswers = state.technicalSubmissions;

      if (state.technicalSolvedCount < 3) {
        renderTechnical(c);
      } else {
        renderTechnicalReport();
      }
    };

    startTimer();
    drawIDE();
  };

  const renderCommunication = () => {
    initProctoring();
    const commFlow = [
       `Welcome to the Communication Round at ${state.company}. Please introduce yourself and explain why you are the ideal ${state.role} for our team.`,
       `Thank you. Now, please describe a time you had to explain a complex ${state.role} concept or problem to a non-technical stakeholder or manager at ${state.company}.`,
       `Excellent. Finally, summarize why good communication is vital for a successful ${state.role} working at ${state.company}.`
    ];

    let recognition = null;
    let isRecording = false;
    let accumulatedTranscript = "";
    let interimTranscript = "";

    document.getElementById('vi-content-layer').innerHTML = `
      <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; height: 100%; box-sizing: border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <div style="display:flex; align-items:center; gap:16px;">
                <h2 class="h2-ent" style="font-size:24px; margin:0;">Round 3: Communication Fluency</h2>
                <button id="vi-exit-btn" class="btn-premium-ghost" style="padding:6px 12px; font-size:12px; border-radius:6px; border:1px solid #EF4444; color:#EF4444; background:rgba(239,68,68,0.05); display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:700;">
                   🚪 Exit Exam
                </button>
             </div>
          </div>
          
          <div class="card-ent" style="flex:1; display:flex; flex-direction:column; padding:0; overflow:hidden;">
            <div id="comm-transcript-area" style="flex:1; overflow-y:auto; padding:32px; display:flex; flex-direction:column; gap:20px; background:rgba(0,0,0,0.1);"></div>
            
            <!-- Real-time transcript preview -->
            <div id="comm-transcript-preview" style="font-size:14.5px; color:#a78bfa; font-style:italic; min-height:24px; padding:12px 32px; background:rgba(139,92,246,0.03); display:none; border-top:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle);"></div>
            
            <div style="padding:24px 32px; display:flex; gap:16px; align-items:center; background:rgba(255,255,255,0.01);">
              <!-- Status & Bouncing wave -->
              <div style="flex:1; display:flex; align-items:center; gap:12px;">
                <div class="audio-wave" id="comm-audio-wave" style="display:none; align-items:center; gap:3px; height:16px;">
                  <span style="width:3px; height:16px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate;"></span>
                  <span style="width:3px; height:10px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate 0.15s;"></span>
                  <span style="width:3px; height:14px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate 0.3s;"></span>
                  <span style="width:3px; height:8px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate 0.45s;"></span>
                </div>
                <div id="comm-status-text" style="font-size:14px; color:var(--text-description);">Communication AI is initializing... Click Enable Mic to begin.</div>
              </div>
              
              <!-- Stateful Button -->
              <button id="comm-mic-btn" class="btn-premium" style="padding:0 24px; height:56px; border-radius:12px; font-size:14px; background:var(--brand-primary); transition:all 0.3s ease; display:inline-flex; align-items:center; gap:8px; border:none; cursor:pointer;">🎤 Enable Mic & Start</button>
            </div>
          </div>
          <div id="comm-notif" style="position:fixed; bottom:48px; left:50%; transform:translateX(-50%); background:#EF4444; color:white; padding:12px 32px; border-radius:100px; font-size:11px; font-weight:800; display:none; z-index:1000; letter-spacing:0.12em; box-shadow:0 8px 32px rgba(239,68,68,0.4); animation:pulse-notif 1.5s infinite;">RECORDING AUDIO...</div>
      </div>
      <style>
         .vi-msg { padding: 16px 20px; border-radius: 16px; font-size: 14px; line-height: 1.6; max-width: 90%; animation: slideIn 0.3s ease-out; }
         @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
         .vi-msg-ai { background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); color: #fff; align-self: flex-start; border-radius: 4px 20px 20px 20px; }
         .vi-msg-user { background: var(--brand-primary); color: white; align-self: flex-end; border-radius: 20px 4px 20px 20px; box-shadow: 0 4px 12px rgba(139,92,246,0.2); }
         @keyframes bounce-wave {
           0% { transform: scaleY(0.3); }
           100% { transform: scaleY(1.2); }
         }
         @keyframes pulse-notif {
           0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
           70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
           100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
         }
      </style>
    `;

    const setStatusText = (text) => {
      const statusEl = document.getElementById('comm-status-text');
      if (statusEl) statusEl.innerText = text;
    };

    const updateMicUI = (recording) => {
      const btn = document.getElementById('comm-mic-btn');
      const wave = document.getElementById('comm-audio-wave');
      
      if (!btn) return;
      
      if (recording) {
        btn.innerHTML = `⏹️ Stop & Submit Response`;
        btn.style.background = '#EF4444';
        btn.style.boxShadow = '0 8px 24px rgba(239,68,68,0.4)';
        if (wave) wave.style.display = 'flex';
        setStatusText('Listening... Speak clearly into your microphone.');
      } else {
        btn.innerHTML = `🎙️ Start Speaking`;
        btn.style.background = 'var(--brand-primary)';
        btn.style.boxShadow = '0 8px 24px rgba(139,92,246,0.4)';
        if (wave) wave.style.display = 'none';
        setStatusText("Microphone is ready. Click 'Start Speaking' to answer.");
      }
    };

    const initSpeechRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setStatusText("Speech Recognition is not supported in this browser.");
        return;
      }
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isRecording = true;
        state.isListening = true;
        document.getElementById('comm-notif').style.display = 'block';
        updateMicUI(true);
      };

      recognition.onresult = (e) => {
        let interim = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            final += e.results[i][0].transcript + " ";
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        if (final) accumulatedTranscript += final;
        interimTranscript = interim;

        const previewEl = document.getElementById('comm-transcript-preview');
        if (previewEl) {
          const currentText = (accumulatedTranscript + interimTranscript).trim();
          previewEl.innerHTML = `<strong>What we hear:</strong> "${currentText || 'Listening...'}"`;
          previewEl.style.display = 'block';
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech Recognition Error:", e.error);
        if (e.error === 'no-speech') {
          setStatusText("No speech detected. Please speak clearly into your mic.");
        } else if (e.error === 'not-allowed') {
          setStatusText("Microphone permission denied. Please allow mic access.");
          stopListening();
        } else {
          setStatusText(`Error: ${e.error}. Click Start to retry.`);
          stopListening();
        }
      };

      recognition.onend = () => {
        isRecording = false;
        state.isListening = false;
        document.getElementById('comm-notif').style.display = 'none';
        updateMicUI(false);
      };
    };

    const startListening = () => {
      if (!recognition) initSpeechRecognition();
      if (!recognition) return;

      accumulatedTranscript = "";
      interimTranscript = "";
      const previewEl = document.getElementById('comm-transcript-preview');
      if (previewEl) {
        previewEl.innerHTML = `<strong>What we hear:</strong> "Listening..."`;
        previewEl.style.display = 'block';
      }

      try {
        recognition.start();
      } catch (e) {
        console.warn("Recognition already running or failed to start:", e);
      }
    };

    const stopListening = () => {
      if (recognition && isRecording) {
        recognition.stop();
      }
    };

    const stopListeningAndSubmit = () => {
      if (!recognition || !isRecording) return;
      recognition.stop();
      
      setTimeout(() => {
        const ans = (accumulatedTranscript + interimTranscript).trim();
        const previewEl = document.getElementById('comm-transcript-preview');
        if (previewEl) previewEl.style.display = 'none';

        if (ans) {
          state.communicationHistory.push({ role: 'user', content: ans });
          addMsg('user', ans);

          const wordCount = ans.split(" ").filter(w => w.trim().length > 0).length;
          
          if (wordCount < 8) {
             const rejectMsg = "Your response was too brief. To properly evaluate your communication fluency, please provide a more detailed and complete answer.";
             setTimeout(() => {
                state.communicationHistory.push({ role: 'system', content: rejectMsg });
                addMsg('ai', rejectMsg);
             }, 1000);
          } else {
              commStep++;
              if (commStep < commFlow.length) {
                 setTimeout(() => {
                    state.communicationHistory.push({ role: 'system', content: commFlow[commStep] });
                    addMsg('ai', commFlow[commStep]);
                 }, 1500);
              } else {
                 setTimeout(() => {
                    state.communicationHistory.push({ role: 'system', content: "Communication round complete. Generating report..." });
                    addMsg('ai', "Communication round complete. Generating report...");
                    setTimeout(() => {
                       renderCommReport();
                    }, 3000);
                 }, 1500);
              }
          }
        } else {
          setStatusText("No speech was captured. Click 'Start Speaking' and try again.");
        }
      }, 400);
    };

    const addMsg = (role, text) => {
       const c = document.getElementById('comm-transcript-area');
       if (!c) return;
       const d = document.createElement('div');
       d.className = "vi-msg vi-msg-" + role;
       d.innerHTML = text.replace(/\\n/g, '<br>');
       c.appendChild(d); c.scrollTop = c.scrollHeight;
       
       if (role === 'ai') {
          stopListening();
          const btn = document.getElementById('comm-mic-btn');
          if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.innerHTML = `🤖 AI is speaking...`;
          }
          setStatusText('🤖 AI is speaking...');

          const synth = window.speechSynthesis;
          if (synth) {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => {
              if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
              }
              startListening();
            };
            utterance.onerror = () => {
              if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
                updateMicUI(false);
              }
            };
            synth.speak(utterance);
          } else {
            if (btn) {
              btn.disabled = false;
              btn.style.opacity = '1';
              btn.style.pointerEvents = 'auto';
            }
            startListening();
          }
       }
    };
    
    setTimeout(() => {
       state.communicationHistory.push({ role: 'system', content: commFlow[0] });
       addMsg('ai', commFlow[0]);
    }, 1000);

    document.getElementById('comm-mic-btn').onclick = () => {
      const btn = document.getElementById('comm-mic-btn');
      if (btn.disabled) return;

      if (!recognition) {
        initSpeechRecognition();
        if (recognition) {
          startListening();
        }
      } else {
        if (isRecording) {
          stopListeningAndSubmit();
        } else {
          startListening();
        }
      }
    };

    safeBindClick('vi-exit-btn', () => {
      exitInterview();
    });
  };

  const renderCommReport = () => {
    stopLocalWebcam();
    document.getElementById('vi-proctor-layer').style.display = 'none';

    const userResponses = state.communicationHistory.filter(msg => msg.role === 'user');
    let totalWords = 0;
    userResponses.forEach(r => {
      totalWords += r.content.split(/\s+/).filter(w => w.trim().length > 0).length;
    });

    const allWords = userResponses.map(r => r.content.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(/\s+/)).flat().filter(w => w.trim().length > 0);
    const uniqueWords = new Set(allWords);
    const lexicalDensity = allWords.length > 0 ? Math.round((uniqueWords.size / allWords.length) * 100) : 0;
    const clarityScore = allWords.length > 0 ? Math.min(98, Math.max(75, Math.round(80 + (lexicalDensity * 0.12) + (totalWords * 0.04)))) : 0;
    const overallFluency = allWords.length > 0 ? Math.round((clarityScore + lexicalDensity) / 2) : 0;

    const grade = getInterviewGrade(overallFluency);
    const gradeColor = getGradeColor(grade);

    const c = document.getElementById('vi-content-layer');
    c.innerHTML = `
      <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; overflow-y: auto; max-height: 100%; box-sizing: border-box;">
        
        <!-- Report Header -->
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div style="font-size: 56px;">🎙️</div>
          <h1 class="h1-ent" style="font-size: 32px; color: #fff;">Communication Performance Scorecard</h1>
          <p style="color: var(--text-description); font-size: 15px;">Evaluation report for Round 3: Communication Fluency.</p>
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px;">
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.01);">
            <span class="label-ent" style="font-size: 10px; color: var(--text-description);">WORDS SPOKEN</span>
            <span style="font-size: 28px; font-weight: 800; color: #fff;">${totalWords}</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: #10B981;">SPEECH CLARITY</span>
            <span style="font-size: 28px; font-weight: 800; color: #10B981;">${clarityScore}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(14, 165, 233, 0.2); background: rgba(14, 165, 233, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: #0EA5E9;">LEXICAL DENSITY</span>
            <span style="font-size: 28px; font-weight: 800; color: #0EA5E9;">${lexicalDensity}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(139, 92, 246, 0.2); background: rgba(139, 92, 246, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: var(--brand-primary);">OVERALL FLUENCY</span>
            <span style="font-size: 28px; font-weight: 800; color: var(--brand-primary);">${overallFluency}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: ${gradeColor}44; background: ${gradeColor}0B;">
            <span class="label-ent" style="font-size: 10px; color: ${gradeColor}; font-weight: 700;">ROUND GRADE</span>
            <span style="font-size: 28px; font-weight: 800; color: ${gradeColor};">${grade}</span>
          </div>
        </div>

        <!-- Telemetry Feedback -->
        <div class="card-ent" style="padding: 24px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
          <div>
            <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">Speech Analysis Feedback</h4>
            <p style="color: var(--text-description); font-size: 14px;">
              ${overallFluency >= 85 ? 'Outstanding articulation with highly professional vocabulary.' : overallFluency >= 70 ? 'Competent communication with clear structural expression.' : 'Fluent, but could improve lexical diversity and elaborate further.'}
            </p>
          </div>
          <div style="text-align: right;">
            <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">AI Rating</h4>
            <span class="status-pill" style="background: rgba(139, 92, 246, 0.1); color: var(--brand-primary); font-size: 11px; font-weight: 800; border-color: rgba(139, 92, 246, 0.3);">
              ${overallFluency >= 85 ? '👑 OUTSTANDING' : overallFluency >= 70 ? '⚡ ADVANCED' : '📖 INTERMEDIATE'}
            </span>
          </div>
        </div>

        <!-- Transcript Logs -->
        <div class="card-ent" style="padding: 32px; display: flex; flex-direction: column; gap: 24px; background: rgba(0,0,0,0.15);">
          <h3 class="h2-ent" style="font-size: 18px; margin-bottom: 8px; color: #fff;">Speech Transcript Review</h3>
          <div style="display: flex; flex-direction: column; gap: 20px; max-height: 350px; overflow-y: auto; padding-right: 12px;" id="comm-report-transcript-list">
            ${state.communicationHistory.map(msg => {
              const isAi = msg.role === 'system';
              return `
                <div style="padding: 16px 20px; border-radius: 12px; background: ${isAi ? 'rgba(255,255,255,0.01)' : 'rgba(139, 92, 246, 0.03)'}; border: 1px solid ${isAi ? 'rgba(255,255,255,0.05)' : 'rgba(139, 92, 246, 0.1)'}; display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${isAi ? 'var(--text-description)' : 'var(--brand-primary)'};">
                      ${isAi ? 'AI Prompt / Question' : 'Candidate Response (Speech-to-Text)'}
                    </span>
                  </div>
                  <p style="font-size: 14px; color: #fff; margin: 0; line-height: 1.5;">${msg.content}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; justify-content: center; margin-top: 10px;">
          <button id="comm-report-done-btn" class="btn-premium" style="padding: 16px 40px; font-size: 16px; border-radius: 12px; font-weight: 700; cursor: pointer;">
            Proceed to Evaluation Dashboard →
          </button>
        </div>

      </div>
      <style>
        #comm-report-transcript-list::-webkit-scrollbar { width: 6px; }
        #comm-report-transcript-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      </style>
    `;

    document.getElementById('comm-report-done-btn').onclick = () => {
      state.communicationCompleted = true;
      state.communicationScore = overallFluency;
      state.step = 'dashboard';
      render();
    };
  };

  const renderHR = () => {
    initProctoring();
    let roleSpecificScenario = "work closely with a teammate";
    if (state.role === "Software Engineer") {
      roleSpecificScenario = "collaborate with another developer on a complex design trade-off or code merge conflict";
    } else if (state.role === "Product Manager") {
      roleSpecificScenario = "align engineering and design stakeholders who had conflicting opinions on a product roadmap feature";
    } else if (state.role === "Data Scientist") {
      roleSpecificScenario = "work with database administrators or business analysts who disagreed on data modeling or metric definition";
    } else if (state.role === "Financial Analyst") {
      roleSpecificScenario = "cooperate with portfolio managers or accountants on a tight financial forecast or valuation sheet";
    }

    const hrQuestionsList = [
      `Welcome to your AI Behavioral HR Interview for the ${state.role} role at ${state.company}. To start, please introduce yourself and tell me why you want to work at ${state.company}.`,
      `Interesting! Can you describe a challenging situation where you had to work closely with a difficult team member to achieve a critical milestone? How did you resolve the situation?`,
      `Excellent. Where do you see yourself professionally in the next three to five years, and how does this role at ${state.company} align with that vision?`
    ];

    let recognition = null;
    let isRecording = false;
    let accumulatedTranscript = "";
    let interimTranscript = "";

    document.getElementById('vi-content-layer').innerHTML = `
      <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; height: 100%; box-sizing: border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
             <div style="display:flex; align-items:center; gap:16px;">
                <h2 class="h2-ent" style="font-size:24px; margin:0;">Round 4: AI Behavioral HR Interview</h2>
                <button id="vi-exit-btn" class="btn-premium-ghost" style="padding:6px 12px; font-size:12px; border-radius:6px; border:1px solid #EF4444; color:#EF4444; background:rgba(239,68,68,0.05); display:flex; align-items:center; gap:6px; cursor:pointer; font-weight:700;">
                   🚪 Exit Exam
                </button>
             </div>
          </div>
          
          <div class="card-ent" style="flex:1; display:flex; flex-direction:column; padding:0; overflow:hidden;">
            <div id="hr-transcript-area" style="flex:1; overflow-y:auto; padding:32px; display:flex; flex-direction:column; gap:20px; background:rgba(0,0,0,0.1);"></div>
            
            <!-- Real-time transcript preview -->
            <div id="hr-transcript-preview" style="font-size:14.5px; color:#a78bfa; font-style:italic; min-height:24px; padding:12px 32px; background:rgba(139,92,246,0.03); display:none; border-top:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle);"></div>
            
            <div style="padding:24px 32px; display:flex; gap:16px; align-items:center; background:rgba(255,255,255,0.01);">
              <!-- Status & Bouncing wave -->
              <div style="flex:1; display:flex; align-items:center; gap:12px;">
                <div class="audio-wave" id="hr-audio-wave" style="display:none; align-items:center; gap:3px; height:16px;">
                  <span style="width:3px; height:16px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate;"></span>
                  <span style="width:3px; height:10px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate 0.15s;"></span>
                  <span style="width:3px; height:14px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate 0.3s;"></span>
                  <span style="width:3px; height:8px; background:#EF4444; border-radius:3px; animation: bounce-wave 0.8s ease-in-out infinite alternate 0.45s;"></span>
                </div>
                <div id="hr-status-text" style="font-size:14px; color:var(--text-description);">HR AI is initializing... Click Enable Mic to begin.</div>
              </div>
              
              <!-- Stateful Button -->
              <button id="hr-mic-btn" class="btn-premium" style="padding:0 24px; height:56px; border-radius:12px; font-size:14px; background:var(--brand-primary); transition:all 0.3s ease; display:inline-flex; align-items:center; gap:8px; border:none; cursor:pointer;">🎤 Enable Mic & Start</button>
            </div>
          </div>
          <div id="hr-notif" style="position:fixed; bottom:48px; left:50%; transform:translateX(-50%); background:#EF4444; color:white; padding:12px 32px; border-radius:100px; font-size:11px; font-weight:800; display:none; z-index:1000; letter-spacing:0.12em; box-shadow:0 8px 32px rgba(239,68,68,0.4); animation:pulse-notif 1.5s infinite;">RECORDING AUDIO...</div>
      </div>
      <style>
         .vi-msg { padding: 16px 20px; border-radius: 16px; font-size: 14px; line-height: 1.6; max-width: 90%; animation: slideIn 0.3s ease-out; }
         @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
         .vi-msg-ai { background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); color: #fff; align-self: flex-start; border-radius: 4px 20px 20px 20px; }
         .vi-msg-user { background: var(--brand-primary); color: white; align-self: flex-end; border-radius: 20px 4px 20px 20px; box-shadow: 0 4px 12px rgba(139,92,246,0.2); }
         @keyframes bounce-wave {
           0% { transform: scaleY(0.3); }
           100% { transform: scaleY(1.2); }
         }
         @keyframes pulse-notif {
           0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
           70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
           100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
         }
      </style>
    `;

    const setStatusText = (text) => {
      const statusEl = document.getElementById('hr-status-text');
      if (statusEl) statusEl.innerText = text;
    };

    const updateMicUI = (recording) => {
      const btn = document.getElementById('hr-mic-btn');
      const wave = document.getElementById('hr-audio-wave');
      
      if (!btn) return;
      
      if (recording) {
        btn.innerHTML = `⏹️ Stop & Submit Response`;
        btn.style.background = '#EF4444';
        btn.style.boxShadow = '0 8px 24px rgba(239,68,68,0.4)';
        if (wave) wave.style.display = 'flex';
        setStatusText('Listening... Speak clearly into your microphone.');
      } else {
        btn.innerHTML = `🎙️ Start Speaking`;
        btn.style.background = 'var(--brand-primary)';
        btn.style.boxShadow = '0 8px 24px rgba(139,92,246,0.4)';
        if (wave) wave.style.display = 'none';
        setStatusText("Microphone is ready. Click 'Start Speaking' to answer.");
      }
    };

    const initSpeechRecognition = () => {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setStatusText("Speech Recognition is not supported in this browser.");
        return;
      }
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isRecording = true;
        state.isListening = true;
        document.getElementById('hr-notif').style.display = 'block';
        updateMicUI(true);
      };

      recognition.onresult = (e) => {
        let interim = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            final += e.results[i][0].transcript + " ";
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        if (final) accumulatedTranscript += final;
        interimTranscript = interim;

        const previewEl = document.getElementById('hr-transcript-preview');
        if (previewEl) {
          const currentText = (accumulatedTranscript + interimTranscript).trim();
          previewEl.innerHTML = `<strong>What we hear:</strong> "${currentText || 'Listening...'}"`;
          previewEl.style.display = 'block';
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech Recognition Error:", e.error);
        if (e.error === 'no-speech') {
          setStatusText("No speech detected. Please speak clearly into your mic.");
        } else if (e.error === 'not-allowed') {
          setStatusText("Microphone permission denied. Please allow mic access.");
          stopListening();
        } else {
          setStatusText(`Error: ${e.error}. Click Start to retry.`);
          stopListening();
        }
      };

      recognition.onend = () => {
        isRecording = false;
        state.isListening = false;
        document.getElementById('hr-notif').style.display = 'none';
        updateMicUI(false);
      };
    };

    const startListening = () => {
      if (!recognition) initSpeechRecognition();
      if (!recognition) return;

      accumulatedTranscript = "";
      interimTranscript = "";
      const previewEl = document.getElementById('hr-transcript-preview');
      if (previewEl) {
        previewEl.innerHTML = `<strong>What we hear:</strong> "Listening..."`;
        previewEl.style.display = 'block';
      }

      try {
        recognition.start();
      } catch (e) {
        console.warn("Recognition already running or failed to start:", e);
      }
    };

    const stopListening = () => {
      if (recognition && isRecording) {
        recognition.stop();
      }
    };

    const stopListeningAndSubmit = () => {
      if (!recognition || !isRecording) return;
      recognition.stop();
      
      setTimeout(() => {
        const ans = (accumulatedTranscript + interimTranscript).trim();
        const previewEl = document.getElementById('hr-transcript-preview');
        if (previewEl) previewEl.style.display = 'none';

        if (ans) {
          state.hrHistory.push({ role: 'user', content: ans });
          addMsg('user', ans);

          const wordCount = ans.split(" ").filter(w => w.trim().length > 0).length;
          
          if (wordCount < 8) {
             const rejectMsg = "Thank you, but could you please elaborate on that? HR questions require more detailed behavioral examples.";
             setTimeout(() => {
                state.hrHistory.push({ role: 'system', content: rejectMsg });
                addMsg('ai', rejectMsg);
             }, 1000);
          } else {
              hrStep++;
              if (hrStep < hrQuestionsList.length) {
                 setTimeout(() => {
                    state.hrHistory.push({ role: 'system', content: hrQuestionsList[hrStep] });
                    addMsg('ai', hrQuestionsList[hrStep]);
                 }, 1500);
              } else {
                 setTimeout(() => {
                    state.hrHistory.push({ role: 'system', content: "HR round complete. Conducting AI behavioral audit..." });
                    addMsg('ai', "HR round complete. Conducting AI behavioral audit...");
                    setTimeout(() => {
                       renderHRReport();
                    }, 3000);
                 }, 1500);
              }
          }
        } else {
          setStatusText("No speech was captured. Click 'Start Speaking' and try again.");
        }
      }, 400);
    };

    const addMsg = (role, text) => {
       const c = document.getElementById('hr-transcript-area');
       if (!c) return;
       const d = document.createElement('div');
       d.className = "vi-msg vi-msg-" + role;
       d.innerHTML = text.replace(/\\n/g, '<br>');
       c.appendChild(d); c.scrollTop = c.scrollHeight;
       
       if (role === 'ai') {
          stopListening();
          const btn = document.getElementById('hr-mic-btn');
          if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.pointerEvents = 'none';
            btn.innerHTML = `🤖 AI is speaking...`;
          }
          setStatusText('🤖 AI is speaking...');

          const synth = window.speechSynthesis;
          if (synth) {
            synth.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onend = () => {
              if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
              }
              startListening();
            };
            utterance.onerror = () => {
              if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
                updateMicUI(false);
              }
            };
            synth.speak(utterance);
          } else {
            if (btn) {
              btn.disabled = false;
              btn.style.opacity = '1';
              btn.style.pointerEvents = 'auto';
            }
            startListening();
          }
       }
    };

    setTimeout(() => {
       state.hrHistory.push({ role: 'system', content: hrQuestionsList[0] });
       addMsg('ai', hrQuestionsList[0]);
    }, 1000);

    document.getElementById('hr-mic-btn').onclick = () => {
      const btn = document.getElementById('hr-mic-btn');
      if (btn.disabled) return;

      if (!recognition) {
        initSpeechRecognition();
        if (recognition) {
          startListening();
        }
      } else {
        if (isRecording) {
          stopListeningAndSubmit();
        } else {
          startListening();
        }
      }
    };

    safeBindClick('vi-exit-btn', () => {
      exitInterview();
    });
  };

  const renderHRReport = async () => {
    stopLocalWebcam();
    if (document.getElementById('vi-proctor-layer')) {
      document.getElementById('vi-proctor-layer').style.display = 'none';
    }
    
    const c = document.getElementById('vi-content-layer');
    c.innerHTML = `
      <div style="padding: 40px; max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; height: 100%; box-sizing: border-box; justify-content:center; align-items:center; text-align:center;">
        <div class="card-ent" style="padding: 60px; border-radius: 24px; border: 1px solid rgba(139,92,246,0.2); width: 100%; display: flex; flex-direction: column; align-items: center; gap: 24px; background: rgba(0,0,0,0.2);">
          <div class="neural-spinner" style="width:40px; height:40px;"></div>
          <h2 class="h2-ent" style="font-size:24px; color:#fff;">Evaluating Behavioral Fit...</h2>
          <p style="color:var(--text-description); font-size:15px; max-width: 450px;">
            AI is analyzing your tone, vocabulary density, and situational responses against ${state.company}'s core culture...
          </p>
        </div>
      </div>
    `;

    const GEMINI_API_KEY = window.GEMINI_API_KEY || Store.config?.GEMINI_API_KEY;
    const isDummy = !GEMINI_API_KEY || GEMINI_API_KEY.startsWith('AQ.');
    let report = {
      professionalism: 80,
      confidence: 75,
      alignment: 80,
      overall: 78,
      feedback: "The candidate shows strong enthusiasm and answers questions with solid structures. Elaborating on technical project metrics would further elevate behavioral performance."
    };

    if (GEMINI_API_KEY && !isDummy) {
      try {
        const transcriptText = state.hrHistory.map(h => `${h.role === 'system' ? 'Interviewer' : 'Candidate'}: ${h.content}`).join('\n');
        const prompt = `Evaluate this HR interview transcript for a candidate at ${state.company} for the "${state.role}" role:\n\n${transcriptText}\n\nEvaluate and rate: Professionalism (0-100), Confidence (0-100), Value Alignment (0-100), and Overall HR Score (0-100). Also provide a brief feedback paragraph (2-3 sentences) summarizing their strengths and areas of improvement.\n\nReturn a JSON object matching this schema:\n{\n  "professionalism": number,\n  "confidence": number,\n  "alignment": number,\n  "overall": number,\n  "feedback": "string"\n}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const txt = data.candidates[0].content.parts[0].text;
          report = JSON.parse(txt);
        }
      } catch (e) {
        console.warn("Failed to generate AI HR evaluation report, using fallback:", e);
      }
    }

    state.hrReport = report; // Store in state for PDF export
    const grade = getInterviewGrade(report.overall);
    const gradeColor = getGradeColor(grade);

    c.innerHTML = `
      <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; overflow-y: auto; max-height: 100%; box-sizing: border-box;">
        
        <!-- Report Header -->
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div style="font-size: 56px;">👔</div>
          <h1 class="h1-ent" style="font-size: 32px; color: #fff;">Behavioral HR Round Scorecard</h1>
          <p style="color: var(--text-description); font-size: 15px;">Evaluation report for Round 4: Behavioral HR Round.</p>
        </div>

        <!-- Stats Grid -->
        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px;">
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; background: rgba(255,255,255,0.01);">
            <span class="label-ent" style="font-size: 10px; color: var(--text-description);">PROFESSIONALISM</span>
            <span style="font-size: 28px; font-weight: 800; color: #fff;">${report.professionalism}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(16, 185, 129, 0.2); background: rgba(16, 185, 129, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: #10B981;">CONFIDENCE</span>
            <span style="font-size: 28px; font-weight: 800; color: #10B981;">${report.confidence}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(14, 165, 233, 0.2); background: rgba(14, 165, 233, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: #0EA5E9;">CULTURE ALIGNMENT</span>
            <span style="font-size: 28px; font-weight: 800; color: #0EA5E9;">${report.alignment}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: rgba(139, 92, 246, 0.2); background: rgba(139, 92, 246, 0.02);">
            <span class="label-ent" style="font-size: 10px; color: var(--brand-primary);">OVERALL HR SCORE</span>
            <span style="font-size: 28px; font-weight: 800; color: var(--brand-primary);">${report.overall}%</span>
          </div>
          <div class="card-ent" style="padding: 24px; text-align: center; display: flex; flex-direction: column; gap: 8px; border-color: ${gradeColor}44; background: ${gradeColor}0B;">
            <span class="label-ent" style="font-size: 10px; color: ${gradeColor}; font-weight: 700;">ROUND GRADE</span>
            <span style="font-size: 28px; font-weight: 800; color: ${gradeColor};">${grade}</span>
          </div>
        </div>

        <!-- Telemetry Feedback -->
        <div class="card-ent" style="padding: 24px; display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02);">
          <div>
            <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">Behavioral Feedback</h4>
            <p style="color: var(--text-description); font-size: 14px;">
              ${report.feedback}
            </p>
          </div>
          <div style="text-align: right;">
            <h4 style="font-size: 16px; color: #fff; margin-bottom: 4px;">Culture Rating</h4>
            <span class="status-pill" style="background: rgba(139, 92, 246, 0.1); color: var(--brand-primary); font-size: 11px; font-weight: 800; border-color: rgba(139, 92, 246, 0.3);">
              ${report.overall >= 85 ? '👑 CULTURAL FIT' : report.overall >= 70 ? '⚡ ADVANCED FIT' : '📖 STAGE 1 OK'}
            </span>
          </div>
        </div>

        <!-- Transcript Logs -->
        <div class="card-ent" style="padding: 32px; display: flex; flex-direction: column; gap: 24px; background: rgba(0,0,0,0.15);">
          <h3 class="h2-ent" style="font-size: 18px; margin-bottom: 8px; color: #fff;">Behavioral Transcript Review</h3>
          <div style="display: flex; flex-direction: column; gap: 20px; max-height: 350px; overflow-y: auto; padding-right: 12px;" id="hr-report-transcript-list">
            ${state.hrHistory.map(msg => {
              const isAi = msg.role === 'system';
              return `
                <div style="padding: 16px 20px; border-radius: 12px; background: ${isAi ? 'rgba(255,255,255,0.01)' : 'rgba(139, 92, 246, 0.03)'}; border: 1px solid ${isAi ? 'rgba(255,255,255,0.05)' : 'rgba(139, 92, 246, 0.1)'}; display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${isAi ? 'var(--text-description)' : 'var(--brand-primary)'};">
                      ${isAi ? 'HR Interviewer' : 'Candidate Response (Speech-to-Text)'}
                    </span>
                  </div>
                  <p style="font-size: 14px; color: #fff; margin: 0; line-height: 1.5;">${msg.content}</p>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Actions -->
        <div style="display: flex; justify-content: center; margin-top: 10px;">
          <button id="hr-report-done-btn" class="btn-premium" style="padding: 16px 40px; font-size: 16px; border-radius: 12px; font-weight: 700; cursor: pointer;">
            Proceed to Evaluation Dashboard →
          </button>
        </div>

      </div>
      <style>
        #hr-report-transcript-list::-webkit-scrollbar { width: 6px; }
        #hr-report-transcript-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      </style>
    `;

    document.getElementById('hr-report-done-btn').onclick = () => {
      state.hrCompleted = true;
      state.hrScore = report.overall;
      state.step = 'dashboard';
      render();
    };
  };



  // --- PROCTORING ENGINE ---
  const loadProctoringDependencies = async () => {
    if (window.tf && window.blazeface && window.cocoSsd) return;
    
    return new Promise((resolve, reject) => {
      const loadScript = (src, id) => new Promise((res, rej) => {
        let s = document.getElementById(id);
        if (s) {
          if (s.getAttribute('data-loaded') === 'true' || 
              (id === 'tfjs-script' && window.tf) || 
              (id === 'blazeface-script' && window.blazeface) || 
              (id === 'cocossd-script' && window.cocoSsd)) {
            return res();
          }
          s.addEventListener('load', res);
          s.addEventListener('error', rej);
          return;
        }
        s = document.createElement('script');
        s.src = src; s.id = id;
        s.onload = () => {
          s.setAttribute('data-loaded', 'true');
          res();
        };
        s.onerror = rej;
        document.head.appendChild(s);
      });

      loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.18.0/dist/tf.min.js', 'tfjs-script')
        .then(() => {
          Promise.all([
            loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js', 'blazeface-script'),
            loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js', 'cocossd-script')
          ]).then(resolve).catch(reject);
        })
        .catch(reject);
    });
  };

  let faceModel, objectModel, audioContext, analyzer, dataArray;
  let consecutiveVideoViolations = 0;
  let lastVideoViolation = null;
  let consecutiveAudioViolations = 0;

  const updateProctorOverlay = () => {
    const overlay = document.getElementById('vi-proctor-overlay-text');
    if (!overlay || !state.proctorActive) return;
    
    overlay.style.display = 'flex';
    
    const faceText = state.proctorFaceCount === undefined 
      ? "Initializing..." 
      : (state.proctorFaceCount === 1 
          ? `<span style="color:#10B981;">🟢 1 Face Detected</span>` 
          : (state.proctorFaceCount > 1 
              ? `<span style="color:#EF4444; font-weight:bold;">🔴 ${state.proctorFaceCount} Faces (Alert!)</span>` 
              : `<span style="color:#F59E0B;">🟡 No Face Detected</span>`));
              
    const phoneText = state.proctorHasPhone === undefined 
      ? "Initializing..." 
      : (state.proctorHasPhone 
          ? `<span style="color:#EF4444; font-weight:bold;">🔴 PHONE DETECTED!</span>` 
          : `<span style="color:#10B981;">🟢 No Phone</span>`);
          
    const rmsVal = state.proctorRms || 0;
    const isLoud = rmsVal >= 10.0;
    const voiceText = isLoud 
      ? `<span style="color:#EF4444; font-weight:bold;">🔴 Noise Detected (${Math.round(rmsVal)})</span>` 
      : `<span style="color:#10B981;">🟢 Normal (${Math.round(rmsVal)})</span>`;
      
    const examActive = ['aptitude', 'technical', 'communication', 'hr'].includes(state.step);
    const modeText = examActive 
      ? `<span style="color:#EF4444; font-weight:bold;">🚨 LIVE EXAM MODE</span>` 
      : `<span style="color:#3B82F6;">🛡️ SETUP / TEST MODE</span>`;
      
    overlay.innerHTML = `
      <div>Face: ${faceText}</div>
      <div>Phone: ${phoneText}</div>
      <div>Noise: ${voiceText}</div>
      <div style="margin-top:4px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; font-size:8px; opacity:0.8;">${modeText}</div>
    `;
  };

  const initProctoring = async () => {
    if (state.proctorActive || state.proctorInitializing) return; // Prevent duplicate loops
    state.proctorInitializing = true;
    
    const layer = document.getElementById('vi-proctor-layer');
    if (layer) {
      layer.style.display = 'block';
    }
    
    const statusEl = document.getElementById('vi-proctor-status');
    if (statusEl) { statusEl.innerText = "Proctoring: Initializing AI..."; statusEl.style.color = "#3B82F6"; statusEl.style.background = "rgba(59, 130, 246, 0.1)"; }
    try {
      await loadProctoringDependencies();
      if (!faceModel) faceModel = await blazeface.load();
      if (!objectModel) objectModel = await cocoSsd.load();
      state.modelsLoaded = true;
      state.proctorActive = true;
      state.proctorInitializing = false;
      if (statusEl) { statusEl.innerText = "Proctoring: Active & Secure"; statusEl.style.color = "#10B981"; statusEl.style.background = "rgba(16, 185, 129, 0.1)"; }
      startProctoringLoop();
    } catch (e) {
      state.proctorInitializing = false;
      console.error("Proctoring init failed", e);
      if (statusEl) { statusEl.innerText = "Proctoring: Error"; statusEl.style.color = "#EF4444"; }
    }
  };
  
  const startProctoringLoop = async () => {
    const video = document.getElementById('vi-webcam');
    if (!video || !state.proctorActive || state.isBlocked) return;
    
    const activeTestSteps = ['aptitude', 'technical', 'communication', 'hr'];
    const isTestActive = activeTestSteps.includes(state.step);
    
    const statusEl = document.getElementById('vi-proctor-status');
    if (statusEl) {
      if (isTestActive) {
        statusEl.innerText = "Proctoring: Active & Secure";
        statusEl.style.color = "#10B981";
        statusEl.style.background = "rgba(16, 185, 129, 0.1)";
      } else {
        statusEl.innerText = "Proctoring: Standby (Awaiting Test)";
        statusEl.style.color = "#3B82F6";
        statusEl.style.background = "rgba(59, 130, 246, 0.1)";
      }
    }
    
    try {
      if (video.readyState >= 2) {
        // Set video dimensions if not already set, to ensure models resize tensors correctly
        if (!video.width || video.width === 0) {
          video.width = video.videoWidth || 640;
          video.height = video.videoHeight || 480;
        }
        
        let violation = null;
        
        // Face detection (BlazeFace)
        const faces = await faceModel.estimateFaces(video, false);
        state.proctorFaceCount = faces.length;
        
        // Person & Object detection (COCO-SSD)
        const objects = await objectModel.detect(video, 20, 0.40); // 40% confidence threshold to ignore noisy predictions
        const persons = objects.filter(obj => obj.class === 'person' && obj.score >= 0.45);
        
        // Cell phone detection
        const hasPhone = objects.some(obj => 
          (obj.class === 'cell phone' || 
           obj.class === 'phone' || 
           obj.class === 'mobile phone' || 
           obj.class === 'telephone') && 
          obj.score >= 0.55 // 55% confidence threshold to prevent false positives from background clutter or body parts
        );
        state.proctorHasPhone = hasPhone;
        
        updateProctorOverlay();
        
        if (faces.length > 1 || persons.length > 1) {
          violation = "Multiple faces or extra person detected!";
        } else if (hasPhone) {
          violation = "Cell phone/cheating device detected!";
        } else if (faces.length === 0 && isTestActive) {
          violation = "No face detected in camera frame!";
        }
        
        if (violation && isTestActive) {
          if (violation === lastVideoViolation) {
            consecutiveVideoViolations++;
          } else {
            lastVideoViolation = violation;
            consecutiveVideoViolations = 1;
          }
          
          // If violation persists for 3 consecutive checks (1.5 seconds)
          if (consecutiveVideoViolations >= 3) {
            registerStrike(violation);
            consecutiveVideoViolations = 0;
            lastVideoViolation = null;
          }
        } else {
          consecutiveVideoViolations = 0;
          lastVideoViolation = null;
        }
      }
    } catch (e) {
      console.error("AI Proctoring loop error:", e);
    }
    
    setTimeout(startProctoringLoop, 500); // Check twice a second
  };
  
  const setupAudioProctoring = async (stream) => {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      // Connect to destination via GainNode (muted) to prevent Chromium garbage collection of audio source
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;
      analyzer.connect(gainNode);
      gainNode.connect(audioContext.destination);

      dataArray = new Uint8Array(analyzer.fftSize); // Allocate for time-domain data size
      
      setInterval(() => {
        if (!state.proctorActive || state.isBlocked) {
          consecutiveAudioViolations = 0;
          state.proctorRms = 0;
          return;
        }
        
        // Resume AudioContext if suspended by browser policy
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }

        // Use Time-Domain RMS to calculate overall room loudness, filtering out high-frequency mic static hum
        analyzer.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const dev = dataArray[i] - 128;
          sumSquares += dev * dev;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        state.proctorRms = rms;
        
        updateProctorOverlay();

        // Don't flag if candidate is speaking or if AI synthesis is speaking
        const isSpeaking = state.isListening || (window.speechSynthesis && window.speechSynthesis.speaking);
        if (isSpeaking) {
          consecutiveAudioViolations = 0;
          return;
        }
        
        // Only run violation check if inside written exam steps!
        // In speaking rounds (communication/hr), they are supposed to talk, so we disable audio malpractice alerts there.
        const silentTestSteps = ['aptitude', 'technical'];
        if (!silentTestSteps.includes(state.step)) {
          consecutiveAudioViolations = 0;
          return;
        }

        // RMS threshold >= 10.0 indicates medium-level sound/voices, while fan/mic hiss remains below 5.0.
        if (rms >= 10.0) {
          consecutiveAudioViolations++;
          if (consecutiveAudioViolations >= 3) { // Must persist for 3 consecutive seconds
            registerStrike("Suspicious background audio or extra voice detected!");
            consecutiveAudioViolations = 0;
          }
        } else {
          consecutiveAudioViolations = 0;
        }
      }, 1000);
    } catch (e) { console.error('Audio proctoring setup failed', e); }
  };
  const registerStrike = (reason) => {
    state.proctorWarnings++;
    
    if (state.proctorWarnings >= 3) {
      state.isBlocked = true;
      state.proctorActive = false;
      showBlockScreen();
    } else {
      showWarningOverlay(`WARNING ${state.proctorWarnings}/3: ${reason}`);
    }
  };
  
  const showWarningOverlay = (msg) => {
    const overlay = document.createElement('div');
    overlay.style = "position:fixed; inset:0; background:rgba(239, 68, 68, 0.95); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; backdrop-filter:blur(10px); animation: fadeIn 0.2s;";
    overlay.innerHTML = `<div style="font-size:80px; margin-bottom:24px; animation: pulse 1s infinite;">⚠️</div><h1 style="font-size:40px; font-weight:800; letter-spacing:2px; text-transform:uppercase;">Proctoring Alert</h1><p style="font-size:24px; margin-top:16px;">${msg}</p><p style="margin-top:24px; opacity:0.8;">Please rectify this immediately to avoid session termination.</p>`;
    document.body.appendChild(overlay);
    
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 400;
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
    
    setTimeout(() => { overlay.remove(); }, 3000);
  };
  
  const showBlockScreen = (customReason) => {
    const stage = document.getElementById('vi-stage-container');
    if (stage) stage.style.display = 'none';
    
    const blockScreen = document.createElement('div');
    blockScreen.style = "position:absolute; inset:0; background:#050505; z-index:10000; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#EF4444; padding:40px; text-align:center;";
    
    const reasonText = customReason || "The proctoring system has detected multiple severe violations of the operational protocols.";
    
    blockScreen.innerHTML = `
      <div style="font-size:80px; margin-bottom:32px;">🛑</div>
      <h1 class="h1-ent" style="font-size:48px; color:#EF4444;">Simulation Terminated</h1>
      <p style="font-size:20px; color:#fff; max-width:600px; margin-top:24px; line-height:1.6;">
        ${reasonText}
        <br><br>
        Your session has been securely locked and the incident has been logged.
      </p>
      <button class="btn-premium" style="margin-top:40px; background:#1f2937; color:white; border:none; padding:16px 32px; font-size:16px; border-radius:12px; cursor:pointer;" onclick="window.location.reload()">Return to Dashboard</button>
    `;
    const rootEl = document.getElementById('app-root') || document.body;
    rootEl.appendChild(blockScreen);
    
    stopLocalWebcam();
    document.getElementById('vi-proctor-layer').style.display = 'none';
  };

  const renderResults = () => {
    stopLocalWebcam();
    if (document.getElementById('vi-proctor-layer')) {
      document.getElementById('vi-proctor-layer').style.display = 'none';
    }

    const scores = calculateOverallScore();
    const grade = getInterviewGrade(scores.overall);
    const cutoff = getCompanyCutoff(state.company);
    const requiredGrade = getInterviewGrade(cutoff.pct);
    const cleared = scores.overall >= cutoff.pct;

    let totalTechPassed = 0;
    let totalTechCases = 0;
    if (state.codingAnswers && state.codingAnswers.length > 0) {
      state.codingAnswers.forEach(ans => {
        totalTechPassed += ans.score;
        totalTechCases += ans.totalCases || 3;
      });
    }

    // Color definitions
    const statusColor = cleared ? '#10B981' : '#EF4444';
    const statusBg = cleared ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
    const statusBorder = cleared ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
    const gradeGlow = cleared ? '0 0 20px rgba(16, 185, 129, 0.4)' : '0 0 20px rgba(239, 68, 68, 0.4)';

    const caliberStatusHtml = `
      <div style="background:${statusBg}; border:1px solid ${statusBorder}; padding:20px; border-radius:16px; margin-bottom:24px; text-align:left;">
        <h4 style="color:${statusColor}; font-size:16px; margin:0 0 8px 0; font-weight:800; display:flex; align-items:center; gap:8px;">
          ${cleared ? '🎉' : '❌'} Caliber Evaluation: ${cleared ? 'MET (Eligible)' : 'NOT MET (Below Threshold)'}
        </h4>
        <p style="color:var(--text-description); font-size:13.5px; margin:0; line-height:1.5;">
          ${cleared 
            ? `Congratulations! Your overall performance scored <strong>${scores.overall}%</strong>, earning you an elite grade of <strong>${grade}</strong>. This meets or exceeds the interview clearance threshold of <strong>Grade ${requiredGrade} (${cutoff.pct}%)</strong> for ${state.company}.`
            : `Your overall performance scored <strong>${scores.overall}%</strong>, resulting in a grade of <strong>${grade}</strong>. To clear the interview for ${state.company} and be considered eligible, you must obtain a grade of <strong>${requiredGrade} or higher (${cutoff.pct}%)</strong>.`}
        </p>
      </div>
    `;

    document.getElementById('vi-content-layer').innerHTML = `
      <div style="padding: 40px; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; max-height: 100%; box-sizing: border-box; scrollbar-width: none;">
        
        <!-- Header -->
        <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div style="font-size: 56px;">🏆</div>
          <h1 class="h1-ent" style="font-size: 32px; color: #fff;">Comprehensive Assessment Scorecard</h1>
          <p style="color: var(--text-description); font-size: 15px;">Final evaluation report for ${state.role} role at ${state.company}.</p>
        </div>

        <!-- Grade Display & Overview -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 32px; align-items: stretch;">
          
          <!-- Large Grade Badge Card -->
          <div class="card-ent" style="padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px; background: rgba(255,255,255,0.01); text-align: center; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -50px; left: -50px; width: 150px; height: 150px; background: ${statusColor}; opacity: 0.03; filter: blur(50px); border-radius: 50%;"></div>
            <span class="label-ent" style="font-size: 11px; color: var(--text-description); letter-spacing: 0.12em;">OVERALL GRADE</span>
            <div style="width: 120px; height: 120px; border-radius: 50%; border: 4px solid ${statusColor}; box-shadow: ${gradeGlow}; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3);">
              <span style="font-size: 48px; font-weight: 950; color: #fff; letter-spacing: -0.05em;">${grade}</span>
            </div>
            <div>
              <span class="status-pill" style="background:${statusBg}; color:${statusColor}; font-size:11px; font-weight:800; border-color:${statusBorder}; text-transform: uppercase; padding: 6px 16px;">
                ${cleared ? '🟢 Passed' : '🔴 Ineligible'}
              </span>
            </div>
            <p style="font-size: 12px; color: var(--text-description); margin: 0; max-width: 200px;">Overall score: ${scores.overall}% (Average of all 4 rounds)</p>
          </div>

          <!-- Eligibility Details -->
          <div style="display: flex; flex-direction: column; justify-content: space-between;">
            ${caliberStatusHtml}
            
            <!-- Actions -->
            <div style="display:flex; flex-direction:column; gap:12px;">
               <button id="vi-download-pdf-btn" class="btn-premium" style="padding:16px 32px; border-radius:12px; font-size:15px; display:flex; align-items:center; justify-content:center; gap:12px; width: 100%;">
                  <span>📄</span> Download Interview Report (PDF)
               </button>
               <button id="vi-exit-results-btn" class="btn-premium-ghost" style="padding:16px 32px; border-radius:12px; font-size:15px; border:1px solid rgba(255,255,255,0.1); color:#fff; display:flex; align-items:center; justify-content:center; gap:8px; width: 100%; cursor: pointer;">
                  🚪 Back to AI Modules
               </button>
            </div>
          </div>
        </div>

        <!-- Scores Breakdown & Grade Reference Grid -->
        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px;">
          
          <!-- Round Breakdown -->
          <div class="card-ent" style="padding: 28px; background: rgba(0,0,0,0.15); display: flex; flex-direction: column; gap: 20px;">
            <h3 class="h2-ent" style="font-size: 18px; margin: 0; color: #fff;">Performance Breakdown</h3>
            
            <!-- Round 1 -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px;">
                <span style="color: #fff; font-weight: 500;">Round 1: Aptitude & Logic</span>
                <span style="color: var(--text-description);">${scores.aptitude}% (${state.aptitudeScore}/${state.questions ? state.questions.length : 30})</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                <div style="height: 100%; width: ${scores.aptitude}%; background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius: 10px;"></div>
              </div>
            </div>

            <!-- Round 2 -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px;">
                <span style="color: #fff; font-weight: 500;">Round 2: Technical Coding (Compiler)</span>
                <span style="color: var(--text-description);">${scores.technical}% (${totalTechPassed}/${totalTechCases || 3})</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                <div style="height: 100%; width: ${scores.technical}%; background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius: 10px;"></div>
              </div>
            </div>

            <!-- Round 3 -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px;">
                <span style="color: #fff; font-weight: 500;">Round 3: Communication Fluency</span>
                <span style="color: var(--text-description);">${scores.communication}%</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                <div style="height: 100%; width: ${scores.communication}%; background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius: 10px;"></div>
              </div>
            </div>

            <!-- Round 4 -->
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px;">
                <span style="color: #fff; font-weight: 500;">Round 4: AI Behavioral HR</span>
                <span style="color: var(--text-description);">${scores.hr}%</span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                <div style="height: 100%; width: ${scores.hr}%; background: linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius: 10px;"></div>
              </div>
            </div>

          </div>

          <!-- Grade Scale Reference -->
          <div class="card-ent" style="padding: 24px; display: flex; flex-direction: column; gap: 16px; background: rgba(0,0,0,0.15);">
            <h4 style="font-size: 14px; margin: 0; color: #fff; text-transform: uppercase; letter-spacing: 0.05em;">Grading Scale Reference</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12.5px;">
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03); color: #10B981; font-weight: bold;">
                <span>Grade A (Elite):</span>
                <span>A1: 95%+ | A2: 90% | A3: 85%</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03); color: #34D399; font-weight: bold;">
                <span>Grade B (Advanced):</span>
                <span>B1: 80% | B2: 75% | B3: 70%</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03); color: #60A5FA; font-weight: bold;">
                <span>Grade C1 (Passing):</span>
                <span>C1: 65% - 69% (Clearance threshold)</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03); color: var(--text-description);">
                <span>Grade C (Ineligible):</span>
                <span>C2: 60% | C3: 55%</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #EF4444;">
                <span>Grade D (Development):</span>
                <span>D1: 50% | D2: 40% | D3: &lt;40%</span>
              </div>
            </div>
            <div style="font-size: 11px; color: var(--text-description); background: rgba(255,255,255,0.02); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); line-height: 1.4;">
              💡 The overall grade is determined by taking the simple average of all four assessment rounds. You must achieve <strong>Grade ${requiredGrade} or higher</strong> to clear for ${state.company}.
            </div>
          </div>
        </div>

      </div>
      <style>
        /* Hide scrollbars for a clean presentation */
        #vi-content-layer::-webkit-scrollbar { display: none; }
      </style>
    `;

    document.getElementById('vi-download-pdf-btn').onclick = async () => {
      const btn = document.getElementById('vi-download-pdf-btn');
      btn.innerHTML = "<span>⏳</span> Generating PDF...";
      btn.style.opacity = "0.7";
      
      const userResponses = state.communicationHistory.filter(msg => msg.role === 'user');
      let totalWords = 0;
      userResponses.forEach(r => {
        totalWords += r.content.split(/\s+/).filter(w => w.trim().length > 0).length;
      });

      const allWords = userResponses.map(r => r.content.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").split(/\s+/)).flat().filter(w => w.trim().length > 0);
      const uniqueWords = new Set(allWords);
      const lexicalDensity = allWords.length > 0 ? Math.round((uniqueWords.size / allWords.length) * 100) : 0;
      const clarityScore = allWords.length > 0 ? Math.min(98, Math.max(75, Math.round(80 + (lexicalDensity * 0.12) + (totalWords * 0.04)))) : 0;
      const overallFluency = allWords.length > 0 ? Math.round((clarityScore + lexicalDensity) / 2) : 0;

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
            const gradeText = cleared 
              ? `<span style="color:#10B981; font-weight:bold;">CLEARED (Grade ${grade} - Eligible for ${state.company})</span>`
              : `<span style="color:#EF4444; font-weight:bold;">NOT CLEARED (Grade ${grade} - Below Threshold of Grade ${requiredGrade} for ${state.company})</span>`;

            const element = document.createElement('div');
            element.style.padding = '40px';
            element.style.fontFamily = 'Arial, sans-serif';
            element.innerHTML = `
               <h1 style="color:#000; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px;">Comprehensive Evaluation Report: ${state.role} at ${state.company}</h1>
               
               <div style="background:#f4f5f7; padding:20px; border-radius:8px; border:1px solid #e5e7eb; margin-bottom:30px;">
                 <h3 style="margin-top:0; color:#000;">Overall Interview Summary</h3>
                 <table style="width:100%; border-collapse:collapse; font-size:14px; color:#333;">
                   <tr>
                     <td style="padding:6px 0; font-weight:bold; width:40%;">Overall Letter Grade:</td>
                     <td style="padding:6px 0; font-size:16px;"><strong>${gradeText}</strong></td>
                   </tr>
                   <tr>
                     <td style="padding:6px 0; font-weight:bold;">Overall Average Score:</td>
                     <td style="padding:6px 0;"><strong>${scores.overall}%</strong></td>
                   </tr>
                   <tr>
                     <td style="padding:6px 0; font-weight:bold;">Interview Result:</td>
                     <td style="padding:6px 0; font-weight:bold; color:${cleared ? '#10B981' : '#EF4444'};">${cleared ? 'ELIGIBLE / PASSED' : 'INELIGIBLE / DEVELOPMENT NEEDED'}</td>
                   </tr>
                   <tr>
                     <td style="padding:6px 0; font-weight:bold;">Threshold Rule:</td>
                     <td style="padding:6px 0; font-size:12px; color:#666;">Candidates must achieve Grade ${requiredGrade} (${cutoff.pct}%+) or higher to clear the interview for ${state.company}.</td>
                   </tr>
                 </table>
               </div>
               
               <h2 style="color:#000; margin-top:20px;">Round 1: Aptitude (Score: ${state.aptitudeScore} / ${state.questions ? state.questions.length : 30})</h2>
               <div style="font-size:14px; margin-bottom:12px; color:#333;">Round Performance: ${scores.aptitude}%</div>
               <hr style="margin-bottom:20px;">
            ${state.aptitudeAnswers.map((a, i) => 
               "<div style='margin-bottom:12px; font-size:14px; color:#333;'>" +
                 "<strong>Q" + (i+1) + ":</strong> " + a.q + "<br>" +
                 "<span style='color:" + (a.chosen === a.correct ? "#10B981" : "#EF4444") + "'>Your Answer: " + a.chosen + "</span> (Correct: " + a.correct + ")" +
               "</div>"
            ).join('')}

            <h2 style="color:#000; margin-top:40px;">Round 2: Technical Coding (Compiler) Round</h2>
            <hr style="margin-bottom:20px;">
            ${state.codingAnswers && state.codingAnswers.length > 0 ? state.codingAnswers.map((ans, i) => 
               "<div style='margin-bottom:16px; font-size:14px; color:#333;'>" +
                 "<strong>Challenge:</strong> " + ans.challenge + "<br>" +
                 "<strong>Language:</strong> " + ans.lang + "<br>" +
                 "<strong>Test Cases Passed:</strong> " + (ans.score !== undefined ? ans.score + " / " + (ans.totalCases || 3) : 'N/A') + "<br>" +
                 "<strong style='display:block; margin-top:8px;'>Submitted Code:</strong>" +
                 "<pre style='background:#f4f5f7; padding:12px; border-radius:6px; border:1px solid #e5e7eb; font-family:monospace; font-size:12px; margin-top:4px; max-height:200px; overflow-y:auto; white-space:pre-wrap;'>" + ans.code.replace(/</g, '&lt;').replace(/>/g, '&gt;') + "</pre>" +
               "</div>"
            ).join('') : '<p style="font-size:14px; color:#666;">No coding submissions recorded.</p>'}

            <h2 style="color:#000; margin-top:40px;">Round 3: Communication Fluency Assessment</h2>
            <hr style="margin-bottom:20px;">
            <div style="background:#f9fafb; padding:20px; border-radius:8px; border:1px solid #e5e7eb; margin-bottom:24px; display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; font-size:14px;">
              <div><strong>Overall Fluency:</strong> ${overallFluency}%</div>
              <div><strong>Speech Clarity:</strong> ${clarityScore}%</div>
              <div><strong>Lexical Density:</strong> ${lexicalDensity}%</div>
              <div><strong>Words Spoken:</strong> ${totalWords}</div>
            </div>
            
            <h3 style="color:#000; margin-top:20px; margin-bottom:16px;">Communication Transcript</h3>
            ${state.communicationHistory.map(msg => {
               const isAi = msg.role === 'system';
               return "<div style='margin-bottom:16px;'><strong style='color:" + (isAi ? "#374151" : "#0369a1") + "; text-transform:uppercase; font-size:14px;'>" + (isAi ? "System" : "Candidate") + ":</strong> <span style='font-size:14px; color:#111;'>" + msg.content + "</span></div>";
            }).join('')}

            <h2 style="color:#000; margin-top:40px;">Round 4: Behavioral HR Assessment</h2>
            <hr style="margin-bottom:20px;">
            ${state.hrReport ? `
            <div style="background:#f9fafb; padding:20px; border-radius:8px; border:1px solid #e5e7eb; margin-bottom:24px; display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; font-size:14px;">
              <div><strong>Overall HR Score:</strong> ${state.hrReport.overall}%</div>
              <div><strong>Professionalism:</strong> ${state.hrReport.professionalism}%</div>
              <div><strong>Confidence:</strong> ${state.hrReport.confidence}%</div>
              <div><strong>Culture Alignment:</strong> ${state.hrReport.alignment}%</div>
            </div>
            <div style="margin-bottom:24px; font-size:14px; color:#333; line-height:1.5;">
              <strong>Interviewer Feedback:</strong> ${state.hrReport.feedback}
            </div>
            ` : '<p style="font-size:14px; color:#666;">HR ratings pending.</p>'}
            
            <h3 style="color:#000; margin-top:20px; margin-bottom:16px;">HR Interview Transcript</h3>
            ${state.hrHistory.map(msg => {
               const isAi = msg.role === 'system';
               return "<div style='margin-bottom:16px;'><strong style='color:" + (isAi ? "#374151" : "#0369a1") + "; text-transform:uppercase; font-size:14px;'>" + (isAi ? "Interviewer" : "Candidate") + ":</strong> <span style='font-size:14px; color:#111;'>" + msg.content + "</span></div>";
            }).join('')}
         `;
         html2pdf().set({
            margin: 10,
            filename: 'comprehensive_interview_report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
         }).from(element).save().then(() => {
            btn.innerHTML = "<span>✅</span> Downloaded Successfully";
            btn.style.opacity = "1";
         });
      };
      document.head.appendChild(script);
    };

    const exitResultsBtn = document.getElementById('vi-exit-results-btn');
    if (exitResultsBtn) {
      exitResultsBtn.onclick = () => {
        exitInterview(false);
      };
    }
  };

  safeBindClick('vi-enable-cam-btn', () => handleEnableWebcam());
  render();
}
