// Tests for the tariff rule engine (templates/tariff_engine.js) with the real rules (config/tariff_rules.json).
// Each test names the requirement or rule it checks. Run: node --test tests/*.test.js
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const { create } = require("../templates/tariff_engine.js");
const doc = JSON.parse(fs.readFileSync(__dirname + "/../config/tariff_rules.json"));
const E = create(doc);
const tee = { hs10: "6109100012", baseRate: 16.5 };          // cotton T-shirt
const phone = { hs10: "8517130000", baseRate: 0 };
const chair = { hs10: "9401616011", baseRate: 0 };
const rate = a => E.duty(a).total;

test("Before 2025: only the normal duty applies", () => {
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2025-01-15" }), 16.5);
});
test("China fentanyl tariff: 10% from 4 Feb 2025, 20% from 4 Mar 2025", () => {
  assert.equal(rate({ ...tee, country: "China", date: "2025-02-04" }), 26.5);
  assert.equal(rate({ ...tee, country: "China", date: "2025-03-04" }), 36.5);
});
test("Reciprocal 10% baseline from 5 Apr 2025 stacks on normal duty", () => {
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2025-04-05" }), 26.5);
});
test("China at the peak: 125% reciprocal + 20% fentanyl", () => {
  assert.equal(rate({ ...tee, country: "China", date: "2025-04-20" }), 16.5 + 145);
});
test("In transit: China goods loaded before 9 Apr pay 10% until 27 May 2025", () => {
  assert.equal(rate({ ...tee, country: "China", date: "2025-05-01", loadDate: "2025-04-01" }), 16.5 + 20);
  assert.equal(rate({ ...tee, country: "China", date: "2025-05-01", loadDate: "2025-04-07" }), 16.5 + 20 + 10);
});
test("Electronics exclusion: smartphones pay no reciprocal tariff, but China's fentanyl tariff applies", () => {
  assert.equal(rate({ ...phone, country: "Vietnam", date: "2025-09-01" }), 0);
  assert.equal(rate({ ...phone, country: "China", date: "2025-09-01" }), 20);
});
test("Country rates from 7 Aug 2025 (Vietnam 20%), with in-transit cut-off 4 Oct", () => {
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2025-09-01" }), 36.5);
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2025-09-01", loadDate: "2025-08-01" }), 26.5);
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2025-10-05", loadDate: "2025-08-01" }), 36.5);
});
test("India: 25% + 25% Russian-oil tariff from 27 Aug 2025; 18% from 2 Feb 2026", () => {
  assert.equal(rate({ ...tee, country: "India", date: "2025-09-15" }), 66.5);
  assert.equal(rate({ ...tee, country: "India", date: "2026-02-10" }), 34.5);
});
test("EU 15% all-in: additional duty tops the total up to 15%, never below zero", () => {
  assert.equal(rate({ hs10: "6403999065", baseRate: 10, country: "Italy", date: "2025-09-01" }), 15);
  assert.equal(rate({ hs10: "6109100012", baseRate: 16.5, country: "Italy", date: "2025-09-01" }), 16.5);
});
test("Mexico: fentanyl tariff only on goods that don't qualify for USMCA", () => {
  assert.equal(rate({ ...tee, country: "Mexico", date: "2025-06-01", usmca: true }), 16.5);
  assert.equal(rate({ ...tee, country: "Mexico", date: "2025-06-01", usmca: false }), 41.5);
});
test("Supreme Court ruling: IEEPA tariffs stop after 23 Feb 2026; Section 122 10% from 24 Feb", () => {
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2026-02-23" }), 36.5);
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2026-02-24" }), 26.5);
  assert.equal(rate({ ...tee, country: "China", date: "2026-03-01" }), 26.5);
});
test("Section 301 (2026) from 24 Jul 2026: China 12.5%, India 10%; in-transit until 27 Jul", () => {
  assert.equal(rate({ ...tee, country: "China", date: "2026-08-01" }), 29);
  assert.equal(rate({ ...tee, country: "India", date: "2026-08-01" }), 26.5);
  assert.equal(rate({ ...tee, country: "China", date: "2026-07-26", loadDate: "2026-07-10" }), 16.5);
});
test("Section 232 furniture (25% from 14 Oct 2025) replaces the reciprocal tariff, not China's fentanyl tariff", () => {
  assert.equal(rate({ ...chair, country: "Vietnam", date: "2025-11-01" }), 25);
  assert.equal(rate({ ...chair, country: "China", date: "2025-11-01" }), 25 + 20);   // fentanyl still 20% until 9 Nov
  assert.equal(rate({ ...chair, country: "China", date: "2025-11-15" }), 25 + 10);
  assert.equal(rate({ ...chair, country: "Vietnam", date: "2026-08-01" }), 25);
});
test("FR-4 what-if: an extra rule applies to matching products only, from its start date", () => {
  const wi = [{ id: "W", program: "What-if", countries: ["Vietnam"], hs: ["6109"], rate: 15, from: "2026-12-01", to: null, exempt: ["s232"] }];
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2026-12-01", extraRules: wi }), 16.5 + 12.5 + 15);
  assert.equal(rate({ ...tee, country: "Vietnam", date: "2026-11-30", extraRules: wi }), 16.5 + 12.5);
  assert.equal(rate({ ...chair, country: "Vietnam", date: "2026-12-01", extraRules: [{ ...wi[0], hs: null }] }), 25);
});
test("Every rule has a source, a start date and a rate", () => {
  for (const r of doc.rules) {
    assert.ok(/^https?:\/\//.test(r.source), r.id + " source");
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(r.from), r.id + " from");
    assert.ok(typeof r.rate === "number" && r.rate > 0, r.id + " rate");
  }
});
