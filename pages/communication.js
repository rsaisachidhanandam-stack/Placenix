export async function loadCommPage(root, Store) {
  root.innerHTML = `
<style>
.comm-shell{display:grid;grid-template-columns:280px 1fr;gap:0;height:calc(100vh - 160px);border:1px solid var(--border-subtle);border-radius:16px;overflow:hidden;}
.comm-sidebar{background:var(--bg-sidebar);border-right:1px solid var(--border-subtle);display:flex;flex-direction:column;}
.comm-sidebar-header{padding:16px;border-bottom:1px solid var(--border-subtle);font-weight:700;font-size:.875rem;color:var(--text-primary);}
.notif-item{display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border-subtle);cursor:pointer;transition:background .2s;}
.notif-item:hover{background:var(--bg-card);}
.notif-item.unread{background:rgba(124,58,237,.05);border-left:3px solid var(--brand-electric-violet);}
.notif-item.read{border-left:3px solid transparent;}
.notif-icon-wrap{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.notif-title{font-size:.82rem;font-weight:600;color:var(--text-primary);margin-bottom:2px;}
.notif-desc{font-size:.75rem;color:var(--text-muted);}
.notif-time{font-size:.7rem;color:var(--text-muted);margin-top:2px;}
.comm-main{display:flex;flex-direction:column;}
.comm-topbar{padding:16px 20px;border-bottom:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;}
.comm-feed{flex:1;padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;}
.announce-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;padding:16px;transition:all .2s;}
.announce-card:hover{border-color:var(--border-medium);}
.announce-card.pinned{border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.04);}
.announce-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}
.announce-title{font-size:.9rem;font-weight:700;color:var(--text-primary);}
.announce-body{font-size:.82rem;color:var(--text-secondary);line-height:1.6;}
.announce-meta{display:flex;gap:10px;align-items:center;margin-top:10px;font-size:.74rem;color:var(--text-muted);}
.compose-bar{padding:16px 20px;border-top:1px solid var(--border-subtle);display:flex;gap:10px;}
.compose-input{flex:1;padding:10px 16px;background:var(--bg-input);border:1px solid var(--border-input);border-radius:10px;color:var(--text-primary);font-size:.875rem;outline:none;}
.compose-input:focus{border-color:var(--border-input-focus);}
@media(max-width:768px){.comm-shell{grid-template-columns:1fr;height:auto;}.comm-sidebar{display:none;}}
</style>
<div class="page-header">
  <h1 class="page-title">Communications Hub</h1>
  <p class="page-subtitle">Notifications, announcements, and placement alerts in one place</p>
</div>

<div class="comm-shell">
  <!-- Sidebar: notifications -->
  <div class="comm-sidebar">
    <div class="comm-sidebar-header" style="display:flex;justify-content:space-between;align-items:center;">
      <span>Notifications</span>
      <span class="badge badge-danger">${Store.notifications.filter(n=>!n.read).length} new</span>
    </div>
    <div style="flex:1;overflow-y:auto;">
      ${Store.notifications.map(n => {
        const icons = { drive:'🎯', ai:'🤖', result:'✅', reminder:'⏰', alumni:'🎓' };
        const bgColors = { drive:'rgba(124,58,237,.15)', ai:'rgba(34,211,238,.12)', result:'rgba(16,185,129,.12)', reminder:'rgba(245,158,11,.12)', alumni:'rgba(59,130,246,.12)' };
        return `
          <div class="notif-item ${n.read?'read':'unread'}" onclick="this.classList.remove('unread');this.classList.add('read');this.style.borderLeftColor='transparent';this.style.background='transparent';">
            <div class="notif-icon-wrap" style="background:${bgColors[n.type]}">${icons[n.type]}</div>
            <div style="flex:1;">
              <div class="notif-title">${n.title}</div>
              <div class="notif-desc">${n.desc}</div>
              <div class="notif-time">${n.time}</div>
            </div>
            ${!n.read?'<div style="width:8px;height:8px;border-radius:50%;background:var(--brand-electric-violet);margin-top:4px;flex-shrink:0;"></div>':''}
          </div>`;
      }).join('')}
    </div>
  </div>

  <!-- Main: announcements feed -->
  <div class="comm-main">
    <div class="comm-topbar">
      <div>
        <div style="font-weight:700;font-size:.95rem;color:var(--text-primary);">Placement Announcements</div>
        <div style="font-size:.78rem;color:var(--text-muted);">Institution-wide & department broadcasts</div>
      </div>
      <div style="display:flex;gap:8px;">
        <div class="tabs">
          <button class="tab-btn active">All</button>
          <button class="tab-btn">Drives</button>
          <button class="tab-btn">Events</button>
        </div>
        <button class="btn btn-primary btn-sm" onclick="showAnnModal()">+ Post</button>
      </div>
    </div>
    <div class="comm-feed">
      ${[
        { pinned:true,  badge:'success', badgeTxt:'🎯 New Drive', title:'ZOHO CORP — Application Window Open', body:'Zoho Corp is now accepting applications for Member Technical Staff (MTS) role. Package: 8-12 LPA. Eligible: CSE, IT, ECE with CGPA ≥ 7.5. Apply by June 25, 2025.', author:'TPO Office', time:'Today, 10:30 AM', dept:'All Departments' },
        { pinned:false, badge:'info',    badgeTxt:'📅 Event', title:'AI Resume Workshop — June 12th', body:'A free AI-powered resume building workshop will be conducted by our industry partner. Students from all departments can register. Limited seats available.', author:'Career Development Cell', time:'Yesterday, 3:00 PM', dept:'All Students' },
        { pinned:false, badge:'warning', badgeTxt:'⚠️ Reminder', title:'Infosys Registration Closes Tomorrow!', body:'Last reminder: Infosys Systems Engineer application window closes on June 18, 2025 at 11:59 PM. Eligible students who have not yet applied must do so immediately.', author:'Placement Coordinator — CSE', time:'2 days ago', dept:'CSE, IT, ECE' },
        { pinned:false, badge:'success', badgeTxt:'🏆 Result', title:'TCS Digital Results Announced', body:'Congratulations to 12 students shortlisted from our institution in TCS Digital Technical Test. Students shortlisted will receive individual emails within 24 hours.', author:'TPO Office', time:'3 days ago', dept:'All' },
      ].map(a => `
        <div class="announce-card ${a.pinned?'pinned':''}">
          <div class="announce-header">
            <div>
              <span class="badge badge-${a.badge}" style="margin-bottom:8px;display:inline-flex;">${a.badgeTxt}</span>
              <div class="announce-title">${a.title}</div>
            </div>
            ${a.pinned?'<span style="font-size:1rem;" title="Pinned">📌</span>':''}
          </div>
          <p class="announce-body">${a.body}</p>
          <div class="announce-meta">
            <span>👤 ${a.author}</span>
            <span>🕐 ${a.time}</span>
            <span>🏛️ ${a.dept}</span>
          </div>
        </div>`).join('')}
    </div>
    <div class="compose-bar">
      <input class="compose-input" type="text" placeholder="Type an announcement or message…">
      <button class="btn btn-primary" onclick="alert('Message sent!')">Send</button>
    </div>
  </div>
</div>`;

  window.showAnnModal = () => alert('Announcement composer would open here.');
}
