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
  "democratic republic of congo": 'DRC',
  'drc': 'DRC',
  "cote d'ivoire": "Côte d'Ivoire",
  'cote d’ivoire': "Côte d'Ivoire",
  "côte d'ivoire": "Côte d'Ivoire",
  'congo republic': 'Congo Republic',
  'republic of congo': 'Congo Republic'
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
 * Support scope assumption for malaria vaccine needs in Gavi 6.0.
 *
 * Rules encoded from board slide notes:
 * - Baseline pre-policy: 85%
 * - Countries subject to new cap for intro/scale-up: 70% from 2026 onward
 * - Countries already >70%: 2026 grace (85%), then taper to 70% by end-2028
 */
function getSupportScope(country, year) {
  const name = normalizeCountryName(country);
  const y = Number(year);
  if (!Number.isFinite(y)) return 0.85;

  if (y < 2026) return 0.85;

  if (GAVI6_COUNTRIES_ABOVE_70_TRANSITION.has(name)) {
    if (y <= 2026) return 0.85;
    if (y === 2027) return 0.775;
    return 0.70; // 2028+
  }

  if (GAVI6_COUNTRIES_CAPPED_AT_70.has(name)) return 0.70;

  return 0.85;
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
 * PT uses 30% annual ramp on the $0.20/dose floor (draft assumption).
 */
function getDomesticShare({ phase, yearsInPhase = 0, pricePerDose }) {
  const y = Math.max(0, Number.isFinite(Number(yearsInPhase)) ? Number(yearsInPhase) : 0);
  const p = Number(pricePerDose) || 0;
  if (p <= 0) return 0;

  if (phase === 'Fully self-financing') return 1;
  if (phase === 'Initial self-financing') return Math.min(1, 0.20 / p);
  if (phase === 'Preparatory transition') return Math.min(1, (0.20 * Math.pow(1.3, y)) / p);
  if (phase === 'Accelerated transition') return Math.min(1, 0.20 + (0.10 * y));

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
