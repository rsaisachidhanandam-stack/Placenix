// ============================================================
// PLACENIX — VIRTUAL INTERVIEW SIMULATION HUB (v2.4)
// ============================================================

export async function loadVirtualInterviewPage(root, Store, supabase) {
  // SECURE CONFIGURATION: Use environment variables or a secure vault in production
  const GROQ_API_KEY = ''; // Placeholder: Inject via secure env or vault
  const DID_API_KEY = '';  // Placeholder: Inject via secure env or vault
  
  let state = {
    step: 'setup',
    role: 'Software Engineer',
    company: 'Google',
    chatHistory: [],
    transcript: '',
    isListening: false,
    streamId: null,
    sessionId: null,
    peerConnection: null,
    isDIDConnected: false,
    useFallback: false
  };

  const render = () => {
    if (state.step === 'setup') renderSetup();
    else if (state.step === 'room') renderRoom();
  };

  const renderSetup = () => {
    root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Header -->
      <div style="display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; align-items:center; gap:8px; font-size:11px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.12em;">
          <span>AI Intelligence</span>
          <span style="opacity:0.3;">/</span>
          <span style="color:var(--brand-primary);">Virtual Interview</span>
        </div>
        <h1 class="h1-ent" style="font-size:32px;">Virtual Interview Simulation</h1>
        <p style="color:var(--text-description); font-size:16px;">High-fidelity AI-driven behavioral and technical evaluation environment.</p>
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
            <input type="text" id="setup-company" value="${state.company}" class="input-ent" placeholder="e.g. Goldman Sachs">
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

          <button id="start-btn" class="btn-premium" style="height:56px; font-size:16px; margin-top:16px; width:100%;">
            Initialize Virtual Room →
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

    document.getElementById('start-btn').onclick = () => {
      state.company = document.getElementById('setup-company').value;
      state.role = document.getElementById('setup-role').value;
      state.step = 'room';
      render();
    };
  };

  const renderRoom = () => {
    root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px; height: calc(100vh - 100px);">
      
      <!-- Operational Header -->
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Live Simulation</div>
          <h1 class="h1-ent" style="font-size:28px;">${state.company} Simulation Node</h1>
          <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
            <span style="font-size:14px; color:var(--text-description);">${state.role}</span>
            <div style="width:4px; height:4px; background:rgba(255,255,255,0.2); border-radius:50%;"></div>
            <span style="font-size:14px; color:var(--brand-secondary); font-weight:700;">Evaluation Mode Active</span>
          </div>
        </div>
        <button class="btn-premium-ghost" style="padding:12px 24px; border-radius:12px;" onclick="window.location.hash='#ai-modules'">Terminate Session</button>
      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; flex:1; gap:32px; min-height:0;">
        
        <!-- Simulation Stage -->
        <div style="display:flex; flex-direction:column; gap:32px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px;">
            <div class="card-ent" id="vi-mentor-box" style="margin:0; padding:0; aspect-ratio: 16/10; position:relative; overflow:hidden; background:#000; border:2px solid var(--brand-primary);">
              <div id="vi-did-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.8); display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:10; text-align:center; padding:32px;">
                <button id="vi-connect-btn" class="btn-premium" style="padding:14px 32px; border-radius:100px;">Activate Simulation Lead</button>
              </div>
              <video id="vi-did-video" style="width:100%; height:100%; object-fit:cover; display:none;" autoplay playsinline></video>
              <div style="position:absolute; bottom:16px; left:16px; background:rgba(0,0,0,0.6); backdrop-filter:blur(10px); padding:6px 16px; border-radius:100px; font-size:11px; font-weight:800; color:white; text-transform:uppercase; letter-spacing:0.08em; border:1px solid rgba(255,255,255,0.1);">Lead Mentor: Dr. Sarah</div>
            </div>

            <div class="card-ent" style="margin:0; padding:0; aspect-ratio: 16/10; position:relative; overflow:hidden; background:#000; border:2px solid rgba(255,255,255,0.05);">
              <video id="vi-webcam" style="width:100%; height:100%; object-fit:cover; transform: scaleX(-1);" autoplay playsinline muted></video>
              <div style="position:absolute; bottom:16px; left:16px; background:rgba(14,165,233,0.2); backdrop-filter:blur(10px); padding:6px 16px; border-radius:100px; font-size:11px; font-weight:800; color:var(--brand-secondary); text-transform:uppercase; letter-spacing:0.08em; border:1px solid rgba(14,165,233,0.2);">Candidate Profile: Transmitting</div>
            </div>
          </div>

          <div class="card-ent" style="flex:1; background:rgba(255,255,255,0.01); border-style:dashed; padding:32px; display:flex; gap:24px; align-items:center;">
            <div style="font-size:32px; opacity:0.8;">💡</div>
            <div>
              <h4 class="h2-ent" style="font-size:15px; margin-bottom:8px;">Operational Protocols</h4>
              <p style="font-size:13px; color:var(--text-description); line-height:1.6; max-width:600px;">Maintain professional posture and direct gaze. Ensure optimal lighting for neural expression analysis. Activate microphone to transmit verbal telemetry.</p>
            </div>
          </div>
        </div>

        <!-- Intelligence Logs -->
        <div class="card-ent" style="margin:0; display:flex; flex-direction:column; padding:0; overflow:hidden;">
          <div style="padding:20px 24px; border-bottom:1px solid var(--border-subtle); background:rgba(255,255,255,0.02); display:flex; justify-content:space-between; align-items:center;">
            <div class="label-ent" style="font-size:11px; color:#fff;">Live Assessment Log</div>
            <div style="width:8px; height:8px; background:#10B981; border-radius:50%; box-shadow:0 0 10px #10B981;"></div>
          </div>
          <div id="vi-transcript-area" style="flex:1; overflow-y:auto; padding:24px; display:flex; flex-direction:column; gap:20px; background:rgba(0,0,0,0.1);"></div>
          <div style="padding:32px; border-top:1px solid var(--border-subtle); display:flex; justify-content:center; align-items:center; background:rgba(255,255,255,0.01);">
            <button id="vi-mic-btn" style="width:72px; height:72px; border-radius:50%; background:var(--brand-primary); border:none; cursor:pointer; color:white; font-size:28px; display:flex; align-items:center; justify-content:center; box-shadow:0 8px 24px rgba(139,92,246,0.4); transition:all 0.4s cubic-bezier(0.4, 0, 0.2, 1);">🎤</button>
          </div>
        </div>
      </div>
    </div>

    <div id="vi-mic-notif" style="position:fixed; bottom:48px; left:50%; transform:translateX(-50%); background:var(--brand-primary); color:white; padding:12px 32px; border-radius:100px; font-size:11px; font-weight:800; display:none; z-index:1000; letter-spacing:0.12em; box-shadow:0 8px 32px rgba(139,92,246,0.5);">TRANSMITTING VERBAL TELEMETRY...</div>
    
    <style>
      .vi-msg { padding: 16px 20px; border-radius: 16px; font-size: 14px; line-height: 1.6; max-width: 90%; animation: slideIn 0.3s ease-out; }
      @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .vi-msg-ai { background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); color: #fff; align-self: flex-start; border-radius: 4px 20px 20px 20px; }
      .vi-msg-user { background: var(--brand-primary); color: white; align-self: flex-end; border-radius: 20px 4px 20px 20px; box-shadow: 0 4px 12px rgba(139,92,246,0.2); }
      .listening { background: #EF4444 !important; animation: pulse 1.5s infinite; box-shadow: 0 0 30px rgba(239,68,68,0.5) !important; }
      @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }
      #vi-transcript-area::-webkit-scrollbar { width: 6px; }
      #vi-transcript-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
    </style>
    `;

    document.getElementById('vi-connect-btn').onclick = () => {
      document.getElementById('vi-did-overlay').style.display = 'none';
      startInterviewSession();
      initDID();
    };

    setupLocalWebcam();
    setupSTT();
  };

  // Logic remains exactly as original (Groq, D-ID, STT)
  const setupLocalWebcam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      document.getElementById('vi-webcam').srcObject = s;
    } catch (e) { console.error('Webcam failure'); }
  };

  const initDID = async () => {
    const v = document.getElementById('vi-did-video');
    try {
      const res = await fetch('https://api.d-id.com/talks/streams', {
        method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(DID_API_KEY), 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1000" })
      });
      const d = await res.json();
      const pc = new RTCPeerConnection({ iceServers: d.ice_servers });
      pc.ontrack = (e) => { if (e.track.kind === 'video') { v.srcObject = e.streams[0]; v.style.display = 'block'; state.isDIDConnected = true; } };
      await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await fetch(`https://api.d-id.com/talks/streams/${d.id}/sdp`, {
        method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(DID_API_KEY), 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer, session_id: d.session_id })
      });
      state.streamId = d.id; state.sessionId = d.session_id;
    } catch (e) { 
      document.getElementById('vi-mentor-box').style.background = `url('https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1000') center/cover`;
    }
  };

  const viSpeak = async (text) => {
    addMessageToUI('ai', text);
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''));
    synth.speak(utter);
    if (state.isDIDConnected) {
      await fetch(`https://api.d-id.com/talks/streams/${state.streamId}`, {
        method: 'POST', headers: { 'Authorization': 'Basic ' + btoa(DID_API_KEY), 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: { type: 'text', input: text, provider: { type: 'microsoft', voice_id: 'en-US-JennyNeural' } }, session_id: state.sessionId })
      });
    }
  };

  const setupSTT = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const r = new SpeechRecognition();
    r.continuous = true; r.interimResults = true;
    r.onstart = () => { 
      state.isListening = true; 
      document.getElementById('vi-mic-btn').classList.add('listening'); 
      document.getElementById('vi-mic-notif').style.display = 'block';
    };
    r.onresult = (e) => {
      let f = ""; for (let i = e.resultIndex; i < e.results.length; ++i) if (e.results[i].isFinal) f += e.results[i][0].transcript;
      state.transcript = f;
    };
    r.onend = () => {
      state.isListening = false; document.getElementById('vi-mic-btn').classList.remove('listening'); document.getElementById('vi-mic-notif').style.display = 'none';
      if (state.transcript.trim()) handleUserResponse(state.transcript);
    };
    document.getElementById('vi-mic-btn').onclick = () => state.isListening ? r.stop() : r.start();
  };

  const startInterviewSession = async () => {
    const res = await callAI(`Lead Recruiter Dr. Sarah at ${state.company}. Greet and ask 1st question for ${state.role}. JSON: {"text": "..."}`, true);
    viSpeak(res.text);
  };

  const handleUserResponse = async (ans) => {
    addMessageToUI('user', ans);
    const res = await callAI(`Candidate: "${ans}". Feedback & Next Question. JSON: {"feedback": "...", "nextQuestion": "..."}`, false);
    viSpeak(`${res.feedback}\n\n${res.nextQuestion}`);
  };

  const callAI = async (p, first) => {
    if (first) state.chatHistory = [{ role: 'system', content: p }];
    else state.chatHistory.push({ role: 'user', content: p });
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: state.chatHistory, response_format: { type: "json_object" } })
    });
    const d = await r.json();
    state.chatHistory.push({ role: 'assistant', content: d.choices[0].message.content });
    return JSON.parse(d.choices[0].message.content);
  };

  const addMessageToUI = (role, text) => {
    const c = document.getElementById('vi-transcript-area');
    const d = document.createElement('div');
    d.className = `vi-msg vi-msg-${role}`;
    d.innerHTML = text.replace(/\n/g, '<br>');
    c.appendChild(d); c.scrollTop = c.scrollHeight;
  };

  render();
}
