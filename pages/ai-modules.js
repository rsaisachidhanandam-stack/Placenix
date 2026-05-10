export async function loadAIPage(root, Store) {
  const modules = Object.values(Store.aiModules);
  root.innerHTML = `
<style>
.ai-modules-hero{background:linear-gradient(135deg,rgba(124,58,237,.15),rgba(34,211,238,.08));border:1px solid rgba(124,58,237,.2);border-radius:20px;padding:40px;text-align:center;margin-bottom:32px;position:relative;overflow:hidden;}
.ai-modules-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 60% 80% at 50% 50%,rgba(124,58,237,.1) 0%,transparent 70%);}
.ai-mods-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:32px;}
.ai-mod-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:20px;padding:28px;transition:all .3s;position:relative;overflow:hidden;}
.ai-mod-card:hover{border-color:var(--border-glow);transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 30px rgba(124,58,237,.15);}
.ai-mod-card::before{content:'';position:absolute;top:-40px;right:-40px;width:120px;height:120px;background:radial-gradient(circle,rgba(124,58,237,.08),transparent);border-radius:50%;}
.ai-mod-icon{font-size:2.5rem;margin-bottom:16px;}
.ai-mod-name{font-family:var(--font-display);font-size:1.1rem;font-weight:800;color:var(--text-primary);margin-bottom:8px;}
.ai-mod-desc{font-size:.875rem;color:var(--text-secondary);line-height:1.65;margin-bottom:20px;}
.ai-mod-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:20px;padding:12px;background:rgba(255,255,255,.02);border-radius:10px;}
.ai-metric{text-align:center;}
.ai-metric-val{font-size:.9rem;font-weight:800;font-family:var(--font-display);background:var(--gradient-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.ai-metric-key{font-size:.68rem;color:var(--text-muted);margin-top:2px;}
.ai-mock-demo{background:var(--bg-secondary);border:1px solid var(--border-subtle);border-radius:16px;padding:24px;margin-bottom:24px;}
.chat-bubble{padding:12px 16px;border-radius:12px;font-size:.875rem;max-width:80%;margin-bottom:8px;line-height:1.6;}
.chat-ai{background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.2);color:var(--text-primary);border-radius:4px 12px 12px 12px;}
.chat-user{background:var(--gradient-brand);color:#fff;margin-left:auto;border-radius:12px 4px 12px 12px;}
.typing-indicator{display:flex;gap:5px;padding:14px 16px;background:rgba(124,58,237,.08);border-radius:4px 12px 12px 12px;width:fit-content;}
.typing-dot{width:7px;height:7px;border-radius:50%;background:var(--brand-violet-light);animation:blink 1.2s ease infinite;}
.typing-dot:nth-child(2){animation-delay:.2s;}
.typing-dot:nth-child(3){animation-delay:.4s;}
@media(max-width:800px){.ai-mods-grid{grid-template-columns:1fr;}}
</style>
<div class="page-header">
  <h1 class="page-title">AI Modules</h1>
  <p class="page-subtitle">Next-generation AI tools for students, TPOs, and recruiters</p>
</div>

<!-- Hero -->
<div class="ai-modules-hero">
  <div style="position:relative;z-index:1;">
    <div style="font-size:3rem;margin-bottom:12px;">🤖</div>
    <h2 style="font-family:var(--font-display);font-size:1.75rem;font-weight:800;margin-bottom:12px;">Placenix AI Engine</h2>
    <p style="color:var(--text-secondary);max-width:560px;margin:0 auto 24px;font-size:.95rem;">Trained on 1M+ data points from real campus placements. Continuously learning from outcomes to get smarter every day.</p>
    <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
      ${[['🧠','1M+ Data Points'],['⚡','Real-time Insights'],['🎯','91% Prediction Accuracy'],['🔄','Daily Model Updates']].map(([ic,txt])=>`
        <div style="display:flex;align-items:center;gap:8px;font-size:.85rem;color:var(--text-secondary);">
          <span>${ic}</span><span>${txt}</span>
        </div>`).join('')}
    </div>
  </div>
</div>

<!-- Module Cards -->
<div class="ai-mods-grid">
  ${[
    { icon:'🎤', name:'AI Mock Interviewer', status:'Beta', desc:'Practice with an AI interviewer that adapts to your target company and role. Get real-time feedback on answers, communication, confidence, and body language (via webcam).', metrics:{Accuracy:'94%',Questions:'12,000+',Feedback:'Real-time'}, color:'rgba(124,58,237,.2)' },
    { icon:'📝', name:'AI Resume Builder', status:'Available', desc:'Generate ATS-optimized, role-specific resumes in minutes. AI trained on 50,000+ successful resumes analyzes JDs and tailors your profile automatically.', metrics:{'ATS Boost':'+34%',Templates:'120+',Time:'5 min'}, color:'rgba(34,211,238,.2)' },
    { icon:'🧭', name:'AI Career Advisor', status:'Available', desc:'Personalized career path recommendations based on your skills, aptitude scores, market demand trends, and historical placement data from your institution.', metrics:{Accuracy:'89%',Paths:'240+',Industries:'18'}, color:'rgba(16,185,129,.2)' },
    { icon:'🔮', name:'AI Placement Predictor', status:'Available', desc:'ML-powered probability engine that predicts your placement chance for specific companies based on your full profile, skill gaps, and real outcome data.', metrics:{Accuracy:'91%','Data Points':'1M+',Updated:'Daily'}, color:'rgba(245,158,11,.2)' },
  ].map(m => `
    <div class="ai-mod-card animate-fade-in-up">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
        <div class="ai-mod-icon">${m.icon}</div>
        <span class="badge ${m.status==='Beta'?'badge-warning':'badge-success'}">${m.status}</span>
      </div>
      <div class="ai-mod-name">${m.name}</div>
      <p class="ai-mod-desc">${m.desc}</p>
      <div class="ai-mod-metrics">
        ${Object.entries(m.metrics).map(([k,v])=>`<div class="ai-metric"><div class="ai-metric-val">${v}</div><div class="ai-metric-key">${k}</div></div>`).join('')}
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="launchModule('${m.name}')">
        ${m.name==='AI Mock Interviewer'?'Launch Virtual Room →':(m.status==='Beta'?'Join Beta →':'Launch Module →')}
      </button>
    </div>`).join('')}
</div>

<!-- AI Mock Demo -->
<div class="card">
  <div class="card-header">
    <div><div class="card-title">🎤 AI Mock Interviewer — Live Demo</div><div class="card-subtitle">Google · Software Engineer · DSA Round</div></div>
    <span class="badge badge-warning badge-dot">Beta</span>
  </div>
  <div class="ai-mock-demo">
    <div style="display:flex;flex-direction:column;gap:8px;max-height:350px;overflow-y:auto;padding-right:8px;" id="chat-window">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:1.2rem;">🤖</span><span style="font-size:.8rem;font-weight:600;color:var(--brand-violet-light);">Placenix AI Interviewer</span></div>
      <div class="chat-bubble chat-ai" id="initial-ai-bubble">Welcome! I'll be your interviewer today. Let's start with your background...</div>
      <div class="typing-indicator" id="typing-indicator" style="display:none;"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;align-items:center;">
      <button class="btn btn-secondary" id="voice-btn" onclick="startVoiceInput()" style="padding:10px 14px; border-radius:10px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-subtle); cursor:pointer;" title="Speak your answer">🎤</button>
      <input class="compose-input" type="text" placeholder="Type or speak your answer…" id="mock-input" style="flex:1;padding:10px 16px;background:var(--bg-input);border:1px solid var(--border-input);border-radius:10px;color:var(--text-primary);font-size:.875rem;outline:none;">
      <button class="btn btn-primary" onclick="sendMockAnswer()">Send →</button>
    </div>
  </div>
</div>`;

// --- State for AI Mock Interview ---
  const GEMINI_API_KEY = 'AIzaSyDyMVkAkoAcCPqZDRl4iMfQxCvdPKJ0DvE';
  const targetRole = Store.studentProfile?.targetRole || 'Software Engineer';
  const targetCompany = Store.studentProfile?.targetCompany || 'Google';
  
  // 1. Resume Context Integration
  const resumeKeywords = Store.session?.user?.resume_analysis?.found_keywords || [];
  const skillsContext = resumeKeywords.length > 0 
      ? `The candidate's resume includes these skills: ${resumeKeywords.join(', ')}.`
      : `The candidate is applying for ${targetRole}.`;
      
  const initialAIText = `Welcome! I'll be your interviewer today for the ${targetRole} role at ${targetCompany}.\n\nBased on your resume, I see you have experience with **${resumeKeywords.length ? resumeKeywords[0] : 'software development'}**. Let's start there. Can you describe a challenging technical problem you solved using that technology?`;

  let chatHistory = [
    { 
      role: "user", 
      parts: [{ text: `System Instruction: You are a strict but fair technical interviewer at ${targetCompany}. You are conducting a mock technical interview with a student for a ${targetRole} role. ${skillsContext} Please strictly tailor your technical questions to evaluate their proficiency in these specific skills and projects. Keep your responses VERY concise (max 2-3 sentences). Evaluate their answer, give brief feedback, and immediately ask the NEXT technical question. Do not wait for them to ask for the next question. Do not break character.` }] 
    },
    { 
      role: "model", 
      parts: [{ text: initialAIText }] 
    }
  ];

  // Set the initial bubble dynamically
  setTimeout(() => {
      const bubble = document.getElementById('initial-ai-bubble');
      if (bubble) bubble.innerHTML = initialAIText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  }, 50);

  window.launchModule = (name) => {
    if (name === 'AI Resume Builder') {
      window.location.hash = '#resume';
    } else if (name === 'AI Career Advisor') {
      window.location.hash = '#employability';
    } else if (name === 'AI Mock Interviewer') {
      window.location.hash = '#virtual-interview';
    } else {
      alert(`🚀 Launching ${name}…\n\nThis feature is currently in early access beta. Check back soon!`);
    }
  };

  // 2. Voice Input (Speech-to-Text)
  window.startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Sorry, your browser doesn't support speech recognition. Try Google Chrome.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    const btn = document.getElementById('voice-btn');
    const input = document.getElementById('mock-input');
    
    recognition.onstart = () => {
      btn.style.background = 'var(--danger)'; // Red recording
      btn.style.borderColor = 'var(--danger)';
      input.placeholder = "Listening... Speak now";
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      input.value += (input.value ? ' ' : '') + transcript;
    };
    
    recognition.onerror = (e) => {
      console.error("Speech error", e);
      input.placeholder = "Failed to hear. Try again.";
    };

    recognition.onend = () => {
      btn.style.background = 'rgba(255,255,255,0.05)'; // Reset
      btn.style.borderColor = 'var(--border-subtle)';
      input.placeholder = "Type or speak your answer…";
    };
    
    recognition.start();
  };

  // 3. Voice Output (Text-to-Speech)
  const speakAIResponse = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop current speech
    
    // Clean text (remove markdown asterisks for clean speech)
    const cleanText = text.replace(/\*\*/g, '').replace(/<[^>]*>?/gm, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05; // Slightly faster, more natural speed
    utterance.pitch = 1.0;
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const goodVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || voices[0];
    if (goodVoice) utterance.voice = goodVoice;
    
    window.speechSynthesis.speak(utterance);
  };

  window.sendMockAnswer = async () => {
    const input = document.getElementById('mock-input');
    const ans = input.value.trim();
    if (!ans) return;
    
    const chat = document.getElementById('chat-window');
    const typingIndicator = document.getElementById('typing-indicator');
    
    // Add User Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble chat-user';
    userBubble.textContent = ans;
    chat.insertBefore(userBubble, typingIndicator);
    
    input.value = '';
    
    // Update History
    chatHistory.push({ role: "user", parts: [{ text: ans }] });
    
    // Show Typing Indicator
    typingIndicator.style.display = 'flex';
    chat.scrollTop = chat.scrollHeight; // Scroll to bottom
    
    try {
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: chatHistory })
      });
      
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      const aiResponseText = data.candidates[0].content.parts[0].text;
      
      // Update History
      chatHistory.push({ role: "model", parts: [{ text: aiResponseText }] });
      
      // Hide typing
      typingIndicator.style.display = 'none';
      
      // Add AI Bubble
      const aiBubble = document.createElement('div');
      aiBubble.className = 'chat-bubble chat-ai';
      aiBubble.innerHTML = aiResponseText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
      chat.insertBefore(aiBubble, typingIndicator);
      
      // Speak the response!
      speakAIResponse(aiResponseText);
      
      // Scroll to bottom
      chat.scrollTop = chat.scrollHeight;

    } catch (error) {
      console.error(error);
      typingIndicator.style.display = 'none';
      const errBubble = document.createElement('div');
      errBubble.className = 'chat-bubble chat-ai';
      errBubble.style.color = '#ef4444';
      errBubble.textContent = "Oops! My connection dropped. Could you repeat that?";
      chat.insertBefore(errBubble, typingIndicator);
      chatHistory.pop(); // Remove the user message from history so they can retry
    }
  };

  // Ensure voices are loaded for TTS
  if (window.speechSynthesis) window.speechSynthesis.getVoices();

  // Setup 'Enter' key to send message
  setTimeout(() => {
    document.getElementById('mock-input')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMockAnswer();
    });
  }, 100);
}
