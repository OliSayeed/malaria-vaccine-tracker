// ===== Config
const SHEET = '12SRhtYZALPnPtSwb9zK80WRmw1BjJnAO6-QgnIJd1dY';
const SHIP_TAB = 'Shipments by country';
const SECS_YEAR = 365.25 * 24 * 3600;
const COUNTRY_COLS = { CY: 'AF', LY: 'AH', CT: 'AG', LT: 'AI' };
const COLS = { CTRY: 'B', VACC: 'C', DATE: 'E', DOSE: 'F' };

// ===== DOM
const dom = {
  sel: document.getElementById('country'),
  view: document.getElementById('view'),
  cTot: document.getElementById('caseTotal'),
  lTot: document.getElementById('lifeTotal'),
  cBar: document.getElementById('caseBar'),
  lBar: document.getElementById('lifeBar'),
  cTim: document.getElementById('caseTimer'),
  lTim: document.getElementById('lifeTimer'),
  ship: document.getElementById('ship'),
  note: document.getElementById('note'),
  trends: document.getElementById('trends'),
  trackers: document.getElementById('trackers'),
  tCanvas: document.getElementById('trend'),
  empty: document.getElementById('empty'),
  tip: document.getElementById('trendTooltip'),
  dot: document.getElementById('trendDot'),
  range: document.getElementById('range'),
  win: document.getElementById('win'),
  vacc: null,       // <select> created dynamically
  vaccWrap: null    // wrapper that includes the "Vaccine" label + select
};

// ===== Utils
const cellURL = r =>
  `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Summary&range=${r}`;

const SUMMARY = {
  instant_nowane: { CY: cellURL('B5'), LY: cellURL('B10'), CT: cellURL('B2'), LT: cellURL('B3') },
  six_nowane:     { CY: cellURL('C5'), LY: cellURL('C10'), CT: cellURL('C2'), LT: cellURL('C3') },
  instant_waning: { CY: cellURL('D5'), LY: cellURL('D10'), CT: cellURL('D2'), LT: cellURL('D3') },
  six_waning:     { CY: cellURL('E5'), LY: cellURL('E10'), CT: cellURL('E2'), LT: cellURL('E3') }
};

const fmtNum = n => (n ?? 0).toLocaleString('en-US');
const fmtMY  = d => d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
const plural = n => (n === 1 ? '' : 's');
const fmtDur = s => {
  s = Math.ceil(s);
  let d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600),
      m = Math.floor(s % 3600 / 60), r = s % 60, p = [];
  if (d) p.push(`${d} day${plural(d)}`);
  if (h) p.push(`${h} hour${plural(h)}`);
  if (m) p.push(`${m} minute${plural(m)}`);
  if (r) p.push(`${r} second${plural(r)}`);
  if (!p.length) p.push('0 seconds');
  if (s < 60)   return p.slice(-1)[0];
  if (s < 3600) return p.slice(-2).join(' and ');
  if (s < 86400) return p.slice(-3).join(', ').replace(/,([^,]*)$/, ' and$1');
  return p.join(', ').replace(/,([^,]*)$/, ' and$1');
};
function gDate(v){
  if (typeof v === 'string' && /^Date\(/.test(v)) {
    const n = v.match(/\d+/g).map(Number);
    return new Date(n[0], n[1], n[2]);
  }
  return new Date(v);
}
const gFetch = u =>
  fetch(u).then(r => r.text()).then(t => {
    const j = JSON.parse(t.substring(t.indexOf('{'), t.lastIndexOf('}') + 1));
    return (j.table && j.table.rows) ? j.table.rows.map(r => r.c.map(c => c ? c.v : null)) : [];
  }).catch(() => []);

const listCountries = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1] : a[0];
const fmtCompact = n => {
  n = +n || 0; const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(a < 1e10 ? 1 : 0).replace(/\.0$/, '') + 'b';
  if (a >= 1e6) return (n / 1e6).toFixed(a < 1e7 ? 1 : 0).replace(/\.0$/, '') + 'm';
  if (a >= 1e3) return (n / 1e3).toFixed(a < 1e4 ? 1 : 0).replace(/\.0$/, '') + 'k';
  return Math.round(n) + '';
};

// Robust numeric extraction
const num = v => {
  const n = (typeof v === 'number') ? v : (v == null ? NaN : parseFloat(String(v).replace(/,/g,'')));
  return isFinite(n) ? n : 0;
};

// ===== URLs
const countryURL = c => {
  const q = encodeURIComponent(
    `select ${COUNTRY_COLS.CY},${COUNTRY_COLS.LY},${COUNTRY_COLS.CT},${COUNTRY_COLS.LT} where A="${c.replace(/"/g, '\\"')}"`
  );
  return `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Countries&tq=${q}`;
};
const shipURL = c => {
  const where = (c === 'Africa (overall)') ? `${COLS.DATE} is not null` : `${COLS.CTRY}="${c.replace(/"/g, '\\"')}"`;
  const q = encodeURIComponent(`select ${COLS.CTRY},${COLS.VACC},${COLS.DATE},${COLS.DOSE} where ${where} order by ${COLS.DATE}`);
  return `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(SHIP_TAB)}&tq=${q}`;
};

// ===== Scenario & UI helpers
let scenario = 'six_waning', timer = null;
const scenarioFromUI = () => {
  const r = (document.querySelector('input[name=roll]:checked') || {}).value || 'six';
  const e = (document.querySelector('input[name=wan]:checked')  || {}).value || 'waning';
  return (r === 'six' ? 'six' : 'instant') + '_' + (e === 'waning' ? 'waning' : 'nowane');
};
const countryScenarioOK = () => scenario === 'six_waning';
const setTogglesDisabled = f => {
  document.querySelectorAll('input[name=roll],input[name=wan]').forEach(i => i.disabled = !!f);
  document.querySelectorAll('.info').forEach(b => { b.disabled = !!f; b.style.cursor = f ? 'not-allowed' : 'pointer'; b.style.opacity = f ? 0.5 : 1; });
  document.querySelectorAll('.group').forEach(g => g.classList.toggle('is-disabled', !!f));
};
const updateViewAvailability = () => {
  const isCountry = (dom.sel.value && dom.sel.value !== 'Africa (overall)');
  const unsupported = isCountry && !countryScenarioOK();
  [...dom.view.options].forEach(o => { o.disabled = unsupported && o.value !== 'trackers'; });
  if (unsupported && dom.view.value !== 'trackers') { dom.view.value = 'trackers'; updateView(); }
};

// ===== Populate countries
async function populateCountries(){
  const sel = dom.sel;
  if (!countryScenarioOK()) {
    sel.innerHTML = '<option>Africa (overall)</option>';
    sel.value = 'Africa (overall)'; sel.disabled = true;
    dom.note.classList.remove('hidden');
    dom.note.innerHTML = 'Per-country figures only for <b>Six-month + Waning</b>.';
    updateViewAvailability(); return;
  }
  dom.note.classList.add('hidden'); sel.disabled = false;
  const tq = encodeURIComponent(`select A where ${COUNTRY_COLS.LY}>0 and ${COUNTRY_COLS.CY}>0 and A<>"Total" order by A`);
  const rows = await gFetch(`https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:json&headers=0&sheet=Countries&tq=${tq}`);
  const list = ['Africa (overall)'].concat(rows.flat());
  const prev = sel.value;
  sel.innerHTML = list.map(c => `<option>${c}</option>`).join('');
  if (list.includes(prev)) sel.value = prev;
  updateViewAvailability();
}

// ===== Trackers (midnight UTC anchoring)
async function loadTicker(region){
  region = (region || 'Africa (overall)').trim();
  if (timer) { clearInterval(timer); timer = null; }

  let yrC, yrL, totC, totL;
  if (region === 'Africa (overall)' || !countryScenarioOK()){
    const S = SUMMARY[scenario];
    const m = await Promise.all([S.CY, S.LY, S.CT, S.LT].map(gFetch));
    yrC = num(m[0][0][0]); yrL = num(m[1][0][0]);
    totC = num(m[2][0][0]); totL = num(m[3][0][0]);
  } else {
    const row = (await gFetch(countryURL(region)))[0] || [];
    yrC = num(row[0]); yrL = num(row[1]); totC = num(row[2]); totL = num(row[3]);
  }

  if (!(yrC > 0 && yrL > 0)) {
    [dom.cTot, dom.lTot, dom.cTim, dom.lTim].forEach($ => $.textContent = 'Error');
    dom.ship.textContent = ''; return;
  }

  // Shipments summary (only shown under trackers)
  let info = 'No shipment data', rows = await gFetch(shipURL(region));
  if (rows.length){
    const buckets = {}, now = new Date(), nowKey = now.getFullYear() * 12 + now.getMonth();
    rows.forEach(r => {
      const d = gDate(r[2]); if (isNaN(d)) return;
      const k = d.getFullYear() * 12 + d.getMonth();
      (buckets[k] = buckets[k] || []).push({ cty: r[0], vac: r[1], date: d, dose: num(r[3]) });
    });
    const keys = Object.keys(buckets).map(Number).sort((a,b)=>a-b),
          past = keys.filter(k => k <  nowKey),
          future = keys.filter(k => k >= nowKey),
          lastKey = past.pop(), nextKey = future.shift();
    const sum = (head, key) => {
      if (key == null) return '';
      const arr = buckets[key], total = arr.reduce((s,o)=>s + o.dose, 0),
            month = fmtMY(arr[0].date), uniq = [...new Set(arr.map(o => o.cty))];
      if (uniq.length === 1) {
        const o = arr[0], add = (region === 'Africa (overall)') ? (' to ' + o.cty) : '';
        return `${head}: ${month} (${total.toLocaleString('en-US')} doses of ${o.vac}${add})`;
      }
      return `${head}: ${month} (${total.toLocaleString('en-US')} doses to ${listCountries(uniq)})`;
    };
    info = sum('Most recent delivery', lastKey);
    if (lastKey != null && nextKey != null) info += '<br>';
    info += sum('Next delivery', nextKey);
    if (!info.trim()) info = 'No shipment data';
  }
  dom.ship.innerHTML = info.replace(/Central African Republic/g, 'CAR');

  // Cycle phase from fixed UTC midnight
  const now = new Date();
  const midnightUTCms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0);
  const secondsSinceMidnightUTC = (Date.now() - midnightUTCms) / 1000;

  const sCase = SECS_YEAR / yrC;
  const sLife = SECS_YEAR / yrL;

  let leftC = sCase - (secondsSinceMidnightUTC % sCase);
  let leftL = sLife - (secondsSinceMidnightUTC % sLife);

  let cntC = Math.floor(totC);
  let cntL = Math.floor(totL);

  function draw(){
    dom.cTot.textContent = fmtNum(cntC);
    dom.lTot.textContent = fmtNum(cntL);
    dom.cBar.style.width = (100 * (1 - leftC / sCase)) + '%';
    dom.lBar.style.width = (100 * (1 - leftL / sLife)) + '%';
    dom.cTim.textContent = fmtDur(leftC) + ' to next case averted';
    dom.lTim.textContent = fmtDur(leftL) + ' to next life saved';
  }
  draw();

  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    leftC -= 1; leftL -= 1;

    if (leftC <= 0){
      const secs = (Date.now() - midnightUTCms) / 1000;
      leftC = sCase - (secs % sCase);
      cntC++;
      dom.cBar.style.width = '0%';
      dom.cTot.textContent = fmtNum(cntC);
    }
    if (leftL <= 0){
      const secs = (Date.now() - midnightUTCms) / 1000;
      leftL = sLife - (secs % sLife);
      cntL++;
      dom.lBar.style.width = '0%';
      dom.lTot.textContent = fmtNum(cntL);
    }

    dom.cBar.style.width = (100 * (1 - leftC / sCase)) + '%';
    dom.lBar.style.width = (100 * (1 - leftL / sLife)) + '%';
    dom.cTim.textContent = fmtDur(leftC) + ' to next case averted';
    dom.lTim.textContent = fmtDur(leftL) + ' to next life saved';
  }, 1000);
}

// ===== Trends helpers
const monthsBetween = (a,b) => (a == null || b == null) ? 0 : (b - a + 1);
function matchesFilter(vaccine, filter){
  if (!filter || filter === 'both') return true;
  if (filter === 'r21') return /r21/i.test(vaccine || '');
  if (filter === 'rts') return /rts/i.test(vaccine || ''); // RTS,S
  return true;
}

// Build monthly cohorts with optional vaccine filter (for administered series)
async function buildMonthlyCohorts(region, filter){
  const rows = await gFetch(shipURL(region));
  const six = scenario.startsWith('six_');
  const by = new Map();
  const add = (k, vac, n) => {
    if (!n) return;
    const o = by.get(k) || { total: 0, RTS: 0, R21: 0 };
    o.total += n;
    if (/RTS/i.test(vac)) o.RTS += n; else o.R21 += n;
    by.set(k, o);
  };
  for (const r of rows){
    const vac = r[1] || '';
    if (!matchesFilter(vac, filter)) continue;
    const d = gDate(r[2]); if (isNaN(d)) continue;
    const doses = num(r[3]);
    const start = d.getFullYear() * 12 + d.getMonth();
    if (six) { const per = doses / 6; for (let i=0;i<6;i++) add(start+i, vac, per); }
    else add(start, vac, doses);
  }
  return by;
}
async function firstShipmentKey(region){
  const rows = await gFetch(shipURL(region));
  let first = null;
  for (const r of rows){
    const d = gDate(r[2]); if (isNaN(d)) continue;
    const k = d.getFullYear() * 12 + d.getMonth();
    if (first == null || k < first) first = k;
  }
  return first;
}

// ===== Trend series (optionally filter vaccine where requested)
async function seriesAdmin(region, filter){ // Doses administered (smeared)
  const by = await buildMonthlyCohorts(region, filter);
  const now = new Date(), nk = now.getFullYear()*12 + now.getMonth();
  const keys = [...by.keys()].sort((a,b)=>a-b);
  const n = (dom.range.value === 'all') ? (nk - (keys[0] ?? nk) + 1) : (+dom.range.value || 24);
  const start = nk - (n - 1);
  const months = [], cum = []; let acc = 0;
  for (let k=start; k<=nk; k++){
    months.push(new Date(Math.floor(k/12), k%12, 1));
    const v = (by.get(k)?.total) || 0; acc += v; cum.push(acc);
  }
  return { months, cum };
}
async function seriesDelivered(region, filter){ // Doses delivered (steps)
  const rows = await gFetch(shipURL(region));
  const by = new Map();
  for (const r of rows){
    const vac = r[1] || '';
    if (!matchesFilter(vac, filter)) continue;
    const d = gDate(r[2]); if (isNaN(d)) continue;
    const k = d.getFullYear() * 12 + d.getMonth();
    by.set(k, (by.get(k) || 0) + num(r[3]));
  }
  const now = new Date(), nk = now.getFullYear()*12 + now.getMonth();
  const keys = [...by.keys()].sort((a,b)=>a-b);
  const n = (dom.range.value === 'all') ? (nk - (keys[0] ?? nk) + 1) : (+dom.range.value || 24);
  const start = nk - (n - 1);
  const months = [], cum = []; let acc = 0;
  for (let k=start; k<=nk; k++){
    months.push(new Date(Math.floor(k/12), k%12, 1));
    const v = by.get(k) || 0; acc += v; cum.push(acc);
  }
  return { months, cum };
}
async function seriesChildren(region){ // (unchanged) not filterable per spec
  const rows = await gFetch(shipURL(region));
  const six = scenario.startsWith('six_');
  const by = new Map();
  const add = (k, n) => by.set(k, (by.get(k) || 0) + n);
  for (const r of rows){
    const d = gDate(r[2]); if (isNaN(d)) continue;
    const kids = num(r[3]) / 3;
    const start = d.getFullYear() * 12 + d.getMonth();
    if (six) { const per = kids / 6; for (let i=0;i<6;i++) add(start+i, per); }
    else add(start, kids);
  }
  const now = new Date(), nk = now.getFullYear()*12 + now.getMonth();
  const keys = [...by.keys()].sort((a,b)=>a-b);
  const n = (dom.range.value === 'all') ? (nk - (keys[0] ?? nk) + 1) : (+dom.range.value || 24);
  const start = nk - (n - 1);
  const months = [], cum = []; let acc = 0;
  for (let k=start; k<=nk; k++){
    months.push(new Date(Math.floor(k/12), k%12, 1));
    const v = by.get(k) || 0; acc += v; cum.push(acc);
  }
  return { months, cum };
}

// Impact kernel and series (unchanged)
function kernel(){
  const wan = /waning$/.test(scenario);
  const H = 48, k = new Array(H).fill(0), start = 2;
  if (wan){
    const lam = Math.log(2) / 18;
    for (let m=0;m<H;m++){
      const t = Math.max(0, m - start);
      k[m] = t === 0 ? 0 : Math.exp(-lam * t);
      if (t >= 12 && t < 18) k[m] *= 1.15;
    }
  } else {
    for (let m=0;m<H;m++) k[m] = (m >= start ? 1 : 0);
  }
  return k;
}
async function getTotals(region){
  if (region === 'Africa (overall)' || !countryScenarioOK()){
    const S = SUMMARY[scenario];
    const m = await Promise.all([S.CT, S.LT].map(gFetch));
    return { cases: num(m[0][0][0]), lives: num(m[1][0][0]) };
  }
  const row = (await gFetch(countryURL(region)))[0] || [];
  return { cases: num(row[2]), lives: num(row[3]) };
}
async function seriesImpact(region, which){
  const rows = await gFetch(shipURL(region));
  const six = scenario.startsWith('six_');
  const by = new Map();
  for (const r of rows){
    const d = gDate(r[2]); if (isNaN(d)) continue;
    const doses = num(r[3]);
    const start = d.getFullYear() * 12 + d.getMonth();
    if (six){ const per = doses/6; for (let i=0;i<6;i++) by.set(start+i, (by.get(start+i)||0)+per); }
    else by.set(start, (by.get(start)||0)+doses);
  }
  const keys=[...by.keys()].sort((a,b)=>a-b);
  const now=new Date(), nk=now.getFullYear()*12+now.getMonth();
  const n=(dom.range.value==='all')?(nk-(keys[0]??nk)+1):(+dom.range.value||24);
  const start=nk-(n-1);
  const k=kernel();
  const months=[], wts=new Array(n).fill(0);
  for(let kk=start; kk<=nk; kk++) months.push(new Date(Math.floor(kk/12), kk%12, 1));
  for(const key of keys){
    const cohort=by.get(key); if(!cohort) continue;
    for(let m=0;m<k.length;m++){
      const at=key+m; if(at<start||at>nk) continue;
      wts[at-start]+=cohort*k[m];
    }
  }
  const totals=await getTotals(region);
  const target=(which==='cases'?totals.cases:totals.lives);
  const sum=wts.reduce((a,b)=>a+b,0);
  const scale=sum>0?target/sum:0;
  let acc=0; const cum=[];
  for(let i=0;i<wts.length;i++){ acc+=wts[i]*scale; cum.push(acc); }
  return { months, cum };
}

// ===== Render chart
function ensureHiDPI(canvas){
  const ratio = Math.ceil(window.devicePixelRatio || 1);
  const cssW  = canvas.clientWidth || 860;
  const cssH  = Math.max(220, Math.floor(cssW * 0.28));
  if (canvas._w !== cssW || canvas._h !== cssH || canvas._r !== ratio){
    canvas.width  = cssW * ratio;
    canvas.height = cssH * ratio;
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas._w = cssW; canvas._h = cssH; canvas._r = ratio;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, W: cssW, H: cssH };
}
function metricTitle(v){
  return v === 'doses' ? 'Doses administered' :
         v === 'doses_delivered' ? 'Doses delivered' :
         v === 'children' ? 'Children vaccinated' :
         v === 'cases' ? 'Cases averted' : 'Lives saved';
}
function niceStep(range, target = 5){
  if (range <= 0) return 1;
  const raw = range / target, exp = Math.floor(Math.log10(raw)), frac = raw / Math.pow(10, exp);
  const nice = (frac <= 1) ? 1 : (frac <= 2) ? 2 : (frac <= 5) ? 5 : 10;
  return nice * Math.pow(10, exp);
}

// ===== Render chart (stores exact scale incl. nX)
function renderLine(canvas, data){
  const { ctx, W, H } = ensureHiDPI(canvas);
  ctx.clearRect(0, 0, W, H);
  if (!data.months.length) return;

  const padL = 90, padR = 16, padT = 14, padB = 38;

  const nX = Math.max(1, data.cum.length - 1);
  const xs = i => padL + (i * (W - padL - padR)) / nX;

  const maxY = Math.max(...data.cum, 0);
  const step = niceStep(maxY || 1, 5);
  const yMax = Math.ceil((maxY || 0) / step) * step || step;
  const ys = v => padT + (H - padT - padB) * (1 - (v / (yMax || 1)));

  // Axes
  ctx.strokeStyle = '#e5e5e5'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, H - padB + .5); ctx.lineTo(W - padR, H - padB + .5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(padL + .5, padT); ctx.lineTo(padL + .5, H - padB); ctx.stroke();

  // Labels
  ctx.fillStyle = '#666'; ctx.font = '12px system-ui';
  ctx.save(); ctx.translate(18, (H - padB + padT) / 2); ctx.rotate(-Math.PI/2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(metricTitle(dom.view.value), 0, 0);
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('Month', (padL + (W - padR)) / 2, H - 6);

  // Y ticks
  ctx.textAlign='right'; ctx.textBaseline='middle';
  for (let v = 0; v <= yMax + 1e-9; v += step){
    const y = ys(v);
    ctx.fillText(fmtCompact(v), padL - 10, y);
    ctx.beginPath(); ctx.moveTo(padL, y + .5); ctx.lineTo(W - padR, y + .5);
    ctx.strokeStyle = '#f1f1f1'; ctx.stroke(); ctx.strokeStyle = '#e5e5e5';
  }

  // X ticks (quarterly)
  ctx.textAlign='center'; ctx.textBaseline='alphabetic';
  for (let i=0;i<data.months.length;i++){
    const dt = data.months[i];
    if (dt.getMonth() % 3 === 0){
      ctx.fillText(dt.toLocaleDateString('en-GB', { month:'short', year:'2-digit' }), xs(i), H - padB + 18);
    }
  }

  // Trend line + sparse dots
  ctx.strokeStyle = '#127a3e'; ctx.lineWidth = 2;
  ctx.beginPath();
  data.cum.forEach((v,i)=>{ const x = xs(i), y = ys(v); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
  ctx.stroke();
  ctx.fillStyle = '#127a3e';
  for (let i = 0; i < data.cum.length; i += Math.max(1, Math.floor(data.cum.length / 24))){
    const x = xs(i), y = ys(data.cum[i]); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
  }

  canvas._scale = { padL, padR, padT, padB, W, H, yMax, nX };
}

// ===== Hover tooltip (enlarge existing dot only on hover)
function attachHover(){
  const cv  = dom.tCanvas;
  const tip = dom.tip;
  const dot = dom.dot;
  const wrapEl = document.getElementById('trendCanvasWrap');

  function relPos(e){
    const cRect = cv.getBoundingClientRect();
    const wRect = wrapEl.getBoundingClientRect();
    return {
      x: e.clientX - cRect.left,
      offX: cRect.left - wRect.left,
      offY: cRect.top  - wRect.top,
      wrapX: e.clientX - wRect.left,
      wrapY: e.clientY - wRect.top
    };
  }

  cv.addEventListener('mousemove', e => {
    const sc  = cv._scale;
    const key = [dom.view.value, dom.range.value, dom.vacc?.value || 'both', scenario, dom.sel.value || 'Africa (overall)'].join('|');
    const data = cache.get(key);
    if (!data || !sc) return;

    const { x, offX, offY, wrapX, wrapY } = relPos(e);

    const idx = Math.max(0, Math.min(
      data.months.length - 1,
      Math.round((x - sc.padL) * sc.nX / (sc.W - sc.padL - sc.padR))
    ));

    const dt  = data.months[idx];
    const val = data.cum[idx] ?? 0;

    tip.innerHTML =
      `<div>${dt.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</div>` +
      `<div style="font-weight:600">${Math.round(val).toLocaleString('en-US')}</div>`;
    tip.style.display = 'block';
    const off = 10;
    tip.style.left = (wrapX + off) + 'px';
    tip.style.top  = (wrapY + off) + 'px';

    const yMax = sc.yMax || 1;
    const xCSS = sc.padL + (idx * (sc.W - sc.padL - sc.padR)) / sc.nX;
    const yCSS = sc.padT + (sc.H - sc.padT - sc.padB) * (1 - (val / yMax));

    dot.style.display = 'block';
    dot.style.left = (offX + xCSS).toFixed(2) + 'px';
    dot.style.top  = (offY + yCSS).toFixed(2) + 'px';
    dot.classList.add('active');
  });

  function hideHover(){
    tip.style.display = 'none';
    dot.style.display = 'none';
    dot.classList.remove('active');
  }

  cv.addEventListener('mouseleave', hideHover);
  cv.addEventListener('touchstart', e => {
    if (e.touches[0]) cv.dispatchEvent(new MouseEvent('mousemove', { clientX:e.touches[0].clientX, clientY:e.touches[0].clientY }));
  });
  cv.addEventListener('touchmove',  e => {
    if (e.touches[0]) cv.dispatchEvent(new MouseEvent('mousemove', { clientX:e.touches[0].clientX, clientY:e.touches[0].clientY }));
  });
  cv.addEventListener('touchend',   hideHover);
}

// ===== View switching
function updateView(){
  const showTrack = dom.view.value === 'trackers';
  dom.trackers.style.display = showTrack ? 'block' : 'none';
  dom.trends.style.display   = !showTrack ? 'block' : 'none';
  dom.ship.style.display     = showTrack ? 'block' : 'none'; // shipment text only under trackers

  // Show "Vaccine" (label + select) only for doses delivered/administered
  const showVacc = (!showTrack && (dom.view.value === 'doses' || dom.view.value === 'doses_delivered'));
  if (dom.vaccWrap) dom.vaccWrap.style.display = showVacc ? '' : 'none';

  const isCountry = (dom.sel.value && dom.sel.value !== 'Africa (overall)');
  setTogglesDisabled(isCountry && !countryScenarioOK());
  if (!showTrack) updateTrends(dom.sel.value || 'Africa (overall)');
}

// ===== Trends controller
const cache = new Map();
async function updateTrends(region){
  const now = new Date(), nowKey = now.getFullYear()*12 + now.getMonth();
  try{
    const fk = await firstShipmentKey(region);
    const months = monthsBetween(fk, nowKey);
    dom.win.textContent = fk != null
      ? `Data available since ${new Date(Math.floor(fk/12), fk%12, 1).toLocaleDateString('en-GB',{month:'short',year:'numeric'})} (${months} months)`
      : '';
  }catch{}
  const vacc = dom.vacc ? dom.vacc.value : 'both';
  const cacheKey = [dom.view.value, dom.range.value, vacc, scenario, region].join('|');
  let data = cache.get(cacheKey);
  if (!data){
    if (dom.view.value === 'doses')                data = await seriesAdmin(region, vacc);
    else if (dom.view.value === 'doses_delivered') data = await seriesDelivered(region, vacc);
    else if (dom.view.value === 'children')        data = await seriesChildren(region); // not filterable per spec
    else                                           data = await seriesImpact(region, dom.view.value);
    cache.set(cacheKey, data);
  }
  dom.empty.style.display = data.months.length ? 'none' : 'flex';
  renderLine(dom.tCanvas, data);
}

// ===== Wiring (creates "Vaccine" label + dropdown next to "Range")
function wire(){
  // Create labelled Vaccine control only once
  if (!dom.vacc){
    // Build wrapper (to show/hide together, like Range)
    const wrap = document.createElement('span');
    wrap.id = 'vaccineControl';
    // try to reuse your control classes if present
    wrap.className = (dom.range.parentElement && dom.range.parentElement.className) ? dom.range.parentElement.className : '';
    wrap.style.marginLeft = '8px';
    wrap.style.display = 'none'; // hidden until relevant views

    // Label
    const lab = document.createElement('label');
    lab.htmlFor = 'vaccineFilter';
    lab.textContent = 'Vaccine';
    // reuse likely label class if exists
    if (dom.range.previousElementSibling && dom.range.previousElementSibling.tagName === 'LABEL') {
      lab.className = dom.range.previousElementSibling.className;
    } else {
      lab.style.marginRight = '6px';
      lab.style.fontSize = '0.95rem';
      lab.style.color = '#555';
    }

    // Select
    const sel = document.createElement('select');
    sel.id = 'vaccineFilter';
    sel.innerHTML = `
      <option value="both">Both vaccines</option>
      <option value="r21">R21 only</option>
      <option value="rts">RTS,S only</option>
    `;

    // Assemble
    wrap.appendChild(lab);
    wrap.appendChild(sel);

    // Insert immediately after the Range control's wrapper if possible
    const rangeWrap = dom.range.parentElement || dom.range;
    const parent = rangeWrap.parentNode;
    if (parent) {
      parent.insertBefore(wrap, rangeWrap.nextSibling);
    } else {
      // fallback near the range select
      dom.range.insertAdjacentElement('afterend', wrap);
    }

    dom.vacc = sel;
    dom.vaccWrap = wrap;

    sel.addEventListener('change', () => {
      cache.clear();
      if (dom.view.value !== 'trackers') updateTrends(dom.sel.value || 'Africa (overall)');
    });
  }

  dom.view.addEventListener('change', updateView);
  dom.range.addEventListener('change', () => { cache.clear(); updateTrends(dom.sel.value || 'Africa (overall)'); });
  document.querySelectorAll('input[name=roll],input[name=wan]').forEach(el => el.addEventListener('change', async () => {
    scenario = scenarioFromUI();
    await populateCountries();
    await loadTicker(dom.sel.value || 'Africa (overall)');
    cache.clear(); updateViewAvailability();
    if (dom.view.value !== 'trackers') updateTrends(dom.sel.value || 'Africa (overall)');
  }));
  dom.sel.addEventListener('change', async () => {
    await loadTicker(dom.sel.value || 'Africa (overall)');
    updateViewAvailability();
    if (dom.view.value !== 'trackers') updateTrends(dom.sel.value || 'Africa (overall)');
  });
  attachHover();
}

// ===== Init
(async function init(){
  scenario = scenarioFromUI();
  await populateCountries();
  await loadTicker('Africa (overall)');
  wire();
  updateViewAvailability();
  updateView(); // ensure correct visibility for Vaccine control on first load
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
