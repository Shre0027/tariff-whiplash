-- Question: In which kinds of goods did China lose the most US sales, and who took them?
-- Why it matters: "imports from China fell" hides big differences. Electronics moved fast; toys barely moved.
-- That tells a business which supply chains are hard to shift.
-- Method: January-August 2024 vs 2026, HS 2-digit chapters with at least $5 billion of imports in 2024.
-- "Top gainer" = the focus country (other than China) whose imports in that chapter grew most in dollars.

WITH t AS (
    SELECT cty_code, hs2, year(month_start) AS year, SUM(consumption_imports) AS v
    FROM chapter_month
    WHERE year(month_start) IN (2024, 2026)
      AND month(month_start) <= (SELECT month(MAX(month_start)) FROM chapter_month)
    GROUP BY ALL
),
w AS (
    SELECT cty_code, hs2,
           COALESCE(SUM(v) FILTER (WHERE year = 2024), 0) AS y24,
           COALESCE(SUM(v) FILTER (WHERE year = 2026), 0) AS y26
    FROM t GROUP BY ALL
),
gainer AS (
    SELECT hs2, arg_max(f.name, y26 - y24) AS top_gainer, MAX(y26 - y24) AS gain
    FROM w JOIN focus f USING (cty_code)
    WHERE cty_code NOT IN ('-', '5700')
    GROUP BY hs2
)
SELECT
    tot.hs2,
    c.chapter,
    ROUND(tot.y24 / 1e9, 1)                    AS us_imports_2024_bn,
    ROUND(100 * cn.y24 / tot.y24, 1)           AS china_share_2024_pct,
    ROUND(100 * cn.y26 / tot.y26, 1)           AS china_share_2026_pct,
    ROUND((cn.y26 - cn.y24) / 1e9, 1)          AS china_change_bn,
    g.top_gainer,
    ROUND(g.gain / 1e9, 1)                     AS top_gainer_change_bn
FROM w tot
JOIN w cn ON cn.hs2 = tot.hs2 AND cn.cty_code = '5700'
JOIN chapters c ON c.hs2 = tot.hs2
LEFT JOIN gainer g ON g.hs2 = tot.hs2
WHERE tot.cty_code = '-' AND tot.y24 >= 5e9
ORDER BY china_change_bn;
