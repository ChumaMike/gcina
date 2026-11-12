// Shared by the Invoices screen (client) and the mock agent (server): no directive on purpose.

/** An e-mail fixture: header lines, a blank line, then an HTML body. */
export function isHtmlInvoice(raw: string) {
  return /content-type:\s*text\/html/i.test(raw) || /<html[\s>]/i.test(raw);
}

export function splitEmail(raw: string) {
  const i = raw.search(/\r?\n\r?\n/);
  return i < 0 ? { head: "", body: raw } : { head: raw.slice(0, i).trim(), body: raw.slice(i).trim() };
}

// Elements a person can't see but a text-reading AI can: white or 0–1px text, display:none, visibility:hidden.
const HIDDEN =
  /<(\w+)\b[^>]*style\s*=\s*"[^"]*(?:color\s*:\s*(?:#fff(?:fff)?\b|white\b|rgb\(\s*255\s*,\s*255\s*,\s*255\s*\))|font-size\s*:\s*[01](?:\.\d+)?px|display\s*:\s*none|visibility\s*:\s*hidden)[^"]*"[^>]*>[\s\S]*?<\/\1\s*>/gi;

export function hiddenParts(raw: string): { text: string; hidden: boolean }[] {
  const out: { text: string; hidden: boolean }[] = [];
  let last = 0;
  for (const m of raw.matchAll(HIDDEN)) {
    if (m.index! > last) out.push({ text: raw.slice(last, m.index), hidden: false });
    out.push({ text: m[0], hidden: true });
    last = m.index! + m[0].length;
  }
  if (last < raw.length) out.push({ text: raw.slice(last), hidden: false });
  return out;
}
