# SQL analysis

Standard SQL run with DuckDB directly on the Census trade files in `data/raw/` (2022-01 to 2026-09). Shared views are defined in [`sql/00_setup.sql`](../sql/00_setup.sql). Re-run everything with `python scripts/run_sql.py`; full results are in [`analysis/results/`](results/).

Effective tariff rate = calculated duty / imports for consumption. Calculated duty is the duty assessed when goods enter the US; refunds paid later (for the struck-down IEEPA tariffs) are not subtracted.

## 01. Effective tariff rate by month

**Question:** What tariff rate did US importers actually pay each month, overall and for the main suppliers?

**Why it matters:** headline rates ("145% on China") apply only to some goods and stack with exemptions. The rate actually charged at the border shows the real size of each change.

**Method:** effective rate = calculated duty / imports for consumption, per month. Calculated duty is assessed at entry; refunds paid later are not subtracted.

Query: [`sql/01_effective_tariff_rate_by_month.sql`](../sql/01_effective_tariff_rate_by_month.sql)

| month | all_countries_pct | china_pct | india_pct | vietnam_pct | mexico_pct | canada_pct |
|---|---|---|---|---|---|---|
| 2026-09 | 6.49 | 19.87 | 8.87 | 6.85 | 3.11 | 4.17 |
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

*Showing 20 of 57 rows; see the CSV for all.*

## 02. Duty collected by year

**Question:** How much duty was charged on US imports each year, and how much of the increase was new tariffs?

**Why it matters:** it puts a dollar figure on the policy, and lets us check our numbers against CBP's own figure for IEEPA tariffs (about $166 billion collected, CBP, March 2026).

**Method:** January-August of each year so the latest year compares like with like. "Above 2024 rate" = duty minus what the 2024 effective rate would have charged on the same imports.

Query: [`sql/02_duty_collected_by_year.sql`](../sql/02_duty_collected_by_year.sql)

| year | imports_jan_aug_bn | duty_jan_aug_bn | effective_rate_pct | above_2024_rate_bn |
|---|---|---|---|---|
| 2022 | 2,437 | 69.9 | 2.87 | 12.3 |
| 2023 | 2,292 | 54.6 | 2.38 | 0.5 |
| 2024 | 2,404 | 56.8 | 2.36 | 0 |
| 2025 | 2,582 | 178 | 6.91 | 118 |
| 2026 | 2,736 | 196 | 7.18 | 132 |

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
| China | 316 | 206 | -34.6 | 13.1 | 7.5 | -5.58 |
| Canada | 308 | 304 | -1.4 | 12.8 | 11.1 | -1.71 |
| Ireland | 71.7 | 42.9 | -40.2 | 3 | 1.6 | -1.42 |
| Germany | 120 | 114 | -4.9 | 5 | 4.2 | -0.82 |
| Japan | 112 | 108 | -2.9 | 4.6 | 4 | -0.68 |
| Singapore | 32 | 25.4 | -20.6 | 1.3 | 0.9 | -0.4 |
| Brazil | 31.7 | 27.7 | -12.7 | 1.3 | 1 | -0.31 |
| United Kingdom | 50.5 | 49.4 | -2 | 2.1 | 1.8 | -0.29 |
| Italy | 56.7 | 58.8 | 3.7 | 2.4 | 2.1 | -0.21 |
| Switzerland | 37.4 | 37.9 | 1.4 | 1.6 | 1.4 | -0.17 |
| All countries | 2,404 | 2,736 | 13.8 | 100 | 100 | 0 |
| France | 44.4 | 50.8 | 14.5 | 1.8 | 1.9 | 0.01 |
| Bangladesh | 6.2 | 7.4 | 18.3 | 0.3 | 0.3 | 0.01 |
| India | 65.5 | 75.8 | 15.8 | 2.7 | 2.8 | 0.05 |
| Indonesia | 20.2 | 24.8 | 22.9 | 0.8 | 0.9 | 0.07 |
| Cambodia | 9.5 | 14 | 47.5 | 0.4 | 0.5 | 0.12 |
| Philippines | 10.1 | 20.1 | 98.3 | 0.4 | 0.7 | 0.31 |
| South Korea | 98.9 | 128 | 29.3 | 4.1 | 4.7 | 0.56 |
| Malaysia | 37 | 62 | 67.4 | 1.5 | 2.3 | 0.72 |
| Mexico | 375 | 479 | 27.7 | 15.6 | 17.5 | 1.91 |

*Showing 20 of 23 rows; see the CSV for all.*

## 05. China share by chapter

**Question:** In which kinds of goods did China lose the most US sales, and who took them?

**Why it matters:** "imports from China fell" hides big differences. Electronics moved fast; toys barely moved. That tells a business which supply chains are hard to shift.

**Method:** January-August 2024 vs 2026, HS 2-digit chapters with at least $5 billion of imports in 2024. "Top gainer" = the focus country (other than China) whose imports in that chapter grew most in dollars.

Query: [`sql/05_china_share_by_chapter.sql`](../sql/05_china_share_by_chapter.sql)

| hs2 | chapter | us_imports_2024_bn | china_share_2024_pct | china_share_2026_pct | china_change_bn | top_gainer | top_gainer_change_bn |
|---|---|---|---|---|---|---|---|
| 85 | Electrical and electronics | 343 | 24.6 | 10.3 | -36.9 | Vietnam | 38.1 |
| 84 | Machinery, computers | 381 | 15.5 | 4.5 | -27.6 | Taiwan | 103 |
| 95 | Toys, games, sports equipment | 28.7 | 72.8 | 51.8 | -8.3 | Vietnam | 2.5 |
| 94 | Furniture, lighting, bedding | 50.2 | 28.5 | 18.8 | -6.2 | Cambodia | 0.6 |
| 39 | Plastics | 54.8 | 26.4 | 19.5 | -4.1 | Vietnam | 1.1 |
| 87 | Vehicles and parts | 292 | 4.2 | 3.3 | -4.1 | Vietnam | 0.5 |
| 73 | Iron and steel articles | 36.9 | 23.9 | 18.3 | -3.7 | Vietnam | 0.3 |
| 64 | Footwear | 20.6 | 37 | 21 | -3.4 | Vietnam | 1.1 |
| 61 | Clothing, knitted | 33.7 | 22 | 12.8 | -3.3 | Vietnam | 1 |
| 62 | Clothing, not knitted | 26.9 | 21 | 12.1 | -2.6 | Bangladesh | 0.4 |
| 63 | Other textile articles | 12.4 | 51.1 | 40.4 | -1.9 | Vietnam | 0.3 |
| 90 | Medical, optical, measuring instruments | 90.6 | 9.5 | 7.7 | -1.6 | Ireland | 1 |
| 42 | Handbags, luggage, leather goods | 10 | 22.8 | 12.8 | -1 | Vietnam | 0.3 |
| 48 | Paper and paperboard | 14.4 | 14.1 | 7.3 | -1 | Thailand | 0.3 |
| 83 | Misc. metal articles | 11.4 | 34.1 | 27.3 | -0.9 | Vietnam | 0.2 |
| 96 | Misc. manufactured articles | 6.5 | 54.3 | 44.9 | -0.8 | Vietnam | 0.3 |
| 40 | Rubber | 25.5 | 7.4 | 4.4 | -0.8 | Cambodia | 0.5 |
| 44 | Wood | 17.2 | 8.4 | 6.1 | -0.6 | Malaysia | 0.1 |
| 82 | Tools and cutlery | 8.3 | 27.6 | 19.3 | -0.6 | Vietnam | 0.3 |
| 76 | Aluminum | 19.8 | 10.8 | 7.1 | -0.5 | South Korea | 0.9 |

*Showing 20 of 50 rows; see the CSV for all.*

## 06. Products that left china

**Question:** Which individual products moved away from China the most, and where to?

**Why it matters:** this is the level a buyer works at. It separates real moves (a product's China share collapses while another country's rises) from goods the US simply bought less of.

**Method:** HS 6-digit products with at least $1 billion of US imports in January-August 2024. Rank by dollars lost by China; "top gainer" is the focus country whose imports of that product grew most.

Query: [`sql/06_products_that_left_china.sql`](../sql/06_products_that_left_china.sql)

| hs6 | description | us_imports_2024_bn | china_share_2024_pct | china_share_2026_pct | china_change_bn | top_gainer | top_gainer_change_bn |
|---|---|---|---|---|---|---|---|
| 847130 | PORT DIGTL AUTOMATIC DATA PROCESS MACH NOT > 10 KG | 35.79 | 66.8 | 8.3 | -20.41 | Vietnam | 19.29 |
| 851713 | SMARTPHONES | 37.95 | 70.7 | 28.4 | -14.14 | India | 14.6 |
| 850760 | LITHIUM ION BATTERIES | 15.13 | 72.1 | 39 | -6.05 | Japan | 1.25 |
| 300490 | MEDICAMENTS NESOI, MEASURED DOSES, RETAIL PK NESOI | 62.31 | 7 | 2.2 | -3.21 | France | 1.38 |
| 950450 | VIDEO GAME CONSOLES & MACH, EXC OF SUBHEAD 9504.30 | 3.96 | 82.4 | 14.7 | -2.83 | Vietnam | 1.43 |
| 851762 | MACH FOR RECP/CONVR/TRANS/REGN OF VOICE/IMAGE/DATA | 39.66 | 13.9 | 2.7 | -2.77 | Vietnam | 21.65 |
| 950300 | TRICYCLE, SCOOTR, PEDAL CAR & SIM WHEELED TYS; ETC | 12.04 | 76.5 | 64.7 | -2.74 | Vietnam | 0.35 |
| 852852 | OTHER MONITORS CAPABLE OF DIRECT CONNECT TO ADP | 4.71 | 79.1 | 32.8 | -2.16 | Vietnam | 1.25 |
| 851830 | HEAD-EAR-PHONES & COMBINED MICROPHONE/SPEAKER SETS | 5.01 | 48.9 | 22.4 | -1.55 | Vietnam | 0.41 |
| 940161 | SEATS W WOODEN FRAMES, UPHOLSTERED, NESOI | 5.26 | 26.9 | 8 | -1.1 | Vietnam | 0.12 |
| 391810 | FLOOR, WALL, ETC COVERS, VINYL CHLORIDE POLYMERS | 3.1 | 36.1 | 3.9 | -1.02 | Thailand | 0.42 |
| 940320 | METAL FURNITURE NESOI | 4.75 | 41.7 | 29.7 | -0.96 | Thailand | 0.2 |
| 950510 | ART F CHRISTMAS FESTIVITIES AND PTS & ACCESSORIES | 2.71 | 88.2 | 70.8 | -0.93 | Cambodia | 0.12 |
| 852872 | RECEPTION APPARATUS FOR TELEVISION, COLOR, NESOI | 8.35 | 10.5 | 0.2 | -0.86 | Mexico | 1.26 |
| 732393 | TABLE, KITCHEN ETC ARTICLES & PTS, STAINLESS STEEL | 1.77 | 85.7 | 70.1 | -0.86 | Italy | 0.02 |
| 640419 | FOOTWEAR, OUT SOLE RUB OR PLAST & TEXT UPPER NESOI | 2.92 | 56.8 | 33.2 | -0.83 | Cambodia | 0.19 |
| 854370 | ELEC MACH AND APP, HAVING INDIV FUNCTIONS, NESOI | 10.04 | 13.6 | 5.9 | -0.79 | Mexico | 0.83 |
| 847330 | PARTS & ACCESSORIES FOR ADP MACHINES & UNITS | 35.82 | 9.2 | 2.1 | -0.77 | Vietnam | 28.35 |
| 940179 | SEATS WITH METAL FRAMES, EXCEPT UPHOLSTERED NESOI | 1.65 | 73.2 | 34.3 | -0.74 | Vietnam | 0.3 |
| 640299 | FOOTWEAR, OUTER SOLE & UPPER RUBBER OR PLAST NESOI | 3.65 | 54.8 | 33 | -0.73 | Vietnam | 0.42 |

*Showing 20 of 25 rows; see the CSV for all.*

## 07. Current rate by country

**Question:** What is each main supplier's effective tariff rate now, compared with before 2025?

**Why it matters:** after the court ruling and the July 2026 Section 301 tariffs, the cost of buying from each country changed again. This is the starting point for any sourcing decision today.

**Method:** latest month in the data vs the 2024 average, focus countries. Calculated duty / imports.

Query: [`sql/07_current_rate_by_country.sql`](../sql/07_current_rate_by_country.sql)

| country | rate_2024_pct | rate_oct_2025_pct | rate_latest_pct | imports_latest_month_bn |
|---|---|---|---|---|
| Bangladesh | 15.06 | 33.45 | 24.33 | 0.9 |
| Cambodia | 7.02 | 28.84 | 20.67 | 2 |
| China | 10.93 | 37.82 | 19.87 | 30.8 |
| Indonesia | 4.88 | 22.06 | 14.18 | 3 |
| Japan | 1.52 | 14.62 | 10.25 | 12.1 |
| Brazil | 1.28 | 22.33 | 10.02 | 3.7 |
| India | 2.41 | 22.03 | 8.87 | 9.2 |
| Germany | 1.38 | 10.94 | 7.48 | 14.5 |
| Vietnam | 3.81 | 12.4 | 6.85 | 29.2 |
| All countries | 2.36 | 10.84 | 6.49 | 354 |
| Italy | 2.23 | 11.23 | 6.44 | 7.8 |
| South Korea | 0.19 | 14.12 | 5.85 | 19.2 |
| United Kingdom | 0.95 | 5.72 | 5.72 | 5.7 |
| France | 1.17 | 6.26 | 5.02 | 5.4 |
| Thailand | 1.63 | 8.94 | 4.66 | 14.2 |
| Philippines | 1.35 | 14.43 | 4.46 | 2.9 |
| Canada | 0.1 | 3.8 | 4.17 | 35 |
| Switzerland | 0.59 | 8.95 | 4.06 | 4.4 |
| Malaysia | 0.69 | 9.41 | 3.79 | 8.5 |
| Mexico | 0.24 | 4.35 | 3.11 | 62.3 |

*Showing 20 of 23 rows; see the CSV for all.*

## 08. Rate by chapter latest

**Question:** Which kinds of goods carry the highest tariffs now?

**Why it matters:** shoppers feel tariffs through specific goods. Clothing and footwear had high tariffs even before 2025; steel and aluminum products jumped under Section 232.

**Method:** latest month vs 2024, all countries, HS chapters with at least $1 billion of imports in the latest month.

Query: [`sql/08_rate_by_chapter_latest.sql`](../sql/08_rate_by_chapter_latest.sql)

| hs2 | chapter | group | rate_2024_pct | rate_latest_pct | imports_latest_bn |
|---|---|---|---|---|---|
| 73 | Iron and steel articles | Metals and building materials | 5.6 | 41.7 | 3.2 |
| 76 | Aluminum | Metals and building materials | 3.7 | 38.8 | 2.5 |
| 72 | Iron and steel | Metals and building materials | 2.6 | 26.8 | 2.3 |
| 61 | Clothing, knitted | Clothing and footwear | 14.9 | 24.2 | 4.6 |
| 42 | Handbags, luggage, leather goods | Clothing and footwear | 13 | 22.4 | 1.2 |
| 62 | Clothing, not knitted | Clothing and footwear | 14.3 | 22.3 | 3.1 |
| 64 | Footwear | Clothing and footwear | 12.2 | 22.2 | 2.6 |
| 63 | Other textile articles | Clothing and footwear | 8.7 | 18.1 | 1.4 |
| 83 | Misc. metal articles | Metals and building materials | 6.8 | 17 | 1.3 |
| 82 | Tools and cutlery | Metals and building materials | 8.4 | 16.8 | 1.1 |
| 94 | Furniture, lighting, bedding | Other manufactured goods | 5.6 | 15.3 | 4.9 |
| 40 | Rubber | Chemicals and plastics | 3.1 | 13.2 | 2.9 |
| 39 | Plastics | Chemicals and plastics | 5.3 | 12.6 | 6.2 |
| 87 | Vehicles and parts | Vehicles and transport | 2 | 12.4 | 26.5 |
| 95 | Toys, games, sports equipment | Other manufactured goods | 1.2 | 12.2 | 3.6 |
| 33 | Cosmetics, perfume | Chemicals and plastics | 1.3 | 11.7 | 1.6 |
| 44 | Wood | Wood and paper | 2.1 | 11.4 | 1.5 |
| 48 | Paper and paperboard | Wood and paper | 2.8 | 9.6 | 1.6 |
| 03 | Fish and seafood | Food and farm | 0.8 | 8.7 | 1.6 |
| 29 | Organic chemicals | Chemicals and plastics | 2.4 | 8.7 | 3 |

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
| 2026 H2 | 17.3 | 36.1 | 36.5 | 23.3 | 3 |
