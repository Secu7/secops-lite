// ===== State & helpers =====
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

// ===== Tabs =====
qsa('.tab').forEach(b=>b.addEventListener('click',e=>{
  qsa('.tab').forEach(x=>x.classList.remove('active')); e.currentTarget.classList.add('active');
  qsa('.tab-panel').forEach(p=>p.classList.remove('active')); qs('#'+e.currentTarget.dataset.tab).classList.add('active');
}));

// ===== Theme =====
qs('#darkModeBtn').addEventListener('click', ()=> document.documentElement.classList.toggle('light'));

// ===== Incidents =====
function renderIncidents(filter=''){
  const tb = qs('#incidentsTable tbody'); if(!tb) return;
  tb.innerHTML = '';
  state.incidents
    .filter(i => (`${i.title} ${i.severity} ${i.status} ${(i.tags||[]).join(' ')}`).toLowerCase().includes(filter.toLowerCase()))
    .forEach(i=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${i.title}</td>
        <td><span class="badge">${i.severity}</span></td>
        <td>${i.status}</td>
        <td>${dt(i.when)}</td>
        <td>${(i.tags||[]).join(', ')}</td>
        <td>
          <button class="small edit" data-id="${i.id}">Edit</button>
          <button class="small danger del" data-id="${i.id}">Del</button>
          <button class="small report" data-id="${i.id}">Report</button>
        </td>`;
      tb.appendChild(tr);
    });
  // bind actions
  qsa('button.edit', tb).forEach(b=>b.addEventListener('click', ()=>editIncident(b.dataset.id)));
  qsa('button.del', tb).forEach(b=>b.addEventListener('click', ()=>delIncident(b.dataset.id)));
  qsa('button.report', tb).forEach(b=>b.addEventListener('click', ()=>reportIncidentPDF(b.dataset.id)));
}
renderIncidents();

// form open/close
function openIncidentForm(edit=false){ qs('#incidentForm').classList.remove('hidden'); qs('#formTitle').textContent = edit?'Edit Incident':'New Incident'; }
function closeIncidentForm(){
  qs('#incidentForm').classList.add('hidden');
  ['#iTitle','#iTags','#iDesc','#iWhen','#iAck','#iResolved','#iEvidence'].forEach(s=>{const el=qs(s); if(el) el.value='';});
  qs('#iSeverity').value='Low'; qs('#iStatus').value='Open'; state.editingIncidentId=null;
}
qs('#newIncidentBtn').addEventListener('click', ()=>openIncidentForm(false));
qs('#cancelIncidentBtn').addEventListener('click', closeIncidentForm);
qs('#searchIncidents').addEventListener('input', e=>renderIncidents(e.target.value));

// save
qs('#saveIncidentBtn').addEventListener('click', ()=>{
  const obj = {
    id: state.editingIncidentId || uid(),
    title: qs('#iTitle').value.trim(),
    severity: qs('#iSeverity').value,
    status: qs('#iStatus').value,
    tags: qs('#iTags').value.split(',').map(s=>s.trim()).filter(Boolean),
    when: qs('#iWhen').value,
    ack: qs('#iAck').value || '',
    resolved: qs('#iResolved').value || '',
    evidence: (qs('#iEvidence').value||'').split(',').map(s=>s.trim()).filter(Boolean),
    desc: qs('#iDesc').value.trim(),
  };
  if(!obj.title){ alert('Title required'); return; }
  if(state.editingIncidentId) state.incidents = state.incidents.map(i=>i.id===obj.id?obj:i);
  else state.incidents.unshift(obj);
  saveState(); renderIncidents(qs('#searchIncidents').value); computeKPIs(); drawSevChart(); closeIncidentForm();
});
function editIncident(id){
  const i = state.incidents.find(x=>x.id===id); if(!i) return;
  openIncidentForm(true); state.editingIncidentId=id;
  qs('#iTitle').value=i.title; qs('#iSeverity').value=i.severity; qs('#iStatus').value=i.status;
  qs('#iTags').value=(i.tags||[]).join(', '); qs('#iWhen').value=i.when||'';
  qs('#iAck').value=i.ack||''; qs('#iResolved').value=i.resolved||'';
  qs('#iEvidence').value=(i.evidence||[]).join(', ');
  qs('#iDesc').value=i.desc||'';
}
function delIncident(id){
  if(!confirm('Delete this incident?')) return;
  state.incidents = state.incidents.filter(i=>i.id!==id);
  saveState(); renderIncidents(qs('#searchIncidents').value); computeKPIs(); drawSevChart();
}

// CSV export
qs('#exportCsvBtn').addEventListener('click', ()=>{
  const rows = [['Title','Severity','Status','When','Ack','Resolved','Tags','Evidence','Description']];
  state.incidents.forEach(i=>rows.push([
    i.title,i.severity,i.status,i.when||'',i.ack||'',i.resolved||'',
    (i.tags||[]).join('|'), (i.evidence||[]).join('|'), i.desc||''
  ]));
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
  r.onload = ()=>{ try{
    const obj = JSON.parse(r.result);
    if(Array.isArray(obj.incidents)) state.incidents=obj.incidents;
    if(Array.isArray(obj.access)) state.access=obj.access;
    saveState(); renderIncidents(); renderAccess(); computeKPIs(); drawSevChart();
    alert('Import successful');
  }catch{ alert('Invalid JSON'); } };
  r.readAsText(f);
});

// ===== Access Review =====
function renderAccess(){
  const tb = qs('#accessTable tbody'); if(!tb) return;
  tb.innerHTML='';
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

// ===== Log Parser =====
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

// ===== KPIs & Chart =====
function toDate(v){ try{return v?new Date(v):null}catch{return null} }
function avgMs(a){ if(!a.length) return null; return Math.round(a.reduce((x,y)=>x+y,0)/a.length); }
function fmt(ms){ if(ms==null) return '–'; const s=Math.round(ms/1000); if(s<60) return s+'s'; const m=Math.round(s/60); if(m<60) return m+'m'; const h=Math.round(m/60); if(h<48) return h+'h'; return Math.round(h/24)+'d'; }
function computeKPIs(){
  const open = state.incidents.filter(i=>i.status!=='Resolved').length;
  const mttas=[], mttrs=[];
  state.incidents.forEach(i=>{
    const created=toDate(i.when), ack=toDate(i.ack), res=toDate(i.resolved);
    if(created&&ack) mttas.push(ack-created);
    if(res) mttrs.push((ack||created)?(res-(ack||created)):(res-created));
  });
  const kOpen= qs('#kOpen'); if(kOpen) kOpen.textContent=open;
  const k1 = qs('#kMTTA'); if(k1) k1.textContent=fmt(avgMs(mttas));
  const k2 = qs('#kMTTR'); if(k2) k2.textContent=fmt(avgMs(mttrs));
}
let sevChart;
function drawSevChart(){
  const ctx = qs('#sevChart'); if(!ctx) return;
  const counts = {Low:0,Medium:0,High:0,Critical:0};
  state.incidents.forEach(i=>counts[i.severity]=(counts[i.severity]||0)+1);
  const data=[counts.Low||0,counts.Medium||0,counts.High||0,counts.Critical||0];
  if(sevChart){ sevChart.data.datasets[0].data=data; return sevChart.update(); }
  sevChart = new Chart(ctx, { type:'bar',
    data:{ labels:['Low','Medium','High','Critical'], datasets:[{label:'Incidents', data}] },
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true,ticks:{precision:0}}} }
  });
}

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
  y+=6; addLine('Description:', true); addLine(i.desc || '—');
  if(i.evidence && i.evidence.length){ y+=6; addLine('Evidence URLs:', true); i.evidence.forEach((u, idx)=> addLine(`${idx+1}. ${u}`)); }
  y+=12; addLine(`Generated: ${new Date().toLocaleString()}`);
  doc.save(`incident_${(i.title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.pdf`);
}

// ===== Demo seed =====
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
  const titles = new Set(state.incidents.map(i=>i.title));
  demoIncidents.forEach(i => { if(!titles.has(i.title)) state.incidents.unshift(i); });
  state.access = [...demoAccess, ...state.access];
  saveState(); renderIncidents(); renderAccess(); computeKPIs(); drawSevChart();
  alert("Sample data loaded!");
}
window.addEventListener('load', ()=>{
  const btn = document.getElementById('loadDemoBtn'); if(btn) btn.addEventListener('click', loadDemoData);
  computeKPIs(); drawSevChart();
});
