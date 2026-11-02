-- Views over the raw Census files. Every query in this folder starts from these.
-- Effective tariff rate = calculated duty / imports for consumption (both in US dollars).

-- Country names as the Census API spells them, plus a short display name for focus countries.
CREATE OR REPLACE VIEW focus AS
SELECT f.code AS cty_code, f.name
FROM (SELECT unnest(focus) AS f FROM read_json('config/countries.json'));

-- One row per country (or group) per month, Jan 2022 onward.
-- Groups (EU, ASEAN...) have codes starting with 0 or containing X; "-" is all countries.
CREATE OR REPLACE VIEW country_month AS
SELECT
    month,
    CAST(month || '-01' AS DATE)                                  AS month_start,
    cty_code,
    coalesce(f.name, country)                                     AS country,
    cty_code = '-'                                                AS is_total,
    cty_code LIKE '0%' OR cty_code LIKE '%X%'                     AS is_group,
    consumption_imports,
    calculated_duty,
    charges
FROM read_csv('data/raw/country_month.csv', types = {'cty_code': 'VARCHAR', 'month': 'VARCHAR'})
LEFT JOIN focus f USING (cty_code);

-- HS 2-digit chapter x focus country x month.
CREATE OR REPLACE VIEW chapter_month AS
SELECT month, CAST(month || '-01' AS DATE) AS month_start, cty_code, hs2, consumption_imports, calculated_duty
FROM read_csv('data/raw/chapter_month.csv.gz', types = {'cty_code': 'VARCHAR', 'hs2': 'VARCHAR', 'month': 'VARCHAR'});

-- HS 6-digit product x focus country, January to the latest month, for three years.
CREATE OR REPLACE VIEW product_ytd AS
SELECT p.*, d.description
FROM read_csv('data/raw/product_ytd.csv.gz', types = {'cty_code': 'VARCHAR', 'hs6': 'VARCHAR'}) p
LEFT JOIN read_csv('data/raw/products.csv', types = {'hs6': 'VARCHAR'}) d USING (hs6);

-- HS chapter names (WCO Harmonized System, short labels written for this project).
CREATE OR REPLACE VIEW chapters AS
SELECT * FROM read_csv('data/reference/hs_chapters.csv', types = {'hs2': 'VARCHAR'});
