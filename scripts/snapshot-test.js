#!/usr/bin/env node
/**
 * Golden-snapshot regression test for the impact model.
 *
 * Loads the real engine.js headless (shimming fetch to read data/*.json from
 * disk), pins "now" to a fixed date for determinism, and computes the
 * Africa-total and a few representative-country cases-averted / lives-saved
 * figures under each dose-completion scenario. It compares them against a
 * committed golden master.
 *
 * Purpose: with no active maintainer, the dangerous failure mode is a future
 * code edit silently shifting the numbers. This locks them in.
 *
 *   node scripts/snapshot-test.js            # check against the snapshot (CI/gate)
 *   node scripts/snapshot-test.js --update   # regenerate after an INTENTIONAL change
 *
 * IMPORTANT — data vs code changes:
 *   The snapshot holds the DATA constant to catch CODE regressions. A data
 *   refresh (new WMR/WPP figures) legitimately changes the outputs, so after
 *   one you must regenerate with --update (the runbook checklist says so). The
 *   "dataFingerprint" below makes a data change visible rather than silent.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SNAPSHOT = path.join(__dirname, "__snapshots__", "impact-snapshot.json");

// Fixed reference date so waning-efficacy integration is deterministic.
const NOW = new Date("2026-06-16T00:00:00.000Z");

const SCENARIOS = ["Optimistic", "Average", "Pessimistic"];
const REGIONS = ["Africa (total)", "Nigeria", "DRC", "Mozambique"];

// --- shim fetch so the engine's loadData() reads local files ---
global.fetch = async (p) => {
  const rel = String(p).replace(/^.*?data\//, "data/"); // normalise candidate paths
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    return { ok: false, status: 404, statusText: "Not Found", json: async () => ({}) };
  }
  const text = fs.readFileSync(file, "utf-8");
  return { ok: true, status: 200, statusText: "OK", json: async () => JSON.parse(text) };
};

function round(n) {
  return Math.round(Number(n) || 0);
}

async function compute() {
  const Engine = require(path.join(ROOT, "engine.js"));
  await Engine.loadData();

  const countries = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "countries.json"), "utf-8"));
  const shipments = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "shipments.json"), "utf-8"));

  const result = {
    meta: {
      now: NOW.toISOString(),
      note: "Golden master. Regenerate intentionally after a data refresh: node scripts/snapshot-test.js --update",
      dataFingerprint: {
        countries: countries.length,
        shipments: shipments.length,
        totalCases: round(countries.reduce((s, c) => s + (c.malariaCasesPerYear || 0), 0)),
        totalDeaths: round(countries.reduce((s, c) => s + (c.malariaDeathsPerYear || 0), 0)),
      },
    },
    scenarios: {},
  };

  for (const scenario of SCENARIOS) {
    Engine.setCompletionScenario(scenario);
    result.scenarios[scenario] = {};
    for (const region of REGIONS) {
      const t = Engine.getTotals(region, NOW);
      result.scenarios[scenario][region] = {
        casesAverted: round(t.casesAvertedTotal),
        livesSaved: round(t.livesSavedTotal),
      };
    }
  }
  return result;
}

// --- compare ---
function diff(expected, actual, pathStr = "", out = []) {
  const keys = new Set([...Object.keys(expected || {}), ...Object.keys(actual || {})]);
  for (const k of keys) {
    const e = expected ? expected[k] : undefined;
    const a = actual ? actual[k] : undefined;
    const p = pathStr ? `${pathStr}.${k}` : k;
    if (typeof e === "object" && e !== null && typeof a === "object" && a !== null) {
      diff(e, a, p, out);
    } else if (e !== a) {
      out.push(`  ${p}: expected ${e}, got ${a}`);
    }
  }
  return out;
}

(async () => {
  const actual = await compute();
  const update = process.argv.includes("--update");

  if (update || !fs.existsSync(SNAPSHOT)) {
    fs.mkdirSync(path.dirname(SNAPSHOT), { recursive: true });
    fs.writeFileSync(SNAPSHOT, JSON.stringify(actual, null, 2) + "\n");
    console.log(`Snapshot ${update ? "updated" : "created"}: ${path.relative(ROOT, SNAPSHOT)}`);
    process.exit(0);
  }

  const expected = JSON.parse(fs.readFileSync(SNAPSHOT, "utf-8"));

  // Surface a data change distinctly from a code regression.
  const fpDiffs = diff(expected.meta.dataFingerprint, actual.meta.dataFingerprint, "dataFingerprint");
  const valueDiffs = diff(expected.scenarios, actual.scenarios, "scenarios");

  if (fpDiffs.length) {
    console.log("Data inputs changed (fingerprint mismatch):");
    console.log(fpDiffs.join("\n"));
    console.log("If this is from an intentional data refresh, regenerate: node scripts/snapshot-test.js --update");
  }
  if (valueDiffs.length) {
    console.log(`\nFAIL — ${valueDiffs.length} model output(s) differ from the snapshot:`);
    console.log(valueDiffs.join("\n"));
    if (!fpDiffs.length) {
      console.log("\nData is unchanged, so this is a CODE change in model behaviour. Investigate before committing.");
    }
    process.exit(1);
  }

  console.log("OK — model outputs match the snapshot (3 scenarios x 4 regions).");
  process.exit(0);
})().catch((e) => {
  console.error("snapshot-test error:", e);
  process.exit(1);
});
