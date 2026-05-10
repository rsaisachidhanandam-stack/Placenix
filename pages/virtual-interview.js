import { supabase } from '../supabase.js';

export async function loadVirtualInterviewPage(root, Store) {
  const GEMINI_API_KEY = 'AIzaSyDyMVkAkoAcCPqZDRl4iMfQxCvdPKJ0DvE';
  const interviewerVidUrl = 'https://assets.mixkit.co/videos/preview/mixkit-business-woman-in-a-video-call-with-a-laptop-40113-large.mp4';
  const interviewerImg = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=1000';
  
  let state = {
    step: 'setup',
    role: 'Software Engineer',
    company: 'Google',
    difficulty: 'Intermediate',
    chatHistory: [],
    metrics: { correctness: 0, confidence: 70, fluency: 80 },
    isListening: false,
    transcript: '',
    timer: 0,
    interval: null
  };

  const render = () => {
    if (state.step === 'setup') renderSetup();
    else if (state.step === 'room') renderRoom();
    else if (state.step === 'feedback') renderFeedback();
  };

  const renderSetup = () => {
    root.innerHTML = `
    <style>
      .setup-container { max-width: 800px; margin: 40px auto; animation: slideUp 0.5s ease; }
      .setup-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 24px; padding: 40px; box-shadow: var(--shadow-lg); }
      .setup-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 32px; }
      .field-group { display: flex; flex-direction: column; gap: 8px; }
      .setup-input { background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 12px 16px; color: var(--text-primary); outline: none; }
      .difficulty-pill { padding: 8px 16px; border-radius: 99px; border: 1px solid var(--border-subtle); cursor: pointer; font-size: 0.85rem; background: rgba(255,255,255,0.02); }
      .difficulty-pill.active { background: var(--gradient-brand); color: white; border-color: transparent; }
      @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
    <div class="setup-container">
      <div class="setup-card">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 2rem; font-weight: 800;">Virtual Interview Setup</h1>
          <p style="color: var(--text-secondary);">Configure your AI-powered mock interview</p>
        </div>
        <div class="setup-grid">
          <div class="field-group">
            <label style="font-size:0.8rem; color:var(--text-muted);">Target Role</label>
            <select class="setup-input" id="setup-role">
              <option>Software Engineer</option>
              <option>Frontend Developer</option>
              <option>Data Analyst</option>
            </select>
          </div>
          <div class="field-group">
            <label style="font-size:0.8rem; color:var(--text-muted);">Target Company</label>
            <input type="text" class="setup-input" id="setup-company" value="Google">
          </div>
        </div>
        <button class="btn btn-primary" id="start-interview-btn" style="width: 100%; margin-top: 32px; justify-content: center; height: 56px; border-radius: 16px;">
          Enter Interview Room →
        </button>
      </div>
    </div>`;

    document.getElementById('start-interview-btn').onclick = () => {
      state.role = document.getElementById('setup-role').value;
      state.company = document.getElementById('setup-company').value;
      state.step = 'room';
      render();
    };
  };

  const renderRoom = () => {
    root.innerHTML = `
    <style>
      .room-layout { display: grid; grid-template-columns: 1fr 380px; gap: 24px; height: calc(100vh - 160px); }
      .video-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .video-box { background: #000; border-radius: 24px; position: relative; overflow: hidden; border: 2px solid var(--border-subtle); aspect-ratio: 4/3; }
      .interviewer-vid { width: 100%; height: 100%; object-fit: cover; }
      .student-vid { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
      .live-badge { position: absolute; top: 16px; right: 16px; background: #ef4444; color: white; padding: 4px 10px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; z-index: 10; animation: blink 2s infinite; }
      @keyframes blink { 50% { opacity: 0.6; } }
      .sidebar-panel { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 24px; display: flex; flex-direction: column; overflow: hidden; }
      .transcript-area { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px; }
      .chat-msg { font-size: 0.85rem; padding: 12px 16px; border-radius: 16px; max-width: 90%; }
      .msg-ai { background: rgba(124,58,237,0.08); align-self: flex-start; }
      .msg-user { background: var(--gradient-brand); color: white; align-self: flex-end; }
      .btn-mic { width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); cursor: pointer; font-size: 1.5rem; transition: 0.3s; }
      .btn-mic.listening { background: #ef4444; animation: pulse 1.5s infinite; }
      @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); } }
      .speech-bubble-preview { position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: white; padding: 12px 24px; border-radius: 12px; z-index: 100; display: none; }
    </style>

    <div class="room-layout">
      <div class="speech-bubble-preview" id="speech-preview"></div>
      <div class="video-grid">
        <div class="video-box">
          <div class="live-badge">● LIVE</div>
          <video src="${interviewerVidUrl}" class="interviewer-vid" autoplay muted loop playsinline 
                 referrerpolicy="no-referrer" crossorigin="anonymous" 
                 onerror="this.style.display='none'; document.getElementById('ai-fallback').style.display='block';"></video>
          <img id="ai-fallback" src="${interviewerImg}" class="interviewer-vid" style="display:none;">
          <div id="ai-talking-indicator" style="position:absolute; top:50px; right:20px; display:none; color:white;">Talking...</div>
        </div>
        <div class="video-box">
          <video id="webcam" class="student-vid" autoplay playsinline muted></video>
        </div>
      </div>
      <div class="sidebar-panel">
        <div style="padding: 20px; border-bottom: 1px solid var(--border-subtle); font-weight: 700;">Live Transcript</div>
        <div class="transcript-area" id="transcript"></div>
        <div style="padding: 20px; background: rgba(255,255,255,0.02);">
          <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:8px;">CORRECTNESS</div>
          <div style="height:6px; background:#222; border-radius:3px;"><div id="fill-correct" style="width:0%; height:100%; background:var(--brand-electric-violet); border-radius:3px; transition:0.5s;"></div></div>
        </div>
      </div>
    </div>

    <div style="margin-top:24px; display:flex; justify-content:center; gap:20px; align-items:center;">
       <button class="btn-mic" id="mic-btn">🎤</button>
       <div id="status-text" style="font-weight:600;">Click to talk</div>
       <button class="btn btn-secondary" onclick="window.location.hash='#ai-modules'">End Session</button>
    </div>
    `;

    setupWebcam();
    setupInterviewLogic();
  };

  const setupWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      document.getElementById('webcam').srcObject = stream;
    } catch (e) { console.warn(e); }
  };

  const setupInterviewLogic = () => {
    const micBtn = document.getElementById('mic-btn');
    const statusText = document.getElementById('status-text');
    const speechPreview = document.getElementById('speech-preview');

    sendInitialGreeting();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        state.isListening = true;
        state.transcript = "";
        micBtn.classList.add('listening');
        statusText.textContent = "Listening...";
        speechPreview.style.display = "block";
      };

      recognition.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) state.transcript += e.results[i][0].transcript + " ";
          else interim += e.results[i][0].transcript;
        }
        speechPreview.textContent = state.transcript + interim;
      };

      micBtn.onclick = () => {
        if (!state.isListening) recognition.start();
        else {
          state.isListening = false;
          recognition.stop();
          micBtn.classList.remove('listening');
          speechPreview.style.display = "none";
          if (state.transcript.trim()) {
             addMessage('user', state.transcript);
             processUserAnswer(state.transcript);
          }
        }
      };
    }
  };

  const sendInitialGreeting = async () => {
    const prompt = `System: You are Dr. Sarah, a Lead Technical Interviewer at ${state.company}. Start the ${state.role} interview. Greet them and ask the first question. Respond ONLY with a JSON object: {"text": "...", "metrics": {"correctness": 0}}`;
    const res = await callGemini(prompt, true);
    addMessage('ai', res.text);
    speak(res.text);
  };

  const processUserAnswer = async (answer) => {
    const statusText = document.getElementById('status-text');
    if (statusText) statusText.textContent = "AI Thinking...";
    
    const prompt = `System: Analyze the candidate's answer. Provide feedback then ask the next technical question. Respond ONLY with a JSON object: {"feedback": "...", "nextQuestion": "...", "metrics": {"correctness": 80}}`;
    const res = await callGemini(prompt);
    
    const aiText = `${res.feedback}\n\n${res.nextQuestion}`;
    addMessage('ai', aiText);
    speak(aiText);
    
    if (document.getElementById('fill-correct')) {
       document.getElementById('fill-correct').style.width = `${res.metrics.correctness || 0}%`;
    }
    if (statusText) statusText.textContent = "Click to talk";
  };

  const callGemini = async (prompt, isFirst) => {
    if (isFirst) state.chatHistory = [{ role: 'user', parts: [{ text: prompt }] }];
    else state.chatHistory.push({ role: 'user', parts: [{ text: prompt }] });

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: state.chatHistory, 
          generationConfig: { response_mime_type: "application/json" } 
        })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      
      const text = data.candidates[0].content.parts[0].text;
      const json = JSON.parse(text);
      state.chatHistory.push({ role: 'model', parts: [{ text: text }] });
      return json;
    } catch (e) {
      console.error("Gemini Error:", e);
      return { 
        text: "I apologize, there was a connection issue with my neural link. Could you please repeat that?", 
        feedback: "Technical connection reset.", 
        nextQuestion: `Let's try again. Can you tell me about your experience with ${state.role}?`, 
        metrics: { correctness: 0 } 
      };
    }
  };

  const addMessage = (role, text) => {
    const div = document.createElement('div');
    div.className = `chat-msg msg-${role}`;
    div.textContent = text;
    document.getElementById('transcript').appendChild(div);
  };

  const speak = (text) => {
    const utter = new SpeechSynthesisUtterance(text);
    const indicator = document.getElementById('ai-talking-indicator');
    utter.onstart = () => indicator.style.display = 'block';
    utter.onend = () => indicator.style.display = 'none';
    window.speechSynthesis.speak(utter);
  };

  render();
}
