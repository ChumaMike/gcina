// Console output for a projector: short lines, plain words, one colour per meaning.
const useColour = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) => (useColour ? `\x1b[${code}m${s}\x1b[0m` : s);
export const c = {
  bold: paint("1"),
  dim: paint("2"),
  green: paint("32"),
  red: paint("31"),
  yellow: paint("33"),
  cyan: paint("36"),
  boldGreen: paint("1;32"),
  boldRed: paint("1;31"),
  boldYellow: paint("1;33"),
};

const WIDTH = 76;
const rule = (ch = "─") => c.dim(ch.repeat(WIDTH));

/** Wrap prose to the projector width with a hanging indent. */
export function wrap(text: string, indent = 5): string {
  const pad = " ".repeat(indent);
  const out: string[] = [];
  let line = "";
  for (const w of text.split(/\s+/)) {
    if ((line + " " + w).trim().length > WIDTH - indent) {
      out.push(pad + line.trim());
      line = w;
    } else line += " " + w;
  }
  if (line.trim()) out.push(pad + line.trim());
  return out.join("\n");
}

export const ui = {
  banner(mode: string, policyUrl: string, currency: string, model: string) {
    console.log();
    console.log(c.bold("  Gcina · accounts-payable agent") + c.dim("   The agent pays. The ledger keeps."));
    console.log(c.dim(`  policy ${policyUrl} · paying in ${currency} on XRPL Testnet · reading with ${model}`));
    if (mode === "compromised") {
      console.log(c.boldRed("  ⚠ AGENT_MODE=compromised: this agent has been fooled and will obey whatever the invoice says."));
      console.log(c.red("    Watch what stops it: the policy co-signer, and then the XRP Ledger itself."));
    }
    console.log();
  },
  header(id: string, title: string) {
    console.log(rule("━"));
    console.log(`  ${c.bold("📄 " + id)}  ${title}`);
    console.log(rule("━"));
  },
  step(text: string) {
    console.log(`  ${c.cyan("›")} ${text}`);
  },
  quote(text: string) {
    console.log(c.dim(wrap(`“${text}”`)));
  },
  check(ok: boolean | "note", text: string) {
    const mark = ok === true ? c.green("✓") : ok === false ? c.red("✗") : c.yellow("!");
    const body = wrap(text, 7).trimStart();
    console.log(`     ${mark} ${ok === false ? c.red(body) : body}`);
  },
  warn(text: string) {
    console.log(`     ${c.yellow("⚠")} ${c.yellow(wrap(text, 7).trimStart())}`);
  },
  call(headline: string, reasoning: string, tone: "go" | "stop" | "ask") {
    const colour = tone === "go" ? c.boldGreen : tone === "stop" ? c.boldRed : c.boldYellow;
    console.log(`  ${c.cyan("›")} My call: ${colour(headline)}`);
    console.log(wrap(reasoning));
  },
  outcome(kind: "paid" | "held" | "refused" | "stopped" | "ledger-refused", title: string, detail: string[] = []) {
    const tag = {
      paid: c.boldGreen("  ✅ PAID      "),
      held: c.boldYellow("  👤 HELD      "),
      refused: c.boldRed("  🛑 REFUSED   "),
      stopped: c.boldRed("  ✋ NOT PAID  "),
      "ledger-refused": c.boldRed("  ⛔ LEDGER SAYS NO "),
    }[kind];
    console.log();
    console.log(tag + c.bold(title));
    for (const d of detail) console.log(wrap(d, 5));
    console.log();
  },
  link(url: string) {
    console.log(`     ${c.cyan(url)}`);
    console.log();
  },
  idle(text: string) {
    process.stdout.write(c.dim(`  ${text}\r`));
  },
  error(text: string) {
    console.log(`  ${c.boldRed("✗")} ${c.red(text)}`);
  },
};
