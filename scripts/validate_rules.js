/*
 * Check the tariff rules (config/tariff_rules.json) against the duty Census recorded.
 *
 * For each tracked product (HTS 10-digit) x country x month from January 2025 with at least $2 million of imports:
 *   actual    = calculated duty / imports for consumption (Census)
 *   predicted = 2024 effective rate of the same product and country (normal duty)
 *               + additional tariffs from the rules, averaged over the days of the month
 * Mexico and Canada are reported separately: Census doesn't say which shipments qualified for USMCA,
 * so the prediction there is a range (all USMCA = no fentanyl tariff, none USMCA = full tariff).
 *
 * Writes docs/rule-validation.md and data/derived/rule_validation.csv
 * Usage: node scripts/validate_rules.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const ROOT = path.resolve(__dirname, "..");
const { create } = require(path.join(ROOT, "templates/tariff_engine.js"));

const MIN_VALUE = 2e6;
const TRANSIT = [7, 42];   // goods are assumed to be loaded 1 to 6 weeks before entry (ocean freight)
const engine = create(JSON.parse(fs.readFileSync(path.join(ROOT, "config/tariff_rules.json"))));
const products = JSON.parse(fs.readFileSync(path.join(ROOT, "config/simulator_products.json"))).products;
const pname = Object.fromEntries(products.map(p => [p.hs10, p.name]));
const focus = JSON.parse(fs.readFileSync(path.join(ROOT, "config/countries.json"))).focus;
const cname = Object.fromEntries(focus.map(c => [c.code, c.name]));
// Countries some rule names explicitly, plus every focus country (they get the baseline/122 rules)
const ruleCountries = new Set(engine.rules.flatMap(r => r.countries).filter(c => c !== "*"));

function readCsvGz(file) {
  const text = zlib.gunzipSync(fs.readFileSync(file)).toString();
  const [head, ...lines] = text.trim().split("\n");
  const cols = head.split(",");
  return lines.map(l => Object.fromEntries(l.split(",").map((v, i) => [cols[i], v])));
}

const rows = readCsvGz(path.join(ROOT, "data/raw/hs10_monthly.csv.gz"))
  .map(r => ({ ...r, value: +r.consumption_imports, duty: +r.calculated_duty }))
  .filter(r => cname[r.cty_code] && r.cty_code !== "-");

// Normal duty: 2024 effective rate per product and country
const base = {};
for (const r of rows.filter(r => r.month.startsWith("2024"))) {
  const k = r.hs10 + "|" + r.cty_code;
  base[k] = base[k] || { v: 0, d: 0 };
  base[k].v += r.value; base[k].d += r.duty;
}

const out = [];
for (const r of rows) {
  if (r.month < "2025-01" || r.value < MIN_VALUE) continue;
  const b = base[r.hs10 + "|" + r.cty_code];
  if (!b || b.v < 5e6) continue;                       // no reliable 2024 base
  const country = cname[r.cty_code];
  const baseRate = 100 * b.d / b.v;
  const args = { month: r.month, hs10: r.hs10, country, baseRate, transitDays: TRANSIT };
  const predicted = engine.monthAverage({ ...args, usmca: false });
  const predictedUsmca = engine.monthAverage({ ...args, usmca: true });
  const actual = 100 * r.duty / r.value;
  const neighbor = country === "Mexico" || country === "Canada";
  const inside = neighbor ? actual >= predictedUsmca - 1 && actual <= predicted + 1 : null;
  out.push({ month: r.month, hs10: r.hs10, product: pname[r.hs10], country, value_m: r.value / 1e6, base: baseRate,
             predicted, predicted_usmca: predictedUsmca, actual, error: actual - predicted, neighbor, inside });
}

const main = out.filter(o => !o.neighbor);
const abs = a => a.map(o => Math.abs(o.error)).sort((x, y) => x - y);
const median = a => a.length ? a[Math.floor(a.length / 2)] : NaN;
const within = (a, t) => a.filter(o => Math.abs(o.error) <= t).length / a.length;
const wavg = a => a.reduce((s, o) => s + Math.abs(o.error) * o.value_m, 0) / a.reduce((s, o) => s + o.value_m, 0);
const f1 = v => v.toFixed(1), p0 = v => Math.round(100 * v) + "%";

function group(list, key) {
  const g = {};
  list.forEach(o => (g[key(o)] = g[key(o)] || []).push(o));
  return Object.entries(g).map(([k, a]) => ({ k, n: a.length, med: median(abs(a)), w2: within(a, 2), w5: within(a, 5), wavg: wavg(a), bias: a.reduce((s, o) => s + o.error, 0) / a.length }));
}
const period = m => m < "2025-04" ? "1. Jan–Mar 2025 (fentanyl tariffs)" : m < "2025-08" ? "2. Apr–Jul 2025 (baseline 10%, China 125% then 10%)"
  : m < "2026-02" ? "3. Aug 2025–Jan 2026 (country rates)" : m < "2026-03" ? "4. Feb 2026 (ruling, mixed month)"
  : m < "2026-07" ? "5. Mar–Jun 2026 (Section 122)" : m < "2026-08" ? "6. Jul 2026 (mixed month)" : "7. Aug 2026 on (Section 301, 2026)";

const table = (rows, h) => ["| " + h.join(" | ") + " |", "|" + h.map((_, i) => i ? "---:" : "---").join("|") + "|",
  ...rows.map(r => "| " + r.join(" | ") + " |")].join("\n");
const fmtGroup = g => g.sort((a, b) => a.k.localeCompare(b.k)).map(x => [x.k, x.n, f1(x.med), p0(x.w2), p0(x.w5), (x.bias >= 0 ? "+" : "") + f1(x.bias)]);
const H = ["", "Product-country-months", "Median error (points)", "Within 2 points", "Within 5 points", "Average bias"];

const worst = main.slice().sort((a, b) => Math.abs(b.error) * Math.sqrt(b.value_m) - Math.abs(a.error) * Math.sqrt(a.value_m)).slice(0, 12);
const nb = out.filter(o => o.neighbor);

const md = `# Rule validation: do the tariff rules reproduce what was actually charged?

> Generated by \`scripts/validate_rules.js\` on ${new Date().toISOString().slice(0, 10)}. Re-run after any change to \`config/tariff_rules.json\`.

**Why this check exists:** the tracker calculates duty from rules typed in from legal summaries. If a rule is missing, wrong or dated wrongly, every cost in the tracker is wrong. Census records the duty actually charged, so it can test the rules: for each product, country and month, the rules' prediction should match the rate Census recorded.

**Method:** ${products.length} tracked products (HTS 10-digit) × countries × months from January 2025, where the month had at least $2 million of imports. Predicted rate = the product's 2024 rate from that country (normal duty, including the 2018–19 tariffs on China) + the additional tariffs in force, averaged over the days of the month. Goods are assumed to be loaded 1–6 weeks before they enter, so in-transit exemptions apply to some of them. Error = actual − predicted, in percentage points.

## Result

**${main.length} product-country-months checked (excluding Mexico and Canada). Median error ${f1(median(abs(main)))} points; ${p0(within(main, 2))} within 2 points, ${p0(within(main, 5))} within 5 points.** Weighted by import value, the average error is ${f1(wavg(main))} points.

### By period
${table(fmtGroup(group(main, o => period(o.month))), H.map((h, i) => i ? h : "Period"))}

### By country
${table(fmtGroup(group(main, o => o.country)), H.map((h, i) => i ? h : "Country"))}

### By product
${table(fmtGroup(group(main, o => o.product)), H.map((h, i) => i ? h : "Product"))}

### Mexico and Canada
Census doesn't say which shipments qualified for USMCA (exempt from most of the new tariffs), so the rules give a range: all qualifying vs none qualifying. **${nb.length ? p0(nb.filter(o => o.inside).length / nb.length) : "n/a"} of ${nb.length} product-country-months fall inside that range (±1 point).**

### Largest gaps
${table(worst.map(o => [o.product, o.country, o.month, "$" + f1(o.value_m) + "M", f1(o.base) + "%", f1(o.predicted) + "%", f1(o.actual) + "%", (o.error >= 0 ? "+" : "") + f1(o.error)]),
  ["Product", "Country", "Month", "Imports", "2024 rate", "Predicted", "Actual", "Gap"])}

## Known gaps (not modeled)
- **Steel and aluminum content (Section 232 "derivative" products).** Some products pay a tariff on the value of the steel or aluminum they contain. Census doesn't report metal content, so the rules can't apply it. This is why goods from China such as exercise equipment and vacuum cleaners show actual rates above the prediction from mid-2025.
- **Product mix inside one code.** HTS 9401.61.6011 (upholstered seats with wooden frames) is under the Section 232 furniture tariff, but goods from China in it run about 3 points below the prediction, consistent with part of the trade being entered under exclusions.
- **Exclusions and annex products.** Each tariff program exempts lists of products (annexes). The rules include the electronics exclusion and Section 232 goods; smaller annexes are not modeled.

## Reading the gaps
- **Mixed months** (February and July 2026, and months when a rule starts mid-month) are averaged by day, but shipments aren't spread evenly across a month, so some gap is expected.
- **Duty is recorded at entry, not when goods were shipped:** goods in transit when a tariff starts can enter under the old rate (in-transit exemptions), so actual rates lag new tariffs by a few weeks.
- **One HTS code can hold products with different rules** (for example, some furniture inside a code is under Section 232 and some isn't).
- A gap that is large and consistent across a period is a sign of a missing or wrong rule; see the [decision log](decision-log.md) for rules changed because of this check.
`;
fs.mkdirSync(path.join(ROOT, "data/derived"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "docs/rule-validation.md"), md);
const csvH = Object.keys(out[0]);
fs.writeFileSync(path.join(ROOT, "data/derived/rule_validation.csv"),
  [csvH.join(","), ...out.map(o => csvH.map(k => typeof o[k] === "number" ? o[k].toFixed(3) : (o[k] ?? "")).map(v => /,/.test(v) ? `"${v}"` : v).join(","))].join("\n"));
console.log(`Checked ${main.length} (+${nb.length} Mexico/Canada). Median error ${f1(median(abs(main)))}; within 2 points ${p0(within(main, 2))}; within 5 ${p0(within(main, 5))}`);
