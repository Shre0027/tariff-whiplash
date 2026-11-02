# UAT results: Tariff Desk tracker

> Run on 2026-11-02 17:23 UTC by `tests/uat_tracker.js`, against the scripts in [uat.md](uat.md). Expected results are worked out independently from the data and rules, not read back from the page.

**15 of 15 passed.**

| ID | Requirement | Test | Result | What was observed |
|---|---|---|---|---|
| UAT-01 | FR-1 | Every SKU is listed with its HTS code and country of origin | ✅ Pass | 41 SKUs, codes and origins match the product master |
| UAT-02 | FR-3 | Duty rate per SKU matches the rules, and the breakdown adds up | ✅ Pass | 41 rates match; HL-002 breakdown 15.8 + 25 = 40.8% |
| UAT-03 | FR-4 | A what-if tariff recalculates every affected SKU | ✅ Pass | 10 SKUs affected (Vietnam, not under Section 232); product list filtered to the same 10 |
| UAT-04 | FR-4 | Clearing the what-if restores today's costs | ✅ Pass | No SKU shows a what-if change after clearing |
| UAT-05 | FR-4 | Invalid what-if input is rejected with a message | ✅ Pass | Rate 0 → "Enter a rate between 0.5% and 200%."; HTS "61ab" → "The HTS code must be 2 to 10 digits, or blank for all products." |
| UAT-06 | FR-5 | Every entry is listed with date, origin and liquidation status | ✅ Pass | 185 entries listed |
| UAT-07 | FR-6 | Each entry's refund route follows rules R1–R8 | ✅ Pass | 168 routes match the refund rules |
| UAT-08 | FR-7 | Deadline list shows entries within 30 days of a deadline, most urgent first | ✅ Pass | 8 entries, days 0, 4, 8, 9, 16, 23, 25, 27; badge 5 |
| UAT-09 | FR-9 | Filed claims show their status; a rejection shows its reason | ✅ Pass | 17 claims show the right status |
| UAT-10 | FR-8 | CAPE file: one column of 11-character entry numbers, one file per phase | ✅ Pass | CAPE_phase1_2026-11-02.csv: HLB03880312, HLB12195265, HLB05543303 |
| UAT-11 | FR-10 | A SKU can be compared with other countries, cheapest first | ✅ Pass | 8 countries compared, sorted: 100.46, 111.35, 111.98, 112.42, 114.03, 115.87, 117.1, 133.61 |
| UAT-12 | FR-11 | A SKU shows its duty rate history since January 2025 | ✅ Pass | Rate history chart shown |
| UAT-13 | FR-2 | Every tariff rule is listed with its dates and a source | ✅ Pass | 35 rules, each with a source link |
| UAT-14 | FR-12 | Actions are recorded in the audit log | ✅ Pass | 4 entries, including the what-if, the clear and the CAPE file |
| UAT-15 | NFR | Works on a phone: no horizontal page scroll; no script errors | ✅ Pass | 5 views at 390 px wide, no sideways scroll, no errors |
