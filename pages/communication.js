// ============================================================
// PLACENIX — INSTITUTIONAL COMMUNICATION & BROADCAST HUB (v3.0)
// ============================================================

import { showToast } from '../components/toast.js';
import { saveStore } from '../store.js';

function formatRelativeTime(ts) {
  if (!ts) return 'Recently';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch(e) {
    return 'Recently';
  }
}

export async function loadCommPage(root, Store, supabase) {
  const route = window.location.hash.replace('#', '').replace('/', '').split('?')[0].toLowerCase();
  const user = Store.session?.user || {};
  const studentName = user.full_name || user.name || 'srithikan s';
  const isStudent = Store.session?.role === 'student';
  let activeChannel = 'all'; // 'all' | 'drive' | 'reminder' | 'ai' | 'result'

  const markAllAsRead = () => {
    if (Store.notifications && Array.isArray(Store.notifications)) {
      Store.notifications.forEach(n => n.read = true);
      saveStore();
      showToast('All notifications marked as read.', 'success');
      render();
    }
  };

  const render = () => {
    if (route === 'queries') {
      const myQueries = (Store.queries || []).filter(q => {
        const cleanQ = (q.studentName || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        const cleanS = studentName.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
        return cleanQ && cleanS && (cleanQ.includes(cleanS) || cleanS.includes(cleanQ));
      });

      const totalCount = myQueries.length;
      const resolvedCount = myQueries.filter(q => q.status === 'Resolved' || q.status === 'AI Resolved').length;
      const pendingCount = totalCount - resolvedCount;

      window.handlePostQuery = (e) => {
        e.preventDefault();
        const category = document.getElementById('query-category')?.value || 'General';
        const priority = document.getElementById('query-priority')?.value || 'Normal';
        const title = document.getElementById('query-title')?.value?.trim();
        const body = document.getElementById('query-body')?.value?.trim();

        if (!title || !body) {
          showToast('Title and Description are required fields.', 'warning');
          return;
        }

        // Generate context-aware AI Diagnostic Response
        let aiDiagnosis = '';
        const lowerText = `${category} ${title} ${body}`.toLowerCase();

        if (lowerText.includes('cgpa') || lowerText.includes('marksheet') || lowerText.includes('arrear') || lowerText.includes('academic')) {
          aiDiagnosis = `🤖 AI Diagnostic Analysis: Your active profile CGPA is currently indexed in the academic registry. If you have recently cleared arrears or received your updated semester marksheet, upload the official PDF in the Academic Profile Verification Vault so your Faculty Advisor can approve the new aggregate score.`;
        } else if (lowerText.includes('ineligible') || lowerText.includes('criteria') || lowerText.includes('cutoff') || lowerText.includes('branch')) {
          aiDiagnosis = `🤖 AI Diagnostic Analysis: Drive eligibility is evaluated by matching your registered Department and Minimum CGPA cutoff. Check the 'Details & Syllabus' modal on Opportunity Hub to confirm if your branch is listed under eligible cohorts. If your profile was updated after the drive was published, notify the TPO coordinator.`;
        } else if (lowerText.includes('slot') || lowerText.includes('venue') || lowerText.includes('clash') || lowerText.includes('time') || lowerText.includes('interview')) {
          aiDiagnosis = `🤖 AI Diagnostic Analysis: In the event of overlapping campus interview schedules or venue clashes, your Department Placement Coordinator can re-assign your batch to an alternate slot in Seminar Hall B or Slot 2. Your request has been flagged with high priority.`;
        } else if (lowerText.includes('resume') || lowerText.includes('ats') || lowerText.includes('score')) {
          aiDiagnosis = `🤖 AI Diagnostic Analysis: You can re-scan and evaluate your resume against multiple targeted role descriptions in the Resume Intelligence tool (#resume) without losing your historical score timeline.`;
        } else {
          aiDiagnosis = `🤖 AI Diagnostic Analysis: Your inquiry has been logged in the Placement Coordination registry. A faculty coordinator or TPO officer will provide an official directive within 2-4 hours.`;
        }

        const newQuery = {
          id: 'q_' + Date.now(),
          studentName: studentName,
          rollNo: user.roll_number || user.register_number || '99220041005',
          category: category,
          priority: priority,
          title: title,
          body: body,
          date: new Date().toISOString().split('T')[0],
          status: 'AI Assisted',
          response: aiDiagnosis,
          humanEscalated: priority === 'Urgent'
        };

        if (!Store.queries) Store.queries = [];
        Store.queries.unshift(newQuery);
        saveStore();
        showToast('Query submitted! Instant AI preliminary diagnosis ready.', 'success');
        render();
      };

      window.markQueryResolved = (id) => {
        const q = (Store.queries || []).find(item => item.id === id);
        if (q) {
          q.status = 'Resolved';
          saveStore();
          showToast('Ticket marked as resolved!', 'success');
          render();
        }
      };

      window.escalateQueryToTpo = (id) => {
        const q = (Store.queries || []).find(item => item.id === id);
        if (q) {
          q.humanEscalated = true;
          q.status = 'Pending TPO';
          saveStore();
          showToast('Ticket escalated directly to TPO Placement Cell queue!', 'info');
          render();
        }
      };

      window.deleteQueryTicket = (id) => {
        Store.queries = (Store.queries || []).filter(item => item.id !== id);
        saveStore();
        showToast('Ticket removed from registry.', 'info');
        render();
      };

      root.innerHTML = `
      <div style="padding: 32px 40px; max-width: 1440px; margin: 0 auto; display:flex; flex-direction:column; gap:28px;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; font-size:10px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px;">
              <span>Placenix</span>
              <span style="opacity:0.3;">/</span>
              <span style="color:var(--brand-primary);">Support Desk</span>
            </div>
            <h1 class="h1-ent" style="font-size:26px;">Smart Placement Support & Query Center</h1>
            <p style="color:var(--text-description); font-size:13.5px; margin-top:4px;">
              Get instant AI first-response diagnostics for drive criteria, slot clashes, or submit escalated tickets to Placement Coordinators.
            </p>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn-premium-ghost" onclick="window.location.hash='#communication'" style="padding:8px 18px; font-size:12px; font-weight:700; border-radius:8px;">
              ← Back to Broadcasts
            </button>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:16px;">
          <div class="card-ent" style="padding:16px 20px; border:1px solid var(--glass-border-main); background:var(--glass-2); border-radius:12px;">
            <div style="font-size:10px; color:var(--text-muted); font-weight:700; text-transform:uppercase;">TOTAL TICKETS</div>
            <div style="font-size:22px; font-weight:800; color:#fff; margin-top:4px; font-family:var(--font-display);">${totalCount}</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:2px;">Logged by you</div>
          </div>
          <div class="card-ent" style="padding:16px 20px; border:1px solid var(--glass-border-main); background:var(--glass-2); border-radius:12px;">
            <div style="font-size:10px; color:var(--brand-secondary); font-weight:700; text-transform:uppercase;">RESOLVED TICKETS</div>
            <div style="font-size:22px; font-weight:800; color:var(--brand-secondary); margin-top:4px; font-family:var(--font-display);">${resolvedCount}</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:2px;">Closed & Satisfied</div>
          </div>
          <div class="card-ent" style="padding:16px 20px; border:1px solid var(--glass-border-main); background:var(--glass-2); border-radius:12px;">
            <div style="font-size:10px; color:#f59e0b; font-weight:700; text-transform:uppercase;">PENDING RESOLUTIONS</div>
            <div style="font-size:22px; font-weight:800; color:#f59e0b; margin-top:4px; font-family:var(--font-display);">${pendingCount}</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:2px;">Active in queue</div>
          </div>
          <div class="card-ent" style="padding:16px 20px; border:1px solid var(--glass-border-main); background:var(--glass-2); border-radius:12px;">
            <div style="font-size:10px; color:var(--brand-primary); font-weight:700; text-transform:uppercase;">AI FIRST-RESPONSE</div>
            <div style="font-size:22px; font-weight:800; color:var(--brand-primary); margin-top:4px; font-family:var(--font-display);">Instant (⚡ 3s)</div>
            <div style="font-size:11px; color:var(--text-description); margin-top:2px;">Automated diagnostics</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1.6fr; gap:24px;">
          
          <!-- Left Column: Submit Ticket + FAQ Panel -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            
            <!-- Submit Ticket Form -->
            <div class="card-ent" style="padding:28px; border: 1px solid var(--glass-border-main); background: var(--glass-2); border-radius:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <div>
                  <h3 style="font-size:17px; font-weight:800; color:#fff; font-family:var(--font-display); margin:0;">Submit Support Ticket</h3>
                  <div style="font-size:11.5px; color:var(--text-description); margin-top:2px;">Direct AI preliminary diagnosis + Faculty / TPO escalation</div>
                </div>
                <span style="font-size:10px; font-weight:800; background:rgba(99,102,241,0.12); color:var(--brand-primary); padding:3px 10px; border-radius:100px; border:1px solid rgba(99,102,241,0.25);">
                  🤖 AI Enabled
                </span>
              </div>
              
              <form id="query-submit-form" onsubmit="window.handlePostQuery(event)" style="display:flex; flex-direction:column; gap:14px;">
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                  <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:5px;">CATEGORY</label>
                    <select id="query-category" class="input-ent" style="width:100%; font-size:12px; padding:9px 12px; background:rgba(0,0,0,0.3); color:#fff;">
                      <option value="🎯 Drive Eligibility">🎯 Drive Eligibility</option>
                      <option value="📊 Academic CGPA / Marksheet">📊 Academic CGPA / Marksheet</option>
                      <option value="🕒 Slot & Venue Conflict">🕒 Slot & Venue Conflict</option>
                      <option value="📄 Resume & Vault Documents">📄 Resume & Vault Documents</option>
                      <option value="💡 General Placement Guidance">💡 General Placement Guidance</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block; font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:5px;">URGENCY PRIORITY</label>
                    <select id="query-priority" class="input-ent" style="width:100%; font-size:12px; padding:9px 12px; background:rgba(0,0,0,0.3); color:#fff;">
                      <option value="Normal">🟡 Normal (Standard Inquiry)</option>
                      <option value="Urgent">🔴 Urgent (Drive Closes Today)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style="display:block; font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:5px;">QUERY TOPIC / TITLE</label>
                  <input type="text" id="query-title" required placeholder="e.g. Ineligible badge showing on Amazon SDE drive" class="input-ent" style="width:100%; font-size:12.5px; padding:10px 14px;">
                </div>

                <div>
                  <label style="display:block; font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:5px;">DETAILED DESCRIPTION</label>
                  <textarea id="query-body" required placeholder="Describe your query in detail (drive name, error message, or requested update)..." rows="4" class="input-ent" style="width:100%; font-size:12.5px; padding:10px 14px; resize:vertical;"></textarea>
                </div>

                <button type="submit" class="btn-premium" style="height:42px; font-size:12px; font-weight:800; border-radius:8px; cursor:pointer; margin-top:4px;">
                  ⚡ Transmit Ticket & Get Instant AI Diagnostic →
                </button>
              </form>
            </div>

            <!-- Instant Placement FAQs Accordion -->
            <div class="card-ent" style="padding:24px; border: 1px solid var(--glass-border-main); background: var(--glass-2); border-radius:14px;">
              <div style="font-weight:800; color:#fff; font-size:14px; font-family:var(--font-display); margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                <span>📚 Instant-Answers Placement FAQ</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:8px;">
                
                <details style="background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-subtle); border-radius:8px; padding:10px 14px; cursor:pointer;">
                  <summary style="font-size:12px; font-weight:700; color:#fff; outline:none;">Why does a drive mark me "Ineligible" even if my CGPA is high?</summary>
                  <p style="font-size:11.5px; color:var(--text-description); margin:8px 0 0 0; line-height:1.5;">
                    Companies frequently restrict drives to specific departments (e.g. CSE/IT only). Click <strong>"ℹ️ Details & Syllabus"</strong> on the Opportunity Card to check if your department is permitted.
                  </p>
                </details>

                <details style="background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-subtle); border-radius:8px; padding:10px 14px; cursor:pointer;">
                  <summary style="font-size:12px; font-weight:700; color:#fff; outline:none;">How do I get my marksheet verified in the Vault?</summary>
                  <p style="font-size:11.5px; color:var(--text-description); margin:8px 0 0 0; line-height:1.5;">
                    Go to <strong>Academic Profile (#profile)</strong>, navigate to the <em>Verification Vault</em> tab, and upload your official grade sheet. Your Faculty Advisor will review and approve it.
                  </p>
                </details>

                <details style="background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-subtle); border-radius:8px; padding:10px 14px; cursor:pointer;">
                  <summary style="font-size:12px; font-weight:700; color:#fff; outline:none;">What should I do if two interview slots clash on the same day?</summary>
                  <p style="font-size:11.5px; color:var(--text-description); margin:8px 0 0 0; line-height:1.5;">
                    Submit an <strong>Urgent</strong> ticket under <em>"Slot & Venue Conflict"</em>. The Placement Cell will adjust your batch to a different morning or afternoon interval.
                  </p>
                </details>

                <details style="background:rgba(0,0,0,0.25); border:1px solid var(--glass-border-subtle); border-radius:8px; padding:10px 14px; cursor:pointer;">
                  <summary style="font-size:12px; font-weight:700; color:#fff; outline:none;">Can I apply to multiple Dream & Super Dream drives at once?</summary>
                  <p style="font-size:11.5px; color:var(--text-description); margin:8px 0 0 0; line-height:1.5;">
                    Yes! Under institutional policy, students can apply to multiple concurrent drives until an official offer letter is accepted.
                  </p>
                </details>

              </div>
            </div>

          </div>

          <!-- Right Column: Ticket Registry & AI Solutions -->
          <div class="card-ent" style="padding:28px; border: 1px solid var(--glass-border-main); background: var(--glass-2); border-radius:14px; min-height:540px; display:flex; flex-direction:column; gap:16px;">
            <div style="border-bottom:1px solid var(--glass-border-subtle); padding-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h3 style="font-size:17px; font-weight:800; color:#fff; font-family:var(--font-display); margin:0;">Your Ticket Registry & Resolutions</h3>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Track AI preliminary diagnostics and official Coordinator responses</div>
              </div>
              <span style="background:var(--brand-primary-light); color:var(--brand-primary); border:1px solid rgba(129,140,248,0.2); padding:4px 10px; border-radius:100px; font-size:10px; font-weight:800;">
                ${myQueries.length} Total Tickets
              </span>
            </div>

            <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:14px; max-height:640px;">
              ${myQueries.length === 0 ? `
                <div style="text-align:center; padding:80px 16px; color:var(--text-muted); display:flex; flex-direction:column; align-items:center; gap:10px;">
                  <div style="font-size:36px;">🎟️</div>
                  <div style="font-weight:700; color:#fff; font-size:15px;">No support tickets submitted yet</div>
                  <p style="font-size:12px; max-width:340px; line-height:1.5; color:var(--text-description);">
                    Have an issue with drive criteria, CGPA verification, or slot allocation? Submit a ticket on the left to receive an instant AI diagnosis.
                  </p>
                </div>
              ` : myQueries.map(q => {
                const isResolved = q.status === 'Resolved' || q.status === 'AI Resolved';
                const isUrgent = q.priority === 'Urgent';

                return `
                  <div style="background:rgba(0,0,0,0.25); border:1px solid ${isResolved ? 'rgba(52,211,153,0.3)' : isUrgent ? 'rgba(239,68,68,0.3)' : 'var(--glass-border-subtle)'}; border-radius:12px; padding:18px; display:flex; flex-direction:column; gap:12px;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                      <div>
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                          <span style="font-size:9.5px; font-weight:800; background:rgba(255,255,255,0.05); color:var(--text-muted); padding:2px 8px; border-radius:4px; border:1px solid var(--glass-border-subtle);">
                            ${q.category || 'General'}
                          </span>
                          ${isUrgent ? '<span style="font-size:9.5px; font-weight:800; background:rgba(239,68,68,0.15); color:#ef4444; padding:2px 8px; border-radius:4px; border:1px solid rgba(239,68,68,0.3);">🔴 URGENT</span>' : ''}
                        </div>
                        <div style="font-weight:800; color:#fff; font-size:14px; font-family:var(--font-display);">${q.title}</div>
                        <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">Submitted on ${q.date} • Roll No: ${q.rollNo}</div>
                      </div>

                      <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:9.5px; padding:3px 9px; border-radius:6px; font-weight:800; 
                                     background:${isResolved ? 'rgba(52,211,153,0.15)' : 'rgba(245,158,11,0.15)'}; 
                                     color:${isResolved ? 'var(--brand-secondary)' : '#f59e0b'}; 
                                     border:1px solid ${isResolved ? 'rgba(52,211,153,0.3)' : 'rgba(245,158,11,0.3)'};">
                          ${q.status.toUpperCase()}
                        </span>
                        <button onclick="window.deleteQueryTicket('${q.id}')" title="Delete Ticket" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:13px;">🗑️</button>
                      </div>
                    </div>

                    <p style="font-size:12px; color:var(--text-description); line-height:1.5; margin:0;">${q.body}</p>
                    
                    ${q.response ? `
                      <div style="background:rgba(99,102,241,0.08); border:1px solid rgba(99,102,241,0.25); border-radius:10px; padding:12px 14px;">
                        <div style="font-size:10px; font-weight:800; color:var(--brand-primary); margin-bottom:4px; letter-spacing:0.04em; display:flex; justify-content:space-between; align-items:center;">
                          <span>DIAGNOSTIC RESOLUTION DIRECTIVE:</span>
                          <span style="opacity:0.7;">⚡ Automated</span>
                        </div>
                        <p style="font-size:11.5px; color:#fff; line-height:1.5; margin:0;">${q.response}</p>
                      </div>
                    ` : ''}

                    <!-- Action Controls for Student -->
                    <div style="display:flex; justify-content:space-between; align-items:center; padding-top:10px; border-top:1px solid var(--glass-border-subtle); flex-wrap:wrap; gap:8px;">
                      <div style="font-size:10.5px; color:var(--text-muted);">
                        ${isResolved ? '✓ Ticket closed & marked resolved.' : q.humanEscalated ? '📩 Assigned to Human Placement Officer queue.' : '🤖 AI Assisted • Awaiting confirmation'}
                      </div>
                      <div style="display:flex; gap:8px;">
                        ${!isResolved ? `
                          <button class="btn-premium-ghost" onclick="window.escalateQueryToTpo('${q.id}')" style="padding:5px 12px; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">
                            📩 Escalate to TPO
                          </button>
                          <button class="btn-premium" onclick="window.markQueryResolved('${q.id}')" style="padding:5px 14px; font-size:11px; font-weight:700; border-radius:6px; cursor:pointer;">
                            ✓ Mark as Resolved
                          </button>
                        ` : `
                          <span style="font-size:11px; color:var(--brand-secondary); font-weight:700;">✓ Resolved</span>
                        `}
                      </div>
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
      `;
    } else {
      // ────────────────────────────────────────────────────────────
      // Communication Hub (Main Broadcasts View)
      // ────────────────────────────────────────────────────────────
      const allNotifications = Store.notifications || [];
      const unreadCount = allNotifications.filter(n => !n.read).length;

      const filteredBroadcasts = allNotifications.filter(n => {
        if (activeChannel === 'drive') return n.type === 'drive' || (n.title || '').toLowerCase().includes('aptitude') || (n.title || '').toLowerCase().includes('interview') || (n.title || '').toLowerCase().includes('drive');
        if (activeChannel === 'reminder') return n.type === 'reminder' || (n.title || '').toLowerCase().includes('deadline') || (n.title || '').toLowerCase().includes('urgent');
        if (activeChannel === 'ai') return n.type === 'ai' || (n.title || '').toLowerCase().includes('prep') || (n.title || '').toLowerCase().includes('resource');
        if (activeChannel === 'result') return n.type === 'result' || (n.title || '').toLowerCase().includes('selected') || (n.title || '').toLowerCase().includes('placed');
        return true;
      });

      root.innerHTML = `
      <div style="padding: 32px 40px; max-width: 1560px; margin: 0 auto; display:flex; flex-direction:column; gap:28px;">
        
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; font-size:10px; font-weight:700; color:var(--text-description); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px;">
              <span>Placenix</span>
              <span style="opacity:0.3;">/</span>
              <span style="color:var(--brand-primary);">Communications</span>
            </div>
            <h1 class="h1-ent" style="font-size:26px;">Institutional Communication</h1>
            <p style="color:var(--text-description); font-size:13.5px; margin-top:4px;">Official placement announcements, reporting venue schedules & critical deadline broadcasts.</p>
          </div>
          
          <div style="display:flex; gap:10px; align-items:center;">
            <button id="mark-all-read-btn" class="btn-premium-ghost" style="padding:8px 16px; font-size:11.5px; font-weight:700; border-radius:8px; display:flex; align-items:center; gap:6px; cursor:pointer;">
              <span>✓ Mark All Read</span>
            </button>
            <button class="btn-premium" onclick="window.location.hash='#queries'" style="padding:8px 18px; font-size:11.5px; font-weight:700; border-radius:8px; cursor:pointer;">
              <span>💬 Query Center →</span>
            </button>
          </div>
        </div>

        <!-- Channel Filter Tabs -->
        <div style="display:flex; gap:10px; border-bottom: 1px solid var(--glass-border-main); padding-bottom:12px; flex-wrap:wrap; align-items:center;">
          <button class="channel-tab-btn ${activeChannel === 'all' ? 'active-channel' : ''}" data-channel="all" style="padding:7px 16px; border-radius:100px; font-size:11.5px; font-weight:700; border:1px solid ${activeChannel === 'all' ? 'var(--brand-primary)' : 'var(--glass-border-main)'}; background:${activeChannel === 'all' ? 'var(--brand-primary-light)' : 'rgba(0,0,0,0.2)'}; color:${activeChannel === 'all' ? 'var(--brand-primary)' : 'var(--text-description)'}; cursor:pointer;">
            📢 All Signals (${allNotifications.length})
          </button>
          <button class="channel-tab-btn ${activeChannel === 'drive' ? 'active-channel' : ''}" data-channel="drive" style="padding:7px 16px; border-radius:100px; font-size:11.5px; font-weight:700; border:1px solid ${activeChannel === 'drive' ? 'var(--brand-secondary)' : 'var(--glass-border-main)'}; background:${activeChannel === 'drive' ? 'rgba(52,211,153,0.12)' : 'rgba(0,0,0,0.2)'}; color:${activeChannel === 'drive' ? 'var(--brand-secondary)' : 'var(--text-description)'}; cursor:pointer;">
            🎯 Drive & Slot Alerts
          </button>
          <button class="channel-tab-btn ${activeChannel === 'reminder' ? 'active-channel' : ''}" data-channel="reminder" style="padding:7px 16px; border-radius:100px; font-size:11.5px; font-weight:700; border:1px solid ${activeChannel === 'reminder' ? '#ef4444' : 'var(--glass-border-main)'}; background:${activeChannel === 'reminder' ? 'rgba(239,68,68,0.12)' : 'rgba(0,0,0,0.2)'}; color:${activeChannel === 'reminder' ? '#ef4444' : 'var(--text-description)'}; cursor:pointer;">
            ⏰ Deadline Alerts
          </button>
          <button class="channel-tab-btn ${activeChannel === 'ai' ? 'active-channel' : ''}" data-channel="ai" style="padding:7px 16px; border-radius:100px; font-size:11.5px; font-weight:700; border:1px solid ${activeChannel === 'ai' ? '#818cf8' : 'var(--glass-border-main)'}; background:${activeChannel === 'ai' ? 'rgba(129,140,248,0.12)' : 'rgba(0,0,0,0.2)'}; color:${activeChannel === 'ai' ? '#818cf8' : 'var(--text-description)'}; cursor:pointer;">
            📚 Faculty Prep Resources
          </button>
          <button class="channel-tab-btn ${activeChannel === 'result' ? 'active-channel' : ''}" data-channel="result" style="padding:7px 16px; border-radius:100px; font-size:11.5px; font-weight:700; border:1px solid ${activeChannel === 'result' ? '#F59E0B' : 'var(--glass-border-main)'}; background:${activeChannel === 'result' ? 'rgba(245,158,11,0.12)' : 'rgba(0,0,0,0.2)'}; color:${activeChannel === 'result' ? '#F59E0B' : 'var(--text-description)'}; cursor:pointer;">
            🏆 Placement Results
          </button>
        </div>

        <!-- Main Grid Layout -->
        <div style="display:grid; grid-template-columns: 340px 1fr; gap:24px;">
          
          <!-- Left: Live Alert Stream -->
          <div class="card-ent" style="padding:20px; border: 1px solid var(--glass-border-main); background: var(--glass-2); border-radius:14px; height:fit-content; max-height:80vh; display:flex; flex-direction:column;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--glass-border-subtle);">
              <span style="font-size:12px; font-weight:800; color:#fff; text-transform:uppercase; letter-spacing:0.05em;">Live Alert Feed</span>
              <span style="font-size:9.5px; font-weight:800; background:rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); padding:2px 8px; border-radius:100px;">
                ${unreadCount} Unread
              </span>
            </div>

            <div style="overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
              ${allNotifications.length === 0 ? `
                <div style="text-align:center; padding:32px 10px; color:var(--text-muted); font-size:12px;">No alerts in this cycle.</div>
              ` : allNotifications.map(n => {
                const messageText = n.message || n.desc || n.body || n.title || 'Broadcast message';
                const timeText = formatRelativeTime(n.timestamp || n.time || n.date);
                const icons = { drive:'🎯', ai:'📚', result:'🏆', reminder:'⏰', alumni:'🎓' };
                const icon = icons[n.type] || '📩';

                return `
                  <div style="padding:12px; border-radius:10px; background:${!n.read ? 'rgba(99,102,241,0.06)' : 'rgba(0,0,0,0.2)'}; border:1px solid ${!n.read ? 'rgba(99,102,241,0.2)' : 'var(--glass-border-subtle)'}; display:flex; gap:10px; align-items:flex-start;">
                    <div style="font-size:16px; line-height:1; padding-top:2px;">${icon}</div>
                    <div style="flex:1; min-width:0;">
                      <div style="font-size:12px; font-weight:700; color:#fff; word-break:break-word;">${n.title}</div>
                      <div style="font-size:11px; color:var(--text-description); margin-top:2px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                        ${messageText}
                      </div>
                      <div style="font-size:9.5px; color:var(--text-muted); margin-top:6px;">🕒 ${timeText}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Right: Strategic Broadcast Feed -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${filteredBroadcasts.length === 0 ? `
              <div class="card-ent" style="padding:60px 20px; text-align:center; border:1px dashed var(--glass-border-main); border-radius:14px; background:var(--glass-2);">
                <div style="font-size:32px; margin-bottom:10px;">📭</div>
                <h3 style="font-size:16px; font-weight:800; color:#fff;">No broadcasts in this category</h3>
                <p style="color:var(--text-description); font-size:12.5px; margin-top:4px;">Switch to 'All Signals' to view all placement announcements.</p>
              </div>
            ` : filteredBroadcasts.map((n, idx) => {
              const messageText = n.message || n.desc || n.body || n.title || 'Official placement announcement.';
              const timeText = formatRelativeTime(n.timestamp || n.time || n.date);
              
              const typeLabels = { drive: 'Placement Drive & Slot', ai: 'Prep Resource', result: 'Placement Result', reminder: 'Urgent Deadline', alumni: 'Alumni Network' };
              const authors = { drive: 'Training & Placement Office (TPO)', ai: 'Faculty Coordinator', result: 'Placement Evaluation Cell', reminder: 'Placement Operations', alumni: 'Alumni Cell' };
              
              const label = typeLabels[n.type] || 'Institutional Broadcast';
              const author = authors[n.type] || 'Placement Coordination Cell';
              const isPinned = idx === 0;

              // Action button routing based on announcement topic
              let actionButton = '';
              const titleLower = (n.title || '').toLowerCase();
              const msgLower = messageText.toLowerCase();

              if (titleLower.includes('slot') || titleLower.includes('aptitude') || titleLower.includes('interview') || msgLower.includes('venue')) {
                actionButton = `<button class="btn-premium" onclick="window.location.hash='#my-slots'" style="padding:6px 14px; font-size:11px; font-weight:700; border-radius:8px; cursor:pointer;">View My Slot & Venue →</button>`;
              } else if (titleLower.includes('deadline') || msgLower.includes('apply') || msgLower.includes('application')) {
                actionButton = `<button class="btn-premium" onclick="window.location.hash='#drives'" style="padding:6px 14px; font-size:11px; font-weight:700; border-radius:8px; cursor:pointer;">Open Opportunity Hub →</button>`;
              } else if (titleLower.includes('prep') || titleLower.includes('shared') || msgLower.includes('practice')) {
                actionButton = `<button class="btn-premium" onclick="window.location.hash='#ai-modules'" style="padding:6px 14px; font-size:11px; font-weight:700; border-radius:8px; cursor:pointer;">Open Prep Modules →</button>`;
              } else {
                actionButton = `<button class="btn-premium-ghost" onclick="window.location.hash='#queries'" style="padding:6px 14px; font-size:11px; font-weight:700; border-radius:8px; cursor:pointer;">Ask Query →</button>`;
              }

              return `
                <div class="card-ent" style="padding:24px; border: 1px solid ${isPinned ? 'rgba(99,102,241,0.35)' : 'var(--glass-border-main)'}; background: ${isPinned ? 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(0,0,0,0.3))' : 'var(--glass-2)'}; border-radius:14px;">
                  
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:9.5px; font-weight:800; background:var(--brand-primary-light); color:var(--brand-primary); padding:3px 10px; border-radius:100px; border:1px solid rgba(129,140,248,0.2);">
                        ${label}
                      </span>
                      ${isPinned ? '<span style="font-size:10px; font-weight:800; background:rgba(245,158,11,0.12); color:#F59E0B; padding:2px 8px; border-radius:6px; border:1px solid rgba(245,158,11,0.25);">📌 PINNED</span>' : ''}
                    </div>
                    <span style="font-size:11px; color:var(--text-muted);">🕒 ${timeText}</span>
                  </div>

                  <h3 style="font-size:16.5px; font-weight:800; color:#fff; font-family:var(--font-display); margin-bottom:8px;">${n.title}</h3>
                  <p style="font-size:13px; color:var(--text-description); line-height:1.6; margin:0 0 16px 0;">${messageText}</p>

                  <div style="display:flex; justify-content:space-between; align-items:center; padding-top:14px; border-top:1px solid var(--glass-border-subtle); flex-wrap:wrap; gap:10px;">
                    <div style="display:flex; gap:16px; font-size:11px; color:var(--text-muted);">
                      <span>👤 <strong>${author}</strong></span>
                      <span>🏛️ All Eligible Batches</span>
                    </div>
                    <div>
                      ${actionButton}
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>

        </div>

      </div>
      `;

      // Attach channel tab listeners
      root.querySelectorAll('.channel-tab-btn').forEach(btn => {
        btn.onclick = () => {
          activeChannel = btn.dataset.channel;
          render();
        };
      });

      // Mark all read button
      root.querySelector('#mark-all-read-btn')?.addEventListener('click', markAllAsRead);
    }
  };

  render();
}

