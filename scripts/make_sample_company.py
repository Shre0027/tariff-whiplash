"""
Make the SAMPLE company data for the tariff tracker prototype.

Everything about the company is invented: "Harborline Home & Goods" (a fictional US importer), its SKUs,
suppliers, prices and shipments. What is real:
  - each SKU's product code (HTS 10-digit) and country of origin, chosen from products and countries the
    US actually imports
  - its unit cost and freight, drawn around the real average Census value and freight per unit for that
    product and country (January to the latest month of the latest year)
  - the normal duty rate (2024 Census effective rate for that product and country)
  - every additional tariff, calculated by the rule engine from config/tariff_rules.json
  - entry types, liquidation timing (CBP typically liquidates about 314 days after entry) and refund rules

The random seed is fixed, so the sample is the same every time it's generated.

Writes data/sample/company.json
Usage: python scripts/make_sample_company.py
"""

import csv
import gzip
import json
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
rng = random.Random(20260224)

COMPANY = {"name": "Harborline Home & Goods", "importer_of_record": "XX-0000000 (sample)", "sample": True,
           "margin_threshold_pct": 40,
           "note": "Invented company for demonstrating the tracker. Product codes, countries, cost levels and all tariff rules are real; names, prices and shipments are made up."}

# SKU templates: (product hs10, sku name, countries to source from, [count per country])
CATALOG = [
    ("9401616011", "Linen accent chair", ["Vietnam", "China", "Mexico"]),
    ("9401616011", "Two-seat sofa", ["Vietnam", "Cambodia"]),
    ("9403608093", "Oak side table", ["Vietnam", "China", "Indonesia"]),
    ("9403608093", "Pine bookshelf", ["Mexico"]),
    ("6109100012", "Men's crew T-shirt (dozen)", ["Bangladesh", "India", "Vietnam", "Mexico"]),
    ("6204628011", "Women's straight jeans (dozen)", ["Bangladesh", "Vietnam", "Cambodia"]),
    ("6403999065", "Women's leather loafer (pair)", ["Vietnam", "China", "Cambodia"]),
    ("4202923120", "Commuter backpack", ["Vietnam", "Indonesia", "China", "Cambodia"]),
    ("9503000073", "Wooden toy set", ["China", "Vietnam"]),
    ("9505102500", "Glass ornament set", ["China", "Cambodia"]),
    ("3924104000", "Plastic storage set", ["China", "Thailand"]),
    ("8516710020", "Drip coffee maker", ["China", "Thailand", "Malaysia"]),
    ("8508110000", "Cordless stick vacuum", ["Vietnam", "Malaysia"]),   # not from China: steel/aluminum content tariff not modeled
    ("8518302000", "Wireless earbuds", ["China", "Vietnam"]),
    ("8518220000", "Bookshelf speaker pair", ["China", "Vietnam"]),
    ("8528520000", "27-inch monitor", ["China", "Vietnam", "Mexico"]),
]
ISO = {"China": "CN", "Vietnam": "VN", "Cambodia": "KH", "Mexico": "MX", "Indonesia": "ID", "Bangladesh": "BD", "Thailand": "TH",
       "Malaysia": "MY", "India": "IN"}
MARKUP = (1.7, 2.6)                 # wholesale price = landed cost before 2025 x this
START, END = date(2025, 1, 6), date(2026, 10, 30)
TODAY = date(2026, 11, 2)


def read_gz(path):
    with gzip.open(path, "rt") as f:
        return list(csv.DictReader(f))


def main():
    focus = json.loads((ROOT / "config/countries.json").read_text())["focus"]
    code_of = {c["name"]: c["code"] for c in focus}
    names = {p["hs10"]: p for p in json.loads((ROOT / "config/simulator_products.json").read_text())["products"]}

    # Real cost levels: value, freight and units per product x country, latest year so far (hs10_latest)
    latest = {}
    for r in read_gz(ROOT / "data/raw/hs10_latest.csv.gz"):
        latest[(r["hs10"], r["cty_code"])] = r
    # Normal duty: 2024 effective rate per product x country (hs10_monthly)
    base = {}
    for r in read_gz(ROOT / "data/raw/hs10_monthly.csv.gz"):
        if r["month"].startswith("2024"):
            k = (r["hs10"], r["cty_code"])
            v, d = base.get(k, (0, 0))
            base[k] = (v + int(r["consumption_imports"]), d + int(r["calculated_duty"]))

    skus, n = [], 0
    for hs10, label, countries in CATALOG:
        for country in countries:
            k = (hs10, code_of[country])
            row = latest.get(k)
            if not row or not int(row["ytd_quantity"] or 0) or int(row["ytd_value"]) < 2e6:
                print(f"skip {label} from {country}: too little real trade to price it")
                continue
            q = int(row["ytd_quantity"])
            unit = int(row["ytd_value"]) / q * rng.lognormvariate(0, 0.18)
            freight_share = int(row["ytd_charges"]) / int(row["ytd_value"])
            v, d = base.get(k, (0, 0))
            base_rate = 100 * d / v if v > 5e6 else None
            if base_rate is None:      # fall back to the product's 2024 rate from all countries
                v, d = base.get((hs10, "-"), (1, 0))
                base_rate = 100 * d / v
            n += 1
            landed0 = unit * (1 + freight_share + base_rate / 100)
            skus.append({
                "sku": f"HL-{n:03d}", "name": label, "hs10": hs10, "product": names[hs10]["name"], "per": names[hs10]["per"],
                "country": country, "supplier": f"Supplier {ISO[country]}-{rng.randint(10, 99)}",
                "usmca": country == "Mexico" and rng.random() < 0.85,
                "unit_cost": round(unit, 2), "freight_per_unit": round(unit * freight_share, 2),
                "base_rate": round(base_rate, 2),
                "price": round(landed0 * rng.uniform(*MARKUP), 2),
                "units_per_month": max(20, int(rng.lognormvariate(5.6, 0.6))),
            })

    # Shipments: each supplier country ships every 3-6 weeks; an entry holds 1-4 SKUs from that country
    by_country = {}
    for s in skus:
        by_country.setdefault(s["country"], []).append(s)
    entries, e = [], 0
    for country, items in sorted(by_country.items()):
        d = START + timedelta(days=rng.randint(0, 20))
        while d <= END:
            e += 1
            lines = rng.sample(items, k=min(len(items), rng.randint(1, 4)))
            etype = "reconciliation" if rng.random() < 0.06 else "regular"
            liq_days = rng.choice([314] * 6 + [rng.randint(280, 360), rng.randint(90, 200)])
            liq = d + timedelta(days=liq_days)
            entries.append({
                # 11 characters like a real entry number: 3-character filer code + 7 digits + check digit (filer "HLB" is invented)
                "entry": f"HLB{e * 7919 % 10_000_000:07d}{rng.randint(0, 9)}",
                "date": d.isoformat(), "country": country, "type": etype,
                "liquidated": liq <= TODAY, "liquidation_date": liq.isoformat() if liq <= TODAY else None,
                "lines": [{"sku": s["sku"], "units": int(s["units_per_month"] * rng.uniform(0.7, 1.6))} for s in lines],
            })
            d += timedelta(days=rng.randint(21, 45))
    entries.sort(key=lambda x: x["date"])

    # Refund claims already made, for some early entries (statuses as of the sample's "today")
    claims = []
    for x in entries:
        if "2025-02-04" <= x["date"] <= "2026-02-23" and x["liquidated"] and rng.random() < 0.35:
            liq = date.fromisoformat(x["liquidation_date"])
            if (date(2026, 4, 20) - liq).days <= 80 or liq >= date(2026, 4, 20):   # was eligible when Phase 1 opened
                filed = max(date(2026, 4, 20), liq) + timedelta(days=rng.randint(3, 40))
                if filed > TODAY:
                    continue
                status = rng.choices(["paid", "accepted", "rejected"], [0.6, 0.3, 0.1])[0]
                c = {"entry": x["entry"], "phase": 2 if x["type"] == "reconciliation" else 1, "submitted": filed.isoformat(), "status": status}
                if status == "paid":
                    c["paid"] = min(TODAY, filed + timedelta(days=rng.randint(30, 85))).isoformat()
                if status == "rejected":
                    c["reason"] = rng.choice(["Entry not found for this importer of record", "No IEEPA tariff lines on entry"])
                claims.append(c)

    out = {"company": COMPANY, "as_of": TODAY.isoformat(), "skus": skus, "entries": entries, "claims": claims}
    (ROOT / "data/sample").mkdir(parents=True, exist_ok=True)
    (ROOT / "data/sample/company.json").write_text(json.dumps(out, indent=1))
    print(f"{len(skus)} SKUs, {len(entries)} entries, {len(claims)} claims")


if __name__ == "__main__":
    main()
