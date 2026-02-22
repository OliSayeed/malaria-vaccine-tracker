/* Malaria tracker — build 2026-02-10a */
console.log('Malaria tracker build: 2026-02-10a'); window.APP_BUILD='2026-02-10a';

// This version uses local data via VaccineEngine instead of Google Sheets
// No more external API calls - all calculations done locally

const SECS_YEAR = 365.25 * 24 * 3600;

// Helper: check if a shipment is effectively delivered (past date or marked as delivered)
function isEffectivelyDelivered(shipment) {
  if (shipment.status === 'Delivered') return true;
  const shipmentDate = new Date(shipment.date);
  return shipmentDate <= new Date();
}

// ===== DOM
const dom = {
  // top row
  sel: document.getElementById('country'),
  view: document.getElementById('view'),
  dataStatus: document.getElementById('dataStatus'),
  copyShareLink: document.getElementById('copyShareLink'),
  copyShareStatus: document.getElementById('copyShareStatus'),

  // countries view
  countriesView: document.getElementById('countriesView'),
  countriesGavi: document.getElementById('countriesGavi'),
  countriesAgeGroup: document.getElementById('countriesAgeGroup'),
  countriesVaccine: document.getElementById('countriesVaccine'),
  countriesSummary: document.getElementById('countriesSummary'),
  countriesBody: document.getElementById('countriesBody'),

  // sankey diagram
  sankeyCanvas: document.getElementById('sankeyCanvas'),
  sankeyScenario: document.getElementById('sankeyScenario'),
  sankeyLegend: document.getElementById('sankeyLegend'),

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
  rankingPickerWrap: document.getElementById('rankingPickerWrap'),
  rankingPickerBtn: document.getElementById('rankingPickerBtn'),

  // dashboard areas
  dashboard: document.getElementById('dashboard'),
  trackers: document.getElementById('trackers'),
  trends: document.getElementById('trends'),

  // shipments blurb (trackers only)
  ship: document.getElementById('ship'),

  // tracker controls
  trackerCompletion: document.getElementById('trackerCompletion'),
  rolloutPeriod: document.getElementById('rolloutPeriod'),

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
  projectionYear: document.getElementById('projectionYear'),
  projectionMeta: document.getElementById('projectionMeta'),
  needsCompareBtn: document.getElementById('needsCompareBtn'),
  needsCompareCount: document.getElementById('needsCompareCount'),
  needsCompareBody: document.getElementById('needsCompareBody'),
  needsGap: document.getElementById('needsGap'),
  needsCoverage: document.getElementById('needsCoverage'),
  needsDoses: document.getElementById('needsDoses'),
  needsDosesCost: document.getElementById('needsDosesCost'),
  needsAnnual: document.getElementById('needsAnnual'),
  needsAnnualCost: document.getElementById('needsAnnualCost'),
  needsCostPerLife: document.getElementById('needsCostPerLife'),
  needsCostPerCase: document.getElementById('needsCostPerCase'),
  needsChartMetric: document.getElementById('needsChartMetric'),
  needsChartTop: document.getElementById('needsChartTop'),
  needsChart: document.getElementById('needsChart'),
  needsBarsTip: document.getElementById('needsBarsTip'),

  // shipments view
  shipments: document.getElementById('shipments'),
  shipmentStatus: document.getElementById('shipmentStatus'),
  shipmentVaccine: document.getElementById('shipmentVaccine'),
  shipmentsSummary: document.getElementById('shipmentsSummary'),
  shipmentsBody: document.getElementById('shipmentsBody'),

  // info panel (slides in from right)
  infoBtn: document.getElementById('infoBtn'),
  infoPanel: document.getElementById('infoPanel'),
  infoPanelClose: document.getElementById('infoPanelClose'),
  infoPanelOverlay: document.getElementById('infoPanelOverlay'),
  efficacyChart: document.getElementById('efficacyChart'),

  // tooltip
  tooltipPopup: document.getElementById('tooltipPopup'),

  // compare filters
  gaviLbl: document.getElementById('gaviLbl'),
  gaviFilter: document.getElementById('gaviFilter'),

  // country picker
  countryPicker: document.getElementById('countryPicker'),
  countryPickerList: document.getElementById('countryPickerList'),
  countryPickerClose: document.getElementById('countryPickerClose'),
  countryPickerOverlay: document.getElementById('countryPickerOverlay'),
  countryPickerAll: document.getElementById('countryPickerAll'),
  countryPickerNone: document.getElementById('countryPickerNone'),
  countryPickerCount: document.getElementById('countryPickerCount'),
  countryPickerApply: document.getElementById('countryPickerApply'),

  // compare countries button (trends view)
  compareCountriesWrap: document.getElementById('compareCountriesWrap'),
  compareCountriesBtn: document.getElementById('compareCountriesBtn'),

  // map view
  mapView: document.getElementById('mapView'),
  mapMetric: document.getElementById('mapMetric'),
  africaMap: document.getElementById('africaMap'),
  mapTooltip: document.getElementById('mapTooltip'),
  mapLegend: document.getElementById('mapLegend'),
  mapCompletionWrap: document.getElementById('mapCompletionWrap'),
  mapCompletion: document.getElementById('mapCompletion'),
  mapAgeGroupWrap: document.getElementById('mapAgeGroupWrap'),
  mapAgeGroup: document.getElementById('mapAgeGroup'),

  // metric info button (dynamic tooltip based on selected metric)
  metricInfoBtn: document.getElementById('metricInfoBtn'),

  // model controls in chart views
  modelControlsWrap: document.getElementById('modelControlsWrap'),
  chartCompletion: document.getElementById('chartCompletion'),
  rolloutControlWrap: document.getElementById('rolloutControlWrap'),
  chartRollout: document.getElementById('chartRollout'),

  // country profiles model control
  countriesCompletion: document.getElementById('countriesCompletion'),

  // created dynamically
  vaccWrap: null,
  vacc: null
};

// Track selected countries separately for each view
let trendSelectedCountries = [];
let rankingSelectedCountries = [];
let needsSelectedCountries = [];
let pickerContext = 'trends'; // which view opened the picker

let lastCountriesData = [];
let lastShipmentsData = [];
let lastNeedsComparisonData = [];

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

const formatMonth = d => {
  const dt = d instanceof Date ? d : new Date(d);
  return isValidDate(dt) ? dt.toISOString().slice(0, 7) : '';
};

function csvEscape(value) {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function downloadDelimited(rows, filename, extension = 'csv') {
  if (!rows || !rows.length) return;
  const content = rows.map(row => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.${extension}`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ===== Chart download utility
function downloadChart(canvas, suggestedName) {
  if (!canvas) return;
  const title = canvas._chartTitle || 'chart';
  const region = canvas._chartRegion || '';
  const date = new Date().toISOString().slice(0, 10);

  // Build filename from metadata
  const safeName = suggestedName ||
    [title, region, date]
      .filter(Boolean)
      .join('_')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');

  const link = document.createElement('a');
  link.download = safeName + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function downloadChartCsv(canvas, suggestedName) {
  if (!canvas) return;
  const title = canvas._chartTitle || 'chart';
  const region = canvas._chartRegion || '';
  const date = new Date().toISOString().slice(0, 10);
  const safeName = suggestedName ||
    [title, region, date]
      .filter(Boolean)
      .join('_')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');

  const series = canvas._chartSeries;
  if (series && series.length) {
    const months = series[0].data.months || [];
    const header = ['Month', ...series.map(s => s.name)];
    const rows = [header];
    months.forEach((month, idx) => {
      const row = [formatMonth(month)];
      series.forEach(s => row.push(Math.round(s.data.cum[idx] || 0)));
      rows.push(row);
    });
    downloadDelimited(rows, safeName, 'csv');
    return;
  }

  const items = canvas._chartData;
  if (items && items.length) {
    const rows = [['Label', 'Value'], ...items.map(item => [item.name, item.value])];
    downloadDelimited(rows, safeName, 'csv');
  }
}

function showDataStatus(message) {
  if (!dom.dataStatus) return;
  dom.dataStatus.textContent = message;
  dom.dataStatus.classList.remove('hidden');
}

function hideDataStatus() {
  if (!dom.dataStatus) return;
  dom.dataStatus.classList.add('hidden');
}

let isApplyingHash = false;
const scheduleHashUpdate = debounce(() => updateHashFromState(), 200);

function updateHashFromState() {
  if (isApplyingHash) return;
  const params = new URLSearchParams();
  if (dom.view) params.set('view', dom.view.value);
  if (dom.sel) params.set('country', dom.sel.value);
  if (dom.trendMetric) params.set('metric', dom.trendMetric.value);
  if (dom.range) params.set('range', dom.range.value);
  if (dom.vacc) params.set('vaccine', dom.vacc.value);
  if (dom.sort) params.set('sort', dom.sort.value);
  if (dom.gaviFilter) params.set('gavi', dom.gaviFilter.value);
  if (dom.mapMetric) params.set('mapMetric', dom.mapMetric.value);
  if (dom.mapAgeGroup) params.set('mapAge', dom.mapAgeGroup.value);
  if (dom.mapCompletion) params.set('mapCompletion', dom.mapCompletion.value);
  if (dom.ageGroup) params.set('ageGroup', dom.ageGroup.value);
  if (dom.projectionYear) params.set('projectionYear', dom.projectionYear.value);
  if (dom.needsVaccine) params.set('needsVaccine', dom.needsVaccine.value);
  if (dom.completionScenario) params.set('completion', dom.completionScenario.value);
  if (dom.needsChartMetric) params.set('needsMetric', dom.needsChartMetric.value);
  if (dom.needsChartTop) params.set('needsTop', dom.needsChartTop.value);
  if (dom.countriesGavi) params.set('countriesGavi', dom.countriesGavi.value);
  if (dom.countriesAgeGroup) params.set('countriesAge', dom.countriesAgeGroup.value);
  if (dom.countriesVaccine) params.set('countriesVaccine', dom.countriesVaccine.value);
  if (dom.countriesCompletion) params.set('countriesCompletion', dom.countriesCompletion.value);
  if (dom.shipmentStatus) params.set('shipmentStatus', dom.shipmentStatus.value);
  if (dom.shipmentVaccine) params.set('shipmentVaccine', dom.shipmentVaccine.value);
  if (dom.trackerCompletion) params.set('trackerCompletion', dom.trackerCompletion.value);
  if (dom.rolloutPeriod) params.set('rollout', dom.rolloutPeriod.value);
  if (dom.chartRollout) params.set('chartRollout', dom.chartRollout.value);
  if (trendSelectedCountries.length) params.set('trend', trendSelectedCountries.join(','));
  if (rankingSelectedCountries.length) params.set('ranking', rankingSelectedCountries.join(','));
  if (needsSelectedCountries.length) params.set('needsCompare', needsSelectedCountries.join(','));

  const hash = params.toString();
  if (hash) {
    isApplyingHash = true;
    window.location.hash = hash;
    setTimeout(() => { isApplyingHash = false; }, 0);
  }

  return hash;
}

async function copyCurrentShareLink() {
  const hash = updateHashFromState();
  const url = hash ? `${window.location.origin}${window.location.pathname}#${hash}` : window.location.href;
  const status = dom.copyShareStatus;

  try {
    await navigator.clipboard.writeText(url);
    if (status) status.textContent = 'Link copied';
  } catch {
    if (status) status.textContent = 'Copy failed — copy URL from browser bar';
  }

  if (status) {
    clearTimeout(status._timer);
    status._timer = setTimeout(() => { status.textContent = ''; }, 2200);
  }
}

function applyStateFromHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return;
  const params = new URLSearchParams(hash);
  isApplyingHash = true;

  const setValue = (el, key) => {
    const value = params.get(key);
    if (el && value != null) el.value = value;
  };

  setValue(dom.view, 'view');
  setValue(dom.sel, 'country');
  if (dom.sel && !Array.from(dom.sel.options).some(opt => opt.value === dom.sel.value)) {
    dom.sel.value = 'Africa (total)';
  }
  setValue(dom.trendMetric, 'metric');
  setValue(dom.range, 'range');
  setValue(dom.vacc, 'vaccine');
  setValue(dom.sort, 'sort');
  setValue(dom.gaviFilter, 'gavi');
  setValue(dom.mapMetric, 'mapMetric');
  setValue(dom.mapAgeGroup, 'mapAge');
  setValue(dom.mapCompletion, 'mapCompletion');
  setValue(dom.ageGroup, 'ageGroup');
  setValue(dom.projectionYear, 'projectionYear');
  setValue(dom.needsVaccine, 'needsVaccine');
  setValue(dom.completionScenario, 'completion');
  setValue(dom.needsChartMetric, 'needsMetric');
  setValue(dom.needsChartTop, 'needsTop');
  setValue(dom.countriesGavi, 'countriesGavi');
  setValue(dom.countriesAgeGroup, 'countriesAge');
  setValue(dom.countriesVaccine, 'countriesVaccine');
  setValue(dom.countriesCompletion, 'countriesCompletion');
  setValue(dom.shipmentStatus, 'shipmentStatus');
  setValue(dom.shipmentVaccine, 'shipmentVaccine');
  setValue(dom.trackerCompletion, 'trackerCompletion');
  setValue(dom.rolloutPeriod, 'rollout');
  setValue(dom.chartRollout, 'chartRollout');

  const completionValue = params.get('completion') || params.get('trackerCompletion');
  if (completionValue) {
    VaccineEngine.setCompletionScenario(completionValue);
    if (dom.trackerCompletion) dom.trackerCompletion.value = completionValue;
    if (dom.completionScenario) dom.completionScenario.value = completionValue;
    if (dom.chartCompletion) dom.chartCompletion.value = completionValue;
    if (dom.countriesCompletion) dom.countriesCompletion.value = completionValue;
    if (dom.mapCompletion) dom.mapCompletion.value = completionValue;
  }

  const rolloutValue = params.get('rollout') || params.get('chartRollout');
  if (rolloutValue) {
    const months = parseInt(rolloutValue, 10);
    if (!isNaN(months)) {
      VaccineEngine.setRolloutMonths(months);
      if (dom.rolloutPeriod) dom.rolloutPeriod.value = months;
      if (dom.chartRollout) dom.chartRollout.value = months;
    }
  }

  const trend = params.get('trend');
  trendSelectedCountries = trend ? trend.split(',').filter(Boolean) : [];
  const ranking = params.get('ranking');
  rankingSelectedCountries = ranking ? ranking.split(',').filter(Boolean) : [];
  const needsCompare = params.get('needsCompare');
  needsSelectedCountries = needsCompare ? needsCompare.split(',').filter(Boolean) : [];

  const validCountries = new Set(VaccineEngine.getCountryList().filter(c => c !== 'Africa (total)'));
  trendSelectedCountries = trendSelectedCountries.filter(c => validCountries.has(c));
  rankingSelectedCountries = rankingSelectedCountries.filter(c => validCountries.has(c));
  needsSelectedCountries = needsSelectedCountries.filter(c => validCountries.has(c));

  isApplyingHash = false;
}

function syncSelectionButtons() {
  if (dom.compareCountriesBtn) {
    if (trendSelectedCountries.length > 1) {
      dom.compareCountriesBtn.textContent = `Comparing ${trendSelectedCountries.length} countries`;
    } else {
      dom.compareCountriesBtn.textContent = 'Compare countries';
    }
  }

  if (dom.rankingPickerBtn) {
    if (rankingSelectedCountries.length > 0) {
      dom.rankingPickerBtn.textContent = `${rankingSelectedCountries.length} countries selected`;
    } else {
      dom.rankingPickerBtn.textContent = 'Select countries';
    }
  }

  if (dom.needsCompareBtn) {
    if (needsSelectedCountries.length > 0) {
      dom.needsCompareBtn.textContent = `${needsSelectedCountries.length} countries selected`;
    } else {
      dom.needsCompareBtn.textContent = 'Select countries';
    }
  }
}

// ===== Country picker functions
function openCountryPicker(context) {
  if (!dom.countryPicker) return;
  pickerContext = context || 'trends';
  const activeSelection = pickerContext === 'trends'
    ? trendSelectedCountries
    : pickerContext === 'needs'
      ? needsSelectedCountries
      : rankingSelectedCountries;

  // Populate the list
  const countries = VaccineEngine.getCountryList().filter(c => c !== 'Africa (total)');
  dom.countryPickerList.innerHTML = countries.map(c => {
    const checked = activeSelection.includes(c) ? 'checked' : '';
    const selectedClass = activeSelection.includes(c) ? 'selected' : '';
    return `<label class="country-picker-item ${selectedClass}">
      <input type="checkbox" value="${c}" ${checked}>
      <span>${c}</span>
    </label>`;
  }).join('');

  updatePickerCount();

  // Show picker
  dom.countryPicker.style.display = 'flex';
  dom.countryPickerOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCountryPicker() {
  if (!dom.countryPicker) return;
  dom.countryPicker.style.display = 'none';
  dom.countryPickerOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function updatePickerCount() {
  const checkboxes = dom.countryPickerList?.querySelectorAll('input[type="checkbox"]:checked') || [];
  const count = checkboxes.length;
  if (dom.countryPickerCount) {
    dom.countryPickerCount.textContent = `${count} selected`;
  }

  // Update visual state
  dom.countryPickerList?.querySelectorAll('.country-picker-item').forEach(item => {
    const cb = item.querySelector('input');
    item.classList.toggle('selected', cb?.checked);
  });
}

function applyCountrySelection() {
  const checkboxes = dom.countryPickerList?.querySelectorAll('input[type="checkbox"]:checked') || [];
  const selected = Array.from(checkboxes).map(cb => cb.value);

  closeCountryPicker();

  if (pickerContext === 'trends') {
    trendSelectedCountries = selected;

    // Update button text to show selection count
    if (dom.compareCountriesBtn) {
      if (trendSelectedCountries.length > 1) {
        dom.compareCountriesBtn.textContent = `Comparing ${trendSelectedCountries.length} countries`;
      } else {
        dom.compareCountriesBtn.textContent = 'Compare countries';
      }
    }

    // Refresh trends view
    if (trendSelectedCountries.length > 1) {
      updateMultiCountryTrends();
    } else if (trendSelectedCountries.length === 1) {
      dom.sel.value = trendSelectedCountries[0];
      updateTrends(trendSelectedCountries[0]);
    } else {
      updateTrends(dom.sel.value || 'Africa (total)');
    }
  } else if (pickerContext === 'rankings') {
    rankingSelectedCountries = selected;

    // Update ranking picker button text
    if (dom.rankingPickerBtn) {
      if (rankingSelectedCountries.length > 0) {
        dom.rankingPickerBtn.textContent = `${rankingSelectedCountries.length} countries selected`;
      } else {
        dom.rankingPickerBtn.textContent = 'Select countries';
      }
    }

    updateCompare();
  } else if (pickerContext === 'needs') {
    needsSelectedCountries = selected;

    if (dom.needsCompareBtn) {
      if (needsSelectedCountries.length > 0) {
        dom.needsCompareBtn.textContent = `${needsSelectedCountries.length} countries selected`;
      } else {
        dom.needsCompareBtn.textContent = 'Select countries';
      }
    }

    updateNeedsComparison();
  }

  scheduleHashUpdate();
}

// Color palette for multi-country lines
const COUNTRY_COLORS = [
  '#127a3e', '#2196F3', '#FF5722', '#9C27B0', '#FF9800',
  '#00BCD4', '#E91E63', '#4CAF50', '#673AB7', '#FFC107',
  '#3F51B5', '#795548', '#009688', '#F44336', '#607D8B'
];

// ===== Multi-country line chart
function renderMultiLine(canvas, datasets, title) {
  const { ctx, W, H } = ensureHiDPI(canvas);
  ctx.clearRect(0, 0, W, H);
  if (!datasets.length || !datasets[0].data.months?.length) return;

  // Increased left padding for more space between y-axis title and tick labels
  const padL = 100, padR = 16, padT = 28, padB = 38;

  // Find global max across all datasets
  let maxY = 0;
  for (const ds of datasets) {
    const m = Math.max(...(ds.data.cum || []), 0);
    if (m > maxY) maxY = m;
  }

  const months = datasets[0].data.months;
  const nX = Math.max(1, months.length - 1);
  const xs = i => padL + (i * (W - padL - padR)) / nX;

  const step = niceStep(maxY || 1, 5);
  const yMax = Math.ceil((maxY || 0) / step) * step || step;
  const ys = v => padT + (H - padT - padB) * (1 - (v / (yMax || 1)));

  // Title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(title, W / 2, 6);

  // Axes
  ctx.strokeStyle = '#e5e5e5';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, H - padB + 0.5);
  ctx.lineTo(W - padR, H - padB + 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padL + 0.5, padT);
  ctx.lineTo(padL + 0.5, H - padB);
  ctx.stroke();

  // Y labels - with more space from axis for title
  ctx.fillStyle = '#666';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= yMax + 1e-9; v += step) {
    const y = ys(v);
    ctx.fillText(fmtCompact(v), padL - 14, y);
    ctx.beginPath();
    ctx.moveTo(padL, y + 0.5);
    ctx.lineTo(W - padR, y + 0.5);
    ctx.strokeStyle = '#f1f1f1';
    ctx.stroke();
    ctx.strokeStyle = '#e5e5e5';
  }

  // X labels (quarterly)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < months.length; i++) {
    const dt = months[i];
    if (dt.getMonth() % 3 === 0) {
      ctx.fillText(dt.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), xs(i), H - padB + 16);
    }
  }

  // Draw lines
  const highlightIdx = canvas._highlightIdx ?? -1;
  datasets.forEach((ds, idx) => {
    const isHighlighted = highlightIdx === -1 || highlightIdx === idx;
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = isHighlighted ? 2.5 : 1;
    ctx.globalAlpha = isHighlighted ? 1 : 0.25;

    ctx.beginPath();
    ds.data.cum.forEach((v, i) => {
      const x = xs(i), y = ys(v);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // Legend
  const legendY = H - 8;
  const legendSpacing = 100;
  const legendStartX = Math.max(padL, (W - datasets.length * legendSpacing) / 2);

  ctx.font = '10px system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  datasets.forEach((ds, idx) => {
    const x = legendStartX + idx * legendSpacing;
    ctx.fillStyle = ds.color;
    ctx.fillRect(x, legendY - 4, 12, 8);
    ctx.fillStyle = '#555';
    ctx.fillText(shortName(ds.name).slice(0, 14), x + 16, legendY);
  });

  // Store for hover
  canvas._scale = { padL, padR, padT, padB, W, H, yMax, nX };
  canvas._datasets = datasets;
  canvas._chartTitle = title;
  canvas._chartSeries = datasets;
  canvas._chartData = null;
}

// ===== Multi-country trends controller
async function updateMultiCountryTrends() {
  if (trendSelectedCountries.length < 2) {
    // Fall back to single-country view
    updateTrends(dom.sel.value || 'Africa (total)');
    return;
  }

  dom.trends.classList.add('loading');

  const metric = dom.trendMetric.value;
  const vacc = dom.vacc ? dom.vacc.value : 'both';
  const rangeVal = dom.range.value;
  const rangeMonths = rangeVal === 'all' ? null : parseInt(rangeVal, 10);

  const datasets = [];
  for (let i = 0; i < trendSelectedCountries.length; i++) {
    const country = trendSelectedCountries[i];
    let data;

    if (metric === 'doses') data = VaccineEngine.seriesAdmin(country, vacc, rangeMonths);
    else if (metric === 'doses_delivered') data = VaccineEngine.seriesDelivered(country, vacc, rangeMonths);
    else if (metric === 'children') data = VaccineEngine.seriesChildren(country, rangeMonths);
    else data = VaccineEngine.seriesImpact(country, metric, rangeMonths);

    if (data.months.length > 0) {
      datasets.push({
        name: country,
        data,
        color: COUNTRY_COLORS[i % COUNTRY_COLORS.length]
      });
    }
  }

  if (datasets.length > 0) {
    dom.empty.style.display = 'none';
    renderMultiLine(dom.tCanvas, datasets, metricTitle(metric));
    dom.yLabel.textContent = metricTitle(metric);
  } else {
    dom.empty.style.display = 'flex';
  }

  dom.trends.classList.remove('loading');
}

// ===== Countries list (from local data)
async function populateCountries(){
  const list = VaccineEngine.getCountryList();
  const prev = dom.sel.value;
  dom.sel.innerHTML = list.map(c=>`<option>${c}</option>`).join('');
  if (list.includes(prev)) dom.sel.value = prev;

  if (dom.projectionYear) {
    const years = (VaccineEngine.getProjectionYears && VaccineEngine.getProjectionYears()) || [];
    const fallbackYears = years.length ? years : Array.from({ length: 13 }, (_, i) => 2023 + i);
    const prevYear = dom.projectionYear.value;
    dom.projectionYear.innerHTML = fallbackYears
      .map(y => `<option value="${y}">${y}</option>`)
      .join('');
    if (fallbackYears.map(String).includes(prevYear)) dom.projectionYear.value = prevYear;
    else dom.projectionYear.value = '2025';
  }
}

// ===== Trackers (anchored to midnight UTC)
let tickerTimer = null;
async function loadTicker(region){
  region = (region || 'Africa (total)').trim();
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
        const add = (region === 'Africa (total)') ? (' to ' + arr[0].country) : '';
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
       : v==='pop_at_risk' ? 'Population at risk'
       : v==='pop_under_5' ? 'Children under 5'
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

  // Increased left padding for more space between y-axis title and tick labels
  const padL=100, padR=16, padT=14, padB=38;

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

  // y ticks - with more space from axis for title
  ctx.textAlign='right'; ctx.textBaseline='middle';
  for (let v=0; v<=yMax+1e-9; v+=step){
    const y = ys(v);
    ctx.fillText(fmtCompact(v), padL-14, y);
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

  // Store metadata for download
  canvas._chartTitle = metricTitle(dom.trendMetric.value);
  canvas._chartRegion = dom.sel.value || 'Africa (total)';
  canvas._chartData = data;
  canvas._chartSeries = [{
    name: dom.sel.value || 'Africa (total)',
    data
  }];
}

// ===== Hover (line) - supports both single and multi-line charts
(function attachLineHover(){
  const cv = dom.tCanvas, tip = dom.tip, dot = dom.dot, wrap = document.getElementById('trendCanvasWrap');
  function rel(e){
    const c = cv.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    return {
      x: e.clientX - c.left,
      y: e.clientY - c.top,
      offX: c.left - w.left,
      offY: c.top  - w.top,
      wrapX: e.clientX - w.left,
      wrapY: e.clientY - w.top
    };
  }

  cv.addEventListener('mousemove', e=>{
    const sc = cv._scale;
    if (!sc) return;

    const { x, y, offX, offY, wrapX, wrapY } = rel(e);

    // Check if this is a multi-line chart
    const datasets = cv._datasets;
    if (datasets && datasets.length > 1) {
      // Multi-line chart: find closest line and highlight it
      const months = datasets[0].data.months;
      const idx = Math.max(0, Math.min(
        months.length - 1,
        Math.round((x - sc.padL) * sc.nX / (sc.W - sc.padL - sc.padR))
      ));

      // Find which line is closest to cursor Y position
      let closestIdx = -1;
      let minDist = Infinity;
      const ys = v => sc.padT + (sc.H - sc.padT - sc.padB) * (1 - (v / (sc.yMax || 1)));

      for (let i = 0; i < datasets.length; i++) {
        const val = datasets[i].data.cum[idx] || 0;
        const lineY = ys(val);
        const dist = Math.abs(y - lineY);
        if (dist < minDist && dist < 50) { // 50px threshold
          minDist = dist;
          closestIdx = i;
        }
      }

      // Update highlight if changed
      if (cv._highlightIdx !== closestIdx) {
        cv._highlightIdx = closestIdx;
        renderMultiLine(cv, datasets, cv._chartTitle || metricTitle(dom.trendMetric.value));
      }

      // Show tooltip for highlighted line
      if (closestIdx >= 0) {
        const ds = datasets[closestIdx];
        const dt = months[idx];
        const val = ds.data.cum[idx] || 0;

        tip.innerHTML = `<div style="color:${ds.color};font-weight:600">${ds.name}</div><div>${dt.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</div><div style="font-weight:600">${Math.round(val).toLocaleString('en-US')}</div>`;
        tip.style.display = 'block';
        tip.style.left = (wrapX + 10) + 'px';
        tip.style.top = (wrapY + 10) + 'px';

        const xCSS = sc.padL + (idx * (sc.W - sc.padL - sc.padR)) / sc.nX;
        const yCSS = ys(val);
        dot.style.display = 'block';
        dot.style.left = (offX + xCSS) + 'px';
        dot.style.top = (offY + yCSS) + 'px';
        dot.style.background = ds.color;
        dot.classList.add('active');
      } else {
        tip.style.display = 'none';
        dot.style.display = 'none';
      }
      return;
    }

    // Single-line chart (original behavior)
    const key = cacheKeyFor(dom.sel.value || 'Africa (total)');
    const data = seriesCache.get(key);
    if (!data) return;

    const idx = Math.max(0, Math.min(
      data.months.length - 1,
      Math.round((x - sc.padL) * sc.nX / (sc.W - sc.padL - sc.padR))
    ));
    const dt = data.months[idx], val = data.cum[idx] || 0;

    tip.innerHTML = `<div>${dt.toLocaleDateString('en-GB',{month:'short',year:'numeric'})}</div><div style="font-weight:600">${Math.round(val).toLocaleString('en-US')}</div>`;
    tip.style.display = 'block';
    tip.style.left = (wrapX + 10) + 'px';
    tip.style.top = (wrapY + 10) + 'px';

    const xCSS = sc.padL + (idx * (sc.W - sc.padL - sc.padR)) / sc.nX;
    const yCSS = sc.padT + (sc.H - sc.padT - sc.padB) * (1 - (val / (sc.yMax || 1)));
    dot.style.display = 'block';
    dot.style.left = (offX + xCSS) + 'px';
    dot.style.top = (offY + yCSS) + 'px';
    dot.style.background = '#127a3e';
    dot.classList.add('active');
  });

  function hide(){
    tip.style.display = 'none';
    dot.style.display = 'none';
    dot.classList.remove('active');

    // Reset highlight on multi-line charts
    if (cv._datasets && cv._datasets.length > 1 && cv._highlightIdx !== -1) {
      cv._highlightIdx = -1;
      renderMultiLine(cv, cv._datasets, cv._chartTitle || metricTitle(dom.trendMetric.value));
    }
  }

  cv.addEventListener('mouseleave', hide);
  cv.addEventListener('touchstart', e=>{ if(e.touches[0]) cv.dispatchEvent(new MouseEvent('mousemove',{clientX:e.touches[0].clientX, clientY:e.touches[0].clientY})); });
  cv.addEventListener('touchmove',  e=>{ if(e.touches[0]) cv.dispatchEvent(new MouseEvent('mousemove',{clientX:e.touches[0].clientX, clientY:e.touches[0].clientY})); });
  cv.addEventListener('touchend',   ()=> hide());
})();

// ===== Compare countries (bars)
function ensureHiDPIBars(canvas, numItems = 10){
  const ratio = Math.ceil(window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 860;
  // Height scales with number of items to accommodate rotated labels
  const baseH = Math.min(350, Math.max(250, Math.floor(cssW * 0.38)));
  const cssH = baseH + Math.max(0, numItems - 10) * 2; // extra height for many items
  if (canvas._w!==cssW || canvas._h!==cssH || canvas._r!==ratio){
    canvas.width=cssW*ratio; canvas.height=cssH*ratio;
    canvas.style.width=cssW+'px'; canvas.style.height=cssH+'px';
    canvas._w=cssW; canvas._h=cssH; canvas._r=ratio;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio,0,0,ratio,0,0);
  return { ctx, W: cssW, H: cssH };
}
function renderBars(canvas, items, title, metric){
  const { ctx, W, H } = ensureHiDPIBars(canvas, items.length);
  ctx.clearRect(0,0,W,H);
  if (!items.length) return;

  // Layout: compute bar area first, then center the whole plot
  const n = items.length;
  const yAxisW = 80; // space for y-axis labels (left of axis line)
  const padT = 32, padB = 80;
  const band = Math.min(36, Math.max(16, (W * 0.7) / n));
  const gap = 4, barW = Math.max(6, Math.min(28, band - gap));
  const barAreaW = n * band;
  const plotW = yAxisW + barAreaW + 12; // axis + bars + right margin
  const ox = Math.max(0, (W - plotW) / 2); // centre offset
  const padL = ox + yAxisW;

  const maxY = Math.max(...items.map(d=>d.value), 0);
  const step = niceStep(maxY||1, 5);
  const yMax = Math.ceil((maxY||0)/step)*step || step;
  const ys = v => padT + (H-padT-padB) * (1 - (v/(yMax||1)));

  // Format y-axis values based on metric type
  const isPercent = metric === 'coverage_pct';
  const fmtY = isPercent
    ? v => v.toFixed(v >= 10 ? 0 : 1) + '%'
    : fmtCompact;

  // Title at top
  ctx.fillStyle='#333'; ctx.font='bold 14px system-ui'; ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(title, W/2, 8);

  // axes + y ticks
  const plotRight = padL + barAreaW;
  ctx.strokeStyle='#e5e5e5'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(padL, H-padB+.5); ctx.lineTo(plotRight, H-padB+.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(padL+.5, padT); ctx.lineTo(padL+.5, H-padB); ctx.stroke();
  ctx.fillStyle='#666'; ctx.font='11px system-ui'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for (let v=0; v<=yMax+1e-9; v+=step){
    const y=ys(v); ctx.fillText(fmtY(v), padL-12, y);
    ctx.beginPath(); ctx.moveTo(padL, y+.5); ctx.lineTo(plotRight, y+.5);
    ctx.strokeStyle='#f1f1f1'; ctx.stroke(); ctx.strokeStyle='#e5e5e5';
  }

  // bars — snug against y-axis, centred within each band
  const barHits = []; // store hit areas for hover tooltips
  ctx.fillStyle='#127a3e';
  items.forEach((d,i)=>{
    const x = padL + i*band + (band-barW)/2;
    const y = ys(d.value);
    const h = (H-padB)-y;
    ctx.fillRect(x,y,barW,h);
    barHits.push({ x, y, w: barW, h, name: d.name, value: d.value });
  });

  // x labels (rotated)
  ctx.save();
  ctx.fillStyle='#555'; ctx.font='10px system-ui'; ctx.textAlign='right'; ctx.textBaseline='top';
  items.forEach((d,i)=>{
    const x = padL + i*band + band/2;
    ctx.save(); ctx.translate(x, H-padB+6); ctx.rotate(-Math.PI/4); ctx.fillText(shortName(d.name), 0,0); ctx.restore();
  });
  ctx.restore();

  // Store chart metadata for download and hover
  canvas._chartTitle = title;
  canvas._chartData = items;
  canvas._chartMetric = metric;
  canvas._barHits = barHits;
  canvas._padL = padL;
  canvas._padT = padT;
  canvas._padB = padB;
  canvas._ys = ys;
  canvas._fmtY = fmtY;
  canvas._isPercent = isPercent;
}

// Bar chart hover tooltip handler
function setupBarHover(canvas, tip) {
  if (!canvas || !tip) return;
  const fmtVal = (v, isP) => isP ? v.toFixed(1) + '%' : Math.round(v).toLocaleString('en-US');

  canvas.addEventListener('mousemove', e => {
    const hits = canvas._barHits;
    if (!hits) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = (canvas._r || 1);
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);
    let found = null;
    for (const h of hits) {
      if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
        found = h; break;
      }
    }
    if (found) {
      tip.innerHTML = `<div style="font-weight:600">${found.name}</div><div style="font-weight:600">${fmtVal(found.value, canvas._isPercent)}</div>`;
      tip.style.display = '';
      // Position relative to canvas wrapper
      const wrapRect = canvas.parentElement.getBoundingClientRect();
      tip.style.left = (e.clientX - wrapRect.left + 12) + 'px';
      tip.style.top = (e.clientY - wrapRect.top - 10) + 'px';
    } else {
      tip.style.display = 'none';
    }
  });
  canvas.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
}

// Build compare dataset from local engine
async function fetchCompareData(metric, gaviFilter = 'all'){
  const countryList = VaccineEngine.getCountryList().filter(c => c !== 'Africa (total)' && c !== 'Total');
  const countries = VaccineEngine.getAllCountries();
  const results = [];

  for (const country of countryList) {
    const countryData = countries[country];

    // Apply Gavi filter
    if (gaviFilter !== 'all' && countryData?.gaviGroup !== gaviFilter) {
      continue;
    }

    let value;
    let matched = false;

    if (metric === 'cases' || metric === 'lives' || metric === 'children' || metric === 'doses' || metric === 'doses_delivered') {
      matched = true;
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
      matched = true;
      value = countryData?.pmiFunding || 0;
    } else if (metric === 'malaria_cases') {
      matched = true;
      value = countryData?.malariaCasesPerYear || 0;
    } else if (metric === 'malaria_deaths') {
      matched = true;
      value = countryData?.malariaDeathsPerYear || 0;
    } else if (metric === 'coverage_pct') {
      matched = true;
      const coverage = VaccineEngine.getCoverageGap(country);
      value = coverage.percentCovered || 0;
    } else if (metric === 'pop_at_risk') {
      matched = true;
      value = countryData?.populationAtRisk || 0;
    } else if (metric === 'pop_under_5') {
      matched = true;
      value = countryData?.populationUnderFive || 0;
    }

    // Debug: log if metric didn't match any condition
    if (!matched) {
      console.warn('fetchCompareData: unknown metric:', metric);
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
  region = region || 'Africa (total)';

  // Show loading state
  dom.trends.classList.add('loading');

  // availability window label
  try {
    const shipments = VaccineEngine.shipments.filter(s =>
      region === 'Africa (total)' || s.country === region
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

  // If custom countries are selected, filter to those
  if (rankingSelectedCountries.length > 0) {
    list = list.filter(item => rankingSelectedCountries.includes(item.name));
  }

  // Sort
  const dir = dom.sort.value;
  list.sort((a,b)=> dir==='asc' ? (a.value-b.value) : (b.value-a.value));

  // If no custom selection, show top 10
  if (rankingSelectedCountries.length === 0) {
    list = list.slice(0, 10);
  }

  renderBars(dom.bars, list, metricTitle(metric), metric);

  // Remove loading state
  dom.compare.classList.remove('loading');
}

// ===== Map controller
// GeoJSON URL and cache
const GEOJSON_URLS = [
  'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
  'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
];
let geoJsonCache = null;

// List of African countries (matching GeoJSON names)
const AFRICAN_COUNTRIES = new Set([
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi',
  'Cameroon', 'Cabo Verde', 'Central African Republic', 'Chad', 'Comoros',
  'Democratic Republic of the Congo', 'Republic of the Congo', 'Djibouti',
  'Egypt', 'Equatorial Guinea', 'Eritrea', 'Ethiopia', 'Gabon', 'Gambia',
  'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya', 'Lesotho',
  'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
  'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria',
  'Rwanda', 'Sao Tome and Principe', 'Senegal', 'Seychelles', 'Sierra Leone',
  'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Swaziland', 'Tanzania',
  'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
  // Alternative names that might appear in GeoJSON
  'Côte d\'Ivoire', 'United Republic of Tanzania', 'Eswatini', 'The Gambia',
  'Republic of Congo', 'Congo', 'Cape Verde', 'São Tomé and Príncipe'
]);

// Map GeoJSON names to our data names
const COUNTRY_NAME_MAP = {
  'Democratic Republic of the Congo': 'DRC',
  'Republic of the Congo': 'Congo-Brazzaville',
  'Republic of Congo': 'Congo-Brazzaville',
  'Congo': 'Congo-Brazzaville',
  'Ivory Coast': 'Côte d\'Ivoire',
  'Côte d\'Ivoire': 'Côte d\'Ivoire',
  'United Republic of Tanzania': 'Tanzania',
  'Swaziland': 'Eswatini',
  'Gambia': 'The Gambia',
  'Sao Tome and Principe': 'São Tomé and Príncipe',
  'São Tomé and Príncipe': 'São Tomé and Príncipe',
  'Cape Verde': 'Cabo Verde',
  'Cabo Verde': 'Cabo Verde'
};

// Short display names for charts (avoids text overflow)
const COUNTRY_ABBREV = {
  'Central African Republic': 'CAR',
  'DRC': 'DRC',
  'Congo-Brazzaville': 'Congo-B.',
  'Côte d\'Ivoire': 'Côte d\'Iv.',
  'Equatorial Guinea': 'Eq. Guinea',
  'São Tomé and Príncipe': 'São Tomé',
};
function shortName(name) { return COUNTRY_ABBREV[name] || name; }

// Island states with approximate coordinates for circle markers
// (many are too small to appear in world-scale GeoJSON)
const ISLAND_STATES = {
  'Comoros':                { lon: 44.3, lat: -12.2 },
  'Mauritius':              { lon: 57.5, lat: -20.2 },
  'Seychelles':             { lon: 55.5, lat: -4.7 },
  'Cabo Verde':             { lon: -23.5, lat: 16.0 },
  'São Tomé and Príncipe':  { lon: 6.6, lat: 0.3 },
  'Madagascar':             { lon: 47.0, lat: -19.0 },
};

// Gavi group colors (discrete)
const GAVI_COLORS = {
  'Initial self-financing': '#1a9850',
  'Preparatory transition': '#91cf60',
  'Accelerated transition': '#fee08b',
  'Fully self-financing': '#fc8d59',
  'N/A': '#999999'
};

// Continuous color scale (green gradient)
function getColorScale(value, min, max) {
  if (value === null || value === undefined) return '#ddd';
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  // Green gradient: light to dark
  const r = Math.round(220 - ratio * 200);
  const g = Math.round(240 - ratio * 100);
  const b = Math.round(220 - ratio * 200);
  return `rgb(${r},${g},${b})`;
}

// Simple equirectangular projection for Africa
// Extended to include Mauritius (lon ~58) and Cabo Verde (lon ~-24)
function projectCoords(lon, lat, width, height) {
  const lonMin = -26, lonMax = 60;
  const latMin = -38, latMax = 40;
  const x = ((lon - lonMin) / (lonMax - lonMin)) * width;
  const y = ((latMax - lat) / (latMax - latMin)) * height;
  return [x, y];
}

// Convert GeoJSON geometry to SVG path
function geoToPath(geometry, width, height) {
  const paths = [];

  function processCoords(coords) {
    return coords.map(([lon, lat]) => {
      const [x, y] = projectCoords(lon, lat, width, height);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
  }

  function processRing(ring) {
    const points = processCoords(ring);
    return 'M' + points.join('L') + 'Z';
  }

  if (geometry.type === 'Polygon') {
    // Only use outer ring (first one), skip holes
    paths.push(processRing(geometry.coordinates[0]));
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      paths.push(processRing(polygon[0]));
    }
  }

  return paths.join(' ');
}

// Fetch and cache GeoJSON
async function fetchGeoJson() {
  if (geoJsonCache) return geoJsonCache;

  let lastError = null;

  for (const url of GEOJSON_URLS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const features = (data.features || []).filter(f =>
          AFRICAN_COUNTRIES.has(f.properties?.name)
        );

        if (!features.length) throw new Error('No African features found in GeoJSON source');

        geoJsonCache = {
          type: 'FeatureCollection',
          features
        };

        return geoJsonCache;
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 250 * attempt));
        }
      }
    }
  }

  console.error('Error fetching GeoJSON:', lastError);
  return null;
}

async function updateMap() {
  if (!dom.africaMap) return;

  // Show loading state
  dom.africaMap.innerHTML = '<text x="300" y="350" text-anchor="middle" fill="#999">Loading map...</text>';

  const metric = dom.mapMetric?.value || 'gavi_group';
  const countries = VaccineEngine.getAllCountries();

  // Fetch GeoJSON
  const geoJson = await fetchGeoJson();
  if (!geoJson) {
    dom.africaMap.innerHTML = '<text x="300" y="350" text-anchor="middle" fill="#999">Failed to load map data</text>';
    showDataStatus('Map data is temporarily unavailable. Other views continue to work.');
    return;
  }

  hideDataStatus();

  // Get metric values for all countries
  const countryData = {};
  let minVal = Infinity, maxVal = -Infinity;

  for (const [name, data] of Object.entries(countries)) {
    if (name === 'Total') continue;
    let value = null;

    switch (metric) {
      case 'gavi_group':
        value = data.gaviGroup || 'N/A';
        break;
      case 'coverage_pct':
        const mapAgeGrp = dom.mapAgeGroup?.value || '5-36';
        const cov = VaccineEngine.getCoverageGap(name, mapAgeGrp);
        value = cov?.percentCovered || 0;
        break;
      case 'doses_delivered':
        const totals = VaccineEngine.getTotals(name);
        value = totals?.dosesDelivered || 0;
        break;
      case 'pop_at_risk':
        value = data.populationAtRisk || 0;
        break;
      case 'malaria_cases':
        value = data.malariaCasesPerYear || 0;
        break;
      case 'malaria_deaths':
        value = data.malariaDeathsPerYear || 0;
        break;
    }

    countryData[name] = { ...data, metricValue: value };

    if (metric !== 'gavi_group' && typeof value === 'number') {
      if (value < minVal) minVal = value;
      if (value > maxVal) maxVal = value;
    }
  }

  // SVG dimensions (matching viewBox)
  const width = 650, height = 700;

  // Build SVG paths from GeoJSON
  let svgContent = '';
  const renderedCountries = new Set();

  for (const feature of geoJson.features) {
    const geoName = feature.properties.name;
    const dataName = COUNTRY_NAME_MAP[geoName] || geoName;
    const data = countryData[dataName];
    renderedCountries.add(dataName);

    let fillColor = '#ddd';
    let hasData = false;

    if (data) {
      hasData = true;
      if (metric === 'gavi_group') {
        fillColor = GAVI_COLORS[data.metricValue] || '#ddd';
      } else {
        fillColor = getColorScale(data.metricValue, minVal, maxVal);
      }
    }

    const pathD = geoToPath(feature.geometry, width, height);
    if (pathD) {
      svgContent += `<path d="${pathD}" fill="${fillColor}" data-country="${dataName}" data-geo-name="${geoName}" class="${hasData ? '' : 'no-data'}"/>`;
    }
  }

  // Add circle markers for island states not rendered as polygons
  for (const [islandName, coords] of Object.entries(ISLAND_STATES)) {
    const dataName = COUNTRY_NAME_MAP[islandName] || islandName;
    if (renderedCountries.has(dataName)) continue; // already rendered as polygon

    const [cx, cy] = projectCoords(coords.lon, coords.lat, width, height);
    const data = countryData[dataName];
    let fillColor = '#ddd';
    let hasData = false;

    if (data) {
      hasData = true;
      if (metric === 'gavi_group') {
        fillColor = GAVI_COLORS[data.metricValue] || '#ddd';
      } else {
        fillColor = getColorScale(data.metricValue, minVal, maxVal);
      }
    }

    svgContent += `<circle cx="${cx}" cy="${cy}" r="5" fill="${fillColor}" stroke="#fff" stroke-width="1" data-country="${dataName}" class="${hasData ? '' : 'no-data'}"/>`;
    // Add label
    svgContent += `<text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="#555" font-size="7" pointer-events="none">${shortName(dataName)}</text>`;
  }

  dom.africaMap.innerHTML = svgContent;

  // Add hover handlers for both paths and circles
  dom.africaMap.querySelectorAll('path, circle').forEach(el => {
    el.addEventListener('mouseenter', (e) => showMapTooltip(e, countryData, metric));
    el.addEventListener('mousemove', (e) => moveMapTooltip(e));
    el.addEventListener('mouseleave', hideMapTooltip);
    el.addEventListener('click', (e) => {
      const country = e.target.dataset.country;
      if (country && countryData[country]) {
        // Switch to trends view for this country
        dom.sel.value = country;
        dom.view.value = 'trends';
        updateControlsVisibility();
        updateTrends(country);
      }
    });
  });

  // Update legend
  updateMapLegend(metric, minVal, maxVal);
}

function showMapTooltip(e, countryData, metric) {
  const country = e.target.dataset.country;
  const data = countryData[country];

  if (!dom.mapTooltip || !country) return;

  let content = `<strong>${country}</strong>`;

  if (data) {
    switch (metric) {
      case 'gavi_group':
        content += `<br>Gavi group: ${data.metricValue}`;
        break;
      case 'coverage_pct':
        content += `<br>Coverage: ${data.metricValue.toFixed(1)}%`;
        break;
      case 'doses_delivered':
        content += `<br>Doses delivered: ${fmtNum(data.metricValue)}`;
        break;
      case 'pop_at_risk':
        content += `<br>Population at risk: ${fmtNum(data.metricValue)}`;
        break;
      case 'malaria_cases':
        content += `<br>Malaria cases/year: ${fmtNum(data.metricValue)}`;
        break;
      case 'malaria_deaths':
        content += `<br>Malaria deaths/year: ${fmtNum(data.metricValue)}`;
        break;
    }
  } else {
    content += '<br>No data';
  }

  dom.mapTooltip.innerHTML = content;
  dom.mapTooltip.style.display = 'block';
  moveMapTooltip(e);
}

function moveMapTooltip(e) {
  if (!dom.mapTooltip) return;
  dom.mapTooltip.style.left = (e.clientX + 12) + 'px';
  dom.mapTooltip.style.top = (e.clientY + 12) + 'px';
}

function hideMapTooltip() {
  if (dom.mapTooltip) {
    dom.mapTooltip.style.display = 'none';
  }
}

function updateMapLegend(metric, minVal, maxVal) {
  if (!dom.mapLegend) return;

  if (metric === 'gavi_group') {
    // Discrete legend
    dom.mapLegend.innerHTML = Object.entries(GAVI_COLORS)
      .filter(([k]) => k !== 'N/A')
      .map(([name, color]) =>
        `<div class="map-legend-item">
          <div class="map-legend-color" style="background:${color}"></div>
          <span>${name}</span>
        </div>`
      ).join('');
  } else {
    // Continuous legend (gradient bar)
    const minLabel = fmtCompact(minVal);
    const maxLabel = fmtCompact(maxVal);
    dom.mapLegend.innerHTML = `
      <div class="map-legend-gradient">
        <span>${minLabel}</span>
        <div class="map-legend-bar" style="background:linear-gradient(to right, ${getColorScale(0, 0, 1)}, ${getColorScale(1, 0, 1)})"></div>
        <span>${maxLabel}</span>
      </div>`;
  }
}

// ===== Needs controller
function getAdjustedNeeds(region, ageGroup, vaccine, scenario, projectionYear) {
  const completionRates = VaccineEngine.config?.completionRates?.[scenario] || { dose2: 0.73, dose3: 0.61, dose4: 0.3944 };
  const completionRate = completionRates.dose4;
  const avgDosesPerChild = 1 + (completionRates.dose2 || 0) + (completionRates.dose3 || 0) + (completionRates.dose4 || 0);

  const needs = VaccineEngine.getVaccinationNeeds(region, { ageGroup, vaccine, projectionYear });
  const costEff = VaccineEngine.getCostEffectiveness(region, vaccine);
  const dosesDelivered = needs.covered * 4;
  const effectiveCovered = (dosesDelivered / avgDosesPerChild) * completionRate;
  const effectiveGap = Math.max(0, needs.eligible - effectiveCovered);
  const effectivePctCovered = needs.eligible > 0 ? Math.min(100, (effectiveCovered / needs.eligible) * 100) : 0;
  const rawPctCovered = needs.percentCovered;
  const isOverAllocated = rawPctCovered > 100;
  const effectiveDosesNeeded = effectiveGap * avgDosesPerChild / completionRate;
  const effectiveCostNeeded = effectiveDosesNeeded * needs.pricePerDose;
  const effectiveAnnualDoses = needs.birthsPerYear * avgDosesPerChild / completionRate;
  const effectiveAnnualCost = effectiveAnnualDoses * needs.pricePerDose;

  const adjustedCostPerLife = costEff ? costEff.costPerLifeSaved / completionRate : null;
  const adjustedCostPerCase = costEff ? costEff.costPerCaseAverted / completionRate : null;

  return {
    needs,
    completionRate,
    avgDosesPerChild,
    effectiveCovered,
    effectiveGap,
    effectivePctCovered,
    isOverAllocated,
    rawPctCovered,
    effectiveDosesNeeded,
    effectiveCostNeeded,
    effectiveAnnualDoses,
    effectiveAnnualCost,
    adjustedCostPerLife,
    adjustedCostPerCase
  };
}

function updateProjectionMeta(adjusted) {
  if (!dom.projectionMeta || !adjusted?.needs) return;

  const selectedYear = adjusted.needs.projectionYear;
  const mode = adjusted.needs.projectionMode;

  if (mode === 'table' || mode === 'yearly') {
    dom.projectionMeta.textContent = `Demographic basis: ${selectedYear} country-level yearly projections.`;
    return;
  }

  if (mode === 'growth' || mode === 'fallback') {
    const baseYear = VaccineEngine.getDemographicBaseYear ? VaccineEngine.getDemographicBaseYear() : 2023;
    const defaultRate = VaccineEngine.getDefaultAnnualGrowthRate ? VaccineEngine.getDefaultAnnualGrowthRate() : 0;
    dom.projectionMeta.textContent = `Demographic basis: ${selectedYear} growth projection from ${baseYear} baseline under-5 population and births, using country annualGrowthRate (World Bank 2021-2023 average; default ${(defaultRate * 100).toFixed(1)}% when missing).`;
    return;
  }

  if (Array.isArray(adjusted.needs.countryDetails) && adjusted.needs.countryDetails.length) {
    const yearlyCount = adjusted.needs.countryDetails.filter(c => c.projectionMode === 'table' || c.projectionMode === 'yearly').length;
    const fallbackCount = adjusted.needs.countryDetails.length - yearlyCount;

    if (yearlyCount && fallbackCount) {
      dom.projectionMeta.textContent = `Demographic basis: ${selectedYear} mixed sources (${yearlyCount} countries with yearly projections, ${fallbackCount} using growth fallback).`;
      return;
    }

    if (yearlyCount) {
      dom.projectionMeta.textContent = `Demographic basis: ${selectedYear} country-level yearly projections.`;
      return;
    }

    const baseYear = VaccineEngine.getDemographicBaseYear ? VaccineEngine.getDemographicBaseYear() : 2023;
    const defaultRate = VaccineEngine.getDefaultAnnualGrowthRate ? VaccineEngine.getDefaultAnnualGrowthRate() : 0;
    dom.projectionMeta.textContent = `Demographic basis: ${selectedYear} growth projection from ${baseYear} baseline under-5 population and births, using country annualGrowthRate (World Bank 2021-2023 average; default ${(defaultRate * 100).toFixed(1)}% when missing).`;
    return;
  }

  dom.projectionMeta.textContent = `Demographic basis: ${selectedYear} projection assumptions.`;
}

function updateNeeds(region) {
  if (dom.needs) dom.needs.classList.add('loading');

  region = region || dom.sel.value || 'Africa (total)';
  const ageGroup = dom.ageGroup?.value || '5-36';
  const vaccine = dom.needsVaccine?.value || 'R21';
  const scenario = dom.completionScenario?.value || 'Average';
  const projectionYear = parseInt(dom.projectionYear?.value || '2025', 10);

  const adjusted = getAdjustedNeeds(region, ageGroup, vaccine, scenario, projectionYear);
  updateProjectionMeta(adjusted);

  dom.needsGap.textContent = adjusted.effectiveGap > 0 ? fmtCompact(adjusted.effectiveGap) : '0';

  let coverageText = `${fmtCompact(adjusted.effectiveCovered)} of ${fmtCompact(adjusted.needs.eligible)} fully vaccinated (${adjusted.effectivePctCovered.toFixed(1)}%)`;
  if (adjusted.isOverAllocated) {
    coverageText += ` — Note: more doses allocated than eligible children (${adjusted.rawPctCovered.toFixed(0)}% of eligible population)`;
  }
  dom.needsCoverage.textContent = coverageText;

  dom.needsDoses.textContent = fmtCompact(adjusted.effectiveDosesNeeded);
  dom.needsDosesCost.textContent = `Estimated cost: ${fmtCurrency(adjusted.effectiveCostNeeded)} at $${adjusted.needs.pricePerDose.toFixed(2)}/dose`;

  dom.needsAnnual.textContent = fmtCompact(adjusted.effectiveAnnualDoses);
  dom.needsAnnualCost.textContent = `${fmtCompact(adjusted.needs.birthsPerYear)} births/year = ${fmtCurrency(adjusted.effectiveAnnualCost)}/year`;

  if (adjusted.adjustedCostPerLife != null) {
    dom.needsCostPerLife.textContent = fmtCurrency(adjusted.adjustedCostPerLife);
    dom.needsCostPerCase.textContent = `${fmtCurrency(adjusted.adjustedCostPerCase)} per case averted`;
  } else {
    dom.needsCostPerLife.textContent = '–';
    dom.needsCostPerCase.textContent = '–';
  }

  updateNeedsComparison();
  updateNeedsChart();

  if (dom.needs) dom.needs.classList.remove('loading');
}

// ===== Needs comparison chart
function updateNeedsChart() {
  if (!dom.needsChart) return;

  const metric = dom.needsChartMetric?.value || 'coverage_gap';
  const topN = dom.needsChartTop?.value || '10';
  const ageGroup = dom.ageGroup?.value || '5-36';
  const vaccine = dom.needsVaccine?.value || 'R21';
  const projectionYear = parseInt(dom.projectionYear?.value || '2025', 10);

  // Get all country metrics
  const countries = VaccineEngine.getAllCountryMetrics(ageGroup, vaccine, projectionYear);

  // Build chart data based on selected metric
  let chartData = [];
  let chartTitle = '';

  for (const c of countries) {
    if (!c.name || c.name === 'Africa (total)' || c.name === 'Total') continue;

    let value = 0;
    switch (metric) {
      case 'coverage_gap':
        value = Math.max(0, c.eligiblePopulation - c.childrenVaccinated);
        chartTitle = 'Coverage gap (children not yet vaccinated)';
        break;
      case 'cost_per_life':
        value = c.costPerLifeSaved || 0;
        chartTitle = 'Cost per life saved (USD)';
        break;
      case 'eligible':
        value = c.eligiblePopulation || 0;
        chartTitle = 'Eligible population';
        break;
      case 'doses_needed':
        value = Math.max(0, (c.eligiblePopulation - c.childrenVaccinated) * 4);
        chartTitle = 'Doses needed to close gap';
        break;
    }

    if (value > 0) {
      chartData.push({ name: c.name, value });
    }
  }

  // Sort by value (largest first for gap/eligible/doses, smallest first for cost)
  if (metric === 'cost_per_life') {
    chartData.sort((a, b) => a.value - b.value);
  } else {
    chartData.sort((a, b) => b.value - a.value);
  }

  // Limit to top N
  const limit = topN === 'all' ? chartData.length : parseInt(topN, 10);
  chartData = chartData.slice(0, limit);

  // Render the bar chart
  renderBars(dom.needsChart, chartData, chartTitle, metric);
}

function updateNeedsComparison() {
  if (!dom.needsCompareBody || !dom.needsCompareCount) return;
  const ageGroup = dom.ageGroup?.value || '5-36';
  const vaccine = dom.needsVaccine?.value || 'R21';
  const scenario = dom.completionScenario?.value || 'Average';
  const projectionYear = parseInt(dom.projectionYear?.value || '2025', 10);

  if (!needsSelectedCountries.length) {
    dom.needsCompareBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#666">No countries selected</td></tr>';
    dom.needsCompareCount.textContent = '0 selected';
    lastNeedsComparisonData = [];
    return;
  }

  const rows = needsSelectedCountries.map(country => {
    const adjusted = getAdjustedNeeds(country, ageGroup, vaccine, scenario, projectionYear);
    return {
      country,
      coverageGap: adjusted.effectiveGap,
      coveragePct: adjusted.effectivePctCovered,
      catchUpDoses: adjusted.effectiveDosesNeeded,
      annualDoses: adjusted.effectiveAnnualDoses,
      costPerLife: adjusted.adjustedCostPerLife,
      costPerCase: adjusted.adjustedCostPerCase
    };
  });

  lastNeedsComparisonData = rows;
  dom.needsCompareCount.textContent = `${rows.length} selected`;

  dom.needsCompareBody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.country}</td>
      <td class="num">${row.coverageGap > 0 ? fmtCompact(row.coverageGap) : '0'}</td>
      <td class="num">${row.coveragePct ? row.coveragePct.toFixed(1) + '%' : '0.0%'}</td>
      <td class="num">${row.catchUpDoses > 0 ? fmtCompact(row.catchUpDoses) : '0'}</td>
      <td class="num">${row.annualDoses > 0 ? fmtCompact(row.annualDoses) : '0'}</td>
      <td class="num">${row.costPerLife != null ? fmtCurrency(row.costPerLife) : '–'}</td>
      <td class="num">${row.costPerCase != null ? fmtCurrency(row.costPerCase) : '–'}</td>
    </tr>
  `).join('');
}

function exportCountriesData(extension = 'csv') {
  if (!lastCountriesData.length) return;
  const rows = [
    ['Country', 'Gavi group', 'Eligible population', 'Births/year', 'Children vaccinated', 'Coverage %', 'Cost per life saved (USD)', 'Cost per case averted (USD)', 'Malaria deaths/year']
  ];
  lastCountriesData.forEach(c => {
    rows.push([
      c.name,
      c.gaviGroup || '',
      Math.round(c.eligiblePopulation || 0),
      Math.round(c.birthsPerYear || 0),
      Math.round(c.childrenVaccinated || 0),
      c.pctProtected != null ? c.pctProtected.toFixed(1) : '',
      c.costPerLifeSaved != null ? Math.round(c.costPerLifeSaved) : '',
      c.costPerCaseAverted != null ? Math.round(c.costPerCaseAverted) : '',
      Math.round(c.malariaDeaths || 0)
    ]);
  });
  downloadDelimited(rows, 'malaria_vaccine_countries', extension);
}

function exportShipmentsData(extension = 'csv') {
  if (!lastShipmentsData.length) return;
  const rows = [
    ['Date', 'Country', 'Vaccine', 'Doses', 'Children (est.)', 'Financing', 'Status', 'Effective status', 'Current efficacy %']
  ];
  const now = new Date();
  lastShipmentsData.forEach(s => {
    const date = new Date(s.date);
    const children = Math.round(s.doses / 4);
    const effective = isEffectivelyDelivered(s);
    let efficacyPct = '';
    if (effective) {
      const yearsElapsed = (now - date) / (365.25 * 24 * 3600 * 1000);
      const yearsSinceThirdDose = Math.max(0, yearsElapsed - (4 / 12));
      efficacyPct = (VaccineEngine.getEfficacy(s.vaccine, yearsSinceThirdDose) * 100).toFixed(0);
    }
    rows.push([
      date.toISOString().slice(0, 10),
      s.country,
      s.vaccine,
      s.doses,
      children,
      s.financing || '',
      s.status || '',
      effective ? 'Delivered' : s.status || '',
      efficacyPct
    ]);
  });
  downloadDelimited(rows, 'malaria_vaccine_shipments', extension);
}

function exportNeedsComparisonData(extension = 'csv') {
  if (!lastNeedsComparisonData.length) return;
  const rows = [
    ['Country', 'Coverage gap', 'Coverage %', 'Catch-up doses', 'Annual doses', 'Cost per life saved (USD)', 'Cost per case averted (USD)']
  ];
  lastNeedsComparisonData.forEach(row => {
    rows.push([
      row.country,
      Math.round(row.coverageGap || 0),
      row.coveragePct != null ? row.coveragePct.toFixed(1) : '',
      Math.round(row.catchUpDoses || 0),
      Math.round(row.annualDoses || 0),
      row.costPerLife != null ? Math.round(row.costPerLife) : '',
      row.costPerCase != null ? Math.round(row.costPerCase) : ''
    ]);
  });
  downloadDelimited(rows, 'malaria_vaccine_needs_comparison', extension);
}

// ===== Countries view controller
let countriesSortBy = 'vaccinated-desc';

function updateCountries() {
  if (dom.countriesView) dom.countriesView.classList.add('loading');

  const gaviFilter = dom.countriesGavi?.value || 'all';
  const ageGroup = dom.countriesAgeGroup?.value || '5-36';
  const vaccine = dom.countriesVaccine?.value || 'R21';

  // Get country metrics with selected age group
  let countries = VaccineEngine.getAllCountryMetrics(ageGroup, vaccine, 2023);

  // Filter by Gavi group
  if (gaviFilter !== 'all') {
    countries = countries.filter(c => c.gaviGroup === gaviFilter);
  }

  // Sort
  countries.sort((a, b) => {
    switch (countriesSortBy) {
      case 'eligible-desc': return (b.eligiblePopulation || 0) - (a.eligiblePopulation || 0);
      case 'eligible-asc': return (a.eligiblePopulation || 0) - (b.eligiblePopulation || 0);
      case 'births-desc': return (b.birthsPerYear || 0) - (a.birthsPerYear || 0);
      case 'births-asc': return (a.birthsPerYear || 0) - (b.birthsPerYear || 0);
      case 'vaccinated-desc': return b.childrenVaccinated - a.childrenVaccinated;
      case 'vaccinated-asc': return a.childrenVaccinated - b.childrenVaccinated;
      case 'coverage-desc': return b.pctProtected - a.pctProtected;
      case 'coverage-asc': return a.pctProtected - b.pctProtected;
      case 'cost-life-asc': return (a.costPerLifeSaved || Infinity) - (b.costPerLifeSaved || Infinity);
      case 'cost-life-desc': return (b.costPerLifeSaved || 0) - (a.costPerLifeSaved || 0);
      case 'cost-case-asc': return (a.costPerCaseAverted || Infinity) - (b.costPerCaseAverted || Infinity);
      case 'cost-case-desc': return (b.costPerCaseAverted || 0) - (a.costPerCaseAverted || 0);
      case 'burden-desc': return b.malariaDeaths - a.malariaDeaths;
      case 'burden-asc': return a.malariaDeaths - b.malariaDeaths;
      case 'name': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'gavi': return (a.gaviGroup || '').localeCompare(b.gaviGroup || '');
      case 'gavi-desc': return (b.gaviGroup || '').localeCompare(a.gaviGroup || '');
      default: return 0;
    }
  });

  // Filter to only countries with data
  const countriesWithData = countries.filter(c => c.dosesDelivered > 0 || c.malariaDeaths > 0);

  lastCountriesData = countriesWithData;

  // Summary
  const totalVaccinated = countriesWithData.reduce((sum, c) => sum + c.childrenVaccinated, 0);
  const totalEligible = countriesWithData.reduce((sum, c) => sum + (c.eligiblePopulation || 0), 0);
  const countriesReceiving = countriesWithData.filter(c => c.dosesDelivered > 0).length;
  dom.countriesSummary.innerHTML = `
    <strong>${countriesReceiving}</strong> countries receiving vaccines |
    <strong>${fmtCompact(totalVaccinated)}</strong> of <strong>${fmtCompact(totalEligible)}</strong> eligible children protected
  `;

  // Build rows with population data
  const rows = countriesWithData.map(c => {
    const coverageWidth = Math.min(100, c.pctProtected);
    const coverageClass = c.pctProtected >= 10 ? 'cov-high' : c.pctProtected >= 3 ? 'cov-med' : 'cov-low';
    const costLifeDisplay = c.costPerLifeSaved > 0 ? fmtCurrency(c.costPerLifeSaved) : '–';
    const costCaseDisplay = c.costPerCaseAverted > 0 ? fmtCurrency(c.costPerCaseAverted) : '–';

    return `
      <tr>
        <td>${c.name}</td>
        <td>${c.gaviGroup || '–'}</td>
        <td class="num">${c.eligiblePopulation > 0 ? fmtCompact(c.eligiblePopulation) : '–'}</td>
        <td class="num">${c.birthsPerYear > 0 ? fmtCompact(c.birthsPerYear) : '–'}</td>
        <td class="num">${c.childrenVaccinated > 0 ? fmtCompact(c.childrenVaccinated) : '–'}</td>
        <td class="num coverage-cell">
          <span class="coverage-bar"><span class="coverage-bar-fill ${coverageClass}" style="width:${coverageWidth}%"></span></span>
          <span class="coverage-pct">${c.pctProtected > 0 ? c.pctProtected.toFixed(1) + '%' : '–'}</span>
        </td>
        <td class="num">${costLifeDisplay}</td>
        <td class="num">${costCaseDisplay}</td>
        <td class="num">${c.malariaDeaths > 0 ? fmtNum(c.malariaDeaths) : '–'}</td>
      </tr>
    `;
  }).join('');

  dom.countriesBody.innerHTML = rows || '<tr><td colspan="9" style="text-align:center;color:#666">No data available</td></tr>';

  // Update sort indicators
  updateSortIndicators('countriesTable', countriesSortBy);

  if (dom.countriesView) dom.countriesView.classList.remove('loading');
}

// Toggle sort direction helper
function toggleSort(currentSort, newBase) {
  const isDesc = currentSort.endsWith('-desc');
  const isAsc = currentSort.endsWith('-asc');
  const currentBase = currentSort.replace(/-desc$/, '').replace(/-asc$/, '');

  if (currentBase === newBase.replace(/-desc$/, '').replace(/-asc$/, '')) {
    // Same column: toggle direction
    return isDesc ? currentBase + '-asc' : currentBase + '-desc';
  }
  // Different column: use default direction from data-sort
  return newBase;
}

// Update sort indicator arrows in table headers
function updateSortIndicators(tableId, sortBy) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const headers = table.querySelectorAll('th.sortable');
  headers.forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const dataSort = th.dataset.sort;
    const base = dataSort.replace(/-desc$/, '').replace(/-asc$/, '');
    const sortBase = sortBy.replace(/-desc$/, '').replace(/-asc$/, '');

    if (base === sortBase) {
      if (sortBy.endsWith('-asc')) th.classList.add('sort-asc');
      else th.classList.add('sort-desc');
    }
  });
}

// ===== Sankey diagram for dose flow
function renderSankeyDiagram() {
  const canvas = dom.sankeyCanvas;
  if (!canvas) return;

  // Use fixed height for Sankey
  const ratio = Math.ceil(window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 400;
  const cssH = 180; // Fixed height to prevent squishing
  canvas.width = cssW * ratio;
  canvas.height = cssH * ratio;
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const W = cssW, H = cssH;
  ctx.clearRect(0, 0, W, H);

  const data = VaccineEngine.getDoseFlowData();
  if (!data) return;

  // Update scenario label
  if (dom.sankeyScenario) {
    dom.sankeyScenario.textContent = data.scenario;
  }

  // Simplified Sankey-style visualization
  const padL = 20, padR = 20, padT = 30, padB = 20;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  // Column positions (4 stages + reallocation)
  const cols = [0, 0.25, 0.5, 0.75, 1].map(p => padL + p * chartW);

  // Node heights (proportional to values out of 100)
  const nodeH = (val) => Math.max(8, (val / 100) * (chartH - 40));

  // Colors
  const colors = {
    continue: '#127a3e',
    drop: '#dc3545',
    freed: '#ffc107',
    realloc: '#17a2b8'
  };

  // Draw flows
  ctx.globalAlpha = 0.4;

  // Dose 1 → Dose 2 (continuing)
  const y1Start = padT;
  const h1to2 = nodeH(data.gotDose2);
  ctx.fillStyle = colors.continue;
  drawFlow(ctx, cols[0], y1Start, 30, h1to2, cols[1], y1Start, 30, h1to2);

  // Dose 1 → Drop (after 1)
  const hDrop1 = nodeH(data.dropAt2);
  ctx.fillStyle = colors.drop;
  drawFlow(ctx, cols[0], y1Start + h1to2, 30, hDrop1, cols[1], y1Start + h1to2 + 20, 20, hDrop1);

  // Dose 2 → Dose 3
  const h2to3 = nodeH(data.gotDose3);
  ctx.fillStyle = colors.continue;
  drawFlow(ctx, cols[1], y1Start, 30, h2to3, cols[2], y1Start, 30, h2to3);

  // Dose 2 → Drop
  const hDrop2 = nodeH(data.dropAt3);
  ctx.fillStyle = colors.drop;
  drawFlow(ctx, cols[1], y1Start + h2to3, 30, hDrop2, cols[2], y1Start + h2to3 + 20, 20, hDrop2);

  // Dose 3 → Dose 4
  const h3to4 = nodeH(data.gotDose4);
  ctx.fillStyle = colors.continue;
  drawFlow(ctx, cols[2], y1Start, 30, h3to4, cols[3], y1Start, 30, h3to4);

  // Dose 3 → Drop
  const hDrop3 = nodeH(data.dropAt4);
  ctx.fillStyle = colors.drop;
  drawFlow(ctx, cols[2], y1Start + h3to4, 30, hDrop3, cols[3], y1Start + h3to4 + 20, 20, hDrop3);

  // Freed doses → Reallocation
  const hFreed = nodeH(data.totalFreed / 4); // Scale freed doses
  const hRealloc = nodeH(data.reallocatedStarts);
  ctx.fillStyle = colors.realloc;
  drawFlow(ctx, cols[3], chartH * 0.6, 20, hFreed, cols[4], chartH * 0.5, 30, hRealloc);

  ctx.globalAlpha = 1;

  // Draw node labels
  ctx.fillStyle = '#333';
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center';

  ctx.fillText('Dose 1', cols[0] + 15, padT - 10);
  ctx.fillText('100', cols[0] + 15, padT - 0);

  ctx.fillText('Dose 2', cols[1] + 15, padT - 10);
  ctx.fillText(data.gotDose2.toFixed(0), cols[1] + 15, padT - 0);

  ctx.fillText('Dose 3', cols[2] + 15, padT - 10);
  ctx.fillText(data.gotDose3.toFixed(0), cols[2] + 15, padT - 0);

  ctx.fillText('Dose 4', cols[3] + 15, padT - 10);
  ctx.fillText(data.gotDose4.toFixed(0), cols[3] + 15, padT - 0);

  ctx.fillStyle = colors.realloc;
  ctx.fillText('Realloc', cols[4] - 10, chartH * 0.5 - 10);
  ctx.fillText('+' + data.reallocatedStarts.toFixed(0), cols[4] - 10, chartH * 0.5 + 2);

  // Legend
  if (dom.sankeyLegend) {
    dom.sankeyLegend.innerHTML = `
      <span class="sankey-legend-item"><span class="sankey-legend-color" style="background:${colors.continue}"></span> Continuing</span>
      <span class="sankey-legend-item"><span class="sankey-legend-color" style="background:${colors.drop}"></span> Dropout</span>
      <span class="sankey-legend-item"><span class="sankey-legend-color" style="background:${colors.realloc}"></span> Reallocated</span>
    `;
  }
}

// Helper to draw a curved flow between two rectangles
function drawFlow(ctx, x1, y1, w1, h1, x2, y2, w2, h2) {
  ctx.beginPath();
  ctx.moveTo(x1 + w1, y1);
  ctx.bezierCurveTo(
    x1 + w1 + (x2 - x1 - w1) * 0.5, y1,
    x2 - (x2 - x1 - w1) * 0.5, y2,
    x2, y2
  );
  ctx.lineTo(x2, y2 + h2);
  ctx.bezierCurveTo(
    x2 - (x2 - x1 - w1) * 0.5, y2 + h2,
    x1 + w1 + (x2 - x1 - w1) * 0.5, y1 + h1,
    x1 + w1, y1 + h1
  );
  ctx.closePath();
  ctx.fill();
}

// ===== Shipments controller
let shipmentsSortBy = 'date-desc';

function updateShipments(region) {
  if (dom.shipments) dom.shipments.classList.add('loading');

  region = region || dom.sel.value || 'Africa (total)';
  const statusFilter = dom.shipmentStatus?.value || 'all';
  const vaccineFilter = dom.shipmentVaccine?.value || 'all';

  // Get shipments from engine
  let shipments = [...VaccineEngine.shipments];

  // Filter by region
  if (region !== 'Africa (total)') {
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
    if (shipmentsSortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
    if (shipmentsSortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (shipmentsSortBy === 'doses-desc') return b.doses - a.doses;
    if (shipmentsSortBy === 'doses-asc') return a.doses - b.doses;
    if (shipmentsSortBy === 'country') return a.country.localeCompare(b.country);
    if (shipmentsSortBy === 'country-desc') return b.country.localeCompare(a.country);
    return 0;
  });

  lastShipmentsData = shipments;

  // Update summary (using effective delivery status based on date)
  const totalDoses = shipments.reduce((sum, s) => sum + s.doses, 0);
  const deliveredDoses = shipments.filter(s => isEffectivelyDelivered(s)).reduce((sum, s) => sum + s.doses, 0);
  const futureDoses = totalDoses - deliveredDoses;
  dom.shipmentsSummary.innerHTML = `
    <strong>${shipments.length}</strong> shipments shown |
    <strong>${fmtCompact(totalDoses)}</strong> total doses
    (${fmtCompact(deliveredDoses)} delivered${futureDoses > 0 ? `, ${fmtCompact(futureDoses)} scheduled` : ''})
  `;

  // Build table rows
  const now = new Date();
  const rows = shipments.map(s => {
    const date = new Date(s.date);
    const dateStr = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const children = Math.round(s.doses / 4);
    const effectivelyDelivered = isEffectivelyDelivered(s);
    const statusClass = effectivelyDelivered ? 'status-delivered' : 'status-scheduled';
    const displayStatus = effectivelyDelivered ? 'Delivered' : s.status;

    // Calculate current efficacy if effectively delivered
    let efficacyHtml = '<span class="efficacy-badge efficacy-na">N/A</span>';
    if (effectivelyDelivered) {
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
        <td class="${statusClass}">${displayStatus}</td>
        <td>${efficacyHtml}</td>
      </tr>
    `;
  }).join('');

  dom.shipmentsBody.innerHTML = rows || '<tr><td colspan="8" style="text-align:center;color:#666">No shipments found</td></tr>';

  // Update sort indicators
  updateSortIndicators('shipmentsTable', shipmentsSortBy);

  if (dom.shipments) dom.shipments.classList.remove('loading');
}

// ===== Efficacy chart for About page
function renderEfficacyChart() {
  const canvas = dom.efficacyChart;
  if (!canvas) return;

  const { ctx, W, H } = ensureHiDPI(canvas);
  ctx.clearRect(0, 0, W, H);

  const padL = 50, padR = 20, padT = 20, padB = 52;
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
  ctx.fillText('Years since third dose', padL + chartW / 2, H - 18);
}

// ===== Controls visibility
function updateControlsVisibility(){
  const viewVal = dom.view.value;
  const isTrack = (viewVal === 'trackers');
  const isTrends = (viewVal === 'trends');
  const isCompare = (viewVal === 'compare');
  const isMap = (viewVal === 'map');
  const isCountries = (viewVal === 'countries');
  const isNeeds = (viewVal === 'needs');
  const isShipments = (viewVal === 'shipments');

  // page sections
  dom.dashboard.style.display = (!isCompare && !isMap) ? 'block' : 'none';
  dom.compare.style.display   = isCompare ? 'block' : 'none';
  if (dom.mapView) dom.mapView.style.display = isMap ? 'block' : 'none';

  // within dashboard
  dom.trackers.style.display = isTrack ? 'block' : 'none';
  dom.trends.style.display   = isTrends ? 'block' : 'none';
  if (dom.countriesView) dom.countriesView.style.display = isCountries ? 'block' : 'none';
  if (dom.needs) dom.needs.style.display = isNeeds ? 'block' : 'none';
  if (dom.shipments) dom.shipments.style.display = isShipments ? 'block' : 'none';

  // shipments blurb only under trackers
  dom.ship.style.display = isTrack ? 'block' : 'none';

  // second row (controlsRow) shows only when needed
  const showRow = isTrends || isCompare;
  dom.controlsRow.style.display = showRow ? 'flex' : 'none';

  // controls inside row
  const showMetric = isTrends || isCompare;
  dom.metricLbl.style.display = showMetric ? '' : 'none';
  dom.trendMetric.style.display = showMetric ? '' : 'none';

  // Show/hide metric options based on view type
  // Static metrics (compare-only): pmi_funding, malaria_cases, malaria_deaths, coverage_pct, pop_at_risk, pop_under_5
  const compareOnlyMetrics = ['pmi_funding', 'malaria_cases', 'malaria_deaths', 'coverage_pct', 'pop_at_risk', 'pop_under_5'];
  const options = dom.trendMetric.options;
  for (let i = 0; i < options.length; i++) {
    const opt = options[i];
    if (compareOnlyMetrics.includes(opt.value)) {
      opt.style.display = isCompare ? '' : 'none';
    }
  }

  // If in Trends view and current metric is compare-only, switch to a valid metric
  if (isTrends && compareOnlyMetrics.includes(dom.trendMetric.value)) {
    dom.trendMetric.value = 'doses_delivered';
  }

  // Range only in trends view
  dom.rangeLbl.style.display = isTrends ? '' : 'none';
  dom.range.style.display    = isTrends ? '' : 'none';

  // Vaccine only for dose metrics in trends view
  const m = dom.trendMetric.value;
  const showVacc = isTrends && (m==='doses' || m==='doses_delivered');
  if (dom.vaccWrap) dom.vaccWrap.style.display = showVacc ? '' : 'none';

  // Gavi filter only in compare mode
  if (dom.gaviLbl) dom.gaviLbl.style.display = isCompare ? '' : 'none';
  if (dom.gaviFilter) dom.gaviFilter.style.display = isCompare ? '' : 'none';

  // Compare-only controls
  dom.sortLbl.style.display = isCompare ? '' : 'none';
  dom.sort.style.display    = isCompare ? '' : 'none';

  // Country picker buttons
  if (dom.rankingPickerWrap) {
    dom.rankingPickerWrap.style.display = isCompare ? '' : 'none';
  }
  if (dom.compareCountriesWrap) {
    dom.compareCountriesWrap.style.display = isTrends ? '' : 'none';
  }

  // Metric info button - update tooltip based on selected metric
  const METRIC_TOOLTIP_MAP = {
    'doses_delivered': 'doses-delivered',
    'doses': 'doses-administered',
    'children': 'children-vaccinated',
    'cases': 'cases-averted',
    'lives': 'lives-saved',
    'coverage_pct': 'coverage-pct',
  };
  if (dom.metricInfoBtn) {
    const tooltipId = METRIC_TOOLTIP_MAP[m];
    if (tooltipId && (isTrends || isCompare)) {
      dom.metricInfoBtn.dataset.tooltip = tooltipId;
      dom.metricInfoBtn.style.display = '';
    } else {
      dom.metricInfoBtn.style.display = 'none';
    }
  }

  // Model controls - show when estimated metric is selected
  const estimatedMetrics = ['doses', 'children', 'cases', 'lives', 'coverage_pct'];
  const isEstimatedMetric = estimatedMetrics.includes(m);
  const needsCompletionRate = ['children', 'cases', 'lives', 'coverage_pct'].includes(m);
  const needsRollout = ['doses', 'children', 'cases', 'lives'].includes(m);

  if (dom.modelControlsWrap) {
    dom.modelControlsWrap.style.display = ((isTrends || isCompare) && needsCompletionRate) ? '' : 'none';
  }
  if (dom.rolloutControlWrap) {
    dom.rolloutControlWrap.style.display = (isTrends && needsRollout) ? '' : 'none';
  }

  // Map controls - show when coverage is selected
  const isMapCoverage = isMap && dom.mapMetric?.value === 'coverage_pct';
  if (dom.mapCompletionWrap) {
    dom.mapCompletionWrap.style.display = isMapCoverage ? '' : 'none';
  }
  if (dom.mapAgeGroupWrap) {
    dom.mapAgeGroupWrap.style.display = isMapCoverage ? '' : 'none';
  }
}

async function renderCurrentView() {
  const region = dom.sel.value || 'Africa (total)';
  const viewVal = dom.view.value;
  if (viewVal === 'trackers') await loadTicker(region);
  if (viewVal === 'trends') {
    if (trendSelectedCountries.length > 1) updateMultiCountryTrends();
    else updateTrends(region);
  }
  if (viewVal === 'compare') updateCompare();
  if (viewVal === 'map') updateMap();
  if (viewVal === 'countries') updateCountries();
  if (viewVal === 'needs') updateNeeds(region);
  if (viewVal === 'shipments') updateShipments(region);
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
      // Don't clear seriesCache - the cache key includes vaccine filter
      if (dom.view.value==='trends'){
        updateTrends(dom.sel.value || 'Africa (total)');
      }
      scheduleHashUpdate();
    });
  }

  // Download buttons
  const downloadTrendBtn = document.getElementById('downloadTrend');
  const downloadTrendCsvBtn = document.getElementById('downloadTrendCsv');
  const downloadCompareBtn = document.getElementById('downloadCompare');
  const downloadCompareCsvBtn = document.getElementById('downloadCompareCsv');

  if (downloadTrendBtn) {
    downloadTrendBtn.addEventListener('click', () => {
      const region = dom.sel.value || 'Africa (total)';
      const metric = dom.trendMetric.value;
      const name = `malaria_vaccine_${metricTitle(metric).replace(/\s+/g, '_')}_${region.replace(/\s+/g, '_')}`;
      downloadChart(dom.tCanvas, name);
    });
  }

  if (downloadTrendCsvBtn) {
    downloadTrendCsvBtn.addEventListener('click', () => {
      const region = dom.sel.value || 'Africa (total)';
      const metric = dom.trendMetric.value;
      const name = `malaria_vaccine_${metricTitle(metric).replace(/\s+/g, '_')}_${region.replace(/\s+/g, '_')}_data`;
      downloadChartCsv(dom.tCanvas, name);
    });
  }

  if (downloadCompareBtn) {
    downloadCompareBtn.addEventListener('click', () => {
      const metric = dom.trendMetric.value;
      const name = `malaria_vaccine_compare_${metricTitle(metric).replace(/\s+/g, '_')}`;
      downloadChart(dom.bars, name);
    });
  }

  if (downloadCompareCsvBtn) {
    downloadCompareCsvBtn.addEventListener('click', () => {
      const metric = dom.trendMetric.value;
      const name = `malaria_vaccine_compare_${metricTitle(metric).replace(/\s+/g, '_')}_data`;
      downloadChartCsv(dom.bars, name);
    });
  }

  // Bar chart hover tooltips
  setupBarHover(dom.bars, dom.barsTip);
  setupBarHover(dom.needsChart, dom.needsBarsTip);

  // Country picker events
  if (dom.countryPickerClose) {
    dom.countryPickerClose.addEventListener('click', closeCountryPicker);
  }
  if (dom.countryPickerOverlay) {
    dom.countryPickerOverlay.addEventListener('click', closeCountryPicker);
  }
  if (dom.countryPickerAll) {
    dom.countryPickerAll.addEventListener('click', () => {
      dom.countryPickerList?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
      updatePickerCount();
    });
  }
  if (dom.countryPickerNone) {
    dom.countryPickerNone.addEventListener('click', () => {
      dom.countryPickerList?.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      updatePickerCount();
    });
  }
  if (dom.countryPickerList) {
    dom.countryPickerList.addEventListener('change', updatePickerCount);
  }
  if (dom.countryPickerApply) {
    dom.countryPickerApply.addEventListener('click', applyCountrySelection);
  }

  // Ranking picker button
  if (dom.rankingPickerBtn) {
    dom.rankingPickerBtn.addEventListener('click', () => openCountryPicker('rankings'));
  }

  if (dom.copyShareLink) {
    dom.copyShareLink.addEventListener('click', copyCurrentShareLink);
  }

  dom.sel.addEventListener('change', async ()=>{
    const region = dom.sel.value || 'Africa (total)';
    const viewVal = dom.view.value;
    // Only reload tracker for views that use country selection
    if (viewVal === 'trackers') await loadTicker(region);
    if (viewVal === 'trends') updateTrends(region);
    if (viewVal === 'needs') updateNeeds(region);
    if (viewVal === 'shipments') updateShipments(region);
    scheduleHashUpdate();
  });

  dom.view.addEventListener('change', async ()=>{
    updateControlsVisibility();
    const region = dom.sel.value || 'Africa (total)';
    const viewVal = dom.view.value;
    if (viewVal === 'trackers') await loadTicker(region);
    if (viewVal === 'trends') updateTrends(region);
    if (viewVal === 'compare') updateCompare();
    if (viewVal === 'map') updateMap();
    if (viewVal === 'countries') updateCountries();
    if (viewVal === 'needs') updateNeeds(region);
    if (viewVal === 'shipments') updateShipments(region);
    scheduleHashUpdate();
  });

  // Compare countries button (trends view)
  if (dom.compareCountriesBtn) {
    dom.compareCountriesBtn.addEventListener('click', () => openCountryPicker('trends'));
  }

  if (dom.needsCompareBtn) {
    dom.needsCompareBtn.addEventListener('click', () => openCountryPicker('needs'));
  }

  // Map metric change
  if (dom.mapMetric) {
    dom.mapMetric.addEventListener('change', () => {
      updateControlsVisibility();
      updateMap();
      scheduleHashUpdate();
    });
  }

  // Countries view controls
  if (dom.countriesGavi) {
    dom.countriesGavi.addEventListener('change', () => {
      if (dom.view.value === 'countries') updateCountries();
      scheduleHashUpdate();
    });
  }
  if (dom.countriesVaccine) {
    dom.countriesVaccine.addEventListener('change', () => {
      if (dom.view.value === 'countries') updateCountries();
      scheduleHashUpdate();
    });
  }
  if (dom.countriesAgeGroup) {
    dom.countriesAgeGroup.addEventListener('change', () => {
      if (dom.view.value === 'countries') updateCountries();
      scheduleHashUpdate();
    });
  }

  // Click-to-sort for countries table
  document.querySelectorAll('#countriesTable th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const newSort = th.dataset.sort;
      countriesSortBy = toggleSort(countriesSortBy, newSort);
      updateCountries();
    });
  });

  // Click-to-sort for shipments table
  document.querySelectorAll('#shipmentsTable th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const newSort = th.dataset.sort;
      shipmentsSortBy = toggleSort(shipmentsSortBy, newSort);
      updateShipments(dom.sel.value || 'Africa (total)');
    });
  });

  // Tracker completion rate toggle
  if (dom.trackerCompletion) {
    dom.trackerCompletion.addEventListener('change', async ()=>{
      const scenario = dom.trackerCompletion.value;
      VaccineEngine.setCompletionScenario(scenario);
      // Sync all completion dropdowns
      if (dom.completionScenario) dom.completionScenario.value = scenario;
      if (dom.chartCompletion) dom.chartCompletion.value = scenario;
      if (dom.countriesCompletion) dom.countriesCompletion.value = scenario;
      if (dom.mapCompletion) dom.mapCompletion.value = scenario;
      // Reload tracker with new completion rate
      await loadTicker(dom.sel.value || 'Africa (total)');
      scheduleHashUpdate();
    });
  }

  // Roll-out period toggle
  if (dom.rolloutPeriod) {
    dom.rolloutPeriod.addEventListener('change', async ()=>{
      const months = parseInt(dom.rolloutPeriod.value, 10);
      VaccineEngine.setRolloutMonths(months);
      // Sync with chart rollout
      if (dom.chartRollout) dom.chartRollout.value = months;
      // Reload tracker with new roll-out period
      await loadTicker(dom.sel.value || 'Africa (total)');
      scheduleHashUpdate();
    });
  }

  // Needs view controls
  if (dom.ageGroup) {
    dom.ageGroup.addEventListener('change', ()=>{
      if (dom.view.value==='needs') updateNeeds(dom.sel.value||'Africa (total)');
      scheduleHashUpdate();
    });
  }
  if (dom.needsVaccine) {
    dom.needsVaccine.addEventListener('change', ()=>{
      if (dom.view.value==='needs') updateNeeds(dom.sel.value||'Africa (total)');
      scheduleHashUpdate();
    });
  }
  if (dom.projectionYear) {
    dom.projectionYear.addEventListener('change', ()=>{
      if (dom.view.value==='needs') updateNeeds(dom.sel.value||'Africa (total)');
      scheduleHashUpdate();
    });
  }
  if (dom.completionScenario) {
    dom.completionScenario.addEventListener('change', async ()=>{
      const scenario = dom.completionScenario.value;
      VaccineEngine.setCompletionScenario(scenario);
      // Sync all completion dropdowns
      if (dom.trackerCompletion) dom.trackerCompletion.value = scenario;
      if (dom.chartCompletion) dom.chartCompletion.value = scenario;
      if (dom.countriesCompletion) dom.countriesCompletion.value = scenario;
      if (dom.mapCompletion) dom.mapCompletion.value = scenario;
      if (dom.view.value==='needs') updateNeeds(dom.sel.value||'Africa (total)');
      scheduleHashUpdate();
    });
  }

  // Needs chart controls
  if (dom.needsChartMetric) {
    dom.needsChartMetric.addEventListener('change', () => {
      if (dom.view.value === 'needs') updateNeedsChart();
      scheduleHashUpdate();
    });
  }
  if (dom.needsChartTop) {
    dom.needsChartTop.addEventListener('change', () => {
      if (dom.view.value === 'needs') updateNeedsChart();
      scheduleHashUpdate();
    });
  }

  // Needs chart download button
  const downloadNeedsBtn = document.getElementById('downloadNeeds');
  const downloadNeedsCsvBtn = document.getElementById('downloadNeedsCsv');
  if (downloadNeedsBtn) {
    downloadNeedsBtn.addEventListener('click', () => {
      const metric = dom.needsChartMetric?.value || 'coverage_gap';
      const metricLabels = {
        coverage_gap: 'Coverage_Gap',
        cost_per_life: 'Cost_Per_Life',
        eligible: 'Eligible_Population',
        doses_needed: 'Doses_Needed'
      };
      const name = `malaria_vaccine_needs_${metricLabels[metric]}`;
      downloadChart(dom.needsChart, name);
    });
  }
  if (downloadNeedsCsvBtn) {
    downloadNeedsCsvBtn.addEventListener('click', () => {
      const metric = dom.needsChartMetric?.value || 'coverage_gap';
      const metricLabels = {
        coverage_gap: 'Coverage_Gap',
        cost_per_life: 'Cost_Per_Life',
        eligible: 'Eligible_Population',
        doses_needed: 'Doses_Needed'
      };
      const name = `malaria_vaccine_needs_${metricLabels[metric]}_data`;
      downloadChartCsv(dom.needsChart, name);
    });
  }

  const exportCountriesCsvBtn = document.getElementById('exportCountriesCsv');
  const exportCountriesXlsBtn = document.getElementById('exportCountriesXls');
  if (exportCountriesCsvBtn) exportCountriesCsvBtn.addEventListener('click', () => exportCountriesData('csv'));
  if (exportCountriesXlsBtn) exportCountriesXlsBtn.addEventListener('click', () => exportCountriesData('xls'));

  const exportShipmentsCsvBtn = document.getElementById('exportShipmentsCsv');
  const exportShipmentsXlsBtn = document.getElementById('exportShipmentsXls');
  if (exportShipmentsCsvBtn) exportShipmentsCsvBtn.addEventListener('click', () => exportShipmentsData('csv'));
  if (exportShipmentsXlsBtn) exportShipmentsXlsBtn.addEventListener('click', () => exportShipmentsData('xls'));

  const exportNeedsCompareCsvBtn = document.getElementById('exportNeedsCompareCsv');
  const exportNeedsCompareXlsBtn = document.getElementById('exportNeedsCompareXls');
  if (exportNeedsCompareCsvBtn) exportNeedsCompareCsvBtn.addEventListener('click', () => exportNeedsComparisonData('csv'));
  if (exportNeedsCompareXlsBtn) exportNeedsCompareXlsBtn.addEventListener('click', () => exportNeedsComparisonData('xls'));

  // Shipments view controls
  if (dom.shipmentStatus) {
    dom.shipmentStatus.addEventListener('change', ()=>{
      if (dom.view.value==='shipments') updateShipments(dom.sel.value||'Africa (total)');
      scheduleHashUpdate();
    });
  }
  if (dom.shipmentVaccine) {
    dom.shipmentVaccine.addEventListener('change', ()=>{
      if (dom.view.value==='shipments') updateShipments(dom.sel.value||'Africa (total)');
      scheduleHashUpdate();
    });
  }

  // Gavi filter for compare mode
  if (dom.gaviFilter) {
    dom.gaviFilter.addEventListener('change', ()=>{
      if (dom.view.value==='compare') updateCompare();
      scheduleHashUpdate();
    });
  }

  dom.trendMetric.addEventListener('change', ()=>{
    // Don't clear seriesCache - the cache key includes metric, so different metrics don't conflict
    updateControlsVisibility();
    if (dom.view.value==='trends'){
      updateTrends(dom.sel.value||'Africa (total)');
    }
    if (dom.view.value==='compare') updateCompare();
    scheduleHashUpdate();
  });

  dom.range.addEventListener('change', ()=>{
    // Don't clear seriesCache - the cache key includes range, so different ranges don't conflict
    if (dom.view.value==='trends'){
      updateTrends(dom.sel.value||'Africa (total)');
    }
    scheduleHashUpdate();
  });

  dom.sort.addEventListener('change', ()=>{
    if (dom.view.value==='compare') updateCompare();
    scheduleHashUpdate();
  });

  // Model controls for charts (completion rate, roll-out period)
  if (dom.chartCompletion) {
    dom.chartCompletion.addEventListener('change', () => {
      const scenario = dom.chartCompletion.value;
      VaccineEngine.setCompletionScenario(scenario);
      // Sync all completion dropdowns
      if (dom.trackerCompletion) dom.trackerCompletion.value = scenario;
      if (dom.completionScenario) dom.completionScenario.value = scenario;
      if (dom.countriesCompletion) dom.countriesCompletion.value = scenario;
      if (dom.mapCompletion) dom.mapCompletion.value = scenario;
      // Refresh current view
      if (dom.view.value === 'trends') updateTrends(dom.sel.value || 'Africa (total)');
      if (dom.view.value === 'compare') updateCompare();
      scheduleHashUpdate();
    });
  }

  if (dom.chartRollout) {
    dom.chartRollout.addEventListener('change', () => {
      const months = parseInt(dom.chartRollout.value, 10);
      VaccineEngine.setRolloutMonths(months);
      // Sync with tracker rollout
      if (dom.rolloutPeriod) dom.rolloutPeriod.value = months;
      // Refresh current view
      if (dom.view.value === 'trends') updateTrends(dom.sel.value || 'Africa (total)');
      if (dom.view.value === 'compare') updateCompare();
      scheduleHashUpdate();
    });
  }

  // Countries view completion control
  if (dom.countriesCompletion) {
    dom.countriesCompletion.addEventListener('change', () => {
      const scenario = dom.countriesCompletion.value;
      VaccineEngine.setCompletionScenario(scenario);
      // Sync all completion dropdowns
      if (dom.trackerCompletion) dom.trackerCompletion.value = scenario;
      if (dom.completionScenario) dom.completionScenario.value = scenario;
      if (dom.chartCompletion) dom.chartCompletion.value = scenario;
      if (dom.mapCompletion) dom.mapCompletion.value = scenario;
      // Refresh countries view
      updateCountries();
      scheduleHashUpdate();
    });
  }

  // Map completion control
  if (dom.mapCompletion) {
    dom.mapCompletion.addEventListener('change', () => {
      const scenario = dom.mapCompletion.value;
      VaccineEngine.setCompletionScenario(scenario);
      // Sync all completion dropdowns
      if (dom.trackerCompletion) dom.trackerCompletion.value = scenario;
      if (dom.completionScenario) dom.completionScenario.value = scenario;
      if (dom.chartCompletion) dom.chartCompletion.value = scenario;
      if (dom.countriesCompletion) dom.countriesCompletion.value = scenario;
      // Refresh map
      updateMap();
      scheduleHashUpdate();
    });
  }

  // Map age group control
  if (dom.mapAgeGroup) {
    dom.mapAgeGroup.addEventListener('change', () => {
      updateMap();
      scheduleHashUpdate();
    });
  }

  // Resize redraws (debounced)
  window.addEventListener('resize', debounce(()=>{
    if (dom.view.value==='compare') updateCompare();
    else if (dom.view.value==='trends') updateTrends(dom.sel.value||'Africa (total)');
    // Redraw efficacy chart if panel is open
    if (dom.infoPanel?.classList.contains('open')) renderEfficacyChart();
  }, 150));

  // Info panel toggle
  let lastFocusedElement = null;

  function openInfoPanel() {
    lastFocusedElement = document.activeElement;
    dom.infoPanel?.classList.add('open');
    dom.infoPanelOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Render efficacy chart and Sankey diagram when panel opens
    setTimeout(() => {
      renderEfficacyChart();
      renderSankeyDiagram();
      dom.infoPanelClose?.focus();
    }, 50);
  }

  function closeInfoPanel() {
    dom.infoPanel?.classList.remove('open');
    dom.infoPanelOverlay?.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  dom.infoBtn?.addEventListener('click', openInfoPanel);
  dom.infoPanelClose?.addEventListener('click', closeInfoPanel);
  dom.infoPanelOverlay?.addEventListener('click', closeInfoPanel);

  // Footer "About the model" link
  document.getElementById('openAboutFooter')?.addEventListener('click', (e) => {
    e.preventDefault();
    openInfoPanel();
  });

  // All "About the model" links throughout the page
  document.querySelectorAll('.open-about-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openInfoPanel();
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (dom.countryPicker?.style.display === 'flex') {
      closeCountryPicker();
      return;
    }
    if (dom.infoPanel?.classList.contains('open')) {
      closeInfoPanel();
    }
  });

  // Info tooltips
  const tooltipPopup = dom.tooltipPopup;
  let activeTooltipId = null;

  function showTooltip(btn) {
    const tooltipId = btn.dataset.tooltip;
    const content = document.querySelector(`[data-tooltip-id="${tooltipId}"]`);
    if (!content || !tooltipPopup) return;

    // Clone content to popup
    tooltipPopup.innerHTML = content.innerHTML;
    tooltipPopup.style.display = 'block';
    activeTooltipId = tooltipId;

    // Position near button (using viewport coords for position:fixed)
    const rect = btn.getBoundingClientRect();

    // Use setTimeout to ensure dimensions are calculated after display:block
    setTimeout(() => {
      const popupWidth = tooltipPopup.offsetWidth;
      const popupHeight = tooltipPopup.offsetHeight;

      let left = rect.left;
      let top = rect.bottom + 8;

      // Keep within viewport horizontally
      if (left + popupWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popupWidth - 16);
      }
      if (left < 16) {
        left = 16;
      }

      // Keep within viewport vertically
      if (top + popupHeight > window.innerHeight - 16) {
        top = rect.top - popupHeight - 8;
        if (top < 16) {
          top = 16;
        }
      }

      tooltipPopup.style.left = left + 'px';
      tooltipPopup.style.top = top + 'px';
    }, 0);
  }

  function hideTooltip() {
    if (tooltipPopup) {
      tooltipPopup.style.display = 'none';
    }
    activeTooltipId = null;
  }

  // Use event delegation for all tooltip buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.info-tooltip-btn');

    if (btn) {
      // Clicked on an info button
      e.preventDefault();
      e.stopPropagation();

      const tooltipId = btn.dataset.tooltip;

      if (activeTooltipId === tooltipId) {
        // Same button - toggle off
        hideTooltip();
      } else {
        // Different button - hide current, show new
        hideTooltip();
        showTooltip(btn);
      }
    } else if (!e.target.closest('.tooltip-popup')) {
      // Clicked outside tooltip and buttons - hide
      hideTooltip();
    }
  });
}

// ===== Init
(async function init(){
  try {
    // Load local data first
    await VaccineEngine.loadData();

    hideDataStatus();
    await populateCountries();
    wire();
    applyStateFromHash();
    syncSelectionButtons();
    updateControlsVisibility();
    await renderCurrentView();

    window.addEventListener('hashchange', async () => {
      applyStateFromHash();
      syncSelectionButtons();
      updateControlsVisibility();
      await renderCurrentView();
    });

    console.log('App initialized with local data engine');
  } catch (e) {
    console.error('Failed to initialize:', e);
    [dom.cTot,dom.lTot,dom.cTim,dom.lTim].forEach($=>$.textContent='Load error');
    showDataStatus('We could not load the data files. Please refresh or try again later.');
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
