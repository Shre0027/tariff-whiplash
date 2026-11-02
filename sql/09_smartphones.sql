-- Question: Where do US smartphones come from now?
-- Why it matters: smartphones are the single largest consumer product the US imports, and they were
-- exempted from the April 2025 "reciprocal" tariffs. The shift from China to India started earlier and sped up.
-- Method: HS 851713 (smartphones), imports for consumption by half-year, share of the all-countries total.

WITH h AS (
    SELECT
        substr(month, 1, 4) || CASE WHEN CAST(substr(month, 6, 2) AS INT) <= 6 THEN ' H1' ELSE ' H2' END AS half_year,
        cty_code,
        SUM(consumption_imports) AS v,
        COUNT(DISTINCT month) AS months
    FROM read_csv('data/raw/smartphones.csv', types = {'cty_code': 'VARCHAR', 'month': 'VARCHAR'})
    GROUP BY ALL
),
total AS (SELECT half_year, v AS total, months FROM h WHERE cty_code = '-')
SELECT
    half_year,
    ROUND(total / 1e9, 1)                                                      AS us_imports_bn,
    ROUND(100 * SUM(v) FILTER (WHERE cty_code = '5330') / ANY_VALUE(total), 1) AS india_pct,
    ROUND(100 * SUM(v) FILTER (WHERE cty_code = '5700') / ANY_VALUE(total), 1) AS china_pct,
    ROUND(100 * SUM(v) FILTER (WHERE cty_code = '5520') / ANY_VALUE(total), 1) AS vietnam_pct,
    ANY_VALUE(total.months)                                                    AS months_of_data
FROM h JOIN total USING (half_year)
GROUP BY half_year, total
ORDER BY half_year;
