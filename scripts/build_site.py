"""
Build the website from the Census data.

Reads:  data/raw/*  (from scripts/fetch_census.py), data/reference/*, config/*
        Uses the same DuckDB views as the SQL analysis (sql/00_setup.sql), so the site and
        analysis/README.md always show the same numbers.
Writes: site/index.html      the data story (from templates/story.html)
        site/simulator.html  the sourcing cost simulator (from templates/simulator.html)
        site/data.json       everything the pages show, for anyone who wants to check it
        Each page gets the data embedded, so it works as a single file with no server.

Usage:
  python scripts/build_site.py
"""

import json
import time
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent

SERIES = [("-", "All countries"), ("5700", "China"), ("5330", "India"), ("5520", "Vietnam"), ("2010", "Mexico"), ("1220", "Canada")]
MIN_SIM_VALUE = 20e6       # a country needs at least $20M of a product (Jan-latest month) to be offered in the simulator
MIN_MONTH_VALUE = 2e6      # below this, the latest month alone is too thin for a current tariff rate; use the year so far


def rows(con, sql, params=None):
    cur = con.execute(sql, params or [])
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, r)) for r in cur.fetchall()]


def r2(v, n=2):
    return None if v is None else round(float(v), n)


def rate_series(con):
    data = rows(con, "SELECT month, cty_code, calculated_duty, consumption_imports FROM country_month WHERE cty_code IN ({}) ORDER BY month"
                .format(",".join(f"'{c}'" for c, _ in SERIES)))
    months = sorted({d["month"] for d in data})
    by = {(d["month"], d["cty_code"]): d for d in data}
    out = {}
    for code, name in SERIES:
        out[name] = [r2(100 * by[(m, code)]["calculated_duty"] / by[(m, code)]["consumption_imports"]) if (m, code) in by else None
                     for m in months]
    return months, out


def simulator(con, latest_year):
    prods = json.loads((ROOT / "config/simulator_products.json").read_text())["products"]
    con.execute("""CREATE OR REPLACE VIEW hs10 AS
        SELECT * FROM read_csv('data/raw/hs10_latest.csv.gz', types = {'hs10': 'VARCHAR', 'cty_code': 'VARCHAR'})""")
    out = []
    for p in prods:
        data = rows(con, """
            SELECT f.name AS country, h.cty_code, h.ytd_value, h.ytd_duty, h.ytd_charges, h.ytd_quantity,
                   h.month_value, h.month_duty, h.month_charges, h.month_quantity
            FROM hs10 h JOIN focus f USING (cty_code)
            WHERE h.hs10 = ? AND h.year = ?""", [p["hs10"], latest_year])
        total = next((d for d in data if d["cty_code"] == "-"), None)
        if not total:
            print(f"::warning::No data for {p['hs10']}")
            continue
        countries = []
        for d in data:
            if d["cty_code"] == "-" or d["ytd_value"] < MIN_SIM_VALUE or not d["ytd_quantity"]:
                continue
            q = d["ytd_quantity"]
            use_month = d["month_value"] >= MIN_MONTH_VALUE
            rate = (d["month_duty"] / d["month_value"]) if use_month else (d["ytd_duty"] / d["ytd_value"])
            countries.append({
                "country": d["country"],
                "price": r2(d["ytd_value"] / q),                 # customs value per unit, Jan-latest month
                "freight": r2(d["ytd_charges"] / q),             # freight and insurance to the US per unit
                "rate": r2(100 * rate),                          # effective tariff rate now, %
                "rate_from": "latest month" if use_month else "year so far",
                "share": r2(100 * d["ytd_value"] / total["ytd_value"], 1),
                "units_m": r2(q / 1e6, 2),
                "value_bn": r2(d["ytd_value"] / 1e9, 2),
            })
        countries.sort(key=lambda c: -c["share"])
        if len(countries) >= 2:
            out.append({**p, "us_value_bn": r2(total["ytd_value"] / 1e9, 2), "countries": countries})
    return out


def tracker_data(con, built):
    """Everything the tracker prototype needs: the sample company, the tariff rules, and for each product the
    other countries it could come from (normal duty from 2024, freight share from the latest year)."""
    sample = ROOT / "data/sample/company.json"
    if not sample.exists() or not (ROOT / "data/raw/hs10_monthly.csv.gz").exists():
        print("::warning::No sample company data; skipping the tracker")
        return None
    t = json.loads(sample.read_text())
    t["rules"] = json.loads((ROOT / "config/tariff_rules.json").read_text())
    t["built"] = built
    con.execute("""CREATE OR REPLACE VIEW hs10m AS SELECT * FROM read_csv('data/raw/hs10_monthly.csv.gz',
                   types = {'hs10': 'VARCHAR', 'cty_code': 'VARCHAR', 'month': 'VARCHAR'})""")
    alts = rows(con, """
        WITH base AS (
            SELECT hs10, cty_code, SUM(calculated_duty) / SUM(consumption_imports) AS r, SUM(consumption_imports) AS v
            FROM hs10m WHERE month LIKE '2024%' GROUP BY ALL),
        latest AS (
            SELECT hs10, cty_code, ytd_value, ytd_charges FROM hs10 WHERE year = (SELECT MAX(year) FROM hs10))
        SELECT l.hs10, f.name AS country, 100 * b.r AS base_rate, 100 * l.ytd_charges / l.ytd_value AS freight_pct
        FROM latest l JOIN focus f USING (cty_code) JOIN base b USING (hs10, cty_code)
        WHERE l.cty_code <> '-' AND l.ytd_value >= 20e6 AND b.v >= 5e6""")
    t["alternatives"] = {}
    for a in alts:
        t["alternatives"].setdefault(a["hs10"], []).append({"country": a["country"], "base_rate": r2(a["base_rate"]), "freight_pct": r2(a["freight_pct"])})
    return t


def main():
    con = duckdb.connect()
    con.execute(f"SET file_search_path = '{ROOT}'")
    import os
    os.chdir(ROOT)
    con.execute((ROOT / "sql/00_setup.sql").read_text())
    q = lambda name: rows(con, (ROOT / "sql" / name).read_text())

    months, rates = rate_series(con)
    latest = months[-1]
    latest_year = int(latest[:4])
    fetched = json.loads((ROOT / "data/raw/fetched.json").read_text())
    timeline = json.loads((ROOT / "data/reference/timeline.json").read_text())

    data = {
        "built": time.strftime("%Y-%m-%d", time.gmtime()),
        "fetched": fetched["fetched_on"],
        "latest_month": latest,
        "months": months,
        "rates": rates,
        "events": timeline["events"],
        "duty_by_year": q("02_duty_collected_by_year.sql"),
        "extra_duty": q("03_duty_above_baseline_ieepa_period.sql"),
        "shares": q("04_where_imports_moved.sql"),
        "chapters_china": q("05_china_share_by_chapter.sql"),
        "products_china": q("06_products_that_left_china.sql"),
        "rate_by_country": q("07_current_rate_by_country.sql"),
        "rate_by_chapter": q("08_rate_by_chapter_latest.sql"),
        "smartphones": q("09_smartphones.sql"),
        "refunds": json.loads((ROOT / "data/reference/refunds.json").read_text()),
        "simulator": simulator(con, latest_year),
    }
    tracker = tracker_data(con, data["built"])
    site = ROOT / "site"
    site.mkdir(exist_ok=True)
    blob = json.dumps(data, separators=(",", ":"), default=float)
    (site / "data.json").write_text(json.dumps(data, indent=1, default=float))
    if tracker:
        (site / "tracker.json").write_text(json.dumps(tracker, indent=1))
    for tpl, out in [("story.html", "index.html"), ("simulator.html", "simulator.html"), ("tracker.html", "tracker.html")]:
        path = ROOT / "templates" / tpl
        if path.exists():
            html = path.read_text().replace("/*__DATA__*/null", blob)
            html = html.replace("/*__RULES__*/", (ROOT / "templates/refund_rules.js").read_text())
            html = html.replace("/*__ENGINE__*/", (ROOT / "templates/tariff_engine.js").read_text())
            if tracker:
                html = html.replace("/*__TRACKER__*/null", json.dumps(tracker, separators=(",", ":")))
            (site / out).write_text(html)
            print(f"Wrote site/{out}")
    print(f"Data through {latest}; simulator products: {len(data['simulator'])}")


if __name__ == "__main__":
    main()
