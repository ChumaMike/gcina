import { ImageResponse } from "next/og";

// The picture WhatsApp / LinkedIn / X show when someone shares the link.
export const alt = "Gcina: the agent pays, the ledger keeps.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#0b3b33 0%,#0f5a4b 60%,#14876b 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="150" height="150" viewBox="0 0 40 40">
            <path d="M19 3.4 6 8.6v10.1c0 8.4 5.4 14.9 13 17.8Z" fill="#2fb594" />
            <path d="M21 3.4 34 8.6v10.1c0 8.4-5.4 14.9-13 17.8Z" fill="#fbbf24" />
            <path d="M13.2 19.8 18.2 24.6 27.4 14.6" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: -3 }}>Gcina</div>
        </div>
        <div style={{ fontSize: 52, marginTop: 30, fontWeight: 600 }}>The agent pays. The ledger keeps.</div>
        <div style={{ fontSize: 30, marginTop: 22, opacity: 0.85, maxWidth: 1000 }}>
          An AI payments clerk for South African small businesses that can&apos;t pay on its own, even when it&apos;s fooled.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 40, fontSize: 24 }}>
          <span style={{ background: "rgba(255,255,255,.14)", padding: "8px 18px", borderRadius: 999 }}>2 of 2 signatures</span>
          <span style={{ background: "rgba(255,255,255,.14)", padding: "8px 18px", borderRadius: 999 }}>RLUSD on the XRP Ledger</span>
          <span style={{ background: "#fbbf24", color: "#0b3b33", padding: "8px 18px", borderRadius: 999, fontWeight: 700 }}>Testnet demo</span>
        </div>
      </div>
    ),
    size,
  );
}
