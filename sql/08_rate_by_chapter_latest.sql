-- Question: Which kinds of goods carry the highest tariffs now?
-- Why it matters: shoppers feel tariffs through specific goods. Clothing and footwear had high tariffs even
-- before 2025; steel and aluminum products jumped under Section 232.
-- Method: latest month vs 2024, all countries, HS chapters with at least $1 billion of imports in the latest month.

WITH latest AS (SELECT MAX(month) AS m FROM chapter_month)
SELECT
    hs2,
    c.chapter,
    c."group",
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE year(month_start) = 2024)
              / SUM(consumption_imports) FILTER (WHERE year(month_start) = 2024), 1) AS rate_2024_pct,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE month = (SELECT m FROM latest))
              / SUM(consumption_imports) FILTER (WHERE month = (SELECT m FROM latest)), 1) AS rate_latest_pct,
    ROUND(SUM(consumption_imports) FILTER (WHERE month = (SELECT m FROM latest)) / 1e9, 1) AS imports_latest_bn
FROM chapter_month
JOIN chapters c USING (hs2)
WHERE cty_code = '-'
GROUP BY ALL
HAVING imports_latest_bn >= 1
ORDER BY rate_latest_pct DESC
LIMIT 20;
