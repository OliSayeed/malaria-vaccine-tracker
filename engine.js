/* Malaria Vaccine Impact Calculation Engine
 * Replaces Google Sheets calculations with local JavaScript
 * Uses "six-month roll-out + waning efficacy" scenario only
 * Build: 2026-01-17
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
  const DOSES_PER_CHILD = 4;  // Full course: 3 primary doses + 1 booster

  // Configurable parameters
  let currentCompletionScenario = 'Average';
  let currentRolloutMonths = 6;  // Can be set to 6 or 12

  // Cache for getTotals results (cleared when settings change)
  const totalsCache = new Map();

  // Cache for calculateShipmentImpact results (cleared when settings change)
  const impactCache = new Map();

  // Age group eligibility fractions (months eligible / 60 months under 5)
  const AGE_GROUP_FRACTIONS = {
    '6-60': 54 / 60,  // 6-60 months = 54 months of eligibility
    '5-36': 31 / 60   // 5-36 months = 31 months of eligibility
  };

  // ===== Completion Rate Functions =====

  // Get completion rates for current scenario
  function getCompletionRates() {
    return config.completionRates?.[currentCompletionScenario] || { dose2: 0.73, dose3: 0.61, dose4: 0.3944 };
  }

  // Get average doses used per child who starts vaccination
  function getAvgDosesPerChild() {
    const rates = getCompletionRates();
    return 1 + (rates.dose2 || 0) + (rates.dose3 || 0) + (rates.dose4 || 0);
  }

  // Get dose 4 completion rate
  function getCompletionRate() {
    return getCompletionRates().dose4 || 0.3944;
  }

  // Set the completion scenario
  function setCompletionScenario(scenario) {
    if (['Optimistic', 'Average', 'Pessimistic'].includes(scenario)) {
      currentCompletionScenario = scenario;
      totalsCache.clear();
      impactCache.clear();
    }
  }

  // Set roll-out period (6 or 12 months)
  function setRolloutMonths(months) {
    if (months === 6 || months === 12) {
      currentRolloutMonths = months;
      totalsCache.clear();
      impactCache.clear();
    }
  }

  // ===== Cascade Reallocation Model =====
  // When children drop out, their unused doses are reallocated to start new children.
  // This creates a cascade of "generations" with progressively later start times.

  function getCascadeParams() {
    const rates = getCompletionRates();
    const d2 = rates.dose2, d3 = rates.dose3, d4 = rates.dose4;
    const avgDoses = getAvgDosesPerChild();
    const timing = config.doseTimingMonths || { dose1to2: 1, dose2to3: 1, dose3to4: 12 };

    // Fraction dropping at each stage
    const dropAt2 = 1 - d2;           // drop before dose 2
    const dropAt3 = d2 - d3;          // drop before dose 3
    const dropAt4 = d3 - d4;          // drop before dose 4

    // Doses freed at each stage (per child who starts)
    const freedAt2 = dropAt2 * 3;     // 3 doses freed (would have used doses 2,3,4)
    const freedAt3 = dropAt3 * 2;     // 2 doses freed (would have used doses 3,4)
    const freedAt4 = dropAt4 * 1;     // 1 dose freed (would have used dose 4)
    const totalFreed = freedAt2 + freedAt3 + freedAt4;

    // When drops occur (months after dose 1)
    const timeAt2 = timing.dose1to2;
    const timeAt3 = timing.dose1to2 + timing.dose2to3;
    const timeAt4 = timing.dose1to2 + timing.dose2to3 + timing.dose3to4;

    // Average delay for freed doses to start new children (weighted by freed doses)
    const avgDelay = totalFreed > 0
      ? (freedAt2 * timeAt2 + freedAt3 * timeAt3 + freedAt4 * timeAt4) / totalFreed
      : 0;

    // r_start: fraction of children that can start from freed doses
    const rStart = totalFreed / avgDoses;

    return { d2, d3, d4, avgDoses, rStart, avgDelay, totalFreed };
  }

  // Calculate cascade generations for a shipment
  // Returns array of { fraction, delayMonths } for each generation
  function getCascadeGenerations(maxGenerations = 20) {
    const { rStart, avgDelay, d4 } = getCascadeParams();
    const generations = [];

    if (rStart >= 1) {
      // Edge case: r_start >= 1 means model breaks down
      // Just use generation 1 with all children
      generations.push({ fraction: 1, delayMonths: 0 });
      return generations;
    }

    // First generation: fraction that starts immediately
    // Total children = N / (1 - rStart), so gen1 fraction = (1 - rStart)
    let remainingFraction = 1;
    let cumulativeDelay = 0;

    for (let g = 0; g < maxGenerations && remainingFraction > 0.001; g++) {
      const genFraction = g === 0 ? (1 - rStart) : remainingFraction * (1 - rStart);
      generations.push({
        fraction: genFraction,
        delayMonths: cumulativeDelay
      });
      remainingFraction -= genFraction;
      cumulativeDelay += avgDelay;
    }

    // Normalize fractions to sum to 1
    const total = generations.reduce((sum, g) => sum + g.fraction, 0);
    generations.forEach(g => g.fraction /= total);

    return generations;
  }

  // ===== Derived Calculations =====
  // These compute values that were formulas in the spreadsheet

  function getCasesPerMillion(country) {
    if (!country.populationAtRisk || country.populationAtRisk === 0) return 0;
    return (country.malariaCasesPerYear / country.populationAtRisk) * 1e6;
  }

  function getDeathsPerMillion(country) {
    if (!country.populationAtRisk || country.populationAtRisk === 0) return 0;
    return (country.malariaDeathsPerYear / country.populationAtRisk) * 1e6;
  }

  function getEligiblePopulation(country, ageGroup = '6-60') {
    const fraction = AGE_GROUP_FRACTIONS[ageGroup] || AGE_GROUP_FRACTIONS['6-60'];
    return (country.populationUnderFive || 0) * fraction;
  }

  // ===== Data Loading =====
  // Helper: check if a shipment should be considered "delivered"
  // Either explicitly marked as Delivered, OR the date has passed
  function isDelivered(shipment) {
    if (shipment.status === 'Delivered') return true;
    // Treat past-dated shipments as delivered (date has passed)
    const shipmentDate = new Date(shipment.date);
    const now = new Date();
    return shipmentDate <= now;
  }

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
  //
  // Model assumptions:
  // - Efficacy is FLAT from dose 3 until year 1 (when dose 4 is given)
  // - After year 1, efficacy decays through the data points
  // - For 3-dose children (no booster): same until year 1, then shifted curve
  //   E_3dose(t) = E_4dose(t + 1) for t >= 1
  //
  function getEfficacy(vaccine, yearsElapsed, doses = 4) {
    const curve = config.efficacy[vaccine];
    if (!curve) return 0;

    const points = curve.points;
    const initialEfficacy = points[0].efficacy;  // efficacy at year 1

    // Before year 1: flat at initial efficacy (no waning yet)
    if (yearsElapsed <= 1) {
      return yearsElapsed >= 0 ? initialEfficacy : 0;
    }

    // For 3-dose children: shift time by 1 year (they're "ahead" on waning)
    // Their efficacy at time t equals 4-dose efficacy at time t+1
    const effectiveYears = doses === 3 ? yearsElapsed + 1 : yearsElapsed;

    // Find surrounding points for interpolation
    for (let i = 0; i < points.length - 1; i++) {
      if (effectiveYears >= points[i].years && effectiveYears <= points[i + 1].years) {
        // Linear interpolation
        const t = (effectiveYears - points[i].years) / (points[i + 1].years - points[i].years);
        return points[i].efficacy + t * (points[i + 1].efficacy - points[i].efficacy);
      }
    }

    // Beyond last point - use exponential decay
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    const decayRate = Math.log(secondLast.efficacy / last.efficacy) / (last.years - secondLast.years);
    const extrapolated = last.efficacy * Math.exp(-decayRate * (effectiveYears - last.years));

    // Floor at 0 (efficacy can't go negative)
    return Math.max(0, extrapolated);
  }

  // Get efficacy for 3-dose children (convenience wrapper)
  function getEfficacy3Dose(vaccine, yearsElapsed) {
    return getEfficacy(vaccine, yearsElapsed, 3);
  }

  // ===== Time Calculations =====
  function parseDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  function yearsBetween(date1, date2) {
    return (date2 - date1) / (SECS_YEAR * 1000);
  }

  function monthsBetween(date1, date2) {
    return yearsBetween(date1, date2) * 12;
  }

  // Get dose timing in months after first dose
  function getDoseTiming() {
    const timing = config.doseTimingMonths || { dose1to2: 1, dose2to3: 1, dose3to4: 12 };
    return {
      dose3: timing.dose1to2 + timing.dose2to3,  // 2 months after dose 1
      dose4: timing.dose1to2 + timing.dose2to3 + timing.dose3to4  // 14 months after dose 1
    };
  }

  // ===== Linear Ramp-up Model =====
  //
  // With roll-out period R months:
  // - First doses spread uniformly from month 0 to R after shipment
  // - Third dose = first dose + 2 months (per dose timing)
  // - So third doses spread from month 2 to month R+2
  //
  // At calendar time T months since shipment:
  // - Child who got dose 1 at month m has dose 3 at month m+2
  // - Time since dose 3 = (T - m - 2) months
  //
  // Average efficacy requires integrating over the roll-out distribution:
  // E_avg(T) = (1/R) ∫₀^min(R, T-2) E((T - m - 2)/12) dm
  //

  // Calculate average efficacy at time T months since shipment,
  // accounting for linear ramp-up of doses
  function calculateRampUpEfficacy(vaccine, monthsSinceShipment, doses = 4) {
    const R = currentRolloutMonths;
    const doseTiming = getDoseTiming();
    const dose3Offset = doseTiming.dose3;  // months from dose 1 to dose 3

    // T is months since shipment
    const T = monthsSinceShipment;

    // No children have dose 3 yet if T < dose3Offset
    if (T <= dose3Offset) return 0;

    // Integration bounds: m ranges from 0 to R (first dose times)
    // But we only include children who have received dose 3
    // Child with dose 1 at month m has dose 3 at month m + dose3Offset
    // They have dose 3 if T >= m + dose3Offset, i.e., m <= T - dose3Offset
    const upperBound = Math.min(R, T - dose3Offset);

    if (upperBound <= 0) return 0;

    // Numerical integration using trapezoidal rule
    const steps = Math.max(10, Math.ceil(upperBound));
    const dm = upperBound / steps;
    let sum = 0;

    for (let i = 0; i <= steps; i++) {
      const m = i * dm;  // month of first dose
      const monthsSinceDose3 = T - m - dose3Offset;
      const yearsSinceDose3 = monthsSinceDose3 / 12;
      const efficacy = getEfficacy(vaccine, yearsSinceDose3, doses);
      const weight = (i === 0 || i === steps) ? 0.5 : 1;
      sum += weight * efficacy;
    }

    // Average over children who have received dose 3
    // Fraction with dose 3 = upperBound / R
    const fractionWithDose3 = upperBound / R;
    const avgEfficacyOfVaccinated = (sum * dm) / upperBound;

    // Overall average considering some children haven't received dose 3 yet
    return avgEfficacyOfVaccinated * fractionWithDose3;
  }

  // Calculate cumulative average efficacy from month 0 to month T
  // This is for computing total cases/lives averted
  function calculateCumulativeAvgEfficacy(vaccine, monthsSinceShipment, doses = 4) {
    const T = monthsSinceShipment;
    if (T <= 0) return 0;

    // Numerical integration: average of ramp-up efficacy from 0 to T
    const steps = Math.max(12, Math.ceil(T));
    const dt = T / steps;
    let sum = 0;

    for (let i = 0; i <= steps; i++) {
      const t = i * dt;
      const efficacy = calculateRampUpEfficacy(vaccine, t, doses);
      const weight = (i === 0 || i === steps) ? 0.5 : 1;
      sum += weight * efficacy;
    }

    return (sum * dt) / T;
  }

  // ===== Impact Calculations =====

  // Calculate impact for a single shipment using the full model:
  // - Linear ramp-up of doses over roll-out period
  // - Cascade reallocation with timing delays
  // - Separate tracking of 3-dose and 4-dose children
  //
  function calculateShipmentImpact(shipment, now = new Date()) {
    const country = countries[shipment.country];
    if (!country) return { casesAverted: 0, livesSaved: 0, childrenFullyVaccinated: 0 };

    const d = parseDate(shipment.date);
    if (!d || d > now) return { casesAverted: 0, livesSaved: 0, childrenFullyVaccinated: 0 };

    // Check cache - key by shipment identity and month (not exact date)
    const monthKey = now.getFullYear() * 12 + now.getMonth();
    const cacheKey = `${shipment.country}|${shipment.date}|${shipment.doses}|${monthKey}`;
    if (impactCache.has(cacheKey)) {
      return impactCache.get(cacheKey);
    }

    const monthsSinceShipment = monthsBetween(d, now);
    const rates = getCompletionRates();
    const avgDosesUsed = getAvgDosesPerChild();

    // Total children who start vaccination (with reallocation)
    const childrenStarted = shipment.doses / avgDosesUsed;

    // Split by dose completion
    const children4Dose = childrenStarted * rates.dose4;                    // completed all 4
    const children3DoseOnly = childrenStarted * (rates.dose3 - rates.dose4); // completed 3, not 4

    // Get cascade generations for timing
    const generations = getCascadeGenerations();

    // Calculate impact from each generation
    let totalCases = 0, totalLives = 0;

    // Malaria burden rates
    const casesPerPersonPerYear = getCasesPerMillion(country) / 1e6;
    const deathsPerPersonPerYear = getDeathsPerMillion(country) / 1e6;

    for (const gen of generations) {
      const genMonths = monthsSinceShipment - gen.delayMonths;
      if (genMonths <= 0) continue;

      const genYears = genMonths / 12;
      const genChildren4Dose = children4Dose * gen.fraction;
      const genChildren3Dose = children3DoseOnly * gen.fraction;

      // 4-dose children: use full efficacy curve
      const avgEfficacy4 = calculateCumulativeAvgEfficacy(shipment.vaccine, genMonths, 4);
      totalCases += genChildren4Dose * avgEfficacy4 * casesPerPersonPerYear * genYears;
      totalLives += genChildren4Dose * avgEfficacy4 * deathsPerPersonPerYear * genYears;

      // 3-dose children: use shifted efficacy curve (decays faster)
      const avgEfficacy3 = calculateCumulativeAvgEfficacy(shipment.vaccine, genMonths, 3);
      totalCases += genChildren3Dose * avgEfficacy3 * casesPerPersonPerYear * genYears;
      totalLives += genChildren3Dose * avgEfficacy3 * deathsPerPersonPerYear * genYears;
    }

    // Sanity check: cases averted cannot exceed the country's total
    const yearsElapsed = monthsSinceShipment / 12;
    const maxCasesAverted = (country.malariaCasesPerYear || 0) * yearsElapsed;
    const maxLivesSaved = (country.malariaDeathsPerYear || 0) * yearsElapsed;
    totalCases = Math.min(totalCases, maxCasesAverted);
    totalLives = Math.min(totalLives, maxLivesSaved);

    // Current efficacy (for display) - use weighted average of first generation
    const currentMonths = monthsSinceShipment;
    const currentEfficacy4 = calculateRampUpEfficacy(shipment.vaccine, currentMonths, 4);
    const currentEfficacy3 = calculateRampUpEfficacy(shipment.vaccine, currentMonths, 3);
    const totalProtected = children4Dose + children3DoseOnly;
    const currentEfficacy = totalProtected > 0
      ? (currentEfficacy4 * children4Dose + currentEfficacy3 * children3DoseOnly) / totalProtected
      : 0;

    const result = {
      casesAverted: totalCases,
      livesSaved: totalLives,
      childrenFullyVaccinated: children4Dose,
      children3DoseOnly,
      childrenStarted,
      currentEfficacy,
      monthsSinceShipment,
      yearsElapsed,
      completionRate: rates.dose4
    };

    // Cache the result
    impactCache.set(cacheKey, result);
    return result;
  }

  // ===== Aggregations =====

  // Get totals for Africa or a specific country
  function getTotals(region = 'Africa (total)', now = new Date()) {
    // Check cache first (key by region and date string)
    const dateKey = now.toISOString().slice(0, 10);
    const cacheKey = `${region}|${dateKey}`;
    if (totalsCache.has(cacheKey)) {
      return totalsCache.get(cacheKey);
    }

    const filteredShipments = (region === 'Africa (total)')
      ? shipments
      : shipments.filter(s => s.country === region);

    let totalCases = 0, totalLives = 0;
    let totalChildren4Dose = 0, totalChildren3Dose = 0, totalChildrenStarted = 0;
    let totalDoses = 0;
    let casesPerYear = 0, livesPerYear = 0;

    for (const s of filteredShipments) {
      const d = parseDate(s.date);
      if (!d || d > now) continue;

      const impact = calculateShipmentImpact(s, now);
      totalCases += impact.casesAverted;
      totalLives += impact.livesSaved;
      totalChildren4Dose += impact.childrenFullyVaccinated || 0;
      totalChildren3Dose += impact.children3DoseOnly || 0;
      totalChildrenStarted += impact.childrenStarted || 0;
      totalDoses += s.doses;

      // Current rate contribution (based on current efficacy)
      const country = countries[s.country];
      const totalProtected = (impact.childrenFullyVaccinated || 0) + (impact.children3DoseOnly || 0);
      if (country && impact.yearsElapsed > 0 && totalProtected > 0) {
        const casesPerChildPerYear = getCasesPerMillion(country) / 1e6;
        const deathsPerChildPerYear = getDeathsPerMillion(country) / 1e6;
        casesPerYear += totalProtected * impact.currentEfficacy * casesPerChildPerYear;
        livesPerYear += totalProtected * impact.currentEfficacy * deathsPerChildPerYear;
      }
    }

    const result = {
      casesAvertedTotal: totalCases,
      livesSavedTotal: totalLives,
      casesAvertedPerYear: casesPerYear,
      livesSavedPerYear: livesPerYear,
      childrenFullyVaccinated: totalChildren4Dose,
      children3DoseOnly: totalChildren3Dose,
      childrenStarted: totalChildrenStarted,
      // For backward compatibility
      childrenVaccinated: totalChildren4Dose,
      dosesDelivered: totalDoses
    };

    // Cache the result
    totalsCache.set(cacheKey, result);
    return result;
  }

  // Get country list with active data
  function getCountryList() {
    const activeCountries = new Set();
    for (const s of shipments) {
      activeCountries.add(s.country);
    }
    return ['Africa (total)', ...Array.from(activeCountries).sort()];
  }

  // Get all countries with their data
  function getAllCountries() {
    return countries;
  }

  // ===== Monthly Series for Charts =====

  // Build monthly cohorts for doses administered (six-month roll-out model)
  function buildMonthlyCohorts(region = 'Africa (total)', vaccineFilter = 'both') {
    const filteredShipments = (region === 'Africa (total)')
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
      const perMonth = s.doses / currentRolloutMonths;

      // Spread doses over rollout period
      for (let i = 0; i < currentRolloutMonths; i++) {
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
    const filteredShipments = (region === 'Africa (total)')
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

  // Get cumulative series for children fully vaccinated (4 doses)
  // Uses the full reallocation model
  function seriesChildren(region, rangeMonths = null) {
    const by = buildMonthlyCohorts(region, 'both');
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();
    const keys = [...by.keys()].sort((a, b) => a - b);

    const n = rangeMonths === 'all' || !rangeMonths
      ? (nowKey - (keys[0] ?? nowKey) + 1)
      : rangeMonths;
    const start = nowKey - (n - 1);

    // Use reallocation model: children fully vaccinated = doses / avgDoses * d4
    const avgDoses = getAvgDosesPerChild();
    const d4 = getCompletionRate();

    const months = [];
    const cum = [];
    let acc = 0;

    for (let k = start; k <= nowKey; k++) {
      months.push(new Date(Math.floor(k / 12), k % 12, 1));
      // Children fully vaccinated = doses administered * d4 / avgDoses
      const dosesThisMonth = by.get(k)?.total || 0;
      const childrenFullyVaccinated = (dosesThisMonth / avgDoses) * d4;
      acc += childrenFullyVaccinated;
      cum.push(acc);
    }

    return { months, cum };
  }

  // Get cumulative impact series (cases or lives)
  // Optimized: calculate each shipment's impact once, then interpolate for the time series
  function seriesImpact(region, which, rangeMonths = null) {
    const filteredShipments = (region === 'Africa (total)')
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

    // Pre-calculate each shipment's current impact (O(shipments) instead of O(months * shipments))
    const shipmentImpacts = [];
    for (const s of filteredShipments) {
      const d = parseDate(s.date);
      if (!d) continue;
      const shipmentKey = d.getFullYear() * 12 + d.getMonth();
      const impact = calculateShipmentImpact(s, now);
      const value = which === 'cases' ? impact.casesAverted : impact.livesSaved;
      if (value > 0) {
        shipmentImpacts.push({ key: shipmentKey, value, monthsElapsed: nowKey - shipmentKey });
      }
    }

    // Build time series by interpolating each shipment's contribution
    const months = [];
    const cum = [];

    for (let k = start; k <= nowKey; k++) {
      months.push(new Date(Math.floor(k / 12), k % 12, 1));

      // Sum contributions from all shipments at this point in time
      let total = 0;
      for (const si of shipmentImpacts) {
        if (k >= si.key && si.monthsElapsed > 0) {
          // Interpolate: contribution grows from 0 at shipment to full value at now
          const monthsSinceShipment = k - si.key;
          const fraction = Math.min(1, monthsSinceShipment / si.monthsElapsed);
          total += si.value * fraction;
        }
      }
      cum.push(total);
    }

    return { months, cum };
  }

  // ===== Shipment Info =====

  function getShipmentsSummary(region = 'Africa (total)') {
    const now = new Date();
    const nowKey = now.getFullYear() * 12 + now.getMonth();

    const filteredShipments = (region === 'Africa (total)')
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

  function getCoverageGap(region = 'Africa (total)', ageGroup = '6-60') {
    if (region === 'Africa (total)') {
      let totalEligible = 0, totalCovered = 0;
      for (const name in countries) {
        const c = countries[name];
        // Calculate eligible population from raw data
        const eligible = getEligiblePopulation(c, ageGroup);
        totalEligible += eligible;
        // Covered = doses delivered / 4 (full course)
        const countryShipments = shipments.filter(s => s.country === name && isDelivered(s));
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

    // Calculate eligible population from raw data
    const eligible = getEligiblePopulation(c, ageGroup);
    const countryShipments = shipments.filter(s => s.country === region && isDelivered(s));
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

  function getCosts(region = 'Africa (total)') {
    const filteredShipments = (region === 'Africa (total)')
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

  // ===== Forward-Looking Projections =====
  // Doses and costs needed to vaccinate remaining eligible population (current stock)
  // and ongoing new births (annual flow)

  // Population scenario multipliers (for future conservative estimates from CHAI etc.)
  const POPULATION_SCENARIOS = {
    'standard': 1.0,      // Use UN population estimates as-is
    'conservative': 1.0   // Placeholder - will be updated with CHAI data
  };

  function getVaccinationNeeds(region = 'Africa (total)', options = {}) {
    const {
      ageGroup = '6-60',
      vaccine = 'R21',
      populationScenario = 'standard'
    } = options;

    const popMultiplier = POPULATION_SCENARIOS[populationScenario] || 1.0;
    const pricePerDose = config.pricing[vaccine] || config.pricing['R21'];

    if (region === 'Africa (total)') {
      let totalEligible = 0;
      let totalCovered = 0;
      let totalBirthsPerYear = 0;
      const countryDetails = [];

      for (const name in countries) {
        const c = countries[name];
        const eligible = getEligiblePopulation(c, ageGroup) * popMultiplier;

        // Children already covered by delivered doses
        const countryShipments = shipments.filter(s => s.country === name && isDelivered(s));
        const dosesDelivered = countryShipments.reduce((sum, s) => sum + s.doses, 0);
        const covered = dosesDelivered / DOSES_PER_CHILD;

        // Remaining gap
        const gap = Math.max(0, eligible - covered);
        const dosesNeeded = gap * DOSES_PER_CHILD;
        const costNeeded = dosesNeeded * pricePerDose;

        // Annual flow (new births entering eligible age)
        const birthsPerYear = (c.birthsPerYear || 0) * popMultiplier;
        const annualDoses = birthsPerYear * DOSES_PER_CHILD;
        const annualCost = annualDoses * pricePerDose;

        totalEligible += eligible;
        totalCovered += covered;
        totalBirthsPerYear += birthsPerYear;

        countryDetails.push({
          country: name,
          eligible,
          covered,
          gap,
          dosesNeeded,
          costNeeded,
          birthsPerYear,
          annualDoses,
          annualCost,
          gaviGroup: c.gaviGroup
        });
      }

      const totalGap = Math.max(0, totalEligible - totalCovered);
      const totalDosesNeeded = totalGap * DOSES_PER_CHILD;
      const totalCostNeeded = totalDosesNeeded * pricePerDose;
      const totalAnnualDoses = totalBirthsPerYear * DOSES_PER_CHILD;
      const totalAnnualCost = totalAnnualDoses * pricePerDose;

      return {
        // Current stock (catch-up)
        eligible: totalEligible,
        covered: totalCovered,
        gap: totalGap,
        percentCovered: totalEligible > 0 ? (totalCovered / totalEligible) * 100 : 0,
        dosesNeeded: totalDosesNeeded,
        costNeeded: totalCostNeeded,

        // Annual flow (maintenance)
        birthsPerYear: totalBirthsPerYear,
        annualDoses: totalAnnualDoses,
        annualCost: totalAnnualCost,

        // Metadata
        ageGroup,
        vaccine,
        pricePerDose,
        populationScenario,

        // Per-country breakdown
        countryDetails
      };
    }

    // Single country
    const c = countries[region];
    if (!c) {
      return {
        eligible: 0, covered: 0, gap: 0, percentCovered: 0,
        dosesNeeded: 0, costNeeded: 0,
        birthsPerYear: 0, annualDoses: 0, annualCost: 0,
        ageGroup, vaccine, pricePerDose, populationScenario,
        countryDetails: []
      };
    }

    const eligible = getEligiblePopulation(c, ageGroup) * popMultiplier;
    const countryShipments = shipments.filter(s => s.country === region && isDelivered(s));
    const dosesDelivered = countryShipments.reduce((sum, s) => sum + s.doses, 0);
    const covered = dosesDelivered / DOSES_PER_CHILD;
    const gap = Math.max(0, eligible - covered);
    const dosesNeeded = gap * DOSES_PER_CHILD;
    const costNeeded = dosesNeeded * pricePerDose;

    const birthsPerYear = (c.birthsPerYear || 0) * popMultiplier;
    const annualDoses = birthsPerYear * DOSES_PER_CHILD;
    const annualCost = annualDoses * pricePerDose;

    return {
      eligible,
      covered,
      gap,
      percentCovered: eligible > 0 ? (covered / eligible) * 100 : 0,
      dosesNeeded,
      costNeeded,
      birthsPerYear,
      annualDoses,
      annualCost,
      ageGroup,
      vaccine,
      pricePerDose,
      populationScenario,
      gaviGroup: c.gaviGroup,
      countryDetails: []
    };
  }

  // Get cost-effectiveness metrics
  function getCostEffectiveness(region = 'Africa (total)', vaccine = 'R21') {
    const pricePerDose = config.pricing[vaccine] || config.pricing['R21'];
    const costPerChild = pricePerDose * DOSES_PER_CHILD;

    // Use R21 efficacy at 1 year for annual impact estimate
    const efficacy1yr = getEfficacy(vaccine, 1);

    if (region === 'Africa (total)') {
      // Weighted average across countries
      let totalChildren = 0;
      let weightedCasesAverted = 0;
      let weightedLivesSaved = 0;

      for (const name in countries) {
        const c = countries[name];
        const casesPerChild = getCasesPerMillion(c) / 1e6;
        const deathsPerChild = getDeathsPerMillion(c) / 1e6;
        const eligible = getEligiblePopulation(c, '6-60');

        weightedCasesAverted += eligible * casesPerChild * efficacy1yr;
        weightedLivesSaved += eligible * deathsPerChild * efficacy1yr;
        totalChildren += eligible;
      }

      const avgCasesAvertedPerChild = totalChildren > 0 ? weightedCasesAverted / totalChildren : 0;
      const avgLivesSavedPerChild = totalChildren > 0 ? weightedLivesSaved / totalChildren : 0;

      return {
        vaccine,
        pricePerDose,
        costPerChild,
        efficacyAt1Year: efficacy1yr,
        casesAvertedPerChildPerYear: avgCasesAvertedPerChild,
        livesSavedPerChildPerYear: avgLivesSavedPerChild,
        costPerCaseAverted: avgCasesAvertedPerChild > 0 ? costPerChild / avgCasesAvertedPerChild : 0,
        costPerLifeSaved: avgLivesSavedPerChild > 0 ? costPerChild / avgLivesSavedPerChild : 0
      };
    }

    const c = countries[region];
    if (!c) return null;

    const casesPerChild = getCasesPerMillion(c) / 1e6;
    const deathsPerChild = getDeathsPerMillion(c) / 1e6;
    const casesAvertedPerChild = casesPerChild * efficacy1yr;
    const livesSavedPerChild = deathsPerChild * efficacy1yr;

    return {
      vaccine,
      pricePerDose,
      costPerChild,
      efficacyAt1Year: efficacy1yr,
      casesAvertedPerChildPerYear: casesAvertedPerChild,
      livesSavedPerChildPerYear: livesSavedPerChild,
      costPerCaseAverted: casesAvertedPerChild > 0 ? costPerChild / casesAvertedPerChild : 0,
      costPerLifeSaved: livesSavedPerChild > 0 ? costPerChild / livesSavedPerChild : 0
    };
  }

  // Get all countries with their metrics for display
  function getAllCountryMetrics(ageGroup = '6-60', vaccine = 'R21') {
    const results = [];
    const avgDosesPerChild = getAvgDosesPerChild();
    const completionRate = getCompletionRate();

    for (const name in countries) {
      const c = countries[name];

      // Get shipments for this country
      const countryShipments = shipments.filter(s => s.country === name && isDelivered(s));
      const dosesDelivered = countryShipments.reduce((sum, s) => sum + s.doses, 0);

      // Eligible population within age window
      const eligiblePop = getEligiblePopulation(c, ageGroup);

      // Children fully vaccinated (with reallocation)
      const childrenVaccinated = (dosesDelivered / avgDosesPerChild) * completionRate;

      // % of eligible protected
      const pctProtected = eligiblePop > 0 ? Math.min(100, (childrenVaccinated / eligiblePop) * 100) : 0;

      // Population at risk in age window (proportional)
      const ageGroupFraction = AGE_GROUP_FRACTIONS[ageGroup] || AGE_GROUP_FRACTIONS['6-60'];
      const popAtRiskInAgeWindow = (c.populationAtRisk || 0) * ageGroupFraction * (5 / 100); // ~5% of at-risk are in under-5

      // Cost-effectiveness for this country
      const costEff = getCostEffectiveness(name, vaccine);

      results.push({
        name,
        gaviGroup: c.gaviGroup,
        eligiblePopulation: eligiblePop,
        birthsPerYear: c.birthsPerYear || 0,
        childrenVaccinated,
        dosesDelivered,
        pctProtected,
        malariaCases: c.malariaCasesPerYear || 0,
        malariaDeaths: c.malariaDeathsPerYear || 0,
        populationAtRisk: c.populationAtRisk || 0,
        costPerLifeSaved: costEff?.costPerLifeSaved || 0,
        costPerCaseAverted: costEff?.costPerCaseAverted || 0
      });
    }

    return results.sort((a, b) => b.childrenVaccinated - a.childrenVaccinated);
  }

  // Get dose flow data for Sankey diagram
  function getDoseFlowData() {
    const params = getCascadeParams();
    const rates = getCompletionRates();

    // For every 100 children who start
    const started = 100;
    const gotDose2 = started * rates.dose2;
    const gotDose3 = started * rates.dose3;
    const gotDose4 = started * rates.dose4;

    // Dropouts at each stage
    const dropAt2 = started - gotDose2;
    const dropAt3 = gotDose2 - gotDose3;
    const dropAt4 = gotDose3 - gotDose4;

    // Doses freed at each stage
    const freedAt2 = dropAt2 * 3;  // would have used doses 2,3,4
    const freedAt3 = dropAt3 * 2;  // would have used doses 3,4
    const freedAt4 = dropAt4 * 1;  // would have used dose 4
    const totalFreed = freedAt2 + freedAt3 + freedAt4;

    // Children started from reallocation
    const avgDoses = params.avgDoses;
    const reallocatedStarts = totalFreed / avgDoses;

    return {
      started,
      gotDose2,
      gotDose3,
      gotDose4,
      dropAt2,
      dropAt3,
      dropAt4,
      freedAt2,
      freedAt3,
      freedAt4,
      totalFreed,
      reallocatedStarts,
      avgDoses,
      scenario: currentCompletionScenario,
      // For Sankey: nodes and links
      nodes: [
        { id: 'dose1', label: `Dose 1: ${started.toFixed(0)}` },
        { id: 'dose2', label: `Dose 2: ${gotDose2.toFixed(1)}` },
        { id: 'dose3', label: `Dose 3: ${gotDose3.toFixed(1)}` },
        { id: 'dose4', label: `Dose 4: ${gotDose4.toFixed(1)}` },
        { id: 'drop2', label: `Drop: ${dropAt2.toFixed(1)}` },
        { id: 'drop3', label: `Drop: ${dropAt3.toFixed(1)}` },
        { id: 'drop4', label: `Drop: ${dropAt4.toFixed(1)}` },
        { id: 'freed', label: `Freed: ${totalFreed.toFixed(1)} doses` },
        { id: 'realloc', label: `Realloc: ${reallocatedStarts.toFixed(1)} children` }
      ],
      links: [
        { source: 'dose1', target: 'dose2', value: gotDose2 },
        { source: 'dose1', target: 'drop2', value: dropAt2 },
        { source: 'dose2', target: 'dose3', value: gotDose3 },
        { source: 'dose2', target: 'drop3', value: dropAt3 },
        { source: 'dose3', target: 'dose4', value: gotDose4 },
        { source: 'dose3', target: 'drop4', value: dropAt4 },
        { source: 'drop2', target: 'freed', value: freedAt2 },
        { source: 'drop3', target: 'freed', value: freedAt3 },
        { source: 'drop4', target: 'freed', value: freedAt4 },
        { source: 'freed', target: 'realloc', value: totalFreed }
      ]
    };
  }

  // Helper to update population scenario multipliers (for future CHAI data)
  function setPopulationScenario(scenarioName, multiplier) {
    POPULATION_SCENARIOS[scenarioName] = multiplier;
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
    getEfficacy3Dose,
    calculateShipmentImpact,
    seriesAdmin,
    seriesDelivered,
    seriesChildren,
    seriesImpact,

    // Forward-looking projections
    getVaccinationNeeds,
    getCostEffectiveness,
    setPopulationScenario,
    getAllCountryMetrics,
    getDoseFlowData,

    // Completion rate scenarios
    setCompletionScenario,
    getCompletionRate,
    getCompletionScenario: () => currentCompletionScenario,
    getCompletionRates: () => config.completionRates,

    // Roll-out period configuration
    setRolloutMonths,
    getRolloutMonths: () => currentRolloutMonths,

    // Model internals (for debugging/visualization)
    getCascadeParams,
    getCascadeGenerations,
    calculateRampUpEfficacy,

    // Derived calculations (formulas from the spreadsheet)
    getCasesPerMillion,
    getDeathsPerMillion,
    getEligiblePopulation,

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
