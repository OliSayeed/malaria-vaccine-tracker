/**
 * Gavi 6.0 future-cost model draft (NOT WIRED INTO THE LIVE SITE)
 *
 * Purpose:
 * - Experimental policy layer for country/year-specific support scope and
 *   co-financing burden calculations.
 * - Intended for iterative editing before replacing the current production logic.
 *
 * Status:
 * - Standalone draft module only.
 * - Not imported by index.html, app.js, or engine.js.
 */

'use strict';

const COUNTRY_ALIASES = {
  "democratic republic of congo": ‘DRC’,
  ‘drc’: ‘DRC’,
  "cote d’ivoire": "Côte d’Ivoire",
  ‘cote d’ivoire’: "Côte d’Ivoire",
  "côte d’ivoire": "Côte d’Ivoire",
  ‘congo republic’: ‘Congo Republic’,
  ‘republic of congo’: ‘Congo Republic’,
  ‘congo-brazzaville’: ‘Congo Republic’, // countries.json canonical name
  ‘the gambia’: ‘Gambia’                 // countries.json canonical name
};

const GAVI6_COUNTRIES_ABOVE_70_TRANSITION = new Set([
  'Sierra Leone',
  'Central African Republic',
  'Burkina Faso',
  "Côte d'Ivoire",
  'Ghana',
  'Liberia',
  'South Sudan',
  'Togo',
  'Uganda',
  'Mozambique',
  'Zambia',
  'Guinea-Bissau',
  'Kenya'
]);

const GAVI6_COUNTRIES_CAPPED_AT_70 = new Set([
  'DRC',
  'Sudan',
  'Benin',
  'Burundi',
  'Cameroon',
  'Chad',
  'Congo Republic',
  'Ethiopia',
  'Gambia',
  'Guinea',
  'Madagascar',
  'Malawi',
  'Mali',
  'Niger',
  'Nigeria',
  'Senegal',
  'Tanzania'
]);

function normalizeCountryName(country) {
  const raw = String(country || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  return COUNTRY_ALIASES[key] || raw;
}

/**
 * Support scope: Gavi's funded share of eligible children's vaccines.
 *
 * Rules encoded from board slide notes (unverified from public sources):
 * - Pre-2026 baseline: 85% (Dec 2022 Board exceptional malaria financing decision)
 * - Gavi 6.0 default from 2026: 70% (new cap for all programme countries)
 * - Countries already operating above 70%: 2026 grace at 85%, taper to 70% by end-2028
 * - Countries newly capped at 70%: 70% from 2026 with no grace period
 */
function getSupportScope(country, year) {
  const name = normalizeCountryName(country);
  const y = Number(year);
  if (!Number.isFinite(y)) return 0.70;

  if (y < 2026) return 0.85;

  if (GAVI6_COUNTRIES_ABOVE_70_TRANSITION.has(name)) {
    if (y <= 2026) return 0.85;
    if (y === 2027) return 0.775;
    return 0.70; // 2028+
  }

  if (GAVI6_COUNTRIES_CAPPED_AT_70.has(name)) return 0.70;

  return 0.70; // Gavi 6.0 default for all programme countries from 2026
}

function resolveCountryPhase(country, year, defaultPhase) {
  const name = normalizeCountryName(country);
  const y = Number(year);

  // Current confirmed policy override from Dec 2025 board decision screenshot.
  if (name === 'Nigeria' && Number.isFinite(y) && y >= 2026) {
    return 'Preparatory transition';
  }

  return defaultPhase || 'Preparatory transition';
}

/**
 * Approximate domestic co-financing share by phase.
 *
 * Sources: Gavi 6.0 co-financing policy (updated Jan 2025, immunizationeconomics.org summary)
 * - ISF: flat $0.20/dose floor
 * - PT:  15%/year compounding ramp on the $0.20 base, capped at 80% of dose price
 * - AT:  starts at 35% (PT exit threshold), reaches 100% over 8 years
 */
function getDomesticShare({ phase, yearsInPhase = 0, pricePerDose }) {
  const y = Math.max(0, Number.isFinite(Number(yearsInPhase)) ? Number(yearsInPhase) : 0);
  const p = Number(pricePerDose) || 0;
  if (p <= 0) return 0;

  if (phase === 'Fully self-financing') return 1;
  if (phase === 'Initial self-financing') return Math.min(1, 0.20 / p);
  if (phase === 'Preparatory transition') return Math.min(0.80, (0.20 * Math.pow(1.15, y)) / p);
  if (phase === 'Accelerated transition') return Math.min(1, 0.35 + (0.65 / 8) * y);

  return 0;
}

/**
 * Draft country-year cost projection for needs (catch-up + annual flow).
 */
function projectCountryFutureCosts(input) {
  const {
    country,
    year,
    defaultPhase,
    yearsInPhase = 0,
    eligibleChildren = 0,
    coveredChildren = 0,
    birthsPerYear = 0,
    dosesPerChild = 4,
    pricePerDose = 2.99,
    populationMultiplier = 1
  } = input || {};

  const supportScope = getSupportScope(country, year);
  const phase = resolveCountryPhase(country, year, defaultPhase);

  const eligibleScoped = Math.max(0, Number(eligibleChildren) * Number(populationMultiplier) * supportScope);
  const birthsScoped = Math.max(0, Number(birthsPerYear) * Number(populationMultiplier) * supportScope);

  const gapChildren = Math.max(0, eligibleScoped - Math.max(0, Number(coveredChildren)));
  const catchUpDoses = gapChildren * Number(dosesPerChild);
  const annualDoses = birthsScoped * Number(dosesPerChild);

  const catchUpProcurementCost = catchUpDoses * Number(pricePerDose);
  const annualProcurementCost = annualDoses * Number(pricePerDose);

  const domesticShare = getDomesticShare({ phase, yearsInPhase, pricePerDose });
  const gaviShare = Math.max(0, 1 - domesticShare);

  return {
    country: normalizeCountryName(country),
    year,
    phase,
    yearsInPhase,
    supportScope,
    domesticShare,
    gaviShare,

    eligibleScoped,
    birthsScoped,
    gapChildren,
    catchUpDoses,
    annualDoses,

    catchUpProcurementCost,
    annualProcurementCost,
    catchUpDomesticCost: catchUpProcurementCost * domesticShare,
    catchUpGaviCost: catchUpProcurementCost * gaviShare,
    annualDomesticCost: annualProcurementCost * domesticShare,
    annualGaviCost: annualProcurementCost * gaviShare
  };
}

const Gavi6CostModelDraft = {
  getSupportScope,
  resolveCountryPhase,
  getDomesticShare,
  projectCountryFutureCosts,
  constants: {
    GAVI6_COUNTRIES_ABOVE_70_TRANSITION,
    GAVI6_COUNTRIES_CAPPED_AT_70
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Gavi6CostModelDraft;
}
