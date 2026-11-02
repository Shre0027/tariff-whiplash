"""
Download US import data from the Census Bureau's international trade API (imports by HS code).

Runs on GitHub Actions (census.gov needs an API key, read from the CENSUS_API_KEY secret and never printed).

Writes, in data/raw/:
  country_month.csv       every country and country group, monthly from Jan 2022:
                          general imports, imports for consumption, dutiable value, calculated duty, charges
  chapter_month.csv.gz    HS 2-digit chapter x focus country x month from Jan 2022 (value and calculated duty)
  product_ytd.csv.gz      HS 6-digit product x focus country, January-August of 2024, 2025 and 2026
                          (value, calculated duty, quantity), plus the latest single month for the simulator
  products.csv            HS 6-digit codes with the Census short description and unit of quantity
  smartphones.csv         smartphone imports (HS 851713) by country and month, from Jan 2024

Things learned from the API (see docs/decision-log.md):
  - Requesting CTY_NAME together with COMM_LVL returns no content (HTTP 204), so commodity queries
    leave names out and names come from the country query.
  - CTY_CODE "-" is the total for all countries; codes starting with 0 or containing X are groups.
  - Calculated duty (CAL_DUT) is the duty assessed at entry. Later refunds are not subtracted.

Usage:
  CENSUS_API_KEY=... python scripts/fetch_census.py
"""

import csv
import gzip
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data/raw"
BASE = "https://api.census.gov/data/timeseries/intltrade/imports/hs"
KEY = os.environ.get("CENSUS_API_KEY", "").strip()

# The largest US suppliers plus the countries most talked about as alternatives to China.
FOCUS = json.loads((ROOT / "config/countries.json").read_text())["focus"]


def get(params):
    """One API call. Returns a list of dicts (empty when the API has no rows)."""
    if not KEY:
        raise SystemExit("::error::CENSUS_API_KEY secret is not set")
    q = urllib.parse.urlencode(params, safe=",+:")
    shown = f"{BASE}?{q}"
    for attempt in range(5):
        try:
            req = urllib.request.Request(f"{shown}&key={KEY}", headers={"User-Agent": "tariff-whiplash"})
            with urllib.request.urlopen(req, timeout=300) as r:
                body = r.read().decode()
                if r.status == 204 or not body.strip():
                    return []
            if body.lstrip().startswith("["):
                data = json.loads(body)
                return [dict(zip(data[0], row)) for row in data[1:]]
            print(f"::warning::Not JSON for {shown}: {body[:150]!r}")
        except urllib.error.HTTPError as e:
            print(f"::warning::HTTP {e.code} for {shown}: {e.read().decode()[:150]!r}")
        except Exception as e:  # network hiccups: retry
            print(f"::warning::{e} for {shown}")
        time.sleep(10 * (attempt + 1))
    raise SystemExit(f"::error::Failed after retries: {shown}")


def write_csv(path, header, rows, gz=False):
    opener = gzip.open if gz else open
    with opener(path, "wt", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)
    print(f"::notice::{path.name}: {len(rows):,} rows")


def num(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def country_month():
    rows = get({"get": "CTY_CODE,CTY_NAME,GEN_VAL_MO,CON_VAL_MO,DUT_VAL_MO,CAL_DUT_MO,CON_CHA_MO", "time": "from 2022-01"})
    if not rows:
        raise SystemExit("::error::No country data")
    out = sorted(([d["time"], d["CTY_CODE"], d["CTY_NAME"], d["GEN_VAL_MO"], d["CON_VAL_MO"], d["DUT_VAL_MO"],
                   d["CAL_DUT_MO"], d["CON_CHA_MO"]] for d in rows), key=lambda r: (r[0], r[1]))
    write_csv(RAW / "country_month.csv", ["month", "cty_code", "country", "general_imports", "consumption_imports",
                                          "dutiable_value", "calculated_duty", "charges"], out)
    months = sorted({r[0] for r in out})
    print(f"::notice::Months {months[0]} to {months[-1]}")
    return months[-1]


def chapter_month():
    out = []
    for c in FOCUS:
        rows = get({"get": "CTY_CODE,I_COMMODITY,CON_VAL_MO,CAL_DUT_MO", "time": "from 2022-01",
                    "COMM_LVL": "HS2", "CTY_CODE": c["code"]})
        out += [[d["time"], d["CTY_CODE"], d["I_COMMODITY"], d["CON_VAL_MO"], d["CAL_DUT_MO"]]
                for d in rows if num(d["CON_VAL_MO"]) > 0]
        print(f"{c['name']}: {len(rows)} chapter-months")
    out.sort(key=lambda r: (r[0], r[1], r[2]))
    write_csv(RAW / "chapter_month.csv.gz", ["month", "cty_code", "hs2", "consumption_imports", "calculated_duty"], out, gz=True)


def product_ytd(latest):
    """HS6 x country: January through the latest month's month, for the last three years, plus that month alone."""
    year, mm = latest.split("-")
    out = []
    for c in FOCUS:
        for y in range(int(year) - 2, int(year) + 1):
            rows = get({"get": "CTY_CODE,I_COMMODITY,UNIT_QY1,CON_VAL_YR,CAL_DUT_YR,CON_QY1_YR,CON_VAL_MO,CAL_DUT_MO,CON_CHA_MO,CON_QY1_MO",
                        "time": f"{y}-{mm}", "COMM_LVL": "HS6", "CTY_CODE": c["code"]})
            for d in rows:
                if num(d["CON_VAL_YR"]) > 0:
                    out.append([y, int(mm), d["CTY_CODE"], d["I_COMMODITY"], d["UNIT_QY1"], d["CON_VAL_YR"], d["CAL_DUT_YR"],
                                d["CON_QY1_YR"], d["CON_VAL_MO"], d["CAL_DUT_MO"], d["CON_CHA_MO"], d["CON_QY1_MO"]])
            print(f"{c['name']} {y}: {len(rows)} products")
    out.sort(key=lambda r: (r[0], r[2], r[3]))
    write_csv(RAW / "product_ytd.csv.gz", ["year", "through_month", "cty_code", "hs6", "unit", "ytd_value", "ytd_duty",
                                           "ytd_quantity", "month_value", "month_duty", "month_charges", "month_quantity"],
              out, gz=True)


def products(latest):
    rows = get({"get": "I_COMMODITY,I_COMMODITY_SDESC,UNIT_QY1", "time": latest, "COMM_LVL": "HS6", "CTY_CODE": "-"})
    if not rows:
        print("::warning::No product descriptions returned")
    write_csv(RAW / "products.csv", ["hs6", "description", "unit"],
              sorted([d["I_COMMODITY"], d["I_COMMODITY_SDESC"], d["UNIT_QY1"]] for d in rows))


def smartphones():
    rows = get({"get": "CTY_CODE,CON_VAL_MO,CAL_DUT_MO,CON_QY1_MO", "time": "from 2024-01", "COMM_LVL": "HS6", "I_COMMODITY": "851713"})
    write_csv(RAW / "smartphones.csv", ["month", "cty_code", "consumption_imports", "calculated_duty", "units"],
              sorted([d["time"], d["CTY_CODE"], d["CON_VAL_MO"], d["CAL_DUT_MO"], d["CON_QY1_MO"]] for d in rows))


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    latest = country_month()
    chapter_month()
    product_ytd(latest)
    products(latest)
    smartphones()
    (RAW / "fetched.json").write_text(json.dumps({"fetched_on": time.strftime("%Y-%m-%d", time.gmtime()),
                                                  "latest_month": latest, "source": BASE}, indent=1))


if __name__ == "__main__":
    main()
