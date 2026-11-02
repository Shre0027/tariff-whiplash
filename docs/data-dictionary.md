# Data dictionary

All dollar values are US dollars, not adjusted for inflation. Source for everything in `data/raw/`: US Census Bureau, international trade API, endpoint `timeseries/intltrade/imports/hs` ([variable list](https://api.census.gov/data/timeseries/intltrade/imports/hs/variables.html)).

## Census terms used

| Term | Census variable | Meaning |
|---|---|---|
| Imports for consumption | `CON_VAL_MO` / `_YR` | Value of goods entering the US market (customs value: the price paid, excluding international freight and insurance). The base for all tariff rates here |
| General imports | `GEN_VAL_MO` | Imports for consumption plus goods entering bonded warehouses and foreign-trade zones |
| Calculated duty | `CAL_DUT_MO` / `_YR` | Duty assessed at entry on imports for consumption. Not reduced by later refunds |
| Dutiable value | `DUT_VAL_MO` | The part of imports for consumption that is subject to duty |
| Charges | `CON_CHA_MO` / `_YR` | Freight, insurance and other costs of bringing goods to the first US port (for land neighbors, to the border) |
| Quantity 1 | `CON_QY1_MO` / `_YR` | Units in the product's unit of quantity (`UNIT_QY1`: NO = number, PRS = pairs, DOZ = dozens, KG...). Reported only at HTS 10-digit level |
| Country code | `CTY_CODE` | Census Schedule C code. `-` = all countries; codes starting with 0 or containing X are groups (EU, ASEAN, continents) |
| HS / HTS code | `I_COMMODITY` | Harmonized System product code: 2 digits = chapter, 6 = international product code, 10 = US statistical code |

## Files

### `data/raw/country_month.csv`
One row per country or group per month, January 2022 onward.

| Column | Type | Description |
|---|---|---|
| month | text `YYYY-MM` | Month |
| cty_code | text | Census country code (see above) |
| country | text | Census country name, upper case |
| general_imports | integer | General imports, $ |
| consumption_imports | integer | Imports for consumption, $ |
| dutiable_value | integer | Dutiable value, $ |
| calculated_duty | integer | Calculated duty, $ |
| charges | integer | Freight and insurance charges, $ |

### `data/raw/chapter_month.csv.gz`
HS 2-digit chapter × focus country × month, January 2022 onward. Columns: `month`, `cty_code`, `hs2`, `consumption_imports`, `calculated_duty`. Rows with zero imports are left out.

### `data/raw/product_ytd.csv.gz`
HS 6-digit product × focus country, January to the latest month, for the latest year and the two before.

| Column | Description |
|---|---|
| year, through_month | The year, and the last month included (e.g. 2024, 8 = January–August 2024) |
| cty_code, hs6 | Country and product |
| unit | Always `-` at this level (6-digit totals mix units) |
| ytd_value, ytd_duty, ytd_quantity | Year-to-date imports for consumption, calculated duty, quantity (0 at this level) |
| month_value, month_duty, month_charges, month_quantity | The same for the last month alone |

### `data/raw/hs10_latest.csv.gz`
HTS 10-digit product × focus country for the latest year (January to the latest month, and the latest month alone). Same columns as above plus `ytd_charges`; here `unit` and quantities are filled in. Used by the cost simulator.

### `data/raw/products.csv`, `data/raw/products_hs10.csv.gz`
Product codes with the Census short description (and unit of quantity at 10 digits).

### `data/raw/smartphones.csv`
HS 851713 (smartphones) by country (all countries and groups) and month from January 2024: `month`, `cty_code`, `consumption_imports`, `calculated_duty`, `units` (0 at this level).

### `data/raw/fetched.json`
Download date and latest month available.

## Reference files (written for this project)

| File | Contents |
|---|---|
| `config/countries.json` | The 23 focus countries with Census codes, and why they were chosen |
| `config/simulator_products.json` | The 19 products in the simulator: HTS 10-digit code, plain-English name, unit |
| `data/reference/hs_chapters.csv` | Short names and groups for HS chapters |
| `data/reference/timeline.json` | Tariff events 2025–26, each with law and source |
| `data/reference/refunds.json` | Refund progress figures as reported, with sources |

## Derived measures

| Measure | Formula | Where |
|---|---|---|
| Effective tariff rate | calculated duty ÷ imports for consumption | `sql/01`, `07`, `08`; site |
| Share of US imports | country's imports ÷ all-countries imports (same product, same months) | `sql/04`–`06`, `09` |
| Extra duty | duty − (2024 effective rate of the same chapter × imports) | `sql/02`, `03` |
| Landed cost of $100 of goods | 100 + 100 × charges ÷ value + effective rate | simulator |
| Break-even price difference | (China landed cost ÷ other country's landed cost) − 1 | simulator |
