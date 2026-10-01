// Teacher Studio registration report (organizer-only page).
// Data is stored encrypted in data.enc.json; it's decrypted here with the
// password (PBKDF2-SHA256 -> AES-GCM) and then rendered.
(function(){
'use strict';
const KEY='ts-regdata-pw';
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function decrypt(pw){
  const enc=await fetch('data.enc.json',{cache:'no-cache'}).then(r=>r.json());
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(enc.salt),iterations:enc.iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(enc.iv)},key,b64(enc.data));
  return JSON.parse(new TextDecoder().decode(plain));
}
const gate=document.getElementById('gate'), form=document.getElementById('gate-form'), pw=document.getElementById('pw'), err=document.getElementById('gate-err'), btn=document.getElementById('gate-btn');
async function unlock(p,remember){
  const D=await decrypt(p);
  if(remember){try{sessionStorage.setItem(KEY,p)}catch(e){}}
  gate.hidden=true; document.getElementById('report').hidden=false;
  render(D);
}
form.addEventListener('submit',async e=>{
  e.preventDefault(); err.textContent=''; btn.disabled=true; btn.textContent='Checking…';
  try{ await unlock(pw.value,true); }
  catch(x){ err.textContent=(x&&x.name==='OperationError')?'That password didn\'t work. Check it and try again.':'The data couldn\'t be loaded. Refresh the page and try again.'; pw.select(); }
  finally{ btn.disabled=false; btn.textContent='View the data'; }
});
let saved=null; try{saved=sessionStorage.getItem(KEY)}catch(e){}
if(saved){ unlock(saved,false).catch(()=>{try{sessionStorage.removeItem(KEY)}catch(e){}}); }

function render(D){

const $ = s => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = n => n.toLocaleString('en-US');
function el(tag, attrs={}, parent){const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e}
function txt(parent,x,y,s,cls,anchor='start',extra={}){const t=el('text',{x,y,class:cls||'', 'text-anchor':anchor,...extra},parent);t.textContent=s;return t}
const tip=$('#tip');
function bindTip(node,html){
  const show=e=>{tip.innerHTML=html;tip.style.opacity=1;move(e)};
  const move=e=>{const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY-h-10;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y<8)y=e.clientY+16;tip.style.left=x+'px';tip.style.top=y+'px'};
  node.addEventListener('mouseenter',show);node.addEventListener('mousemove',move);node.addEventListener('mouseleave',()=>tip.style.opacity=0);
  node.addEventListener('touchstart',e=>{show(e.touches[0])},{passive:true});
}
// rounded-top bar path (square at baseline)
function barV(x,y,w,h,r=4){r=Math.min(r,h,w/2);if(h<=0)return '';return `M${x},${y+h}V${y+r}Q${x},${y} ${x+r},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h}Z`}
function barH(x,y,w,h,r=4){r=Math.min(r,w,h/2);if(w<=0)return '';return `M${x},${y}H${x+w-r}Q${x+w},${y} ${x+w},${y+r}V${y+h-r}Q${x+w},${y+h} ${x+w-r},${y+h}H${x}Z`}
function niceMax(v,step){return Math.ceil(v/step)*step}

// ---------- KPIs
const T=D.totals;
const kp=[[fmt(T.regs),'registrations, Nov 2022 – Oct 2026'],[fmt(T.people),'distinct people'],[T.workshops,'workshops held (plus Oct 2026, upcoming)'],[Math.round(100*T.onetime/T.people)+'%','of people registered only once'],[T.regs_from_repeat+'%','of registrations came from people who returned']];
$('#kpis').innerHTML=kp.map(([b,s])=>`<div class="kpi"><b>${b}</b><span>${s}</span></div>`).join('');

// ---------- takeaways
const take=[
 `<strong>Growth came in bursts.</strong> Nov and Dec 2024 brought in 83 first-time registrants, a quarter of everyone who has ever signed up. 2025–26 drew fewer people than 2024–25 (116 vs. 170) but still far more than the first two years.`,
 `<strong>Timing matters more than topic.</strong> November and December run well above a typical month every year. September, January and May run below. Average turnout is nearly the same across the four topic themes.`,
 `<strong>A loyal core sustains the series.</strong> 64% of people registered once. The 37 people with four or more registrations account for 36% of all sign-ups.`,
 `<strong>Newcomers return less often than they used to.</strong> 60% of the first cohort came back. For the 2024–25 cohort it was 34%. The most direct lever is a follow-up to first-timers.`,
 `<strong>Out-of-state participants are your stickiest.</strong> People from other states return at 54%, compared with 32% for Wisconsin. Most of them join on Zoom. Classroom teachers are the largest role, and higher-ed people, museum educators and public librarians return most often.`
];
$('#take').innerHTML=take.map(t=>`<li>${t}</li>`).join('');

// ---------- C1 workshops stacked
(function(){
  const W=D.workshops, host=$('#c-workshops');
  const w=Math.max(760,W.length*30), h=300, m={t:18,r:8,b:58,l:34};
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'Registrations per workshop, split into first-time and returning registrants'},host);
  svg.style.minWidth='700px';
  const max=niceMax(Math.max(...W.map(d=>d.total)),20), iw=w-m.l-m.r, ih=h-m.t-m.b;
  const y=v=>m.t+ih-v/max*ih, band=iw/W.length, bw=Math.min(22,band-6);
  for(let v=0;v<=max;v+=20){el('line',{x1:m.l,x2:w-m.r,y1:y(v),y2:y(v),class:v?'gl':'base'},svg);txt(svg,m.l-6,y(v)+3.5,v,'tick','end')}
  let prevSeason=null;
  W.forEach((d,i)=>{
    const x=m.l+i*band+(band-bw)/2;
    if(d.season!==prevSeason){ if(prevSeason){el('line',{x1:m.l+i*band,x2:m.l+i*band,y1:m.t,y2:h-m.b+44,class:'gl'},svg)} if(W.filter(z=>z.season===d.season).length>1) txt(svg,m.l+i*band+4,h-6,d.season,'tick'); prevSeason=d.season;}
    const g=el('g',{class:'hov'},svg);
    const yNew=y(d.new), hNew=ih-(yNew-m.t), gap=d.ret&&d.new?2:0;
    // new = bottom (blue), returning stacked above
    if(d.ret) el('path',{d:barV(x,y(d.total),bw,(y(d.new)-y(d.total))-gap),fill:'var(--s2)',class:'m'},g);
    if(d.new) el('path',{d:d.ret?`M${x},${m.t+ih}V${yNew}H${x+bw}V${m.t+ih}Z`:barV(x,yNew,bw,hNew),fill:'var(--s1)',class:'m'},g);
    txt(g,x+bw/2,h-m.b+14,d.label.slice(0,3),'tick','middle');
    if(d.total>=35) txt(g,x+bw/2,y(d.total)-5,d.total,'val','middle');
    const hit=el('rect',{x:m.l+i*band,y:m.t,width:band,height:ih,class:'hit'},g);
    bindTip(hit,`<b>${d.label}</b> · ${d.topic||'<i>topic not in archive</i>'}<br>${d.total} registered · ${d.new} new · ${d.ret} returning${d.upcoming?'<br>Upcoming, registration open':''}`);
  });
  // annotation
  const i=W.findIndex(d=>d.label==='Dec 2024');
  txt(svg,m.l+i*band+band+6,y(71)+10,'Canva, Dec 2024: 50 first-timers','lab');
})();

// season table
$('#t-seasons').innerHTML='<tr><th>Season</th><th class="n">Workshops</th><th class="n">People</th><th class="n">New</th><th class="n">Avg / workshop</th></tr>'+D.seasons.filter(s=>s.season!=='2026–27').map(s=>`<tr><td>${s.season}</td><td class="n">${s.workshops}</td><td class="n">${s.people}</td><td class="n">${s.new}</td><td class="n">${s.avg}</td></tr>`).join('');

// cumulative line
(function(){
  const W=D.workshops; let c=0; const pts=W.map(d=>({l:d.label,v:(c+=d.new)}));
  const host=$('#c-cum'), w=460,h=200,m={t:14,r:44,b:24,l:34};
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'Cumulative unique registrants over time'},host);
  const max=350, iw=w-m.l-m.r, ih=h-m.t-m.b, x=i=>m.l+i/(pts.length-1)*iw, y=v=>m.t+ih-v/max*ih;
  for(let v=0;v<=max;v+=100){el('line',{x1:m.l,x2:w-m.r,y1:y(v),y2:y(v),class:v?'gl':'base'},svg);txt(svg,m.l-6,y(v)+3.5,v,'tick','end')}
  ['Nov 2022','Nov 2023','Nov 2024','Nov 2025'].forEach(l=>{const i=pts.findIndex(p=>p.l===l);txt(svg,x(i),h-6,l.slice(4),'tick','middle')});
  const dpath=pts.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.v)}`).join('');
  el('path',{d:dpath+`L${x(pts.length-1)},${y(0)}L${x(0)},${y(0)}Z`,fill:'var(--s1)',opacity:.1},svg);
  el('path',{d:dpath,fill:'none',stroke:'var(--s1)','stroke-width':2,'stroke-linejoin':'round','stroke-linecap':'round'},svg);
  const L=pts.length-1; el('circle',{cx:x(L),cy:y(pts[L].v),r:4.5,fill:'var(--s1)',stroke:'var(--surface)','stroke-width':2},svg);
  txt(svg,x(L)+8,y(pts[L].v)+4,pts[L].v,'val');
  pts.forEach((p,i)=>{const r=el('rect',{x:x(i)-iw/pts.length/2,y:m.t,width:iw/pts.length,height:ih,class:'hit'},svg);bindTip(r,`<b>${p.l}</b><br>${p.v} people so far`)});
})();

// ---------- month index
(function(){
  const M=D.months, host=$('#c-month'), w=460,h=230,m={t:16,r:8,b:26,l:34};
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'Average turnout index by month'},host);
  const max=2, iw=w-m.l-m.r, ih=h-m.t-m.b, band=iw/M.length, bw=Math.min(24,band-10), y=v=>m.t+ih-v/max*ih;
  [0,.5,1,1.5,2].forEach(v=>{el('line',{x1:m.l,x2:w-m.r,y1:y(v),y2:y(v),class:v?'gl':'base'},svg);txt(svg,m.l-6,y(v)+3.5,v.toFixed(1),'tick','end')});
  el('line',{x1:m.l,x2:w-m.r,y1:y(1),y2:y(1),class:'ref'},svg); txt(svg,m.l+4,y(1)-5,'typical month','tick','start');
  M.forEach((d,i)=>{const x=m.l+i*band+(band-bw)/2;const g=el('g',{class:'hov'},svg);
    el('path',{d:barV(x,y(d.avg_index),bw,ih-(y(d.avg_index)-m.t)),fill:'var(--s1)',class:'m'},g);
    txt(g,x+bw/2,y(d.avg_index)-5,d.avg_index.toFixed(2),'val','middle');
    txt(g,x+bw/2,h-8,d.month,'tick','middle');
    const r=el('rect',{x:m.l+i*band,y:m.t,width:band,height:ih,class:'hit'},g);
    bindTip(r,`<b>${d.month}</b> · average index ${d.avg_index}<br>${d.n} workshops, registrations: ${d.totals.join(', ')}`)});
})();

// ---------- theme strip
(function(){
  const W=D.workshops.filter(d=>d.theme&&d.index!=null), themes=['Build & tinker','Fiber, paper & print','Coding & digital','Light, art & data'];
  const host=$('#c-theme'), w=460,h=230,m={t:10,r:16,b:30,l:150};
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'Turnout index of each workshop grouped by topic theme'},host);
  const max=2.5, iw=w-m.l-m.r, ih=h-m.t-m.b, rowH=ih/themes.length, x=v=>m.l+v/max*iw;
  [0,.5,1,1.5,2,2.5].forEach(v=>{el('line',{x1:x(v),x2:x(v),y1:m.t,y2:h-m.b,class:v?'gl':'base'},svg);txt(svg,x(v),h-m.b+14,v.toFixed(1),'tick','middle')});
  el('line',{x1:x(1),x2:x(1),y1:m.t,y2:h-m.b,class:'ref'},svg);
  txt(svg,(m.l+w-m.r)/2,h-2,'turnout index (1.0 = typical month that season)','tick','middle');
  themes.forEach((t,ti)=>{
    const cy=m.t+rowH*ti+rowH/2, ds=W.filter(d=>d.theme===t);
    const avg=ds.reduce((a,d)=>a+d.index,0)/ds.length;
    txt(svg,m.l-10,cy-2,t,'lab','end'); txt(svg,m.l-10,cy+12,`n=${ds.length} · avg ${avg.toFixed(2)}`,'tick','end');
    el('line',{x1:x(avg),x2:x(avg),y1:cy-12,y2:cy+12,stroke:'var(--ink)','stroke-width':2},svg);
    ds.forEach((d,k)=>{const jitter=((k%3)-1)*6;
      const c=el('circle',{cx:x(d.index),cy:cy+jitter,r:5,fill:'var(--s1)','fill-opacity':.8,stroke:'var(--surface)','stroke-width':2},svg);
      const hit=el('circle',{cx:x(d.index),cy:cy+jitter,r:10,class:'hit'},svg);
      bindTip(hit,`<b>${d.topic}</b><br>${d.label} · ${d.total} registered · index ${d.index}`)});
  });
})();

// workshop table
(function(){
  const W=[...D.workshops].filter(d=>!d.upcoming).sort((a,b)=>b.index-a.index);
  $('#t-workshops').innerHTML='<tr><th>Workshop</th><th>Topic</th><th>Theme</th><th class="n">Registered</th><th class="n">New</th><th class="n">Index</th></tr>'+W.map(d=>`<tr><td>${d.label}</td><td>${d.topic||'<span style="color:var(--muted)">not in archive</span>'}</td><td>${d.theme||'–'}</td><td class="n">${d.total}</td><td class="n">${d.new}</td><td class="n">${d.index.toFixed(2)}</td></tr>`).join('');
})();

// ---------- generic vertical single-series bars
function vbars(sel,data,{label,value,tipf,h=220,step,fmtv=v=>v,aria}){
  const host=$(sel), w=460, m={t:18,r:8,b:28,l:34};
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':aria},host);
  const vmax=Math.max(...data.map(value)), max=niceMax(vmax,step), iw=w-m.l-m.r, ih=h-m.t-m.b, band=iw/data.length, bw=Math.min(24,band-10), y=v=>m.t+ih-v/max*ih;
  for(let v=0;v<=max;v+=step){el('line',{x1:m.l,x2:w-m.r,y1:y(v),y2:y(v),class:v?'gl':'base'},svg);txt(svg,m.l-6,y(v)+3.5,v,'tick','end')}
  data.forEach((d,i)=>{const x=m.l+i*band+(band-bw)/2, v=value(d), g=el('g',{class:'hov'},svg);
    el('path',{d:barV(x,y(v),bw,ih-(y(v)-m.t)),fill:'var(--s1)',class:'m'},g);
    txt(g,x+bw/2,y(v)-5,fmtv(v),'val','middle'); txt(g,x+bw/2,h-9,label(d),'tick','middle');
    const r=el('rect',{x:m.l+i*band,y:m.t,width:band,height:ih,class:'hit'},g); bindTip(r,tipf(d))});
}
vbars('#c-freq',D.freq,{label:d=>d.bucket,value:d=>d.people,step:50,aria:'People by number of workshops registered for',tipf:d=>`<b>${d.bucket} workshop${d.bucket==='1'?'':'s'}</b><br>${d.people} people · ${d.regs} registrations`});
{const F=D.freq, core=F.filter(f=>['4–5','6–9','10+'].includes(f.bucket)); const cp=core.reduce((a,f)=>a+f.people,0), cr=core.reduce((a,f)=>a+f.regs,0);
 $('#n-freq').innerHTML=`<strong>${cp} people</strong> (${Math.round(100*cp/T.people)}%) registered four or more times and account for <strong>${cr} registrations</strong> (${Math.round(100*cr/T.regs)}%).`;}

// retention grouped bars
(function(){
  const R=D.retention, host=$('#c-ret'), w=460,h=220,m={t:18,r:8,b:28,l:34};
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'Return rate by first-season cohort'},host);
  const iw=w-m.l-m.r, ih=h-m.t-m.b, band=iw/R.length, bw=22, y=v=>m.t+ih-v/100*ih;
  [0,25,50,75,100].forEach(v=>{el('line',{x1:m.l,x2:w-m.r,y1:y(v),y2:y(v),class:v?'gl':'base'},svg);txt(svg,m.l-6,y(v)+3.5,v+'%','tick','end')});
  R.forEach((d,i)=>{const cx=m.l+i*band+band/2, g=el('g',{class:'hov'},svg);
    [[d.pct,'var(--s1)',-bw-1],[d.pct_ns,'var(--s2)',1]].forEach(([v,c,dx])=>{ if(v==null){txt(g,cx+dx+bw/2,y(0)-6,'n/a','tick','middle');return;}
      el('path',{d:barV(cx+dx,y(v),bw,ih-(y(v)-m.t)),fill:c,class:'m'},g); txt(g,cx+dx+bw/2,y(v)-5,v+'%','val','middle')});
    txt(g,cx,h-9,`${d.season} (${d.cohort})`,'tick','middle');
    const r=el('rect',{x:m.l+i*band,y:m.t,width:band,height:ih,class:'hit'},g);
    bindTip(r,`<b>First registered ${d.season}</b><br>${d.cohort} people · ${d.returned} registered again (${d.pct}%)<br>${d.pct_ns==null?'No later season yet':`${d.next_season} came back in a later season (${d.pct_ns}%)`}`)});
})();

// ---------- horizontal bars
function hbars(sel,data,{aria,tipf,right,lw=190,rowH=30,step=50,w=460}){
  const host=$(sel), m={t:6,r:58,b:22,l:lw}, h=m.t+m.b+data.length*rowH;
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':aria},host);
  const max=niceMax(Math.max(...data.map(d=>d.people)),step), iw=w-m.l-m.r, x=v=>m.l+v/max*iw, bh=Math.min(18,rowH-10);
  for(let v=0;v<=max;v+=step){el('line',{x1:x(v),x2:x(v),y1:m.t,y2:h-m.b,class:v?'gl':'base'},svg);txt(svg,x(v),h-6,v,'tick','middle')}
  data.forEach((d,i)=>{const yy=m.t+i*rowH+(rowH-bh)/2, g=el('g',{class:'hov'},svg);
    txt(g,m.l-8,yy+bh/2+4,d.name,'lab','end');
    el('path',{d:barH(x(0),yy,x(d.people)-x(0),bh),fill:'var(--s1)',class:'m'},g);
    txt(g,x(d.people)+6,yy+bh/2+4,right(d),'val');
    const r=el('rect',{x:0,y:m.t+i*rowH,width:w,height:rowH,class:'hit'},g); bindTip(r,tipf(d))});
}
const engTip=d=>`<b>${d.name}</b><br>${d.people} people · ${d.regs} registrations<br>${d.repeat}% registered 2+ times · avg ${d.avg} workshops`;
hbars('#c-role',D.roles,{aria:'People by role group',tipf:engTip,right:d=>`${d.people} · ${d.repeat}%`,step:25});
hbars('#c-org',D.orgs,{aria:'People by organization type',tipf:engTip,right:d=>`${d.people} · ${d.repeat}%`,lw:170});
hbars('#c-orgs',D.topOrgs,{aria:'Organizations with three or more registrants',tipf:d=>`<b>${d.name}</b><br>${d.people} people · ${d.regs} registrations`,right:d=>`${d.people} people`,lw:250,rowH:26,step:5,w:1000});

// region stacked (newcomers by season)
(function(){
  const S=[['Wisconsin','var(--s1)',d=>d.Wisconsin],['Michigan & Illinois','var(--s2)',d=>d.Michigan+d.Illinois],['Other US states','var(--s3)',d=>d['Other US']],['International','var(--s4)',d=>d.International],['Unknown','var(--neutral)',d=>d.Unknown]];
  $('#lg-region').innerHTML=S.map(s=>`<span><i style="background:${s[1]}"></i>${s[0]}</span>`).join('');
  const R=D.newByRegion.filter(r=>r.season!=='2026–27'), host=$('#c-region'), w=460,h=240,m={t:18,r:8,b:26,l:34};
  const svg=el('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':'First-time registrants by location and season'},host);
  const tot=R.map(r=>S.reduce((a,s)=>a+s[2](r),0)), max=niceMax(Math.max(...tot),50), iw=w-m.l-m.r, ih=h-m.t-m.b, band=iw/R.length, bw=24, y=v=>m.t+ih-v/max*ih;
  for(let v=0;v<=max;v+=50){el('line',{x1:m.l,x2:w-m.r,y1:y(v),y2:y(v),class:v?'gl':'base'},svg);txt(svg,m.l-6,y(v)+3.5,v,'tick','end')}
  R.forEach((r,i)=>{const x=m.l+i*band+(band-bw)/2, g=el('g',{class:'hov'},svg); let acc=0;
    S.forEach((s,k)=>{const v=s[2](r); if(!v)return; const y0=y(acc), y1=y(acc+v); acc+=v; const top=k===S.length-1||S.slice(k+1).every(t=>!t[2](r));
      const hh=y0-y1-(top?0:2); el('path',{d:top?barV(x,y1,bw,hh):`M${x},${y1+2}H${x+bw}V${y0}H${x}Z`,fill:s[1],class:'m'},g)});
    txt(g,x+bw/2,y(tot[i])-5,tot[i],'val','middle'); txt(g,x+bw/2,h-8,r.season,'tick','middle');
    const rr=el('rect',{x:m.l+i*band,y:m.t,width:band,height:ih,class:'hit'},g);
    bindTip(rr,`<b>New in ${r.season}</b><br>`+S.map(s=>`${s[0]}: ${s[2](r)}`).join('<br>'))});
})();
$('#t-region').innerHTML='<tr><th>Location</th><th class="n">People</th><th class="n">Returned</th><th class="n">Avg workshops</th></tr>'+D.regions.map(r=>`<tr><td>${r.name}</td><td class="n">${r.people}</td><td class="n">${r.repeat}%</td><td class="n">${r.avg.toFixed(2)}</td></tr>`).join('');

// lead time & weekday
vbars('#c-lead',D.lead,{label:d=>d.bucket,value:d=>d.n,step:50,aria:'Registrations by days before the workshop',tipf:d=>`<b>${d.bucket}</b><br>${d.n} registrations`});
$('#n-lead').innerHTML=`Median lead time is <strong>${D.leadstats.median} days</strong>. ${D.leadstats.within7}% register within a week of the workshop and ${D.leadstats.within2}% within two days, so a reminder 2–3 days out still reaches people who haven't decided.`;
const dows=Object.entries(D.dow).map(([k,v])=>({k:k.slice(0,3),v}));
vbars('#c-dow',dows,{label:d=>d.k,value:d=>d.v,step:50,aria:'Registrations by weekday',tipf:d=>`<b>${d.k}</b><br>${d.v} registrations`});

// mode
(function(){
  const M=Object.entries(D.mode).map(([k,v])=>({name:k,people:v})).sort((a,b)=>b.people-a.people);
  $('#n-mode').innerHTML=`The form only asked this in some seasons (${D.modeAnswered} of ${T.regs} registrations answered). Among those, ${Math.round(100*D.mode.Virtual/D.modeAnswered)}% chose Zoom.`;
  hbars('#c-mode',M,{aria:'Planned attendance mode',tipf:d=>`<b>${d.name}</b><br>${d.people} registrations`,right:d=>d.people,lw:190,rowH:26,step:50,w:1000});
})();

}
})();
