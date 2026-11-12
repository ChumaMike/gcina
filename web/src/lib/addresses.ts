// Public XRPL Testnet addresses from docs/addresses.md. Addresses only: no seeds, ever.

export const AGENT_ACCOUNT = "rGnmtEMkzCECGn1mkdxZt8cieEU62kV6hq";

export const SIGNER_ROLES: Record<string, { role: "agent" | "policy" | "owner"; label: string }> = {
  rhGCPJehSfK2jAMeamzhdYmRa4J5wx6C4e: { role: "agent", label: "The AI agent's key" },
  rpTQQLzeE227r4TeQ39Z5FyTfE1ucR7gbF: { role: "policy", label: "Your rules (policy co-signer)" },
  rHZiTGS4XvH8UP3YUZziYYVGR4PMC2mqVT: { role: "owner", label: "You, the owner (kept offline)" },
};

export type SignerProof = {
  account: string;
  masterDisabled: boolean;
  quorum: number | null;
  signers: { address: string; weight: number; role?: "agent" | "policy" | "owner"; label?: string }[];
  /** The transaction that last set this signer list (setup, fire-agent or rehire-agent). */
  changedBy?: string;
  ledgerIndex?: number;
  checkedAt: string;
};
