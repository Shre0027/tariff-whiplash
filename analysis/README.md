# SQL analysis

Standard SQL run with DuckDB directly on the Census trade files in `data/raw/` (2022-01 to 2026-08). Shared views are defined in [`sql/00_setup.sql`](../sql/00_setup.sql). Re-run everything with `python scripts/run_sql.py`; full results are in [`analysis/results/`](results/).

Effective tariff rate = calculated duty / imports for consumption. Calculated duty is the duty assessed when goods enter the US; refunds paid later (for the struck-down IEEPA tariffs) are not subtracted.

## 01. Effective tariff rate by month

**Question:** What tariff rate did US importers actually pay each month, overall and for the main suppliers?

**Why it matters:** headline rates ("145% on China") apply only to some goods and stack with exemptions. The rate actually charged at the border shows the real size of each change.

**Method:** effective rate = calculated duty / imports for consumption, per month. Calculated duty is assessed at entry; refunds paid later are not subtracted.

Query: [`sql/01_effective_tariff_rate_by_month.sql`](../sql/01_effective_tariff_rate_by_month.sql)

| month | all_countries_pct | china_pct | india_pct | vietnam_pct | mexico_pct | canada_pct |
|---|---|---|---|---|---|---|
| 2026-08 | 6.87 | 22.77 | 8.22 | 7.07 | 3.2 | 3.18 |
| 2026-07 | 6.45 | 21.4 | 8.15 | 6.18 | 2.9 | 2.82 |
| 2026-06 | 6.81 | 21.69 | 9.06 | 6.44 | 3.43 | 2.85 |
| 2026-05 | 6.89 | 21.93 | 8.4 | 6.68 | 3.68 | 3.07 |
| 2026-04 | 6.74 | 22.46 | 7.39 | 6.52 | 3.61 | 3.19 |
| 2026-03 | 6.85 | 23.08 | 8.29 | 7.01 | 3.38 | 3.15 |
| 2026-02 | 8.48 | 29.6 | 14.99 | 11.9 | 3.74 | 3.2 |
| 2026-01 | 9.87 | 31.81 | 20.61 | 12.27 | 4.03 | 3.1 |
| 2025-12 | 9.34 | 30.78 | 19.69 | 12.61 | 4.29 | 3.09 |
| 2025-11 | 9.79 | 32.38 | 19.51 | 12.19 | 4.14 | 3.63 |
| 2025-10 | 10.84 | 37.82 | 22.03 | 12.4 | 4.35 | 3.8 |
| 2025-09 | 10.53 | 37.58 | 18.22 | 13.07 | 4.43 | 3.81 |
| 2025-08 | 10.49 | 39.74 | 10.98 | 10.25 | 4.62 | 3.76 |
| 2025-07 | 9.5 | 40.04 | 8 | 8.71 | 4.29 | 2.89 |
| 2025-06 | 9.29 | 40.01 | 8.29 | 8.97 | 4.53 | 3.55 |
| 2025-05 | 9.06 | 47.92 | 5.75 | 6.91 | 5.02 | 3.28 |
| 2025-04 | 7.18 | 38.74 | 3.77 | 4.57 | 4.22 | 2.98 |
| 2025-03 | 3.72 | 26.43 | 2.31 | 3.37 | 3.18 | 1.6 |
| 2025-02 | 2.33 | 13.07 | 2.06 | 3.19 | 0.27 | 0.11 |
| 2025-01 | 2.22 | 11.11 | 2.26 | 3.52 | 0.27 | 0.11 |

*Showing 20 of 56 rows; see the CSV for all.*

## 02. Duty collected by year

**Question:** How much duty was charged on US imports each year, and how much of the increase was new tariffs?

**Why it matters:** it puts a dollar figure on the policy, and lets us check our numbers against CBP's own figure for IEEPA tariffs (about $166 billion collected, CBP, March 2026).

**Method:** January-August of each year so the latest year compares like with like. "Above 2024 rate" = duty minus what the 2024 effective rate would have charged on the same imports.

Query: [`sql/02_duty_collected_by_year.sql`](../sql/02_duty_collected_by_year.sql)

| year | imports_jan_aug_bn | duty_jan_aug_bn | effective_rate_pct | above_2024_rate_bn |
|---|---|---|---|---|
| 2022 | 2,162 | 62.3 | 2.88 | 11.4 |
| 2023 | 2,032 | 48.5 | 2.39 | 0.6 |
| 2024 | 2,121 | 50 | 2.36 | 0 |
| 2025 | 2,306 | 150 | 6.48 | 95.1 |
| 2026 | 2,383 | 174 | 7.29 | 117 |

## 03. Duty above baseline ieepa period

**Question:** How much extra duty was charged while the IEEPA tariffs were in force, and in which goods?

**Why it matters:** this is a check on the method. CBP reported about $166 billion of IEEPA tariffs collected. The extra duty in our data should be larger, because Section 232 tariffs (steel, aluminum, autos, copper, lumber) also rose in this period and are not being refunded.

**Method:** February 2025 to February 2026 (first to last month of IEEPA collections). For each HS chapter, extra duty = duty charged minus the chapter's own 2024 effective rate times its imports. Chapters 72, 73, 74, 76, 87 and 44 are mostly covered by Section 232 tariffs.

Query: [`sql/03_duty_above_baseline_ieepa_period.sql`](../sql/03_duty_above_baseline_ieepa_period.sql)

| main_tariff | extra_duty_bn | chapters |
|---|---|---|
| Mostly IEEPA | 150 | 92 |
| Mostly Section 232 | 67.3 | 6 |
|  | 217 | 98 |

## 04. Where imports moved

**Question:** Which countries gained and lost share of US imports?

**Why it matters:** a tariff on one country mostly moves purchases elsewhere ("trade diversion") rather than bringing all of it home. This shows where it went.

**Method:** January-August 2024 vs January-August 2026, imports for consumption, focus countries.

Query: [`sql/04_where_imports_moved.sql`](../sql/04_where_imports_moved.sql)

| country | jan_aug_2024_bn | jan_aug_2026_bn | change_pct | share_2024_pct | share_2026_pct | share_change_pts |
|---|---|---|---|---|---|---|
| China | 273 | 176 | -35.8 | 12.9 | 7.4 | -5.52 |
| Canada | 274 | 269 | -1.7 | 12.9 | 11.3 | -1.62 |
| Ireland | 61.5 | 37.6 | -38.8 | 2.9 | 1.6 | -1.32 |
| Germany | 107 | 100 | -6.9 | 5.1 | 4.2 | -0.87 |
| Japan | 99.8 | 96.3 | -3.5 | 4.7 | 4 | -0.67 |
| Singapore | 29.1 | 22.2 | -23.7 | 1.4 | 0.9 | -0.44 |
| Brazil | 28.3 | 24 | -15.2 | 1.3 | 1 | -0.33 |
| Italy | 51.3 | 51 | -0.6 | 2.4 | 2.1 | -0.28 |
| United Kingdom | 45 | 43.8 | -2.7 | 2.1 | 1.8 | -0.28 |
| Switzerland | 32.9 | 33.6 | 2.1 | 1.6 | 1.4 | -0.14 |
| All countries | 2,121 | 2,383 | 12.4 | 100 | 100 | 0 |
| Bangladesh | 5.4 | 6.5 | 19.3 | 0.3 | 0.3 | 0.02 |
| France | 39.7 | 45.4 | 14.2 | 1.9 | 1.9 | 0.03 |
| India | 58.5 | 66.6 | 13.9 | 2.8 | 2.8 | 0.04 |
| Indonesia | 17.6 | 21.9 | 24.3 | 0.8 | 0.9 | 0.09 |
| Cambodia | 7.9 | 12 | 50.9 | 0.4 | 0.5 | 0.13 |
| Philippines | 8.6 | 17.3 | 99.9 | 0.4 | 0.7 | 0.32 |
| South Korea | 87.9 | 109 | 23.5 | 4.1 | 4.6 | 0.41 |
| Malaysia | 32.1 | 53.4 | 66.5 | 1.5 | 2.2 | 0.73 |
| Mexico | 332 | 417 | 25.8 | 15.6 | 17.5 | 1.87 |

*Showing 20 of 23 rows; see the CSV for all.*

## 05. China share by chapter

**Question:** In which kinds of goods did China lose the most US sales, and who took them?

**Why it matters:** "imports from China fell" hides big differences. Electronics moved fast; toys barely moved. That tells a business which supply chains are hard to shift.

**Method:** January-August 2024 vs 2026, HS 2-digit chapters with at least $5 billion of imports in 2024. "Top gainer" = the focus country (other than China) whose imports in that chapter grew most in dollars.

Query: [`sql/05_china_share_by_chapter.sql`](../sql/05_china_share_by_chapter.sql)

| hs2 | chapter | us_imports_2024_bn | china_share_2024_pct | china_share_2026_pct | china_change_bn | top_gainer | top_gainer_change_bn |
|---|---|---|---|---|---|---|---|
| 85 | Electrical and electronics | 298 | 23.9 | 9.6 | -33 | Vietnam | 32.1 |
| 84 | Machinery, computers | 336 | 15.6 | 4.5 | -25.9 | Taiwan | 88.3 |
| 95 | Toys, games, sports equipment | 23.1 | 71.4 | 50.7 | -5.9 | Vietnam | 2.3 |
| 94 | Furniture, lighting, bedding | 44.4 | 28.9 | 18.6 | -5.7 | Cambodia | 0.6 |
| 39 | Plastics | 48.6 | 26.4 | 19.3 | -3.8 | Vietnam | 1 |
| 87 | Vehicles and parts | 260 | 4.2 | 3.3 | -3.8 | Vietnam | 0.5 |
| 73 | Iron and steel articles | 32.8 | 23.6 | 18.2 | -3.3 | Vietnam | 0.3 |
| 64 | Footwear | 18 | 37.1 | 20.6 | -3 | Vietnam | 1 |
| 61 | Clothing, knitted | 28.8 | 21.7 | 12.3 | -2.9 | Vietnam | 0.8 |
| 62 | Clothing, not knitted | 23.7 | 20.8 | 11.7 | -2.3 | Bangladesh | 0.4 |
| 63 | Other textile articles | 10.8 | 50.6 | 39.7 | -1.7 | Vietnam | 0.3 |
| 90 | Medical, optical, measuring instruments | 80.1 | 9.4 | 7.6 | -1.4 | Ireland | 0.9 |
| 48 | Paper and paperboard | 12.6 | 14 | 7 | -0.9 | Thailand | 0.2 |
| 42 | Handbags, luggage, leather goods | 8.8 | 22.6 | 12.7 | -0.9 | Vietnam | 0.2 |
| 83 | Misc. metal articles | 10.1 | 33.9 | 27 | -0.8 | Vietnam | 0.2 |
| 40 | Rubber | 22.6 | 7.5 | 4.4 | -0.7 | Cambodia | 0.5 |
| 82 | Tools and cutlery | 7.4 | 27.2 | 19.2 | -0.6 | Vietnam | 0.3 |
| 96 | Misc. manufactured articles | 5.8 | 53.8 | 44.6 | -0.6 | Vietnam | 0.2 |
| 44 | Wood | 15.4 | 8.3 | 6 | -0.5 | Malaysia | 0.1 |
| 38 | Other chemical products | 16.3 | 6.6 | 5 | -0.4 | Indonesia | 0.5 |

*Showing 20 of 46 rows; see the CSV for all.*

## 06. Products that left china

**Question:** Which individual products moved away from China the most, and where to?

**Why it matters:** this is the level a buyer works at. It separates real moves (a product's China share collapses while another country's rises) from goods the US simply bought less of.

**Method:** HS 6-digit products with at least $1 billion of US imports in January-August 2024. Rank by dollars lost by China; "top gainer" is the focus country whose imports of that product grew most.

Query: [`sql/06_products_that_left_china.sql`](../sql/06_products_that_left_china.sql)

| hs6 | description | us_imports_2024_bn | china_share_2024_pct | china_share_2026_pct | china_change_bn | top_gainer | top_gainer_change_bn |
|---|---|---|---|---|---|---|---|
| 847130 | PORT DIGTL AUTOMATIC DATA PROCESS MACH NOT > 10 KG | 31.79 | 66.9 | 7.1 | -18.65 | Vietnam | 16.96 |
| 851713 | SMARTPHONES | 31.92 | 67.9 | 22.2 | -13.47 | India | 13.2 |
| 850760 | LITHIUM ION BATTERIES | 12.68 | 72 | 39.5 | -4.8 | Japan | 1.16 |
| 300490 | MEDICAMENTS NESOI, MEASURED DOSES, RETAIL PK NESOI | 55.63 | 6.7 | 2.3 | -2.74 | France | 1.1 |
| 851762 | MACH FOR RECP/CONVR/TRANS/REGN OF VOICE/IMAGE/DATA | 34.34 | 14.3 | 2.8 | -2.51 | Vietnam | 18.46 |
| 950300 | TRICYCLE, SCOOTR, PEDAL CAR & SIM WHEELED TYS; ETC | 9.7 | 76 | 63.6 | -2.02 | Vietnam | 0.4 |
| 852852 | OTHER MONITORS CAPABLE OF DIRECT CONNECT TO ADP | 4.11 | 79.1 | 31.9 | -1.93 | Vietnam | 1.11 |
| 950450 | VIDEO GAME CONSOLES & MACH, EXC OF SUBHEAD 9504.30 | 2.8 | 79.8 | 15 | -1.86 | Vietnam | 1.26 |
| 851830 | HEAD-EAR-PHONES & COMBINED MICROPHONE/SPEAKER SETS | 4.22 | 48 | 22.4 | -1.28 | Vietnam | 0.26 |
| 940161 | SEATS W WOODEN FRAMES, UPHOLSTERED, NESOI | 4.69 | 27.3 | 7.8 | -1.01 | Vietnam | 0.16 |
| 391810 | FLOOR, WALL, ETC COVERS, VINYL CHLORIDE POLYMERS | 2.8 | 37 | 3.8 | -0.95 | Thailand | 0.38 |
| 940320 | METAL FURNITURE NESOI | 4.22 | 42.6 | 29.3 | -0.9 | Thailand | 0.19 |
| 847330 | PARTS & ACCESSORIES FOR ADP MACHINES & UNITS | 31.4 | 9.4 | 2.1 | -0.85 | Vietnam | 23.3 |
| 640419 | FOOTWEAR, OUT SOLE RUB OR PLAST & TEXT UPPER NESOI | 2.56 | 56.5 | 32 | -0.75 | Cambodia | 0.17 |
| 852872 | RECEPTION APPARATUS FOR TELEVISION, COLOR, NESOI | 6.98 | 10.5 | 0.2 | -0.72 | Mexico | 0.94 |
| 732393 | TABLE, KITCHEN ETC ARTICLES & PTS, STAINLESS STEEL | 1.51 | 85.2 | 70 | -0.71 | Italy | 0.02 |
| 940179 | SEATS WITH METAL FRAMES, EXCEPT UPHOLSTERED NESOI | 1.55 | 73.8 | 34 | -0.7 | Vietnam | 0.29 |
| 640299 | FOOTWEAR, OUTER SOLE & UPPER RUBBER OR PLAST NESOI | 3.32 | 56 | 33.5 | -0.69 | Vietnam | 0.39 |
| 852589 | TV, DIGITAL, VIDEO CAMERAS, NESOI | 5.47 | 17.4 | 5.6 | -0.64 | Vietnam | 0.53 |
| 630790 | MADE-UP TEXTILE ARTICLES, NESOI | 3.09 | 65.9 | 51.1 | -0.63 | Vietnam | 0.14 |

*Showing 20 of 25 rows; see the CSV for all.*

## 07. Current rate by country

**Question:** What is each main supplier's effective tariff rate now, compared with before 2025?

**Why it matters:** after the court ruling and the July 2026 Section 301 tariffs, the cost of buying from each country changed again. This is the starting point for any sourcing decision today.

**Method:** latest month in the data vs the 2024 average, focus countries. Calculated duty / imports.

Query: [`sql/07_current_rate_by_country.sql`](../sql/07_current_rate_by_country.sql)

| country | rate_2024_pct | rate_oct_2025_pct | rate_latest_pct | imports_latest_month_bn |
|---|---|---|---|---|
| Bangladesh | 15.06 | 33.45 | 24.18 | 0.9 |
| China | 10.93 | 37.82 | 22.77 | 26.3 |
| Cambodia | 7.02 | 28.84 | 19.8 | 2 |
| Indonesia | 4.88 | 22.06 | 13.94 | 3 |
| Brazil | 1.28 | 22.33 | 12.09 | 3.5 |
| Japan | 1.52 | 14.62 | 10.85 | 11.9 |
| Germany | 1.38 | 10.94 | 9.02 | 12.9 |
| India | 2.41 | 22.03 | 8.22 | 9.3 |
| South Korea | 0.19 | 14.12 | 7.6 | 15.2 |
| Italy | 2.23 | 11.23 | 7.41 | 7.5 |
| Vietnam | 3.81 | 12.4 | 7.07 | 26.5 |
| All countries | 2.36 | 10.84 | 6.87 | 331 |
| United Kingdom | 0.95 | 5.72 | 6.33 | 5.4 |
| Thailand | 1.63 | 8.94 | 5.85 | 11.8 |
| France | 1.17 | 6.26 | 5.03 | 5.9 |
| Philippines | 1.35 | 14.43 | 4.46 | 3.1 |
| Malaysia | 0.69 | 9.41 | 3.35 | 8 |
| Switzerland | 0.59 | 8.95 | 3.21 | 5.2 |
| Mexico | 0.24 | 4.35 | 3.2 | 60.3 |
| Canada | 0.1 | 3.8 | 3.18 | 35.7 |

*Showing 20 of 23 rows; see the CSV for all.*

## 08. Rate by chapter latest

**Question:** Which kinds of goods carry the highest tariffs now?

**Why it matters:** shoppers feel tariffs through specific goods. Clothing and footwear had high tariffs even before 2025; steel and aluminum products jumped under Section 232.

**Method:** latest month vs 2024, all countries, HS chapters with at least $1 billion of imports in the latest month.

Query: [`sql/08_rate_by_chapter_latest.sql`](../sql/08_rate_by_chapter_latest.sql)

| hs2 | chapter | group | rate_2024_pct | rate_latest_pct | imports_latest_bn |
|---|---|---|---|---|---|
| 73 | Iron and steel articles | Metals and building materials | 5.6 | 42.8 | 3.2 |
| 76 | Aluminum | Metals and building materials | 3.7 | 37.3 | 2.8 |
| 72 | Iron and steel | Metals and building materials | 2.6 | 26.1 | 2.3 |
| 61 | Clothing, knitted | Clothing and footwear | 14.9 | 23.1 | 4.3 |
| 42 | Handbags, luggage, leather goods | Clothing and footwear | 13 | 22.2 | 1.2 |
| 62 | Clothing, not knitted | Clothing and footwear | 14.3 | 22.2 | 3 |
| 64 | Footwear | Clothing and footwear | 12.2 | 21.4 | 2.4 |
| 63 | Other textile articles | Clothing and footwear | 8.7 | 17.5 | 1.4 |
| 83 | Misc. metal articles | Metals and building materials | 6.8 | 16.7 | 1.3 |
| 82 | Tools and cutlery | Metals and building materials | 8.4 | 16.2 | 1 |
| 94 | Furniture, lighting, bedding | Other manufactured goods | 5.6 | 13.9 | 5.2 |
| 40 | Rubber | Chemicals and plastics | 3.1 | 13.4 | 2.9 |
| 87 | Vehicles and parts | Vehicles and transport | 2 | 12.7 | 28.1 |
| 95 | Toys, games, sports equipment | Other manufactured goods | 1.2 | 11.8 | 3.8 |
| 39 | Plastics | Chemicals and plastics | 5.3 | 11.4 | 6.4 |
| 33 | Cosmetics, perfume | Chemicals and plastics | 1.3 | 10.2 | 1.8 |
| 44 | Wood | Wood and paper | 2.1 | 10.1 | 1.7 |
| 29 | Organic chemicals | Chemicals and plastics | 2.4 | 8.6 | 3.2 |
| 03 | Fish and seafood | Food and farm | 0.8 | 8.2 | 1.8 |
| 48 | Paper and paperboard | Wood and paper | 2.8 | 8.1 | 1.7 |

## 09. Smartphones

**Question:** Where do US smartphones come from now?

**Why it matters:** smartphones are the single largest consumer product the US imports, and they were exempted from the April 2025 "reciprocal" tariffs. The shift from China to India started earlier and sped up.

**Method:** HS 851713 (smartphones), imports for consumption by half-year, share of the all-countries total.

Query: [`sql/09_smartphones.sql`](../sql/09_smartphones.sql)

| half_year | us_imports_bn | india_pct | china_pct | vietnam_pct | months_of_data |
|---|---|---|---|---|---|
| 2024 H1 | 23.7 | 16.5 | 67.2 | 14.9 | 6 |
| 2024 H2 | 32.5 | 9 | 76.3 | 13.3 | 6 |
| 2025 H1 | 29.9 | 38.1 | 39.3 | 20.2 | 6 |
| 2025 H2 | 28.9 | 40.1 | 40.6 | 16.4 | 6 |
| 2026 H1 | 27.4 | 49.3 | 23.3 | 20.7 | 6 |
| 2026 H2 | 9.7 | 46.6 | 18.8 | 30.5 | 2 |
