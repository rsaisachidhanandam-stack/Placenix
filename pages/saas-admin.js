export async function loadSaaSPage(root, Store) {
  const insts = Store.institutions;
  const totalMRR = insts.reduce((s,i) => s + i.mrr, 0);
  root.innerHTML = `
<style>
.saas-kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px;}
.inst-card{background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:14px;padding:20px;transition:all .3s;}
.inst-card:hover{border-color:var(--border-glow);transform:translateY(-2px);}
.inst-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-bottom:24px;}
.plan-tag{padding:3px 10px;border-radius:99px;font-size:.72rem;font-weight:700;}
.plan-Enterprise{background:rgba(124,58,237,.2);color:var(--brand-violet-light);}
.plan-Pro{background:rgba(34,211,238,.12);color:var(--brand-cyan);}
.plan-Starter{background:rgba(16,185,129,.1);color:var(--success);}
</style>
<div class="page-header" style="display:flex;justify-content:space-between;align-items:center;">
  <div><h1 class="page-title">SaaS Super Admin</h1><p class="page-subtitle">Multi-university platform management · Placenix Cloud</p></div>
  <button class="btn btn-primary" onclick="alert('Add Institution flow would open here')">+ Add Institution</button>
</div>

<div class="saas-kpi">
  ${[
    ['🏫',insts.length,'Institutions','↑ 2 new this month','rgba(124,58,237,.15)'],
    ['👥',insts.reduce((s,i)=>s+i.students,0).toLocaleString(),'Total Students','Across all institutions','rgba(34,211,238,.12)'],
    ['💰','₹'+Math.round(totalMRR/100000)+'L','Monthly Revenue','MRR this month','rgba(16,185,129,.12)'],
    ['📈','74.2%','Avg Placement Rate','Platform-wide','rgba(245,158,11,.12)'],
  ].map(([ic,v,l,c,bg])=>`
    <div class="stat-card animate-fade-in-up"><div class="stat-card-icon" style="background:${bg};">${ic}</div><div class="stat-card-value">${v}</div><div class="stat-card-label">${l}</div><div class="stat-card-change up">${c}</div></div>`).join('')}
</div>

<div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;margin-bottom:24px;">
  <div class="card animate-fade-in-up">
    <div class="card-header"><div class="card-title">Revenue Growth (MRR)</div></div>
    <canvas id="mrr-chart" height="200"></canvas>
  </div>
  <div class="card animate-fade-in-up delay-100">
    <div class="card-header"><div class="card-title">Plan Distribution</div></div>
    <canvas id="plan-chart" height="200"></canvas>
    <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px;">
      ${[['Enterprise',2,'#7C3AED'],['Pro',2,'#22D3EE'],['Starter',2,'#10B981']].map(([p,n,c])=>`
        <div style="display:flex;justify-content:space-between;font-size:.8rem;">
          <span style="display:flex;align-items:center;gap:8px;color:var(--text-secondary);"><span style="width:10px;height:10px;border-radius:2px;background:${c};display:inline-block;"></span>${p}</span>
          <span style="font-weight:700;color:var(--text-primary);">${n} institutions</span>
        </div>`).join('')}
    </div>
  </div>
</div>

<div class="card animate-fade-in-up">
  <div class="card-header"><div class="card-title">Institution Overview</div><div class="search-bar" style="min-width:180px;"><input type="text" placeholder="Search institutions…"></div></div>
  <div class="table-wrapper">
    <table class="table">
      <thead><tr><th>Institution</th><th>Students</th><th>Placed</th><th>Placement %</th><th>Plan</th><th>MRR</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        ${insts.map(i=>`
          <tr>
            <td><div><strong style="color:var(--text-primary);">${i.shortName}</strong><div style="font-size:.75rem;color:var(--text-muted);">${i.name}</div></div></td>
            <td>${i.students.toLocaleString()}</td>
            <td>${i.placed.toLocaleString()}</td>
            <td><strong style="color:${i.placed?(Math.round(i.placed/i.students*100)+'%'):'—'==='—'?'var(--text-muted)':'var(--success)'}">${i.placed?Math.round(i.placed/i.students*100)+'%':'—'}</strong></td>
            <td><span class="plan-tag plan-${i.plan}">${i.plan}</span></td>
            <td style="font-weight:600;color:var(--text-primary);">${i.mrr?'₹'+i.mrr.toLocaleString():'Free Trial'}</td>
            <td><span class="badge badge-${i.status==='Active'?'success':'warning'} badge-dot">${i.status}</span></td>
            <td><div style="display:flex;gap:6px;"><button class="btn btn-sm btn-secondary">View</button><button class="btn btn-sm btn-ghost">⚙️</button></div></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
</div>`;

  setTimeout(()=>{
    if(typeof Chart==='undefined')return;
    new Chart(document.getElementById('mrr-chart'),{type:'line',data:{labels:['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May'],datasets:[{label:'MRR (₹)',data:[120000,156000,189000,224000,268000,312000,348000,394000,426000,342000,370000],borderColor:'#7C3AED',backgroundColor:'rgba(124,58,237,.1)',fill:true,tension:0.4,pointBackgroundColor:'#22D3EE',pointRadius:4}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#64748B',callback:v=>'₹'+Math.round(v/1000)+'k'}},x:{grid:{display:false},ticks:{color:'#64748B'}}}}});
    new Chart(document.getElementById('plan-chart'),{type:'doughnut',data:{labels:['Enterprise','Pro','Starter'],datasets:[{data:[2,2,2],backgroundColor:['#7C3AED','#22D3EE','#10B981'],borderWidth:0,hoverOffset:4}]},options:{responsive:true,cutout:'70%',plugins:{legend:{display:false}}}});
  },100);
}
