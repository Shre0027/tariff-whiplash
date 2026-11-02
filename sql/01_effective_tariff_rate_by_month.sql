-- Question: What tariff rate did US importers actually pay each month, overall and for the main suppliers?
-- Why it matters: headline rates ("145% on China") apply only to some goods and stack with exemptions.
-- The rate actually charged at the border shows the real size of each change.
-- Method: effective rate = calculated duty / imports for consumption, per month. Calculated duty is
-- assessed at entry; refunds paid later are not subtracted.

SELECT
    month,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE cty_code = '-')    / SUM(consumption_imports) FILTER (WHERE cty_code = '-'),    2) AS all_countries_pct,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE cty_code = '5700') / SUM(consumption_imports) FILTER (WHERE cty_code = '5700'), 2) AS china_pct,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE cty_code = '5330') / SUM(consumption_imports) FILTER (WHERE cty_code = '5330'), 2) AS india_pct,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE cty_code = '5520') / SUM(consumption_imports) FILTER (WHERE cty_code = '5520'), 2) AS vietnam_pct,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE cty_code = '2010') / SUM(consumption_imports) FILTER (WHERE cty_code = '2010'), 2) AS mexico_pct,
    ROUND(100 * SUM(calculated_duty) FILTER (WHERE cty_code = '1220') / SUM(consumption_imports) FILTER (WHERE cty_code = '1220'), 2) AS canada_pct
FROM country_month
GROUP BY month
ORDER BY month DESC;
