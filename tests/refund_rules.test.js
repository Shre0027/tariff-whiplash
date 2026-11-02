// Tests for the refund-route rules (templates/refund_rules.js). Run: node --test tests/
// Each test names the business rule it checks (docs/process-maps.md). Boundaries are tested on both sides.
const test = require("node:test");
const assert = require("node:assert");
const { refundRoute } = require("../templates/refund_rules.js");

const TODAY = "2026-11-02";
const base = { entryDate: "2025-06-10", entryType: "regular", liquidated: false, courtOrder: false, achEnrolled: true, today: TODAY };
const liq = (daysAgo, extra = {}) => {
  const d = new Date(Date.UTC(2026, 10, 2) - daysAgo * 86400000).toISOString().slice(0, 10);
  return refundRoute({ ...base, liquidated: true, liquidationDate: d, ...extra });
};

test("R2: unliquidated regular entry goes to CAPE Phase 1", () => {
  const r = refundRoute(base);
  assert.equal(r.route, "cape"); assert.equal(r.phase, 1); assert.equal(r.rule, "R2");
});
test("R2 boundary: liquidated exactly 80 days ago is still Phase 1", () => {
  assert.equal(liq(80).phase, 1);
});
test("R4 boundary: liquidated 81 days ago needs a protest", () => {
  assert.equal(liq(81).route, "protest");
});
test("R4 boundary: liquidated 180 days ago can still be protested", () => {
  assert.equal(liq(180).route, "protest");
});
test("R5 boundary: liquidated 181 days ago needs a court action", () => {
  assert.equal(liq(181).route, "court");
});
test("R5: finally liquidated with a court order goes to Phase 3", () => {
  const r = liq(300, { courtOrder: true });
  assert.equal(r.route, "cape"); assert.equal(r.phase, 3);
});
test("R5: a court order does not change a Phase 1 entry", () => {
  assert.equal(liq(10, { courtOrder: true }).phase, 1);
});
test("R3: reconciliation entry goes to Phase 2", () => {
  assert.equal(refundRoute({ ...base, entryType: "reconciliation" }).phase, 2);
});
test("R3: AD/CVD entry goes to Phase 2", () => {
  assert.equal(refundRoute({ ...base, entryType: "adcvd" }).phase, 2);
});
test("R3: an AD/CVD entry past 80 days follows the protest rule", () => {
  assert.equal(liq(100, { entryType: "adcvd" }).route, "protest");
});
test("R8 boundary: entry before 4 Feb 2025 had no IEEPA tariffs", () => {
  assert.equal(refundRoute({ ...base, entryDate: "2025-02-03" }).route, "not_ieepa");
});
test("R8 boundary: entry on 4 Feb 2025 is covered", () => {
  assert.equal(refundRoute({ ...base, entryDate: "2025-02-04" }).route, "cape");
});
test("R8 boundary: entry on 23 Feb 2026 is covered", () => {
  assert.equal(refundRoute({ ...base, entryDate: "2026-02-23" }).route, "cape");
});
test("R8 boundary: entry on 24 Feb 2026 had no IEEPA tariffs", () => {
  assert.equal(refundRoute({ ...base, entryDate: "2026-02-24" }).route, "not_ieepa");
});
test("R7: missing ACH enrollment adds a warning but keeps the route", () => {
  const r = refundRoute({ ...base, achEnrolled: false });
  assert.equal(r.route, "cape"); assert.ok(r.warnings.some(w => w.includes("ACH")));
});
test("Deadline warning when 14 or fewer days are left for CAPE", () => {
  assert.ok(liq(70).warnings.some(w => w.includes("10 days left")));
  assert.equal(liq(60).warnings.length, 0);
});
test("Invalid: missing entry date", () => {
  assert.equal(refundRoute({ ...base, entryDate: "" }).route, "invalid");
});
test("Invalid: liquidated without a liquidation date", () => {
  assert.equal(refundRoute({ ...base, liquidated: true }).route, "invalid");
});
test("Invalid: liquidation before entry", () => {
  assert.equal(refundRoute({ ...base, liquidated: true, liquidationDate: "2025-01-01" }).route, "invalid");
});
test("Invalid: dates in the future", () => {
  assert.equal(refundRoute({ ...base, entryDate: "2026-12-01" }).route, "invalid");
  assert.equal(refundRoute({ ...base, liquidated: true, liquidationDate: "2026-12-01" }).route, "invalid");
});
