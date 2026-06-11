/**
 * DRAFT — MAP-derived "Gavi target population" column
 * ===================================================
 *
 * NON-PRODUCTION. Not wired into index.html / app.js / engine.js.
 * A staging area to define the schema and integration for a per-country
 * "moderate-to-high transmission eligible population" figure, sitting
 * ALONGSIDE the existing maximalist (national 6–60 month) numbers.
 *
 * --------------------------------------------------------------------------
 * WHY
 * --------------------------------------------------------------------------
 * The live engine (engine.js getEligiblePopulation) currently computes the
 * "Gavi" eligible population as:
 *
 *     under5(year) × ageFraction × gaviTargetPct(0.85)
 *
 * i.e. it applies Gavi's *funded share* (85%) to the WHOLE national under-five
 * population. The code comment there already flags the gap:
 *     "Per-country transmission-level data would refine this; for now a flat
 *      85% multiplier."
 *
 * That conflates two distinct things:
 *   (1) the DENOMINATOR — what share of a country's children live in districts
 *       Gavi/WHO actually target (moderate-to-high transmission), and
 *   (2) the SUPPORT SHARE — the fraction of that denominator Gavi co-funds
 *       (85% pre-2026; 70% under Gavi 6.0).
 *
 * This draft adds (1) as real data and leaves (2) as the existing policy lever,
 * so the two are no longer mashed into a single 0.85.
 *
 * --------------------------------------------------------------------------
 * SOURCE / METHODOLOGY (the denominator)
 * --------------------------------------------------------------------------
 * WHO "Framework for the allocation of limited malaria vaccine supply"
 * (June 2022) defines priority areas at DISTRICT level by combining:
 *   - moderate/high transmission: P. falciparum parasite prevalence in
 *     children 2–10 (PfPR2-10) > 10%, OR incidence > 250 cases/1,000/year; and
 *   - high risk of child death: all-cause under-5 mortality rate (U5MR).
 * Underlying data: PfPR2-10 from the Malaria Atlas Project (MAP); U5MR from IHME.
 *
 * To populate this column, for each country:
 *   1. Take MAP district-level PfPR2-10 (>10% threshold) — the
 *      "Malaria vaccine allocation in endemic countries" resource on
 *      malariaatlas.org.
 *   2. Intersect targeted districts with district child population.
 *   3. Sum to a national "children in moderate/high transmission districts"
 *      count, and divide by the national under-five population to get a
 *      fraction in [0,1].
 *
 * Sanity anchors (aggregate, from public Gavi/WHO statements):
 *   - ~25 million children BORN each year across 30+ countries' mod/high areas.
 *   - Uganda: 1.1M children <2 across 105 high/moderate districts at launch.
 * Use these to cross-check the summed per-country figures.
 *
 * --------------------------------------------------------------------------
 * SCHEMA (preferred: a fraction, so it composes with year projections)
 * --------------------------------------------------------------------------
 * Add ONE field per country object in data/countries.json:
 *
 *   "modHighTransmissionFraction": <number 0–1> | null
 *      Share of the national under-five population living in districts
 *      classified moderate/high transmission per the WHO/MAP framework.
 *      null = not yet populated → callers fall back to current behaviour.
 *
 * A fraction (not an absolute count) is preferred because the engine already
 * projects populationUnderFive forward by year; a fraction rides along for free.
 * If you'd rather store the absolute MAP count, use instead:
 *
 *   "modHighTransmissionUnderFive": <number> | null   // base-year count
 *
 * and derive the fraction once at load as count / populationUnderFive.
 */

// ===========================================================================
// 1) READY-TO-POPULATE SKELETON
// ===========================================================================
// All 45 countries from data/countries.json, fractions null until MAP data is
// aggregated. Drop populated values in here, validate, THEN migrate the field
// into data/countries.json + add a sources.json note (see §4) in one reviewed
// change. `notes` is free-text provenance per country (e.g. MAP vintage, % of
// districts targeted) — optional, for the eventual sources panel.

const MAP_TARGET_POPULATION_DRAFT = {
  // countryName: { fraction: <0–1|null>, notes: "" }
  "Angola":                    { fraction: null, notes: "" },
  "Benin":                     { fraction: null, notes: "" },
  "Botswana":                  { fraction: null, notes: "very low transmission — likely ~0" },
  "Burkina Faso":              { fraction: null, notes: "" },
  "Burundi":                   { fraction: null, notes: "" },
  "Cameroon":                  { fraction: null, notes: "" },
  "Central African Republic":  { fraction: null, notes: "" },
  "Chad":                      { fraction: null, notes: "" },
  "Comoros":                   { fraction: null, notes: "" },
  "Congo-Brazzaville":         { fraction: null, notes: "" },
  "Côte d'Ivoire":             { fraction: null, notes: "" },
  "Djibouti":                  { fraction: null, notes: "very low transmission — likely ~0" },
  "DRC":                       { fraction: null, notes: "" },
  "Equatorial Guinea":         { fraction: null, notes: "" },
  "Eritrea":                   { fraction: null, notes: "" },
  "Eswatini":                  { fraction: null, notes: "very low transmission — likely ~0" },
  "Ethiopia":                  { fraction: null, notes: "highly heterogeneous by altitude" },
  "Gabon":                     { fraction: null, notes: "" },
  "The Gambia":                { fraction: null, notes: "" },
  "Ghana":                     { fraction: null, notes: "" },
  "Guinea":                    { fraction: null, notes: "" },
  "Guinea-Bissau":             { fraction: null, notes: "" },
  "Kenya":                     { fraction: null, notes: "highly heterogeneous — lake/coast vs highlands" },
  "Liberia":                   { fraction: null, notes: "" },
  "Madagascar":                { fraction: null, notes: "" },
  "Malawi":                    { fraction: null, notes: "" },
  "Mali":                      { fraction: null, notes: "" },
  "Mauritania":                { fraction: null, notes: "" },
  "Mozambique":                { fraction: null, notes: "" },
  "Namibia":                   { fraction: null, notes: "very low transmission — likely ~0" },
  "Niger":                     { fraction: null, notes: "" },
  "Nigeria":                   { fraction: null, notes: "~⅓ of global malaria deaths" },
  "Rwanda":                    { fraction: null, notes: "" },
  "São Tomé and Príncipe":     { fraction: null, notes: "" },
  "Senegal":                   { fraction: null, notes: "seasonal north vs perennial south" },
  "Sierra Leone":              { fraction: null, notes: "" },
  "Somalia":                   { fraction: null, notes: "" },
  "South Africa":              { fraction: null, notes: "very low transmission — likely ~0" },
  "South Sudan":               { fraction: null, notes: "" },
  "Sudan":                     { fraction: null, notes: "" },
  "Tanzania":                  { fraction: null, notes: "highly heterogeneous" },
  "Togo":                      { fraction: null, notes: "" },
  "Uganda":                    { fraction: null, notes: "anchor: 1.1M <2y across 105 high/mod districts at launch" },
  "Zambia":                    { fraction: null, notes: "" },
  "Zimbabwe":                  { fraction: null, notes: "" }
};

// ===========================================================================
// 2) DRAFT ELIGIBILITY FUNCTION (mirrors engine.js getEligiblePopulation)
// ===========================================================================
// Shows how the field threads through WITHOUT changing existing behaviour when
// the fraction is null. `deps` lets this draft run standalone in tests by
// injecting the engine's helpers.

function getEligiblePopulationWithTransmission(country, ageGroup, year, deps) {
  const {
    AGE_GROUP_FRACTIONS,
    getDemographicData,
    currentEligibilityMode,
    config,
    // gaviSupportShare(year): existing policy lever — 0.85 pre-2026, 0.70 under
    // Gavi 6.0. Defaults to config.gaviTargetPct if not provided.
    gaviSupportShare = () => (config.gaviTargetPct ?? 0.85),
    // Lookup for the new per-country denominator fraction.
    getTransmissionFraction = (c) =>
      (c && typeof c.modHighTransmissionFraction === 'number')
        ? c.modHighTransmissionFraction
        : null
  } = deps;

  const fraction = AGE_GROUP_FRACTIONS[ageGroup] || AGE_GROUP_FRACTIONS['6-60'];
  const demo = getDemographicData(country, year);
  let pop = (demo.populationUnderFive || 0) * fraction;

  if (currentEligibilityMode === 'gavi') {
    const tx = getTransmissionFraction(country);
    if (tx !== null) {
      // NEW: restrict denominator to children in mod/high transmission
      // districts (MAP/WHO), THEN apply Gavi's funded support share.
      pop *= tx * gaviSupportShare(year);
    } else {
      // FALLBACK: exactly today's behaviour (flat support-share multiplier on
      // the full national population) until the country's fraction is populated.
      pop *= (config.gaviTargetPct ?? 0.85);
    }
  }
  return pop;
}

// ===========================================================================
// 3) VALIDATION HELPERS (run before migrating into countries.json)
// ===========================================================================

function validateDraft(draft, countries) {
  const problems = [];
  const names = new Set(countries.map((c) => c.name));
  for (const name of Object.keys(draft)) {
    if (!names.has(name)) problems.push(`Unknown country in draft: ${name}`);
    const f = draft[name].fraction;
    if (f !== null && (typeof f !== 'number' || f < 0 || f > 1)) {
      problems.push(`${name}: fraction must be null or within [0,1], got ${f}`);
    }
  }
  for (const c of countries) {
    if (!(c.name in draft)) problems.push(`Country missing from draft: ${c.name}`);
  }
  return problems;
}

// Cross-check populated fractions against the ~25M births/year aggregate anchor.
// Expects a births-in-mod/high estimate ≈ under5Fraction × births; loose check.
function aggregateBirthsAnchor(draft, countries, { tolerance = 0.25 } = {}) {
  let modHighBirths = 0;
  let populatedCount = 0;
  for (const c of countries) {
    const f = draft[c.name]?.fraction;
    if (typeof f === 'number') {
      modHighBirths += (c.birthsPerYear || 0) * f;
      populatedCount += 1;
    }
  }
  const TARGET = 25_000_000; // Gavi/WHO aggregate
  return {
    populatedCount,
    modHighBirths,
    target: TARGET,
    withinTolerance: populatedCount === Object.keys(draft).length
      ? Math.abs(modHighBirths - TARGET) / TARGET <= tolerance
      : null // only meaningful once all countries populated
  };
}

// ===========================================================================
// 4) SOURCES.JSON NOTE (to add alongside the field at migration time)
// ===========================================================================
// Proposed entry for data/sources.json → "Countries" (pick the next free col):
//
//   "<COL>1": {
//     "header": "Eligible population in moderate/high transmission areas (MAP/WHO)",
//     "note": "Children in districts WHO/Gavi prioritise for malaria vaccine —
//       P. falciparum prevalence (PfPR2-10) > 10% or incidence > 250/1,000/yr,
//       combined with under-5 mortality risk. District PfPR from the Malaria
//       Atlas Project; U5MR from IHME, per the WHO Framework for the allocation
//       of limited malaria vaccine supply (June 2022). Distinct from the
//       maximalist national 6–60-month figure (col L); this is the narrower
//       denominator Gavi/WHO describe (~25M children/year across 30+ countries).
//       https://malariaatlas.org/project-resources/malaria-vaccine-allocation-in-endemic-countries/"
//   }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MAP_TARGET_POPULATION_DRAFT,
    getEligiblePopulationWithTransmission,
    validateDraft,
    aggregateBirthsAnchor
  };
}
