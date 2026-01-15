/* Malaria Vaccine Impact Calculation Engine
 * Replaces Google Sheets calculations with local JavaScript
 * Uses "six-month roll-out + waning efficacy" scenario only
 * Build: 2026-01-15
 */

const VaccineEngine = (function() {
  'use strict';

  // Data containers (loaded async)
  let shipments = [];
  let countries = {};
  let config = {};
  let dataLoaded = false;

  // Constants
  const SECS_YEAR = 365.25 * 24 * 3600;
  const DOSES_PER_CHILD = 3;
  const ROLLOUT_MONTHS = 6; // six-month roll-out model

  // ===== Data Loading =====
  async function loadData() {
    if (dataLoaded) return;

    try {
      const [shipmentsData, countriesData, configData] = await Promise.all([
        fetch('data/shipments.json').then(r => r.json()),
        fetch('data/countries.json').then(r => r.json()),
        fetch('data/config.json').then(r => r.json())
      ]);

      shipments = shipmentsData;

      // Index countries by name for fast lookup
      countries = {};
      for (const c of countriesData) {
        countries[c.name] = c;
      }

      config = configData;
      dataLoaded = true;
      console.log(`Engine loaded: ${shipments.length} shipments, ${Object.keys(countries).length} countries`);
    } catch (e) {
      console.error('Failed to load data:', e);
      throw e;
    }
  }

  // ===== Efficacy Curve =====
  // Interpolates vaccine efficacy at a given time (years since third dose)
  function getEfficacy(vaccine, yearsElapsed) {
    const curve = config.efficacy[vaccine];
    if (!curve) return 0;

    const points = curve.points;
    if (yearsElapsed <= 0) return points[0].efficacy;

    // Find surrounding points for interpolation
    for (let i = 0; i < points.length - 1; i++) {
      if (yearsElapsed >= points[i].years && yearsElapsed <= points[i + 1].years) {
        // Linear interpolation
        const t = (yearsElapsed - points[i].years) / (points[i + 1].years - points[i].years);
        return points[i].efficacy + t * (points[i + 1].efficacy - points[i].efficacy);
      }
    }

    // Beyond last point - use exponential decay
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    const decayRate = Math.log(secondLast.efficacy / last.efficacy) / (last.years - secondLast.years);
    return last.efficacy * Math.exp(-decayRate * (yearsElapsed - last.years));
  }

  // ===== Time Calculations =====
  function parseDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function yearsBetween(date1, date2) {
    return (date2 - date1) / (SECS_YEAR * 1000);
  }

  // Time since third dose, accounting for six-month roll-out
  // Third dose is administered 3 months after first dose starts
  function yearsSinceThirdDose(shipmentDate, now = new Date()) {
    const d = parseDate(shipmentDate);
    if (!d) return 0;

    // Six-month roll-out: first doses spread over 6 months
    // Average third dose is at: delivery + 3 months (midpoint of roll-out) + 3 months (dose timing)
    // Simplified: third dose at delivery + 4 months
    const thirdDoseDate = new Date(d);
    thirdDoseDate.setMonth(thirdDoseDate.getMonth() + 4);

    return Math.max(0, yearsBetween(thirdDoseDate, now));
  }

  // ===== Impact Calculations =====

  // Calculate impact for a single shipment
  function calculateShipmentImpact(shipment, now = new Date()) {
    const country = countries[shipment.country];
    if (!country) return { casesAverted: 0, livesSaved: 0, childrenCovered: 0 };

    const d = parseDate(shipment.date);
    if (!d || d > now) return { casesAverted: 0, livesSaved: 0, childrenCovered: 0 };

    const children = shipment.doses / DOSES_PER_CHILD;
    const yearsElapsed = yearsSinceThirdDose(shipment.date, now);
    const efficacy = getEfficacy(shipment.vaccine, yearsElapsed);

    // Malaria burden rates (per child per year at risk)
    // casesPerMillion is per million population at risk
    // We need to convert to per-child rate
    const casesPerChildPerYear = (country.casesPerMillion / 1e6);
    const deathsPerChildPerYear = (country.deathsPerMillion / 1e6);

    // Impact = children * efficacy * burden_rate * years_of_protection
    // For cumulative impact, we integrate efficacy over time
    // Simplified: use average efficacy over time elapsed
    const avgEfficacy = calculateAverageEfficacy(shipment.vaccine, yearsElapsed);

    const casesAverted = children * avgEfficacy * casesPerChildPerYear * yearsElapsed;
    const livesSaved = children * avgEfficacy * deathsPerChildPerYear * yearsElapsed;

    return {
      casesAverted,
      livesSaved,
      childrenCovered: children,
      currentEfficacy: efficacy,
      yearsElapsed
    };
  }

  // Average efficacy from 0 to t years (integral approximation)
  function calculateAverageEfficacy(vaccine, yearsElapsed) {
    if (yearsElapsed <= 0) return 0;

    // Numerical integration using trapezoidal rule
    const steps = Math.max(1, Math.ceil(yearsElapsed * 12)); // monthly steps
    const dt = yearsElapsed / steps;
    let sum = 0;

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const w = (i === 0 || i === steps) ? 0.5 : 1;
      sum += w * getEfficacy(vaccine, t);
    }

    return sum * dt / yearsElapsed;
  }

  // ===== Aggregations =====

  // Get totals for Africa or a specific country
  function getTotals(region = 'Africa (overall)', now = new Date()) {
    const filteredShipments = (region === 'Africa (overall)')
      ? shipments
      : shipments.filter(s => s.country === region);

    let totalCases = 0, totalLives = 0, totalChildren = 0, totalDoses = 0;
    let casesPerYear = 0, livesPerYear = 0;

    for (const s of filteredShipments) {
      const d = parseDate(s.date);
      if (!d || d > now) continue;

      const impact = calculateShipmentImpact(s, now);
      totalCases += impact.casesAverted;
      totalLives += impact.livesSaved;
      totalChildren += impact.childrenCovered;
      totalDoses += s.doses;

      // Current rate contribution (based on current efficacy)
      const country = countries[s.country];
      if (country && impact.yearsElapsed > 0) {
        const casesPerChildPerYear = country.casesPerMillion / 1e6;
        const deathsPerChildPerYear = country.deathsPerMillion / 1e6;
        casesPerYear += impact.childrenCovered * impact.currentEfficacy * casesPerChildPerYear;
        livesPerYear += impact.childrenCovered * impact.currentEfficacy * deathsPerChildPerYear;
      }
    }

    return {
      casesAvertedTotal: totalCases,
      livesSavedTotal: totalLives,
      casesAvertedPerYear: casesPerYear,
      livesSavedPerYear: livesPerYear,
      childrenVaccinated: totalChildren,
      dosesDelivered: totalDoses
    };
  }

  // Get country list with active data
  function getCountryList() {
    const activeCountries = new Set();
    for (const s of shipments) {
      activeCountries.add(s.country);
    }
    return ['Africa (overall)', ...Array.from(activeCountries).sort()];
  }

  // Get all countries with their data
  function getAllCountries() {
    return countries;
  }

  // ===== Monthly Series for Charts =====

  // Build monthly cohorts for doses administered (six-month roll-out model)
  function buildMonthlyCohorts(region = 'Africa (overall)', vaccineFilter = 'both') {
    const filteredShipments = (region === 'Africa (overall)')
      ? shipments
      : shipments.filter(s => s.country === region);

    const by = new Map();

    for (const s of filteredShipments) {
      // Apply vaccine filter
      if (vaccineFilter === 'r21' && !/r21/i.test(s.vaccine)) continue;
      if (vaccineFilter === 'rts' && !/rts/i.test(s.vaccine)) continue;

      const d = parseDate(s.date);
      if (!d) continue;

      const startKey = d.getFullYear() * 12 + d.getMonth();
      const perMonth = s.doses / ROLLOUT_MONTHS;

      // Spread doses over 6 months
      for (let i = 0; i < ROLLOUT_MONTHS; i++) {
        const key = startKey + i;
        const existing = by.get(key) || { total: 0, RTS: 0, R21: 0 };
        existing.total += perMonth;
        if (/RTS/i.test(s.vaccine)) existing.RTS += perMonth;
        else existing.R21 += perMonth;
        by.set(key, existing);
      }
    }

    return by;
  }

  // Get cumulative series for doses administered
  function seriesAdmin(region, vaccineFilter = 'both', rangeMonths = null) {
    const by = buildMonthlyCohorts(region, vaccineFilter);
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    const keys = [...by.keys()].sort((a, b) => a - b);

    const n = rangeMonths === 'all' || !rangeMonths
      ? (nowKey - (keys[0] ?? nowKey) + 1)
      : rangeMonths;
    const start = nowKey - (n - 1);

    const months = [];
    const cum = [];
    let acc = 0;

    for (let k = start; k <= nowKey; k++) {
      months.push(new Date(Math.floor(k / 12), k % 12, 1));
      const v = by.get(k)?.total || 0;
      acc += v;
      cum.push(acc);
    }

    return { months, cum };
  }

  // Get cumulative series for doses delivered (step function)
  function seriesDelivered(region, vaccineFilter = 'both', rangeMonths = null) {
    const filteredShipments = (region === 'Africa (overall)')
      ? shipments
      : shipments.filter(s => s.country === region);

    const by = new Map();

    for (const s of filteredShipments) {
      if (vaccineFilter === 'r21' && !/r21/i.test(s.vaccine)) continue;
      if (vaccineFilter === 'rts' && !/rts/i.test(s.vaccine)) continue;

      const d = parseDate(s.date);
      if (!d) continue;

      const key = d.getFullYear() * 12 + d.getMonth();
      by.set(key, (by.get(key) || 0) + s.doses);
    }

    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    const keys = [...by.keys()].sort((a, b) => a - b);

    const n = rangeMonths === 'all' || !rangeMonths
      ? (nowKey - (keys[0] ?? nowKey) + 1)
      : rangeMonths;
    const start = nowKey - (n - 1);

    const months = [];
    const cum = [];
    let acc = 0;

    for (let k = start; k <= nowKey; k++) {
      months.push(new Date(Math.floor(k / 12), k % 12, 1));
      const v = by.get(k) || 0;
      acc += v;
      cum.push(acc);
    }

    return { months, cum };
  }

  // Get cumulative series for children vaccinated
  function seriesChildren(region, rangeMonths = null) {
    const by = buildMonthlyCohorts(region, 'both');
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    const keys = [...by.keys()].sort((a, b) => a - b);

    const n = rangeMonths === 'all' || !rangeMonths
      ? (nowKey - (keys[0] ?? nowKey) + 1)
      : rangeMonths;
    const start = nowKey - (n - 1);

    const months = [];
    const cum = [];
    let acc = 0;

    for (let k = start; k <= nowKey; k++) {
      months.push(new Date(Math.floor(k / 12), k % 12, 1));
      const v = (by.get(k)?.total || 0) / DOSES_PER_CHILD;
      acc += v;
      cum.push(acc);
    }

    return { months, cum };
  }

  // Get cumulative impact series (cases or lives)
  function seriesImpact(region, which, rangeMonths = null) {
    const filteredShipments = (region === 'Africa (overall)')
      ? shipments
      : shipments.filter(s => s.country === region);

    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();

    // Find first shipment
    let firstKey = null;
    for (const s of filteredShipments) {
      const d = parseDate(s.date);
      if (!d) continue;
      const k = d.getFullYear() * 12 + d.getMonth();
      if (firstKey === null || k < firstKey) firstKey = k;
    }

    const n = rangeMonths === 'all' || !rangeMonths
      ? (nowKey - (firstKey ?? nowKey) + 1)
      : rangeMonths;
    const start = nowKey - (n - 1);

    const months = [];
    const cum = [];

    for (let k = start; k <= nowKey; k++) {
      const monthDate = new Date(Math.floor(k / 12), k % 12, 15); // mid-month
      months.push(new Date(Math.floor(k / 12), k % 12, 1));

      // Calculate cumulative impact at this point in time
      let total = 0;
      for (const s of filteredShipments) {
        const impact = calculateShipmentImpact(s, monthDate);
        total += which === 'cases' ? impact.casesAverted : impact.livesSaved;
      }
      cum.push(total);
    }

    return { months, cum };
  }

  // ===== Shipment Info =====

  function getShipmentsSummary(region = 'Africa (overall)') {
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();

    const filteredShipments = (region === 'Africa (overall)')
      ? shipments
      : shipments.filter(s => s.country === region);

    // Group by month
    const buckets = {};
    for (const s of filteredShipments) {
      const d = parseDate(s.date);
      if (!d) continue;
      const k = d.getFullYear() * 12 + d.getMonth();
      if (!buckets[k]) buckets[k] = [];
      buckets[k].push({
        country: s.country,
        vaccine: s.vaccine,
        date: d,
        doses: s.doses,
        status: s.status
      });
    }

    const keys = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    const past = keys.filter(k => k < nowKey);
    const future = keys.filter(k => k >= nowKey);

    return {
      lastDelivery: past.length ? buckets[past[past.length - 1]] : null,
      nextDelivery: future.length ? buckets[future[0]] : null,
      totalShipments: filteredShipments.length
    };
  }

  // ===== Coverage Gap =====

  function getCoverageGap(region = 'Africa (overall)', ageGroup = '6-60') {
    if (region === 'Africa (overall)') {
      let totalEligible = 0, totalCovered = 0;
      for (const name in countries) {
        const c = countries[name];
        const eligible = ageGroup === '5-36' ? c.eligiblePop5to36 : c.eligiblePop6to60;
        totalEligible += eligible || 0;
        // Covered = doses delivered / 3
        const countryShipments = shipments.filter(s => s.country === name && s.status === 'Delivered');
        const doses = countryShipments.reduce((sum, s) => sum + s.doses, 0);
        totalCovered += doses / DOSES_PER_CHILD;
      }
      return {
        eligible: totalEligible,
        covered: totalCovered,
        gap: totalEligible - totalCovered,
        percentCovered: totalEligible > 0 ? (totalCovered / totalEligible) * 100 : 0
      };
    }

    const c = countries[region];
    if (!c) return { eligible: 0, covered: 0, gap: 0, percentCovered: 0 };

    const eligible = ageGroup === '5-36' ? c.eligiblePop5to36 : c.eligiblePop6to60;
    const countryShipments = shipments.filter(s => s.country === region && s.status === 'Delivered');
    const doses = countryShipments.reduce((sum, s) => sum + s.doses, 0);
    const covered = doses / DOSES_PER_CHILD;

    return {
      eligible,
      covered,
      gap: eligible - covered,
      percentCovered: eligible > 0 ? (covered / eligible) * 100 : 0
    };
  }

  // ===== Cost Calculations =====

  function getCosts(region = 'Africa (overall)') {
    const filteredShipments = (region === 'Africa (overall)')
      ? shipments
      : shipments.filter(s => s.country === region);

    let totalCost = 0;
    let rtsCost = 0, r21Cost = 0;

    for (const s of filteredShipments) {
      const price = config.pricing[s.vaccine] || config.pricing['R21'];
      const cost = s.doses * price;
      totalCost += cost;
      if (/RTS/i.test(s.vaccine)) rtsCost += cost;
      else r21Cost += cost;
    }

    const totals = getTotals(region);

    return {
      totalCost,
      rtsCost,
      r21Cost,
      costPerCaseAverted: totals.casesAvertedTotal > 0 ? totalCost / totals.casesAvertedTotal : 0,
      costPerLifeSaved: totals.livesSavedTotal > 0 ? totalCost / totals.livesSavedTotal : 0
    };
  }

  // ===== Public API =====
  return {
    loadData,
    getTotals,
    getCountryList,
    getAllCountries,
    getShipmentsSummary,
    getCoverageGap,
    getCosts,
    getEfficacy,
    calculateShipmentImpact,
    seriesAdmin,
    seriesDelivered,
    seriesChildren,
    seriesImpact,

    // For debugging
    get shipments() { return shipments; },
    get countries() { return countries; },
    get config() { return config; },
    get isLoaded() { return dataLoaded; }
  };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VaccineEngine;
}
