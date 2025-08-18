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
