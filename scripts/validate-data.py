#!/usr/bin/env python3
"""
Validate the tracker's data files (read-only).

Checks data/*.json for the kinds of breakage a data refresh can introduce:
parse errors, dropped/renamed countries, shipments pointing at unknown
countries, bad dates/doses, and demographic drift. It changes nothing.

Usage:
    python3 scripts/validate-data.py

Exit code 0 if all checks pass, 1 otherwise — so it can gate a refresh
(see docs/DATA-UPDATE-RUNBOOK.md, "Ship it" checklist).
"""

import json
import os
import sys
from datetime import datetime

DATA = os.path.join(os.path.dirname(__file__), "..", "data")
EXPECTED_COUNTRIES = 45
ALLOWED_VACCINES = {"R21", "RTS,S"}
REQUIRED_COUNTRY_FIELDS = [
    "name", "gaviGroup", "populationAtRisk", "populationUnderFive",
    "malariaCasesPerYear", "malariaDeathsPerYear", "birthsPerYear",
]

problems = []
notes = []


def fail(msg):
    problems.append(msg)


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def parse_date(d):
    for fmt in ("%Y-%m-%d", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(d), fmt)
        except ValueError:
            pass
    return None


# --- load (parse errors are themselves failures) ---
try:
    countries = load("countries.json")
    shipments = load("shipments.json")
    config = load("config.json")
    load("sources.json")  # parse-only
except (OSError, json.JSONDecodeError) as e:
    print(f"FAIL: could not load/parse data files: {e}")
    sys.exit(1)

names = {c.get("name") for c in countries}

# --- countries ---
if len(countries) != EXPECTED_COUNTRIES:
    fail(f"expected {EXPECTED_COUNTRIES} countries, found {len(countries)}")

seen = set()
for c in countries:
    n = c.get("name", "<unnamed>")
    if n in seen:
        fail(f"duplicate country: {n}")
    seen.add(n)
    for field in REQUIRED_COUNTRY_FIELDS:
        if field not in c:
            fail(f"{n}: missing field '{field}'")
    # demographic sanity: births are defined as under-5 / 5
    u5, births = c.get("populationUnderFive"), c.get("birthsPerYear")
    if isinstance(u5, (int, float)) and isinstance(births, (int, float)) and u5:
        if abs(births - u5 / 5) / (u5 / 5) > 0.02:
            notes.append(f"{n}: births/year not ~under-5/5 (got {births}, ~{round(u5/5)})")

# --- shipments ---
for i, s in enumerate(shipments):
    where = f"shipment[{i}] ({s.get('country','?')} {s.get('date','?')})"
    if s.get("country") not in names:
        fail(f"{where}: country not in countries.json")
    if s.get("vaccine") not in ALLOWED_VACCINES:
        fail(f"{where}: unexpected vaccine '{s.get('vaccine')}'")
    if parse_date(s.get("date")) is None:
        fail(f"{where}: unparseable date '{s.get('date')}'")
    doses = s.get("doses")
    if not isinstance(doses, (int, float)) or doses <= 0:
        fail(f"{where}: non-positive/invalid doses '{doses}'")

# --- config ---
for key in ("pricing", "completionRates", "efficacy", "gaviTargetPct"):
    if key not in config:
        fail(f"config.json: missing '{key}'")

# lastUpdated drives the user-visible "data current as of …" label; keep it valid.
lu = config.get("lastUpdated")
if lu is None:
    fail("config.json: missing 'lastUpdated' (drives the data-currency label)")
elif not (isinstance(lu, str) and parse_date(lu + "-01") or
          isinstance(lu, str) and parse_date(lu)):
    fail(f"config.json: 'lastUpdated' must be YYYY-MM or YYYY-MM-DD, got '{lu}'")

# --- report ---
for n in notes:
    print(f"note: {n}")
if problems:
    print(f"\nFAIL — {len(problems)} problem(s):")
    for p in problems:
        print(f"  - {p}")
    sys.exit(1)

print(f"OK — {len(countries)} countries, {len(shipments)} shipments, all checks passed."
      + (f" ({len(notes)} note(s) above)" if notes else ""))
sys.exit(0)
