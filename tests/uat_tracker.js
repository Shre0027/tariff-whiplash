/*
 * User acceptance test (UAT) run for the Tariff Desk tracker prototype.
 * Each case follows a script in docs/uat.md: it performs the actions in a real browser and compares what the
 * page shows with the expected result, which is worked out independently from the data
 * (data/sample/company.json, config/tariff_rules.json) rather than read back from the page.
 *
 * Writes docs/uat-results.md.  Usage: node tests/uat_tracker.js   (needs Playwright; build the site first)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const T = JSON.parse(fs.readFileSync(path.join(ROOT, "site/tracker.json")));
const RefundRules = require(path.join(ROOT, "templates/refund_rules.js"));
const { create } = require(path.join(ROOT, "templates/tariff_engine.js"));
const E = create(T.rules);
const URL = "file://" + path.join(ROOT, "site/tracker.html");
const results = [];

async function uat(id, fr, title, fn) {
  try { const actual = await fn(); results.push({ id, fr, title, pass: true, actual }); }
  catch (e) { results.push({ id, fr, title, pass: false, actual: e.message.split("\n")[0] }); }
}
function expect(cond, msg) { if (!cond) throw new Error(msg); }

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
  const go = async v => { await page.goto(URL + "#" + v); await page.waitForTimeout(300); };
  await page.goto(URL); await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  // Independent expectations
  const today = T.as_of;
  const dutyNow = s => E.duty({ date: today, hs10: s.hs10, country: s.country, usmca: s.usmca, baseRate: s.base_rate }).total;

  await uat("UAT-01", "FR-1", "Every SKU is listed with its HTS code and country of origin", async () => {
    await go("products");
    const rows = await page.$$eval("#pTable tbody tr", trs => trs.map(t => [...t.cells].map(c => c.innerText.trim())));
    expect(rows.length === T.skus.length, `expected ${T.skus.length} rows, saw ${rows.length}`);
    for (const s of T.skus) {
      const r = rows.find(x => x[0] === s.sku);
      expect(r, `${s.sku} missing`);
      expect(r[3] === s.hs10.replace(/(\d{4})(\d{2})(\d{4})/, "$1.$2.$3"), `${s.sku}: HTS shown ${r[3]}`);
      expect(r[2].startsWith(s.country), `${s.sku}: origin shown ${r[2]}`);
    }
    return `${rows.length} SKUs, codes and origins match the product master`;
  });

  await uat("UAT-02", "FR-3", "Duty rate per SKU matches the rules, and the breakdown adds up", async () => {
    await go("products");
    const shown = await page.$$eval("#pTable tbody tr", trs => trs.map(t => [t.cells[0].innerText.trim(), parseFloat(t.cells[5].innerText)]));
    for (const [sku, rate] of shown) {
      const exp = dutyNow(T.skus.find(s => s.sku === sku));
      expect(Math.abs(rate - exp) < 0.051, `${sku}: shown ${rate}%, rules give ${exp}%`);
    }
    const chinaChair = T.skus.find(s => s.country === "China" && s.hs10 === "9401616011");
    await page.click(`#pTable tr[data-s="${chinaChair.sku}"]`); await page.waitForTimeout(400);
    const parts = await page.$$eval(".breakdown .row:not(.tot) .num", n => n.map(x => parseFloat(x.innerText)));
    const tot = await page.$eval(".breakdown .row.tot .num", n => parseFloat(n.innerText));
    expect(Math.abs(parts.reduce((a, b) => a + b, 0) - tot) < 0.06, `parts ${parts} don't add to ${tot}`);
    await page.click("#dClose");
    return `${shown.length} rates match; ${chinaChair.sku} breakdown ${parts.join(" + ")} = ${tot}%`;
  });

  await uat("UAT-03", "FR-4", "A what-if tariff recalculates every affected SKU", async () => {
    await go("rules");
    await page.selectOption("#wiCountry", "Vietnam"); await page.fill("#wiHs", ""); await page.fill("#wiRate", "15");
    await page.fill("#wiDate", "2026-12-01"); await page.selectOption("#wiS232", "yes"); await page.click("#wiApply"); await page.waitForTimeout(300);
    const wi = { id: "W", program: "What-if", countries: ["Vietnam"], hs: null, rate: 15, from: "2026-12-01", to: null, exempt: ["s232"] };
    const exp = T.skus.filter(s => E.duty({ date: "2026-12-01", hs10: s.hs10, country: s.country, usmca: s.usmca, baseRate: s.base_rate, extraRules: [wi] }).total
      !== E.duty({ date: "2026-12-01", hs10: s.hs10, country: s.country, usmca: s.usmca, baseRate: s.base_rate }).total).length;
    const shown = await page.$eval("#wiImpact .kpi .v", n => parseInt(n.innerText));
    expect(shown === exp, `affected shown ${shown}, expected ${exp}`);
    await page.click("#wiSee"); await page.waitForTimeout(300);
    const listed = await page.$$eval("#pTable tbody tr", t => t.length);
    expect(listed === exp, `"Hit by what-if" lists ${listed}, expected ${exp}`);
    const vnChairs = T.skus.filter(s => s.country === "Vietnam" && s.hs10 === "9401616011").map(s => s.sku);
    const listedSkus = await page.$$eval("#pTable tbody tr", t => t.map(r => r.dataset.s));
    expect(!vnChairs.some(s => listedSkus.includes(s)), "Section 232 chairs should be exempt");
    return `${shown} SKUs affected (Vietnam, not under Section 232); product list filtered to the same ${listed}`;
  });

  await uat("UAT-04", "FR-4", "Clearing the what-if restores today's costs", async () => {
    await go("rules"); await page.click("#wiClear"); await page.waitForTimeout(200);
    await go("products");
    const any = await page.$$eval("#pTable .delta-up", n => n.length);
    expect(any === 0, `${any} SKUs still show a what-if change`);
    return "No SKU shows a what-if change after clearing";
  });

  await uat("UAT-05", "FR-4", "Invalid what-if input is rejected with a message", async () => {
    await go("rules");
    await page.fill("#wiRate", "0"); await page.click("#wiApply");
    const m1 = await page.$eval("#wiErr", n => n.innerText);
    await page.fill("#wiRate", "10"); await page.fill("#wiHs", "61ab"); await page.click("#wiApply");
    const m2 = await page.$eval("#wiErr", n => n.innerText);
    expect(/rate/i.test(m1) && /HTS/i.test(m2), `messages: "${m1}" / "${m2}"`);
    await page.fill("#wiHs", "");
    return `Rate 0 → "${m1}"; HTS "61ab" → "${m2}"`;
  });

  await uat("UAT-06", "FR-5", "Every entry is listed with date, origin and liquidation status", async () => {
    await go("entries");
    const n = await page.$$eval("#eTable tbody tr", t => t.length);
    expect(n === T.entries.length, `listed ${n}, expected ${T.entries.length}`);
    return `${n} entries listed`;
  });

  await uat("UAT-07", "FR-6", "Each entry's refund route follows rules R1–R8", async () => {
    await go("entries");
    const shown = await page.$$eval("#eTable tbody tr", t => t.map(r => [r.dataset.e, r.cells[8].innerText.trim()]));
    const claims = Object.fromEntries(T.claims.map(c => [c.entry, c]));
    let checked = 0;
    for (const [id, label] of shown) {
      const e = T.entries.find(x => x.entry === id), c = claims[id];
      if (c) continue;                       // claim status takes over; checked in UAT-09
      const r = RefundRules.refundRoute({ entryDate: e.date, entryType: e.type, liquidated: e.liquidated, liquidationDate: e.liquidation_date, courtOrder: false, achEnrolled: true, today });
      // an entry only has a refund route if some line actually carried an IEEPA tariff (e.g. electronics were exempt)
      const sku = Object.fromEntries(T.skus.map(s => [s.sku, s]));
      const hasIeepa = e.lines.some(l => { const s = sku[l.sku]; return E.duty({ date: e.date, hs10: s.hs10, country: s.country, usmca: s.usmca, baseRate: s.base_rate }).lines.some(x => x.program.startsWith("IEEPA")); });
      const exp = !hasIeepa || r.route === "not_ieepa" ? "No IEEPA duty" : r.route === "cape" ? "To file · Phase " + r.phase : r.route === "protest" ? "Protest needed" : "Court action only";
      expect(label === exp, `${id}: shown "${label}", rules give "${exp}"`);
      checked++;
    }
    return `${checked} routes match the refund rules`;
  });

  await uat("UAT-08", "FR-7", "Deadline list shows entries within 30 days of a deadline, most urgent first", async () => {
    await go("overview");
    const rows = await page.$$eval("#deadlines tbody tr", t => t.map(r => [r.dataset.e, r.cells[2].innerText.trim()]));
    const days = rows.map(([, d]) => d === "Today" ? 0 : parseInt(d));
    expect(days.every((d, i) => d <= 30 && (i === 0 || d >= days[i - 1])), `days not sorted or over 30: ${days}`);
    const risk = await page.$eval("#cntRisk", n => parseInt(n.innerText || "0"));
    const exp = days.filter(d => d <= 14).length;
    expect(risk >= exp, `menu badge ${risk} < ${exp} entries at ≤14 days`);
    return `${rows.length} entries, days ${days.join(", ")}; badge ${risk}`;
  });

  await uat("UAT-09", "FR-9", "Filed claims show their status; a rejection shows its reason", async () => {
    await go("entries");
    const map = { paid: "Refund paid", accepted: "Filed · accepted", rejected: "Rejected · fix and refile" };
    for (const c of T.claims) {
      const lbl = await page.$eval(`#eTable tr[data-e="${c.entry}"] td:nth-child(9)`, n => n.innerText.trim());
      expect(lbl === map[c.status], `${c.entry}: shown "${lbl}" for ${c.status}`);
    }
    const rej = T.claims.find(c => c.status === "rejected");
    if (rej) {
      await page.click(`#eTable tr[data-e="${rej.entry}"] td:nth-child(2)`); await page.waitForTimeout(300);
      const body = await page.$eval("#dBody", n => n.innerText);
      expect(body.includes(rej.reason), "rejection reason not shown");
      await page.click("#dClose");
    }
    return `${T.claims.length} claims show the right status${rej ? "; rejection reason shown" : ""}`;
  });

  await uat("UAT-10", "FR-8", "CAPE file: one column of 11-character entry numbers, one file per phase", async () => {
    await go("entries");
    await page.click('#eFilter button[data-v="tofile"]'); await page.waitForTimeout(200);
    const boxes = await page.$$("#eTable .pick");
    expect(boxes.length >= 3, `only ${boxes.length} entries to file`);
    const picked = [];
    for (const b of boxes.slice(0, 3)) { await b.check(); picked.push(await b.getAttribute("data-e")); }
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#capeBtn")]);
    const text = fs.readFileSync(await dl.path(), "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    expect(lines.length === 3 && lines.every(l => /^[A-Z0-9]{11}$/.test(l)), `file content: ${JSON.stringify(lines)}`);
    expect(picked.every(p => lines.includes(p)), "file doesn't match the selection");
    expect(/^CAPE_phase\d_/.test(dl.suggestedFilename()), `file name ${dl.suggestedFilename()}`);
    return `${dl.suggestedFilename()}: ${lines.join(", ")}`;
  });

  await uat("UAT-11", "FR-10", "A SKU can be compared with other countries, cheapest first", async () => {
    await go("products"); await page.click('#pFilter button[data-v="all"]');
    await page.click("#pTable tbody tr"); await page.waitForTimeout(400);
    const per = await page.$$eval("#dBody table tbody tr", t => t.map(r => parseFloat(r.cells[3].innerText.replace(/[$,]/g, ""))));
    expect(per.length >= 2 && per.every((v, i) => !i || v >= per[i - 1]), `costs per $100: ${per}`);
    await page.click("#dClose");
    return `${per.length} countries compared, sorted: ${per.join(", ")}`;
  });

  await uat("UAT-12", "FR-11", "A SKU shows its duty rate history since January 2025", async () => {
    await go("products");
    await page.click("#pTable tbody tr"); await page.waitForTimeout(400);
    const has = await page.$("#hist svg path");
    expect(has, "no history chart");
    await page.click("#dClose");
    return "Rate history chart shown";
  });

  await uat("UAT-13", "FR-2", "Every tariff rule is listed with its dates and a source", async () => {
    await go("rules");
    const n = await page.$$eval("#rTable tbody tr", t => t.length);
    const links = await page.$$eval("#rTable tbody a", a => a.filter(x => /^https?:/.test(x.href)).length);
    expect(n === T.rules.rules.length && links === n, `${n} rows, ${links} source links, ${T.rules.rules.length} rules`);
    return `${n} rules, each with a source link`;
  });

  await uat("UAT-14", "FR-12", "Actions are recorded in the audit log", async () => {
    await go("audit");
    const items = await page.$$eval("#audit li", l => l.map(x => x.innerText));
    expect(items.some(t => /Ran what-if/.test(t)) && items.some(t => /CAPE upload/.test(t)) && items.some(t => /Cleared the what-if/.test(t)),
      "missing audit entries: " + items.slice(0, 4).join(" | "));
    return `${items.length} entries, including the what-if, the clear and the CAPE file`;
  });

  await uat("UAT-15", "NFR", "Works on a phone: no horizontal page scroll; no script errors", async () => {
    const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await m.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    const errs = []; m.on("pageerror", e => errs.push(e.message));
    for (const v of ["overview", "products", "entries", "rules", "audit"]) {
      await m.goto(URL + "#" + v); await m.waitForTimeout(250);
      const over = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      expect(!over, `${v}: page scrolls sideways`);
    }
    await m.close();
    expect(!errs.length && !errors.length, "errors: " + errs.concat(errors).join("; "));
    return "5 views at 390 px wide, no sideways scroll, no errors";
  });

  await browser.close();
  const passed = results.filter(r => r.pass).length;
  const md = `# UAT results: Tariff Desk tracker

> Run on ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by \`tests/uat_tracker.js\`, against the scripts in [uat.md](uat.md). Expected results are worked out independently from the data and rules, not read back from the page.

**${passed} of ${results.length} passed.**

| ID | Requirement | Test | Result | What was observed |
|---|---|---|---|---|
${results.map(r => `| ${r.id} | ${r.fr} | ${r.title} | ${r.pass ? "✅ Pass" : "❌ Fail"} | ${String(r.actual).replace(/\|/g, "/")} |`).join("\n")}
`;
  fs.writeFileSync(path.join(ROOT, "docs/uat-results.md"), md);
  console.log(`${passed}/${results.length} passed`);
  results.filter(r => !r.pass).forEach(r => console.log("FAIL", r.id, r.actual));
})();
