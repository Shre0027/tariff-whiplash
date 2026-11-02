-- Question: How much extra duty was charged while the IEEPA tariffs were in force, and in which goods?
-- Why it matters: this is a check on the method. CBP reported about $166 billion of IEEPA tariffs collected.
-- The extra duty in our data should be larger, because Section 232 tariffs (steel, aluminum, autos, copper,
-- lumber) also rose in this period and are not being refunded.
-- Method: February 2025 to February 2026 (first to last month of IEEPA collections). For each HS chapter,
-- extra duty = duty charged minus the chapter's own 2024 effective rate times its imports.
-- Chapters 72, 73, 74, 76, 87 and 44 are mostly covered by Section 232 tariffs.

WITH base AS (
    SELECT hs2, SUM(calculated_duty) / SUM(consumption_imports) AS rate_2024
    FROM chapter_month
    WHERE cty_code = '-' AND year(month_start) = 2024
    GROUP BY hs2
),
period AS (
    SELECT hs2, SUM(consumption_imports) AS imports, SUM(calculated_duty) AS duty
    FROM chapter_month
    WHERE cty_code = '-' AND month BETWEEN '2025-02' AND '2026-02'
    GROUP BY hs2
),
extra AS (
    SELECT p.hs2, c.chapter,
           CASE WHEN p.hs2 IN ('72', '73', '74', '76', '87', '44') THEN 'Mostly Section 232' ELSE 'Mostly IEEPA' END AS main_tariff,
           p.duty - p.imports * COALESCE(b.rate_2024, 0) AS extra_duty
    FROM period p
    LEFT JOIN base b USING (hs2)
    LEFT JOIN chapters c USING (hs2)
)
SELECT main_tariff, ROUND(SUM(extra_duty) / 1e9, 1) AS extra_duty_bn, COUNT(*) AS chapters
FROM extra
GROUP BY ROLLUP (main_tariff)
ORDER BY main_tariff NULLS LAST;
