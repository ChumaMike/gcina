// Policy reasons (CONTRACTS §3 co-sign rules) → plain, warm South African English.
// Unknown reasons pass through unchanged so nothing the policy says is ever hidden.

export function friendlyReason(reason: string): { text: string; fraud: boolean } {
  const r = reason.trim();
  const addr = r.match(/not the registered address for (.+?)\.?\s*(Possible|$)/i);
  if (addr) {
    const name = addr[1].replace(/\.$/, "");
    const poss = /s$/i.test(name) ? `${name}’` : `${name}’s`;
    return {
      text: `This isn’t ${poss} registered address. It could be a fake “new banking details” invoice.`,
      fraud: true,
    };
  }
  if (/unknown|not .*approved supplier|no approved supplier/i.test(r)) {
    return { text: "This address isn't one of your approved suppliers. It could be a fake invoice.", fraud: true };
  }
  if (/daily/i.test(r) && /(limit|max)/i.test(r) && !/you asked/i.test(r)) {
    return { text: r.startsWith("This would") ? r : "This would take today's payments over your daily limit.", fraud: false };
  }
  if (/per[- ]?payment/i.test(r) && !/you asked/i.test(r)) {
    return { text: r.includes("$") ? r : "This is more than your limit for a single payment.", fraud: false };
  }
  if (/requireHuman|human|ask/i.test(r)) {
    return { text: r.includes("$") ? r : "It's above the amount where you asked to approve payments yourself.", fraud: false };
  }
  if (/paused/i.test(r)) return { text: "You've paused the agent.", fraud: false };
  if (/duplicate|already paid/i.test(r)) return { text: "This invoice has already been paid.", fraud: false };
  return { text: r, fraud: false };
}
