// State (localStorage)
const state = {
  incidents: JSON.parse(localStorage.getItem('incidents')||'[]'),
  access: JSON.parse(localStorage.getItem('access')||'[]'),
  editingIncidentId: null,
  editingAccessId: null,
};
const qs = (s, c=document)=>c.querySelector(s);
const qsa = (s, c=document)=>Array.from(c.querySelectorAll(s));
function saveState(){ localStorage.setItem('incidents', JSON.stringify(state.incidents)); localStorage.setItem('access', JSON.stringify(state.access)); }
function uid(){ return Math.random().toString(36).slice(2,9); }
function dt(x){ try{return x?new Date(x).toLocaleString():''}catch{return x||''} }
qs('#year').textContent = new Date().getFullYear();

// Tabs
qsa('.tab').forEach(b=>b.addEventListener('click',e=>{
  qsa('.tab').forEach(x=>x.classList.remove('active')); e.currentTarget.classList.add('active');
  qsa('.tab-panel').forEach(p=>p.classList.remove('active')); qs('#'+e.currentTarget.dataset.tab).classList.add('active');
}));

// Theme
qs('#darkModeBtn').addEventListener('click', ()=> document.documentElement.classList.toggle('light'));

// Incidents
function renderIncidents(f=''){
  const tb = qs('#incidentsTable tbody'); tb.innerHTML = '';
  state.incidents.filter(i=>(`${i.title} ${i.severity} ${i.status} ${i.tags}`).toLowerCase().includes(f.toLowerCase()))
    .forEach(i=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i.title}</td>
        <td><span class="badge">${i.severity}</span></td>
        <td>${i.status}</td>
        <td>${dt(i.when)}</td>
        <td>${(i.tags||[]).join(', ')}</td>
        <td><button class="small edit" data-id="${i.id}">Edit</button> <button class="small danger del" data-id="${i.id}">Del</button></td>`;
      tb.appendChild(tr);
    });
  qsa('button.edit', tb).forEach(b=>b.addEventListener('click', ()=>editIncident(b.dataset.id)));
  qsa('button.del', tb).forEach(b=>b.addEventListener('click', ()=>delIncident(b.dataset.id)));
}
renderIncidents();

function openIncidentForm(edit=false){ qs('#incidentForm').classList.remove('hidden'); qs('#formTitle').textContent = edit?'Edit Incident':'New Incident'; }
function closeIncidentForm(){ qs('#incidentForm').classList.add('hidden'); ['#iTitle','#iTags','#iDesc','#iWhen'].forEach(s=>qs(s).value=''); qs('#iSeverity').value='Low'; qs('#iStatus').value='Open'; state.editingIncidentId=null; }
qs('#newIncidentBtn').addEventListener('click', ()=>openIncidentForm(false));
qs('#cancelIncidentBtn').addEventListener('click', closeIncidentForm);

qs('#saveIncidentBtn').addEventListener('click', ()=>{
  const obj = {
    id: state.editingIncidentId || uid(),
    title: qs('#iTitle').value.trim(),
    severity: qs('#iSeverity').value,
    status: qs('#iStatus').value,
    tags: qs('#iTags').value.split(',').map(s=>s.trim()).filter(Boolean),
    when: qs('#iWhen').value,
    desc: qs('#iDesc').value.trim(),
  };
  if(!obj.title) return alert('Title required');
  if(state.editingIncidentId) state.incidents = state.incidents.map(i=>i.id===obj.id?obj:i);
  else state.incidents.unshift(obj);
  saveState(); renderIncidents(qs('#searchIncidents').value); closeIncidentForm();
});
function editIncident(id){ const i = state.incidents.find(x=>x.id===id); if(!i) return; openIncidentForm(true);
  qs('#iTitle').value=i.title; qs('#iSeverity').value=i.severity; qs('#iStatus').value=i.status;
  qs('#iTags').value=(i.tags||[]).join(', '); qs('#iWhen').value=i.when||''; qs('#iDesc').value=i.desc||''; state.editingIncidentId=id; }
function delIncident(id){ if(!confirm('Delete this incident?')) return; state.incidents = state.incidents.filter(i=>i.id!==id); saveState(); renderIncidents(qs('#searchIncidents').value); }
qs('#searchIncidents').addEventListener('input', e=>renderIncidents(e.target.value));

// CSV export
qs('#exportCsvBtn').addEventListener('click', ()=>{
  const rows = [['Title','Severity','Status','When','Tags','Description']];
  state.incidents.forEach(i=>rows.push([i.title,i.severity,i.status,dt(i.when),(i.tags||[]).join('|'),i.desc||'']));
  const csv = rows.map(r=>r.map(x=>`"${(x||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='incidents.csv'; a.click();
});

// JSON export/import
qs('#exportJsonBtn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify({incidents:state.incidents,access:state.access},null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='secops-lite-data.json'; a.click();
});
qs('#importJsonInput').addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return; const r = new FileReader();
  r.onload = ()=>{ try{ const obj = JSON.parse(r.result);
    if(Array.isArray(obj.incidents)) state.incidents=obj.incidents;
    if(Array.isArray(obj.access)) state.access=obj.access;
    saveState(); renderIncidents(); renderAccess(); alert('Import successful');
  }catch{ alert('Invalid JSON'); } };
  r.readAsText(f);
});

// Access review
function renderAccess(){
  const tb = qs('#accessTable tbody'); tb.innerHTML='';
  state.access.forEach(a=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" data-id="${a.id}" ${a.done?'checked':''}></td>
      <td>${a.text||''}</td>
      <td>${a.owner||''}</td>
      <td>${a.due||''}</td>
      <td><button class="small editA" data-id="${a.id}">Edit</button> <button class="small danger delA" data-id="${a.id}">Del</button></td>`;
    tb.appendChild(tr);
  });
  qsa('input[type=checkbox]', tb).forEach(c=>c.addEventListener('change', e=>{
    const id = e.target.dataset.id; state.access = state.access.map(x=>x.id===id?{...x,done:e.target.checked}:x); saveState();
  }));
  qsa('button.editA', tb).forEach(b=>b.addEventListener('click', ()=>editAccess(b.dataset.id)));
  qsa('button.delA', tb).forEach(b=>b.addEventListener('click', ()=>delAccess(b.dataset.id)));
}
renderAccess();

function openAccessForm(edit=false){ qs('#accessForm').classList.remove('hidden'); qs('#accessFormTitle').textContent = edit?'Edit Checklist Item':'New Checklist Item'; }
function closeAccessForm(){ qs('#accessForm').classList.add('hidden'); qs('#aItem').value=''; qs('#aOwner').value=''; qs('#aDue').value=''; state.editingAccessId=null; }
qs('#newAccessItemBtn').addEventListener('click', ()=>openAccessForm(false));
qs('#cancelAccessBtn').addEventListener('click', closeAccessForm);
qs('#saveAccessBtn').addEventListener('click', ()=>{
  const obj = { id: state.editingAccessId||uid(), text: qs('#aItem').value.trim(), owner: qs('#aOwner').value.trim(), due: qs('#aDue').value, done:false };
  if(!obj.text) return alert('Item required');
  if(state.editingAccessId) state.access = state.access.map(x=>x.id===obj.id?{...obj,done:(state.access.find(y=>y.id===obj.id)||{}).done}:x);
  else state.access.unshift(obj);
  saveState(); renderAccess(); closeAccessForm();
});
function editAccess(id){ const it = state.access.find(x=>x.id===id); if(!it) return; openAccessForm(true);
  qs('#aItem').value=it.text||''; qs('#aOwner').value=it.owner||''; qs('#aDue').value=it.due||''; state.editingAccessId=id; }
function delAccess(id){ if(!confirm('Delete this item?')) return; state.access = state.access.filter(x=>x.id!==id); saveState(); renderAccess(); }

// Log parser
qs('#runFilterBtn').addEventListener('click', ()=>{
  const text = qs('#logInput').value||'', filt = qs('#logFilter').value||'';
  let lines = text.split(/\r?\n/);
  if(filt){
    try{ const re = new RegExp(filt, 'i'); lines = lines.filter(l=>re.test(l)); }
    catch{ lines = lines.filter(l=>l.toLowerCase().includes(filt.toLowerCase())); }
  }
  qs('#logOutput').textContent = lines.join('\n');
});
qs('#clearLogsBtn').addEventListener('click', ()=>{ qs('#logInput').value=''; qs('#logFilter').value=''; qs('#logOutput').textContent=''; });

// ---- Demo seeding ----
function loadDemoData(){
  // Sample Incidents
  const demoIncidents = [
    {
      id: uid(),
      title: "Alert noise after new IDS rule",
      severity: "Medium",
      status: "In Progress",
      tags: ["ids","tuning","noise"],
      when: new Date().toISOString().slice(0,16), // yyyy-MM-ddTHH:mm
      desc: "Spike in IDS alerts post new rule set. Triaged sample events, found benign service traffic. Action: narrow rule scope; add allowlist for known subnets; schedule post-change review."
    },
    {
      id: uid(),
      title: "Unauthorized admin login attempts",
      severity: "High",
      status: "Resolved",
      tags: ["iam","brute-force","auth"],
      when: new Date(Date.now()-3600*1000*24).toISOString().slice(0,16),
      desc: "Multiple failed admin logins from foreign ASN. Action: enforced MFA check, temporary IP block, rotated credentials, reviewed audit logs. Evidence captured in screenshots."
    },
    {
      id: uid(),
      title: "Backup job failure on WS2016-DB01",
      severity: "Medium",
      status: "Open",
      tags: ["backup","ws2016","jobs"],
      when: new Date(Date.now()-3600*1000*48).toISOString().slice(0,16),
      desc: "Nightly backup reported exit code 1. Action: checked storage quota, restarted agent, re-ran incremental; plan full backup this weekend; add alert on non-zero exit."
    }
  ];

  // Sample Access Review items
  const demoAccess = [
    { id: uid(), text: "Quarterly access review — Finance group", owner: "IT Ops", due: "2025-09-30", done: false },
    { id: uid(), text: "Deprovision terminated users (last 30 days)", owner: "Helpdesk", due: "2025-08-31", done: false },
    { id: uid(), text: "Privileged accounts re-certification", owner: "Security", due: "2025-10-15", done: false }
  ];

  // Merge (기존 데이터 보존, 중복 최소화)
  const titles = new Set(state.incidents.map(i=>i.title));
  demoIncidents.forEach(i => { if(!titles.has(i.title)) state.incidents.unshift(i); });
  state.access = [...demoAccess, ...state.access];

  // Fill log parser demo text
  const logBox = document.querySelector('#logInput');
  if (logBox && !logBox.value.trim()){
    logBox.value = [
      "[2025-08-18T12:00:00Z] INFO connected",
      "[2025-08-18T12:01:00Z] ERROR auth failed",
      "[2025-08-18T12:02:00Z] WARN  high latency to db",
      "[2025-08-18T12:03:00Z] INFO  backup job started",
      "[2025-08-18T12:05:00Z] ERROR backup exit code 1"
    ].join("\n");
    const filt = document.querySelector('#logFilter');
    if (filt) filt.value = "ERROR|WARN";
  }

  saveState();
  renderIncidents();
  renderAccess();
  alert("Sample data loaded!");
}

// 버튼 이벤트 연결 (로드 시 안전하게 바인딩)
window.addEventListener('load', ()=>{
  const btn = document.getElementById('loadDemoBtn');
  if (btn) btn.addEventListener('click', loadDemoData);
});

// ===== Utilities for time math =====
function toDate(val){ try{return val?new Date(val):null}catch{return null} }
function avgMs(arr){ if(!arr.length) return null; return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); }
function fmtDur(ms){
  if(ms==null) return '–';
  const s = Math.round(ms/1000);
  if(s<60) return `${s}s`;
  const m = Math.round(s/60); if(m<60) return `${m}m`;
  const h = Math.round(m/60); if(h<48) return `${h}h`;
  const d = Math.round(h/24); return `${d}d`;
}

// ===== KPIs (Open, MTTA, MTTR) =====
function computeKPIs(){
  const open = state.incidents.filter(i=>i.status!=='Resolved').length;

  const mttas = []; // created -> acknowledged
  const mttrs = []; // created(or acknowledged) -> resolved

  state.incidents.forEach(i=>{
    const created = toDate(i.when);
    const ack = toDate(i.ack);
    const res = toDate(i.resolved);
    if(created && ack) mttas.push(ack - created);
    if(res){
      mttrs.push((ack||created) ? (res - (ack||created)) : (res - created));
    }
  });

  const mtta = avgMs(mttas);
  const mttr = avgMs(mttrs);

  qs('#kOpen').textContent = open;
  qs('#kMTTA').textContent = fmtDur(mtta);
  qs('#kMTTR').textContent = fmtDur(mttr);
}

// Recompute after renders or state changes
const _renderIncidents = renderIncidents;
renderIncidents = function(filter=''){
  _renderIncidents(filter);
  computeKPIs();
  drawSevChart();
};
const _renderAccess = renderAccess;
renderAccess = function(){
  _renderAccess();
  computeKPIs();
};

// ===== Severity distribution chart =====
let sevChart;
function drawSevChart(){
  const ctx = qs('#sevChart');
  if(!ctx) return;
  const counts = {Low:0, Medium:0, High:0, Critical:0};
  state.incidents.forEach(i=>{ counts[i.severity] = (counts[i.severity]||0)+1; });
  const data = [counts.Low||0, counts.Medium||0, counts.High||0, counts.Critical||0];

  if(sevChart) { sevChart.data.datasets[0].data = data; sevChart.update(); return; }
  sevChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Low','Medium','High','Critical'],
      datasets: [{ label: 'Incidents', data }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display:false } },
      scales: { y: { beginAtZero: true, ticks: { precision:0 } } }
    }
  });
}

// ===== Extend Incident form to capture ack/resolved/evidence =====
const _saveIncidentBtn = qs('#saveIncidentBtn');
if(_saveIncidentBtn){
  _saveIncidentBtn.addEventListener('click', ()=>{
    // Patch last saved object to include extra fields
    // (We intercept by replacing the last-added or edited item based on id)
    const id = state.editingIncidentId;
    const iAck = qs('#iAck')?.value || '';
    const iResolved = qs('#iResolved')?.value || '';
    const evid = qs('#iEvidence')?.value || '';
    function patch(o){
      return { ...o, ack: iAck, resolved: iResolved, evidence: evid.split(',').map(s=>s.trim()).filter(Boolean) }
    }
    if(id){
      state.incidents = state.incidents.map(x=>x.id===id?patch(x):x);
    } else if(state.incidents.length){
      state.incidents[0] = patch(state.incidents[0]); // last insert is at [0]
    }
    saveState(); computeKPIs(); drawSevChart();
  });
}

// ===== Row actions: Edit/Delete/Report =====
const _renderIncidentsRows = () => {
  const tb = qs('#incidentsTable tbody');
  if(!tb) return;
  qsa('button.edit', tb).forEach(b=>b.addEventListener('click', ()=>editIncident(b.dataset.id)));
  qsa('button.del', tb).forEach(b=>b.addEventListener('click', ()=>deleteIncident(b.dataset.id)));
  qsa('button.report', tb).forEach(b=>b.addEventListener('click', ()=>reportIncidentPDF(b.dataset.id)));
};
// re-bind after each render
const _origRender = _renderIncidents;
_renderIncidents.bind = function(){};
const _tbRender = qs('#incidentsTable tbody');
new MutationObserver(_renderIncidentsRows).observe(qs('#incidentsTable tbody'), {childList:true});

// ===== Incident PDF (jsPDF) =====
function reportIncidentPDF(id){
  const i = state.incidents.find(x=>x.id===id);
  if(!i) return alert('Incident not found');
  const doc = new jspdf.jsPDF({unit:'pt', format:'a4'});
  const lh = 18, margin = 48; let y = margin;

  function addLine(text, bold=false){
    doc.setFont('Helvetica', bold? 'bold':'normal'); doc.setFontSize(12);
    const lines = doc.splitTextToSize(text, 515);
    lines.forEach(line=>{ doc.text(line, margin, y); y += lh; });
  }

  doc.setFont('Helvetica','bold'); doc.setFontSize(18); doc.text('Incident Report', margin, y); y+=24;
  addLine(`Title: ${i.title}`, true);
  addLine(`Severity: ${i.severity} | Status: ${i.status}`);
  addLine(`Occurred: ${i.when || ''}`);
  addLine(`Acknowledged: ${i.ack || '—'} | Resolved: ${i.resolved || '—'}`);
  addLine(`Tags: ${(i.tags||[]).join(', ')}`);
  y+=6; addLine('Description:', true);
  addLine(i.desc || '—');
  if(i.evidence && i.evidence.length){
    y+=6; addLine('Evidence URLs:', true);
    i.evidence.forEach((u, idx)=> addLine(`${idx+1}. ${u}`));
  }
  y+=12; addLine(`Generated: ${new Date().toLocaleString()}`);
  doc.save(`incident_${(i.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.pdf`);
}

// ===== Demo seeding (button) =====
function loadDemoData(){
  const now = Date.now();
  const demoIncidents = [
    { id: uid(), title: "Alert noise after new IDS rule", severity: "Medium", status: "In Progress",
      tags:["ids","tuning","noise"], when: new Date(now-3600e3*6).toISOString().slice(0,16),
      ack: new Date(now-3600e3*5.5).toISOString().slice(0,16), resolved:"",
      desc:"Spike after new rule set. Narrow rule scope; allowlist known subnets; schedule post-change review.",
      evidence:["https://example.com/ids-diff","https://example.com/allowlist-change"] },
    { id: uid(), title: "Unauthorized admin login attempts", severity: "High", status: "Resolved",
      tags:["iam","auth","bruteforce"], when: new Date(now-3600e3*30).toISOString().slice(0,16),
      ack: new Date(now-3600e3*29.7).toISOString().slice(0,16), resolved: new Date(now-3600e3*28).toISOString().slice(0,16),
      desc:"Multiple failed admin logins from foreign ASN. Enforced MFA, temp IP block, rotated creds; reviewed audit logs.",
      evidence:["https://example.com/mfa-policy","https://example.com/waf-block"] },
    { id: uid(), title: "Backup job failure on WS2016-DB01", severity: "Medium", status: "Open",
      tags:["backup","ws2016","jobs"], when: new Date(now-3600e3*48).toISOString().slice(0,16),
      ack:"", resolved:"",
      desc:"Nightly backup exit code 1. Check quota, restart agent, rerun incremental; full backup planned.",
      evidence:["https://example.com/backup-logs"] }
  ];
  const demoAccess = [
    { id: uid(), text: "Quarterly access review — Finance group", owner: "IT Ops", due: "2025-09-30", done: false },
    { id: uid(), text: "Deprovision terminated users (last 30 days)", owner: "Helpdesk", due: "2025-08-31", done: false },
    { id: uid(), text: "Privileged accounts re-certification", owner: "Security", due: "2025-10-15", done: false }
  ];
  // Merge
  const titles = new Set(state.incidents.map(i=>i.title));
  demoIncidents.forEach(i => { if(!titles.has(i.title)) state.incidents.unshift(i); });
  state.access = [...demoAccess, ...state.access];
  saveState(); renderIncidents(); renderAccess(); computeKPIs(); drawSevChart();
  alert("Sample data loaded!");
}

// Bind sample-data button
window.addEventListener('load', ()=>{
  const btn = document.getElementById('loadDemoBtn');
  if(btn){ btn.addEventListener('click', loadDemoData); }
  computeKPIs(); drawSevChart();
});

