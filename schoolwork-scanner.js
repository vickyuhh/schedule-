(function(){
'use strict';
if(location.hostname!=='learn1.k12.com'){alert('Open a WAVA course at learn1.k12.com first.');return;}
if(document.getElementById('dayflow-scan'))return;
const courses=[['Math','129111'],['English','129235'],['Science','158861'],['Game Design','129316'],['Art History','129414'],['P.E.','129138']];
const pacific=d=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d),v={};p.forEach(x=>v[x.type]=x.value);return v.year+'-'+v.month+'-'+v.day};
const move=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const current=pacific(new Date()),mon=move(current,-((new Date(current+'T12:00:00Z').getUTCDay()+6)%7)),sun=move(mon,6);
const inWeek=s=>s>=mon&&s<=sun;
const date=s=>{if(!s)return '';const d=new Date(s);return Number.isNaN(d.getTime())?'':pacific(d)};
const url=s=>{try{const v=new URL(s,location.origin);return v.protocol==='https:'?v.href:''}catch{return ''}};
const title=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,180);
const months={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function datedModule(m){
if(inWeek(date(m.unlock_at)))return true;
const s=String(m.name||'').toLowerCase(),possible=[...s.matchAll(/\b20\d{2}-\d{2}-\d{2}\b/g)].map(x=>x[0]),yr=mon.slice(0,4);
for(const x of s.matchAll(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s+(20\d{2}))?/g))possible.push((x[3]||yr)+'-'+String(months[x[1].slice(0,3)]).padStart(2,'0')+'-'+x[2].padStart(2,'0'));
for(const x of s.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}|\d{2}))?\b/g))possible.push((x[3]?(x[3].length===2?'20'+x[3]:x[3]):yr)+'-'+x[1].padStart(2,'0')+'-'+x[2].padStart(2,'0'));
return possible.some(inWeek);
}
async function all(path){
let next=new URL(path,location.origin),out=[],n=0;
while(next&&n++<12){
if(next.origin!==location.origin)throw Error('Unexpected API origin');
const res=await fetch(next.href,{credentials:'same-origin',headers:{Accept:'application/json'}});
if(!res.ok)throw Error('HTTP '+res.status+' on '+next.pathname);
if(!(res.headers.get('content-type')||'').includes('json'))throw Error('Login expired or Canvas API unavailable');
const rows=await res.json();if(!Array.isArray(rows))throw Error('Invalid course API response');
out.push(...rows);
const m=(res.headers.get('link')||'').match(/<([^>]+)>;\s*rel="next"/i);
next=m?new URL(m[1],location.origin):null;
}
if(next)throw Error('Too many pages to scan');
return out;
}
const el=document.createElement('section');el.id='dayflow-scan';
el.style.cssText='position:fixed;z-index:2147483647;top:12px;right:12px;left:12px;max-width:620px;max-height:calc(100vh - 24px);overflow:auto;margin:auto;padding:18px;border:1px solid #77839c;border-radius:16px;background:#141b29;color:#edf2ff;box-shadow:0 15px 80px #000a;font:14px/1.45 system-ui,sans-serif';
el.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><strong style="font-size:20px">📚 DayFlow Monday Scan</strong><button type="button" id="dfClose">Close</button></div><p id="dfState"></p><pre id="dfLog" style="white-space:pre-wrap;max-height:180px;overflow:auto;font-size:12px;color:#c9d4f1"></pre><textarea id="dfText" rows="7" readonly spellcheck="false" style="display:none;width:100%;box-sizing:border-box;background:#0b1220;color:#e2eaff;border:1px solid #56617f;border-radius:8px;padding:8px;font:11px monospace"></textarea><div id="dfActions" style="display:none;gap:8px;margin-top:10px"><button type="button" id="dfCopy">Copy JSON</button><button type="button" id="dfDownload">Download JSON</button></div><p style="font-size:11px;color:#a4b6d1">Read-only. This scan may miss work inside undated weekly pages or outside Canvas. Review each course before relying on the list.</p>';
document.body.append(el);
const q=s=>el.querySelector('#'+s),log=s=>q('dfLog').textContent+=s+'\n',status=s=>q('dfState').textContent=s;
el.querySelectorAll('button').forEach(b=>b.style.cssText='cursor:pointer;border:1px solid #53617f;border-radius:8px;padding:8px 12px;background:#303d61;color:white');
q('dfClose').onclick=()=>el.remove();
async function scanCourse(name,id){
const base='/api/v1/courses/'+id,warning=[],out=[];
let assignments=[],modules=[],assignOk=false,modulesOk=false;
try{assignments=await all(base+'/assignments?per_page=100&include%5B%5D=submission');assignOk=true}catch(e){warning.push('Assignments inaccessible: '+e.message)}
try{modules=await all(base+'/modules?per_page=100&include%5B%5D=items&include%5B%5D=content_details');modulesOk=true}catch(e){warning.push('Modules inaccessible: '+e.message)}
if(!assignOk||!modulesOk)throw Error(warning.join('; '));
const lookup=new Map(assignments.map(a=>[String(a.id),a]));
for(const a of assignments){
if(a.published===false)continue;
const due=date(a.due_at);if(!due||!inWeek(due))continue;
const sub=a.submission||{},done=Boolean(sub.submitted_at||['submitted','graded'].includes(sub.workflow_state));
out.push({title:title(a.name),due,url:url(a.html_url||location.origin+base+'/assignments/'+a.id),notes:'Due this week',done});
}
let matched=0;
for(const module of modules){
if(!datedModule(module))continue;matched++;
let items=Array.isArray(module.items)?module.items:null;
if(!items){try{items=await all(base+'/modules/'+module.id+'/items?per_page=100')}catch(e){warning.push('Failed to read '+module.name+': '+e.message);continue}}
for(const item of items){
if(item.type==='SubHeader')continue;
const a=lookup.get(String(item.content_id))||{},due=date(item.content_details?.due_at)||date(a.due_at),name=title(item.title||a.name);
if(!name)continue;
out.push({title:name,due,url:url(item.html_url||item.external_url||location.origin+base+'/modules'),notes:('Weekly module: '+module.name).slice(0,300),done:item.completion_requirement?.completed===true});
}
}
if(modules.length&&!matched)warning.push('Could not identify dated weekly modules; check weekly lesson pages.');
const unique=new Map();for(const a of out){const key=a.title.toLowerCase()+'|'+a.due; if(unique.has(key))unique.get(key).done ||= a.done;else unique.set(key,a)}
if(unique.size>100)throw Error('More than 100 activities found; review course module dates');
if(!unique.size)warning.push('No dated work detected — not proof of an empty week.');
return {assignments:[...unique.values()],warning};
}
async function scan(){
const payload={format:'DAYFLOW_SCHOOLWORK_V1',weekStart:mon,source:'DayFlow scanner',scannedAt:new Date().toISOString(),courses:[],scanErrors:[]};
for(let i=0;i<courses.length;i++){
const [name,id]=courses[i];status('Scanning '+name+' ('+(i+1)+'/6) for '+mon+' to '+sun+'…');
try{const r=await scanCourse(name,id);payload.courses.push({name,url:location.origin+'/courses/'+id,assignments:r.assignments});log('✓ '+name+': '+r.assignments.length+' activities');r.warning.forEach(w=>log('  ⚠ '+w))}
catch(e){payload.scanErrors.push(name+': '+e.message);payload.courses.push({name,url:location.origin+'/courses/'+id,assignments:[]});log('✕ '+name+': '+e.message)}
}
const count=payload.courses.reduce((n,c)=>n+c.assignments.length,0);
status(payload.scanErrors.length?'Scan incomplete — fix course errors before importing.':'Scan finished: '+count+' activities. Verify undated work.');
q('dfText').value=JSON.stringify(payload,null,2);q('dfText').style.display='block';q('dfActions').style.display='flex';
q('dfCopy').onclick=async()=>{try{await navigator.clipboard.writeText(q('dfText').value);status('JSON copied! Transfer to phone and import in DayFlow Schoolwork.')}catch(e){q('dfText').focus();q('dfText').select();status('Copy the selected JSON manually.')}};
q('dfDownload').onclick=()=>{const blob=new Blob([q('dfText').value],{type:'application/json'}),ref=URL.createObjectURL(blob),a=document.createElement('a');a.href=ref;a.download='DayFlow_'+mon+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(ref),3000)};
}
scan().catch(e=>status('Scan failed: '+e.message));
})();