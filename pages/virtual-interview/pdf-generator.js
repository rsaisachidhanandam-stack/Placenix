// ============================================================
// PLACENIX — VIRTUAL INTERVIEW SIMULATION PDF REPORT GENERATOR
// ============================================================

export async function downloadReportPDF(state, scores, cleared, grade, requiredGrade, cutoff, btn) {
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
}
