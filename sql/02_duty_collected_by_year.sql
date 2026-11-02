-- Question: How much duty was charged on US imports each year, and how much of the increase was new tariffs?
-- Why it matters: it puts a dollar figure on the policy, and lets us check our numbers against CBP's own
-- figure for IEEPA tariffs (about $166 billion collected, CBP, March 2026).
-- Method: January-August of each year so the latest year compares like with like. "Above 2024 rate" =
-- duty minus what the 2024 effective rate would have charged on the same imports.

WITH yearly AS (
    SELECT
        CAST(year(month_start) AS VARCHAR) AS year,
        SUM(consumption_imports) AS imports,
        SUM(calculated_duty)     AS duty
    FROM country_month
    WHERE is_total AND month(month_start) <= (SELECT month(MAX(month_start)) FROM country_month)
    GROUP BY ALL
)
SELECT
    year,
    ROUND(imports / 1e9, 1)                                    AS imports_jan_aug_bn,
    ROUND(duty / 1e9, 1)                                       AS duty_jan_aug_bn,
    ROUND(100 * duty / imports, 2)                             AS effective_rate_pct,
    ROUND((duty - imports * (SELECT duty / imports FROM yearly WHERE year = '2024')) / 1e9, 1) AS above_2024_rate_bn
FROM yearly
ORDER BY year;
