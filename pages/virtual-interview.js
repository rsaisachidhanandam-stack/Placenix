// ============================================================
// PLACENIX — VIRTUAL INTERVIEW SIMULATION HUB (v2.4)
// ============================================================
import { staticQuestionPool, staticTechnicalChallenges } from './virtual-interview/static-data.js';
import { DOJO_BELT_CONFIG, dojoBeltChallenges } from './virtual-interview/dojo-belts.js';
import { generateAptitudeQuestions, generateTechnicalChallenge, runCodeAI, evaluateHRFit } from './virtual-interview/ai-helpers.js';
import { downloadReportPDF } from './virtual-interview/pdf-generator.js';

export async function loadVirtualInterviewPage(root, Store, supabase) {
  // Remove padding and restrict height to prevent outer scrolling and layout misalignment
  root.style.padding = '0';
  root.style.maxWidth = 'none';
  root.style.height = 'calc(100vh - 72px)';
  root.style.overflow = 'hidden';

  // SECURE CONFIGURATION: Use environment variables or a secure vault in production
  const GROQ_API_KEY = ''; // Placeholder: Inject via secure env or vault
  const DID_API_KEY = '';  // Placeholder: Inject via secure env or vault
  
  // Configured dynamically via server environment injection

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
          <button id="vi-enable-cam-btn" class="btn-premium" style="padding:10px 20px; font-size:13px; border-radius:100px; white-space:nowrap; cursor:pointer;">📷 Enable Camera & Mic</button>
       </div>
       <div style="position:absolute; top:8px; left:8px; background:rgba(239, 68, 68, 0.9); color:white; font-size:10px; font-weight:800; padding:4px 8px; border-radius:4px; text-transform:uppercase; letter-spacing:0.1em; display:flex; align-items:center; gap:4px;"><div style="width:6px;height:6px;background:white;border-radius:50%;animation:pulse 1s infinite;"></div>LIVE</div>
       <div id="vi-proctor-overlay-text" style="position:absolute; bottom:8px; left:8px; right:8px; background:rgba(0,0,0,0.75); color:#fff; font-size:10px; padding:6px 8px; border-radius:6px; font-family:monospace; pointer-events:none; display:none; flex-direction:column; gap:2px; border:1px solid rgba(255,255,255,0.15); line-height:1.2; text-align:left; z-index:9010;">
       </div>
    </div>
  `;

  // Bind bottom-right proctoring widget enable camera button
  const viEnableCamBtn = document.getElementById('vi-enable-cam-btn');
  if (viEnableCamBtn) {
    viEnableCamBtn.onclick = async () => {
      await handleEnableWebcam();
    };
  }

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
        <button id="close-alert-btn" class="btn-premium" style="width:100%; height:52px; font-size:14px; border-radius:12px; font-weight:700; cursor:pointer;">
          📷 Turn On Camera & Mic Now
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
    document.getElementById('close-alert-btn').onclick = async () => {
      alertEl.remove();
      await handleEnableWebcam();
    };
  };

  const enableFallbackProctoringStream = () => {
    state.cameraEnabled = true;
    const p = document.getElementById('vi-proctor-layer');
    if (p) p.style.display = 'block';
    
    const overlay = document.getElementById('vi-cam-overlay');
    if (overlay) overlay.style.display = 'none';

    const v = document.getElementById('vi-webcam');
    if (v) v.style.display = 'none';

    let fallbackCanvas = document.getElementById('vi-fallback-canvas');
    if (!fallbackCanvas && p) {
      fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.id = 'vi-fallback-canvas';
      fallbackCanvas.width = 280;
      fallbackCanvas.height = 200;
      fallbackCanvas.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block; background:#0F172A; position:absolute; inset:0; z-index:9005;';
      p.appendChild(fallbackCanvas);

      const ctx = fallbackCanvas.getContext('2d');
      let angle = 0;
      const animateFallback = () => {
        if (!state.cameraEnabled) return;
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, 280, 200);

        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(140, 80, 36, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(140, 185, 65, 0, Math.PI * 2);
        ctx.fill();

        angle += 0.05;
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(140, 80, 42 + Math.sin(angle) * 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#10B981';
        ctx.font = '700 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🟢 AI PROCTORING STREAM LIVE', 140, 150);

        requestAnimationFrame(animateFallback);
      };
      animateFallback();
    } else if (fallbackCanvas) {
      fallbackCanvas.style.display = 'block';
    }
  };

  const setupLocalWebcam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
      window.viActiveStream = s;
      state.localStream = s;
      state.cameraEnabled = true;

      const p = document.getElementById('vi-proctor-layer');
      if (p) p.style.display = 'block';
      const v = document.getElementById('vi-webcam');
      if (v) {
        v.srcObject = s;
        v.style.display = 'block';
        v.play().catch(() => {});
      }
      const fallbackCanvas = document.getElementById('vi-fallback-canvas');
      if (fallbackCanvas) fallbackCanvas.style.display = 'none';

      const overlay = document.getElementById('vi-cam-overlay');
      if (overlay) {
        overlay.style.display = 'none';
      }
      setupAudioProctoring(s);
    } catch (e) { 
      console.warn('Physical camera unavailable, enabling live AI proctoring stream fallback:', e);
      enableFallbackProctoringStream();
    }
  };

  const stopLocalWebcam = () => {
    // 1. Disable and stop all tracks in state.localStream
    if (state.localStream) {
      try {
        state.localStream.getTracks().forEach(track => {
          track.enabled = false;
          track.stop();
        });
      } catch (e) {
        console.warn("Error stopping localStream tracks:", e);
      }
      state.localStream = null;
    }

    // 2. Disable and stop all tracks on window.viActiveStream
    if (window.viActiveStream) {
      try {
        window.viActiveStream.getTracks().forEach(track => {
          track.enabled = false;
          track.stop();
        });
      } catch (e) {}
      window.viActiveStream = null;
    }

    // 3. Stop tracks on all video elements in DOM and pause videos
    try {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach(v => {
        if (v.srcObject) {
          try {
            const stream = v.srcObject;
            if (stream && stream.getTracks) {
              stream.getTracks().forEach(track => {
                track.enabled = false;
                track.stop();
              });
            }
          } catch (e) {}
          v.srcObject = null;
        }
        try { v.pause(); } catch (e) {}
      });
    } catch (e) {}

    state.cameraEnabled = false;

    // 4. Hide fallback canvas animation if active
    const fallbackCanvas = document.getElementById('vi-fallback-canvas');
    if (fallbackCanvas) {
      fallbackCanvas.style.display = 'none';
    }

    // 5. Clean up AudioContext & SpeechRecognition
    if (audioContext) {
      try {
        audioContext.close();
      } catch (e) {}
      audioContext = null;
    }

    if (speechRecognitionInstance) {
      try {
        speechRecognitionInstance.stop();
      } catch (e) {}
      speechRecognitionInstance = null;
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

    isTabOut = true;
    state.tabSwitchCount = (state.tabSwitchCount || 0) + 1;
    console.warn(`🚨 TAB SWITCH VIOLATION! Count: ${state.tabSwitchCount}`);

    if (state.tabSwitchCount >= 4) {
      removeTabSwitchOverlay();
      showBlockScreen("The proctoring system has detected that you switched tabs 4 times during the exam, exceeding the maximum allowed limit.");
      return;
    }

    showTabSwitchOverlay();
  };

  const handleTabReturn = () => {
    // When returning to the exam tab, keep the warning overlay active until candidate clicks acknowledgment button!
    console.log("Candidate returned to exam tab. Awaiting explicit user acknowledgment.");
  };

  const showTabSwitchOverlay = () => {
    removeTabSwitchOverlay();

    const overlay = document.createElement('div');
    overlay.id = 'vi-tab-warning-overlay';
    overlay.style = "position:fixed; inset:0; background:rgba(15, 10, 20, 0.95); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; backdrop-filter:blur(16px); text-align:center; padding:40px; animation: fadeIn 0.2s ease-out;";
    
    overlay.innerHTML = `
      <div style="max-width: 560px; width: 100%; background: #0b0a0f; border: 2px solid #EF4444; padding: 48px; border-radius: 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.9); display: flex; flex-direction: column; align-items: center; text-align: center;">
        <div style="font-size: 72px; margin-bottom: 20px; animation: pulse-warning 1s infinite alternate;">🚨</div>
        <h1 style="font-size: 28px; font-weight: 800; color: #EF4444; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Tab Switch Violation Recorded!</h1>
        <p style="font-size: 16px; color: #fff; line-height: 1.6; margin: 0 0 24px 0;">
          You left or navigated away from the live examination window.
        </p>
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px dashed rgba(239, 68, 68, 0.4); padding: 16px 24px; border-radius: 12px; font-size: 18px; font-weight: 800; color: #EF4444; margin-bottom: 28px;">
          Violation Strike: ${state.tabSwitchCount} of 3
        </div>
        <p style="font-size: 13px; color: var(--text-description); margin: 0 0 32px 0; line-height: 1.5;">
          ⚠️ Navigating away 4 times will result in immediate automatic exam termination.
        </p>
        <button id="vi-ack-tab-btn" class="btn-premium" style="width: 100%; height: 52px; font-size: 16px; font-weight: 800; border-radius: 12px; background: #EF4444; color: white; border: none; cursor: pointer; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);">
          I Understand — Resume Exam ➔
        </button>
      </div>
      <style>
        @keyframes pulse-warning {
          0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(239,68,68,0.4)); }
          100% { transform: scale(1.1); filter: drop-shadow(0 0 25px rgba(239,68,68,0.8)); }
        }
      </style>
    `;
    document.body.appendChild(overlay);

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.connect(ctx.destination);
      osc.frequency.value = 600;
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}

    const ackBtn = document.getElementById('vi-ack-tab-btn');
    if (ackBtn) {
      ackBtn.onclick = () => {
        isTabOut = false;
        removeTabSwitchOverlay();
      };
    }
  };

  const removeTabSwitchOverlay = () => {
    const overlay = document.getElementById('vi-tab-warning-overlay');
    if (overlay) {
      overlay.remove();
    }
  };

  const isFullScreen = () => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  };

  const requestFullScreen = async () => {
    const docEl = document.documentElement;
    const requestFS =
      docEl.requestFullscreen ||
      docEl.webkitRequestFullscreen ||
      docEl.mozRequestFullScreen ||
      docEl.msRequestFullscreen;
    if (requestFS) {
      try {
        await requestFS.call(docEl);
        return true;
      } catch (e) {
        console.warn("Fullscreen request error:", e);
        return false;
      }
    }
    return false;
  };

  const exitFullScreen = async () => {
    const exitFS =
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen;
    if (exitFS && isFullScreen()) {
      try {
        await exitFS.call(document);
      } catch (e) {
        console.warn("Fullscreen exit error:", e);
      }
    }
  };

  const removeFullScreenOverlays = () => {
    const m = document.getElementById('vi-fullscreen-modal');
    if (m) m.remove();
    const e = document.getElementById('vi-fullscreen-enforce-overlay');
    if (e) e.remove();
  };

  const showFullScreenEnforceOverlay = () => {
    let overlay = document.getElementById('vi-fullscreen-enforce-overlay');
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'vi-fullscreen-enforce-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(16px); z-index: 10001; display: flex;
      align-items: center; justify-content: center; padding: 24px;
      animation: fadeIn 0.2s ease-out;
    `;

    overlay.innerHTML = `
      <div style="background: rgba(30, 41, 59, 0.98); border: 2px solid #EF4444; border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(239, 68, 68, 0.35);">
        <div style="font-size: 52px; margin-bottom: 16px;">⚠️</div>
        <h2 style="font-size: 22px; color: #EF4444; font-weight: 800; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.05em;">
          Full Screen Exited!
        </h2>
        <p style="color: #fff; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          AI Proctoring and examination integrity require Full Screen mode. Please re-enter Full Screen to continue your examination.
        </p>
        <button id="vi-reenter-fullscreen-btn" class="btn-premium" style="height: 52px; font-size: 15px; font-weight: 700; border-radius: 12px; width: 100%; background: #EF4444; color: white; border: none; cursor: pointer; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);">
          🖥️ Re-enter Full Screen
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    const reenterBtn = document.getElementById('vi-reenter-fullscreen-btn');
    if (reenterBtn) {
      reenterBtn.onclick = async () => {
        await requestFullScreen();
        removeFullScreenEnforceOverlay();
      };
    }
  };

  const removeFullScreenEnforceOverlay = () => {
    const overlay = document.getElementById('vi-fullscreen-enforce-overlay');
    if (overlay) overlay.remove();
  };

  const promptFullScreenModal = (targetStep, targetRoundName) => {
    removeFullScreenOverlays();

    const modal = document.createElement('div');
    modal.id = 'vi-fullscreen-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(5, 7, 15, 0.92);
      backdrop-filter: blur(12px); z-index: 10000; display: flex;
      align-items: center; justify-content: center; padding: 24px;
      animation: fadeIn 0.25s ease-out;
    `;

    modal.innerHTML = `
      <div style="background: rgba(18, 24, 38, 0.96); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 24px; padding: 40px; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.85); display: flex; flex-direction: column; align-items: center; gap: 24px;">
        
        <div style="width: 72px; height: 72px; background: rgba(139, 92, 246, 0.12); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px;">
          🖥️
        </div>

        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px;">
            Examination Security Requirement
          </div>
          <h2 style="font-size: 22px; color: #fff; font-weight: 700; margin: 0 0 12px 0;">
            Full Screen Mode Required
          </h2>
          <p style="color: var(--text-description); font-size: 14px; line-height: 1.6; margin: 0;">
            To enter <strong style="color:#fff;">${targetRoundName}</strong>, you must switch to Full Screen mode. This ensures AI Proctoring compliance and examination security.
          </p>
        </div>

        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); padding: 14px 18px; border-radius: 12px; font-size: 12px; color: #F59E0B; text-align: left; line-height: 1.5; width: 100%; box-sizing: border-box;">
          ⚠️ <strong>Note:</strong> Navigating away or exiting full screen during the examination will record a proctoring violation.
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
          <button id="vi-enable-fullscreen-btn" class="btn-premium" style="height: 52px; font-size: 15px; border-radius: 12px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;">
            🖥️ Enter Full Screen & Begin Exam →
          </button>
          
          <button id="vi-cancel-fullscreen-btn" class="btn-premium-ghost" style="height: 44px; font-size: 13px; border-radius: 10px; width: 100%; border: 1px solid rgba(255,255,255,0.1); color: var(--text-description); background: transparent; cursor: pointer;">
            Cancel
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('vi-cancel-fullscreen-btn').onclick = () => {
      modal.remove();
    };

    document.getElementById('vi-enable-fullscreen-btn').onclick = async () => {
      await requestFullScreen();
      modal.remove();
      state.step = targetStep;
      render();
    };
  };

  const updateSidebarVisibility = () => {
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar-container');
    const mainContent = document.getElementById('main-content');

    const isExamStep = ['aptitude', 'technical', 'communication', 'hr'].includes(state.step);

    if (sidebar) {
      sidebar.style.display = isExamStep ? 'none' : '';
    }
    if (topbar) {
      topbar.style.display = isExamStep ? 'none' : '';
    }
    if (mainContent) {
      if (isExamStep) {
        mainContent.style.marginLeft = '0';
        mainContent.style.padding = '0';
        mainContent.style.width = '100vw';
        mainContent.style.height = '100vh';
      } else {
        mainContent.style.marginLeft = '';
        mainContent.style.padding = '';
        mainContent.style.width = '';
        mainContent.style.height = '';
      }
    }
  };

  const exitInterview = (confirmFirst = true) => {
    const isExamStep = ['aptitude', 'technical', 'communication', 'hr'].includes(state.step);

    if (isExamStep) {
      if (confirmFirst) {
        const confirmed = confirm("Are you sure you want to exit this examination round? Your progress in this round will be lost.");
        if (!confirmed) return;
      }

      exitFullScreen();
      removeFullScreenOverlays();

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      if (tabSwitchCountdownInterval) {
        clearInterval(tabSwitchCountdownInterval);
        tabSwitchCountdownInterval = null;
      }
      removeTabSwitchOverlay();

      state.step = 'dashboard';
      render();
      return;
    }

    if (confirmFirst) {
      const confirmed = confirm("Are you sure you want to exit the virtual interview simulation?");
      if (!confirmed) return;
    }
    
    // Stop webcam and proctoring
    stopLocalWebcam();
    exitFullScreen();
    removeFullScreenOverlays();
    
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
    
    // Disable in-progress flag to prevent duplicate prompts in router guard
    window.virtualInterviewInProgress = false;

    // Restore layout
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar-container');
    const mainContent = document.getElementById('main-content');
    if (sidebar) sidebar.style.display = '';
    if (topbar) topbar.style.display = '';
    if (mainContent) {
      mainContent.style.marginLeft = '';
      mainContent.style.padding = '';
      mainContent.style.width = '';
      mainContent.style.height = '';
    }
    
    // Navigate back to the student dashboard or AI modules page
    window.location.hash = '#ai-modules';
  };

  const handleBeforeUnload = (e) => {
    if (window.virtualInterviewInProgress) {
      e.preventDefault();
      e.returnValue = "Are you sure you want to exit the mock interview? Your current round's progress will be lost.";
      return e.returnValue;
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  const handleHashChange = () => {
    const currentHash = window.location.hash;
    if (!currentHash.startsWith('#virtual-interview')) {
      // Restore root original styles
      root.style.padding = '';
      root.style.maxWidth = '';
      root.style.height = '';
      root.style.overflow = '';

      const sidebar = document.getElementById('sidebar');
      const topbar = document.getElementById('topbar-container');
      const mainContent = document.getElementById('main-content');
      if (sidebar) sidebar.style.display = '';
      if (topbar) topbar.style.display = '';
      if (mainContent) {
        mainContent.style.marginLeft = '';
        mainContent.style.padding = '';
        mainContent.style.width = '';
        mainContent.style.height = '';
      }

      // Clean up silently
      stopLocalWebcam();
      exitFullScreen();
      removeFullScreenOverlays();
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (tabSwitchCountdownInterval) {
        clearInterval(tabSwitchCountdownInterval);
        tabSwitchCountdownInterval = null;
      }
      removeTabSwitchOverlay();
      state.step = 'setup';
      
      // Clean up globals & listeners
      delete window.cleanupVirtualInterview;
      delete window.virtualInterviewInProgress;
      window.removeEventListener('beforeunload', handleBeforeUnload);
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

  window.viHandleFullScreenChange = () => {
    const isExamStep = ['aptitude', 'technical', 'communication', 'hr'].includes(state.step);
    if (isExamStep && !isFullScreen()) {
      showFullScreenEnforceOverlay();
    } else if (isFullScreen()) {
      removeFullScreenEnforceOverlay();
    }
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

    document.addEventListener('fullscreenchange', () => {
      if (typeof window.viHandleFullScreenChange === 'function') {
        window.viHandleFullScreenChange();
      }
    });

    document.addEventListener('webkitfullscreenchange', () => {
      if (typeof window.viHandleFullScreenChange === 'function') {
        window.viHandleFullScreenChange();
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
    window.virtualInterviewInProgress = (state.step !== 'setup' && state.step !== 'results');
    updateSidebarVisibility();
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
             <h4 style="color:#10B981; font-size:14px; margin-bottom:8px; display:flex; align-items:center; gap:8px;"><span>📋</span> 4-Round Evaluation Format</h4>
             <ul style="color:var(--text-description); font-size:13px; line-height:1.6; margin-left:20px;">
                <li><strong>Round 1: Aptitude (MCQ)</strong> - 30 dynamic questions on logic & tech.</li>
                <li><strong>Round 2: Technical (Coding)</strong> - Interactive compiler execution round.</li>
                <li><strong>Round 3: Communication</strong> - AI conversational fluency test.</li>
                <li><strong>Round 4: AI Behavioral HR</strong> - Adaptive HR interview round.</li>
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
            Proceed to Rounds Overview →
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

    document.getElementById('start-btn').onclick = async () => {
      const compSelectVal = compSelect ? compSelect.value : 'custom';
      if (compSelectVal === 'custom') {
        state.company = document.getElementById('setup-company-custom').value.trim() || 'TCS';
      } else {
        const selectedOption = compSelect.options[compSelect.selectedIndex];
        state.company = selectedOption.getAttribute('data-company') || 'TCS';
      }
      state.role = document.getElementById('setup-role').value;
      state.step = 'dashboard';
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
      
      await handleEnableWebcam();
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

    const enterExamRound = async (stepName, roundTitle) => {
      if (!state.cameraEnabled) await handleEnableWebcam();
      if (isFullScreen()) {
        state.step = stepName;
        render();
      } else {
        promptFullScreenModal(stepName, roundTitle);
      }
    };

    document.getElementById('dash-r1').onclick = () => enterExamRound('aptitude', 'Round 1: Aptitude & Logic');
    document.getElementById('dash-r2').onclick = () => enterExamRound('technical', 'Round 2: Technical Coding');
    document.getElementById('dash-r3').onclick = () => enterExamRound('communication', 'Round 3: Communication Fluency');
    document.getElementById('dash-r4').onclick = () => enterExamRound('hr', 'Round 4: AI Behavioral HR Interview');
    const finishBtn = document.getElementById('dash-finish');
    if (finishBtn) finishBtn.onclick = () => { state.step = 'results'; render(); };

    const exitBtn = document.getElementById('vi-exit-btn');
    if (exitBtn) {
      exitBtn.onclick = () => {
        exitInterview(true);
      };
    }
  };


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

    const isDummy = !(window.__ENV__ && window.__ENV__.HAS_REAL_GEMINI_KEY);

    if (isDummy) {
      console.warn("Aptitude: GEMINI_API_KEY missing or placeholder. Activating randomized local pool fallback.");
      await new Promise(resolve => setTimeout(resolve, 300));
      loadLocalFallbackQuestions();
      return;
    }

    try {
      state.questions = await generateAptitudeQuestions(state);
      console.log(`Successfully generated ${state.questions.length} AI questions.`);
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

  const loadTechnicalChallenge = async () => {
    const isDummy = !(window.__ENV__ && window.__ENV__.HAS_REAL_GEMINI_KEY);
    
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
      return await generateTechnicalChallenge(state);
    } catch (e) {
      console.error("Failed to generate AI coding challenge, using local fallback:", e);
      return getFallback();
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

    // =========================================================================
    // PLACENIX DOJO BELT PROGRESSION SYSTEM
    // =========================================================================
    let currentBeltLevel = parseInt(localStorage.getItem('placenix_dojo_belt_level') || '0');
    let dojoClearedCount = parseInt(localStorage.getItem('placenix_dojo_cleared') || '0');
    currentBeltLevel = Math.min(Math.max(currentBeltLevel, 0), DOJO_BELT_CONFIG.length - 1);
    dojoClearedCount = Math.min(Math.max(dojoClearedCount, 0), 3);

    let activeBeltObj = DOJO_BELT_CONFIG[currentBeltLevel];
    let beltChallengesPool = dojoBeltChallenges[activeBeltObj.id] || dojoBeltChallenges.white;

    let challenge;
    try {
      challenge = beltChallengesPool[dojoClearedCount % beltChallengesPool.length] || beltChallengesPool[0];
    } catch (err) {
      console.error("Dojo Belt challenge pick failed, using fallback:", err);
      const candidates = staticTechnicalChallenges[state.role] || staticTechnicalChallenges["Software Engineer"];
      challenge = candidates[0];
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

      let currentConsoleTab = 'run-tests'; // 'run', 'run-tests', 'hints'
      let activeTCIdx = 0;
      let lastExecutionResults = null;

      const currentBeltInfo = DOJO_BELT_CONFIG[currentBeltLevel];
      const nextBeltInfo = DOJO_BELT_CONFIG[Math.min(currentBeltLevel + 1, DOJO_BELT_CONFIG.length - 1)];

      // Extract examples or format from challenge
      const testCasesList = challenge.testCases || [
        { input: '5', output: '1 3 5 7 9' },
        { input: '1', output: '1' },
        { input: '6', output: '1 3 5 7 9 11' }
      ];

      c.innerHTML = `
        <div style="padding: 12px 20px; width: 100%; height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; background: #070913; overflow: hidden; position: relative;">
          
          <!-- Anti-Copy/Paste Warning Toast (Hidden by default) -->
          <div id="anti-copy-toast" style="display: none; position: absolute; top: 60px; left: 50%; transform: translateX(-50%); z-index: 9999; background: #1E1B4B; border: 1.5px solid #6366F1; box-shadow: 0 10px 30px rgba(99,102,241,0.4); color: #fff; padding: 10px 20px; border-radius: 100px; font-weight: 700; font-size: 13px; align-items: center; gap: 10px; animation: bounceIn 0.3s ease;">
            <span style="font-size: 18px;">🚫</span>
            <span>Security Warning: Copying or Pasting code is strictly disabled in Technical Exam Mode.</span>
          </div>

          <!-- Sleek Combined Top Header Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 12px; height: 50px; flex-shrink: 0;">
            
            <!-- Left: Round title & Belt status -->
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; font-weight: 800; color: var(--brand-primary); text-transform: uppercase; letter-spacing: 0.08em; background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3); padding: 4px 10px; border-radius: 6px;">Round 2: Technical Evaluation</span>
                <h2 style="font-size: 17px; margin: 0; color: #fff; font-weight: 700;">${challenge.title}</h2>
              </div>

              <div style="height: 18px; width: 1px; background: rgba(255,255,255,0.15);"></div>

              <!-- Belt Rank Badge -->
              <div style="display: flex; align-items: center; gap: 6px; background: ${currentBeltInfo.color}18; border: 1px solid ${currentBeltInfo.color}50; padding: 3px 10px; border-radius: 100px; color: ${currentBeltInfo.color}; font-weight: 800; font-size: 12px;">
                <span>${currentBeltInfo.emoji}</span>
                <span>${currentBeltInfo.label}</span>
                <span style="color: rgba(255,255,255,0.4);">•</span>
                <span style="color: #fff;">Workout ${dojoClearedCount + 1}/3</span>
              </div>
            </div>

            <!-- Right: Language, Timer, Exit Button -->
            <div style="display: flex; align-items: center; gap: 12px;">
              
              <!-- Language Selector -->
              <div style="display: flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 2px 10px;">
                <span style="font-size: 11px; color: #94A3B8; font-weight: 700;">LANG:</span>
                <select id="tech-lang-select" style="background: transparent; border: none; color: #fff; font-weight: 700; font-size: 12px; outline: none; cursor: pointer; padding: 4px 0;">
                  ${challenge.languages.map(l => `<option value="${l}" ${l===selectedLang?'selected':''}>${l}</option>`).join('')}
                </select>
              </div>

              <!-- Timer Pill -->
              <div id="tech-timer-pill" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); padding: 5px 12px; border-radius: 100px; color: #fff; font-weight: 700; display: flex; align-items: center; gap: 6px; font-size: 13px;">
                <span>⏱️</span>
                <span id="tech-timer-val" style="font-family: monospace;">${min}:${sec}</span>
              </div>

              <!-- Exit Button -->
              <button id="vi-exit-btn" class="btn-premium-ghost" style="padding: 6px 12px; font-size: 12px; border-radius: 8px; border: 1px solid #EF4444; color: #EF4444; background: rgba(239,68,68,0.08); display: flex; align-items: center; gap: 6px; cursor: pointer; font-weight: 700;">
                🚪 Exit Exam
              </button>

            </div>

          </div>

          <!-- Main Split Layout (Left: Problem Description, Right: Editor + Console) -->
          <div style="display: grid; grid-template-columns: 1fr 1.35fr; gap: 14px; flex: 1; min-height: 0; overflow: hidden;">
            
            <!-- LEFT PANE: Problem Statement & Examples -->
            <div style="background: rgba(18, 24, 38, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden;">
              
              <!-- Pane Header Tabs -->
              <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 10px 16px;">
                <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: #fff;">
                  <span style="color: var(--brand-primary);">📄</span> Problem Description
                </div>
                <span style="font-size: 11px; background: rgba(16, 185, 129, 0.12); color: #10B981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 10px; border-radius: 100px; font-weight: 800;">
                  Target: ${state.company} (${state.role})
                </span>
              </div>

              <!-- Problem Content Area -->
              <div style="padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px;">
                
                <!-- Challenge Title & Description -->
                <div>
                  <h3 style="font-size: 18px; color: #fff; margin: 0 0 10px 0; font-weight: 700;">${challenge.title}</h3>
                  <div style="font-size: 14px; color: #CBD5E1; line-height: 1.65; white-space: pre-line;">
                    ${challenge.description}
                  </div>
                </div>

                <!-- Formats: Input & Output Specifications -->
                <div style="display: flex; flex-direction: column; gap: 14px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 10px;">
                  <div>
                    <div style="font-size: 12.5px; font-weight: 700; color: #A78BFA; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                      <span>📥</span> Input Format
                    </div>
                    <div style="color: #94A3B8; font-size: 13px; line-height: 1.5;">
                      ${challenge.inputFormat || 'A single input definition or argument stream.'}
                    </div>
                  </div>

                  <div style="border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 10px;">
                    <div style="font-size: 12.5px; font-weight: 700; color: #34D399; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                      <span>📤</span> Output Format
                    </div>
                    <div style="color: #94A3B8; font-size: 13px; line-height: 1.5;">
                      ${challenge.outputFormat || 'Print or return the computed results.'}
                    </div>
                  </div>
                </div>

                <!-- Structured Examples -->
                <div style="display: flex; flex-direction: column; gap: 14px;">
                  <div style="font-size: 14px; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 6px;">
                    <span>💡</span> Examples
                  </div>

                  ${testCasesList.slice(0, 3).map((tc, idx) => `
                    <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px;">
                      <div style="font-size: 12px; font-weight: 800; color: #F59E0B; text-transform: uppercase; letter-spacing: 0.05em;">Example ${idx + 1}</div>
                      
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                          <span style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">INPUT</span>
                          <div style="background: #0B0E1A; border: 1px solid rgba(255,255,255,0.08); padding: 8px 12px; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 13px; color: #F8FAFC; white-space: pre-wrap;">${tc.input.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                        </div>

                        <div>
                          <span style="font-size: 11px; color: #94A3B8; font-weight: 700; display: block; margin-bottom: 4px;">EXPECTED OUTPUT</span>
                          <div style="background: #0B0E1A; border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px 12px; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 13px; color: #34D399; white-space: pre-wrap;">${tc.output.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                        </div>
                      </div>

                      ${tc.explanation ? `
                        <div style="font-size: 12px; color: #94A3B8; background: rgba(255,255,255,0.02); padding: 6px 10px; border-radius: 6px;">
                          <strong style="color: #E2E8F0;">Explanation:</strong> ${tc.explanation}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>

                <!-- Constraints -->
                <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); padding: 12px 14px; border-radius: 100px; display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 12px; font-weight: 700; color: #F59E0B; white-space: nowrap;">⚡ Constraints:</span>
                  <span style="font-size: 12px; color: #CBD5E1; font-family: 'Fira Code', monospace;">${challenge.constraints || '1 <= N <= 1000, O(N) target.'}</span>
                </div>

              </div>

            </div>

            <!-- RIGHT PANE: Code Editor & Test Console -->
            <div style="display: flex; flex-direction: column; gap: 12px; min-height: 0; overflow: hidden;">
              
              <!-- Editor Container (Flex: 1.4 for extra workspace) -->
              <div style="flex: 1.4; background: rgba(18, 24, 38, 0.85); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; min-height: 0; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
                
                <!-- Editor Header Bar -->
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 8px 16px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 12px; color: #fff; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                      <span>💻</span> Code Editor
                    </span>
                    <span id="tech-line-count" style="font-size: 11px; background: rgba(255,255,255,0.05); color: #94A3B8; padding: 2px 8px; border-radius: 100px; font-family: monospace;">Line 1</span>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="tech-reset-code-btn" style="background: transparent; border: 1px solid rgba(255,255,255,0.1); color: #94A3B8; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; cursor: pointer;">
                      🔄 Reset Code
                    </button>
                    <span style="font-size: 11px; color: #64748B; font-family: monospace;">Tab: 2 spaces</span>
                  </div>
                </div>

                <!-- Editor Workspace (Gutter + Textarea) -->
                <div style="display: flex; flex: 1; min-height: 0; background: #0B0E1A; position: relative;">
                  <div id="tech-line-numbers" style="padding: 14px 10px; background: rgba(0,0,0,0.25); color: #475569; font-family: 'Fira Code', 'JetBrains Mono', Consolas, monospace; font-size: 13.5px; line-height: 1.6; text-align: right; user-select: none; border-right: 1px solid rgba(255,255,255,0.06); min-width: 42px; font-weight: 600; box-sizing: border-box; overflow: hidden;">
                    1
                  </div>
                  <textarea id="tech-code-editor" spellcheck="false" style="flex: 1; background: transparent; color: #E2E8F0; border: none; font-family: 'Fira Code', 'JetBrains Mono', Consolas, monospace; font-size: 13.5px; padding: 14px 16px; resize: none; outline: none; line-height: 1.6; tab-size: 2; font-weight: 500; caret-color: #A78BFA; white-space: pre; overflow-x: auto;"></textarea>
                </div>

              </div>

      <!-- Test Cases & Execution Panel (Flex: 1.0) -->
      <div style="flex: 1; background: rgba(18, 24, 38, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; min-height: 0;">
        
        <!-- Panel Tabs -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0 12px;">
          <div style="display: flex; gap: 4px;">
            <button id="tab-btn-run-tests" class="console-tab-btn active" style="padding: 8px 16px; font-size: 12px; font-weight: 800; background: rgba(139,92,246,0.15); border: none; border-bottom: 2px solid var(--brand-primary); color: #fff; cursor: pointer;">
              🧪 Test Cases
            </button>
            <button id="tab-btn-run" class="console-tab-btn" style="padding: 8px 16px; font-size: 12px; font-weight: 800; background: transparent; border: none; border-bottom: 2px solid transparent; color: #94A3B8; cursor: pointer;">
              💻 Terminal Output
            </button>
            <button id="tab-btn-hints" class="console-tab-btn" style="padding: 8px 16px; font-size: 12px; font-weight: 800; background: transparent; border: none; border-bottom: 2px solid transparent; color: #94A3B8; cursor: pointer;">
              💡 Hints & Complexity
            </button>
          </div>
        </div>

        <!-- Tab 1 Content: Test Cases Runner -->
        <div id="console-pane-run-tests" style="flex: 1; display: flex; flex-direction: column; padding: 12px; gap: 10px; overflow: hidden; min-height: 0;">
          
          <div id="tech-test-banner" style="padding: 8px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; font-weight: 700; font-size: 12px; color: #9CA3AF; display: flex; align-items: center; justify-content: space-between;">
            <span id="tech-test-banner-text">Ready to run test cases. Click "Run Tests" to execute your solution.</span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 12px; flex: 1; min-height: 0; overflow: hidden;">
            
            <!-- Left: Test Case Selectors -->
            <div style="display: flex; flex-direction: column; gap: 6px; overflow-y: auto;" id="tc-list-container">
              ${testCasesList.map((tc, idx) => `
                <button class="tc-selector-btn ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: ${idx === 0 ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.2)'}; border: 1px solid ${idx === 0 ? 'var(--brand-primary)' : 'rgba(255,255,255,0.06)'}; border-radius: 8px; color: ${idx === 0 ? '#fff' : '#94A3B8'}; font-size: 12px; font-weight: 700; cursor: pointer;">
                  <span>Case ${idx + 1}</span>
                  <span class="tc-status-icon-${idx}" style="font-size: 12px;">⚪</span>
                </button>
              `).join('')}
            </div>

            <!-- Right: Active Case Details -->
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;">
              <div>
                <span style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Input</span>
                <div id="tc-detail-input" style="background: #0B0E1A; border: 1px solid rgba(255,255,255,0.08); padding: 8px 12px; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 12.5px; color: #fff; white-space: pre-wrap; margin-top: 4px;">${testCasesList[0].input.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              </div>

              <div>
                <span style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Expected Output</span>
                <div id="tc-detail-expected" style="background: #0B0E1A; border: 1px solid rgba(16, 185, 129, 0.2); padding: 8px 12px; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 12.5px; color: #34D399; white-space: pre-wrap; margin-top: 4px;">${testCasesList[0].output.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
              </div>

              <div>
                <span style="font-size: 11px; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Your Output</span>
                <div id="tc-detail-actual" style="background: #0B0E1A; border: 1px solid rgba(255,255,255,0.08); padding: 8px 12px; border-radius: 6px; font-family: 'Fira Code', monospace; font-size: 12.5px; color: #9CA3AF; white-space: pre-wrap; margin-top: 4px;">Not evaluated yet. Click "Run Tests" to execute.</div>
              </div>
            </div>

          </div>

        </div>

        <!-- Tab 2 Content: Terminal Output -->
        <div id="console-pane-run" style="flex: 1; display: none; flex-direction: column; padding: 12px; overflow-y: auto;">
          <div id="tech-console" style="flex: 1; font-family: 'Fira Code', monospace; font-size: 12.5px; color: #9CA3AF; white-space: pre-wrap; line-height: 1.6; padding: 12px; background: #0B0E1A; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">Ready to run execution logs.</div>
        </div>

        <!-- Tab 3 Content: Hints -->
        <div id="console-pane-hints" style="flex: 1; display: none; flex-direction: column; padding: 16px; gap: 10px; overflow-y: auto; font-size: 13px; color: #CBD5E1; line-height: 1.6;">
          <div style="font-weight: 700; color: #fff; display: flex; align-items: center; gap: 6px;">
            <span>💡</span> Optimization Guidance & Complexity Target:
          </div>
          <ul style="margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px;">
            <li>Target Time Complexity: <strong style="color: #34D399;">O(N)</strong> or better.</li>
            <li>Target Space Complexity: <strong style="color: #A78BFA;">O(1)</strong> in-place space usage where applicable.</li>
            <li>Check for edge cases: null values, empty arrays, or single element streams.</li>
          </ul>
        </div>

        <!-- Action Row -->
        <div style="display: flex; gap: 12px; justify-content: flex-end; align-items: center; background: rgba(0,0,0,0.3); padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.08);">
          ${state.technicalSkipsUsed < 3 ? `
            <button id="tech-skip-btn" class="btn-premium-ghost" style="padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px dashed rgba(255, 255, 255, 0.2); color: #94A3B8; background: transparent;">
              ⏭️ Skip Question
            </button>
          ` : `
            <button id="tech-skip-btn" class="btn-premium-ghost" style="padding: 9px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: not-allowed; border: 1px solid rgba(239, 68, 68, 0.2); color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.02);" disabled>
              ⏭️ Skips Exhausted
            </button>
          `}
          
          <button id="tech-run-btn" class="btn-premium" style="padding: 9px 20px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; background: linear-gradient(135deg, #6366F1, #8B5CF6); border: none; box-shadow: 0 4px 14px rgba(99,102,241,0.3);">
            ▶ Run Tests
          </button>
          
          <button id="tech-submit-btn" class="btn-premium" style="padding: 9px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; background: linear-gradient(135deg, #10B981, #059669); border: none; box-shadow: 0 4px 14px rgba(16,185,129,0.3);">
            🚀 Submit Answer
          </button>
        </div>

      </div>

    </div>

  </div>

</div>
      `;

      // Security & Anti-Copy/Paste Warning System
      const showAntiCopyToast = () => {
        const toast = document.getElementById('anti-copy-toast');
        if (toast) {
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }
      };

      // Line numbers sync function
      const updateLineNumbers = () => {
        const lineNumEl = document.getElementById('tech-line-numbers');
        const editor = document.getElementById('tech-code-editor');
        const lineCountEl = document.getElementById('tech-line-count');
        if (editor) {
          const lines = editor.value.split('\n');
          const lineCount = lines.length;
          if (lineNumEl) {
            let numbers = '';
            for (let i = 1; i <= Math.max(lineCount, 15); i++) {
              numbers += i + '<br>';
            }
            lineNumEl.innerHTML = numbers;
            lineNumEl.scrollTop = editor.scrollTop;
          }
          if (lineCountEl) {
            const cursorLine = editor.value.substring(0, editor.selectionStart).split('\n').length;
            lineCountEl.innerText = `Line ${cursorLine} / ${lineCount}`;
          }
        }
      };

      // Editor Setup
      const editor = document.getElementById('tech-code-editor');
      if (editor) {
        editor.value = challenge.templates[selectedLang] || "";
        updateLineNumbers();

        editor.addEventListener('input', updateLineNumbers);
        editor.addEventListener('scroll', updateLineNumbers);
        editor.addEventListener('keyup', updateLineNumbers);
        editor.addEventListener('click', updateLineNumbers);

        const resetBtn = document.getElementById('tech-reset-code-btn');
        if (resetBtn) {
          resetBtn.onclick = () => {
            if (confirm("Reset code template back to default?")) {
              editor.value = challenge.templates[selectedLang] || "";
              updateLineNumbers();
            }
          };
        }

        // Anti-Copy & Anti-Paste Event Restrictions
        editor.oncopy = (e) => { e.preventDefault(); showAntiCopyToast(); };
        editor.onpaste = (e) => { e.preventDefault(); showAntiCopyToast(); };
        editor.oncut = (e) => { e.preventDefault(); showAntiCopyToast(); };
        editor.oncontextmenu = (e) => { e.preventDefault(); showAntiCopyToast(); };

        editor.onkeydown = (e) => {
          if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'C', 'V', 'X'].includes(e.key)) {
            e.preventDefault();
            showAntiCopyToast();
            return;
          }
          if (e.shiftKey && e.key === 'Insert') {
            e.preventDefault();
            showAntiCopyToast();
            return;
          }
          if (e.key === 'Tab') {
            e.preventDefault();
            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            editor.value = editor.value.substring(0, start) + "  " + editor.value.substring(end);
            editor.selectionStart = editor.selectionEnd = start + 2;
            updateLineNumbers();
          }
        };
      }

      // Belt Switcher Pill Click Handlers
      const beltBtns = document.querySelectorAll('.dojo-belt-select-btn');
      beltBtns.forEach(btn => {
        btn.onclick = () => {
          const selectedLvl = parseInt(btn.getAttribute('data-level'));
          currentBeltLevel = selectedLvl;
          dojoClearedCount = 0;
          localStorage.setItem('placenix_dojo_belt_level', String(currentBeltLevel));
          localStorage.setItem('placenix_dojo_cleared', '0');
          renderTechnical(c);
        };
      });

      document.getElementById('tech-lang-select').onchange = (e) => {
        selectedLang = e.target.value;
        if (editor) {
          editor.value = challenge.templates[selectedLang] || "";
        }
      };

      // Console Tab Switching (Run Logs, Run Tests, Hints)
      const tabRun = document.getElementById('tab-btn-run');
      const tabRunTests = document.getElementById('tab-btn-run-tests');
      const tabHints = document.getElementById('tab-btn-hints');

      const paneRun = document.getElementById('console-pane-run');
      const paneRunTests = document.getElementById('console-pane-run-tests');
      const paneHints = document.getElementById('console-pane-hints');

      const switchConsoleTab = (target) => {
        [tabRun, tabRunTests, tabHints].forEach(b => {
          if (b) {
            b.style.background = 'transparent';
            b.style.borderBottom = '2px solid transparent';
            b.style.color = 'var(--text-muted)';
            b.classList.remove('active');
          }
        });
        [paneRun, paneRunTests, paneHints].forEach(p => {
          if (p) p.style.display = 'none';
        });

        if (target === 'run') {
          tabRun.style.background = 'rgba(139,92,246,0.1)';
          tabRun.style.borderBottom = '2px solid var(--brand-primary)';
          tabRun.style.color = '#fff';
          paneRun.style.display = 'flex';
        } else if (target === 'run-tests') {
          tabRunTests.style.background = 'rgba(139,92,246,0.1)';
          tabRunTests.style.borderBottom = '2px solid var(--brand-primary)';
          tabRunTests.style.color = '#fff';
          paneRunTests.style.display = 'flex';
        } else if (target === 'hints') {
          tabHints.style.background = 'rgba(139,92,246,0.1)';
          tabHints.style.borderBottom = '2px solid var(--brand-primary)';
          tabHints.style.color = '#fff';
          paneHints.style.display = 'flex';
        }
      };

      if (tabRun) tabRun.onclick = () => switchConsoleTab('run');
      if (tabRunTests) tabRunTests.onclick = () => switchConsoleTab('run-tests');
      if (tabHints) tabHints.onclick = () => switchConsoleTab('hints');

      // Test Case Selector Button Handlers
      const renderTCDetails = (idx) => {
        activeTCIdx = idx;
        const selectorBtns = document.querySelectorAll('.tc-selector-btn');
        selectorBtns.forEach((btn, i) => {
          if (i === idx) {
            btn.style.background = 'rgba(139,92,246,0.15)';
            btn.style.borderColor = 'var(--brand-primary)';
            btn.style.color = '#fff';
          } else {
            btn.style.background = 'rgba(255,255,255,0.02)';
            btn.style.borderColor = 'rgba(255,255,255,0.06)';
            btn.style.color = 'var(--text-description)';
          }
        });

        const targetTC = testCasesList[idx] || { input: '', output: '' };
        const inputEl = document.getElementById('tc-detail-input');
        const expectedEl = document.getElementById('tc-detail-expected');
        const actualEl = document.getElementById('tc-detail-actual');

        if (inputEl) inputEl.innerText = targetTC.input;
        if (expectedEl) expectedEl.innerText = targetTC.output;

        if (actualEl) {
          if (lastExecutionResults && lastExecutionResults.testCaseResults && lastExecutionResults.testCaseResults[idx]) {
            const res = lastExecutionResults.testCaseResults[idx];
            actualEl.innerText = res.actual || targetTC.output;
            actualEl.style.color = res.passed ? '#10B981' : '#EF4444';
          } else {
            actualEl.innerText = 'Not evaluated yet. Click "Run Tests" to execute.';
            actualEl.style.color = '#9CA3AF';
          }
        }
      };

      const tcSelectors = document.querySelectorAll('.tc-selector-btn');
      tcSelectors.forEach(btn => {
        btn.onclick = (e) => {
          const idx = parseInt(btn.getAttribute('data-index'));
          renderTCDetails(idx);
        };
      });

      // Run Tests Click Handler
      document.getElementById('tech-run-btn').onclick = async () => {
        switchConsoleTab('run-tests');
        const runBtn = document.getElementById('tech-run-btn');
        const bannerEl = document.getElementById('tech-test-banner');
        const bannerTextEl = document.getElementById('tech-test-banner-text');

        if (bannerTextEl) {
          bannerTextEl.innerText = "⏳ Compiling and evaluating test suite against AI sandbox...";
          bannerEl.style.background = "rgba(139, 92, 246, 0.1)";
          bannerEl.style.borderColor = "rgba(139, 92, 246, 0.3)";
          bannerEl.style.color = "#A78BFA";
        }

        runBtn.style.opacity = "0.5";
        runBtn.disabled = true;

        const results = await runCodeAI(challenge, selectedLang, editor.value);
        lastExecutionResults = results;

        runBtn.style.opacity = "1";
        runBtn.disabled = false;

        let passedCount = 0;
        const totalCount = testCasesList.length;

        if (results.success && results.testCaseResults) {
          results.testCaseResults.forEach((tr, idx) => {
            const iconEl = document.querySelector(`.tc-status-icon-${idx}`);
            if (tr.passed) {
              passedCount++;
              if (iconEl) { iconEl.innerText = "✔"; iconEl.style.color = "#10B981"; }
            } else {
              if (iconEl) { iconEl.innerText = "❌"; iconEl.style.color = "#EF4444"; }
            }
          });
        }

        // Update Banner State
        if (bannerEl && bannerTextEl) {
          if (results.success && passedCount === totalCount) {
            bannerEl.style.background = "rgba(16, 185, 129, 0.12)";
            bannerEl.style.borderColor = "rgba(16, 185, 129, 0.3)";
            bannerEl.style.color = "#10B981";
            bannerTextEl.innerHTML = `✔ You have passed ${passedCount}/${totalCount} tests`;
          } else if (results.success) {
            bannerEl.style.background = "rgba(245, 158, 11, 0.12)";
            bannerEl.style.borderColor = "rgba(245, 158, 11, 0.3)";
            bannerEl.style.color = "#F59E0B";
            bannerTextEl.innerHTML = `⚠️ You passed ${passedCount}/${totalCount} tests`;
          } else {
            bannerEl.style.background = "rgba(239, 68, 68, 0.12)";
            bannerEl.style.borderColor = "rgba(239, 68, 68, 0.3)";
            bannerEl.style.color = "#EF4444";
            bannerTextEl.innerHTML = `❌ Compilation / Syntax Error in Code`;
          }
        }

        // Also update Run Logs terminal text
        const consoleEl = document.getElementById('tech-console');
        if (consoleEl) {
          if (!results.success) {
            consoleEl.innerText = `❌ Compilation/Syntax Error:\n${results.error}\n\nStdout:\n${results.stdout}`;
            consoleEl.style.color = "#EF4444";
          } else {
            consoleEl.innerText = `✔ Execution Successful.\n\nStdout:\n${results.stdout}`;
            consoleEl.style.color = "#9CA3AF";
          }
        }

        // Refresh active test case detail view
        renderTCDetails(activeTCIdx);

        if (results.success && passedCount === totalCount) {
          setTimeout(() => {
            handleSubmit(passedCount, editor.value);
          }, 1800);
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

      // DOJO BELT PROGRESSION UPDATE
      if (passedCount === challenge.testCases.length) {
        dojoClearedCount++;
      }

      let beltLeveledUp = false;
      let newBeltObj = null;

      if (dojoClearedCount >= 3 && currentBeltLevel < DOJO_BELT_CONFIG.length - 1) {
        currentBeltLevel++;
        dojoClearedCount = 0;
        beltLeveledUp = true;
        newBeltObj = DOJO_BELT_CONFIG[currentBeltLevel];
      }

      localStorage.setItem('placenix_dojo_belt_level', String(currentBeltLevel));
      localStorage.setItem('placenix_dojo_cleared', String(dojoClearedCount));

      const proceedNext = () => {
        if (state.technicalSolvedCount < 3) {
          renderTechnical(c);
        } else {
          renderTechnicalReport();
        }
      };

      if (beltLeveledUp && newBeltObj) {
        // Show Belt Level Up Celebration Modal
        const modalDiv = document.createElement('div');
        modalDiv.style.cssText = `
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(7, 5, 10, 0.85); backdrop-filter: blur(12px);
          display: flex; justify-content: center; align-items: center; padding: 20px;
        `;
        modalDiv.innerHTML = `
          <div style="background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%); border: 2px solid ${newBeltObj.color}; box-shadow: 0 20px 50px ${newBeltObj.color}40; padding: 40px; border-radius: 24px; max-width: 480px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px;">
            <div style="font-size: 64px;">${newBeltObj.emoji}</div>
            <div style="font-size: 11px; font-weight: 800; color: ${newBeltObj.color}; text-transform: uppercase; letter-spacing: 0.15em; background: ${newBeltObj.color}20; padding: 4px 16px; border-radius: 100px; border: 1px solid ${newBeltObj.color}40;">
              BELT RANK UNLOCKED!
            </div>
            <h2 style="font-size: 26px; color: #fff; margin: 0; font-weight: 800;">Congratulations!</h2>
            <p style="color: #94A3B8; font-size: 14px; margin: 0; line-height: 1.6;">
              You successfully cleared 3 workouts and achieved <strong style="color: ${newBeltObj.color};">${newBeltObj.label}</strong>!
            </p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 14px 18px; border-radius: 12px; font-size: 12.5px; color: #CBD5E1; text-align: left; width: 100%;">
              <strong>Next Focus:</strong> ${newBeltObj.hint}
            </div>
            <button id="dojo-continue-belt-btn" class="btn-premium" style="width: 100%; padding: 14px; border-radius: 12px; font-weight: 800; font-size: 15px; background: ${newBeltObj.color}; color: ${newBeltObj.textColor}; border: none; cursor: pointer; margin-top: 10px;">
              🥋 Continue Workout →
            </button>
          </div>
        `;
        document.body.appendChild(modalDiv);
        document.getElementById('dojo-continue-belt-btn').onclick = () => {
          modalDiv.remove();
          proceedNext();
        };
      } else {
        proceedNext();
      }
    };

    // =========================================================================
    // KALVIUM DOJO PRE-EXAM VERIFICATION & PERMISSIONS MODAL
    // =========================================================================
    const showDojoPreExamVerificationModal = (onProceed) => {
      const modal = document.createElement('div');
      modal.id = 'dojo-pre-exam-modal';
      modal.style.cssText = `
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(16px);
        display: flex; justify-content: center; align-items: center; padding: 20px;
        box-sizing: border-box; overflow-y: auto; font-family: system-ui, -apple-system, sans-serif;
      `;

      modal.innerHTML = `
        <div style="background: #ffffff; color: #1E293B; border-radius: 16px; width: 100%; max-width: 900px; box-shadow: 0 25px 60px rgba(0,0,0,0.5); overflow: hidden; display: flex; flex-direction: column; animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <!-- Modal Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 28px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC;">
            <div style="display: flex; gap: 260px; width: 100%; font-size: 15px; font-weight: 800; color: #0F172A;">
              <span>Instructions</span>
              <span>Enable Permissions</span>
            </div>
            <button id="dojo-modal-close-btn" style="background: transparent; border: none; font-size: 20px; font-weight: 800; color: #64748B; cursor: pointer; padding: 4px 8px; border-radius: 6px;">✕</button>
          </div>

          <!-- Main Body Grid -->
          <div style="display: grid; grid-template-columns: 1.35fr 1fr; gap: 28px; padding: 28px; font-size: 13px; line-height: 1.6; color: #334155;">
            
            <!-- Left Column: Instructions & Integrity Guidelines -->
            <div style="display: flex; flex-direction: column; gap: 14px;">
              
              <p style="margin: 0; color: #475569;">
                Belts are highly regarded by our industry partners as they are trusted to be the true representation of a student's skills. You can attempt the belt test for a level multiple times, and failing has no consequences.
              </p>

              <p style="margin: 0; color: #475569;">
                Belts will be awarded following successful verification through integrity checks. To ensure successful verification, please follow these guidelines:
              </p>

              <ul style="margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; color: #1E293B;">
                <li><strong>Ensure you're sharing the entire screen</strong> during the session, rather than just tab/window.</li>
                <li><strong>Maintain focus solely on the Belt Test window.</strong> Close all other tabs, windows, and notifications.</li>
                <li><strong>Refrain from using in-browser AI assistance</strong> or any other helper tools.</li>
                <li><strong>Share your webcam feed</strong> and avoid interacting with peers.</li>
              </ul>

              <!-- Proctoring Guidelines Warning Card -->
              <div style="background: #FEFCE8; border: 1.5px solid #FDE047; border-radius: 12px; padding: 16px; margin-top: 6px;">
                <div style="font-weight: 800; color: #854D0E; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                  <span>🛡️</span> Proctoring Guidelines
                </div>
                <div style="color: #713F12; font-size: 12px; line-height: 1.5;">
                  This belt test requires you to share your Camera and Microphone feed, as well as your entire screen.
                </div>
              </div>

              <!-- Enter Security Code Section -->
              <div style="margin-top: 10px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
                <div style="font-weight: 700; color: #0F172A; font-size: 13px;">Enter the Security code shared by your mentor</div>
                <div style="display: flex; gap: 10px;">
                  <input class="dojo-otp-input" type="text" maxlength="1" value="9" style="width: 42px; height: 46px; text-align: center; font-size: 20px; font-weight: 800; border: 1.5px solid #CBD5E1; border-radius: 8px; outline: none; background: #F8FAFC; color: #0F172A;">
                  <input class="dojo-otp-input" type="text" maxlength="1" value="9" style="width: 42px; height: 46px; text-align: center; font-size: 20px; font-weight: 800; border: 1.5px solid #CBD5E1; border-radius: 8px; outline: none; background: #F8FAFC; color: #0F172A;">
                  <input class="dojo-otp-input" type="text" maxlength="1" value="2" style="width: 42px; height: 46px; text-align: center; font-size: 20px; font-weight: 800; border: 1.5px solid #CBD5E1; border-radius: 8px; outline: none; background: #F8FAFC; color: #0F172A;">
                  <input class="dojo-otp-input" type="text" maxlength="1" value="5" style="width: 42px; height: 46px; text-align: center; font-size: 20px; font-weight: 800; border: 1.5px solid #CBD5E1; border-radius: 8px; outline: none; background: #F8FAFC; color: #0F172A;">
                  <input class="dojo-otp-input" type="text" maxlength="1" value="0" style="width: 42px; height: 46px; text-align: center; font-size: 20px; font-weight: 800; border: 1.5px solid #CBD5E1; border-radius: 8px; outline: none; background: #F8FAFC; color: #0F172A;">
                  <input class="dojo-otp-input" type="text" maxlength="1" value="1" style="width: 42px; height: 46px; text-align: center; font-size: 20px; font-weight: 800; border: 1.5px solid #CBD5E1; border-radius: 8px; outline: none; background: #F8FAFC; color: #0F172A;">
                </div>
              </div>

            </div>

            <!-- Right Column: Enable Permissions -->
            <div style="display: flex; flex-direction: column; gap: 16px; border-left: 1px solid #E2E8F0; padding-left: 24px;">
              
              <p style="margin: 0; color: #475569; font-size: 12.5px;">
                Please enable access to your camera, microphone, and screen sharing to proceed.
              </p>

              <!-- Permission Box 1: Camera & Microphone -->
              <div style="display: flex; flex-direction: column; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: #0F172A; font-size: 12.5px;">
                  <span>📹 Camera & Microphone</span>
                  <span id="cam-status-tag" style="color: #64748B; font-weight: 700; font-size: 11px; background: #E2E8F0; padding: 2px 8px; border-radius: 100px;">Ready</span>
                </div>
                
                <!-- Noise/Live Preview Box -->
                <div id="dojo-cam-preview-box" style="height: 110px; background: #0F172A; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative;">
                  <video id="dojo-preview-webcam" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); display: none;"></video>
                  <div id="dojo-preview-noise" style="color: #94A3B8; font-size: 11px; text-align: center; padding: 10px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                    <span style="font-size: 20px;">📷</span>
                    <span>Click Enable Stream to Activate Camera</span>
                  </div>
                </div>

                <button id="dojo-enable-cam-btn" style="background: #0F172A; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 11.5px; cursor: pointer; align-self: flex-start;">
                  Enable Stream
                </button>
              </div>

              <!-- Permission Box 2: Fullscreen & Screen Sharing -->
              <div style="display: flex; flex-direction: column; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; color: #0F172A; font-size: 12.5px;">
                  <span>🖥️ Screen Sharing & Fullscreen</span>
                  <span id="screen-status-tag" style="color: #64748B; font-weight: 700; font-size: 11px; background: #E2E8F0; padding: 2px 8px; border-radius: 100px;">Ready</span>
                </div>

                <div style="font-size: 11.5px; color: #64748B;">
                  This test requires to be taken in full screen and shared screen session.
                </div>

                <button id="dojo-enable-screen-btn" style="background: #0F172A; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-weight: 700; font-size: 11.5px; cursor: pointer; align-self: flex-start;">
                  Enable Full Screen
                </button>
              </div>

              <!-- Bottom Action Button -->
              <button id="dojo-start-exam-btn" style="background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff; border: none; padding: 14px; border-radius: 10px; font-weight: 800; font-size: 14px; cursor: pointer; margin-top: auto; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3); transition: all 0.2s ease;">
                🚀 Proceed to Belt Test
              </button>

            </div>

          </div>

        </div>
      `;

      document.body.appendChild(modal);

      const bindStreamToPreview = (stream) => {
        if (!stream) return;
        const videoEl = document.getElementById('dojo-preview-webcam');
        const noiseEl = document.getElementById('dojo-preview-noise');
        const statusTag = document.getElementById('cam-status-tag');

        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.style.display = 'block';
          videoEl.play().catch(e => console.log("Webcam play error:", e));
        }
        if (noiseEl) noiseEl.style.display = 'none';
        if (statusTag) {
          statusTag.innerText = '✓ Active';
          statusTag.style.color = '#10B981';
          statusTag.style.background = '#10B98115';
        }
      };

      // OTP inputs auto-advance behavior
      const otpInputs = modal.querySelectorAll('.dojo-otp-input');
      otpInputs.forEach((input, idx) => {
        input.onkeyup = (e) => {
          if (input.value && idx < otpInputs.length - 1) {
            otpInputs[idx + 1].focus();
          }
        };
      });

      // Auto-trigger camera if already available or initialize webcam prompt
      if (state.localStream) {
        bindStreamToPreview(state.localStream);
      } else {
        setupLocalWebcam().then(() => {
          if (state.localStream) bindStreamToPreview(state.localStream);
        });
      }

      // Enable Cam Button Handler
      document.getElementById('dojo-enable-cam-btn').onclick = async () => {
        try {
          await setupLocalWebcam();
          if (state.localStream) {
            bindStreamToPreview(state.localStream);
          }
        } catch (e) {
          console.error("Camera stream preview error:", e);
        }
      };

      // Enable Screen Button Handler
      document.getElementById('dojo-enable-screen-btn').onclick = () => {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        const tag = document.getElementById('screen-status-tag');
        if (tag) {
          tag.innerText = '✓ Fullscreen Active';
          tag.style.color = '#10B981';
          tag.style.background = '#10B98115';
        }
      };

      // Close Button Handler
      document.getElementById('dojo-modal-close-btn').onclick = () => {
        modal.remove();
        state.step = 'dashboard';
        render();
      };

      // Proceed Button Handler
      document.getElementById('dojo-start-exam-btn').onclick = async () => {
        const code = Array.from(otpInputs).map(i => i.value).join('');
        if (code.length < 6) {
          alert("Please enter the 6-digit mentor security code to proceed!");
          return;
        }

        if (!state.cameraEnabled) {
          await setupLocalWebcam();
        }

        // Show live camera stream in bottom-right AI proctoring widget
        const proctorLayer = document.getElementById('vi-proctor-layer');
        if (proctorLayer) proctorLayer.style.display = 'block';
        
        const webcamEl = document.getElementById('vi-webcam');
        if (webcamEl && state.localStream) {
          webcamEl.srcObject = state.localStream;
          webcamEl.style.display = 'block';
        }
        const overlayEl = document.getElementById('vi-cam-overlay');
        if (overlayEl) overlayEl.style.display = 'none';

        modal.remove();
        if (onProceed) onProceed();
      };
    };

    const activateCameraStream = async () => {
      if (!state.cameraEnabled || !state.localStream) {
        await setupLocalWebcam();
      }
      const proctorLayer = document.getElementById('vi-proctor-layer');
      if (proctorLayer) proctorLayer.style.display = 'block';
      const webcamEl = document.getElementById('vi-webcam');
      if (webcamEl && state.localStream) {
        webcamEl.srcObject = state.localStream;
        webcamEl.style.display = 'block';
      }
      const overlayEl = document.getElementById('vi-cam-overlay');
      if (overlayEl) overlayEl.style.display = 'none';
    };

    if (!state.dojoVerifiedThisSession) {
      showDojoPreExamVerificationModal(async () => {
        state.dojoVerifiedThisSession = true;
        await activateCameraStream();
        startTimer();
        drawIDE();
      });
    } else {
      await activateCameraStream();
      startTimer();
      drawIDE();
    }
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

    const report = await evaluateHRFit(state);
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





  // --- PROCTORING ENGINE (CALIBRATED AI NEURAL HUB) ---
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

  let faceModel, objectModel, audioContext, analyzer, timeDataArray;
  let speechRecognitionInstance = null;
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
    const isLoud = rmsVal >= 14.0;
    const voiceText = isLoud 
      ? `<span style="color:#EF4444; font-weight:bold;">🔴 Voice/Noise (${Math.round(rmsVal)})</span>` 
      : `<span style="color:#10B981;">🟢 Normal (${Math.round(rmsVal)})</span>`;
      
    const examActive = ['aptitude', 'technical', 'communication', 'hr'].includes(state.step);
    const modeText = examActive 
      ? `<span style="color:#EF4444; font-weight:bold;">🚨 LIVE EXAM MODE</span>` 
      : `<span style="color:#3B82F6;">🛡️ SETUP / TEST MODE</span>`;
      
    overlay.innerHTML = `
      <div>Face: ${faceText}</div>
      <div>Phone: ${phoneText}</div>
      <div>Audio: ${voiceText}</div>
      <div style="margin-top:4px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; font-size:8px; opacity:0.8;">${modeText}</div>
    `;
  };

  const initProctoring = async () => {
    if (state.proctorActive || state.proctorInitializing) return;
    state.proctorInitializing = true;
    
    // Reset violation counters when starting proctoring session
    consecutiveVideoViolations = 0;
    consecutiveAudioViolations = 0;
    lastVideoViolation = null;
    state.proctorWarnings = 0;
    state.isBlocked = false;
    
    const layer = document.getElementById('vi-proctor-layer');
    if (layer) {
      layer.style.display = 'block';
    }
    
    const statusEl = document.getElementById('vi-proctor-status');
    if (statusEl) { statusEl.innerText = "Proctoring: Initializing AI..."; statusEl.style.color = "#3B82F6"; statusEl.style.background = "rgba(59, 130, 246, 0.1)"; }
    try {
      await loadProctoringDependencies();
      if (!faceModel && window.blazeface) faceModel = await blazeface.load();
      if (!objectModel && window.cocoSsd) objectModel = await cocoSsd.load();
      state.modelsLoaded = true;
      state.proctorActive = true;
      state.proctorInitializing = false;
      if (statusEl) { statusEl.innerText = "Proctoring: Active & Secure"; statusEl.style.color = "#10B981"; statusEl.style.background = "rgba(16, 185, 129, 0.1)"; }
      startProctoringLoop();
      initSpeechProctoring();
    } catch (e) {
      state.proctorInitializing = false;
      console.error("Proctoring init warning:", e);
      state.proctorActive = true;
      startProctoringLoop();
      initSpeechProctoring();
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
        if (!video.width || video.width === 0) {
          video.width = video.videoWidth || 640;
          video.height = video.videoHeight || 480;
        }
        
        let violation = null;
        let detectedFacesCount = 0;
        let phoneDetected = false;

        // 1. Face detection via BlazeFace
        if (faceModel) {
          try {
            const faces = await faceModel.estimateFaces(video, false);
            detectedFacesCount = faces.length;
          } catch (err) {}
        }
        
        // 2. Object & Person detection via COCO-SSD
        if (objectModel) {
          try {
            const objects = await objectModel.detect(video, 20, 0.35);
            const persons = objects.filter(obj => obj.class === 'person' && obj.score >= 0.45);
            
            detectedFacesCount = Math.max(detectedFacesCount, persons.length);
            
            phoneDetected = objects.some(obj => 
              (obj.class === 'cell phone' || 
               obj.class === 'phone' || 
               obj.class === 'mobile phone' || 
               obj.class === 'telephone') && 
              obj.score >= 0.35
            );
          } catch (err) {}
        }

        // Fallback: If no face model loaded yet but video stream is live, assume 1 person in front of webcam
        if (!faceModel && !objectModel && video.videoWidth > 0) {
          detectedFacesCount = 1;
        }

        state.proctorFaceCount = detectedFacesCount;
        state.proctorHasPhone = phoneDetected;
        
        updateProctorOverlay();
        
        if (detectedFacesCount > 1) {
          violation = "Multiple faces or extra person detected in camera frame!";
        } else if (phoneDetected) {
          violation = "Cell phone / cheating device detected!";
        } else if (detectedFacesCount === 0 && isTestActive) {
          violation = "No face detected in camera frame!";
        }
        
        if (violation && isTestActive) {
          if (violation === lastVideoViolation) {
            consecutiveVideoViolations++;
          } else {
            lastVideoViolation = violation;
            consecutiveVideoViolations = 1;
          }
          
          // Require violation to persist continuously for 8 checks (4 full seconds) before issuing a strike
          if (consecutiveVideoViolations >= 8) {
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
    
    setTimeout(startProctoringLoop, 500); // Scan twice a second
  };
  
  // Continuous Speech Recognition listener for detecting extra voices/talking during silent exams
  const initSpeechProctoring = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec || speechRecognitionInstance) return;
    
    try {
      speechRecognitionInstance = new SpeechRec();
      speechRecognitionInstance.continuous = true;
      speechRecognitionInstance.interimResults = true;
      speechRecognitionInstance.lang = 'en-US';

      speechRecognitionInstance.onresult = (event) => {
        const silentTestSteps = ['aptitude', 'technical'];
        if (!state.proctorActive || state.isBlocked || !silentTestSteps.includes(state.step)) return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (transcript.split(' ').length >= 3) { // Require at least 3 distinct spoken words
            console.warn("🚨 Speech Proctoring Alert: Spoken words trapped during exam:", transcript);
            registerStrike(`Extra voice / spoken words detected: "${transcript}"`);
            break;
          }
        }
      };

      speechRecognitionInstance.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn("Speech proctoring warning:", e.error);
        }
      };

      speechRecognitionInstance.onend = () => {
        if (state.proctorActive && !state.isBlocked) {
          try { speechRecognitionInstance.start(); } catch (err) {}
        }
      };

      speechRecognitionInstance.start();
    } catch (e) {
      console.warn("Speech recognition initialization skipped:", e);
    }
  };

  const setupAudioProctoring = async (stream) => {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;
      analyzer.connect(gainNode);
      gainNode.connect(audioContext.destination);

      timeDataArray = new Uint8Array(analyzer.fftSize);
      
      setInterval(() => {
        if (!state.proctorActive || state.isBlocked) {
          consecutiveAudioViolations = 0;
          state.proctorRms = 0;
          return;
        }
        
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
        }

        // Time-Domain RMS
        analyzer.getByteTimeDomainData(timeDataArray);
        let sumSquares = 0;
        for (let i = 0; i < timeDataArray.length; i++) {
          const dev = timeDataArray[i] - 128;
          sumSquares += dev * dev;
        }
        const rms = Math.sqrt(sumSquares / timeDataArray.length);
        state.proctorRms = rms;
        
        updateProctorOverlay();

        const isSpeaking = state.isListening || (window.speechSynthesis && window.speechSynthesis.speaking);
        if (isSpeaking) {
          consecutiveAudioViolations = 0;
          return;
        }
        
        const silentTestSteps = ['aptitude', 'technical'];
        if (!silentTestSteps.includes(state.step)) {
          consecutiveAudioViolations = 0;
          return;
        }

        // RMS >= 14.0 indicates distinct speech/loud talking (filtering out ambient room noise/fan hiss < 8.0)
        if (rms >= 14.0) {
          consecutiveAudioViolations++;
          if (consecutiveAudioViolations >= 6) { // Must persist for 3 continuous seconds (6 checks at 500ms)
            registerStrike("Suspicious background audio or extra voice detected!");
            consecutiveAudioViolations = 0;
          }
        } else {
          consecutiveAudioViolations = 0;
        }
      }, 500);
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

  const saveInterviewResults = async (scores) => {
    const user = Store.session?.user;
    if (!user || !user.id) return;

    // Get current employability_data or default
    const currentEmpData = user.employability_data || {};
    const history = currentEmpData.interview_history || [];
    
    const newAttemptNumber = history.length + 1;
    const newAttempt = {
      attempt: newAttemptNumber,
      date: new Date().toISOString().split('T')[0],
      company: state.company,
      role: state.role,
      scores: {
        aptitude: scores.aptitude,
        technical: scores.technical,
        communication: scores.communication,
        hr: scores.hr,
        overall: scores.overall
      }
    };

    const updatedHistory = [...history, newAttempt];
    const updatedEmpData = {
      ...currentEmpData,
      overall_score: scores.overall,
      communication: scores.communication,
      coding: scores.technical,
      aptitude: scores.aptitude,
      technical: scores.technical,
      interview_history: updatedHistory
    };

    // Update in-memory Store
    user.employability_data = updatedEmpData;
    user.employabilityScore = scores.overall;
    if (Store.session) {
      Store.session.user = user;
    }
    
    // Save to localStorage
    localStorage.setItem('placenix_user_session', JSON.stringify(Store.session));
    localStorage.setItem('placenix_session', JSON.stringify(Store.session));
    window.dispatchEvent(new CustomEvent('store-updated'));
    
    // Sync with Supabase profiles table
    if (supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ employability_data: updatedEmpData })
          .eq('id', user.id);
        if (error) throw error;
        console.log("✅ Interview results successfully synced to Supabase.");
      } catch (e) {
        console.error("❌ Failed to sync interview results to Supabase:", e.message);
      }
    }
  };

  const renderResults = () => {
    stopLocalWebcam();
    if (document.getElementById('vi-proctor-layer')) {
      document.getElementById('vi-proctor-layer').style.display = 'none';
    }

    const scores = calculateOverallScore();
    saveInterviewResults(scores);
    
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
      await downloadReportPDF(state, scores, cleared, grade, requiredGrade, cutoff, document.getElementById('vi-download-pdf-btn'));
    };

    const exitResultsBtn = document.getElementById('vi-exit-results-btn');
    if (exitResultsBtn) {
      exitResultsBtn.onclick = () => {
        exitInterview(false);
      };
    }
  };

  window.cleanupVirtualInterview = () => {
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
  };

  safeBindClick('vi-enable-cam-btn', () => handleEnableWebcam());
  render();
}
