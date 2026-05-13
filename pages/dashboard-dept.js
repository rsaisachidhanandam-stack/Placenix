// ============================================================
// PLACENIX — DEPARTMENTAL INTELLIGENCE HUB (v2.4)
// ============================================================

import { supabase } from '../supabase.js';

// ── Main Dashboard ──────────────────────────────────────────
export async function loadDeptDash(root, Store) {
  const analytics = Store.analytics?.overall || {};
  
  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto; display: flex; flex-direction: column; gap: 40px;">
      
      <!-- Operational Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <div class="label-ent" style="margin-bottom: 8px; color:var(--brand-primary);">Departmental Node</div>
          <h1 class="h1-ent">Departmental Intelligence Hub</h1>
          <p style="color:var(--text-description); font-size:15px; margin-top:4px;">Institutional oversight and recruitment telemetry for the CSE department.</p>
        </div>
        <div style="display:flex; gap:16px;">
          <div style="background:var(--bg-card); border:1px solid var(--border-main); padding:8px 16px; border-radius:10px; display:flex; align-items:center; gap:12px; font-size:12px; font-weight:700;">
            <div style="width:8px; height:8px; background:var(--brand-secondary); border-radius:50%; box-shadow:0 0 8px var(--brand-secondary);"></div>
            Institutional Node Online
          </div>
        </div>
      </div>

      <!-- Metric Infrastructure -->
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 24px;">
        <div class="card-ent" style="background: linear-gradient(145deg, var(--bg-card), rgba(139,92,246,0.05));">
          <div class="label-ent" style="margin-bottom: 16px;">Total Students</div>
          <div class="metric-ent">${analytics.totalStudents || 0}</div>
          <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Operational capacity reached</p>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Placement Rate</div>
          <div class="metric-ent">${analytics.placementPercent || 0}%</div>
          <div style="height:4px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden; margin-top:16px;">
            <div style="width:${analytics.placementPercent || 0}%; height:100%; background:var(--brand-secondary); box-shadow:0 0 12px var(--brand-secondary);"></div>
          </div>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Average ATS Node</div>
          <div class="metric-ent">84.2</div>
          <p style="font-size:12px; color:var(--text-description); margin-top:8px;">+4.2% improvement vs last batch</p>
        </div>

        <div class="card-ent">
          <div class="label-ent" style="margin-bottom: 16px;">Pending Validations</div>
          <div class="metric-ent">18</div>
          <p style="font-size:12px; color:var(--brand-primary); font-weight:700; margin-top:8px;">Urgent: 4 high-priority nodes</p>
        </div>
      </div>

      <!-- Content Grid -->
      <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap: 40px;">
        
        <!-- Left: Quick Navigation Matrix -->
        <div style="display:flex; flex-direction:column; gap:32px;">
          <h2 class="h2-ent" style="font-size:20px;">Operational Control Center</h2>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px;">
            <div class="card-ent nav-card" onclick="location.hash='dept-students'">
              <div style="font-size:24px; margin-bottom:16px;">👥</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">Students Overview</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Validate and manage the departmental student registry.</p>
            </div>
            <div class="card-ent nav-card" onclick="location.hash='dept-resume'">
              <div style="font-size:24px; margin-bottom:16px;">📄</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">Resume Analytics</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Global oversight of student ATS performance.</p>
            </div>
            <div class="card-ent nav-card" onclick="location.hash='dept-new-jobs'">
              <div style="font-size:24px; margin-bottom:16px;">💼</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">New Job Applications</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Monitor active recruitment pipelines.</p>
            </div>
            <div class="card-ent nav-card" onclick="location.hash='dept-queries'">
              <div style="font-size:24px; margin-bottom:16px;">💬</div>
              <h3 style="font-size:16px; font-weight:800; color:#fff;">Query Resolution</h3>
              <p style="font-size:12px; color:var(--text-description); margin-top:8px;">Handle institutional student support tickets.</p>
            </div>
          </div>
        </div>

        <!-- Right: Recent Intelligence Feed -->
        <div class="card-ent" style="padding:40px;">
          <h2 class="h2-ent" style="font-size:20px; margin-bottom:32px;">Intelligence Pulse</h2>
          <div style="display:flex; flex-direction:column; gap:24px;">
            <div style="padding-left:16px; border-left:2px solid var(--brand-primary);">
              <div style="font-weight:700; color:#fff; font-size:14px;">Anniversary Drive Sync</div>
              <p style="font-size:12px; color:var(--text-description); margin-top:4px;">12 students shortlisted for Google SDE role.</p>
              <div class="label-ent" style="font-size:9px; margin-top:8px;">2h ago</div>
            </div>
            <div style="padding-left:16px; border-left:2px solid var(--border-subtle);">
              <div style="font-weight:700; color:#fff; font-size:14px;">Resume Pulse Update</div>
              <p style="font-size:12px; color:var(--text-description); margin-top:4px;">34 students updated their professional metadata.</p>
              <div class="label-ent" style="font-size:9px; margin-top:8px;">4h ago</div>
            </div>
            <div style="padding-left:16px; border-left:2px solid var(--border-subtle);">
              <div style="font-weight:700; color:#fff; font-size:14px;">Query Node: Urgent</div>
              <p style="font-size:12px; color:var(--text-description); margin-top:4px;">Request for interview scheduling assistance.</p>
              <div class="label-ent" style="font-size:9px; margin-top:8px;">Yesterday</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      .nav-card { cursor: pointer; transition: all 0.3s ease; }
      .nav-card:hover { border-color: var(--brand-primary); transform: translateY(-4px); background: rgba(139,92,246,0.02); }
      .table-row-ent:hover { background: rgba(255,255,255,0.01); }
      .btn-validate { 
        padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; 
        cursor: pointer; transition: var(--t-fast); border: 1px solid var(--border-main);
        background: transparent; color: var(--text-description);
      }
      .btn-validate.active { background: rgba(16,185,129,0.1); border-color: var(--brand-secondary); color: var(--brand-secondary); }
    </style>
  `;
}

// ── (a) Students Overview ──────────────────────────────────
export async function loadDeptStudents(root, Store) {
  const students = Store.students || [];
  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto;">
      <div style="margin-bottom: 32px;">
        <h1 class="h1-ent" style="font-size:28px;">Students Overview</h1>
        <p style="color:var(--text-description); font-size:14px;">Institutional registry and profile validation matrix.</p>
      </div>

      <div class="card-ent" style="padding:0; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-main);">
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Student Profile</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Dept / Batch</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Performance Index</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Status Node</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase; text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => `
              <tr class="table-row-ent" style="border-bottom:1px solid var(--border-main);">
                <td style="padding:20px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:36px; height:36px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:var(--brand-primary);">${s.avatar}</div>
                    <div>
                      <div style="font-weight:700; color:#fff; font-size:14px;">${s.name}</div>
                      <div style="font-size:11px; color:var(--text-muted);">Roll: ${s.rollNo || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td style="padding:20px;">
                  <div style="font-weight:600; color:#fff; font-size:13px;">${s.dept}</div>
                  <div style="font-size:11px; color:var(--text-muted);">Batch ${s.batch}</div>
                </td>
                <td style="padding:20px;">
                  <div style="display:flex; gap:12px;">
                    <div><span class="label-ent" style="font-size:9px; display:block;">CGPA</span><span style="font-weight:700; color:#fff;">${s.cgpa}</span></div>
                    <div style="border-left:1px solid var(--border-subtle); padding-left:12px;"><span class="label-ent" style="font-size:9px; display:block;">ATS</span><span style="font-weight:700; color:var(--brand-primary);">${s.atsScore}</span></div>
                  </div>
                </td>
                <td style="padding:20px;">
                  <span class="status-pill ${s.placed ? 'status-success' : 'status-warning'}" style="font-size:10px;">${s.status}</span>
                </td>
                <td style="padding:20px; text-align:right;">
                  <button class="btn-validate" onclick="this.classList.toggle('active'); this.innerText = this.classList.contains('active') ? '✓ Validated' : 'Validate Node'">Validate Node</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── (b) Student Resume Analysis ───────────────────────────
export async function loadDeptResume(root, Store) {
  const students = Store.students || [];
  
  const renderAuditModal = (student) => {
    const modal = document.createElement('div');
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.85); backdrop-filter: blur(16px); 
      display: flex; align-items: center; justify-content: center; z-index: 2000;
    `;
    modal.innerHTML = `
      <div class="card-ent" style="width: 860px; max-height: 90vh; overflow-y: auto; padding: 56px; position: relative; border-color: var(--brand-primary); border-radius:32px;">
        <button id="close-modal" style="position:absolute; top:32px; right:32px; background:rgba(255,255,255,0.05); border:1px solid var(--border-main); color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; font-size:18px; display:flex; align-items:center; justify-content:center;">✕</button>
        
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:48px;">
          <div style="display:flex; gap:28px; align-items:center;">
            <div style="width:84px; height:84px; background:var(--brand-primary); border-radius:24px; display:flex; align-items:center; justify-content:center; font-size:34px; font-weight:950; color:#fff; box-shadow: 0 10px 30px -10px var(--brand-primary);">${student.avatar}</div>
            <div style="display:flex; flex-direction:column; gap:4px;">
              <h2 style="font-size:36px; font-weight:950; color:#fff; letter-spacing:-0.04em; margin:0; line-height:1;">${student.name}</h2>
              <p style="color:var(--text-description); font-size:17px; margin:0; font-weight:600; opacity:0.8;">${student.dept} <span style="color:var(--border-main); margin:0 8px;">|</span> Batch of ${student.batch}</p>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:48px; font-weight:950; color:var(--brand-secondary); line-height:1;">${student.atsScore}</div>
            <div class="label-ent" style="font-size:11px; margin-top:8px;">Institutional ATS Index</div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:32px; margin-bottom:48px;">
          <div class="card-ent" style="background:rgba(255,255,255,0.015); border-color:var(--border-subtle); border-radius:24px; padding:32px;">
            <h3 class="label-ent" style="font-size:11px; margin-bottom:24px; color:var(--brand-primary);">Keyword Telemetry</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="color:var(--text-description);">Industry Keywords</span>
                <span style="color:var(--brand-secondary); font-weight:800;">18 / 24 Found</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="color:var(--text-description);">Action Verbs</span>
                <span style="color:var(--brand-primary); font-weight:800;">Highly Optimized</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="color:var(--text-description);">Quantifiable Metrics</span>
                <span style="color:#ef4444; font-weight:800;">Needs Improvement</span>
              </div>
            </div>
          </div>
          <div class="card-ent" style="background:rgba(255,255,255,0.015); border-color:var(--border-subtle); border-radius:24px; padding:32px;">
            <h3 class="label-ent" style="font-size:11px; margin-bottom:24px; color:var(--brand-primary);">Structural Formatting</h3>
            <div style="display:flex; flex-direction:column; gap:16px;">
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="color:var(--text-description);">Header Alignment</span>
                <span style="color:var(--brand-secondary); font-weight:800;">Standardized</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="color:var(--text-description);">Font Hierarchy</span>
                <span style="color:var(--brand-secondary); font-weight:800;">Optimal</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:14px;">
                <span style="color:var(--text-description);">Parsing Probability</span>
                <span style="color:var(--brand-secondary); font-weight:800;">98% Accuracy</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 class="label-ent" style="font-size:11px; margin-bottom:24px;">Professional Section Audit</h3>
          <div style="display:flex; flex-direction:column; gap:16px;">
            ${['Experience Hierarchy', 'Educational Validity', 'Technical Skill Cloud', 'Certification Authentication'].map(sec => `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:20px 24px; background:rgba(255,255,255,0.025); border:1px solid var(--border-main); border-radius:16px;">
                <div style="font-size:15px; font-weight:700; color:#fff;">${sec}</div>
                <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--brand-secondary); font-weight:800;">
                  <span>✓ Verified</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    modal.querySelector('#close-modal').onclick = () => modal.remove();
    document.body.appendChild(modal);
  };

  root.innerHTML = `
    <div style="padding: 24px 40px; max-width: 1680px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
      
      <!-- Premium Institutional Header -->
      <div style="margin-bottom: 48px; position: relative; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle);">
        <h1 class="h1-ent" style="font-size:36px; letter-spacing:-0.03em;">Global Resume Intelligence</h1>
        <p style="color:var(--text-description); font-size:16px; margin-top:8px;">Department-wide ATS performance telemetry and professional alignment analysis.</p>
        <div style="position:absolute; bottom:-1px; left:0; width:160px; height:4px; background:linear-gradient(90deg, var(--brand-secondary), transparent); border-radius:10px;"></div>
      </div>

      <div id="resume-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 32px;">
        ${students.map((s, idx) => `
          <div class="card-ent" style="padding:32px; display:flex; flex-direction:column; gap:28px; border-radius:28px; background:rgba(255,255,255,0.01);">
            <div style="display:flex; justify-content:space-between; align-items:start;">
              <div style="display:flex; align-items:center; gap:16px;">
                <div style="width:56px; height:56px; background:var(--brand-primary); border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:900; color:#fff;">${s.avatar}</div>
                <div>
                  <div style="font-weight:800; color:#fff; font-size:18px; letter-spacing:-0.02em;">${s.name}</div>
                  <div style="font-size:13px; color:var(--text-muted); font-weight:600; margin-top:2px;">${s.dept} • Class of ${s.batch}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:32px; font-weight:950; color:${s.atsScore >= 80 ? 'var(--brand-secondary)' : s.atsScore >= 60 ? 'var(--brand-primary)' : '#ef4444'}; line-height:1;">${s.atsScore}</div>
                <div class="label-ent" style="font-size:10px; margin-top:4px;">ATS SCORE</div>
              </div>
            </div>

            <div style="height:8px; background:rgba(255,255,255,0.03); border-radius:10px; overflow:hidden;">
              <div style="width:${s.atsScore}%; height:100%; background:linear-gradient(90deg, ${s.atsScore >= 80 ? 'var(--brand-secondary)' : 'var(--brand-primary)'}, transparent);"></div>
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${(s.skills || []).slice(0, 4).map(skill => `<span style="font-size:11px; padding:6px 14px; background:rgba(255,255,255,0.02); border:1px solid var(--border-main); border-radius:10px; color:var(--text-description); font-weight:700;">${skill}</span>`).join('')}
              ${s.skills && s.skills.length > 4 ? `<span style="font-size:11px; padding:6px 14px; color:var(--text-muted); font-weight:600;">+${s.skills.length - 4} More</span>` : ''}
            </div>

            <button class="btn-premium audit-btn" data-idx="${idx}" style="width:100%; height:48px; font-size:13px; border-radius:14px; font-weight:800; letter-spacing:0.02em;">Deep Audit Details</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  root.querySelectorAll('.audit-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-idx');
      renderAuditModal(students[idx]);
    };
  });
}

// ── (c) Skill Analysis Report ─────────────────────────────
export async function loadDeptSkills(root, Store) {
  const students = Store.students || [];
  
  root.innerHTML = `
    <div style="padding: 24px 40px; max-width: 1680px; margin: 0 auto; animation: fadeIn 0.4s ease-out;">
      
      <!-- Premium Institutional Header -->
      <div style="margin-bottom: 40px; position: relative; padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle);">
        <h1 class="h1-ent" style="font-size:36px; letter-spacing:-0.03em;">Departmental Skill Matrix</h1>
        <p style="color:var(--text-description); font-size:16px; margin-top:6px;">Institutional skill breakdown and multi-dimensional proficiency reports.</p>
        <div style="position:absolute; bottom:-1px; left:0; width:160px; height:4px; background:linear-gradient(90deg, var(--brand-primary), transparent); border-radius:10px;"></div>
      </div>

      <!-- Enhanced Aggregate Intelligence - BOLDER -->
      <div style="margin-bottom: 48px;">
        <h3 class="label-ent" style="font-size:11px; margin-bottom:20px; color:var(--brand-primary); letter-spacing:0.12em;">AGGREGATE PROFICIENCY TELEMETRY</h3>
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:20px;">
          ${['Technical','Communication','Problem Solving','Domain Knowledge','Collaboration'].map((skill, idx) => {
            const score = Math.floor(Math.random() * 15) + 75;
            return `
              <div class="card-ent" style="text-align:center; padding:40px 24px; background:rgba(255,255,255,0.015); border:1.2px solid var(--border-main); border-radius:24px; position:relative; overflow:hidden;">
                <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:radial-gradient(circle at top right, rgba(139,92,246,0.08), transparent); pointer-events:none;"></div>
                <div style="font-size:40px; font-weight:950; color:#fff; line-height:1; letter-spacing:-0.03em;">
                  ${score}<span style="font-size:16px; color:var(--text-muted); font-weight:700; margin-left:2px;">/100</span>
                </div>
                <div style="font-size:12px; font-weight:900; color:var(--brand-secondary); margin-top:14px; text-transform:uppercase; letter-spacing:0.06em;">${skill}</div>
                <div style="width:60px; height:3px; background:var(--brand-primary); margin:20px auto 0; border-radius:10px; opacity:0.4;"></div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Precision Telemetry Table - MAX VISIBILITY -->
      <div style="margin-top: 16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 class="label-ent" style="font-size:11px; color:var(--text-muted); letter-spacing:0.12em;">STUDENT-LEVEL PROFICIENCY MATRIX</h3>
          <div style="display:flex; gap:16px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-description);">
              <span style="width:10px; height:10px; border-radius:50%; background:var(--brand-primary); box-shadow:0 0 8px var(--brand-primary);"></span> High Growth
            </div>
            <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-description);">
              <span style="width:10px; height:10px; border-radius:50%; background:var(--brand-secondary); box-shadow:0 0 8px var(--brand-secondary);"></span> Elite
            </div>
          </div>
        </div>

        <div class="card-ent" style="padding:0; overflow:hidden; border-color:var(--border-subtle); border-radius:24px;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:rgba(255,255,255,0.025); border-bottom:1px solid var(--border-main);">
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; width:300px;">Student Node</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase;">Technical Mastery</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:center;">Comm.</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:center;">Problem Solving</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:center;">Domain</th>
                <th style="padding:24px; font-size:12px; font-weight:900; color:var(--text-muted); text-transform:uppercase; text-align:right;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const techScore = Math.floor(Math.random() * 30) + 65;
                const isElite = techScore > 85;
                return `
                  <tr class="table-row-ent" style="border-bottom:1px solid var(--border-main); transition:all 0.2s;">
                    <td style="padding:18px 24px;">
                      <div style="display:flex; align-items:center; gap:16px;">
                        <div style="width:36px; height:36px; background:var(--bg-elevated); border:1.2px solid var(--border-main); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:900; color:var(--brand-primary);">${s.avatar}</div>
                        <div style="font-weight:800; color:#fff; font-size:15px; letter-spacing:-0.02em;">${s.name}</div>
                      </div>
                    </td>
                    <td style="padding:18px 24px;">
                      <div style="display:flex; align-items:center; gap:20px;">
                        <div style="flex:1; height:8px; background:rgba(255,255,255,0.04); border-radius:10px; overflow:hidden; max-width:200px;">
                          <div style="width:${techScore}%; height:100%; background:linear-gradient(90deg, var(--brand-primary), var(--brand-secondary)); border-radius:10px;"></div>
                        </div>
                        <span style="font-size:14px; font-weight:900; color:#fff; min-width:56px;">
                          ${techScore}<span style="font-size:11px; color:var(--text-muted); font-weight:700;">/100</span>
                        </span>
                      </div>
                    </td>
                    <td style="padding:18px 24px; text-align:center; font-weight:800; color:var(--text-description); font-size:14px;">
                      ${Math.floor(Math.random() * 20) + 75}<span style="font-size:11px; color:var(--text-muted); font-weight:600;">/100</span>
                    </td>
                    <td style="padding:18px 24px; text-align:center; font-weight:800; color:var(--text-description); font-size:14px;">
                      ${Math.floor(Math.random() * 20) + 75}<span style="font-size:11px; color:var(--text-muted); font-weight:600;">/100</span>
                    </td>
                    <td style="padding:18px 24px; text-align:center; font-weight:800; color:var(--text-description); font-size:14px;">
                      ${Math.floor(Math.random() * 20) + 75}<span style="font-size:11px; color:var(--text-muted); font-weight:600;">/100</span>
                    </td>
                    <td style="padding:18px 24px; text-align:right;">
                      <span class="status-pill ${isElite ? 'status-success' : 'status-primary'}" style="font-size:12px; padding:10px 20px; border-radius:12px; font-weight:900; letter-spacing:0.05em; display:inline-block; min-width:120px; text-align:center;">
                        ${isElite ? 'ELITE' : 'PROFICIENT'}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .table-row-ent:hover { background: rgba(255,255,255,0.015) !important; }
    </style>
  `;
}

// ── (d) New Job Applications ──────────────────────────────
export async function loadDeptNewJobs(root, Store) {
  const drives = Store.drives || [];
  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto;">
      <div style="margin-bottom: 40px;">
        <h1 class="h1-ent" style="font-size:28px;">Active Recruitment Pipelines</h1>
        <p style="color:var(--text-description); font-size:14px;">Real-time monitoring of live campus drives and student engagement telemetry.</p>
      </div>

      <div style="display:flex; flex-direction:column; gap:32px;">
        ${drives.filter(d => d.status === 'Open').map(d => `
          <div class="card-ent" style="padding:32px;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:32px;">
              <div style="display:flex; gap:20px; align-items:center;">
                <div style="font-size:40px;">${d.logo}</div>
                <div>
                  <h3 style="font-size:20px; font-weight:800; color:#fff;">${d.company} — ${d.role}</h3>
                  <div style="display:flex; gap:16px; margin-top:4px;">
                    <span style="font-size:12px; color:var(--text-muted); font-weight:600;">💰 ${d.package}</span>
                    <span style="font-size:12px; color:var(--text-muted); font-weight:600;">📅 Deadline: ${d.deadline}</span>
                    <span style="font-size:12px; color:var(--brand-secondary); font-weight:800;">📍 ${d.location}</span>
                  </div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:24px; font-weight:800; color:#fff;">${d.applicants}</div>
                <div class="label-ent" style="font-size:9px;">Active Applicants</div>
              </div>
            </div>

            <div style="border-top:1px solid var(--border-main); padding-top:24px;">
              <h4 class="label-ent" style="font-size:10px; margin-bottom:16px;">Operational Applicant Registry</h4>
              <div style="display:flex; flex-wrap:wrap; gap:12px;">
                ${Store.students.slice(0, 5).map(s => `
                  <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-subtle); padding:8px 12px; border-radius:10px; display:flex; align-items:center; gap:10px;">
                    <div style="width:24px; height:24px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; color:var(--brand-primary);">${s.avatar}</div>
                    <div style="font-size:12px; font-weight:600; color:#fff;">${s.name}</div>
                    <span class="status-pill status-success" style="font-size:8px; padding:2px 6px;">Applied</span>
                  </div>
                `).join('')}
                <div style="background:rgba(139,92,246,0.05); border:1px dashed var(--brand-primary); padding:8px 12px; border-radius:10px; font-size:12px; font-weight:700; color:var(--brand-primary); cursor:pointer;">+${d.applicants - 5} others</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── (e) Previous Job Application ─────────────────────────
export async function loadDeptPrevJobs(root, Store) {
  const drives = Store.drives || [];
  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto;">
      <div style="margin-bottom: 40px;">
        <h1 class="h1-ent" style="font-size:28px;">Placement Historical Analytics</h1>
        <p style="color:var(--text-description); font-size:14px;">Review of completed recruitment cycles and departmental outcome reports.</p>
      </div>

      <div class="card-ent" style="padding:0; overflow:hidden;">
        <table style="width:100%; border-collapse:collapse; text-align:left;">
          <thead>
            <tr style="background:rgba(255,255,255,0.02); border-bottom:1px solid var(--border-main);">
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Company Node</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Role Sector</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Funnel Analytics</th>
              <th style="padding:20px; font-size:11px; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${drives.filter(d => d.status !== 'Open').map(d => `
              <tr class="table-row-ent" style="border-bottom:1px solid var(--border-main);">
                <td style="padding:20px;">
                  <div style="display:flex; align-items:center; gap:12px;">
                    <div style="font-size:24px;">${d.logo}</div>
                    <div style="font-weight:700; color:#fff; font-size:14px;">${d.company}</div>
                  </div>
                </td>
                <td style="padding:20px; color:var(--text-description); font-size:13px; font-weight:600;">${d.role}</td>
                <td style="padding:20px;">
                  <div style="font-size:12px; color:#fff; font-weight:700;">${d.applicants} Applicants</div>
                  <div style="font-size:11px; color:var(--brand-secondary); font-weight:600;">${Math.floor(d.applicants * 0.2)} Institutional Placements</div>
                </td>
                <td style="padding:20px;">
                  <span class="status-pill status-muted" style="font-size:10px;">Cycle Concluded</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── (f) Announcements ────────────────────────────────────
// ── (f) Announcements ────────────────────────────────────
export async function loadDeptAnnouncements(root, Store) {
  root.innerHTML = `
    <div style="padding: 24px 40px; max-width: 1680px; margin: 0 auto; display:grid; grid-template-columns: 440px 1fr; gap:64px; animation: fadeIn 0.4s ease-out;">
      
      <!-- Left Column: Command Center -->
      <div>
        <div style="margin-bottom: 48px; position: relative; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle);">
          <h1 class="h1-ent" style="font-size:36px; letter-spacing:-0.03em;">Announcements</h1>
          <p style="color:var(--text-description); font-size:16px; margin-top:8px;">Broadcast institutional directives.</p>
          <div style="position:absolute; bottom:-1px; left:0; width:120px; height:4px; background:linear-gradient(90deg, #ef4444, transparent); border-radius:10px;"></div>
        </div>

        <div class="card-ent" style="padding:40px; background:rgba(255,255,255,0.015); border-radius:28px; border:1.2px solid var(--border-main);">
          <h3 class="label-ent" style="font-size:11px; margin-bottom:32px; color:var(--brand-primary); letter-spacing:0.12em;">NEURAL BROADCAST COMPOSER</h3>
          <div style="display:flex; flex-direction:column; gap:28px;">
            <div>
              <label class="label-ent" style="font-size:10px; margin-bottom:12px; display:block;">BROADCAST TITLE</label>
              <input type="text" placeholder="e.g. Schedule for TCS Mock Interview" class="input-ent" style="width:100%; height:52px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:0 18px; border-radius:14px; font-size:15px; font-weight:600;">
            </div>
            <div>
              <label class="label-ent" style="font-size:10px; margin-bottom:12px; display:block;">MESSAGE PAYLOAD</label>
              <textarea placeholder="Specify the operational directive..." style="width:100%; height:180px; background:rgba(255,255,255,0.02); border:1.2px solid var(--border-main); color:#fff; padding:18px; border-radius:14px; font-size:15px; line-height:1.6; resize:none; font-weight:500;"></textarea>
            </div>
            <button class="btn-premium" style="width:100%; height:56px; margin-top:12px; font-size:15px; font-weight:900; letter-spacing:0.02em; border-radius:16px;">Commence Broadcast</button>
          </div>
        </div>
      </div>

      <!-- Right Column: Live Broadcast Feed -->
      <div style="display:flex; flex-direction:column; gap:32px; padding-top:100px;">
        <h3 class="label-ent" style="font-size:11px; margin-bottom:8px; color:var(--text-muted); letter-spacing:0.12em;">LIVE BROADCAST FEED</h3>
        ${[1,2,3].map(i => `
          <div class="card-ent" style="padding:40px; border-left:6px solid ${i === 1 ? '#ef4444' : i === 2 ? '#f59e0b' : 'var(--brand-primary)'}; border-radius:24px; transition: transform 0.2s;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:24px;">
              <h3 style="font-size:24px; font-weight:950; color:#fff; letter-spacing:-0.02em;">${i === 1 ? 'URGENT: TCS Registration Deadline' : i === 2 ? 'Important: Mock Interview Schedule' : 'General: Resume Workshop Sync'}</h3>
              <span class="status-pill ${i === 1 ? 'status-danger' : i === 2 ? 'status-warning' : 'status-success'}" style="font-size:10px; padding:6px 14px; font-weight:900;">${i === 1 ? 'URGENT' : i === 2 ? 'IMPORTANT' : 'GENERAL'}</span>
            </div>
            <p style="color:var(--text-description); font-size:16px; line-height:1.7; font-weight:500;">All students are directed to complete their professional metadata synchronization for the upcoming TCS operational drive.</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:32px; padding-top:24px; border-top:1px solid var(--border-subtle);">
              <div class="label-ent" style="font-size:10px; color:var(--text-muted); font-weight:700;">PUBLISHED: ${i}H AGO</div>
              <div style="display:flex; gap:8px;">
                <button style="background:none; border:none; color:var(--brand-primary); font-size:12px; font-weight:800; cursor:pointer;">Edit Directive</button>
                <span style="color:var(--border-main);">|</span>
                <button style="background:none; border:none; color:var(--text-muted); font-size:12px; font-weight:800; cursor:pointer;">Retract</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── (g) Queries ──────────────────────────────────────────
export async function loadDeptQueries(root, Store) {
  root.innerHTML = `
    <div style="padding: 40px; max-width: 1560px; margin: 0 auto;">
      <div style="margin-bottom: 40px; display:flex; justify-content:space-between; align-items:flex-end;">
        <div>
          <h1 class="h1-ent" style="font-size:28px;">Institutional Queries</h1>
          <p style="color:var(--text-description); font-size:14px;">Student support resolution node and communication hub.</p>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn-premium-ghost active" style="font-size:11px; padding:8px 16px;">Open Nodes (12)</button>
          <button class="btn-premium-ghost" style="font-size:11px; padding:8px 16px;">Resolved</button>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:20px;">
        ${[1,2,3,4].map(i => `
          <div class="card-ent" style="padding:24px; cursor:pointer; transition:all 0.2s;">
            <div style="display:flex; justify-content:space-between; align-items:start;">
              <div style="display:flex; gap:16px;">
                <div style="width:40px; height:40px; background:var(--bg-elevated); border:1px solid var(--border-main); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:var(--brand-primary);">S${i}</div>
                <div>
                  <h4 style="font-size:15px; font-weight:800; color:#fff;">Request for Resume Review Assistance</h4>
                  <div style="display:flex; gap:12px; margin-top:4px;">
                    <span style="font-size:12px; color:var(--text-muted); font-weight:600;">Student Node: Student ${i}</span>
                    <span style="font-size:12px; color:var(--text-muted); font-weight:600;">• ${i * 2}h ago</span>
                  </div>
                </div>
              </div>
              <span class="status-pill status-warning" style="font-size:9px;">Awaiting Resolution</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
