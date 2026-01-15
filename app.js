/* Malaria tracker — build 2026-01-15-LOCAL */
console.log('Malaria tracker build: 2026-01-15-LOCAL'); window.APP_BUILD='2026-01-15-LOCAL';

// This version uses local data via VaccineEngine instead of Google Sheets
// No more external API calls - all calculations done locally

const SECS_YEAR = 365.25 * 24 * 3600;

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

  // needs view
  needs: document.getElementById('needs'),
  ageGroup: document.getElementById('ageGroup'),
  needsVaccine: document.getElementById('needsVaccine'),
  completionScenario: document.getElementById('completionScenario'),
  needsGap: document.getElementById('needsGap'),
  needsCoverage: document.getElementById('needsCoverage'),
  needsDoses: document.getElementById('needsDoses'),
  needsDosesCost: document.getElementById('needsDosesCost'),
  needsAnnual: document.getElementById('needsAnnual'),
  needsAnnualCost: document.getElementById('needsAnnualCost'),
  needsCostPerLife: document.getElementById('needsCostPerLife'),
  needsCostPerCase: document.getElementById('needsCostPerCase'),

  // shipments view
  shipments: document.getElementById('shipments'),
  shipmentStatus: document.getElementById('shipmentStatus'),
  shipmentVaccine: document.getElementById('shipmentVaccine'),
  shipmentSort: document.getElementById('shipmentSort'),
  shipmentsSummary: document.getElementById('shipmentsSummary'),
  shipmentsBody: document.getElementById('shipmentsBody'),

  // about view
  about: document.getElementById('about'),
  efficacyChart: document.getElementById('efficacyChart'),

  // compare filters
  gaviLbl: document.getElementById('gaviLbl'),
  gaviFilter: document.getElementById('gaviFilter'),

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
const isValidDate = d => d instanceof Date && !isNaN(d.getTime());
const fmtCompact = n => { n=+n||0; const a=Math.abs(n);
  if(a>=1e9) return (n/1e9).toFixed(a<1e10?1:0).replace(/\.0$/,'')+'b';
  if(a>=1e6) return (n/1e6).toFixed(a<1e7?1:0).replace(/\.0$/,'')+'m';
  if(a>=1e3) return (n/1e3).toFixed(a<1e4?1:0).replace(/\.0$/,'')+'k';
  return Math.round(n)+'';
};
const fmtCurrency = n => { n=+n||0; const a=Math.abs(n);
  if(a>=1e9) return '$'+(n/1e9).toFixed(1).replace(/\.0$/,'')+'b';
  if(a>=1e6) return '$'+(n/1e6).toFixed(1).replace(/\.0$/,'')+'m';
  if(a>=1e3) return '$'+(n/1e3).toFixed(0)+'k';
  return '$'+Math.round(n);
};
const num = v => {
  const n = (typeof v === 'number') ? v : (v == null ? NaN : parseFloat(String(v).replace(/,/g,'')));
  return isFinite(n) ? n : 0;
};
const debounce = (fn, ms) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

// ===== Countries list (from local data)
async function populateCountries(){
  const list = VaccineEngine.getCountryList();
  const prev = dom.sel.value;
  dom.sel.innerHTML = list.map(c=>`<option>${c}</option>`).join('');
  if (list.includes(prev)) dom.sel.value = prev;
}

// ===== Trackers (anchored to midnight UTC)
let tickerTimer = null;
async function loadTicker(region){
  region = (region || 'Africa (overall)').trim();
  if (tickerTimer){ clearInterval(tickerTimer); tickerTimer=null; }

  // Show loading state
  dom.trackers.classList.add('loading');

  const totals = VaccineEngine.getTotals(region);
  const yrC = totals.casesAvertedPerYear;
  const yrL = totals.livesSavedPerYear;
  const totC = totals.casesAvertedTotal;
  const totL = totals.livesSavedTotal;

  if (!(yrC>0 && yrL>0)){
    [dom.cTot,dom.lTot,dom.cTim,dom.lTim].forEach($=>$.textContent='No data');
    dom.ship.textContent='';
    dom.trackers.classList.remove('loading');
    return;
  }

  // shipments summary
  const summary = VaccineEngine.getShipmentsSummary(region);
  let info = 'No shipment data';

  if (summary.lastDelivery || summary.nextDelivery) {
    const formatDelivery = (head, arr) => {
      if (!arr) return '';
      const total = arr.reduce((s, o) => s + o.doses, 0);
      const month = fmtMY(arr[0].date);
      const uniq = [...new Set(arr.map(o => o.country))];
      if (uniq.length === 1) {
        const add = (region === 'Africa (overall)') ? (' to ' + arr[0].country) : '';
        return `${head}: ${month} (${total.toLocaleString('en-US')} doses of ${arr[0].vaccine}${add})`;
      }
      return `${head}: ${month} (${total.toLocaleString('en-US')} doses to ${uniq.length > 1 ? uniq.slice(0, -1).join(', ') + ' and ' + uniq.at(-1) : uniq[0]})`;
    };

    info = formatDelivery('Most recent delivery', summary.lastDelivery);
    if (summary.lastDelivery && summary.nextDelivery) info += '<br>';
    info += formatDelivery('Next delivery', summary.nextDelivery);
    if (!info.trim()) info = 'No shipment data';
  }
  dom.ship.innerHTML = info.replace(/Central African Republic/g, 'CAR');

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

  // Remove loading state
  dom.trackers.classList.remove('loading');

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
       : v==='cases' ? 'Cases averted'
       : v==='lives' ? 'Lives saved'
       : v==='pmi_funding' ? 'PMI funding (USD)'
       : v==='malaria_cases' ? 'Malaria cases per year'
       : v==='malaria_deaths' ? 'Malaria deaths per year'
       : v==='coverage_pct' ? 'Coverage %'
       : 'Lives saved';
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

// ===== Hover (line)
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
}

// Build compare dataset from local engine
async function fetchCompareData(metric, gaviFilter = 'all'){
  const countryList = VaccineEngine.getCountryList().filter(c => c !== 'Africa (overall)');
  const countries = VaccineEngine.getAllCountries();
  const results = [];

  for (const country of countryList) {
    const countryData = countries[country];

    // Apply Gavi filter
    if (gaviFilter !== 'all' && countryData?.gaviGroup !== gaviFilter) {
      continue;
    }

    let value;

    if (metric === 'cases' || metric === 'lives' || metric === 'children' || metric === 'doses' || metric === 'doses_delivered') {
      const totals = VaccineEngine.getTotals(country);
      if (metric === 'cases') {
        value = totals.casesAvertedTotal;
      } else if (metric === 'lives') {
        value = totals.livesSavedTotal;
      } else if (metric === 'children') {
        value = totals.childrenVaccinated;
      } else if (metric === 'doses') {
        value = totals.dosesDelivered; // administered approximation
      } else {
        value = totals.dosesDelivered;
      }
    } else if (metric === 'pmi_funding') {
      value = countryData?.pmiFunding || 0;
    } else if (metric === 'malaria_cases') {
      value = countryData?.malariaCasesPerYear || 0;
    } else if (metric === 'malaria_deaths') {
      value = countryData?.malariaDeathsPerYear || 0;
    } else if (metric === 'coverage_pct') {
      const coverage = VaccineEngine.getCoverageGap(country);
      value = coverage.percentCovered || 0;
    }

    if (value > 0) {
      results.push({
        name: country,
        value,
        gaviGroup: countryData?.gaviGroup || 'N/A'
      });
    }
  }

  return results;
}

// ===== Trends controller
const seriesCache = new Map();
const cacheKeyFor = (region) => {
  const vacc = dom.vacc ? dom.vacc.value : 'both';
  return [dom.trendMetric.value, dom.range.value, vacc, region].join('|');
};

async function updateTrends(region){
  region = region || 'Africa (overall)';

  // Show loading state
  dom.trends.classList.add('loading');

  // availability window label
  try {
    const shipments = VaccineEngine.shipments.filter(s =>
      region === 'Africa (overall)' || s.country === region
    );
    const dates = shipments.map(s => new Date(s.date)).filter(d => isValidDate(d));
    if (dates.length) {
      const earliest = new Date(Math.min(...dates));
      const now = new Date();
      const months = Math.floor((now - earliest) / (30 * 24 * 60 * 60 * 1000));
      dom.win.textContent = `Data available since ${fmtMY(earliest)} (${months} months)`;
    } else {
      dom.win.textContent = '';
    }
  } catch(e) {
    dom.win.textContent = '';
  }

  const key = cacheKeyFor(region);
  let data = seriesCache.get(key);
  if (!data){
    const metric = dom.trendMetric.value;
    const vacc = dom.vacc ? dom.vacc.value : 'both';
    const rangeVal = dom.range.value;
    const rangeMonths = rangeVal === 'all' ? null : parseInt(rangeVal, 10);

    if (metric === 'doses')                data = VaccineEngine.seriesAdmin(region, vacc, rangeMonths);
    else if (metric === 'doses_delivered') data = VaccineEngine.seriesDelivered(region, vacc, rangeMonths);
    else if (metric === 'children')        data = VaccineEngine.seriesChildren(region, rangeMonths);
    else                                   data = VaccineEngine.seriesImpact(region, metric, rangeMonths);

    seriesCache.set(key, data);
  }

  dom.empty.style.display = data.months.length ? 'none' : 'flex';
  renderLine(dom.tCanvas, data);

  // Remove loading state
  dom.trends.classList.remove('loading');
}

// ===== Compare controller
async function updateCompare(){
  // Show loading state
  dom.compare.classList.add('loading');

  const metric = dom.trendMetric.value;
  const gaviFilter = dom.gaviFilter?.value || 'all';
  let list = await fetchCompareData(metric, gaviFilter);

  // sort + topN
  const dir = dom.sort.value;
  list.sort((a,b)=> dir==='asc' ? (a.value-b.value) : (b.value-a.value));
  const top = dom.topN.value==='all' ? list.length : Math.max(1, parseInt(dom.topN.value,10)||10);
  list = list.slice(0, top);

  renderBars(dom.bars, list, metricTitle(metric));

  // Remove loading state
  dom.compare.classList.remove('loading');
}

// ===== Needs controller
function updateNeeds(region) {
  region = region || dom.sel.value || 'Africa (overall)';
  const ageGroup = dom.ageGroup?.value || '6-60';
  const vaccine = dom.needsVaccine?.value || 'R21';
  const scenario = dom.completionScenario?.value || 'Average';

  // Get completion rate for the scenario
  const completionRates = VaccineEngine.config?.completionRates?.[scenario] || { dose4: 0.3944 };
  const completionRate = completionRates.dose4;

  // Get vaccination needs data
  const needs = VaccineEngine.getVaccinationNeeds(region, { ageGroup, vaccine });
  const costEff = VaccineEngine.getCostEffectiveness(region, vaccine);

  // Adjust for completion rate (fewer children complete full course)
  const effectiveCovered = needs.covered * completionRate;
  const effectiveGap = needs.eligible - effectiveCovered;
  const effectivePctCovered = needs.eligible > 0 ? (effectiveCovered / needs.eligible) * 100 : 0;

  // Coverage gap (adjusted for completion rate)
  dom.needsGap.textContent = fmtCompact(effectiveGap);
  dom.needsCoverage.textContent = `${fmtCompact(effectiveCovered)} of ${fmtCompact(needs.eligible)} fully vaccinated (${effectivePctCovered.toFixed(1)}%)`;

  // Catch-up doses (need to account for incomplete courses)
  const effectiveDosesNeeded = effectiveGap * 4;
  const effectiveCostNeeded = effectiveDosesNeeded * needs.pricePerDose;
  dom.needsDoses.textContent = fmtCompact(effectiveDosesNeeded);
  dom.needsDosesCost.textContent = `Estimated cost: ${fmtCurrency(effectiveCostNeeded)} at $${needs.pricePerDose.toFixed(2)}/dose`;

  // Annual flow (adjusted for completion rate)
  const effectiveAnnualChildren = needs.birthsPerYear * completionRate;
  const effectiveAnnualDoses = effectiveAnnualChildren * 4;
  const effectiveAnnualCost = effectiveAnnualDoses * needs.pricePerDose;
  dom.needsAnnual.textContent = fmtCompact(effectiveAnnualDoses);
  dom.needsAnnualCost.textContent = `${fmtCompact(needs.birthsPerYear)} births × ${(completionRate*100).toFixed(0)}% completion = ${fmtCurrency(effectiveAnnualCost)}/year`;

  // Cost-effectiveness (adjusted for completion rate)
  if (costEff) {
    // Cost per life saved increases if fewer complete the course
    const adjustedCostPerLife = costEff.costPerLifeSaved / completionRate;
    const adjustedCostPerCase = costEff.costPerCaseAverted / completionRate;
    dom.needsCostPerLife.textContent = fmtCurrency(adjustedCostPerLife);
    dom.needsCostPerCase.textContent = `${fmtCurrency(adjustedCostPerCase)} per case averted`;
  } else {
    dom.needsCostPerLife.textContent = '–';
    dom.needsCostPerCase.textContent = '–';
  }
}

// ===== Shipments controller
function updateShipments(region) {
  region = region || dom.sel.value || 'Africa (overall)';
  const statusFilter = dom.shipmentStatus?.value || 'all';
  const vaccineFilter = dom.shipmentVaccine?.value || 'all';
  const sortBy = dom.shipmentSort?.value || 'date-desc';

  // Get shipments from engine
  let shipments = [...VaccineEngine.shipments];

  // Filter by region
  if (region !== 'Africa (overall)') {
    shipments = shipments.filter(s => s.country === region);
  }

  // Filter by status
  if (statusFilter !== 'all') {
    shipments = shipments.filter(s => s.status === statusFilter);
  }

  // Filter by vaccine
  if (vaccineFilter !== 'all') {
    shipments = shipments.filter(s => {
      if (vaccineFilter === 'R21') return /r21/i.test(s.vaccine);
      if (vaccineFilter === 'RTS,S') return /rts/i.test(s.vaccine);
      return true;
    });
  }

  // Sort
  shipments.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortBy === 'doses-desc') return b.doses - a.doses;
    if (sortBy === 'doses-asc') return a.doses - b.doses;
    if (sortBy === 'country') return a.country.localeCompare(b.country);
    return 0;
  });

  // Update summary
  const totalDoses = shipments.reduce((sum, s) => sum + s.doses, 0);
  const deliveredDoses = shipments.filter(s => s.status === 'Delivered').reduce((sum, s) => sum + s.doses, 0);
  const scheduledDoses = shipments.filter(s => s.status === 'Scheduled').reduce((sum, s) => sum + s.doses, 0);
  dom.shipmentsSummary.innerHTML = `
    <strong>${shipments.length}</strong> shipments shown |
    <strong>${fmtCompact(totalDoses)}</strong> total doses
    (${fmtCompact(deliveredDoses)} delivered, ${fmtCompact(scheduledDoses)} scheduled)
  `;

  // Build table rows
  const now = new Date();
  const rows = shipments.map(s => {
    const date = new Date(s.date);
    const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const children = Math.round(s.doses / 4);
    const statusClass = s.status === 'Delivered' ? 'status-delivered' : 'status-scheduled';

    // Calculate current efficacy if delivered
    let efficacyHtml = '<span class="efficacy-badge efficacy-na">N/A</span>';
    if (s.status === 'Delivered' && date <= now) {
      const yearsElapsed = (now - date) / (365.25 * 24 * 3600 * 1000);
      // Third dose is ~4 months after delivery
      const yearsSinceThirdDose = Math.max(0, yearsElapsed - (4/12));
      const efficacy = VaccineEngine.getEfficacy(s.vaccine, yearsSinceThirdDose);
      const efficacyPct = (efficacy * 100).toFixed(0);
      const badgeClass = efficacy >= 0.6 ? 'efficacy-high' : efficacy >= 0.4 ? 'efficacy-med' : 'efficacy-low';
      efficacyHtml = `<span class="efficacy-badge ${badgeClass}">${efficacyPct}%</span>`;
    }

    return `
      <tr>
        <td>${dateStr}</td>
        <td>${s.country}</td>
        <td>${s.vaccine}</td>
        <td class="num">${fmtNum(s.doses)}</td>
        <td class="num">${fmtNum(children)}</td>
        <td>${s.financing || '–'}</td>
        <td class="${statusClass}">${s.status}</td>
        <td>${efficacyHtml}</td>
      </tr>
    `;
  }).join('');

  dom.shipmentsBody.innerHTML = rows || '<tr><td colspan="8" style="text-align:center;color:#666">No shipments found</td></tr>';
}

// ===== Efficacy chart for About page
function renderEfficacyChart() {
  const canvas = dom.efficacyChart;
  if (!canvas) return;

  const { ctx, W, H } = ensureHiDPI(canvas);
  ctx.clearRect(0, 0, W, H);

  const padL = 50, padR = 20, padT = 20, padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Draw axes
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, H - padB);
  ctx.lineTo(W - padR, H - padB);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, H - padB);
  ctx.stroke();

  // Y axis labels (efficacy %)
  ctx.fillStyle = '#666';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let pct = 0; pct <= 100; pct += 20) {
    const y = padT + chartH * (1 - pct / 100);
    ctx.fillText(pct + '%', padL - 8, y);
    if (pct > 0) {
      ctx.strokeStyle = '#f1f1f1';
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
    }
  }

  // X axis labels (years)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const maxYears = 5;
  for (let yr = 0; yr <= maxYears; yr++) {
    const x = padL + chartW * (yr / maxYears);
    ctx.fillText(yr + ' yr', x, H - padB + 8);
  }

  // Draw efficacy curves
  const vaccines = [
    { name: 'R21', color: '#127a3e' },
    { name: 'RTS,S', color: '#2196F3' }
  ];

  for (const v of vaccines) {
    ctx.strokeStyle = v.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let i = 0; i <= 50; i++) {
      const years = (i / 50) * maxYears;
      const efficacy = VaccineEngine.getEfficacy(v.name, years);
      const x = padL + chartW * (years / maxYears);
      const y = padT + chartH * (1 - efficacy);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Add dots at data points
    const config = VaccineEngine.config?.efficacy?.[v.name];
    if (config?.points) {
      ctx.fillStyle = v.color;
      for (const pt of config.points) {
        const x = padL + chartW * (pt.years / maxYears);
        const y = padT + chartH * (1 - pt.efficacy);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // X axis title
  ctx.fillStyle = '#666';
  ctx.textAlign = 'center';
  ctx.fillText('Years since third dose', padL + chartW / 2, H - 5);
}

// ===== Controls visibility
function updateControlsVisibility(){
  const mode = dom.mode.value;
  const showDash = (mode==='dashboard');
  const isTrack = (dom.view.value === 'trackers');
  const isTrends = (dom.view.value === 'trends');
  const isNeeds = (dom.view.value === 'needs');
  const isShipments = (dom.view.value === 'shipments');
  const isAbout = (dom.view.value === 'about');
  const showCompare = (mode==='compare');

  // page sections
  dom.dashboard.style.display = showDash ? 'block' : 'none';
  dom.compare.style.display   = showCompare ? 'block' : 'none';

  // within dashboard
  dom.trackers.style.display = (showDash && isTrack) ? 'block' : 'none';
  dom.trends.style.display   = (showDash && isTrends) ? 'block' : 'none';
  if (dom.needs) dom.needs.style.display = (showDash && isNeeds) ? 'block' : 'none';
  if (dom.shipments) dom.shipments.style.display = (showDash && isShipments) ? 'block' : 'none';
  if (dom.about) dom.about.style.display = (showDash && isAbout) ? 'block' : 'none';

  // shipments blurb only under trackers
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

  // Gavi filter only in compare mode
  if (dom.gaviLbl) dom.gaviLbl.style.display = showCompare ? '' : 'none';
  if (dom.gaviFilter) dom.gaviFilter.style.display = showCompare ? '' : 'none';

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
    lab.style.display = 'block';

    const sel = document.createElement('select');
    sel.id = 'vaccineFilter';
    sel.innerHTML = `
      <option value="both">Both vaccines</option>
      <option value="r21">R21 only</option>
      <option value="rts">RTS,S only</option>
    `;

    wrap.appendChild(lab);
    wrap.appendChild(sel);
    dom.vaccWrapSlot.replaceWith(wrap);
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
      const region = dom.sel.value || 'Africa (overall)';
      await loadTicker(region);
      if (dom.view.value==='trends') updateTrends(region);
      if (dom.view.value==='needs') updateNeeds(region);
      if (dom.view.value==='shipments') updateShipments(region);
    }
  });

  dom.view.addEventListener('change', ()=>{
    updateControlsVisibility();
    const region = dom.sel.value || 'Africa (overall)';
    if (dom.view.value==='trends') updateTrends(region);
    if (dom.view.value==='needs') updateNeeds(region);
    if (dom.view.value==='shipments') updateShipments(region);
    if (dom.view.value==='about') renderEfficacyChart();
  });

  // Needs view controls
  if (dom.ageGroup) {
    dom.ageGroup.addEventListener('change', ()=>{
      if (dom.view.value==='needs') updateNeeds(dom.sel.value||'Africa (overall)');
    });
  }
  if (dom.needsVaccine) {
    dom.needsVaccine.addEventListener('change', ()=>{
      if (dom.view.value==='needs') updateNeeds(dom.sel.value||'Africa (overall)');
    });
  }
  if (dom.completionScenario) {
    dom.completionScenario.addEventListener('change', ()=>{
      if (dom.view.value==='needs') updateNeeds(dom.sel.value||'Africa (overall)');
    });
  }

  // Shipments view controls
  if (dom.shipmentStatus) {
    dom.shipmentStatus.addEventListener('change', ()=>{
      if (dom.view.value==='shipments') updateShipments(dom.sel.value||'Africa (overall)');
    });
  }
  if (dom.shipmentVaccine) {
    dom.shipmentVaccine.addEventListener('change', ()=>{
      if (dom.view.value==='shipments') updateShipments(dom.sel.value||'Africa (overall)');
    });
  }
  if (dom.shipmentSort) {
    dom.shipmentSort.addEventListener('change', ()=>{
      if (dom.view.value==='shipments') updateShipments(dom.sel.value||'Africa (overall)');
    });
  }

  // Gavi filter for compare mode
  if (dom.gaviFilter) {
    dom.gaviFilter.addEventListener('change', ()=>{
      if (dom.mode.value==='compare') updateCompare();
    });
  }

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

  // Resize redraws (debounced)
  window.addEventListener('resize', debounce(()=>{
    if (dom.mode.value==='compare') updateCompare();
    else if (dom.view.value==='trends') updateTrends(dom.sel.value||'Africa (overall)');
  }, 150));
}

// ===== Init
(async function init(){
  try {
    // Load local data first
    await VaccineEngine.loadData();

    await populateCountries();
    await loadTicker('Africa (overall)');
    wire();
    updateControlsVisibility();

    // If Trends is preselected, render once
    if (dom.mode.value==='dashboard' && dom.view.value==='trends'){
      updateTrends(dom.sel.value||'Africa (overall)');
    }

    console.log('App initialized with local data engine');
  } catch (e) {
    console.error('Failed to initialize:', e);
    [dom.cTot,dom.lTot,dom.cTim,dom.lTim].forEach($=>$.textContent='Load error');
  }
})();

// ===== Minimal smoke tests
(function tests(){
  const ok=(c,m)=>console[c?'log':'error']('TEST '+(c?'OK':'FAIL')+': '+m);
  try{
    ok(typeof fmtDur(61)==='string','fmtDur returns string');
    ok(metricTitle('doses').length>0,'metricTitle works');
  }catch(e){console.error('TEST ERROR',e)}
})();
