import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { PageHeader } from "@/components/bits";
import { Card, CardContent } from "@/components/ui/card";
import { SESSION_COOKIE, judgeExpiresAt, judgePasscode, sessionRole } from "@/lib/session";

export const metadata = { title: "Judge mode · Gcina" };
export const dynamic = "force-dynamic";

// Owner-only (proxy.ts sends judges away; this re-checks). Put it on the projector: judges scan,
// land on Approvals as a limited "judge" owner, and approve or reject the held payment themselves.
export default async function JudgePage() {
  const role = await sessionRole((await cookies()).get(SESSION_COOKIE)?.value);
  if (role !== "owner") redirect("/approvals");

  const pass = judgePasscode();
  const ends = new Date(judgeExpiresAt()).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!pass) {
    return (
      <>
        <PageHeader title="Judge mode" lead="Let a judge be the owner for a moment." />
        <Card>
          <CardContent className="text-lg">Judge mode is off: no judge passcode is set, or its time ({ends} SAST) has passed.</CardContent>
        </Card>
      </>
    );
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "gcina.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  // The passcode rides in the #fragment: browsers never send it to the server or put it in logs.
  const url = `${proto}://${host}/login#judge=${encodeURIComponent(pass)}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });

  return (
    <>
      <PageHeader title="Would you like to be the owner?" lead="Scan with your phone camera. You'll land on Approvals and decide the waiting payment yourself." />
      <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="mx-auto w-full max-w-[22rem] rounded-2xl border border-border bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL, nothing to optimise */}
          <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} alt="QR code that signs you in as a judge" className="block h-auto w-full" />
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4 text-lg">
            <p>
              <span className="font-semibold">QR not working?</span> Open <span className="font-mono">{host}</span> and type:
            </p>
            <p className="rounded-xl bg-muted px-4 py-3 text-center font-mono text-2xl font-semibold tracking-wide break-all sm:text-3xl">{pass}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-base text-muted-foreground">
              <li>A judge can only approve or reject held payments. Limits, suppliers, pausing and the demo controls stay with the owner.</li>
              <li>Decisions show in the audit trail as &ldquo;A judge (demo)&rdquo;.</li>
              <li>Judge access ends {ends} SAST.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
