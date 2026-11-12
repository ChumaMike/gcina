// Offline check: Claude reads every fixture; results are committed as fixtures/*.extracted.json.
//   pnpm extract-fixtures
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { AGENT_DIR, env } from "../src/env.ts";
import { extract } from "../src/extract.ts";

const dir = resolve(AGENT_DIR, "fixtures");
for (const f of readdirSync(dir).filter((x) => /^inv-\d+\.txt$/.test(x)).sort()) {
  const t0 = Date.now();
  const out = await extract(readFileSync(resolve(dir, f), "utf8"));
  writeFileSync(resolve(dir, f.replace(/\.txt$/, ".extracted.json")), JSON.stringify({ model: env.model, ...out }, null, 2) + "\n");
  console.log(`${f}  ${((Date.now() - t0) / 1000).toFixed(1)} s  ${out.supplierName} · ${out.currency} ${out.totalDue} · PO ${out.poNumber} · pay to ${out.paymentAddress}`);
  console.log(`   changed details: ${out.changedDetailsLanguage} · urgency: ${out.urgencyPressure}`);
  console.log(`   ${out.summary}`);
  for (const w of out.warningSigns) console.log(`   ⚠ ${w}`);
}
