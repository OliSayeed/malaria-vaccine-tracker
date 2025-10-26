/* Malaria tracker — build 2025-10-26-1 */
console.log('Malaria tracker build: 2025-10-26-1'); window.APP_BUILD='2025-10-26-1';

// ===== Config (live sheet; six-month rollout + waning efficacy scenario)
const SHEET = '12SRhtYZALPnPtSwb9zK80WRmw1BjJnAO6-QgnIJd1dY';
const SHIP_TAB = 'Shipments by country';
const SECS_YEAR = 365.25 * 24 * 3600;

// Country columns in the Countries sheet (six-month + waning scenario)
const COUNTRY_COLS = { CY: 'AF', LY: 'AH', CT: 'AG', LT: 'AI' };
// Shipments sheet columns
const COLS = { CTRY: 'B', VACC: 'C', DATE: 'E', DOSE: 'F' };

// Summary cells (Africa overall; six-month + waning scenario)
const cellURL = r =>
  `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Summary&range=${r}`;
const SUMMARY = {
  CY: cellURL('E5'),  // cases/year
  LY: cellURL('E10'), // lives/year
  CT: cellURL('E2'),  // total cases
  LT: cellURL('E3')   // total lives
};

// ===== DOM
const dom = {
  // top row
  mode: document.getElementById('mode'),
  sel: document.getElementById('country'),
  view: document.getElementById('view'),

  // second row (dashboard–trends + compare)
  win: document.getElementById('win'),
  controlsRow: document.getElementById('controlsRow'),
  metricLbl: document.getElementById('metricLbl'),
  trendMetric: document.getElementById('trendMetric'),
  rangeLbl: document.getElementById('rangeLbl'),
  range: document.getElementById('range'),
  vaccWrapSlot: document.getElementById('vaccineControl'),
  sortLbl: document.getElementById('sortLbl'),
  sort: document.getElementById('sort'),
  topNLbl: document.getElementById('topNLbl'),
  topN: document.getElementById('topN'),

  // dashboard areas
  dashboard: document.getElementById('dashboard'),
  trackers: document.getElementById('trackers'),
  trends: document.getElementById('trends'),

  // shipments blurb (trackers only)
  ship: document.getElementById('ship'),

  // tracker metric DOM
  cTot: document.getElementById('caseTotal'),
  lTot: document.getElementById('lifeTotal'),
  cBar: document.getElementById('caseBar'),
  lBar: document.getElementById('lifeBar'),
  cTim: document.getElementById('caseTimer'),
  lTim: document.getElementById('lifeTimer'),

  // line chart
  tCanvas: document.getElementById('trend'),
  empty: document.getElementById('empty'),
  tip: document.getElementById('trendTooltip'),
  dot: document.getElementById('trendDot'),
  yLabel: document.getElementById('yLabel'),

  // compare bars
  compare: document.getElementById('compare'),
  bars: document.getElementById('bars'),
  barsTip: document.getElementById('barsTip'),

  // created dynamically
  vaccWrap: null,
  vacc: null
};

// ===== Utils
const fmtNum = n => (n ?? 0).toLocaleString('en-US');
const fmtMY  = d => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const plural = n => (n===1?'':'s');
const fmtDur = s => {
  s = Math.ceil(s);
  let d=Math.floor(s/86400), h=Math.floor(s%86400/3600),
      m=Math.floor(s%3600/60), r=s%60, p=[];
  if(d) p.push(`${d} day${plural(d)}`);
  if(h) p.push(`${h} hour${plural(h)}`);
  if(m) p.push(`${m} minute${plural(m)}`);
  if(r) p.push(`${r} second${plural(r)}`);
  if(!p.length) p.push('0 seconds');
  if(s<60) return p.slice(-1)[0];
  if(s<3600) return p.slice(-2).join(' and ');
  if(s<86400) return p.slice(-3).join(', ').replace(/,([^,]*)$/,' and$1');
  return p.join(', ').replace(/,([^,]*)$/,' and$1');
};
function gDate(v){
  if (typeof v === 'string' && /^Date\(/.test(v)) {
    const n = v.match(/\d+/g).map(Number);
    return new Date(n[0], n[1], n[2]);
  }
  return new Date(v);
}
const gFetch = u =>
  fetch(u).then(r=>r.text()).then(t=>{
    const j = JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}')+1));
    return (j.table && j.table.rows) ? j.table.rows.map(r=>r.c.map(c=>c?c.v:null)) : [];
  }).catch(()=>[]);
const fmtCompact = n => { n=+n||0; const a=Math.abs(n);
  if(a>=1e9) return (n/1e9).toFixed(a<1e10?1:0).replace(/\.0$/,'')+'b';
  if(a>=1e6) return (n/1e6).toFixed(a<1e7?1:0).replace(/\.0$/,'')+'m';
  if(a>=1e3) return (n/1e3).toFixed(a<1e4?1:0).replace(/\.0$/,'')+'k';
  return Math.round(n)+'';
};
const num = v => {
  const n = (typeof v === 'number') ? v : (v == null ? NaN : parseFloat(String(v).replace(/,/g,'')));
  return isFinite(n) ? n : 0;
};

// ===== URLs
const countryURL = c => {
  const q = encodeURIComponent(
    `select ${COUNTRY_COLS.CY},${COUNTRY_COLS.LY},${COUNTRY_COLS.CT},${COUNTRY_COLS.LT} where A="${c.replace(/"/g,'\\"')}"`
  );
  return `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Countries&tq=${q}`;
};
const shipURL = c => {
  const where = (c==='Africa (overall)') ? `${COLS.DATE} is not null` : `${COLS.CTRY}="${c.replace(/"/g,'\\"')}"`;
  const q = encodeURIComponent(`select ${COLS.CTRY},${COLS.VACC},${COLS.DATE},${COLS.DOSE} where ${where} order by ${COLS.DATE}`);
  return `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(SHIP_TAB)}&tq=${q}`;
};

// ===== Countries list
async function populateCountries(){
  const tq = encodeURIComponent(
    `select A where ${COUNTRY_COLS.LY}>0 and ${COUNTRY_COLS.CY}>0 and A<>"Total" order by A`
  );
  const rows = await gFetch(
    `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Countries&tq=${tq}`
  );
  const list = ['Africa (overall)'].concat(rows.flat());
  const prev = dom.sel.value;
  dom.sel.innerHTML = list.map(c=>`<option>${c}</option>`).join('');
  if (list.includes(prev)) dom.sel.value = prev;
}

// ===== Trackers (anchored to midnight UTC; no scenario toggles)
let tickerTimer = null;
async function loadTicker(region){
  region = (region || 'Africa (overall)').trim();
  if (tickerTimer){ clearInterval(tickerTimer); tickerTimer=null; }

  let yrC, yrL, totC, totL;
  if (region === 'Africa (overall)'){
    const m = await Promise.all([SUMMARY.CY,SUMMARY.LY,SUMMARY.CT,SUMMARY.LT].map(gFetch));
    yrC = num(m[0][0][0]); yrL = num(m[1][0][0]); totC = num(m[2][0][0]); totL = num(m[3][0][0]);
  } else {
    const row = (await gFetch(countryURL(region)))[0] || [];
    yrC = num(row[0]); yrL = num(row[1]); totC = num(row[2]); totL = num(row[3]);
  }

  if (!(yrC>0 && yrL>0)){
    [dom.cTot,dom.lTot,dom.cTim,dom.lTim].forEach($=>$.textContent='Error');
    dom.ship.textContent=''; return;
  }

  // shipments summary (only visible under trackers via updateView)
  let info = 'No shipment data', rows = await gFetch(shipURL(region));
  if (rows.length){
    const buckets={}, now=new Date(), nowKey=now.getFullYear()*12+now.getMonth();
    rows.forEach(r=>{
      const d=gDate(r[2]); if(isNaN(d)) return;
      const k=d.getFullYear()*12+d.getMonth();
      (buckets[k]=buckets[k]||[]).push({cty:r[0],vac:r[1],date:d,dose:num(r[3])});
    });
    const keys=Object.keys(buckets).map(Number).sort((a,b)=>a-b),
          past=keys.filter(k=>k<nowKey),
          future=keys.filter(k=>k>=nowKey),
          lastKey=past.pop(), nextKey=future.shift();
    const sum=(head,key)=>{
      if(key==null) return '';
      const arr=buckets[key], total=arr.reduce((s,o)=>s+o.dose,0),
            month=fmtMY(arr[0].date), uniq=[...new Set(arr.map(o=>o.cty))];
      if(uniq.length===1){
        const o=arr[0], add=(region==='Africa (overall)')?(' to '+o.cty):'';
        return `${head}: ${month} (${total.toLocaleString('en-US')} doses of ${o.vac}${add})`;
      }
      return `${head}: ${month} (${total.toLocaleString('en-US')} doses to ${uniq.length>1?uniq.slice(0,-1).join(', ')+' and '+uniq.at(-1):uniq[0]})`;
    };
    info = sum('Most recent delivery', lastKey);
    if(lastKey!=null && nextKey!=null) info+='<br>';
    info+= sum('Next delivery', nextKey);
    if(!info.trim()) info='No shipment data';
  }
  dom.ship.innerHTML = info.replace(/Central African Republic/g,'CAR');

  // cycle anchored to midnight UTC
  const now = new Date();
  const midnightUTCms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0,0,0,0);
  const secondsSinceMidnightUTC = (Date.now() - midnightUTCms)/1000;

  const sCase = SECS_YEAR/yrC;
  const sLife = SECS_YEAR/yrL;

  let leftC = sCase - (secondsSinceMidnightUTC % sCase);
  let leftL = sLife - (secondsSinceMidnightUTC % sLife);
  let cntC = Math.floor(totC);
  let cntL = Math.floor(totL);

  const draw = () => {
    dom.cTot.textContent = fmtNum(cntC);
    dom.lTot.textContent = fmtNum(cntL);
    dom.cBar.style.width = (100*(1-leftC/sCase))+'%';
    dom.lBar.style.width = (100*(1-leftL/sLife))+'%';
    dom.cTim.textContent = fmtDur(leftC)+' to next case averted';
    dom.lTim.textContent = fmtDur(leftL)+' to next life saved';
  };
  draw();

  tickerTimer = setInterval(()=>{
    leftC -= 1; leftL -= 1;

    if (leftC <= 0){
      const secs = (Date.now() - midnightUTCms)/1000;
      leftC = sCase - (secs % sCase);
      cntC++; dom.cBar.style.width='0%'; dom.cTot.textContent=fmtNum(cntC);
    }
    if (leftL <= 0){
      const secs = (Date.now() - midnightUTCms)/1000;
      leftL = sLife - (secs % sLife);
      cntL++; dom.lBar.style.width='0%'; dom.lTot.textContent=fmtNum(cntL);
    }

    dom.cBar.style.width = (100*(1-leftC/sCase))+'%';
    dom.lBar.style.width = (100*(1-leftL/sLife))+'%';
    dom.cTim.textContent = fmtDur(leftC)+' to next case averted';
    dom.lTim.textContent = fmtDur(leftL)+' to next life saved';
  }, 1000);
}

// ===== Trends (six-month admin model; vaccine filter for doses views)
const monthsBetween = (a,b) => (a==null || b==null) ? 0 : (b-a+1);
function matchesFilter(vaccine, filter){
  if (!filter || filter==='both') return true;
  if (filter==='r21') return /r21/i.test(vaccine||'');
  if (filter==='rts') return /rts/i.test(vaccine||''); // RTS,S
  return true;
}
async function buildMonthlyCohorts(region, filter){
  const rows = await gFetch(shipURL(region));
  const by = new Map();
  const add = (k, vac, n) => {
    if (!n) return;
    const o = by.get(k) || { total:0, RTS:0, R21:0 };
    o.total += n;
    if (/RTS/i.test(vac||'')) o.RTS += n; else o.R21 += n;
    by.set(k, o);
  };
  for (const r of rows){
    const vac = r[1] || '';
    if (!matchesFilter(vac, filter)) continue;
    const d = gDate(r[2]); if (isNaN(d)) continue;
    const doses = num(r[3]);
    const start = d.getFullYear()*12 + d.getMonth();
    // six-month roll-out: smear first doses over 6 months
    const per = doses/6;
    for (let i=0;i<6;i++) add(start+i, vac, per);
  }
  return by;
}
async function firstShipmentKey(region){
  const rows = await gFetch(shipURL(region));
  let first = null;
  for (const r of rows){
    const d=gDate(r[2]); if(isNaN(d)) continue;
    const k=d.getFullYear()*12 + d.getMonth();
    if (first==null || k<first) first=k;
  }
  return first;
}

async function seriesAdmin(region, filter){ // doses administered
  const by = await buildMonthlyCohorts(region, filter);
  const now = new Date(), nk = now.getFullYear()*12 + now.getMonth();
  const keys = [...by.keys()].sort((a,b)=>a-b);
  const n = (dom.range.value==='all') ? (nk-(keys[0]??nk)+1) : (+dom.range.value||24);
  const start = nk - (n-1);
  const months = [], cum=[]; let acc=0;
  for (let k=start;k<=nk;k++){
    months.push(new Date(Math.floor(k/12), k%12, 1));
    const v = (by.get(k)?.total) || 0; acc += v; cum.push(acc);
  }
  return { months, cum };
}
async function seriesDelivered(region, filter){ // doses delivered (steps)
  const rows = await gFetch(shipURL(region));
  const by = new Map();
  for (const r of rows){
    const vac = r[1] || '';
    if (!matchesFilter(vac, filter)) continue;
    const d=gDate(r[2]); if(isNaN(d)) continue;
    const k=d.getFullYear()*12 + d.getMonth();
    by.set(k, (by.get(k)||0) + num(r[3]));
  }
  const now = new Date(), nk = now.getFullYear()*12 + now.getMonth();
  const keys=[...by.keys()].sort((a,b)=>a-b);
  const n = (dom.range.value==='all') ? (nk-(keys[0]??nk)+1) : (+dom.range.value||24);
  const start = nk - (n-1);
  const months=[], cum=[]; let acc=0;
  for (let k=start;k<=nk;k++){
    months.push(new Date(Math.floor(k/12), k%12, 1));
    const v = by.get(k) || 0; acc += v; cum.push(acc);
  }
  return { months, cum };
}
async function seriesChildren(region){ // children vaccinated (admin/3)
  const rows = await gFetch(shipURL(region));
  const by = new Map();
  const add = (k, n) => by.set(k, (by.get(k)||0) + n);
  for (const r of rows){
    const d=gDate(r[2]); if(isNaN(d)) continue;
    const kids = num(r[3])/3;
    const start = d.getFullYear()*12 + d.getMonth();
    const per = kids/6;
    for (let i=0;i<6;i++) add(start+i, per);
  }
  const now = new Date(), nk = now.getFullYear()*12 + now.getMonth();
  const keys=[...by.keys()].sort((a,b)=>a-b);
  const n = (dom.range.value==='all') ? (nk-(keys[0]??nk)+1) : (+dom.range.value||24);
  const start = nk - (n-1);
  const months=[], cum=[]; let acc=0;
  for (let k=start;k<=nk;k++){
    months.push(new Date(Math.floor(k/12), k%12, 1));
    const v = by.get(k) || 0; acc += v; cum.push(acc);
  }
  return { months, cum };
}

// Simple impact kernel for cases/lives (proportional monthly weights), scaled to totals
function kernel(){
  const H=48, k=new Array(H).fill(0), start=2;
  const lam = Math.log(2)/18; // ~18m half-life
  for (let m=0;m<H;m++){
    const t=Math.max(0,m-start);
    k[m] = t===0 ? 0 : Math.exp(-lam*t);
    if (t>=12 && t<18) k[m]*=1.15; // mild booster bump
  }
  return k;
}
async function getTotals(region){
  if (region==='Africa (overall)'){
    const m = await Promise.all([SUMMARY.CT,SUMMARY.LT].map(gFetch));
    return { cases: num(m[0][0][0]), lives: num(m[1][0][0]) };
  }
  const row = (await gFetch(countryURL(region)))[0] || [];
  return { cases: num(row[2]), lives: num(row[3]) };
}
async function seriesImpact(region, which){
  const rows = await gFetch(shipURL(region));
  const by = new Map();
  for (const r of rows){
    const d=gDate(r[2]); if(isNaN(d)) continue;
    const doses = num(r[3]);
    const start = d.getFullYear()*12 + d.getMonth();
    const per=doses/6; for (let i=0;i<6;i++) by.set(start+i,(by.get(start+i)||0)+per);
  }
  const keys=[...by.keys()].sort((a,b)=>a-b);
  const now=new Date(), nk=now.getFullYear()*12+now.getMonth();
  const n=(dom.range.value==='all')?(nk-(keys[0]??nk)+1):(+dom.range.value||24);
  const start=nk-(n-1);
  const k=kernel();
  const months=[], wts=new Array(n).fill(0);
  for (let kk=start; kk<=nk; kk++) months.push(new Date(Math.floor(kk/12), kk%12, 1));
  for (const key of keys){
    const cohort = by.get(key); if(!cohort) continue;
    for (let m=0;m<k.length;m++){
      const at=key+m; if(at<start||at>nk) continue;
      wts[at-start] += cohort*k[m];
    }
  }
  const totals=await getTotals(region);
  const target = (which==='cases' ? totals.cases : totals.lives);
  const sum = wts.reduce((a,b)=>a+b,0);
  const scale = sum>0 ? target/sum : 0;
  let acc=0; const cum=[];
  for (let i=0;i<wts.length;i++){ acc+=wts[i]*scale; cum.push(acc); }
  return { months, cum };
}

// ===== Render line
function ensureHiDPI(canvas){
  const ratio = Math.ceil(window.devicePixelRatio || 1);
  const cssW  = canvas.clientWidth || 860;
  const cssH  = Math.max(220, Math.floor(cssW * 0.28));
  if (canvas._w!==cssW || canvas._h!==cssH || canvas._r!==ratio){
    canvas.width  = cssW*ratio; canvas.height = cssH*ratio;
    canvas.style.width = cssW+'px'; canvas.style.height = cssH+'px';
    canvas._w=cssW; canvas._h=cssH; canvas._r=ratio;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  return { ctx, W: cssW, H: cssH };
}
function metricTitle(v){
  return v==='doses' ? 'Doses administered'
       : v==='doses_delivered' ? 'Doses delivered'
       : v==='children' ? 'Children vaccinated'
       : v==='cases' ? 'Cases averted' : 'Lives saved';
}
function niceStep(range, target=5){
  if (range<=0) return 1;
  const raw=range/target, exp=Math.floor(Math.log10(raw)), frac=raw/Math.pow(10,exp);
  const nice = frac<=1 ? 1 : frac<=2 ? 2 : frac<=5 ? 5 : 10;
  return nice*Math.pow(10,exp);
}
function renderLine(canvas, data){
  const { ctx, W, H } = ensureHiDPI(canvas);
  ctx.clearRect(0,0,W,H);
  if (!data.months.length) return;

  const padL=90, padR=16, padT=14, padB=38;

  const nX = Math.max(1, data.cum.length-1);
  const xs = i => padL + (i*(W-padL-padR))/nX;

  const maxY = Math.max(...data.cum, 0);
  const step = niceStep(maxY||1,5);
  const yMax = Math.ceil((maxY||0)/step)*step || step;
  const ys = v => padT + (H-padT-padB) * (1 - (v/(yMax||1)));

  // axes
  ctx.strokeStyle='#e5e5e5'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padL, H-padB+.5); ctx.lineTo(W-padR, H-padB+.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(padL+.5, padT); ctx.lineTo(padL+.5, H-padB); ctx.stroke();

  // labels
  dom.yLabel.textContent = metricTitle(dom.trendMetric.value);
  ctx.fillStyle='#666'; ctx.font='12px system-ui';
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  ctx.fillText('Month', (padL+(W-padR))/2, H-6);

  // y ticks
  ctx.textAlign='right'; ctx.textBaseline='middle';
  for (let v=0; v<=yMax+1e-9; v+=step){
    const y = ys(v);
    ctx.fillText(fmtCompact(v), padL-10, y);
    ctx.beginPath(); ctx.moveTo(padL, y+.5); ctx.lineTo(W-padR, y+.5);
    ctx.strokeStyle='#f1f1f1'; ctx.stroke(); ctx.strokeStyle='#e5e5e5';
  }

  // x ticks quarterly
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  for (let i=0;i<data.months.length;i++){
    const dt=data.months[i];
    if (dt.getMonth()%3===0){
      ctx.fillText(dt.toLocaleDateString('en-GB',{month:'short',year:'2-digit'}), xs(i), H-padB+18);
    }
  }

  // line + sparse dots
  ctx.strokeStyle='#127a3e'; ctx.lineWidth=2; ctx.beginPath();
  data.cum.forEach((v,i)=>{ const x=xs(i), y=ys(v); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke(); ctx.fillStyle='#127a3e';
  for (let i=0; i<data.cum.length; i+=Math.max(1, Math.floor(data.cum.length/24))){
    const x=xs(i), y=ys(data.cum[i]); ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2); ctx.fill();
  }

  // store scale for hover
  canvas._scale = { padL, padR, padT, padB, W, H, yMax, nX };
}

// ===== Hover (line) — use same dot, just enlarge via CSS class
(function attachLineHover(){
  const cv = dom.tCanvas, tip = dom.tip, dot = dom.dot, wrap = document.getElementById('trendCanvasWrap');
  function rel(e){
    const c = cv.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    return {
      x: e.clientX - c.left,
      offX: c.left - w.left,
      offY: c.top  - w.top,
      wrapX: e.clientX - w.left,
      wrapY: e.clientY - w.top
    };
  }
  cv.addEventListener('mousemove', e=>{
    const sc=cv._scale; if(!sc) return;
    const key = cacheKeyFor(dom.sel.value||'Africa (overall)');
    const data = seriesCache.get(key); if(!data) return;

    const { x, offX, offY, wrapX, wrapY } = rel(e);
    const idx = Math.max(0, Math.min(
      data.months.length-1,
      Math.round((x - sc.padL) * sc.nX / (sc.W - sc.padL - sc.padR))
    ));
    const dt=data.months[idx], val=data.cum[idx]||0;

    tip.innerHTML = `<div>${dt.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</div><div style="font-weight:600">${Math.round(val).toLocaleString('en-US')}</div>`;
    tip.style.display='block'; tip.style.left=(wrapX+10)+'px'; tip.style.top=(wrapY+10)+'px';

    const xCSS = sc.padL + (idx * (sc.W - sc.padL - sc.padR)) / sc.nX;
    const yCSS = sc.padT + (sc.H - sc.padT - sc.padB) * (1 - (val / (sc.yMax || 1)));
    dot.style.display='block'; dot.style.left=(offX+xCSS)+'px'; dot.style.top=(offY+yCSS)+'px'; dot.classList.add('active');
  });
  function hide(){ tip.style.display='none'; dot.style.display='none'; dot.classList.remove('active'); }
  cv.addEventListener('mouseleave', hide);
  cv.addEventListener('touchstart', e=>{ if(e.touches[0]) cv.dispatchEvent(new MouseEvent('mousemove',{clientX:e.touches[0].clientX, clientY:e.touches[0].clientY})); });
  cv.addEventListener('touchmove',  e=>{ if(e.touches[0]) cv.dispatchEvent(new MouseEvent('mousemove',{clientX:e.touches[0].clientX, clientY:e.touches[0].clientY})); });
  cv.addEventListener('touchend',   ()=> hide());
})();

// ===== Compare countries (bars)
function ensureHiDPIBars(canvas){
  const ratio = Math.ceil(window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 980;
  const cssH = Math.max(260, Math.floor(cssW*0.5));
  if (canvas._w!==cssW || canvas._h!==cssH || canvas._r!==ratio){
    canvas.width=cssW*ratio; canvas.height=cssH*ratio;
    canvas.style.width=cssW+'px'; canvas.style.height=cssH+'px';
    canvas._w=cssW; canvas._h=cssH; canvas._r=ratio;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  return { ctx, W: cssW, H: cssH };
}
function renderBars(canvas, items, title){
  const { ctx, W, H } = ensureHiDPIBars(canvas);
  ctx.clearRect(0,0,W,H);
  if (!items.length) return;

  const padL=90, padR=16, padT=10, padB=70;

  const maxY = Math.max(...items.map(d=>d.value), 0);
  const step = niceStep(maxY||1, 5);
  const yMax = Math.ceil((maxY||0)/step)*step || step;
  const ys = v => padT + (H-padT-padB) * (1 - (v/(yMax||1)));

  // axes + y ticks
  ctx.strokeStyle='#e5e5e5'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padL, H-padB+.5); ctx.lineTo(W-padR, H-padB+.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(padL+.5, padT); ctx.lineTo(padL+.5, H-padB); ctx.stroke();
  ctx.fillStyle='#666'; ctx.font='12px system-ui'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for (let v=0; v<=yMax+1e-9; v+=step){
    const y=ys(v); ctx.fillText(fmtCompact(v), padL-10, y);
    ctx.beginPath(); ctx.moveTo(padL, y+.5); ctx.lineTo(W-padR, y+.5);
    ctx.strokeStyle='#f1f1f1'; ctx.stroke(); ctx.strokeStyle='#e5e5e5';
  }

  // bars
  const n=items.length, band=(W-padL-padR)/Math.max(1,n), gap=8, barW=Math.max(6, band-gap);
  ctx.fillStyle='#127a3e';
  items.forEach((d,i)=>{
    const x=padL + i*band + (band-barW)/2;
    const y=ys(d.value);
    ctx.fillRect(x,y,barW,(H-padB)-y);
  });

  // x labels (rotated)
  ctx.save();
  ctx.fillStyle='#555'; ctx.font='12px system-ui'; ctx.textAlign='right'; ctx.textBaseline='top';
  items.forEach((d,i)=>{
    const x=padL + i*band + band/2;
    ctx.save(); ctx.translate(x, H-padB+6); ctx.rotate(-Math.PI/4); ctx.fillText(d.name, 0,0); ctx.restore();
  });
  ctx.restore();

  // title (y axis label area)
  // (Optional: could render; y-label is only on trends right now)
}

// Build compare dataset from live sheet (cumulative snapshots)
async function fetchCompareData(metric){
  // For doses/cases/lives/children, we need per-country snapshots
  // Countries sheet already stores totals per country in the columns we use.
  // For doses delivered/administered/children: we’ll compute from shipments table cumulatively.
  const tq = encodeURIComponent(
    `select A where ${COUNTRY_COLS.LY}>0 and ${COUNTRY_COLS.CY}>0 and A<>"Total" order by A`
  );
  const rows = await gFetch(
    `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Countries&tq=${tq}`
  );
  const countries = rows.flat();

  if (metric==='cases' || metric==='lives'){
    // pull country totals from Countries sheet (AG=cases total, AI=lives total)
    const col = (metric==='cases') ? COUNTRY_COLS.CT : COUNTRY_COLS.LT;
    const data = [];
    for (const c of countries){
      const q = encodeURIComponent(`select ${col} where A="${c.replace(/"/g,'\\"')}"`);
      const url = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Countries&tq=${q}`;
      const r = await gFetch(url);
      const v = num((r[0]||[])[0]);
      data.push({name:c, value:v});
    }
    return data;
  }

  // doses_delivered / doses / children
  const out = [];
  for (const c of countries){
    const shipments = await gFetch(shipURL(c));
    let delivered = 0, administered = 0, children = 0;
    for (const r of shipments){
      const d = num(r[3]);
      delivered += d;
      administered += d; // cumulative administered == cumulative delivered once fully rolled out
      children += d/3;
    }
    if (metric==='doses_delivered') out.push({name:c, value: delivered});
    else if (metric==='doses')      out.push({name:c, value: administered});
    else                            out.push({name:c, value: children});
  }
  return out;
}

// ===== Trends controller
const seriesCache = new Map();
const cacheKeyFor = (region) => {
  const vacc = dom.vacc ? dom.vacc.value : 'both';
  return [dom.trendMetric.value, dom.range.value, vacc, region].join('|');
};
async function updateTrends(region){
  region = region || 'Africa (overall)';

  // availability window label
  try{
    const now=new Date(), nowKey=now.getFullYear()*12+now.getMonth();
    const fk = await firstShipmentKey(region);
    const months=monthsBetween(fk, nowKey);
    dom.win.textContent = fk!=null
      ? `Data available since ${new Date(Math.floor(fk/12), fk%12, 1).toLocaleDateString('en-GB',{month:'short',year:'numeric'})} (${months} months)`
      : '';
  }catch{}

  const key = cacheKeyFor(region);
  let data = seriesCache.get(key);
  if (!data){
    const metric = dom.trendMetric.value;
    const vacc = dom.vacc ? dom.vacc.value : 'both';
    if (metric==='doses')                data = await seriesAdmin(region, vacc);
    else if (metric==='doses_delivered') data = await seriesDelivered(region, vacc);
    else if (metric==='children')        data = await seriesChildren(region);
    else                                 data = await seriesImpact(region, metric);
    seriesCache.set(key, data);
  }

  dom.empty.style.display = data.months.length ? 'none' : 'flex';
  renderLine(dom.tCanvas, data);
}

// ===== Compare controller
async function updateCompare(){
  const metric = dom.trendMetric.value;
  let list = await fetchCompareData(metric);

  // sort + topN
  const dir = dom.sort.value; // 'desc' or 'asc'
  list.sort((a,b)=> dir==='asc' ? (a.value-b.value) : (b.value-a.value));
  const top = dom.topN.value==='all' ? list.length : Math.max(1, parseInt(dom.topN.value,10)||10);
  list = list.slice(0, top);

  renderBars(dom.bars, list, metricTitle(metric));
}

// ===== Controls visibility
function updateControlsVisibility(){
  const mode = dom.mode.value;               // dashboard | compare
  const showDash = (mode==='dashboard');
  const isTrack = (dom.view.value === 'trackers');
  const isTrends = (dom.view.value === 'trends');
  const showCompare = (mode==='compare');

  // page sections
  dom.dashboard.style.display = showDash ? 'block' : 'none';
  dom.compare.style.display   = showCompare ? 'block' : 'none';

  // within dashboard
  dom.trackers.style.display = (showDash && isTrack) ? 'block' : 'none';
  dom.trends.style.display   = (showDash && isTrends) ? 'block' : 'none';

  // shipments only under trackers
  dom.ship.style.display = (showDash && isTrack) ? 'block' : 'none';

  // second row (controlsRow) shows only when needed
  const showRow = (showDash && isTrends) || showCompare;
  dom.controlsRow.style.display = showRow ? 'flex' : 'none';

  // controls inside row
  const showMetric = (showDash && isTrends) || showCompare;
  dom.metricLbl.style.display = showMetric ? '' : 'none';
  dom.trendMetric.style.display = showMetric ? '' : 'none';

  // Range only in dashboard trends
  const showRange = (showDash && isTrends);
  dom.rangeLbl.style.display = showRange ? '' : 'none';
  dom.range.style.display    = showRange ? '' : 'none';

  // Vaccine only for dose metrics in dashboard trends
  const m = dom.trendMetric.value;
  const showVacc = showRange && (m==='doses' || m==='doses_delivered');
  if (dom.vaccWrap) dom.vaccWrap.style.display = showVacc ? '' : 'none';

  // Compare-only controls
  dom.sortLbl.style.display = showCompare ? '' : 'none';
  dom.sort.style.display    = showCompare ? '' : 'none';
  dom.topNLbl.style.display = showCompare ? '' : 'none';
  dom.topN.style.display    = showCompare ? '' : 'none';
}

// ===== Wiring
function wire(){
  // Build Vaccine control once
  if (!dom.vacc){
    const wrap = document.createElement('span');
    wrap.style.display='none';
    const lab = document.createElement('label');
    lab.className = 'lbl';
    lab.htmlFor = 'vaccineFilter';
    lab.textContent = 'Vaccine';

    const sel = document.createElement('select');
    sel.id = 'vaccineFilter';
    sel.innerHTML = `
      <option value="both">Both vaccines</option>
      <option value="r21">R21 only</option>
      <option value="rts">RTS,S only</option>
    `;

    wrap.appendChild(lab);
    wrap.appendChild(sel);
    dom.vaccWrapSlot.replaceWith(wrap); // occupy the placeholder
    dom.vaccWrap = wrap; dom.vacc = sel;

    sel.addEventListener('change', ()=>{
      seriesCache.clear();
      if (dom.mode.value==='dashboard' && dom.view.value==='trends'){
        updateTrends(dom.sel.value || 'Africa (overall)');
      }
    });
  }

  dom.mode.addEventListener('change', ()=>{
    updateControlsVisibility();
    if (dom.mode.value==='compare') updateCompare();
    else if (dom.view.value==='trends') updateTrends(dom.sel.value||'Africa (overall)');
  });

  dom.sel.addEventListener('change', async ()=>{
    if (dom.mode.value==='dashboard'){
      await loadTicker(dom.sel.value||'Africa (overall)');
      if (dom.view.value==='trends') updateTrends(dom.sel.value||'Africa (overall)');
    }
  });

  dom.view.addEventListener('change', ()=>{
    updateControlsVisibility();
    if (dom.view.value==='trends') updateTrends(dom.sel.value||'Africa (overall)');
  });

  dom.trendMetric.addEventListener('change', ()=>{
    seriesCache.clear();
    updateControlsVisibility();
    if (dom.mode.value==='dashboard' && dom.view.value==='trends'){
      updateTrends(dom.sel.value||'Africa (overall)');
    }
    if (dom.mode.value==='compare') updateCompare();
  });

  dom.range.addEventListener('change', ()=>{
    seriesCache.clear();
    if (dom.mode.value==='dashboard' && dom.view.value==='trends'){
      updateTrends(dom.sel.value||'Africa (overall)');
    }
  });

  dom.sort.addEventListener('change', ()=>{ if (dom.mode.value==='compare') updateCompare(); });
  dom.topN.addEventListener('change',  ()=>{ if (dom.mode.value==='compare') updateCompare(); });

  // Resize redraws
  window.addEventListener('resize', ()=>{
    if (dom.mode.value==='compare') updateCompare();
    else if (dom.view.value==='trends') updateTrends(dom.sel.value||'Africa (overall)');
  });
}

// ===== Init
(async function init(){
  await populateCountries();
  await loadTicker('Africa (overall)');
  wire();
  updateControlsVisibility();
  // If Trends is preselected, render once
  if (dom.mode.value==='dashboard' && dom.view.value==='trends'){
    updateTrends(dom.sel.value||'Africa (overall)');
  }
})();

// ===== Minimal smoke tests (console)
(function tests(){
  const ok=(c,m)=>console[c?'log':'error']('TEST '+(c?'OK':'FAIL')+': '+m);
  try{
    ok(typeof fmtDur(61)==='string','fmtDur returns string');
    ok(metricTitle('doses').length>0,'metricTitle works');
    ok(typeof countryURL('Africa (overall)')==='string','countryURL builds');
  }catch(e){console.error('TEST ERROR',e)}
})();
