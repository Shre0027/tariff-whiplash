-- Question: Which individual products moved away from China the most, and where to?
-- Why it matters: this is the level a buyer works at. It separates real moves (a product's China share
-- collapses while another country's rises) from goods the US simply bought less of.
-- Method: HS 6-digit products with at least $1 billion of US imports in January-August 2024. Rank by
-- dollars lost by China; "top gainer" is the focus country whose imports of that product grew most.

WITH w AS (
    SELECT hs6, cty_code, ANY_VALUE(description) AS description,
           COALESCE(SUM(ytd_value) FILTER (WHERE year = 2024), 0) AS y24,
           COALESCE(SUM(ytd_value) FILTER (WHERE year = 2026), 0) AS y26
    FROM product_ytd
    WHERE year IN (2024, 2026)
    GROUP BY ALL
),
gainer AS (
    SELECT hs6, arg_max(f.name, y26 - y24) AS top_gainer, MAX(y26 - y24) AS gain
    FROM w JOIN focus f USING (cty_code)
    WHERE cty_code NOT IN ('-', '5700')
    GROUP BY hs6
)
SELECT
    tot.hs6,
    tot.description,
    ROUND(tot.y24 / 1e9, 2)                        AS us_imports_2024_bn,
    ROUND(100 * COALESCE(cn.y24, 0) / tot.y24, 1)  AS china_share_2024_pct,
    ROUND(100 * COALESCE(cn.y26, 0) / NULLIF(tot.y26, 0), 1) AS china_share_2026_pct,
    ROUND((COALESCE(cn.y26, 0) - COALESCE(cn.y24, 0)) / 1e9, 2) AS china_change_bn,
    g.top_gainer,
    ROUND(g.gain / 1e9, 2)                         AS top_gainer_change_bn
FROM w tot
LEFT JOIN w cn ON cn.hs6 = tot.hs6 AND cn.cty_code = '5700'
LEFT JOIN gainer g ON g.hs6 = tot.hs6
WHERE tot.cty_code = '-' AND tot.y24 >= 1e9
ORDER BY china_change_bn
LIMIT 25;
