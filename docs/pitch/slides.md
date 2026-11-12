# Gcina: the deck (3 stage slides + 2 backup)

The deck lives as a Claude Slides artifact (private to Chuma until he shares it; it downloads as PPTX or PDF):
https://claude.ai/artifact/48YheDEhqLqAGfavradDwc. Speaker notes on each slide carry the script lines.

1. **Problem** (dark): "Small businesses pay twice." Card 1: at MTA the same person sometimes got paid twice (first-hand). Card 2: SCA 2025 (*Intengo Imoto v Zoutpansberg*), pay a hacked invoice and you still owe the supplier;
   MTA (first-hand double payments); every big SA bank warns: verify changed banking details. That check is Gcina's rule.
2. **How it works** (light): Invoice → AI agent (1 vote) → policy co-signer (1 vote) → XRP Ledger (needs 2, master key off).
   Outcomes: agent alone → `tefBAD_QUORUM` refused · agent + policy → `tesSUCCESS` paid in RLUSD · owner key (2) → override.
3. **Business** (light + amber ask): beachhead (SA SMEs paying 10+ suppliers by EFT, starting with MTA) · channel (bookkeepers;
   SAIPA 10,000+ members) · price (about R149–R299/month, estimate) · local rails (behind a licensed SA crypto provider;
   rands by EFT; RLUSD cross-border) · **ask: Ripple UDAX accelerator**.

To add after the 23:00 run: a dashboard screenshot from `docs/pitch/screens/` on slide 2 (Approvals card) if it fits.

## Backup slides (Q&A, README, video): added 16:40 per C
4. **Security model**: key table (agent 1 · policy 1 · owner 2 offline · master key off), plus three cards: the policy decodes
   the signed payment (payee, amount, memo, fee, no partial payments); two tokens; held payments expire and get re-signed fresh.
5. **Roadmap + team**: Now (testnet, two-vote account, RLUSD + memos, dashboard) · Next (MTA pilot, 3–5 practices, licensed
   SA crypto partner, bank account verification) · Then (payment channel per supplier, rand stablecoin at home, RLUSD
   cross-border, HSM policy key) · **Team: [names and roles]**.
