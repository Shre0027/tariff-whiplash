// Helper for make_sample_company.py: reads [{date, hs10, country, usmca, baseRate}] as JSON on stdin and prints,
// for each, whether any IEEPA tariff applied (so refund claims are only generated for entries with IEEPA lines).
const { create } = require("../templates/tariff_engine.js");
const E = create(require("../config/tariff_rules.json"));
let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
  const out = JSON.parse(s).map(a => E.duty(a).lines.some(l => l.program.startsWith("IEEPA")));
  process.stdout.write(JSON.stringify(out));
});
