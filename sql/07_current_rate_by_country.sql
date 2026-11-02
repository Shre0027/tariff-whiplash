-- Question: What is each main supplier's effective tariff rate now, compared with before 2025?
-- Why it matters: after the court ruling and the July 2026 Section 301 tariffs, the cost of buying from
-- each country changed again. This is the starting point for any sourcing decision today.
-- Method: latest month in the data vs the 2024 average, focus countries. Calculated duty / imports.

WITH latest AS (SELECT MAX(month) AS m FROM country_month)
SELECT
    country,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE year(month_start) = 2024)
              / SUM(consumption_imports) FILTER (WHERE year(month_start) = 2024), 2) AS rate_2024_pct,
    ROUND(100 * MAX(calculated_duty / consumption_imports) FILTER (WHERE month = '2025-10'), 2) AS rate_oct_2025_pct,
    ROUND(100 * MAX(calculated_duty / consumption_imports) FILTER (WHERE month = (SELECT m FROM latest)), 2) AS rate_latest_pct,
    ROUND(MAX(consumption_imports) FILTER (WHERE month = (SELECT m FROM latest)) / 1e9, 1) AS imports_latest_month_bn
FROM country_month
WHERE cty_code IN (SELECT cty_code FROM focus)
GROUP BY country
ORDER BY rate_latest_pct DESC;
