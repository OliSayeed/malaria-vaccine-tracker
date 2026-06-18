#!/usr/bin/env python3
"""
Fetch under-five population by country from the UN World Population Prospects
2024 revision, for the tracker's 45 countries.

Why this exists: Our World in Data (the tracker's stated demographics source)
only carries WPP figures through 2023, because **2023 is WPP 2024's last
ESTIMATE year** — 2024 onward are projections. The matching 2024 figure
therefore comes from WPP 2024's medium-variant projected-population-by-age
table (`popprojAge1dt`), published in the `PPgp/wpp2024` R data package on
GitHub. (population.un.org's API/CSV is the canonical source but isn't always
reachable; the GitHub-hosted package is.)

Under-five = sum of single ages 0–4 (popM + popF), reported in thousands.

Requires: pip install pyreadr
Usage:
    python3 scripts/fetch-wpp-under5.py [YEAR]   # default 2024
    python3 scripts/fetch-wpp-under5.py 2024 --json out.json

This is a maintenance helper for the demographics refresh
(see docs/DATA-UPDATE-RUNBOOK.md). It does not modify any tracker file.
"""

import json
import os
import sys
import tempfile
import urllib.request

RDA_URL = "https://raw.githubusercontent.com/PPgp/wpp2024/master/data/popprojAge1dt.rda"

# Tracker country name -> UN M49 numeric code.
M49 = {
    "Angola": 24, "Benin": 204, "Botswana": 72, "Burkina Faso": 854, "Burundi": 108,
    "Cameroon": 120, "Central African Republic": 140, "Chad": 148, "Comoros": 174,
    "Congo-Brazzaville": 178, "Côte d'Ivoire": 384, "Djibouti": 262, "DRC": 180,
    "Equatorial Guinea": 226, "Eritrea": 232, "Eswatini": 748, "Ethiopia": 231,
    "Gabon": 266, "The Gambia": 270, "Ghana": 288, "Guinea": 324, "Guinea-Bissau": 624,
    "Kenya": 404, "Liberia": 430, "Madagascar": 450, "Malawi": 454, "Mali": 466,
    "Mauritania": 478, "Mozambique": 508, "Namibia": 516, "Niger": 562, "Nigeria": 566,
    "Rwanda": 646, "São Tomé and Príncipe": 678, "Senegal": 686, "Sierra Leone": 694,
    "Somalia": 706, "South Africa": 710, "South Sudan": 728, "Sudan": 729,
    "Tanzania": 834, "Togo": 768, "Uganda": 800, "Zambia": 894, "Zimbabwe": 716,
}


def main():
    try:
        import pyreadr
    except ImportError:
        sys.exit("pyreadr is required: pip install pyreadr")

    year = "2024"
    out_path = None
    args = sys.argv[1:]
    if args and args[0].isdigit():
        year = args[0]
    if "--json" in args:
        out_path = args[args.index("--json") + 1]

    with tempfile.NamedTemporaryFile(suffix=".rda", delete=False) as tmp:
        urllib.request.urlretrieve(RDA_URL, tmp.name)
        df = pyreadr.read_r(tmp.name)["popprojAge1dt"]
    os.unlink(tmp.name)

    # NB: in this dataset `year` is stored as a string and population is in thousands.
    sub = df[(df["year"] == str(year)) & (df["age"] <= 4)].copy()
    sub["p"] = (sub["popM"] + sub["popF"]) * 1000.0
    by_code = {int(k): int(round(v)) for k, v in sub.groupby("country_code")["p"].sum().items()}

    result = {}
    print(f"Under-five population, {year} (WPP 2024 medium variant):")
    for name, code in M49.items():
        if code in by_code:
            result[name] = by_code[code]
            print(f"  {name:<26}{by_code[code]:>13,}")
        else:
            print(f"  {name:<26}{'MISSING (code ' + str(code) + ')':>13}")

    print(f"\nTotal ({len(result)} countries): {sum(result.values()):,}")
    if out_path:
        json.dump(result, open(out_path, "w"), indent=2)
        print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
