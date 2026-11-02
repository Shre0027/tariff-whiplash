-- Question: Which countries gained and lost share of US imports?
-- Why it matters: a tariff on one country mostly moves purchases elsewhere ("trade diversion") rather than
-- bringing all of it home. This shows where it went.
-- Method: January-August 2024 vs January-August 2026, imports for consumption, focus countries.

WITH t AS (
    SELECT cty_code, country, year(month_start) AS year, SUM(consumption_imports) AS imports
    FROM country_month
    WHERE year(month_start) IN (2024, 2026)
      AND month(month_start) <= (SELECT month(MAX(month_start)) FROM country_month)
    GROUP BY ALL
),
w AS (
    SELECT cty_code, country,
           SUM(imports) FILTER (WHERE year = 2024) AS y2024,
           SUM(imports) FILTER (WHERE year = 2026) AS y2026
    FROM t GROUP BY ALL
),
total AS (SELECT y2024 AS t24, y2026 AS t26 FROM w WHERE cty_code = '-')
SELECT
    country,
    ROUND(y2024 / 1e9, 1)                      AS jan_aug_2024_bn,
    ROUND(y2026 / 1e9, 1)                      AS jan_aug_2026_bn,
    ROUND(100 * (y2026 / y2024 - 1), 1)        AS change_pct,
    ROUND(100 * y2024 / t24, 1)                AS share_2024_pct,
    ROUND(100 * y2026 / t26, 1)                AS share_2026_pct,
    ROUND(100 * (y2026 / t26 - y2024 / t24), 2) AS share_change_pts
FROM w, total
WHERE cty_code IN (SELECT cty_code FROM focus)
ORDER BY share_change_pts;
